import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB125} from './b125-fleet-fine-review.mjs';
const r=JSON.parse(fs.readFileSync('b125-review-output/B125_Fine_Step_Landing_Slab_Review.json','utf8'));
test('all 15 sources, 66 levels, 102 original stairs and pinned B124 input',()=>{
 assert.equal(validateB125(r),true);
 assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.sourceFloors,66);
 assert.equal(r.totals.sourceStairs,102);
 assert.match(r.sourceB124Integrity,/^[0-9a-f]{64}$/);
});
test('B124 concepts have exactly matched aperture footprint and fine samples',()=>{
 assert(r.totals.fineReviewedConcepts>=1);
 for(const c of r.cases)for(const x of c.reviews){
  assert(x.fineSampleCount>=10);
  assert(x.independentlyReplayedOpeningCells===x.originalB124OpeningCells);
  assert(x.cutCells.length===x.independentlyReplayedOpeningCells);
  assert(x.cutCellNeighborEvidence.length===x.cutCells.length);
  assert.equal(x.refinedSamples.length,x.samplesNearUpperSlab);
  assert(x.maxLocalStepRise<=.5+1e-7);
  assert.equal(x.localDescendingTransitions,0);
 }
});
test('fine geometric findings remain explicitly separate from physical certification',()=>{
 assert.equal(r.totals.realWalkabilityCertified,0);
 assert.equal(r.totals.actualSourceChanges,0);
 for(const c of r.cases)for(const x of c.reviews){
  assert.equal(x.physicalTraversalCertified,false);
  assert.equal(x.educationStairBlockStateOrientation,'UNVERIFIED');
  assert.equal(x.educationStepCollision,'UNVERIFIED');
  assert.equal(x.structuralBearingAndRetainedSlabLoad,'UNVERIFIED');
  assert.equal(x.constructionAllowed,false);
  if(x.findingCodes.length)assert.equal(x.status,'HOLD_FINE_LANDING_OR_APERTURE_REVIEW');
 }
});
test('NOT_PREPARED and the nine blocked original gates are never promoted',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.executionAllowed,false);assert.equal(r.constructionApproved,false);
 assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);
 assert(r.gates.every(x=>x.status==='BLOCKED'));
});
test('human and CSV proof includes all per-finding classifications',()=>{
 const csv=fs.readFileSync('b125-review-output/B125_Fine_Landing_Conflict_Cells.csv','utf8');
 const md=fs.readFileSync('b125-review-output/B125_Fine_Step_Landing_Review_JA.md','utf8');
 const count=r.cases.reduce((n,c)=>n+c.reviews.reduce((a,x)=>a+Math.max(1,x.findings.length),0),0);
 assert.equal(csv.trim().split('\n').length,count+1);
 assert(md.includes('元の9出口はすべてHOLD'));
 assert(md.includes('NOT_PREPARED'));
});
