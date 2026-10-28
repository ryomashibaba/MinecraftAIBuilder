/** R190-AB regression: every provider is fake, all originals preserved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {R190AB_FORMAT,parseR190ABArgs,inspectR190ABReply,
 runR190AB} from './r190ab-structured-output-pilot.mjs';
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r190ab-fake-'));
const sample=()=>JSON.stringify({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',id:'library-test',
 title:'Synthetic library',brief:'Fake data only, never a real model',
 bounds:{width:20,height:10,depth:20},designOnly:true,
 elements:[
 {id:'floor',shape:'box',mode:'add',origin:[2,1,2],size:[16,1,16],material:'stone'},
 {id:'front-wall',shape:'box',mode:'add',origin:[2,2,2],size:[16,5,1],material:'wood'},
 {id:'entry',shape:'box',mode:'cut',origin:[8,2,2],size:[3,3,1]}
 ]},explanation:'Synthetic only; not Qwen.',assumptions:[],
 spatialPlan:{designIntent:'A small synthetic library',
 massStrategy:'Grounded floor and one front wall',
 circulationStrategy:'Through the doorway from the exterior',
 entrance:[9,2,3],headroom:2,
 protectedVoids:[],
 destinations:[{id:'inside',point:[9,2,8],maximumPathSteps:30}],
 functionalZones:[{id:'zone',origin:[6,2,5],size:[6,3,6],
 minimumReachablePositions:5,minimumReachablePercent:5}]
}});
const fakeFetch=(response,trace)=>async(url,options)=>{
 trace.push({url,options});
 assert.equal(options.redirect,'error');
 if(url==='http://127.0.0.1:11434/api/tags')
  return {ok:true,json:async()=>({models:[{name:'qwen3:14b',digest:'untrusted-fake'}]})};
 assert.equal(url,'http://127.0.0.1:11434/api/chat');
 const request=JSON.parse(options.body);
 assert.equal(options.method,'POST');
 assert.equal(request.model,'qwen3:14b');
 assert.equal(request.format.additionalProperties,false);
 assert.deepEqual(request.format.required,
  ['design','explanation','assumptions','spatialPlan']);
 assert.equal(request.format.properties.design.properties.schema.const,
  'minecraftaibuilder-b143-building-dsl-v1');
 assert.equal(request.format.properties.design.properties.elements.items.oneOf.length,11);
 const variants=request.format.properties.design.properties.elements.items.oneOf;
 const stairs=variants.find(e=>e.properties.shape.const==='staircase');
 assert.deepEqual(stairs.properties.axis.enum,['x','z']);
 assert.equal(stairs.properties.mode.const,'add');
 const cut=variants.filter(v=>v.properties.mode.const==='cut');
 assert.equal(cut.length,5);
 assert.ok(cut.every(x=>!Object.hasOwn(x.properties,'material')));
 assert.ok(!Object.hasOwn(request,'attempt')&&!Object.hasOwn(request,'maxAttempts'));
 assert.equal(request.stream,false);
 return {ok:true,json:async()=>({done_reason:'stop',message:{content:response}})};
};
test('AB starts read-only, with explicit model and fresh study required',async()=>{
 const root=temp(),trace=[];
 try{
  const r=await runR190AB([],{
   evidenceRoot:path.join(root,'evidence'),
   fetcher:async()=>{trace.push('unexpected');throw Error('NO_NETWORK')}
  });
  assert.equal(r.status,'NO_SAVED_STUDY');
  assert.equal(r.modelCalls,0);
  assert.equal(trace.length,0);
  assert.deepEqual(parseR190ABArgs([]),{
   run:false,model:'qwen3:14b',study:'contract-01'});
  assert.throws(()=>parseR190ABArgs(['--run','--run']),/ARGUMENTS/);
  assert.throws(()=>parseR190ABArgs(['--run','--study','../bad']),/UNSAFE_OPTIONS/);
  assert.throws(()=>parseR190ABArgs(['--run','--model','qwen3:14b',
   '--model','gemma']),/ARGUMENTS/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AB full B143 grammar: five shapes have cut/add, staircase add/x-z only',()=>{
 const variants=R190AB_FORMAT.properties.design.properties.elements.items.oneOf;
 assert.deepEqual(variants.map(x=>x.properties.shape.const).filter(x=>x==='staircase'),
  ['staircase']);
 assert.equal(variants.length,11);
 assert.equal(variants.filter(x=>x.properties.mode.const==='cut').length,5);
 assert.ok(variants.every(x=>x.additionalProperties===false));
 assert.deepEqual(R190AB_FORMAT.properties.design.properties.bounds.required,
  ['width','depth','height']);
});
test('AB preserved original source from old Qwen pilot remains rejected, not repaired',()=>{
 const prior=fs.readFileSync(new URL(
  '../evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url),'utf8');
 const orig=JSON.parse(prior);
 assert.equal(orig.design.schema,'b143');
 const r=inspectR190ABReply(prior);
 assert.equal(r.report.status,'HOLD_INVALID_OUTPUT');
 assert.match(r.report.error,/B198ZR4_EXPECTED_FOUR_KEYS/);
 assert.equal(r.report.strictB143,false);
 assert.equal(r.design,null);
 assert.equal(r.report.worldWrites,0);
});
test('AB one explicit fake request archives full raw unchanged; all output source-only',async()=>{
 const root=temp(),calls=[],raw=sample();
 try{
  const result=await runR190AB(['--run'],{
   evidenceRoot:path.join(root,'saved'),fetcher:fakeFetch(raw,calls)
  });
  assert.equal(calls.length,2);
  assert.equal(result.providerCallsAttempted,1);
  assert.equal(result.providerDoneReason,'stop');
  assert.equal(result.response.strictB143,true);
  assert.equal(result.response.declaredPlan,true);
  assert.equal(result.response.real3D,true);
  assert.equal(result.humanArtReview,'ART_HOLD');
  assert.equal(result.worldContacts,0);
  assert.equal(result.worldWrites,0);
  const dest=path.join(root,'saved','contract-01');
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  assert.ok(fs.existsSync(path.join(dest,'MODEL_SOURCE_TRUE_3D.html')));
  for(const side of ['front','rear','west','east','roof'])
   assert.ok(fs.existsSync(path.join(dest,'MODEL_'+side+'.svg')));
  const attempt=JSON.parse(fs.readFileSync(path.join(dest,'R190AB_ATTEMPT.json')));
  assert.equal(attempt.actualProviderConsumption,'UNKNOWN_UNTIL_CAPTURED');
  assert.equal(attempt.gates.filter(x=>x==='BLOCKED').length,9);
  await assert.rejects(runR190AB(['--run'],{
   evidenceRoot:path.join(root,'saved'),
   fetcher:async()=>{throw Error('REPEAT_NOT_ALLOWED')}
  }),/PREVIOUS_STUDY_NO_AUTOMATIC_RETRY/);
  assert.equal(calls.length,2);
  const readOnly=await runR190AB([],{
   evidenceRoot:path.join(root,'saved'),
   fetcher:async()=>{throw Error('READ_ONLY_NETWORK_NOT_ALLOWED')}
  });
  assert.equal(readOnly.status,'READ_ONLY');
  assert.equal(readOnly.modelCalls,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AB invalid response captured without repair; no second model call',async()=>{
 const root=temp(),calls=[];
 try{
  const raw='{"invalid":true}';
  const result=await runR190AB(['--run','--study','one-malformed'],{
   evidenceRoot:path.join(root,'saved'),fetcher:fakeFetch(raw,calls)});
  assert.equal(calls.length,2);
  assert.equal(result.response.status,'HOLD_INVALID_OUTPUT');
  assert.equal(result.response.strictB143,false);
  assert.equal(result.response.real3D,false);
  const saved=fs.readFileSync(path.join(root,'saved','one-malformed',
   'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
  assert.equal(saved,raw);
  assert.equal(result.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AB transport failure leaves a durable marker; explicit repeat is blocked',async()=>{
 const root=temp(),calls=[];
 try{
  const failed=await runR190AB(['--run','--study','one-timeout'],{
   evidenceRoot:path.join(root,'saved'),
   fetcher:async(u,o)=>{
    calls.push(u);
    if(u.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'qwen3:14b'}]})};
    throw Error('SYNTHETIC_CONNECTION_FAILURE');
   }});
  assert.equal(calls.length,2);
  assert.equal(failed.response.status,'HOLD_PROVIDER_NO_VERIFIED_RAW');
  assert.match(failed.providerError,/SYNTHETIC_CONNECTION_FAILURE/);
  assert.ok(fs.existsSync(path.join(root,'saved','one-timeout','R190AB_ATTEMPT.json')));
  await assert.rejects(runR190AB(['--run','--study','one-timeout'],{
   evidenceRoot:path.join(root,'saved'),fetcher:async()=>{calls.push('retry')}
  }),/PREVIOUS_STUDY_NO_AUTOMATIC_RETRY/);
  assert.equal(calls.length,2);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AB rejects nonexistent local model, with zero model requests',async()=>{
 const root=temp(),calls=[];
 try{
  await assert.rejects(runR190AB(['--run','--model','missing:999'],{
   evidenceRoot:path.join(root,'saved'),
   fetcher:async(u)=>{
    calls.push(u);return {ok:true,json:async()=>({models:[{name:'qwen3:14b'}]})};
   }
  }),/LOCAL_MODEL_NOT_INSTALLED_NO_DOWNLOAD/);
  assert.equal(calls.length,1);
  assert.equal(fs.existsSync(path.join(root,'saved','contract-01')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});