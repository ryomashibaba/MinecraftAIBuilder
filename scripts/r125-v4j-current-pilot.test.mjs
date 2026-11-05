import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseStableArgs,runStableLocalStudy}
 from './r125-v4j-current-pilot.mjs';
test('permanent entry accepts only explicit model and private new output',()=>{
 assert.deepEqual(parseStableArgs(['--model','qwen3:14b','--out','local']),
  {model:'qwen3:14b',outDir:'local'});
 assert.throws(()=>parseStableArgs(['--model','qwen3:14b','--out','local','--extra']),/ARGS/);
});
test('copies only vetted shareable V6 handoff without original text or genre templates',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-stable-'));
 const out=path.join(tmp,'pilot');
 const safe={
  schema:'minecraftaibuilder-v4j-v6-one-genre-safe-handoff-v1',
  genre:'housing',promptProtocol:'V4J_SINGLE_RESPONSE_AUTHOR_PARENT_INDEX_V6',
  reportedStatus:'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR',
  modelGenerationAttempts:1,replayAdditionalModelCalls:0,
  sourceCandidateVerified:false,explicitlyInjectedTestResponse:true,
  worldContacts:0,worldWrites:0,constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED')
 };
 let n=0;
 try{
  const runner=async o=>{
   n++;assert.equal(o.model,'qwen3:14b');
   assert.equal(o.genre,'housing');assert.equal(o.parentIndexV6,true);
   assert.equal(o.entryFirstV5,undefined);
   assert.equal(o.geometryEnvelopeV4,undefined);
   fs.mkdirSync(o.outDir);
   fs.writeFileSync(path.join(o.outDir,'V4J_V6_ONE_SHAREABLE.json'),
    JSON.stringify(safe));
   return safe;
  };
  const o=await runStableLocalStudy(['--model','qwen3:14b','--out',out],
   {runner});
  assert.equal(n,1);
  assert.deepEqual(JSON.parse(fs.readFileSync(o.shareableFile,'utf8')),safe);
  assert(!fs.readFileSync(o.shareableFile,'utf8').includes(tmp));
  assert.throws(()=>parseStableArgs(['--model','invalid;cmd','--out',out]),/ARGS/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('V7 is opt-in: it copies only V7 allowlisted HOLD; V6 default is unaffected',async()=>{
 const sha='b'.repeat(40),prev=process.env.MAB_HEAD;
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'v7-stable-entry-'));
 const out=path.join(tmp,'private');
 const safety={
  schema:'minecraftaibuilder-r125-v7-private-one-safe-v1',
  protocol:'V7_PRIVATE_SINGLE_SEMANTIC_SPATIAL_HOST_V1',headSha:sha,
  status:'HOLD_REQUIRED_CI',reason:'BOTH_EXACT_HEAD_CI_NOT_SUCCESS',
  modelGenerationAttempts:0,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')
 };
 let n=0;
 try{
  process.env.MAB_HEAD=sha;
  assert.deepEqual(parseStableArgs(['--model','qwen3:14b','--out','private','--v7-semantic']),
   {model:'qwen3:14b',outDir:'private',v7Semantic:true});
  const r=await runStableLocalStudy(['--model','qwen3:14b','--out',out,'--v7-semantic'],{
   v7BindingLoader:async()=>({deriveIntegratedShell:()=>{},checkResourceSafety:()=>{}}),
   v7Runner:async opts=>{
    n++;assert.equal(opts.headSha,sha);assert.equal(opts.model,'qwen3:14b');
    fs.mkdirSync(opts.outDir);
    fs.writeFileSync(path.join(opts.outDir,'V7_SEMANTIC_SHAREABLE.json'),JSON.stringify(safety));
    return safety;
   }
  });
  assert.equal(n,1);
  assert.deepEqual(JSON.parse(fs.readFileSync(r.shareableFile,'utf8')),safety);
  assert(!fs.readFileSync(r.shareableFile,'utf8').includes(tmp));
  assert.throws(()=>parseStableArgs(['--model','qwen3:14b','--out','private','--v7-semantic','--extra']),/ARGS/);
 }finally{
  if(prev===undefined)delete process.env.MAB_HEAD;else process.env.MAB_HEAD=prev;
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
