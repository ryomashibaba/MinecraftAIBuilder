/**
 * R48 — separate, expressly approved ONE local qwen3.8:27b generation.
 *
 * IMPORT IS INERT. Only invoking runR48OneShot with a fresh R48 consent,
 * exact model, local destination, and a listed model may send one localhost
 * POST. A consumed lock is created BEFORE the one expensive request.
 * No retries, fallback models, cloud APIs or Minecraft API/connection.
 *
 * This code does not prove model identity, originality or human aesthetics.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {createB198SNativeBridge}
 from '../source/ai/b198s-native-ollama-source.mjs';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {checkR8LocalModelAvailable}
 from '../source/ai/b198zr8-read-only-model-preflight.mjs';
import {reviewR4PlannedProposal}
 from '../source/ai/b198zr4-planned-source.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {analyzeR13SavedCapture}
 from '../source/ai/b198zr13-quality-decision.mjs';
import {renderR13QualityReport}
 from './b198zr13-review-saved-capture.mjs';
import {writeR7OfflineVisualReview}
 from './b198zr7-offline-visual-review.mjs';
import {inspectR41Candidate}
 from '../source/ai/b198zr41-architecture-authoring-candidate.mjs';
import {R47_JSON_SCHEMA_SHA256,R47_SCHEMA_UTF8_BYTES,inspectR47SavedCandidate}
 from '../source/ai/b198zr47-json-schema-format-gate.mjs';
import {inspectR45Original}
 from '../source/ai/b198zr45-original-grammar-and-program-audit.mjs';
import {inspectR42AuthoringBudget}
 from '../source/ai/b198zr42-lossless-drafting-budget.mjs';
import {inspectR43ArchitecturalSections}
 from '../source/ai/b198zr43-sectional-architecture-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr48-consented-single-trial-v1';
export const AUTHORIZATION='I_APPROVE_R48_ONE_LOCAL_QWEN_REQUEST';
export const MODEL='qwen3.8:27b';
export const SOURCE_TOKENS=3072;
export const CONTEXT_TOKENS=6144;
export const TIMEOUT_SECONDS=300;
const sha=s=>createHash('sha256').update(s).digest('hex');
const fails=code=>{throw Error('B198ZR48_'+code)};
const hold=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
const write=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const classify=e=>String(e?.code??e?.message??'').match(
 /(?:B198[A-Z0-9]+|B143)_[A-Z0-9_]+/)?.[0]??'UNCLASSIFIED_HOLD';

export async function runR48OneShot({
 authorization,model=MODEL,baseDir,port=11434,
 bridgeFactory=createB198SNativeBridge
}={}){
 // Do not even GET localhost before consent and exact-model guards.
 if(authorization!==AUTHORIZATION)fails('NEW_EXPLICIT_AUTHORIZATION_REQUIRED');
 if(model!==MODEL)fails('EXACT_QWEN_MODEL_REQUIRED');
 if(typeof baseDir!=='string'||!path.isAbsolute(baseDir)||
  !baseDir.trim()||!Number.isSafeInteger(port)||port<1||port>65535||
  typeof bridgeFactory!=='function')fails('LOCAL_ARGUMENTS_INVALID');
 const lock=path.join(baseDir,'R48_APPROVAL_CONSUMED_LOCK.txt');
 if(fs.existsSync(lock))fails('APPROVAL_ALREADY_CONSUMED_NO_RETRY');
 const listed=await checkR8LocalModelAvailable({model,port});
 if(listed.status!=='EXACT_MODEL_LISTED')
  fails('PREFLIGHT_'+listed.status+'_NO_REQUEST');
 fs.mkdirSync(baseDir,{recursive:true});
 let lockfd;
 try{lockfd=fs.openSync(lock,'wx',0o600)}
 catch(e){if(e?.code==='EEXIST')fails('APPROVAL_ALREADY_CONSUMED_NO_RETRY');throw e}
 try{fs.writeSync(lockfd,'R48 approved single local Qwen attempt is consumed. DO NOT RETRY.\n')}
 finally{fs.closeSync(lockfd)}
 const dir=path.join(baseDir,'R48_'+randomUUID());
 fs.mkdirSync(dir,{recursive:false});
 const spec=CREATION_CASES.find(x=>x.id==='c01');
 if(!spec||spec.kind!=='creation')fails('FROZEN_B198B_CASE_MISSING_LOCK_CONSUMED');
 const request={
  schema:SCHEMA,caseId:'c01',originalPrompt:spec.prompt,
  originalPromptSha256:sha(spec.prompt),
  modelRequested:MODEL,explicitAuthorization:AUTHORIZATION,
  oneShotLockConsumed:true,guideProfile:'R48_JSON_SCHEMA_R47_OPT_IN_ONE_REQUEST',
  guideSha256:R47_JSON_SCHEMA_SHA256,
  structuredOutputSchemaUtf8Bytes:R47_SCHEMA_UTF8_BYTES,
  structuredOutputNativeFormat:true,
  sourceTokens:SOURCE_TOKENS,contextTokens:CONTEXT_TOKENS,
  timeoutSeconds:TIMEOUT_SECONDS,think:false,stream:false,
  temperature:0.35,endpoint:'http://127.0.0.1:'+port+'/api/chat',
  noAutoRetry:true,oldR25R44R46ConsentNotReused:true,
  worldOperationsAllowed:false,safety:hold()
 };
 write(dir,'R48_FROZEN_REQUEST.json',request);
 const originalPath=path.join(dir,'R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
 let bridge=null,attemptStarted=false,rawSaved=false,review=null,
  strictReviewStatus='HOLD_NO_CAPTURE',reason=null;
 try{
  bridge=bridgeFactory({
   numPredict:SOURCE_TOKENS,numCtx:CONTEXT_TOKENS,
   plannedSourceMode:true,r47SchemaFormat:true,
   onModelResponse:({originalContent,correctedContent,metadataRepair,boundsRepair})=>{
    if(typeof originalContent!=='string'||!originalContent.length||
     originalContent.length>60000||originalContent!==correctedContent||
     metadataRepair?.applied!==false||boundsRepair?.applied!==false)
      fails('ORIGINAL_MUTATION_OR_INVALID_CAPTURE');
    fs.writeFileSync(originalPath,originalContent,{flag:'wx'});
    rawSaved=true;
   }
  });
  if(bridge.requestBudget?.r47SchemaFormatOptIn!==true||
   bridge.requestBudget?.r47SchemaFormatSha256!==R47_JSON_SCHEMA_SHA256||
   bridge.requestBudget?.r4PlannedSourceOptIn!==true||
   typeof bridge.fetcher!=='function'||typeof bridge.telemetry!=='function')
   fails('PINNED_BRIDGE_GUIDE_MISMATCH');
  const generator=createB198GLocalModelAdapter({
   model,endpoint:'http://127.0.0.1:'+port+'/v1/chat/completions',
   fetcher:bridge.fetcher,timeoutMs:TIMEOUT_SECONDS*1000,
   plannedSourceMode:true});
  attemptStarted=true; // Does NOT itself prove network contact.
  await generator({mode:'creation',prompt:spec.prompt,attempt:1,maxAttempts:1});
  if(!rawSaved)fails('NO_UNMODIFIED_CAPTURE');
  review=reviewR4PlannedProposal(fs.readFileSync(originalPath,'utf8'),
   {caseId:'r48-c01-model-declared-only'});
  strictReviewStatus=review.status;
 }catch(e){
  reason=classify(e);
  strictReviewStatus='HOLD_TRANSPORT_SOURCE_OR_SPATIAL';
 }
 const raw=rawSaved?fs.readFileSync(originalPath,'utf8'):null;
 const nativeTrace=bridge?.telemetry?.()??[];
 let visualStatus='NOT_GENERATED';
 if(raw!==null){
  // If R4 fails because the self-declared plan is invalid, a valid B143
  // design can still be displayed. NEVER treat this as a repaired original.
  let design=review?.design??null,compiled=review?.compiled??null;
  if(!compiled){
   try{
    design=JSON.parse(raw)?.design;
    compiled=compileDesign(design);
    if(!verifyCompiled(design,compiled))throw Error('B143_INTEGRITY');
   }catch{design=null;compiled=null}
  }
  if(compiled!==null){
   try{
    const visual=writeR7OfflineVisualReview({
     design,compiled,destination:dir,caseId:'c01'});
    visualStatus=visual.status;
   }catch{visualStatus='HOLD_VISUAL_ARTIFACT_UNAVAILABLE'}
  }else visualStatus='HOLD_B143_NOT_COMPILABLE';
 }
 const traceLast=nativeTrace.at(-1)??null;
 const capture={
  schema:SCHEMA,status:strictReviewStatus,reasonCode:reason,
  originalSaved:rawSaved,originalRawSha256:raw===null?null:sha(raw),
  originalRawBytes:raw===null?0:Buffer.byteLength(raw),
  sourceSha256:review?.compiled?.sourceSha256??null,
  geometrySha256:review?.compiled?.geometrySha256??null,
  conceptualVoxels:review?.compiled?.primitives?.length??null,
  providerModelIdentityVerified:false,
  modelAttemptsAuthorized:1,requestFunctionInvoked:attemptStarted,
  actualPOSTCountIndependentlyVerified:false,
  nativeTrace,nativeGeneratedTokens:traceLast?.generatedTokens??null,
  nativeDoneReason:traceLast?.doneReason??null,
  visualStatus,noAutoRetry:true,
  originalR25R44R46Untouched:true,actualMinecraftWalkabilityCertified:false,
  humanArchitectureQualityCertified:false,safety:hold(),
  request:{
   promptSha256:sha(spec.prompt),modelRequested:MODEL,
   guideSha256:R47_JSON_SCHEMA_SHA256}
 };
 write(dir,'R48_CAPTURE_RESULT.json',capture);
 const offline={};
 if(raw!==null){
  const analyzers=[
   ['R41_ARCHITECTURE_FEEDBACK.json',inspectR41Candidate],
   ['R42_AUTHORING_BUDGET.json',inspectR42AuthoringBudget],
   ['R43_SPATIAL_SECTIONS.json',inspectR43ArchitecturalSections],
   ['R45_ORIGINAL_GRAMMAR_AUDIT.json',inspectR45Original],
   ['R47_STRICT_B143_R3_SCHEMA_RESULT.json',inspectR47SavedCandidate]
  ];
  for(const [name,fn] of analyzers){
   try{const result=fn(raw);write(dir,name,result);offline[name]=result.status}
   catch{offline[name]='HOLD_ANALYZER_ERROR'}
  }
  const receipt={
   schema:'minecraftaibuilder-b198zr5-receipt-v1',
   mode:'PLANNED_R4_4KEY',rawSha256:sha(raw),
   promptSha256:sha(spec.prompt),modelId:MODEL,
   origin:'USER_SUPPLIED_REAL_MODEL_CLAIM',modelRequestsClaimed:1
  };
  write(dir,'R48_UNVERIFIED_CAPTURE_RECEIPT.json',receipt);
  try{
   const r13=analyzeR13SavedCapture({
    raw,caseId:'c01',receipt,runResult:{
     originalRawSha256:sha(raw),
     request:{promptSha256:sha(spec.prompt),modelRequested:MODEL}
    }
   });
   write(dir,'R13_OFFLINE_QUALITY_DECISION.json',r13);
   write(dir,'R13_OFFLINE_QUALITY_OVERVIEW.html',
    renderR13QualityReport(r13,{
     sameFolderViewer:fs.existsSync(path.join(dir,'index.html'))&&
      fs.existsSync(path.join(dir,'B198W_REVIEW_BOARD.html'))
    }));
   offline.r13='GENERATED';
  }catch{offline.r13='HOLD_R13_OFFLINE_REPORT_UNAVAILABLE'}
 }
 const manifest={
  schema:SCHEMA,rawSha256:raw===null?null:sha(raw),
  status:strictReviewStatus,reasonCode:reason,
  c01PromptSha256:sha(spec.prompt),
  r47NativeSchemaSha256:R47_JSON_SCHEMA_SHA256,model:MODEL,
  approvedNewR48Attempt:true,oneTimeLock:'CONSUMED',
  previousR25R44R46ConsentReused:false,originalWasRepaired:false,
  modelRequestStartedByAdapter:attemptStarted,
  modelCallsAllowed:1,automaticRetries:0,
  originalRawCaptured:rawSaved,additionalAnalysisModelCalls:0,
  offlineReports:offline,authorshipIndependentlyVerified:false,
  architecturalQualityUnverified:true,humanVisualReviewRequired:true,
  constructionApproved:false,modelWorldInteractions:0,
  actualMinecraftWorldWrites:0,safety:hold()
 };
 write(dir,'R48_FINAL_EVIDENCE_MANIFEST.json',manifest);
 return {status:strictReviewStatus,folder:dir,lock,
  capture,manifest,worldWrites:0};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==4||args[0]!=='--consent'||args[2]!=='--base')
   fails('CLI_ARGUMENTS');
  const result=await runR48OneShot({
   authorization:args[1],baseDir:path.resolve(args[3])});
  console.log('R48_EVIDENCE',JSON.stringify({
   status:result.status,folder:result.folder,
   originalRawSha256:result.capture.originalRawSha256,
   modelAttemptsAllowed:1,worldWrites:0}));
  if(result.status!=='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS')
   process.exitCode=2;
 }catch(e){
  console.error('R48_HOLD',classify(e));
  process.exitCode=1;
 }
}
