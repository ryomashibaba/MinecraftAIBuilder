import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareR125StudioNewRequest,summarizeR125StudioRun,runR125ArchitecturePlanOwned,runR125ResourceCalibrationOwned} from './r125-local-architecture-plan-owned.mjs';
const input={model:'qwen3:14b',prompt:'自然光が入る小さな交流施設を作ってください。',headSha:'a'.repeat(40)};
test('arbitrary brief prepares the real owned adapter without network and changes request hash',async()=>{
 let wire;
 const a=await prepareR125StudioNewRequest(input,{onWireBody:body=>{wire=body;}}),b=await prepareR125StudioNewRequest({...input,prompt:'町の小さな図書館を作ってください。'});
 assert.equal(a.modelPostCount,0);assert.equal(a.headSha,input.headSha);
 assert.equal(createHash('sha256').update(wire).digest('hex'),a.requestSha256);
 assert.equal(JSON.parse(wire).model,input.model);assert.equal('wireBody' in a,false);
 assert.notEqual(a.requestSha256,b.requestSha256);assert.notEqual(a.briefSha256,b.briefSha256);
 await assert.rejects(prepareR125StudioNewRequest({...input,model:'unapproved'}));
});
test('request mismatch and missing existing cross-project lease are pre-POST HOLD',async()=>{
 const request=await prepareR125StudioNewRequest(input);let stopped=0,posts=0;
 const controller={headSha:input.headSha,servicePid:123,checkResourceSafety(){throw Error('must not sample')},async stop(){stopped++;return {ownerStopConfirmed:true,monitorStopConfirmed:true}}};
 const args={model:input.model,prompt:input.prompt,outDir:'unused'};
 for(const [studioRequest,projectLease] of [[request,null],[{...request,requestSha256:'b'.repeat(64)},{assertHeld:async()=>true}]]){
  const r=await runR125ArchitecturePlanOwned(args,{controller,studioRequest,projectLease,fetcher:async()=>{posts++;throw Error('no POST')}});
  assert.equal(r.status,'HOLD');assert.equal(r.modelPostCount,0);
 }
 assert.equal(posts,0);assert.equal(stopped,2);
});
test('Studio never imports a mere SOURCE report or unsettled process',async()=>{
 const req=await prepareR125StudioNewRequest(input),r={model:req.model,requestSha256:req.briefSha256,sourceVerified:true,sourceSha256:'c'.repeat(64),geometrySha256:'d'.repeat(64),modelPostCount:1,unloadConfirmed:true,ownedServiceStopConfirmed:true,monitorStopConfirmed:true,loadedModelObserved:true};
 assert.equal(summarizeR125StudioRun(req,r,'private/run',true).status,'SOURCE_READY_REVIEW_ONLY');
 for(const bad of [{unloadConfirmed:false},{monitorStopConfirmed:false},{loadedModelObserved:false},{requestSha256:'e'.repeat(64)},{modelPostCount:0}]){
  const receipt=summarizeR125StudioRun(req,{...r,...bad},'private/run',true);
  assert.equal(receipt.status,'HOLD');assert.equal(receipt.runPath,null);
 }
 assert.equal(summarizeR125StudioRun(req,r,'private/run',false).status,'HOLD');
 assert.equal(summarizeR125StudioRun(req,{reason:'MONITOR_INTERRUPTED'},'private/run',true).status,'INTERRUPTED');
});

/** Real adapter + runner + B143 compiler; only HTTP and resource/lease
 * providers are injected. No model, network, world or Windows process. */
