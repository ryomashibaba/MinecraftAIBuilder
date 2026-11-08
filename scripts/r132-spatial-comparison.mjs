/**
 * R132: historical genuine Qwen shop vs corrected independent zone
 * relations, using the SAME R125 compiler, assembled feature engine,
 * independent R129 acceptance, and existing offline B143 viewer.
 * Caller-independent constraint is not credited as new LLM creativity.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {proposeR125ThresholdRepair} from '../source/ai/r125-entrance-repair.mjs';
import {deriveR132SpatialPlan,SCHEMA} from '../source/ai/r132-spatial-relations.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
import {auditR129FunctionalAcceptance,SCHEMA as ACCEPT}
 from '../source/ai/r125-functional-acceptance.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reject=s=>{throw Error('R132_VISUAL_'+s);};
const shopFile='r125-qwen14b-shop-20261024.json';
const QWEN_SHA='05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d';
const features=[
 {id:'merch-a',zoneId:'front-retail-space',role:'display-stand',
  corner:'far-left',detail:'assembled'},
 {id:'staff-a',zoneId:'back-employee-space',role:'storage-rack',
  corner:'far-right',detail:'assembled'}
];
const order={id:'front-before-back-depth',nearZoneId:'front-retail-space',
 farZoneId:'back-employee-space',axis:'z'};
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
function indexPage(records){
 const cards=records.map(r=>'<section><h2>'+escape(r.title)+'</h2>'+
  '<p>'+r.voxels+' real B143 voxels · '+
   r.spatialOrderStatus+' · '+escape(r.sourceRouteStatus)+'</p>'+
  '<iframe loading="lazy" title="'+escape(r.title)+'" src="'+r.file+'"></iframe>'+
  '<p><a href="'+r.file+'" target="_blank" rel="noopener">'+
  '独立3Dを開く</a></p></section>').join('');
 return '<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R132 Actual spatial intent comparison</title>'+
  '<style>body{font:15px/1.7 system-ui;padding:clamp(12px,3vw,28px);'+
  'margin:0;background:#0d1827;color:#eff7ff}.grid{display:grid;'+
  'grid-template-columns:repeat(3,minmax(280px,1fr));gap:12px}'+
  'section{min-width:0;padding:12px;border-radius:12px;background:#1c2d42}'+
  'iframe{width:100%;height:440px;border:1px solid #45627a}'+
  'a{color:#8ad8ff}@media(max-width:980px){.grid{grid-template-columns:1fr}}</style>'+
  '</head><body><h1>R132｜部屋の前後関係を実3Dに反映</h1>'+
  '<p>左：保存済み実Qwen14B原本。中央：左右間取りのまま複合設備を追加。'+
  '右：独立した「手前/奥」の要求に沿って間取りIRを最小変更し、共通エンジンで再生成。</p>'+
  '<div class="grid">'+cards+'</div>'+
  '<p>修正は人/ホストの明示的な関係条件による派生案。'+
  'LLMが自力で間違いを理解・修正できた証拠ではありません。'+
  '実ワールド施工・プレイヤー歩行・美術評価は未実施です。</p>'+
  '<a href="R132_SPATIAL_EVIDENCE.json">原因・差分・未達要求の証拠JSON</a></body></html>';
}
export function buildR132SpatialComparison(){
 const raw=fs.readFileSync(path.join(ROOT,'scripts/fixtures',shopFile),'utf8');
 const original=compileArchitecturePlan(JSON.parse(raw));
 if(original.sourceSha256!==QWEN_SHA||
  original.compiled.primitives.length!==933)reject('ORIGINAL_CHANGED');
 const spatial=deriveR132SpatialPlan({original,requirements:{
  schema:SCHEMA,basePlanSha256:original.planSha256,zoneOrders:[order]}});
 const before=proposeR125ThresholdRepair(original).candidate;
 const corrected=spatial.candidateBase;
 const intent=base=>({
  schema:ASSEMBLED_SCHEMA,basePlanSha256:base.planSha256,
  objects:features
 });
 const existing=applyR125FeatureIntent({base:before,intent:intent(before)});
 const updated=applyR125FeatureIntent({base:corrected,intent:intent(corrected)});
 const requirement=base=>({schema:ACCEPT,basePlanSha256:base.planSha256,
  needs:features.map(f=>({id:'need-'+f.id,zoneId:f.zoneId,
   role:f.role,minCount:1,minAddedVoxels:8,minReachablePads:1})),
  zoneOrders:[order]});
 const previousAudit=auditR129FunctionalAcceptance({
  base:before,featured:existing,spec:requirement(before)});
 const updatedAudit=auditR129FunctionalAcceptance({
  base:corrected,featured:updated,spec:requirement(corrected)});
 const cases=[
  {id:'original',title:'元のQwen14B（左右間取り）',
   output:original,spatialOrderStatus:'NOT_MET',
   sourceRouteStatus:'ORIGINAL_SOURCE_RETAINED'},
  {id:'assembled-before',title:'複合設備追加のみ（前後未解決）',
   output:existing,spatialOrderStatus:'NOT_MET',
   sourceRouteStatus:existing.sourceRouteAudit.status},
  {id:'assembled-after',title:'前後の空間関係を修正した派生案',
   output:updated,spatialOrderStatus:'SOURCE_MATCH',
   sourceRouteStatus:updated.sourceRouteAudit.status}
 ];
 const template=fs.readFileSync(path.join(ROOT,
  'source/ai/b143-viewer-template.html'),'utf8');
 const records=[],pages=[];
 for(const item of cases){
  const file=item.id+'.html';
  pages.push({file,html:renderB143Html(
   compileB143Gallery([item.output.design]),template)});
  records.push({file,id:item.id,title:item.title,
   voxels:item.output.compiled.primitives.length,
   sourceSha256:item.output.sourceSha256,
   geometrySha256:item.output.geometrySha256,
   spatialOrderStatus:item.spatialOrderStatus,
   sourceRouteStatus:item.sourceRouteStatus});
 }
 pages.unshift({file:'index.html',html:indexPage(records)});
 return {schema:'r132-source-spatial-repair-3d-v1',
  records,pages,spatial:{
   status:spatial.status,changedLevels:spatial.changedLevels,
   before:spatial.before,after:spatial.after,
   originalSourceSha256:spatial.originalSourceSha256,
   derivedPlanSha256:spatial.derivedPlanSha256,
   derivedSourceSha256:spatial.derivedSourceSha256,
   entranceRepairSourceChanged:spatial.entranceRepairSourceChanged},
  previousIndependent:{status:previousAudit.status,
   unmet:previousAudit.unmetIds},
  correctedIndependent:{status:updatedAudit.status,
   unmet:updatedAudit.unmetIds},
  originalQwenSourceImmutable:original.sourceSha256===QWEN_SHA,
  provenance:'HUMAN_INDEPENDENT_SPATIAL_INTENT_NOT_LLM_REINFERENCE',
  modelCalls:0,aestheticReview:'NOT_REVIEWED',
  inGameWalking:'NOT_TESTED',
  worldWrites:0,worldContacts:0,
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
}
export function saveR132SpatialComparison(dest){
 if(typeof dest!=='string'||!dest.trim())reject('OUTPUT_REQUIRED');
 const folder=path.resolve(dest);
 if(fs.existsSync(folder))reject('NO_OVERWRITE');
 const data=buildR132SpatialComparison();
 fs.mkdirSync(folder,{recursive:false});
 for(const page of data.pages)
  fs.writeFileSync(path.join(folder,page.file),page.html,{flag:'wx'});
 fs.writeFileSync(path.join(folder,'R132_SPATIAL_EVIDENCE.json'),
  JSON.stringify({...data,pages:data.pages.map(x=>x.file)},null,2)+'\n',
  {flag:'wx'});
 return data;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv.length!==2||argv[0]!=='--out')reject('CLI');
  const result=saveR132SpatialComparison(argv[1]);
  console.log(JSON.stringify({status:result.spatial.status,
   changedLevels:result.spatial.changedLevels,
   before:result.previousIndependent,
   after:result.correctedIndependent,
   worldWrites:result.worldWrites}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
