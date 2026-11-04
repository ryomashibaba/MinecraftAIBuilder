/**
 * Offline follow-up to the existing five-genre PRIVATE author batch.
 * Replays each ORIGINAL saved local response via the existing R125 V4D
 * fail-closed replay boundary. No model requests, network or world writes.
 *
 * This does not make a failed old SOURCE valid with a newer compiler.
 * Replay output remains PRIVATE; export only static issue codes, SOURCE
 * hashes and numeric true B143 projections in a separate safe summary.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FIVE_INDEPENDENT_BRIEFS} from './r125-v4j-five-genre-local.mjs';
import {replayPrivateV4D} from './r125-v4d-replay-private.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {compareV4IPrivateRealB143Silhouettes}
 from './r125-v4i-architectural-art-audit.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const error=x=>{throw Error('R125_V4J_FIVE_GENRE_PRIVATE_REPLAY_'+x);};
const within=(a,b)=>a===b||a.startsWith(b+path.sep);
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const code=x=>typeof x==='string'&&/^[A-Z][A-Z0-9_]{1,72}$/.test(x);
const safeIssueCodes=codes=>Array.isArray(codes)?
 [...new Set(codes.filter(code))].slice(0,24):[];
const regular=(fp,max)=>{
 const st=fs.lstatSync(fp);
 if(!st.isFile()||st.isSymbolicLink()||st.size<=0||st.size>max)
  error('PRIVATE_B143_FILE_NOT_REGULAR');
 return fs.readFileSync(fp,'utf8');
};

export function parseFiveGenreReplayArgs(args){
 if(args.length!==4||args[0]!=='--study'||args[2]!=='--out'||
  !args[1]||!args[3])error('ARGS_EXPECT_STUDY_AND_NEW_OUT');
 return {study:args[1],out:args[3]};
}

export function replayFiveGenrePrivateBatch(study,out){
 if(typeof study!=='string'||typeof out!=='string'||
  study.length<2||out.length<2)error('FOLDER_ARGS');
 const studyRoot=path.resolve(study),destination=path.resolve(out);
 const studyStat=fs.lstatSync(studyRoot);
 if(!studyStat.isDirectory()||studyStat.isSymbolicLink())
  error('ORIGINAL_BATCH_DIRECTORY_UNSAFE');
 const physicalStudy=fs.realpathSync(studyRoot);
 const physicalRepo=fs.realpathSync(ROOT);
 if(within(physicalStudy,physicalRepo))
  error('PRIVATE_BATCH_INSIDE_REPOSITORY');
 if(fs.existsSync(destination)||within(destination,physicalStudy))
  error('FRESH_SEPARATE_OUTPUT_REQUIRED');
 const destParent=path.dirname(destination);
 const parentStat=fs.lstatSync(destParent),physicalParent=fs.realpathSync(destParent);
 if(!parentStat.isDirectory()||parentStat.isSymbolicLink()||
  within(physicalParent,physicalRepo)||within(physicalParent,physicalStudy))
  error('OUTPUT_PARENT_OUTSIDE_SOURCE_AND_REPOSITORY');
 fs.mkdirSync(destination);
 const outcomes=[],genuineSources=[];let replayAttempts=0;
 for(const item of FIVE_INDEPENDENT_BRIEFS){
  const folder=path.join(physicalStudy,item.genre);
  let status='NOT_ATTEMPTED',sourceReproduced=false,synthetic=false,
   structuralIssueCodes=[],originalResponseIntegrity='NOT_CHECKED';
  if(fs.existsSync(folder)){
   replayAttempts++;
   try{
    const info=fs.lstatSync(folder);
    if(!info.isDirectory()||info.isSymbolicLink())
     error('PRIVATE_GENRE_FOLDER_UNSAFE');
    const replayRoot=path.join(destination,item.genre);
    const report=replayPrivateV4D(folder,replayRoot);
    status=report.status;
    synthetic=report.originalTestInjectionPresent===true;
    originalResponseIntegrity=report.originalResponseIntegrity;
    structuralIssueCodes=safeIssueCodes(report.structuralDiagnosticIssueCodes);
    if(status==='SOURCE_REPRODUCED_OFFLINE_ART_NOT_REVIEWED'&&!synthetic){
     const file=path.join(replayRoot,'TRUE_B143_REPLAY_SOURCE.json');
     const parsed=JSON.parse(regular(file,1000000));
     const compiled=compileDesign(parsed);
     if(!hex(report.sourceCodeSHA256Original)||
      !hex(report.geometrySHA256Original)||
      report.originalCompilerHashesMatch!==true||
      compiled.sourceSha256!==report.sourceCodeSHA256Original||
      compiled.geometrySha256!==report.geometrySHA256Original||
      compiled.primitives.length<100)
      error('PRIVATE_SOURCE_RECOMPILE_INTEGRITY');
     genuineSources.push({genre:item.genre,primitives:compiled.primitives});
     sourceReproduced=true;
    }
   }catch{
    status='HOLD_REPLAY_INPUT_OR_SOURCE_INTEGRITY';
    sourceReproduced=false;
    // Error strings and all raw private text remain PRIVATE.
   }
  }
  outcomes.push({genre:item.genre,offlineStatus:status,
   originalResponseIntegrity,originalWasInjectedTestDouble:synthetic,
   independentRealSourceReproduced:sourceReproduced,structuralIssueCodes});
 }
 const codeIndex=new Map();
 for(const outcome of outcomes){
  for(const issue of outcome.structuralIssueCodes){
   if(!codeIndex.has(issue))codeIndex.set(issue,[]);
   codeIndex.get(issue).push(outcome.genre);
  }
 }
 const sharedSourceIssues=[...codeIndex.entries()]
  .filter(([,genres])=>genres.length>=2)
  .map(([issueCode,genres])=>({issueCode,genres,
   sameUnderlyingRootCauseProven:false}));
 let geometry={status:'INSUFFICIENT_INDEPENDENT_REAL_MODEL_SOURCES',
  caseCount:genuineSources.length,pairCount:0,
  humanArchitecturalArt:'NOT_REVIEWED',
  visualMetricPassThresholds:'UNDEFINED_DO_NOT_INVENT'};
 if(genuineSources.length>=2){
  try{geometry=compareV4IPrivateRealB143Silhouettes(genuineSources);}
  catch{geometry={status:'HOLD_OFFLINE_GEOMETRY_COMPARISON',
   caseCount:0,pairCount:0,humanArchitecturalArt:'NOT_REVIEWED',
   visualMetricPassThresholds:'UNDEFINED_DO_NOT_INVENT'};}
 }
 const summary={
  schema:'minecraftaibuilder-r125-v4j-five-genre-zero-model-call-offline-replay-v1',
  inputIsPrivateExistingOriginal:true,originalFilesMutated:false,
  additionalModelCalls:0,networkCalls:0,worldContacts:0,worldWrites:0,
  attemptedOfflineReplays:replayAttempts,
  sourceReproducedCount:outcomes.filter(x=>x.independentRealSourceReproduced).length,
  outcomes,sharedSourceIssues,geometry,
  syntheticRunsNeverPromoted:true,
  noRawModelTextOrPromptsOrAbsolutePathsIncluded:true,
  userArtAssessment:'NOT_REVIEWED',realMinecraftWalking:'NOT_TESTED',
  modelIdentityCryptographicallyAuthenticated:false,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')
 };
 fs.writeFileSync(path.join(destination,'FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json'),
  JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 return summary;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const o=parseFiveGenreReplayArgs(process.argv.slice(2));
  const r=replayFiveGenrePrivateBatch(o.study,o.out);
  console.log(JSON.stringify({replayed:r.attemptedOfflineReplays,
   genuineSourceReproduced:r.sourceReproducedCount,
   sharedIssueGroups:r.sharedSourceIssues.length,
   modelCalls:0,worldWrites:0,
   onlyShare:'FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json'}));
 }catch(e){
  console.error('R125_V4J_FIVE_GENRE_OFFLINE_REPLAY_HOLD',
   String(e?.message??e).replace(/(?:[A-Za-z]:\\|\/)[^\s]*/g,'[private]'));
  process.exitCode=2;
 }
}
