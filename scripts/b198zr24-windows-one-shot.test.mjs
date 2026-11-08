/**
 * R24 true Windows prep + future runner integration test. One fake HTTP
 * server MUST own 127.0.0.1:11434 before any possible model POST.
 * Never connect to real Ollama. All model content below is synthetic.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceDir=path.join(repo,'tools','r24-future');
const installer=path.join(sourceDir,'INSTALL_R24_OFFLINE_ONLY.ps1');
const runner=path.join(sourceDir,'RUN_R24_ONCE_ONLY_AFTER_NEW_APPROVAL.ps1');
const sha=s=>createHash('sha256').update(s).digest('hex');
const phrase='I_APPROVE_R23_ONE_LOCAL_QWEN_REQUEST';
const fakeOriginal=JSON.stringify({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'r24-fake-qa-pavilion',title:'R24 synthetic building',
  brief:'Fake local HTTP test fixture, not real Qwen quality.',
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
 explanation:'Synthetic fixture. The 3D architecture is not Qwen-authored.',
 assumptions:[]
});
async function fakeServer(){
 const calls={get:0,post:0,other:0,request:null};
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/api/tags'){
   calls.get++;
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({models:[{name:'qwen3.8:27b'}]}));
   return;
  }
  if(req.method==='POST'&&req.url==='/api/chat'){
   calls.post++;
   let src='';for await(const part of req)src+=String(part);
   calls.request=JSON.parse(src);
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({done:true,done_reason:'stop',
    message:{content:fakeOriginal},eval_count:888,prompt_eval_count:821,
    total_duration:1200000000,eval_duration:1100000000}));
   return;
  }
  calls.other++;res.writeHead(403);res.end();
 });
 return new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(11434,'127.0.0.1',()=>resolve({
   calls,close:()=>new Promise(done=>server.close(done))}));
 });
}
function psSync(script,env,args=[]){
 return spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass',
  '-File',script,...args],{cwd:repo,env,timeout:250000,
  encoding:'utf8',maxBuffer:3_000_000});
}
function psAsync(script,env,args=[]){
 return new Promise((resolve,reject)=>{
  const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass',
   '-File',script,...args],{cwd:repo,env,windowsHide:true,
   stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  const limit=setTimeout(()=>child.kill(),210000);
  child.stdout.on('data',x=>{stdout+=x.toString();if(stdout.length>400000)child.kill()});
  child.stderr.on('data',x=>{stderr+=x.toString();if(stderr.length>400000)child.kill()});
  child.once('error',e=>{clearTimeout(limit);reject(e)});
  child.once('close',code=>{clearTimeout(limit);resolve({code,stdout,stderr})});
 });
}
function list(root){
 return fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>{
  const p=path.join(root,e.name);
  return e.isDirectory()?list(p):[p];
 });
}
test('R24 Windows real setup verifies 37 pinned files; future consent routes exactly one FAKE model and one ZIP',async()=>{
 if(process.platform!=='win32')return;
 const fake=await fakeServer(); // FAIL CLOSED if real Ollama already occupies port
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r24-future-qa-'));
 const env={...process.env,LOCALAPPDATA:path.join(temp,'LocalAppData'),
  CI:'true'};
 delete env.NODE_TEST_CONTEXT;delete env.NODE_TEST_WORKER_ID;
 fs.mkdirSync(env.LOCALAPPDATA);
 try{
  const denied=await psAsync(runner,env,['-R24Consent','OLD_R17_APPROVAL']);
  assert.equal(denied.code,1,denied.stdout.slice(-1500));
  assert.equal(fake.calls.get,0);
  assert.equal(fake.calls.post,0);
  const setup=psSync(installer,env);
  assert.equal(setup.status,0,
   (setup.stdout+'\n'+setup.stderr).slice(-2400));
  assert(setup.stdout.includes('OFFLINE PREPARED'),setup.stdout.slice(-1100));
  assert.equal(fake.calls.get,0);
  assert.equal(fake.calls.post,0);
  const target=path.join(env.LOCALAPPDATA,
   'MinecraftAIBuilder','R24_Mini_44108944d0d9');
  assert(fs.existsSync(path.join(target,'scripts',
   'b198zr23-future-one-shot.mjs')));
  assert.equal(list(target).length,37);
  const check=psSync(installer,env,['-CheckOnly']);
  assert.equal(check.status,0,
   (check.stdout+'\n'+check.stderr).slice(-2000));
  const first=await psAsync(runner,env,['-R24Consent',phrase]);
  assert([0,2].includes(first.code),JSON.stringify(first).slice(-2500));
  assert.equal(fake.calls.get,2,'R23 wrapper and R6 read-only preflights');
  assert.equal(fake.calls.post,1,'one FAKE local model POST only');
  assert.equal(fake.calls.other,0,'no additional endpoints');
  assert.equal(fake.calls.request.model,'qwen3.8:27b');
  assert.equal(fake.calls.request.stream,false);
  assert.equal(fake.calls.request.think,false);
  assert.equal(fake.calls.request.format,'json');
  assert.equal(fake.calls.request.options.num_predict,3072);
  assert.equal(fake.calls.request.options.num_ctx,6144);
  const evidence=path.join(env.LOCALAPPDATA,
   'MinecraftAIBuilder','R24_OneShot_Evidence');
  assert(fs.existsSync(path.join(evidence,'R23_APPROVAL_CONSUMED_LOCK.txt')));
  const zips=fs.readdirSync(evidence).filter(x=>x.endsWith('_UPLOAD_THIS_RESULT.zip'));
  assert.equal(zips.length,1,'single upload ZIP even if architecture HOLD');
  const expanded=path.join(temp,'R24_unzipped');
  const unzip=spawnSync('powershell.exe',['-NoProfile','-Command',
   'Expand-Archive -LiteralPath $env:R24_ZIP -DestinationPath $env:R24_DEST'],{
   env:{...env,R24_ZIP:path.join(evidence,zips[0]),R24_DEST:expanded},
   encoding:'utf8',timeout:60000});
  assert.equal(unzip.status,0,unzip.stderr.slice(-2000));
  const fileNames=list(expanded);
  const find=n=>fileNames.find(p=>path.basename(p)===n);
  for(const name of ['R24_PACKAGING_MANIFEST.json','R23_ONE_SHOT_MANIFEST.json',
   'R23_EVIDENCE_CHAIN_AUDIT.json','R23_SOURCE_FORENSICS.json',
   'R13_OFFLINE_QUALITY_DECISION.json','R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt']){
   assert(find(name),name+' missing from ZIP');
  }
  assert.equal(fs.readFileSync(find('R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),
   fakeOriginal);
  const audit=JSON.parse(fs.readFileSync(find('R23_EVIDENCE_CHAIN_AUDIT.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(find('R24_PACKAGING_MANIFEST.json'),'utf8'));
  assert.equal(audit.rawSha256,sha(fakeOriginal));
  assert.equal(audit.issues.length,0);
  assert.equal(manifest.auditAndRawMatch,true,JSON.stringify({manifest,audit,first},null,2).slice(-3500));
  assert.equal(manifest.approvalConsumed,true);
  assert.equal(manifest.automaticRetries,0);
  assert.equal(manifest.worldWrites,0);
  assert.equal(manifest.readiness,'NOT_PREPARED');
  assert(manifest.gates.every(v=>v==='BLOCKED'));
  assert.deepEqual(manifest.BuildPlan.operations,[]);
  const repeat=await psAsync(runner,env,['-R24Consent',phrase]);
  assert.equal(repeat.code,1,'spent approval must deny second generation');
  assert(repeat.stdout.includes('R23_ONE_REQUEST_ALREADY_CONSUMED_NO_RETRY'));
  assert.equal(fake.calls.post,1);
  assert.equal(fake.calls.get,2);
  assert.equal(fs.readdirSync(evidence)
   .filter(x=>x.endsWith('_UPLOAD_THIS_RESULT.zip')).length,1);
 }finally{
  await fake.close();
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
