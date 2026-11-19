/**
 * Actual Windows PowerShell launcher, MOCK LOCAL HTTP transport only.
 * Uses an already-public genuine Qwen ARCHITECTUREPLAN as the provider's
 * unchanged fake response. This is NOT fresh local inference or Minecraft
 * proof. Ensures novice one-paste custom prompt path really produces
 * source-matched TRUE B143 exterior, cutaway and per-floor PNG without world writes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {execFileSync} from 'node:child_process';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const savedQwen=fs.readFileSync(new URL(
 '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
 import.meta.url),'utf8');

test('Windows custom brief -> ONE mock response -> strict B143 exterior and floor views',{
 skip:process.platform!=='win32',timeout:210000
},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v11-custom-fake-'));
 const local=path.join(temp,'LOCALAPPDATA');
 fs.mkdirSync(local);
 let posts=0;const requests=[];
 const server=createServer((req,res)=>{
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'){
   res.writeHead(404);res.end('not found');return;
  }
  let body='';
  req.setEncoding('utf8');
  req.on('data',c=>{body+=c;});
  req.on('end',()=>{
   posts++;
   try{requests.push(JSON.parse(body));}
   catch{res.writeHead(400);res.end('bad json');return;}
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({choices:[{finish_reason:'stop',
    message:{content:savedQwen}}]}));
  });
 });
 try{
  await new Promise((resolve,reject)=>{
   server.once('error',reject);
   server.listen(0,'127.0.0.1',resolve);
  });
  const addr=server.address(),port=addr.port;
  const prompt='Design a useful original research workshop with reachable equipment and public observation rooms';
  const args=['-NoProfile','-ExecutionPolicy','Bypass','-File',
   path.join(root,'scripts/r125-v11-windows-pilot.ps1'),
   '-SingleNewBrief','-Prompt',prompt,'-Model','fake-local-author',
   '-Endpoint',`http://127.0.0.1:${port}/v1/chat/completions`,
   '-ExpectedHead',execFileSync('git',['rev-parse','HEAD'],
    {cwd:root,encoding:'utf8'}).trim(),'-NoOpen'];
  const result=await new Promise((resolve,reject)=>{
   const child=spawn('powershell.exe',args,{
    cwd:root,env:{...process.env,LOCALAPPDATA:local},windowsHide:true});
   let stdout='',stderr='';
   child.stdout.setEncoding('utf8');
   child.stderr.setEncoding('utf8');
   child.stdout.on('data',chunk=>{stdout+=chunk;});
   child.stderr.on('data',chunk=>{stderr+=chunk;});
   child.once('error',reject);
   child.once('close',code=>resolve({code,stdout,stderr}));
  });
  assert.equal(result.code,0,result.stdout+'\n'+result.stderr);
  assert.equal(posts,1,'exactly one provider response, never retry');
  assert.equal(requests[0].model,'fake-local-author');
  assert.equal(requests[0].response_format.type,'json_object');
  const found=/V11_PRIVATE_RESULT=([^\r\n]+)/.exec(result.stdout);
  assert(found,'result path missing: '+result.stdout.slice(-1000));
  const out=found[1].trim();
  assert(out.startsWith(local),'result must remain PRIVATE');
  const report=JSON.parse(fs.readFileSync(path.join(out,'BATCH_REPORT.json'),'utf8'));
  assert.equal(report.planned,1);
  assert.equal(report.attempted,1);
  assert.equal(report.originalResponseCount,1);
  assert.equal(report.sourcePassCount,1);
  assert.equal(report.allSourceVerified,true);
  assert.equal(report.worldWrites,0);
  const row=report.completed[0];
  assert.equal(row.id,'custom-brief');
  const source=path.join(out,'custom-brief','B143_SOURCE_REVIEW_ONLY.json');
  assert(fs.existsSync(source));
  const originalRequest=fs.readFileSync(path.join(
   out,'custom-brief','REQUEST_ORIGINAL.txt'),'utf8');
  assert.equal(originalRequest,prompt);
  const art=path.join(out,'CUSTOM_4_VIEW_SOURCE_ART');
  const png=path.join(art,'CONTACT_4_VIEWS.png');
  const manifest=JSON.parse(fs.readFileSync(path.join(art,
   'STATIC_REVIEW.json'),'utf8'));
  assert(fs.statSync(png).size>10000);
  assert.equal(manifest.sourceSha256,row.sourceSha256);
  assert.equal(manifest.geometrySha256,row.geometrySha256);
  assert.equal(manifest.humanArt,'NOT_REVIEWED');
  assert.equal(manifest.minecraftWalking,'NOT_TESTED');
  assert.equal(manifest.modelCalls,0);
  assert.equal(manifest.worldWrites,0);
  const floorDir=path.join(out,'CUSTOM_FLOOR_SOURCE_ART');
  const floorPng=path.join(floorDir,'FLOOR_CONTACT_4_VIEWS.png');
  const floor=JSON.parse(fs.readFileSync(path.join(floorDir,'FLOOR_REVIEW.json'),'utf8'));
  assert(fs.statSync(floorPng).size>10000,'per-floor geometry PNG is real');
  assert.equal(floor.originalSha256,row.originalSha256);
  assert.equal(floor.sourceSha256,row.sourceSha256);
  assert.equal(floor.geometrySha256,row.geometrySha256);
  assert.equal(floor.sourceFileSha256,createHash('sha256')
   .update(fs.readFileSync(source)).digest('hex'));
  assert.equal(floor.contact.sha256,createHash('sha256')
   .update(fs.readFileSync(floorPng)).digest('hex'));
  assert(floor.levels===1||floor.levels===2);
  assert.equal(floor.humanArt,'NOT_REVIEWED');
  assert.equal(floor.minecraftWalking,'NOT_TESTED');
  assert.equal(floor.modelCalls,0);
  assert.equal(floor.worldContacts,0);
  assert.equal(floor.worldWrites,0);
  assert.deepEqual(floor.gates,Array(9).fill('BLOCKED'));
  assert(fs.existsSync(path.join(out,'BATCH_COMPARE_3D.html')));
  assert(result.stdout.includes('V11_CUSTOM_TRUE_B143_4_VIEW_IMAGE='));
  assert(result.stdout.includes('V11_CUSTOM_TRUE_B143_FLOOR_IMAGE='));
 }finally{
  await new Promise(resolve=>server.close(()=>resolve()));
  fs.rmSync(temp,{recursive:true,force:true});
 }
});

test('wrong expected HEAD fails BEFORE any local model POST and before private outputs',{
 skip:process.platform!=='win32',timeout:60000
},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v11-head-pin-'));
 try{
  const args=['-NoProfile','-ExecutionPolicy','Bypass','-File',
   path.join(root,'scripts/r125-v11-windows-pilot.ps1'),
   '-SingleNewBrief','-Prompt','A real practical satellite assembly building',
   '-Model','fake-local-author',
   '-Endpoint','http://127.0.0.1:11811/v1/chat/completions',
   '-ExpectedHead','0000000000000000000000000000000000000000','-NoOpen'];
  const result=await new Promise((resolve,reject)=>{
   const child=spawn('powershell.exe',args,{
    cwd:root,env:{...process.env,LOCALAPPDATA:dir},windowsHide:true});
   let stdout='',stderr='';
   child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
   child.stdout.on('data',chunk=>{stdout+=chunk;});
   child.stderr.on('data',chunk=>{stderr+=chunk;});
   child.once('error',reject);
   child.once('close',code=>resolve({code,stdout,stderr}));
  });
  assert.notEqual(result.code,0,'wrong pin must stop the entire run');
  assert.match(result.stdout+'\n'+result.stderr,
   /V11_PILOT_EXPECTED_HEAD_MISMATCH/);
  assert.equal(fs.existsSync(path.join(dir,'MinecraftAIBuilder','PrivateModelStudies')),
   false,'head mismatch happens before private outputs or any POST');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Windows one-click -RepairOnce preserves first raw then renders genuine second-model B143', {
 skip:process.platform!=='win32',timeout:210000
},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v11-revision-win-'));
 const local=path.join(temp,'LOCALAPPDATA');
 fs.mkdirSync(local);
 const firstPlan=JSON.parse(savedQwen);
 firstPlan.levels[0].spaces[0].fixtureDetail='crafted';
 const firstRaw=JSON.stringify(firstPlan);
 let posts=0;
 const server=createServer((req,res)=>{
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'){
   res.writeHead(404);res.end('not found');return;
  }
  let body='';
  req.setEncoding('utf8');
  req.on('data',chunk=>{body+=chunk});
  req.on('end',()=>{
   let payload;
   try{payload=JSON.parse(body)}
   catch{res.writeHead(400);res.end('bad json');return}
   posts++;
   if(posts===2){
    const revision=JSON.parse(payload.messages[1].content);
    assert.equal(revision.previousModelResponse,firstRaw);
    assert(revision.originalSourceHoldCodes.includes('R125_PLAN_SPACE_FIXTURE_DETAIL'));
   }
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({choices:[{finish_reason:'stop',
    message:{content:posts===1?firstRaw:savedQwen}}]}));
  });
 });
 try{
  await new Promise((resolve,reject)=>{
   server.once('error',reject);server.listen(0,'127.0.0.1',resolve);
  });
  const pin=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const args=['-NoProfile','-ExecutionPolicy','Bypass','-File',
   path.join(root,'scripts/r125-v11-windows-pilot.ps1'),
   '-SingleNewBrief','-Prompt',
   'Design an original small visitor gallery with a useful enclosed staff room',
   '-Model','fake-local-author','-RepairOnce',
   '-Endpoint',`http://127.0.0.1:${server.address().port}/v1/chat/completions`,
   '-ExpectedHead',pin,'-NoOpen'];
  const result=await new Promise((resolve,reject)=>{
   const child=spawn('powershell.exe',args,{
    cwd:root,env:{...process.env,LOCALAPPDATA:local},windowsHide:true});
   let stdout='',stderr='';
   child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
   child.stdout.on('data',chunk=>{stdout+=chunk});
   child.stderr.on('data',chunk=>{stderr+=chunk});
   child.once('error',reject);
   child.once('close',code=>resolve({code,stdout,stderr}));
  });
  assert.equal(result.code,0,result.stdout+'\n'+result.stderr);
  assert.equal(posts,2,'only one permitted revision after first genuine raw');
  const found=/V11_PRIVATE_RESULT=([^\r\n]+)/.exec(result.stdout);
  assert(found,'no PRIVATE directory in output');
  const out=found[1].trim();
  assert(out.startsWith(local));
  const report=JSON.parse(fs.readFileSync(path.join(out,'BATCH_REPORT.json'),'utf8'));
  assert.equal(report.totalModelCallAttempts,2);
  assert.equal(report.originalResponseCount,1);
  assert.equal(report.allSourceVerified,true);
  const row=report.completed[0];
  assert.equal(row.modelRevisionApplied,true);
  assert.equal(row.sourceVerified,true);
  const entry=path.join(out,'custom-brief');
  assert.equal(fs.readFileSync(path.join(entry,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),firstRaw);
  assert.equal(fs.readFileSync(path.join(entry,'MODEL_RESPONSE_REVISED.txt'),'utf8'),savedQwen);
  const firstDiag=JSON.parse(fs.readFileSync(path.join(entry,'SOURCE_DIAGNOSIS.json'),'utf8'));
  const finalDiag=JSON.parse(fs.readFileSync(path.join(entry,'SOURCE_DIAGNOSIS_REVISED.json'),'utf8'));
  assert.equal(firstDiag.sourceVerified,false);
  assert.equal(finalDiag.sourceVerified,true);
  const source=path.join(entry,'B143_REVISED_SOURCE_REVIEW_ONLY.json');
  assert(fs.existsSync(source));
  const art=path.join(out,'CUSTOM_4_VIEW_SOURCE_ART','CONTACT_4_VIEWS.png');
  const floor=path.join(out,'CUSTOM_FLOOR_SOURCE_ART','FLOOR_REVIEW.json');
  assert(fs.statSync(art).size>10000);
  const floorReview=JSON.parse(fs.readFileSync(floor,'utf8'));
  assert.equal(floorReview.originalSha256,row.revisedOriginalSha256);
  assert.equal(floorReview.sourceSha256,row.sourceSha256);
  assert.equal(floorReview.worldWrites,0);
  assert.equal(report.worldWrites,0);
  assert(result.stdout.includes('V11_PILOT_REVISED=True')||
   result.stdout.includes('V11_PILOT_REVISED=true'));
 }finally{
  await new Promise(resolve=>server.close(()=>resolve()));
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
