import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createR125ArchitecturePlanLocalAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {runR125LocalArchitecturePlan,parseR125LocalPlanArgs}
 from './r125-local-architecture-plan-run.mjs';
import {diagnoseR125ArchitecturePlanOriginal}
 from './r125-offline-replay.mjs';

const original=fs.readFileSync(
 new URL('../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
 import.meta.url),'utf8');
const digest=s=>createHash('sha256').update(s).digest('hex');
const provider=raw=>({ok:true,json:async()=>({
 choices:[{message:{content:raw},finish_reason:'stop'}]})});
const prompt='未知の用途に対応し、入口・屋内動線・採光を持つ独創的な店舗を設計してください。';

test('existing real Qwen original replays through the unchanged B143 and circulation',()=>{
 const r=diagnoseR125ArchitecturePlanOriginal(original);
 assert.equal(r.originalSha256,digest(original));
 assert.equal(r.status,'B143_SOURCE_CANDIDATE_ART_HOLD');
 assert.equal(r.sourceVerified,true);
 assert.equal(r.occupiedVoxels,1336);
 assert.equal(r.modelCalls,0);
 assert.equal(r.artStatus,'NOT_REVIEWED');
 assert.equal(r.worldWrites,0);
});

test('new R125 adapter has no direct B143 fallback, remote endpoint, or implicit POST',async()=>{
 let posts=0;
 const fake=async()=>{posts++;return provider(original);};
 for(const endpoint of [
  'https://api.openai.com/v1/chat/completions',
  'http://localhost:11434/v1/chat/completions',
  'http://127.0.0.2:11434/v1/chat/completions',
  'http://127.0.0.1:11434/unsafe'
 ])assert.throws(()=>createR125ArchitecturePlanLocalAdapter({
   model:'qwen3:14b',endpoint,fetcher:fake,onRawModelResponse:()=>{}
  }),/B198G_LOCAL_ONLY_EXPLICIT/);
 assert.throws(()=>createR125ArchitecturePlanLocalAdapter({
  model:'qwen3:14b',fetcher:fake
 }),/B198G_LOCAL_REQUIRED_RAW_CAPTURE_CALLBACK/);
 const captured=[];
 const author=createR125ArchitecturePlanLocalAdapter({
  model:'qwen3:14b',fetcher:async(url,opts)=>{
   posts++;
   assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
   const request=JSON.parse(opts.body);
   assert.equal(request.stream,false);
   assert.equal(request.messages[1].role,'user');
   assert.equal(request.messages[0].content.includes('B143 elements'),true);
   assert.equal(request.messages[0].content.includes('footprint'),true);
   assert.equal(request.messages[0].content.includes('No fixed building-type template'),true);
   assert.equal(request.messages[1].content.includes('sourceOnly'),true);
   assert.equal(opts.headers.Authorization,undefined);
   return provider(original);
  },onRawModelResponse:x=>captured.push(x)
 });
 assert.equal(posts,0);
 const out=await author({prompt});
 assert.equal(posts,1);
 assert.deepEqual(captured,[original]);
 assert.equal(out.originalSha256,digest(original));
 assert.equal(out.plan.schema,'minecraftaibuilder-r125-architecture-plan-v1');
 assert.equal(out.sourceVerified,false);
});

test('one call records raw and true SOURCE, without privately leaking raw into report',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-plan-'));
 const dest=path.join(root,'result');
 let requests=0;
 try{
  const out=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:dest
  },{fetcher:async()=>{requests++;return provider(original)}});
  assert.equal(requests,1);
  assert.equal(out.report.status,'B143_SOURCE_CANDIDATE_ART_HOLD');
  assert.equal(out.report.sourceVerified,true);
  assert.equal(out.report.originalSha256,digest(original));
  assert.equal(out.report.modelResponsesCaptured,1);
  assert.equal(fs.readFileSync(path.join(dest,'REQUEST_ORIGINAL.txt'),'utf8'),prompt);
  assert.equal(out.report.requestSha256,digest(prompt));
  assert.deepEqual(out.report.requestedGenerationSettings,{
   temperature:0.55,responseFormat:'json_object',
   maxOutputTokens:4096,reasoningEffort:null,timeoutMs:180000
  });
  assert.equal(out.report.nineWorldGates.length,9);
  assert.ok(out.report.nineWorldGates.every(x=>x==='BLOCKED'));
  assert.equal(out.report.artStatus,'NOT_REVIEWED');
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
  const diag=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diag.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(diag.circulation,'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(diag.modelAuthorshipVerified,false);
  const runText=fs.readFileSync(path.join(dest,'RUN_REPORT.json'),'utf8');
  assert.equal(runText.includes('Customer retail display and sales'),false);
  assert.ok(fs.existsSync(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json')));
  const viewer=fs.readFileSync(path.join(dest,
   'B143_SOURCE_3D_REVIEW_ONLY.html'),'utf8');
  assert.ok(viewer.includes('minecraftaibuilder-b143-gallery-v1'));
  assert.ok(viewer.includes(diag.geometrySha256));
  assert.equal(out.report.review3d,'TRUE_B143_HTML_GENERATED_ART_PENDING');

 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('invalid response is captured verbatim but never repaired, re-requested or promoted',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-hold-'));
 const dest=path.join(root,'result');
 let requests=0;
 try{
  const out=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:dest
  },{fetcher:async()=>{requests++;return provider('{"schema":');}});
  assert.equal(requests,1);
  assert.equal(out.report.status,'HOLD_MODEL_OR_SOURCE');
  assert.equal(out.report.modelResponsesCaptured,1);
  assert.equal(out.report.originalSha256,digest('{"schema":'));
  assert.equal(out.report.automaticRetries,0);
  assert.equal(out.report.sourceVerified,false);
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),'{"schema":');
  assert.equal(fs.existsSync(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('CLI insists on explicit model/prompt/new private path',()=>{
 assert.deepEqual(parseR125LocalPlanArgs(['--help']),{help:true});
 assert.throws(()=>parseR125LocalPlanArgs(['--model','qwen3:14b']),
  /ARGS_MODEL_PROMPT_OUT_REQUIRED/);
 assert.equal(parseR125LocalPlanArgs(['--model','qwen3:14b','--prompt',
  prompt,'--out','somewhere']).model,'qwen3:14b');
});
