import test from 'node:test';
import assert from 'node:assert/strict';
import {studyR119TwoBaySeatClearance,buildR119TwoBayStudy}
 from './b198zr119-two-reading-bay-setback.mjs';
import {SEAT} from './b198zr118-reading-seat-clearance.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R119 quick: corrupted R107 source cannot be used for two-bay architectural changes',()=>{
 assert.throws(()=>studyR119TwoBaySeatClearance({
  faces:[],originalR98Faces:Array(4692).fill(null),report:{}
 }),/SIGNED_R98_AND_R107_REAL_MESH_REQUIRED/);
});
test('R119 real: second adjacent reading seat 4535 on authenticated R118 source geometry',()=>{
 const v=buildR119TwoBayStudy(nodes),r=v.report;
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.r118SingleSeatOverhead,7);
 assert.deepEqual(r.r118SingleSeatHitIndices,[4535]);
 assert.equal(r.secondInterferingSource.index,4535);
 assert.equal(r.originalSourceBuildingPreserved,true);
 if(r.secondIsRealConnectedReadingSeat){
  assert.equal(r.secondInterferingSource.kind,SEAT);
  assert.equal(r.secondBayCandidates.length,4);
 }
 if(r.chosen){
  assert(r.chosen.overhead<7);
  assert.equal(r.chosen.floor,0);
  assert.equal(r.chosen.lateral,0);
  assert.equal(r.chosen.allExistingFiveCorridorsNonregressing,true);
 }else assert.equal(r.sourceGeometryChanged,false);
 console.log('R119_REAL_TWO_BAY_SOURCE',JSON.stringify({
  status:r.decision,face:r.secondInterferingSource,
  candidates:r.secondBayCandidates,selected:r.chosen
 }));
});
