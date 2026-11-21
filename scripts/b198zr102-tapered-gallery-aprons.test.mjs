import test from 'node:test';
import assert from 'node:assert/strict';
import {designR102TaperedShoulderTriangles,buildR102TaperedGalleryStudy}
 from './b198zr102-tapered-gallery-aprons.mjs';
import {screenR99FiniteRoute}
 from './b198zr99-finite-volume-route-witness.mjs';
const sourceNodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R102 quick: tapered shoulders contain real nondegenerate source-connected triangles',()=>{
 const from=[.55,.30,-.1],to=[.55,.30,.1],side='right';
 const t=designR102TaperedShoulderTriangles({side,sourceAnchor:from,sourcePad:to});
 assert.equal(t.faces.length,8);
 assert.equal(t.wideMiddleWidthNormalized,.06);
 assert.equal(t.sourceNarrowWidthNormalized,.032);
 assert.equal(t.centralOriginalGalleryUnmodified,true);
 assert.equal(t.endpoints.length,4);
 assert(t.endpoints.every(p=>Math.abs(Math.abs(p[0]-.55)-.016)<1e-7));
 assert(t.faces.flatMap(f=>[f.a,f.b,f.c]).every(p=>p[0]>.40));
 assert.throws(()=>designR102TaperedShoulderTriangles({
  side,sourceAnchor:from,sourcePad:to,rampFraction:0
 }),/SOURCE_LINE_AND_TAPER_REQUIRED/);
 assert.throws(()=>designR102TaperedShoulderTriangles({
  side,sourceAnchor:from,sourcePad:from
 }),/SOURCE_CONNECTOR_OUTSIDE_FINITE_LOCAL_SPAN/);
 const old=[
  {kind:'R88',a:[.534,.30,-.1],b:[.566,.30,-.1],c:[.566,.30,.1]},
  {kind:'R88',a:[.534,.30,-.1],b:[.566,.30,.1],c:[.534,.30,.1]}
 ];
 const source=screenR99FiniteRoute(old,[from,to]);
 const extended=screenR99FiniteRoute([...old,...t.faces],[from,to]);
 assert(source.witnessCounts.floor>extended.witnessCounts.floor);
 assert.equal(extended.unscreenedSegmentCount,0);
 assert.equal(extended.witnessCounts.overhead,source.witnessCounts.overhead);
 assert.equal(extended.witnessCounts.lateral,source.witnessCounts.lateral);
});
test('R102 real 7 source links: only independently witnessed taper or exact old R100 geometry',()=>{
 const mesh=buildR102TaperedGalleryStudy(sourceNodes),r=mesh.report;
 assert.equal(r.totalGalleryDestinations,7);
 assert.equal(r.originalSourceFaces,4692);
 assert.equal(r.originalR98ExactPrefix,true);
 assert.equal(mesh.faces.length,4692+r.addedNewActiveTriangles);
 assert.equal(r.taperedEndTransitionCount+r.retainedR100Rectangles+
  r.unmodifiedRejectedGalleryCount,7);
 assert.equal(r.taperedEndTransitionCount+r.retainedR100Rectangles,
  r.oldAcceptedGalleryCount);
 assert.equal(r.addedNewActiveTriangles,
  8*r.taperedEndTransitionCount+4*r.retainedR100Rectangles);
 assert.equal(r.sourceMeshesNotOverwritten,true);
 assert.equal(r.artQuality,'NOT_REVIEWED');
 assert.equal(r.humanContinuousRouteCertification,false);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert(r.records.every(s=>!s.status.startsWith('TAPERED_')||
  s.finiteSampleSourceCoverageComplete&&s.preservesResearchAtrium&&
  s.noNewOverheadOrLateralIntersections&&s.taperedRestoredFloorWitnesses>0));
 // Diagnostic counts are authoritative CI only when the full test ran.
 console.log('R102_ACTUAL_SEVEN_SOURCE_LINKS',
  JSON.stringify({tapered:r.taperedEndTransitionCount,
   rectangular:r.retainedR100Rectangles,
   unmodified:r.unmodifiedRejectedGalleryCount,
   states:r.records.map(x=>({id:x.id,status:x.status,
    rectangleGain:x.rectangularRestoredFloorWitnesses,
    taperGain:x.taperedRestoredFloorWitnesses}))}));
});
