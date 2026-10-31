import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditR190CD} from '../source/ai/r190cd-integrated-quality-gate.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const raw=Buffer.from('independent fabricated review-only testcase');
const build=(floor,props={})=>{
 const bounds={width:12,height:15,depth:10},primitives=[...floor]
  .map(([x,y,z])=>[x,y,z,1,0]).sort((a,b)=>((a[1]*10+a[2])*12+a[0])-((b[1]*10+b[2])*12+b[0]));
 return {compiled:{primitives,geometrySha256:sha(JSON.stringify(primitives)),designOnly:true,bounds},
 bounds,sourceRaw:raw,programs:[{id:'public-interior',purpose:'public room declared by author',
  floorY:2,polygon:[[3,2],[7,2],[7,7],[3,7]]}],
 origin:'TEST_ONLY_CONTROLLED_SMALL_GEOMETRY',entrances:[[0,3,2]],...props};
};
const slab=(ys)=>new Set(ys.flatMap(y=>Array.from({length:9},(_,x)=>x).flatMap(x=>
 Array.from({length:9},(_,z)=>[x,y,z]))));
test('No invented entrance, fail closed with still valid occupied floor',()=>{
 const a=build(slab([2]),{entrances:[]}),report=auditR190CD(a);
 assert.ok(report.findings.includes('MISSING_AUTHOR_ENTRANCE'));
 assert.equal(report.programs[0].supportedClearFraction,1);
 assert.equal(report.programs[0].conservativeTwoWideReachable,0);
 assert.equal(report.artGate,'ART_HOLD_REQUIRES_REAL_MULTI_VIEW_HUMAN');
 assert.deepEqual(report.BuildPlan.operations,[]);
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.equal(report.worldWrites,0);
});
test('Author exterior entrance is independently measured; a planar supported room is reachable',()=>{
 const report=auditR190CD(build(slab([2])));
 assert.equal(report.entrances[0].standable,true);
 assert.equal(report.entrances[0].exteriorHorizontalAirConnected,true);
 assert.ok(report.programs[0].conservativeTwoWideReachable>0);
 assert.equal(report.modelCalls,0);
 assert.equal(report.realMinecraftWalkability,'NOT_TESTED');
});
test('A blocked horizontal exterior window is not certified as an exterior doorway',()=>{
 const slabCells=slab([2]);
 // A sealed 3D wall box; author entrance is inside, not on an exterior opening.
 for(let y=3;y<6;y++){
  for(let z=1;z<=8;z++){slabCells.add([3,y,z]);slabCells.add([9,y,z]);}
  for(let x=3;x<=9;x++){slabCells.add([x,y,1]);slabCells.add([x,y,8]);}
 }
 const dedup=new Map([...slabCells].map(v=>[v.join(','),v]));
 const q=build(new Set(dedup.values()),{entrances:[[5,3,4]]});
 const report=auditR190CD(q);
 assert.equal(report.entrances[0].standable,true);
 assert.equal(report.entrances[0].exteriorHorizontalAirConnected,false);
 assert.ok(report.findings.includes('NO_CLEAR_AIR_CONNECTION_TO_EXTERIOR'));
 assert.equal(report.conservative2x2ReachableAnchors,0);
 assert.equal(report.entrances[0].conservativeReachableAnchors,0);
 assert.equal(report.programs[0].conservativeTwoWideReachable,0);
 assert.equal(report.executionAllowed,false);
});
test('A sealed secondary entrance never contributes reachability when another exterior entrance is valid',()=>{
 const cells=slab([2]);
 for(let y=3;y<6;y++){
  for(let z=1;z<=8;z++){cells.add([3,y,z]);cells.add([9,y,z]);}
  for(let x=3;x<=9;x++){cells.add([x,y,1]);cells.add([x,y,8]);}
 }
 const dedup=new Map([...cells].map(v=>[v.join(','),v]));
 const report=auditR190CD(build(new Set(dedup.values()),{
  entrances:[[0,3,2],[5,3,4]]
 }));
 assert.equal(report.entrances[0].exteriorHorizontalAirConnected,true);
 assert.equal(report.entrances[1].standable,true);
 assert.equal(report.entrances[1].exteriorHorizontalAirConnected,false);
 assert.equal(report.entrances[1].conservativeReachableAnchors,0);
 assert.equal(report.entrances[1].conservativeReachableAnchorsScope,'NOT_AN_ELIGIBLE_EXTERIOR_ROUTE_SEED');
 assert.ok(report.conservative2x2ReachableAnchors>0);
 assert.equal(report.programs[0].conservativeTwoWideReachable,0);
 assert.ok(report.findings.includes('PROGRAM_UNREACHABLE_FROM_AUTHOR_ENTRANCE:public-interior'));
 assert.deepEqual(report.BuildPlan.operations,[]);
 assert.equal(report.worldContacts,0);
 assert.equal(report.worldWrites,0);
});

test('A separate unsupported upper floor is not magically joined by room labels',()=>{
 const a=build(slab([2,9]),{programs:[
  {id:'hall',purpose:'ground public room',floorY:2,polygon:[[3,2],[7,2],[7,7],[3,7]]},
  {id:'high',purpose:'upper office room',floorY:9,polygon:[[3,2],[7,2],[7,7],[3,7]]}
 ]});
 const report=auditR190CD(a);
 assert.ok(report.programs[1].supportedClearCells>0);
 assert.equal(report.programs[1].conservativeTwoWideReachable,0);
 assert.ok(report.findings.includes('PROGRAM_UNREACHABLE_FROM_AUTHOR_ENTRANCE:high'));
});
test('Author two-horizontal-cell per one-height riser is NOT silently credited as Minecraft movement',()=>{
 const a=build(slab([2,3]),{routeNodes:[[1,3,3],[3,4,3]]});
 const report=auditR190CD(a);
 assert.equal(report.authorRoute.nonConservativeTransitions,1);
 assert.ok(report.findings.includes('AUTHOR_ROUTE_HAS_NON_CONSERVATIVE_TWO_CELL_RISERS'));
});
test('Geometry tamper, duplicates, invalid original source and unknown programs fail-closed',()=>{
 const a=build(slab([2]));
 assert.throws(()=>auditR190CD({...a,compiled:{...a.compiled,geometrySha256:'a'.repeat(64)}}),
  /R190CD_GEOMETRY_SHA/);
 const b=build(slab([2]));b.compiled.primitives.push([...b.compiled.primitives[0]]);
 b.compiled.geometrySha256=sha(JSON.stringify(b.compiled.primitives));
 assert.throws(()=>auditR190CD(b),/R190CD_DUPLICATE_FINAL_VOXEL/);
 assert.throws(()=>auditR190CD({...a,sourceRaw:new Uint8Array(0)}),/R190CD_SOURCE_BYTES/);
});
