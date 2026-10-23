import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveR110SourceLane,buildR110RightSourceApproachStudy,
 PROFILE_STATIONS} from './b198zr110-source-contoured-right-room-approach.mjs';

const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R110 quick: finite stable nine-station profile and reject invented floors',()=>{
 assert.equal(PROFILE_STATIONS.length,9);
 assert.deepEqual([...PROFILE_STATIONS].sort((a,b)=>a-b),PROFILE_STATIONS);
 assert.equal(PROFILE_STATIONS[0],0);
 assert.equal(PROFILE_STATIONS.at(-1),1);
 assert.throws(()=>deriveR110SourceLane([],[],.035),
  /AUTHENTICATED_REAL_SOURCE_AND_BOUNDED_GAP_REQUIRED/);
 assert.throws(()=>deriveR110SourceLane([],Array(4692).fill(null),.05),
  /AUTHENTICATED_REAL_SOURCE_AND_BOUNDED_GAP_REQUIRED/);
});
test('R110 real: source-backed R87/R94 transition profile cannot fake a floor',()=>{
 const r=buildR110RightSourceApproachStudy(nodes);
 assert.equal(r.geometryChanged,false);
 assert.equal(r.previousRawSourceLaneOverheadTotal,2);
 assert.equal(r.r109ConditionalTotal,1);
 assert.equal(r.candidateCount,4);
 assert.equal(r.verifiedFiveSourceLanes.length,5);
 assert.equal(r.priorR109OtherFourLanesPreserved,true);
 assert.equal(r.artQuality,'NOT_REVIEWED');
 assert.equal(r.humanWalkingCertified,false);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.safety.gates.length,9);
 if(r.qualifiedByBoundedFloorSource){
  assert.equal(r.r110ConditionalTotal,0);
  assert.equal(r.selectedProfile.length,9);
  assert.equal(r.selectedRoute.length,9);
  assert(r.selectedProfile.every(x=>x.allThreeRealFloorSamples));
 }else{
  assert.equal(r.r110ConditionalTotal,1);
  assert.equal(r.selectedRoute,null);
 }
 console.log('R110_REAL_SOURCE_ROOM_APPROACH',JSON.stringify({
  decision:r.decision,raw:r.previousRawSourceLaneOverheadTotal,
  r109:r.r109ConditionalTotal,r110:r.r110ConditionalTotal,
  candidates:r.candidateSummaries,selectedGap:r.selectedFootGap,
  endpoints:r.selectedRoute?[r.selectedRoute[0],r.selectedRoute.at(-1)]:null
 }));
});
