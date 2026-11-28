import test from 'node:test';
import assert from 'node:assert/strict';
import {runR125ArchitecturePlanOwned,verifyOwnedArchitectureSample,
 hasExited}
 from './r125-local-architecture-plan-owned.mjs';
import {runR125ResourceCalibrationOwned,validateCalibrationRequest}
 from './r125-local-architecture-plan-owned.mjs';
import {createHash} from 'node:crypto';
import {runR125LocalArchitecturePlan} from './r125-local-architecture-plan-run.mjs';

test('the unowned ArchitecturePlan runner cannot POST through the shared default transport',async()=>{
 await assert.rejects(runR125LocalArchitecturePlan({
  model:'qwen3:14b',prompt:'entry.shelterDepth: 3',outDir:'unused'
 }),/OWNED_WINDOWS_ONE_SHOT_REQUIRED/);
});

test('ArchitecturePlan stays POST-free and stops its owned service without calibrated Qwen clearance',async()=>{
 const calls=[];
 const controller={servicePid:5001,supervisorPid:5000,monitorPid:4999,
  monitorId:'a'.repeat(32),port:11435,killOnCloseJob:true,
  async checkResourceSafety(){calls.push('sample');return {
   status:'HOLD',reason:'UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED',
   resourceSafetyCertified:false,independentMonitorActive:true,
   monitorHeartbeatEpochMs:Date.now(),monitorSequence:7,
   ownedServicePort:11435,ownedServicePid:5001,
   ownedServiceInKillOnCloseJob:true,supervisorPid:5000,
   monitorPid:4999,monitorId:'a'.repeat(32),sharedServiceIdle:null,
   measuredAtEpochMs:Date.now()};},
  async stop(reason){calls.push(reason);return {
   ownerStopConfirmed:true,monitorStopConfirmed:true};}};
 let runnerCalls=0,fetchCalls=0;
 const result=await runR125ArchitecturePlanOwned({
  model:'qwen3:14b',prompt:'entry.shelterDepth: 3 の公開建築',
  outDir:'unused',repairOnce:false
 },{controller,runner:async()=>{runnerCalls++;},
  fetcher:async()=>{fetchCalls++;}});
 assert.equal(result.status,'HOLD');
 assert.equal(result.reason,'UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED');
 assert.equal(result.modelPostCount,0);
 assert.equal(result.ownedServiceStopConfirmed,true);
 assert.equal(result.monitorStopConfirmed,true);
 assert.deepEqual(result.BuildPlan,{operations:[]});
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.equal(runnerCalls,0);
 assert.equal(fetchCalls,0);
 assert.deepEqual(calls,['sample','UNCALIBRATED_PRE_POST_HOLD']);
});

test('a fresh independent sensor sample remains HOLD without model peak calibration',()=>{
 const now=2_000_000;
 const result=verifyOwnedArchitectureSample({
  session:{nonce:'b'.repeat(32),monitorPid:8002},
  sample:{nonce:'b'.repeat(32),pid:8002,seq:3,state:'ALIVE',data:{
   ramFreeMiB:9000,commitHeadroomMiB:20000,gpuTotalMiB:16303,
   gpuFreeMiB:15000,sampleMs:now}},
  owner:{port:11435,servicePid:8003,supervisorPid:8001,killOnCloseJob:true},
  headSha:'c'.repeat(40),previousSequence:2,now});
 assert.equal(result.independentMonitorActive,true);
 assert.equal(result.ownedServiceInKillOnCloseJob,true);
 assert.equal(result.status,'HOLD');
 assert.equal(result.resourceSafetyCertified,false);
 assert.equal(result.reason,'QWEN_PEAK_CALIBRATION_REQUIRED');
});

const calibrationBody=()=>({model:'qwen3:14b',stream:false,temperature:0.55,
 response_format:{type:'json_object'},max_tokens:4096,messages:[
  {role:'system',content:'R125 RESOURCE CALIBRATION ONLY. Return a long JSON payload.'},
  {role:'user',content:'Calibration input padding with no semantic meaning.'}]});
