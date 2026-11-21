/**
 * R52 — optional pre-archive post-capture hook for FUTURE authorized runners.
 *
 * The human runs ZERO extra commands: a future one-shot Windows runner may
 * invoke this ONCE after original response & audits have been saved and
 * BEFORE its existing Compress-Archive. The archive then automatically
 * includes the R51 visual storyboard even when B143 compilation FAILED.
 *
 * Does NOT patch immutable historical R25/R44/R46/R48 scripts, their ZIPs,
 * any original bytes or consent locks. No Ollama, models, browser, world APIs.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {writeR51EnvelopeStoryboard}
 from './b198zr51-uncompiled-envelope-storyboard.mjs';

export const SCHEMA='minecraftaibuilder-b198zr52-future-postcapture-zip-attachment-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR52_'+s)};
const safe=()=>({readiness:'NOT_PREPARED',
 constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0});
const readJson=file=>{
 const b=fs.readFileSync(file);
 if(b.length>300000)fail('AUDIT_FILE_TOO_LARGE');
 try{return JSON.parse(b.toString('utf8'))}
 catch{fail('AUDIT_FILE_NOT_JSON')}
};
const exactFile=file=>{
 if(!fs.existsSync(file))fail('REQUIRED_CAPTURE_FILE_MISSING');
 if(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())
  fail('REQUIRED_CAPTURE_FILE_NOT_ORDINARY');
 return file;
};

/**
 * Optionally adding preview after a completed STRICT B143 PASS is pointless:
 * its official R7 full voxel viewer should be preferred. Never produce
 * misleading bbox graphics as substitute for exact, successful geometry.
 *
 * A source's B143 failure is checked independently, not "trusted" from a
 * model's declared status. A malformed JSON also qualifies for a schematic
 * with no invented elements, provided all source hashes match.
 */
