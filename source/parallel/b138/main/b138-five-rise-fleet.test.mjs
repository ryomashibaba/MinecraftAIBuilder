import test from 'node:test';
import assert from 'node:assert/strict';
import {b138FiveRiseSketch,b138AuditBuilding,B138_LIMITS} from './b138-five-rise-fleet.mjs';

function fixture(levels=3,{withReservation=true}={}){
 const floor=Array.from({length:levels},(_,i)=>({
  level:i,gallery:[{x:3,z:3}],rooms:[],footprintRows:['1111','1111']
 }));
 const stairs=Array.from({length:levels-1},(_,i)=>({
  fromLevel:i,toLevel:i+1,coreIndex:0,
  upperOvershoot:0,lowerLandingDistance:0,upperLandingDistance:0,
  physicalTraversalCertified:false,issues:['LANDING_SUPPORT_NOT_MODELED'],
  reservation:withReservation?{eligibleFootprints:1,sample:sample()}:
   {eligibleFootprints:0,sample:null}
 }));
 const routes=Array.from({length:levels},(_,i)=>({
  level:i,roomDoorways:3,horizontalRoomConnections:1,
  repair:{roomConnections:2,addedCells:[{x:2,z:2}]}
 }));
 return {
  design:{candidateId:'TEST_V1',plan:{floors:floor}},
  case113:{id:'TEST_V1',levels,stairs,horizontalRoutes:routes}
 };
}
function sample(){
 const origin={x:12,z:15},ascent={dx:0,dz:-1};
 const footprintCells=Array.from({length:7},(_,i)=>[0,1].map(w=>({
  x:origin.x+i*ascent.dx-ascent.dz*w,
  z:origin.z+i*ascent.dz+ascent.dx*w
 }))).flat();
 return {origin,ascent,footprintCells,lowerLanding:footprintCells.slice(0,2),
  upperLanding:footprintCells.slice(-2)};
}
test('two-wide 5-rise sketch matches pinned 7x2 source reservation and fits floor interval',()=>{
 const sketch=b138FiveRiseSketch({fromLevel:1,toLevel:2},sample());
 assert.equal(sketch.positions.length,14);
 assert.equal(sketch.positions.filter(x=>x.kind==='NORMAL_OAK_STAIR_CONCEPT').length,10);
 assert.equal(sketch.positions.filter(x=>x.kind==='LOWER_FLOOR_SEAM').length,2);
 assert.equal(sketch.positions.filter(x=>x.kind==='UPPER_FLOOR_SEAM').length,2);
 assert.equal(sketch.sourceFloorRise,5);
 const low=sketch.positions.find(x=>x.index===0&&x.lane===0);
 const high=sketch.positions.find(x=>x.index===6&&x.lane===0);
 assert.equal(high.intendedTopY-low.intendedTopY,5);
 assert.equal(high.position.y,10);
 assert.equal(sketch.positions[2].blockstate.weirdo_direction,3);
 assert.equal(sketch.worldLocationKnown,false);
 assert.equal(sketch.physicalCollisionCertified,false);
});
test('invalid stair link, ascent and pin footprint fail closed',()=>{
 assert.throws(()=>b138FiveRiseSketch({fromLevel:0,toLevel:2},sample()),/B138_STAIR_LEVEL_DRIFT/);
 const bad=sample();bad.ascent={dx:1,dz:1};
 assert.throws(()=>b138FiveRiseSketch({fromLevel:0,toLevel:1},bad),/B138_INVALID_PINNED_RESERVATION/);
 const missing=sample();missing.footprintCells.pop();
 assert.throws(()=>b138FiveRiseSketch({fromLevel:0,toLevel:1},missing),
  /B138_RESERVATION_FOOTPRINT_CHANGED/);
 const wrong=sample();wrong.upperLanding=[{x:700,z:700},{x:701,z:700}];
 assert.throws(()=>b138FiveRiseSketch({fromLevel:0,toLevel:1},wrong),/B138_SOURCE_SEAM_MISMATCH/);
});
test('detects floor-network weak links and produces 5-rise-only read-only work packages',()=>{
 const {design,case113}=fixture(3);
 const a=b138AuditBuilding(design,case113);
 assert.equal(a.floors,3);
 assert.equal(a.sourceStairs,2);
 assert.equal(a.sourceVerticalGraph.status,'SOURCE_LEVEL_GRAPH_REACHABLE_PROXY');
 assert.deepEqual(a.sourceVerticalGraph.reachableLevels,[0,1,2]);
 assert.deepEqual(a.sourceVerticalGraph.criticalStairIndices,[0,1]);
 assert.equal(a.conceptsWithPinnedB113Reservations,2);
 assert.equal(a.priorities.length,2);
 assert.equal(a.priorities[0].highImpactIfLost,true);
 assert.equal(a.priorities[0].worldOperationCount,0);
 assert.equal(a.stairInterfaces[0].fiveRiseSketch.positions.length,14);
 assert.equal(a.floorInterfaces[2].proposedRepairedRoomConnections,2);
 assert.equal(a.floorInterfaces[2].physicallyReachableRoomDoors,0);
});
test('missing upper conceptual stair edge yields unreachable floor, not a fictional pass',()=>{
 const {design,case113}=fixture(3,{withReservation:false});
 case113.stairs.pop();
 const a=b138AuditBuilding(design,case113);
 assert.deepEqual(a.sourceVerticalGraph.unreachableLevels,[2]);
 assert.equal(a.sourceVerticalGraph.status,'SOURCE_LEVEL_GRAPH_GAP');
 assert.equal(a.conceptsWithPinnedB113Reservations,0);
 assert.equal(a.priorities.length,1);
 assert.equal(a.priorities[0].reason,'NO_B113_SOURCE_FOOTPRINT_CANDIDATE');
});
test('misindexed level and source case mismatch rejected',()=>{
 const {design,case113}=fixture(3);
 case113.stairs[0].toLevel=3;
 assert.throws(()=>b138AuditBuilding(design,case113),
  /B138_STAIR_VERTICAL_EDGE_INVALID/);
 case113.stairs[0].toLevel=1;
 design.candidateId='UNEXPECTED';
 assert.throws(()=>b138AuditBuilding(design,case113),/B138_CASE_ID_MISMATCH/);
});
test('B137 six-rise demonstration is not interchangeable with original five-block floors',()=>{
 assert.equal(B138_LIMITS.verifiedB137TestRouteRise,6);
 assert.equal(B138_LIMITS.sourceFloorRise,5);
 assert.notEqual(B138_LIMITS.sourceFloorRise,B138_LIMITS.verifiedB137TestRouteRise);
 assert.equal(B138_LIMITS.siteConstructionApproved,false);
});
