import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB121} from './b121-fleet-review.mjs';
const r=JSON.parse(fs.readFileSync('b121-review-output/B121_Eight_Joint_Gallery_Review.json','utf8'));
test('all 15 buildings and 8 held stair exits reconcile with B120 source',()=>{
 assert(validateB121(r));assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.conceptFloors,66);assert.equal(r.totals.sourceStairs,102);
 assert.equal(r.totals.originalNineHolds,9);assert.equal(r.totals.targetedHeldExits,8);
 assert.equal(r.totals.uniqueStairs,7);
});
test('7 unique U-turn stair shapes each screen 200 poses with corridors',()=>{
 assert.equal(r.totals.exploredJointConfigurations,1400);
 for(const c of r.cases)for(const e of c.heldExits){
  assert.equal(e.jointGallerySearch.tested,200);
  assert.equal(e.originalB119NineHoldsRemain,true);
  assert.equal(e.physicalReconstructionCertified,false);
 }
});
test('counterfactual redesign never retires existing source gallery or changes rooms',()=>{
 assert.equal(r.totals.sourceGalleryCellsRemoved,0);
 assert.equal(r.totals.sourceBuildingsChanged,0);
 for(const c of r.cases){
  assert.equal(c.sourceGalleryAndRoomsUnchanged,true);
  for(const e of c.heldExits){
   const s=e.jointGallerySearch;
   assert.equal(s.originalStairsUntouched,true);
   assert.equal(s.allProtectedSourceGalleryRetained,true);
   assert.equal(s.allOriginalNineHoldsRemain,true);
   for(const proposed of s.shortlist){
    assert(proposed.b114UnbuiltGalleryCellsToRetire.length>0);
    assert.equal(proposed.sourceGalleryCellsRetired,0);
    assert.equal(proposed.originalNineHoldsReleased,0);
    assert.equal(proposed.actualConstructionAllowed,false);
    assert(proposed.galleryChoices.LOWER.validated>0);
    assert(proposed.galleryChoices.UPPER.validated>0);
   }
  }
 }
});
test('preserves all nine construction HOLD gates and no world access',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.worldCoordinates,null);
 assert.equal(r.worldContacts,0);assert.equal(r.commandCount,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);
 assert(r.gates.every(x=>x.status==='BLOCKED'));
});
test('Japanese review and CSV always include all eight held exits',()=>{
 const md=fs.readFileSync('b121-review-output/B121_Joint_Stair_Gallery_Review_JA.md','utf8');
 const csv=fs.readFileSync('b121-review-output/B121_Eight_Exit_Shortlist.csv','utf8');
 assert(md.includes('元のHOLD維持'));
 assert(md.includes('NOT_PREPARED'));
 assert.equal(csv.trim().split('\n').length,9);
});
