import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {assessR70ProvisionalEntranceRoutes}
 from './b198zr70-exterior-approach-route-review.mjs';
import {inspectR71AbstractRouteGaps,writeR71AbstractRouteGaps}
 from './b198zr71-abstract-route-gap-triage.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,origin,size,material='stone')=>({
 id,shape:'box',mode:'add',material,origin,size});
const make=elements=>{
 const p=r32Courtyard();
 p.design.elements=elements;return p;
};
function check(p){
 const raw=JSON.stringify(p),compiled=compileDesign(p.design);
 const args={raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256};
 const r70Evidence=assessR70ProvisionalEntranceRoutes(args);
 return {result:inspectR71AbstractRouteGaps({...args,r70Evidence}),
  args:{...args,r70Evidence}};
}
test('R71 identifies disconnected upper supported mass and nearest two honest voxel coordinates',()=>{
 const {result:r}=check(make([
  box('low-floor',[0,0,0],[12,1,12]),
  box('separate-upper',[0,5,0],[12,1,12])
 ]));
 const m=r.metrics;
 assert.equal(r.status,'HUMAN_REVIEW_DISCONNECTED_SUPPORTED_COMPONENTS');
 assert.equal(m.supportedTwoHighStandingPositions,288);
 assert.equal(m.originalR70ProvisionalApproachSeeds>0,true);
 assert.equal(m.unreachableSupportedPositions,144);
 assert.equal(m.unreachableUpperSupportedPositions,144);
 assert.equal(m.unreachableSupportedMotionComponents,1);
 assert.equal(m.topUnreachableComponents[0].supportedPositions,144);
 assert.equal(m.topUnreachableComponents[0].upperSupportPositions,144);
 const pair=m.topUnreachableComponents[0];
 assert.equal(pair.optimisticManhattanCellDistance,5);
 assert.equal(pair.verticalCellSeparation,5);
 assert.equal(pair.gapReviewCategory,'HEIGHT_SEPARATION_TO_REVIEW');
 assert.equal(pair.bridgeGeometryProposed,false);
 assert.equal(r.closestPointsDoNotRepresentWalkableRoute,true);
 assert.equal(r.realMinecraftMotionNotVerified,true);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
});
test('R71 stairs connect upper support and do not fabricate gap pair',()=>{
 const {result:r}=check(make([
  box('base',[0,0,0],[12,1,12]),
  {id:'stairs',shape:'staircase',mode:'add',material:'wood',
   origin:[2,0,5],axis:'x',direction:1,width:2,steps:5,treadDepth:1},
  box('upper',[6,4,0],[6,1,12])
 ]));
 assert.equal(r.metrics.originalR70ProvisionalApproachSeeds>0,true);
 assert(r.metrics.provisionallyReachedStandingPositions>0);
 assert(r.metrics.provisionallyReachedStandingPositions>
  r.metrics.originalR70ProvisionalApproachSeeds);
 assert(r.metrics.unreachableUpperSupportedPositions<
  r.metrics.upperSupportedPositions);
 assert.equal(r.noHumanQualityCertification,true);
});
test('R71 no inferable entry rays makes no fake gap distance or false route',()=>{
 const {result:r}=check(make([
  box('foundation',[1,0,1],[14,1,14]),
  box('roof',[1,6,1],[14,1,14]),
  box('west',[1,1,1],[1,5,14]),
  box('east',[14,1,1],[1,5,14]),
  box('north',[1,1,1],[14,5,1]),
  box('south',[1,1,14],[14,5,1])
 ]));
 assert.equal(r.status,'HOLD_NO_VERIFIED_ENTRY_PROXY_SEEDS');
 assert.equal(r.metrics.originalR70ProvisionalApproachSeeds,0);
 assert.equal(r.metrics.unreachableSupportedPositions,null);
 assert.equal(r.metrics.unreachableSupportedMotionComponents,null);
 assert.deepEqual(r.metrics.topUnreachableComponents,[]);
 assert.equal(r.possibleConcerns[0].kind,'R71_NO_APPROACH_NO_GAP_PAIR_INFERENCE');
});
test('R71 monolithic building has no supported space and cannot invent route gap',()=>{
 const {result:r}=check(make([box('mass',[0,0,0],[16,12,16])]));
 assert.equal(r.status,'HOLD_NO_SUPPORTED_STANDING_POSITIONS');
 assert.equal(r.metrics.supportedTwoHighStandingPositions,0);
 assert.equal(r.metrics.unreachableSupportedPositions,null);
});
test('R71 ignores model-authored entrance and stays byte-independent for geometry metrics',()=>{
 const p=r32Courtyard(),q=structuredClone(p);
 q.spatialPlan={entrance:[999,999,999],destinations:[],
  functionalZones:[],protectedVoids:[],headroom:0};
 const a=check(p).result,b=check(q).result;
 assert.deepEqual(a.metrics,b.metrics);
 assert.deepEqual(a.possibleConcerns,b.possibleConcerns);
 assert.equal(a.originalSpatialPlanNotConsulted,true);
 assert.equal(a.noMissingStairOrWallDiagnosis,true);
});
test('R71 rejects mismatched R70 evidence even when its source hashes are present',()=>{
 const p=check(r32Courtyard());
 const forged=structuredClone(p.args.r70Evidence);
 forged.metrics.lowLevelClearAirRayApproachCandidates++;
 assert.throws(()=>inspectR71AbstractRouteGaps({
  ...p.args,r70Evidence:forged}),/R70_AUTHENTICATED_EVIDENCE_REQUIRED/);
 assert.throws(()=>inspectR71AbstractRouteGaps({
  ...p.args,r70Evidence:null}),/R70_AUTHENTICATED_EVIDENCE_REQUIRED/);
 assert.throws(()=>inspectR71AbstractRouteGaps({
  ...p.args,expectedGeometrySha256:'f'.repeat(64)}),
 /STRICT_GEOMETRY_SHA_MISMATCH/);
 assert.throws(()=>inspectR71AbstractRouteGaps({
  ...p.args,expectedRawSha256:'f'.repeat(64)}),
 /IMMUTABLE_SOURCE_AND_GEOMETRY_SHA_REQUIRED/);
});
test('R71 refuses noncompiled B143 proposal',()=>{
 const p=r32Courtyard(),valid=check(p);
 p.design.elements.push(box('outside',[0,p.design.bounds.height,0],[2,1,2]));
 const raw=JSON.stringify(p);
 assert.throws(()=>inspectR71AbstractRouteGaps({
  ...valid.args,raw,expectedRawSha256:sha(raw)}),
 /STRICT_B143_COMPILED_FINAL_VOXELS_REQUIRED/);
});
test('R71 only writes fresh, immutable offline review; refuses overwrite',()=>{
 const {args}=check(r32Courtyard());
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r71-gap-review-'));
 try{
  const out=writeR71AbstractRouteGaps({...args,destination:dir});
  assert.equal(out.modelCalls,0);
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'R71_ROUTE_GAPS_EVIDENCE.json'),'utf8'));
  assert.equal(json.r70EvidenceRecomputedAndAuthenticated,true);
  assert.equal(json.noAutomaticGeometryRepair,true);
  const html=fs.readFileSync(path.join(dir,
   'R71_ROUTE_GAP_TRIAGE_REVIEW.html'),'utf8');
  assert(html.includes('支持床')&&html.includes('Minecraft'));
  assert.throws(()=>writeR71AbstractRouteGaps({...args,destination:dir}),
   /NO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
