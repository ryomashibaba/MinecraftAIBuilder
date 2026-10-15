import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {
 createB134Commands,classifyB134Response,evaluateB134Results,
 queryB134World,saveB134Diagnostic
} from './b134-live-probe.mjs';
import {buildB134Kit,verifyB134Kit,B134_CMD} from './b134-package.mjs';

const OUT=path.resolve(process.env.B134_KIT_PATH??
 'b134-review-output/B134_Windows_Live_ReadOnly_Stair');

test('B134 commands are five bounded read-only testforblock queries',()=>{
 const cmd=createB134Commands('122 104 -138');
 assert.equal(cmd.length,5);
 assert.deepEqual(cmd.slice(1),[0,1,2,3].map(value=>
  'testforblock 122 104 -138 minecraft:oak_stairs ["weirdo_direction" = '+value+']'));
 assert.equal(cmd[0],'testforblock 122 104 -138 minecraft:oak_stairs');
 assert(cmd.every(x=>/^testforblock [-\d ]+ minecraft:oak_stairs(?: \["weirdo_direction" = [0-3]\])?$/.test(x)));
 for(const unsafe of ['', '1 2', '1 2 3;setblock 2 2 2 stone','1e4 2 3','1 9999 3']){
  assert.throws(()=>createB134Commands(unsafe),/B133_COORDINATES/);
 }
});
test('response parser never converts statusMessage or undefined successCount into a match',()=>{
 assert.equal(classifyB134Response({statusCode:0,statusMessage:'testforblock succeeded'}),'UNKNOWN');
 assert.equal(classifyB134Response({statusCode:-1,successCount:1}),'UNKNOWN');
 assert.equal(classifyB134Response({transportError:true,statusCode:0,successCount:1}),'UNKNOWN');
 assert.equal(classifyB134Response({statusCode:0,successCount:1}),'MATCH');
 assert.equal(classifyB134Response({statusCode:0,successCount:0}),'NO_MATCH');
 assert.equal(classifyB134Response({statusCode:0,successCount:true}),'UNKNOWN');
 assert.equal(classifyB134Response({statusCode:0,successCount:2}),'UNKNOWN');
});
test('unique four state result is a provisional candidate only, not a certification',()=>{
 const arr=[{statusCode:0,successCount:1},...([0,1,2,3].map((x)=>({
  statusCode:0,successCount:x===2?1:0
 })))];
 const r=evaluateB134Results('122 104 -138',arr);
 assert.equal(r.provisionalStateValue,2);
 assert.equal(r.outcome,'UNIQUE_FOUR_STATE_RESPONSE_NEEDS_VISUAL_REVIEW');
 assert.equal(r.authenticatedStairCertification,false);
 assert.equal(r.walkabilityVerified,false);
 assert.equal(r.constructionAllowed,false);
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.deepEqual(r.operations,[]);
});
test('multiple match, none, unreliable baseline and timeout are all inconclusive',()=>{
 const response=(xs)=>xs.map(n=>n===null?{statusCode:0,statusMessage:'ok'}:
  {statusCode:0,successCount:n});
 for(const set of [
  [1,1,1,0,0],[1,0,0,0,0],[0,1,0,0,0],[null,0,1,0,0],
  [1,0,null,1,0]
 ]){
  const result=evaluateB134Results('122 104 -138',response(set));
  assert.equal(result.provisionalStateValue,null);
  assert.equal(result.outcome,'INCONCLUSIVE_NEEDS_GAME_INSPECTION');
 }
});
test('mock world receives ONLY five read-only Minecraft commands, no block writes',async()=>{
 const commands=[];
 const world={
  async runCommand(command,options){
   commands.push(command);
   assert.deepEqual(options,{timeout:8000,noResponse:false});
   return {statusCode:0,successCount:commands.length===4?1:
    commands.length===1?1:0};
  }
 };
 const r=await queryB134World(world,'10 80 25');
 assert.equal(commands.length,5);
 assert(commands.every(x=>x.startsWith('testforblock ')));
 assert.equal(r.provisionalStateValue,2);
 assert.equal(r.authenticatedStairCertification,false);
});
test('mock transport exception cannot be silently interpreted as a non-match',async()=>{
 let n=0;
 const result=await queryB134World({
  async runCommand(){n++;if(n===2)throw Error('timeout');return {statusCode:0,successCount:n===3?1:n===1?1:0};}
 },'0 80 0');
 assert.equal(n,5);
 assert.equal(result.provisionalStateValue,null);
 assert.equal(result.results[1].classification,'UNKNOWN');
 assert.equal(result.results[1].response.transportError,true);
});
test('local diagnostic writes an unverified JSON file, never a B130 receipt',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'B134 local diagnostic '));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const r=evaluateB134Results('122 104 -138',[
  {statusCode:0,successCount:1},...Array.from({length:4},(_,i)=>({
   statusCode:0,successCount:i===0?1:0
  }))
 ]);
 const file=saveB134Diagnostic(r,root);
 const record=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(record.provisionalStateValue,0);
 assert.equal(record.authenticatedStairCertification,false);
 assert.equal(record.unreviewedHumanEvidence,true);
 assert.equal(fs.existsSync(path.join(root,'data/B130_Observation_Receipts.json')),false);
});
test('published B134 kit protects unchanged B133 and records no game contacts',()=>{
 if(!process.env.B134_KIT_PATH)buildB134Kit({out:OUT});
 const s=verifyB134Kit(OUT);
 assert.equal(s.gameTestedHere,false);
 assert.equal(s.actualGameContactsDuringPackaging,0);
 assert.equal(s.previous.original.recordCount,0);
 assert.equal(s.previous.field.unverifiedMappings,24);
 assert.equal(s.readiness,'NOT_PREPARED');
 assert.equal(s.constructionAllowed,false);
 assert.equal(s.previous.operations.length,0);
 assert.equal(fs.readFileSync(path.join(OUT,'START_B134_LIVE_PROBE.cmd'),'utf8'),B134_CMD);
 assert.equal(fs.existsSync(path.join(OUT,'data/B134_Live_Diagnostics')),false);
});
test('tampering a packaged B134 executable is rejected',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'B134 tamper '));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const target=path.join(root,'Copied Kit');
 fs.cpSync(OUT,target,{recursive:true});
 fs.appendFileSync(path.join(target,'source/parallel/b134/main/b134-live-probe.mjs'),'\n// tampered\n');
 assert.throws(()=>verifyB134Kit(target),/B134_KIT_TAMPER_OR_UNSAFE/);
});
test('Windows native CMD --check works without npm or Minecraft',
 {skip:process.platform!=='win32'},()=>{
 const p=spawnSync('cmd.exe',['/d','/c','START_B134_LIVE_PROBE.cmd','--check'],
  {cwd:OUT,encoding:'utf8',timeout:20000,windowsHide:true});
 assert.equal(p.status,0,JSON.stringify({error:p.error?.message,stderr:p.stderr,stdout:p.stdout}));
 assert.equal(p.stdout.split('testforblock ').length-1,5);
});
