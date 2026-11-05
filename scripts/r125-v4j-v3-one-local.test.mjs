import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {V4J_STRUCTURED_SYSTEM_PROMPT} from '../source/ai/r125-v4j-structured-author-schema.mjs';
import {V4J_ENVELOPE_SYSTEM_PROMPT} from '../source/ai/r125-v4j-feasible-envelope.mjs';
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
  assert.equal(safe.systemPromptSha256,
   createHash('sha256').update(V4J_STRUCTURED_SYSTEM_PROMPT).digest('hex'));
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

test('geometry V4 CLI is explicit; prior V3 flags keep original contract',()=>{
 const v4=parseV3OneArgs(['--model','qwen3:14b','--out','private',
  '--geometry-v4']);
 assert.equal(v4.genre,'housing');
 assert.equal(v4.geometryEnvelopeV4,true);
 assert.equal(parseV3OneArgs(['--model','qwen3:14b','--out','private'])
  .geometryEnvelopeV4,undefined);
 assert.throws(()=>parseV3OneArgs(['--model','qwen3:14b','--out','private',
  '--geometry-v4','--geometry-v4']),/DUPLICATE_GEOMETRY_V4/);
 assert.throws(()=>parseV3OneArgs(['--model','qwen3:14b','--out','private',
  '--geometry-v4','--out','another']),/ARGUMENTS/);
});
test('one opt-in V4 fake schema call remains HOLD and exports distinct V4 shareable only',async()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-v4-one-'));
 const out=path.join(d,'original'),methods=[];
 const fetcher=async(_url,opts)=>{
  methods.push(opts.method);
  if(opts.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  if(opts.method==='POST')return {ok:true,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',
    message:{role:'assistant',content:'{"schema":"invalid"}'}}]})};
  throw Error('UNEXPECTED_FAKE_CALL');
 };
 try{
  const o=await runV3OneGenreStudy({
   model:'qwen3:14b',outDir:out,genre:'housing',geometryEnvelopeV4:true
  },{fetcher,timeoutMs:15000});
  assert.deepEqual(methods,['GET','POST']);
  assert.equal(o.promptProtocol,'V4J_SINGLE_RESPONSE_FEASIBLE_MASSING_V4');
  assert.equal(o.systemPromptSha256,
   createHash('sha256').update(V4J_ENVELOPE_SYSTEM_PROMPT).digest('hex'));
  assert.equal(o.schema,'minecraftaibuilder-v4j-v4-one-genre-safe-handoff-v1');
  assert.equal(o.sourceCandidateVerified,false);
  assert.equal(o.explicitlyInjectedTestResponse,true);
  assert.equal(o.modelGenerationAttempts,1);
  assert.equal(o.replayAdditionalModelCalls,0);
  assert.equal(o.replayStatus,'HOLD_REPLAY_SOURCE_REJECTED');
  assert.equal(o.graphEntryNorthSideOccupied,null);
  assert.deepEqual(o.gates,Array(9).fill('BLOCKED'));
  assert.equal(o.worldWrites,0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'V4J_V4_ONE_SHAREABLE.json'),'utf8')),o);
  assert.equal(fs.existsSync(path.join(out,'V4J_V3_ONE_SHAREABLE.json')),false);
  assert.equal(fs.existsSync(path.join(out+'-replay','REPLAY_SHAREABLE_STATUS.json')),true);
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('V4 clipboard-safe report shows north entry collision only with SHA-verified original replay evidence (mock only)',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-graph-safe-'));
 const out=path.join(dir,'one'),calls=[];
 const fetcher=async(_url,opts)=>{
  calls.push(opts.method);
  if(opts.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  return {ok:true,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',
    message:{role:'assistant',content:'{"schema":"invalid"}'}}]})};
 };
 const replay=()=>({
  status:'HOLD_REPLAY_SOURCE_REJECTED',
  compilerRejectCode:'GRAPH_ENTRY',
  originalResponseIntegrity:'SHA256_MATCH',
  structuralDiagnosticIssueCodes:['ENTRY_NORTH_SIDE_OCCUPIED'],
  additionalModelCalls:0
 });
 try{
  const result=await runV3OneGenreStudy({
   model:'qwen3:14b',outDir:out,genre:'housing',geometryEnvelopeV4:true
  },{fetcher,replay,timeoutMs:15000});
  assert.equal(result.graphEntryNorthSideOccupied,true);
  assert.equal(result.compilerRejectCode,'GRAPH_ENTRY');
  assert.equal(result.sourceCandidateVerified,false);
  assert.equal(result.explicitlyInjectedTestResponse,true);
  assert.deepEqual(calls,['GET','POST']);
  const shared=fs.readFileSync(path.join(out,'V4J_V4_ONE_SHAREABLE.json'),'utf8');
  assert.equal(JSON.parse(shared).graphEntryNorthSideOccupied,true);
  assert(!shared.includes(dir));
  assert(!shared.includes('{"schema":"invalid"}'));
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('safe handoff exposes footprint collision only with matching SHA-verified frozen GRAPH evidence (injected fake only)',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-footprint-safe-'));
 const out=path.join(dir,'one'),calls=[];
 const fetcher=async(_url,opts)=>{
  calls.push(opts.method);
  if(opts.method==='GET')return {ok:true,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  return {ok:true,text:async()=>JSON.stringify({model:'qwen3:14b',choices:[{
   finish_reason:'stop',message:{role:'assistant',content:'{"schema":"invalid"}'}
  }]})};
 };
 const replay=()=>({
  status:'HOLD_REPLAY_SOURCE_REJECTED',
  compilerRejectCode:'GRAPH_SOLID_FOOTPRINT_OVERLAP',
  originalResponseIntegrity:'SHA256_MATCH',
  structuralDiagnosticIssueCodes:['AUTHORED_SOLID_FOOTPRINT_OVERLAP'],
  additionalModelCalls:0
 });
 try{
  const safe=await runV3OneGenreStudy({
   model:'qwen3:14b',outDir:out,genre:'station',geometryEnvelopeV4:true
  },{fetcher,replay,timeoutMs:15000});
  assert.deepEqual(calls,['GET','POST']);
  assert.equal(safe.graphSolidFootprintOverlap,true);
  assert.equal(safe.sourceCandidateVerified,false);
  assert.equal(safe.explicitlyInjectedTestResponse,true);
  assert.deepEqual(safe.gates,Array(9).fill('BLOCKED'));
  const shared=fs.readFileSync(path.join(out,'V4J_V4_ONE_SHAREABLE.json'),'utf8');
  assert.equal(JSON.parse(shared).graphSolidFootprintOverlap,true);
  assert(!shared.includes(dir));
  assert(!shared.includes('{"schema":"invalid"}'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
 
test('V5 opt-in uses one injected POST, raw SHA and replay reject without repairing invalid entry',async()=>{
 const {V4J_ENTRY_FIRST_RESPONSE_FORMAT:format,V4J_ENTRY_FIRST_SYSTEM_PROMPT:prompt}=
  await import('../source/ai/r125-v4j-feasible-envelope.mjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-v5-one-'));
 const out=path.join(root,'original'),calls=[];
 const raw=JSON.stringify({schema:'minecraftaibuilder-r125-v4j-civic-arcade-author-intent-v1'});
 const fetcher=async(_url,opts)=>{
  calls.push({method:opts.method,body:opts.body});
  if(opts.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  return {ok:true,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',
    message:{role:'assistant',content:raw}}]})};
 };
 try{
  const safe=await runV3OneGenreStudy({model:'qwen3:14b',outDir:out,
   genre:'housing',entryFirstV5:true},{fetcher,timeoutMs:15000});
  assert.deepEqual(calls.map(x=>x.method),['GET','POST']);
  const posted=JSON.parse(calls[1].body);
  assert.deepEqual(posted.response_format,format);
  assert.equal(posted.messages[0].content,prompt);
  assert.equal(safe.promptProtocol,'V4J_SINGLE_RESPONSE_EXPLICIT_ENTRY_V5');
  assert.equal(safe.schema,'minecraftaibuilder-v4j-v5-one-genre-safe-handoff-v1');
  assert.equal(safe.compilerRejectCode,'ENTRY_FIRST_ROOT_FIELDS');
  assert.equal(safe.reportedStatus,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.equal(safe.replayStatus,'HOLD_REPLAY_SOURCE_REJECTED');
  assert.equal(safe.sourceCandidateVerified,false);
  assert.equal(safe.explicitlyInjectedTestResponse,true);
  assert.equal(safe.modelGenerationAttempts,1);
  assert.equal(safe.replayAdditionalModelCalls,0);
  assert.deepEqual(safe.gates,Array(9).fill('BLOCKED'));
  assert.equal(safe.worldWrites,0);
  assert.equal(fs.readFileSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  const share=fs.readFileSync(path.join(out,'V4J_V5_ONE_SHAREABLE.json'),'utf8');
  assert.deepEqual(JSON.parse(share),safe);
  assert(!share.includes(raw));
  assert(!share.includes(root));
  assert(!fs.existsSync(path.join(out,'V4J_V4_ONE_SHAREABLE.json')));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('V6 fake Ollama uses one POST and preserves private ORIGINAL and HOLD without root-north repair',async()=>{
 const {V4J_PARENT_INDEX_RESPONSE_FORMAT:fmt6,V4J_PARENT_INDEX_SYSTEM_PROMPT:prompt}=
  await import('../source/ai/r125-v4j-feasible-envelope.mjs');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-v6-index-'));
 const out=path.join(tmp,'private'),methods=[];
 const raw=JSON.stringify({schema:'invalid',entrySpace:{attach:null},otherSpaces:[]});
 const fetcher=async(_url,opts)=>{
  methods.push({method:opts.method,body:opts.body});
  if(opts.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  return {ok:true,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',
    message:{role:'assistant',content:raw}}]})};
 };
 try{
  const status=await runV3OneGenreStudy({model:'qwen3:14b',
   outDir:out,genre:'housing',parentIndexV6:true},{fetcher,timeoutMs:15000});
  assert.deepEqual(methods.map(x=>x.method),['GET','POST']);
  const posted=JSON.parse(methods[1].body);
  assert.deepEqual(posted.response_format,fmt6);
  assert.equal(posted.messages[0].content,prompt);
  assert.equal(status.promptProtocol,'V4J_SINGLE_RESPONSE_AUTHOR_PARENT_INDEX_V6');
  assert.equal(status.schema,'minecraftaibuilder-v4j-v6-one-genre-safe-handoff-v1');
  assert.equal(status.modelGenerationAttempts,1);
  assert.equal(status.replayAdditionalModelCalls,0);
  assert.equal(status.replayStatus,'HOLD_REPLAY_SOURCE_REJECTED');
  assert.equal(status.compilerRejectCode,'PARENT_INDEX_ROOT_FIELDS');
  assert.equal(status.reportedStatus,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.equal(status.sourceCandidateVerified,false);
  assert.equal(status.explicitlyInjectedTestResponse,true);
  assert.deepEqual(status.gates,Array(9).fill('BLOCKED'));
  assert.equal(status.worldWrites,0);
  assert.equal(fs.readFileSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  const shared=fs.readFileSync(path.join(out,'V4J_V6_ONE_SHAREABLE.json'),'utf8');
  assert.deepEqual(JSON.parse(shared),status);
  assert(!shared.includes(raw));
  assert(!shared.includes(tmp));
  assert(!fs.existsSync(path.join(out,'V4J_V5_ONE_SHAREABLE.json')));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
