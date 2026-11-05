/**
 * R125 V4D private ORIGINAL model-response replay: NO LLM POST, NO network,
 * NO Minecraft I/O, NO mutation of the original study.
 *
 * Reconstructs B143 from the exact saved response and compares the *original*
 * SOURCE/geometry hashes. An originally failed design cannot become a new
 * accepted candidate through silent compiler changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileRelativeAuthorIntent}
 from '../source/ai/r125-v4d-relative-author-ir.mjs';
import {COMPACT_SCHEMA,compileCompactModelIntent}
 from '../source/ai/r125-v4d-compact-model-ir.mjs';
import {RELATIVE_SCHEMA} from '../source/ai/r125-v4d-relative-author-ir.mjs';
import {RANKED_SCHEMA,compileRankedExteriorIntent}
 from '../source/ai/r125-v4e-ranked-exterior-ir.mjs';
import {SECTIONED_SCHEMA,compileSectionedAuthorIntent}
 from '../source/ai/r125-v4e-sectioned-author-ir.mjs';
import {MASSING_SCHEMA,compileMassingAuthorIntent} from '../source/ai/r125-v4e-massing-author-ir.mjs';
import {WING_SCHEMA,compileWingAuthorIntent} from '../source/ai/r125-v4e-wing-author-ir.mjs';
import {FLOORPLATE_SCHEMA,compileFloorplateAuthorIntent}
 from '../source/ai/r125-v4f-floorplate-author-ir.mjs';
import {HEIGHT_SCHEMA,compileHeightAuthorIntent}
 from '../source/ai/r125-v4g-height-author-ir.mjs';
import {MEZZANINE_SCHEMA,compileMezzanineAuthorIntent}
 from '../source/ai/r125-v4h-mezzanine-author-ir.mjs';
import {CIVIC_ARCADE_SCHEMA,compileCivicArcadeAuthorIntent}
 from '../source/ai/r125-v4j-civic-author-ir.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {V4J_ENTRY_FIRST_PROTOCOL,materializeV4JEntryFirstAuthor}
 from '../source/ai/r125-v4j-feasible-envelope.mjs';
import {classifyPrivateV4DFailure}
 from './r125-v4d-shareable-receipt.mjs';
import {classifyPrivateCompilerRejection}
 from './r125-v4d-compiler-reject-codes.mjs';
import {diagnosePrivateV4DAuthor,diagnosePrivateV4DInvalidJSON}
 from './r125-v4d-author-source-diagnostics.mjs';

export const REPLAY_SCHEMA='minecraftaibuilder-r125-v4d-offline-replay-v1';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('R125_V4D_OFFLINE_REPLAY_'+s);};
const sha=s=>createHash('sha256').update(s).digest('hex');
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const within=(a,b)=>a===b||a.startsWith(b+path.sep);
const write=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',
 {flag:'wx'});
function loadPrivateFile(root,name,limit){
 const fp=path.join(root,name);
 let info;
 try{info=fs.lstatSync(fp);}catch{fail('PRIVATE_FILE_MISSING_'+name);}
 if(!info.isFile()||info.isSymbolicLink()||info.size>limit||
  info.size===0)fail('PRIVATE_FILE_NOT_REGULAR_OR_OVERSIZED_'+name);
 return fs.readFileSync(fp,'utf8');
}
function openStudy(dir){
 if(typeof dir!=='string'||dir.length<2)fail('SOURCE_DIRECTORY');
 let p;
 try{
  if(!fs.lstatSync(dir).isDirectory()||fs.lstatSync(dir).isSymbolicLink())
   fail('SOURCE_MUST_BE_UNLINKED_DIRECTORY');
  p=fs.realpathSync(dir);
 }catch(e){if(String(e?.message).includes('R125_V4D_OFFLINE_REPLAY_'))throw e;
  fail('PRIVATE_SOURCE_NOT_FOUND');}
 if(within(p,fs.realpathSync(ROOT)))fail('SOURCE_MUST_BE_OUTSIDE_REPO');
 const reportText=loadPrivateFile(p,'V4D_LOCAL_AUTHOR_REPORT.json',400000);
 const requestText=loadPrivateFile(p,'LOCAL_REQUEST.json',50000);
 let original,request;
 try{original=JSON.parse(reportText);request=JSON.parse(requestText);}
 catch{fail('INVALID_PRIVATE_MANIFEST_JSON');}
 if(!original||original.schema!=='minecraftaibuilder-r125-v4d-local-model-author-attempt-v1'||
  !request||!request.sourceOnly||!request.noWorldAccess||
  !request.noPaidAPI||request.nModelGenerationAttemptsAllowed!==1||
  !['SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED','HOLD_TEST_DOUBLE_NOT_REAL_MODEL',
   'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR','HOLD_MODEL_TIMEOUT_OR_ABORTED',
   'HOLD_MODEL_NOT_INSTALLED','HOLD_LOCAL_PREFLIGHT'].includes(original.status)||
  ![COMPACT_SCHEMA,RELATIVE_SCHEMA,RANKED_SCHEMA,SECTIONED_SCHEMA,MASSING_SCHEMA,WING_SCHEMA,FLOORPLATE_SCHEMA,HEIGHT_SCHEMA,MEZZANINE_SCHEMA,CIVIC_ARCADE_SCHEMA].includes(original.authorContract)||
  request.authorContract!==original.authorContract||
  !Number.isSafeInteger(original.modelCalls)||original.modelCalls<0||
  original.modelCalls>1||typeof original.testInjectionPresent!=='boolean'||
  typeof original.rawCaptured!=='boolean'||
  original.worldWrites!==0||original.worldContacts!==0||
  original.constructionApproved!==false||original.executionAllowed!==false||
  original.readiness!=='NOT_PREPARED'||!Array.isArray(original.gates)||
  original.gates.length!==9||original.gates.some(x=>x!=='BLOCKED')||
  original.BuildPlan?.operations?.length!==0)
  fail('PREVIOUS_REPORT_UNTRUSTED_OR_UNSAFE');
 if(original.rawCaptured&&!hex(original.responseRawSha256))
  fail('PREVIOUS_RAW_HASH_MISSING');
 if(original.status==='HOLD_TEST_DOUBLE_NOT_REAL_MODEL'&&
  original.testInjectionPresent!==true)
  fail('TEST_DOUBLE_IDENTITY_CONFLICT');
 if(original.status==='SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED'&&
  original.testInjectionPresent===true)
  fail('SYNTHETIC_REAL_SOURCE_CONFLICT');
 const marked=[original.promptProtocol,request.promptProtocol,
  original.systemPromptSha256,request.systemPromptSha256]
  .some(x=>x!==undefined);
 if(marked){
  const allowed=['LEGACY_AUTHOR_CONTRACT','V4J_SINGLE_RESPONSE_CONTRACT_CLARITY_V2',
   'V4J_SINGLE_RESPONSE_SCHEMA_GUIDED_V3',
   'V4J_SINGLE_RESPONSE_FEASIBLE_MASSING_V4',V4J_ENTRY_FIRST_PROTOCOL];
  if(!allowed.includes(original.promptProtocol)||
   original.promptProtocol!==request.promptProtocol||
   !hex(original.systemPromptSha256)||
   original.systemPromptSha256!==request.systemPromptSha256||
   (['V4J_SINGLE_RESPONSE_CONTRACT_CLARITY_V2',
     'V4J_SINGLE_RESPONSE_SCHEMA_GUIDED_V3',
     'V4J_SINGLE_RESPONSE_FEASIBLE_MASSING_V4',V4J_ENTRY_FIRST_PROTOCOL].includes(original.promptProtocol)&&
    original.authorContract!==CIVIC_ARCADE_SCHEMA)||
   (['V4J_SINGLE_RESPONSE_SCHEMA_GUIDED_V3',
     'V4J_SINGLE_RESPONSE_FEASIBLE_MASSING_V4',V4J_ENTRY_FIRST_PROTOCOL].includes(original.promptProtocol)&&
    (!hex(original.structuredSchemaSha256)||
     original.structuredSchemaSha256!==request.structuredSchemaSha256)))
   fail('PROMPT_PROTOCOL_MANIFEST_MISMATCH');
 }
 return {root:p,original,request};
}
function checkedDestination(dest,source){
 if(typeof dest!=='string'||dest.length<2)fail('OUTPUT_DIRECTORY');
 const out=path.resolve(dest),parent=path.dirname(out);
 try{fs.lstatSync(out);fail('OUTPUT_ALREADY_EXISTS');}
 catch(e){if(String(e?.message??e).includes('OUTPUT_ALREADY_EXISTS'))throw e;
  if(e?.code!=='ENOENT')fail('OUTPUT_LOCATION_INACCESSIBLE');}
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
  fs.lstatSync(parent).isSymbolicLink())fail('OUTPUT_PARENT_UNSAFE');
 const realParent=fs.realpathSync(parent);
 if(within(out,ROOT)||within(realParent,fs.realpathSync(ROOT))||
  within(out,source)||within(realParent,source))
  fail('OUTPUT_MUST_BE_NEW_AND_OUTSIDE_REPO_AND_SOURCE');
 return out;
}
export function parseV4DReplayArgs(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 if(args.length!==4||args[0]!=='--study'||args[2]!=='--out'||
  !args[1]||!args[3])fail('ARGS_EXPECT_STUDY_AND_NEW_OUT');
 return {study:args[1],out:args[3]};
}
export function replayPrivateV4D(study,out){
 const {root,original,request}=openStudy(study);
 const destination=checkedDestination(out,root);
 fs.mkdirSync(destination);
 let authorDiagnostic=null;
 const report={
  schema:REPLAY_SCHEMA,
  status:'HOLD_NOT_REPLAYED',
  originalRunStatus:original.status,
  originalPromptProtocol:original.promptProtocol??'LEGACY_UNVERSIONED',
  originalSystemPromptSHA256:hex(original.systemPromptSha256)?original.systemPromptSha256:null,
  protocolIsManifestDeclaredNotModelAttested:true,
  originalTestInjectionPresent:original.testInjectionPresent,
  originalModelCalls:original.modelCalls,
  additionalModelCalls:0,
  rawTextWasCopiedToOutput:false,
  inputFileChanged:false,
  originalRawSHA256:hex(original.responseRawSha256)?
   original.responseRawSha256:null,
  sourceCodeSHA256Original:hex(original.sourceSha256)?original.sourceSha256:null,
  geometrySHA256Original:hex(original.geometrySha256)?original.geometrySha256:null,
  sourceCodeSHA256Replayed:null,
  geometrySHA256Replayed:null,
  originalResponseIntegrity:'NOT_CHECKED',
  originalCompilerHashesMatch:null,
  humanArt:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',
  modelIdentityCryptographicallyAttested:false,
  modelSizeAndMacTrial:'NOT_TESTED',
  worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  failureCategory:classifyPrivateV4DFailure(original.reason),
  compilerRejectCode:null
 };
 try{
  if(!original.rawCaptured||original.modelCalls===0){
   report.status='HOLD_NO_SAVED_ORIGINAL_MODEL_TEXT';
   return report;
  }
  const raw=loadPrivateFile(root,'MODEL_RESPONSE_ORIGINAL.txt',250000);
  if(sha(raw)!==original.responseRawSha256){
   report.originalResponseIntegrity='SHA256_MISMATCH';
   report.status='HOLD_TAMPERED_ORIGINAL_RESPONSE';
   return report;
  }
  report.originalResponseIntegrity='SHA256_MATCH';
  if(original.modelFinishReason!=='stop'){
   report.status='HOLD_ORIGINAL_MODEL_NOT_COMPLETED';
   return report;
  }
  let author;
  try{author=JSON.parse(raw);}
  catch{
   authorDiagnostic=diagnosePrivateV4DInvalidJSON(original.authorContract);
   report.status='HOLD_ORIGINAL_MODEL_INVALID_JSON';
   return report;
  }
  let compiled;
  try{
   const originalForCompiler=original.promptProtocol===V4J_ENTRY_FIRST_PROTOCOL?
    materializeV4JEntryFirstAuthor(author):author;
   authorDiagnostic=diagnosePrivateV4DAuthor(originalForCompiler,original.authorContract);
   compiled=original.authorContract===CIVIC_ARCADE_SCHEMA?
      compileCivicArcadeAuthorIntent(originalForCompiler):
     original.authorContract===MEZZANINE_SCHEMA?
     compileMezzanineAuthorIntent(author):
    original.authorContract===HEIGHT_SCHEMA?
    compileHeightAuthorIntent(author):
    original.authorContract===FLOORPLATE_SCHEMA?
    compileFloorplateAuthorIntent(author):
    original.authorContract===WING_SCHEMA?
    compileWingAuthorIntent(author):
    original.authorContract===MASSING_SCHEMA?
    compileMassingAuthorIntent(author):
    original.authorContract===SECTIONED_SCHEMA?
    compileSectionedAuthorIntent(author):
    original.authorContract===RANKED_SCHEMA?
    compileRankedExteriorIntent(author):
    original.authorContract===COMPACT_SCHEMA?
    compileCompactModelIntent(author):compileRelativeAuthorIntent(author);
  }catch(e){
   report.status='HOLD_REPLAY_SOURCE_REJECTED';
   report.failureCategory=classifyPrivateV4DFailure(String(e?.message??e));
   report.compilerRejectCode=classifyPrivateCompilerRejection(String(e?.message??e));
   return report;
  }
  const result=compiled.b143;
  report.sourceCodeSHA256Replayed=result.sourceSha256;
  report.geometrySHA256Replayed=result.geometrySha256;
  const wasSourceApproved=[
   'SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED',
   'HOLD_TEST_DOUBLE_NOT_REAL_MODEL'
  ].includes(original.status);
  if(!wasSourceApproved){
   report.status='HOLD_PREVIOUSLY_FAILED_BUT_CURRENT_COMPILER_ACCEPTS';
   return report;
  }
  if(!hex(original.sourceSha256)||!hex(original.geometrySha256)||
   original.sourceRoutesStatus!=='SOURCE_ROUTES_REACH_ALL_ZONES'){
   report.status='HOLD_ORIGINAL_SOURCE_PROOF_INCOMPLETE';
   return report;
  }
  const matched=original.sourceSha256===result.sourceSha256&&
   original.geometrySha256===result.geometrySha256;
  report.originalCompilerHashesMatch=matched;
  if(!matched){
   report.status='HOLD_RECOMPILED_GEOMETRY_OR_SOURCE_CHANGED';
   return report;
  }
  // Only a byte-for-byte hash-agreeing original SOURCE pass may receive a new
  // inspectable viewer. Even then this is never architectural ART approval.
  const template=fs.readFileSync(
   path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
  const html=renderB143Html(
   compileB143Gallery([result.design]),template);
  write(destination,'TRUE_B143_REPLAY_SOURCE.json',result.design);
  write(destination,'REPLAY_SOURCE_ROUTES.json',result.sourceRoutes);
  write(destination,'index.html',html);
  report.replayedTrueB143VoxelCount=result.compiled.primitives.length;
  report.status=original.testInjectionPresent?
   'HOLD_TEST_DOUBLE_REPLAY_ONLY':
   'SOURCE_REPRODUCED_OFFLINE_ART_NOT_REVIEWED';
  return report;
 }finally{
  if(authorDiagnostic){
   report.structuralDiagnosticIssueCodes=authorDiagnostic.issues.map(x=>x.code)
    .filter((code,index,all)=>all.indexOf(code)===index);
   report.structuralDiagnosticIssueCount=authorDiagnostic.issues.length;
   write(destination,'AUTHOR_SOURCE_DIAGNOSTIC.json',authorDiagnostic);
  }
  // Deliberately no copy of the private model raw, prompts, model paths,
  // absolute source paths, or original private error text.
  write(destination,'OFFLINE_REPLAY_REPORT.json',report);
  write(destination,'REPLAY_SHAREABLE_STATUS.json',{
   schema:'minecraftaibuilder-v4d-offline-replay-minimal-share-v1',
   replayStatus:report.status,
   originalPromptProtocol:report.originalPromptProtocol,
   originalSystemPromptSHA256:report.originalSystemPromptSHA256,
   protocolIsManifestDeclaredNotModelAttested:true,
   additionalModelCalls:0,originalModelIdentityAttested:false,
   originalIsTestInjection:original.testInjectionPresent,
   inputResponseIntegrity:report.originalResponseIntegrity,
   originalCompilerHashesMatch:report.originalCompilerHashesMatch,
   sourceSha256:report.sourceCodeSHA256Replayed,
   geometrySha256:report.geometrySHA256Replayed,
   failureCategory:report.failureCategory,
   compilerRejectCode:report.compilerRejectCode,
   structuralIssueCodes:report.structuralDiagnosticIssueCodes??[],
   structuralIssueCount:report.structuralDiagnosticIssueCount??null,
   structuralDataDerivedOnlyFromShaVerifiedOriginal:!!authorDiagnostic,
   humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
   sourceIsNotMinecraftConstruction:true,worldWrites:0,
   noOriginalPromptOrResponseIncluded:true
  });
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseV4DReplayArgs(process.argv.slice(2));
  if(args.help)console.log('node scripts/r125-v4d-replay-private.mjs --study EXISTING_PRIVATE_STUDY_DIR --out NEW_PRIVATE_REPLAY_DIR (0 model calls, no Minecraft world I/O)');
  else{
   const result=replayPrivateV4D(args.study,args.out);
   console.log(JSON.stringify({status:result.status,
    additionalModelCalls:result.additionalModelCalls,
    originalResponseIntegrity:result.originalResponseIntegrity,
    sourceHashesMatch:result.originalCompilerHashesMatch,
    worldWrites:0}));
   if(!['SOURCE_REPRODUCED_OFFLINE_ART_NOT_REVIEWED',
    'HOLD_TEST_DOUBLE_REPLAY_ONLY'].includes(result.status))
    process.exitCode=2;
  }
 }catch(e){console.error('R125_V4D_OFFLINE_REPLAY_HOLD',String(e?.message??e));process.exitCode=2;}
}
