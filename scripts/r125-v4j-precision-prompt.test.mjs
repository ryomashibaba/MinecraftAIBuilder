import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {V4J_PRECISION_PROTOCOL,V4J_PRECISION_SYSTEM_PROMPT}
 from '../source/ai/r125-v4j-precision-prompt.mjs';
import {CIVIC_ARCADE_SCHEMA,CIVIC_ARCADE_SYSTEM_PROMPT}
 from '../source/ai/r125-v4j-civic-author-ir.mjs';
import {runV4DLocalAuthor} from './r125-v4d-local-architect.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('V4J precision prompt preserves exactly the original author contract without genre templates',()=>{
 assert(V4J_PRECISION_SYSTEM_PROMPT.includes(CIVIC_ARCADE_SCHEMA));
 assert(V4J_PRECISION_SYSTEM_PROMPT.length<CIVIC_ARCADE_SYSTEM_PROMPT.length);
 for(const rule of ['windowPriority:null','four different lowercase strings',
  'earlier','COVERED spaces[].id','roofForm','12..140','12..160',
  'EXACT {schema,id,title,brief,materials,spaces,massing,wing,floorplate,atrium,mezzanine,arcade}']){
  assert(V4J_PRECISION_SYSTEM_PROMPT.includes(rule),rule);
 }
 for(const forbidden of ['example-house','example-shop','fixed housing',
  'return the same structure for every brief']){
  assert(!V4J_PRECISION_SYSTEM_PROMPT.includes(forbidden),forbidden);
 }
 assert(V4J_PRECISION_PROTOCOL.startsWith('V4J_'));
});
test('only explicit 5-genre civic author can request clarity prompt and raw system hash is PRIVATE',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-precision-no-model-'));
 const out=path.join(dir,'attempt');
 const requests=[];
 const fetcher=async(_url,opts)=>{
  requests.push({method:opts?.method,body:opts?.body});
  if(opts?.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  if(opts?.method==='POST')return {ok:true,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',message:{
    role:'assistant',content:'{"schema":"unusable"}'}}]
  })};
  throw Error('UNEXPECTED_TEST_REQUEST');
 };
 try{
  await assert.rejects(runV4DLocalAuthor({model:'qwen3:14b',outDir:out,
   prompt:'a complete independent civic building',precisionCivicContract:true,
   authorArcade:false},{fetcher}),/PRECISION_CONTRACT_REQUIRES_CIVIC_AUTHOR/);
  assert.equal(requests.length,0);
  const report=await runV4DLocalAuthor({model:'qwen3:14b',outDir:out,
   prompt:'a complete independent civic building',precisionCivicContract:true,
   authorArcade:true},{fetcher});
  assert.equal(report.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.equal(report.testInjectionPresent,true);
  assert.equal(report.promptProtocol,V4J_PRECISION_PROTOCOL);
  assert.equal(report.systemPromptSha256,sha(V4J_PRECISION_SYSTEM_PROMPT));
  assert.deepEqual(requests.map(x=>x.method),['GET','POST']);
  const body=JSON.parse(requests[1].body);
  assert.equal(body.messages[0].content,V4J_PRECISION_SYSTEM_PROMPT);
  assert.equal(body.messages[1].content,'a complete independent civic building');
  assert.deepEqual(body.response_format,{type:'json_object'});
  assert.equal(body.max_tokens,4096);
  assert.equal(body.stream,false);
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'LOCAL_REQUEST.json'),'utf8'));
  assert.equal(manifest.promptProtocol,V4J_PRECISION_PROTOCOL);
  assert.equal(manifest.systemPromptSha256,sha(V4J_PRECISION_SYSTEM_PROMPT));
  assert.equal(manifest.nModelGenerationAttemptsAllowed,1);
  assert.equal(manifest.noWorldAccess,true);
  assert.equal(manifest.noPaidAPI,true);
  const share=fs.readFileSync(path.join(out,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8');
  assert(!share.includes(V4J_PRECISION_SYSTEM_PROMPT));
  assert(!share.includes(out));
  assert(!share.includes(dir));
  assert.equal(report.worldWrites,0);
  assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
