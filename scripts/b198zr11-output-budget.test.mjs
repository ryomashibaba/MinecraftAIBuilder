/**
 * B198Z-R11 — NO real Qwen, GPU, model download, Minecraft or network.
 * A throwaway HTTP server binds 127.0.0.1:<ephemeral port>.
 * All model responses originate in fixtures.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {R11_COMPACT_GUIDE,R11_GUIDE_SHA256,inspectR11OriginalRaw,
 PROFILE} from '../source/ai/b198zr11-compact-r4-output.mjs';
import {createB198SNativeBridge}
 from '../source/ai/b198s-native-ollama-source.mjs';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {runR6AuthorizedCapture,EXPLICIT_AUTHORIZATION,parseR6Args}
 from './b198zr6-authorized-single-r4-capture.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';

const model='R11_FAKE_QWEN_FIXTURE';
const sha=s=>createHash('sha256').update(s).digest('hex');
const fixture=()=>({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'r11-compact-fixture',title:'Fictional hall for test-only use',
  brief:'Not Qwen-generated or actually Minecraft-built.',
  bounds:{width:22,height:15,depth:20},designOnly:true,elements:[
   {id:'ground',shape:'box',mode:'add',material:'concrete',
    origin:[0,0,0],size:[22,1,20]},
   {id:'edge-columns',shape:'box',mode:'add',material:'metal',
    origin:[2,1,2],size:[1,6,1],repeat:{count:4,offset:[5,0,0]}},
   {id:'roof-shell',shape:'box',mode:'add',material:'glass',
    origin:[1,1,1],size:[20,8,18],shell:1},
   {id:'hollow-atrium',shape:'box',mode:'cut',
    origin:[4,1,4],size:[12,8,12]},
   {id:'opening',shape:'box',mode:'cut',
    origin:[7,1,1],size:[4,3,3]}
  ]},
 spatialPlan:{
  designIntent:'Public visitors are invited into the central hollow hall.',
  massStrategy:'An independent roof envelope with open courtyard and columns.',
  circulationStrategy:'The ground floor joins entry and the public interior.',
  entrance:[8,1,2],headroom:2,
  protectedVoids:[{id:'interior-void',origin:[7,1,7],size:[4,6,4],maxOccupiedCells:0}],
  destinations:[{id:'public-foyer',point:[10,1,9],maximumPathSteps:30}],
  functionalZones:[{id:'public-floor',origin:[5,1,5],size:[10,1,10],
   minimumReachablePositions:85,minimumReachablePercent:85}]
 },
 explanation:'Offline mock only; no model intelligence assessed.',
 assumptions:['Evaluation remains source-only.']
});
const mk=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r11-source-only-'));
async function fakeLocal(body,reason='stop'){
 const requests=[];
 const server=http.createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=String(chunk);
  requests.push({method:req.method,path:req.url,body:raw?JSON.parse(raw):null});
  if(req.method==='GET'&&req.url==='/api/tags'){
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({models:[{name:model}]}));return;
  }
  if(req.method==='POST'&&req.url==='/api/chat'){
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({done:true,done_reason:reason,
    message:{content:body},eval_count:reason==='length'?3072:950,
    prompt_eval_count:800,eval_duration:450000000}));return;
  }
  res.writeHead(403);res.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {port:server.address().port,requests,
  close:()=>new Promise(resolve=>server.close(resolve))};
}
test('R11 guide preserves complete four-key, original authorship, stairs/repeat and important public void/floor',()=>{
 assert(R11_COMPACT_GUIDE.includes('ONE complete, valid MINIFIED JSON'));
 for(const word of ['spatialPlan','functionalZones','protectedVoids',
  'staircase','repeat','headroom','atr ium'.replace(' ','')]){
  assert(R11_COMPACT_GUIDE.toLowerCase().includes(word.toLowerCase()),word);
 }
 assert.equal(R11_GUIDE_SHA256,sha(R11_COMPACT_GUIDE));
 assert(!R11_COMPACT_GUIDE.includes('Automatically approve construction'));
});
test('R11 native opt-in uses shorter single system guide; legacy planned mode still has its original long guide',async()=>{
 const answer=JSON.stringify(fixture());
 const fake=await fakeLocal(answer);
 try{
  const call=async compact=>{
   const bridge=createB198SNativeBridge({
    plannedSourceMode:true,compactPlannedGuide:compact,
    numPredict:3072,numCtx:6144});
   const generate=createB198GLocalModelAdapter({
    model,endpoint:'http://127.0.0.1:'+fake.port+'/v1/chat/completions',
    fetcher:bridge.fetcher,plannedSourceMode:true});
   const data=await generate({
    mode:'creation',prompt:'Please design an entirely original fictional public building.',
    attempt:1,maxAttempts:1});
   assert.equal(data.design.id,fixture().design.id);
   assert.equal(bridge.requestBudget.r11CompactOutputProfileOptIn,compact);
   return bridge;
  };
  const legacy=await call(false);
  const r11=await call(true);
  const posts=fake.requests.filter(x=>x.method==='POST');
  assert.equal(posts.length,2,'two fake HTTP calls, no external real model');
  const oldSystem=posts[0].body.messages[0].content,
    newSystem=posts[1].body.messages[0].content;
  assert(newSystem.length<oldSystem.length*0.8,
   'R11 must materially reduce duplicated system prompt length');
  assert.equal(newSystem,R11_COMPACT_GUIDE);
  assert.equal(posts[0].body.messages[1].content,
   posts[1].body.messages[1].content,
   'User task and frozen mode remain identical across profiles');
  assert.equal(posts[0].body.options.num_predict,3072);
  assert.equal(posts[1].body.options.num_predict,3072);
  assert.equal(posts[0].body.think,false);
  assert.equal(posts[1].body.think,false);
  assert.equal(posts[0].body.stream,false);
  assert.equal(posts[1].body.stream,false);
  assert.equal(legacy.requestBudget.r11CompactGuideSha256,null);
  assert.equal(r11.requestBudget.r11CompactGuideSha256,R11_GUIDE_SHA256);
 }finally{await fake.close()}
});
test('R11 raw inspection is cryptographic, complete-JSON-aware and never certifies geometry',()=>{
 const raw=JSON.stringify(fixture()),compiled=compileDesign(fixture().design);
 assert(compiled.primitives.length>100);
 const result=inspectR11OriginalRaw(raw,{
  nativeTrace:[{generatedTokens:942}],outputTokenLimit:3072});
 assert.equal(result.rawSha256,sha(raw));
 assert.equal(result.exactFourKeyJsonParseable,true);
 assert.equal(result.sourceElements,5);
 assert.equal(result.staircaseElements,0);
 assert.equal(result.repeatedElements,1);
 assert.equal(result.declaredInstanceCount,8);
 assert.equal(result.actualModelTokenUsage,942);
 assert.equal(result.modelReportedOutputLimitReached,false);
 assert.equal(result.serverReportedIncomplete,null);
 assert.equal(result.compileAndReachabilityCertified,false);
 assert.equal(result.structurallyValidR4Certified,false);
 assert.equal(result.safety.worldWrites,0);
 assert.equal(result.safety.gates.length,9);
 assert.deepEqual(result.safety.BuildPlan.operations,[]);
});
test('R11 truncated original is NEVER autoclosed or counted as model success',()=>{
 const raw=JSON.stringify(fixture()).slice(0,-17);
 const result=inspectR11OriginalRaw(raw,{
  nativeTrace:[{generatedTokens:3072}],outputTokenLimit:3072});
 assert.equal(result.rawSha256,sha(raw));
 assert.equal(result.exactFourKeyJsonParseable,false);
 assert.equal(result.modelReportedOutputLimitReached,true);
 assert.equal(result.actualModelTokenUsage,3072);
 assert.equal(result.noAutomaticRepairOrRetry,true);
 assert.equal(result.sourceElements,null);
});
test('R11 does not claim success for syntactically valid but malformed four-key design',()=>{
 const raw=JSON.stringify({design:{},spatialPlan:null,explanation:2,assumptions:5});
 const result=inspectR11OriginalRaw(raw);
 assert.equal(result.exactFourKeyJsonParseable,true);
 assert.equal(result.structurallyValidR4Certified,false);
 assert.equal(result.compileAndReachabilityCertified,false);
 assert.equal(result.actualModelTokenUsage,null);
 assert.equal(result.modelReportedOutputLimitReached,null);
});
test('R11 profile is explicit; R8 legacy parse default and strict authorization are untouched',()=>{
 const root=mk(),out=path.join(root,'future-r11');
 try{
  const basic=['--model',model,'--out',out,
   '--authorize-one',EXPLICIT_AUTHORIZATION];
  const a=parseR6Args(basic);
  const b=parseR6Args([...basic,'--prompt-profile',PROFILE]);
  assert.equal(a.promptProfile,'r8-original');
  assert.equal(b.promptProfile,PROFILE);
  assert.throws(()=>parseR6Args([...basic,'--prompt-profile','r11-unchecked','--port','bad']),
   /B198ZR6_MODEL_BUDGET/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
 const bridge=createB198SNativeBridge({plannedSourceMode:true});
 assert.equal(bridge.requestBudget.r11CompactOutputProfileOptIn,false);
 assert.throws(()=>createB198SNativeBridge({compactPlannedGuide:true}),
  /R11_COMPACT_REQUIRES_PLANNED_MODE/);
});
test('R11 COMPLETE native fake Ollama one-shot captures original, guide SHA and source-only audit without edits',async()=>{
 const root=mk(),raw=JSON.stringify(fixture()),fake=await fakeLocal(raw);
 try{
  const report=await runR6AuthorizedCapture({
   authorization:EXPLICIT_AUTHORIZATION,
   model,outDir:path.join(root,'capture'),port:fake.port,
   promptProfile:PROFILE,sourceTokens:3072,contextTokens:6144});
  assert.equal(report.promptProfile,PROFILE);
  assert.equal(report.originalSaved,true);
  assert.equal(report.originalRawSha256,sha(raw));
  assert.equal(report.request.optInR11CompactGuideSha256,R11_GUIDE_SHA256);
  assert.equal(report.r11CompletionAudit.rawSha256,sha(raw));
  assert.equal(report.r11CompletionAudit.profileGuideSha256,R11_GUIDE_SHA256);
  assert.equal(report.r11CompletionAudit.exactFourKeyJsonParseable,true);
  assert.equal(report.r11CompletionAudit.actualModelTokenUsage,950);
  assert.equal(report.r11CompletionAudit.modelReportedOutputLimitReached,false);
  assert.equal(report.r11CompletionAudit.serverReportedIncomplete,false);
  assert.equal(report.r11CompletionAudit.serverDoneReason,'stop');
  assert.equal(report.modelAuthorshipIndependentlyAuthenticated,false);
  assert.equal(report.safety.worldWrites,0);
  assert.equal(report.safety.readiness,'NOT_PREPARED');
  assert.equal(fs.readFileSync(path.join(root,'capture','R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),raw);
  assert(fs.existsSync(path.join(root,'capture','R11_OFFLINE_COMPLETION_AUDIT.json')));
  assert.equal(fake.requests.filter(x=>x.method==='GET').length,1);
  assert.equal(fake.requests.filter(x=>x.method==='POST').length,1);
 }finally{await fake.close();fs.rmSync(root,{recursive:true,force:true})}
});
test('R11 fake model truncation: raw preserved, no retry, no misleading quality success',async()=>{
 const root=mk(),raw=JSON.stringify(fixture()).slice(0,-11),
  fake=await fakeLocal(raw,'length');
 try{
  const report=await runR6AuthorizedCapture({
   authorization:EXPLICIT_AUTHORIZATION,
   model,outDir:path.join(root,'capture'),port:fake.port,
   promptProfile:PROFILE,sourceTokens:3072,contextTokens:6144});
  assert.equal(report.status,'HOLD_MODEL_TRANSPORT_OR_SOURCE_REVIEW');
  assert.equal(report.originalRawSha256,sha(raw));
  assert.equal(report.r11CompletionAudit.modelReportedOutputLimitReached,true);
  assert.equal(report.r11CompletionAudit.serverReportedIncomplete,true);
  assert.equal(report.r11CompletionAudit.serverDoneReason,'length');
  assert.equal(report.r11CompletionAudit.exactFourKeyJsonParseable,false);
  assert.equal(fake.requests.filter(x=>x.method==='POST').length,1);
  assert.equal(report.safety.worldWrites,0);
 }finally{await fake.close();fs.rmSync(root,{recursive:true,force:true})}
});
