import test from 'node:test';
import assert from 'node:assert/strict';
import {buildR114ThreePaneReview} from './b198zr114-actual-three-pane-art-review.mjs';
import {R97_VIEW_IDS} from './b198zr97-multiview-mesh-review.mjs';
const kind='right_R93_ANGLED_LANTERN_CANOPY_ART_STUDY';
const a={kind,a:[.50,.58,-.70],b:[.65,.60,-.68],c:[.53,.65,-.62]};
const b={kind,a:[.52,.61,-.70],b:[.65,.60,-.68],c:[.55,.69,-.62]};
const shell={kind:'right_outer',a:[.60,.42,-.70],b:[.80,.70,-.62],c:[.73,.48,-.58]};
test('R114 quick: approved canopy diff has genuine source-triangle six-view triptych',()=>{
 const old=[a,shell],altered=[b,shell];
 const frozen=JSON.stringify(old);
 const review=buildR114ThreePaneReview(old,altered,{phase:'R113'});
 assert.equal(JSON.stringify(old),frozen);
 assert.equal(review.views.length,R97_VIEW_IDS.length);
 assert.deepEqual(review.sourceFacetIndicesChanged,[0]);
 assert.equal(review.views[0].sampleTriangleCounts.join(','),'2,2,1');
 assert.equal(review.sameCameraAcrossThreePanels,true);
 assert.equal(review.humanAestheticReview,'NOT_REVIEWED');
 assert.equal(review.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(review.safety.BuildPlan.operations,[]);
 assert(review.views.every(v=>v.html.includes('CLIPPED')));
 assert.throws(()=>buildR114ThreePaneReview(old,old,{phase:'R113'}),
  /LOCAL_BOUNDED_REAL_SOURCE_DELTA_REQUIRED/);
 assert.throws(()=>buildR114ThreePaneReview(old,[b,{...shell,kind:'right_inner'}],{phase:'R113'}),
  /ONLY_PHASE_SOURCE_FACETS_MAY_CHANGE/);
 assert.throws(()=>buildR114ThreePaneReview(old,altered,{phase:'R111'}),
  /ONLY_PHASE_SOURCE_FACETS_MAY_CHANGE/);
});
