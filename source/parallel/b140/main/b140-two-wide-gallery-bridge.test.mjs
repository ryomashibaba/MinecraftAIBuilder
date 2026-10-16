import test from 'node:test';
import assert from 'node:assert/strict';
import {b138FiveRiseSketch} from '../../b138/main/b138-five-rise-fleet.mjs';
import {
 b140RouteTwoWide,b140CandidateGeometry,b140PlanStair,b140PlanBuilding,
 B140_LIMITS
} from './b140-two-wide-gallery-bridge.mjs';
const p=(x,z)=>({x,z}),key=v=>v.x+','+v.z;
const mkGallery=(x,z)=>[p(x,z),p(x+1,z),p(x,z+1),p(x+1,z+1)];
const floor=l=>({
 level:l,footprintRows:Array.from({length:28},()=>('1'.repeat(30))),
 rooms:[],gallery:l===0?mkGallery(5,10):mkGallery(20,10)
});
function fixture(){
 const design={candidateId:'TEST_ROOM',plan:{
  floors:[floor(0),floor(1)],
  cores:[{x:10,z:10,width:3,depth:3}]
 }};
 const stair={fromLevel:0,toLevel:1,coreIndex:0,
  upperOvershoot:1,lowerLandingDistance:2,upperLandingDistance:2,
  physicalTraversalCertified:false};
 const case113={id:'TEST_ROOM',levels:2,stairs:[stair],
  horizontalRoutes:design.plan.floors.map((f,i)=>({
   level:i,repair:{sourceCellsPreserved:true,
    allNewCellsOutsideRoomsAndCores:true,addedCells:[]}
  }))};
 const origin={x:10,z:10},ascent={dx:1,dz:0};
 const footprintCells=Array.from({length:7},(_,i)=>[
  p(10+i,10),p(10+i,11)]).flat();
 const res={origin,ascent,footprintCells,lowerLanding:footprintCells.slice(0,2),
  upperLanding:footprintCells.slice(-2)};
 return {design,case113,stair,res,
  sketch:b138FiveRiseSketch(stair,res)};
}
test('two-wide added corridors bridge stair approach to ORIGINAL source 2x2 gallery patch',()=>{
 const {design,case113,stair,res,sketch}=fixture();
 const result=b140PlanStair(design,case113,stair,{pinnedSketch:sketch});
 assert.equal(result.status,'OFFLINE_FIVE_RISE_CONNECTED_BY_CONCEPTUAL_2WIDE_CORRIDOR');
 assert.equal(result.sourcePinned,true);
 assert.equal(result.selected.sketch.sourceFloorRise,5);
 assert.equal(result.selected.lowerBridge.sourceConnected,true);
 assert.equal(result.selected.upperBridge.sourceConnected,true);
 assert(result.selected.lowerBridge.addedCells.length>0);
 assert(result.selected.upperBridge.addedCells.length>0);
 for(const side of [result.selected.lowerBridge,result.selected.upperBridge]){
  assert(side.pathSquares.length>0);
  assert(side.pathSquares.every(v=>Number.isInteger(v.x)&&Number.isInteger(v.z)));
  assert(side.addedCells.every(v=>v.x<10||v.x>12||v.z<10||v.z>12));
  assert.equal(side.actualMinecraftConnectivityProven,false);
  assert.deepEqual(side.worldCommands,[]);
 }
 assert.deepEqual(result.worldCommands,[]);
});
test('2x2 corridor routing can TURN without narrowing to a single cell',()=>{
 const f=floor(0);f.gallery=mkGallery(3,4);
 const source=new Set(f.gallery.map(key));
 const r=b140RouteTwoWide({floor:f,cores:[],sourceGallery:source,
  landing:[p(10,10),p(11,10)],ascent:{dx:0,dz:1},side:'LOWER',
  blocked:new Set([key(p(10,10)),key(p(11,10))])});
 assert.equal(r.sourceConnected,true);
 assert(r.pathSquares.length>2);
 const axis=new Set();
 for(let i=1;i<r.pathSquares.length;i++){
  const a=r.pathSquares[i-1],b=r.pathSquares[i];
  const dx=b.x-a.x,dz=b.z-a.z;
  assert.equal(Math.abs(dx)+Math.abs(dz),1);
  axis.add(dx!==0?'X':'Z');
 }
 assert.deepEqual([...axis].sort(),['X','Z']);
 const allSquares=r.pathSquares.map(s=>[
  key(s),key(p(s.x+1,s.z)),key(p(s.x,s.z+1)),key(p(s.x+1,s.z+1))
 ]);
 for(let i=1;i<allSquares.length;i++)
  assert.equal(allSquares[i].filter(v=>allSquares[i-1].includes(v)).length,2);
});
test('will not invent a corridor where protected rooms or headroom footprint are occupied',()=>{
 const {design,case113,stair,sketch}=fixture();
 const room={x:7,z:0,width:3,depth:28};
 design.plan.floors[0].rooms=[room];
 const g=b140CandidateGeometry(design,stair,{origin:{x:10,z:10},ascent:{dx:1,dz:0}});
 assert.equal(g.valid,true); // source staircase stays in its own source core.
 const r=b140RouteTwoWide({floor:design.plan.floors[0],cores:design.plan.cores,
  sourceGallery:new Set(design.plan.floors[0].gallery.map(key)),
  landing:sketch.lowerSeam,ascent:{dx:1,dz:0},side:'LOWER',
  blocked:new Set(sketch.positions.map(x=>key(x.position)))});
 assert.equal(r.sourceConnected,false);
 assert.equal(r.addedCells.length,0);
 assert.notEqual(r.status,'PROPOSED_TWO_WIDE_ADD_ONLY_BRIDGE');
});
test('missing B113 footprint can generate a room/core-preserving FIVE-rise alternative',()=>{
 const {design,case113,stair}=fixture();
 const result=b140PlanStair(design,case113,stair,{maxCandidates:160});
 assert.equal(result.sourcePinned,false);
 assert(result.totalSourceCompatibleGeometries>0);
 assert(result.examined<=160);
 if(result.selected){
  assert.equal(result.selected.sketch.width,2);
  assert.equal(result.selected.sketch.sourceFloorRise,5);
  assert.equal(result.selected.actualEducationWalkable,false);
 }else{
  assert.match(result.status,/HOLD/);
 }
});
test('absent source gallery root never promotes guessed private corridor to PASS',()=>{
 const {design,case113,stair,sketch}=fixture();
 design.plan.floors.forEach(f=>f.gallery=[]);
 const r=b140PlanStair(design,case113,stair,{
  pinnedSketch:sketch,maxCandidates:12});
 assert.equal(r.selected,null);
 assert.match(r.status,/HOLD/);
 assert.equal(r.sourceModified,false);
});
test('builds one-building ordered plan but never authorizes any physical construction',()=>{
 const {design,case113,sketch}=fixture();
 const b138={id:design.candidateId,
  stairInterfaces:[{fiveRiseSketch:sketch}]};
 const result=b140PlanBuilding(design,case113,b138);
 assert.equal(result.stairs,1);
 assert.equal(result.originalDesignMutated,false);
 assert.equal(result.gameWrites,0);
 assert.equal(result.rows.length,1);
 assert.equal(result.rows[0].selected.commandCount,0);
 assert.equal(result.rows[0].selected.worldCoordinates,null);
 assert.equal(result.crossFlightVoxelOverlapPairs,0);
});
test('rejects forged external input and preserves B138/B139 fleet limits',()=>{
 const {design,case113,stair,sketch}=fixture();
 const invalid={...stair,toLevel:4};
 assert.throws(()=>b140PlanStair(design,case113,invalid),
  /B140_BAD_STAIR_SOURCE_OR_SEARCH/);
 assert.throws(()=>b140RouteTwoWide({floor:floor(0),cores:[],
  sourceGallery:new Set(),landing:[p(3,3),p(6,8)],
  ascent:{dx:0,dz:1},side:'LOWER'}),/B140_ROUTE_INPUT_INVALID/);
 const badSketch={...sketch,positions:sketch.positions.map((v,i)=>i===0?{...v,position:{...v.position,x:999}}:v)};
 assert.throws(()=>b140PlanStair(design,case113,stair,
  {pinnedSketch:badSketch,maxCandidates:3}),
  /B138_SOURCE_SEAM_MISMATCH|B140_PINNED_B138_GEOMETRY_REJECTED/);
 assert.equal(B140_LIMITS.sourceStairs,102);
 assert.equal(B140_LIMITS.approvedCommands,0);
});
