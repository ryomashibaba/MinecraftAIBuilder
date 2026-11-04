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
test('copies only vetted shareable V4 handoff without original text or genre templates',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-stable-'));
 const out=path.join(tmp,'pilot');
 const safe={
  schema:'minecraftaibuilder-v4j-v4-one-genre-safe-handoff-v1',
  genre:'housing',promptProtocol:'V4J_SINGLE_RESPONSE_FEASIBLE_MASSING_V4',
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
   assert.equal(o.genre,'housing');assert.equal(o.geometryEnvelopeV4,true);
   fs.mkdirSync(o.outDir);
   fs.writeFileSync(path.join(o.outDir,'V4J_V4_ONE_SHAREABLE.json'),
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
