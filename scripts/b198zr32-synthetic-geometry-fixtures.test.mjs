/** R32 real B143/R3/R4 compilers with mock geometry only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {reviewR4PlannedProposal}
 from '../source/ai/b198zr4-planned-source.mjs';
import {evaluateFunctionalReviewContract,SCHEMA as REVIEW_SCHEMA}
 from '../source/ai/b198zr3-functional-review-contract.mjs';
import {R32_CASES,r32Bridge,r32Courtyard,r32Ring,
 auditR32SyntheticGeometry,reviewR32SyntheticFixture}
 from './b198zr32-synthetic-geometry-fixtures.mjs';

test('R32 3 distinct hand-authored genres formally pass actual B143/R3/R4',()=>{
 const a=auditR32SyntheticGeometry();
 assert.equal(a.scenarios.length,3);
 assert.equal(new Set(a.scenarios.map(x=>x.geometrySha256)).size,3);
 assert.equal(new Set(a.scenarios.map(x=>x.sourceSha256)).size,3);
 for(const r of a.scenarios){
  assert.equal(r.r3Status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS',r.id);
  assert.equal(r.r4Status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS',r.id);
  assert(r.finalConceptVoxels>0,r.id);
  assert(r.abstractReachablePositions>0,r.id);
  assert(r.destinationResults.every(x=>x.passed),r.id);
  assert(r.zoneResults.every(x=>x.passed),r.id);
  assert.equal(r.independentContractAuthorship,'TEST_FIXTURE');
  assert.equal(r.modelGenerated,false);
  assert.equal(r.qualityCertified,false);
 }
 assert.equal(a.doesNotProveQwenGeneralization,true);
});
test('R32 courtyard contains a true shell with accessible interior and protected void',()=>{
 const x=r32Courtyard(),c=compileDesign(x.design);
 assert(verifyCompiled(x.design,c));
 assert.equal(x.design.elements[1].shell,1);
 const r=reviewR4PlannedProposal(x);
 assert.equal(r.declaredPlanReview.results.protectedVoids[0].occupied,0);
 assert.equal(r.declaredPlanReview.results.functionalZones[0].passed,true);
});
test('R32 bridge disconnected by one CUT fails independent destination and zone',()=>{
 const x=r32Bridge();
 x.design.elements.push({id:'disconnect-bridge',shape:'box',mode:'cut',
  origin:[10,0,4],size:[1,1,1]});
 const r=reviewR4PlannedProposal(x);
 assert.equal(r.status,'HOLD_SPATIAL_PLAN_OR_INDEPENDENT_CONTRACT');
 assert.equal(r.declaredPlanReview.results.destinations[0].reachable,false);
 assert.equal(r.declaredPlanReview.results.functionalZones[0].reachable,0);
});
test('R32 zone refilled after valid construction fails final voxel functional test',()=>{
 const x=r32Bridge();
 x.design.elements.push({id:'refill-zone',shape:'box',mode:'add',
  material:'metal',origin:[14,1,12],size:[4,2,4]});
 const r=reviewR4PlannedProposal(x);
 assert.equal(r.status,'HOLD_SPATIAL_PLAN_OR_INDEPENDENT_CONTRACT');
 assert.equal(r.declaredPlanReview.results.functionalZones[0].standable,0);
});
test('R32 illegal CUT.material is rejected by strict B143 rather than repaired',()=>{
 const x=r32Ring();
 x.design.elements[1].material='glass';
 assert.throws(()=>compileDesign(x.design),/B143_MATERIAL/);
});
test('R32 entrance at y=0 is not standable even when nearby floor exists',()=>{
 const x=r32Courtyard();x.spatialPlan.entrance=[7,0,2];
 assert.throws(()=>reviewR4PlannedProposal(x),/ENTRANCE_NOT_STANDABLE/);
});
test('R32 stale independent source SHA fails instead of being silently repinned',()=>{
 const x=r32Ring();
 const compiled=compileDesign(x.design);
 const contract={
  schema:REVIEW_SCHEMA,caseId:'r32-stale-review',
  authorship:'TEST_FIXTURE',sourceSha256:'0'.repeat(64),
  entrance:x.spatialPlan.entrance,headroom:x.spatialPlan.headroom,
  protectedVoids:x.spatialPlan.protectedVoids,
  destinations:x.spatialPlan.destinations,
  functionalZones:x.spatialPlan.functionalZones
 };
 assert(verifyCompiled(x.design,compiled));
 assert.throws(()=>evaluateFunctionalReviewContract({
  design:x.design,compiled,contract}),/SOURCE_SHA_STALE/);
});
test('R32 fixture evaluator retains no-world and no-model boundaries',()=>{
 for(const {id,create} of R32_CASES){
  const r=reviewR32SyntheticFixture(create(),{caseId:'r32-'+id});
  assert.equal(r.modelCalls,0);
  assert.equal(r.worldContacts,0);
  assert.equal(r.worldWrites,0);
  assert.equal(r.safety.readiness,'NOT_PREPARED');
  assert(r.safety.gates.every(x=>x==='BLOCKED'));
  assert.deepEqual(r.safety.BuildPlan.operations,[]);
 }
});