export function attachR52FailedSourceStoryboard({
 evidenceDir,caseId='c01'
}={}){
 if(typeof evidenceDir!=='string'||!evidenceDir.trim()||
  !path.isAbsolute(evidenceDir))fail('ABSOLUTE_EVIDENCE_DIRECTORY_REQUIRED');
 const dir=path.resolve(evidenceDir);
 if(!fs.existsSync(dir)||!fs.lstatSync(dir).isDirectory()||
  fs.lstatSync(dir).isSymbolicLink())fail('ORDINARY_CAPTURE_DIRECTORY_REQUIRED');
 const matches=fs.readdirSync(dir).filter(n=>
  /^R\d+_ORIGINAL_MODEL_RESPONSE_UNMODIFIED\.txt$/.test(n));
 if(matches.length!==1)fail('EXACTLY_ONE_IMMUTABLE_RAW_REQUIRED');
 const rawName=matches[0],tag=rawName.split('_')[0];
 const source=exactFile(path.join(dir,rawName));
 const rawSize=fs.statSync(source).size;
 if(rawSize<1||rawSize>120000)fail('ORIGINAL_RAW_SIZE_HOLD');
 const raw=fs.readFileSync(source,'utf8');
 const originalHash=hash(raw);
 const manifestPath=exactFile(path.join(dir,tag+'_FINAL_EVIDENCE_MANIFEST.json'));
 const capturePath=exactFile(path.join(dir,tag+'_CAPTURE_RESULT.json'));
 const capture=readJson(capturePath),manifest=readJson(manifestPath);
 if(capture.originalRawSha256!==originalHash||
   manifest.rawSha256!==originalHash||
   capture.originalSaved!==true||manifest.originalRawCaptured!==true)
  fail('ORIGINAL_SHA_CHAIN_MISMATCH_OR_NOT_CAPTURED');
 const winAudit=path.join(dir,tag+'_WINDOWS_ORIGINAL_SHA_AUDIT.json');
 if(fs.existsSync(winAudit)){
  const audit=readJson(exactFile(winAudit));
  if(audit.originalRawSha256!==originalHash)
   fail('WINDOWS_ORIGINAL_AUDIT_SHA_MISMATCH');
 }
 const productFolder=path.join(dir,'R52_FAILED_SOURCE_DIAGNOSTIC');
 const indexPath=path.join(dir,'R52_OPEN_FAILED_SOURCE_DIAGRAM.html');
 const reportPath=path.join(dir,'R52_DIAGNOSTIC_ATTACHMENT_RECEIPT.json');
 if([productFolder,indexPath,reportPath].some(f=>fs.existsSync(f)))
  fail('NEVER_OVERWRITE_EXISTING_R52_DERIVATIVE');
 // No B143-compatible design is turned into a failure preview.
 let b143Status='FAILED_B143',reason='UNCLASSIFIED_SOURCE_HOLD';
 try{
  const design=JSON.parse(raw)?.design;
  compileDesign(design);
  b143Status='STRICT_B143_COMPILED';
 }catch(e){
  reason=String(e?.message??e).match(/B143_[A-Z0-9_]+/)?.[0]??
   'INVALID_JSON_OR_B143_SOURCE';
 }
 if(b143Status==='STRICT_B143_COMPILED'){
  return {schema:SCHEMA,status:'SKIP_STRICT_B143_COMPILED_USE_R7_FULL_VOXEL_VIEWER',
   originalRawSha256:originalHash,archiveFilesAdded:0,
   modelCalls:0,worldWrites:0,safety:safe()};
 }
 const result=writeR51EnvelopeStoryboard({
  raw,destination:productFolder,caseId});
 // The outer directory is prepared by a trusted owner. The user can view
 // the derived HTML offline, or simply upload the ONE result ZIP to ChatGPT.
 const href='R52_FAILED_SOURCE_DIAGNOSTIC/R51_UNCOMPILED_SPATIAL_STORYBOARD.html';
 const index='<!doctype html><html lang="ja"><head><meta charset="UTF-8"><title>R52 建築診断図</title></head><body>'+
  '<h1>失敗した建築原本の配置図</h1><p>B143の正式コンパイルは不合格（'+reason+
  '）。この図は外接範囲の表示だけで、最終3Dや歩行可能性の証明ではありません。</p>'+
  '<p><a href="'+href+'">高さ別・正面図の診断を開く</a></p>'+
  '<p>原本SHA-256: '+originalHash+'</p></body></html>';
 fs.writeFileSync(indexPath,index,{flag:'wx'});
 const receipt={schema:SCHEMA,status:'ADDED_UNCOMPILED_SOURCE_DIAGNOSTIC_BEFORE_ZIP',
  originalRawSha256:originalHash,rawFile:rawName,
  exactB143Failure:reason,
  evidenceAlreadyAudited:true,originalBytesUnmodified:true,
  modelOutputNotReconstructed:true,
  derivedFiles:[
   'R52_OPEN_FAILED_SOURCE_DIAGRAM.html',
   'R52_FAILED_SOURCE_DIAGNOSTIC/R51_UNCOMPILED_SPATIAL_STORYBOARD.html',
   'R52_FAILED_SOURCE_DIAGNOSTIC/R51_SCHEMATIC_PROVENANCE.json',
   'R52_DIAGNOSTIC_ATTACHMENT_RECEIPT.json'
  ],
  r51Status:result.status,
  thisFunctionWritesZip:false,
  futureRunnerMustArchiveFolderAfterThisHook:true,
  noModelCalls:true,noMinecraft:true,
  humanAestheticQualityCertified:false,realNavigationCertified:false,
  modelCalls:0,worldWrites:0,safety:safe()};
 fs.writeFileSync(reportPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 if(hash(fs.readFileSync(source,'utf8'))!==originalHash)
  fail('ORIGINAL_CHANGED_AFTER_PREVIEW');
 return {schema:SCHEMA,status:receipt.status,
  originalRawSha256:originalHash,archiveFilesAdded:4,
  diagnosticFolder:productFolder,b143Reason:reason,
  receipt,modelCalls:0,worldWrites:0,safety:safe()};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--evidence-dir')
   fail('CLI_ABSOLUTE_EVIDENCE_DIR_ONLY');
  const result=attachR52FailedSourceStoryboard({evidenceDir:a[1]});
  console.log('R52_PRE_ZIP_DIAGNOSTIC',JSON.stringify({
   status:result.status,originalRawSha256:result.originalRawSha256,
   archiveFilesAdded:result.archiveFilesAdded,modelCalls:0,worldWrites:0
  }));
 }catch(e){
  console.error('R52_DIAGNOSTIC_HOLD',String(e?.message??e).slice(0,180));
  process.exitCode=2;
 }
}
