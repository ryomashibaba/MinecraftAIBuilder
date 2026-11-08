/**
 * R54 — REAL WINDOWS CMD PACKAGING CONTRACT, SYNTHETIC PROVIDER ONLY.
 * Uses an ephemeral in-process fake Ollama HTTP server (never port 11434).
 * Any consent lock belongs only to a brand-new disposable test directory.
 * Does NOT authorize, invoke or recreate real Qwen and does not alter
 * historical R54 sources / users' past consent locks or saved evidence.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {R47_JSON_SCHEMA}
 from '../source/ai/b198zr47-json-schema-format-gate.mjs';
import {R50_ARCHITECTURE_GUIDE,R50_GUIDE_SHA256}
 from '../source/ai/b198zr50-program-first-architecture-guide.mjs';
import {r32Courtyard}
 from './b198zr32-synthetic-geometry-fixtures.mjs';
import {AUTHORIZATION,MODEL,runR54OneShot}
 from './b198zr54-future-program-first-once.mjs';
import {attachR52FailedSourceStoryboard}
 from './b198zr52-postcapture-auto-storyboard.mjs';

const digest=s=>createHash('sha256').update(s).digest('hex');
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r54-fake-zip-'));
async function fakeOllama(source){
 const calls={gets:0,posts:0,other:0,body:null};
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/api/tags'){
   calls.gets++;
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({models:[{name:MODEL}]}));return;
  }
  if(req.method==='POST'&&req.url==='/api/chat'){
   calls.posts++;
   let text='';for await(const c of req)text+=c.toString();
   calls.body=JSON.parse(text);
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({done:true,done_reason:'stop',
    message:{content:source},eval_count:101,prompt_eval_count:111,
    total_duration:2400000000,eval_duration:1400000000}));return;
  }
  calls.other++;res.writeHead(405);res.end();
 });
 return await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve({
   calls,port:server.address().port,
   close:()=>new Promise(done=>server.close(done))
  }));
 });
}
const invalidSource=()=>{
 const d=r32Courtyard();
 d.design.elements.push({id:'roof-above-external-boundary',mode:'add',
  shape:'box',material:'glow',origin:[1,d.design.bounds.height,1],
  size:[4,1,4]});
 return JSON.stringify(d);
};
const validSource=()=>JSON.stringify(r32Courtyard());
function archiveAndExtract(root,folder){
 const helper=path.join('tools','r52-future','ARCHIVE_WITH_R51_DIAGNOSTIC_OFFLINE.ps1');
 const archive=path.join(root,'R54_FAKE_ONLY_ARCHIVE.zip');
 const unpack=path.join(root,'unpacked');
 const pack=spawnSync('powershell.exe',[
  '-NoProfile','-ExecutionPolicy','Bypass','-File',helper,
  '-EvidenceDir',folder,'-SourceRoot',process.cwd(),'-ZipOutput',archive
 ],{encoding:'utf8',timeout:120000});
 assert.equal(pack.status,0,pack.stdout+'\n'+pack.stderr);
 assert.match(pack.stdout,/R52_UPLOAD_THIS_RESULT_ZIP/);
 const extract=spawnSync('powershell.exe',[
  '-NoProfile','-Command',
  'Expand-Archive -LiteralPath $env:R54_ARCHIVE -DestinationPath $env:R54_UNPACK -ErrorAction Stop'
 ],{encoding:'utf8',timeout:120000,env:{
  ...process.env,R54_ARCHIVE:archive,R54_UNPACK:unpack
 }});
 assert.equal(extract.status,0,extract.stdout+'\n'+extract.stderr);
 return path.join(unpack,path.basename(folder));
}
test('R54 one fake model POST -> immutable raw+SHA -> Windows offline storyboard -> one ZIP',async()=>{
 const root=temporary(),raw=invalidSource(),fake=await fakeOllama(raw);
 try{
  const result=await runR54OneShot({
   authorization:AUTHORIZATION,baseDir:path.join(root,'fake-evidence'),
   port:fake.port});
  assert.equal(fake.calls.gets,1);
  assert.equal(fake.calls.posts,1);
  assert.equal(fake.calls.other,0);
  assert.equal(fake.calls.body.model,'qwen3.8:27b');
  assert.deepEqual(fake.calls.body.format,R47_JSON_SCHEMA);
  assert.equal(fake.calls.body.messages[0].content,R50_ARCHITECTURE_GUIDE);
  assert.equal(result.manifest.r50ArchitectureGuideSha256,R50_GUIDE_SHA256);
  assert.equal(result.status,'HOLD_TRANSPORT_SOURCE_OR_SPATIAL');
  assert.equal(result.manifest.rawSha256,digest(raw));
  assert.equal(result.manifest.oneTimeLock,'CONSUMED');
  assert.equal(result.manifest.actualMinecraftWorldWrites,0);
  assert(fs.existsSync(path.join(result.folder,'R49_GLOBAL_COORDINATE_PROGRAM_AUDIT.json')));
  const rawPath=path.join(result.folder,'R54_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
  const original=fs.readFileSync(rawPath);
  assert.equal(original.toString('utf8'),raw);
  // Synthetic equivalent of real Windows runner's postcapture SHA audit.
  fs.writeFileSync(path.join(result.folder,'R54_WINDOWS_ORIGINAL_SHA_AUDIT.json'),
   JSON.stringify({status:'SAVED_RAW_SHA_CHAIN_MATCHED_MODEL_QUALITY_UNVERIFIED',
    originalRawSha256:digest(raw),oneShotApprovalConsumed:true,
    noAutomaticRetry:true,worldWrites:0}));
  if(process.platform==='win32'){
   const saved=archiveAndExtract(root,result.folder);
   const html=fs.readFileSync(path.join(saved,'R52_FAILED_SOURCE_DIAGNOSTIC',
    'R51_UNCOMPILED_SPATIAL_STORYBOARD.html'),'utf8');
   assert(html.includes('roof-above-external-boundary'));
   assert(html.includes('ELEMENT_OUTSIDE_LOCAL_BOUNDS'));
   assert(fs.existsSync(path.join(saved,'R52_OPEN_FAILED_SOURCE_DIAGRAM.html')));
   const receipt=JSON.parse(fs.readFileSync(path.join(saved,
    'R52_DIAGNOSTIC_ATTACHMENT_RECEIPT.json'),'utf8'));
   assert.equal(receipt.originalRawSha256,digest(raw));
   assert.equal(receipt.exactB143Failure,'B143_OUTSIDE_LOCAL_BOUNDS');
   assert.equal(receipt.modelCalls,0);
   assert.equal(receipt.modelCalls,0);
   assert.equal(fs.readFileSync(path.join(saved,
    'R54_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),raw);
  }else{
   const review=attachR52FailedSourceStoryboard({evidenceDir:result.folder});
   assert.equal(review.status,'ADDED_UNCOMPILED_SOURCE_DIAGNOSTIC_BEFORE_ZIP');
   assert.equal(review.originalRawSha256,digest(raw));
  }
  assert.deepEqual(fs.readFileSync(rawPath),original);
  await assert.rejects(runR54OneShot({
   authorization:AUTHORIZATION,baseDir:path.join(root,'fake-evidence'),
   port:fake.port
  }),/APPROVAL_ALREADY_CONSUMED_NO_RETRY/);
  assert.equal(fake.calls.posts,1);
  assert.equal(fake.calls.gets,1);
 }finally{await fake.close();fs.rmSync(root,{recursive:true,force:true})}
});
test('R54 true strict B143 PASS uses R7, skips bbox storyboard',async()=>{
 const root=temporary(),raw=validSource(),fake=await fakeOllama(raw);
 try{
  const r=await runR54OneShot({
   authorization:AUTHORIZATION,baseDir:path.join(root,'fake-evidence'),
   port:fake.port});
  assert.equal(fake.calls.posts,1);
  assert.equal(r.status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
  assert(fs.existsSync(path.join(r.folder,'index.html')));
  assert(fs.existsSync(path.join(r.folder,'B198W_REVIEW_BOARD.html')));
  assert.equal(r.manifest.rawSha256,digest(raw));
  const review=attachR52FailedSourceStoryboard({evidenceDir:r.folder});
  assert.equal(review.status,'SKIP_STRICT_B143_COMPILED_USE_R7_FULL_VOXEL_VIEWER');
  assert.equal(review.archiveFilesAdded,0);
  assert(!fs.existsSync(path.join(r.folder,'R52_FAILED_SOURCE_DIAGNOSTIC')));
  assert.equal(fake.calls.posts,1);
 }finally{await fake.close();fs.rmSync(root,{recursive:true,force:true})}
});