test('Studio owned path produces a real SOURCE receipt from the existing runner', {timeout:15000}, async()=>{
 const prompt='未知の用途に対応し、入口・屋内動線・採光を持つ独創的な店舗を設計してください。';
 const request=await prepareR125StudioNewRequest({...input,prompt});
 const original=fs.readFileSync(new URL('../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url),'utf8');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-studio-owned-')),outDir=path.join(root,'run');
 const digest='bdbd181c33f2ed1b31c972991882db3cf4d192569092138a7d29e973cd9debe8';
 const hash=x=>createHash('sha256').update(x).digest('hex');
 let seq=0,posts=0,approval=0,stops=0,loaded=false,loadedObservedResolve;
 const loadedObserved=new Promise(resolve=>{loadedObservedResolve=resolve;});
 const controller={headSha:request.headSha,port:11435,servicePid:5001,supervisorPid:5000,
  monitorPid:4999,monitorId:'a'.repeat(32),killOnCloseJob:true,configuredContextLength:16384,
  configuredParallelRequests:1,configuredMaxLoadedModels:1,configuredKeepAliveSeconds:0,
  cloudDisabled:true,configuredFlashAttention:false,configuredKvCacheType:'f16',
  configuredGpuOverheadBytes:0,configuredScheduleSpread:false,configuredMaxQueue:1,
  async checkResourceSafety(){
   const now=Date.now();return {independentMonitorActive:true,ownedServiceInKillOnCloseJob:true,
    ownedServicePort:11435,ownedServicePid:5001,supervisorPid:5000,monitorPid:4999,
    monitorId:'a'.repeat(32),monitorHeartbeatEpochMs:now,monitorSequence:++seq,
    observedResourcesMiB:{ramFree:13000,commitHeadroom:23000,gpuFree:15000,gpuTotal:16384}};
  },
  async stop(){stops++;return {ownerStopConfirmed:true,monitorStopConfirmed:true}}
 };
 const probe=async({sensor,architectureRequestSha256,wireBody,mode})=>{
  assert.equal(hash(wireBody),request.requestSha256);assert.equal(mode,'new');
  return {...sensor,status:'SAFE_FOR_ONE_REQUEST',
  resourceSafetyCertified:true,inferenceMemoryPeakCalibrated:true,model:input.model,modelDigest:digest,
  contextLength:16384,maxOutputTokens:4096,calibrationProofSha256:'f'.repeat(64),
  architectureRequestSha256,headSha:request.headSha,resourceCalibrationId:'injected-test-only',
  measuredAtEpochMs:Date.now(),sharedServiceIdle:true};};
 const fetcher=async(url,init)=>{
  if(init.method==='POST'){
   assert.equal(url,request.endpoint);assert.equal(hash(init.body),request.requestSha256);posts++;loaded=true;
   return {ok:true,status:200,async text(){
    let timer;try{await Promise.race([loadedObserved,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('TEST_MONITOR_NOT_OBSERVED')),4000)})]);}
    finally{clearTimeout(timer);}
    // Monitor may still be finishing the sample when the HTTP body settles.
    loaded=false;
    return JSON.stringify({choices:[{message:{content:original},finish_reason:'stop'}]});
   }};
  }
  assert.equal(init.method,'GET');
  if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{
   name:input.model,digest,size:9276198565,details:{quantization_level:'Q4_K_M'}}]})};
  if(url==='http://127.0.0.1:11435/api/ps'&&loaded)return {ok:true,json:async()=>{
   loadedObservedResolve();return {models:[{name:input.model,digest,context_length:16384,
    size:9276198565,size_vram:9276198565}]};
  }};
  assert.ok(['http://127.0.0.1:11435/api/ps','http://127.0.0.1:11434/api/ps'].includes(url));
  return {ok:true,json:async()=>({models:[]})};
 };
 try{
  const result=await runR125ArchitecturePlanOwned({model:input.model,prompt,outDir},{
   controller,studioRequest:request,projectLease:{assertHeld:async()=>true},
   calibratedResourceProbe:probe,exactRequestApprovalVerifier:async x=>{
    approval++;return hash(x.wireBody)===request.requestSha256&&x.mode==='new'&&x.modelDigest===digest&&
     x.requestSha256===request.requestSha256&&x.headSha===request.headSha&&
     x.briefSha256===request.briefSha256&&x.outDir===outDir;
   },fetcher});
  assert.equal(posts,1);assert.equal(approval,1);assert.equal(stops,1);
  assert.equal(result.sourceVerified,true,JSON.stringify(result));
  const saved=JSON.parse(fs.readFileSync(path.join(outDir,'RUN_REPORT.json'),'utf8'));
  const receipt=summarizeR125StudioRun(request,result,outDir,true);
  assert.equal(receipt.status,'SOURCE_READY_REVIEW_ONLY');
  assert.equal(receipt.sourceSha256,saved.sourceSha256);assert.equal(receipt.geometrySha256,saved.geometrySha256);
  assert.equal(fs.readFileSync(path.join(outDir,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
  assert.ok(fs.existsSync(path.join(outDir,'B143_SOURCE_REVIEW_ONLY.json')));
  assert.deepEqual(receipt.BuildPlan.operations,[]);assert.deepEqual(receipt.gates,Array(9).fill('BLOCKED'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// A calibration using the existing cross-project lease must stop before HTTP
// if its ownership is lost. No real controller or model is invoked.
test('calibration project lease loss fails closed before any HTTP',async()=>{
 let posts=0,stops=0;
 const controller={headSha:input.headSha,configuredContextLength:16384,
  configuredParallelRequests:1,configuredMaxLoadedModels:1,configuredKeepAliveSeconds:0,
  cloudDisabled:true,configuredFlashAttention:false,configuredKvCacheType:'f16',
  configuredGpuOverheadBytes:0,configuredScheduleSpread:false,configuredMaxQueue:1,
  ollamaExecutableSha256:'a'.repeat(64),async checkResourceSafety(){throw Error('must not sample');},
  async stop(){stops++;return {ownerStopConfirmed:true,monitorStopConfirmed:true};}};
 for(const assertHeld of [async()=>false,async()=>{throw Error('lost');}]){
  const r=await runR125ResourceCalibrationOwned({},{controller,projectLease:{assertHeld},
   fetcher:async()=>{posts++;throw Error('must not fetch');}});
  assert.equal(r.reason,'PROJECT_LEASE_LOST');assert.equal(r.status,'HOLD');
  assert.equal(r.modelPostCount,0);assert.equal(r.resourceSafetyCertified,false);
 }
 assert.equal(posts,0);assert.equal(stops,2);
});
