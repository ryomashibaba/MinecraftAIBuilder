/**
 * Opt-in V11 ONE local-model ArchitecturePlan -> original capture -> frozen
 * B143 + SOURCE replay. Optional one model-authored fixture revision on HOLD;
 * no silent HOST repair, world calls or 3D/ART promotion.
 *
 * Existing strict route remains the default. Explicit Windows trial mode:
 * node scripts/r125-local-architecture-plan-run.mjs --trial-mode
 *   --model qwen3:14b --prompt "未知の建築要求をここに"
 *   --out "NEW_PRIVATE_DIRECTORY"
 *
 * Trial mode is one local loopback request, serialized across Codex projects,
 * with a 180-second timeout and Ctrl+C cancellation. It never starts or kills
 * a model server, contacts a Minecraft world, or exports PRIVATE originals.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {request as localHttpRequest} from 'node:http';
import {createR125ArchitecturePlanLocalAdapter,DEFAULT_LOCAL_ENDPOINT,
 r125ResponseFormatForEndpoint,validR125RevisionDiagnosis}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {diagnoseR125ArchitecturePlanOriginal}
 from './r125-offline-replay.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';
import {validateArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {createR125MaterialsTrialTransport,replayR125DelegatedResponse} from './r125-delegated-model-trial.mjs';
import {buildR125BlockExpression,makeR125BlockComparisonTemplate} from '../source/ai/r125-block-expression.mjs';
import {buildR125RoofSurface,makeR125RoofSurfaceTemplate} from '../source/ai/r125-roof-surface.mjs';
import {saveB143StaticReview} from './r125-static-art-review.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=code=>{throw Error('R125_LOCAL_PLAN_'+code);};
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const write=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});

/** Optional presentation is not SOURCE evidence. Do not discard a
 * separately verified source because a viewer or artifact write failed. */
export function reviewR125OptionalArtifact(render){
 if(typeof render!=='function')fail('OPTIONAL_REVIEW_CALLBACK');
 try{return render();}
 catch(error){return {status:'HOLD_OPTIONAL_REVIEW',reason:String(error?.message??error).slice(0,180)};}
}
export function summarizeR125DelegatedSource(derived){
 if(!derived?.sourceVerified)return null;
 const changed=(derived.changes??[]).length>0;
 if(changed&&(!derived.candidate||typeof derived.resolvedPlanSha256!=='string'))fail('DELEGATED_PROVENANCE_MISSING');
 return {kind:changed?'MODEL_INTENT_HOST_RESOLVED':'MODEL_PLAN_NO_DELEGATED_DIMENSION_CHANGE',
  dimensionChanges:derived.changes??[],resolvedPlanSha256:derived.resolvedPlanSha256??null,
  modelAuthorshipIndependentlyVerified:false};
}
/** Bounded, read-only report of an invalid original model setback.
 * It does NOT correct plan JSON, infer missing geometry or expose prompts.
 */
