/**
 * Export existing completed V3 evidence as ONE uploadable PNG.
 * Fully offline. Zero Ollama POSTs, zero world contacts, no changes to old
 * 4+1 model evidence and no re-inference. SHA replays true original B143.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectFailedOnlyV3Evidence}
 from './r125-v3-failed-only-home-recovery.mjs';
import {compileFunctionalFacadeV3}
 from '../source/ai/r125-functional-facade-v3.mjs';
import {renderFiveGenreSourceEvidence}
 from './r125-five-genre-source-art-overview.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('R125_SAVED_OVERVIEW_'+s)};
function safeRead(dir,name){
 const p=path.join(dir,name);
 const st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>150000)
  fail('INVALID_EVIDENCE_FILE_'+name);
 return fs.readFileSync(p,'utf8');
}
function safeDir(p){
 if(typeof p!=='string'||!path.isAbsolute(p))fail('PATH_NOT_ABSOLUTE');
 const stat=fs.lstatSync(p);
 if(!stat.isDirectory()||stat.isSymbolicLink())fail('FOLDER_SYMLINK');
 return fs.realpathSync(p);
}
export function exportSavedFiveGenreOverview(
 {studyDir,diagnosticFile,envelopeDir,functionsDir,recoveryDir,outDir}={}){
 if(typeof outDir!=='string'||!path.isAbsolute(outDir)||fs.existsSync(outDir))
  fail('OUTPUT_DIR_INVALID');
 const frozen=inspectFailedOnlyV3Evidence({
  studyDir,diagnosticFile,envelopeDir,functionsDir});
 const previous=safeDir(recoveryDir);
 const out=path.resolve(outDir);
 if(path.dirname(out)!==path.dirname(frozen.source.study)||
    path.dirname(previous)!==path.dirname(frozen.source.study)||
    out===previous||out.startsWith(previous+path.sep))
  fail('PRIVATE_SIBLING_OUTPUT_REQUIRED');
 const recoveryRaw=safeRead(previous,'FAILED_ONLY_RECOVERY_REPORT.json');
 const report=JSON.parse(recoveryRaw);
 const original=frozen.cases[0];
 const fake=report.testInjectionPresent===true;
 if(report.schema!=='r125-v3-failed-only-single-home-v1'||
    !['FIVE_FUNCTIONAL_SOURCE_CANDIDATES_ART_HOLD',
      'HOLD_TEST_DOUBLE_NOT_REAL_MODEL'].includes(report.status)||
    (fake&&report.status!=='HOLD_TEST_DOUBLE_NOT_REAL_MODEL')||
    (!fake&&report.status!=='FIVE_FUNCTIONAL_SOURCE_CANDIDATES_ART_HOLD')||
    report.sourceStudySha256!==frozen.source.originalReportSha256||
    report.diagnosticSha256!==frozen.source.diagnosticSha256||
    report.originalFailedBatchSha256!==frozen.oldReportSha256||
    report.originalHomeRawSha256!==original.rawSha256||
    report.originalHomeStatus!=='HOLD_MODEL_FUNCTION_IR'||
    report.originalHomeReason!=='R125_FUNCTIONAL_TOP_LEVEL'||
    report.oldHomeStatusPreserved!==true||
    report.originalHomeOriginalRawNeverEdited!==true||
    report.reusedVerifiedSources!==4||
    report.modelCalls!==1||report.sourceReadyCount!==5||
    report.worldWrites!==0||report.worldContacts!==0||
    report.art!=='NOT_REVIEWED'||report.minecraft!=='NOT_TESTED'||
    report.cases?.length!==5||report.gates?.length!==9||
    report.gates.some(x=>x!=='BLOCKED')||
    report.BuildPlan?.operations?.length!==0)
  fail('RECOVERY_REPORT_PROVENANCE');
 const homeDir=safeDir(path.join(previous,'cases','home'));
 const homeRaw=safeRead(homeDir,'NEW_HOME_MODEL_RESPONSE_ORIGINAL.txt');
 if(hash(homeRaw)!==report.newHomeRawSha256)
  fail('NEW_HOME_ORIGINAL_RAW_SHA_DRIFT');
 let intent;try{intent=JSON.parse(homeRaw)}
 catch{fail('NEW_HOME_ORIGINAL_JSON')}
 const product=compileFunctionalFacadeV3({
  originalPlan:original.spatial.plan,
  envelopeIntent:original.envelopeIntent,
  functionalIntent:intent});
 if(product.finalGeometrySha256!==report.homeRecoveredGeometrySha256||
    product.baseSpatialGeometrySha256!==original.spatial.geometrySha256||
    product.originalEnvelopeGeometrySha256!==original.envelope.geometrySha256||
    product.finalGeometrySha256!==report.cases[0].geometrySha256||
    product.finalSourceSha256!==report.cases[0].sourceSha256||
    report.cases[0].newModelCalls!==1)
  fail('HOME_REPLAY_GEOMETRY_DRIFT');
 const scenes=[];
 for(const [i,c] of frozen.cases.entries()){
  const row=report.cases[i],compiled=i===0?product:c.compiled;
  const expectedStatus=i===0?(fake?'HOLD_TEST_DOUBLE_NOT_REAL_MODEL':
   'NEW_FUNCTIONAL_SOURCE_ART_HOLD'):'REUSED_SHA_VERIFIED_ART_HOLD';
  if(!compiled||row?.id!==c.id||row.genre!==c.genre||
     row.status!==expectedStatus||
     row.originalRawSha256!==c.rawSha256||
     row.geometrySha256!==compiled.finalGeometrySha256||
     row.sourceSha256!==compiled.finalSourceSha256||
     row.newModelCalls!==(i===0?1:0)||
     row.worldWrites!==0)
   fail('FROZEN_FOUR_OR_HOME_ROW_DRIFT_'+c.id);
  scenes.push({id:c.id,base:c.envelope,final:compiled,
   status:row.status,finalGeometrySha256:compiled.finalGeometrySha256});
 }
 const preview=renderFiveGenreSourceEvidence(scenes,{
  ...report,modelCalls:0});
 const audit={schema:'r125-saved-v3-offline-overview-v1',
  status:fake?'TEST_DOUBLE_OFFLINE_PREVIEW_ONLY':
   'FIVE_VERIFIED_SOURCE_IMAGES_ART_HOLD',
  fourOldV3ModelsReused:4,newHomeV3ModelReplayed:1,
  additionalModelCalls:0,worldContacts:0,worldWrites:0,
  originalRecoveryReportSha256:hash(recoveryRaw),
  originalFailedBatchSha256:frozen.oldReportSha256,
  originalHomeRawSha256:original.rawSha256,
  newHomeRawSha256:hash(homeRaw),
  imageFile:'SOURCE_ART_OVERVIEW.png',
  imageSha256:preview.sha256,imageWidth:preview.width,
  imageHeight:preview.height,view:'front, side, top; same block scale',
  embeddedMetadata:preview.metadata,
  humanArt:'NOT_REVIEWED',minecraft:'NOT_TESTED',
  readiness:'NOT_PREPARED',BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED')};
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'SOURCE_ART_OVERVIEW.png'),
  preview.png,{flag:'wx'});
 fs.writeFileSync(path.join(out,'OVERVIEW_AUDIT_REPORT.json'),
  JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>5ジャンル SOURCE 一枚比較</title>'+
  '<style>body{background:#0c1b28;color:#eff5fa;font:16px system-ui;'+
  'max-width:1600px;margin:20px auto;padding:16px}img{width:100%;height:auto}'+
  'a{color:#8be3ef}</style><h1>5ジャンルSOURCE：スクリーンショット不要</h1>'+
  '<p>実Qwenの保存済み原本SHAを照合し、既存の3Dから自動生成。追加推論0。'+
  'Minecraft書込0。ARTは未承認。</p>'+
  '<p><a href="SOURCE_ART_OVERVIEW.png" download>比較PNGを1枚で保存・共有</a></p>'+
  '<img src="SOURCE_ART_OVERVIEW.png" alt="5棟の実SOURCE形状・同縮尺比較"></html>';
 fs.writeFileSync(path.join(out,'index.html'),html,{flag:'wx'});
 return audit;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==12||a[0]!=='--study'||a[2]!=='--diagnostic'||
     a[4]!=='--envelopes'||a[6]!=='--original-functions'||
     a[8]!=='--recovery'||a[10]!=='--out')fail('CLI_ARGS');
  const result=exportSavedFiveGenreOverview({
   studyDir:path.resolve(a[1]),diagnosticFile:path.resolve(a[3]),
   envelopeDir:path.resolve(a[5]),functionsDir:path.resolve(a[7]),
   recoveryDir:path.resolve(a[9]),outDir:path.resolve(a[11])});
  console.log(JSON.stringify({
   status:result.status,additionalModelCalls:0,worldWrites:0,
   imageFile:result.imageFile,imageSha256:result.imageSha256,
   allFive:result.embeddedMetadata.cases.map(c=>c.id)
  },null,2));
 }catch(e){console.error('R125_SAVED_OVERVIEW_HOLD',
  String(e.message??e));process.exitCode=2}
}
