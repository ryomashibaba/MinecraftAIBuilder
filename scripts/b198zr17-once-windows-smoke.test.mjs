/**
 * R17 one-shot Windows smoke. The fake 127.0.0.1:11434 server MUST bind
 * before invoking any actual R17 launcher. If occupied (e.g. real Ollama)
 * the test fails without invoking the launcher. Never real Qwen.
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
import {R11_COMPACT_GUIDE,R11_GUIDE_SHA256}
 from '../source/ai/b198zr11-compact-r4-output.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const command=path.join(root,'tools','r17-gated',
 'RUN_R17_ONCE_AFTER_FRESH_APPROVAL.cmd');
const sha=s=>createHash('sha256').update(s).digest('hex');
const fixture=JSON.stringify({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'r17-fake-only',title:'Fixture pavilion not real Qwen',
  brief:'Synthetic only; no Minecraft construction',
  bounds:{width:22,height:15,depth:20},designOnly:true,
  elements:[
   {id:'base',shape:'box',mode:'add',material:'concrete',
    origin:[0,0,0],size:[22,1,20]},
   {id:'shell',shape:'box',mode:'add',material:'glass',
    origin:[1,1,1],size:[20,8,18],shell:1},
   {id:'atrium',shape:'box',mode:'cut',
    origin:[5,1,5],size:[12,8,10]},
   {id:'entrance',shape:'box',mode:'cut',
    origin:[8,1,1],size:[4,3,4]},
   {id:'ribs',shape:'box',mode:'add',material:'metal',
    origin:[3,1,16],size:[1,6,1],repeat:{count:3,offset:[6,0,0]}},
   {id:'stairs',shape:'staircase',mode:'add',material:'stone',
    origin:[3,1,5],axis:'x',direction:1,width:3,steps:3,treadDepth:2}
  ]},
 spatialPlan:{designIntent:'Public open hall with broad interior atrium',
  massStrategy:'Continuous roof and repeated facade ribs',
  circulationStrategy:'Ground entry and supported interior floors',
  entrance:[9,1,3],headroom:2,protectedVoids:[{
   id:'void',origin:[8,1,8],size:[4,5,4],maxOccupiedCells:0}],
  destinations:[{id:'hall',point:[9,1,10],maximumPathSteps:25}],
  functionalZones:[{id:'open-space',origin:[6,1,7],size:[9,1,8],
   minimumReachablePositions:60,minimumReachablePercent:85}]},
 explanation:'Test data: artificial fake server only',
 assumptions:['Architecture not reviewed']
});
async function fakeServer(){
 const calls={get:0,post:0,bad:0,payload:[]};
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/api/tags'){
   calls.get++;
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({models:[{name:'qwen3.8:27b'}]}));return;
  }
  if(req.method==='POST'&&req.url==='/api/chat'){
   calls.post++;
   let body='';for await(const b of req)body+=String(b);
   calls.payload.push(JSON.parse(body));
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({done:true,done_reason:'stop',
    eval_count:900,prompt_eval_count:850,eval_duration:3000000000,
    message:{content:fixture}}));return;
  }
  calls.bad++;res.writeHead(403);res.end();
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(11434,'127.0.0.1',resolve);
 });
 return {calls,close:()=>new Promise(resolve=>server.close(resolve))};
}
function execute(ack,env){
 return new Promise((resolve,reject)=>{
  const child=spawn('cmd.exe',['/d','/c',command],{
   cwd:root,windowsHide:true,env,stdio:['pipe','pipe','pipe']
  });
  let stdout='',stderr='';
  const timeout=setTimeout(()=>child.kill(),155000);
  child.stdout.on('data',b=>{stdout+=String(b);if(stdout.length>100000)child.kill()});
  child.stderr.on('data',b=>{stderr+=String(b);if(stderr.length>100000)child.kill()});
  child.on('error',e=>{clearTimeout(timeout);reject(e)});
  child.on('close',code=>{clearTimeout(timeout);resolve({code,stdout,stderr})});
  child.stdin.end(ack+'\r\n');
 });
}
function files(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const p=path.join(dir,e.name);return e.isDirectory()?files(p):[p];
 });
}
test('R17 true Windows launcher: no approval/old approval => no GET or POST; fresh phrase -> fake Qwen ONCE; repeated fresh phrase -> none',async()=>{
 if(process.platform!=='win32')return;
 const fake=await fakeServer(); // MUST OWN FIXTURE PORT 11434 BEFORE CMD
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r17-only-fake-'));
 const app=path.join(temp,'LocalAppData');fs.mkdirSync(app);
 const env={...process.env,LOCALAPPDATA:app,CI:'true'};
 // Node --test tags the current worker with an internal test context.
 // A second Node --test from pinned R16 must behave like normal Windows
 // execution, not inherit the parent's TAP aggregation channel.
 delete env.NODE_TEST_CONTEXT;
 delete env.NODE_TEST_WORKER_ID;
 try{
  const denied=await execute('NO',env);
  assert.equal(denied.code,2,denied.stdout.slice(-600));
  const oldConsent=await execute('I_APPROVE_ONE_LOCAL_MODEL_REQUEST',env);
  assert.equal(oldConsent.code,2,'old R6 consent MUST NOT authorize R17');
  assert.equal(fake.calls.get,0);
  assert.equal(fake.calls.post,0);
  assert(!fs.existsSync(path.join(app,'MinecraftAIBuilder','R17_OneShot_Evidence')));
  // Prepare the exact 32-file SHA pinned install as in user R16 prep.
  const install=path.join(root,'tools','r16-mini','INSTALL_R16_MINI.ps1');
  const cache=path.join(app,'MinecraftAIBuilder','R16_SetupCache');
  fs.mkdirSync(cache,{recursive:true});
  const p=path.join(cache,'INSTALL_R16_8675fb2ca2aa.ps1');
  fs.copyFileSync(install,p);
  const setup=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',p],
   {env,encoding:'utf8',timeout:155000,maxBuffer:2_000_000});
  assert.equal(setup.status,0,(setup.stdout+'\n'+setup.stderr).slice(-2100));
  const first=await execute('I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST',env);
  assert([0,2].includes(first.code),JSON.stringify(first).slice(-2700));
  assert.equal(fake.calls.get,1);
  assert.equal(fake.calls.post,1);
  assert.equal(fake.calls.bad,0);
  const payload=fake.calls.payload[0];
  assert.equal(payload.model,'qwen3.8:27b');
  assert.equal(payload.options.num_predict,3072);
  assert.equal(payload.options.num_ctx,6144);
  assert.equal(payload.think,false);
  assert.equal(payload.stream,false);
  assert.equal(payload.messages[0].content,R11_COMPACT_GUIDE);
  assert.equal(payload.format,'json');
  const evidence=path.join(app,'MinecraftAIBuilder','R17_OneShot_Evidence');
  assert(fs.existsSync(path.join(evidence,'R17_APPROVAL_CONSUMED_LOCK.txt')));
  const zipNames=fs.readdirSync(evidence).filter(x=>x.endsWith('_UPLOAD_THIS_RESULT.zip'));
  assert.equal(zipNames.length,1,'even a HOLD source must produce one upload ZIP');
  const output=path.join(temp,'unzipped');
  const expand=spawnSync('powershell.exe',['-NoProfile','-Command',
   'Expand-Archive -LiteralPath $env:ZIP_FOR_R17 -DestinationPath $env:OUT_R17'],{
   env:{...env,ZIP_FOR_R17:path.join(evidence,zipNames[0]),OUT_R17:output},
   encoding:'utf8',timeout:45000
  });
  assert.equal(expand.status,0,expand.stderr.slice(-2000));
  const unpacked=files(output);
  const find=name=>unpacked.find(x=>path.basename(x)===name);
  assert(find('R17_ONE_SHOT_MANIFEST.json'));
  assert(find('R13_OFFLINE_QUALITY_DECISION.json'));
  assert(find('R13_OFFLINE_QUALITY_OVERVIEW.html'));
  assert(find('R11_OFFLINE_COMPLETION_AUDIT.json'));
  assert(find('R18_OFFLINE_EVIDENCE_LINK_AUDIT.json'));
  assert.equal(fs.readFileSync(find('R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),fixture);
  const manifest=JSON.parse(fs.readFileSync(find('R17_ONE_SHOT_MANIFEST.json'),'utf8'));
  assert.equal(manifest.profile,'r11-compact');
  assert.equal(manifest.modelAttemptsAllowed,1);
  assert.equal(manifest.modelQualityAutoAccepted,false);
  assert.equal(manifest.worldWrites,0);
  assert.equal(manifest.readiness,'NOT_PREPARED');
  assert.equal(manifest.offlineEvidenceLinkStatus,'SHA_LINKED_EVIDENCE_PRESENT');
  assert.deepEqual(manifest.offlineEvidenceLinkIssues,[]);
  assert.equal(manifest.earlyCaptureFolderRecovered,false);
  const links=JSON.parse(fs.readFileSync(find('R18_OFFLINE_EVIDENCE_LINK_AUDIT.json'),'utf8'));
  assert.equal(links.status,'SHA_LINKED_EVIDENCE_PRESENT');
  assert.equal(links.rawSha256,sha(fixture));
  assert.deepEqual(links.linkedEvidenceIssues,[]);
  assert.equal(links.modelRequestsAddedByThisAudit,0);
  assert.equal(links.worldWrites,0);
  const audit=JSON.parse(fs.readFileSync(find('R11_OFFLINE_COMPLETION_AUDIT.json'),'utf8'));
  assert.equal(audit.profileGuideSha256,R11_GUIDE_SHA256);
  assert.equal(audit.rawSha256,sha(fixture));
  assert.equal(audit.exactFourKeyJsonParseable,true);
  assert.equal(audit.staircaseElements,1);
  assert.equal(audit.repeatedElements,1);
  const repeated=await execute('I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST',env);
  assert.equal(repeated.code,1);
  assert(repeated.stdout.includes('ONE_R17_ATTEMPT_ALREADY_CONSUMED_NO_AUTO_RETRY'),
   JSON.stringify(repeated).slice(-1100));
  assert.equal(fake.calls.get,1,'repeated approved click may NEVER contact Ollama');
  assert.equal(fake.calls.post,1,'repeated approved click may NEVER generate');
  assert.equal(fs.readdirSync(evidence).filter(x=>x.endsWith('_UPLOAD_THIS_RESULT.zip')).length,1);
 }finally{
  await fake.close();
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
