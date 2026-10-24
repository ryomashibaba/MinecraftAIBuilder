import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {analyzeR64UnclaimedFloorConnectivity}
 from './b198zr64-unclaimed-floor-connectivity.mjs';
import {assessR70ProvisionalEntranceRoutes,writeR70ProvisionalEntranceRoutes}
 from './b198zr70-exterior-approach-route-review.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,origin,size,material='stone')=>({
 id,shape:'box',mode:'add',material,origin,size});
const make=elements=>{
 const p=r32Courtyard();
 p.design.elements=elements;
 return p;
};
const audit=p=>{
 const raw=JSON.stringify(p),c=compileDesign(p.design);
 const args={raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:c.geometrySha256};
 return {r:assessR70ProvisionalEntranceRoutes(args),
  r64:analyzeR64UnclaimedFloorConnectivity(args),args};
};
test('R70 open low deck provides provisional seeds but disconnected upper floor remains unreached',()=>{
 const p=make([
  box('floor',[0,0,0],[12,1,12]),
  box('separated-upper',[0,5,0],[12,1,12])
 ]);
 const {r,r64}=audit(p),m=r.metrics;
 assert.equal(r.status,'PROVISIONAL_LOW_LEVEL_APPROACH_ROUTE_FACTS_ONLY');
 assert.equal(m.lowestSupportedFeetY,1);
 assert.equal(m.supportedTwoHighStandingPositions,
  r64.metrics.supportedTwoHighStandingPositions);
 assert(m.lowLevelClearAirRayApproachCandidates>0);
 assert(m.provisionallyReachedSupportedPositions>0);
 assert.equal(m.upperLevelSupportedPositions,144);
 assert.equal(m.provisionallyReachedUpperPositions,0);
 assert(r.possibleConcerns.some(x=>
  x.kind==='LOW_LEVEL_CANDIDATES_DO_NOT_REACH_ANY_UPPER_SUPPORT'));
 assert.equal(r.inferredSeedsAreNotRealBuildingEntrances,true);
 assert.equal(r.clearAirRayDoesNotProveSupportedOutsideApproach,true);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
});
test('R70 concept staircase gives a provisional lower-to-upper supported path',()=>{
 const p=make([
  box('ground',[0,0,0],[12,1,12]),
  {id:'source-stairs',shape:'staircase',mode:'add',material:'wood',
   origin:[2,0,5],axis:'x',direction:1,width:2,steps:5,treadDepth:1},
  box('upper',[6,4,0],[6,1,12])
 ]);
 const {r}=audit(p),m=r.metrics;
 assert(m.lowLevelClearAirRayApproachCandidates>0);
 assert(m.upperLevelSupportedPositions>0);
 assert(m.provisionallyReachedUpperPositions>0);
 assert(m.reachedRisingMotionTreeEdges>0);
 assert.equal(r.realPlayerWalkingAndDoorCollisionNotTested,true);
 assert.equal(r.higherFloorsNotRecognizedAsSpecificProgramDestinations,true);
});
test('R70 sealed low room has zero independently inferable entry ray and honest HOLD',()=>{
 const p=make([
  box('foundation',[1,0,1],[14,1,14]),
  box('roof',[1,6,1],[14,1,14]),
  box('wall-west',[1,1,1],[1,5,14]),
  box('wall-east',[14,1,1],[1,5,14]),
  box('wall-north',[1,1,1],[14,5,1]),
  box('wall-south',[1,1,14],[14,5,1])
 ]);
 const {r}=audit(p),m=r.metrics;
 assert.equal(r.status,'HOLD_NO_INFERABLE_LOW_LEVEL_AIR_APPROACH');
 assert(m.supportedTwoHighStandingPositions>0);
 assert.equal(m.lowLevelClearAirRayApproachCandidates,0);
 assert.equal(m.provisionallyReachedSupportedPositions,null);
 assert.equal(m.provisionallyReachedUpperPositions,null);
 assert(r.possibleConcerns.some(x=>x.kind==='NO_LOW_LEVEL_EXTERIOR_AIR_RAY_SEEDS'));
 assert.equal(r.lowestLocalFeetHeightNotStreetElevation,true);
});
test('R70 simple open gap is seen as air approach but is NOT certified building doorway',()=>{
 const p=make([
  box('foundation',[1,0,1],[14,1,14]),
  box('roof',[1,6,1],[14,1,14]),
  box('wall-west',[1,1,1],[1,5,14]),
  box('wall-east',[14,1,1],[1,5,14]),
  box('wall-north-left',[1,1,1],[6,5,1]),
  box('wall-north-right',[9,1,1],[6,5,1]),
  box('wall-south',[1,1,14],[14,5,1])
 ]);
 const {r}=audit(p),m=r.metrics;
 assert(m.lowLevelClearAirRayApproachCandidates>0);
 assert(m.provisionallyReachedSupportedPositions>0);
 assert.equal(r.inferredSeedsAreNotRealBuildingEntrances,true);
});
test('R70 full monolith never fabricates access or reachable stairs',()=>{
 const {r}=audit(make([box('solid',[0,0,0],[16,12,16])]));
 assert.equal(r.status,'HOLD_NO_SUPPORTED_TWO_HIGH_POSITIONS');
 assert.equal(r.metrics.supportedTwoHighStandingPositions,0);
 assert.equal(r.metrics.lowLevelClearAirRayApproachCandidates,0);
 assert.equal(r.metrics.provisionallyReachedSupportedPositions,null);
 assert.equal(r.metrics.upperReachShare,null);
});
test('R70 does not inspect model-invented entrance/destination coordinates',()=>{
 const p=r32Courtyard(),q=structuredClone(p);
 q.spatialPlan={entrance:[999,999,999],headroom:1,
  destinations:[],protectedVoids:[],functionalZones:[]};
 const a=audit(p).r,b=audit(q).r;
 assert.deepEqual(a.metrics,b.metrics);
 assert.deepEqual(a.possibleConcerns,b.possibleConcerns);
 assert.equal(a.sourceSpatialPlanAndModelEntranceIgnored,true);
 assert.equal(a.noHumanArchitecturalOrAestheticPass,true);
});
test('R70 refuses stale original bytes, incorrect geometry and noncompiled proposal',()=>{
 const p=r32Courtyard(),{args}=audit(p);
 assert.throws(()=>assessR70ProvisionalEntranceRoutes({
  ...args,expectedRawSha256:'0'.repeat(64)}),
 /IMMUTABLE_SOURCE_AND_GEOMETRY_SHA_REQUIRED/);
 assert.throws(()=>assessR70ProvisionalEntranceRoutes({
  ...args,expectedGeometrySha256:'0'.repeat(64)}),
 /STRICT_GEOMETRY_SHA_MISMATCH/);
 p.design.elements.push(box('bad',[0,p.design.bounds.height,0],[2,1,2]));
 const raw=JSON.stringify(p);
 assert.throws(()=>assessR70ProvisionalEntranceRoutes({
  raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:args.expectedGeometrySha256}),
 /STRICT_B143_COMPILED_FINAL_VOXELS_REQUIRED/);
});
test('R70 writes fresh offline JSON and HTML only; no overwrite',()=>{
 const {args}=audit(r32Courtyard());
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r70-exterior-route-'));
 try{
  const out=writeR70ProvisionalEntranceRoutes({...args,destination:dir});
  assert.equal(out.modelCalls,0);
  const evidence=JSON.parse(fs.readFileSync(path.join(dir,
   'R70_APPROACH_ROUTE_EVIDENCE.json'),'utf8'));
  assert.equal(evidence.independentHumanReview,'NOT_REVIEWED');
  assert.equal(evidence.sourceSpatialPlanAndModelEntranceIgnored,true);
  const html=fs.readFileSync(path.join(dir,
   'R70_APPROACH_TO_UPPER_LEVELS_REVIEW.html'),'utf8');
  assert(html.includes('外側')&&html.includes('Minecraft'));
  assert.throws(()=>writeR70ProvisionalEntranceRoutes({
   ...args,destination:dir}),/NO_OUTPUT_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
