/** R30 synthetic static QA. NO inference or world operations. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {R11_COMPACT_GUIDE,R11_GUIDE_SHA256}
 from '../source/ai/b198zr11-compact-r4-output.mjs';
import {R21_FUTURE_GUIDE,R21_FUTURE_GUIDE_SHA256}
 from '../source/ai/b198zr21-future-architecture-guide.mjs';
import {R28_SPACE_FIRST_GUIDE,R28_SPACE_FIRST_GUIDE_SHA256}
 from '../source/ai/b198zr28-space-first-future-guide.mjs';
import {R27_OBSERVED_FACTS} from '../source/ai/b198zr29-evidence-coverage-audit.mjs';
import {
 R30_GUIDANCE_CLAUSES,R30_ADDITIONAL_GUIDE,
 R30_GENERALIZED_GUIDE,R30_GUIDE_SHA256,R30_ADDITIONAL_SHA256,
 R30_GUIDE_UTF8_BYTES,R30_GUIDE_CHARACTERS,
 R30_PARENT_R21_SHA256,R30_FROZEN_R28_SHA256,
 R30_FAILURE_TO_CLAUSE,inspectR30Guide
} from '../source/ai/b198zr30-generalized-space-guide.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
test('R30 independently composes from R21; R11/R21/R28 remain hash-identical',()=>{
 assert.equal(sha(R11_COMPACT_GUIDE),R11_GUIDE_SHA256);
 assert.equal(sha(R21_FUTURE_GUIDE),R21_FUTURE_GUIDE_SHA256);
 assert.equal(sha(R28_SPACE_FIRST_GUIDE),R28_SPACE_FIRST_GUIDE_SHA256);
 assert.equal(R30_PARENT_R21_SHA256,R21_FUTURE_GUIDE_SHA256);
 assert.equal(R30_FROZEN_R28_SHA256,R28_SPACE_FIRST_GUIDE_SHA256);
 assert.equal(R30_GENERALIZED_GUIDE,R21_FUTURE_GUIDE+'\n'+R30_ADDITIONAL_GUIDE);
 assert.equal(sha(R30_GENERALIZED_GUIDE),R30_GUIDE_SHA256);
 assert.equal(sha(R30_ADDITIONAL_GUIDE),R30_ADDITIONAL_SHA256);
 assert.equal(R30_GUIDANCE_CLAUSES.join('\n'),R30_ADDITIONAL_GUIDE);
});
test('R30 handles every known R27 failure without guessing floorplan or construction',()=>{
 assert.equal(R30_FAILURE_TO_CLAUSE.length,R27_OBSERVED_FACTS.length);
 assert.deepEqual(
  R30_FAILURE_TO_CLAUSE.map(x=>x.failure).sort(),
  R27_OBSERVED_FACTS.map(x=>x.id).sort());
 for(const {failure,clause} of R30_FAILURE_TO_CLAUSE){
  assert(Number.isSafeInteger(clause)&&clause>=0&&clause<R30_GUIDANCE_CLAUSES.length,failure);
 }
 for(const text of [
  'ADD primitive as solid','a later CUT','functionalZone',
  'headroom (2 or 3 air cells)','entrance must have y>=1',
  'Every doorway/opening must intersect','ONE or MANY routes',
  'Every declared destination','minimumReachablePositions',
  'minimumReachablePercent','each CUT omits the material property',
  'independent R3 route/functional contract'
 ])assert(R30_ADDITIONAL_GUIDE.includes(text),text);
});
test('R30 removes R28 historical coordinate example and allows route networks',()=>{
 for(const bad of ['z=44','z=45','[23,0,44]',
  'Design ONE continuous abstract route'])
  assert(!R30_GENERALIZED_GUIDE.includes(bad),bad);
 assert(R30_ADDITIONAL_GUIDE.includes('loops, bridges or branches'));
 assert(R30_ADDITIONAL_GUIDE.includes('No template replacement'));
 assert(!R30_ADDITIONAL_GUIDE.includes('place a library at'));
});
test('R30 has bounded byte length but does not claim a tokenizer measurement',()=>{
 const a=inspectR30Guide();
 assert.equal(R30_GUIDE_UTF8_BYTES,Buffer.byteLength(R30_GENERALIZED_GUIDE));
 assert.equal(R30_GUIDE_CHARACTERS,R30_GENERALIZED_GUIDE.length);
 assert.equal(a.guideUtf8Bytes,R30_GUIDE_UTF8_BYTES);
 assert.equal(a.trueTokenizerCountMeasured,false);
 assert.equal(a.oneShotModelContextFitVerified,false);
 assert(R30_GUIDE_UTF8_BYTES<=a.byteBudgetAdvisory);
 assert.equal(a.status,'STATIC_PROMPT_AUDIT_PASS_NOT_QUALITY_PROOF');
});
test('R30 candidate stays disabled with original R25 HOLD and nine blocked gates',()=>{
 const r=inspectR30Guide();
 assert.equal(r.activation,'NOT_ENABLED');
 assert.equal(r.originalR25Quality,'HOLD');
 assert.equal(r.promptChangesActivated,false);
 assert.equal(r.claimsLiveModelImprovement,false);
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
