import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateSupportRails,designB114SupportRails} from './b114-stair-support-reprofile.mjs';
const dir='b114-review-output/';
const r=JSON.parse(fs.readFileSync(dir+'B114_15_Buildings_EdgeRail_Support_Study.json','utf8'));
const b114=JSON.parse(fs.readFileSync(dir+'B114_Conditional_Circulation_15_Buildings.json','utf8'));
const prior=JSON.parse(fs.readFileSync(dir+'B114_3D_Stack_Audit.json','utf8'));
test('source-pinned 15 buildings 102 flights and previous AABB collisions independently reproduce',()=>{
 assert(validateSupportRails(r));
 assert.equal(r.totals.buildings,15);assert.equal(r.totals.stairs,102);
 assert.equal(r.sourceB114Integrity,b114.integritySha256);
 assert.equal(r.totals.previousTotalInterferencePairs,prior.totals.modelledCrossFlightCollisionPairs);
 assert.equal(r.totals.unchangedTreadBodyPairs,prior.totals.modelledSolidBodyCollisionPairs);
 assert.equal(r.totals.previousFullColumnSupportBodyPairs,60);
});
test('narrow grounded edge support proposals actually reduce intersections without denying tread conflicts',()=>{
 assert(r.totals.proposedTotalInterferencePairs<r.totals.previousTotalInterferencePairs);
 assert(r.totals.proposedEdgeRailSupportBodyPairs<r.totals.previousFullColumnSupportBodyPairs);
 assert(r.totals.proposedTotalInterferencePairs>=r.totals.unchangedTreadBodyPairs);
 assert.equal(r.totals.interferencePairsRemoved,
  r.totals.previousTotalInterferencePairs-r.totals.proposedTotalInterferencePairs);
 assert.equal(r.totals.groundedDualRailFlightCandidates+
  r.totals.groundedSingleRailFlightCandidates,102);
 for(const c of r.cases){
  assert.equal(c.stairs.length,c.stairLinks);
  assert.equal(c.remainingPairs.length,c.newDistinctInterferencePairs);
  assert(c.newDistinctInterferencePairs<=c.originalDistinctInterferencePairs);
  assert(c.stairs.every(s=>s.floorContactAtSourceLevel&&s.undersideTreadFaceContact&&
   s.internallyContinuousFootings&&!s.selfSweptPlayerCollision&&
   s.proposedGroundedSupportPiers===s.railSides.length*5));
 }
});
test('proposals use source geometry, deterministic exact candidates, never physical approval',()=>{
 const twice=designB114SupportRails(b114,prior);
 assert.equal(twice.integritySha256,r.integritySha256);
 assert(r.cases.every(c=>c.exactSingleRailAssignmentsExamined===2**c.stairLinks));
 assert.equal(r.originalStairFootprintsUnchanged,true);
 assert.equal(r.originalFloorAndRoomsUnchanged,true);
 assert.equal(r.candidateAppliedToSource,false);
 assert.equal(r.structuralEngineeringApproved,false);
 assert.equal(r.actualPlayerTraversalCertified,false);
 assert.equal(r.totals.actualStairBuilds,0);assert.equal(r.totals.certifiedPhysicalSupport,0);
 assert.equal(r.worldContacts,0);assert.equal(r.executionAllowed,false);
 assert.equal(r.constructionApproved,false);assert.equal(r.readiness,'NOT_PREPARED');
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert(r.gates.every(x=>x.status==='BLOCKED'));
});
test('Japanese risk matrix references physical compatibility limits instead of construction steps',()=>{
 const csv=fs.readFileSync(dir+'B114_15_Buildings_EdgeRail_Risk_Changes.csv','utf8');
 const md=fs.readFileSync(dir+'B114_15_Buildings_EdgeRail_Review_JA.md','utf8');
 assert.equal(csv.trim().split('\n').length,16);
 assert(md.includes('未認証'));assert(md.includes('NOT_PREPARED'));
 assert(md.includes('0.25'));assert(md.includes('BuildPlan.operations=[]'));
});