const sensor=(sequence,alive=true)=>({status:'HOLD',independentMonitorActive:alive,
 ownedServicePort:11435,ownedServicePid:5001,ownedServiceInKillOnCloseJob:true,
 supervisorPid:5000,monitorPid:4999,monitorId:'a'.repeat(32),
 monitorHeartbeatEpochMs:Date.now(),monitorSequence:sequence,
 observedResourcesMiB:{ramFree:12000,commitHeadroom:20000,
  gpuFree:15000,gpuTotal:16303}});
const calibrationController=checkResourceSafety=>({servicePid:5001,
 supervisorPid:5000,monitorPid:4999,monitorId:'a'.repeat(32),port:11435,
 killOnCloseJob:true,configuredContextLength:16384,configuredParallelRequests:1,
 configuredMaxLoadedModels:1,configuredKeepAliveSeconds:0,cloudDisabled:true,
 configuredFlashAttention:false,configuredKvCacheType:'f16',
 configuredGpuOverheadBytes:0,configuredScheduleSpread:false,configuredMaxQueue:1,
 ollamaExecutableSha256:'d'.repeat(64),headSha:'c'.repeat(40),checkResourceSafety,
 async stop(reason){return {reason,ownerStopConfirmed:true,monitorStopConfirmed:true};}});
const calibrationPreflightFetcher=async(url,init={})=>{
 if(init.method==='POST')throw Error('TEST_MUST_NOT_POST');
 if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{
  name:'qwen3:14b',digest:'bdbd181c33f2ed1b31c972991882db3cf4d192569092138a7d29e973cd9debe8',
  size:9276198565,details:{quantization_level:'Q4_K_M',parameter_size:'14.8B'}}]})};
 return {ok:true,json:async()=>({models:[]})};
};

test('calibration preflight reports the failed GET endpoint and safe error class',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 const cases=[
  ['http://127.0.0.1:11435/api/tags',()=>({ok:false,status:503}),
   'PREFLIGHT_OWNED_TAGS_HTTP_503'],
  ['http://127.0.0.1:11435/api/ps',()=>{throw Error('connect',{cause:{code:'ECONNREFUSED'}});},
   'PREFLIGHT_OWNED_PS_CONNECTION_REFUSED'],
  ['http://127.0.0.1:11434/api/ps',()=>({ok:true,json:async()=>{throw SyntaxError('bad json');}}),
   'PREFLIGHT_SHARED_PS_INVALID_JSON'],
 ];
 for(const [failedUrl,failure,reason] of cases){
  let posts=0;
  const controller=calibrationController(async()=>sensor(1));
  const fetcher=async(url,init={})=>{
   if(init.method==='POST'){posts++;throw Error('TEST_MUST_NOT_POST');}
   if(url===failedUrl)return failure();
   return calibrationPreflightFetcher(url,init);
  };
  const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
   calibrationRequestSha256:sha},{controller,fetcher,approvalVerifier:async()=>true});
  assert.equal(result.status,'HOLD');assert.equal(result.reason,reason);
  assert.equal(result.modelPostCount,0);assert.equal(posts,0);
 }
});

test('calibration POST HTTP failure records status without response content or retry',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 let checks=0,posts=0,receipt=null;
 const controller=calibrationController(async()=>sensor(++checks));
 const result=await runR125ResourceCalibrationOwned({
  calibrationRequest:body,calibrationRequestSha256:sha,
  evidenceWriter:async report=>{receipt=structuredClone(report);}
 },{controller,fetcher:async(url,init={})=>{
  if(init.method==='POST'){
   posts++;
   return {ok:false,status:503,text:async()=>{throw Error('DO_NOT_READ_ERROR_BODY');}};
  }
  return calibrationPreflightFetcher(url,init);
 },approvalVerifier:async()=>true,pollMs:250,timeoutMs:5000});
 assert.equal(result.status,'HOLD');
 assert.equal(result.reason,'CALIBRATION_POST_HTTP_FAILED');
 assert.equal(result.calibrationHttpStatus,503);
 assert.equal(result.calibrationHttpErrorClass,'ERROR_BODY_UNAVAILABLE');
 assert.equal(result.modelPostCount,1);
 assert.equal(result.automaticRetries,0);
 assert.equal(posts,1);
 assert.equal(receipt?.calibrationHttpStatus,503);
 assert.equal(receipt?.reason,'CALIBRATION_POST_HTTP_FAILED');
 assert.equal(receipt?.worldWrites,0);
 assert.equal(result.ownedServiceStopConfirmed,true);
 assert.equal(result.monitorStopConfirmed,true);
});

