import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runV4DLocalAuthor} from './r125-v4d-local-architect.mjs';
import {makeV4DCompactSynthetic} from './r125-v4d-compact-model-fixture.mjs';
import {replayPrivateV4D,parseV4DReplayArgs,REPLAY_SCHEMA}
 from './r125-v4d-replay-private.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function privateTemp(){
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'v4d-replay-test-'));
 return {parent,study:path.join(parent,'original'),
  replay:path.join(parent,'replay'),
  clean:()=>fs.rmSync(parent,{recursive:true,force:true})};
}
function fakeOllama(raw,finish='stop',listed=true){
 const calls=[];
 const fetcher=async(url,init)=>{
  calls.push({url,method:init?.method});
  if(init?.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:listed?[{name:'qwen3:14b'}]:[]})};
  if(init?.method==='POST')return {ok:true,status:200,
   text:async()=>JSON.stringify({
    model:'qwen3:14b',
    choices:[{finish_reason:finish,message:{role:'assistant',content:raw}}]
   })};
  throw Error('TEST_UNEXPECTED_REQUEST');
 };
 return {fetcher,calls};
}
const trial=(folder,f)=>runV4DLocalAuthor({
 model:'qwen3:14b',outDir:folder,compact:true,
 prompt:'Design a brand new, creative public courtyard workshop and entry concourse.'
},{fetcher:f.fetcher,timeoutMs:15000});
const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
test('original synthetic response can reproduce identical TRUE B143 without ANY second model call',async()=>{
 const s=privateTemp(),model=fakeOllama(JSON.stringify(makeV4DCompactSynthetic()));
 try{
  const original=await trial(s.study,model);
  assert.equal(original.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',original.reason);
  const count=model.calls.length;
  const replay=replayPrivateV4D(s.study,s.replay);
  assert.equal(model.calls.length,count);
  assert.equal(replay.schema,REPLAY_SCHEMA);
  assert.equal(replay.additionalModelCalls,0);
  assert.equal(replay.originalCompilerHashesMatch,true);
  assert.equal(replay.originalResponseIntegrity,'SHA256_MATCH');
  assert.equal(replay.status,'HOLD_TEST_DOUBLE_REPLAY_ONLY');
  assert.equal(replay.sourceCodeSHA256Replayed,original.sourceSha256);
  assert.equal(replay.geometrySHA256Replayed,original.geometrySha256);
  assert.equal(replay.replayedTrueB143VoxelCount,original.actualB143VoxelCount);
  assert.equal(replay.worldWrites,0);
  assert.equal(replay.constructionApproved,false);
  assert.deepEqual(replay.gates,Array(9).fill('BLOCKED'));
  assert(fs.existsSync(path.join(s.replay,'index.html')));
  assert(fs.existsSync(path.join(s.replay,'TRUE_B143_REPLAY_SOURCE.json')));
  const safe=read(path.join(s.replay,'REPLAY_SHAREABLE_STATUS.json'));
  assert.equal(safe.originalIsTestInjection,true);
  assert.equal(safe.originalModelIdentityAttested,false);
  assert.equal(safe.noOriginalPromptOrResponseIncluded,true);
  const outText=fs.readFileSync(path.join(s.replay,'OFFLINE_REPLAY_REPORT.json'),'utf8');
  assert(!outText.includes(s.parent));
  assert(!outText.includes('brand new, creative public courtyard'));
  assert(!fs.existsSync(path.join(s.replay,'MODEL_RESPONSE_ORIGINAL.txt')));
  assert.equal(
   fs.readFileSync(path.join(s.study,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),
   JSON.stringify(makeV4DCompactSynthetic()));
 }finally{s.clean();}
});
test('raw response byte tampering is detected and cannot be compiled',async()=>{
 const s=privateTemp(),model=fakeOllama(JSON.stringify(makeV4DCompactSynthetic()));
 try{
  await trial(s.study,model);
  const file=path.join(s.study,'MODEL_RESPONSE_ORIGINAL.txt');
  fs.appendFileSync(file,' ');
  const result=replayPrivateV4D(s.study,s.replay);
  assert.equal(result.originalResponseIntegrity,'SHA256_MISMATCH');
  assert.equal(result.status,'HOLD_TAMPERED_ORIGINAL_RESPONSE');
  assert(!fs.existsSync(path.join(s.replay,'index.html')));
  assert(!fs.existsSync(path.join(s.replay,'TRUE_B143_REPLAY_SOURCE.json')));
  assert.equal(result.additionalModelCalls,0);
 }finally{s.clean();}
});
test('previously invalid ORIGINAL semantic source stays HOLD even if a later compiler accepts it',async()=>{
 const s=privateTemp(),p=makeV4DCompactSynthetic();
 p.spaces[1].attach.to='not-exists';
 const model=fakeOllama(JSON.stringify(p));
 try{
  const old=await trial(s.study,model);
  assert.equal(old.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  const before=replayPrivateV4D(s.study,s.replay);
  assert.equal(before.status,'HOLD_REPLAY_SOURCE_REJECTED');
  assert(!fs.existsSync(path.join(s.replay,'index.html')));
  assert.equal(before.additionalModelCalls,0);
  // Even if local private evidence was replaced and re-hashed externally
  // (a corruption scenario), the historical failure cannot auto-promote.
  const good=JSON.stringify(makeV4DCompactSynthetic());
  fs.writeFileSync(path.join(s.study,'MODEL_RESPONSE_ORIGINAL.txt'),good);
  const reportPath=path.join(s.study,'V4D_LOCAL_AUTHOR_REPORT.json');
  const manifest=read(reportPath);
  manifest.responseRawSha256=hash(good);
  fs.writeFileSync(reportPath,JSON.stringify(manifest));
  const second=replayPrivateV4D(s.study,path.join(s.parent,'replay2'));
  assert.equal(second.status,'HOLD_PREVIOUSLY_FAILED_BUT_CURRENT_COMPILER_ACCEPTS');
  assert(!fs.existsSync(path.join(s.parent,'replay2','index.html')));
 }finally{s.clean();}
});
test('truncation and model-not-installed HOLDs remain HOLD without requesting a model',async()=>{
 const a=privateTemp(),b=privateTemp();
 try{
  const partial='{"schema":"unfinished","spaces":[';
  const broken=fakeOllama(partial,'length');
  const original=await trial(a.study,broken);
  assert.equal(original.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  const truncated=replayPrivateV4D(a.study,a.replay);
  assert.equal(truncated.status,'HOLD_ORIGINAL_MODEL_NOT_COMPLETED');
  assert.equal(truncated.originalResponseIntegrity,'SHA256_MATCH');
  const missingModel=fakeOllama('ignored','stop',false);
  const old=await trial(b.study,missingModel);
  assert.equal(old.modelCalls,0);
  const missing=replayPrivateV4D(b.study,b.replay);
  assert.equal(missing.status,'HOLD_NO_SAVED_ORIGINAL_MODEL_TEXT');
  assert.equal(missing.additionalModelCalls,0);
  assert.equal(missingModel.calls.filter(x=>x.method==='POST').length,0);
  assert(!fs.existsSync(path.join(b.replay,'index.html')));
 }finally{a.clean();b.clean();}
});
test('original approved SOURCE whose hash no longer matches current compiler is DRIFT HOLD',async()=>{
 const s=privateTemp(),model=fakeOllama(JSON.stringify(makeV4DCompactSynthetic()));
 try{
  await trial(s.study,model);
  const p=path.join(s.study,'V4D_LOCAL_AUTHOR_REPORT.json'),report=read(p);
  report.testInjectionPresent=false;
  report.status='SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED';
  report.geometrySha256='0'.repeat(64);
  fs.writeFileSync(p,JSON.stringify(report));
  const replay=replayPrivateV4D(s.study,s.replay);
  assert.equal(replay.status,'HOLD_RECOMPILED_GEOMETRY_OR_SOURCE_CHANGED');
  assert.equal(replay.originalCompilerHashesMatch,false);
  assert.equal(replay.modelIdentityCryptographicallyAttested,false);
  assert(!fs.existsSync(path.join(s.replay,'index.html')));
 }finally{s.clean();}
});
test('no overwrite, symlink source, invalid private manifest and repository-internal output are fail closed',async()=>{
 const s=privateTemp(),model=fakeOllama(JSON.stringify(makeV4DCompactSynthetic()));
 try{
  await trial(s.study,model);
  fs.mkdirSync(s.replay);
  assert.throws(()=>replayPrivateV4D(s.study,s.replay),/OUTPUT_ALREADY_EXISTS/);
  assert.throws(()=>parseV4DReplayArgs(['--out','abc','--study','def']),/ARGS_EXPECT_/);
  const symlink=path.join(s.parent,'linked');
  fs.symlinkSync(s.study,symlink,'dir');
  assert.throws(()=>replayPrivateV4D(symlink,path.join(s.parent,'z')),/SOURCE_MUST_BE_UNLINKED_DIRECTORY/);
  const man=path.join(s.study,'V4D_LOCAL_AUTHOR_REPORT.json');
  const body=read(man);body.worldWrites=1;
  fs.writeFileSync(man,JSON.stringify(body));
  assert.throws(()=>replayPrivateV4D(s.study,path.join(s.parent,'z')),/PREVIOUS_REPORT_UNTRUSTED_OR_UNSAFE/);
  assert(!fs.existsSync(path.join(s.parent,'z')));
 }finally{s.clean();}
});
