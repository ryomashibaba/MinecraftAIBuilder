/**
 * V7 explicit PRIVATE one-shot model -> authored semantic IR -> existing host -> genuine B143.
 * No model calls until HEAD, BOTH CI, fresh PRIVATE resource check, host binding
 * and model-listing preflight succeed. This is NOT physical/ART/world approval.
 * Existing V6 stable path remains the default; no paid API or retries.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {checkExactHeadCi} from './r125-v4j-safe-ci-gate.mjs';
import {
 INTEGRATED_SPATIAL_V7_SUPPORTED_PROTOCOL,INTEGRATED_SPATIAL_V7_SUPPORTED_PROMPT,
 executeIntegratedSemanticBridge
} from '../source/ai/r125-integrated-semantic-bridge.mjs';
import {createIntegratedSpatialHost} from '../source/ai/r125-integrated-spatial-host.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const SHA=/^[a-f0-9]{40}$/;
const LOCAL='http://127.0.0.1:11434/api/chat';
const PREFLIGHT='http://127.0.0.1:11434/v1/chat/completions';
const PS_URL='http://127.0.0.1:11434/api/ps';
const TAGS_URL='http://127.0.0.1:11434/api/tags';
const EXPECTED_DIGEST='bdbd181c33f2ed1b31c972991882db3cf4d192569092138a7d29e973cd9debe8';
const EXPECTED_SIZE=9276198565;
const fail=code=>{throw Error('V7_PRIVATE_ONCE_'+code);};
const hash=s=>createHash('sha256').update(s).digest('hex');
const freshResourceClearance=(resource,now=Date.now())=>
 resource?.status==='SAFE_FOR_ONE_REQUEST' &&
 Number.isSafeInteger(resource.measuredAtEpochMs) &&
 resource.measuredAtEpochMs<=now &&
 now-resource.measuredAtEpochMs<=45000;
// A safe preflight flag alone is never proof of a live separate monitor.
const independentMonitorReady=(x,now=Date.now())=>
 x?.independentMonitorActive===true &&
 typeof x.monitorId==='string' && /^[a-z0-9-]{8,80}$/i.test(x.monitorId) &&
 Number.isSafeInteger(x.monitorHeartbeatEpochMs) &&
 x.monitorHeartbeatEpochMs<=now && now-x.monitorHeartbeatEpochMs<=3000;
/** Live samples must advance the same monitor, not replay a static flag.
 * This checks the exposed contract; PRIVATE process independence remains unverified.
 */
export function monitorSampleAdvanced(before,after,now=Date.now()){
 return before?.independentMonitorActive===true &&
  typeof before.monitorId==='string' &&
  Number.isSafeInteger(before.measuredAtEpochMs) &&
  Number.isSafeInteger(after?.measuredAtEpochMs) &&
  after.measuredAtEpochMs>before.measuredAtEpochMs &&
  after.measuredAtEpochMs<=now &&
  Number.isSafeInteger(before.monitorHeartbeatEpochMs) &&
  independentMonitorReady(after,now) &&
  after.monitorId===before.monitorId &&
  after.monitorHeartbeatEpochMs>before.monitorHeartbeatEpochMs;
}
const save=(dir,name,content)=>fs.writeFileSync(path.join(dir,name),
 typeof content==='string'?content:JSON.stringify(content,null,2)+'\n',{flag:'wx'});
/** Exact-head CI covers the committed bytes only; a dirty checkout is not attested. */
export function verifyCleanHead({gitExec=execFileSync,gitCommand='git.exe',repoRoot=ROOT}={}){
 const opts={encoding:'utf8',timeout:10000,windowsHide:true};
 const dirty=gitExec(gitCommand,['-C',repoRoot,'status','--porcelain=v1',
  '--untracked-files=normal','--ignore-submodules=none'],opts);
 if(typeof dirty!=='string'||dirty.length!==0)fail('WORKTREE_DIRTY_OR_UNVERIFIED');
 const sha=gitExec(gitCommand,['-C',repoRoot,'rev-parse','HEAD'],opts);
 if(typeof sha!=='string'||!SHA.test(sha.trim()))fail('HEAD_UNVERIFIED');
 return sha.trim();
}
const actualHead=()=>verifyCleanHead();
export const V7_HELD_OUT_BRIEF=
 '小さな水辺の気象観測と来訪者の休憩を両立する公共建築を設計してください。観測作業と来訪者の動線を両立し、入口前に意味のある半屋外空間を設けてください。';
