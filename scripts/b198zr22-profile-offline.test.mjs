/**
 * R22 isolated quality-profile transport tests. Loopback ephemeral FAKE
 * Ollama is bound by this test, not the user's 11434 server. Zero actual
 * model calls, no real GPU, no Minecraft and no generated architecture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createB198SNativeBridge}
 from '../source/ai/b198s-native-ollama-source.mjs';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {R11_COMPACT_GUIDE,R11_GUIDE_SHA256}
 from '../source/ai/b198zr11-compact-r4-output.mjs';
import {R21_FUTURE_GUIDE,R21_FUTURE_GUIDE_SHA256,
 R21_REAL_MODEL_CALLS_AUTHORIZED_BY_MODULE}
 from '../source/ai/b198zr21-future-architecture-guide.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const answer=JSON.stringify({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'r22-ci-fixture-only',title:'Mock building not Qwen-authored',
  brief:'A deterministic offline test response, not an architectural achievement.',
  bounds:{width:18,height:12,depth:18},designOnly:true,elements:[
   {id:'floor',shape:'box',mode:'add',material:'concrete',
    origin:[0,0,0],size:[18,1,18]},
   {id:'rim',shape:'box',mode:'add',material:'glass',
    origin:[1,1,1],size:[16,6,16],shell:1},
   {id:'atrium',shape:'box',mode:'cut',
    origin:[4,1,4],size:[10,6,10]},
   {id:'entry',shape:'box',mode:'cut',
    origin:[8,1,1],size:[3,3,3]}
  ]},
 spatialPlan:{designIntent:'Public covered meeting room for visitors.',
  massStrategy:'Simple rectangular shell with central open floor.',
  circulationStrategy:'Direct walk from entry to public floor.',
  entrance:[9,1,2],headroom:2,
  protectedVoids:[{id:'open-air',origin:[6,1,6],size:[4,4,4],maxOccupiedCells:0}],
  destinations:[{id:'rear',point:[9,1,11],maximumPathSteps:30}],
  functionalZones:[{id:'open-floor',origin:[5,1,5],size:[8,1,8],
   minimumReachablePositions:60,minimumReachablePercent:75}]},
 explanation:'Fixture only. No model trained or evaluated.',
 assumptions:['Minecraft construction remains forbidden.']
});
const prompt='海沿いに、屋根まで続く吹き抜けを備えた独創的な図書館を設計してください。';

function createFake(){
 const requests=[];
 const server=http.createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/api/chat'){
   res.writeHead(403);res.end();return;
  }
  let text='';for await(const block of req)text+=block;
  requests.push(JSON.parse(text));
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({done:true,done_reason:'stop',
   message:{content:answer},eval_count:123,prompt_eval_count:998,
   total_duration:1100000000,eval_duration:1000000000}));
 });
 return new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve({
   port:server.address().port,requests,
   close:()=>new Promise(done=>server.close(done))}));
 });
}
test('R22 quality profile is SHA-pinned, distinct from frozen R11 and cannot self-authorize generation',()=>{
 assert.equal(sha(R21_FUTURE_GUIDE),R21_FUTURE_GUIDE_SHA256);
 assert(R21_FUTURE_GUIDE.startsWith(R11_COMPACT_GUIDE+'\n'));
 assert.equal(sha(R11_COMPACT_GUIDE),R11_GUIDE_SHA256);
 assert(R21_FUTURE_GUIDE.includes('including staircase, cylinder'));
 assert(R21_FUTURE_GUIDE.includes('maxOccupiedCells'));
 assert(R21_FUTURE_GUIDE.includes('straight beams alone are NOT curves'));
 assert.equal(R21_REAL_MODEL_CALLS_AUTHORIZED_BY_MODULE,0);
});
test('R22 opt-in rejects unplanned, unguided or dual R11+R22 request before any transport',()=>{
 const r11=createB198SNativeBridge({
  plannedSourceMode:true,compactPlannedGuide:true});
 assert.equal(r11.requestBudget.r11CompactOutputProfileOptIn,true);
 assert.equal(r11.requestBudget.r22QualityOutputProfileOptIn,false);
 assert.equal(r11.requestBudget.r11CompactGuideSha256,R11_GUIDE_SHA256);
 assert.equal(r11.requestBudget.r22QualityGuideSha256,null);
 const legacy=createB198SNativeBridge({});
 assert.equal(legacy.requestBudget.r22QualityOutputProfileOptIn,false);
 for(const invalid of [
  {r22QualityGuide:true},
  {plannedSourceMode:true,r22QualityGuide:true,addArchitectureGuide:false},
  {plannedSourceMode:true,compactPlannedGuide:true,r22QualityGuide:true},
  {plannedSourceMode:true,r22QualityGuide:'true'}
 ]){
  assert.throws(()=>createB198SNativeBridge(invalid),
   /R22_QUALITY_REQUIRES_DISTINCT_PLANNED_GUIDE/);
 }
 assert.equal(r11.telemetry().length,0);
 assert.equal(legacy.telemetry().length,0);
});
test('R22 manually opted-in request sends exact guide once and preserves FAKE model raw unmodified',async()=>{
 const fake=await createFake(),saved=[];
 try{
  const bridge=createB198SNativeBridge({
   plannedSourceMode:true,r22QualityGuide:true,numPredict:3072,numCtx:6144,
   onModelResponse:v=>saved.push(v)
  });
  const generate=createB198GLocalModelAdapter({
   model:'R22_FAKE_OFFLINE_FIXTURE',
   endpoint:'http://127.0.0.1:'+fake.port+'/v1/chat/completions',
   fetcher:bridge.fetcher,plannedSourceMode:true
  });
  assert.equal(fake.requests.length,0,'creating bridge and adapter cannot call a model');
  const proposal=await generate({
   mode:'creation',prompt,attempt:1,maxAttempts:1});
  assert.equal(proposal.design.id,'r22-ci-fixture-only');
  assert.equal(fake.requests.length,1,'single explicitly injected fake HTTP request');
  assert.equal(saved.length,1);
  assert.equal(saved[0].originalContent,answer);
  assert.equal(saved[0].correctedContent,answer);
  assert.equal(saved[0].metadataRepair.applied,false);
  assert.equal(saved[0].boundsRepair.applied,false);
  assert.equal(sha(saved[0].originalContent),sha(answer));
  const req=fake.requests[0];
  assert.equal(req.messages[0].content,R21_FUTURE_GUIDE);
  assert.equal(req.messages[0].role,'system');
  assert.equal(req.messages[1].role,'user');
  assert(req.messages[1].content.includes(prompt));
  assert.equal(req.model,'R22_FAKE_OFFLINE_FIXTURE');
  assert.equal(req.format,'json');
  assert.equal(req.think,false);
  assert.equal(req.stream,false);
  assert.equal(req.options.num_predict,3072);
  assert.equal(req.options.num_ctx,6144);
  const budget=bridge.requestBudget;
  assert.equal(budget.r22QualityOutputProfileOptIn,true);
  assert.equal(budget.r22QualityGuideSha256,R21_FUTURE_GUIDE_SHA256);
  assert.equal(budget.r11CompactOutputProfileOptIn,false);
  assert.equal(budget.r11CompactGuideSha256,null);
  assert.equal(budget.worldWrites,0);
  assert.equal(bridge.telemetry().length,1);
  assert.equal(bridge.telemetry()[0].outcome,'MODEL_RETURNED');
 }finally{await fake.close()}
});
test('R22 original R11 path still sends frozen byte-identical system guide',async()=>{
 const fake=await createFake();
 try{
  const bridge=createB198SNativeBridge({
   plannedSourceMode:true,compactPlannedGuide:true
  });
  const gen=createB198GLocalModelAdapter({
   model:'R22_FAKE_OFFLINE_FIXTURE',
   endpoint:'http://127.0.0.1:'+fake.port+'/v1/chat/completions',
   fetcher:bridge.fetcher,plannedSourceMode:true
  });
  await gen({mode:'creation',prompt,attempt:1,maxAttempts:1});
  assert.equal(fake.requests.length,1);
  assert.equal(fake.requests[0].messages[0].content,R11_COMPACT_GUIDE);
  assert.equal(bridge.requestBudget.r22QualityOutputProfileOptIn,false);
 }finally{await fake.close()}
});
