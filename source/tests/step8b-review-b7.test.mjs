import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildB7Review,projectCandidate,suggestB7EntranceOptions} from '../runner/step8b-review-b7.mjs';
import {predictLocalRectangles} from '../runner/step8b-geometry-b3.mjs';
import {evaluateEntrance} from '../runner/step8b-static-planner-b6.mjs';
import {renderB7Dashboard} from '../runner/step8b-visual-b7.mjs';
const base=path.resolve(import.meta.dirname,'..');
const snapshot=process.env.STEP8B_SOURCE_DIR;
const read=p=>JSON.parse(fs.readFileSync(path.join(base,'reports',p),'utf8'));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const safe=x=>{assert.equal(x.BuildPlan.status,'NOT_PREPARED');assert.deepEqual(x.BuildPlan.operations,[]);assert.equal(x.BuildPlan.commandCount,0);assert.equal(x.deploymentGate,'BLOCKED');assert.equal(x.safety.constructionApproved,false);assert.equal(x.safety.executionAllowed,false);};
const input=()=>({snapshotDir:snapshot,b3Reports:Object.fromEntries(['hotel','apartment','office'].map(k=>[k,read(k.toUpperCase()+'_STATIC_B3.json')])),b6Report:read('B6_STATIC_PREFLIGHT.json')});
const enabled=snapshot?test:test.skip;
let report;
const run=()=>report??=(buildB7Review(input()));
const styleMap=()=>Object.fromEntries(['modern','urban_japanese','traditional'].map(k=>[k,JSON.parse(fs.readFileSync(path.join(snapshot,'styles',k+'.json'),'utf8'))]));
enabled('B7.1 frozen B3/B6 + source pin; 5 candidates; zero execute operations',()=>{
 const r=run();safe(r);assert.equal(r.candidates.length,5);assert.equal(r.referenceLimits.realPlannerInvoked,false);
 assert.equal(r.referenceLimits.worldKnown,false);assert.equal(r.referenceLimits.materialKnown,false);
 assert.equal(r.referenceLimits.liveEngineAttested,false);assert.equal(r.baseB6ReportSha256,input().b6Report.reportSha256);
});
enabled('B7.2 office asymmetric 123 cells retained, original unchanged and source-primary review',()=>{
 const c=run().candidates.find(c=>c.program==='office'&&c.id==='candidate-02');
 assert.equal(c.local.changedCells,123);assert.equal(c.orientedLocal.changedCells,123);
 assert.deepEqual(c.local.layers.map(f=>f.conceptOnlyCells),[22,22,22,22,22,13]);
 assert.deepEqual(c.local.layers.map(f=>f.sourceOnlyCells),[0,0,0,0,0,0]);
 assert.equal(c.reviewDisposition,'SOURCE_PINNED_REVIEW_PROJECTION_DIFFERS_FROM_LEGACY_CONCEPT');
 assert.equal(c.sourceAsPrimaryReviewLayer,true);assert.equal(c.originalConceptPreserved,true);
 assert.deepEqual(c.conceptRectangles[0],{x:0,z:0,width:13,depth:15,start:0,end:6});
 assert.deepEqual(c.sourcePredictedRectangles[0],{x:0,z:0,width:13,depth:14,start:0,end:6});
});
enabled('B7.2 other 4 candidates have no concept/source diff per floor',()=>{
 const c=run().candidates.filter(c=>!(c.program==='office'&&c.id==='candidate-02'));
 assert.equal(c.length,4);for(const v of c){assert.equal(v.local.changedCells,0);assert.equal(v.orientedLocal.changedCells,0);assert.ok(v.local.layers.every(x=>x.sourceOnlyCells===0&&x.conceptOnlyCells===0));}
});
enabled('B7.2 local layer cells count, union, no out-of-bounds, floor reference',()=>{
 for(const c of run().candidates)for(const plane of [c.local,c.orientedLocal])for(const f of plane.layers){
  assert.equal(f.rows.length,f.depth);assert.ok(f.rows.every(r=>r.length===f.width&&/^[.BCS]+$/.test(r)));
  const count=[...f.rows.join('')].reduce((o,v)=>(o[v]=(o[v]||0)+1,o),{});
  assert.equal((count.B||0),f.commonCells);assert.equal((count.C||0),f.conceptOnlyCells);assert.equal((count.S||0),f.sourceOnlyCells);
  assert.equal(f.commonCells+f.conceptOnlyCells,f.conceptArea);assert.equal(f.commonCells+f.sourceOnlyCells,f.sourceArea);
 }
});
enabled('B7.3 oriented and unrotated projections preserve exact area and pixel classification',()=>{
 for(const c of run().candidates){assert.equal(c.local.layers.length,c.dimensions.floors);assert.equal(c.orientedLocal.layers.length,c.dimensions.floors);
  for(let i=0;i<c.dimensions.floors;i++){
   const a=c.local.layers[i],b=c.orientedLocal.layers[i];
   for(const k of ['conceptArea','sourceArea','conceptOnlyCells','sourceOnlyCells','commonCells'])assert.equal(a[k],b[k],c.id+':'+k+':'+i);
  }
 }
});
enabled('B7.3 four facings give correct dimensions, same delta for office asymmetric',()=>{
 const c=input().b3Reports.office.candidates.find(x=>x.id==='candidate-02');
 for(const face of ['north','east','south','west']){
  const p=projectCandidate({...c,orientation:face});
  assert.equal(p.orientedLocal.changedCells,123);
  assert.equal(p.orientedLocal.layers[0].width,['east','west'].includes(face)?20:24);
  assert.equal(p.orientedLocal.layers[0].depth,['east','west'].includes(face)?24:20);
 }
});
enabled('B7.4 all 216 hotel U shape cases, exactly 36 predicted entrance rejects',()=>{
 const r=run();assert.equal(r.entranceMatrix.scannedHotelUShapeConditions,216);
 assert.equal(r.entranceMatrix.rejected,36);
 assert.ok(r.entranceMatrix.problematicCases.every(c=>c.requiredRun===7&&c.frontRun<7));
});
enabled('B7.5 rejected U shape options have no automatic design mutation and are non-executable',()=>{
 const r=run();for(const c of r.entranceMatrix.problematicCases){
  assert.equal(c.alternatives.autoApplied,false);assert.equal(c.alternatives.originalUnchanged,true);
  for(const o of c.alternatives.options){assert.equal(o.sourcePreviewOnly,true);assert.equal(o.requiresExplicitDesignReview,true);assert.equal(o.otherGatesBlocked,true);
   assert.equal(o.previewParameters.massing==='U_shape'||['stepped','tower_on_podium','asymmetric_block'].includes(o.previewParameters.massing),true);
  }
 }
});
enabled('B7.5 deterministic review options, no unregistered massing or style',()=>{
 const p={width:15,depth:20,floors:6,seed:1,orientation:'north',style:'urban_japanese',massing:'U_shape'};
 const a=suggestB7EntranceOptions(p,styleMap()),b=suggestB7EntranceOptions(p,styleMap());
 assert.deepEqual(a,b);assert.equal(a.originalUnchanged,true);assert.equal(a.autoApplied,false);
 assert.ok(a.options.length>0);assert.ok(a.options.some(x=>x.kind==='SEED_PREVIEW_ONLY'));
 assert.ok(a.options.every(x=>['SEED_PREVIEW_ONLY','STYLE_PREVIEW_ONLY','SITE_WIDTH_PREVIEW_ONLY','MASSING_PREVIEW_ONLY'].includes(x.kind)));
});
enabled('B7.5 feasible hotel proposal shows no replacement suggestions',()=>{
 const p={width:24,depth:20,floors:6,seed:0,orientation:'north',style:'modern',massing:'U_shape'};
 const a=suggestB7EntranceOptions(p,styleMap());assert.equal(a.state,'ENTRANCE_RUN_STATICALLY_FEASIBLE');assert.deepEqual(a.options,[]);
});
enabled('B7.5 invalid massing/seed/size/style and non-source styles are rejected',()=>{
 const p={width:15,depth:20,floors:6,seed:1,orientation:'north',style:'urban_japanese',massing:'U_shape'};
 for(const change of [{massing:'slab'},{seed:-1},{seed:2147483648},{style:'evil'},{width:99},{depth:1},{floors:20},{orientation:'diagonal'}])
  assert.throws(()=>suggestB7EntranceOptions({...p,...change},styleMap()),{code:'B7_ALTERNATIVE_INPUT_INVALID'});
});
enabled('B7 baseline tamper rejected even when attacker regenerates self checksum',()=>{
 const x=input();x.b3Reports.office.candidates[1].conceptOriginalLocalRectangles[0].depth++;
 const {reportSha256,...rest}=x.b3Reports.office;x.b3Reports.office.reportSha256=hash(rest);
 assert.throws(()=>buildB7Review(x),{code:'B7_B3_FROZEN_BASELINE_CHANGED'});
});
enabled('B7 B6 fabricated green gate rejected even with regenerated checksum',()=>{
 const x=input();x.b6Report.buildReadiness.gates[1].state='READY';const {reportSha256,...rest}=x.b6Report;x.b6Report.reportSha256=hash(rest);
 assert.throws(()=>buildB7Review(x),{code:'B7_B6_FROZEN_BASELINE_CHANGED'});
});
enabled('B7 source baseline drift rejected from original existing pinned manifest',()=>{
 const x=input();x.b6Report.source.manifestSha256='abc';const {reportSha256,...rest}=x.b6Report;x.b6Report.reportSha256=hash(rest);
 assert.throws(()=>buildB7Review(x),{code:'B7_B6_FROZEN_BASELINE_CHANGED'});
});
enabled('B7 candidate build plan / coordinate / materials injection cannot pass review',()=>{
 const c=input().b3Reports.office.candidates[0];
 for(const change of [{worldAnchor:{x:1}},{worldCoordinates:{x:0}},{materialBlockIds:['stone']},{blockStates:['north']},{BuildPlan:{status:'PREPARED',operations:[],commandCount:0}},{BuildPlan:{status:'NOT_PREPARED',operations:[{}],commandCount:1}}])
  assert.throws(()=>projectCandidate({...c,...change}),{code:'B7_CANDIDATE_INVALID_OR_UNSAFE'});
});
enabled('B7 known explicitly registered hotel slab is not mislabeled unsupported',()=>{
 const c=run().candidates.find(c=>c.program==='hotel');assert.equal(c.massing,'slab');assert.equal(c.massingSelectionMode,'EXPLICIT_ENGINE_REGISTERED_ONLY');
});
enabled('B7 dashboard self-contained, layer controls and no network access',()=>{
 const html=renderB7Dashboard(run());assert.match(html,/concept-only|概念だけ/);assert.match(html,/reviewData/);
 assert.match(html,/candidate-02/);assert.match(html,/第 /);assert.match(html,/NOT PREPARED/);
 assert.doesNotMatch(html,/<script[^>]+src=|<iframe|\bfetch\s*\(|\bXMLHttpRequest\b|C:\\Users\\|bridgeContact|\/build\/building|localStorage/);
 assert.ok(!html.includes('<script type="application/json" id="reviewData"><')); // escaped JSON, no HTML break-out
});
enabled('B7 renderer blocks tampering and construction approval flags',()=>{
 const r=run();assert.throws(()=>renderB7Dashboard({...r,reportSha256:'0'.repeat(64)}),/B7_RENDER_TAMPERED_REPORT/);
 assert.throws(()=>renderB7Dashboard({...r,BuildPlan:{status:'PREPARED',operations:[],commandCount:0}}),/B7_RENDER_UNSAFE_REPORT/);
 assert.throws(()=>renderB7Dashboard({...r,entranceMatrix:{...r.entranceMatrix,autoAppliedCount:1}}),/B7_RENDER_UNSAFE_REPORT/);
});
test('B7 module forbids imports from real planner/bridge and network/process calls',()=>{
 for(const name of ['step8b-review-b7.mjs','step8b-visual-b7.mjs']){
  const src=fs.readFileSync(path.join(base,'runner',name),'utf8');
  assert.doesNotMatch(src,/from\s+['"][^'"]*(?:engine\/src|bridge\/src)|\bfetch\s*\(|\bexecFile\s*\(|\bspawn\s*\(|https?:\/\//);
 }
});
test('B7 write-once tool refuses any existing output before engine lookups',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'b7-existing-'));
 try{assert.throws(()=>execFileSync(process.execPath,[path.join(base,'tools/RUN_B7_OFFLINE.mjs'),'NO_SOURCE',folder],{stdio:'pipe'}),{status:1});}
 finally{fs.rmSync(folder,{recursive:true,force:true});}
});
enabled('B7 CLI writes exactly two artifacts to a fresh safe output, never source',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'b7-new-'));const dir=path.join(parent,'output');
 try{
  const command=execFileSync(process.execPath,[path.join(base,'tools/RUN_B7_OFFLINE.mjs'),snapshot,dir],{encoding:'utf8'});
  assert.match(command,/B7_NONEXECUTING_REVIEW_PASS/);
  assert.deepEqual(fs.readdirSync(dir).sort(),['B7_DUAL_LAYER_REVIEW.html','B7_RECONCILED_REVIEW.json']);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'B7_RECONCILED_REVIEW.json'),'utf8')).BuildPlan.status,'NOT_PREPARED');
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
enabled('B7 asymmetric wing explanation is sourced from both immutable rectangle sets',()=>{
 const office=run().candidates.find(x=>x.program==='office'&&x.id==='candidate-02');
 assert.equal(office.massingDetail.conceptInferredWingCells,5);
 assert.equal(office.massingDetail.sourceStyleWingCells,6);
 assert.match(renderB7Dashboard(run()),/翼部幅 概念/);
});
enabled('B7 alternate proposals are independently rechecked against pinned entrance static oracle',()=>{
 const styles=styleMap();
 let count=0;
 for(const issue of run().entranceMatrix.problematicCases)for(const option of issue.alternatives.options){
  const x=option.previewParameters;
  const shape=predictLocalRectangles(x,styles[x.style]);
  const e=evaluateEntrance(shape.rectangles,x.width,x.depth,'hotel');
  assert.equal(e.predictedStatus,'FRONT_RUN_FOUND_STATIC_ONLY');count++;
 }
 assert.ok(count>=36);
});
enabled('B7 source and concept layer maps are reproducible independently of view orientation',()=>{
 const c=run().candidates.find(x=>x.program==='office'&&x.id==='candidate-02');
 const dims=c.dimensions;
 const north=projectCandidate({...input().b3Reports.office.candidates[1],orientation:'north'});
 assert.equal(north.orientedLocal.layers[0].rows.join(''),north.local.layers[0].rows.join(''));
 assert.equal(dims.width,dims.depth+4);
});
enabled('B7 review inputs are never mutated or overwritten on build',()=>{
 const data=input(),before=hash({b3:data.b3Reports,b6:data.b6Report});
 const result=buildB7Review(data);
 assert.equal(hash({b3:data.b3Reports,b6:data.b6Report}),before);safe(result);
});