test('a signalled child is confirmed exited only after Node records its signalCode',()=>{
 assert.equal(hasExited(null),false);
 assert.equal(hasExited({exitCode:null,signalCode:null}),false);
 assert.equal(hasExited({exitCode:null,signalCode:'SIGTERM'}),true);
 assert.equal(hasExited({exitCode:1,signalCode:null}),true);
});

test('calibration fails closed on context mismatch before any POST',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 assert.equal(validateCalibrationRequest({body,expectedSha256:sha}).valid,true);
 assert.equal(validateCalibrationRequest({body,expectedSha256:'f'.repeat(64)}).valid,false);
 const calls=[];
 const controller={servicePid:5001,supervisorPid:5000,monitorPid:4999,
  monitorId:'a'.repeat(32),port:11435,killOnCloseJob:true,
  configuredContextLength:2048,configuredParallelRequests:1,
  configuredMaxLoadedModels:1,configuredKeepAliveSeconds:0,cloudDisabled:true,
  configuredFlashAttention:false,configuredKvCacheType:'f16',
  configuredGpuOverheadBytes:0,configuredScheduleSpread:false,configuredMaxQueue:1,
  ollamaExecutableSha256:'d'.repeat(64),headSha:'c'.repeat(40),
  async checkResourceSafety(){return sensor(1);},
  async stop(reason){calls.push(reason);return {ownerStopConfirmed:true,monitorStopConfirmed:true};}};
 let posts=0;
 const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
  calibrationRequestSha256:sha},{controller,fetcher:async(url,init={})=>{
   if(init.method==='POST')posts++;
   return {ok:true,json:async()=>({models:[]})};
  },approvalVerifier:async()=>true});
 assert.equal(result.status,'HOLD');
 assert.equal(result.modelPostCount,0);
 assert.equal(posts,0);
 assert.equal(calls[0],'OWNED_CONTEXT_OR_CONTROLLER_MISMATCH');
});

test('a mismatched Qwen digest or competing model holds before calibration POST',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 const calls=[];
 const controller={servicePid:5001,supervisorPid:5000,monitorPid:4999,
  monitorId:'a'.repeat(32),port:11435,killOnCloseJob:true,
  configuredContextLength:16384,configuredParallelRequests:1,
  configuredMaxLoadedModels:1,configuredKeepAliveSeconds:0,cloudDisabled:true,
  configuredFlashAttention:false,configuredKvCacheType:'f16',
  configuredGpuOverheadBytes:0,configuredScheduleSpread:false,configuredMaxQueue:1,
  ollamaExecutableSha256:'d'.repeat(64),headSha:'c'.repeat(40),
  async checkResourceSafety(){return sensor(1);},
  async stop(reason){calls.push(reason);return {ownerStopConfirmed:true,monitorStopConfirmed:true};}};
 let posts=0,approved=0;
 const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
  calibrationRequestSha256:sha},{controller,fetcher:async(url,init={})=>{
   if(init.method==='POST')posts++;
   return {ok:true,json:async()=>({models:url.endsWith('/api/tags')?[{
    name:'qwen3:14b',digest:'e'.repeat(64),size:9276198565,
    details:{quantization_level:'Q4_K_M',parameter_size:'14.8B'}}]:[]})};
  },approvalVerifier:async()=>{approved++;return true;}});
 assert.equal(result.status,'HOLD');
 assert.equal(result.reason,'MODEL_DIGEST_OR_COMPETING_MODEL_HOLD');
 assert.equal(posts,0);
 assert.equal(approved,0);
 assert.ok(calls.includes('MODEL_DIGEST_OR_COMPETING_MODEL_HOLD'));
});

