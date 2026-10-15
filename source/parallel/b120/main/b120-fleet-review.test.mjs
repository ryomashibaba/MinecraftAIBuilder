import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB120} from './b120-fleet-review.mjs';
const file='b120-review-output/B120_Eight_U_Turn_3D_Review.json';
const r=JSON.parse(fs.readFileSync(file,'utf8'));
test('B119 pinned eight unresolved exits are all surveyed against 102 source flights',()=>{
 assert(validateB120(r));assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.conceptFloors,66);assert.equal(r.totals.sourceStairs,102);
 assert.equal(r.totals.b119OriginalHeldExits,9);
 assert.equal(r.totals.b119PreviouslyClearInterfaces,1);
 assert.equal(r.totals.b120TargetHeldInterfaces,8);
 assert.equal(r.cases.reduce((n,c)=>n+c.heldExits.length,0),8);
});
test('two riser splits four cardinal poses and Manhattan 3 displacement tested for each unique target',()=>{
 const targets=r.cases.reduce((n,c)=>n+new Set(c.heldExits.map(e=>e.stairIndex)).size,0);
 assert.equal(r.totals.distinctTargetStairs,targets);
 assert.equal(r.totals.examinedUShapePoses,targets*200);
 for(const c of r.cases)for(const e of c.heldExits){
  assert.equal(e.search.attempted,200);
  assert.equal(e.search.realWalkabilityCertified,false);
  assert.equal(e.search.constructionAuthorized,false);
 }
});
test('proxy concepts are explicitly not Bedrock construction or traversal certification',()=>{
 assert.equal(r.totals.actualMinecraftTraversalCertified,0);
 assert.equal(r.totals.approvedConstructionOperations,0);
 assert.equal(r.totals.buildingsModified,0);
 for(const c of r.cases)for(const e of c.heldExits){
  assert.equal(e.originalB119Held,true);
  assert.equal(e.physicalConstructionCertified,false);
  assert.equal(e.originalStairUnchanged,true);
  for(const p of e.search.shortlist){
   assert.equal(p.realMinecraftCollisionCertified,false);
   assert.equal(p.structuralStrengthCertified,false);
  }
 }
});
test('original nine HOLDs and nine construction gates remain blocked',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.executionAllowed,false);assert.equal(r.constructionApproved,false);
 assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);assert.equal(r.commandCount,0);
 assert.equal(r.gates.length,9);assert(r.gates.every(x=>x.status==='BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
});
test('CSV lists exactly eight blocked exits and report explicitly maintains nine original holds',()=>{
 const csv=fs.readFileSync('b120-review-output/B120_Eight_Held_Exit_Alternatives.csv','utf8');
 const md=fs.readFileSync('b120-review-output/B120_U_Turn_Review_JA.md','utf8');
 assert.equal(csv.trim().split('\n').length,9);
 assert(md.includes('元の9件は引き続きHOLD'));
 assert(md.includes('NOT_PREPARED'));
});
