/** B111 fail-closed occupancy and prohibited construction verification. */
import assert from 'node:assert/strict';
import {assembleB111,validateB111Report} from '../source/parallel/b111/main/compile-b111.mjs';
const data=assembleB111(),r=data.report,t=r.totals;
assert(validateB111Report(r));
assert.equal(t.rooms,279);
assert.equal(t.originalFixtureAnchors,558);
assert.equal(t.roomsWithConnectedSingleCellWalkways+t.roomsRequiringRevision,279);
assert.equal(t.physicallyCompletedRooms,0);
assert.equal(t.verifiedBlockStatesEducation26_3,0);
assert.equal(t.worldContacts,0);
assert.equal(t.legacyUnapproved,296);
assert.equal(t.legacyHeld,18);
assert.equal(r.readiness,'NOT_PREPARED');
assert.equal(r.worldContacts,0);
assert.equal(r.worldCoordinates,null);
assert.equal(r.constructionApproved,false);
assert.equal(r.executionAllowed,false);
assert.equal(r.twoWideCorridorCertification,false);
assert.equal(r.humanInteriorReviewApproved,false);
assert.equal(r.BuildPlan.status,'NOT_PREPARED');
assert.deepEqual(r.BuildPlan.operations,[]);
assert.equal(r.BuildPlan.commandCount,0);
assert.equal(r.BuildPlan.worldCoordinates,null);
assert.equal(r.gates.length,9);
assert(r.gates.every(g=>g.status==='BLOCKED'));
assert.equal(data.models.length,15);
for(const m of data.models){
 assert.equal(m.worldContacts,0);
 assert.equal(m.worldCoordinates,null);
 assert.equal(m.constructionApproved,false);
 assert.deepEqual(m.BuildPlan.operations,[]);
 for(const room of m.rooms){
  assert.equal(room.physicalFurnitureInstalled,false);
  assert.equal(room.completedPhysicalRoom,false);
  assert.equal(room.versionPinnedBedrockCollisionTest,false);
 }
}
console.log('PASS B111: source-anchored room occupancy records safe; nine gates BLOCKED; NO physical build');
