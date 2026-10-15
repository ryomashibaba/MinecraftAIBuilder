import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB119} from './b119-fleet-whole-stair-review.mjs';
const r=JSON.parse(fs.readFileSync('b119-review-output/B119_Nine_Whole_Stair_3D_Review.json','utf8'));
test('all 15 buildings and nine previously held exits remain accounted for',()=>{
 assert(validateB119(r));assert.equal(r.cases.length,15);
 assert.equal(r.totals.sourceStairs,102);assert.equal(r.totals.conceptFloors,66);
 assert.equal(r.totals.originalHeldExits,9);
 assert.equal(r.cases.reduce((n,c)=>n+c.heldExits.length,0),9);
});
test('all explored designs remain unbuilt and physically uncertified',()=>{
 for(const c of r.cases){
  assert.equal(c.allProtectedRoomsAndFloorsUnchanged,true);
  for(const x of c.heldExits){
   assert.equal(x.originalHeldUnchanged,true);assert.equal(x.physicallyCertified,false);
   assert.equal(x.search.sourceStairsNotMoved,true);
   assert.equal(x.search.constructionAllowed,false);
   assert(x.search.attempts>=1);
  }
 }
 assert.equal(r.totals.sourceStairsRelocated,0);
 assert.equal(r.totals.physicallyCertifiedStairs,0);
});
test('nine HOLD classifications reconcile with feasibility hypothesis counts',()=>{
 assert.equal(r.totals.sourceLocked3DCandidateInterfaces+
  r.totals.interfacesWithoutWholeStairProxySolution,9);
 const s=r.cases.flatMap(c=>c.heldExits);
 assert.equal(s.filter(x=>x.search.conservativeModelClear>0).length,
  r.totals.sourceLocked3DCandidateInterfaces);
});
test('Japanese report and CSV contain every held exit',()=>{
 const csv=fs.readFileSync('b119-review-output/B119_Nine_Exit_3D_Holds.csv','utf8');
 const md=fs.readFileSync('b119-review-output/B119_Whole_Stair_3D_Review_JA.md','utf8');
 assert.equal(csv.trim().split('\n').length,10);
 assert(md.includes('HOLDは一切解除していません'));
 assert(md.includes('NOT_PREPARED'));
});
test('all construction gates remain blocked and operational payload absent',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);assert.equal(r.commandCount,0);
 assert.equal(r.BuildPlan.status,'NOT_PREPARED');assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
});
