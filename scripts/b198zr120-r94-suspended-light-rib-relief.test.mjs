import test from 'node:test';
import assert from 'node:assert/strict';
import {liftR120RealDoorLightRib,buildR120LightRibStudy,RIB,EDGE}
 from './b198zr120-r94-suspended-light-rib-relief.mjs';
const nodes={entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]};
test('R120 quick: real rib peak and connected daylight edging lift without moving source jamb',()=>{
 const a=[.56,.56,-.68],b=[.51,.54,-.68],c=[.51,.55,-.67],d=[.56,.568,-.67];
 const before=[{kind:RIB,a,b,c},{kind:EDGE,a,b:c,c:d},
  {kind:'right_R94_FOLDED_LANTERN_JAMB_NOT_STRUCTURE',
   a:[.56,.47,-.68],b:a,c:[.57,.51,-.69]}];
 const original=JSON.stringify(before);
 const after=liftR120RealDoorLightRib(before,0,{rise:.1});
 assert.equal(JSON.stringify(before),original);
 assert.deepEqual(after.changedIndices,[0,1]);
 assert.deepEqual(after.faces[2],before[2]);
 assert.deepEqual(after.faces[0].a,a);
 assert.equal(after.faces[0].b[1],.64);
 assert.equal(after.faces[1].b[1],.65);
 assert.throws(()=>liftR120RealDoorLightRib(before,0,{rise:.2}),
 /VERIFIED_R94_RIB_AND_ATTACHED_DAYLIGHT_EDGE_REQUIRED/);
});
test('R120 real: source R94 suspended light rib + original reading bench with unchanged R91 floor',()=>{
 const study=buildR120LightRibStudy(nodes),r=study.report;
 assert.equal(r.provenR119CollisionTriangle,4535);
 assert.equal(r.provenR119CollisionKind,RIB);
 assert.equal(r.studiedLightRibLifts.length,4);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.humanArtApproval,'NOT_REVIEWED');
 assert.equal(r.revisionIncludesAuthenticSeatAndCanopy,true);
 if(r.selected){
  assert(r.selected.overhead<7);
  assert.equal(r.selected.floor,0);
  assert.equal(r.selected.lateral,0);
  assert.equal(r.selected.oldFiveSourceCorridorsNonregressing,true);
 } else assert.equal(r.geometryChanged,false);
 console.log('R120_REAL_R94_LIGHT_RIB',JSON.stringify({status:r.status,
  candidates:r.studiedLightRibLifts,selected:r.selected}));
});
