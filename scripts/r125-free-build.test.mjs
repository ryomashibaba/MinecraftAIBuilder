import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseFreeBuildArgs,runFreeBuild} from './r125-free-build.mjs';

test('free-build CLI accepts one Japanese prompt or one saved plan without mixed modes',()=>{
 const opts=parseFreeBuildArgs(['--prompt','小さな二階建て住宅を作って','--model','qwen3:14b']);
 assert.equal(opts.model,'qwen3:14b');
 assert.equal(opts.prompt,'小さな二階建て住宅を作って');
 assert.throws(()=>parseFreeBuildArgs(['--plan','x','--prompt','foo']),/EXCLUSIVE/);
 assert.throws(()=>parseFreeBuildArgs(['--model','remote model']),/MODEL/);
 assert.throws(()=>parseFreeBuildArgs(['--prompt','短い']),/PROMPT_LENGTH/);
});

test('one model handoff creates fresh evidence but no Minecraft operation (synthetic child)',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-free-build-test-'));
 let called=0;
 try{
  const status=await runFreeBuild({model:'qwen3:14b',prompt:'日本語で自由に小さな住宅を設計',plan:null,outRoot:root},{
   child:(node,args)=>{
    called++;
    assert.equal(node,process.execPath);
    assert(args.includes('--palette'));
    assert(args.includes('--model'));
    const output=args[args.indexOf('--out')+1];
    fs.mkdirSync(path.join(output,'makecode'),{recursive:true});
    const code='// SYNTHETIC OFFLINE UNIT TEST ONLY\n';
    const codeSha=createHash('sha256').update(code).digest('hex');
    fs.writeFileSync(path.join(output,'makecode','MAKECODE_EDUCATION.ts'),code);
    fs.writeFileSync(path.join(output,'makecode','EXPORT_REPORT.json'),JSON.stringify({
     worldWrites:0,programExecuted:false,materialMode:'STRICT_USER_ATTESTED',
     verifiedPaletteSha256:'synthetic-palette-sha',plannedBlockCounts:{stone:2},
     plannedVoxelCount:2,makecodeSourceSha256:codeSha,
     sourceSha256:'fake-source',geometrySha256:'fake-geometry'
    }));
    return {status:0,stdout:'SYNTHETIC'};
   }});
  assert.equal(called,1);assert.equal(status.status,'MAKECODE_READY_HUMAN_REVIEW_REQUIRED');
  assert.equal(status.worldWrites,0);
  assert.equal(fs.existsSync(status.makecode),true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(status.output,'REQUEST.json'))).mode,'ONE_LOCAL_OLLAMA_REQUEST');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('unverified or failed model export is HOLD and is not fabricated as a build',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-free-build-hold-'));
 try{
  const result=await runFreeBuild({model:'qwen3:14b',prompt:'確認できない未知の建築材を要求',plan:null,outRoot:root},{
   child:()=>({status:2,stderr:'HOLD_UNVERIFIED_MATERIAL'})});
  assert.equal(result.status,'HOLD');
  assert.equal(result.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('REAL saved ArchitecturePlan produces true 3-material MakeCode without any LLM or world call',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-free-build-real-'));
 const plan={schema:'minecraftaibuilder-r125-architecture-plan-v1',id:'reader-station',
  title:'Reading and storage house',brief:'One-storey reading room with storage, door and windows',
  footprint:{width:18,depth:18},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'reading-area',purpose:'Reading tables and circulation area'},
   {id:'storage-zone',purpose:'Book and document storage area'}]}],
  materials:{floor:'wood',wall:'stone',roof:'wood'}};
 try{
  const input=path.join(root,'SOURCE_ARCHITECTURE_PLAN.json');
  fs.writeFileSync(input,JSON.stringify(plan)+'\n');
  const status=await runFreeBuild({model:'qwen3:14b',prompt:null,plan:input,outRoot:path.join(root,'outputs')});
  assert.equal(status.status,'MAKECODE_READY_HUMAN_REVIEW_REQUIRED');
  assert.equal(status.worldWrites,0);
  assert(status.plannedVoxelCount>400);
  assert(status.plannedBlockCounts.oak_planks>0);
  assert(status.plannedBlockCounts.stone>0);
  assert(status.plannedBlockCounts.glass>0);
  assert.equal(fs.existsSync(status.makecode),true);
  const code=fs.readFileSync(status.makecode,'utf8');
  assert.match(code,/blocks\.blockByName\("oak_planks"\)/);
  assert.match(code,/player\.onChat\("mabbuild"/);
  assert.match(code,/player\.onChat\("mabverify"/);
  assert.equal(createHash('sha256').update(code).digest('hex'),status.makecodeSourceSha256);
  const req=JSON.parse(fs.readFileSync(path.join(status.output,'REQUEST.json'),'utf8'));
  assert.equal(req.mode,'SAVED_PLAN');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('REAL saved plan requesting unverified metal roof is held, never substituted',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-free-build-metal-'));
 const plan={schema:'minecraftaibuilder-r125-architecture-plan-v1',id:'metal-station',
  title:'Metal roof station',brief:'Tiny generic station with explicitly required metal roof',
  footprint:{width:18,depth:18},
  levels:[{splitAxis:'z',splitPercent:40,spaces:[
   {id:'customer-zone',purpose:'Waiting area for guests'},
   {id:'service-zone',purpose:'Service counter and equipment'}]}],
  materials:{floor:'stone',wall:'stone',roof:'metal'}};
 try{
  const input=path.join(root,'ORIGINAL.json');fs.writeFileSync(input,JSON.stringify(plan));
  const status=await runFreeBuild({model:'qwen3:14b',prompt:null,plan:input,outRoot:path.join(root,'outputs')});
  assert.equal(status.status,'HOLD');
  assert.equal(status.worldWrites,0);
  const logs=fs.readFileSync(path.join(status.output,'RUN_LOG.txt'),'utf8');
  assert.match(logs,/UNVERIFIED_MATERIAL_METAL/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
