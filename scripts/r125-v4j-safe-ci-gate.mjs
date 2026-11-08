/**
 * Safe read-only CI gate for one-time installed V4J launcher.
 * It requires verified SUCCESS for BOTH exact-head GitHub workflow runs
 * BEFORE ANY local model call. No GitHub token, user files, Ollama or world.
 */
import {fileURLToPath} from 'node:url';
const SHA=/^[a-f0-9]{40}$/;
export const REQUIRED_CHECKS=[
 'R125 V4D Local Author Bridge — INJECTED TEST ONLY',
 'Education-first offline QA'
];
// The Actions API's head_sha on a pull_request run identifies its source
// branch, but checkout@v4 tests refs/pull/N/merge by default, NOT that HEAD.
// Only direct-HEAD event types at the expected workflow file are eligible.
const REQUIRED_WORKFLOW_PATHS=new Map([
 [REQUIRED_CHECKS[0],'.github/workflows/r125-v4d-local-author-bridge.yml'],
 [REQUIRED_CHECKS[1],'.github/workflows/qa.yml']
]);
const DIRECT_HEAD_EVENTS=new Set(['push','workflow_dispatch']);
export function assessCiRuns(runs,sha){
 if(!SHA.test(sha)||!Array.isArray(runs))throw Error('CI_INPUT_INVALID');
 const latest=new Map();
 for(const r of runs){
  if(!r||r.head_sha!==sha||!REQUIRED_CHECKS.includes(r.name)||
   !Number.isSafeInteger(r.id)||!DIRECT_HEAD_EVENTS.has(r.event)||
   r.path!==REQUIRED_WORKFLOW_PATHS.get(r.name))continue;
  if(!latest.has(r.name)||latest.get(r.name).id<r.id)latest.set(r.name,r);
 }
 const detail=REQUIRED_CHECKS.map(name=>{
  const r=latest.get(name);
  return {name,status:r?.status??'NOT_FOUND',
   conclusion:r?.conclusion??null,runId:r?.id??null};
 });
 return {
  safeToRunModel:detail.every(x=>x.status==='completed'&&x.conclusion==='success'),
  permanentlyBlocked:detail.some(x=>x.status==='completed'&&x.conclusion!=='success'),
  checks:detail
 };
}
export async function checkExactHeadCi(sha,{fetcher=fetch}={}){
 if(!SHA.test(sha))throw Error('CI_SHA_REQUIRED');
 const baseUrl='https://api.github.com/repos/ryomashibaba/MinecraftAIBuilder/actions/runs'+
  '?head_sha='+sha+'&per_page=100';
 const all=[];
 // A busy exact HEAD can have over 100 workflows. Never treat an incomplete
 // first page as proof that a required job is absent (or that both passed).
 // Fail closed if more than five pages are needed or the API is inconsistent.
 for(let page=1;page<=5;page++){
  const url=baseUrl+(page===1?'':'&page='+page);
  const reply=await fetcher(url,{headers:{
   'Accept':'application/vnd.github+json','User-Agent':'MinecraftAIBuilder-Local-CIGuard'
  }});
  if(!reply||reply.ok!==true)throw Error('CI_NETWORK_OR_RATE_LIMIT_HOLD');
  const data=await reply.json();
  if(!Array.isArray(data?.workflow_runs)||data.workflow_runs.length>100)
   throw Error('CI_RESPONSE_UNVERIFIED');
  const total=data.total_count;
  if(total!==undefined&&(!Number.isSafeInteger(total)||total<0))
   throw Error('CI_RESPONSE_UNVERIFIED');
  if(total>500)throw Error('CI_PAGINATION_LIMIT_HOLD');
  all.push(...data.workflow_runs);
  if(total!==undefined){
   if(all.length>total)throw Error('CI_RESPONSE_UNVERIFIED');
   if(all.length===total)return assessCiRuns(all,sha);
   if(data.workflow_runs.length<100)throw Error('CI_INCOMPLETE_RESPONSE_HOLD');
  }else if(data.workflow_runs.length<100)return assessCiRuns(all,sha);
 }
 throw Error('CI_PAGINATION_LIMIT_HOLD');
}
export async function waitForExactHeadCi(sha,{fetcher=fetch,maxChecks=60,
 pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),periodMs=15000}={}){
 if(!Number.isSafeInteger(maxChecks)||maxChecks<1||maxChecks>80||
  !Number.isSafeInteger(periodMs)||periodMs<0||periodMs>60000)
  throw Error('CI_POLL_BOUNDS');
 for(let i=0;i<maxChecks;i++){
  const state=await checkExactHeadCi(sha,{fetcher});
  if(state.safeToRunModel||state.permanentlyBlocked)return state;
  if(i+1<maxChecks)await pause(periodMs);
 }
 return {safeToRunModel:false,permanentlyBlocked:false,
  checks:[],reason:'CI_NOT_FINISHED_WITHIN_LOCAL_SESSION'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const sha=process.argv[2];
 try{
  const result=await waitForExactHeadCi(sha);
  console.log(JSON.stringify({ciStatus:result.safeToRunModel?'BOTH_SUCCESS':
   'HOLD_NO_MODEL_CALL',checks:result.checks,reason:result.reason??null}));
  if(!result.safeToRunModel)process.exitCode=2;
 }catch{
  console.error('CI_UNAVAILABLE_HOLD_NO_MODEL_CALL');
  process.exitCode=2;
 }
}
