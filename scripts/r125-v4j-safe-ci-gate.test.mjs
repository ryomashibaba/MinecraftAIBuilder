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

test('more than 100 exact-head runs are fully paginated before allowing model use',async()=>{
 const unrelated=Array.from({length:100},(_,i)=>
  run('independent-workflow-'+i,sha,'completed','success',i+1));
 unrelated[3]=run(REQUIRED_CHECKS[0],sha,'completed','success',150);
 const visited=[];
 const result=await checkExactHeadCi(sha,{fetcher:async url=>{
  visited.push(url);
  return {ok:true,json:async()=>({
   total_count:101,workflow_runs:visited.length===1?unrelated:
    [run(REQUIRED_CHECKS[1],sha,'completed','success',151)]
  })};
 }});
 assert.equal(visited.length,2);
 assert(visited[1].endsWith('&page=2'));
 assert.equal(result.safeToRunModel,true);
 assert.equal(result.checks.length,2);
 assert.equal(result.checks[1].runId,151);
});
test('incomplete or excessive paginated workflow evidence holds without a model call',async()=>{
 const unrelated=Array.from({length:100},(_,i)=>
  run('unrelated-'+i,sha,'completed','success',i+1));
 let reads=0;
 await assert.rejects(checkExactHeadCi(sha,{fetcher:async()=>{
  reads++;
  return {ok:true,json:async()=>({total_count:101,
   workflow_runs:reads===1?unrelated:[]})};
 }}),/CI_INCOMPLETE_RESPONSE_HOLD/);
 assert.equal(reads,2);
 await assert.rejects(checkExactHeadCi(sha,{fetcher:async()=>({
  ok:true,json:async()=>({total_count:501,workflow_runs:unrelated})
 })}),/CI_PAGINATION_LIMIT_HOLD/);
});
