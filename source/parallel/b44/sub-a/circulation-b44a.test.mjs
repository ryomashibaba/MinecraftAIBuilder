import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB44ASubA,verifyB44ASubA,validateInputs,findDoorLink,buildWallDoorRoomCorrespondence} from './circulation-b44a.mjs';
import {readPinnedInputs,generate} from './run-offline-b44a.mjs';
const base=process.env.B44A_SOURCE_ROOT??path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const inputs=readPinnedInputs(base);
const build=()=>buildB44ASubA(inputs);
const k=p=>`${p.x},${p.z}`;
const has=(a,p)=>a.some(c=>k(c)===k(p));

test('pinned B43, B42, B17 and B21 inputs, no authority escalation',()=>{
 const b=validateInputs(inputs);assert.equal(b.interior.id,'apartment/candidate-01');
 assert.equal(inputs.b43.readiness,'NOT_PREPARED');assert.equal(inputs.b43.BuildPlan.operations.length,0);
 assert.equal(inputs.b43.blockers.length,9);
});
test('six floors, 78 distinct room-door reservations and 20 B43 upper wall conflicts',()=>{
 const r=build();const all=r.baseline.nominalGraph.doors;
 assert.equal(all.length,78);assert.equal(new Set(all.map(d=>d.id)).size,78);
 assert.equal(r.wallDoorRoomCorrespondence.length,5);
 assert.equal(r.wallDoorRoomCorrespondence.reduce((sum,x)=>sum+x.wallConflictCellCount,0),20);
 assert.equal(r.wallDoorRoomCorrespondence.reduce((sum,x)=>sum+x.wallCandidateOwnerCount,0),25);
});
test('overlap wall owners map to actual frozen wall-boundary room IDs and nearby door interface',()=>{
 const t=buildWallDoorRoomCorrespondence(inputs);
 const f=t[0];assert.equal(f.level,2);assert.equal(f.cells.length,4);
 const c=f.cells.find(x=>k(x.cell)==='15,19');
 assert.deepEqual(c.wallOwnerIds,['apartment/candidate-01/L2/W0049','apartment/candidate-01/L2/W0054']);
 assert.equal(c.roomFootprintsKnown,false);assert.equal(c.displacementTargetCell,null);
 assert(c.roomIds.length>=1);assert(c.nominalWallTypes.every(w=>w.kind));
});
test('B43 starting point isolates precisely L1/D012, verified physical doors remain unknown',()=>{
 const b=build().baseline;
 assert.equal(b.nominalGraph.nominalReachableDoorCount,77);
 assert.deepEqual(b.nominalGraph.nominalUnreachableDoorIds,['apartment/candidate-01/L1/D012']);
 const target=b.nominalGraph.doors.find(d=>d.id.endsWith('L1/D012'));
 assert.deepEqual(target.hallCell,{x:17,z:18});assert.equal(target.nominalHallReachable,false);
 assert.equal(target.playerPassageVerified,false);assert.equal(b.currentlyPhysicalAccessibleDoors,null);
});
test('two complete route families: conceptual 78/78, never construction-ready',()=>{
 const r=build();assert.equal(r.variants.length,2);
 for(const v of r.variants){assert.equal(v.metrics.routesEvaluated,6);assert.equal(v.graph.totalDoors,78);
  assert.equal(v.metrics.nominalDoorReachability,'78/78');assert.deepEqual(v.metrics.nominalUnreachableDoorIds,[]);
  assert.equal(v.preliminaryGeometryComplete,true);assert.equal(v.constructionApproved,false);
  assert.equal(v.physicalAccessVerified,false);assert.equal(v.disposition,'BLOCKED_RESEARCH_ONLY');}
 assert.equal(r.assessment.eligibleForAdoption,false);assert.equal(r.assessment.chosenVariant,null);
});
test('compact family counts L1/D012 plus upper floors without accidental wall clearance',()=>{
 const v=build().variants[0];
 assert.equal(v.l1DoorLink.steps,11);assert.equal(v.l1DoorLink.addedCorridorCount,6);
 assert.equal(v.l1DoorLink.wallConflictCellCount,4);assert.equal(v.metrics.totalWallConflictCells,24);
 assert.equal(v.metrics.totalNewCorridorCells,41);assert.equal(v.metrics.totalRouteSteps,56);
 assert.equal(v.metrics.uniqueNominalRoomIdsAffected.length,12);
 assert(v.upperRoutes.every(r=>r.wallConflictCellCount===4&&r.addedCorridorCount===7&&r.steps===9));
});
test('wall-clear family has 0 nominal overlapping wall cells but prohibitively long detour',()=>{
 const v=build().variants[1];assert.equal(v.metrics.totalRouteSteps,496);
 assert.equal(v.metrics.totalWallConflictCells,0);assert.equal(v.metrics.totalNewCorridorCells,30);
 assert.equal(v.metrics.actualPassableDoorCount,null);assert.equal(v.l1FootprintVerified,false);
 assert(v.upperRoutes.every(r=>r.steps===83));assert.equal(v.l1DoorLink.steps,81);
});
test('all proposed routes are four-neighbor connected, do not reuse B43 reserved (11,18)',()=>{
 for(const v of build().variants){for(const r of [v.l1DoorLink,...v.upperRoutes]){
  assert(r && !has(r.route,{x:11,z:18}));
  for(let i=1;i<r.route.length;i++)assert.equal(Math.abs(r.route[i].x-r.route[i-1].x)+Math.abs(r.route[i].z-r.route[i-1].z),1);
  assert.equal(r.route.length,r.steps+1);
  assert.equal(r.corridorWidth.actualClearWidthCells,null);
 }}
});
test('source L1 floor mask evidence is explicitly proxy/unknown; area and support never guessed',()=>{
 const r=build();assert.match(r.evidence.l1FootprintMaskSource,/PROXY/);
 for(const v of r.variants){assert.equal(v.l1DoorLink.l1MaskMatchesSourceFloor,null);
  for(const e of v.levelImpacts){assert.equal(e.verifiedCorridorWidthCells,null);
   assert.equal(e.roomAreaAfterCells,null);assert.equal(e.structuralSupportVerified,false);}
  assert.equal(v.metrics.actualRoomAreaDeltaCells,null);
 }
});
test('M4 all 9 BLOCKED, BuildPlan empty, zero engine/world operations',()=>{
 const r=build(),s=r.safety;
 assert.equal(s.readiness,'NOT_PREPARED');assert.equal(s.deployment,'BLOCKED');
 assert.deepEqual(s.m4GateStatuses,Array(9).fill('BLOCKED'));
 assert.equal(s.engineCalls,0);assert.equal(s.buildOperations,0);
 assert.deepEqual(s.BuildPlan,{status:'NOT_PREPARED',operations:[]});
 assert.deepEqual(s.materialIds,[]);assert.equal(s.worldCoordinates,null);
 assert.equal(s.bridgeContact,false);assert.equal(s.minecraftContact,false);
 assert.equal(s.frozenEvidenceModified,false);
});
test('stable offline JSON and digest; no mutation of source objects',()=>{
 const before=JSON.stringify(inputs);const r=build();const r2=build();
 assert.equal(JSON.stringify(r),JSON.stringify(r2));assert.equal(JSON.stringify(inputs),before);
 assert.equal(verifyB44ASubA(r,inputs),true);
 assert.equal(generate(base).reportSha256,r.reportSha256);
});
test('tampered B43 reachability, even with plausible nominal value, is rejected',()=>{
 const o=structuredClone(inputs);o.b43.graph.unreachableDoorIds=[];
 assert.throws(()=>buildB44ASubA(o),/B44A_B43_DIGEST/);
});
test('reject B42 engine or build operations even if reference design otherwise present',()=>{
 const o=structuredClone(inputs);o.b42.BuildPlan.operations.push({type:'UNSAFE'});
 assert.throws(()=>buildB44ASubA(o),/B44A_B42_DIGEST|B44A_SOURCE_OPERATIONS/);
});
test('fail closed when B17 door ID or B21 wall room mapping goes out of sync',()=>{
 let o=structuredClone(inputs);o.interior.buildings.find(b=>b.id==='apartment/candidate-01').floors[0].roomDoorInterfaces[11].id='BROKEN';
 assert.throws(()=>buildB44ASubA(o),/B44A_DOOR_SOURCE_DRIFT/);
 o=structuredClone(inputs);o.walls.buildings.find(b=>b.id==='apartment/candidate-01').floors[1].wallCandidates[0].floorId='BROKEN';
 assert.throws(()=>buildB44ASubA(o),/B44A_WALL_SOURCE/);
});
test('bounded D012 path rejects mask with missing entry, never treats unsupported floor as valid',()=>{
 const floor=inputs.interior.buildings.find(b=>b.id==='apartment/candidate-01').floors[0];
 const wallFloor=inputs.walls.buildings.find(b=>b.id==='apartment/candidate-01').floors[0];
 const rows=inputs.b42.transitions[0].floorMask.candidateFloorRows.slice();
 rows[18]=rows[18].slice(0,10)+'.'+rows[18].slice(11);
 assert.throws(()=>findDoorLink({floor,wallFloor,rows,entrance:{x:10,z:18},doorId:'apartment/candidate-01/L1/D012'}),/B44A_L1_TERMINALS/);
});
test('report payload tampering detected',()=>{
 const r=build();r.variants[0].metrics.nominalDoorReachability='FAKE';
 assert.throws(()=>verifyB44ASubA(r,inputs),/B44A_REVIEW_DIGEST/);
});
