import test from 'node:test';
import assert from 'node:assert/strict';
import {insetR118ActualConnectedSeat,buildR118JoinedSeat,SEAT}
 from './b198zr118-reading-seat-clearance.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R118 quick: setback full continuous real seat with unchanged rear rail and unrelated floor',()=>{
 const a=[.5,.42,-.7],b=[.5,.42,-.65],c=[.7,.42,-.65],d=[.7,.42,-.7];
 const orig=[{kind:SEAT,a,b,c},{kind:SEAT,a:a,b:c,c:d},
  {kind:'unmodified_floor',a:[.5,.32,-.7],b:[.7,.32,-.65],c:[.5,.32,-.65]}];
 const frozen=JSON.stringify(orig);
 const v=insetR118ActualConnectedSeat(orig,0,.55);
 assert.equal(JSON.stringify(orig),frozen);
 assert.deepEqual(v.indices,[0,1]);
 assert.equal(v.faces[0].a[0],.61);
 assert.equal(v.faces[0].c[0],.7);
 assert.deepEqual(v.faces[2],orig[2]);
 assert.throws(()=>insetR118ActualConnectedSeat(orig,0,.98),/AUTHENTIC_SEAT_REQUIRED/);
});
test('R118 real: record every source-grounded raised lantern plus reading seat alternative',()=>{
 const v=buildR118JoinedSeat(nodes),r=v.report;
 assert.equal(r.candidateRecords.length,4);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.originalFloorAndReadingProgramPreserved,true);
 if(r.chosen){
  assert(r.chosen.overhead<7);
  assert.equal(r.chosen.floor,0);
  assert.equal(r.chosen.lateral,0);
  assert.equal(r.chosen.originalFiveLanesNonregressing,true);
 }else assert.equal(r.geometryChanged,false);
 console.log('R118_REAL_READING_SEAT',JSON.stringify({
  status:r.status,candidates:r.candidateRecords,selected:r.chosen
 }));
});
