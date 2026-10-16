import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {
 b137Layout,b137Allow,b137Preflight,b137Survey,b137Build,b137Clean,
 b137Evaluate,b137Capture,b137SaveCapture,MAX_NEW_BLOCKS
} from './b137-landing-live.mjs';
import {buildB137Kit,verifyB137Kit,B137_CMD} from './b137-package.mjs';
const OUT=path.resolve(process.env.B137_KIT_PATH??'b137-review-output/B137_Live_Landing_Connection');
const key=p=>[p.x,p.y,p.z].join(' ');
const mkRoot=()=>fs.mkdtempSync(path.join(os.tmpdir(),'B137 live route '));
function game(layout,{existing=1,obstruct=null,ceiling=null}={}){
 const blocks=new Map(),commands=[];
 for(const part of layout.parts.slice(0,existing))blocks.set(key(part.position),part.block);
 if(obstruct!==null)blocks.set(key(layout.parts[obstruct].position),'minecraft:stone');
 if(ceiling!==null){
  const part=layout.parts[ceiling];
  blocks.set(key({...part.position,y:part.position.y+2}),'minecraft:stone');
 }
 function matches(actual,desired){
  if(actual===desired)return true;
  if(actual.startsWith('minecraft:oak_stairs')&&desired.startsWith('minecraft:oak_stairs')){
   const ad=Number(/"weirdo_direction" = ([0-3])/.exec(actual)?.[1]);
   const rd=/"weirdo_direction" = ([0-3])/.exec(desired);
   const ah=/"upside_down_bit" = (true|false)/.exec(actual)?.[1];
   const rh=/"upside_down_bit" = (true|false)/.exec(desired)?.[1];
   return (!rd||Number(rd[1])===ad)&&(!rh||rh===ah);
  }
  return false;
 }
 return {
  blocks,commands,
  async runCommand(cmd,opts){
   assert.deepEqual(opts,{timeout:6000,noResponse:false});
   commands.push(cmd);
   if(cmd.startsWith('testforblock ')){
    const m=/^testforblock (-?\d+ -?\d+ -?\d+) (.+)$/.exec(cmd);
    assert(m,'bad test cmd '+cmd);
    const block=blocks.get(m[1])??'minecraft:air';
    return {statusCode:matches(block,m[2])?0:-2147352576,
     statusMessage:matches(block,m[2])?'found':'mismatch'};
   }
   if(cmd.startsWith('setblock ')){
    const m=/^setblock (-?\d+ -?\d+ -?\d+) (.+)$/.exec(cmd);
    assert(m);
    blocks.set(m[1],m[2]);
    return {statusCode:0,statusMessage:'changed'};
   }
   throw Error('Unrecognized command: '+cmd);
  }
 };
}
test('B136 R4 NORTH flight, two-level plank landing and second flight geometry',()=>{
 const l=b137Layout('123 -60 -18','NORTH');
 assert.equal(l.parts.length,8);
 assert.deepEqual(l.parts.map(p=>[p.position.x,p.position.y,p.position.z]),[
  [123,-60,-18],[123,-59,-19],[123,-58,-20],
  [123,-58,-21],[123,-58,-22],
  [123,-57,-23],[123,-56,-24],[123,-55,-25]
 ]);
 assert.deepEqual(l.parts.map(p=>p.kind),[
  'stair','stair','stair','landing','landing','stair','stair','stair'
 ]);
 assert.equal(l.sourceB136OperatorWalk.evidence,
  'USER_REPORTED_CONSOLE_AND_OBSERVATION_NOT_RAW_JSON');
 assert.equal(MAX_NEW_BLOCKS,7);
 for(const d of ['EAST','SOUTH','WEST','NORTH']){
  const x=b137Layout('123 -60 -18',d);
  assert.equal(new Set(x.parts.map(p=>key(p.position))).size,8);
 }
});
test('read-only survey preserves original 3 stairs, locates missing 5',async()=>{
 const l=b137Layout('123 -60 -18','NORTH');
 const w=game(l,{existing:3});
 const s=await b137Survey(w,l);
 assert.equal(s.existing,3);
 assert.equal(s.missing,5);
 assert.equal(s.canBuild,true);
 assert.equal(s.allReady,false);
 assert(w.commands.every(x=>x.startsWith('testforblock ')));
});
test('one-command build adds only five blocks and cleanup preserves original B136 route',async t=>{
 const l=b137Layout('123 -60 -18','NORTH');
 const w=game(l,{existing:3});
 const root=mkRoot();
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const built=await b137Build(w,l,root);
 assert.equal(built.success,true);
 assert.equal(built.added,5);
 assert.equal(built.kept,3);
 assert.equal((await b137Survey(w,l)).allReady,true);
 assert.equal(w.commands.filter(x=>x.startsWith('setblock ')).length,5);
 assert.equal((await b137Clean(w,root)).status,'CLEAN');
 for(const part of l.parts.slice(0,3))assert.equal(w.blocks.get(key(part.position)),part.block);
 for(const part of l.parts.slice(3))assert.equal(w.blocks.get(key(part.position)),'minecraft:air');
 assert.equal((await b137Clean(w,root)).status,'NO_B137_STAGE_JOURNAL');
});
test('if B136 previously cleaned two steps, B137 can safely prepare the whole 8-part test route',async t=>{
 const l=b137Layout('123 -60 -18','EAST');
 const w=game(l,{existing:1});
 const root=mkRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const built=await b137Build(w,l,root);
 assert.equal(built.success,true);
 assert.equal(built.added,7);
 assert.equal(built.kept,1);
 assert.equal((await b137Survey(w,l)).allReady,true);
 assert.equal((await b137Clean(w,root)).removed,7);
 assert.equal(w.blocks.get(key(l.parts[0].position)),l.parts[0].block);
});
test('occupied future stair stops before any block modifications',async t=>{
 const l=b137Layout('123 -60 -18','NORTH');
 const w=game(l,{existing:3,obstruct:6});
 const root=mkRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 await assert.rejects(b137Build(w,l,root),/B137_PATH_BLOCKED/);
 assert(!w.commands.some(x=>x.startsWith('setblock ')));
 assert(!fs.existsSync(path.join(root,'data/B137_Live_Diagnostics')));
});
test('blocked headroom stops before any blocks are added',async t=>{
 const l=b137Layout('123 -60 -18','NORTH');
 const w=game(l,{existing:3,ceiling:5});
 const root=mkRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 await assert.rejects(b137Build(w,l,root),/B137_HEADROOM_OCCUPIED_OR_UNCERTAIN/);
 assert(!w.commands.some(x=>x.startsWith('setblock ')));
});
test('modified newly built block survives cleanup; report remains in HOLD',async t=>{
 const l=b137Layout('123 -60 -18','NORTH');
 const w=game(l,{existing:3});
 const root=mkRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 assert.equal((await b137Build(w,l,root)).success,true);
 w.blocks.set(key(l.parts[6].position),'minecraft:stone');
 const r=await b137Clean(w,root);
 assert.equal(r.status,'HOLD_BLOCK_CHANGED');
 assert.equal(r.unresolved,1);
 assert.equal(w.blocks.get(key(l.parts[6].position)),'minecraft:stone');
 for(const part of l.parts.slice(0,3))assert.equal(w.blocks.get(key(part.position)),part.block);
});
test('tampered stage journal cannot remove blocks outside the eight-piece plan',async t=>{
 const l=b137Layout('123 -60 -18','NORTH');
 const w=game(l,{existing:3});
 const root=mkRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 assert.equal((await b137Build(w,l,root)).success,true);
 const f=path.join(root,'data/B137_Live_Diagnostics/B137_STAGE_JOURNAL.json');
 const j=JSON.parse(fs.readFileSync(f,'utf8'));
 j.additions[0].position={x:900,y:50,z:900};
 fs.writeFileSync(f,JSON.stringify(j));
 const before=w.commands.length;
 await assert.rejects(b137Clean(w,root),/B137_JOURNAL_POSITION_NOT_IN_FROZEN_TEST_PLAN/);
 assert.equal(w.commands.length,before);
 assert.equal(w.blocks.get(key(l.parts[0].position)),l.parts[0].block);
});
test('refuses wrong anchor and no world write',async t=>{
 const l=b137Layout('123 -60 -18','NORTH');
 const w=game(l,{existing:0});
 const root=mkRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 await assert.rejects(b137Build(w,l,root),/B137_ANCHOR_MUST_ALREADY_EXIST/);
 assert(!w.commands.some(x=>x.startsWith('setblock ')));
});
test('only fixed allowlisted commands permitted',()=>{
 for(const cmd of [
  'testforblock 123 -60 -18 minecraft:air',
  'testforblock 123 -60 -18 minecraft:oak_planks',
  'setblock 123 -60 -18 minecraft:oak_planks',
  'testforblock 123 -60 -18 minecraft:oak_stairs ["upside_down_bit" = false, "weirdo_direction" = 3]',
  'querytarget @a'
 ])assert.equal(b137Allow(cmd),true);
 for(const cmd of [
  'fill 0 0 0 20 20 20 minecraft:air','teleport @a 0 0 0',
  'setblock 0 0 0 minecraft:stone','setblock 0 0 0 minecraft:air 0 destroy',
  'querytarget @e','setblock 0 0 0 minecraft:oak_stairs ["upside_down_bit" = true, "weirdo_direction" = 3]'
 ])assert.throws(()=>b137Allow(cmd),/B137_COMMAND_NOT_ALLOWED/);
});
test('UP and DOWN passage need substantial rise and still cannot auto-certify collision',()=>{
 const l=b137Layout('123 -60 -18','NORTH');
 for(const mode of ['UP','DOWN']){
  const sign=mode==='UP'?1:-1;
  const points=Array.from({length:68},(_,i)=>({
   elapsedMs:i*250,
   position:{x:123,y:68+sign*6*i/67,z:-18-sign*8*i/67}
  }));
  const result=b137Evaluate(l,mode,points);
  assert.equal(result.motionCompatible,true);
  assert.equal(result.independentCollisionPass,false);
  assert.equal(result.constructionReady,false);
  assert.equal(result.readiness,'NOT_PREPARED');
  assert(result.landingProximitySamples>0);
 }
 const stationary=Array.from({length:68},(_,i)=>({
  elapsedMs:i*250,position:{x:123,y:70,z:-18}
 }));
 assert.equal(b137Evaluate(l,'UP',stationary).motionCompatible,false);
 const jumped=Array.from({length:68},(_,i)=>({
  elapsedMs:i*250,position:{x:123,y:70+6*i/67,z:-18-8*i/67}
 }));
 jumped[30].position.y+=35;
 assert.equal(b137Evaluate(l,'UP',jumped).motionCompatible,false);
});
test('captures single-player Minecraft-style telemetry with countdown parameter',async t=>{
 const l=b137Layout('123 -60 -18','NORTH');
 let n=0;
 const world={
  async runCommand(cmd,opts){
   assert.equal(cmd,'querytarget @a');
   assert.deepEqual(opts,{timeout:6000,noResponse:false});
   return {statusCode:0,details:JSON.stringify([{position:{
    x:123,y:70+n/2,z:-18-n++/2
   }}])};
  }
 };
 const report=await b137Capture(world,l,'UP',{samples:4,intervalMs:20,countdown:0});
 assert.equal(n,4);
 assert.equal(report.records.length,4);
 assert.equal(report.evaluation.validSamples,4);
 assert.equal(report.evaluation.independentCollisionPass,false);
 const root=mkRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const f=b137SaveCapture(root,report);
 assert.equal(JSON.parse(fs.readFileSync(f,'utf8')).constructionAllowed,false);
});
test('verified B136 parent, portable kit hash pins, no invented B137 in-world evidence',()=>{
 if(!process.env.B137_KIT_PATH)buildB137Kit({out:OUT});
 const r=verifyB137Kit(OUT);
 assert.equal(r.realGameTestsIncluded,0);
 assert.equal(r.constructionAllowed,false);
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.deepEqual(b137Preflight(OUT),{
  safeForIsolatedTestWorld:true,constructionAllowed:false
 });
 assert.equal(fs.readFileSync(path.join(OUT,'START_B137_LANDING.cmd'),'utf8'),B137_CMD);
 assert.equal(fs.existsSync(path.join(OUT,'data/B137_Live_Diagnostics')),false);
});
test('packaged B137 source tamper rejects before game connection',t=>{
 const root=mkRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const dest=path.join(root,'B137 Windows Kit Path With Spaces');
 fs.cpSync(OUT,dest,{recursive:true});
 fs.appendFileSync(path.join(dest,'source/parallel/b137/main/b137-landing-live.mjs'),
  '\n// injected unauthorized change\n');
 assert.throws(()=>verifyB137Kit(dest),/B137_KIT_TAMPER_OR_UNSAFE/);
 assert.throws(()=>b137Preflight(dest),/B137_MANIFEST_OR_PARENT_INVALID/);
});
test('native Windows CMD --check smoke',{skip:process.platform!=='win32'},()=>{
 const cmd=spawnSync('cmd.exe',['/d','/c','START_B137_LANDING.cmd','--check'],
  {cwd:OUT,encoding:'utf8',windowsHide:true,timeout:30000});
 assert.equal(cmd.status,0,JSON.stringify({stdout:cmd.stdout,stderr:cmd.stderr}));
 assert.match(cmd.stdout,/"direction": "NORTH"/);
});
