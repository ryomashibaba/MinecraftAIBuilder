import test from 'node:test';
import assert from 'node:assert/strict';
import {CANOPY,retreatR112SourceCanopy,buildR112LanternCanopyStudy}
 from './b198zr112-lantern-canopy-clearance.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R112 quick: sculpt a continuous two-triangle eave, keep shelf anchors and original bytes',()=>{
 const faces=[
  {kind:CANOPY,a:[.7,.6,-.7],b:[.7,.6,-.65],c:[.5,.63,-.65]},
  {kind:CANOPY,a:[.7,.6,-.7],b:[.5,.63,-.65],c:[.5,.63,-.7]},
  {kind:'right_R93_LANTERN_BOOKWALL_NOT_CERTIFIED',
   a:[.7,.6,-.7],b:[.7,.6,-.65],c:[.7,.5,-.65]}
 ];
 const old=JSON.stringify(faces);
 const alt=retreatR112SourceCanopy(faces,0,{fraction:.55});
 assert.equal(JSON.stringify(faces),old);
 assert.deepEqual(alt.changedIndices,[0,1]);
 assert.equal(alt.faces.length,3);
 assert.equal(alt.faces[2],faces[2]);
 assert(alt.faces[0].c[0]>.5);
 assert.equal(alt.faces[0].a[0],.7);
 assert.equal(alt.canopyFacetCountPreserved,true);
 assert.throws(()=>retreatR112SourceCanopy(faces,2,{fraction:.55}),
  /AUTHENTIC_R93_CANOPY_TRIANGLE/);
 assert.throws(()=>retreatR112SourceCanopy(faces,0,{fraction:1}),
  /AUTHENTIC_R93_CANOPY_TRIANGLE/);
});
test('R112 real: conservatively retreat offending R93 lantern eave while preserving actual floor',()=>{
 const a=buildR112LanternCanopyStudy(nodes),r=a.report;
 assert.equal(r.originalR110OverheadHits,7);
 assert.equal(r.originalSourceTriangle,4474);
 assert.equal(r.originalSourceKind,CANOPY);
 assert.equal(r.originalR110HitWitnesses.length,7);
 assert.equal(r.canopyRetreatCandidates.length,4);
 assert.equal(r.originalSourceR98Preserved,true);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.safety.gates.length,9);
 assert.equal(r.humanWalkingCertified,false);
 assert.equal(r.artReview,'NOT_REVIEWED');
 if(r.selected){
  assert(r.sourceGeometryChanged);
  assert(r.selected.accepted);
  assert(r.selected.fiveLaneNonregression);
  assert(r.selected.overheadHits<7);
  assert(r.changedCanopyFacets>0);
 }else{
  assert.equal(r.sourceGeometryChanged,false);
 }
 console.log('R112_REAL_CANOPY_CLEARANCE',JSON.stringify({
  status:r.status,original:r.originalR110OverheadHits,
  candidates:r.canopyRetreatCandidates,selected:r.selected,
  changed:r.changedCanopyFacets
 }));
});
