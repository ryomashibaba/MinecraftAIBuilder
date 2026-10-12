import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runB78,compileB78,chooseCoreAndPaths,shortestPath,arbitrateSection} from './compile-b78.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const inputs={b65:get('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json'),b66:get('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json'),b77:get('parallel/b77/main/B77_VOXEL_CONFLICT_REPORT.json')};
const r=get('parallel/b78/main/B78_GLOBAL_GRID_REPORT.json');
const statuses=new Set(['STAGED_ROOM_SIDE_CANDIDATE','MERGED_CORNER_CANDIDATE','HOLD_PRODUCTION_SOLID','HOLD_NO_CONNECTED_ROOM_CORE','FACADE_DELEGATION_UNAPPROVED','DOOR_OPENING_RESERVED_NO_WALL','HOLD_NOMINAL_ROOM_CORE_OR_PATH','HOLD_DOOR_LOCAL_CLEARANCE','HOLD_RESERVED_OR_OUTSIDE_FLOOR','HOLD_MULTIPLE_ROOM_OWNERS','HOLD_CROSS_ROOM_SITE']);
const key=p=>`${p.x},${p.z}`;
test('B78 immutable report digest, all nine gates blocked, no construction operations',()=>{
 const {reportSha256,...body}=r;assert.equal(sha(body),reportSha256);assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.executionAllowed,false);assert.equal(r.constructionApproved,false);assert.equal(r.worldContacts,0);assert.equal(r.gates.length,9);assert.ok(r.gates.every(x=>x.status==='BLOCKED'));assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.BuildPlan.commandCount,0);assert.equal(r.BuildPlan.worldCoordinates,null);
});
test('frozen sources digest and cross-report provenance',()=>{
 for(const x of Object.values(inputs)){const {reportSha256,...body}=x;assert.equal(sha(body),reportSha256);}assert.equal(r.provenance.b65ReportSha256,inputs.b65.reportSha256);assert.equal(r.provenance.b66ReportSha256,inputs.b66.reportSha256);assert.equal(r.provenance.b77ReportSha256,inputs.b77.reportSha256);
});
test('all source 5704 boundaries, 314 doors, 25 stairs, 30 sections represented',()=>{
 assert.equal(r.totals.sections,30);assert.equal(r.totals.rooms,314);assert.equal(r.totals.nominalWalls,5704);assert.equal(r.totals.nominalDoors,314);assert.equal(r.totals.nominalStairLinks,25);assert.equal(r.totals.outOfMaskCorridorsHeld,18);
});
test('staged wall sites unique per section, safe from known production collisions',()=>{
 for(const s of r.sections){const ids=new Set();const staged=new Map(s.stagedCells.map(c=>[c.site,c]));assert.equal(staged.size,s.stagedCells.length);for(const c of s.stagedCells){assert.equal(c.emitAllowed,false);assert.ok(c.wallIds.length>0);assert.ok(!ids.has(c.site));ids.add(c.site);}
  for(const w of s.wallDecisions){assert.equal(w.emitAllowed,false);assert.ok(statuses.has(w.decision));if(w.decision==='STAGED_ROOM_SIDE_CANDIDATE'||w.decision==='MERGED_CORNER_CANDIDATE'){assert.equal(w.productionClear,true);assert.equal(staged.get(key(w.insideCell))?.owner,w.roomId);}}
 }
});
test('no assigned walls occupy preserved core, reserved room routes or door cells',()=>{
 for(const s of r.sections){const stage=new Set(s.stagedCells.map(c=>c.site));for(const room of s.rooms){if(room.nominalRouteAndCorePossible){assert.equal(room.reservedMinimumRoomCore.length,4);for(const c of room.reservedMinimumRoomCore)assert.ok(!stage.has(c));for(const route of room.reservedDoorToCorePaths)for(const c of route)assert.ok(!stage.has(c));}}
  for(const d of s.doorDecisions){assert.equal(d.emitAllowed,false);assert.equal(d.hinge,'UNDECIDED');assert.ok(!stage.has(key(d.roomCell)));assert.equal(d.hingeAlternatives.length,2);}
 }
});
test('all named corridors/stair/elevators untouched by staged wall sites',()=>{
 const sections=new Map(inputs.b66.sections.map(x=>[x.id,x]));for(const s of r.sections){const b=sections.get(s.id);const protectedSites=new Set([...b.conceptReservations.corridors,...b.conceptReservations.stairs,...b.conceptReservations.elevators].map(key));for(const c of s.stagedCells)assert.equal(protectedSites.has(c.site),false);}
});
test('all facade-adjacent original boundaries are delegated without edits',()=>{
 assert.equal(r.totals.facadeDelegatedEdges,706);for(const s of r.sections)for(const w of s.wallDecisions)if(w.neighborClass==='OUTSIDE_REFERENCE_FLOOR')assert.equal(w.decision,'FACADE_DELEGATION_UNAPPROVED');
});
test('B78 reserved door passages are not treated as ready-to-place physical doors',()=>{
 assert.equal(r.totals.nominalDoorPassageSitesStaged+r.totals.nominalDoorSitesHeld,314);assert.equal(r.totals.physicalDoorsEmitted,0);for(const s of r.sections)for(const d of s.doorDecisions){assert.equal(d.doorState,'NOT_FINAL');assert.equal(d.swingAndHallClearance,'NOT_VERIFIED');}
});
test('unconnected or blocked door room conservatively holds wall candidates',()=>{
 const s=r.sections.find(s=>s.rooms.some(v=>!v.nominalRouteAndCorePossible));assert.ok(s);const room=s.rooms.find(v=>!v.nominalRouteAndCorePossible);assert.equal(room.reservedCoreCells,0);assert.ok(s.wallDecisions.some(w=>w.roomId===room.roomId&&w.decision==='HOLD_NO_CONNECTED_ROOM_CORE'));
});
test('core and route algorithms deterministically avoid known solids',()=>{
 const rect={x:0,z:0,width:5,depth:5};const core=chooseCoreAndPaths(rect,[{x:0,z:2}],new Set(['2,2']));assert.ok(core);assert.equal(core.core.length,4);assert.ok(!core.reserved.includes('2,2'));
 const p=shortestPath(rect,{x:0,z:2},new Set(['4,4']),new Set(['1,2','2,2','3,2']));assert.ok(p);assert.ok(p.length>0);assert.equal(shortestPath(rect,{x:0,z:0},new Set(['4,4']),new Set(['0,0'])),null);
});
test('fail closed on hacked approval/gates and altered source digest',()=>{
 const modified=structuredClone(inputs);modified.b77.gates[0].status='PASS';assert.throws(()=>compileB78(modified),/B78_SAFETY/);
 const modified2=structuredClone(inputs);modified2.b65.sections[0].nominalWalls[0].roomId='hacked';assert.throws(()=>compileB78(modified2),/B78_TAMPER/);
});
test('reject source wall mismatched coordinates even in local arbitration',()=>{
 const s=inputs.b66.sections[0],s65=inputs.b65.sections[0],b=inputs.b77.buildings.find(x=>s.id.startsWith(x.id+'/'));const walls=b.walls.filter(x=>x.sectionId===s.id);const doors=b.doors.filter(x=>x.sectionId===s.id);const corrupt=structuredClone(walls);corrupt[0].localInsideCell.x+=1;assert.throws(()=>arbitrateSection(s,s65,corrupt,doors),/B78_WALL_LINK/);
});
test('deterministic reproduction from the pinned B77 report without running Minecraft',()=>{
 assert.deepEqual(runB78(),r);
});
