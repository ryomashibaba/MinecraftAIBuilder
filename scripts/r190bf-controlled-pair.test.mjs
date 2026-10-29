/** BF fixtures are SYNTHETIC transport probes only, never model architecture. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {syntheticOriginal} from './fixtures/r190bd-mock-original.mjs';
import {prepareR190BCOfflinePrompt} from './r190bc-offline-review.mjs';
import {prepareR190BF,captureR190BFSide,compareR190BFPair,
 runR190BFArgs,parseR190BFArgs} from './r190bf-controlled-pair.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const REQUEST='地形に調和し、内部動線と眺望が実在する小さな図書館を独自に設計してください。';
function env(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bf-controlled-'));
 const brief=path.join(root,'brief.txt'),preparedDir=path.join(root,'prepared'),
  protocolDir=path.join(root,'protocol'),aDir=path.join(root,'a'),
  bDir=path.join(root,'b'),outDir=path.join(root,'comparison');
 fs.writeFileSync(brief,REQUEST,'utf8');
 prepareR190BCOfflinePrompt({briefPath:brief,outDir:preparedDir,expectedSha256:H(REQUEST)});
 return {root,brief,preparedDir,protocolDir,aDir,bDir,outDir};
}
function make(c){
 return prepareR190BF({preparedDir:c.preparedDir,outDir:c.protocolDir,
  model:'qwen3:14b',seed:29,maxTokens:8192});
}
function fakeNetwork(capture=[]){
 return async(url,options)=>{
  assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
  assert.equal(options.method,'POST');
  assert.equal(options.redirect,'error');
  const body=JSON.parse(options.body);
  assert.equal(body.model,'qwen3:14b');
  assert.equal(body.temperature,0.35);
  assert.equal(body.seed,29);
  assert.equal(body.max_tokens,8192);
  assert.equal(body.stream,false);
  assert.equal(body.response_format.type,'json_object');
  capture.push(body);
  return {ok:true,json:async()=>({choices:[{finish_reason:'stop',
   message:{content:syntheticOriginal()}}]})};
 };
}
test('BF preparation SHA-locks one Japanese brief, model settings, no calls',async()=>{
 const c=env();let n=0;try{
  const r=make(c);assert.equal(r.modelCalls,0);
  assert.equal(r.seed,29);assert.equal(r.maxTokens,8192);
  assert.equal(r.art,'ART_HOLD');assert.equal(r.worldWrites,0);
  assert.equal(r.sideA,'EXACT_ORIGINAL_BRIEF');
  assert.equal(r.sideB,'EXACT_BC_DESIGN_FIRST_PROMPT');
  const pre=await captureR190BFSide({protocolDir:c.protocolDir,
   preparedDir:c.preparedDir,side:'A',outDir:c.aDir,approved:false},
   {fetcher:()=>{n++;throw Error('NO_REQUEST_ALLOWED')}});
  assert.equal(pre.status,'NOT_APPROVED_PREFLIGHT_ONLY');
  assert.equal(pre.modelCallsPossible,0);assert.equal(n,0);
  assert.equal(fs.existsSync(c.aDir),false);
  assert.throws(()=>make(c),/R190BF_FRESH_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BF two independently authorized mock captures have identical provider controls and distinct original prompts',async()=>{
 const c=env(),requests=[];try{
  const lock=make(c);let n=0;
  const network=async(...args)=>{n++;return fakeNetwork(requests)(...args)};
  const a=await captureR190BFSide({protocolDir:c.protocolDir,preparedDir:c.preparedDir,
   side:'A',outDir:c.aDir,approved:true},{fetcher:network});
  const b=await captureR190BFSide({protocolDir:c.protocolDir,preparedDir:c.preparedDir,
   side:'B',outDir:c.bDir,approved:true},{fetcher:network});
  assert.equal(n,2);assert.equal(a.requestCountObserved,1);
  assert.equal(b.requestCountObserved,1);
  assert.equal(a.status,'ORIGINAL_CAPTURED_AWAIT_INDEPENDENT_ART_REVIEW');
  assert.equal(b.status,'ORIGINAL_CAPTURED_AWAIT_INDEPENDENT_ART_REVIEW');
  assert.equal(a.protocolSha256,lock.protocolSha256);
  assert.equal(b.protocolSha256,lock.protocolSha256);
  assert.equal(JSON.parse(requests[0].messages[1].content).architectural_request,REQUEST);
  assert.match(JSON.parse(requests[1].messages[1].content).architectural_request,/断面/);
  assert.equal(requests[0].messages[0].content,requests[1].messages[0].content);
  const doc=compareR190BFPair(c);
  assert.equal(doc.comparisonStatus,'NO_PHYSICAL_CHANGE_ART_HOLD');
  assert.equal(doc.actualHumanArtImprovement,'NOT_ESTABLISHED');
  assert.equal(doc.modelDigestVerified,undefined);
  assert.equal(doc.generationModelDigestVerified,false);
  assert.equal(doc.worldContacts,0);
  assert.deepEqual(doc.BuildPlan.operations,[]);
  const comparison=JSON.parse(fs.readFileSync(path.join(c.outDir,'R190BE_COMPARE.json')));
  assert.equal(comparison.A.originalSha256,comparison.B.originalSha256);
  assert.equal(comparison.winner,'NOT_ESTABLISHED');
  assert.equal(comparison.modelCalls,0);
  assert.equal(fs.existsSync(path.join(c.outDir,'A_3D.html')),true);
  assert.equal(fs.existsSync(path.join(c.outDir,'B_3D.html')),true);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BF cannot silently invoke two requests in one run',async()=>{
 const c=env();try{
  make(c);
  const injectedRunner=async(_opts,{fetcher})=>{
   const packet={model:'qwen3:14b',stream:false,temperature:0.35,
    response_format:{type:'json_object'},messages:[{role:'system',content:'spatialPlan'},
     {role:'user',content:JSON.stringify({mode:'creation',
      architectural_request:REQUEST,previousDesign:null,attempt:1,
      maxAttempts:1,strictCompilerFeedback:[]})}]};
   await fetcher('http://127.0.0.1:11434/v1/chat/completions',{
    method:'POST',redirect:'error',body:JSON.stringify(packet)});
   await fetcher('http://127.0.0.1:11434/v1/chat/completions',{
    method:'POST',redirect:'error',body:JSON.stringify(packet)});
  };
  const seen=[];
  const r=await captureR190BFSide({protocolDir:c.protocolDir,
   preparedDir:c.preparedDir,side:'A',outDir:c.aDir,approved:true},
   {fetcher:fakeNetwork(seen),modelRunner:injectedRunner});
  assert.equal(seen.length,1);assert.equal(r.requestCountObserved,1);
  assert.equal(r.status,'HOLD_NO_VERIFIED_PROVIDER_CAPTURE');
  await assert.rejects(captureR190BFSide({protocolDir:c.protocolDir,
   preparedDir:c.preparedDir,side:'A',outDir:c.aDir,approved:true},
   {fetcher:()=>{throw Error('RETRY')}}),/R190BF_FRESH_OUTPUT_REQUIRED/);
  assert.equal(fs.existsSync(path.join(c.aDir,'R190BF_ATTEMPT.json')),true);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BF prepared brief or locked protocol drift must abort before network',async()=>{
 const c=env();let calls=0;try{
  make(c);
  const preparedPrompt=path.join(c.preparedDir,'DESIGN_FIRST_PROMPT.txt');
  fs.appendFileSync(preparedPrompt,' drift');
  await assert.rejects(captureR190BFSide({protocolDir:c.protocolDir,
   preparedDir:c.preparedDir,side:'A',outDir:c.aDir,approved:true},
   {fetcher:()=>{calls++;throw Error('BAD')}}),/R190BD_PREPARED_SHA_OR_SAFETY/);
  assert.equal(calls,0);assert.equal(fs.existsSync(c.aDir),false);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BF refuses missing B and tampered capture even when a valid A exists',async()=>{
 const c=env();try{
  make(c);
  await captureR190BFSide({protocolDir:c.protocolDir,
   preparedDir:c.preparedDir,side:'A',outDir:c.aDir,approved:true},
   {fetcher:fakeNetwork()});
  assert.throws(()=>compareR190BFPair(c),/R190BF_SIDE_DIRECTORY/);
  await captureR190BFSide({protocolDir:c.protocolDir,
   preparedDir:c.preparedDir,side:'B',outDir:c.bDir,approved:true},
   {fetcher:fakeNetwork()});
  fs.appendFileSync(path.join(c.bDir,'R190BF_EXACT_REQUEST.json'),' ');
  assert.throws(()=>compareR190BFPair(c),/R190BF_SIDE_CAPTURE_DRIFT/);
  assert.equal(fs.existsSync(c.outDir),false);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BF no implicit consent on CLI and no combined auto-call option',async()=>{
 const c=env();try{
  const o=parseR190BFArgs(['--prepare','--prepared',c.preparedDir,
   '--model','qwen3:14b','--seed','29','--max-tokens','8192','--out',c.protocolDir]);
  assert.equal(o.seed,29);
  assert.throws(()=>parseR190BFArgs(['--capture','--prepared',c.preparedDir,
   '--out',c.aDir,'--side','A']),/R190BF_FLAGS/);
  assert.throws(()=>parseR190BFArgs(['--prepare','--prepared',c.preparedDir,
   '--model','qwen3:14b','--out',c.protocolDir,'--confirm-one-local-request']),/R190BF_FLAGS/);
  const r=await runR190BFArgs(['--prepare','--prepared',c.preparedDir,
   '--model','qwen3:14b','--seed','29','--out',c.protocolDir]);
  assert.equal(r.modelCalls,0);
  const x=await runR190BFArgs(['--capture','--prepared',c.preparedDir,
   '--protocol',c.protocolDir,'--side','A','--out',c.aDir]);
  assert.equal(x.status,'NOT_APPROVED_PREFLIGHT_ONLY');
  assert.equal(fs.existsSync(c.aDir),false);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
