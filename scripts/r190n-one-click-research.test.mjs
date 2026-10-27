/** R190-N local-first one-click launcher. These are mock tests, not LLM inference. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseR190NArgs,chooseR190NModel,runR190NStudy,STUDY_BRIEF}
 from './r190n-one-click-research.mjs';
const schema='minecraftaibuilder-r190-model-proposal-v1';
const specimen=()=>({schema,semanticPlan:{
 schema:'minecraftaibuilder-r190-semantic-space-v1',
 id:'r190n-mock',title:'Mock recycled material workshop',
 brief:'Synthetic single-level program; not evidence of genuine model reasoning.',
 site:{width:76,depth:76,height:24},entrySpaceId:'display-room',
 materials:{floor:'wood',wall:'stone',roof:'metal'},
 spaces:[
  {id:'display-room',purpose:'漂着物の展示室',width:17,depth:13,height:10,
   parentId:null,side:null,privacy:'public'},
  {id:'repair-room',purpose:'漂着素材の修理工房',width:13,depth:14,height:9,
   parentId:'display-room',side:'north',privacy:'shared'},
  {id:'storage-room',purpose:'再生資材保管室',width:10,depth:12,height:7,
   parentId:'repair-room',side:'east',privacy:'private'}
 ],
 roofFormIntent:{spaceId:'display-room',profile:'sawtooth',axis:'x',
  rise:4,toothWidth:5}
 },architecturalRationale:'Synthetically organized visitor repair and storage workspaces.',
 assumptions:['Flat site only'],unrepresentedRequirements:[]});
const mockResponse=raw=>async (url,opts)=>{
 if(url==='http://127.0.0.1:11434/api/tags')
  return {ok:true,json:async()=>({models:[{name:'qwen3:14b'},{name:'gemma4:26b'}]})};
 assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
 const packet=JSON.parse(opts.body);assert.equal(packet.model,'qwen3:14b');
 return {ok:true,json:async()=>({choices:[{
  finish_reason:'stop',message:{content:raw}}]})};
};
test('N: option validation and deterministic offline model selection',()=>{
 assert.deepEqual(parseR190NArgs([]),{model:null,fresh:false,replay:null});
 assert.equal(parseR190NArgs(['--fresh']).fresh,true);
 assert.throws(()=>parseR190NArgs(['--fresh','--replay','x']),/CONFLICT/);
 assert.throws(()=>parseR190NArgs(['--model','bad name']),/INVALID_MODEL_ID/);
 assert.throws(()=>parseR190NArgs(['--model','qwen3:14b','--model','qwen3:14b']),/INVALID_OPTION/);
 assert.equal(chooseR190NModel(['gemma4:26b','qwen3:14b']),'qwen3:14b');
 assert.equal(chooseR190NModel(['qwen3.8:27b'],'qwen3.8:27b'),'qwen3.8:27b');
 assert.throws(()=>chooseR190NModel(['random:1b']),/NO_INSTALLED_QWEN_OR_GEMMA/);
 assert.throws(()=>chooseR190NModel(['qwen3:14b'],'qwen3.8:27b'),/REQUESTED_MODEL_NOT_INSTALLED/);
});
test('N: one genuine-model-shaped mock run then zero-network evidence reuse',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190n-'));
 let requests=0;
 try{
  const provider=mockResponse(JSON.stringify(specimen()));
  const fetcher=async(...a)=>{requests++;return provider(...a);};
  const first=await runR190NStudy([],{
   evidenceRoot:root,fetcher,timestamp:()=>100
  });
  assert.equal(requests,2); // only /api/tags and one /v1/chat/completions
  assert.equal(first.actualNewModelRequests,1);
  assert.equal(first.sourceGenerated,true);
  assert.equal(first.sourceKind,'HOST_DETERMINISTIC_B143_FROM_MODEL_SEMANTIC_IR');
  assert.equal(first.independentBriefAcceptance,'VERIFIED_EXPLICIT_PROGRAM_IN_B143');
  const original=JSON.stringify(specimen());
  assert.equal(fs.readFileSync(path.join(first.directory,
   'R190_M_UNMODIFIED_MODEL_RESPONSE.txt'),'utf8'),original);
  assert.equal(fs.existsSync(path.join(first.directory,
   'R190_M_HOST_PROJECTED_REAL_B143_3D.html')),true);
  const second=await runR190NStudy([],{evidenceRoot:root,
   fetcher:async()=>{throw Error('NO_MORE_NETWORK');},timestamp:()=>101});
  assert.equal(second.reused,true);
  assert.equal(second.actualNewModelRequests,0);
  assert.equal(second.originalRawSha256,first.originalRawSha256);
  assert.equal(second.directory,first.directory);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('N: explicit --fresh makes exactly one new inference, explicit --model must be installed',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190n-fresh-'));
 let chat=0;
 const provider=mockResponse(JSON.stringify(specimen()));
 try{
  const fetcher=async(url,opts)=>{
   if(url.endsWith('/chat/completions'))chat++;
   return provider(url,opts);
  };
  await runR190NStudy([],{evidenceRoot:root,fetcher,timestamp:()=>102});
  const second=await runR190NStudy(['--fresh'],{
   evidenceRoot:root,fetcher,timestamp:()=>103});
  assert.equal(second.actualNewModelRequests,1);assert.equal(chat,2);
  assert.equal(second.reused,false);
  await assert.rejects(()=>runR190NStudy(['--fresh','--model','not-installed'],{
   evidenceRoot:root,fetcher,timestamp:()=>104
  }),/REQUESTED_MODEL_NOT_INSTALLED/);
  assert.equal(chat,2);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('N: offline replay does not inspect Ollama or call any provider',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190n-replay-'));
 const raw=path.join(root,'response.txt');
 fs.writeFileSync(raw,JSON.stringify(specimen()));
 try{
  const r=await runR190NStudy(['--replay',raw],{
   evidenceRoot:root,
   fetcher:async()=>{throw Error('FORBIDDEN_NETWORK');},timestamp:()=>105});
  assert.equal(r.reused,false);assert.equal(r.actualNewModelRequests,0);
  assert.equal(r.sourceGenerated,true);
  const manifest=JSON.parse(fs.readFileSync(path.join(r.directory,
   'R190N_STUDY_MANIFEST.json'),'utf8'));
  assert.equal(manifest.replayOnly,true);
  assert.equal(manifest.modelWasInLocalTagList,false);
  assert.equal(manifest.modelIdentityCryptographicallyVerified,false);
  assert.equal(r.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('N: invalid model output is HOLD with its raw source retained and no fake preview',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190n-hold-'));
 try{
  const p=specimen();delete p.semanticPlan.spaces[0].width;
  const raw=JSON.stringify(p);
  const r=await runR190NStudy([],{evidenceRoot:root,
   fetcher:mockResponse(raw),timestamp:()=>106});
  assert.equal(r.status,'HOLD_ORIGINAL_SEMANTIC_RESPONSE_REJECTED');
  assert.equal(r.sourceGenerated,false);
  assert.equal(r.modelRunnerHOLD,true);
  assert.equal(fs.existsSync(path.join(r.directory,
   'R190_M_HOST_PROJECTED_REAL_B143_3D.html')),false);
  assert.equal(fs.readFileSync(path.join(r.directory,
   'R190_M_UNMODIFIED_MODEL_RESPONSE.txt'),'utf8'),raw);
  assert.equal(fs.existsSync(path.join(r.directory,
   'R190N_STUDY_MANIFEST.json')),true);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('N: disconnected local Ollama does not invent raw model evidence or folder',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190n-down-'));
 try{
  await assert.rejects(()=>runR190NStudy([],{evidenceRoot:root,
   fetcher:async()=>{throw Error('ECONNREFUSED');},timestamp:()=>107
  }),/LOCAL_OLLAMA_UNAVAILABLE/);
  assert.equal(fs.readdirSync(root).length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
