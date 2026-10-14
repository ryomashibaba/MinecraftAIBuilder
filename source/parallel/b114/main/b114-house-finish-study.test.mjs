import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='b114-review-output/';
const r=JSON.parse(fs.readFileSync(base+'B114_HOUSE_V3_Finish_Study.json','utf8'));
test('three complete distinct material directions cover every architectural role',()=>{
 assert.equal(r.styleCandidates.length,3);
 assert.equal(r.primaryStyle,'DAYLIGHT_CEDAR');
 assert.equal(new Set(r.styleCandidates.map(s=>s.id)).size,3);
 const roleNames=Object.keys(r.styleCandidates[0].roles);
 assert(roleNames.length>=12);
 for(const theme of r.styleCandidates){
  assert.deepEqual(Object.keys(theme.roles).sort(),roleNames.sort());
  assert(Object.values(theme.roles).every(p=>p.candidateBlockFamily.startsWith('minecraft:')&&
    p.educationBlockStateVerified===false&&p.placementReady===false));
 }
 assert.equal(r.assignmentCounts.unmappedRoles,0);
});
test('exact geometry-preserving single material classification for each design voxel',()=>{
 assert.equal(r.coordinateLedger.length,r.assignmentCounts.totalNonOverlappingCellAssignments);
 assert.equal(r.assignmentCounts.totalNonOverlappingCellAssignments,
  r.assignmentCounts.sourceSolidCells+r.assignmentCounts.architectureAddedCells);
 assert.equal(new Set(r.coordinateLedger.map(v=>v.x+','+v.y+','+v.z)).size,
  r.coordinateLedger.length);
 assert(r.coordinateLedger.every(v=>v.blockIdAssigned===false&&v.blockStates===null&&
  v.designOnly===true));
 assert.equal(r.assignmentCounts.blockedReservedDoorCells,0);
 assert.equal(r.assignmentCounts.sourceSourceCollisions,0);
 assert.equal(r.assignmentCounts.additionalArchitecturalCollisions,0);
});
test('all real fixture footprints tracked separately from B105 decorative placeholders',()=>{
 assert.equal(r.rooms.length,3);
 for(const room of r.rooms){
  assert.equal(room.offlineClear,true);
  assert.equal(room.sourceAnchorsPreserved,true);
  assert.equal(room.physicalRoomUsabilityCertified,false);
  assert.equal(room.door.airSpaceReserved,true);
  assert.equal(room.door.upperLowerStateMappingVerified,false);
  assert(room.fixtures.every(f=>f.interactSideCandidates>0&&
   f.candidateBlockFamilies.length>0&&f.actualBedOrStorageUseVerified===false));
  assert.equal(room.proxyDisagreementExpected,true);
 }
});
test('static preview SVGs include proposal warning and multiple themes',()=>{
 const facade=fs.readFileSync(base+'B114_HOUSE_V3_Facade_Material_Options.svg','utf8'),
  interior=fs.readFileSync(base+'B114_HOUSE_V3_Interior_Options.svg','utf8');
 for(const image of [facade,interior]){
  assert(image.startsWith('<svg '));assert(image.includes('NOT_PREPARED'));
  assert(image.includes('worldContacts=0'));
  assert(!/<script|<foreignObject|(?:xlink:)?href=|javascript:/i.test(image));
  assert(image.length>2000);
 }
 for(const name of ['Daylight Cedar','Nordic Stone','Brick Atelier'])assert(facade.includes(name));
});
test('fails closed: never export block placement or Minecraft authorization',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);assert.equal(r.commandCount,0);
 assert.equal(r.BuildPlan.commandCount,0);assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.materializedMinecraftBlocks,0);
 assert.equal(r.educationEditionVersionVerified,false);
 assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
});