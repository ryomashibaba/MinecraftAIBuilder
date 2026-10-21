/**
 * R60: preserve R59 original-chain evidence and supply honest offline
 * human visual review. B143 PASS -> R7 final abstract 3D.
 * B143 HOLD -> R51 uncompiled envelope diagram, never fake final voxels.
 * No model requests, world access, retries, repair or quality approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {writeR7OfflineVisualReview} from './b198zr7-offline-visual-review.mjs';
import {writeR51EnvelopeStoryboard} from './b198zr51-uncompiled-envelope-storyboard.mjs';
import {writeR61FinalVoxelSections} from './b198zr61-final-voxel-section-review.mjs';
import {writeR62FutureDesignGuidance} from './b198zr62-evidence-backed-revision-guidance.mjs';
import {writeR63ArchitecturalContinuity} from './b198zr63-architectural-continuity-watch.mjs';
import {writeR64UnclaimedFloorConnectivity} from './b198zr64-unclaimed-floor-connectivity.mjs';
import {writeR66OverheadSpace} from './b198zr66-overhead-space-audit.mjs';
import {writeR67SpatialContainment} from './b198zr67-spatial-containment-audit.mjs';
import {inspectR59Archive,reviewR59AlreadySavedZip}
 from './b198zr59-safe-result-zip-to-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr60-visual-human-review-v1';
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B198ZR60_'+s)};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldWrites:0});
function visual(z,evidence,stage){
 const bytes=z.selectedFiles.find(f=>f.name===
  z.tag+'_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt')?.bytes;
 if(!bytes||hash(bytes)!==evidence?.rawSha256)
  fail('R59_REPORT_RAW_SHA_MISMATCH');
 const raw=bytes.toString('utf8');
 if(!Buffer.from(raw,'utf8').equals(bytes))fail('NON_UTF8_ORIGINAL');
 let compiled=null,design=null;
 try{
  design=JSON.parse(raw).design;
  compiled=compileDesign(design);
  if(!verifyCompiled(design,compiled))compiled=null;
 }catch{compiled=null}
 if(Boolean(compiled)!==(evidence.b143.status===
  'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS'))
  fail('R58_B143_VERDICT_DISAGREES');
 const dirname=z.tag+(compiled?'_R7_FINAL_ABSTRACT_3D':'_R51_UNCOMPILED_ENVELOPES');
 const folder=path.join(stage,dirname);
 let kind,link,board=null,sections=null,guidance=null,independentFloor=null,overheadReview=null,containmentReview=null;
 if(compiled){
  fs.mkdirSync(folder);
  const r=writeR7OfflineVisualReview({
   design,compiled,destination:folder,caseId:'c01'});
  if(r.sourceSha256!==compiled.sourceSha256||
   r.geometrySha256!==compiled.geometrySha256)fail('R7_SHA_MISMATCH');
  const sectionReport=writeR61FinalVoxelSections({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  sections=dirname+'/'+sectionReport.relativeFile;
  const floor=writeR64UnclaimedFloorConnectivity({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  independentFloor=dirname+'/'+floor.relativeFile;
  const overhead=writeR66OverheadSpace({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  overheadReview=dirname+'/'+overhead.relativeFile;
  const containment=writeR67SpatialContainment({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  containmentReview=dirname+'/'+containment.relativeFile;
  kind='STRICT_B143_FINAL_ABSTRACT_VOXELS';
  link=dirname+'/index.html';
  board=dirname+'/B198W_REVIEW_BOARD.html';
 }else{
  const r=writeR51EnvelopeStoryboard({raw,destination:folder,caseId:'c01'});
  if(r.originalRawSha256!==evidence.rawSha256)fail('R51_SHA_MISMATCH');
  kind='UNCOMPILED_SHAPE_ENVELOPES_ONLY';
  link=dirname+'/R51_UNCOMPILED_SPATIAL_STORYBOARD.html';
 }
 const r61=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R61_FINAL_VOXEL_SPATIAL_EVIDENCE.json'),'utf8')):null;
 const r64=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R64_INDEPENDENT_FLOOR_NETWORK.json'),'utf8')):null;
 const r66=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R66_OVERHEAD_SPACE_EVIDENCE.json'),'utf8')):null;
 const r67=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R67_SURROUNDING_SPACE_EVIDENCE.json'),'utf8')):null;
 const next=writeR62FutureDesignGuidance({raw,
  expectedRawSha256:evidence.rawSha256,b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,destination:folder});
 guidance=dirname+'/'+next.relativeFile;
 return {tag:z.tag,originalRawSha256:evidence.rawSha256,
  evidenceType:kind,relativeViewer:link,relativeHumanBoard:board,
  relativeFunctionalSections:sections,
  relativeIndependentFloorReview:independentFloor,
  relativeOverheadSpaceReview:overheadReview,
  relativeContainmentReview:containmentReview,
  relativeFutureDesignGuidance:guidance,
  independentHumanReview:'NOT_PERFORMED',
  actualMinecraftPlayerWalkingVerified:false};
}
export function createR60VisualReview({r54Zip,r48Zip=null,destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  fs.existsSync(destination))fail('FRESH_ABSOLUTE_OUTPUT_REQUIRED');
 const parent=path.dirname(destination);
 if(!fs.existsSync(parent)||!fs.lstatSync(parent).isDirectory()||
  fs.lstatSync(parent).isSymbolicLink())fail('ORDINARY_PARENT_REQUIRED');
 const a=inspectR59Archive(r54Zip,{tag:'R54'});
 const b=r48Zip===null?null:inspectR59Archive(r48Zip,{tag:'R48'});
 if(b&&path.resolve(r48Zip)===path.resolve(r54Zip))
  fail('R48_AND_R54_MUST_DIFFER');
 const stage=fs.mkdtempSync(path.join(parent,'.r60-staging-'));
 try{
  const folder=path.join(stage,'R59_ORIGINAL_REVIEW');
  reviewR59AlreadySavedZip({r54Zip,r48Zip,destination:folder});
  const report=JSON.parse(fs.readFileSync(path.join(folder,
   'R58_C01_FAIR_REVIEW_REPORT.json'),'utf8'));
  const receipt=JSON.parse(fs.readFileSync(path.join(folder,
   'R59_ZIP_REVIEW_RECEIPT.json'),'utf8'));
  if(receipt.r54ZipSHA256!==a.archiveSHA256||
   receipt.r48ZipSHA256!==(b?.archiveSHA256??null)||
   !report.candidate||Boolean(report.baseline)!==Boolean(b))
   fail('R59_EVIDENCE_RECEIPT_MISMATCH');
  const views=[visual(a,report.candidate,stage)];
  if(b)views.unshift(visual(b,report.baseline,stage));
  let continuityReview=null;
  if(b){
   // R59 verifies the historical R48 original SHA before this comparison.
   const rawOf=z=>{
    const raw=z.selectedFiles.find(f=>
     f.name===z.tag+'_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
    if(!raw)fail('R63_ORIGINAL_MISSING');
    return raw.bytes.toString('utf8');
   };
   const result=writeR63ArchitecturalContinuity({
    beforeRaw:rawOf(b),beforeSha256:report.baseline.rawSha256,
    afterRaw:rawOf(a),afterSha256:report.candidate.rawSha256,
    destination:stage
   });
   continuityReview=result.relativeFile;
  }
  for(const z of [a,b].filter(Boolean)){
   const now=inspectR59Archive(z.tag==='R54'?r54Zip:r48Zip,{tag:z.tag});
   if(now.archiveSHA256!==z.archiveSHA256)fail('ZIP_CHANGED_DURING_REVIEW');
  }
  const manifest={schema:SCHEMA,
   status:'READY_FOR_INDEPENDENT_HUMAN_REVIEW_NOT_YET_REVIEWED',
   frozenCase:'c01',r59ComparisonStatus:report.status,
   r54ArchiveSha256:a.archiveSHA256,r48ArchiveSha256:b?.archiveSHA256??null,
   views,relativeContinuityReview:continuityReview,
   sourceZipsUnmodified:true,actualQwenOriginAuthenticated:false,
   geometryRepairPerformed:false,architectureQualityCertified:false,
   independentHumanReview:'NOT_PERFORMED',safety:safety()};
  const items=views.map(v=>'<li>'+v.tag+': <a href="'+
   v.relativeViewer+'">図面を開く</a> ('+v.evidenceType+')'+
   (v.relativeHumanBoard?' / <a href="'+v.relativeHumanBoard+
    '">人間審査ボード</a>':'')+
   (v.relativeFunctionalSections?' / <a href="'+v.relativeFunctionalSections+
    '">モデル宣言に基づく断面</a>':'')+
   (v.relativeIndependentFloorReview?' / <a href="'+v.relativeIndependentFloorReview+
    '">R64 全体の床と空間の独立調査</a>':'')+
   (v.relativeOverheadSpaceReview?' / <a href="'+v.relativeOverheadSpaceReview+
    '">R66 屋根下と開放空間の比較</a>':'')+
   (v.relativeContainmentReview?' / <a href="'+v.relativeContainmentReview+
    '">R67 屋根・壁と内部空間の手掛かり</a>':'')+
   (v.relativeFutureDesignGuidance?' / <a href="'+v.relativeFutureDesignGuidance+
    '">次回設計への根拠</a>':'')+'</li>').join('');
  const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
   '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
   '<title>R60 建築品質の人間審査</title>'+
   '<body style="font:16px/1.7 system-ui;max-width:850px;margin:32px auto;padding:0 18px">'+
   '<h1>R60 建築設計の実態を確認</h1>'+
   '<p>R7は最終概念ボクセルの3D。R51は未コンパイル形状の外接範囲のみ。'+
   '双方ともMinecraft施工・実際の歩行・美観・独創性の証明ではありません。</p>'+
   '<ul>'+items+'</ul>'+
   (continuityReview?'<p><a href="'+continuityReview+
    '">R63 元案から主要空間・造形が失われていないか確認</a></p>':'')+
   '<p><a href="R59_ORIGINAL_REVIEW/R58_C01_HUMAN_REVIEW.html">'+
   '原本比較と凍結した4つの人間品質審査項目</a></p>'+
   '<p>レビュー未実施。推論0、ワールド操作0、NOT_PREPARED、9 BLOCKED。</p></body></html>';
  fs.writeFileSync(path.join(stage,'R60_INDEX.html'),html,{flag:'wx'});
  fs.writeFileSync(path.join(stage,'R60_MANIFEST.json'),
   JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  if(fs.existsSync(destination))fail('OUTPUT_BECAME_OCCUPIED');
  fs.renameSync(stage,destination);
  return {status:manifest.status,views,modelCalls:0,worldWrites:0};
 }finally{if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true,force:true})}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(![4,6].includes(a.length)||a[0]!=='--r54-zip'||a[2]!=='--out'||
   (a.length===6&&a[4]!=='--r48-zip'))fail('CLI_FLAGS');
  console.log(JSON.stringify(createR60VisualReview({
   r54Zip:a[1],destination:a[3],r48Zip:a.length===6?a[5]:null})));
 }catch(e){console.error(String(e?.message??e).slice(0,220));process.exitCode=2}
}
