import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseV3OneArgs,runV3OneGenreStudy}
 from './r125-v4j-v3-one-local.mjs';
test('V3 representative trial CLI rejects unknown/multiple/unsafe genre controls',()=>{
 assert.deepEqual(parseV3OneArgs(['--model','qwen3:14b','--out','private']),
  {model:'qwen3:14b',outDir:'private',genre:'housing'});
 assert.equal(parseV3OneArgs(['--model','qwen3:14b','--out','private',
  '--genre','station']).genre,'station');
 assert.throws(()=>parseV3OneArgs(['--model','qwen3:14b','--out','private',
  '--genre','fictitious']),/MODEL_OUTPUT_OR_GENRE/);
 assert.throws(()=>parseV3OneArgs(['--model','qwen3:14b','--out','private',
  '--genre','housing','--genre','station']),/ARGS_/);
});
test('one V3 LOCAL test-double POST and zero extra replay POST are never a real model SOURCE',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-v3-one-'));
 const out=path.join(dir,'original'),calls=[];
 const fetcher=async(_url,opts)=>{
  calls.push(opts.method);
  if(opts.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  if(opts.method==='POST')return {ok:true,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',
    message:{role:'assistant',content:'{"schema":"invalid"}'}}]})};
  throw Error('UNEXPECTED_REQUEST');
 };
 try{
  const safe=await runV3OneGenreStudy({model:'qwen3:14b',outDir:out,genre:'housing'},
   {fetcher,timeoutMs:15000});
  assert.deepEqual(calls,['GET','POST']);
  assert.equal(safe.promptProtocol,'V4J_SINGLE_RESPONSE_SCHEMA_GUIDED_V3');
  assert.equal(safe.genre,'housing');
  assert.equal(safe.explicitlyInjectedTestResponse,true);
  assert.equal(safe.sourceCandidateVerified,false);
  assert.equal(safe.reportedStatus,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.equal(safe.replayStatus,'HOLD_REPLAY_SOURCE_REJECTED');
  assert.equal(safe.replayAdditionalModelCalls,0);
  assert.equal(safe.modelGenerationAttempts,1);
  assert.equal(safe.worldWrites,0);
  assert.deepEqual(safe.gates,Array(9).fill('BLOCKED'));
  const t=fs.readFileSync(path.join(out,'V4J_V3_ONE_SHAREABLE.json'),'utf8');
  assert.deepEqual(JSON.parse(t),safe);
  assert(!t.includes(dir));
  assert(!t.includes('"schema":"invalid"'));
  assert(fs.existsSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt')));
  assert(fs.existsSync(path.join(out+'-replay','REPLAY_SHAREABLE_STATUS.json')));
  await assert.rejects(runV3OneGenreStudy({model:'qwen3:14b',
   outDir:out,genre:'housing'},{fetcher}),/NEW_PRIVATE_OUTSIDE_REPOSITORY_ONLY/);
  assert.deepEqual(calls,['GET','POST']);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
