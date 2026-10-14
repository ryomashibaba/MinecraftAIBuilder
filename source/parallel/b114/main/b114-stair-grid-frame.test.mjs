import test from 'node:test';
import assert from 'node:assert/strict';
import {STAIR_GRID_FRAME_VERSION,stairGridOffsets,transformStairBox} from './b114-stair-grid-frame.mjs';
import {intersects} from '../../b113/main/b113-geometry.mjs';
const cardinals=[{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0},{dx:0,dz:-1}];
test('all four stair directions rotate every one-block footprint onto exact selected grid tiles',()=>{
 assert.equal(STAIR_GRID_FRAME_VERSION,'B114_SIGNED_VOXEL_FRAME_V2');
 for(const ascent of cardinals){
  const origin={x:25,z:9},link={origin,ascent,fromLevel:3};
  for(let i=0;i<7;i++)for(let w=0;w<2;w++){
   const p=transformStairBox({x:i,y:0,z:w,width:1,height:1,depth:1},link);
   assert.equal(p.x,origin.x+ascent.dx*i-ascent.dz*w);
   assert.equal(p.z,origin.z+ascent.dz*i+ascent.dx*w);
   assert.equal(p.y,16);
   assert.equal(p.width,1);assert.equal(p.depth,1);
  }
 }
});
test('signed boundary offsets are right-handed and exact for negative basis vectors',()=>{
 assert.deepEqual(cardinals.map(stairGridOffsets),[
  {x:0,z:0},{x:1,z:0},{x:1,z:1},{x:0,z:1}]);
});
test('southbound LIBRARY_V3 stair player corridor does not enter its neighboring x=23 facade cell',()=>{
 const link={origin:{x:25,z:2},ascent:{dx:0,dz:1},fromLevel:0};
 const body=transformStairBox({x:4.45,y:2,z:.7,width:.6,height:2,depth:.6},link);
 assert(body.x>=24);
 assert.equal(intersects(body,{x:23,y:3,z:6,width:1,height:2,depth:1}),false);
});
test('all AABBs preserve volume and stair height under signed 90-degree rotations',()=>{
 const b={x:.4,y:1.5,z:.8,width:1.3,height:.5,depth:.6};
 for(const ascent of cardinals) {
  const v=transformStairBox(b,{origin:{x:9,z:4},ascent,fromLevel:2});
  assert(Math.abs(v.width*v.depth-b.width*b.depth)<1e-9);
  assert.equal(v.height,b.height);
  assert.equal(v.y,12.5);
 }
});
test('cannot silently allow non-cardinal or malformed stair frames',()=>{
 for(const a of [{dx:1,dz:1},{dx:0,dz:0},{dx:.5,dz:.5},{}])
  assert.throws(()=>stairGridOffsets(a),/NON_CARDINAL/);
 assert.throws(()=>transformStairBox({x:0,y:0,z:0,width:1,height:1,depth:1},
  {origin:{x:0,z:0},ascent:{dx:1,dz:0},fromLevel:-1}),/INVALID_BOX/);
});
