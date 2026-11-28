import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareR125StudioNewRequest,runR125ArchitecturePlanOwned,summarizeR125StudioRun} from './r125-local-architecture-plan-owned.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest='bdbd181c33f2ed1b31c972991882db3cf4d192569092138a7d29e973cd9debe8';
const model='qwen3:14b',runtime='d'.repeat(64),headSha='a'.repeat(40);
const start={ramFree:14000,commitHeadroom:33000,gpuFree:16003,gpuTotal:16384};
const prompt='未知の用途に対応し、入口・屋内動線・採光を持つ独創的な店舗を設計してください。';
const original=fs.readFileSync(new URL('../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url),'utf8');
for(const scenario of ['success','cross-format-success','missing-evidence','low-budget','denied','lease-lost','post-approval-budget','during-floor','wrong-placement','estimate-exceeded','missing-usage','wrong-usage','shared-busy'])test('bounded Studio (injected only): '+scenario,{timeout:15000},async()=>{
 const request=await prepareR125StudioNewRequest({model,prompt,headSha});
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-bounded-test-')),outDir=path.join(root,'run');
 let seq=0,posts=0,approvals=0,stops=0,loaded=false,leased=true;
 let observed;const loadedObserved=new Promise(resolve=>{observed=resolve});
 const controller={headSha,port:11435,servicePid:5001,supervisorPid:5000,monitorPid:4999,monitorId:'a'.repeat(32),killOnCloseJob:true,configuredContextLength:16384,ollamaExecutableSha256:runtime,configuredParallelRequests:1,configuredMaxLoadedModels:1,configuredKeepAliveSeconds:0,cloudDisabled:true,configuredFlashAttention:false,configuredKvCacheType:'f16',configuredGpuOverheadBytes:0,configuredScheduleSpread:false,configuredMaxQueue:1,
 async checkResourceSafety({phase}){
  const now=Date.now(),resources={...start};
  if(scenario==='low-budget'||(scenario==='post-approval-budget'&&approvals))resources.gpuFree=15000;
  if(phase==='DURING_INFERENCE'&&scenario==='during-floor')resources.gpuFree=1000;
  return {independentMonitorActive:true,ownedServiceInKillOnCloseJob:true,ownedServicePort:11435,ownedServicePid:5001,supervisorPid:5000,monitorPid:4999,monitorId:'a'.repeat(32),monitorHeartbeatEpochMs:now,monitorSequence:++seq,observedResourcesMiB:resources};
 },async stop(){stops++;loaded=false;observed();return {ownerStopConfirmed:true,monitorStopConfirmed:true}}};
 const evidence={schema:'r125-studio-bounded-private-evidence-v1',provenanceVerified:scenario!=='missing-evidence',headSha,requestSha256:request.requestSha256,
  tokenObservation:{requestSha256:request.requestSha256,modelDigest:digest,runtimeSha256:runtime,inputUpperBound:8000},
  history:{runtimeSha256:runtime,modelDigest:digest,contextLength:16384,maxOutputTokens:4096,responseFormat:scenario==='cross-format-success'?'json_object':'json_schema',kvCacheType:'f16',flashAttention:false,parallel:1,maxLoadedModels:1,evidenceSha256:'b'.repeat(64),start,minimum:{ramFree:11000,commitHeadroom:22000,gpuFree:3650,gpuTotal:16384},placement:{sizeBytes:12949368339,sizeVramBytes:12949368339}}};
 const boundedStudio={async loadEvidence(x){assert.equal(x.request.requestSha256,request.requestSha256);assert.equal(sha(x.wireBody),request.requestSha256);return evidence},
 async verifyApproval(x){approvals++;assert.equal(x.purpose,'ARCHITECTURE_PLAN_BOUNDED_TRIAL');assert.equal(x.inferenceMemoryPeakCalibrated,false);assert.equal('calibrationProofSha256' in x,false);assert.equal(x.requestSha256,request.requestSha256);assert.equal(x.outDir,outDir);assert.equal(x.resourceBudgetMiB.gpuFree,15425);assert.equal(x.responseFormatScope,scenario==='cross-format-success'?'JSON_OBJECT_TO_JSON_SCHEMA_UNCALIBRATED':'SAME_FORMAT');assert.equal(x.resourceReserveMiB.gpuFree,512);assert.match(x.resourceEvidenceSha256,/^[a-f0-9]{64}$/);if(scenario==='lease-lost')leased=false;return scenario!=='denied'}};
 const fetcher=async(url,init)=>{
  if(init.method==='POST'){
   assert.equal(url,request.endpoint);assert.equal(sha(init.body),request.requestSha256);assert.equal(approvals,1);posts++;loaded=true;
   return {ok:true,status:200,async text(){
    let timer;
    try{await Promise.race([loadedObserved,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('TEST_MONITOR_TIMEOUT')),4000)})]);}
    finally{clearTimeout(timer);}
    loaded=false;
    return JSON.stringify({choices:[{message:{content:original},finish_reason:'stop'}],...(scenario==='missing-usage'?{}:{usage:{prompt_tokens:scenario==='wrong-usage'?13000:scenario==='estimate-exceeded'?9000:4000,completion_tokens:1000}})});
   }};
  }
  assert.equal(init.method,'GET');
  if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:model,digest,size:9276198565,details:{quantization_level:'Q4_K_M'}}]})};
  if(url==='http://127.0.0.1:11435/api/ps'&&loaded)return {ok:true,json:async()=>{observed();return {models:[{name:model,digest,context_length:16384,size:12949368339,size_vram:scenario==='wrong-placement'?9276198565:12949368339}]}}};
  if(url==='http://127.0.0.1:11434/api/ps'&&posts&&scenario==='shared-busy')return {ok:true,json:async()=>({models:[{name:'other'}]})};
  assert.ok(['http://127.0.0.1:11435/api/ps','http://127.0.0.1:11434/api/ps'].includes(url));return {ok:true,json:async()=>({models:[]})};
 };
 try{
  const result=await runR125ArchitecturePlanOwned({model,prompt,outDir},{controller,studioRequest:request,projectLease:{assertHeld:async()=>leased},boundedStudio,calibratedResourceProbe:()=>{throw Error('legacy calibration must not be used')},exactRequestApprovalVerifier:()=>{throw Error('legacy approval must not be used')},fetcher});
  const receipt=summarizeR125StudioRun(request,result,outDir,true);
  const pre=['missing-evidence','low-budget','denied','lease-lost','post-approval-budget'].includes(scenario);
  assert.equal(posts,pre?0:1);assert.equal(result.modelPostCount,posts);assert.ok(stops>=1);
  if(['success','cross-format-success','estimate-exceeded','missing-usage'].includes(scenario)){
   assert.equal(result.sourceVerified,true,JSON.stringify(result));assert.equal(receipt.status,'SOURCE_READY_REVIEW_ONLY');assert.equal(result.resourceMode,'BOUNDED_REAL_REQUEST_TRIAL');assert.equal(result.responseFormatScope,scenario==='cross-format-success'?'JSON_OBJECT_TO_JSON_SCHEMA_UNCALIBRATED':'SAME_FORMAT');assert.equal(result.resourceSafetyCertified,false);assert.equal(result.inferenceMemoryPeakCalibrated,false);
   assert.ok(fs.existsSync(path.join(outDir,'B143_SOURCE_REVIEW_ONLY.json')));
  }else{assert.notEqual(receipt.status,'SOURCE_READY_REVIEW_ONLY');assert.equal(receipt.runPath,null);}
  if(['success','cross-format-success','estimate-exceeded','missing-usage','wrong-usage'].includes(scenario)){
   const captured=fs.readFileSync(path.join(outDir,'BOUNDED_PROVIDER_RESPONSE_ORIGINAL.json'),'utf8');
   const usage=JSON.parse(fs.readFileSync(path.join(outDir,'BOUNDED_RESPONSE_USAGE.json'),'utf8'));
   assert.equal(usage.responseSha256,sha(captured));assert.equal(usage.requestSha256,request.requestSha256);
   assert.equal(JSON.parse(captured).choices[0].message.content,original);
   assert.equal(usage.status,scenario==='wrong-usage'?'HOLD':scenario==='estimate-exceeded'?'ESTIMATE_EXCEEDED':scenario==='missing-usage'?'USAGE_UNVERIFIED':'WITHIN_ESTIMATE');
   assert.equal(usage.usageVerified,!['wrong-usage','missing-usage'].includes(scenario));
   assert.equal(result.actualTokenUsageVerified,usage.usageVerified);
   if(scenario==='wrong-usage')assert.equal(fs.existsSync(path.join(outDir,'B143_SOURCE_REVIEW_ONLY.json')),false);
  }
  if(['missing-evidence','low-budget'].includes(scenario))assert.equal(approvals,0);
  assert.deepEqual(receipt.BuildPlan.operations,[]);assert.deepEqual(receipt.gates,Array(9).fill('BLOCKED'));
  assert.equal(receipt.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
