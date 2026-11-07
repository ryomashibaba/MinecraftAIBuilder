/** R162 same-input real stepped inhabited-room section comparison. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildR161} from './r161-real-comparison.mjs';
import {deriveR149EnvelopeExpression}
 from '../source/ai/r149-architectural-expression.mjs';
import {deriveR162RoomSectionMassing}
 from '../source/ai/r162-room-section-massing.mjs';
import {deriveR150FurnitureArticulation}
 from '../source/ai/r150-furniture-articulation.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
const fail=s=>{throw Error('R162_REVIEW_'+s)};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const upper=x=>x.compiled.primitives.filter(p=>p[1]>=6)
 .map(p=>p.slice(0,4).join(',')).sort();
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
export function buildR162Review(){
 const original=buildR161();
 const rows=original.results.map(item=>{
  const topology=item.id==='central'?'central-spine':item.id+'-gallery';
  const before=deriveR149EnvelopeExpression(item.featured,{
   plan:item.graph.plan,expressionIntent:{
    schema:'minecraftaibuilder-r151-envelope-intent-v1',
    entryHierarchy:'quiet',daylightStrategy:'even',roofEdge:'fine'
   }});
  const sectional=deriveR162RoomSectionMassing(before,{topologyIntent:topology});
  const after=deriveR150FurnitureArticulation(sectional);
  const report={
   id:item.id,title:item.label,
   originalR161Source:item.featured.sourceSha256,
   baselineSourceSha256:before.sourceSha256,
   baselineUpperSha256:hash(upper(before)),
   afterSourceSha256:after.sourceSha256,
   afterUpperSha256:hash(upper(after)),
   baselineVoxelCount:before.compiled.primitives.length,
   afterVoxelCount:after.compiled.primitives.length,
   sections:sectional.r162RoomSectionEvidence.upperRoomSections,
   sourceRoomCount:sectional.program[0].zones.length,
   reachableFeatures:after.sourceRouteAudit.featureAccess.length,
   allEquipmentServiceReachable:after.sourceRouteAudit.featureAccess.every(x=>
    x.reachableFromEntrance),
   allRoomRoutesReachable:after.sourceRouteAudit.zones.every(x=>
    x.reachedFromEntrance&&x.reachedTwoWidePadCount>0),
   fullR162Evidence:sectional.r162RoomSectionEvidence,
   realMinecraftWalking:'NOT_TESTED',humanArtReview:'ART_HOLD'
  };
  if(report.baselineUpperSha256===report.afterUpperSha256||
   !report.allRoomRoutesReachable||!report.allEquipmentServiceReachable)
   fail('NO_REAL_MASS_CHANGE_OR_BAD_ROUTES_'+item.id);
  return {...report,before,after};
 });
 const geometry=new Set(rows.map(x=>x.afterUpperSha256));
 if(geometry.size!==3)fail('UPPER_ROOM_MASS_STILL_CONVERGES');
 if(!rows.every(x=>x.sections.length===3&&
  x.sections.every(s=>s.clearHighInteriorArea>=35)&&
  x.fullR162Evidence.unmodifiedAllCellsY5AndBelow))
  fail('ROOM_SECTION_NOT_GENUINELY_USABLE');
 const report={
  schema:'r162-topology-to-real-upper-volume-review-v1',
  status:'SOURCE_UPPER_VOLUME_DISTINCT_ART_HOLD',
  provenance:'SAME_FIXED_SEMANTIC_PROGRAM_HOST_GEOMETRY_NOT_REAL_NEW_LLM',
  sourceOfBaseline:'R149_SAME_EXPLICIT_ENVELOPE_SETTINGS',
  sourceOfAfter:'R162_ROOM_WEIGHTS_AND_ACTUAL_ROOM_RANGES_PLUS_R150_FURNITURE',
  newModelCalls:0,
  originalArchivedModelEdited:false,
  originalR161ExteriorSame:true,
  r162UpperVolumeDistinctCount:geometry.size,
  actuallyOpenedHighRooms:9,
  sameMaterialsAndFurnitureIntent:true,
  technicalProgress:'ROOM_POSITION_AND_WEIGHTS_CHANGE_THE_ACTUAL_OCCUPIABLE_ROOFED_3D_MASS',
  artAndArchitecturalQualityStillUnverified:true,
  automaticArtWinner:'NONE',
  candidates:rows.map(({before,after,...details})=>details),
  humanArtReview:'ART_HOLD',
  realMinecraftWalking:'NOT_TESTED',
  constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldWrites:0,worldContacts:0
 };
 return {report,rows};
}
function page(report){
 const cards=report.candidates.map(x=>
  '<section><h2>'+esc(x.title)+'</h2>'+
  '<p>実室3・実設備3／屋根最高高さ '+Math.max(...x.sections.map(s=>s.roofY))+
  '／各高室の追加利用空間は証拠JSONで確認</p>'+
  '<iframe loading="lazy" src="'+x.id+'-after.html" title="'+esc(x.title)+' real B143"></iframe>'+
  '<p><a href="'+x.id+'-before.html">変更前B143</a> ／ '+
  '<a href="'+x.id+'-after.html">変更後B143</a></p></section>').join('');
 const entries=report.candidates.flatMap(x=>x.sections.map(s=>
  '<tr><td>'+esc(x.title)+'</td><td>'+esc(s.zoneId)+'</td><td>'+
  s.roomWeight+'</td><td>'+s.roofY+'</td><td>'+
  s.clearHighInteriorArea+'</td></tr>')).join('');
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>R162 建築の内部と外部を連動する実空間・実屋根比較</title>'+
 '<style>body{background:#101824;color:#eff4ff;font:14px/1.6 system-ui;padding:20px}'+
 '.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'+
 'section{background:#1e2e40;border-radius:12px;padding:14px;min-width:0}'+
 'iframe{width:100%;height:530px;border:1px solid #576a83;background:white}'+
 'table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #3d526c;text-align:left}'+
 'a{color:#9dd6fa}.warn{padding:12px;border-left:3px solid #d5ab63;background:#2e3444}'+
 '@media(max-width:1050px){.grid{grid-template-columns:1fr}}</style>'+
 '<h1>R162 | 使える高い室内と外観シルエットの連動</h1>'+
 '<p>同じ敷地30×32・3室・3設備・同一素材・入口・室の関係。R149の共通外装の前後を真正B143で比較。</p>'+
 '<p class="warn"><strong>ART HOLD / Minecraft施工BLOCKED。</strong>'+
 '実屋根上部の形状が3案で区別できても、美しく実用的な建物と認証したわけではありません。'+
 '今回のR162はモデル新規推論0回・ホスト由来の形状研究です。</p>'+
 '<div class="grid">'+cards+'</div>'+
 '<h2>高い実室内と実屋根の確認</h2>'+
 '<table><thead><tr><th>方式</th><th>部屋</th><th>意味IRの重み</th>'+
 '<th>実屋根高さ</th><th>追加の天井なし空間(床セル)</th></tr></thead><tbody>'+
 entries+'</tbody></table>'+
 '<p><a href="R162_INDEPENDENT_SOURCE_AUDIT.json">完全監査JSON</a>。'+
 '採光、雨仕舞い、建築全体の造形、Minecraft実歩行、人間の美術評価は未検証です。</p></html>';
}
export function saveR162Review(dir){
 if(typeof dir!=='string'||!dir.trim()||fs.existsSync(dir))fail('NO_OVERWRITE');
 const {report,rows}=buildR162Review();
 const template=fs.readFileSync(path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../source/ai/b143-viewer-template.html'),'utf8');
 const data=[
  ['index.html',page(report)],
  ['R162_INDEPENDENT_SOURCE_AUDIT.json',JSON.stringify(report,null,2)+'\n']];
 for(const r of rows){
  data.push([r.id+'-before.html',renderB143Html(
   compileB143Gallery([r.before.design]),template)]);
  data.push([r.id+'-after.html',renderB143Html(
   compileB143Gallery([r.after.design]),template)]);
  data.push([r.id+'-BEFORE-B143.json',JSON.stringify(r.before.design,null,2)+'\n']);
  data.push([r.id+'-AFTER-B143.json',JSON.stringify(r.after.design,null,2)+'\n']);
 }
 fs.mkdirSync(dir,{recursive:false});
 for(const [name,body] of data)fs.writeFileSync(path.join(dir,name),body,{flag:'wx'});
 return {report,files:data.map(x=>x[0])};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv.length!==2||argv[0]!=='--out')fail('USAGE_OUT_NEW_DIR');
  const {report,files}=saveR162Review(argv[1]);
  console.log(JSON.stringify({status:report.status,
   distinctUpperMass:report.r162UpperVolumeDistinctCount,
   realHighRooms:report.actuallyOpenedHighRooms,
   files:files.length,newLLMCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
