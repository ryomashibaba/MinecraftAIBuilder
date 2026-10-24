/**
 * R56 Windows candidate wrapper end-to-end: NEVER a real model.
 *
 * Must bind the standard 11434 port to this in-process fake HTTP server
 * BEFORE launching the future consent-gated PowerShell runner.
 * If port 11434 is occupied, abort before making any calls — this protects
 * against accidentally talking to the user's actual Ollama process.
 * Uses a temp LOCALAPPDATA and temporary one-shot lock, not user's real data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {R47_JSON_SCHEMA}
 from '../source/ai/b198zr47-json-schema-format-gate.mjs';
import {R50_ARCHITECTURE_GUIDE}
 from '../source/ai/b198zr50-program-first-architecture-guide.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runner=path.join(repo,'tools','r56-future','RUN_R54_ONE_FRESHLY_APPROVED_REQUEST.ps1');
const original=(()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'r56-deliberate-outside',
  mode:'add',shape:'box',material:'metal',
  origin:[1,p.design.bounds.height,1],size:[3,1,3]});
 return JSON.stringify(p);
})();
const digest=s=>createHash('sha256').update(s).digest('hex');
async function fake(){
 const count={get:0,post:0,other:0,body:null};
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/api/tags'){
   count.get++;
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({models:[{name:'qwen3.8:27b'}]}));return;
  }
  if(req.method==='POST'&&req.url==='/api/chat'){
   count.post++;
   let data='';for await(const chunk of req)data+=chunk.toString();
   count.body=JSON.parse(data);
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({done:true,done_reason:'stop',
    message:{content:original},eval_count:112,prompt_eval_count:150,
    eval_duration:1500000000,total_duration:2200000000}));return;
  }
  count.other++;res.writeHead(403);res.end();
 });
 return await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(11434,'127.0.0.1',()=>resolve({
   count,close:()=>new Promise(done=>server.close(done))
  }));
 });
}
const call=(consent,env)=>new Promise((resolve,reject)=>{
 const proc=spawn('powershell.exe',[
  '-NoProfile','-ExecutionPolicy','Bypass',
  '-File',runner,'-R54Consent',consent],{
  cwd:repo,env:{...env,CI:'true'},windowsHide:true,
  stdio:['ignore','pipe','pipe']
 });
 let out='',err='';
 const limit=setTimeout(()=>proc.kill(),420000);
 proc.stdout.on('data',v=>{out+=v.toString();if(out.length>300000)proc.kill()});
 proc.stderr.on('data',v=>{err+=v.toString();if(err.length>300000)proc.kill()});
 proc.once('error',e=>{clearTimeout(limit);reject(e)});
 proc.once('close',code=>{clearTimeout(limit);resolve({code,out,err})});
});
test('R56 PowerShell one-shot runner: consent denied, then exactly one fake POST, audited R51 ZIP, second denied',async()=>{
 if(process.platform!=='win32')return;
 // Reject the entire test if we cannot ensure only a fake owns real model port.
 const server=await fake();
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r56-windows-wrapper-'));
 const env={...process.env,LOCALAPPDATA:path.join(temp,'R56_ISOLATED_TEST_APPDATA'),CI:'true'};
 delete env.NODE_TEST_CONTEXT;delete env.NODE_TEST_WORKER_ID;
 fs.mkdirSync(env.LOCALAPPDATA);
 try{
  const deny=await call('INCORRECT_OR_OLD_CONSENT',env);
  assert.equal(deny.code,1,deny.out+'\n'+deny.err);
  assert.equal(server.count.get,0);assert.equal(server.count.post,0);
  const approved=await call('I_APPROVE_R54_ONE_LOCAL_QWEN_REQUEST',env);
  assert.equal(approved.code,2,(approved.out+'\n'+approved.err).slice(-14000));
  assert.equal(server.count.get,1);
  assert.equal(server.count.post,1);
  assert.equal(server.count.other,0);
  assert.equal(server.count.body.model,'qwen3.8:27b');
  assert.deepEqual(server.count.body.format,R47_JSON_SCHEMA);
  assert.equal(server.count.body.messages[0].content,R50_ARCHITECTURE_GUIDE);
  assert.equal(server.count.body.options.num_predict,3072);
  assert.equal(server.count.body.options.num_ctx,6144);
  assert.equal(server.count.body.think,false);
  assert.equal(server.count.body.stream,false);
  const root=path.join(env.LOCALAPPDATA,'MinecraftAIBuilder');
  const src=path.join(root,'R55_Source_385137010d86');
  assert(fs.existsSync(path.join(src,'scripts','b198zr54-future-program-first-once.mjs')));
  assert(fs.existsSync(path.join(root,'R54_OneShot_Evidence',
   'R54_APPROVAL_CONSUMED_LOCK.txt')));
  const evidence=path.join(root,'R54_OneShot_Evidence');
  const archives=fs.readdirSync(evidence).filter(n=>n.endsWith('_UPLOAD_THIS_RESULT.zip'));
  assert.equal(archives.length,1);
  const zip=path.join(evidence,archives[0]);
  const extract=path.join(temp,'unpacked');
  const unzip=spawnSync('powershell.exe',['-NoProfile','-Command',
   'Expand-Archive -LiteralPath $env:R56_ZIP -DestinationPath $env:R56_EXTRACT -ErrorAction Stop'],{
   env:{...env,R56_ZIP:zip,R56_EXTRACT:extract},
   encoding:'utf8',timeout:120000});
  assert.equal(unzip.status,0,unzip.stdout+'\n'+unzip.stderr);
  const unpacked=fs.readdirSync(extract).filter(n=>n.startsWith('R54_'));
  assert.equal(unpacked.length,1);
  const folder=path.join(extract,unpacked[0]);
  assert.equal(fs.readFileSync(path.join(folder,
   'R54_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),original);
  const manifest=JSON.parse(fs.readFileSync(path.join(folder,
   'R54_FINAL_EVIDENCE_MANIFEST.json'),'utf8'));
  assert.equal(manifest.rawSha256,digest(original));
  assert.equal(manifest.r50ArchitectureGuideSha256.length,64);
  assert.equal(manifest.oneTimeLock,'CONSUMED');
  const audit=JSON.parse(fs.readFileSync(path.join(folder,
   'R54_WINDOWS_ORIGINAL_SHA_AUDIT.json'),'utf8'));
  assert.equal(audit.originalRawSha256,digest(original));
  assert.equal(audit.status,'SAVED_RAW_SHA_CHAIN_MATCHED_MODEL_QUALITY_UNVERIFIED');
  const receipt=JSON.parse(fs.readFileSync(path.join(folder,
   'R52_DIAGNOSTIC_ATTACHMENT_RECEIPT.json'),'utf8'));
  assert.equal(receipt.originalRawSha256,digest(original));
  assert.equal(receipt.exactB143Failure,'B143_OUTSIDE_LOCAL_BOUNDS');
  assert.equal(receipt.modelCalls,0);
  const html=fs.readFileSync(path.join(folder,'R52_FAILED_SOURCE_DIAGNOSTIC',
   'R51_UNCOMPILED_SPATIAL_STORYBOARD.html'),'utf8');
  assert(html.includes('r56-deliberate-outside'));
  assert(html.includes('ELEMENT_OUTSIDE_LOCAL_BOUNDS'));
  assert.equal(manifest.actualMinecraftWorldWrites,0);
  const second=await call('I_APPROVE_R54_ONE_LOCAL_QWEN_REQUEST',env);
  assert.equal(second.code,1,second.out+'\n'+second.err);
  assert.match(second.out,/APPROVAL_ALREADY_CONSUMED_NO_RETRY/);
  assert.equal(server.count.get,1);assert.equal(server.count.post,1);
 }finally{await server.close();fs.rmSync(temp,{recursive:true,force:true})}
});
