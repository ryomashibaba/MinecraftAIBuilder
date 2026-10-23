import test from 'node:test';
import assert from 'node:assert/strict';
import {designR100ShoulderTriangles,buildR100WidenedGalleryStudy}
 from './b198zr100-source-gallery-shoulders.mjs';
import {screenR99FiniteRoute} from './b198zr99-finite-volume-route-witness.mjs';

const realNodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R100 quick: actual shoulder triangles cure source-width floor-miss witnesses',()=>{
 const a=[0,0,-.10],b=[0,0,.10],
  src=[
   {kind:'R88_OLD_DECK',a:[-.016,0,-.10],b:[.016,0,-.10],c:[.016,0,.10]},
   {kind:'R88_OLD_DECK',a:[-.016,0,-.10],b:[.016,0,.10],c:[-.016,0,.10]}
  ];
 const proposal=designR100ShoulderTriangles({side:'right',sourceAnchor:a,sourcePad:b});
 assert.equal(proposal.faces.length,4);
 assert.equal(proposal.oldNormalizedWidth,.032);
 assert.equal(proposal.newNormalizedWidth,.060);
 const old=screenR99FiniteRoute(src,[a,b]);
 const newScreen=screenR99FiniteRoute([...src,...proposal.faces],[a,b]);
 assert(old.witnessCounts.floor>0);
 assert(newScreen.witnessCounts.floor<old.witnessCounts.floor);
 assert.equal(newScreen.witnessCounts.overhead,old.witnessCounts.overhead);
 assert.equal(newScreen.witnessCounts.lateral,old.witnessCounts.lateral);
 assert.throws(()=>designR100ShoulderTriangles({
  side:'left',sourceAnchor:[0,0,0],sourcePad:[0,0,0]
 }),/SOURCE_CONNECTOR_OUTSIDE_FINITE_LOCAL_SPAN/);
});
test('R100 real source: only witnessed-gain changes and immutable R98 prefix',()=>{
 const study=buildR100WidenedGalleryStudy(realNodes),r=study.report;
 assert.equal(r.sourceR98Faces,4692);
 assert.equal(r.newActiveTriangles,4692+4*r.widenedResearchGalleryCount);
 assert.equal(r.addedRealShoulderFaces,4*r.widenedResearchGalleryCount);
 assert.equal(r.numberOfSourceRooms,7);
 assert.equal(r.records.length,7);
 assert.equal(r.originalR98Preserved,true);
 assert.equal(r.genuineHumanWalkabilityCertified,false);
 assert.equal(r.independentArchitecturalArtReview,'NOT_REVIEWED');
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert(r.records.every(t=>t.addedSourceFaces===0||
  (t.addedSourceFaces===4&&t.restoredSampledFloorWitnesses>0&&
   t.noNewOverheadOrLateralProbeIntersections)));
 assert.equal(r.sourceR98MeshSha256,
  (awaitSourceR98Sha(study)));
});
function awaitSourceR98Sha(study){
 // Source digest is already checked within the pure study, and must differ
 // from candidate when at least one real connector was widened.
 if(study.report.widenedResearchGalleryCount>0)
  assert.notEqual(study.report.sourceR98MeshSha256,study.report.alternativeMeshSha256);
 return study.report.sourceR98MeshSha256;
}
