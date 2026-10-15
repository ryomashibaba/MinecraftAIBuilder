import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB121} from './b121-fleet-review.mjs';
const r=JSON.parse(fs.readFileSync('b121-review-output/B121_Stair_Gallery_Joint_WhatIf_Review.json','utf8'));
test('source-pinned eight exit joint replan all 15 buildings and 102 stair links',()=>{
 assert(validateB121(r));
 assert.equal(r.totals.buildings,15);assert.equal(r.totals.sourceStairs,102);
 assert.equal(r.totals.b120UnresolvedExits,8);
 assert.equal(r.totals.distinctStairs,7);
 assert.equal(r.totals.posesReviewed,1400);
});
test('unbuilt tentative B114 gallery only, original B113/source walks protected',()=>{
 for(const c of r.cases)for(const e of c.exits){
  assert(e.originalHOLD);assert(e.noSourceGalleryChanges);assert(e.noActualStairRelocations);
  assert.equal(e.actualMinecraftWalkabilityCertified,false);
  assert(e.search.allNineOriginalHoldsRemain);
  assert.equal(e.search.BuildPlan.operations.length,0);
  assert(e.search.shortlist.every(x=>x.originalSourceGalleryUntouched&&
   x.protectedB113BaselineUntouched&&x.originalStagedGalleryStillHeld&&
   x.stageWideNetworkNeedsIndependentRevalidation));
 }
});
test('eight target interfaces remain HOLD even with local counterfactual ideas',()=>{
 assert.equal(r.totals.interfacesWithCounterfactualReplanIdeas+
  r.totals.interfacesStillWithoutJointPlan,8);
 assert.equal(r.totals.originallyHeldNineReleased,0);
 assert.equal(r.totals.physicallyCertifiedExits,0);
});
test('all construction gates remain BLOCKED and no Minecraft access is possible',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);assert.equal(r.worldCoordinates,null);
 assert.equal(r.worldContacts,0);assert.equal(r.commandCount,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
});
test('CSV and Japanese report accurately contain all eight unresolved interfaces',()=>{
 const csv=fs.readFileSync('b121-review-output/B121_Eight_Held_Exit_WhatIfs.csv','utf8');
 const md=fs.readFileSync('b121-review-output/B121_Integrated_Corridor_Redesign_JA.md','utf8');
 assert.equal(csv.trim().split('\n').length,9);
 assert(md.includes('施工・既存建物の保護'));assert(md.includes('NOT_PREPARED'));
});
