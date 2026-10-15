import test from 'node:test';
import assert from 'node:assert/strict';
import {searchB118Exit,shiftedLandingHints} from './b118-exit-alternatives.mjs';
const p=(x,z)=>({x,z});
const scene=()=>({floor:{footprintRows:Array(16).fill('1'.repeat(16))},
 landing:[p(4,4),p(4,5)],rooms:[],cores:[],stairCells:new Set(),apertures:new Set(),
 walk:new Set(['9,4','9,5'])});
test('unmoved two-lane exit is discovered without editing source floor or stairs',()=>{
 const a=searchB118Exit(scene());
 assert(a.candidateCount>0);assert.equal(a.probedNormals,2);
 assert(a.candidates.every(x=>x.fromExactUnmovedLanding&&
 x.noRoomCoreFloorStairOrApertureEdits&&!x.realBedrockWalkingCertified));
 assert(a.candidates.every(x=>x.routeFootprint.length>=4));
});
test('room and core protection blocks both normal exits',()=>{
 const a=scene();a.cores=[{x:5,z:4,width:2,depth:2}];a.rooms=[{x:1,z:4,width:3,depth:2}];
 const o=searchB118Exit(a);
 assert.equal(o.status,'NO_FIXED_LANDING_TWO_WIDE_EXIT');
 assert(o.examinations.every(x=>x.reason==='FIRST_TWO_ROWS_PROTECTED'));
 assert(o.examinations.some(x=>x.protectedFailures.some(y=>y.reason==='ROOM_PROTECTED')));
});
test('stair footprint, upper floor aperture and absent floor cannot be traversed',()=>{
 const a=scene();a.stairCells.add('5,4');a.apertures.add('2,5');
 const b=searchB118Exit(a);assert(b.examinations.some(x=>x.protectedFailures.some(y=>y.reason==='ACTIVE_STAIR_FOOTPRINT')));
 assert(b.examinations.some(x=>x.protectedFailures.some(y=>y.reason==='PROPOSED_STAIR_FLOOR_APERTURE')));
 const c=scene();c.floor.footprintRows[4]='1111101111111111';
 assert(searchB118Exit(c).examinations.some(x=>x.protectedFailures.some(y=>y.reason==='SOURCE_FLOOR_ABSENT')));
});
test('isolated gallery is not a reachable width-two terminal',()=>{
 const a=scene();a.walk=new Set(['15,15']);
 assert.equal(searchB118Exit(a).status,'NO_FIXED_LANDING_TWO_WIDE_EXIT');
 assert(searchB118Exit(a).examinations.some(x=>x.reason==='TWO_WIDE_GALLERY_UNREACHABLE'));
});
test('shift probes are labelled as full-stair redesign, never an approved relocation',()=>{
 const a=scene();a.cores=[{x:5,z:4,width:2,depth:2},{x:1,z:4,width:3,depth:2}];
 const x=shiftedLandingHints({...a,maxRadius:2});
 assert.equal(x.noSourceLandingMoved,true);assert.equal(x.noStairBodyOrSupportRemodelled,true);
 assert(x.hints.every(h=>h.requiresWholeStairGeometryRedesign&&
 h.notAnAvailableReplacementStair&&!h.physicalTraversalCertified));
});
test('reject invalid landing and unbounded shifts',()=>{
 const a=scene();a.landing=[p(4,4),p(7,5)];
 assert.throws(()=>searchB118Exit(a),/B118_INVALID_INTERFACE/);
 assert.throws(()=>shiftedLandingHints({...scene(),maxRadius:99}),/B118_UNBOUNDED_SHIFT/);
});
test('source lock is readable without any construction or world coordination output',()=>{
 const x=searchB118Exit(scene());
 assert.equal(x.worldContacts,0);assert.equal(x.installationApproved,false);
 for(const key of ['BuildPlan','worldCoordinates','executionAllowed'])
  assert.equal(Object.hasOwn(x,key),false);
});
