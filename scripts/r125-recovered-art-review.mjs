/**
 * MAB V11: recover a saved REAL local-model candidate after a HOST fix, then
 * render OLD versus RECOVERED true B143 SOURCE. ONE OFFLINE command, no model,
 * Minecraft world, network calls, changed original or published PRIVATE data.
 *
 * node scripts/r125-recovered-art-review.mjs --before-study PRIVATE/old-pass \
 *   --failed-study PRIVATE/new-failed --out PRIVATE/NEW_ART_REVIEW
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {writeArchitecturePlanReplay} from './r125-offline-replay.mjs';
import {saveB143ABReview} from './r125-static-art-review.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=s=>createHash('sha256').update(s).digest('hex');
const bad=m=>{throw Error('R125_RECOVERED_ART_'+m)};
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const file=(base,id,name)=>path.join(base,id,name);
const cleanPath=x=>{
 if(typeof x!=='string'||!x.trim())bad('PATH_REQUIRED');
 return path.resolve(x);
};
export function parseRecoveredArtArgs(args){
 if(args.length!==6)bad('REQUIRE_BEFORE_FAILED_OUT');
 const options={};
 for(let i=0;i<args.length;i+=2){
  const k=args[i],v=args[i+1];
  if(!['--before-study','--failed-study','--out'].includes(k)||
    options[k]!==undefined||!v||v.startsWith('--'))bad('INVALID_ARGUMENT');
  options[k]=cleanPath(v);
 }
 if(!options['--before-study']||!options['--failed-study']||!options['--out']||
  new Set(Object.values(options)).size!==3)bad('MISSING_OR_DUPLICATE_PATH');
 return {beforeStudy:options['--before-study'],
  failedStudy:options['--failed-study'],outDir:options['--out']};
}
/**
 * Both original author files remain byte-for-byte untouched.
 * Test model/brief equivalence via original saved REQUEST_ORIGINAL.txt, NOT
 * via potentially paraphrased plan.brief or similar-looking geometry.
 * The BASELINE SOURCE must actually be the one from the successful old batch.
 */
