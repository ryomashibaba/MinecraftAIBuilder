/**
 * Opt-in V11 ONE local-model ArchitecturePlan -> original capture -> frozen
 * B143 + SOURCE replay. No auto retry, no world calls, no 3D/ART promotion.
 *
 * node scripts/r125-local-architecture-plan-run.mjs --model qwen3:14b
 *   --prompt "未知の建築要求をここに" --out "NEW_DIRECTORY_OUTSIDE_REPO"
 *
 * This CLI never starts an unmanaged model server. Use the existing owned
 * Windows model/monitor lifecycle before running a real-model trial.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createR125ArchitecturePlanLocalAdapter,DEFAULT_LOCAL_ENDPOINT,r125ResponseFormatForEndpoint}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {diagnoseR125ArchitecturePlanOriginal}
 from './r125-offline-replay.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=code=>{throw Error('R125_LOCAL_PLAN_'+code);};
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const write=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});

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
 const setbackSide=['none','east','rear'].includes(side)?side:'INVALID_OR_MISSING';
 const depth=p.expression.setbackDepth;
 const setbackDepth=Number.isSafeInteger(depth)&&depth>=0&&depth<=32?
  depth:null;
 const validPair=setbackSide==='none'&&setbackDepth===0||
  (['east','rear'].includes(setbackSide)&&levelCount===2&&
   [2,3,4].includes(setbackDepth));
 if(validPair)return null;
 return {schema:'r125-invalid-author-setback-summary-v1',
  levelCount,setbackSide,setbackDepth,
  requiredRule:levelCount===1?'ONE_LEVEL_REQUIRES_NONE_AND_ZERO':
   levelCount===2?'TWO_LEVELS_NONE_ZERO_OR_EAST_REAR_TWO_TO_FOUR':
   'VALID_LEVEL_COUNT_REQUIRED',
  originalEdited:false,modelCalls:0,worldWrites:0};
}
export function parseR125LocalPlanArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==6&&argv.length!==8)fail('ARGS_MODEL_PROMPT_OUT_REQUIRED');
 const values={},allowed=new Set(['--model','--prompt','--out','--endpoint']);
 for(let i=0;i<argv.length;i+=2){
  if(!allowed.has(argv[i])||Object.hasOwn(values,argv[i])||
     typeof argv[i+1]!=='string'||!argv[i+1].trim()||
     argv[i+1].startsWith('--'))fail('INVALID_ARGUMENTS');
  values[argv[i]]=argv[i+1];
 }
 if(!values['--model']||!values['--prompt']||!values['--out']||
    (argv.length===8&&!values['--endpoint']))fail('MISSING_ARGUMENTS');
 return {model:values['--model'],prompt:values['--prompt'],
  outDir:path.resolve(values['--out']),
  endpoint:values['--endpoint']??DEFAULT_LOCAL_ENDPOINT};
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

export async function runR125LocalArchitecturePlan({
 model,prompt,outDir,endpoint=DEFAULT_LOCAL_ENDPOINT,
 reasoningEffort=undefined,maxOutputTokens=4096
},{fetcher=fetch,timeoutMs=180000}={}){
 if(typeof outDir!=='string'||outDir.length===0)
  fail('OUT_DIRECTORY_REQUIRED');
 const dest=path.resolve(outDir);
 ensurePrivateNewDirectory(dest);
 let captured=null,modelStartMs=null,modelElapsedMs=null;
 // Validate endpoint, model, prompt and other options BEFORE allocating dir.
 const author=createR125ArchitecturePlanLocalAdapter({
  model,endpoint,fetcher,timeoutMs,reasoningEffort,maxOutputTokens,
  onRawModelResponse(raw,{finishReason,usage}){
   captured={sha256:sha(raw),finishReason,usage};
   write(dest,'MODEL_RESPONSE_ORIGINAL.txt',raw);
  }
 });
 if(typeof prompt!=='string'||prompt.length<8||prompt.length>8000)
  fail('INVALID_PROMPT');
 fs.mkdirSync(dest,{recursive:false});
 // Preserve the exact request beside the original model response so a new
 // unknown-brief trial is genuinely reproducible without exposing it in CI.
 write(dest,'REQUEST_ORIGINAL.txt',prompt);
 const common={schema:'r125-local-plan-one-shot-v1',
  model,endpoint,requestSha256:sha(prompt),
  requestedGenerationSettings:{temperature:0.55,
   responseFormat:r125ResponseFormatForEndpoint(endpoint).type,maxOutputTokens,
   reasoningEffort:reasoningEffort??null,timeoutMs},
  attemptLimit:1,automaticRetries:0,
  provenance:'LOCAL_HTTP_PROVIDER_NOT_INDEPENDENTLY_ATTESTED',
  originalEdited:false,worldContacts:0,worldWrites:0,
  constructionApproved:false,artStatus:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',
  nineWorldGates:Array(9).fill('BLOCKED')};
 let result;
 let makeCodeStatus='NOT_ATTEMPTED',makeCodeReason=null,
  makeCodeSourceSha256=null;
 try{
  modelStartMs=Date.now();
  const answer=await author({prompt});
  modelElapsedMs=Date.now()-modelStartMs;
  const raw=fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
  if(answer.originalSha256!==sha(raw)||captured.sha256!==sha(raw))
   fail('RAW_CAPTURE_MISMATCH');
  const reviewed=diagnoseR125ArchitecturePlanOriginal(raw);
  const {sourceDesign,...diagnosis}=reviewed;
  write(dest,'SOURCE_DIAGNOSIS.json',diagnosis);
  if(sourceDesign){
   write(dest,'B143_SOURCE_REVIEW_ONLY.json',sourceDesign);
   // Render exactly the B143 geometry just audited, no invented voxels.
   const template=fs.readFileSync(
    path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
   const html=renderB143Html(compileB143Gallery([sourceDesign]),template);
   write(dest,'B143_SOURCE_3D_REVIEW_ONLY.html',html);
  }
  // A tested SOURCE candidate can also yield a REVIEW-ONLY MakeCode file.
  // Recompile the exact B143 design, NEVER a second host interpretation of
  // the model plan; MakeCode source hashes must agree with SOURCE_DIAGNOSIS.
  // A missing user-verified material mapping blocks export only, not SOURCE.
  if(diagnosis.sourceVerified===true&&sourceDesign){
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
   sourceSha256:diagnosis.sourceSha256??null,
   geometrySha256:diagnosis.geometrySha256??null,
   sourceVerified:diagnosis.sourceVerified===true,
   review3d:sourceDesign?'TRUE_B143_HTML_GENERATED_ART_PENDING':'NOT_GENERATED',
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
  if(captured&&fs.existsSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'))){
   try{
    const raw=fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
    if(sha(raw)===captured.sha256){
     if(String(error?.message??'')==='R125_PLAN_EXPRESSION_SETBACK')
      invalidSetbackOriginal=summarizeR125InvalidSetbackOriginal(raw);
     const reviewed=diagnoseR125ArchitecturePlanOriginal(raw);
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
   offlineDiagnosisStatus,offlineCompilerReason,
   ...(invalidSetbackOriginal?{invalidSetbackOriginal}:{}),
   reason:String(error?.message??error).slice(0,300),
   originalSha256:captured?.sha256??null,
   modelRequestElapsedMs:modelStartMs===null?null:
    modelElapsedMs??Date.now()-modelStartMs,
   providerReportedTokenUsage:captured?.usage??null,
   makeCodeStatus,makeCodeReason,makeCodeSourceSha256,
   sourceVerified:false,modelCallAttempts:1,
   modelResponsesCaptured:captured?1:0};
 }finally{
  // Never include raw provider text in the shareable run report.
  write(dest,'RUN_REPORT.json',result);
 }
 return {report:result,outputDirectory:dest};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseR125LocalPlanArgs(process.argv.slice(2));
  if(args.help)console.log('R125 local: --model LOCAL_ID --prompt TEXT --out NEW_PRIVATE_DIRECTORY [--endpoint http://127.0.0.1:PORT/v1/chat/completions]');
  else{
   const {report}=await runR125LocalArchitecturePlan(args);
   console.log('R125_LOCAL_ARCHITECTURE_PLAN',JSON.stringify(report));
   if(report.status!=='B143_SOURCE_CANDIDATE_ART_HOLD')
    process.exitCode=2;
  }
 }catch(error){
  console.error('R125_LOCAL_PLAN_HOLD',String(error?.message??error));
  process.exitCode=2;
 }
}