export function summarizeR125InvalidSetbackOriginal(raw){
 if(typeof raw!=='string'||raw.length<1||raw.length>60000)return null;
 let p;
 try{p=JSON.parse(raw)}catch{return null}
 if(!p||typeof p!=='object'||Array.isArray(p)||
    !p.expression||typeof p.expression!=='object'||
    Array.isArray(p.expression))return null;
 const levelCount=Array.isArray(p.levels)&&p.levels.length<=2?
  p.levels.length:null;
 const side=p.expression.setbackSide;
 const setbackSide=['none','east','rear','front'].includes(side)?side:'INVALID_OR_MISSING';
 const depth=p.expression.setbackDepth;
 const setbackDepth=Number.isSafeInteger(depth)&&depth>=0&&depth<=32?
  depth:null;
 const validPair=setbackSide==='none'&&setbackDepth===0||
  (['east','rear'].includes(setbackSide)&&levelCount===2&&
   [2,3,4,6,8].includes(setbackDepth)&&
   (setbackDepth<=4||(setbackSide==='east'?
    p.footprint?.width>=28:p.footprint?.depth>=28)))||
  (setbackSide==='front'&&levelCount===2&&setbackDepth===2);
 if(validPair)return null;
 return {schema:'r125-invalid-author-setback-summary-v1',
  levelCount,setbackSide,setbackDepth,
  requiredRule:levelCount===1?'ONE_LEVEL_REQUIRES_NONE_AND_ZERO':
   levelCount===2?'TWO_LEVELS_NONE_ZERO_EAST_REAR_TWO_THREE_FOUR_SIX_EIGHT_WIDE_OR_FRONT_TWO':
   'VALID_LEVEL_COUNT_REQUIRED',
  originalEdited:false,modelCalls:0,worldWrites:0};
}
export function parseR125LocalPlanArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const repairOnce=argv.includes('--repair-once');
 const trialMode=argv.includes('--trial-mode');
 const spatialTreeOnly=argv.includes('--spatial-tree-only');
 const materialsTrial=argv.includes('--materials-trial');
 const compactDesign=argv.includes('--compact-design');
 if(argv.filter(x=>x==='--compact-design').length>1||compactDesign&&(!materialsTrial||!spatialTreeOnly))fail('COMPACT_DESIGN_REQUIRES_SPATIAL_MATERIALS_TRIAL');
 if(argv.filter(x=>x==='--materials-trial').length>1)fail('DUPLICATE_MATERIALS_TRIAL_FLAG');
 if(materialsTrial&&(!trialMode||repairOnce))fail('MATERIALS_TRIAL_REQUIRES_SINGLE_TRIAL');
 if(argv.filter(x=>x==='--repair-once').length>1)fail('DUPLICATE_REPAIR_FLAG');
 if(argv.filter(x=>x==='--trial-mode').length>1)fail('DUPLICATE_TRIAL_FLAG');
 if(argv.filter(x=>x==='--spatial-tree-only').length>1)fail('DUPLICATE_SPATIAL_TREE_FLAG');
 if(trialMode&&repairOnce)fail('TRIAL_MODE_SINGLE_REQUEST_ONLY');
 const pairs=argv.filter(x=>x!=='--repair-once'&&x!=='--trial-mode'&&x!=='--spatial-tree-only'&&x!=='--materials-trial'&&x!=='--compact-design');
 if(pairs.length<6||pairs.length>18||pairs.length%2!==0)
  fail('ARGS_MODEL_PROMPT_OUT_REQUIRED');
 const values={},allowed=new Set(['--model','--prompt','--out','--endpoint',
  '--revise-plan','--revise-diagnosis','--max-output-tokens','--reasoning-effort','--timeout-ms']);
 for(let i=0;i<pairs.length;i+=2){
  if(!allowed.has(pairs[i])||Object.hasOwn(values,pairs[i])||
     typeof pairs[i+1]!=='string'||!pairs[i+1].trim()||
     pairs[i+1].startsWith('--'))fail('INVALID_ARGUMENTS');
  values[pairs[i]]=pairs[i+1];
 }
 if(!values['--model']||!values['--prompt']||!values['--out'])fail('MISSING_ARGUMENTS');
 const maxOutputTokens=values['--max-output-tokens']===undefined?4096:
  Number(values['--max-output-tokens']);
 const timeoutMs=values['--timeout-ms']===undefined?180000:
  Number(values['--timeout-ms']);
 const reasoningEffort=values['--reasoning-effort'];
 if(!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<256||maxOutputTokens>16384||
    !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>900000||
    (reasoningEffort!==undefined&&!['none','low','medium','high'].includes(reasoningEffort)))
  fail('INVALID_GENERATION_SETTINGS');
 return {model:values['--model'],prompt:values['--prompt'],
  outDir:path.resolve(values['--out']),
  endpoint:values['--endpoint']??DEFAULT_LOCAL_ENDPOINT,
  maxOutputTokens,timeoutMs,...(reasoningEffort?{reasoningEffort}:{}),
  ...(values['--revise-plan']?{revisionPlanPath:path.resolve(values['--revise-plan'])}:{}),
  ...(values['--revise-diagnosis']?{revisionDiagnosisPath:path.resolve(values['--revise-diagnosis'])}:{}),
  ...(repairOnce?{repairOnce:true}:{}),...(trialMode?{trialMode:true}:{}),
  ...(spatialTreeOnly?{spatialTreeOnly:true}:{}),...(materialsTrial?{materialsTrial:true}:{}),...(compactDesign?{compactDesign:true}:{})};
}

/** Local long-inference transport. Node fetch/Undici's default 300-second
 * response-header deadline is shorter than the owned 900-second model limit.
 * Native node:http uses only the caller's AbortSignal deadline; no retries,
 * stream substitution, external endpoint, or Minecraft access.
 */
export function fetchR125LongLocalCompletion(url,options={}){
 const target=new URL(url),port=Number(target.port);
 if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||
    !Number.isSafeInteger(port)||port<1||port>65535||
    target.pathname!=='/v1/chat/completions'||target.search||target.hash||
    target.username||target.password||options.method!=='POST'||
    typeof options.body!=='string'||options.redirect!=='error')
  return Promise.reject(Error('R125_LOCAL_HTTP_RESTRICTED_ENDPOINT_OR_METHOD'));
 return new Promise((resolve,reject)=>{
  const request=localHttpRequest({hostname:'127.0.0.1',port,
   path:target.pathname,method:'POST',signal:options.signal,
   headers:{'Content-Type':'application/json',
    'Content-Length':Buffer.byteLength(options.body)}},response=>{
   const chunks=[];let total=0;
   response.on('data',chunk=>{
    total+=chunk.length;
    if(total>1000000){
     request.destroy(Error('R125_LOCAL_HTTP_RESPONSE_TOO_LARGE'));return;
    }
    chunks.push(chunk);
   });
   response.once('error',reject);
   response.once('aborted',()=>reject(Error('R125_LOCAL_HTTP_RESPONSE_INTERRUPTED')));
   response.once('end',()=>resolve({
    ok:response.statusCode>=200&&response.statusCode<300,
    status:response.statusCode,
    json:async()=>JSON.parse(Buffer.concat(chunks).toString('utf8'))
   }));
  });
  request.once('error',reject);
  request.end(options.body);
 });
}

