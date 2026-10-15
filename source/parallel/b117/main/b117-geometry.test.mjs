import test from 'node:test';
import assert from 'node:assert/strict';
import {studyFloorSlab,diagnoseTwoWideExit} from './b117-geometry.mjs';
const p=(x,z)=>({x,z});
const floor=()=>({footprintRows:Array(8).fill('11111111'),rooms:[],gallery:[]});
const stair=()=>({fromLevel:0,toLevel:1,lowerFloor:floor(),upperFloor:floor(),lowerLanding:[p(1,2),p(1,3)],upperLanding:[p(5,2),p(5,3)],bodyAABBs:[{x:3,y:5,z:2,width:1,height:2,depth:1}]});
const exit=()=>({floor:floor(),landing:[p(2,2),p(2,3)],ascent:{dx:1,dz:0},side:'UPPER',stairCells:new Set(),walk:new Set(['6,2','6,3'])});
test('retains 2 upper landing support cells and does not perform any world operation',()=>{
 const r=studyFloorSlab(stair());
 assert.equal(r.status,'CONCEPTUAL_SLAB_MASK_ONLY');
 assert.equal(r.conceptualOpeningCells.length,1);
 assert.equal(r.upperLandingFloorRetained.length,2);
 assert.equal(r.realSlabSupportCertified,false);
 assert.equal(r.doesNotApplyAnyFloorRemoval,true);
});
test('landing body sweep is warned, never deletes upper landing',()=>{
 const a=stair();a.bodyAABBs=[{x:5,y:5,z:2,width:1,height:2,depth:1}];
 const r=studyFloorSlab(a);
 assert.equal(r.conceptualOpeningCells.length,0);
 assert(r.issueCodes.includes('UPPER_LANDING_BODY_SWEEP_REQUIRES_FINE_STEP_REVIEW'));
});
test('missing upper support, room and gallery collision require design review',()=>{
 const a=stair();a.upperFloor.footprintRows[3]='11111011';
 assert(studyFloorSlab(a).issueCodes.includes('UPPER_LANDING_SOURCE_FLOOR_INCOMPLETE'));
 const b=stair();b.upperFloor.rooms=[{x:3,z:2,width:1,depth:1}];
 assert(studyFloorSlab(b).issueCodes.includes('PROPOSED_OPENING_TOUCHES_SOURCE_ROOM'));
 const c=stair();c.upperFloor.gallery=[p(3,2)];
 assert(studyFloorSlab(c).issueCodes.includes('PROPOSED_OPENING_TOUCHES_SOURCE_GALLERY'));
});
test('multiple candidate openings remain separate review objects',()=>{
 const r=studyFloorSlab({...stair(),otherOpenings:new Set(['3,2'])});
 assert(r.issueCodes.includes('OPENING_OVERLAPS_OTHER_REVIEW_CANDIDATE'));
 assert.equal(r.sourceFloorMaskUnchanged,true);
});
test('open landing reaches connected width-2 gallery on source model',()=>{
 const r=diagnoseTwoWideExit(exit());
 assert.equal(r.reachesSourceGallery,true);
 assert.equal(r.reason,'B114_GENERATION_OR_REPLAY_DISAGREEMENT');
 assert.equal(r.physicalNavigationCertified,false);
});
test('independently classifies first-two-row floor, room, core and stair problems',()=>{
 for(const [mutate,code] of [
  [x=>x.floor.footprintRows[2]='11101111','NO_SOURCE_FLOOR'],
  [x=>x.floor.rooms=[{x:3,z:2,width:1,depth:1}],'PROTECTED_ROOM'],
  [x=>x.floor.__b117Cores=[{x:3,z:2,width:1,depth:1}],'PROTECTED_CORE'],
  [x=>x.stairCells.add('3,2'),'ACTIVE_STAIR_FOOTPRINT']]){
  const x=exit();mutate(x);const r=diagnoseTwoWideExit(x);
  assert.equal(r.reason,'FIRST_TWO_ROWS_BLOCKED');
  assert(r.firstTwoRowsDefects.some(p=>p.reason===code));
 }
});
test('fake disconnected gallery cannot count as two-wide connection',()=>{
 const x=exit();x.walk=new Set(['7,7']);
 const r=diagnoseTwoWideExit(x);
 assert.equal(r.reason,'TWO_WIDE_SOURCE_GALLERY_DISCONNECTED');
 assert.equal(r.reachesSourceGallery,false);
});
test('helper outputs no executable BuildPlan or coordinates',()=>{
 for(const x of [studyFloorSlab(stair()),diagnoseTwoWideExit(exit())])
  for(const p of ['BuildPlan','worldCoordinates','commandCount','executionAllowed'])
   assert.equal(Object.hasOwn(x,p),false);
});
