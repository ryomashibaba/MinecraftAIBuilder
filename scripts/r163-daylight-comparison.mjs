/**
 * R163 independent 3 x paired genuine B143 art review.
 * Uses exact R162 produced 3D as BEFORE and actually glazed R163 AFTER.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildR162Review} from './r162-room-section-comparison.mjs';
import {deriveR163DaylitSections}
 from '../source/ai/r163-daylit-sections.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
const fail=x=>{throw Error('R163_AUDIT_'+x)};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
export function buildR163Review(){
 const original=buildR162Review();
 const candidates=original.rows.map(row=>{
  const before=row.after,after=deriveR163DaylitSections(before);
  const e=after.r163DaylightAndRoofEvidence;
  if(e.windowCount!==3||e.realGlassPaneCount<9||
   e.realRoomRoofCoverage.length!==3||
   after.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')
   fail('DAYLIT_ENCLOSED_SPACES_NOT_REAL');
  return {id:row.id,title:row.title,before,after,
   metrics:{id:row.id,title:row.title,
    originalR162SourceSha256:before.sourceSha256,
    derivedR163SourceSha256:after.sourceSha256,
    originalVoxelCount:before.compiled.primitives.length,
    daylitVoxelCount:after.compiled.primitives.length,
    geometricSourceChanged:before.geometrySha256!==after.geometrySha256,
    daylight:e,sourceRoutes:after.sourceRouteAudit.status,
    reachedFeatures:after.sourceRouteAudit.featureAccess.length,
    humanArtReview:'ART_HOLD'}};
 });
 if(!candidates.every(c=>c.metrics.geometricSourceChanged))
  fail('EXTERIOR_REMAINS_SAME');
 return {report:{
   schema:'r163-real-high-daylight-source-review-v1',
   status:'PHYSICAL_HIGH_GLAZING_AND_ROOM_ROOFS_VERIFIED_ART_HOLD',
   compareAgainst:'R162_TRUE_B143_INHABITED_HIGH_ROOMS',
   provenance:'SAME_SAVED_HOST_NEUTRAL_IR_NO_NEW_LOCAL_LLM_INFERENCE',
   cases:candidates.map(x=>x.metrics),
   newModelCalls:0,actualMinecraftWalking:'NOT_TESTED',
   exteriorWeatherSealing:'NOT_TESTED',
   independentHumanArtReview:'ART_HOLD',
   constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
   worldContacts:0,worldWrites:0
  },candidates};
}
function html(report){
 const cards=report.cases.map((x)=>
  '<section><h2>'+esc(x.title)+'</h2>'+
  '<p>屋根付の居室3室、実外向き高窓'+x.daylight.windowCount+
  '、実ガラスセル'+x.daylight.realGlassPaneCount+'</p>'+
  '<iframe loading="lazy" src="'+x.id+'-after.html" title="'+esc(x.title)+' genuine 3D"></iframe>'+
  '<p><a href="'+x.id+'-before.html">R162変更前3D</a> ／ '+
  '<a href="'+x.id+'-after.html">R163変更後3D</a> ／ '+
  '<a href="'+x.id+'-B143.json">実ソースJSON</a></p></section>'
 ).join('');
 const windows=report.cases.flatMap(x=>x.daylight.realClerestoryWindows.map(w=>
  '<tr><td>'+esc(x.title)+'</td><td>'+esc(w.zoneId)+'</td>'+
  '<td>'+esc(w.wall)+'</td><td>'+w.paneVoxelCount+'</td>'+
  '<td>'+w.highRoofY+'</td></tr>'
 )).join('');
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>R163 実高窓と屋根の空間品質監査</title>'+
 '<style>body{background:#101825;color:#e9f3ff;font:14px/1.65 system-ui;padding:18px}'+
 '.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'+
 'section{background:#1c2b3c;border-radius:11px;padding:14px;min-width:0}'+
 'iframe{width:100%;height:540px;border:1px solid #58728a;background:white}'+
 'table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #456079;text-align:left}'+
 'a{color:#9cddff}.hold{background:#2c3545;border-left:3px solid #eac576;padding:12px}'+
 '@media(max-width:1000px){.grid{grid-template-columns:1fr}}</style>'+
 '<h1>R163｜実高窓と居室につながった屋根</h1>'+
 '<p>敷地30×32、同じ3室・設備・材料・入室経路を固定した中央／西／東の同条件比較。'+
 '同じホスト設計のR162からR163で高窓のみ追加しました。</p>'+
 '<p class="hold"><strong>ART HOLD / 施工 BLOCKED。</strong>'+
 'これはB143ボクセル上の外向きガラス・高室天井・ソース動線の証拠です。'+
 '採光量の測定、雨仕舞い、建築の美しさ、Minecraft実歩行の認証ではありません。'+
 '新規モデル推論は0回です。</p>'+
 '<div class="grid">'+cards+'</div>'+
 '<h2>窓の実ジオメトリ</h2><table><thead><tr><th>構成</th><th>部屋</th>'+
 '<th>外壁</th><th>ガラスの実セル</th><th>屋根Y</th></tr></thead><tbody>'+
 windows+'</tbody></table>'+
 '<p><a href="R163_AUDIT.json">独立監査データ</a>。</p></html>';
}
export function saveR163Review(dir){
 if(typeof dir!=='string'||!dir.trim()||fs.existsSync(dir))
  fail('NO_OVERWRITE');
 const {report,candidates}=buildR163Review();
 const template=fs.readFileSync(path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../source/ai/b143-viewer-template.html'),'utf8');
 const files=[['index.html',html(report)],
  ['R163_AUDIT.json',JSON.stringify(report,null,2)+'\n']];
 for(const c of candidates){
  files.push([c.id+'-before.html',renderB143Html(
   compileB143Gallery([c.before.design]),template)]);
  files.push([c.id+'-after.html',renderB143Html(
   compileB143Gallery([c.after.design]),template)]);
  files.push([c.id+'-B143.json',JSON.stringify(c.after.design,null,2)+'\n']);
  files.push([c.id+'-VOXELS.json',JSON.stringify(c.after.compiled,null,2)+'\n']);
 }
 fs.mkdirSync(dir,{recursive:false});
 for(const [name,contents] of files)
  fs.writeFileSync(path.join(dir,name),contents,{flag:'wx'});
 return {report,files:files.map(x=>x[0])};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('USAGE_OUT_NEW_DIR');
  const out=saveR163Review(args[1]);
  console.log(JSON.stringify({status:out.report.status,
   variants:out.report.cases.length,
   realWindows:out.report.cases.reduce((n,x)=>n+x.daylight.windowCount,0),
   paneVoxelCount:out.report.cases.reduce((n,x)=>n+x.daylight.realGlassPaneCount,0),
   modelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
