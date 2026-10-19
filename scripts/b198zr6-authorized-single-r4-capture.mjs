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
import {createB198SNativeBridge} from '../source/ai/b198s-native-ollama-source.mjs';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {reviewR4PlannedProposal} from '../source/ai/b198zr4-planned-source.mjs';

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
  '--timeout-seconds','--source-tokens','--context-tokens']);
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
  sourceTokens,contextTokens};
}
export async function runR6AuthorizedCapture({
 authorization,model,outDir,port=11434,timeoutSeconds=300,
 sourceTokens=3072,contextTokens=6144,
 bridgeFactory=createB198SNativeBridge
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
  budget:{port,timeoutSeconds,sourceTokens,contextTokens,
   thinkingOff:true,temperature:0.35,keepAlive:'10m'},
  existingB198UOriginalNeverModified:true,
  legacyThreeKeyModelOriginalNeverTransformedToFourKey:true,
  worldOperationsAllowed:false,safety:guard()};
 fs.writeFileSync(path.join(dir,'R6_FROZEN_REQUEST.json'),
  JSON.stringify(request,null,2)+'\n',{flag:'wx'});
 let originalSaved=false,requested=false,review=null,status='HOLD_NO_MODEL_RESPONSE';
 let reasonCode=null,bridge=null;
 try{
  bridge=bridgeFactory({
   numPredict:sourceTokens,numCtx:contextTokens,
   plannedSourceMode:true,
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
 }catch(e){
  status='HOLD_MODEL_TRANSPORT_OR_SOURCE_REVIEW';
  const message=String(e?.code??e?.message??'').slice(0,240);
  const tagged=/^(B198[A-Z0-9_-]+)/.exec(message);
  reasonCode=tagged?tagged[1].slice(0,100):
   'UNCLASSIFIED_FAILURE_SENSITIVE_DETAILS_OMITTED';
 }
 const original=originalSaved?fs.readFileSync(originalPath,'utf8'):null;
 const trace=bridge?.telemetry?.()??[];
 const result={schema:SCHEMA,status,reasonCode,
  request,requestedSingleCall:requested,
  reportedNativeRequestEvents:trace.length,
  nativeTrace:trace,originalSaved,
  originalRawSha256:original===null?null:sha(original),
  originalRawBytes:original===null?0:Buffer.byteLength(original),
  sourceSha256:review?.compiled.sourceSha256??null,
  geometrySha256:review?.compiled.geometrySha256??null,
  finalVoxels:review?.compiled.primitives.length??null,
  elementCount:review?.design.elements.length??null,
  modelDeclaredSpatialReview:review?.declaredPlanReview??null,
  humanVisualQuality:'NOT_REVIEWED',
  modelAuthorshipIndependentlyAuthenticated:false,
  modelGeneralizationCertified:false,
  realMinecraftWalkingTested:false,
  modelCannotSelfApprove:true,
  comparisonAgainstBaseline:'NOT_PERFORMED_BY_THIS_RUN',
  sourceOnly:true,worldContacts:0,worldWrites:0,safety:guard()};
 fs.writeFileSync(path.join(dir,'R6_SINGLE_CAPTURE_RESULT.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
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
