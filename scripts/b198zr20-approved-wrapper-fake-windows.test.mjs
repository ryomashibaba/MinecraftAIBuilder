/**
 * R20 Windows starter end-to-end. The mock server MUST own 127.0.0.1:11434
 * before any approved-run CMD executes. If port is busy, fail CLOSED.
 * GitHub immutable downloads + SHA verification + PowerShell 5.1 + R16
 * offline tests + R17 manual ack and at most one FAKE POST. Never real Qwen.
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

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cmd=path.join(repo,'tools','r20-approved-once','START_APPROVED_QWEN_ONCE.cmd');
const sha=s=>createHash('sha256').update(s).digest('hex');
const original=JSON.stringify({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',id:'r20-ci-mock',
  title:'Mock only not Qwen',brief:'A fake pavilion. Not a real model.',
  bounds:{width:22,height:15,depth:20},designOnly:true,
  elements:[
   {id:'base',shape:'box',mode:'add',material:'concrete',origin:[0,0,0],size:[22,1,20]},
   {id:'shell',shape:'box',mode:'add',material:'glass',origin:[1,1,1],size:[20,8,18],shell:1},
   {id:'atrium',shape:'box',mode:'cut',origin:[5,1,5],size:[12,8,10]},
   {id:'entrance',shape:'box',mode:'cut',origin:[8,1,1],size:[4,3,4]},
   {id:'stairs',shape:'staircase',mode:'add',material:'stone',
    origin:[3,1,5],axis:'x',direction:1,width:3,steps:3,treadDepth:2}
  ]},
 spatialPlan:{designIntent:'Public open hall with atrium space',
  massStrategy:'Glass shell with contrasting lower floor',
  circulationStrategy:'Enter near lower courtyard then climb',
  entrance:[9,1,3],headroom:2,
  protectedVoids:[{id:'void',origin:[8,1,8],size:[4,5,4],maxOccupiedCells:0}],
  destinations:[{id:'hall',point:[9,1,10],maximumPathSteps:25}],
  functionalZones:[{id:'open-space',origin:[6,1,7],size:[9,1,8],
   minimumReachablePositions:60,minimumReachablePercent:85}]},
 explanation:'CI-only mock result',assumptions:['No world writes']
});
function startMock(){
 const tally={get:0,post:0,unexpected:0,listed:true,requests:[]};
 const server=http.createServer(async(req,res)=>{
  if(req.url==='/api/tags'&&req.method==='GET'){
   tally.get++;
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({models:tally.listed?[{name:'qwen3.8:27b'}]:[]}));
   return;
  }
  if(req.url==='/api/chat'&&req.method==='POST'){
   tally.post++;
   let body='';for await(const part of req)body+=part.toString();
   tally.requests.push(JSON.parse(body));
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({done:true,done_reason:'stop',eval_count:890,
    prompt_eval_count:850,eval_duration:3000000000,
    message:{content:original}}));
   return;
  }
  tally.unexpected++;res.writeHead(403);res.end();
 });
 return new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(11434,'127.0.0.1',()=>resolve({tally,
   close:()=>new Promise(end=>server.close(end))}));
 });
}
function run(env,ack){
 return new Promise((resolve,reject)=>{
  const child=spawn('cmd.exe',['/d','/c',cmd],{
   cwd:repo,env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='';
  const timeout=setTimeout(()=>child.kill(),240000);
  child.stdout.on('data',b=>{stdout+=b.toString();if(stdout.length>120000)child.kill()});
  child.stderr.on('data',b=>{stderr+=b.toString();if(stderr.length>120000)child.kill()});
  child.on('error',e=>{clearTimeout(timeout);reject(e)});
  child.on('close',code=>{clearTimeout(timeout);resolve({code,stdout,stderr})});
  child.stdin.end(ack+'\r\n');
 });
}
function allFiles(root){
 return fs.readdirSync(root,{withFileTypes:true}).flatMap(v=>{
  const p=path.join(root,v.name);
  return v.isDirectory()?allFiles(p):[p];
 });
}
test('R20 one-click Windows starter: missing model => no lock; approved model => exactly one fake POST + ZIP; rerun refused',async()=>{
 if(process.platform!=='win32')return;
 const fake=await startMock();
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r20-approved-only-mock-'));
 const env={...process.env,LOCALAPPDATA:path.join(root,'AppData'),CI:'true'};
 delete env.NODE_TEST_CONTEXT;
 delete env.NODE_TEST_WORKER_ID;
 fs.mkdirSync(env.LOCALAPPDATA);
 try{
  fake.tally.listed=false;
  const notReady=await run(env,'I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST');
  assert.equal(notReady.code,1,JSON.stringify(notReady).slice(-2100));
  assert.equal(fake.tally.post,0);
  assert.equal(fake.tally.get,1);
  assert(!fs.existsSync(path.join(env.LOCALAPPDATA,
   'MinecraftAIBuilder','R17_OneShot_Evidence','R17_APPROVAL_CONSUMED_LOCK.txt')));
  fake.tally.listed=true;
  const good=await run(env,'I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST');
  assert([0,2].includes(good.code),JSON.stringify(good).slice(-2100));
  assert.equal(fake.tally.post,1);
  assert.equal(fake.tally.get,3,'pre-lock and R17 preflight only');
  assert.equal(fake.tally.unexpected,0);
  const body=fake.tally.requests[0];
  assert.equal(body.model,'qwen3.8:27b');
  assert.equal(body.options.num_predict,3072);
  assert.equal(body.options.num_ctx,6144);
  assert.equal(body.think,false);
  assert.equal(body.stream,false);
  assert.equal(body.format,'json');
  const output=path.join(env.LOCALAPPDATA,'MinecraftAIBuilder','R17_OneShot_Evidence');
  assert(fs.existsSync(path.join(output,'R17_APPROVAL_CONSUMED_LOCK.txt')));
  const zips=fs.readdirSync(output).filter(x=>x.endsWith('_UPLOAD_THIS_RESULT.zip'));
  assert.equal(zips.length,1);
  const expanded=path.join(root,'expanded');
  const unzip=spawnSync('powershell.exe',['-NoProfile','-Command',
   'Expand-Archive -LiteralPath $env:ZIP -DestinationPath $env:DEST'],{
   env:{...env,ZIP:path.join(output,zips[0]),DEST:expanded},timeout:50000,
   encoding:'utf8'});
  assert.equal(unzip.status,0,unzip.stderr);
  const entries=allFiles(expanded);
  const file=n=>entries.find(x=>path.basename(x)===n);
  assert(file('R18_OFFLINE_EVIDENCE_LINK_AUDIT.json'));
  assert(file('R17_ONE_SHOT_MANIFEST.json'));
  assert(file('R11_OFFLINE_COMPLETION_AUDIT.json'));
  assert(file('R13_OFFLINE_QUALITY_DECISION.json'));
  assert.equal(fs.readFileSync(file('R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),original);
  const link=JSON.parse(fs.readFileSync(file('R18_OFFLINE_EVIDENCE_LINK_AUDIT.json'),'utf8'));
  assert.equal(link.rawSha256,sha(original));
  assert.equal(link.status,'SHA_LINKED_EVIDENCE_PRESENT');
  const again=await run(env,'I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST');
  assert.equal(again.code,1,'consumed R17 approval may not run twice');
  assert.equal(fake.tally.post,1);
  assert.equal(fake.tally.get,4,'bootstrap read-only GET may rerun; R17 must never send POST');
 }finally{
  await fake.close();
  fs.rmSync(root,{recursive:true,force:true});
 }
});
