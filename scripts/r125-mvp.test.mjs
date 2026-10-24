import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {runR125,parseR125Args,makeUnboundWorldPreview} from './r125-mvp.mjs';
import {SCHEMA as B143} from '../source/ai/b143-building-dsl.mjs';

const request='小さな住宅を設計し入口と利用可能な内部空間を作る';
function design(){
 return {schema:B143,id:'r125-home-test',title:'検査用モデル住宅',
  brief:'実モデルではない小型検査形状',designOnly:true,
  bounds:{width:12,height:12,depth:12},elements:[
   {id:'shell',shape:'box',mode:'add',material:'wood',
    origin:[2,1,2],size:[8,7,8],shell:1},
   {id:'entrance',shape:'box',mode:'cut',origin:[5,2,2],size:[2,3,1]},
   {id:'window',shape:'box',mode:'cut',origin:[2,3,5],size:[1,2,2]},
   {id:'supported-floor',shape:'box',mode:'add',material:'wood',
    origin:[3,1,3],size:[6,1,6]}
  ]};
}
const response=()=>({design:design(),explanation:'玄関、採光と居室のあるテスト形状です。',
 assumptions:[]});
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'minecraftaibuilder-r125-'));
const read=(dir,file)=>JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));

test('one-shot double: B143 compiler, actual local voxels, existing offline viewer, world block',async t=>{
 const base=temp();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 let calls=0;
 const out=path.join(base,'house');
 const r=await runR125({prompt:request,model:'test-local',outDir:out},{
  generator:async()=>{calls++;return response();}
 });
 assert.equal(calls,1);
 assert.equal(r.modelCallCount,1);
 assert.equal(r.provider,'INJECTED_TEST_DOUBLE');
 assert.equal(r.sourceReview,'B143_COMPILED_VERIFIED');
 assert.equal(r.realVoxel3D,'B143_LOCAL_SCENE_RENDERABLE');
 assert.equal(r.originalRawCaptured,false);
 assert.equal(r.world.readiness,'NOT_PREPARED');
 assert.equal(r.world.executionAllowed,false);
 assert.equal(r.world.gates.length,9);
 assert.deepEqual(r.world.BuildPlan.operations,[]);
 const scene=read(out,'B143_SCENE.json');
 const src=read(out,'B143_SOURCE.json');
 const candidate=read(out,'R125_WORLD_PREVIEW.json');
 assert.equal(scene.sourceSha256,r.sourceSha256);
 assert.equal(scene.geometrySha256,r.geometrySha256);
 assert.equal(scene.stats.voxels,r.occupiedVoxels);
 assert.equal(src.id,'r125-home-test');
 assert.ok(scene.primitives.length>50);
 assert.equal(candidate.localVoxelCount,scene.primitives.length);
 assert.equal(candidate.localVoxelArraySha256.length,64);
 assert.equal(candidate.status,'UNBOUND_NO_WORLD_WRITES');
 assert.deepEqual(candidate.executableOperations,[]);
 assert.equal(candidate.worldId,null);
 assert.equal(candidate.backupRef,null);
 assert.ok(fs.readFileSync(path.join(out,'index.html'),'utf8')
  .includes('minecraftaibuilder-b143-gallery-v1'));
 assert.equal(fs.existsSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt')),false);
});

test('bad model proposal is held, cannot write candidate source or claim voxel success',async t=>{
 const base=temp();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 let calls=0;const out=path.join(base,'invalid');
 const r=await runR125({prompt:request,model:'mock',outDir:out},{
  generator:async()=>{calls++;return {design:{},explanation:'bad',assumptions:[]};}
 });
 assert.equal(calls,1);
 assert.equal(r.status,'HOLD_GENERATION_OR_REVIEW');
 assert.equal(r.world.worldWrites,0);
 assert.equal(fs.existsSync(path.join(out,'B143_SOURCE.json')),false);
 assert.equal(fs.existsSync(path.join(out,'index.html')),false);
 assert.equal(read(out,'R125_REPORT.json').sourceReview,'HOLD');
});

test('existing directory aborts before the model is contacted',async t=>{
 const base=temp();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 let calls=0;
 await assert.rejects(()=>runR125({prompt:request,model:'mock',outDir:base},{
  generator:async()=>{calls++;return response();}
 }),/OUTPUT_ALREADY_EXISTS/);
 assert.equal(calls,0);
});
test('CLI rejects remote endpoints and missing required fields',()=>{
 assert.throws(()=>parseR125Args([
  '--prompt',request,'--model','qwen3.8:27b','--out','target',
  '--endpoint','https://api.openai.com/v1/chat/completions'
 ]),/LOOPBACK_ENDPOINT_ONLY/);
 assert.throws(()=>parseR125Args(['--model','qwen3.8:27b','--out','target']),/EXACTLY_ONE/);
 assert.throws(()=>makeUnboundWorldPreview({designOnly:true,readiness:'READY',
  BuildPlan:{operations:[]},primitives:[]}),/COMPILER_WORLD_CONTRACT/);
});

test('loopback HTTP fixture: one native adapter request and byte-identical raw capture',async t=>{
 const base=temp();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const original=JSON.stringify(response());
 let calls=0;
 const server=http.createServer((req,res)=>{
  calls++;
  assert.equal(req.method,'POST');
  assert.equal(req.url,'/v1/chat/completions');
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({choices:[{message:{content:original},finish_reason:'stop'}]}));
 });
 await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',error=>
  error?reject(error):resolve()));
 t.after(()=>server.close());
 const out=path.join(base,'loopback');
 const r=await runR125({prompt:request,model:'qwen3.8:27b',outDir:out,
  endpoint:'http://127.0.0.1:'+server.address().port+'/v1/chat/completions'});
 assert.equal(calls,1);
 assert.equal(r.modelCallCount,1);
 assert.equal(r.originalRawCaptured,true);
 assert.equal(r.providerIdentityVerified,false);
 assert.equal(fs.readFileSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
 assert.ok(r.sourceSha256);
 assert.equal(r.world.worldWrites,0);
});

test('loopback truncated JSON retains original response but produces HOLD',async t=>{
 const base=temp();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const bad='{"design":';
 let calls=0;
 const server=http.createServer((req,res)=>{
  calls++;res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({choices:[{message:{content:bad},finish_reason:'stop'}]}));
 });
 await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',error=>
  error?reject(error):resolve()));
 t.after(()=>server.close());
 const out=path.join(base,'bad');
 const r=await runR125({prompt:request,model:'qwen3.8:27b',outDir:out,
  endpoint:'http://127.0.0.1:'+server.address().port+'/v1/chat/completions'});
 assert.equal(calls,1);
 assert.equal(r.status,'HOLD_GENERATION_OR_REVIEW');
 assert.equal(r.originalRawCaptured,true);
 assert.equal(fs.readFileSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),bad);
 assert.equal(fs.existsSync(path.join(out,'B143_SCENE.json')),false);
});
