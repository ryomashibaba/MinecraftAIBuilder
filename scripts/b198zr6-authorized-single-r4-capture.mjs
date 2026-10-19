/**
 * B198Z-R6 — explicitly authorized SINGLE Qwen planned-source capture.
 *
 * Nothing runs at import. No model is contacted without an explicit user
 * authorization token AND an explicit model ID, valid paths and budgets.
 * Source-only. Never loads a Minecraft client, executes placements or retries.
 * The original R4 four-key response is stored, byte for byte, before B143.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {createB198SNativeBridge} from '../source/ai/b198s-native-ollama-source.mjs';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {reviewR4PlannedProposal} from '../source/ai/b198zr4-planned-source.mjs';
import {checkR8LocalModelAvailable}
 from '../source/ai/b198zr8-read-only-model-preflight.mjs';
import {writeR7OfflineVisualReview}
 from './b198zr7-offline-visual-review.mjs';
import {analyzeR13SavedCapture}
 from '../source/ai/b198zr13-quality-decision.mjs';
import {renderR13QualityReport}
 from './b198zr13-review-saved-capture.mjs';
import {PROFILE as R11_PROFILE,R11_GUIDE_SHA256,inspectR11OriginalRaw}
 from '../source/ai/b198zr11-compact-r4-output.mjs';

export const SCHEMA='minecraftaibuilder-b198zr6-authorized-single-capture-v1';
export const EXPLICIT_AUTHORIZATION='I_APPROVE_ONE_LOCAL_MODEL_REQUEST';
const fail=s=>{throw Error('B198ZR6_'+s)};
const yes=(p,s)=>{if(!p)fail(s)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const digits=(s,min,max)=>typeof s==='string'&&/^[1-9][0-9]*$/.test(s)&&
 Number(s)>=min&&Number(s)<=max?Number(s):null;
const guard=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldCoordinates:null,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export function parseR6Args(argv=[]){
 const allowed=new Set(['--authorize-one','--model','--out','--port',
  '--timeout-seconds','--source-tokens','--context-tokens',
  '--prompt-profile']);
 const args={};
 for(let i=0;i<argv.length;i++){
  const k=argv[i],v=argv[++i];
  yes(allowed.has(k)&&!Object.hasOwn(args,k)&&
   typeof v==='string'&&v.length>0&&!v.startsWith('--'),'INVALID_CLI_ARG');
  args[k]=v;
 }
 yes(args['--model']&&args['--out']&&args['--authorize-one'],
  'EXPLICIT_AUTHORIZATION_MODEL_AND_OUT_REQUIRED');
 const port=digits(args['--port']??'11434',1,65535),
  timeoutSeconds=digits(args['--timeout-seconds']??'300',60,360),
  sourceTokens=digits(args['--source-tokens']??'3072',512,4096),
  contextTokens=digits(args['--context-tokens']??'6144',4096,8192);
 yes([port,timeoutSeconds,sourceTokens,contextTokens].every(x=>x!==null)&&
  sourceTokens<=contextTokens-2048,'MODEL_BUDGET');
 return {authorization:args['--authorize-one'],model:args['--model'],
  outDir:path.resolve(args['--out']),port,timeoutSeconds,
  sourceTokens,contextTokens,
  promptProfile:args['--prompt-profile']??'r8-original'};
}
export async function runR6AuthorizedCapture({
 authorization,model,outDir,port=11434,timeoutSeconds=300,
 sourceTokens=3072,contextTokens=6144,
 promptProfile='r8-original',bridgeFactory=createB198SNativeBridge
}={}){
 // ALL cheap guards run before even making the output folder.
 yes(authorization===EXPLICIT_AUTHORIZATION,'NO_EXPLICIT_AUTHORIZATION');
 yes(typeof model==='string'&&
  /^[A-Za-z0-9._:/-]{2,140}$/.test(model),'EXPLICIT_MODEL_ID');
 yes(typeof outDir==='string'&&outDir.length>0&&
  fs.existsSync(path.dirname(path.resolve(outDir)))&&
  !fs.existsSync(path.resolve(outDir)),'NEW_OUTPUT_FOLDER_REQUIRED');
 yes(Number.isSafeInteger(port)&&port>=1&&port<=65535&&
  Number.isSafeInteger(timeoutSeconds)&&timeoutSeconds>=60&&timeoutSeconds<=360&&
  Number.isSafeInteger(sourceTokens)&&sourceTokens>=512&&sourceTokens<=4096&&
  Number.isSafeInteger(contextTokens)&&contextTokens>=4096&&contextTokens<=8192&&
  sourceTokens<=contextTokens-2048,'INVALID_BUDGET');
 yes(['r8-original',R11_PROFILE].includes(promptProfile),'PROMPT_PROFILE');
 const spec=CREATION_CASES.find(s=>s.id==='c01');
 yes(spec?.kind==='creation','FROZEN_C01_REQUIRED');
 const dir=path.resolve(outDir);
 const originalPath=path.join(dir,'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
 // Actual collection is one-shot; write an exact pre-commit before contact.
 fs.mkdirSync(dir);
 const request={schema:SCHEMA,caseId:spec.id,modelRequested:model,
  promptSha256:sha(spec.prompt),originalPrompt:spec.prompt,
  origin:'EXPLICIT_LOCAL_LOOPBACK_USER_AUTHORIZED',
  requestedMode:'R4_PLANNED_SOURCE_FOUR_KEYS',
  explicitPromptProfile:promptProfile,
  optInR11CompactGuideSha256:promptProfile===R11_PROFILE?R11_GUIDE_SHA256:null,
  budget:{port,timeoutSeconds,sourceTokens,contextTokens,
   thinkingOff:true,temperature:0.35,keepAlive:'10m'},
  existingB198UOriginalNeverModified:true,
  legacyThreeKeyModelOriginalNeverTransformedToFourKey:true,
  worldOperationsAllowed:false,safety:guard()};
 fs.writeFileSync(path.join(dir,'R6_FROZEN_REQUEST.json'),
  JSON.stringify(request,null,2)+'\n',{flag:'wx'});
 let originalSaved=false,requested=false,review=null,status='HOLD_NO_MODEL_RESPONSE';
 let reasonCode=null,bridge=null;
 let visualReview=null,visualReviewIssue=null,readOnlyPreflight=null;
 let salvageCompiled=null,salvageDesign=null;
 try{
  // R8: read-only exact-model check BEFORE allocating GPU for the expensive POST.
  // A listed model is not proof of sufficient GPU memory or actual model identity.
  readOnlyPreflight=await checkR8LocalModelAvailable({model,port});
  yes(readOnlyPreflight.status==='EXACT_MODEL_LISTED',
   'PRECHECK_'+readOnlyPreflight.status);
  bridge=bridgeFactory({
   numPredict:sourceTokens,numCtx:contextTokens,
   plannedSourceMode:true,compactPlannedGuide:promptProfile===R11_PROFILE,
   onModelResponse:({originalContent,correctedContent,metadataRepair,boundsRepair})=>{
    yes(typeof originalContent==='string'&&originalContent.length>0&&
     originalContent.length<=60000,'UNTRUSTED_RESPONSE_LENGTH');
    // No metadata or bounds repair is allowed in R4 mode.
    yes(originalContent===correctedContent&&
     metadataRepair?.applied===false&&boundsRepair?.applied===false,
     'ORIGINAL_R4_MUTATION_REFUSED');
    fs.writeFileSync(originalPath,originalContent,{flag:'wx'});
    originalSaved=true;
   }
  });
  yes(bridge&&typeof bridge.fetcher==='function'&&
   typeof bridge.telemetry==='function'&&
   bridge.requestBudget?.r4PlannedSourceOptIn===true,
   'FOUR_KEY_BRIDGE_REQUIRED');
  yes(bridge.requestBudget?.r11CompactOutputProfileOptIn===
    (promptProfile===R11_PROFILE),'PROMPT_PROFILE_BRIDGE_MISMATCH');
  const generate=createB198GLocalModelAdapter({
   model,endpoint:'http://127.0.0.1:'+port+'/v1/chat/completions',
   fetcher:bridge.fetcher,timeoutMs:timeoutSeconds*1000,
   plannedSourceMode:true
  });
  requested=true;
  // Exactly ONE call; never use B198A's retry loop.
  await generate({mode:'creation',prompt:spec.prompt,attempt:1,maxAttempts:1});
  yes(originalSaved,'ORIGINAL_RESPONSE_NOT_CAPTURED');
  // Review precisely the original UTF-8 source; no automatic repair.
  review=reviewR4PlannedProposal(fs.readFileSync(originalPath,'utf8'),
   {caseId:'r6-original-c01'});
  status=review.status;
  // Strict geometry may compile even when the model's plan is unreachable:
  // both cases still deserve a visual dossier for human inspection.
  // Viewer failure must NEVER lose the saved original or hide source status.
  try{
   visualReview=writeR7OfflineVisualReview({
    design:review.design,compiled:review.compiled,destination:dir,caseId:'c01'});
  }catch(e){
   const text=String(e?.message??'').slice(0,160);
   visualReviewIssue=/^(B198(?:ZR7|W|B|C|[0-9A-Z_-]+)_)/.exec(text)?.[1]??
    'R7_VIEWER_UNAVAILABLE_REASON_REDACTED';
  }
 }catch(e){
  status='HOLD_MODEL_TRANSPORT_OR_SOURCE_REVIEW';
  const message=String(e?.code??e?.message??'').slice(0,240);
  const tagged=/^(B198[A-Z0-9_-]+)/.exec(message);
  reasonCode=tagged?tagged[1].slice(0,100):
   'UNCLASSIFIED_FAILURE_SENSITIVE_DETAILS_OMITTED';
  // R8 audit: one expensive Qwen answer might contain perfectly valid B143
  // geometry but a malformed R4 spatialPlan/envelope. Do NOT throw away
  // its useful visual geometry or invent a repaired R4 response. Keep HOLD.
  if(originalSaved&&visualReview===null){
   try{
    const rawSaved=fs.readFileSync(originalPath,'utf8');
    const envelope=JSON.parse(rawSaved);
    salvageDesign=envelope?.design;
    salvageCompiled=compileDesign(salvageDesign);
    yes(verifyCompiled(salvageDesign,salvageCompiled),
     'SALVAGE_B143_INTEGRITY');
    visualReview=writeR7OfflineVisualReview({
     design:salvageDesign,compiled:salvageCompiled,destination:dir,caseId:'c01'});
   }catch(_error){
    salvageCompiled=null;salvageDesign=null;
    visualReviewIssue='NO_STRICT_COMPILABLE_FALLBACK_DESIGN';
   }
  }
 }
 const original=originalSaved?fs.readFileSync(originalPath,'utf8'):null;
 const trace=bridge?.telemetry?.()??[];
 const r11Report=promptProfile===R11_PROFILE&&original!==null?
  inspectR11OriginalRaw(original,{
   profile:R11_PROFILE,outputTokenLimit:sourceTokens,nativeTrace:trace}):null;
 if(r11Report!==null){
  fs.writeFileSync(path.join(dir,'R11_OFFLINE_COMPLETION_AUDIT.json'),
   JSON.stringify(r11Report,null,2)+'\n',{flag:'wx'});
 }
 const result={schema:SCHEMA,status,reasonCode,
  promptProfile,r11CompletionAudit:r11Report,
  request,requestedSingleCall:requested,
  reportedNativeRequestEvents:trace.length,
  nativeTrace:trace,originalSaved,
  readOnlyPreflight,
  originalRawSha256:original===null?null:sha(original),
  originalRawBytes:original===null?0:Buffer.byteLength(original),
  sourceSha256:(review?.compiled??salvageCompiled)?.sourceSha256??null,
  geometrySha256:(review?.compiled??salvageCompiled)?.geometrySha256??null,
  finalVoxels:(review?.compiled??salvageCompiled)?.primitives.length??null,
  elementCount:(review?.design??salvageDesign)?.elements.length??null,
  sourcePreviewSalvagedFromUnacceptedR4Envelope:salvageCompiled!==null,
  salvagedGeometryCannotCountAsAcceptedR4Plan:true,
  modelDeclaredSpatialReview:review?.declaredPlanReview??null,
  humanVisualQuality:'NOT_REVIEWED',
  modelAuthorshipIndependentlyAuthenticated:false,
  modelGeneralizationCertified:false,
  realMinecraftWalkingTested:false,
  modelCannotSelfApprove:true,
  comparisonAgainstBaseline:'NOT_PERFORMED_BY_THIS_RUN',
  visualReviewStatus:visualReview?.status??'HOLD_NO_OFFLINE_3D_REVIEW',
  visualReviewFiles:visualReview?.visualizationFiles??[],
  visualReviewIssue,
  sourceOnly:true,worldContacts:0,worldWrites:0,safety:guard()};
 // R5-compatible receipt is an UNVERIFIED claim, NOT a provider signature.
 // Store it even when the source is invalid; the R5 compiler will HOLD it.
 if(original!==null){
  const r5Receipt={
   schema:'minecraftaibuilder-b198zr5-receipt-v1',
   mode:'PLANNED_R4_4KEY',rawSha256:sha(original),
   promptSha256:sha(spec.prompt),modelId:model,
   origin:'USER_SUPPLIED_REAL_MODEL_CLAIM',
   modelRequestsClaimed:requested?1:0
  };
  fs.writeFileSync(path.join(dir,'R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json'),
   JSON.stringify(r5Receipt,null,2)+'\n',{flag:'wx'});
 }
 fs.writeFileSync(path.join(dir,'R6_SINGLE_CAPTURE_RESULT.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 // R13: save an independent "what can be judged?" dossier directly into
 // the one ZIP R6 already packages. Only NEW report files are created;
 // original model bytes, frozen request and all existing evidence remain
 // immutable. A reporting error cannot trigger a retry or erase evidence.
 if(original!==null){
  try{
   const r13=analyzeR13SavedCapture({
    raw:original,caseId:'c01',
    receipt:JSON.parse(fs.readFileSync(
     path.join(dir,'R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json'),'utf8')),
    runResult:result
   });
   fs.writeFileSync(path.join(dir,'R13_OFFLINE_QUALITY_DECISION.json'),
    JSON.stringify(r13,null,2)+'\n',{flag:'wx'});
   fs.writeFileSync(path.join(dir,'R13_OFFLINE_QUALITY_OVERVIEW.html'),
    renderR13QualityReport(r13),{flag:'wx'});
  }catch(_error){
   // Never expose unsanitized output/provider paths or rerun the model.
   fs.writeFileSync(path.join(dir,'R13_OFFLINE_REVIEW_UNAVAILABLE.txt'),
    'R13 offline quality overview unavailable. R6 original and model results are unchanged. No re-inference.\n',
    {flag:'wx'});
  }
 }
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const r=await runR6AuthorizedCapture(parseR6Args(process.argv.slice(2)));
  console.log('B198ZR6_SINGLE_CAPTURE',JSON.stringify({
   status:r.status,caseId:r.request.caseId,
   originalSaved:r.originalSaved,originalSha256:r.originalRawSha256,
   modelCallLimit:1,modelQualityCertified:false,worldWrites:0}));
  if(r.status!=='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS')
   process.exitCode=2;
 }catch(e){
  console.error('B198ZR6_PRECHECK_HOLD',
   String(e?.message??e).replace(/[\\/][^\s]+/g,'[PATH]').slice(0,150));
  process.exitCode=1;
 }
}
