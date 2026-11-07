import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {R47_JSON_SCHEMA}
 from '../source/ai/b198zr47-json-schema-format-gate.mjs';
import {R46_GUIDE}
 from '../source/ai/b198zr46-corrected-architecture-guide.mjs';
import {R50_ARCHITECTURE_GUIDE,R50_GUIDE_SHA256,
 R50_NATIVE_SCHEMA_SHA256,r50HumanIntentPacket,inspectR50OnePassGuide}
 from '../source/ai/b198zr50-program-first-architecture-guide.mjs';
import {R47_JSON_SCHEMA_SHA256}
 from '../source/ai/b198zr47-json-schema-format-gate.mjs';
import {createB198SNativeBridge}
 from '../source/ai/b198s-native-ollama-source.mjs';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
test('R50 guidance focuses on live air, supported routes, exact extents, artistic freedom',()=>{
 const r=inspectR50OnePassGuide();
 assert.equal(r.guideSha256,sha(R50_ARCHITECTURE_GUIDE));
 assert.equal(r.guideSha256,R50_GUIDE_SHA256);
 assert.equal(r.nativeJsonSchemaSha256,R47_NATIVE_SCHEMA_SHA256());
 assert.equal(r.activation,'NOT_ENABLED');
 assert.equal(r.frozenCases,12);
 assert.equal(r.distinctFrozenPrograms,12);
 assert.equal(r.historicalCoordinatesLeaked.length,0);
 for(const phrase of ['SAME idea','usable','standing','staircase',
  'max(abs(x-ex)+abs(z-ez),abs(y-ey))','zero-occupied',
  'upper limits','JSON Schema','human']){
  assert(R50_ARCHITECTURE_GUIDE.toLowerCase().includes(phrase.toLowerCase()),phrase);
 }
 assert.equal(r.realQwenImprovementProven,false);
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldWrites,0);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
});
const R47_NATIVE_SCHEMA_SHA256=()=>R47_JSON_SCHEMA_SHA256;
test('R50 every frozen Japanese case retains independent human criteria and no geometric template',()=>{
 for(const item of CREATION_CASES){
  const p=r50HumanIntentPacket(item.id);
  assert.equal(p.caseId,item.id);
  assert.equal(p.frozenJapanesePrompt,item.prompt);
  assert.equal(p.originalPromptSha256,sha(item.prompt));
  assert.deepEqual(p.humanCriteria.map(x=>x.description),
   item.criteria.map(x=>x.description));
  assert(p.humanCriteria.every(x=>x.humanVisualAndSemanticJudgmentRequired));
  assert.equal(p.sourceIndependentFromModelSpatialPlan,true);
  assert.equal(p.noCoordinatesOrFixedGeometryInjected,true);
  assert.equal(p.modelCalls,0);
 }
 assert.notEqual(r50HumanIntentPacket('c01').frozenJapanesePrompt,
  r50HumanIntentPacket('c03').frozenJapanesePrompt);
 assert.throws(()=>r50HumanIntentPacket('c99'),/B198ZR50_FROZEN_CREATION_CASE_REQUIRED/);
});
async function fakeServer(raw){
 const calls=[];
 const server=http.createServer(async(req,res)=>{
  assert.equal(req.url,'/api/chat');
  assert.equal(req.method,'POST');
  let s='';
  for await(const c of req)s+=c.toString();
  calls.push(JSON.parse(s));
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({done:true,done_reason:'stop',
   message:{content:raw},eval_count:100,prompt_eval_count:270,
   total_duration:2500000000,eval_duration:1600000000}));
 });
 return await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve({
   calls,port:server.address().port,
   close:()=>new Promise(done=>server.close(done))
  }));
 });
}
const getGenerator=(fake,bridge)=>createB198GLocalModelAdapter({
 model:'qwen3.8:27b',
 endpoint:'http://127.0.0.1:'+fake.port+'/v1/chat/completions',
 fetcher:bridge.fetcher,timeoutMs:20000,plannedSourceMode:true
});
test('R50 future opt-in sends exactly one schema-constrained request with new guide',async()=>{
 const raw=JSON.stringify(r32Courtyard());
 const fake=await fakeServer(raw),saved=[];
 try{
  const b=createB198SNativeBridge({plannedSourceMode:true,
   r50ProgramFirstGuide:true,onModelResponse:x=>saved.push(x.originalContent)});
  assert.equal(b.requestBudget.r50ProgramFirstProfileOptIn,true);
  assert.equal(b.requestBudget.r50ProgramFirstGuideSha256,R50_GUIDE_SHA256);
  assert.equal(b.requestBudget.r50StructuredJsonSchemaSha256,
   R47_JSON_SCHEMA_SHA256);
  assert.equal(b.requestBudget.r47SchemaFormatOptIn,false);
  await getGenerator(fake,b)({
   mode:'creation',prompt:r50HumanIntentPacket('c01').frozenJapanesePrompt,
   attempt:1,maxAttempts:1});
  assert.equal(fake.calls.length,1);
  const sent=fake.calls[0];
  assert.equal(sent.messages[0].content,R50_ARCHITECTURE_GUIDE);
  assert.deepEqual(sent.format,R47_JSON_SCHEMA);
  assert.equal(sent.messages[1].content.includes('海沿い'),true);
  assert.equal(sent.options.num_predict,3072);
  assert.equal(sent.options.num_ctx,6144);
  assert.equal(sent.think,false);
  assert.equal(sent.stream,false);
  assert.deepEqual(saved,[raw]);
  assert.equal(b.telemetry()[0].rawModelOutputEvidenceStored,true);
 }finally{await fake.close()}
});
test('R50 optional mode leaves historical R48 output and R46 JSON settings untouched',async()=>{
 const raw=JSON.stringify(r32Courtyard());
 const fake=await fakeServer(raw);
 try{
  const old=createB198SNativeBridge({
   plannedSourceMode:true,r47SchemaFormat:true});
  assert.equal(old.requestBudget.r50ProgramFirstProfileOptIn,false);
  await getGenerator(fake,old)({
   mode:'creation',prompt:CREATION_CASES[0].prompt,attempt:1,maxAttempts:1});
  assert.equal(fake.calls.length,1);
  assert.deepEqual(fake.calls[0].format,R47_JSON_SCHEMA);
  assert.notEqual(fake.calls[0].messages[0].content,R50_ARCHITECTURE_GUIDE);
  assert(fake.calls[0].messages[0].content.startsWith(R46_GUIDE));
  const oldJson=createB198SNativeBridge({
   plannedSourceMode:true,r46CorrectedGuide:true});
  await getGenerator(fake,oldJson)({
   mode:'creation',prompt:CREATION_CASES[0].prompt,attempt:1,maxAttempts:1});
  assert.equal(fake.calls.length,2);
  assert.equal(fake.calls[1].format,'json');
  assert.equal(fake.calls[1].messages[0].content,R46_GUIDE);
 }finally{await fake.close()}
});
test('R50 forbids ambiguous profile stacking and non-planned or no-guide use',()=>{
 for(const conflict of [
  {r47SchemaFormat:true},{r46CorrectedGuide:true},
  {r44SpaceGuide:true},{r22QualityGuide:true},
  {compactPlannedGuide:true},{plannedSourceMode:false},
  {addArchitectureGuide:false}
 ]){
  assert.throws(()=>createB198SNativeBridge({
   plannedSourceMode:true,addArchitectureGuide:true,
   r50ProgramFirstGuide:true,...conflict
  }),/R50_PROGRAM_GUIDE_REQUIRES_EXCLUSIVE_PLANNED_MODE/);
 }
 assert.throws(()=>createB198SNativeBridge({
  plannedSourceMode:true,r50ProgramFirstGuide:'yes'
 }),/R50_PROGRAM_GUIDE_REQUIRES_EXCLUSIVE_PLANNED_MODE/);
});
