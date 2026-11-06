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
const LOCAL='http://127.0.0.1:11434/v1/chat/completions';
const fail=code=>{throw Error('V7_PRIVATE_ONCE_'+code);};
const hash=s=>createHash('sha256').update(s).digest('hex');
const freshResourceClearance=(resource,now=Date.now())=>
 resource?.status==='SAFE_FOR_ONE_REQUEST' &&
 Number.isSafeInteger(resource.measuredAtEpochMs) &&
 resource.measuredAtEpochMs<=now &&
 now-resource.measuredAtEpochMs<=45000;
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
 b143Recompiled:false,semanticFulfillment:'NOT_CERTIFIED',
 physicalAccess:'NOT_CERTIFIED',art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
 worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
 constructionApproved:false,executionAllowed:false,BuildPlan:{operations:[]},
 gates:Array(9).fill('BLOCKED')
});
export async function runV7PrivateOnce({
 model,outDir,headSha,prompt=V7_HELD_OUT_BRIEF,
 deriveIntegratedShell,checkResourceSafety
}={},{
 modelFetcher=fetch,ciFetcher=fetch,headReader=actualHead,timeoutMs=600000
}={}){
 if(!MODEL.test(model??'')||!SHA.test(headSha??'')||
  typeof prompt!=='string'||prompt.length<8||prompt.length>4000||
  !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>600000)
  fail('INVALID_OPTIONS');
 const dir=privateDir(outDir);
 const injected=modelFetcher!==fetch||ciFetcher!==fetch||headReader!==actualHead||
  process.env.MAB_V4D_TEST_DOUBLE_MODE==='1';
 fs.mkdirSync(dir,{recursive:false});
 const result=safeBase(headSha,injected);
 try{
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
  try{listing=await preflightR125Ollama({model,endpoint:LOCAL,fetcher:modelFetcher});}
  catch{result.status='HOLD_OLLAMA_PREFLIGHT';result.reason='LOCAL_MODEL_LIST_UNAVAILABLE';return result;}
  if(listing.status!=='LOCAL_MODEL_LISTED'){
   result.status='HOLD_MODEL_NOT_INSTALLED';result.reason='MODEL_NOT_LISTED';return result;
  }
  // Listing can delay the POST while other host processes change memory use.
  // Re-measure immediately before POST; public code cannot attest calibration.
  try{resource=await checkResourceSafety({model,headSha,oneRequest:true});}
  catch{result.status='HOLD_RESOURCE_UNKNOWN';result.reason='RESOURCE_PROBE_FAILED';return result;}
  if(!freshResourceClearance(resource)){
   result.status='HOLD_RESOURCE_UNKNOWN';result.reason='NO_FRESH_RESOURCE_CLEARANCE';return result;
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
  save(dir,'V7_LOCAL_REQUEST_PRIVATE.json',{model,prompt,
   systemPromptSha256:hash(INTEGRATED_SPATIAL_V7_SUPPORTED_PROMPT),
   headSha,contract:INTEGRATED_SPATIAL_V7_SUPPORTED_PROTOCOL,maxAttempts:1,
   resourceAssertion:'PRIVATE_MONITOR_ASSERTED_NOT_PUBLICLY_ATTESTED'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  let raw;
  try{
   result.modelGenerationAttempts=1; // Count attempt even for HTTP failure.
   const response=await modelFetcher(LOCAL,{
    method:'POST',redirect:'error',signal:controller.signal,
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.45,
     reasoning_effort:'none',max_tokens:3072,response_format:{type:'json_object'},
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
   if(!Array.isArray(parsedResponse?.choices)||parsedResponse.choices.length!==1){
    result.status='HOLD_MODEL_RESPONSE';result.reason='NOT_ONE_CHOICE';return result;
   }
   const choice=parsedResponse.choices[0];
   raw=choice?.message?.content;
   if(typeof raw==='string'&&raw.length>0&&raw.length<=250000){
    save(dir,'V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt',raw);
    result.responseRawSha256=hash(raw);result.rawCaptured=true;
   }
   if(choice?.finish_reason!=='stop'||typeof raw!=='string'||raw.length<30||
      raw.length>30000){
    result.status='HOLD_MODEL_RESPONSE';result.reason='MODEL_INCOMPLETE_OR_OVERSIZE';return result;
   }
  }catch{
   result.status='HOLD_MODEL_HTTP';result.reason='MODEL_FAILED_OR_TIMEOUT';return result;
  }finally{clearTimeout(timer);}
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
