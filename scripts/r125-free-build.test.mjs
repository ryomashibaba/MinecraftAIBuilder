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
