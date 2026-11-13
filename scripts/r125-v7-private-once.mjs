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
import {classifyOllamaStopEvidence} from '../source/ai/r125-v7-ollama-stop-evidence.mjs';
import {MEZZANINE_SCHEMA,compileMezzanineAuthorIntent}
 from '../source/ai/r125-v4h-mezzanine-author-ir.mjs';
import {CIVIC_ARCADE_SCHEMA,compileCivicArcadeAuthorIntent}
 from '../source/ai/r125-v4j-civic-author-ir.mjs';
import {V4J_PARENT_INDEX_PROTOCOL,V4J_PARENT_INDEX_SYSTEM_PROMPT,
 V4J_PARENT_INDEX_CIVIC_SCHEMA,materializeV4JParentIndexAuthor}
 from '../source/ai/r125-v4j-feasible-envelope.mjs';
import {classifyPrivateCompilerRejection} from './r125-v4d-compiler-reject-codes.mjs';

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
const V4H_PROTOCOL='V7_PRIVATE_MONITORED_V4H_MEZZANINE_V1';
// Bounded V7-only system instruction. Original, more verbose V4H prompt and
// author compiler stay frozen; the same strict SOURCE grammar is enforced
// independently after capture. This is a capacity mitigation, NOT proof
// that qwen3:14b fits within the existing 2048-token runtime window.
export const V7_V4H_COMPACT_SYSTEM_PROMPT=[
 "You are the ORIGINAL architect. Output exactly ONE JSON object: the whole useful 2-level public building, not a shape template. No prose, markdown, hidden repair or second attempt. Choose distinctive massing, inhabited spaces, a public entrance and usable upper service.",
 "schema minecraftaibuilder-r125-v4h-mezzanine-author-v1; EXACT root keys: schema,id,title,brief,materials,spaces,massing,wing,floorplate,atrium,mezzanine. Do not add fields.",
 "materials EXACT floor,wall,roof,public. floor wood|stone|concrete; wall/roof wood|stone|concrete|metal; public stone|concrete|accent.",
 "spaces: array 3..5; first covered NORTH-entry reception with attach:null; at least 2 covered and 1 sky. Each EXACT id,purpose,kind,width,depth,roof,height,facade,windowPriority,feature,featureMaterial,attach. width/depth integer 18..30. covered: kind covered, roof ridgeX|ridgeZ|shedX|shedZ, height low|medium|high, facade wall|glass, windowPriority ordered permutation of north,east,south,west. sky: kind sky, roof/height/facade/windowPriority null. featureMaterial wood|stone|metal|concrete|accent. Nonfirst attach EXACT to,side,shift; to earlier room id; side north|south|east|west, shift -3..3. Every purpose and feature must be useful.",
 "massing EXACT spaceId,corner,cutWidth,cutDepth,publicAccessSide. Covered room, corner NW|NE|SW|SE, cutWidth/depth 7..10 integers, publicAccessSide X|Z; chosen room width>=2*cutWidth+6, depth>=2*cutDepth+6. Both outer corner sides unshared. A real sky-open corner with supported floor and 2-wide 3-high portal; no entry/window/fixture collision.",
 "wing EXACT spaceId,side,start,span,reach,roofY,purpose and OPTIONAL outline. Choose unshared external covered-room side except first reception NORTH entry; side north|south|east|west, start 3..12, span 10..18, reach 6..9, roofY 8|9 below room eave. For nonrectangular outline provide 3 band depths each 6..reach; max=reach, min<=max-2. Supported public ground, real roof and columns, clear 2-wide opening, meaningful use.",
 "floorplate EXACT spaceId,corner,width,depth: covered room, corner NW|NE|SW|SE, dimensions 6..8. Removes FLOOR+external WALL+ROOF in its unshared corner; new inner enclosure. No overlap with massing, wing, glazing, entrance or furniture.",
 "atrium EXACT spaceId,offsetX,offsetZ,width,depth,lift,roofForm. Covered public hall; offsets 3..7, width/depth 10..16; leave >=3 room cells on far side, no floorplate/void overlap. lift 7..11 ABOVE original roof peak. roofForm ridgeX|ridgeZ|shedX|shedZ. Real removed old roof, elevated enclosed ring, clerestory with clear glass/air, actual roof and retained public floor/equipment.",
 "mezzanine EXACT side,stairLane,deckOffsetX,deckWidth,rise,purpose. In that inhabited atrium: side north|south; stairLane west|east; deckOffsetX 1..3, deckWidth 8..10, rise 6..8; supported 3-deep public upper floor, real 2-wide stairs with headroom/landing, reachable upper service desk. Purpose 12..140 characters, unique usable function.",
 "All parts must fit TOGETHER and preserve original 2-wide entrance-to-every-function paths, glazed windows with inner/outer air, equipment, structural source supports and walkable public void. HOST validates actual B143 exactly, never silently repairs/resizes/moves anything. Invalid original => HOLD. Never claim ART PASS, Minecraft walking, model identity, weather/structural approval or world-write permission; all nine construction gates remain BLOCKED."
].join('\n');

