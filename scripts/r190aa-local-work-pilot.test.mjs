/** R190-AA fake-only: no Ollama, Work, model, Minecraft or internet. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {R190AA_TASKS,parseR190AAArgs,buildR190AAPrompt,
 runR190AABatch} from './r190aa-local-work-pilot.mjs';

const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r190aa-fake-'));
const sha=s=>createHash('sha256').update(s).digest('hex');
const localTags=async(url,opts)=>{
 assert.equal(url,'http://127.0.0.1:11434/api/tags');
 assert.equal(opts.redirect,'error');
 return {ok:true,json:async()=>({models:[{name:'qwen3:14b'}]})};
};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
test('AA defaults to inspection, never invokes local or remote providers',async()=>{
 const root=temp();let providerCalls=0;
 try{
  const result=await runR190AABatch([],{
   evidenceRoot:path.join(root,'evidence'),
   fetcher:()=>{providerCalls++;throw Error('NO_PROVIDER_ALLOWED')},
   modelRunner:()=>{providerCalls++;throw Error('NO_MODEL_ALLOWED')}
  });
  assert.equal(result.status,'NO_LOCAL_BATCHES');
  assert.equal(result.modelCalls,0);
  assert.equal(providerCalls,0);
  assert.equal(result.executionAllowed,false);
  assert.equal(result.gates.length,9);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AA frozen requests vary by architecture and avoid a preset building geometry',()=>{
 const prompts=R190AA_TASKS.map(buildR190AAPrompt);
 assert.equal(prompts.length,5);
 assert.equal(new Set(prompts).size,5);
 assert.match(prompts[0],/吹き抜け/);
 assert.match(prompts[1],/干満/);
 assert.match(prompts[2],/天文/);
 assert.match(prompts[3],/歩行橋/);
 assert.match(prompts[4],/立体公共市場/);
 for(const s of prompts){
  assert.match(s,/B143/);
  assert.doesNotMatch(s,/origin:\s*\[/);
 }
 assert.deepEqual(parseR190AAArgs([]),{
  run:false,model:'qwen3:14b',batch:'pilot-01',count:3
 });
 assert.throws(()=>parseR190AAArgs(['--run','--run']),/ARGUMENTS/);
 assert.throws(()=>parseR190AAArgs(['--run','--count','500']),/INVALID_/);
 assert.throws(()=>parseR190AAArgs(['--run','--batch','../bad']),/INVALID_/);
 assert.throws(()=>parseR190AAArgs(['--model','foo','--model','bar']),/DUPLICATE/);
});
test('AA explicit single fake case archives unchanged raw and cannot certify B143 quality',async()=>{
 const root=temp(),evidenceRoot=path.join(root,'lab');
 const raw='{"thisIsNotAnArchitecturalB143":true}',cases=[];
 try{
  const runner=async(o)=>{
   assert.equal(o.mode,'architectural-b143');
   assert.equal(o.transport,'openai');
   assert.equal(o.model,'qwen3:14b');
   assert.equal(o.expectFile,null);
   assert.equal(o.replayPath,null);
   assert.deepEqual(o.requiredCapabilities,[]);
   cases.push(o.prompt);
   fs.mkdirSync(o.out);
   fs.writeFileSync(path.join(o.out,'R190_I_ORIGINAL_RESPONSE.txt'),raw);
   fs.writeFileSync(path.join(o.out,'R190_I_ORIGINAL_BRIEF.txt'),o.prompt);
   fs.writeFileSync(path.join(o.out,'R190_I_CAPTURE_RECEIPT.json'),
    JSON.stringify({schema:'minecraftaibuilder-r190-j-capture-v1',
     status:'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW',modelRequested:o.model,
     providerConfirmedComplete:true,originalRawSha256:sha(raw),
     originalRequestSha256:sha(o.prompt),...safety()}));
   throw Error('FAKE_CAPTURED_HOLD');
  };
  const result=await runR190AABatch(['--run','--model','qwen3:14b',
   '--batch','pilot-01','--count','1'],{
   evidenceRoot,fetcher:localTags,modelRunner:runner});
  assert.equal(cases.length,1);
  assert.equal(result.status,'CAPTURED_ART_HOLD');
  assert.equal(result.attemptedRequests,1);
  assert.equal(result.caseResults[0].status,'HOLD_B143_NOT_COMPARABLE');
  assert.equal(result.caseResults[0].rawSha256,sha(raw));
  assert.equal(result.worldWrites,0);
  assert.equal(result.independentArchitectureQualityCertified,false);
  const b=result.batchDirectory;
  assert.equal(fs.readFileSync(path.join(b,'library',
   'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),raw);
  const attempt=JSON.parse(fs.readFileSync(path.join(b,'library.attempt.json'),'utf8'));
  assert.equal(attempt.actualProviderConsumption,'UNKNOWN_UNTIL_CAPTURED');
  assert.equal(attempt.gates.filter(x=>x==='BLOCKED').length,9);
  await assert.rejects(runR190AABatch(['--run','--count','1'],{
   evidenceRoot,fetcher:()=>{throw Error('DUPLICATE_MUST_STOP_BEFORE_NETWORK')},
   modelRunner:runner}),/BATCH_ALREADY_EXISTS_NO_AUTOMATIC_RETRY/);
  assert.equal(cases.length,1);
  const overview=await runR190AABatch([],{evidenceRoot,
   fetcher:()=>{throw Error('NO_READ_ONLY_FETCH')}});
  assert.equal(overview.batches[0].completed,true);
  assert.equal(overview.modelCalls,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AA failed provider before capture stops batch, retaining attempt and no retry',async()=>{
 const root=temp(),evidenceRoot=path.join(root,'evidence');let requests=0;
 try{
  const result=await runR190AABatch(['--run','--count','3'],{
   evidenceRoot,fetcher:localTags,modelRunner:async()=>{
    requests++;throw Error('SYNTHETIC_TIMEOUT_WITH_NO_RAW_RESPONSE');
   }});
  assert.equal(requests,1);
  assert.equal(result.status,'HOLD_INCOMPLETE_BATCH');
  assert.equal(result.attemptedRequests,1);
  assert.equal(result.caseResults[0].status,'HOLD_NO_PROVIDER_ORIGINAL');
  assert.equal(fs.existsSync(path.join(result.batchDirectory,
   'library.attempt.json')),true);
  assert.equal(fs.existsSync(path.join(result.batchDirectory,
   'tidal-workshop.attempt.json')),false);
  await assert.rejects(runR190AABatch(['--run','--count','3'],{
   evidenceRoot,fetcher:localTags,modelRunner:async()=>{requests++}
  }),/BATCH_ALREADY_EXISTS_NO_AUTOMATIC_RETRY/);
  assert.equal(requests,1);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AA rejects non-local endpoints and never downloads models',async()=>{
 const root=temp();let outgoing=0;
 try{
  const result=await runR190AABatch(['--run','--count','1'],{
   evidenceRoot:path.join(root,'evidence'),
   fetcher:async(url,opts)=>{
    outgoing++;
    assert.equal(url,'http://127.0.0.1:11434/api/tags');
    return localTags(url,opts);
   },
   modelRunner:async(options,{fetcher})=>{
    await fetcher('https://example.com/v1/chat/completions',{method:'POST'});
   }});
  assert.equal(outgoing,1);
  assert.equal(result.status,'HOLD_INCOMPLETE_BATCH');
  assert.match(result.caseResults[0].providerError,/R190AA_NONLOCAL_PROVIDER/);
  assert.equal(result.worldContacts,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AA one-case missing raw cannot be reported captured despite full count',async()=>{
 const root=temp(),evidenceRoot=path.join(root,'one'),calls=[];
 try{
  const result=await runR190AABatch(['--run','--count','1'],{
   evidenceRoot,fetcher:localTags,modelRunner:async()=>{
    calls.push('fake-provider-attempt');
    throw Error('FAKE_NO_MODEL_ORIGINAL');
   }});
  assert.equal(calls.length,1);
  assert.equal(result.attemptedRequests,1);
  assert.equal(result.status,'HOLD_INCOMPLETE_BATCH');
  assert.equal(result.caseResults[0].status,'HOLD_NO_PROVIDER_ORIGINAL');
  assert.equal(result.caseResults[0].rawSha256,null);
  assert.equal(result.independentArchitectureQualityCertified,false);
  assert.equal(result.worldContacts,0);
  assert.equal(result.worldWrites,0);
  assert.ok(fs.existsSync(path.join(result.batchDirectory,'library.attempt.json')));
  await assert.rejects(runR190AABatch(['--run','--count','1'],{
   evidenceRoot,fetcher:async()=>{calls.push('forbidden-retry')},
   modelRunner:async()=>{calls.push('forbidden-retry')}
  }),/BATCH_ALREADY_EXISTS_NO_AUTOMATIC_RETRY/);
  assert.equal(calls.length,1);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AA absent Ollama model fails before creating any batch output',async()=>{
 const root=temp(),evidenceRoot=path.join(root,'evidence');
 try{
  await assert.rejects(runR190AABatch(['--run','--model','gemma4:26b'],{
   evidenceRoot,fetcher:localTags,
   modelRunner:()=>{throw Error('NO_MODEL_DOWNLOAD_OR_RUN')}
  }),/MODEL_NOT_INSTALLED_NO_DOWNLOAD/);
  assert.equal(fs.existsSync(evidenceRoot),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});