const globalTrialLock=()=>path.resolve(ROOT,'..','..',
 '.mab-r125-local-model-trial.lock');
export function acquireLocalTrialLock(){
 const lock=globalTrialLock(),token=randomUUID(),pid=process.pid;
 for(let attempt=0;attempt<2;attempt++){
  try{
   const fd=fs.openSync(lock,'wx');
   fs.writeFileSync(fd,JSON.stringify({pid,token,startedAt:new Date().toISOString()}));
   fs.closeSync(fd);
   return ()=>{
    try{
     const current=JSON.parse(fs.readFileSync(lock,'utf8'));
     if(current.pid===pid&&current.token===token){fs.unlinkSync(lock);return true;}
    }catch{/* Preserve another process's or unreadable lock. */}
    return false;
   };
  }catch(error){
   if(error?.code!=='EEXIST')fail('LOCAL_MODEL_TRIAL_LOCK_UNAVAILABLE');
   if(attempt===0){
    let owner=null;
    try{owner=JSON.parse(fs.readFileSync(lock,'utf8'));}catch{}
    let alive=true;
    if(Number.isSafeInteger(owner?.pid)&&owner.pid>0){
     try{process.kill(owner.pid,0);}catch(e){alive=e?.code!=='ESRCH';}
    }
    if(owner&&alive)fail('LOCAL_MODEL_TRIAL_ALREADY_RUNNING');
    if(owner)try{fs.unlinkSync(lock);}catch{fail('LOCAL_MODEL_TRIAL_ALREADY_RUNNING');}
   }
  }
 }
 fail('LOCAL_MODEL_TRIAL_ALREADY_RUNNING');
}

export function ensurePrivateNewDirectory(dest){
 const parent=path.dirname(dest);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
    fs.existsSync(dest))fail('OUTPUT_MUST_BE_NEW_DIRECTORY');
 const realParent=fs.realpathSync(parent);
 if(dest===ROOT||dest.startsWith(ROOT+path.sep)||
    realParent===ROOT||realParent.startsWith(ROOT+path.sep))
  fail('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
 if(realParent===path.parse(realParent).root)
  fail('OUTPUT_ROOT_PARENT_DISALLOWED');
}

/** Eligible only for explicit equipment omissions, never arbitrary compiler
 * failures. Source evidence comes from the exact saved first response.
 * Original raw and SOURCE remain untouched, even on revised SOURCE PASS.
 */