export const V4H_BRIEF='Design a useful two-level public building with a coherent welcoming hall, accessible upper gallery, functional stairs and distinctive whole-building massing. Independently choose its architecture and spatial program.';
export function v7RequestOptions(mode,{v6ThinkingStudy=false}={}){
 if(!['integrated-semantic','v4h-mezzanine','civic-v6'].includes(mode))
  fail('AUTHOR_MODE_UNSUPPORTED');
 if(typeof v6ThinkingStudy!=='boolean'||(v6ThinkingStudy&&mode!=='civic-v6'))
  fail('THINKING_STUDY_V6_ONLY');
 return {num_ctx:mode==='civic-v6'?12288:2048,
  num_predict:mode==='civic-v6'?(v6ThinkingStudy?7168:4096):1024,temperature:0.45};
}
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
export const ownedV6ServiceReady=(x,previous=x)=>
 x?.ownedServicePort===11435&&Number.isSafeInteger(x.ownedServicePid)&&
 x.ownedServicePid>0&&x.ownedServicePid===previous?.ownedServicePid&&
 x.ownedServiceInKillOnCloseJob===true&&x.sharedServiceIdle===true;
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
/** Fail closed when the second pre-POST resource report is a cached snapshot. */
export function prePostMonitorReady(before,after,now=Date.now()){
 return freshResourceClearance(before,now) &&
  freshResourceClearance(after,now) &&
  monitorSampleAdvanced(before,after,now);
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
const safeBase=(headSha,injected,mode)=>({
 schema:'minecraftaibuilder-r125-v7-private-one-safe-v1',
 protocol:mode==='civic-v6'?V4J_PARENT_INDEX_PROTOCOL:
  mode==='v4h-mezzanine'?V4H_PROTOCOL:INTEGRATED_SPATIAL_V7_SUPPORTED_PROTOCOL,
 headSha, status:'HOLD_NOT_STARTED',reason:'NOT_STARTED',
 declaredModelSource:'LOCAL_OLLAMA_UNATTESTED',
 explicitlyInjectedTestResponse:injected,
 modelGenerationAttempts:0,rawCaptured:false,responseRawSha256:null,
 authorSha256:null,operationSha256:null,sourceSha256:null,
 geometrySha256:null,b143CellCount:null,
 b143Recompiled:false,clientAbortSignaled:false,ollamaCompletionObserved:false,
 ollamaModelAbsentAtProbe:false,serverStopEvidence:'UNKNOWN',
 unloadConfirmed:false,activeMonitorSamples:0,
 ownedStopRequestDispatched:false,ownedStopRequestAcceptedByCallback:false,
 semanticFulfillment:'NOT_CERTIFIED',
 physicalAccess:'NOT_CERTIFIED',art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
 worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
 constructionApproved:false,executionAllowed:false,BuildPlan:{operations:[]},
 gates:Array(9).fill('BLOCKED')
});
export async function runV7PrivateOnce({
 model,outDir,headSha,prompt,authorMode='integrated-semantic',
 ownedServiceOrigin,v6ThinkingStudy=false,v6ThinkingBudget,
 deriveIntegratedShell,checkResourceSafety,stopOwnedService
}={},{
 modelFetcher=fetch,ciFetcher=fetch,headReader=actualHead,timeoutMs=120000
}={}){
 if(!['integrated-semantic','v4h-mezzanine','civic-v6'].includes(authorMode))
  fail('AUTHOR_MODE_UNSUPPORTED');
 // Existing modes keep their original endpoint and runtime limits. New V6
 // research requires a separate service; it cannot run on the shared daemon.
 const civic=authorMode==='civic-v6';
 const requestOptions=v7RequestOptions(authorMode,{v6ThinkingStudy});
 if(civic?ownedServiceOrigin!=='http://127.0.0.1:11435':ownedServiceOrigin!==undefined)
  fail('OWNED_V6_SERVICE_ORIGIN_REQUIRED');
 const local=civic?ownedServiceOrigin+'/api/chat':LOCAL;
 const preflight=civic?ownedServiceOrigin+'/v1/chat/completions':PREFLIGHT;
 const tagsUrl=civic?ownedServiceOrigin+'/api/tags':TAGS_URL;
 const psUrl=civic?ownedServiceOrigin+'/api/ps':PS_URL;
 const chosenPrompt=prompt===undefined?
  (authorMode==='v4h-mezzanine'?V4H_BRIEF:V7_HELD_OUT_BRIEF):prompt;
 const systemPrompt=civic?V4J_PARENT_INDEX_SYSTEM_PROMPT:authorMode==='v4h-mezzanine'?
  V7_V4H_COMPACT_SYSTEM_PROMPT:INTEGRATED_SPATIAL_V7_SUPPORTED_PROMPT;
 if(!MODEL.test(model??'')||!SHA.test(headSha??'')||
  typeof chosenPrompt!=='string'||chosenPrompt.length<8||chosenPrompt.length>4000||
  !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>(civic?600000:120000))
  fail('INVALID_OPTIONS');
 if(v6ThinkingStudy&&(
  v6ThinkingBudget?.publicTokenizerShaVerified!==true||
  !Number.isSafeInteger(v6ThinkingBudget.framedInputTokens)||
  v6ThinkingBudget.framedInputTokens<=0||
  v6ThinkingBudget.context!==requestOptions.num_ctx||
  v6ThinkingBudget.reservedOutputTokens!==requestOptions.num_predict||
  !Number.isSafeInteger(v6ThinkingBudget.additionalFramingMargin)||
  v6ThinkingBudget.additionalFramingMargin<256||
  v6ThinkingBudget.framedInputTokens+v6ThinkingBudget.reservedOutputTokens+
   v6ThinkingBudget.additionalFramingMargin>v6ThinkingBudget.context||
  v6ThinkingBudget.systemPromptSha256!==hash(systemPrompt)||
  v6ThinkingBudget.briefSha256!==hash(chosenPrompt)))
  fail('THINKING_INPUT_BUDGET_UNVERIFIED');
 const dir=privateDir(outDir);
 const injected=modelFetcher!==fetch||ciFetcher!==fetch||headReader!==actualHead||
  process.env.MAB_V4D_TEST_DOUBLE_MODE==='1';
 fs.mkdirSync(dir,{recursive:false});
 const result=safeBase(headSha,injected,authorMode);
 if(v6ThinkingStudy){
  result.v6ThinkingStudy=true;
  result.requestedOutputTokenLimit=requestOptions.num_predict;
  result.thinkingObserved=false;
  result.thinkingCharacterCount=0;
  result.thinkingTokenBudgetVerified=false;
 }
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
  // Production V6 must bind a PRIVATE owner-stop request before any Ollama GET/POST.
  // This callable is not itself OS ownership proof: the independent supervisor
  // must still own and watchdog the actual dedicated process Job.
  if(civic&&!injected&&typeof stopOwnedService!=='function'){
   result.status='HOLD_OWNED_SERVICE';
   result.reason='DEDICATED_OWNER_STOP_HANDLER_NOT_BOUND';return result;
  }
  if((!civic&&typeof deriveIntegratedShell!=='function')||
   typeof checkResourceSafety!=='function'){
   result.status='HOLD_PRIVATE_HOST_OR_RESOURCE_PROBE';result.reason='PRIVATE_BINDING_REQUIRED';return result;
  }
  let resource;
  try{resource=await checkResourceSafety({model,headSha,oneRequest:true});}
  catch{result.status='HOLD_RESOURCE_UNKNOWN';result.reason='RESOURCE_PROBE_FAILED';return result;}
  if(!freshResourceClearance(resource)){
   result.status='HOLD_RESOURCE_UNKNOWN';result.reason='NO_FRESH_RESOURCE_CLEARANCE';return result;
  }
  if(civic&&!injected&&!ownedV6ServiceReady(resource)){
   result.status='HOLD_OWNED_SERVICE';
   result.reason='DEDICATED_PROCESS_TREE_OR_NONCOMPETITION_UNVERIFIED';return result;
  }
  // Preserve the first resource sample. A second, cached SAFE report must
  // never authorize a real POST, even with a recently updated heartbeat.
  const resourceBeforeListing=resource;
  // Resource assertion is supplied by the PRIVATE Windows monitor, not
  // independent proof of RAM safety by this public, host-agnostic code.
  const host=civic?null:createIntegratedSpatialHost({deriveIntegratedShell});
  let listing;
  try{listing=await preflightR125Ollama({model,endpoint:preflight,fetcher:modelFetcher});}
  catch{result.status='HOLD_OLLAMA_PREFLIGHT';result.reason='LOCAL_MODEL_LIST_UNAVAILABLE';return result;}
  if(listing.status!=='LOCAL_MODEL_LISTED'){
   result.status='HOLD_MODEL_NOT_INSTALLED';result.reason='MODEL_NOT_LISTED';return result;
  }
  // Verify the exact offline model and an empty loaded-model list via GET only.
  if(!injected){
   try{
    if(model!=='qwen3:14b')throw Error('MODEL_NOT_APPROVED');
    const tagsResponse=await modelFetcher(tagsUrl,{method:'GET',
     redirect:'error',signal:AbortSignal.timeout(5000)});
    if(tagsResponse?.ok!==true)throw Error('TAGS_FAILED');
    const tags=JSON.parse(await tagsResponse.text());
    const entries=tags?.models?.filter(x=>x?.name===model);
    if(!Array.isArray(entries)||entries.length!==1 ||
      entries[0]?.digest!==EXPECTED_DIGEST||entries[0]?.size!==EXPECTED_SIZE||
      entries[0]?.details?.quantization_level!=='Q4_K_M')
     throw Error('MODEL_IDENTITY_MISMATCH');
    const psResponse=await modelFetcher(psUrl,{method:'GET',
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
  if(civic&&!injected&&!ownedV6ServiceReady(resource,resourceBeforeListing)){
   result.status='HOLD_OWNED_SERVICE';
   result.reason='DEDICATED_PROCESS_TREE_OR_NONCOMPETITION_UNVERIFIED';return result;
  }
  if(!injected&&!prePostMonitorReady(resourceBeforeListing,resource)){
   result.status='HOLD_INDEPENDENT_MONITOR';
   result.reason='PRE_POST_MONITOR_RESOURCE_SAMPLE_NOT_ADVANCING';return result;
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
  save(dir,'V7_LOCAL_REQUEST_PRIVATE.json',{model,prompt:chosenPrompt,
   systemPromptSha256:hash(systemPrompt),
   headSha,contract:result.protocol,maxAttempts:1,
   ...(civic?{ownedServiceOrigin,num_ctx:requestOptions.num_ctx,
    num_predict:requestOptions.num_predict}:{}),
   ...(v6ThinkingStudy?{v6ThinkingStudy:true,think:true,
    tokenizerBudgetAssertion:v6ThinkingBudget}:{}),
   resourceAssertion:'PRIVATE_MONITOR_ASSERTED_NOT_PUBLICLY_ATTESTED'});
  const controller=new AbortController();
  let monitorActive=true,monitorPending=false,monitorFault=false,lastBeat=Date.now();
  let monitorPrevious=resource,ownerStopTask=null;
  // Client HTTP abort alone cannot stop Ollama inference. Ask the PRIVATE
  // supervisor to close its own Job once; never touch a shared/unowned PID.
  // An acknowledgement is not proof that the OS Job really terminated.
  const requestOwnedStop=reason=>{
   if(!civic||typeof stopOwnedService!=='function'||ownerStopTask)return;
   result.ownedStopRequestDispatched=true;
   ownerStopTask=Promise.resolve().then(()=>stopOwnedService({
    headSha,reason,expectedPort:11435,
    expectedPid:resourceBeforeListing?.ownedServicePid
   })).then(v=>v?.accepted===true).catch(()=>false);
  };
  const timer=setTimeout(()=>{
   controller.abort();requestOwnedStop('MODEL_REQUEST_TIMEOUT');
  },timeoutMs);
  const fault=()=>{if(monitorActive){
   monitorFault=true;controller.abort();requestOwnedStop('RESOURCE_MONITOR_HOLD');
  }};
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
       (civic&&!injected&&!ownedV6ServiceReady(sample,resourceBeforeListing))||
       (!injected&&!monitorSampleAdvanced(monitorPrevious,sample)))fault();
    else{
     monitorPrevious=sample;
     lastBeat=Date.now();result.activeMonitorSamples++;
    }
   }).catch(fault).finally(()=>{monitorPending=false;});
  },1000);
  let raw,completionResponseObserved=false;
  try{
   result.modelGenerationAttempts=1; // Count attempt even for HTTP failure.
   const response=await modelFetcher(local,{
    method:'POST',redirect:'error',signal:controller.signal,
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({model,stream:false,think:v6ThinkingStudy,keep_alive:0,
     format:civic?V4J_PARENT_INDEX_CIVIC_SCHEMA:'json',
     options:requestOptions,
     messages:[{role:'system',content:systemPrompt},
      {role:'user',content:chosenPrompt}]})
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
   // Thinking is a separate native field, never an alternate author JSON.
   // Keep its original HTTP envelope PRIVATE; share only bounded counts.
   // https://github.com/ollama/ollama/blob/main/docs/capabilities/thinking.mdx
   if(v6ThinkingStudy){
    save(dir,'V6_THINKING_HTTP_ENVELOPE_ORIGINAL_PRIVATE.json',body);
    const thinking=parsedResponse?.message?.thinking;
    result.thinkingObserved=typeof thinking==='string'&&thinking.length>0;
    result.thinkingCharacterCount=typeof thinking==='string'?thinking.length:0;
   }
   // Existing injected tests use the older mock shape; real Ollama
   // must satisfy the native /api/chat completion contract.
   const choice=injected?parsedResponse?.choices?.[0]:null;
   if(injected&&(!Array.isArray(parsedResponse?.choices)||
      parsedResponse.choices.length!==1)){
    result.status='HOLD_MODEL_RESPONSE';result.reason='NOT_ONE_CHOICE';return result;
   }
   completionResponseObserved=injected
    ? choice?.finish_reason==='stop'
    : parsedResponse?.done===true&&parsedResponse?.done_reason==='stop';
   result.ollamaCompletionObserved=completionResponseObserved;
   raw=injected?choice?.message?.content:parsedResponse?.message?.content;
   if(typeof raw==='string'&&raw.length>0&&raw.length<=250000){
    save(dir,'V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt',raw);
    result.responseRawSha256=hash(raw);result.rawCaptured=true;
   }
   if(v6ThinkingStudy){
    const input=parsedResponse?.prompt_eval_count,output=parsedResponse?.eval_count;
    const valid=Number.isSafeInteger(input)&&input>0&&
     Number.isSafeInteger(output)&&output>=0&&output<=requestOptions.num_predict&&
     input<=v6ThinkingBudget.framedInputTokens+v6ThinkingBudget.additionalFramingMargin&&
     input+requestOptions.num_predict<=requestOptions.num_ctx;
    result.thinkingTokenBudgetVerified=valid;
    if(!valid){
     result.status='HOLD_MODEL_RESPONSE';result.reason='THINKING_TOKEN_BUDGET_EVIDENCE_MISMATCH';return result;
    }
    result.observedPromptTokens=input;result.observedGeneratedTokens=output;
   }
   if(monitorFault||
      (injected&&choice?.finish_reason!=='stop')||
      (!injected&&(parsedResponse?.done!==true||parsedResponse?.done_reason!=='stop'))||
      typeof raw!=='string'||raw.length<30||raw.length>30000){
    result.status='HOLD_MODEL_RESPONSE';result.reason='MODEL_INCOMPLETE_OR_OVERSIZE';return result;
   }
  }catch{
   result.clientAbortSignaled=controller.signal.aborted;
   result.status=monitorFault?'HOLD_MONITOR_INTERRUPTED':'HOLD_MODEL_HTTP';
   result.reason=monitorFault?'MONITOR_ABORTED_GENERATION':'MODEL_FAILED_OR_TIMEOUT';
   return result;
  }finally{
   result.clientAbortSignaled=controller.signal.aborted;
   clearTimeout(timer);clearInterval(pulse);monitorActive=false;
   if(civic&&(!completionResponseObserved||controller.signal.aborted||monitorFault))
    requestOwnedStop('MODEL_STOP_UNCONFIRMED');
   if(ownerStopTask){
    // Bound callback acknowledgement wait; real stop safety is independent
    // supervisor responsibility, not a client-side boolean.
    result.ownedStopRequestAcceptedByCallback=await new Promise(resolve=>{
     const limit=setTimeout(()=>resolve(false),3000);
     ownerStopTask.then(ok=>{clearTimeout(limit);resolve(ok);});
    });
   }
   // GET-only verification, never a second cleanup POST or model retry.
   if(!injected&&result.modelGenerationAttempts>0){
    try{
     const psResponse=await modelFetcher(psUrl,{method:'GET',
      redirect:'error',signal:AbortSignal.timeout(5000)});
     if(psResponse?.ok!==true)throw Error('PS_FAILED');
     const ps=JSON.parse(await psResponse.text());
     const evidence=classifyOllamaStopEvidence({
      clientAbortSignaled:controller.signal.aborted,
      completionResponseObserved,models:ps?.models
     });
     Object.assign(result,evidence);
     if(!result.unloadConfirmed)throw Error('SERVER_COMPLETION_AND_UNLOAD_NOT_CONFIRMED');
    }catch{
     // Do not hide the more specific monitor-stop failure with a GET error.
     if(!monitorFault){
      result.status='HOLD_UNLOAD_UNKNOWN';
      result.reason='SERVER_COMPLETION_OR_UNLOAD_NOT_CONFIRMED';
     }
    }
   }
  }
  if(monitorFault){
   result.status='HOLD_MONITOR_INTERRUPTED';
   result.reason='MONITOR_ABORT_OR_STALE';return result;
  }
  // Preserve the stronger unload-unknown failure before assessing sample count.
  // Both are HOLD; never mask a known server-stop/unload uncertainty.
  if(!injected&&!result.unloadConfirmed)return result;
  // A very quick response has zero active samples; only preflight was tested.
  if(!injected&&result.activeMonitorSamples<1){
   result.status='HOLD_NO_LIVE_MONITOR_SAMPLES';
   result.reason='NO_DURING_INFERENCE_SAMPLE';return result;
  }
  let author;
  try{author=JSON.parse(raw);}catch{
   result.status='HOLD_AUTHOR';result.reason='AUTHOR_NOT_PURE_JSON';return result;
  }
  let candidate;
  if(civic||authorMode==='v4h-mezzanine'){
   // Author's original model JSON only. No fallback or HOST-authored geometry.
   try{
    const v4h=civic?compileCivicArcadeAuthorIntent(materializeV4JParentIndexAuthor(author)):
     compileMezzanineAuthorIntent(author);
    if(v4h.authorContract!==(civic?CIVIC_ARCADE_SCHEMA:MEZZANINE_SCHEMA)||
       v4h.b143?.sourceRoutes?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
       v4h.b143?.compiled?.geometrySha256!==v4h.geometrySha256||
       v4h.b143?.compiled?.sourceSha256!==v4h.sourceSha256||
       v4h.worldWrites!==0||v4h.worldContacts!==0||
       v4h.constructionApproved!==false||v4h.executionAllowed!==false||
       v4h.BuildPlan?.operations?.length!==0||
       v4h.gates?.length!==9||v4h.gates.some(x=>x!=='BLOCKED'))
      throw Error('V4H_SOURCE_INVALID');
    candidate={status:'GENUINE_B143_CANDIDATE',
     authorSha256:civic?hash(JSON.stringify(author)):v4h.mezzanineAuthorSha256,operationSha256:null,
     sourceSha256:v4h.sourceSha256,geometrySha256:v4h.geometrySha256,
     privateProduct:{design:v4h.b143.design,compiled:v4h.b143.compiled}};
   }catch(e){
    result.status='HOLD_AUTHOR';result.reason=civic?'V6_AUTHOR_OR_B143_REJECTED':'V4H_AUTHOR_OR_B143_REJECTED';
    if(civic)result.compilerRejectCode=classifyPrivateCompilerRejection(String(e?.message??e));
    return result;
   }
  }else{
   try{candidate=await executeIntegratedSemanticBridge(author,host);}
   catch{result.status='HOLD_AUTHOR';result.reason='AUTHOR_SCHEMA_REJECTED';return result;}
  }
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
   hostProvenance:civic?'EXISTING_V6_AUTHOR_COMPILER_NO_REPAIR':authorMode==='v4h-mezzanine'?
    'FROZEN_V4H_AUTHOR_COMPILER_NOT_HISTORICAL_SOURCE':
    'PRIVATE_EXPLICIT_HOST_DERIVED_NOT_HISTORICAL_SOURCE',
   authorContract:civic?CIVIC_ARCADE_SCHEMA:authorMode==='v4h-mezzanine'?MEZZANINE_SCHEMA:
    INTEGRATED_SPATIAL_V7_SUPPORTED_PROTOCOL,
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
