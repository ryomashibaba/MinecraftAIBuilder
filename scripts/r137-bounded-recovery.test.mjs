import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverR137Furnished}
 from './r137-bounded-recovery.mjs';
import {readR137SavedRealQwenCapture}
 from './r137-user-capture-replay.mjs';
import {CASES,compileR136Report}
 from './r136-local-evidence.mjs';
import {makeR134FreshRequest}
 from './r134-fresh-model-pilot.mjs';
import {parseR135FreshFurnishedReply}
 from './r135-furnished-program.mjs';
const rows=()=>readR137SavedRealQwenCapture().cases;
test('bounded fallback cannot replace arbitrary unsafe roof strings or illegal room role',()=>{
 const input=rows()[0].raw,request=makeR134FreshRequest({brief:CASES[0].brief});
 const unsafe=JSON.parse(input);
 unsafe.materials.roof='command_block';
 assert.throws(()=>recoverR137Furnished({raw:JSON.stringify(unsafe),
  request,build:parseR135FreshFurnishedReply}),/R137_RECOVERY_ROOF_NOT_SAFELY_RECOVERABLE/);
 const outside=makeR134FreshRequest({brief:CASES[0].brief,siteDepth:22});
 assert.throws(()=>recoverR137Furnished({raw:input,
  request:outside,build:parseR135FreshFurnishedReply}),
  /R137_RECOVERY_SITE_OR_AXIS_UNRECOVERABLE/);
});
test('true three failed local model replies are not fake provider responses',()=>{
 const reports=CASES.map((x,i)=>({id:x.id,brief:x.brief,report:{
  status:'HOLD_MODEL_OUTPUT_OR_GEOMETRY',modelCalls:1,
  testInjectionPresent:false,modelAuthoredProgram:false,
  originalModelResponseCaptured:true,reason:'R134_MULTIZONE_PLAN_CONTRACT',
  sourceSha256:null,geometrySha256:null,worldWrites:0}}));
 const result=compileR136Report({model:'qwen3:14b',selection:{
  status:'MODEL_FOUND',selected:'qwen3:14b',
  tier:'LARGER_OR_UNKNOWN_NOT_SMALL_MODEL_PROOF'},
  runs:reports,source:'LOCAL_PROVIDER_NOT_AUTHENTICATED'});
 assert.equal(result.status,'HOLD_REAL_MODEL_GENERATION_OR_GEOMETRY');
 assert.equal(result.sourceOnlyValidCases,0);
 assert.equal(result.totalCases,3);
 assert.equal(result.worldWrites,0);
 const synthetic=compileR136Report({model:'qwen3:14b',selection:{
  status:'MODEL_FOUND',selected:'qwen3:14b',
  tier:'LARGER_OR_UNKNOWN_NOT_SMALL_MODEL_PROOF'},
  runs:reports.map(r=>({...r,report:{...r.report,testInjectionPresent:true}})),
  source:'TEST_DOUBLE'});
 assert.equal(synthetic.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
});
