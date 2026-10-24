import test from 'node:test';
import assert from 'node:assert/strict';
import {screenR99FiniteRoute}
 from './b198zr99-finite-volume-route-witness.mjs';
import {designR100ShoulderTriangles}
 from './b198zr100-source-gallery-shoulders.mjs';

const plane=(h,kind)=>[
 {kind,a:[-3,h,-3],b:[3,h,-3],c:[3,h,3]},
 {kind,a:[-3,h,-3],b:[3,h,3],c:[-3,h,3]}
];

test('R101 quick: low overhead can never masquerade as a floor',()=>{
 const route=[[-.2,0,0],[.2,0,0]],ceiling=plane(.015,'LOW_HANGING_CEILING');
 const result=screenR99FiniteRoute(ceiling,route);
 assert(result.witnessCounts.floor>0,'A ceiling .015 above foot is not floor');
 assert(result.witnessCounts.overhead>0);
 assert.equal(result.unscreenedSegmentCount,0);
 assert.equal(result.allDeclaredSourceSegmentsWithinProbeCoverage,true);
 const trueFloor=screenR99FiniteRoute(plane(0,'TRUE_FLOOR'),route);
 assert.equal(trueFloor.witnessCounts.floor,0);
 assert.equal(trueFloor.witnessCounts.overhead,0);
});
test('R101 quick: unscreened vertical, steep and sparse source segments HOLD',()=>{
 const mesh=plane(0,'GROUND');
 const vertical=screenR99FiniteRoute(mesh,[[0,0,0],[0,.4,0]]);
 assert.equal(vertical.stationCount,0);
 assert.equal(vertical.unscreenedSegmentCount,1);
 assert.equal(vertical.incompleteSourceCoverage[0].reason,'VERTICAL_SOURCE_SEGMENT_UNSCREENED');
 assert.equal(vertical.screeningStatus,'HOLD_SOURCE_SEGMENTS_NOT_FULLY_SCREENED');
 const steep=screenR99FiniteRoute(mesh,[[0,0,0],[.1,.1,0]]);
 assert(steep.incompleteSourceCoverage.some(v=>v.reason==='STEEP_SOURCE_GRADE_NOT_PROVEN'));
 assert.equal(steep.allDeclaredSourceSegmentsWithinProbeCoverage,false);
 const sparse=screenR99FiniteRoute(mesh,[[-1,0,0],[1,0,0]]);
 assert(sparse.incompleteSourceCoverage.some(v=>v.reason==='SAMPLING_GAP_EXCEEDS_DECLARED_MAXIMUM'));
 assert.equal(sparse.screeningStatus,'HOLD_SOURCE_SEGMENTS_NOT_FULLY_SCREENED');
});
test('R101 quick: valid source-width shoulder can restore a physical floor witness',()=>{
 const route=[[0,0,-.1],[0,0,.1]];
 const deck=[
 {kind:'R88',a:[-.016,0,-.1],b:[.016,0,-.1],c:[.016,0,.1]},
 {kind:'R88',a:[-.016,0,-.1],b:[.016,0,.1],c:[-.016,0,.1]}
 ];
 const shoulder=designR100ShoulderTriangles({
  side:'right',sourceAnchor:route[0],sourcePad:route[1]});
 const before=screenR99FiniteRoute(deck,route),
  after=screenR99FiniteRoute([...deck,...shoulder.faces],route);
 assert(before.witnessCounts.floor>after.witnessCounts.floor);
 assert.equal(after.unscreenedSegmentCount,0);
 assert.equal(after.witnessCounts.overhead,before.witnessCounts.overhead);
 assert.equal(after.witnessCounts.lateral,before.witnessCounts.lateral);
});
