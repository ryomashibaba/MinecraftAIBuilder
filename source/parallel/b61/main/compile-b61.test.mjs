import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileB61,solveMinimumLocalConnection,verifyB61} from './compile-b61.mjs';
import {buildB61FromSource} from './run-b61.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const data=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const b60=data('parallel/b60/main/B60_GUARDED_CIRCULATION_CONTRACT.json');
const b57=data('parallel/b57/main/B57_ENVELOPE_TOPOLOGY.json');
const guard=data('reports/B43_GUARDED_LAYOUT_ASSEMBLY.json');
const rehash=o=>{const {reportSha256,...body}=o;return {...body,reportSha256:createHash('sha256').update(JSON.stringify(body)).digest('hex')};};
const clone=o=>structuredClone(o);
const make=(a=b60,b=guard,c=b57)=>compileB61(a,b,c);
const r=make();
test('B61 report deterministic and local-only',()=>assert.deepEqual(make(),r));
test('B61 saved report matches reproducible fixture',()=>assert.deepEqual(data('parallel/b61/main/B61_LOCAL_CONNECTOR_CONTRACT.json'),r));
test('B61 replays exact report',()=>assert.equal(verifyB61(r,b60,guard,b57),true));
test('read-only entry matches direct compiler',()=>assert.deepEqual(buildB61FromSource().report,r));
test('D012 only gap on original graph',()=>{assert.equal(r.gap.doorId,'apartment/candidate-01/L1/D012');assert.equal(r.topology.originalSymbolicallyConnected,77);});
test('exactly three added local cells',()=>{assert.equal(r.gap.minimumNewCorridorCells,3);assert.deepEqual(r.gap.newCorridorCells,[{x:21,z:18},{x:22,z:18},{x:23,z:18}]);});
test('no altered floor or prior corridor',()=>{const building=b57.buildings.find(b=>b.id==='apartment/candidate-01');const cells=new Set();for(const v of building.preview.levels[0].floorRectangles)for(let z=v.z;z<v.z+v.depth;z++)for(let x=v.x;x<v.x+v.width;x++)cells.add(`${x},${z}`);const hallway=new Set(guard.sixLevels[0].conceptualCorridorCells.map(p=>`${p.x},${p.z}`));for(const p of r.gap.newCorridorCells){assert(cells.has(`${p.x},${p.z}`));assert(!hallway.has(`${p.x},${p.z}`));}});
test('hypothetical after graph 78 and historic gap 60 unchanged',()=>{assert.equal(r.topology.candidateSymbolicallyConnected,78);assert.equal(r.topology.remainingSymbolicGaps,0);assert.equal(r.topology.historicB42UpperDoorsStillUnverified,60);assert.equal(r.topology.repairApplied,false);});
test('78 door reservations never executable',()=>{assert.equal(r.moduleInterfaces.doorReservations.length,78);for(const d of r.moduleInterfaces.doorReservations){assert.equal(d.doorBlock,null);assert.equal(d.facing,null);assert.equal(d.hinge,null);assert.equal(d.approved,false);assert.equal(d.emittable,false);}});
test('five stair reservations unapproved and no block states',()=>{assert.equal(r.moduleInterfaces.stairReservations.length,5);for(const s of r.moduleInterfaces.stairReservations){assert.equal(s.blockStates,null);assert.equal(s.headroomVerified,false);assert.equal(s.supportVerified,false);assert.equal(s.approved,false);}});
test('all 3 new corridor reservations require room/wall review',()=>{assert.equal(r.moduleInterfaces.unapprovedCorridorExtension.length,3);for(const c of r.moduleInterfaces.unapprovedCorridorExtension){assert.equal(c.requiresRoomPartitionReview,true);assert.equal(c.wallOwnersIdentified,false);assert.equal(c.emittable,false);}});
test('B43 35 old corridor and 20 wall proposals kept held',()=>{assert.equal(r.moduleInterfaces.earlierUnapprovedCorridorCells,35);assert.equal(r.moduleInterfaces.earlierWallConflictCells,20);});
test('B42 two cells x five comparisons remain held',()=>{assert.equal(r.topology.originalB42FloorMismatchPerUpperLevel,2);assert.equal(r.topology.originalB42FloorMismatchComparisons,5);});
test('safety flags, 9 gates and zero operations',()=>{assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.deployment,'BLOCKED');assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.BuildPlan.worldCoordinates,null);assert.equal(r.engineCalls,0);assert.equal(r.worldContacts,0);assert.equal(r.scans,0);});
test('no block names or world coordinate mappings',()=>{assert.deepEqual(r.BuildPlan.materialIds,[]);assert.equal(r.moduleInterfaces.allDoorBlockStatesUnknown,true);assert.equal(r.moduleInterfaces.allStairClearancesUnknown,true);});
test('solver uses no additions on already attached corridor',()=>{const f=new Set(['0,0','1,0','2,0']),c=new Set(f),m=new Set(['0,0','1,0']);const out=solveMinimumLocalConnection(f,c,m,{x:2,z:0});assert.equal(out.minimumAddedCells,0);});
test('solver chooses minimum added cells, not minimum steps',()=>{const f=new Set(['0,0','1,0','2,0','3,0','0,1','1,1','2,1','3,1']),c=new Set(['0,0','1,0','3,0','0,1','1,1','2,1','3,1']),m=new Set(['0,0','0,1','1,1','2,1','3,1']);const out=solveMinimumLocalConnection(f,c,m,{x:3,z:0});assert.equal(out.minimumAddedCells,0);});
test('solver rejects no floor seed',()=>assert.throws(()=>solveMinimumLocalConnection(new Set(['0,0']),new Set(['0,0']),new Set(['0,0']),{x:5,z:5}),/B61_SEED/));
test('solver rejects no floor-connected path',()=>assert.throws(()=>solveMinimumLocalConnection(new Set(['0,0','9,9']),new Set(['0,0','9,9']),new Set(['0,0']),{x:9,z:9}),/B61_NO_FLOOR_CONNECTION/));
for(const [name,edit] of [
 ['modified B60 report checksum',x=>x.reportSha256='x'.repeat(64)],
 ['fake B60 gate ready',x=>{x.gates[0].status='READY';return rehash(x)}],
 ['fake B60 execution allowed',x=>{x.executionAllowed=true;return rehash(x)}],
 ['B60 world coordinate injected',x=>{x.BuildPlan.worldCoordinates={x:1,z:2};return rehash(x)}],
 ['B60 symbolic gap masked',x=>{x.unresolvedDoorIds=[];return rehash(x)}],
 ['B60 production hash mismatch',x=>{x.provenance.b57Sha256='not-source';return rehash(x)}],
 ['B60 original 60 gap claimed solved',x=>{x.comparison.b42HistoricUpperDoorAccess.unverified=0;return rehash(x)}],
 ['B60 unverified physical state forged',x=>{x.BuildPlan.operations.push({command:'setblock'});return rehash(x)}],
])test(`reject ${name}`,()=>{let x=clone(b60);x=edit(x)||x;assert.throws(()=>make(x,guard,b57),/B61_/);});
for(const [name,edit] of [
 ['guard says construction approved',g=>g.constructionApproved=true],
 ['guard stale schema',g=>g.schema='new'],
 ['guard loses level',g=>g.sixLevels.pop()],
 ['guard contains build operation',g=>g.BuildPlan.operations=[{cmd:'build'}]],
 ['guard D012 hallway outside grid',g=>g.sixLevels[0].candidateDoorInterfaces.find(d=>d.id.endsWith('D012')).hallCell={x:888,z:888}],
 ['guard staircase authorized',g=>g.fiveStairLinks[0].installationAuthorized=true],
 ['guard starts non-corridor D012',g=>g.sixLevels[0].conceptualCorridorCells=g.sixLevels[0].conceptualCorridorCells.filter(p=>p.x!==17||p.z!==18)],
])test(`reject ${name}`,()=>{const g=clone(guard);edit(g);assert.throws(()=>make(b60,g,b57),/B61_/);});
for(const [name,edit] of [
 ['B57 fabricated parity',b=>b.productionFacadeParity='VERIFIED'],
 ['B57 fabricated physical quality',b=>b.physicalQuality='VERIFIED'],
 ['B57 floor rectangle altered',b=>b.buildings.find(x=>x.id==='apartment/candidate-01').preview.levels[0].floorRectangles[0].width=25],
])test(`reject ${name}`,()=>{let b=clone(b57);edit(b);b=rehash(b);assert.throws(()=>make(b60,guard,b),/B61_/);});
test('reject modified B61 result, including forged approval',()=>{const altered=clone(r);altered.moduleInterfaces.unapprovedCorridorExtension[0].approved=true;assert.throws(()=>verifyB61(altered,b60,guard,b57),/B61_/);});
test('reject rehashed B61 result with silent extra operations',()=>{let altered=clone(r);altered.BuildPlan.operations=[{x:1}];altered=rehash(altered);assert.throws(()=>verifyB61(altered,b60,guard,b57),/B61_/);});
