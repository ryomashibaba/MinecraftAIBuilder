import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {SCHEMA as R3_SCHEMA} from '../source/ai/b198zr3-functional-review-contract.mjs';
import {r32Bridge,r32Courtyard,r32Ring}
 from './b198zr32-synthetic-geometry-fixtures.mjs';
import {compareR35Independent}
 from './b198zr35-independent-contract-comparison-offline.mjs';
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
function fixture(create=r32Bridge){
 const p=create(),raw=JSON.stringify(p);
 const compiled=compileDesign(p.design);
 const contract={schema:R3_SCHEMA,caseId:'r35-independent-fixture',
  authorship:'TEST_FIXTURE',sourceSha256:compiled.sourceSha256,
  entrance:structuredClone(p.spatialPlan.entrance),
  headroom:p.spatialPlan.headroom,
  protectedVoids:structuredClone(p.spatialPlan.protectedVoids),
  destinations:structuredClone(p.spatialPlan.destinations),
  functionalZones:structuredClone(p.spatialPlan.functionalZones)};
 return {candidateRaw:raw,expectedSha256:sha(raw),
  evidenceKind:'SYNTHETIC_TEST_FIXTURE',independentContract:contract};
}
test('R35 independent contract is mandatory even when declared R3 passes',()=>{
 const x=fixture();
 const r=compareR35Independent({...x,independentContract:null});
 assert.equal(r.status,'NO_INDEPENDENT_CONTRACT');
 assert.equal(r.candidateIndependentR3,'NOT_EVALUATED_MISSING_CONTRACT');
 assert.equal(r.actualQwenPerformanceImprovement,'NOT_ESTABLISHED');
});
test('R35 three synthetic geometries pass real independent R3 only with exact source pin',()=>{
 for(const create of [r32Bridge,r32Courtyard,r32Ring]){
  const r=compareR35Independent(fixture(create));
  assert.equal(r.status,'INDEPENDENT_FORMAL_PASS_PROVENANCE_UNVERIFIED');
  assert.equal(r.candidateIndependentR3,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
  assert.equal(r.independentAuthorshipAuthenticated,false);
  assert.equal(r.humanArchitecturalQualityApproved,false);
  assert(r.independentResults.abstractReachablePositions>0);
 }
});
test('R35 stale independent source SHA is HOLD, never auto repinned',()=>{
 const x=fixture();
 x.independentContract.sourceSha256='0'.repeat(64);
 const r=compareR35Independent(x);
 assert.equal(r.status,'HOLD_INDEPENDENT_SOURCE_SHA_STALE');
 assert.equal(r.contractAutoRepinned,false);
 assert.equal(r.contractSourceSha256,'0'.repeat(64));
});
test('R35 independent contract may reject a model-declared formally passing route',()=>{
 const x=fixture();
 x.independentContract.destinations[0].maximumPathSteps=1;
 const r=compareR35Independent(x);
 assert.equal(r.status,'HOLD_INDEPENDENT_FUNCTIONAL_CONTRACT');
 assert.equal(r.candidateDeclaredR3,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(r.independentResults.destinations[0].passed,false);
});
test('R35 independent functional zone can fail while model declared zone passes',()=>{
 const x=fixture();
 x.independentContract.functionalZones[0].origin=[0,1,0];
 x.independentContract.functionalZones[0].size=[4,1,4];
 const r=compareR35Independent(x);
 assert.equal(r.status,'HOLD_INDEPENDENT_FUNCTIONAL_CONTRACT');
 assert.equal(r.independentResults.functionalZones[0].passed,false);
});
test('R35 rejects model-declared contract masquerading as independent',()=>{
 const x=fixture();
 x.independentContract.authorship='MODEL_DECLARED_UNVERIFIED';
 const r=compareR35Independent(x);
 assert.equal(r.status,'HOLD_UNTRUSTED_CONTRACT_AUTHORSHIP_OR_SCHEMA');
});
test('R35 invalid candidate SHA cannot reach independent evaluation',()=>{
 const x=fixture();
 x.expectedSha256='f'.repeat(64);
 const r=compareR35Independent(x);
 assert.equal(r.status,'HOLD_CANDIDATE_NOT_FORMALLY_ELIGIBLE');
 assert.equal(r.candidateIndependentR3,'NOT_EVALUATED');
});
test('R35 malformed independent contract does not throw or self-repair',()=>{
 const x=fixture();
 x.independentContract.entrance=[2,0,4];
 const r=compareR35Independent(x);
 assert.equal(r.status,'HOLD_INDEPENDENT_CONTRACT_REJECTED');
 assert.equal(r.rejectionCode,'B198ZR3_CONTRACT_ENTRANCE_NOT_STANDABLE');
 assert.equal(r.contractAutoRepaired,false);
});
test('R35 no model, world or approval under a formal synthetic PASS',()=>{
 const r=compareR35Independent(fixture());
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.modelOriginAuthenticated,false);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert(r.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
