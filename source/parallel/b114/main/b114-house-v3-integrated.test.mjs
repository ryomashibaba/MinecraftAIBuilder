import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('b114-review-output/B114_HOUSE_V3_Integrated_3D.json','utf8'));
test('HOUSE_V3 source-pinned geometry and single representative building',()=>{
 assert.equal(r.id,'HOUSE_V3');
 assert.equal(r.totals.floors,2);assert.equal(r.totals.rooms,3);
 assert.equal(r.totals.stairs,2);
 assert.equal(r.totals.originalConditionalStairLinks,2);
});
test('floor apertures, support and blocked galleries are counted, not declared installed',()=>{
 assert.equal(r.floorApertureProposals.length,2);
 assert.equal(r.totals.proposedUpperFloorOpenings,r.floorApertureProposals.reduce((n,a)=>n+a.count,0));
 assert(r.stairs.every(s=>s.appliedToOriginal===false&&s.minecraftCollisionVerified===false));
 assert.equal(r.designChangesApplied,false);
});
test('post-insertion paths do not overstate pre-insertion paths',()=>{
 assert(r.totals.postPlacementRoomsReached<=r.totals.originalOptimisticRooms);
 assert(r.totals.postPlacementStairLinks<=r.totals.originalConditionalStairLinks);
 assert(r.gallery.rooms.every(r=>r.realDoorAndBedUsageCertified===false));
});
test('no execution / no world contact / all 9 gates blocked',()=>{
 assert.equal(r.physicalTravelCertified,false);
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);
 assert(r.gates.every(g=>g.status==='BLOCKED'));
});