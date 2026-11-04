import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CIVIC_ARCADE_SCHEMA} from '../source/ai/r125-v4j-civic-author-ir.mjs';
import {syntheticFiveV4JArcadeAuthors} from './r125-v4j-civic-facade-study.mjs';
import {runV4DLocalAuthor} from './r125-v4d-local-architect.mjs';
import {replayFiveGenrePrivateBatch,parseFiveGenreReplayArgs,
 renderFiveGenrePrivateArtReview,summarizeFiveGenreReplayRejections}
 from './r125-v4j-five-genre-replay.mjs';
const mk=()=>fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4j-offline-'));
const fixture=()=>{
 const s=syntheticFiveV4JArcadeAuthors()[0];
 return {...structuredClone(s.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(s.arcade)};
};
test('existing batch with no attempted models yields five honest NOT_ATTEMPTED outcomes, no model calls',()=>{
 const dir=mk();
 try{
  const study=path.join(dir,'prior'),out=path.join(dir,'new');
  fs.mkdirSync(study);
  const r=replayFiveGenrePrivateBatch(study,out);
  assert.equal(r.attemptedOfflineReplays,0);
  assert.equal(r.sourceReproducedCount,0);
  assert.equal(r.additionalModelCalls,0);
  assert.equal(r.networkCalls,0);
  assert.equal(r.outcomes.length,5);
  assert.deepEqual(r.promptProtocols,[{promptProtocol:'UNAVAILABLE',count:5}]);
  assert.equal(r.sourceRejectionTriage.shaVerifiedNonInjectedCompilationHolds,0);
  assert.deepEqual(r.nonInjectedShaMatchedIssueFrequency,[]);
  assert(r.outcomes.every(x=>x.offlineStatus==='NOT_ATTEMPTED'));
  assert.equal(r.geometry.status,'INSUFFICIENT_INDEPENDENT_REAL_MODEL_SOURCES');
  assert.equal(r.worldWrites,0);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  const html=fs.readFileSync(path.join(out,'FIVE_GENRES_PRIVATE_ART_REVIEW.html'),'utf8');
  assert.equal((html.match(/SOURCE HOLD \/ TEST DOUBLE/g)??[]).length,5);
  assert(!html.includes('<img '));
  assert(!html.includes(study));
  assert.throws(()=>replayFiveGenrePrivateBatch(study,out),
   /FRESH_SEPARATE_OUTPUT_REQUIRED/);
  assert.throws(()=>parseFiveGenreReplayArgs(['--out','x','--study','y']),
   /ARGS_EXPECT_STUDY_AND_NEW_OUT/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('one actual synthetic local HTTP response replays offline without any extra model request or real-model promotion',async()=>{
 const dir=mk(),study=path.join(dir,'prior'),out=path.join(dir,'replay');
 fs.mkdirSync(study);
 const original=JSON.stringify(fixture()),calls=[];
 const fetcher=async(url,opts)=>{
  calls.push(opts?.method);
  if(opts?.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(opts?.method==='POST')return {ok:true,status:200,
   text:async()=>JSON.stringify({model:'qwen3:14b',
    choices:[{finish_reason:'stop',message:{role:'assistant',content:original}}]})};
  throw Error('UNEXPECTED_TEST_HTTP_REQUEST');
 };
 try{
  const trial=await runV4DLocalAuthor({model:'qwen3:14b',authorArcade:true,
   outDir:path.join(study,'housing'),
   prompt:'Make an independently authored small public civic building.'
  },{fetcher,timeoutMs:180000});
  assert.equal(trial.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL');
  const n=calls.length;
  const rawPath=path.join(study,'housing','MODEL_RESPONSE_ORIGINAL.txt');
  const before=fs.readFileSync(rawPath,'utf8');
  const r=replayFiveGenrePrivateBatch(study,out);
  assert.equal(calls.length,n);
  assert.equal(r.additionalModelCalls,0);
  assert.equal(r.attemptedOfflineReplays,1);
  assert.equal(r.sourceReproducedCount,0);
  assert.equal(r.outcomes[0].originalWasInjectedTestDouble,true);
  assert.equal(r.sourceRejectionTriage.shaVerifiedNonInjectedCompilationHolds,0);
  assert.equal(r.outcomes[0].promptProtocol,'LEGACY_AUTHOR_CONTRACT');
  assert.equal(r.outcomes[0].systemPromptSHA256,trial.systemPromptSha256);
  assert.deepEqual(r.nonInjectedShaMatchedIssueFrequency,[]);
  assert.equal(r.outcomes[0].offlineStatus,'HOLD_TEST_DOUBLE_REPLAY_ONLY');
  assert.equal(r.outcomes[0].originalResponseIntegrity,'SHA256_MATCH');
  assert.equal(r.geometry.status,'INSUFFICIENT_INDEPENDENT_REAL_MODEL_SOURCES');
  assert.equal(r.outcomes[1].offlineStatus,'NOT_ATTEMPTED');
  const html=fs.readFileSync(path.join(out,'FIVE_GENRES_PRIVATE_ART_REVIEW.html'),'utf8');
  assert(!html.includes('<img '));
  assert(!html.includes(original));
  assert(!html.includes(dir));
  assert.equal(r.sharedSourceIssues.length,0);
  assert.equal(fs.readFileSync(rawPath,'utf8'),before);
  const summary=fs.readFileSync(path.join(out,
   'FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json'),'utf8');
  assert.deepEqual(JSON.parse(summary),r);
  assert(!summary.includes('Make an independently authored'));
  assert(!summary.includes(dir));
  assert(!summary.includes(original));
  assert.equal(r.worldWrites,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('symlinked genre is refused; replay does not leak target or invent an offline SOURCE pass',()=>{
 const dir=mk(),study=path.join(dir,'prior'),out=path.join(dir,'new');
 fs.mkdirSync(study);
 try{
  fs.symlinkSync(dir,path.join(study,'housing'),'dir');
  const r=replayFiveGenrePrivateBatch(study,out);
  assert.equal(r.outcomes[0].offlineStatus,'HOLD_REPLAY_INPUT_OR_SOURCE_INTEGRITY');
  assert.equal(r.outcomes[0].independentRealSourceReproduced,false);
  assert(!JSON.stringify(r).includes(dir));
  assert.equal(r.additionalModelCalls,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('private gallery shows only SHA-verified real non-test B143 and never embeds author-provided strings',()=>{
 const names=['housing','shop','research','gallery','station'];
 const summary={additionalModelCalls:0,worldWrites:0,userArtAssessment:'NOT_REVIEWED',
  outcomes:names.map((genre,i)=>({
   genre,originalWasInjectedTestDouble:i!==0,
   independentRealSourceReproduced:i===0,
   originalResponseIntegrity:'SHA256_MATCH',
   offlineStatus:i===0?'SOURCE_REPRODUCED_OFFLINE_ART_NOT_REVIEWED':
    'HOLD_TEST_DOUBLE_REPLAY_ONLY',
   structuralIssueCodes:i===1?['PARENT_ATTACHMENT_INVALID','<script>alert(1)</script>']:[]
  })),
  geometry:{pairwise:[
   {genreA:'housing',genreB:'shop',meanFiveViewSimilarity:0.754321}
  ]}
 };
 const html=renderFiveGenrePrivateArtReview(summary);
 assert.equal((html.match(/<img /g)??[]).length,1);
 assert(html.includes('housing/TRUE_B143_FIVE_VIEWS_PRIVATE.svg'));
 assert(!html.includes('shop/TRUE_B143_FIVE_VIEWS_PRIVATE.svg'));
 assert(html.includes('0.754'));
 assert(!html.includes('<script>'));
 assert(!html.includes('alert(1)</script>'));
 assert(!html.includes('http://'));
 assert(!html.includes('https://'));
 assert(html.includes('ART HOLD'));
 assert.throws(()=>renderFiveGenrePrivateArtReview({...summary,worldWrites:1}),
  /PRIVATE_ART_REVIEW_REQUIRES_SAFE_OFFLINE_SUMMARY/);
});

test('two genuine SHA-bound compiler HOLDS are not a SOURCE success even with zero structural codes',()=>{
 const genres=['housing','shop','research','gallery','station'];
 const cases=genres.map((genre,i)=>({
  genre,offlineStatus:i<=2?'HOLD_REPLAY_SOURCE_REJECTED':'NOT_ATTEMPTED',
  originalWasInjectedTestDouble:i===2,
  originalResponseIntegrity:i<=2?'SHA256_MATCH':'NOT_CHECKED',
  structuralIssueCodes:i===0?[]:['PARENT_ATTACHMENT_INVALID'],
  sourceFailureFamily:i===0?'TALL_FUNCTIONAL_PUBLIC_ATRIUM_SOURCE_INVALID':
   i===1?'USER_SECRET_NOT_A_COMPILER_FAMILY':'B143_COMPILATION_INVALID'
 }));
 const r=summarizeFiveGenreReplayRejections(cases);
 assert.equal(r.shaVerifiedNonInjectedCompilationHolds,2);
 assert.deepEqual(r.zeroStaticIssueYetCompilationHeldGenres,['housing']);
 assert.deepEqual(r.genericCompilerFailureFamilies.map(x=>x.family),[
  'TALL_FUNCTIONAL_PUBLIC_ATRIUM_SOURCE_INVALID',
  'UNCLASSIFIED_SOURCE_REJECTION'
 ]);
 assert(!JSON.stringify(r).includes('USER_SECRET'));
 assert(r.genericCompilerFailureFamilies.every(x=>!x.sameUnderlyingRootCauseProven));
 assert.equal(r.staticFieldCheckIsNot3DCompilationProof,true);
 assert.throws(()=>summarizeFiveGenreReplayRejections(cases.slice(0,4)),
  /REJECTION_SUMMARY_REQUIRES_FIVE_KNOWN_GENRES/);
});
