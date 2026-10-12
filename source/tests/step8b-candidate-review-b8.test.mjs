import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {makeB8Catalog,validateB8Catalog,BASELINE_B7_SHA256} from '../runner/step8b-candidate-review-b8.mjs';
import {renderB8Dashboard} from '../runner/step8b-review-ui-b8.mjs';
import {predictLocalRectangles,footprintSummary,orientedRectangles} from '../runner/step8b-geometry-b3.mjs';
import {evaluateEntrance} from '../runner/step8b-static-planner-b6.mjs';
const base=path.resolve(import.meta.dirname,'..'),snapshot=process.env.STEP8B_SOURCE_DIR;
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const read=()=>JSON.parse(fs.readFileSync(path.join(base,'reports/B7_RECONCILED_REVIEW.json'),'utf8'));
const verify=()=>makeB8Catalog({b7Report:read(),snapshotDir:snapshot});
const enabled=snapshot?test:test.skip;
let report;const run=()=>report??=verify();
const rehash=x=>{const {reportSha256,...rest}=x;x.reportSha256=sha(rest);return x;};
const clone=x=>structuredClone(x);
const denyUnsafe=x=>{assert.equal(x.BuildPlan.status,'NOT_PREPARED');assert.equal(x.BuildPlan.commandCount,0);assert.deepEqual(x.BuildPlan.operations,[]);assert.equal(x.deploymentGate,'BLOCKED');assert.equal(x.safety.constructionApproved,false);assert.equal(x.safety.executionAllowed,false);};
enabled('B8.1 B7 and 249-file source pinned; immutable baseline and all gates blocked',()=>{
 const b7=read(),r=run();assert.equal(b7.reportSha256,BASELINE_B7_SHA256);assert.equal(r.baseB7ReportSha256,b7.reportSha256);
 assert.equal(r.sourceManifestSha256,b7.sourceManifestSha256);assert.equal(r.blockingGates.length,7);denyUnsafe(r);
 assert.equal(r.referenceLimits.liveEngineAttested,false);assert.equal(r.referenceLimits.realPlannerInvoked,false);
});
enabled('B8.2 deterministic 432 scenarios, 12 per program-style-seed? index unique',()=>{
 const r=run();assert.equal(r.proposals.length,432);assert.equal(new Set(r.proposals.map(c=>c.id)).size,432);
 for(const program of ['hotel','apartment','office'])assert.equal(r.proposals.filter(c=>c.program===program).length,144);
 for(const orientation of ['north','east','south','west'])assert.equal(r.proposals.filter(c=>c.orientation===orientation).length,108);
 for(const style of ['modern','urban_japanese','traditional'])assert.equal(r.proposals.filter(c=>c.style===style).length,144);
});
enabled('B8.2 original 5 remain separate, office 123 drift and zero auto updates',()=>{
 const r=run();assert.equal(r.legacyCandidates.length,5);assert.deepEqual(r.legacyCandidates.map(c=>c.sourceVsConceptDifferenceCells).sort((a,b)=>a-b),[0,0,0,0,123]);
 assert.equal(r.selectionPolicy.autoApply,false);assert.equal(r.selectionPolicy.constructionApprovalNotRepresentable,true);
 assert.ok(r.legacyCandidates.every(c=>c.autoApplied===false&&c.originalConceptAffected===false));
});
enabled('B8.3 every predicted footprint independently agrees with source-pinned static oracle',()=>{
 const cache=Object.fromEntries(['modern','urban_japanese','traditional'].map(s=>[s,JSON.parse(fs.readFileSync(path.join(snapshot,'styles',s+'.json'),'utf8'))]));
 for(const p of run().proposals){const params={...p.dimensions,massing:p.massing,style:p.style,seed:p.seed,orientation:p.orientation},v=predictLocalRectangles(params,cache[p.style]);
  assert.deepEqual(v.rectangles,p.sourcePredictedRectangles,p.id);
  const local=footprintSummary(v.rectangles,p.dimensions.width,p.dimensions.depth,p.dimensions.floors);
  assert.deepEqual(local.areaByFloor,p.areaByFloor,p.id);
  assert.equal(local.totalCells,p.occupiedCells);
  assert.deepEqual(p.entrance.predictedStatus,evaluateEntrance(v.rectangles,p.dimensions.width,p.dimensions.depth,p.program).predictedStatus);
 }
});
enabled('B8.3 all 432 orientations preserve occupied area by floor',()=>{
 for(const c of run().proposals){const {width,depth,floors}=c.dimensions;const rot=orientedRectangles(c.sourcePredictedRectangles,c.orientation,width,depth);
 const summary=footprintSummary(rot,['east','west'].includes(c.orientation)?depth:width,['east','west'].includes(c.orientation)?width:depth,floors);
 assert.deepEqual(summary.areaByFloor,c.areaByFloor);}
});
enabled('B8.3 score math deterministic and explicitly non-executable',()=>{
 for(const p of run().proposals){const o=p.scoreRubric;assert.equal(p.score,o.occupancyPoints+o.retentionPoints+o.tierVariationPoints);
 assert.ok(p.score>=0&&p.score<=100);assert.equal(p.autoApplied,false);assert.equal(p.BuildPlan.status,'NOT_PREPARED');
 assert.equal(p.materials.length,0);assert.equal(p.worldAnchor,null);assert.equal(p.worldCoordinates,null);}
});
enabled('B8.3 boundary issues are preserved and not silently dismissed by regular candidate catalog',()=>{
 const r=run();assert.equal(r.boundaryFailures.length,36);assert.equal(r.statuses.rejectedEntranceCandidates,0);
 for(const b of r.boundaryFailures){assert.ok(b.frontRun<b.requiredRun);assert.ok(b.alternatives.length>0);
  assert.ok(b.alternatives.every(a=>a.requiresExplicitDesignReview));}
});
enabled('B8.3 all new sites use only dimension templates from original B7',()=>{
 const b7=read();for(const p of run().proposals)assert.deepEqual(p.dimensions,b7.candidates.find(x=>x.program===p.program).dimensions);
});
enabled('B8.4 HTML offline viewer has program filters, compare, floor preview and review export',()=>{
 const h=renderB8Dashboard(run());assert.match(h,/432/);assert.match(h,/candidate|候補/);assert.match(h,/comparison/);assert.match(h,/max(?:imum)?3|最大3/);
 assert.match(h,/floor/);assert.match(h,/createObjectURL/);assert.match(h,/NOT PREPARED/);
 assert.doesNotMatch(h,/<iframe|<script[^>]*src\s*=|\bfetch\s*\(|\bXMLHttpRequest\b|\blocalStorage\b|WebSocket|http:\/\/|https:\/\//);
});
enabled('B8.4 HTML export is hard-coded non-approved and has no operational bridge endpoints',()=>{
 const h=renderB8Dashboard(run());
 for(const s of ['constructionApproved:false','executionAllowed:false','worldAccess:false','deploymentGate:\'BLOCKED\'','operations:[]','commandCount:0','designChangeAutoApplied:false'])assert.ok(h.includes(s),s);
 assert.doesNotMatch(h,/build\/building|127\.0\.0\.1|8765|8000|localhost/);
});
enabled('B8.5 B7 tampered self digest rejects pinned frozen baseline',()=>{
 const b=read();b.entranceMatrix.problematicCases[0].width=48;rehash(b);
 assert.throws(()=>makeB8Catalog({b7Report:b,snapshotDir:snapshot}),{code:'B8_FROZEN_B7_PIN_OR_SAFETY_FAILED'});
});
enabled('B8.5 corrupted B7 constructor approvals rejected',()=>{
 const b=read();b.safety.constructionApproved=true;rehash(b);
 assert.throws(()=>makeB8Catalog({b7Report:b,snapshotDir:snapshot}),{code:'B8_FROZEN_B7_PIN_OR_SAFETY_FAILED'});
});
enabled('B8.5 missing or unexpected snapshots fail closed',()=>{
 assert.throws(()=>makeB8Catalog({b7Report:read(),snapshotDir:base}),{code:'MISSING_MANIFEST'});
});
enabled('B8.5 report digest tamper detected',()=>{
 const r=clone(run());r.proposals[0].score+=3;assert.throws(()=>validateB8Catalog(r),{code:'B8_CATALOG_UNSAFE_OR_TAMPERED'});
});
enabled('B8.5 self-rehashed construction flags / world anchor / injected operations rejected',()=>{
 const r=run();for(const patch of [x=>x.safety.constructionApproved=true,x=>x.BuildPlan.operations.push({command:'/fill'}),x=>x.proposals[0].materials.push('stone'),x=>x.coordinates.worldAnchor={x:1}]){
  const forged=clone(r);patch(forged);rehash(forged);assert.throws(()=>validateB8Catalog(forged),{code:'B8_CATALOG_UNSAFE_OR_TAMPERED'});}
});
enabled('B8.5 self-rehashed score manipulation cannot pass pinned published UI',()=>{
 const r=clone(run());r.proposals[0].score+=2;rehash(r);assert.throws(()=>renderB8Dashboard(r),/B8_PUBLISHED_REPORT_PIN_CHANGED/);
});
enabled('B8.5 reports contain no unsafe executable fields and 0 approvals',()=>{
 const r=run();denyUnsafe(r);assert.equal(r.coordinates.worldAnchor,null);assert.equal(r.coordinates.worldCoordinates,null);
 assert.deepEqual(r.materialBlockIds,[]);assert.deepEqual(r.blockStates,[]);for(const p of r.proposals){assert.equal(p.BuildPlan.commandCount,0);assert.deepEqual(p.BuildPlan.operations,[]);}
});
enabled('B8.6 deterministic serialization and output report fixed published SHA',()=>{
 const r=run();assert.equal(r.reportSha256,'5d517c5e23e21fc12a3f5d054b0fed9a3c65f71d42caac831b95f87610e15161');
 assert.equal(verify().reportSha256,r.reportSha256);assert.equal(validateB8Catalog(r),true);
});
test('B8.6 source files contain no real engine/planner/Bridge imports or internet calls',()=>{
 for(const f of ['runner/step8b-candidate-review-b8.mjs','runner/step8b-review-ui-b8.mjs','tools/RUN_B8_OFFLINE.mjs']){
  const code=fs.readFileSync(path.join(base,f),'utf8');assert.doesNotMatch(code,/from\s+['"][^'"]*(?:bridge\/src|engine\/src)|\bfetch\s*\(|\bspawn\s*\(|\bexecFile\s*\(|https?:\/\//);}
});
test('B8.6 refusing existing output protects user files without requiring source',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'b8-existing-'));try{
  assert.throws(()=>execFileSync(process.execPath,[path.join(base,'tools/RUN_B8_OFFLINE.mjs'),'/missing',temp],{stdio:'pipe'}),{status:1});
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
enabled('B8.6 isolated CLI writes only 2 offline deliverables',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'b8-output-'));
 try{const out=path.join(parent,'new'),str=execFileSync(process.execPath,[path.join(base,'tools/RUN_B8_OFFLINE.mjs'),snapshot,out],{encoding:'utf8'});
  assert.match(str,/B8_NON_EXECUTING_REVIEW_PASS/);assert.deepEqual(fs.readdirSync(out).sort(),['B8_CANDIDATE_REVIEW.html','B8_REVIEW_CATALOG.json']);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out,'B8_REVIEW_CATALOG.json'),'utf8')).BuildPlan.status,'NOT_PREPARED');
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
enabled('B8.6 rendered inline JavaScript parses as JavaScript, not only HTML string',()=>{
 const html=renderB8Dashboard(run()),start=html.lastIndexOf('<script>'),end=html.indexOf('</script>',start);
 assert.ok(start>0&&end>start);
 const js=html.slice(start+'<script>'.length,end);
 const result=execFileSync(process.execPath,['--check','-'],{input:js,encoding:'utf8'});
 assert.equal(result,'');
});
