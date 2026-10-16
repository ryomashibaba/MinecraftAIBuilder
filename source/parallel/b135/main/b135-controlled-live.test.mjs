import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {
 b135Commands,b135Preflight,b135Evaluate,b135ProbeWorld,b135Save,MAX_ROUNDS
} from './b135-controlled-live.mjs';
import {buildB135Kit,verifyB135Kit,B135_CMD} from './b135-package.mjs';

const OUT=path.resolve(process.env.B135_KIT_PATH??'b135-review-output/B135_Controlled_Live_Test_World');
const good=(state,negative=-2147352576)=>[
 {statusCode:0,statusMessage:'block found'},
 {statusCode:negative,statusMessage:'block type mismatch'},
 ...[0,1,2,3].map(i=>({
   statusCode:i===state?0:negative,
   statusMessage:i===state?'success':'mismatch'
 }))
];
test('six and only six read-only controlled commands',()=>{
 const v=b135Commands('122 104 -138');
 assert.equal(v.length,6);
 assert.deepEqual(v.slice(0,2),[
  'testforblock 122 104 -138 minecraft:oak_stairs',
  'testforblock 122 104 -138 minecraft:bedrock'
 ]);
 assert.deepEqual(v.slice(2),[0,1,2,3].map(i=>
  'testforblock 122 104 -138 minecraft:oak_stairs ["weirdo_direction" = '+i+']'));
 assert(v.every(cmd=>/^testforblock -?\d+ -?\d+ -?\d+ minecraft:(?:oak_stairs(?: \["weirdo_direction" = [0-3]\])?|bedrock)$/.test(cmd)));
 for(const bad of ['1 2','1 2 3;fill','5e4 80 1','122 9000 -138']){
  assert.throws(()=>b135Commands(bad),/B133_COORDINATES/);
 }
});
test('no successCount required if known positive and execution-failure negative controls succeed',()=>{
 for(const state of [0,1,2,3]){
  const r=b135Evaluate('122 104 -138',good(state));
  assert.equal(r.controlsValid,true);
  assert.equal(r.provisionalStateValue,state);
  assert.equal(r.outcome,'ONE_CANDIDATE_NEEDS_VISUAL_AND_REPEAT');
  assert.deepEqual(r.probes.map(x=>x.classification),
   [0,1,2,3].map(x=>x===state?'MATCH':'NO_MATCH'));
  assert.equal(r.directionVisuallyChecked,false);
  assert.equal(r.traversabilityVerified,false);
  assert.equal(r.independentlyCertified,false);
  assert.equal(r.constructionAllowed,false);
  assert.deepEqual(r.operations,[]);
 }
});
test('explicit successCount can be present but cannot contradict actual statusCode',()=>{
 const g=good(1).map(x=>({...x,successCount:x.statusCode===0?1:0}));
 assert.equal(b135Evaluate('1 75 1',g).provisionalStateValue,1);
 g[3].successCount=0;
 assert.equal(b135Evaluate('1 75 1',g).provisionalStateValue,null);
});
test('bad controls, syntax and permission errors fail closed',()=>{
 const pairs=[
  arr=>{arr[0]={statusCode:-2147352576};},
  arr=>{arr[1]={statusCode:0};},
  arr=>{arr[1]={statusCode:-2147483648};},
  arr=>{arr[1]={statusCode:-2147483646};},
  arr=>{arr[1]={transportError:true};},
  arr=>{arr[0]={statusCode:0,successCount:0};},
  arr=>{arr[2]={statusCode:-2147483644};},
  arr=>{arr[4]={transportError:true,statusMessage:'timeout'};},
  arr=>{arr[2]={statusCode:0};},
  arr=>{arr[3]={statusCode:-2147352575};}
 ];
 for(const change of pairs){
  const arr=good(1);change(arr);
  const result=b135Evaluate('1 80 3',arr);
  assert.equal(result.provisionalStateValue,null);
  assert.equal(result.outcome,'INCONCLUSIVE');
 }
});
test('world mock receives only 6 testforblock and explicit response timeout',async()=>{
 const sent=[];
 const r=await b135ProbeWorld({
  async runCommand(cmd,opt){
   sent.push(cmd);
   assert.deepEqual(opt,{timeout:8000,noResponse:false});
   return good(3)[sent.length-1];
  }
 },'11 80 3');
 assert.equal(sent.length,6);
 assert(sent.every(x=>x.startsWith('testforblock ')));
 assert.equal(r.provisionalStateValue,3);
});
test('thrown transport timeout is saved as unknown rather than block mismatch',async()=>{
 let i=0;
 const r=await b135ProbeWorld({
  async runCommand(){i++;if(i===5)throw Error('world disconnected');return good(2)[i-1];}
 },'11 80 3');
 assert.equal(i,6);
 assert.equal(r.provisionalStateValue,null);
 assert.equal(r.probes[2].classification,'UNKNOWN');
 assert.equal(r.probes[2].response.transportError,true);
});
test('real-contact diagnostic is operator-unreviewed and never writes B130 claims',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'B135 raw diagnostic '));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const r=b135Evaluate('10 65 -5',good(2));
 const f=b135Save(r,tmp,1);
 const o=JSON.parse(fs.readFileSync(f,'utf8'));
 assert.equal(o.provisionalStateValue,2);
 assert.equal(o.evidenceType,'GAME_RESPONSE_REPORT_OPERATOR_UNREVIEWED');
 assert.equal(o.independentlyCertified,false);
 assert.equal(o.readiness,'NOT_PREPARED');
 assert.equal(fs.existsSync(path.join(tmp,'data','B130_Observation_Receipts.json')),false);
 assert.throws(()=>b135Save({...r,independentlyCertified:true},tmp),/B135_INVALID_DIAGNOSTIC/);
 assert.throws(()=>b135Save(r,tmp,5),/B135_INVALID_DIAGNOSTIC/);
});
test('B135 artifact keeps B134 untouched and is safe before live connection',()=>{
 if(!process.env.B135_KIT_PATH)buildB135Kit({out:OUT});
 const a=verifyB135Kit(OUT);
 assert.equal(a.initialRealGameEvidence,0);
 assert.equal(a.roundsAvailable,MAX_ROUNDS);
 assert.equal(a.constructionAllowed,false);
 assert.deepEqual(a.operations,[]);
 assert.equal(a.readiness,'NOT_PREPARED');
 assert.deepEqual(b135Preflight(OUT),{readyForLiveProbeOnly:true,constructionAllowed:false});
 assert.equal(fs.readFileSync(path.join(OUT,'START_B135_CONTROLLED_LIVE.cmd'),'utf8'),B135_CMD);
 assert.equal(fs.existsSync(path.join(OUT,'data','B135_Live_Diagnostics')),false);
});
test('tampered runtime fails both package verification and startup preflight',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'B135 tamper source '));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const dest=path.join(tmp,'Package With Spaces');
 fs.cpSync(OUT,dest,{recursive:true});
 fs.appendFileSync(path.join(dest,'source/parallel/b135/main/b135-controlled-live.mjs'),'\n// tamper\n');
 assert.throws(()=>verifyB135Kit(dest),/B135_TAMPER_OR_UNSAFE/);
 assert.throws(()=>b135Preflight(dest),/B135_RUNTIME_PIN_MISMATCH/);
});
test('native Windows CMD dry run uses no Minecraft or npm',
 {skip:process.platform!=='win32'},()=>{
 const run=spawnSync('cmd.exe',['/d','/c','START_B135_CONTROLLED_LIVE.cmd','--check'],
  {cwd:OUT,encoding:'utf8',windowsHide:true,timeout:30000});
 assert.equal(run.status,0,JSON.stringify({stdout:run.stdout,stderr:run.stderr,error:run.error?.message}));
 assert.equal(run.stdout.split('testforblock ').length-1,6);
});