function privateDir(p){
 if(typeof p!=='string'||!p.trim())fail('PRIVATE_OUTPUT_REQUIRED');
 const dir=path.resolve(p),parent=path.dirname(dir);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
  fs.existsSync(dir))fail('NEW_PRIVATE_FOLDER_ONLY');
 const real=fs.realpathSync(parent);
 if(dir===ROOT||dir.startsWith(ROOT+path.sep)||
    real===ROOT||real.startsWith(ROOT+path.sep))fail('OUTPUT_INSIDE_REPO');
 return dir;
}
const safeBase=(headSha,injected)=>({
 schema:'minecraftaibuilder-r125-v7-private-one-safe-v1',
 protocol:INTEGRATED_SPATIAL_V7_SUPPORTED_PROTOCOL,
 headSha, status:'HOLD_NOT_STARTED',reason:'NOT_STARTED',
 declaredModelSource:'LOCAL_OLLAMA_UNATTESTED',
 explicitlyInjectedTestResponse:injected,
 modelGenerationAttempts:0,rawCaptured:false,responseRawSha256:null,
 authorSha256:null,operationSha256:null,sourceSha256:null,
 geometrySha256:null,b143CellCount:null,
 b143Recompiled:false,unloadConfirmed:false,activeMonitorSamples:0,
 semanticFulfillment:'NOT_CERTIFIED',
 physicalAccess:'NOT_CERTIFIED',art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
 worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
 constructionApproved:false,executionAllowed:false,BuildPlan:{operations:[]},
 gates:Array(9).fill('BLOCKED')
});
export async function runV7PrivateOnce({
 model,outDir,headSha,prompt=V7_HELD_OUT_BRIEF,
 deriveIntegratedShell,checkResourceSafety
}={},{
 modelFetcher=fetch,ciFetcher=fetch,headReader=actualHead,timeoutMs=120000
}={}){
 if(!MODEL.test(model??'')||!SHA.test(headSha??'')||
  typeof prompt!=='string'||prompt.length<8||prompt.length>4000||
  !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>120000)
  fail('INVALID_OPTIONS');
 const dir=privateDir(outDir);
 const injected=modelFetcher!==fetch||ciFetcher!==fetch||headReader!==actualHead||
  process.env.MAB_V4D_TEST_DOUBLE_MODE==='1';
 fs.mkdirSync(dir,{recursive:false});
 const result=safeBase(headSha,injected);
 try{
  // Never allow a real fetch POST when any CI, HEAD or mode dependency is
  // test-injected. In that combination the normal production gates are not attested.
  if(injected && modelFetcher===fetch){
   result.status='HOLD_REAL_TRANSPORT_WITH_INJECTION';
   result.reason='REAL_MODEL_REQUIRES_UNINJECTED_GATES';return result;
  }
  // Both gates apply to the immutable code ACTUALLY running in this clone.
  try{if(headReader()!==headSha){
    result.status='HOLD_HEAD_MISMATCH';result.reason='HEAD_MISMATCH';return result;
  }}catch{result.status='HOLD_HEAD_UNVERIFIED';result.reason='HEAD_UNVERIFIED';return result;}
  let ci;
  try{ci=await checkExactHeadCi(headSha,{fetcher:ciFetcher});}
  catch{result.status='HOLD_CI_UNKNOWN';result.reason='CI_UNVERIFIED';return result;}
  if(!ci.safeToRunModel){
   result.status='HOLD_REQUIRED_CI';result.reason='BOTH_EXACT_HEAD_CI_NOT_SUCCESS';return result;
  }
  if(typeof deriveIntegratedShell!=='function'||
   typeof checkResourceSafety!=='function'){
   result.status='HOLD_PRIVATE_HOST_OR_RESOURCE_PROBE';result.reason='PRIVATE_BINDING_REQUIRED';return result;
  }
  let resource;
  try{resource=await checkResourceSafety({model,headSha,oneRequest:true});}
  catch{result.status='HOLD_RESOURCE_UNKNOWN';result.reason='RESOURCE_PROBE_FAILED';return result;}
  if(!freshResourceClearance(resource)){
   result.status='HOLD_RESOURCE_UNKNOWN';result.reason='NO_FRESH_RESOURCE_CLEARANCE';return result;
  }
  // Resource assertion is supplied by the PRIVATE Windows monitor, not
  // independent proof of RAM safety by this public, host-agnostic code.
  const host=createIntegratedSpatialHost({deriveIntegratedShell});
  let listing;
  try{listing=await preflightR125Ollama({model,endpoint:PREFLIGHT,fetcher:modelFetcher});}
  catch{result.status='HOLD_OLLAMA_PREFLIGHT';result.reason='LOCAL_MODEL_LIST_UNAVAILABLE';return result;}
  if(listing.status!=='LOCAL_MODEL_LISTED'){
   result.status='HOLD_MODEL_NOT_INSTALLED';result.reason='MODEL_NOT_LISTED';return result;
  }
  // Verify the exact offline model and an empty loaded-model list via GET only.
  if(!injected){
   try{
    if(model!=='qwen3:14b')throw Error('MODEL_NOT_APPROVED');
    const tagsResponse=await modelFetcher(TAGS_URL,{method:'GET',
     redirect:'error',signal:AbortSignal.timeout(5000)});
    if(tagsResponse?.ok!==true)throw Error('TAGS_FAILED');
    const tags=JSON.parse(await tagsResponse.text());
    const entries=tags?.models?.filter(x=>x?.name===model);
    if(!Array.isArray(entries)||entries.length!==1 ||
      entries[0]?.digest!==EXPECTED_DIGEST||entries[0]?.size!==EXPECTED_SIZE||
      entries[0]?.details?.quantization_level!=='Q4_K_M')
     throw Error('MODEL_IDENTITY_MISMATCH');
    const psResponse=await modelFetcher(PS_URL,{method:'GET',
     redirect:'error',signal:AbortSignal.timeout(5000)});
    if(psResponse?.ok!==true)throw Error('PS_FAILED');
    const ps=JSON.parse(await psResponse.text());
    if(!Array.isArray(ps?.models)||ps.models.length!==0)
     throw Error('OTHER_MODEL_LOADED');
   }catch{
    result.status='HOLD_MODEL_IDENTITY';
    result.reason='MODEL_IDENTITY_OR_IDLE_STATE_UNVERIFIED';return result;
   }
  }
  // Listing can delay the POST while other host processes change memory use.
  // Re-measure immediately before POST; public code cannot attest calibration.
  try{resource=await checkResourceSafety({model,headSha,oneRequest:true});}
  catch{result.status='HOLD_RESOURCE_UNKNOWN';result.reason='RESOURCE_PROBE_FAILED';return result;}
  if(!freshResourceClearance(resource)){
   result.status='HOLD_RESOURCE_UNKNOWN';result.reason='NO_FRESH_RESOURCE_CLEARANCE';return result;
  }
  if(!injected&&!independentMonitorReady(resource)){
   result.status='HOLD_INDEPENDENT_MONITOR';
   result.reason='ACTIVE_SEPARATE_MONITOR_NOT_ATTESTED';return result;
  }
  // CI and resource preflight may have taken time. Never POST from a now-dirty
  // or changed checkout, even when the old commit's CI was successful.
  try{if(headReader()!==headSha){
   result.status='HOLD_HEAD_MISMATCH';result.reason='HEAD_CHANGED_BEFORE_MODEL';return result;
  }}catch{
   result.status='HOLD_HEAD_UNVERIFIED';result.reason='WORKTREE_UNVERIFIED_BEFORE_MODEL';return result;
  }
  if(!freshResourceClearance(resource)){
   result.status='HOLD_RESOURCE_UNKNOWN';result.reason='RESOURCE_CLEARANCE_EXPIRED';return result;
  }
  if(!injected&&!independentMonitorReady(resource)){
   result.status='HOLD_INDEPENDENT_MONITOR';
   result.reason='MONITOR_LEASE_EXPIRED_BEFORE_POST';return result;
  }
  save(dir,'V7_LOCAL_REQUEST_PRIVATE.json',{model,prompt,
   systemPromptSha256:hash(INTEGRATED_SPATIAL_V7_SUPPORTED_PROMPT),
   headSha,contract:INTEGRATED_SPATIAL_V7_SUPPORTED_PROTOCOL,maxAttempts:1,
   resourceAssertion:'PRIVATE_MONITOR_ASSERTED_NOT_PUBLICLY_ATTESTED'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  let monitorActive=true,monitorPending=false,monitorFault=false,lastBeat=Date.now();
  let monitorPrevious=resource;
  const fault=()=>{if(monitorActive){monitorFault=true;controller.abort();}};
  const pulse=setInterval(()=>{
   if(!monitorActive)return;
   if(Date.now()-lastBeat>5000){fault();return;}
   if(monitorPending)return;
   monitorPending=true;
   Promise.resolve().then(()=>checkResourceSafety({
    model,headSha,oneRequest:true,phase:'DURING_INFERENCE'
   })).then(sample=>{
    if(!monitorActive)return;
    if(!freshResourceClearance(sample)||
       (!injected&&!monitorSampleAdvanced(monitorPrevious,sample)))fault();
    else{
     monitorPrevious=sample;
     lastBeat=Date.now();result.activeMonitorSamples++;
    }
   }).catch(fault).finally(()=>{monitorPending=false;});
  },1000);
  let raw;
  try{
   result.modelGenerationAttempts=1; // Count attempt even for HTTP failure.
   const response=await modelFetcher(LOCAL,{
    method:'POST',redirect:'error',signal:controller.signal,
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({model,stream:false,think:false,keep_alive:0,
     format:'json',options:{num_ctx:2048,num_predict:1024,temperature:0.45},
     messages:[{role:'system',content:INTEGRATED_SPATIAL_V7_SUPPORTED_PROMPT},
      {role:'user',content:prompt}]})
   });
   if(response?.ok!==true){result.status='HOLD_MODEL_HTTP';result.reason='LOCAL_MODEL_HTTP_FAILURE';return result;}
   const body=await response.text();
   if(typeof body!=='string'||body.length>250000){
    result.status='HOLD_MODEL_RESPONSE';result.reason='RESPONSE_OVERSIZE';return result;
   }
   let parsedResponse;
   try{parsedResponse=JSON.parse(body);}catch{
    result.status='HOLD_MODEL_RESPONSE';result.reason='HTTP_JSON_INVALID';return result;
   }
   if(parsedResponse?.model!==undefined&&parsedResponse.model!==model){
    result.status='HOLD_MODEL_RESPONSE';result.reason='MODEL_NAME_MISMATCH';return result;
   }
   // Existing injected tests use the older mock shape; real Ollama
   // must satisfy the native /api/chat completion contract.
   const choice=injected?parsedResponse?.choices?.[0]:null;
   if(injected&&(!Array.isArray(parsedResponse?.choices)||
      parsedResponse.choices.length!==1)){
    result.status='HOLD_MODEL_RESPONSE';result.reason='NOT_ONE_CHOICE';return result;
   }
   raw=injected?choice?.message?.content:parsedResponse?.message?.content;
   if(typeof raw==='string'&&raw.length>0&&raw.length<=250000){
    save(dir,'V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt',raw);
    result.responseRawSha256=hash(raw);result.rawCaptured=true;
   }
   if(monitorFault||
      (injected&&choice?.finish_reason!=='stop')||
      (!injected&&(parsedResponse?.done!==true||parsedResponse?.done_reason!=='stop'))||
      typeof raw!=='string'||raw.length<30||raw.length>30000){
    result.status='HOLD_MODEL_RESPONSE';result.reason='MODEL_INCOMPLETE_OR_OVERSIZE';return result;
   }
  }catch{
   result.status=monitorFault?'HOLD_MONITOR_INTERRUPTED':'HOLD_MODEL_HTTP';
   result.reason=monitorFault?'MONITOR_ABORTED_GENERATION':'MODEL_FAILED_OR_TIMEOUT';
   return result;
  }finally{
   clearTimeout(timer);clearInterval(pulse);monitorActive=false;
   // GET-only verification, never a second cleanup POST or model retry.
   if(!injected&&result.modelGenerationAttempts>0){
    try{
     const psResponse=await modelFetcher(PS_URL,{method:'GET',
      redirect:'error',signal:AbortSignal.timeout(5000)});
     if(psResponse?.ok!==true)throw Error('PS_FAILED');
     const ps=JSON.parse(await psResponse.text());
     if(!Array.isArray(ps?.models)||ps.models.length!==0)
      throw Error('MODEL_STILL_LOADED');
     result.unloadConfirmed=true;
    }catch{
     result.status='HOLD_UNLOAD_UNKNOWN';
     result.reason='UNLOAD_NOT_CONFIRMED';
    }
   }
  }
  if(monitorFault){
   result.status='HOLD_MONITOR_INTERRUPTED';
   result.reason='MONITOR_ABORT_OR_STALE';return result;
  }
  // A very quick response has zero active samples; only preflight was tested.
  if(!injected&&result.activeMonitorSamples<1){
   result.status='HOLD_NO_LIVE_MONITOR_SAMPLES';
   result.reason='NO_DURING_INFERENCE_SAMPLE';return result;
  }
  if(!injected&&!result.unloadConfirmed)return result;
  let author;
  try{author=JSON.parse(raw);}catch{
   result.status='HOLD_AUTHOR';result.reason='AUTHOR_NOT_PURE_JSON';return result;
  }
  let candidate;
  try{candidate=await executeIntegratedSemanticBridge(author,host);}
  catch{result.status='HOLD_AUTHOR';result.reason='AUTHOR_SCHEMA_REJECTED';return result;}
  result.authorSha256=candidate.authorSha256??null;
  result.operationSha256=candidate.operationSha256??null;
  if(candidate.status!=='GENUINE_B143_CANDIDATE'){
   result.status='HOLD_HOST';result.reason='PRIVATE_HOST_OR_AUTHOR_REJECTED';return result;
  }
  // Only genuine B143 compiled by supplied existing engine can reach here.
  result.sourceSha256=candidate.sourceSha256;
  result.geometrySha256=candidate.geometrySha256;
  result.b143CellCount=candidate.privateProduct.compiled.primitives.length;
  result.b143Recompiled=true;
  save(dir,'V7_TRUE_B143_SOURCE_PRIVATE.json',candidate.privateProduct.design);
  save(dir,'V7_TRUE_B143_HASHES_PRIVATE.json',{
   sourceSha256:result.sourceSha256,geometrySha256:result.geometrySha256,
   b143CellCount:result.b143CellCount,authorSha256:result.authorSha256,
   operationSha256:result.operationSha256,
   hostProvenance:'PRIVATE_EXPLICIT_HOST_DERIVED_NOT_HISTORICAL_SOURCE',
   modelIdentityCryptographicallyAuthenticated:false,
   independentPhysicalAudit:'NOT_TESTED',art:'NOT_REVIEWED'});
  result.status=injected?'HOLD_INJECTED_TEST_NOT_MODEL':
   'HOLD_PRIVATE_PHYSICAL_AND_ART_REVIEW';
  result.reason='B143_RECOMPILED_ONLY_NOT_INDEPENDENT_APPROVAL';
  return result;
 }finally{
  // Narrow allowlist: no model answer, PRIVATE paths, prompt, host exception or
  // PRIVATE product can reach the clipboard or repository.
  save(dir,'V7_SEMANTIC_SHAREABLE.json',result);
 }
}
