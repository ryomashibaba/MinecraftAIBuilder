import test from 'node:test';
import assert from 'node:assert/strict';
import {REQUIRED_CHECKS,assessCiRuns,checkExactHeadCi,waitForExactHeadCi}
 from './r125-v4j-safe-ci-gate.mjs';
const sha='a'.repeat(40),wrong='b'.repeat(40);
const run=(name,head_sha,status='completed',conclusion='success',id=1)=>
 ({name,head_sha,status,conclusion,id});
test('exact GitHub HEAD must have BOTH named workflows completed SUCCESS',()=>{
 const runs=[run(REQUIRED_CHECKS[0],sha),run(REQUIRED_CHECKS[1],sha,'completed','success',2)];
 assert.equal(assessCiRuns(runs,sha).safeToRunModel,true);
 assert.equal(assessCiRuns(runs.slice(0,1),sha).safeToRunModel,false);
 assert.equal(assessCiRuns(runs.map(x=>({...x,head_sha:wrong})),sha).safeToRunModel,false);
 assert.equal(assessCiRuns([...runs,run(REQUIRED_CHECKS[0],sha,'completed','failure',4)],sha).permanentlyBlocked,true);
 assert.equal(assessCiRuns([...runs,run(REQUIRED_CHECKS[0],sha,'in_progress',null,4)],sha).safeToRunModel,false);
 assert.equal(assessCiRuns([...runs,run('not-required',sha,'completed','success',999)],sha).safeToRunModel,true);
});
test('CI HTTP failures, misleading payload or unknown HEAD fail closed',async()=>{
 await assert.rejects(checkExactHeadCi(sha,{fetcher:async()=>({ok:false})}),
  /CI_NETWORK_OR_RATE_LIMIT_HOLD/);
 await assert.rejects(checkExactHeadCi(sha,{fetcher:async()=>({
  ok:true,json:async()=>({workflow_runs:{not:'an-array'}})
 })}),/CI_RESPONSE_UNVERIFIED/);
 await assert.rejects(checkExactHeadCi('wrong'),/CI_SHA_REQUIRED/);
});
test('CI guard can poll source-only without invoking any local Qwen request',async()=>{
 let reads=0,pauses=0;
 const fn=async(url,req)=>{
  assert(!url.includes('11434'));assert.equal(req.headers['Accept'],'application/vnd.github+json');
  reads++;
  const state=reads===1?'in_progress':'completed';
  return {ok:true,json:async()=>({workflow_runs:[
   run(REQUIRED_CHECKS[0],sha,state,state==='completed'?'success':null,1),
   run(REQUIRED_CHECKS[1],sha,state,state==='completed'?'success':null,2)
  ]})};
 };
 const result=await waitForExactHeadCi(sha,{
  fetcher:fn,maxChecks:3,periodMs:0,pause:async()=>{pauses++;}
 });
 assert.equal(result.safeToRunModel,true);
 assert.equal(reads,2);
 assert.equal(pauses,1);
});
