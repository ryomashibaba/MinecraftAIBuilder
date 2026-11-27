import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareR125StudioNewRequest,summarizeR125StudioRun,runR125ArchitecturePlanOwned} from './r125-local-architecture-plan-owned.mjs';
const input={model:'qwen3:14b',prompt:'自然光が入る小さな交流施設を作ってください。',headSha:'a'.repeat(40)};
test('arbitrary brief prepares the real owned adapter without network and changes request hash',async()=>{
 const a=await prepareR125StudioNewRequest(input),b=await prepareR125StudioNewRequest({...input,prompt:'町の小さな図書館を作ってください。'});
 assert.equal(a.modelPostCount,0);assert.equal(a.headSha,input.headSha);
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
