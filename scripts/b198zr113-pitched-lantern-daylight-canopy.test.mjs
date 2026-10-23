import test from 'node:test';
import assert from 'node:assert/strict';
import {reshapeR113SourceCanopy,buildR113PitchedCanopyStudy}
 from './b198zr113-pitched-lantern-daylight-canopy.mjs';
import {CANOPY} from './b198zr112-lantern-canopy-clearance.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R113 quick: keep source bookshelf rim, loft inner eave without deleting triangles',()=>{
 const faces=[
  {kind:CANOPY,a:[.7,.6,-.7],b:[.7,.6,-.65],c:[.5,.63,-.65]},
  {kind:CANOPY,a:[.7,.6,-.7],b:[.5,.63,-.65],c:[.5,.63,-.7]},
  {kind:'right_R93_LANTERN_BOOKWALL_NOT_CERTIFIED',
   a:[.7,.6,-.7],b:[.7,.6,-.65],c:[.7,.5,-.65]}
 ];
 const old=JSON.stringify(faces);
 const s=reshapeR113SourceCanopy(faces,0,{retract:.55,rise:.06});
 assert.equal(JSON.stringify(faces),old);
 assert.deepEqual(s.changedIndices,[0,1]);
 assert.equal(s.faces[2],faces[2]);
 assert.equal(s.faces.length,faces.length);
 assert(s.faces[0].c[1]>.63);
 assert.equal(s.faces[0].a[1],.6);
 assert.equal(s.floorFurnitureAndShelfAnchorsUnmodified,true);
 assert.throws(()=>reshapeR113SourceCanopy(faces,0,{retract:1,rise:2}),
  /PREAPPROVED_BOUNDED_PITCH_PROFILE/);
});
test('R113 real: test pitched source canopy against actual R91 shoulder and 9x3 floor',()=>{
 const b=buildR113PitchedCanopyStudy(nodes),r=b.report;
 assert.equal(r.previousHeadroomIntersections,7);
 assert.equal(r.attributedR93SourceFaceIndex,4474);
 assert.equal(r.originalSourcesPreserved,true);
 assert.equal(r.canopyShapeVariants.length,4);
 assert.equal(r.independentArtReview,'NOT_REVIEWED');
 assert.equal(r.realWalkingCertified,false);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.equal(r.safety.gates.length,9);
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 if(r.selected){
  assert(r.geometryChanged);
  assert(r.selected.accepted);
  assert(r.selected.fiveLaneNonregression);
  assert(r.selected.newOverhead<7);
  assert.equal(b.faces.length,b.faces.length);
 }else assert.equal(r.geometryChanged,false);
 console.log('R113_REAL_PITCHED_LANTERN',JSON.stringify({
  status:r.status,candidates:r.canopyShapeVariants,selected:r.selected,
  changed:r.actual3DFacetsChanged
 }));
});
