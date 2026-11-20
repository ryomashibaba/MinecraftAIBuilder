/**
 * Opt-in V11 ONE local-model ArchitecturePlan -> original capture -> frozen
 * B143 + SOURCE replay. Optional one model-authored fixture revision on HOLD;
 * no silent HOST repair, world calls or 3D/ART promotion.
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
 if(argv.filter(x=>x==='--repair-once').length>1)
  fail('DUPLICATE_REPAIR_FLAG');
 const pairs=argv.filter(x=>x!=='--repair-once');
 if(pairs.length!==6&&pairs.length!==8)fail('ARGS_MODEL_PROMPT_OUT_REQUIRED');
 const values={},allowed=new Set(['--model','--prompt','--out','--endpoint']);
 for(let i=0;i<pairs.length;i+=2){
  if(!allowed.has(pairs[i])||Object.hasOwn(values,pairs[i])||
     typeof pairs[i+1]!=='string'||!pairs[i+1].trim()||
     pairs[i+1].startsWith('--'))fail('INVALID_ARGUMENTS');
  values[pairs[i]]=pairs[i+1];
 }
 if(!values['--model']||!values['--prompt']||!values['--out']||
    (pairs.length===8&&!values['--endpoint']))fail('MISSING_ARGUMENTS');
 return {model:values['--model'],prompt:values['--prompt'],
  outDir:path.resolve(values['--out']),
  endpoint:values['--endpoint']??DEFAULT_LOCAL_ENDPOINT,
  ...(repairOnce?{repairOnce:true}:{})};
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
 reasoningEffort=undefined,maxOutputTokens=4096,repairOnce=false
},{fetcher=fetch,timeoutMs=180000}={}){
 if(typeof outDir!=='string'||outDir.length===0)
  fail('OUT_DIRECTORY_REQUIRED');
 if(typeof repairOnce!=='boolean')fail('INVALID_REPAIR_OPTION');
 // All real requests must enter through the owned lifecycle adapter. The
 // default CLI transport remains available only to explicit injected tests;
 // it may never post to the shared daemon directly.
 if(fetcher===fetch)fail('OWNED_WINDOWS_ONE_SHOT_REQUIRED');
 const dest=path.resolve(outDir);
 ensurePrivateNewDirectory(dest);
 let captured=null,normalizedCapture=null,modelStartMs=null,modelElapsedMs=null;
 // Validate endpoint, model, prompt and other options BEFORE allocating dir.
 const author=createR125ArchitecturePlanLocalAdapter({
  model,endpoint,fetcher,timeoutMs,reasoningEffort,maxOutputTokens,
  onRawModelResponse(raw,{finishReason,usage}){
   captured={sha256:sha(raw),finishReason,usage};
   write(dest,'MODEL_RESPONSE_ORIGINAL.txt',raw);
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
 fs.mkdirSync(dest,{recursive:false});
 // Preserve the exact request beside the original model response so a new
 // unknown-brief trial is genuinely reproducible without exposing it in CI.
 write(dest,'REQUEST_ORIGINAL.txt',prompt);
 const common={schema:'r125-local-plan-one-shot-v1',
  model,endpoint,requestSha256:sha(prompt),
  requestedGenerationSettings:{temperature:0.55,
   responseFormat:r125ResponseFormatForEndpoint(endpoint).type,maxOutputTokens,
   reasoningEffort:reasoningEffort??null,timeoutMs},
  attemptLimit:repairOnce?2:1,automaticRetries:0,
  modelRevisionLimit:repairOnce?1:0,
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
  const reviewed=diagnoseR125ArchitecturePlanOriginal(raw,{requestedBrief:prompt});
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
   normalizedPlanSha256:answer.normalizedPlanSha256,
   normalization:answer.normalization,
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
     const reviewed=diagnoseR125ArchitecturePlanOriginal(raw,{requestedBrief:prompt});
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
   normalizedPlanSha256:normalizedCapture?.normalizedPlanSha256??null,
   normalization:normalizedCapture,
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
  write(dest,'RUN_REPORT.json',result);
 }
 return {report:result,outputDirectory:dest};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseR125LocalPlanArgs(process.argv.slice(2));
  if(args.help)console.log('R125 ArchitecturePlan owned: node scripts/r125-local-architecture-plan-owned.mjs --model qwen3:14b --prompt "... entry.shelterDepth:3 ..." --out NEW_PRIVATE_DIRECTORY');
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