test('an independent monitor fault aborts the single calibration POST and closes its Job',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 const calls=[],requests=[];let samples=0,posts=0;
 const controller={servicePid:5001,supervisorPid:5000,monitorPid:4999,
  monitorId:'a'.repeat(32),port:11435,killOnCloseJob:true,
  configuredContextLength:16384,configuredParallelRequests:1,
  configuredMaxLoadedModels:1,configuredKeepAliveSeconds:0,cloudDisabled:true,
  configuredFlashAttention:false,configuredKvCacheType:'f16',
  configuredGpuOverheadBytes:0,configuredScheduleSpread:false,configuredMaxQueue:1,
  ollamaExecutableSha256:'d'.repeat(64),headSha:'c'.repeat(40),
  async checkResourceSafety(){samples++;return sensor(samples,samples<3);},
  async stop(reason){calls.push(reason);return {ownerStopConfirmed:true,monitorStopConfirmed:true};}};
 const fetcher=async(url,init={})=>{
  requests.push({url,method:init.method??'GET'});
  if(init.method==='POST'){
   posts++;
   return new Promise((resolve,reject)=>init.signal.addEventListener('abort',
    ()=>reject(Error('TEST_ABORT')),{once:true}));
  }
  if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{
   name:'qwen3:14b',digest:'bdbd181c33f2ed1b31c972991882db3cf4d192569092138a7d29e973cd9debe8',
   size:9276198565,details:{quantization_level:'Q4_K_M',parameter_size:'14.8B'}}]})};
  return {ok:true,json:async()=>({models:[]})};
 };
 const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
  calibrationRequestSha256:sha},{controller,fetcher,approvalVerifier:async()=>true,
   pollMs:250,timeoutMs:5000});
 assert.equal(result.status,'HOLD');
 assert.equal(result.modelPostCount,1);
 assert.equal(posts,1);
 assert.equal(result.automaticRetries,0);
 assert.ok(calls.includes('RESOURCE_OR_MONITOR_GUARD'));
 assert.ok(requests.some(x=>x.url==='http://127.0.0.1:11434/api/ps'&&x.method==='GET'));
 assert.ok(requests.every(x=>x.url!=='http://127.0.0.1:11434/api/generate'&&
  !(x.url==='http://127.0.0.1:11434/api/ps'&&x.method==='POST')));
 assert.equal(result.ownedServiceStopConfirmed,true);
 assert.equal(result.monitorStopConfirmed,true);
});

test('during-inference sequence waits are bounded and still HOLD on a monitor fault',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 let checks=0,posts=0;
 const controller=calibrationController(async({waitForNewSequence=false}={})=>{
  checks++;
  if(checks<=2)return sensor(checks);
  assert.equal(waitForNewSequence,true);
  if(checks<=4)return {...sensor(2),independentMonitorActive:false,
   reason:'MONITOR_SEQUENCE_NOT_ADVANCED'};
  return {...sensor(2,false),reason:'INDEPENDENT_MONITOR_SAMPLE_INVALID'};
 });
 const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
  calibrationRequestSha256:sha},{controller,fetcher:async(url,init={})=>{
   if(init.method==='POST'){
    posts++;
    return new Promise((resolve,reject)=>init.signal.addEventListener('abort',
     ()=>reject(Error('TEST_ABORT')),{once:true}));
   }
   return calibrationPreflightFetcher(url,init);
  },approvalVerifier:async()=>true,pollMs:250,timeoutMs:5000});
 assert.equal(result.reason,'RESOURCE_OR_MONITOR_GUARD');
 assert.equal(checks,5);
 assert.equal(posts,1);
 assert.equal(result.modelPostCount,1);
 assert.equal(result.automaticRetries,0);
 assert.equal(result.ownedServiceStopConfirmed,true);
 assert.equal(result.monitorStopConfirmed,true);
});

test('the second pre-POST check waits for a new sequence and never reuses the prior sample',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 let checks=0,posts=0,approvalCalls=0;
 const controller=calibrationController(async({waitForNewSequence=false}={})=>{
  checks++;
  if(checks===2){assert.equal(waitForNewSequence,true);return {...sensor(1),
   independentMonitorActive:false,reason:'MONITOR_SEQUENCE_NOT_ADVANCED'};}
  return sensor(checks===1?1:2);
 });
 const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
  calibrationRequestSha256:sha},{controller,fetcher:async(url,init={})=>{
   if(init.method==='POST'){posts++;throw Error('TEST_MUST_NOT_POST');}
   return calibrationPreflightFetcher(url,init);
  },approvalVerifier:async()=>{approvalCalls++;return false;}});
 assert.equal(result.reason,'INDIVIDUAL_CALIBRATION_APPROVAL_REQUIRED');
 assert.deepEqual(result.samples.map(x=>x.monitorSequence),[1,2]);
 assert.equal(checks,3);
 assert.equal(approvalCalls,1);
 assert.equal(posts,0);
 assert.equal(result.ownedServiceStopConfirmed,true);
 assert.equal(result.monitorStopConfirmed,true);
});

