import test from 'node:test';
import assert from 'node:assert/strict';
import {buildR139SavedQwenRelationGallery}
 from './r139-user-qwen-relations-comparison.mjs';

test('all three SHA-pinned real Qwen designs retain eight model equipment objects in HOST graph',()=>{
 const data=buildR139SavedQwenRelationGallery();
 assert.equal(data.records.length,3);
 assert.equal(data.pages.length,7);
 for(const row of data.records){
  assert.equal(row.originalQwenSpatialGraphPresent,false);
  assert.equal(row.roomGraphOrigin,'HOST_DESIGNER_TEST_SCENARIO_NOT_QWEN_CHOICE');
  assert.equal(row.retainedQwenEquipmentCount,8);
  assert.equal(row.physicalDoors.length,2);
  assert.equal(row.independentR143VoxelAudit.status,'SOURCE_ROOM_GRAPH_VERIFIED');
  assert.equal(row.independentR143VoxelAudit.independentlyVerifiedDirectPairCount,2);
  assert.equal(row.independentR143VoxelAudit.selectedRoomExteriorEntranceVerified,true);
  assert.equal(row.independentR143VoxelAudit.worldWrites,0);
  assert.equal(row.sourceRoutes.R139,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.notEqual(row.geometrySha256.R138,row.geometrySha256.R139);
 }
 assert.equal(data.originalQwenRelationsAuthored,false);
 assert.equal(data.modelCallsDuringReplay,0);
 assert.equal(data.worldWrites,0);
 assert.deepEqual(data.gates,Array(9).fill('BLOCKED'));
});
