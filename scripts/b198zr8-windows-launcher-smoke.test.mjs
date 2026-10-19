/**
 * R8 Windows CMD END-TO-END smoke. This test can ONLY run against a fake
 * localhost HTTP server that is bound FIRST by the current process.
 * A bind failure aborts before ever launching the CMD. Never actual Qwen.
 *
 * Exercises the *actual* Windows .cmd, approval stdin, GET tags, ONE native
 * POST, PowerShell ZIP packaging, and B143/3D/R5 evidence in the ZIP.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const sha=x=>createHash('sha256').update(x).digest('hex');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const launcher=path.join(root,'scripts','RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd');
const modelSource={
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',designOnly:true,
  id:'r8-windows-cmd-fixture',title:'Synthetic test-only architecture',
  brief:'No real Qwen involved in the Windows command smoke.',
  bounds:{width:16,height:12,depth:16},elements:[
   {id:'base',shape:'box',mode:'add',material:'concrete',
    origin:[0,0,0],size:[16,1,16]},
   {id:'shell',shape:'box',mode:'add',material:'glass',
    origin:[1,1,1],size:[14,5,14],shell:1},
   {id:'clear-bottom',shape:'box',mode:'cut',
    origin:[2,1,2],size:[12,1,12]},
   {id:'skylight',shape:'box',mode:'cut',
    origin:[6,5,6],size:[4,1,4]},
   {id:'entry',shape:'box',mode:'cut',origin:[6,1,1],size:[4,3,2]}
  ]},
 explanation:'Fixture response, never a real user Qwen generation.',
 assumptions:['Human rating unverified'],
 spatialPlan:{
  designIntent:'A fictional public pavilion used for Windows testing only.',
  massStrategy:'A hollow exterior shell around an open courtyard.',
  circulationStrategy:'A level entrance to a navigable ground floor.',
  entrance:[7,1,2],headroom:2,
  protectedVoids:[{id:'open-air',origin:[6,1,6],size:[4,4,4],maxOccupiedCells:0}],
  destinations:[{id:'rear-room',point:[8,1,10],maximumPathSteps:30}],
  functionalZones:[{id:'usable-floor',origin:[3,1,3],size:[10,1,10],
   minimumReachablePositions:90,minimumReachablePercent:90}]
 }
};
const original=JSON.stringify(modelSource)+'\n';
function walk(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>{
  const p=path.join(dir,x.name);
  return x.isDirectory()?walk(p):[p];
 });
}
async function fakeOllama(){
 const calls={tags:0,chat:0,unrecognized:0,request:null};
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/api/tags'){
   calls.tags++;
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({models:[{name:'qwen3.8:27b'}]}));return;
  }
  if(req.method==='POST'&&req.url==='/api/chat'){
   calls.chat++;
   let payload='';for await(const b of req)payload+=String(b);
   calls.request=JSON.parse(payload);
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({done:true,done_reason:'stop',
    message:{content:original},eval_count:640,eval_duration:2800000000}));
   return;
  }
  calls.unrecognized++;res.writeHead(403);res.end();
 });
 // No fallback: if 11434 is occupied, FAIL before starting Windows CMD.
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(11434,'127.0.0.1',resolve);
 });
 return {calls,close:()=>new Promise(resolve=>server.close(resolve))};
}
function runCmd(approval,env){
 return new Promise((resolve,reject)=>{
  const child=spawn('cmd.exe',['/d','/c',launcher],{
   cwd:root,windowsHide:true,env,stdio:['pipe','pipe','pipe']
  });
  let stdout='',stderr='';
  const timer=setTimeout(()=>child.kill(),45000);
  child.stdout.on('data',b=>{stdout+=b.toString();if(stdout.length>150000)child.kill()});
  child.stderr.on('data',b=>{stderr+=b.toString();if(stderr.length>150000)child.kill()});
  child.once('error',e=>{clearTimeout(timer);reject(e)});
  child.once('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr})});
  child.stdin.end(approval+'\r\n');
 });
}
test('real Windows CMD: typed authorization -> fake Ollama 1 request -> ZIP of source,3D,human board',async()=>{
 if(process.platform!=='win32')return;
 const fake=await fakeOllama();
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'r8-windows-smoke-'));
 const appData=path.join(temporary,'LocalAppData');fs.mkdirSync(appData);
 const env={...process.env,LOCALAPPDATA:appData};
 try{
  const rejected=await runCmd('NOT_APPROVED',env);
  assert.equal(rejected.code,2,'bad typed phrase must HOLD');
  assert.equal(fake.calls.tags,0);
  assert.equal(fake.calls.chat,0);
  const result=await runCmd('I_APPROVE_ONE_LOCAL_MODEL_REQUEST',env);
  assert.equal(result.code,0,JSON.stringify(result).slice(-4500));
  assert.equal(fake.calls.tags,1);
  assert.equal(fake.calls.chat,1);
  assert.equal(fake.calls.unrecognized,0);
  assert.equal(fake.calls.request.model,'qwen3.8:27b');
  assert.equal(fake.calls.request.think,false);
  assert.equal(fake.calls.request.stream,false);
  assert.equal(fake.calls.request.format,'json');
  const outputRoot=path.join(appData,'MinecraftAIBuilder','R6_Evidence');
  const zips=fs.readdirSync(outputRoot).filter(x=>x.endsWith('_UPLOAD_THIS_RESULT.zip'));
  assert.equal(zips.length,1,'exactly one ZIP should be ready for upload');
  const unzip=path.join(temporary,'unzipped');
  const powershell=spawnSync('powershell.exe',['-NoProfile','-Command',
   'Expand-Archive -LiteralPath $env:R8_ZIP -DestinationPath $env:R8_EXTRACT -Force'],{
   env:{...env,R8_ZIP:path.join(outputRoot,zips[0]),R8_EXTRACT:unzip},
   encoding:'utf8',timeout:30000
  });
  assert.equal(powershell.status,0,String(powershell.stderr).slice(-1500));
  const files=walk(unzip),find=name=>files.find(p=>path.basename(p)===name);
  const originalPath=find('R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
  assert(originalPath,'original must be inside ZIP');
  assert.equal(fs.readFileSync(originalPath,'utf8'),original);
  assert(find('index.html'),'3D viewer must be inside ZIP');
  assert(find('B198W_REVIEW_BOARD.html'),'human scoring board must be in ZIP');
  const report=JSON.parse(fs.readFileSync(find('R6_SINGLE_CAPTURE_RESULT.json'),'utf8'));
  assert.equal(report.originalRawSha256,sha(original));
  assert.equal(report.status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
  assert.equal(report.visualReviewStatus,'WAITING_FOR_HUMAN_VISUAL_AND_SEMANTIC_REVIEW');
  assert.equal(report.readOnlyPreflight.status,'EXACT_MODEL_LISTED');
  assert.equal(report.safety.readiness,'NOT_PREPARED');
  assert.deepEqual(report.safety.BuildPlan.operations,[]);
  assert.equal(report.worldContacts,0);
  assert.equal(report.worldWrites,0);
 }finally{
  await fake.close();
  fs.rmSync(temporary,{recursive:true,force:true});
 }
});