test('a missing new sample times out and sensor faults or resource shortages hold immediately',async t=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 await t.test('sequence does not advance',async()=>{
  let checks=0,posts=0;
  const controller=calibrationController(async({waitForNewSequence=false}={})=>{
   checks++;
   if(checks===1)return sensor(1);
   assert.equal(waitForNewSequence,true);
   return {...sensor(1),independentMonitorActive:false,reason:'MONITOR_SEQUENCE_NOT_ADVANCED'};
  });
  const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
   calibrationRequestSha256:sha},{controller,fetcher:async(url,init={})=>{
    if(init.method==='POST'){posts++;throw Error('TEST_MUST_NOT_POST');}
    return calibrationPreflightFetcher(url,init);
   },approvalVerifier:async()=>true});
  assert.equal(result.reason,'PRE_POST_MONITOR_SEQUENCE_TIMEOUT');
  assert.equal(checks>1,true);
  assert.equal(posts,0);
 });
 await t.test('sensor fault is not retried as a sequence wait',async()=>{
  let checks=0,posts=0;
  const controller=calibrationController(async()=>++checks===1?sensor(1):
   {...sensor(1,false),reason:'INDEPENDENT_MONITOR_SAMPLE_INVALID'});
  const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
   calibrationRequestSha256:sha},{controller,fetcher:async(url,init={})=>{
    if(init.method==='POST'){posts++;throw Error('TEST_MUST_NOT_POST');}
    return calibrationPreflightFetcher(url,init);
   },approvalVerifier:async()=>true});
  assert.equal(result.reason,'PRE_POST_MONITOR_SAMPLE_HOLD');
  assert.equal(checks,2);
  assert.equal(posts,0);
 });
 await t.test('fresh sample below the existing floor holds immediately',async()=>{
  let checks=0,posts=0;
  const controller=calibrationController(async()=>{
   checks++;
   if(checks===1)return sensor(1);
   return {...sensor(2),observedResourcesMiB:{ramFree:12000,
    commitHeadroom:20000,gpuFree:2500,gpuTotal:16303}};
  });
  const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
   calibrationRequestSha256:sha},{controller,fetcher:async(url,init={})=>{
    if(init.method==='POST'){posts++;throw Error('TEST_MUST_NOT_POST');}
    return calibrationPreflightFetcher(url,init);
   },approvalVerifier:async()=>true});
  assert.equal(result.reason,'PRE_POST_RESOURCE_FLOOR_HOLD');
  assert.equal(checks,2);
  assert.equal(posts,0);
 });
});

test('owned model-state GET failure is distinct from a monitor sample failure',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 let checks=0,ownedGets=0,posts=0;
 const controller=calibrationController(async()=>{checks++;return sensor(checks);});
 const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
  calibrationRequestSha256:sha},{controller,fetcher:async(url,init={})=>{
   if(init.method==='POST'){posts++;throw Error('TEST_MUST_NOT_POST');}
   if(url==='http://127.0.0.1:11435/api/ps'&&++ownedGets===2)
    throw Error('TEST_OWNED_GET_FAILED');
   return calibrationPreflightFetcher(url,init);
  },approvalVerifier:async()=>true});
 assert.equal(result.reason,'OWNED_MODEL_STATE_RECHECK_FAILED');
 assert.equal(checks,1);
 assert.equal(posts,0);
});

