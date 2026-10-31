import test from 'node:test';
import assert from 'node:assert/strict';
import {auditR190BVStrip} from '../source/ai/r190bv-directed-strip.mjs';
const bounds={width:14,height:10,depth:8};
const slab=(x0,x1,z0,z1,y=0)=>Array.from({length:x1-x0+1},(_,i)=>
 Array.from({length:z1-z0+1},(_,j)=>[x0+i,y,z0+j])).flat();
function run(voxels,goal=[10,1,1]){
 return auditR190BVStrip({compiled:{designOnly:true,
  primitives:voxels.map(([x,y,z])=>[x,y,z,0]),
  geometrySha256:'b'.repeat(64),sourceSha256:'a'.repeat(64)},
  bounds,entrance:[1,1,1],headroom:3,
  levels:[{id:'low',standingY:1}],
  spaces:[{id:'room',levelId:'low',origin:[1,1],size:[12,5],
   minimumReachablePositions:1,minimumReachablePercent:1}],
  destinations:[{id:'goal',point:goal,maximumPathSteps:60}]});
}
test('BV strip succeeds with genuinely supported two-wide level route',()=>{
 const r=run(slab(0,12,0,6));
 assert.equal(r.status,'SOURCE_DIRECTED_TWO_WIDE_STRIP_PROXY_PASS');
 assert.equal(r.destinations[0].passed,true);
 assert.equal(r.minecraftWalking,'NOT_TESTED');
 assert.equal(r.worldWrites,0);
});
test('BV strip rejects one-wide connecting bridge even when 1-cell path exists',()=>{
 const voxels=[...slab(0,3,0,5),...slab(4,8,1,1),...slab(9,12,0,5)];
 const r=run(voxels);
 assert.equal(r.destinations[0].reachable,false);
 assert.equal(r.status,'HOLD_DIRECTED_TWO_WIDE_STRIP_PROXY');
});
test('BV strip can traverse real two-wide stair treads in ascending y',()=>{
 // Each 2-cell-wide tread is solid at its top; step up after two x-cells.
 const voxels=[
  ...slab(0,3,0,4,0),
  ...slab(4,5,0,4,0),...slab(4,5,0,4,1),
  ...slab(6,9,0,4,0),...slab(6,9,0,4,1),...slab(6,9,0,4,2)
 ];
 const r=run(voxels,[8,3,1]);
 assert.equal(r.destinations[0].passed,true);
 assert.ok(r.nonzeroHeightEdges>0);
 assert.equal(r.minecraftWalking,'NOT_TESTED');
});
test('BV strip rejects invalid final geometry rather than inventing a route',()=>{
 assert.throws(()=>run([[99,0,0]]),/R190BV_STRIP_VOXEL/);
});
