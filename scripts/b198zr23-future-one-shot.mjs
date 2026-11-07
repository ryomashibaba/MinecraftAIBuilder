/**
 * R23 FUTURE ONLY: a new consent phrase and a process-wide consumed lock
 * BEFORE invoking exactly one R6-compatible source-only capture.
 * Importing this file never contacts local or remote models.
 * DO NOT EXECUTE against real Ollama until the user separately authorizes
 * one new R23 inference (the historical R17 approval is consumed).
 */
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runR6AuthorizedCapture,R23_PROFILE,R23_FUTURE_AUTHORIZATION}
 from './b198zr6-authorized-single-r4-capture.mjs';
import {checkR8LocalModelAvailable}
 from '../source/ai/b198zr8-read-only-model-preflight.mjs';
import {R21_FUTURE_GUIDE_SHA256}
 from '../source/ai/b198zr21-future-architecture-guide.mjs';

export {R23_FUTURE_AUTHORIZATION};
export const SCHEMA='minecraftaibuilder-b198zr23-consent-gated-single-quality-source-v1';
export const EXACT_FUTURE_MODEL='qwen3.8:27b';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Error('B198ZR23_'+code)};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const json=(folder,name)=>JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'));
const save=(folder,name,v)=>fs.writeFileSync(path.join(folder,name),
 JSON.stringify(v,null,2)+'\n',{flag:'wx'});
/** Never infers model identity from a self-claimed receipt.
 * Failure to store evidence is HOLD even if the child says it succeeded.
 */
export function auditR23SavedFolder(folder,{capture=null}={}){
 const issues=[];
 let rawSha256=null,request=null,report=null;
 try{request=json(folder,'R6_FROZEN_REQUEST.json')}
 catch{issues.push('REQUEST_MISSING_OR_INVALID')}
 try{report=json(folder,'R6_SINGLE_CAPTURE_RESULT.json')}
 catch{issues.push('RESULT_MISSING_OR_INVALID')}
 try{
  const raw=fs.readFileSync(path.join(folder,'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'));
  if(raw.length===0)issues.push('RAW_EMPTY');
  else{
   rawSha256=sha(raw);
   for(const [name,field] of [
    ['R6_SINGLE_CAPTURE_RESULT.json','originalRawSha256'],
    ['R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json','rawSha256'],
    ['R13_OFFLINE_QUALITY_DECISION.json','rawSha256'],
    ['R23_SOURCE_FORENSICS.json','rawSha256']
   ]){
    try{
     if(json(folder,name)?.[field]!==rawSha256)
      issues.push('RAW_SHA_MISMATCH_'+name);
    }catch{issues.push('EVIDENCE_MISSING_OR_INVALID_'+name)}
   }
  }
 }catch{
  issues.push('RAW_MISSING');
 }
 if(request!==null){
  if(request.explicitPromptProfile!==R23_PROFILE||
   request.optInR23QualityGuideSha256!==R21_FUTURE_GUIDE_SHA256||
   request.modelRequested!==EXACT_FUTURE_MODEL||
   request.worldOperationsAllowed!==false)
   issues.push('REQUEST_PROFILE_OR_MODEL_MISMATCH');
 }
 if(report!==null){
  if(report.promptProfile!==R23_PROFILE||
   report.r23FutureProfileGuideSha256!==R21_FUTURE_GUIDE_SHA256||
   report.requestedSingleCall!==true||
   report.reportedNativeRequestEvents>1||
   report.worldWrites!==0||report.safety?.readiness!=='NOT_PREPARED')
   issues.push('RESULT_PROFILE_OR_SAFETY_MISMATCH');
 }
 const code=capture?.status??report?.status??null;
 const sourcePassed=code==='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS';
 const status=issues.length?'HOLD_EVIDENCE_CHAIN':
  !sourcePassed?'HOLD_SOURCE_OR_GEOMETRY':'EVIDENCE_CHAIN_PASS_HUMAN_REVIEW_REQUIRED';
 return {schema:SCHEMA,status,sourceStatus:code,rawSha256,
  issues,originalHashVerified:rawSha256!==null&&issues.length===0,
  modelClaim:EXACT_FUTURE_MODEL,modelIdentityIndependentlyAuthenticated:false,
  profile:R23_PROFILE,guideSha256:R21_FUTURE_GUIDE_SHA256,
  automaticArchitectureQualityApproval:false,
  realMinecraftWalkingVerified:false,modelCallsAddedByAudit:0,
  noAutomaticRetry:true,safety:safety()};
}
/**
 * Purposefully NOT wired into any installation or CI startup. An R23
 * future consent would permit one local Ollama POST, not Minecraft.
 * The lock is never released, even when preflight/network/source fail.
 */