test('the calibration PASS shape requires observed context, full output cap, and confirmed Job unload',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 let sequence=0,posts=0,approval=null;
 const controller={servicePid:5001,supervisorPid:5000,monitorPid:4999,
  monitorId:'a'.repeat(32),port:11435,killOnCloseJob:true,
  configuredContextLength:16384,configuredParallelRequests:1,
  configuredMaxLoadedModels:1,configuredKeepAliveSeconds:0,cloudDisabled:true,
  configuredFlashAttention:false,configuredKvCacheType:'f16',
  configuredGpuOverheadBytes:0,configuredScheduleSpread:false,configuredMaxQueue:1,
  ollamaExecutableSha256:'d'.repeat(64),headSha:'c'.repeat(40),
  async checkResourceSafety(){return sensor(++sequence);},
  async stop(){return {ownerStopConfirmed:true,monitorStopConfirmed:true};}};
 const model={name:'qwen3:14b',digest:'bdbd181c33f2ed1b31c972991882db3cf4d192569092138a7d29e973cd9debe8',
  context_length:16384,size:9276198565,size_vram:11682688531};
 const fetcher=async(url,init={})=>{
  if(init.method==='POST'){
   posts++;
   return new Promise(resolve=>setTimeout(()=>resolve({
    ok:true,text:async()=>JSON.stringify({
     choices:[{finish_reason:'length',message:{content:'{"payload":"synthetic"}'}}],
     usage:{prompt_tokens:5507,completion_tokens:4096}
    })
   }),800));
  }
  if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{
   name:'qwen3:14b',digest:model.digest,size:9276198565,
   details:{quantization_level:'Q4_K_M',parameter_size:'14.8B'}}]})};
  if(url==='http://127.0.0.1:11435/api/ps'&&sequence>=3)
   return {ok:true,json:async()=>({models:[model]})};
  return {ok:true,json:async()=>({models:[]})};
 };
 const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
  calibrationRequestSha256:sha},{controller,fetcher,approvalVerifier:async value=>{
   approval=value;return true;},pollMs:250,timeoutMs:5000});
 assert.equal(result.status,'CALIBRATION_PASS');
 assert.equal(result.modelPostCount,1);
 assert.equal(posts,1);
 assert.equal(result.automaticRetries,0);
 assert.equal(result.loadedModelObservation.contextLength,16384);
 assert.equal(result.generatedTokens,4096);
 assert.equal(result.promptTokens,5507);
 assert.equal(result.unloadedConfirmed,true);
 assert.equal(result.ownedServiceStopConfirmed,true);
 assert.equal(result.monitorStopConfirmed,true);
 assert.equal(approval.contextLength,16384);
 assert.equal(approval.maxOutputTokens,4096);
 assert.equal(approval.maxPosts,1);
 assert.equal(approval.automaticRetries,0);
});

// Real CLI passes a project lease. OWNED_TAGS timeout/reset is eligible for
// one read-only retry, and only after a new valid resource sample.
for(const kind of ['TIMEOUT','CONNECTION_RESET','CONNECTION_REFUSED'])test('owned tags startup '+kind+' permits only eligible guarded GET retry, never a model retry',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 for(const scenario of ['recover','timeout','lost','low-resource']){
  let tags=0,posts=0,checks=0;
  const controller=calibrationController(async()=>{
   const value=sensor(++checks);
   if(scenario==='low-resource')value.observedResourcesMiB.gpuFree=100;
   return value;
  });
  const lease={assertHeld:async()=>scenario!=='lost'||tags===0};
  const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
   calibrationRequestSha256:sha},{controller,projectLease:lease,
   approvalVerifier:async()=>false,fetcher:async(url,init={})=>{
    if(init.method==='POST'){posts++;throw Error('TEST_MUST_NOT_POST');}
    if(url.endsWith('/api/tags')&&(++tags===1||scenario==='timeout')){
     const error=Error('startup transport');
      if(kind==='TIMEOUT')error.name='TimeoutError';
      else error.cause={code:kind==='CONNECTION_RESET'?'ECONNRESET':'ECONNREFUSED'};
      throw error;
    }
    return calibrationPreflightFetcher(url,init);
   }});
  assert.equal(result.status,'HOLD');assert.equal(result.modelPostCount,0);assert.equal(posts,0);
  assert.equal(tags,kind!=='CONNECTION_REFUSED'&&['recover','timeout'].includes(scenario)?2:1);
  assert.equal(result.reason,kind==='CONNECTION_REFUSED'?'PREFLIGHT_OWNED_TAGS_CONNECTION_REFUSED':({recover:'INDIVIDUAL_CALIBRATION_APPROVAL_REQUIRED',
   timeout:'PREFLIGHT_OWNED_TAGS_'+kind,lost:'PROJECT_LEASE_LOST',
   'low-resource':'PRE_POST_RESOURCE_FLOOR_HOLD'})[scenario]);
  assert.equal(result.ownedTagsInitialTimeout===true,kind==='TIMEOUT');
   assert.equal(result.ownedTagsInitialFailure??null,kind==='CONNECTION_REFUSED'?null:'PREFLIGHT_OWNED_TAGS_'+kind);
  assert.equal(result.ownedTagsReadOnlyRetrySucceeded===true,kind!=='CONNECTION_REFUSED'&&scenario==='recover');
 }
});


