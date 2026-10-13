import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('b114-review-output/B114_HOUSE_V3_Architectural_Overlay.json','utf8'));
test('architecture overlay is not source mutation or a building command',()=>{
 assert.equal(r.id,'HOUSE_V3');assert.equal(r.sourceB114Integrity.length,64);
 assert.equal(r.proposalAppliedToSource,false);assert.equal(r.buildingFinished,false);
 assert.equal(r.buildingConstructionReady,false);assert.equal(r.appearanceReadiness,'CONCEPTUAL_VISUAL_MASSING_ONLY');
 assert(r.addedElements.every(p=>p.placementAuthorized===false&&p.minecraftBlockId===null));
});
test('3 conceptual rooms have 2 protected door-air voxels each',()=>{
 assert.equal(r.protectedDoors.length,3);
 assert.equal(r.totals.protectedDoorAirCells,6);
 assert(r.protectedDoors.every(d=>d.airAtY.length===2&&d.physicalDoorPairCertified===false));
 const model=new Set(r.addedElements.map(p=>p.x+','+p.y+','+p.z));
 for(const d of r.protectedDoors)for(const y of d.airAtY)
  assert(!model.has(d.x+','+y+','+d.z));
});
test('add fourth level facade, full-height partitions and stepped roof intent',()=>{
 assert(r.totals.addedFacadeBandCells>0);
 assert(r.totals.proposedPartitionWallCells>0);
 assert(r.totals.upperPartitionSealingCells>0);
 assert(r.totals.proposedRoofTierBlocks>0);
 assert.equal(r.roofAesthetic.originalRoofStyle,'SIMPLE_STEPPED');
 assert(r.roofAesthetic.originalTopFlatCapCells>0);
 assert.equal(r.roofAesthetic.exteriorHumanApproved,false);
});
test('every architecture clash is counted explicitly and never silently resolved',()=>{
 assert.equal(r.totals.overlapsExistingSourceSolids,r.collisions.overlapsSource.length);
 assert.equal(r.totals.doorOpeningObstructions,r.collisions.blockedDoorCells.length);
 assert.equal(r.totals.stairHalfStepClashes,r.collisions.stairHalfStepOverlaps.length);
 assert.equal(r.totals.newWallBlockedGalleryCells,r.collisions.newWallBlocksGallery.length);
 assert.equal(r.totals.missingRoofCapCells,r.collisions.missingCaps.length);
 assert.equal(r.totals.roofCellsOutsideTopCap,r.collisions.roofOutsideCap.length);
});
test('review gate, zero world contact and no execution',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);assert.equal(r.commandCount,0);
 assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.BuildPlan.commandCount,0);
 assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
 assert.equal(r.physicallyUsableRoomsCertified,0);
});