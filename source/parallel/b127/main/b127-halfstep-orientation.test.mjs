import test from 'node:test';
import assert from 'node:assert/strict';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {transformStairBox} from '../../b114/main/b114-stair-grid-frame.mjs';
import {reviewB127HalfStepOrientations,DIRECTION_HYPOTHESES} from './b127-halfstep-orientation.mjs';
const make=(dx=1,dz=0)=>{
 const model=straightModel({x:12,z:12},{dx,dz},0);
 const frame={origin:model.origin,ascent:model.ascent,fromLevel:0};
 const blocks=[];
 for(let s=0;s<5;s++)for(let lane=0;lane<2;lane++){
  const v=transformStairBox({x:s+1,y:s,z:lane,width:1,height:1,depth:1},frame);
  blocks.push({relativeDesignCell:{x:v.x,y:v.y,z:v.z}});
 }
 const cuts=blocks.filter(b=>b.relativeDesignCell.y===5).map(b=>b.relativeDesignCell);
 return {model,priorB126:{shape:'STRAIGHT_HALF_STEP_PROXY',blocks,
  conceptualCutCells:cuts.length,sourceSlabY:5,
  stateMappingAuthorized:false,constructionAllowed:false,
  physicalPassageCertified:false},sourceB125CutCells:cuts};
};
test('source B113-compatible half-step shape is distinguished from backward riser',()=>{
 const a=make(),r=reviewB127HalfStepOrientations(a);
 assert.equal(r.sourceHalfStepSamplePoints,40);
 assert.equal(r.analyzedCandidateStairCells,10);
 assert.equal(r.minimumShapeMismatchSamples,0);
 assert.equal(r.sourceProxyPreferredHalfShape,'FORWARD_UPPER_HALF');
 assert.equal(r.twoSourceProxyShapeTests[0].mismatchedSourceTreadSamples,0);
 assert.equal(r.twoSourceProxyShapeTests[1].mismatchedSourceTreadSamples,20);
 assert.equal(r.verifiedPhysicalStepPasses,0);
 assert.equal(r.actualBlockStateMapping,null);
});
test('signed voxel frame stays invariant across all four cardinal stair rotations',()=>{
 for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const r=reviewB127HalfStepOrientations(make(dx,dz));
  assert.equal(r.minimumShapeMismatchSamples,0);
  assert.equal(r.retainedUpperSlabOverlaps,0);
  assert.equal(r.sourceB125CutCells,2);
 }
});
test('24 state-to-facing bijections remain possible; no selected Education direction',()=>{
 const r=reviewB127HalfStepOrientations(make());
 assert.equal(DIRECTION_HYPOTHESES.length,24);
 assert.equal(r.unverifiedDirectionBijections,24);
 assert(r.directionHypotheses.every(x=>!x.calibrated&&!x.constructionAllowed));
 assert(r.directionHypotheses.every(x=>new Set(x.valuesByDirection).size===4));
 assert.equal(r.verifiedWorldStairStates,0);
 assert.equal(r.verifiedEducationVersion,null);
});
test('non-executable output contains no operations, real coordinates or approval',()=>{
 const r=reviewB127HalfStepOrientations(make());
 assert.deepEqual(r.operations,[]);
 assert.equal(r.worldCoordinates,null);
 assert.equal(r.worldContacts,0);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.constructionAllowed,false);
 assert.equal(r.educationCalibration.realStepPhysics,'UNVERIFIED');
});
test('source stair candidate coordinates must match B126, not just counts',()=>{
 const a=make();a.priorB126.blocks[0].relativeDesignCell.x++;
 assert.throws(()=>reviewB127HalfStepOrientations(a),/B127_STAIRS_DIFFER_FROM_B126_GEOMETRY/);
});
test('B126 asserted certification or changed source slab is rejected',()=>{
 const a=make();a.priorB126.physicalPassageCertified=true;
 assert.throws(()=>reviewB127HalfStepOrientations(a),/B127_B126_STATE_OR_CELL_DRIFT/);
 const b=make();b.sourceB125CutCells=[];
 assert.throws(()=>reviewB127HalfStepOrientations(b),/B127_B126_STATE_OR_CELL_DRIFT/);
});
test('upper-floor stair voxel without conceptual slab cut fails closed',()=>{
 const a=make();
 a.priorB126.conceptualCutCells=1;
 a.sourceB125CutCells=a.sourceB125CutCells.slice(0,1);
 assert.throws(()=>reviewB127HalfStepOrientations(a),/B127_RETAINED_SLAB_OVERLAP_NOT_PROTECTED/);
});
test('non-cardinal direction, wrong block coordinate, stale y and missing model are rejected',()=>{
 const a=make();a.model.ascent={dx:1,dz:1};
 assert.throws(()=>reviewB127HalfStepOrientations(a),/B127_BAD_OR_UNPINNED_GEOMETRY/);
 const b=make();b.priorB126.sourceSlabY=100;
 assert.throws(()=>reviewB127HalfStepOrientations(b),/B127_B126_STATE_OR_CELL_DRIFT/);
 assert.throws(()=>reviewB127HalfStepOrientations({}),/B127_BAD_OR_UNPINNED_GEOMETRY/);
});
