import test from 'node:test';
import assert from 'node:assert/strict';
import {straightModel,buildB119ProxyIndex,inspectB119Pose,searchB119Stair}
 from './b119-full-stair-3d-search.mjs';
const p=(x,z)=>({x,z});
import {transformStairBox} from '../../b114/main/b114-stair-grid-frame.mjs';
test('all four cardinal rotations have exact voxel-grid footprint alignment',()=>{
 const directions=[{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}];
 for(const d of directions){
  const origin={x:10,z:10},model=straightModel(origin,d,0);
  const unique=new Set(model.footprint.map(p=>p.x+','+p.z));
  assert.equal(unique.size,14);
  for(let n=0;n<7;n++)for(let w=0;w<2;w++){
   const b=transformStairBox({x:n,y:0,z:w,width:1,height:1,depth:1},
    {origin,ascent:d,fromLevel:0});
   assert.deepEqual(model.footprint[n*2+w],{x:b.x,z:b.z});
  }
 }
});

const floor=()=>({footprintRows:Array(24).fill('1'.repeat(24)),rooms:[],gallery:[]});
function scenario(){
 const design={plan:{floors:[floor(),floor()],cores:[{x:10,z:8,width:2,depth:2}]}};
 const stair={stairIndex:0,coreIndex:0,fromLevel:0,toLevel:1,proposedOrigin:p(8,8),proposedAscent:{dx:1,dz:0}};
 const model=straightModel(stair.proposedOrigin,stair.proposedAscent,0);
 const walkByLevel=[new Set(['5,8','5,9']),new Set(['18,8','18,9'])];
 return {design,stair,model,otherModels:[],solidMap:buildB119ProxyIndex([]),
 walkByLevel,occupiedByLevel:[new Set(),new Set()],
 aperturesByLevel:[new Set(),new Set()],heldSides:new Set(['UPPER'])};
}
test('straight five-rise stair creates two lanes and 2+2 landing cells',()=>{
 const m=scenario().model;
 assert.equal(m.footprint.length,14);assert.equal(m.lowerLanding.length,2);
 assert.equal(m.upperLanding.length,2);assert(m.body.length>10);assert(m.supports.length>0);
 assert.equal(m.physicalStairStatesCertified,false);assert.equal(m.worldContacts,0);
});
test('unbuilt whole-stair geometry has no claimed Bedrock certification',()=>{
 const s=scenario(),r=inspectB119Pose(s);
 assert.equal(r.status,'LOCAL_GEOMETRIC_CANDIDATE_ONLY',JSON.stringify(r.reasonCodes));
 assert.equal(r.reasonCodes.length,0);assert(r.sides.LOWER.concepts>0);
 assert(r.sides.UPPER.concepts>0);assert(r.retainsUpperLanding2Cells);
 assert.equal(r.physicalStairMovementCertified,false);
 assert.equal(r.realMinecraftBlockStatesAndSupportCertified,false);
});
test('protected rooms or absent source floor veto the whole pose',()=>{
 const a=scenario();a.design.plan.floors[0].rooms.push({x:9,z:8,width:2,depth:2});
 assert(inspectB119Pose(a).reasonCodes.includes('FOOTPRINT_CROSSES_PROTECTED_ROOM'));
 const b=scenario();b.design.plan.floors[1].footprintRows[8]='1'.repeat(14)+'0'+'1'.repeat(9);
 assert(inspectB119Pose(b).reasonCodes.includes('FOOTPRINT_OUTSIDE_SOURCE_FLOOR'));
});
test('source B105 proxy block at swept body is detected',()=>{
 const a=scenario(),b=a.model.body[0];
 a.solidMap=buildB119ProxyIndex([{x:Math.floor(b.x),y:Math.floor(b.y),z:Math.floor(b.z),kind:'WALL_PROXY'}]);
 assert(inspectB119Pose(a).reasonCodes.includes('B105_SOURCE_VOXEL_HEADROOM_OBSTRUCTION'));
});
test('other flight 3D body and support interference rejects candidate',()=>{
 const a=scenario();a.otherModels=[{id:9,body:a.model.body,treads:a.model.treads,supports:a.model.supports}];
 assert(inspectB119Pose(a).reasonCodes.includes('NEIGHBOR_STAIR_3D_BODY_OR_SUPPORT_CLASH'));
 const b=scenario();b.occupiedByLevel[1].add('10,8');
 assert(inspectB119Pose(b).reasonCodes.includes('FOOTPRINT_CROSSES_OTHER_STAIR'));
});
test('existing gallery cells cannot be deleted by a new stair',()=>{
 const a=scenario();a.walkByLevel[0].add('9,8');
 assert(inspectB119Pose(a).reasonCodes.includes('FOOTPRINT_OVERLAPS_SOURCE_OR_STAGED_GALLERY'));
});
test('a missing connection on either side blocks whole-stair recommendation',()=>{
 const a=scenario();a.walkByLevel[0]=new Set();
 assert(inspectB119Pose(a).reasonCodes.includes('NO_CONSERVATIVE_TWO_WIDE_LOWER_EXIT'));
});
test('bounded full search returns accountable stats and never alters source',()=>{
 const a=scenario(),r=searchB119Stair({...a,maxShift:1});
 assert.equal(r.attempts,20);assert(r.conservativeModelClear>=1);
 assert.equal(r.floorAndRoomsImmutable,true);assert.equal(r.sourceStairsNotMoved,true);
 assert.equal(r.physicalMovementCertified,false);assert.equal(r.constructionAllowed,false);
 assert.throws(()=>searchB119Stair({...a,maxShift:30}),/B119_UNBOUNDED_OR_UNVERIFIED_SEARCH/);
});