export function reviewRecoveredArchitecture({beforeStudy,failedStudy,outDir}={}){
 const oldRoot=cleanPath(beforeStudy),newRoot=cleanPath(failedStudy),
  out=cleanPath(outDir);
 const parent=path.dirname(out);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
    fs.existsSync(out))bad('NEW_OUTPUT_REQUIRED');
 if([oldRoot,newRoot,root].some(p=>out===p||out.startsWith(p+path.sep)))
  bad('OUTPUT_OVERLAPS_EXISTING_OR_REPOSITORY');
 const realParent=fs.realpathSync(parent);
 if(realParent===root||realParent.startsWith(root+path.sep))
  bad('OUTPUT_INSIDE_REPOSITORY');
 for(const study of [oldRoot,newRoot])
  if(!fs.existsSync(study)||!fs.statSync(study).isDirectory()||
   study===out||study.startsWith(out+path.sep))bad('STUDY_DIRECTORY_MISSING');
 const oldReport=readJson(path.join(oldRoot,'BATCH_REPORT.json'));
 const newReport=readJson(path.join(newRoot,'BATCH_REPORT.json'));
 const validBatch=(r,pass)=>r.schema==='r125-local-plan-batch-v1'&&
  r.planned===1&&r.attempted===1&&r.originalResponseCount===1&&
  r.automaticRetries===0&&r.worldWrites===0&&
  r.model==='qwen3:14b'&&Array.isArray(r.completed)&&r.completed.length===1&&
  r.completed[0].id==='tide-observatory'&&
  (pass? r.sourcePassCount===1&&r.allSourceVerified===true&&
   r.completed[0].sourceVerified===true:
   r.sourcePassCount===0&&r.allSourceVerified===false&&
   r.completed[0].sourceVerified===false);
 if(!validBatch(oldReport,true)||!validBatch(newReport,false)||
   oldReport.model!==newReport.model)
  bad('NOT_ONE_PASS_ONE_FAILED_SAME_MODEL');
 const id='tide-observatory';
 const oldRequest=fs.readFileSync(file(oldRoot,id,'REQUEST_ORIGINAL.txt'),'utf8');
 const newRequest=fs.readFileSync(file(newRoot,id,'REQUEST_ORIGINAL.txt'),'utf8');
 if(oldRequest.length<40||oldRequest!==newRequest)
  bad('MODEL_REQUEST_NOT_EXACTLY_THE_SAME');
 const oldRaw=fs.readFileSync(file(oldRoot,id,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
 const newRaw=fs.readFileSync(file(newRoot,id,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
 const oldSha=sha(oldRaw),newSha=sha(newRaw);
 if(oldReport.completed[0].originalSha256!==oldSha||
   newReport.completed[0].originalSha256!==newSha)
  bad('ORIGINAL_HASH_MISMATCH');
 const oldSourcePath=file(oldRoot,id,'B143_SOURCE_REVIEW_ONLY.json');
 const oldSource=readJson(oldSourcePath),oldCompiled=compileDesign(oldSource);
 if(!verifyCompiled(oldSource,oldCompiled)||
    oldCompiled.sourceSha256!==oldReport.completed[0].sourceSha256||
    oldCompiled.geometrySha256!==oldReport.completed[0].geometrySha256)
  bad('OLD_PASS_SOURCE_HASH_MISMATCH');
 // Only one new directory is allocated, after ALL preflight checks. This is
 // the SAME failed ORIGINAL now compiled with CURRENT verified HOST.
 fs.mkdirSync(out);
 const replayDir=path.join(out,'RECOVERED_SOURCE');
 const replay=writeArchitecturePlanReplay({
  '--raw':file(newRoot,id,'MODEL_RESPONSE_ORIGINAL.txt'),'--out':replayDir});
 const diagnosis=readJson(path.join(replayDir,'SOURCE_DIAGNOSIS.json'));
 const status=diagnosis.status;
 const result={schema:'r125-recovered-source-art-review-v1',
  originalRequestsIdentical:true,model:'qwen3:14b',
  before:{originalSha256:oldSha,sourceSha256:oldCompiled.sourceSha256,
   geometrySha256:oldCompiled.geometrySha256},
  after:{originalSha256:newSha,sourceSha256:diagnosis.sourceSha256??null,
   geometrySha256:diagnosis.geometrySha256??null,status,
   sourceVerified:diagnosis.sourceVerified===true,
   programFloorIssues:diagnosis.programFloorIssues??[]},
  modelCalls:0,retries:0,worldWrites:0,sourceOriginalsEdited:false,
  humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  abImage:null,artifactStatus:'HOLD'};
 if(replay.status==='B143_SOURCE_CANDIDATE_ART_HOLD'&&
   diagnosis.sourceVerified===true){
  const abDir=path.join(out,'AB_VISUAL_REVIEW');
  const ab=saveB143ABReview({beforeSourcePath:oldSourcePath,
   afterSourcePath:path.join(replayDir,'B143_SOURCE_REVIEW_ONLY.json'),
   outDir:abDir});
  if(ab.before.sourceSha256!==oldCompiled.sourceSha256||
   ab.after.sourceSha256!==diagnosis.sourceSha256||
   ab.after.geometrySha256!==diagnosis.geometrySha256)
   bad('AB_PROVENANCE_MISMATCH');
  result.abImage=path.join(abDir,ab.preview.file);
  result.abReport=path.join(abDir,'AB_REPORT.json');
  result.finalVoxelDifference=ab.finalVoxelDifference;
  result.artifactStatus='SOURCE_PASS_ART_REVIEW_READY';
 }
 fs.writeFileSync(path.join(out,'RECOVERY_ART_REPORT.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const opts=parseRecoveredArtArgs(process.argv.slice(2));
  const result=reviewRecoveredArchitecture(opts);
  console.log('R125_RECOVERED_SOURCE_ART',JSON.stringify(result));
  if(!result.abImage)process.exitCode=2;
 }catch(e){console.error('R125_RECOVERED_ART_HOLD',String(e?.message??e));process.exitCode=2;}
}
