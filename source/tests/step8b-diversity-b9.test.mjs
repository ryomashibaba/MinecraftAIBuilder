import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {buildB9Report,validateB9Report,geometrySignature,structureObservations} from '../runner/step8b-diversity-b9.mjs';
import {renderB9Dashboard} from '../runner/step8b-review-ui-b9.mjs';

const base=path.resolve(import.meta.dirname,'..'),snapshot=process.env.STEP8B_SOURCE_DIR;
const enabled=snapshot?test:test.skip;
const b8=()=>JSON.parse(fs.readFileSync(path.join(base,'reports/B8_REVIEW_CATALOG.json'),'utf8'));
const sig=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
let cached=null;const report=()=>cached??=buildB9Report({b8Report:b8(),snapshotDir:snapshot});
const rehash=x=>{const {reportSha256,...other}=x;x.reportSha256=sig(other);return x;};
const safe=r=>{assert.equal(r.deploymentGate,'BLOCKED');assert.equal(r.BuildPlan.status,'NOT_PREPARED');assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.BuildPlan.commandCount,0);assert.equal(r.safety.constructionApproved,false);assert.equal(r.safety.executionAllowed,false);assert.equal(r.safety.autoApplied,false);};
enabled('B9.1 provenance fixed: trusted 249-file manifest, 8B catalog exact digest',()=>{
 const r=report();safe(r);assert.equal(r.baseB8ReportSha256,b8().reportSha256);assert.equal(r.sourceEvidence.snapshotManifestSha256,b8().sourceManifestSha256);
 assert.equal(r.sourceEvidence.roofExposureSourceObserved,true);assert.equal(r.sourceEvidence.otherModuleConflictSourceVerified,false);
});
enabled('B9.1 all 432 candidates retain identical geometry and count, 5 original preserved',()=>{
 const r=report();assert.equal(r.candidates.length,432);assert.equal(r.existingFrozenCandidates.length,5);
 assert.equal(r.existingFrozenCandidates.reduce((n,c)=>n+c.sourceVsConceptDifferenceCells,0),123);
 assert.equal(r.preservedBoundaryEntranceFailures,36);
 for(const c of r.candidates){const original=b8().proposals.find(x=>x.id===c.id);assert.deepEqual(c.sourcePredictedRectangles,original.sourcePredictedRectangles);assert.deepEqual(c.areaByFloor,original.areaByFloor);}
});
enabled('B9.1 432 identical orientation scenarios collapse to 32 distinct per-program whole-building signatures',()=>{
 const r=report();assert.equal(r.diversity.groupCount,32);assert.deepEqual(r.diversity.uniqueGeometryCountByProgram,{hotel:12,apartment:10,office:10});
 const set=new Set(r.diversity.groups.map(g=>g.program+g.signature));assert.equal(set.size,32);
 const flattened=r.diversity.groups.flatMap(g=>g.geometryMemberIds).sort(),expected=r.candidates.map(c=>c.id).sort();assert.deepEqual(flattened,expected);
 for(const c of r.candidates)assert.equal(c.geometryHash,geometrySignature(c.sourcePredictedRectangles,c.dimensions));
});
test('B9.1 fingerprint rotation-invariant for non-square and multi-floor geometry',()=>{
 const original=[{x:0,z:0,width:3,depth:2,start:0,end:2},{x:1,z:2,width:2,depth:3,start:1,end:2}];
 const rotated=[{x:13,z:0,width:2,depth:3,start:0,end:2},{x:10,z:1,width:3,depth:2,start:1,end:2}];
 assert.equal(geometrySignature(original,{width:15,depth:15,floors:2}),geometrySignature(rotated,{width:15,depth:15,floors:2}));
 const changed=structuredClone(original);changed[0].end=1;assert.notEqual(geometrySignature(original,{width:15,depth:15,floors:2}),geometrySignature(changed,{width:15,depth:15,floors:2}));
});
enabled('B9.2 Pareto candidates are non-dominated in their program using three B8 metrics',()=>{
 const r=report();assert.equal(r.diversity.groups.filter(g=>g.paretoFront).length,14);
 const lookup=new Map(r.candidates.map(x=>[x.id,x]));
 for(const g of r.diversity.groups.filter(x=>x.paretoFront)){
  const x=lookup.get(g.selectedId);assert.ok(x);
  assert.ok(!r.diversity.groups.some(h=>h.program===g.program&&h!==g&&['occupancyRatio','floorRetentionRatio','tierVariationRatio'].every(k=>lookup.get(h.selectedId)[k]>=x[k])&&['occupancyRatio','floorRetentionRatio','tierVariationRatio'].some(k=>lookup.get(h.selectedId)[k]>x[k])));
 }
});
enabled('B9.3 accepts strictly bounded site inputs without creating operational plan',()=>{
 const custom={program:'hotel',width:15,depth:20,floors:6,style:'urban_japanese',seed:1,orientation:'east',massing:'U_shape'};
 const r=buildB9Report({b8Report:b8(),snapshotDir:snapshot,custom});assert.equal(r.customCandidate.dimensions.width,15);assert.equal(r.customCandidate.entrance.predictedStatus,'PREDICTED_PLANNER_ENTRANCE_REJECTION');safe(r);safe({...r,BuildPlan:r.customCandidate.BuildPlan});
 assert.equal(r.customCandidate.worldCoordinates,null);assert.deepEqual(r.customCandidate.materialBlockIds,[]);assert.equal(validateB9Report(r),true);
});
enabled('B9.3 refuses unsupported fields, unknown seed/style, noninteger and oversized sites',()=>{
 const c={program:'hotel',width:26,depth:20,floors:6,style:'modern',seed:0,orientation:'north',massing:'stepped'};
 for(const invalid of [{...c,world:{x:1}}, {...c,constructionApproved:true},{...c,width:48.5},{...c,width:49},{...c,depth:11},{...c,floors:11},{...c,seed:99},{...c,program:'museum'},{...c,massing:'unsupported'},{...c,style:'../secrets'},{...c,orientation:'up'},[c],null]){
  assert.throws(()=>buildB9Report({b8Report:b8(),snapshotDir:snapshot,custom:invalid}));
 }
});
test('B9.4 two dimensional connected components and unsupported upper-layer extension detected',()=>{
 const rectangles=[{x:0,z:0,width:3,depth:3,start:0,end:2},{x:11,z:11,width:3,depth:3,start:1,end:2}];
 const s=structureObservations(rectangles,{width:15,depth:15,floors:2});
 assert.deepEqual(s.upperOverhangByFloor,[0,9]);assert.deepEqual(s.componentsByFloor.map(x=>x.length),[1,2]);assert.deepEqual(s.exposedRoofAreaByFloor,[0,18]);
 assert.ok(s.warnings.includes('DISCONNECTED_FOOTPRINT_2D'));assert.equal(s.checks.stairsAndEgress,'UNVERIFIED');assert.equal(s.checks.roofSeal,'UNVERIFIED');
});
test('B9.4 overlapping masses are only observed, not falsely treated as module interference',()=>{
 const s=structureObservations([{x:0,z:0,width:5,depth:5,start:0,end:2},{x:2,z:2,width:5,depth:5,start:0,end:2}],{width:15,depth:15,floors:2});
 assert.deepEqual(s.massOverlapCellsByFloor,[9,9]);assert.equal(s.checks.moduleInterference,'UNVERIFIED');assert.ok(s.warnings.includes('OVERLAPPING_MASS_RECTANGLES_NOT_MODULE_COLLISION'));
});
enabled('B9.4 roof mask count bounded by footprint and source claims not overstated',()=>{
 for(const c of report().candidates){for(const v of c.structure.exposedRoofAreaByFloor)assert.ok(v>=0&&v<=c.dimensions.width*c.dimensions.depth);
 assert.equal(c.structure.checks.structuralSupport,'UNVERIFIED');assert.equal(c.structure.checks.moduleInterference,'UNVERIFIED');}
});
enabled('B9.5 altered / forged B8 digest rejected despite recomputed checksum',()=>{
 const broken=b8();broken.proposals[0].score=100;broken.reportSha256=sig(Object.fromEntries(Object.entries(broken).filter(([k])=>k!=='reportSha256')));
 assert.throws(()=>buildB9Report({b8Report:broken,snapshotDir:snapshot}),{code:'B9_B8_FROZEN_REPORT_CHANGED'});
});
enabled('B9.5 tampered or rehashed source manifest / approved BuildPlan / child operations rejected',()=>{
 const fns=[x=>x.sourceEvidence.snapshotManifestSha256='x',x=>x.deploymentGate='READY',x=>x.safety.constructionApproved=true,x=>x.BuildPlan.operations.push({command:'/setblock'}),x=>x.candidates[0].BuildPlan.commandCount=1,x=>x.candidates[0].materialBlockIds.push('stone'),x=>x.limitations.realPlannerInvoked=true];
 for(const f of fns){const r=structuredClone(report());f(r);rehash(r);assert.throws(()=>validateB9Report(r),{code:'B9_REPORT_UNSAFE_OR_TAMPERED'});}
});
enabled('B9.6 standalone B9 HTML has no fetch, websocket, active Minecraft calls',()=>{
 const h=renderB9Dashboard(report());assert.match(h,/NOT PREPARED/);assert.match(h,/32/);assert.match(h,/Pareto/);assert.match(h,/createObjectURL/);
 assert.doesNotMatch(h,/<iframe|<script[^>]*src\s*=|\bfetch\s*\(|WebSocket|XMLHttpRequest|localStorage|http:\/\/|https:\/\/|8765|localhost/);
});
enabled('B9.6 actual generated inline JS passes node syntax check',()=>{
 const h=renderB9Dashboard(report());const start=h.lastIndexOf('<script>'),end=h.indexOf('</script>',start);
 assert.ok(start>0&&end>start);const script=h.slice(start+8,end);
 assert.equal(execFileSync(process.execPath,['--check','-'],{input:script,encoding:'utf8'}),'');
});
test('B9.6 safe offline CLI refuses existing output without writing',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b9-existing-'));try{
  const file=path.join(dir,'guard');fs.writeFileSync(file,'protected');
  assert.throws(()=>execFileSync(process.execPath,[path.join(base,'tools/RUN_B9_OFFLINE.mjs'),'/invalid',dir],{stdio:'pipe'}),{status:1});assert.equal(fs.readFileSync(file,'utf8'),'protected');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
enabled('B9.6 CLI builds only two static artifacts with optional bounded custom JSON',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'b9-new-'));
 try{const file=path.join(temp,'custom.json'),dest=path.join(temp,'output');fs.writeFileSync(file,JSON.stringify({program:'office',width:24,depth:20,floors:6,style:'modern',seed:0,orientation:'north',massing:'slab'}));
  const out=execFileSync(process.execPath,[path.join(base,'tools/RUN_B9_OFFLINE.mjs'),snapshot,dest,file],{encoding:'utf8'});assert.match(out,/B9_READONLY_PREVIEW_PASS/);
  assert.deepEqual(fs.readdirSync(dest).sort(),['B9_REVIEW.html','B9_STATIC_REVIEW.json']);
  const saved=JSON.parse(fs.readFileSync(path.join(dest,'B9_STATIC_REVIEW.json'),'utf8'));safe(saved);assert.ok(saved.customCandidate);}
 finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('B9.6 new source imports exclude production planner and network capabilities',()=>{
 for(const name of ['runner/step8b-diversity-b9.mjs','runner/step8b-review-ui-b9.mjs','tools/RUN_B9_OFFLINE.mjs']){
  const s=fs.readFileSync(path.join(base,name),'utf8');assert.doesNotMatch(s,/from\s+['"][^'"]*(?:engine\/src|bridge\/src)|\bfetch\s*\(|\bspawn\s*\(|\bexecFile\s*\(|https?:\/\//);
 }
});
