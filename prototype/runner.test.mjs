import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeArkLite,absolute} from './ark-lite.mjs';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ark-lite-test-'));
process.env.ARK_LITE_DATA_DIR=temp;
const {sitePlan,validatePlan,commandFor,survey,build,cleanup,planInfo}=await import('./runner.mjs');
const plan=makeArkLite();
const site=sitePlan({x:101,y:90,z:-120},'PROTO_TEST_ONLY');
const key=p=>[p.x,p.y,p.z].join(' ');
const mkWorld=()=>{
 const blocks=new Map(),commands=[];
 const positive={statusCode:0,successCount:1};
 const negative={statusCode:-2147352576,successCount:0};
 return {blocks,commands,runCommand:async cmd=>{
   commands.push(cmd);
   let m=/^testforblock (-?\d+) (-?\d+) (-?\d+) (minecraft:\w+)$/.exec(cmd);
   if(m){
     const actual=blocks.get([m[1],m[2],m[3]].join(' '))??'minecraft:air';
     return actual===m[4]?positive:negative;
   }
   m=/^setblock (-?\d+) (-?\d+) (-?\d+) (minecraft:\w+) keep$/.exec(cmd);
   if(m){
     const k=[m[1],m[2],m[3]].join(' ');
     if(blocks.has(k))return negative;
     blocks.set(k,m[4]);return positive;
   }
   m=/^fill (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (minecraft:\w+) keep$/.exec(cmd);
   if(m){
     let n=0;
     for(let y=Number(m[2]);y<=Number(m[5]);y++)
       for(let z=Number(m[3]);z<=Number(m[6]);z++)
         for(let x=Number(m[1]);x<=Number(m[4]);x++){
           const k=[x,y,z].join(' ');
           if(!blocks.has(k)){blocks.set(k,m[7]);n++;}
         }
     return n?positive:negative;
   }
   m=/^fill (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) minecraft:air replace (minecraft:\w+)$/.exec(cmd);
   if(m){
     let n=0;
     for(let y=Number(m[2]);y<=Number(m[5]);y++)
       for(let z=Number(m[3]);z<=Number(m[6]);z++)
         for(let x=Number(m[1]);x<=Number(m[4]);x++){
           const k=[x,y,z].join(' ');
           if(blocks.get(k)===m[7]){blocks.delete(k);n++;}
         }
     return n?positive:negative;
   }
   throw Error('MOCK_REJECTED '+cmd);
 }};
};
test('large authored building is deterministic, bounded and not a cube',()=>{
 assert.deepEqual(makeArkLite().sha256,plan.sha256);
 assert.equal(plan.size.width,48);
 assert.equal(plan.size.depth,40);
 assert(plan.placementCount>4000);
 assert(plan.placementCount<=12000);
 assert(plan.runs.length<3000);
 assert(plan.voxels.some(p=>p.z<0&&p.y>20));
 assert(plan.voxels.some(p=>p.y===29));
 assert(!plan.voxels.some(p=>p.z===0&&p.x===23&&p.y===3));
 assert(validatePlan().blocks===plan.placementCount);
 assert.equal(planInfo().mainSafety,'NOT_PREPARED_9_BLOCKED_UNCHANGED');
});
test('only safe keep-mode commands generated; no unconditional replace',()=>{
 for(const run of plan.runs){
  const cmd=commandFor(run,site.origin);
  assert.match(cmd,/ keep$/);
  assert(!cmd.includes('destroy'));
 }
});
test('air control and full voxel survey are read-only',async()=>{
 const w=mkWorld();const result=await survey(w,site);
 assert.equal(result.checked,plan.placementCount);
 assert.equal(w.blocks.size,0);
 assert(w.commands.every(c=>c.startsWith('testforblock ')));
});
test('unknown occupancy blocks construction before a single write',async()=>{
 const w=mkWorld();
 const p=absolute(plan.voxels[200],site.origin);
 w.blocks.set(key(p),'minecraft:bedrock');
 await assert.rejects(build(w,site,'BUILD '+plan.sha256.slice(0,12)+' '+site.label),/P0_SITE_OCCUPIED_OR_UNKNOWN/);
 assert.equal(w.blocks.size,1);
 assert(!w.commands.some(c=>c.startsWith('setblock ')||c.startsWith('fill ')));
});
test('consent required even after successful preflight',async()=>{
 const w=mkWorld();
 await assert.rejects(build(w,site,''),/P0_EXPLICIT_BUILD_CONFIRMATION_REQUIRED/);
 assert.equal(w.blocks.size,0);
});
test('build all cells, verify, protect journal, then selective removal',async()=>{
 const w=mkWorld();
 const approval='BUILD '+plan.sha256.slice(0,12)+' '+site.label;
 const result=await build(w,site,approval);
 assert.equal(result.actualBlocksReadback,plan.placementCount);
 assert.equal(w.blocks.size,plan.placementCount);
 for(const p of plan.voxels)assert.equal(w.blocks.get(key(absolute(p,site.origin))),p.block);
 assert(fs.existsSync(path.join(temp,'ARK_LITE_STAGE_JOURNAL.json')));
 assert(!w.commands.some(c=>c.includes(' destroy')||c.endsWith(' replace')));
 const sameRun=await build(w,site,approval);
 assert.equal(sameRun.confirmedRuns,plan.runs.length);
 const clean=await cleanup(w,site,'CLEAN '+plan.sha256.slice(0,12)+' '+site.label);
 assert.equal(clean.skipped,0);
 assert.equal(w.blocks.size,0);
});
test('test-world label + origin bind the safety journal',()=>{
 assert.notEqual(sitePlan({x:102,y:90,z:-120},'PROTO_TEST_ONLY').siteSha256,site.siteSha256);
});
