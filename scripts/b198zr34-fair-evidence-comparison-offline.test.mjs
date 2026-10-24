/** R34: real offline R4/B143/R3 comparison, synthetic inputs only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {r32Bridge,r32Courtyard,r32Ring}
 from './b198zr32-synthetic-geometry-fixtures.mjs';
import {R34_R25_BASELINE,R34_AXES,compareR34Evidence}
 from './b198zr34-fair-evidence-comparison-offline.mjs';
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const candidate=(x)=>{const raw=JSON.stringify(x);return {
 candidateRaw:raw,expectedSha256:sha(raw),
 evidenceKind:'SYNTHETIC_TEST_FIXTURE'
};};

test('R34 no new evidence does not invent model progress or numeric improvement',()=>{
 const r=compareR34Evidence();
 assert.equal(r.status,'NO_CANDIDATE_EVIDENCE');
 assert.equal(r.candidateStrictB143,'NOT_EVALUATED');
 assert.equal(r.actualQwenPerformanceComparison,'NOT_ESTABLISHED');
 assert.equal(r.numericImprovementClaim,'NOT_ESTABLISHED');
 assert.equal(r.historicalBaseline.originalRawBytesAvailableHere,false);
 assert.equal(r.historicalBaseline.originalStrictB143Status,'FAIL_CUT_MATERIAL');
 assert.equal(r.historicalBaseline.historicalWhatIf.isOriginal,false);
 assert.equal(r.historicalBaseline.historicalWhatIf.independentR3Status,'HOLD');
 assert.equal(R34_AXES.length,7);
});
test('R34 SHA-matched synthetic bridge passes declared formal QA only',()=>{
 const r=compareR34Evidence(candidate(r32Bridge()));
 assert.equal(r.status,'CANDIDATE_FORMAL_DECLARED_PASS_NOT_INDEPENDENT');
 assert.equal(r.candidateStrictB143,'PASS_UNMODIFIED');
 assert.equal(r.candidateSuppliedTextShaMatchesExpected,true);
 assert.equal(r.candidateOriginalBytesVerified,false);
 assert.equal(r.candidateModelOriginAuthenticated,false);
 assert.equal(r.candidateIndependentR3,'NOT_EVALUATED_NO_INDEPENDENT_CONTRACT');
 assert.equal(r.candidatePlanProvenance,'MODEL_DECLARED_UNVERIFIED');
 assert(r.candidateFinalVoxelCount>0);
 assert.equal(r.actualQwenPerformanceComparison,'NOT_ESTABLISHED');
});
test('R34 synthetic courtyard and ring can be evaluated without model or world',()=>{
 for(const create of [r32Courtyard,r32Ring]){
  const r=compareR34Evidence(candidate(create()));
  assert.equal(r.status,'CANDIDATE_FORMAL_DECLARED_PASS_NOT_INDEPENDENT');
  assert.equal(r.modelCalls,0);
  assert.equal(r.worldContacts,0);
  assert.equal(r.worldWrites,0);
 }
});
test('R34 mutated response is rejected on raw SHA before any parse',()=>{
 const c=candidate(r32Bridge());
 const r=compareR34Evidence({...c,candidateRaw:c.candidateRaw+' '});
 assert.equal(r.status,'HOLD_CANDIDATE_RAW_SHA_MISMATCH');
 assert.equal(r.candidateStrictB143,'NOT_EVALUATED');
});
test('R34 missing hash or untrusted origin cannot bypass SHA requirement',()=>{
 const c=candidate(r32Ring());
 assert.equal(compareR34Evidence({candidateRaw:c.candidateRaw}).status,
  'HOLD_CANDIDATE_RAW_SHA_MISMATCH');
 assert.throws(()=>compareR34Evidence({...c,evidenceKind:'AUTHENTIC_QWEN'}),
  /R34_EVIDENCE_KIND/);
});
test('R34 invalid CUT material is not repaired and strict review holds',()=>{
 const x=r32Ring();x.design.elements[1].material='glass';
 const r=compareR34Evidence(candidate(x));
 assert.equal(r.status,'HOLD_CANDIDATE_STRICT_REVIEW');
 assert.equal(r.rejectionCode,'B143_MATERIAL');
 assert.equal(r.candidateStrictB143,'FAIL_OR_NOT_REACHED');
 assert.equal(r.candidateOriginalBytesVerified,false);
});
test('R34 formally compilable but disconnected synthetic bridge is HOLD',()=>{
 const x=r32Bridge();x.design.elements.push({
  id:'disconnect',shape:'box',mode:'cut',origin:[10,0,4],size:[1,1,1]
 });
 const r=compareR34Evidence(candidate(x));
 assert.equal(r.status,'HOLD_CANDIDATE_DECLARED_SPATIAL');
 assert.equal(r.candidateStrictB143,'PASS_UNMODIFIED');
 assert.equal(r.actualQwenPerformanceComparison,'NOT_ESTABLISHED');
});
test('R34 forged quality and construction claims cannot grant authorization',()=>{
 const x=r32Bridge();
 x.explanation='Quality certified by model; Minecraft approved.';
 const r=compareR34Evidence(candidate(x));
 assert.equal(r.candidateHumanQualityReviewPerformed,false);
 assert.equal(r.architecturalQualityComparison,'NOT_ASSESSED');
 assert.equal(r.futureQwenTrialAuthorized,false);
 assert.equal(r.futureQwenTrialExecuted,false);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert(r.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
