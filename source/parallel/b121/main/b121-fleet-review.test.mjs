import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB121} from './b121-fleet-review.mjs';
const r=JSON.parse(fs.readFileSync('b121-review-output/B121_Joint_Stair_Gallery_Design_Review.json','utf8'));
test('B121 source-pinned 15 buildings, 66 floors, 102 stairs and 8 held exits',()=>{
 assert(validateB121(r));
 assert.equal(r.totals.buildings,15);assert.equal(r.totals.conceptFloors,66);
 assert.equal(r.totals.sourceStairs,102);assert.equal(r.totals.b121TargetExits,8);
 assert.equal(r.totals.distinctTargetStairs,7);
});
test('each distinct target staircase explores 300 poses and has no source write',()=>{
 assert.equal(r.totals.attemptedJointPoses,7*300);
 for(const c of r.cases)for(const e of c.heldExits){
  assert.equal(e.jointDesign.attempted,300);
  assert.equal(e.jointDesign.designAndAllSourceGalleriesUnmodified,true);
  assert.equal(e.jointDesign.constructionAllowed,false);
  assert.equal(e.originalSourceCellsAndStairUnchanged,true);
  for(const idea of e.jointDesign.shortlisted){
   assert.equal(idea.immutableSourceGalleryChanged,false);
   assert.equal(idea.stagedNetworkReconnectedCertified,false);
   assert.equal(idea.hypotheticalEditsApplied,false);
   assert.equal(idea.physicalWalkabilityCertified,false);
  }
 }
});
test('no unrooted or single-floor path is labeled a candidate',()=>{
 for(const c of r.cases)for(const e of c.heldExits)
  for(const candidate of e.jointDesign.shortlisted){
   assert(candidate.paths.LOWER?.sourceRootedTwoWideCandidate);
   assert(candidate.paths.UPPER?.sourceRootedTwoWideCandidate);
  }
});
test('9 original HOLDs, NOT_PREPARED and all 9 blocked construction gates persist',()=>{
 assert.equal(r.totals.originalHeldExits,9);
 assert.equal(r.totals.inheritedB119OneConcept,1);
 assert.equal(r.totals.physicallyCertifiedExits,0);
 assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);assert.equal(r.commandCount,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);assert(r.gates.every(x=>x.status==='BLOCKED'));
});
test('8-row CSV and report explicitly distinguish conceptual staged-gallery reroute',()=>{
 const csv=fs.readFileSync('b121-review-output/B121_Eight_Exit_Change_Budget.csv','utf8');
 const md=fs.readFileSync('b121-review-output/B121_Joint_Stair_Gallery_Review_JA.md','utf8');
 assert.equal(csv.trim().split('\n').length,9);
 assert(md.includes('元の9件はすべてHOLD'));
 assert(md.includes('仮置きセル移動は仮説'));
 assert(md.includes('NOT_PREPARED'));
});
