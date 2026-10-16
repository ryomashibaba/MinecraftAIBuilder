import test from 'node:test';
import assert from 'node:assert/strict';
import {
 b139AuditCandidate,b139FindMissingAlternatives,B139_LIMITS
} from './b139-five-rise-repair.mjs';
import {b138FiveRiseSketch} from '../../b138/main/b138-five-rise-fleet.mjs';
const p=(x,z)=>({x,z});
function fixture({blockRooms=false,repair=true}={}){
 const floor=l=>({
  level:l,footprintRows:Array.from({length:26},()=>('1'.repeat(26))),
  rooms:blockRooms?[{x:0,z:0,width:26,depth:26}]:[],
  gallery:[p(8,10),p(8,11),p(17,10),p(17,11)],
  exits:[],coreRoutes:[]
 });
 const plan={floors:[floor(0),floor(1)],cores:[{x:10,z:10,width:3,depth:3}]};
 const design={candidateId:'SYNTHETIC_V1',plan};
 const case113={
  id:'SYNTHETIC_V1',levels:2,
  horizontalRoutes:plan.floors.map((f,level)=>({
   level,repair:{sourceCellsPreserved:true,addedCells:repair?[
    p(9,10),p(9,11),p(18,10),p(18,11)
   ]:[]}
  }))
 };
 const stair={fromLevel:0,toLevel:1,coreIndex:0,stairIndex:0};
 const origin={x:10,z:10},ascent={dx:1,dz:0};
 const cells=Array.from({length:7},(_,i)=>[
  p(10+i,10),p(10+i,11)
 ]).flat();
 const sample={origin,ascent,footprintCells:cells,
  lowerLanding:cells.slice(0,2),upperLanding:cells.slice(-2)};
 return {design,case113,stair,sample};
}
test('B139 source-pinned 5-rise sweep identifies upstairs aperture and source static roof',()=>{
 const f=fixture();
 const sketch=b138FiveRiseSketch(f.stair,f.sample);
 const q={x:13,y:5,z:10,kind:'ROOF_CAP_PROXY'};
 const r=b139AuditCandidate(f.design,f.case113,f.stair,sketch,{voxels:[q]});
 assert.equal(r.sourceFloorRise,5);
 assert.equal(r.footprintSourceCompatible,true);
 assert.equal(r.conceptualLowerAndUpperCorridorConnected,true);
 assert.equal(r.lowerCorridorTwoWide,true);
 assert.equal(r.upperCorridorTwoWide,true);
 assert(r.requiredUpperFloorOpeningCells.length>0);
 assert(r.potentialB105StaticVoxelConflicts.some(x=>
  x.x===13&&x.y===5&&x.z===10));
 assert(r.issueCodes.includes('B105_STATIC_VOXELS_INTERSECT_STAIR_OR_HEADROOM'));
 assert(r.issueCodes.includes('UPPER_SLAB_CUTS_NOT_APPROVED'));
 assert.equal(r.allowedWorldModifications.length,0);
 assert.equal(r.candidateOnWorldCollisionCertified,false);
});
test('source two-wide landing seam requires BOTH parallel gallery lanes',()=>{
 const f=fixture({repair:false});
 f.design.plan.floors.forEach(fl=>fl.gallery=[p(8,10),p(17,10)]);
 const sketch=b138FiveRiseSketch(f.stair,f.sample);
 const r=b139AuditCandidate(f.design,f.case113,f.stair,sketch,{voxels:[]});
 assert.equal(r.conceptualLowerAndUpperCorridorConnected,false);
 assert(r.issueCodes.includes('LOWER_TWO_LANE_REPAIRED_CORRIDOR_SEAM_HOLD'));
 assert(r.issueCodes.includes('UPPER_TWO_LANE_REPAIRED_CORRIDOR_SEAM_HOLD'));
});
test('bounded repair searches within frozen rooms, cores and 2-wide corridor connectivity',()=>{
 const f=fixture();
 const q=b139FindMissingAlternatives(f.design,f.case113,f.stair,{radius:2});
 assert(q.stats.examined>0);
 assert(q.stats.sourceGeometryFits>0);
 assert(q.geometricTwoWideOptions>0);
 assert(q.proposedAlternatives.length>0);
 assert(q.proposedAlternatives.length<=B139_LIMITS.maxSourceStairAlternatives);
 assert.equal(q.proposedAlternatives[0].sketch.positions.length,14);
 assert.equal(q.proposedAlternatives[0].actualCollisionCertified,false);
 assert.equal(q.worldContacts,0);
 assert.equal(q.operations.length,0);
});
test('blocking rooms prevents imaginary placement and reports genuine lack of geometry',()=>{
 const f=fixture({blockRooms:true});
 const r=b139FindMissingAlternatives(f.design,f.case113,f.stair,{radius:2});
 assert.equal(r.stats.sourceGeometryFits,0);
 assert.equal(r.geometricTwoWideOptions,0);
 assert.equal(r.proposedAlternatives.length,0);
 assert.equal(r.status,'NO_ROOM_PRESERVING_7x2_FOOTPRINT_IN_SEARCH_RADIUS');
});
test('rejects wrong radius, source route and conceptual sketch',()=>{
 const f=fixture();
 assert.throws(()=>b139FindMissingAlternatives(f.design,f.case113,f.stair,
  {radius:100}),/B139_SEARCH_RADIUS_INVALID/);
 const bad={...f.case113,
  horizontalRoutes:[{level:0,repair:{sourceCellsPreserved:false}}]};
 assert.throws(()=>b139FindMissingAlternatives(f.design,bad,f.stair,
  {radius:0}),/B139_INVALID_FLOOR_OR_REPAIR/);
 assert.throws(()=>b139AuditCandidate(f.design,f.case113,f.stair,
  {positions:[],sourceFloorRise:5},{voxels:[]}),
  /B139_INVALID_SKETCH_OR_VOXEL_SOURCE/);
});
test('B139 retains 15/66/102 inventory and cannot authorize Minecraft commands',()=>{
 assert.equal(B139_LIMITS.sourceBuildings,15);
 assert.equal(B139_LIMITS.sourceFloors,66);
 assert.equal(B139_LIMITS.sourceStairs,102);
 assert.equal(B139_LIMITS.requiredSourceFloorRise,5);
 assert.equal(B139_LIMITS.worldWriteOperations,0);
});
