import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {
 B136_DIRECTIONS,b136Layout,b136Preflight,b136CheckLayout,
 b136BuildExtension,b136Cleanup,b136ParseEntityResult,
 b136EvaluateWalk,b136Capture,b136SaveCapture
} from './b136-traversal.mjs';
import {buildB136Kit,verifyB136Kit,B136_CMD} from './b136-package.mjs';
const OUT=path.resolve(process.env.B136_KIT_PATH??'b136-review-output/B136_Live_Stair_Traversal');
const xyz=p=>[p.x,p.y,p.z].join(' ');
function mockWorld(layout,{empty=true,base=true}={}){
 const map=new Map();
 const oak='minecraft:oak_stairs ["upside_down_bit" = 0, "weirdo_direction" = '+layout.state+']';
 if(base)map.set(xyz(layout.anchor),oak);
 if(!empty)map.set(xyz(layout.addOnly[0]),'minecraft:stone');
 const sent=[];
 const world={
  map,sent,
  async runCommand(line,opts){
   sent.push(line);
   assert.deepEqual(opts,{timeout:6000,noResponse:false});
   if(line.startsWith('testforblock ')){
    const m=/^testforblock (-?\d+ -?\d+ -?\d+) (.+)$/.exec(line);
    if(!m)throw Error('unexpected testforblock');
    const actual=map.get(m[1])??'minecraft:air';
    return {statusCode:actual===m[2]?0:-2147352576,
     statusMessage:actual===m[2]?'found':'mismatch'};
   }
   if(line.startsWith('setblock ')){
    const m=/^setblock (-?\d+ -?\d+ -?\d+) (.+)$/.exec(line);
    assert(m);
    map.set(m[1],m[2]);
    return {statusCode:0,statusMessage:'success'};
   }
   throw Error('Unexpected command '+line);
  }
 };
 return world;
}
test('user-confirmed B135 direction calibration is exact and immutable',()=>{
 assert.deepEqual(Object.entries(B136_DIRECTIONS).map(([k,v])=>[k,v.state,v.calibrationRound]),
  [['EAST',0,'R1'],['SOUTH',2,'R2'],['WEST',1,'R3'],['NORTH',3,'R4']]);
 for(const [name,d] of Object.entries(B136_DIRECTIONS)){
  const l=b136Layout('123 -60 -18',name);
  assert.deepEqual(l.stairs,[0,1,2].map(i=>({
   x:123+d.dx*i,y:-60+i,z:-18+d.dz*i
  })));
  assert.equal(l.addOnly.length,2);
 }
 assert.throws(()=>b136Layout('123 -60 -18','ABOVE'),/B136_INVALID_DIRECTION/);
 assert.throws(()=>b136Layout('123 511 -18','SOUTH'),/B133_COORDINATES_OUT_OF_SAFE_RANGE/);
});
test('three-stair readbacks check exact orientation and ascending height',async()=>{
 const l=b136Layout('123 -60 -18','EAST');
 const w=mockWorld(l);
 assert.equal((await b136CheckLayout(w,l)).fullLayoutMatches,false);
 for(const p of l.addOnly)w.map.set(xyz(p),'minecraft:oak_stairs ["weirdo_direction" = 0]');
 assert.equal((await b136CheckLayout(w,l)).fullLayoutMatches,true);
 assert(w.sent.every(x=>x.startsWith('testforblock ')));
});
test('fail closed on occupied extension: never write and never journal',async t=>{
 const l=b136Layout('123 -60 -18','EAST');
 const w=mockWorld(l,{empty:false});
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'B136 occupied stage '));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 await assert.rejects(b136BuildExtension(w,l,root),/B136_STAGE_NOT_EMPTY/);
 assert.equal(w.sent.some(x=>x.startsWith('setblock ')),false);
 assert.equal(fs.existsSync(path.join(root,'data/B136_Live_Diagnostics/B136_STAGE_JOURNAL.json')),false);
});
test('test-world builder writes only two verified air stairs and cleans precisely those two',async t=>{
 const l=b136Layout('123 -60 -18','NORTH');
 const w=mockWorld(l);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'B136 stage cleanup '));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const build=await b136BuildExtension(w,l,root);
 assert.equal(build.success,true);
 assert.equal(build.added,2);
 assert.equal((await b136CheckLayout(w,l)).fullLayoutMatches,true);
 assert.equal(w.sent.filter(x=>x.startsWith('setblock ')).length,2);
 assert.equal((await b136Cleanup(w,root)).status,'CLEAN');
 assert.equal(w.map.get(xyz(l.anchor)),'minecraft:oak_stairs ["weirdo_direction" = 3]');
 assert.equal(w.map.get(xyz(l.addOnly[0])),'minecraft:air');
 assert.equal(w.map.get(xyz(l.addOnly[1])),'minecraft:air');
 assert.equal((await b136Cleanup(w,root)).status,'NO_STAGE_JOURNAL');
});
test('cleanup avoids deleting any changed user block and requires manual review',async t=>{
 const l=b136Layout('10 70 10','WEST');
 const w=mockWorld(l);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'B136 changed block '));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 assert.equal((await b136BuildExtension(w,l,root)).success,true);
 w.map.set(xyz(l.addOnly[1]),'minecraft:stone');
 const r=await b136Cleanup(w,root);
 assert.equal(r.status,'MANUAL_REVIEW_REQUIRED');
 assert.equal(r.skipped,1);
 assert.equal(w.map.get(xyz(l.addOnly[1])),'minecraft:stone');
 assert.equal(w.map.get(xyz(l.anchor)),'minecraft:oak_stairs ["weirdo_direction" = 1]');
});
test('querytarget requires one player, finite XYZ, and JSON from a successful command',()=>{
 assert.deepEqual(b136ParseEntityResult({statusCode:0,details:JSON.stringify([{
  dimension:'overworld',position:{x:1.25,y:70.5,z:-30.1}
 }])}),{x:1.25,y:70.5,z:-30.1});
 for(const v of [
  {statusCode:-2147352576,details:'[]'},
  {statusCode:0,details:'invalid'},
  {statusCode:0,details:'[]'},
  {statusCode:0,details:JSON.stringify([{position:{x:0,y:0,z:0}},{position:{x:1,y:1,z:1}}])},
  {statusCode:0,details:JSON.stringify([{position:{x:1,y:'oops',z:1}}])}
 ])assert.equal(b136ParseEntityResult(v),null);
});
test('telemetry has a motion-compatible candidate but never automatic collision PASS',()=>{
 const layout=b136Layout('10 70 10','EAST');
 const mk=(mode)=>Array.from({length:32},(_,i)=>({
  elapsedMs:i*250,
  position:{x:10+(mode==='UP'?1:-1)*(3*i/31),
   y:70+(mode==='UP'?1:-1)*(2.6*i/31),z:10}
 }));
 for(const mode of ['UP','DOWN']){
  const e=b136EvaluateWalk(layout,mode,mk(mode));
  assert.equal(e.observedMotionCompatible,true);
  assert.equal(e.actualCollisionVerified,false);
  assert.equal(e.independentlyCertified,false);
  assert.equal(e.constructionReady,false);
  assert(e.delta.y*(mode==='UP'?1:-1)>2);
 }
 const teleport=mk('UP');
 teleport[15].position.x+=40;
 assert.equal(b136EvaluateWalk(layout,'UP',teleport).observedMotionCompatible,false);
 assert.equal(b136EvaluateWalk(layout,'UP',[]).observedMotionCompatible,false);
});
test('rapid mock capture stores only single-player positional evidence',async t=>{
 const layout=b136Layout('10 70 10','SOUTH');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'B136 capture '));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let n=0;
 const world={async runCommand(line,options){
  assert.equal(line,'querytarget @a');
  assert.deepEqual(options,{timeout:6000,noResponse:false});
  return {statusCode:0,details:JSON.stringify([{
   position:{x:10,y:70+n*0.5,z:10+n++*0.6}
  }])};
 }};
 const capture=await b136Capture(world,layout,'UP',{samples:4,intervalMs:50});
 assert.equal(n,4);
 assert.equal(capture.samples.length,4);
 assert.equal(capture.evaluation.validSamples,4);
 assert.equal(capture.operatorVisualWalkConfirmed,false);
 const p=b136SaveCapture(capture,root);
 assert.equal(JSON.parse(fs.readFileSync(p,'utf8')).constructionReady,false);
});
test('packaged B136 inherits all prior safety pins and excludes simulated world evidence',()=>{
 if(!process.env.B136_KIT_PATH)buildB136Kit({out:OUT});
 const v=verifyB136Kit(OUT);
 assert.equal(v.initialWalkCaptures,0);
 assert.equal(v.constructionAllowed,false);
 assert.equal(v.readiness,'NOT_PREPARED');
 assert.deepEqual(b136Preflight(OUT),{
  readyForTestWorldOnly:true,massConstructionAllowed:false
 });
 assert.equal(fs.readFileSync(path.join(OUT,'START_B136_TRAVERSAL.cmd'),'utf8'),B136_CMD);
 assert.equal(fs.existsSync(path.join(OUT,'data/B136_Live_Diagnostics')),false);
});
test('tampering B136 code is caught before connecting to Minecraft',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'B136 tamper '));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const dest=path.join(tmp,'Windows Kit With Spaces');
 fs.cpSync(OUT,dest,{recursive:true});
 fs.appendFileSync(path.join(dest,'source/parallel/b136/main/b136-traversal.mjs'),'\n// unauthorized\n');
 assert.throws(()=>verifyB136Kit(dest),/B136_PACKAGE_TAMPER_OR_UNSAFE/);
 assert.throws(()=>b136Preflight(dest),/B136_PREFLIGHT_PIN_OR_POLICY_INVALID/);
});
test('Windows CMD --check does not modify world or require npm',
 {skip:process.platform!=='win32'},()=>{
 const run=spawnSync('cmd.exe',['/d','/c','START_B136_TRAVERSAL.cmd','--check'],
  {cwd:OUT,encoding:'utf8',timeout:30000,windowsHide:true});
 assert.equal(run.status,0,JSON.stringify({stdout:run.stdout,stderr:run.stderr,error:run.error?.message}));
 assert.match(run.stdout,/"calibrationRound": "R1"/);
});