export function r125FixtureRevisionEvidence(diagnosis,raw){
 if(!diagnosis||diagnosis.sourceVerified===true||
    typeof raw!=='string'||raw.length<10||raw.length>12000)return null;
 try{
  const p=JSON.parse(raw);
  if(!p||typeof p!=='object'||!Array.isArray(p.levels))return null;
 }catch{return null;}
 const missing=[...(diagnosis.explicitActivityProxy?.missing??[]),
  ...(diagnosis.roomActivityProxy?.missing??[])];
 const missingRequiredFixtureRoles=[...new Set(missing
  .map(x=>x?.requiredRole).filter(x=>typeof x==='string'))];
 const issue=String(diagnosis.compilerReason??'');
 const authoredFixtureError=/^R125_PLAN_(SPACE_FIXTURE_DETAIL|SPACE_FIXTURE_ARRANGEMENT|SPACE_OVEN_HEARTH|OBSERVATION_LINK_NO_AUTHORED_WORKSTATION)$/.test(issue);
 if(!missingRequiredFixtureRoles.length&&!authoredFixtureError)return null;
 return {previousModelResponse:raw,
  sourceIssueCodes:[diagnosis.status,...(authoredFixtureError?[issue]:[])],
  missingRequiredFixtureRoles};
}
export async function runR125LocalArchitecturePlan({
 model,prompt,outDir,endpoint=DEFAULT_LOCAL_ENDPOINT,
reasoningEffort=undefined,maxOutputTokens=4096,repairOnce=false,trialMode=false,
revisionPlanPath=null,revisionDiagnosisPath=null,spatialTreeOnly=false,materialsTrial=false,compactDesign=false
},{fetcher=fetch,timeoutMs=180000,signal}={}){
 if(typeof outDir!=='string'||outDir.length===0)
  fail('OUT_DIRECTORY_REQUIRED');
 if(typeof repairOnce!=='boolean'||typeof trialMode!=='boolean'||typeof spatialTreeOnly!=='boolean')
  fail('INVALID_RUN_MODE');
 if(trialMode&&repairOnce)fail('TRIAL_MODE_SINGLE_REQUEST_ONLY');
 if(revisionPlanPath!==null&&(typeof revisionPlanPath!=='string'||
   !revisionPlanPath.trim()||repairOnce))fail('INVALID_REVISION_PLAN_OPTION');
 if(revisionDiagnosisPath!==null&&(typeof revisionDiagnosisPath!=='string'||
    !revisionDiagnosisPath.trim()||revisionPlanPath===null||repairOnce))
  fail('INVALID_REVISION_DIAGNOSIS_OPTION');
 if(typeof compactDesign!=='boolean'||compactDesign&&(!materialsTrial||!spatialTreeOnly))fail('COMPACT_DESIGN_REQUIRES_SPATIAL_MATERIALS_TRIAL');
 if(typeof materialsTrial!=='boolean'||materialsTrial&&(!trialMode||repairOnce||revisionPlanPath!==null||revisionDiagnosisPath!==null||endpoint!==DEFAULT_LOCAL_ENDPOINT))
  fail('MATERIALS_TRIAL_REQUIRES_FRESH_STRICT_SINGLE_TRIAL');
 if(trialMode&&fetcher!==fetch)fail('TRIAL_MODE_REQUIRES_REAL_LOCAL_TRANSPORT');
 // All real requests must enter through the owned lifecycle adapter. The
 // default CLI transport remains available only to explicit injected tests;
 // it may never post to the shared daemon directly.
 const fakeOnlyTestTransport=process.env.MAB_ARCHPLAN_FAKE_TEST_TRANSPORT==='1'&&
  model==='fake-local-author';
 if(fetcher===fetch&&!fakeOnlyTestTransport&&!trialMode)
  fail('OWNED_WINDOWS_ONE_SHOT_REQUIRED');
 const dest=path.resolve(outDir);
 ensurePrivateNewDirectory(dest);
 let revisionBase=null,revisionBaseJson=null,revisionBaseSha256=null;
 let revisionDiagnosis=null,revisionDiagnosisJson=null,revisionDiagnosisSha256=null;
 if(revisionPlanPath!==null){
  try{
   revisionBaseJson=fs.readFileSync(revisionPlanPath,'utf8');
   revisionBase=JSON.parse(revisionBaseJson);
   validateArchitecturePlan(revisionBase);
  }catch(error){fail('INVALID_REVISION_BASE_PLAN_'+String(error?.message??error).slice(0,100));}
  revisionBaseSha256=sha(JSON.stringify(revisionBase));
 }
 if(revisionDiagnosisPath!==null){
  try{
   revisionDiagnosisJson=fs.readFileSync(revisionDiagnosisPath,'utf8');
   if(revisionDiagnosisJson.length>60000)fail('INVALID_REVISION_SOURCE_DIAGNOSIS_SIZE');
   const full=JSON.parse(revisionDiagnosisJson);
   revisionDiagnosis={status:full.status,sourceVerified:full.sourceVerified,
    compilerReason:full.compilerReason,
    ...(full.spatialFootprint?{spatialFootprint:full.spatialFootprint}:{})};
   if(!validR125RevisionDiagnosis(revisionDiagnosis))
    fail('INVALID_REVISION_SOURCE_DIAGNOSIS');
   revisionDiagnosisSha256=sha(revisionDiagnosisJson);
  }catch(error){
   if(String(error?.message??error).includes('INVALID_REVISION_SOURCE_DIAGNOSIS'))throw error;
   fail('INVALID_REVISION_SOURCE_DIAGNOSIS_'+String(error?.message??error).slice(0,100));
  }
 }
 let captured=null,normalizedCapture=null,modelStartMs=null,modelElapsedMs=null,actualRequestSha256=null,preparedTransportAttempts=0;
 const transport=trialMode?fetchR125LongLocalCompletion:fetcher;
 const selectedTransport=materialsTrial?createR125MaterialsTrialTransport(transport,body=>{
  write(dest,'MODEL_REQUEST_EXACT.json',body);actualRequestSha256=sha(body);preparedTransportAttempts=1;
 },{compactDesign}):transport;
 // Validate endpoint, model, prompt and other options BEFORE allocating dir.
 const author=createR125ArchitecturePlanLocalAdapter({
  model,endpoint,fetcher:selectedTransport,allowDelegatedDimensions:materialsTrial,
  timeoutMs,reasoningEffort,maxOutputTokens,spatialTreeOnly,signal,
  onRawModelResponse(raw,{finishReason,usage,captureKind='model-message-content'}){
   captured={sha256:sha(raw),finishReason,usage,captureKind};
   if(captureKind==='provider-envelope-invalid-content')
    write(dest,'MODEL_PROVIDER_RESPONSE_ENVELOPE_ORIGINAL.json',raw);
   else write(dest,'MODEL_RESPONSE_ORIGINAL.txt',raw);
  },
  onNormalizedModelPlan(normalized){
   normalizedCapture=normalized.normalization;
   if(normalizedCapture.applied){
    write(dest,'MODEL_RESPONSE_NORMALIZED_PLAN.json',normalized.normalizedPlanJson);
    write(dest,'MODEL_RESPONSE_NORMALIZATION.json',normalizedCapture);
   }
  }
 });
 if(typeof prompt!=='string'||prompt.length<8||prompt.length>8000)
  fail('INVALID_PROMPT');
 const releaseTrialLock=trialMode?acquireLocalTrialLock():()=>{};
 try{fs.mkdirSync(dest,{recursive:false});}
 catch(error){releaseTrialLock();throw error;}
 // Preserve the exact request beside the original model response so a new
 // unknown-brief trial is genuinely reproducible without exposing it in CI.
 try{write(dest,'REQUEST_ORIGINAL.txt',prompt);}
 catch(error){releaseTrialLock();throw error;}
 if(revisionBaseJson!==null){
  write(dest,'REVISION_BASE_PLAN.json',revisionBaseJson);
  write(dest,'REVISION_REQUEST.json',{schema:'r125-model-authored-revision-request-v1',
   basePlanSha256:revisionBaseSha256,revisionRequestSha256:sha(prompt),
   ...(revisionDiagnosisSha256?{sourceDiagnosisSha256:revisionDiagnosisSha256,
    modelReceivesSourceDiagnosis:true}:{}),
   modelRevisionLimit:1,hostPlanEditing:false,worldWrites:0});
  if(revisionDiagnosisJson!==null)
   write(dest,'REVISION_BASE_SOURCE_DIAGNOSIS.json',revisionDiagnosisJson);
 }
 const common={schema:'r125-local-plan-one-shot-v1',
  model,endpoint,requestSha256:sha(prompt),
  ...(materialsTrial?{materialsTrial:true,extendedContract:'V38.5',designPromptProfile:compactDesign?'compact-spatial-v1':'full',partialShapeConstruction:'NOT_ATTESTED'}:{}),
  executionMode:trialMode?'WINDOWS_LOCAL_TRIAL_SINGLE_REQUEST':'OWNED_WINDOWS_ONE_SHOT',
  requestedGenerationSettings:{temperature:0.55,
   responseFormat:r125ResponseFormatForEndpoint(endpoint,{spatialTreeOnly}).type,
   ...(spatialTreeOnly?{spatialTreeOnlyHostConstrained:true}:{}),maxOutputTokens,
   reasoningEffort:reasoningEffort??null,timeoutMs},
  attemptLimit:repairOnce?2:1,automaticRetries:0,
  modelRevisionLimit:repairOnce?1:0,
  provenance:'LOCAL_HTTP_PROVIDER_NOT_INDEPENDENTLY_ATTESTED',
  originalEdited:false,worldContacts:0,worldWrites:0,
  authorshipMode:revisionBase?'ONE_NEW_COMPLETE_MODEL_AUTHORED_R125_RESPONSE':'NEW_MODEL_AUTHORED_R125_RESPONSE',
  revisionBasePlanSha256:revisionBaseSha256,
  revisionDiagnosisSha256,
  constructionApproved:false,artStatus:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',
  nineWorldGates:Array(9).fill('BLOCKED')};
 let result;
 let makeCodeStatus='NOT_ATTEMPTED',makeCodeReason=null,
  makeCodeSourceSha256=null;
 try{
  modelStartMs=Date.now();
  const answer=await author({prompt,...(revisionBase?{revisionContext:{
   previousArchitecturePlan:revisionBase,revisionRequest:prompt,
   ...(revisionDiagnosis?{sourceDiagnosis:revisionDiagnosis}:{})}}:{})});
  modelElapsedMs=Date.now()-modelStartMs;
  const raw=fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
  if(answer.originalSha256!==sha(raw)||captured.sha256!==sha(raw))
   fail('RAW_CAPTURE_MISMATCH');
  const delegated=materialsTrial?replayR125DelegatedResponse(raw,prompt):null;
  const reviewed=delegated?(delegated.diagnostic??{status:delegated.status,sourceVerified:false}):diagnoseR125ArchitecturePlanOriginal(raw,{requestedBrief:prompt});
  const {sourceDesign,...diagnosis}=reviewed;
  if(delegated){
   write(dest,'DELEGATED_SOURCE_DIAGNOSIS.json',{...delegated,diagnostic:diagnosis});
   if(delegated.candidate)write(dest,'HOST_RESOLVED_PLAN.json',delegated.candidate);
   if(delegated.sourceVerified!==diagnosis.sourceVerified)fail('DELEGATED_REPLAY_MISMATCH');
  }
  write(dest,'SOURCE_DIAGNOSIS.json',diagnosis);
  let htmlReview=null;
  if(sourceDesign){
   write(dest,'B143_SOURCE_REVIEW_ONLY.json',sourceDesign);
   // Render exactly the B143 geometry just audited, no invented voxels.
   const makeHtml=()=>{
    const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
    const html=renderB143Html(compileB143Gallery([sourceDesign]),template);
    write(dest,'B143_SOURCE_3D_REVIEW_ONLY.html',html);
    return {status:'TRUE_B143_HTML_GENERATED_ART_PENDING'};
   };
   htmlReview=materialsTrial?reviewR125OptionalArtifact(makeHtml):makeHtml();
  }
  let materialReview=null,staticReview=null,authoredFeatures=null;
  if(materialsTrial){
   const selected=JSON.parse(raw);
   authoredFeatures=Object.fromEntries(['blockPalette','windowRelief','wallRelief','roofSurface','observationLink','delegatedDimensions'].map(k=>[k,Object.hasOwn(selected,k)]));
   if(diagnosis.sourceVerified===true&&sourceDesign){
    try{
     const scene=compileDesign(sourceDesign);
     if(!verifyCompiled(sourceDesign,scene)||scene.sourceSha256!==diagnosis.sourceSha256||scene.geometrySha256!==diagnosis.geometrySha256)fail('STATIC_SOURCE_REPLAY_MISMATCH');
     const review=saveB143StaticReview({sourcePath:path.join(dest,'B143_SOURCE_REVIEW_ONLY.json'),outDir:path.join(dest,'STATIC_ART_REVIEW')});
     if(review.sourceSha256!==diagnosis.sourceSha256||review.geometrySha256!==diagnosis.geometrySha256)fail('STATIC_REVIEW_HASH_MISMATCH');
     staticReview={status:'SOURCE_MATCHED_PNG_ART_PENDING',contactSheet:'STATIC_ART_REVIEW/CONTACT_4_VIEWS.png',sha256:review.contactSheet.sha256,style:review.renderMethod};
    }catch(error){staticReview={status:'HOLD_STATIC_REVIEW',reason:String(error?.message??error).slice(0,180)};}
   }
  }
  if(materialsTrial&&diagnosis.sourceVerified===true&&sourceDesign){
   const selected=JSON.parse(raw);
   if(selected.blockPalette!==undefined){
    const scene=compileDesign(sourceDesign);
    if(!verifyCompiled(sourceDesign,scene)||scene.sourceSha256!==diagnosis.sourceSha256||scene.geometrySha256!==diagnosis.geometrySha256)fail('MATERIAL_SOURCE_REPLAY_MISMATCH');
    const args={design:sourceDesign,scene,palette:selected.blockPalette,origin:'CALLER_PROVIDED_MODEL_RESPONSE_UNVERIFIED',originalRaw:raw};
    materialReview=reviewR125OptionalArtifact(()=>{
    const expression=buildR125BlockExpression(args);
    const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
    const gallery=compileB143Gallery([sourceDesign]);
    const comparison=makeR125BlockComparisonTemplate(template,args,expression);
    write(dest,'V38_BLOCK_EXPRESSION_REVIEW_ONLY.json',expression);
    write(dest,'V38_BLOCK_COMPARISON_REVIEW_ONLY.html',renderB143Html(gallery,comparison));
    const summary={expressionSha256:expression.expressionSha256,status:expression.status,roofSurface:null};
    if(Object.hasOwn(selected,'roofSurface')){
     summary.roofSurface=reviewR125OptionalArtifact(()=>{
     const shape=buildR125RoofSurface(args,expression);
     write(dest,'V385_ROOF_SURFACE_REVIEW_ONLY.json',shape);
     write(dest,'V385_ROOF_SURFACE_REVIEW_ONLY.html',renderB143Html(gallery,makeR125RoofSurfaceTemplate(comparison,args,expression,shape)));
     return {status:shape.status,counts:shape.counts,shapeSha256:shape.shapeSha256};
     });
    }
    return summary;
    });
   }
  }
  // A tested SOURCE candidate can also yield a REVIEW-ONLY MakeCode file.
  // Recompile the exact B143 design, NEVER a second host interpretation of
  // the model plan; MakeCode source hashes must agree with SOURCE_DIAGNOSIS.
  // A missing user-verified material mapping blocks export only, not SOURCE.
  if(materialsTrial)makeCodeStatus='NOT_ATTEMPTED_EXTENDED_REVIEW_ONLY';
  if(!materialsTrial&&diagnosis.sourceVerified===true&&sourceDesign){
   try{
    const scene=compileDesign(sourceDesign);
    if(!verifyCompiled(sourceDesign,scene)||
       scene.sourceSha256!==diagnosis.sourceSha256||
       scene.geometrySha256!==diagnosis.geometrySha256)
     fail('MAKECODE_SOURCE_REPLAY_MISMATCH');
    const palette=JSON.parse(fs.readFileSync(path.join(ROOT,
     'configs/r125-education-verified-palette-v26.33.json'),'utf8'));
    const packet=exportB143EducationMakeCode({
     design:sourceDesign,scene,provenance:'LOCAL_MODEL_CAPTURE',
     groundLowestLayer:true,verifiedPalette:palette});
    if(packet.sourceSha256!==diagnosis.sourceSha256||
       packet.geometrySha256!==diagnosis.geometrySha256||
       packet.worldWrites!==0||packet.programExecuted!==false||
       packet.BuildPlan?.operations?.length!==0)
     fail('MAKECODE_PACKET_SOURCE_MISMATCH');
    const {code,...packetReport}=packet;
    write(dest,'MAKECODE_EDUCATION_SOURCE_ONLY.ts',code);
    write(dest,'MAKECODE_EXPORT_REPORT.json',packetReport);
    makeCodeStatus='OFFLINE_CODE_GENERATED_ONLY';
    makeCodeSourceSha256=packet.makecodeSourceSha256;
   }catch(e){
    makeCodeStatus='HOLD_EDUCATION_EXPORT';
    makeCodeReason=String(e?.message??e).slice(0,180);
   }
  }
  result={...common,
   status:diagnosis.status,originalSha256:answer.originalSha256,
   ...(materialsTrial?{actualRequestSha256,materialReview,staticReview,authoredFeatures,sourcePlanDerivation:summarizeR125DelegatedSource(delegated),delegationSelected:delegated.delegationSelected??false,delegatedChanges:delegated.changes??[]}:{}),
   normalizedPlanSha256:answer.normalizedPlanSha256,
   normalization:answer.normalization,
   sourceSha256:diagnosis.sourceSha256??null,
   geometrySha256:diagnosis.geometrySha256??null,
   sourceVerified:diagnosis.sourceVerified===true,
   review3d:htmlReview?.status??'NOT_GENERATED',
   ...(materialsTrial?{htmlReview}:{}),
   modelCallAttempts:1,modelResponsesCaptured:1,
   originalCaptureFinishReason:captured.finishReason,
   modelRequestElapsedMs:modelElapsedMs,
   providerReportedTokenUsage:captured.usage,
   makeCodeStatus,makeCodeReason,makeCodeSourceSha256};
 }catch(error){
  // An original MODEL response can be valid raw evidence even if the
  // transport adapter rejected its JSON/required fields. Diagnose it
  // OFFLINE without another model call. Never promote an adapter failure.
  let offlineDiagnosisStatus=null,offlineCompilerReason=null;
  let invalidSetbackOriginal=null;
  if(captured?.captureKind==='model-message-content'&&
     fs.existsSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'))){
   try{
    const raw=fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
    if(sha(raw)===captured.sha256){
     if(String(error?.message??'')==='R125_PLAN_EXPRESSION_SETBACK')
      invalidSetbackOriginal=summarizeR125InvalidSetbackOriginal(raw);
     const reviewed=materialsTrial?(replayR125DelegatedResponse(raw,prompt).diagnostic??{status:'HOLD_EXTENDED_REPLAY',sourceVerified:false}):diagnoseR125ArchitecturePlanOriginal(raw,{requestedBrief:prompt});
     const {sourceDesign,...diagnosis}=reviewed;
     offlineDiagnosisStatus=diagnosis.status;
     offlineCompilerReason=diagnosis.compilerReason??null;
     const target=path.join(dest,'SOURCE_DIAGNOSIS.json');
     if(!fs.existsSync(target))write(dest,'SOURCE_DIAGNOSIS.json',diagnosis);
    }
   }catch{
    // Preserve exact original model error and path to private raw.
    // Diagnostics MUST never mask the original failed request.
   }
  }
  result={...common,status:'HOLD_MODEL_OR_SOURCE',
   ...(materialsTrial?{actualRequestSha256}:{}),
   offlineDiagnosisStatus,offlineCompilerReason,
   normalizedPlanSha256:normalizedCapture?.normalizedPlanSha256??null,
   normalization:normalizedCapture,
   ...(invalidSetbackOriginal?{invalidSetbackOriginal}:{}),
   reason:String(error?.message??error).slice(0,300),
   originalSha256:captured?.sha256??null,
   modelRequestElapsedMs:modelStartMs===null?null:
    modelElapsedMs??Date.now()-modelStartMs,
   providerReportedTokenUsage:captured?.usage??null,
   makeCodeStatus,makeCodeReason,makeCodeSourceSha256,
   sourceVerified:false,modelCallAttempts:materialsTrial?preparedTransportAttempts:1,
   modelResponsesCaptured:captured?1:0,
   modelResponseCaptureKind:captured?.captureKind??null};
 }finally{
  // A bounded SECOND genuine local model response is allowed ONLY on an
  // explicitly requested equipment-related SOURCE/contract HOLD.
  // This is model-guided new authorship, not a silent HOST correction.
  if(repairOnce&&result&&result.sourceVerified!==true&&
     captured?.finishReason!=='length'&&
     fs.existsSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'))&&
     fs.existsSync(path.join(dest,'SOURCE_DIAGNOSIS.json'))){
   let evidence=null;
   try{
    const firstRaw=fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
    if(sha(firstRaw)===captured.sha256)
     evidence=r125FixtureRevisionEvidence(JSON.parse(fs.readFileSync(
      path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8')),firstRaw);
   }catch{/* Preserve first original HOLD without retrying unsafe source. */}
   if(evidence){
    const initialStatus=result.status;
    let revisedCapture=null,revisionError=null,revisedAnswer=null;
    let revisedDiagnosis=null;
    let revisedSourceDesign=null;
    const revisedAuthor=createR125ArchitecturePlanLocalAdapter({
     model,endpoint,fetcher,timeoutMs,reasoningEffort,maxOutputTokens,
     onRawModelResponse(raw,{finishReason,usage}){
      revisedCapture={sha256:sha(raw),finishReason,usage};
      write(dest,'MODEL_RESPONSE_REVISED.txt',raw);
     }});
    const revisedStart=Date.now();
    try{
     revisedAnswer=await revisedAuthor({prompt,repairContext:evidence});
    }catch(error){revisionError=String(error?.message??error).slice(0,220);}
    const revisedElapsed=Date.now()-revisedStart;
    if(revisedCapture&&fs.existsSync(path.join(dest,'MODEL_RESPONSE_REVISED.txt'))){
     const raw=fs.readFileSync(path.join(dest,'MODEL_RESPONSE_REVISED.txt'),'utf8');
     if(sha(raw)===revisedCapture.sha256){
      const reviewed=diagnoseR125ArchitecturePlanOriginal(raw,{requestedBrief:prompt});
      const {sourceDesign,...diagnosis}=reviewed;
      revisedDiagnosis=diagnosis;
      revisedSourceDesign=sourceDesign;
      write(dest,'SOURCE_DIAGNOSIS_REVISED.json',diagnosis);
     }else revisionError='REVISED_RAW_CAPTURE_MISMATCH';
    }
    const passed=Boolean(revisedAnswer&&revisedCapture&&
     revisedDiagnosis?.sourceVerified===true&&revisedSourceDesign&&
     revisedAnswer.originalSha256===revisedCapture.sha256);
    if(passed){
     write(dest,'B143_REVISED_SOURCE_REVIEW_ONLY.json',revisedSourceDesign);
     const template=fs.readFileSync(path.join(ROOT,
      'source/ai/b143-viewer-template.html'),'utf8');
     write(dest,'B143_REVISED_SOURCE_3D_REVIEW_ONLY.html',
      renderB143Html(compileB143Gallery([revisedSourceDesign]),template));
    }
    result={...result,
     status:passed?'B143_SOURCE_CANDIDATE_ART_HOLD':'HOLD_MODEL_REVISION_OR_SOURCE',
     sourceVerified:passed,
     modelCallAttempts:2,
     modelResponsesCaptured:1+(revisedCapture?1:0),
     initialStatus,modelRevisionAttempted:true,
     modelRevisionApplied:passed,
     originalSha256:captured.sha256,
     revisedOriginalSha256:revisedCapture?.sha256??null,
     revisedSourceStatus:revisedDiagnosis?.status??null,
     revisedCompilerReason:revisedDiagnosis?.compilerReason??null,
     ...(passed?{
      sourceSha256:revisedDiagnosis.sourceSha256,
      geometrySha256:revisedDiagnosis.geometrySha256,
      review3d:'REVISED_TRUE_B143_HTML_GENERATED_ART_PENDING'
     }:{
      sourceSha256:null,geometrySha256:null,
      review3d:'REVISED_SOURCE_NOT_VERIFIED'
     }),
     revisedCaptureFinishReason:revisedCapture?.finishReason??null,
     revisedProviderReportedTokenUsage:revisedCapture?.usage??null,
     revisedModelElapsedMs:revisedElapsed,
     revisionError,
     modelRevisionIssues:evidence.sourceIssueCodes,
     modelRevisionMissingRoles:evidence.missingRequiredFixtureRoles,
     makeCodeStatus:'NOT_ATTEMPTED_FOR_REVISED_SOURCE',
     makeCodeSourceSha256:null,
     originalEdited:false,worldWrites:0,constructionApproved:false,
     artStatus:'NOT_REVIEWED'};
   }
  }
  // Never include model text in the shareable run report.
  try{write(dest,'RUN_REPORT.json',result);}
  finally{releaseTrialLock();}
 }
 return {report:result,outputDirectory:dest};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseR125LocalPlanArgs(process.argv.slice(2));
  if(args.help)console.log('R125 local trial: node scripts/r125-local-architecture-plan-run.mjs --trial-mode [--materials-trial] [--spatial-tree-only] [--compact-design] --model MODEL --prompt "..." --out NEW_PRIVATE_DIRECTORY [--revise-plan PLAN.json --revise-diagnosis SOURCE_DIAGNOSIS.json] (loopback only, one request, Ctrl+C to stop)');
  else{
   const controller=args.trialMode?new AbortController():null;
   const cancel=()=>controller?.abort();
   if(controller){process.once('SIGINT',cancel);process.once('SIGTERM',cancel);}
   let run;
   try{run=await runR125LocalArchitecturePlan(args,{
    timeoutMs:args.timeoutMs,...(controller?{signal:controller.signal}:{})});}
   finally{
    if(controller){process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
   }
   const {report}=run;
   console.log('R125_LOCAL_ARCHITECTURE_PLAN',JSON.stringify(report));
   if(report.status!=='B143_SOURCE_CANDIDATE_ART_HOLD')
    process.exitCode=2;
  }
 }catch(error){
  console.error('R125_LOCAL_PLAN_HOLD',String(error?.message??error));
  process.exitCode=2;
 }
}
