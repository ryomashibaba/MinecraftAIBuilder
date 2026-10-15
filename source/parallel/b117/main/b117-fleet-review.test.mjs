import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB117Review} from './b117-fleet-review.mjs';
const r=JSON.parse(fs.readFileSync('b117-review-output/B117_15_Building_Slab_And_Gallery_Holds.json','utf8'));
test('15 buildings and all 102 stairs source-grounded',()=>{
 assert(validateB117Review(r));assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.conceptFloors,66);assert.equal(r.totals.sourceStairLinks,102);
 assert.equal(r.totals.upperLandingCellsRetained,204);
});
test('all nine original gallery hold locations are explained, not repaired',()=>{
 assert.equal(r.totals.originalUnresolvedGalleryInterfaces,9);
 assert.equal(r.cases.reduce((n,c)=>n+c.galleryHolds.length,0),9);
 for(const c of r.cases)for(const p of c.galleryHolds){
  assert.equal(p.status,'HOLD_DESIGN_REVIEW');
  assert.equal(p.proposedSourceCellChanges,0);
  assert.equal(p.physicalNavigationCertified,false);
 }
});
test('each flight retains landing slab and cannot certify physical stairs',()=>{
 for(const c of r.cases){
  assert.equal(c.originalFloorsAndRoomsUntouched,true);
  assert.equal(c.slabs.length,c.stairs);
  for(const s of c.slabs){
   assert.equal(s.upperLandingFloorRetained.length,2);
   assert.equal(s.doesNotApplyAnyFloorRemoval,true);
   assert.equal(s.realSlabSupportCertified,false);
   assert.equal(s.realMinecraftTraversalCertified,false);
  }
 }
});
test('all nine construction gates and no-world safety invariants unchanged',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.worldContacts,0);
 assert.equal(r.executionAllowed,false);assert.equal(r.constructionApproved,false);
 assert.equal(r.worldCoordinates,null);assert.equal(r.commandCount,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
});
test('Japanese review and 9-row CSV exist',()=>{
 const md=fs.readFileSync('b117-review-output/B117_102_Stairs_Review_JA.md','utf8');
 const csv=fs.readFileSync('b117-review-output/B117_Gallery_9_Holds.csv','utf8');
 assert(md.includes('Minecraftで歩行認証された階段'));
 assert(md.includes('NOT_PREPARED'));
 assert.equal(csv.trim().split('\n').length,10);
});
