import test from 'node:test';
import assert from 'node:assert/strict';
import {R28_ADDITIONAL_GUIDE} from '../source/ai/b198zr28-space-first-future-guide.mjs';
import {auditR29SpaceFirstGuide,R27_OBSERVED_FACTS}
 from '../source/ai/b198zr29-evidence-coverage-audit.mjs';
test('R27 measured facts are all represented by R28 guidance',()=>{
 const a=auditR29SpaceFirstGuide();
 assert.equal(a.totalFactCount,10);
 assert.equal(a.coveredFactCount,10);
 assert.equal(a.status,'COVERAGE_STATIC_PASS_REVIEW_NOT_ACTIVATED');
 assert.equal(a.candidateUnmodified,true);
 assert.equal(R27_OBSERVED_FACTS.find(x=>x.id==='R27_SOLID_BASE_SHELL').metric,58080);
});
test('R29 detects missing instruction without changing frozen candidate',()=>{
 const guide=R28_ADDITIONAL_GUIDE.replace('each CUT MUST omit the material field entirely','CUT is fine');
 const a=auditR29SpaceFirstGuide({additionalGuide:guide});
 assert.equal(a.status,'HOLD_GUIDE_COVERAGE');
 assert(a.coveredFactCount<10);
 assert.equal(a.candidateUnmodified,false);
 assert(a.facts.some(x=>x.id==='R27_CUT_MATERIAL_5'&&!x.coveredByExactGuidePhrases));
});
test('R29 explicitly records coordinate anchoring and one-route overconstraint',()=>{
 const a=auditR29SpaceFirstGuide();
 for(const id of ['OVERFIT_LITERAL_DOOR_COORDINATES','OVERCONSTRAIN_SINGLE_ROUTE']){
  const g=a.guardrails.find(x=>x.id===id);
  assert.equal(g.judgment,'IMPROVE');
  assert.equal(g.present,true);
 }
});
test('R29 never activates Qwen, certifies a build, or authorizes world writes',()=>{
 const a=auditR29SpaceFirstGuide();
 assert.equal(a.modelCalls,0);
 assert.equal(a.worldContacts,0);
 assert.equal(a.worldWrites,0);
 assert.equal(a.historicalR25SourceStillHold,true);
 assert.equal(a.modelQualityImprovementProven,false);
 assert.equal(a.profileActivation,'NOT_ENABLED');
 assert.equal(a.safety.readiness,'NOT_PREPARED');
 assert(a.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(a.safety.BuildPlan.operations,[]);
});
