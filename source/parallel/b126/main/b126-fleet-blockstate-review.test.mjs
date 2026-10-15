import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB126} from './b126-fleet-blockstate-review.mjs';
const r=JSON.parse(fs.readFileSync('b126-review-output/B126_Stair_Blockstate_Slab_Fit_Review.json','utf8'));
test('all fifteen buildings 66 floors and 102 stairs anchored to a B125 digest',()=>{
 assert.equal(validateB126(r),true);
 assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.sourceFloors,66);
 assert.equal(r.totals.sourceStairs,102);
 assert.match(r.sourceB125Integrity,/^[0-9a-f]{64}$/);
});
test('candidate block cells and protected conceptual slab cut budget reconcile',()=>{
 assert.equal(r.totals.conceptualConfigurationsReviewed,1);
 assert.equal(r.totals.conceptualUpperFloorCutCells,8);
 for(const c of r.cases)for(const v of c.reviews){
  assert.equal(v.analyzedPotentialStairCells,v.blocks.length);
  assert.equal(v.genericBedrockEvidence.educationVersionParity,'UNVERIFIED');
  assert(v.findings.every(f=>f.count>0&&f.samples.length<=12));
 }
});
test('strict blockstate domain never becomes an approved Education mapping',()=>{
 assert.equal(r.totals.actuallyVerifiedEducationStairOrientations,0);
 assert.equal(r.totals.realMovementCertified,0);
 assert.equal(r.totals.sourceBlockWrites,0);
 for(const c of r.cases)for(const v of c.reviews){
  assert.deepEqual(v.verifiedGenericBedrockStateDomain,[0,1,2,3]);
  assert.equal(v.stateMappingAuthorized,false);
  assert.equal(v.educationVersionBlockRegistryCertified,false);
  assert.equal(v.actualBlockFacingCertified,false);
  assert.equal(v.physicalPassageCertified,false);
  assert.equal(v.structuralSupportCertified,false);
  assert.equal(v.constructionAllowed,false);
  assert.deepEqual(v.operations,[]);
  assert.equal(v.worldCoordinates,null);
 }
});
test('all nine original HOLD gates and immutable BuildPlan are retained',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);
 assert.equal(r.gates.length,9);
 assert(r.gates.every(g=>g.status==='BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
});
test('non-executable candidate CSV and Japanese collision report match the digest',()=>{
 const csv=fs.readFileSync('b126-review-output/B126_NonExecutable_Stair_Block_Candidates.csv','utf8');
 const md=fs.readFileSync('b126-review-output/B126_Blockstate_Candidate_Review_JA.md','utf8');
 assert.equal(csv.trim().split('\n').length,1+r.totals.materialCandidateStairCells);
 assert(md.includes('Education実機で認証した向き|0'));
 assert(md.includes('HOLD 9件'));
 assert(md.includes('worldContacts=0'));
});
