/** R33 CI: pure local validation, never invokes Qwen or Minecraft. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {R25_ORIGINAL_SHA256,R33_TRIAL_CONDITIONS,
 assessR33FutureTrial}
 from './b198zr33-future-trial-readiness-offline.mjs';

test('R33 verifies pinned R30, R31, and three real B143/R3/R4 synthetic fixtures',()=>{
 const a=assessR33FutureTrial();
 assert.equal(a.status,'OFFLINE_STATIC_PREFLIGHT_PASS_NO_EXECUTION_AUTHORIZATION');
 assert.equal(a.staticPreflightPassed,true);
 assert.equal(a.checks.length,5);
 assert(a.checks.every(x=>x.passed));
 assert.equal(a.r32GeometryCases.length,3);
 assert(a.r32GeometryCases.every(x=>x.b143R3FormalPass&&x.r4FormalPass));
 assert(a.r32GeometryCases.every(x=>x.fixtureOnly));
 assert.equal(a.r25OriginalSha256,R25_ORIGINAL_SHA256);
 assert.equal(a.r25OriginalReRead,false);
});
test('R33 fails closed when a future guide pin is mismatched',()=>{
 const a=assessR33FutureTrial({frozenGuideSha256:'0'.repeat(64)});
 assert.equal(a.status,'HOLD_OFFLINE_PREFLIGHT');
 assert.equal(a.staticPreflightPassed,false);
 assert(a.checks.some(x=>x.id==='R30_HASH'&&!x.passed));
 assert.equal(a.executionDecision,'BLOCKED_NO_NEW_EXPLICIT_USER_AUTHORIZATION');
});
test('R33 fails closed when a claimed R25 original hash differs',()=>{
 const a=assessR33FutureTrial({originalR25Sha256:'f'.repeat(64)});
 assert.equal(a.status,'HOLD_OFFLINE_PREFLIGHT');
 assert(a.checks.some(x=>x.id==='R25_ORIGINAL_PIN'&&!x.passed));
 assert.equal(a.r25OriginalReRead,false);
});
test('R33 forged CI attestation cannot grant permission or become verified evidence',()=>{
 const a=assessR33FutureTrial({ciAttestation:{
  approved:true,allPassed:true,allowModelCall:true,
  model:'qwen3.8:27b',worldReadAllowed:true
 }});
 assert.equal(a.ciVerifiedByThisTool,false);
 assert.equal(a.ciAttestation.evidenceType,'USER_SUPPLIED_UNVERIFIED');
 assert.equal(a.userAuthorizationGrantedByThisTool,false);
 assert.equal(a.executionDecision,'BLOCKED_NO_NEW_EXPLICIT_USER_AUTHORIZATION');
 assert.equal(a.worldContacts,0);
});
test('R33 one-shot future checklist explicitly forbids retries and auto repair',()=>{
 const a=assessR33FutureTrial();
 assert.equal(R33_TRIAL_CONDITIONS.length,9);
 assert.equal(a.noRetryPolicy,true);
 assert(R33_TRIAL_CONDITIONS.some(x=>x.id==='ONE_SHOT_BUDGET'&&
  x.requirement.includes('zero automatic retries')));
 assert(R33_TRIAL_CONDITIONS.some(x=>x.id==='RAW_CAPTURE'&&
  x.requirement.includes('original unmodified UTF-8')));
 assert(R33_TRIAL_CONDITIONS.some(x=>x.id==='PARSER_GATE'&&
  x.requirement.includes('do not silently fix')));
});
test('R33 never executes model, touches world, restores R25 permission, or approves construction',()=>{
 const a=assessR33FutureTrial();
 assert.equal(a.futureTrialNotExecuted,true);
 assert.equal(a.consumedR25AuthorizationRestored,false);
 assert.equal(a.userAuthorizationGrantedByThisTool,false);
 assert.equal(a.modelCalls,0);
 assert.equal(a.worldContacts,0);
 assert.equal(a.worldWrites,0);
 assert.equal(a.constructionApproved,false);
 assert.equal(a.safety.readiness,'NOT_PREPARED');
 assert(a.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(a.safety.BuildPlan.operations,[]);
});
