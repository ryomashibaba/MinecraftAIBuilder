import test from 'node:test';
import assert from 'node:assert/strict';
import {runR125ArchitecturePlanOwned,verifyOwnedArchitectureSample}
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
