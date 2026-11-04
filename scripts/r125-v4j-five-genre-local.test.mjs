import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FIVE_INDEPENDENT_BRIEFS,parseFiveGenreArgs,runFiveGenreLocal}
 from './r125-v4j-five-genre-local.mjs';
const sha='a'.repeat(64);
const mk=()=>fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4j-5genres-'));
const opts=p=>parseFiveGenreArgs(['--model','qwen3:14b','--out',p]);
function fake(status='HOLD_TEST_DOUBLE_NOT_REAL_MODEL'){
 const valid=status==='HOLD_TEST_DOUBLE_NOT_REAL_MODEL';
 return {schema:'minecraftaibuilder-r125-v4d-local-model-author-attempt-v1',
  status,reason:valid?null:'MODEL_NOT_INSTALLED',modelId:'qwen3:14b',
  authorContract:'minecraftaibuilder-r125-v4j-civic-arcade-author-v1',
  testInjectionPresent:true,modelCalls:valid?1:0,rawCaptured:valid,
  responseRawSha256:valid?sha:null,
  sourceRoutesStatus:valid?'SOURCE_ROUTES_REACH_ALL_ZONES':'NOT_TESTED',
  sourceSha256:valid?sha:null,geometrySha256:valid?sha:null,
  actualB143VoxelCount:valid?6400:null,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0};
}
test('five genuinely distinct model briefs and no common fake single prompt',()=>{
 assert.deepEqual(FIVE_INDEPENDENT_BRIEFS.map(x=>x.genre),
  ['housing','shop','research','gallery','station']);
 assert.equal(new Set(FIVE_INDEPENDENT_BRIEFS.map(x=>x.prompt)).size,5);
 assert.throws(()=>parseFiveGenreArgs(['--model','qwen3:14b',
  '--out','new','--prompt','one text']),/FIVE_GENRE_BRIEFS/);
});
test('five sequential synthetic sources stay TEST DOUBLE, ART HOLD and private',async()=>{
 const tmp=mk(),out=path.join(tmp,'batch');let active=0,maxActive=0;
 const prompts=[];
 try{
  const r=await runFiveGenreLocal(opts(out),{runOne:async o=>{
   active++;maxActive=Math.max(maxActive,active);
   assert.equal(o.outDir,path.join(out,FIVE_INDEPENDENT_BRIEFS[prompts.length].genre));
   assert.equal(o.model,'qwen3:14b');assert.equal(o.authorArcade,true);
   prompts.push(o.prompt);await Promise.resolve();active--;return fake();
  }});
  assert.equal(maxActive,1);
  assert.deepEqual(prompts,FIVE_INDEPENDENT_BRIEFS.map(x=>x.prompt));
  assert.equal(r.provenance,'INJECTED_TEST_DOUBLE_NOT_REAL_MODEL');
  assert.equal(r.attemptedGenres,5);assert.equal(r.knownModelCallAttempts,5);
  assert.equal(r.sourceCandidates,5);assert.equal(r.modelCallCountComplete,true);
  assert.equal(r.humanArchitecturalArt,'NOT_REVIEWED');
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));assert.equal(r.worldWrites,0);
  const summary=fs.readFileSync(path.join(out,'FIVE_GENRES_SHAREABLE_SUMMARY.json'),'utf8');
  assert.deepEqual(JSON.parse(summary),r);
  assert(!summary.includes(out));assert(!summary.includes('127.0.0.1'));
  assert(!summary.includes(prompts[0]));
  await assert.rejects(runFiveGenreLocal(opts(out),{runOne:async()=>fake()}),
   /FRESH_OUTSIDE_REPOSITORY_FOLDER/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('missing local model stops remaining four independent attempts, zero POSTs',async()=>{
 const tmp=mk(),out=path.join(tmp,'batch');let n=0;
 try{
  const r=await runFiveGenreLocal(opts(out),{runOne:async()=>{
   n++;return fake('HOLD_MODEL_NOT_INSTALLED');
  }});
  assert.equal(n,1);assert.equal(r.knownModelCallAttempts,0);
  assert.equal(r.sourceCandidates,0);assert.equal(r.remainingUnattemptedGenres.length,4);
  assert.equal(r.stoppedReason,'HOLD_MODEL_NOT_INSTALLED');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('local HTTP failure stops other genres even if wrapper status is generic SOURCE HOLD',async()=>{
 const tmp=mk(),out=path.join(tmp,'batch');let n=0;
 try{
  const r=await runFiveGenreLocal(opts(out),{runOne:async()=>{
   n++;return {...fake('HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR'),
    modelCalls:1,reason:'R125_V4D_LOCAL_AUTHOR_MODEL_HTTP_503'};
  }});
  assert.equal(n,1);
  assert.equal(r.attemptedGenres,1);
  assert.equal(r.knownModelCallAttempts,1);
  assert.equal(r.stoppedReason,'LOCAL_TRANSPORT_FAILURE');
  assert.equal(r.remainingUnattemptedGenres.length,4);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('unexpected failure is fail-closed and model call count marked incomplete',async()=>{
 const tmp=mk(),out=path.join(tmp,'batch');
 try{
  const r=await runFiveGenreLocal(opts(out),{runOne:async()=>{
   throw Error('PRIVATE_ORIGINAL_DO_NOT_LEAK');
  }});
  assert.equal(r.modelCallCountComplete,false);
  assert.equal(r.outcomes[0].attempts,'UNKNOWN');
  assert.equal(r.stoppedReason,'UNEXPECTED_LOCAL_RUNNER_ERROR');
  assert(!JSON.stringify(r).includes('PRIVATE_ORIGINAL_DO_NOT_LEAK'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
