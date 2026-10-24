/** R23 offline-only guards and evidence continuity.
 * The fake HTTP server listens only on a unique ephemeral loopback port.
 * No real Qwen, no model download, no Minecraft world connections.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {runR23FutureOneShot,R23_FUTURE_AUTHORIZATION,EXACT_FUTURE_MODEL,
 auditR23SavedFolder} from './b198zr23-future-one-shot.mjs';
import {R21_FUTURE_GUIDE,R21_FUTURE_GUIDE_SHA256}
 from '../source/ai/b198zr21-future-architecture-guide.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const fixture=()=>({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'r23-fake-lobby',title:'A fake test-only lobby',
  brief:'Purely synthetic CI architecture fixture; not Qwen output.',
  bounds:{width:16,height:12,depth:16},designOnly:true,elements:[
   {id:'ground',shape:'box',mode:'add',material:'concrete',
    origin:[0,0,0],size:[16,1,16]},
   {id:'shell',shape:'box',mode:'add',material:'glass',
    origin:[1,1,1],size:[14,6,14],shell:1},
   {id:'atrium',shape:'box',mode:'cut',origin:[3,1,3],size:[10,6,10]},
   {id:'door',shape:'box',mode:'cut',origin:[6,1,1],size:[4,3,3]}
  ]},
 spatialPlan:{designIntent:'Open public hall for reading and gathering.',
  massStrategy:'Roof and hollow shell above a real supported floor.',
  circulationStrategy:'Walk directly from front entrance to hall.',
  entrance:[8,1,2],headroom:2,
  protectedVoids:[{id:'interior',origin:[6,1,6],size:[4,5,4],
   maxOccupiedCells:0}],
  destinations:[{id:'foyer',point:[8,1,9],maximumPathSteps:30}],
  functionalZones:[{id:'public-room',origin:[4,1,4],size:[8,1,8],
   minimumReachablePositions:60,minimumReachablePercent:85}]},
 explanation:'CI simulation only',assumptions:[]
});
function fakeServer(source,{listed=true,doneReason='stop'}={}){
 const counts={get:0,post:0,bad:0,body:null};
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/api/tags'){
   counts.get++;
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({models:listed?[{name:EXACT_FUTURE_MODEL}]:[]}));
   return;
  }
  if(req.method==='POST'&&req.url==='/api/chat'){
   counts.post++;
   let b='';for await(const part of req)b+=part;
   counts.body=JSON.parse(b);
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({done:true,done_reason:doneReason,
    message:{content:source},eval_count:999,prompt_eval_count:920,
    total_duration:1230000000,eval_duration:1100000000}));
   return;
  }
  counts.bad++;
  res.writeHead(403);res.end();
 });
 return new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve({
   port:server.address().port,counts,
   close:()=>new Promise(done=>server.close(done))}));
 });
}
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r23-once-mock-'));
test('R23 refuses historical R17/R6 consent and wrong model without GET, lock or POST',async()=>{
 const raw=JSON.stringify(fixture()),fake=await fakeServer(raw),tmp=temporary();
 try{
  const baseDir=path.join(tmp,'evidence');
  for(const phrase of [
   'I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST',
   'I_APPROVE_ONE_LOCAL_MODEL_REQUEST',
   ''
  ]){
   await assert.rejects(runR23FutureOneShot({
    authorization:phrase,baseDir,port:fake.port}),
    /B198ZR23_FRESH_R23_CONSENT_REQUIRED/);
  }
  await assert.rejects(runR23FutureOneShot({
   authorization:R23_FUTURE_AUTHORIZATION,model:'fake-untrusted',
   baseDir,port:fake.port}),/B198ZR23_EXACT_MODEL_REQUIRED/);
  assert.equal(fake.counts.get,0);
  assert.equal(fake.counts.post,0);
  assert.equal(fs.existsSync(baseDir),false);
 }finally{await fake.close();fs.rmSync(tmp,{recursive:true,force:true})}
});
test('R23 missing exact model returns HOLD BEFORE consuming fresh approval',async()=>{
 const fake=await fakeServer(JSON.stringify(fixture()),{listed:false}),
  tmp=temporary();
 try{
  const baseDir=path.join(tmp,'evidence');
  await assert.rejects(runR23FutureOneShot({
   authorization:R23_FUTURE_AUTHORIZATION,baseDir,port:fake.port}),
   /B198ZR23_MODEL_NOT_LISTED_NO_LOCK_USED/);
  assert.equal(fake.counts.get,1);
  assert.equal(fake.counts.post,0);
  assert.equal(fs.existsSync(baseDir),false);
 }finally{await fake.close();fs.rmSync(tmp,{recursive:true,force:true})}
});
test('R23 fake single run pins quality guide, captures raw and all evidence with only one POST, re-run forbidden',async()=>{
 const original=JSON.stringify(fixture()),fake=await fakeServer(original),
  tmp=temporary();
 try{
  const baseDir=path.join(tmp,'evidence');
  const result=await runR23FutureOneShot({
   authorization:R23_FUTURE_AUTHORIZATION,baseDir,port:fake.port});
  assert.equal(fake.counts.get,2,'one read-only preflight per runner/capture');
  assert.equal(fake.counts.post,1);
  assert.equal(fake.counts.bad,0);
  assert.equal(fake.counts.body.messages[0].content,R21_FUTURE_GUIDE);
  assert.equal(fake.counts.body.think,false);
  assert.equal(fake.counts.body.stream,false);
  assert.equal(fake.counts.body.format,'json');
  assert.equal(fake.counts.body.options.num_predict,3072);
  assert.equal(fake.counts.body.options.num_ctx,6144);
  assert.equal(result.manifest.r17ApprovalReused,false);
  assert.equal(result.manifest.oneShotGuard,'CONSUMED');
  assert.equal(result.manifest.profileGuideSha256,R21_FUTURE_GUIDE_SHA256);
  assert.equal(result.audit.issues.length,0);
  assert.equal(result.audit.rawSha256,sha(original));
  assert.equal(result.manifest.worldWrites,0);
  assert.equal(result.audit.safety.gates.length,9);
  assert.deepEqual(result.audit.safety.BuildPlan.operations,[]);
  assert(fs.existsSync(result.lock));
  assert.equal(fs.readFileSync(path.join(result.folder,
   'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),original);
  assert(fs.existsSync(path.join(result.folder,'R23_SOURCE_FORENSICS.json')));
  assert(fs.existsSync(path.join(result.folder,'R13_OFFLINE_QUALITY_DECISION.json')));
  assert(fs.existsSync(path.join(result.folder,'R23_ONE_SHOT_MANIFEST.json')));
  assert(fs.existsSync(path.join(result.folder,'R23_EVIDENCE_CHAIN_AUDIT.json')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.folder,
   'R6_FROZEN_REQUEST.json'),'utf8')).optInR23QualityGuideSha256,
   R21_FUTURE_GUIDE_SHA256);
  await assert.rejects(runR23FutureOneShot({
   authorization:R23_FUTURE_AUTHORIZATION,baseDir,port:fake.port}),
   /B198ZR23_ONE_ATTEMPT_ALREADY_CONSUMED/);
  assert.equal(fake.counts.post,1);
  assert.equal(fs.readdirSync(baseDir).filter(n=>n==='R23_APPROVAL_CONSUMED_LOCK.txt').length,1);
  const tampered=JSON.parse(fs.readFileSync(path.join(result.folder,
   'R23_SOURCE_FORENSICS.json'),'utf8'));
  tampered.rawSha256='f'.repeat(64);
  fs.writeFileSync(path.join(result.folder,'R23_SOURCE_FORENSICS.json'),
   JSON.stringify(tampered));
  const audit=auditR23SavedFolder(result.folder);
  assert.equal(audit.status,'HOLD_EVIDENCE_CHAIN');
  assert(audit.issues.includes('RAW_SHA_MISMATCH_R23_SOURCE_FORENSICS.json'));
  assert.equal(fake.counts.post,1);
 }finally{await fake.close();fs.rmSync(tmp,{recursive:true,force:true})}
});
test('R23 invalid model-authored geometry is HOLD, retains original and consumed lock, never retries',async()=>{
 const candidate=fixture();
 delete candidate.design.elements[0].material;
 const original=JSON.stringify(candidate),fake=await fakeServer(original),
  tmp=temporary();
 try{
  const result=await runR23FutureOneShot({
   authorization:R23_FUTURE_AUTHORIZATION,
   baseDir:path.join(tmp,'evidence'),port:fake.port});
  assert.equal(result.status,'HOLD_SOURCE_OR_GEOMETRY');
  assert.equal(fake.counts.post,1);
  assert.equal(result.audit.rawSha256,sha(original));
  const f=JSON.parse(fs.readFileSync(path.join(result.folder,
   'R23_SOURCE_FORENSICS.json'),'utf8'));
  assert(f.criticalSourceFindings.some(x=>x.code==='ADD_MATERIAL_MISSING_OR_INVALID'));
  const r13=JSON.parse(fs.readFileSync(path.join(result.folder,
   'R13_OFFLINE_QUALITY_DECISION.json'),'utf8'));
  assert.equal(r13.source.sourceError,'B143_MATERIAL');
  assert.equal(result.manifest.worldWrites,0);
  assert(fs.existsSync(result.lock));
 }finally{await fake.close();fs.rmSync(tmp,{recursive:true,force:true})}
});
test('R23 incomplete raw saves immutable evidence and never reports success',async()=>{
 const source=JSON.stringify(fixture()).slice(0,-19),
  fake=await fakeServer(source,{doneReason:'length'}),tmp=temporary();
 try{
  const r=await runR23FutureOneShot({
   authorization:R23_FUTURE_AUTHORIZATION,
   baseDir:path.join(tmp,'evidence'),port:fake.port});
  assert.equal(fake.counts.post,1);
  assert.equal(r.audit.issues.length,0,'invalid JSON alone does not invalidate SHA chain');
  assert.equal(r.status,'HOLD_SOURCE_OR_GEOMETRY');
  assert.equal(r.audit.rawSha256,sha(source));
  assert.equal(fs.readFileSync(path.join(r.folder,
   'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),source);
  assert.equal(r.manifest.humanReviewRequired,true);
 }finally{await fake.close();fs.rmSync(tmp,{recursive:true,force:true})}
});
