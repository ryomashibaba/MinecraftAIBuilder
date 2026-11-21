import test from 'node:test';
import assert from 'node:assert/strict';
import {auditR190BV} from '../source/ai/r190bv-contiguous-clearance.mjs';
const bounds={width:14,height:8,depth:10};
function base({voxels,entrance=[1,1,1],goal=[9,1,1],size=[11,5]}){
 const primitives=voxels.map(([x,y,z])=>[x,y,z,0]);
 return auditR190BV({compiled:{designOnly:true,primitives,
  sourceSha256:'a'.repeat(64),geometrySha256:'b'.repeat(64)},bounds,entrance,
  levels:[{id:'ground',standingY:1}],headroom:3,
  destinations:[{id:'goal',point:goal,maximumPathSteps:100}],
  spaces:[{id:'floor',levelId:'ground',origin:[1,1],size,
   minimumReachablePositions:3,minimumReachablePercent:5}]});
}
const slab=(x0,x1,z0,z1,y=0)=>Array.from({length:x1-x0+1},(_,i)=>
 Array.from({length:z1-z0+1},(_,j)=>[x0+i,y,z0+j])).flat();
test('BV flat supported 2x2 corridor reaches destination, not world writes',()=>{
 const r=base({voxels:slab(0,12,0,7)});
 assert.equal(r.status,'SOURCE_CONSERVATIVE_2X2_ROUTE_PASS');
 assert.equal(r.destinations[0].passed,true);
 assert.equal(r.entry.wideStandable,true);
 assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
 assert.equal(r.minecraftWalking,'NOT_TESTED');
 assert.deepEqual(r.BuildPlan.operations,[]);
});
test('BV exact one-cell bridge fails wide proof despite connected single-cell supports',()=>{
 const voxels=[...slab(0,3,0,4),...slab(4,8,1,1),...slab(9,12,0,4)];
 const r=base({voxels,goal:[10,1,1]});
 assert.equal(r.entry.wideStandable,true);
 assert.equal(r.destinations[0].wideStandable,true);
 assert.equal(r.destinations[0].reachable,false);
 assert.equal(r.status,'HOLD_CONSERVATIVE_2X2_ROUTE');
});
test('BV missing any of four supporting cells rejects standing anchor',()=>{
 const v=slab(0,12,0,7).filter(a=>a[0]!==1||a[2]!==2);
 const r=base({voxels:v});
 assert.equal(r.entry.wideStandable,false);
 assert.equal(r.reachableWideAnchors,0);
 assert.equal(r.status,'HOLD_CONSERVATIVE_2X2_ROUTE');
});
test('BV obstructed 3-block headspace closes wide route even on full floors',()=>{
 const voxels=[...slab(0,12,0,7),...[1,2,3].map(y=>[2,y,1])];
 const r=base({voxels});
 assert.equal(r.entry.wideStandable,false);
 assert.equal(r.destinations[0].reachable,false);
});
test('BV malformed final voxels and bounds are rejected rather than invented',()=>{
 const input={compiled:{designOnly:true,primitives:[[99,0,0,0]]},bounds,
  entrance:[1,1,1],levels:[],destinations:[],spaces:[]};
 assert.throws(()=>auditR190BV(input),/FINAL_VOXEL_INVALID/);
 assert.throws(()=>auditR190BV({...input,bounds:{width:100,height:96,depth:100}}),/BOUNDS/);
});