test('calibration HTTP 500 classifies bounded error stream without retaining raw text or retrying',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 for(const [error,expected] of [['CUDA out of memory SECRET_PRIVATE_PATH','MEMORY_ALLOCATION'],['model runner process exited SECRET_PRIVATE_PATH','MODEL_RUNNER_EXIT'],['unknown SECRET_PRIVATE_PATH','OTHER_PROVIDER_ERROR'],[{message:'CUDA out of memory SECRET_PRIVATE_PATH'},'MEMORY_ALLOCATION'],[{message:'model runner process exited SECRET_PRIVATE_PATH'},'MODEL_RUNNER_EXIT'],[{code:'opaque'},'ERROR_MESSAGE_UNAVAILABLE'],['x'.repeat(9000),'ERROR_BODY_TOO_LARGE']]){
  let posts=0,checks=0;
  const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,calibrationRequestSha256:sha},{
   controller:calibrationController(async()=>sensor(++checks)),approvalVerifier:async()=>true,
   fetcher:async(url,init={})=>{
    if(init.method!=='POST')return calibrationPreflightFetcher(url,init);
    posts++;return new Response(JSON.stringify({error}),{status:500});
   },pollMs:250,timeoutMs:5000});
  assert.equal(result.reason,'CALIBRATION_POST_HTTP_FAILED');assert.equal(result.status,'HOLD');
  assert.equal(result.calibrationHttpStatus,500);assert.equal(result.calibrationHttpErrorClass,expected);
  assert.ok(Number.isFinite(result.calibrationHttpElapsedMs));
  assert.equal(posts,1);assert.equal(result.modelPostCount,1);assert.equal(result.automaticRetries,0);
  assert.equal(JSON.stringify(result).includes('SECRET_PRIVATE_PATH'),false);
  assert.equal(result.ownedServiceStopConfirmed,true);assert.equal(result.monitorStopConfirmed,true);
 }
});

test('calibration keeps only allowlisted owner diagnostic summary',async()=>{
 const body=calibrationBody(),sha=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 for(const valid of [true,false]){
  let checks=0,posts=0;
  const controller=calibrationController(async()=>sensor(++checks));
  controller.stop=async()=>({ownerStopConfirmed:true,monitorStopConfirmed:true,
   providerDiagnostics:{classes:valid?['MODEL_RUNNER_EXIT']:['SECRET_PRIVATE_PATH'],
    chunks:12,complete:true,raw:'SECRET_PRIVATE_PATH'}});
  const result=await runR125ResourceCalibrationOwned({calibrationRequest:body,
   calibrationRequestSha256:sha},{controller,approvalVerifier:async()=>true,
   fetcher:async(url,init={})=>{
    if(init.method!=='POST')return calibrationPreflightFetcher(url,init);
    posts++;return new Response(JSON.stringify({error:{message:'runner exited'}}),{status:500});
   },pollMs:250,timeoutMs:5000});
  assert.equal(result.reason,'CALIBRATION_POST_HTTP_FAILED');
  assert.equal(posts,1);assert.equal(result.automaticRetries,0);
  assert.deepEqual(result.ownedProviderDiagnostics,valid?{classes:['MODEL_RUNNER_EXIT'],chunks:12,complete:true}:undefined);
  assert.equal(JSON.stringify(result).includes('SECRET_PRIVATE_PATH'),false);
  assert.equal(result.unloadedConfirmed,true);
 }
});
