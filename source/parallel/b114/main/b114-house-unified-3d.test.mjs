import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateHouseUnified3D} from './b114-house-unified-3d.mjs';
const r=JSON.parse(fs.readFileSync('b114-review-output/B114_HOUSE_V3_Unified_3D_Proposal.json','utf8'));
test('HOUSE_V3 floor+stairs+support+shell manifests retain provenance',()=>{
 assert(validateHouseUnified3D(r));
 assert.equal(r.floorLevels.length,2);
 assert.equal(r.totals.stairFlights,2);
 assert.equal(r.totals.conceptRooms,3);
 assert.equal(r.totals.carvedUpperSlabCells,16);
 assert.equal(r.totals.stairHalfBlockShapes,20);
 assert.equal(r.totals.provisionalFloorSlabCells,r.floorLevels.reduce((n,f)=>n+f.floorCellsRetained,0));
});
test('independent two-wide route audit retains failures as failures',()=>{
 const routes=r.corridors;
 assert.equal(routes.rooms.length,3);
 assert(routes.floorStats.every(x=>x.continuousTwoWideSquares>=x.reachableTwoWideSquares));
 assert.equal(r.totals.independentlyVerifiedTwoWideRoomPaths,
  routes.rooms.filter(x=>x.routeAndInteriorClear).length);
 assert.equal(r.totals.twoWideUnreachableTargets,r.corridors.unreachableTargets.length);
 assert(r.totals.independentlyVerifiedTwoWideRoomPaths<=r.totals.original3DRoomPaths);
});
test('voxel-level checks account for actual proposed solid intersections',()=>{
 assert.equal(r.totals.solidVoxelRoleConflicts,r.collisions.voxelRoleConflicts.length);
 assert.equal(r.totals.stepOverlapsWithRemainingFloors,r.collisions.stepFloorConflicts.length);
 assert.equal(r.totals.stairStepsAgainstSourceArchitecture,r.collisions.stepSourceConflicts.length);
 assert(r.candidateSolids.every(x=>x.types.length>0&&x.owners.length>0));
 assert(r.stairHalfStepAABBs.every(b=>b.halfHeightStairProxy===true));
});
test('no material certification, no world data, and nine gates blocked',()=>{
 assert.equal(r.realMovementCertified,false);
 assert.equal(r.minecraftBlockStatesVerified,false);
 assert.equal(r.proposalAppliedToSource,false);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert(r.gates.every(x=>x.status==='BLOCKED'));
 assert.equal(r.totals.physicalWalkableStairsCertified,0);
});
test('approval forgery is rejected even when checksum is not changed',()=>{
 const x=structuredClone(r);x.constructionApproved=true;
 assert.equal(validateHouseUnified3D(x),false);
 const y=structuredClone(r);y.BuildPlan.operations=[{fake:true}];
 assert.equal(validateHouseUnified3D(y),false);
});