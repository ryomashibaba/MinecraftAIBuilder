/**
 * R58 independent frozen-brief quality comparison preparation.
 *
 * READS only the ORIGINAL model bytes and their already-saved audit files.
 * No model, world, network, original repair, automatic model-quality score,
 * externally verified reviewer claim, or source-to-block conversion.
 *
 * A "formal B143 PASS" is never labeled an architectural/human PASS.
 * Optional historical R48 evidence is accepted only if its raw bytes,
 * source prompt and evidence-chain hashes independently match.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {inspectR49GlobalConsistency}
 from '../source/ai/b198zr49-global-source-consistency.mjs';

export const SCHEMA='minecraftaibuilder-b198zr58-frozen-c01-dual-original-review-v1';
export const HISTORICAL_R48_ORIGINAL_SHA256=
 '38e58f92ce9e19c312c149f608a74c80147d6508480cb219e0393e63e6451d0c';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B198ZR58_'+x)};
const c01=CREATION_CASES.find(x=>x.id==='c01');
const baseline=['R48','R54'];
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
const refName=(tag,suffix)=>tag+'_'+suffix;
const normalFile=(dir,name)=>{
 const file=path.join(dir,name);
 if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||
  fs.lstatSync(file).isSymbolicLink())fail('MISSING_OR_UNSAFE_EVIDENCE_'+name);
 const b=fs.readFileSync(file);
 if(b.length<1||b.length>120000)fail('EVIDENCE_SIZE_HOLD_'+name);
 return b;
};
const json=(dir,name)=>{
 try{return JSON.parse(normalFile(dir,name).toString('utf8'))}
 catch(e){if(String(e).includes('B198ZR58_'))throw e;
  fail('INVALID_JSON_EVIDENCE_'+name);}
};
const errorCode=e=>String(e?.message??e).match(/(?:B143|B198[A-Z0-9]+)_[A-Z0-9_]+/)?.[0]??
 'UNCLASSIFIED_B143_FAILURE';
const compactArray=a=>Array.isArray(a)?a.length:null;
const exactStatus=raw=>{
 try{
  const parsed=JSON.parse(raw);
  const design=parsed?.design;
  const compiled=compileDesign(design);
  if(!verifyCompiled(design,compiled))
   return {status:'HOLD_B143_COMPILED_INTEGRITY',error:'B143_INTEGRITY'};
  return {status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
   error:null,finalVoxelCells:compiled.primitives?.length??null};
 }catch(e){
  return {status:'HOLD_B143_NOT_COMPILED',
   error:errorCode(e),finalVoxelCells:null};
 }
};
export function auditR58OriginalEvidence({dir,tag}={}){
 if(!baseline.includes(tag))fail('ONLY_R48_OR_R54_C01_SUPPORTED');
 if(typeof dir!=='string'||!path.isAbsolute(dir)||
  !fs.existsSync(dir)||!fs.lstatSync(dir).isDirectory()||
  fs.lstatSync(dir).isSymbolicLink())
  fail('ABSOLUTE_ORDINARY_EVIDENCE_DIR_REQUIRED');
 // Nothing is synthesized if response bytes / SHA chain is missing.
 const originalName=refName(tag,'ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
 const originalBytes=normalFile(dir,originalName);
 const raw=originalBytes.toString('utf8');
 if(!Buffer.from(raw,'utf8').equals(originalBytes))
  fail('NON_UTF8_RAW_NOT_COMPARABLE');
 const hash=sha(originalBytes);
 const capture=json(dir,refName(tag,'CAPTURE_RESULT.json'));
 const manifest=json(dir,refName(tag,'FINAL_EVIDENCE_MANIFEST.json'));
 const request=json(dir,refName(tag,'FROZEN_REQUEST.json'));
 if(capture.originalSaved!==true||manifest.originalRawCaptured!==true||
   manifest.oneTimeLock!=='CONSUMED'||
   capture.originalRawSha256!==hash||manifest.rawSha256!==hash)
  fail('EVIDENCE_SHA_CHAIN_MISMATCH_OR_UNCAPTURED');
 const promptSha=sha(Buffer.from(c01.prompt,'utf8'));
 if(request.caseId!=='c01'||request.originalPrompt!==c01.prompt||
  request.originalPromptSha256!==promptSha||
  manifest.c01PromptSha256!==promptSha||
  manifest.model!=='qwen3.8:27b')
  fail('FROZEN_C01_PROMPT_OR_MODEL_MISMATCH');
 const winAuditName=refName(tag,'WINDOWS_ORIGINAL_SHA_AUDIT.json');
 const auditPresent=fs.existsSync(path.join(dir,winAuditName));
 if(auditPresent){
  const audit=json(dir,winAuditName);
  if(audit.originalRawSha256!==hash||
   audit.status!=='SAVED_RAW_SHA_CHAIN_MATCHED_MODEL_QUALITY_UNVERIFIED')
   fail('WINDOWS_AUDIT_INCONSISTENT_OR_HOLD');
 }
 const r49=inspectR49GlobalConsistency(raw);
 const b143=exactStatus(raw);
 let parsed=null;
 try{parsed=JSON.parse(raw)}catch{}
 const elements=Array.isArray(parsed?.design?.elements)?parsed.design.elements:[];
 const shapes={};
 for(const e of elements){
  const s=typeof e?.shape==='string'?e.shape:'INVALID';
  shapes[s]=(shapes[s]??0)+1;
 }
 const destinations=compactArray(parsed?.spatialPlan?.destinations);
 const protectedVoids=compactArray(parsed?.spatialPlan?.protectedVoids);
 return {
  schema:SCHEMA,tag,rawSha256:hash,rawBytes:originalBytes.length,
  originalRawVerifiedAgainstSavedSHA:true,
  savedModelOriginIndependentlyAuthenticated:false,
  nativeResponseProvenActualOllama:false,
  frozenCase:'c01',frozenPromptSha256:promptSha,
  modelRequested:'qwen3.8:27b',
  nativeSchemaSha256:manifest.r47NativeSchemaSha256??null,
  guideSha256:tag==='R54'?manifest.r50ArchitectureGuideSha256:
   request.guideSha256??null,
  windowsPostcaptureAuditPresent:auditPresent,
  b143,sourceElementCount:elements.length,sourceShapeCounts:shapes,
  modelDeclaredDestinations:destinations,
  modelDeclaredVoids:protectedVoids,
  r49Status:r49.status,
  r49IssueKinds:r49.issues?.map(x=>({
   kind:x.kind,count:x.count}))??[],
  r49OutOfBoundsElements:r49.elementBoundsViolations?.length??null,
  r49ImpossibleDeclaredRoutes:r49.impossiblePathDeclarations?.length??null,
  r49DuplicatedSpatialIds:r49.duplicatedR3Ids?.length??null,
  humanQualityAssessed:false,humanScore:null,
  physicalRouteEvidenceProvided:false,
  independentReviewerIdentityVerified:false,
  modelCalls:0,worldReads:0,worldWrites:0,safety:safe()
 };
}
const humanAxes=[
 {id:'LIBRARY_FUNCTION',briefCriterion:c01.criteria[0].description,
  inspect:'図書館として使える出入口・読書エリア・立体書架と通路が、最終3D/内観で実在するか'},
 {id:'CENTRAL_ATRIUM',briefCriterion:c01.criteria[1].description,
  inspect:'中央吹き抜けが最下層から屋根側まで実際に空気領域として連続し、後続ADDで埋まらないか'},
 {id:'UPPER_LOUNGE',briefCriterion:c01.criteria[2].description,
  inspect:'星空観察ラウンジが実際の上階に設けられ、床・頭上空間・上下移動手段を持つか'},
 {id:'CURVED_COHERENT_EXTERIOR',briefCriterion:c01.criteria[3].description,
  inspect:'曲線的な主要質量と外装・内部が一体であり、表面の説明文だけで済ませていないか'}
];
export function compareR58FrozenC01({r48Dir=null,r54Dir}={}){
 const candidate=auditR58OriginalEvidence({dir:r54Dir,tag:'R54'});
 const baselineEvidence=r48Dir===null?null:
  auditR58OriginalEvidence({dir:r48Dir,tag:'R48'});
 if(baselineEvidence&&baselineEvidence.rawSha256!==HISTORICAL_R48_ORIGINAL_SHA256)
  fail('R48_REPORTED_HISTORICAL_ORIGINAL_SHA_MISMATCH');
 const comparable=!!baselineEvidence;
 const shared=candidate.frozenPromptSha256===baselineEvidence?.frozenPromptSha256;
 if(comparable&&!shared)fail('FROZEN_PROMPTS_DIFFER');
 return {
  schema:SCHEMA,
  status:comparable?'COMPARISON_FACTS_READY_HUMAN_REVIEW_REQUIRED':
   'R54_EVIDENCE_ONLY_R48_RAW_REQUIRED',
  frozenCase:'c01',originalJapaneseBrief:c01.prompt,
  frozenIndependentHumanCriteria:humanAxes.map(a=>({
   ...a,assessment:'NOT_REVIEWED',
   evidenceRequired:'HUMAN_INSPECTION_OF_FINAL_VOXEL_3D_AND_USAGE',
   notInferredFromModelClaims:true
  })),
  candidate,baseline:baselineEvidence,
  historicalR48SHA:HISTORICAL_R48_ORIGINAL_SHA256,
  comparableSamePrompt:comparable&&shared,
  syntacticComparisonOnly:comparable,
  numericalArchitectureImprovementProven:false,
  aestheticsOrOriginalityCertified:false,
  realWorldBuildApproved:false,
  noModelInferenceUsed:true,anyModelAutoRepair:false,
  missingEvidence:comparable?[]:['R48_ORIGINAL_CAPTURE_AND_HASH_CHAIN'],
  modelCalls:0,worldReads:0,worldWrites:0,safety:safe()
 };
}
const htmlEsc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function renderR58HumanReviewPage(report){
 const cells=r=>r?[
  r.rawSha256,r.b143.status,r.b143.error??'—',
  r.sourceElementCount,JSON.stringify(r.sourceShapeCounts),
  r.r49OutOfBoundsElements??'不明',
  r.r49ImpossibleDeclaredRoutes??'不明',
  r.r49DuplicatedSpatialIds??'不明'
 ]:['原本未提出','未評価','—','—','—','—','—','—'];
 const labels=['原本SHA-256','B143','最初のB143エラー','形状要素数',
  '種類別要素数','範囲外要素','不可能な宣言経路','宣言ID重複'];
 const a=cells(report.baseline),b=cells(report.candidate);
 const rows=labels.map((label,i)=>'<tr><th>'+htmlEsc(label)+
  '</th><td>'+htmlEsc(a[i])+'</td><td>'+htmlEsc(b[i])+'</td></tr>').join('');
 const criteria=report.frozenIndependentHumanCriteria.map(v=>
  '<li><strong>'+htmlEsc(v.briefCriterion)+'</strong>：'+
  htmlEsc(v.inspect)+' — <em>未審査</em></li>').join('');
 return '<!doctype html><html lang="ja"><head><meta charset="UTF-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">'+
  '<title>R58 独立した建築品質比較</title>'+
  '<style>body{font-family:system-ui,sans-serif;max-width:1150px;margin:32px auto;padding:0 20px;color:#203246;background:#fbfcfd;line-height:1.65}h1{font-size:26px}main{background:#fff;border:1px solid #d4dde7;border-radius:10px;padding:22px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #dbe3ed;padding:10px;text-align:left;overflow-wrap:anywhere}th{background:#eff3f7}td{width:36%}.warning{background:#fff5e4;padding:13px;border:1px solid #e6c387;border-radius:7px}li{margin-bottom:14px}small{color:#526375}@media(max-width:600px){td,th{font-size:11px;padding:5px}}</style>'+
  '</head><body><main><small>MinecraftAIBuilder / R58 / frozen c01 / 原本保全</small>'+
  '<h1>図書館の設計をR48とR54で比較</h1>'+
  '<p class="warning">このレポートは自動で建築品質を合格認定しません。原本SHAの一致は提供者の真正性を証明しません。B143 PASSも、人が利用できる建築や美しさの証明ではありません。</p>'+
  '<h2>同じ日本語課題</h2><p>'+htmlEsc(report.originalJapaneseBrief)+'</p>'+
  '<h2>原本ベースの確認可能な事実</h2><table><thead><tr><th>比較軸</th><th>R48</th><th>R54</th></tr></thead><tbody>'+
  rows+'</tbody></table><h2>人間による独立評価が必要な項目</h2><ol>'+
  criteria+'</ol><p><strong>現状：</strong>'+htmlEsc(report.status)+'</p>'+
  '<p><small>原本の自動修正なし・モデル要求0・Minecraft接続0・施工0・NOT_PREPARED。レビューは未実施です。</small></p></main></body></html>';
}
export function writeR58Comparison({r48Dir=null,r54Dir,destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  fs.existsSync(destination)||
  !fs.existsSync(path.dirname(destination))||
  !fs.statSync(path.dirname(destination)).isDirectory())
  fail('NEW_ABSOLUTE_OUTPUT_DIR_REQUIRED');
 const report=compareR58FrozenC01({r48Dir,r54Dir});
 fs.mkdirSync(destination,{recursive:false});
 fs.writeFileSync(path.join(destination,'R58_C01_FAIR_REVIEW_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(destination,'R58_C01_HUMAN_REVIEW.html'),
  renderR58HumanReviewPage(report),{flag:'wx'});
 return {status:report.status,files:2,sourceEvidenceNotChanged:true,
  modelCalls:0,worldWrites:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==4&&a.length!==6)fail('CLI_ARGS');
  if(a[0]!=='--r54-dir'||a[2]!=='--out')fail('CLI_ARGS');
  if(a.length===6&&a[4]!=='--r48-dir')fail('CLI_ARGS');
  console.log(JSON.stringify(writeR58Comparison({
   r54Dir:a[1],destination:a[3],r48Dir:a.length===6?a[5]:null
  })));
 }catch(e){
  console.error(String(e?.message??e).slice(0,160));
  process.exitCode=2;
 }
}
