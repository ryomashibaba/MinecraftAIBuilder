/**
 * Windows end-to-end R48 starter QA: only a PREBOUND FAKE localhost Ollama
 * can receive any request. NEVER launch CMD if port 11434 is unavailable.
 * Validates one downloaded CMD -> pinned PS -> 46 files -> fake model ->
 * immutable raw -> audit ZIP -> consumed no-retry.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {R47_JSON_SCHEMA}
 from '../source/ai/b198zr47-json-schema-format-gate.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const start=path.join(repo,'tools','r48-approved','START_R48_ONE_QWEN.cmd');
const fixture=JSON.stringify(r32Courtyard());
const sha=s=>createHash('sha256').update(s).digest('hex');
async function fakeServer(){
 const calls={get:0,post:0,other:0,body:null};
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/api/tags'){
   calls.get++;
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({models:[{name:'qwen3.8:27b'}]}));
  }else if(req.method==='POST'&&req.url==='/api/chat'){
   calls.post++;
   let body='';for await(const chunk of req)body+=chunk;
   calls.body=JSON.parse(body);
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({done:true,done_reason:'stop',eval_count:998,
    prompt_eval_count:800,total_duration:1200000000,eval_duration:1100000000,
    message:{content:fixture}}));
  }else{calls.other++;res.writeHead(403);res.end()}
 });
 return await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(11434,'127.0.0.1',()=>resolve({
   calls,close:()=>new Promise(done=>server.close(done))}));
 });
}
function runCmd(answer,env){
 return new Promise((resolve,reject)=>{
  const p=spawn('cmd.exe',['/d','/c',start],{
   cwd:repo,env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='',done=false;
  const limit=setTimeout(()=>{if(!done)p.kill()},350000);
  p.stdout.on('data',d=>{stdout+=d.toString();if(stdout.length>500000)p.kill()});
  p.stderr.on('data',d=>{stderr+=d.toString();if(stderr.length>500000)p.kill()});
  p.once('error',e=>{clearTimeout(limit);reject(e)});
  p.once('close',code=>{done=true;clearTimeout(limit);resolve({code,stdout,stderr})});
  p.stdin.end(answer+'\n\n');
 });
}
const list=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const p=path.join(dir,e.name);return e.isDirectory()?list(p):[p]});
test('R48 ONE Windows CMD: no consent => no request; YES => one fake Qwen and single ZIP; repeat rejected',async()=>{
 if(process.platform!=='win32')return;
 // Acquiring the exact fixed port MUST succeed or the entire test stops.
 // This prevents a real Qwen process receiving any CI request.
 const fake=await fakeServer();
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r48-windows-fake-'));
 const env={...process.env,LOCALAPPDATA:path.join(temp,'LocalAppData'),
  CI:'true'};
 delete env.NODE_TEST_CONTEXT;delete env.NODE_TEST_WORKER_ID;
 fs.mkdirSync(env.LOCALAPPDATA);
 try{
  const deny=await runCmd('NO',env);
  assert.equal(deny.code,2,(deny.stdout+'\n'+deny.stderr).slice(-1600));
  assert.equal(fake.calls.get,0);assert.equal(fake.calls.post,0);
  const first=await runCmd('YES',env);
  assert.equal(first.code,0,(first.stdout+'\n'+first.stderr).slice(-7000));
  assert.equal(fake.calls.get,1);
  assert.equal(fake.calls.post,1);
  assert.equal(fake.calls.other,0);
  assert.equal(fake.calls.body.model,'qwen3.8:27b');
  assert.deepEqual(fake.calls.body.format,R47_JSON_SCHEMA);
  assert.equal(fake.calls.body.messages[0].content.includes('CRITICAL B143 FLAT SOURCE SYNTAX'),true);
  assert.equal(fake.calls.body.think,false);
  assert.equal(fake.calls.body.stream,false);
  assert.equal(fake.calls.body.options.num_predict,3072);
  assert.equal(fake.calls.body.options.num_ctx,6144);
  const sourceFolder=path.join(env.LOCALAPPDATA,
   'MinecraftAIBuilder','R48_Source_68396b9483fd');
  assert.equal(list(sourceFolder).length,453);
  const evidence=path.join(env.LOCALAPPDATA,
   'MinecraftAIBuilder','R48_OneShot_Evidence');
  assert(fs.existsSync(path.join(evidence,'R48_APPROVAL_CONSUMED_LOCK.txt')));
  const zips=fs.readdirSync(evidence).filter(f=>f.endsWith('_UPLOAD_THIS_RESULT.zip'));
  assert.equal(zips.length,1);
  const zipPath=path.join(evidence,zips[0]);
  const extracted=path.join(temp,'unzipped');
  const expanded=spawnSync('powershell.exe',['-NoProfile','-Command',
   'Expand-Archive -LiteralPath $env:R48_TEST_ZIP -DestinationPath $env:R48_TEST_DEST'],{
   env:{...env,R48_TEST_ZIP:zipPath,R48_TEST_DEST:extracted},
   encoding:'utf8',timeout:60000});
  assert.equal(expanded.status,0,expanded.stderr.slice(-2000));
  const files=list(extracted),get=name=>files.find(x=>path.basename(x)===name);
  for(const name of ['R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt',
   'R48_FINAL_EVIDENCE_MANIFEST.json','R48_WINDOWS_ORIGINAL_SHA_AUDIT.json',
   'R41_ARCHITECTURE_FEEDBACK.json','R42_AUTHORING_BUDGET.json',
   'R43_SPATIAL_SECTIONS.json','R45_ORIGINAL_GRAMMAR_AUDIT.json',
   'R47_STRICT_B143_R3_SCHEMA_RESULT.json',
   'R13_OFFLINE_QUALITY_DECISION.json',
   'index.html'])assert(get(name),name+' missing');
  const raw=fs.readFileSync(get('R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8');
  assert.equal(raw,fixture);
  const man=JSON.parse(fs.readFileSync(get('R48_FINAL_EVIDENCE_MANIFEST.json'),'utf8'));
  const audit=JSON.parse(fs.readFileSync(get('R48_WINDOWS_ORIGINAL_SHA_AUDIT.json'),'utf8'));
  assert.equal(man.rawSha256,sha(raw));
  assert.equal(audit.originalRawSha256,sha(raw));
  assert.equal(audit.status,'SAVED_RAW_SHA_CHAIN_MATCHED_MODEL_QUALITY_UNVERIFIED');
  assert.equal(man.automaticRetries,0);
  assert.equal(man.actualMinecraftWorldWrites,0);
  assert(man.safety.gates.every(g=>g==='BLOCKED'));
  assert.deepEqual(man.safety.BuildPlan.operations,[]);
  const replay=await runCmd('YES',env);
  assert.equal(replay.code,1,(replay.stdout+'\n'+replay.stderr).slice(-2500));
  assert.equal(fake.calls.get,1);
  assert.equal(fake.calls.post,1);
  assert.equal(fs.readdirSync(evidence).filter(x=>x.endsWith('_UPLOAD_THIS_RESULT.zip')).length,1);
 }finally{await fake.close();fs.rmSync(temp,{recursive:true,force:true})}
});
