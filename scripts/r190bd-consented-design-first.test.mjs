/** R190-BD: mocked Ollama + synthetic B143 only. No actual model/world. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareR190BCOfflinePrompt} from './r190bc-offline-review.mjs';
import {parseR190BDArgs,inspectR190BDPrepared,runR190BDStudy}
 from './r190bd-consented-design-first.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const BRIEF='山間の町で、人々が学べる小さな図書館と閲覧室を自由に設計してください。';
const caseDir=()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r190bd-'));
 const original=path.join(base,'request.txt'),prepared=path.join(base,'prepared');
 fs.writeFileSync(original,BRIEF,'utf8');
 prepareR190BCOfflinePrompt({briefPath:original,outDir:prepared,
  expectedSha256:hash(Buffer.from(BRIEF))});
 return {base,original,prepared,out:path.join(base,'run')};
};
const syntheticOriginal=()=>JSON.stringify({
 design:{
  schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'r190bd-fake-only',title:'Synthetic test building not a model result',
  brief:'Fully synthetic source for mock R4 tests, no independent design',
  bounds:{width:24,height:16,depth:24},designOnly:true,
  elements:[
   {id:'supported-floor',shape:'box',mode:'add',material:'stone',
    origin:[1,1,1],size:[22,1,22]},
   {id:'canopy',shape:'box',mode:'add',material:'wood',
    origin:[3,10,3],size:[8,1,10]}
  ]
 },explanation:'This data is hard-coded for a provider mock only.',
 assumptions:[],
 spatialPlan:{
  designIntent:'Synthetic test for a sheltered room and open pad.',
  massStrategy:'A ground slab plus small elevated canopy tests geometry.',
  circulationStrategy:'Supported walking along the unbroken flat ground.',
  entrance:[4,2,4],headroom:2,protectedVoids:[],
  destinations:[{id:'far-pad',point:[14,2,9],maximumPathSteps:40}],
  functionalZones:[{id:'some-pad',origin:[4,2,4],size:[6,2,6],
   minimumReachablePositions:5,minimumReachablePercent:70}]
 }
});
test('BD preflight: no Ollama, no filesystem write, no new model request',async()=>{
 const ctx=caseDir();let network=0,runner=0;
 try{
  const probe=await runR190BDStudy({
   sourceDir:ctx.prepared,model:'qwen3:14b',outputDir:ctx.out,approved:false
  },{fetcher:()=>{network++;throw Error('NETWORK_NOT_ALLOWED')},
   modelRunner:()=>{runner++;throw Error('MODEL_NOT_ALLOWED')}});
  assert.equal(probe.status,'NOT_APPROVED_NO_PROVIDER_CALL');
  assert.equal(probe.newModelRequests,0);
  assert.equal(network,0);assert.equal(runner,0);
  assert.equal(fs.existsSync(ctx.out),false);
  const inspect=inspectR190BDPrepared(ctx.prepared);
  assert.equal(inspect.promptSha256,probe.exactDesignFirstPromptSha256);
  assert.match(inspect.prompt,/断面/);
  assert.deepEqual(probe.gates,Array(9).fill('BLOCKED'));
  assert.equal(probe.worldWrites,0);
 }finally{fs.rmSync(ctx.base,{recursive:true,force:true});}
});
test('BD rejects tampered brief and tampered prompt even in preflight',async()=>{
 const ctx=caseDir();
 try{
  fs.appendFileSync(path.join(ctx.prepared,'DESIGN_FIRST_PROMPT.txt'),' injected');
  await assert.rejects(runR190BDStudy({
   sourceDir:ctx.prepared,model:'qwen3:14b',outputDir:ctx.out,approved:false
  }),/R190BD_PREPARED_SHA_OR_SAFETY/);
  assert.equal(fs.existsSync(ctx.out),false);
  const m=JSON.parse(fs.readFileSync(path.join(ctx.prepared,'R190BC_PROMPT_RECEIPT.json')));
  m.modelRequestPromptSha256=hash(fs.readFileSync(path.join(ctx.prepared,'DESIGN_FIRST_PROMPT.txt')));
  fs.writeFileSync(path.join(ctx.prepared,'R190BC_PROMPT_RECEIPT.json'),JSON.stringify(m));
  await assert.rejects(runR190BDStudy({
   sourceDir:ctx.prepared,model:'qwen3:14b',outputDir:ctx.out,approved:false
  }),/R190BD_PREPARED_PROMPT_MISMATCH/);
 }finally{fs.rmSync(ctx.base,{recursive:true,force:true});}
});
test('BD explicit one-shot mock runner saves original B143 plus SOURCE section, no host repair',async()=>{
 const ctx=caseDir();let n=0;const answer=syntheticOriginal();
 const fetcher=async(url,options)=>{
  n++;
  assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
  assert.equal(options.redirect,'error');
  const payload=JSON.parse(options.body);
  assert.equal(payload.model,'qwen3:14b');
  assert.equal(payload.messages[1].content.includes('設計先行'),true);
  return {ok:true,json:async()=>({choices:[{
   finish_reason:'stop',message:{content:answer}}]})};
 };
 try{
  const r=await runR190BDStudy({
   sourceDir:ctx.prepared,model:'qwen3:14b',outputDir:ctx.out,approved:true
  },{fetcher});
  assert.equal(n,1);
  assert.equal(r.status,'CAPTURED_SOURCE_ONLY_ART_HOLD');
  assert.equal(r.modelRawSha256,hash(Buffer.from(answer)));
  assert.equal(r.providerResponseComplete,true);
  assert.equal(r.modelCallsInThisAttemptAtMost,1);
  assert.equal(r.worldWrites,0);
  assert.equal(r.hostRepairs,0);
  assert.equal(r.art,'ART_HOLD');
  assert.equal(r.independentJapaneseRequirementCoverage,'NOT_CERTIFIED');
  assert.equal(fs.readFileSync(path.join(ctx.out,'model-original','R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),answer);
  const proof=JSON.parse(fs.readFileSync(path.join(ctx.out,'R190BD_SECTION_AUDIT.json')));
  assert.equal(proof.originalUnmodified,true);
  assert.equal(proof.originalSha256,r.modelRawSha256);
  assert.equal(proof.worldContacts,0);
  assert(fs.readFileSync(path.join(ctx.out,'R190BD_SOURCE_SECTION.svg'),'utf8').includes('<svg'));
  await assert.rejects(runR190BDStudy({
   sourceDir:ctx.prepared,model:'qwen3:14b',outputDir:ctx.out,approved:true
  },{fetcher:()=>{throw Error('SECOND_MODEL_CALL_FORBIDDEN')}}),/R190BD_FRESH_OUTPUT_REQUIRED/);
  assert.equal(n,1);
 }finally{fs.rmSync(ctx.base,{recursive:true,force:true});}
});
test('BD completed but invalid mock model original remains HOLD, never repaired',async()=>{
 const ctx=caseDir();const answer='{"wrong":"fields"}';
 try{
  const r=await runR190BDStudy({
   sourceDir:ctx.prepared,model:'gemma4:26b',outputDir:ctx.out,approved:true
  },{fetcher:async()=>({ok:true,json:async()=>({choices:[{
   finish_reason:'stop',message:{content:answer}}]})})});
  assert.equal(r.status,'CAPTURED_SOURCE_ONLY_ART_HOLD');
  assert.equal(r.sourceSectionStatus,'HOLD_INVALID_ORIGINAL_R4_OR_B143');
  assert.equal(r.originalSourceGeometrySha256,null);
  assert.equal(fs.readFileSync(path.join(ctx.out,'model-original','R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),answer);
  assert.match(fs.readFileSync(path.join(ctx.out,'R190BD_SOURCE_SECTION.svg'),'utf8'),/HOLD/);
  assert.equal(fs.existsSync(path.join(ctx.out,'model-original','R190_H_REAL_B143_3D.html')),false);
 }finally{fs.rmSync(ctx.base,{recursive:true,force:true});}
});
test('BD failed connection leaves irreversible attempt marker, no automatic retry',async()=>{
 const ctx=caseDir();let n=0;
 try{
  const r=await runR190BDStudy({
   sourceDir:ctx.prepared,model:'qwen3:14b',outputDir:ctx.out,approved:true
  },{fetcher:async()=>{n++;throw Error('SIMULATED_PROVIDER_DISCONNECT')}});
  assert.equal(n,1);
  assert.equal(r.status,'HOLD_NO_VERIFIED_PROVIDER_CAPTURE');
  assert.equal(r.possibleProviderConsumption,true);
  assert.equal(fs.existsSync(path.join(ctx.out,'R190BD_ATTEMPT.json')),true);
  await assert.rejects(runR190BDStudy({
   sourceDir:ctx.prepared,model:'qwen3:14b',outputDir:ctx.out,approved:true
  },{fetcher:()=>{n++;throw Error('RETRY_FORBIDDEN')}}),/R190BD_FRESH_OUTPUT_REQUIRED/);
  assert.equal(n,1);
 }finally{fs.rmSync(ctx.base,{recursive:true,force:true});}
});
test('BD refuses non-local network even from mocked internal runner',async()=>{
 const ctx=caseDir();let network=0;
 try{
  const r=await runR190BDStudy({
   sourceDir:ctx.prepared,model:'qwen3:14b',outputDir:ctx.out,approved:true
  },{
   modelRunner:async(_options,{fetcher})=>fetcher('https://example.org/api',{
    method:'POST',redirect:'error'}),
   fetcher:()=>{network++;throw Error('BLOCK_NETWORK')}
  });
  assert.equal(network,0);
  assert.equal(r.status,'HOLD_NO_VERIFIED_PROVIDER_CAPTURE');
  assert.equal(fs.existsSync(path.join(ctx.out,'R190BD_ATTEMPT.json')),true);
 }finally{fs.rmSync(ctx.base,{recursive:true,force:true});}
});
test('BD CLI parsing fails closed: no implicit consent, duplicate flag or unknown model',()=>{
 assert.deepEqual(parseR190BDArgs(['--help']),{help:true});
 const a=parseR190BDArgs(['--from','/tmp/source','--model','qwen3:14b','--out','/tmp/out']);
 assert.equal(a.approved,false);
 const b=parseR190BDArgs(['--from','/tmp/source','--model','gemma4:26b','--out','/tmp/out','--confirm-one-local-request']);
 assert.equal(b.approved,true);
 assert.throws(()=>parseR190BDArgs(['--from','x','--model','qwen3:14b','--out','x','--confirm-one-local-request','--confirm-one-local-request']),/R190BD_ARGS/);
 assert.throws(()=>parseR190BDArgs(['--from','x','--model','unknown:1','--out','x']),/R190BD_INPUTS/);
});
