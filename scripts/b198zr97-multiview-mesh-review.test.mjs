import test from 'node:test';
import assert from 'node:assert/strict';
import {buildR97Comparison,buildR97CompareViews,projectR97Vertex,
 R97_VIEW_IDS,prepareR97ComparisonReview} from './b198zr97-multiview-mesh-review.mjs';

test('R97 projection: source mesh only, three shared cameras, no false PASS',()=>{
 assert.deepEqual(projectR97Vertex([1,2,3],0,0),[1,2,3]);
 assert.throws(()=>projectR97Vertex([Infinity,0,0],0,0),/INVALID_SOURCE_VERTEX/);
 const face={kind:'left_inner',a:[0,0,0],b:[1,0,0],c:[0,1,1]};
 const variants=['R94','R95','R96'].map(revision=>({revision,faces:[face]}));
 const views=buildR97CompareViews(variants,[.3,.3,.3]);
 assert.deepEqual(views.map(v=>v.id),R97_VIEW_IDS);
 assert.equal(views.length,6);
 for(const view of views){
  assert.deepEqual(view.sampleTriangleCounts,[1,1,1]);
  assert.equal((view.html.match(/<svg /g)||[]).length,3);
  assert(view.html.includes('R94')&&view.html.includes('R96'));
  assert.equal(view.camera.camera.length,2);
 }
 assert.throws(()=>buildR97CompareViews([variants[0]],[.2,.3,0]),/THREE_SOURCE/);
 assert.throws(()=>prepareR97ComparisonReview({}),/FULL_R96_ANCESTRY_MISMATCH/);
});
test('R97 original mesh provenance: actual 3D revisions and roof-probe HOLD',()=>{
 const nodes={
  entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
  westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
  westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
   [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
  eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
   [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],[.68,.64,.73],
   [.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
 };
 const report=buildR97Comparison(nodes);
 assert.deepEqual(report.versions.map(v=>v.triangles),[4446,4608,4692]);
 assert(report.versions.every(v=>/^[a-f0-9]{64}$/.test(v.actualMeshSha256)));
 assert.equal(report.preservedSevenOpenings,7);
 assert.equal(report.addedWindowDecorativeFaces,84);
 assert.equal(report.sourceR95ExactPrefix,true);
 assert.equal(report.views.length,6);
 assert(report.views.every(v=>
  v.html.includes('R94')&&v.html.includes('R95')&&v.html.includes('R96')));
 assert(report.roofProbe.firstVerticalSurfaceDistanceNormalized>0);
 assert.equal(report.roofProbe.side,'right');
 assert.equal(report.roofProbe.tier,3);
 assert.equal(report.sharedCameraForAllVariants,true);
 assert.equal(report.semanticVisualInterpretation,'HUMAN_NOT_REVIEWED');
 assert.equal(report.no3DShapeChanged,true);
});
