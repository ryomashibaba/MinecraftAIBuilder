/**
 * R54 CI: synthetic disposable server only, never real local Qwen.
 * No Minecraft, paid API, provider impersonation, or user consent consumed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {R47_JSON_SCHEMA,R47_JSON_SCHEMA_SHA256}
 from '../source/ai/b198zr47-json-schema-format-gate.mjs';
import {R50_ARCHITECTURE_GUIDE,R50_GUIDE_SHA256}
 from '../source/ai/b198zr50-program-first-architecture-guide.mjs';
import {AUTHORIZATION,MODEL,runR54OneShot}
 from './b198zr54-future-program-first-once.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r54-test-only-'));
const fixture=()=>JSON.stringify(r32Courtyard());
async function fakeServer(source,{listed=true,doneReason='stop'}={}){
 const calls={get:0,post:0,other:0,body:null};
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/api/tags'){
   calls.get++;
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({models:listed?[{name:MODEL}]:[]}));
  }else if(req.method==='POST'&&req.url==='/api/chat'){
   calls.post++;
   let text='';for await(const chunk of req)text+=chunk;
   calls.body=JSON.parse(text);
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({done:true,done_reason:doneReason,
    message:{content:source},eval_count:993,prompt_eval_count:801,
    total_duration:1230000000,eval_duration:900000000}));
  }else{calls.other++;res.writeHead(403);res.end()}
 });
 return await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve({
   port:server.address().port,calls,
   close:()=>new Promise(done=>server.close(done))}));
 });
}
test('R54 rejects missing/old consent and alternate models without contacting fake service',async()=>{
 const fake=await fakeServer(fixture()),base=temp();
 try{
  for(const consent of ['',null,'I_APPROVE_R23_ONE_LOCAL_QWEN_REQUEST',
   'I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST']){
   await assert.rejects(runR54OneShot({authorization:consent,
    baseDir:path.join(base,'out'),port:fake.port}),/NEW_EXPLICIT_AUTHORIZATION_REQUIRED/);
  }
  await assert.rejects(runR54OneShot({
   authorization:AUTHORIZATION,model:'qwen-other:27b',
   baseDir:path.join(base,'out'),port:fake.port}),/EXACT_QWEN_MODEL_REQUIRED/);
  assert.equal(fake.calls.get,0);
  assert.equal(fake.calls.post,0);
  assert.equal(fs.existsSync(path.join(base,'out')),false);
 }finally{await fake.close();fs.rmSync(base,{recursive:true,force:true})}
});
test('R54 model missing is HOLD before lock and expensive request',async()=>{
 const fake=await fakeServer(fixture(),{listed:false}),base=temp();
 try{
  await assert.rejects(runR54OneShot({authorization:AUTHORIZATION,
   baseDir:path.join(base,'out'),port:fake.port}),/PREFLIGHT_HOLD_EXACT_MODEL_MISSING_NO_REQUEST/);
  assert.equal(fake.calls.get,1);assert.equal(fake.calls.post,0);
  assert.equal(fs.existsSync(path.join(base,'out')),false);
 }finally{await fake.close();fs.rmSync(base,{recursive:true,force:true})}
});
test('R54 FAKE future-token trial sends R50 guide+native schema; raw SHA and one-shot lock',async()=>{
 const original=fixture(),fake=await fakeServer(original),base=temp();
 try{
  const dir=path.join(base,'out');
  const r=await runR54OneShot({
   authorization:AUTHORIZATION,baseDir:dir,port:fake.port});
  assert.equal(fake.calls.get,1);
  assert.equal(fake.calls.post,1);
  assert.equal(fake.calls.other,0);
  assert.equal(fake.calls.body.model,MODEL);
  assert.equal(fake.calls.body.messages[0].content,R50_ARCHITECTURE_GUIDE);
  assert.equal(fake.calls.body.stream,false);
  assert.equal(fake.calls.body.think,false);
  assert.deepEqual(fake.calls.body.format,R47_JSON_SCHEMA);
  assert.equal(fake.calls.body.options.num_ctx,6144);
  assert.equal(fake.calls.body.options.num_predict,3072);
  assert.equal(r.status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
  assert.equal(r.manifest.r47NativeSchemaSha256,R47_JSON_SCHEMA_SHA256);
  assert.equal(r.manifest.r50ArchitectureGuideSha256,R50_GUIDE_SHA256);
  assert.equal(r.manifest.rawSha256,sha(original));
  assert.equal(r.manifest.automaticRetries,0);
  assert.equal(r.manifest.actualMinecraftWorldWrites,0);
  assert.equal(r.capture.nativeGeneratedTokens,993);
  assert.equal(r.capture.providerModelIdentityVerified,false);
  assert.equal(r.capture.humanArchitectureQualityCertified,false);
  assert(fs.existsSync(r.lock));
  const originalPath=path.join(r.folder,'R54_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
  assert.equal(fs.readFileSync(originalPath,'utf8'),original);
  for(const name of ['R54_FROZEN_REQUEST.json','R54_CAPTURE_RESULT.json',
   'R41_ARCHITECTURE_FEEDBACK.json','R42_AUTHORING_BUDGET.json',
   'R43_SPATIAL_SECTIONS.json','R45_ORIGINAL_GRAMMAR_AUDIT.json','R47_STRICT_B143_R3_SCHEMA_RESULT.json','R49_GLOBAL_COORDINATE_PROGRAM_AUDIT.json',
   'R13_OFFLINE_QUALITY_DECISION.json',
   'R54_FINAL_EVIDENCE_MANIFEST.json','index.html']){
   assert(fs.existsSync(path.join(r.folder,name)),name);
  }
  const r43=JSON.parse(fs.readFileSync(path.join(r.folder,'R43_SPATIAL_SECTIONS.json'),'utf8'));
  assert.equal(r43.originalRawSha256,sha(original));
  assert.equal(r43.humanVisualApproval,false);
  assert.equal(r43.modelCalls,0);
  await assert.rejects(runR54OneShot({
   authorization:AUTHORIZATION,baseDir:dir,port:fake.port}),
   /APPROVAL_ALREADY_CONSUMED_NO_RETRY/);
  assert.equal(fake.calls.post,1);
  assert.equal(fake.calls.get,1);
 }finally{await fake.close();fs.rmSync(base,{recursive:true,force:true})}
});
test('R54 invalid CUT material is HOLD, source preserved, no second request',async()=>{
 const p=r32Courtyard();
 p.design.elements.find(x=>x.mode==='cut').material='glass';
 const original=JSON.stringify(p),fake=await fakeServer(original),base=temp();
 try{
  const r=await runR54OneShot({authorization:AUTHORIZATION,
   baseDir:path.join(base,'out'),port:fake.port});
  assert.equal(fake.calls.post,1);
  assert.equal(r.status,'HOLD_TRANSPORT_SOURCE_OR_SPATIAL');
  assert.equal(r.capture.originalRawSha256,sha(original));
  assert.equal(fs.readFileSync(path.join(r.folder,'R54_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),original);
  assert.equal(r.manifest.oneTimeLock,'CONSUMED');
  assert.equal(r.manifest.modelWorldInteractions,0);
  const r41=JSON.parse(fs.readFileSync(path.join(r.folder,'R41_ARCHITECTURE_FEEDBACK.json'),'utf8'));
  assert.equal(r41.sourceErrorCode,'B143_MATERIAL');
 }finally{await fake.close();fs.rmSync(base,{recursive:true,force:true})}
});
test('R54 truncation preserves unfinished raw JSON and reports HOLD without correction',async()=>{
 const source=fixture().slice(0,-7),fake=await fakeServer(source,{doneReason:'length'}),base=temp();
 try{
  const r=await runR54OneShot({authorization:AUTHORIZATION,
   baseDir:path.join(base,'out'),port:fake.port});
  assert.equal(fake.calls.post,1);
  assert.equal(r.status,'HOLD_TRANSPORT_SOURCE_OR_SPATIAL');
  assert.equal(r.capture.originalRawSha256,sha(source));
  assert.equal(fs.readFileSync(path.join(r.folder,'R54_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),source);
  assert.equal(r.manifest.originalWasRepaired,false);
  assert.equal(r.manifest.architecturalQualityUnverified,true);
 }finally{await fake.close();fs.rmSync(base,{recursive:true,force:true})}
});
