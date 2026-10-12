import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {corridorNetwork,walkable,findCorridorRoute,frameAt,proposeDoor,compileB88} from './compile-b88.mjs';
import {safe,hash} from '../../b79/main/compile-b79.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const dir=path.resolve(here,'../../..');
const get=s=>JSON.parse(fs.readFileSync(path.join(dir,s),'utf8'));
const shape=(cols=['11111','11111','11111'],corridors=[{x:2,z:0},{x:2,z:1},{x:2,z:2}],stairs=[])=>({id:'synthetic',level:1,floorMaskRows:cols,conceptReservations:{corridors,stairs,elevators:[]}});
const idx=(sites=[])=>({final:new Map(sites.map(p=>[`${p.x},${p.y},${p.z}`,{occupied:true,role:p.role||'primaryWall',block:p.block||'minecraft:light_gray_concrete',operationIndex:3}]))});
const empty=()=>({solids:new Set(),reserved:new Set(),protectedSites:new Set()});
test('components group connected named corridor squares',()=>{
 const a=shape(['11111','11111','11111'],[{x:0,z:0},{x:1,z:0},{x:4,z:2}]);const n=corridorNetwork(a);
 assert.equal(n.components.length,2);assert.deepEqual(n.components.map(c=>c.cellCount).sort(),[1,2]);
});
test('vertical adjacency only labels topology, not an exit',()=>{
 const a=shape(['111','111'],[{x:0,z:0},{x:2,z:0}],[{x:1,z:0}]);const n=corridorNetwork(a);
 assert.equal(n.coreAdjacentComponents,2);assert.equal(n.components.length,2);
});
test('outside mask never forms corridor',()=>{
 const a=shape(['100','000'],[{x:0,z:0},{x:1,z:0}]);assert.equal(corridorNetwork(a).components[0].cellCount,1);
 assert.equal(walkable({x:1,z:0},1,a,idx(),empty(),[]),false);
});
test('two-high pinned blocks prohibit traversal',()=>{
 const a=shape();const f=empty();
 assert.equal(walkable({x:0,z:0},1,a,idx([{x:0,y:2,z:0}]),f,[]),false);
 assert.equal(walkable({x:0,z:0},1,a,idx([{x:0,y:1,z:0}]),f,[]),false);
});
test('preexisting 3D solids and reserved sites prohibit traversal',()=>{
 const a=shape(),f=empty();f.reserved.add('0,1,0');assert.equal(walkable({x:0,z:0},1,a,idx(),f,[]),false);
 f.reserved.clear();f.solids.add('0,2,0');assert.equal(walkable({x:0,z:0},1,a,idx(),f,[]),false);
 f.solids.clear();f.protectedSites.add('0,0');assert.equal(walkable({x:0,z:0},1,a,idx(),f,[]),false);
});
test('other room and stair footprint cannot be a corridor path',()=>{
 const a=shape(undefined,undefined,[{x:0,z:0}]);assert.equal(walkable({x:0,z:0},1,a,idx(),empty(),[]),false);
 assert.equal(walkable({x:1,z:1},1,a,idx(),empty(),[{x:1,z:1,width:1,depth:1}]),false);
});
test('BFS finds a continuous corridor route and never leaps cells',()=>{
 const a=shape();const n=corridorNetwork(a),r=findCorridorRoute({x:0,z:2},a,idx(),empty(),[],n);
 assert.ok(r);assert.equal(r.sites.length,3);assert.deepEqual(r.sites.at(-1),{x:2,z:2});assert.equal(r.newHallSites.length,2);
});
test('BFS refuses unreachable path under pinned curtain',()=>{
 const a=shape(),n=corridorNetwork(a),f=empty();for(let z=0;z<3;z++)f.protectedSites.add(`1,${z}`);
 assert.equal(findCorridorRoute({x:0,z:2},a,idx(),f,[],n),null);
});
test('BFS bound never bypasses long path requirement',()=>{
 const a=shape(),n=corridorNetwork(a);
 assert.equal(findCorridorRoute({x:0,z:2},a,idx(),empty(),[],n,{maxLength:2}),null);
});
test('full homogeneous three-high concrete wall can be reused as frame',()=>{
 const a=shape(),f=empty(),wall=[];
 for(const z of [0,2])for(const y of [1,2,3])wall.push({x:1,z,y});
 const frame=frameAt({cell:{x:1,z:1},normal:{x:1,z:0}},a,idx(wall),f,[]);
 assert.ok(frame);assert.equal(frame.jambEvidence.length,6);assert.equal(frame.voxels.length,7);
});
test('glass, slab and other non-opaque blocks never silently become jambs',()=>{
 const a=shape();for(const role of ['glass','slab','frame']){
  const f=frameAt({cell:{x:1,z:1},normal:{x:1,z:0}},a,idx([{x:1,y:1,z:0,role}]),empty(),[]);
  assert.equal(f,null);
 }
});
test('fragmentary 3-high pinned jamb must be held',()=>{
 const a=shape(),f=frameAt({cell:{x:1,z:1},normal:{x:1,z:0}},a,idx([{x:1,y:1,z:0}]),empty(),[]);
 assert.equal(f,null);
});
test('protected corridor frame cannot be used by new room',()=>{
 const a=shape(),f=empty();f.protectedSites.add('1,0');
 assert.equal(frameAt({cell:{x:1,z:1},normal:{x:1,z:0}},a,idx(),f,[]),null);
});
test('nominal walls alone never grant construction permission',()=>{
 const a=shape(['11111','11111','11111'],[{x:4,z:1}]);const room={id:'r',x:0,z:0,width:3,depth:3};
 const res=proposeDoor({held:{},room,port:{id:'p',roomCell:{x:2,z:1}},shape:a,source:{openingPorts:[{id:'p',roomCell:{x:2,z:1}}]},idx:idx(),fixed:empty(),otherRooms:[],network:corridorNetwork(a)});
 assert.ok(res.diagnostics.edgeCount>0);assert.equal(res.candidates.every(c=>c.operations.length===0&&c.executionAllowed===false),true);
});
test('frozen B87 report passes fail-closed provenance and gate verification',()=>{
 const r=get('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');safe(r,'minecraftaibuilder-b87-structural-free-room-redraft-v1');
 assert.equal(r.totals.stillHeldAfterB87,18);
});
test('frozen B87 report hash cannot be altered silently',()=>{
 const r=get('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');r.totals.stillHeldAfterB87=17;
 assert.throws(()=>safe(r,'minecraftaibuilder-b87-structural-free-room-redraft-v1'));
});
test('pinned 5-buildings full report preserves 296 and records all 18 holds',async()=>{
 const r=await compileB88();assert.equal(r.productionReplays.length,5);assert.equal(r.sections.length,30);
 assert.equal(r.sections.flatMap(s=>s.rooms).length,18);
 assert.equal(r.totals.totalUnapprovedLocalCandidates+r.totals.remainingHeld,314);
 assert.equal(r.BuildPlan.operations.length,0);assert.equal(r.worldContacts,0);
 assert.equal(r.gates.length,9);assert.ok(r.gates.every(g=>g.status==='BLOCKED'));
 assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.executionAllowed,false);
 assert.ok(r.sections.every(s=>s.earlierCandidatesUntouched));
 const {reportSha256,...body}=r;assert.equal(hash(body),reportSha256);
 const stored=get('parallel/b88/main/B88_CORRIDOR_NETWORK_REPORT.json');assert.equal(stored.reportSha256,r.reportSha256);
});
