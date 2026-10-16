import test from 'node:test';
import assert from 'node:assert/strict';
import {b138FiveRiseSketch} from '../../b138/main/b138-five-rise-fleet.mjs';
import {b141MergeCorridors,b141ConceptualNetwork,b141AuditJoint3D,
 b141Unresolved,b141AssembleBuilding,B141_LIMITS} from './b141-integrated-network.mjs';
const p=(x,z)=>({x,z}),k=p=>p.x+','+p.z;
const cells=(x,z)=>[p(x,z),p(x+1,z),p(x,z+1),p(x+1,z+1)];
function fixture(){
 const floors=Array.from({length:2},(_,level)=>({
  level,footprintRows:Array.from({length:26},()=>('1'.repeat(30))),
  rooms:[],gallery:level===0?cells(3,9):cells(23,9),
  exits:level===0?[{edge:[p(3,9),p(4,9)],side:'N'}]:[]
 }));
 const design={candidateId:'TEST_V1',plan:{
  floors,cores:[{x:10,z:10,width:2,depth:2}]
 }};
 const c113={id:design.candidateId,stairs:[
  {fromLevel:0,toLevel:1,coreIndex:0}
 ],horizontalRoutes:floors.map(f=>({
  level:f.level,repair:{sourceCellsPreserved:true,
   allNewCellsOutsideRoomsAndCores:true,addedCells:[]}
 }))};
 const core={origin:p(10,10),ascent:{dx:1,dz:0}};
 const footprintCells=Array.from({length:7},(_,i)=>[
  p(10+i,10),p(10+i,11)]).flat();
 const sketch=b138FiveRiseSketch(c113.stairs[0],{...core,
  footprintCells,lowerLanding:footprintCells.slice(0,2),
  upperLanding:footprintCells.slice(-2)});
 function bridge(level,side){
  const patch=level===0?cells(3,9):cells(23,9);
  const source=new Set(patch.map(k));
  const squares=level===0?
   [...Array.from({length:6},(_,i)=>p(8-i,10)),p(3,9)]:
   [...Array.from({length:7},(_,i)=>p(17+i,10)),p(23,9)];
  const newMap=new Map();
  for(const sq of squares)for(const cell of cells(sq.x,sq.z))
   if(!source.has(k(cell)))newMap.set(k(cell),cell);
  return {status:'PROPOSED_TWO_WIDE_ADD_ONLY_BRIDGE',side,
   sourceConnected:true,pathSquares:squares,addedCells:[...newMap.values()],
   actualMinecraftConnectivityProven:false,worldCommands:[]};
 }
 const lower=bridge(0,'LOWER'),upper=bridge(1,'UPPER');
 const c140={id:design.candidateId,stairs:1,selectedIndependentPlans:1,
  rows:[{stairIndex:0,fromLevel:0,toLevel:1,
   status:'OFFLINE_FIVE_RISE_CONNECTED_BY_CONCEPTUAL_2WIDE_CORRIDOR',
   selected:{sketch,lowerBridge:lower,upperBridge:upper}}]};
 const c139={id:design.candidateId,rows:[{stairIndex:0,routeStatus:'EXISTING_CANDIDATE_REQUIRES_3D_REPAIR'}]};
 return {design,c113,c140,c139,sketch,lower,upper};
}
test('B141 merges per-floor two-wide corridors without deleting original gallery',()=>{
 const f=fixture(),result=b141MergeCorridors(f.design,f.c113,f.c140);
 assert.equal(result.levels.length,2);
 assert.equal(result.originalSourceCellsPreserved,true);
 assert.equal(result.totalDeduplicatedCells,0);
 assert(result.totalUniqueNovelCells>0);
 for(const level of result.levels){
  assert.equal(level.originalSourceUnchanged,true);
  assert.equal(level.roomsMoved,0);
  assert.equal(level.coresMoved,0);
  assert.equal(level.sourceGalleryCells,4);
  assert(level.b141UniqueNewCells>0);
  for(const p of f.design.plan.floors[level.level].gallery)
   assert(level.combinedCells.some(q=>k(p)===k(q)));
 }
 assert.deepEqual(result.worldOperations,[]);
});
test('B141 deduplicates two independent bridge claims to one material footprint',()=>{
 const f=fixture(),row=f.c140.rows[0];
 const copied={...row,stairIndex:1,selected:{
  ...row.selected,
  sketch:JSON.parse(JSON.stringify(row.selected.sketch)),
  lowerBridge:JSON.parse(JSON.stringify(row.selected.lowerBridge)),
  upperBridge:JSON.parse(JSON.stringify(row.selected.upperBridge))
 }};
 f.c140.rows.push(copied);f.c140.stairs=2;f.c113.stairs.push({...f.c113.stairs[0]});
 const result=b141MergeCorridors(f.design,f.c113,f.c140);
 assert.equal(result.totalProposedIndependentContributions,2*
  (row.selected.lowerBridge.addedCells.length+
   row.selected.upperBridge.addedCells.length));
 assert.equal(result.totalUniqueNovelCells*2,result.totalProposedIndependentContributions);
 assert.equal(result.totalDeduplicatedCells,result.totalUniqueNovelCells);
 assert(result.levels.some(x=>x.sharedNewCells>0));
});
test('conceptual entrance graph links two floors with a staircase but cannot certify game physics',()=>{
 const f=fixture(),merged=b141MergeCorridors(f.design,f.c113,f.c140);
 const g=b141ConceptualNetwork(f.design,f.c140,merged);
 assert(g.sourceGroundExitRootSquares>0);
 assert.equal(g.stairEdgesWithBothPortalNodes,1);
 assert.deepEqual(g.floorsNotReachableFromGroundExit,[]);
 assert.equal(g.sourceExitToAllFloorsConceptual,true);
 assert.equal(g.independentWalkabilityCertified,false);
 assert.equal(g.actualMinecraftCollisionCertified,false);
 const without={...f.c140,rows:[{...f.c140.rows[0],selected:null}]};
 const disconnected=b141ConceptualNetwork(f.design,without,merged);
 assert.deepEqual(disconnected.floorsNotReachableFromGroundExit,[1]);
});
test('3D checks flag required upper floor cuts and conflicting slab plans separately',()=>{
 const f=fixture(),merged=b141MergeCorridors(f.design,f.c113,f.c140);
 const r=b141AuditJoint3D(f.design,f.c140,merged);
 assert.equal(r.selectedStairs,1);
 assert(r.conceptualOpeningUniqueCells>0);
 assert(r.requiredSupportUniqueCells>0);
 assert.equal(r.jointHeadroomCollisionCells,0);
 assert.equal(r.slabModificationPermitted,false);
 assert.equal(r.physicalSupportCertified,false);
 const duplicate={...f.c140,rows:[f.c140.rows[0],
  {...f.c140.rows[0],stairIndex:1}]};
 const joint=b141AuditJoint3D(f.design,duplicate,merged);
 assert(joint.jointHeadroomCollisionCells>0);
 assert(joint.conceptualOpeningDuplicateClaims>0);
});
test('opening that overlaps an original gallery or protected room stays explicitly on HOLD',()=>{
 const f=fixture();
 const sketch=f.sketch,upperY=5;
 const cut=sketch.positions.find(x=>x.kind==='NORMAL_OAK_STAIR_CONCEPT'&&
  x.position.y===upperY-1).position;
 // A source gallery under a planned cut is not an approved opening.
 f.design.plan.floors[1].gallery.push(p(cut.x,cut.z));
 f.design.plan.floors[1].rooms.push({x:cut.x,z:cut.z,width:1,depth:1});
 const merged=b141MergeCorridors(f.design,f.c113,f.c140);
 const r=b141AuditJoint3D(f.design,f.c140,merged);
 assert(r.upperOpeningTouchesProtectedRooms>0);
 assert(r.upperOpeningTouchesOriginalGallery>0);
 assert.equal(r.slabModificationPermitted,false);
});
test('B140 held stair produces explicit next geometric remediation without fictitious edits',()=>{
 const f=fixture();
 const r={stairIndex:1,fromLevel:0,toLevel:1,selected:null,
  status:'HOLD_NO_ROOM_PRESERVING_FIVE_RISE_7x2_GEOMETRY'};
 const h={stairIndex:2,fromLevel:0,toLevel:1,selected:null,
  status:'HOLD_TWO_WIDE_ROUTE_NOT_FOUND_OR_SEARCH_BUDGET'};
 const c=b141Unresolved({...f.c140,rows:[r,h]},
  {rows:[{stairIndex:1,routeStatus:'B139_NO_FOOTPRINT'},
    {stairIndex:2,routeStatus:'B139_CORRIDOR_NOT_FOUND'}]});
 assert.equal(c.length,2);
 assert.equal(c[0].priority,'CORE_FLOORPLATE_OR_ROOM_RECONFIGURATION');
 assert.equal(c[1].priority,'CORRIDOR_ROOT_OR_TWO_WIDE_INTERFLOOR_REDESIGN');
 assert(c.every(x=>x.worldOperations.length===0&&!x.roomEditsAuthorized));
});
test('full B141 integration refuses untrusted B105 synthetic design and forged source',()=>{
 const f=fixture();
 // This minimal fixture is NOT a B104 architectural design; it must fail B105
 // validation instead of masquerading as a real generated building.
 assert.throws(()=>b141AssembleBuilding(f.design,f.c113,f.c139,f.c140),
  /B105_UNSAFE_PARENT_DESIGN/);
 assert.throws(()=>b141AssembleBuilding(f.design,{...f.c113,id:'FAKE'},
  f.c139,f.c140),/B141_CASE_INVENTORY_MISMATCH/);
 assert.equal(B141_LIMITS.b140IndependentPlans,70);
 assert.equal(B141_LIMITS.worldWrites,0);
});
