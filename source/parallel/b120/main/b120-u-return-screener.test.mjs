import test from 'node:test';
import assert from 'node:assert/strict';
import {buildB120UTurn,screenB120UTurn,searchB120UTurns} from './b120-u-return-screener.mjs';
const floor=()=>({footprintRows:Array(30).fill('1'.repeat(30)),rooms:[],gallery:[]});
function sample(){
 const design={plan:{floors:[floor(),floor()],cores:[{x:8,z:7,width:1,depth:1}]}};
 const stair={fromLevel:0,toLevel:1,coreIndex:0,proposedOrigin:{x:6,z:6},proposedAscent:{dx:1,dz:0}};
 const model=buildB120UTurn({origin:{x:6,z:6},ascent:{dx:1,dz:0},fromLevel:0,firstRise:2});
 const walkByLevel=[new Set(['3,6','3,7']),new Set(['3,8','3,9'])];
 return {design,stair,model,solidMap:new Map(),otherModels:[],
  walkByLevel,occupiedByLevel:[new Set(),new Set()],
  aperturesByLevel:[new Set(),new Set()]};
}
test('both 2+3 and 3+2 generate 20 unique signed footprint cells and real 3D proxy arrays',()=>{
 for(const firstRise of [2,3]){
  const m=buildB120UTurn({origin:{x:6,z:6},ascent:{dx:1,dz:0},fromLevel:0,firstRise});
  assert.equal(new Set(m.footprint.map(x=>x.x+','+x.z)).size,20);
  assert.equal(m.lowerLanding.length,2);assert.equal(m.upperLanding.length,2);
  assert.equal(m.discontinuities,0);
  assert.equal(m.intermediateLandingSupportProxyCells,8);
  assert(m.body.length>12&&m.platform.length===8&&m.supports.length>0);
  assert.equal(m.physicalTraversalCertified,false);
 }
});
test('all four signed grid rotations produce 20 unique cells',()=>{
 for(const ascent of [{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}]){
  const m=buildB120UTurn({origin:{x:12,z:12},ascent,fromLevel:1,firstRise:3});
  assert.equal(new Set(m.footprint.map(x=>x.x+','+x.z)).size,20);
  assert(m.lowerLanding.every(p=>m.footprint.some(q=>p.x===q.x&&p.z===q.z)));
  assert(m.upperLanding.every(p=>m.footprint.some(q=>p.x===q.x&&p.z===q.z)));
 }
});
test('clear local source proxy supports 2-wide routes to both floor galleries',()=>{
 const r=screenB120UTurn(sample());
 assert.equal(r.status,'CONDITIONAL_U_TURN_DESIGN_ONLY',r.reasonCodes.join(','));
 assert.equal(r.endpoints.LOWER.possibleTwoWide,true);
 assert.equal(r.endpoints.UPPER.possibleTwoWide,true);
 assert.equal(r.realMinecraftCollisionCertified,false);
 assert.equal(r.constructionAuthorized,false);
});
test('source rooms, missing floor, other stair and staged gallery are never overwritten',()=>{
 const a=sample();a.design.plan.floors[1].rooms.push({x:7,z:6,width:2,depth:2});
 assert(screenB120UTurn(a).reasonCodes.includes('PROTECTED_ROOM'));
 const b=sample();b.design.plan.floors[0].footprintRows[6]='1'.repeat(7)+'0'+'1'.repeat(22);
 assert(screenB120UTurn(b).reasonCodes.includes('OUTSIDE_SOURCE_FLOOR'));
 const c=sample();c.occupiedByLevel[0].add('7,6');
 assert(screenB120UTurn(c).reasonCodes.includes('OTHER_STAIR_FOOTPRINT'));
 const d=sample();d.walkByLevel[0].add('7,7');
 assert(screenB120UTurn(d).reasonCodes.includes('PRESERVED_GALLERY_FOOTPRINT'));
});
test('existing B105 source volume is protected from player and support proxy overlap',()=>{
 const a=sample(),b=a.model.body.find(x=>x.height>0);
 for(let y=Math.floor(b.y);y<Math.ceil(b.y+b.height);y++)
 for(let z=Math.floor(b.z);z<Math.ceil(b.z+b.depth);z++)
 for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.width);x++)
  a.solidMap.set(x+','+y+','+z,{x,y,z,kind:'B105_WALL'});
 assert(screenB120UTurn(a).reasonCodes.includes('B105_PLAYER_SWEEP_COLLISION'));
});
test('3D foreign stair colliding with changed turn is rejected',()=>{
 const a=sample();
 a.otherModels=[{id:7,body:a.model.body,treads:a.model.treads,supports:a.model.supports}];
 assert(screenB120UTurn(a).reasonCodes.includes('OTHER_STAIR_3D_INTERFERENCE'));
});
test('missing upper gallery is never a candidate even with valid floor cells',()=>{
 const a=sample();a.walkByLevel[1]=new Set();
 assert(screenB120UTurn(a).reasonCodes.includes('NO_TWO_WIDE_UPPER_GALLERY'));
});
test('bounded two-split four-rotation search never changes any world data',()=>{
 const a=sample(),r=searchB120UTurns({...a,maxShift:0});
 assert.equal(r.attempted,8);assert.equal(r.sourceStructuresUnmodified,true);
 assert.equal(r.worldContacts,0);assert.equal(r.realWalkabilityCertified,false);
 assert.equal(r.constructionAuthorized,false);
 assert.throws(()=>searchB120UTurns({...a,maxShift:4}),/B120_UNBOUNDED_SEARCH/);
});