export async function runR23FutureOneShot({
 authorization,model=EXACT_FUTURE_MODEL,baseDir,port=11434
}={}){
 if(authorization!==R23_FUTURE_AUTHORIZATION)
  fail('FRESH_R23_CONSENT_REQUIRED');
 if(model!==EXACT_FUTURE_MODEL)
  fail('EXACT_MODEL_REQUIRED');
 if(typeof baseDir!=='string'||!baseDir||!path.isAbsolute(baseDir)||
  !Number.isSafeInteger(port)||port<1||port>65535)
  fail('BASE_DIR_OR_PORT_INVALID');
 // A free, read-only GET may reject a missing model without consuming a
 // future one-shot approval. The actual source run still checks again.
 const preflight=await checkR8LocalModelAvailable({model,port});
 if(preflight.status!=='EXACT_MODEL_LISTED')
  fail('MODEL_NOT_LISTED_NO_LOCK_USED');
 fs.mkdirSync(baseDir,{recursive:true});
 const lock=path.join(baseDir,'R23_APPROVAL_CONSUMED_LOCK.txt');
 let fd;
 try{fd=fs.openSync(lock,'wx',0o600)}
 catch(e){if(e.code==='EEXIST')fail('ONE_ATTEMPT_ALREADY_CONSUMED');throw e}
 try{fs.writeSync(fd,'R23 fresh consent irreversibly consumed. No retries.')}
 finally{fs.closeSync(fd)}
 const folder=path.join(baseDir,'R23_'+randomUUID());
 let capture=null,emergency=null;
 try{
  capture=await runR6AuthorizedCapture({
   authorization:R23_FUTURE_AUTHORIZATION,model,outDir:folder,port,
   promptProfile:R23_PROFILE,sourceTokens:3072,contextTokens:6144
  });
 }catch{
  // Generic non-sensitive evidence: no guess whether transport started.
  emergency='SOURCE_RUN_ABORTED_TRANSPORT_START_UNKNOWN';
  fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'R23_EARLY_FAILURE.txt'),
   'HOLD: New R23 consent consumed. Model transport may have started. NO RETRY.\n',
   {flag:'wx'});
 }
 const audit=auditR23SavedFolder(folder,{capture});
 save(folder,'R23_EVIDENCE_CHAIN_AUDIT.json',audit);
 const manifest={schema:SCHEMA,
  status:audit.status,sourceStatus:capture?.status??null,
  earlyFailure:emergency,model,profile:R23_PROFILE,
  profileGuideSha256:R21_FUTURE_GUIDE_SHA256,
  oneShotGuard:'CONSUMED',captureRootNotPackaged:true,
  r17ApprovalReused:false,attemptsAllowed:1,automaticRetries:0,
  evidenceChainIssues:audit.issues,
  originalRawSha256:audit.rawSha256,
  humanReviewRequired:true,worldContacts:0,worldWrites:0,
  safety:safety()};
 save(folder,'R23_ONE_SHOT_MANIFEST.json',manifest);
 return {status:audit.status,folder,lock,manifest,audit,
  modelRequestsAddedByWrapper:0};
}
// CLI uses exactly the fresh R23 phrase, and writes user-visible folder for
// a future, *separately authorized* single request. NO auto execution.
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv.length!==6||argv[0]!=='--consent'||argv[2]!=='--base'||
   argv[4]!=='--model')fail('CLI_ARGUMENTS_REQUIRED');
  const r=await runR23FutureOneShot({
   authorization:argv[1],baseDir:path.resolve(argv[3]),model:argv[5]});
  console.log('R23_SOURCE_ONLY_EVIDENCE',JSON.stringify({
   status:r.status,folder:r.folder,originalSha256:r.audit.rawSha256,
   attemptsAllowed:1,worldWrites:0}));
  if(r.status!=='EVIDENCE_CHAIN_PASS_HUMAN_REVIEW_REQUIRED')
   process.exitCode=2;
 }catch(e){
  console.error('R23_FUTURE_HOLD',String(e?.message??e).slice(0,120));
  process.exitCode=1;
 }
}
