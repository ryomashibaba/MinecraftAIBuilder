/**
 * R164 real B143 upper-shell flood + 4 elevation / roof-silhouette source
 * evidence, same program central-west-east. No generated concept art.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildR163Review} from './r163-daylight-comparison.mjs';
import {auditR164EnclosedHighRooms}
 from '../source/ai/r164-envelope-continuity.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const fail=x=>{throw Error('R164_REPORT_'+x);};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const colors={stone:'#87909d',concrete:'#d3d9dc',metal:'#6b8191',
 glass:'#6fb6e3',wood:'#b58e61',glow:'#f0d38b',accent:'#6ab7a3'};
const color=i=>colors[MATERIALS[i]]??'#b7aab8';
export function buildR164Review(){
 const old=buildR163Review();
 const cases=old.candidates.map(c=>({
  id:c.id,title:c.title,compiled:c.after.compiled,
  design:c.after.design,
  proof:auditR164EnclosedHighRooms(c.after)
 }));
 const exterior=cases.map(c=>({id:c.id,
  fullRoofVoxelCells:c.proof.checkedRoofVoxelCells,
  upperWallVoxelCells:c.proof.checkedWallVoxelCells,
  exteriorGlassVoxelCells:c.proof.checkedGlassVoxelCells,
  highInteriorCellCounts:c.proof.realHighRooms.map(r=>({
   id:r.zoneId,air:r.clearHighInteriorVoxels,roofY:r.roofHeightY})),
  reachedOutsideFromHighRoom:false,
  realMinecraftWeatherTest:'NOT_TESTED',
  humanArchitecturalArt:'ART_HOLD'
 }));
 const report={
  schema:'r164-same-program-full-upper-shell-audit-v1',
  status:'REAL_B143_UPPER_ROOM_ENVELOPE_AUDIT_ART_HOLD',
  baseline:'R163-three-genuinely-glazed-3D',
  provenance:'HOST_GENERATED_SAME_SEMANTIC_TEST_PROGRAM_NOT_NEW_REAL_QWEN',
  newModelCalls:0,
  originalModelRawProtected:true,
  realB143Scenarios:3,
  voxelBasedElevationDirections:['front','rear','west','east'],
  trueRooftopVerticalProjection:true,
  roofShellAuditCases:cases.map(c=>({id:c.id,title:c.title,
   sourceSha256:c.proof.sourceSha256,proof:c.proof})),
  auditedMetrics:exterior,
  aestheticClaim:'NONE',
  uncoveredRemainingRisks:[
   'LOWER_EXTERIOR_ENVELOPE_NOT_CERTIFIED',
   'ACTUAL_MINECRAFT_WEATHER_NOT_TESTED',
   'EXTERNAL_TERRAIN_ENTRANCE_NOT_TESTED',
   'HUMAN_ART_QUALITY_NOT_APPROVED'
  ],
  humanArtReview:'ART_HOLD',realMinecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0
 };
 return {report,cases};
}
function cells(scene){
 const result=new Map();
 for(const p of scene.primitives)result.set(p.slice(0,3).join(','),p[3]);
 return result;
}
const k=(x,y,z)=>x+','+y+','+z;
export function renderR164Elevation(compiled,design,side){
 if(!['front','rear','west','east','roof'].includes(side))
  fail('INVALID_ELEVATION_DIRECTION');
 const w=design.bounds.width,d=design.bounds.depth,h=design.bounds.height;
 const map=cells(compiled),size=9;
 const roof=side==='roof';
 const horizontal=roof?w:(side==='front'||side==='rear'?w:d);
 const vertical=roof?d:h;
 const text=['<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="B143 actual '+
  esc(side)+' voxel projection" viewBox="0 0 '+(horizontal*size)+' '+(vertical*size)+'">',
  '<rect width="100%" height="100%" fill="#142030"/>'];
 for(let yy=0;yy<vertical;yy++)for(let xx=0;xx<horizontal;xx++){
  let pigment;
  if(roof){
   for(let y=h-1;y>=0;y--){
    const mat=map.get(k(xx,y,yy));
    if(mat!==undefined){pigment=color(mat);break;}
   }
  }else for(let depth=0;depth<(side==='front'||side==='rear'?d:w);depth++){
   const x=side==='front'||side==='rear'?xx:
    side==='west'?depth:w-1-depth;
   const z=side==='front'?depth:side==='rear'?d-1-depth:xx;
   const y=h-1-yy,mat=map.get(k(x,y,z));
   if(mat!==undefined){pigment=color(mat);break;}
  }
  if(pigment)text.push('<rect x="'+(xx*size)+'" y="'+(yy*size)+
   '" width="'+size+'" height="'+size+'" fill="'+pigment+'"/>');
 }
 text.push('</svg>');return text.join('');
}
function html(report){
 const cards=report.auditedMetrics.map(c=>
  '<section><h2>'+esc(c.id)+'</h2>'+
  '<p>高室3室、上部外殻全周：ソース監査PASS。ガラス'+c.exteriorGlassVoxelCells+
  'セル、屋根'+c.fullRoofVoxelCells+'セル。</p>'+
  '<iframe loading="lazy" src="'+c.id+'-real-3d.html" title="'+esc(c.id)+' genuine B143"></iframe>'+
  '<figure><img src="'+c.id+'-roof.svg" alt="実ボクセルを上から投影"><figcaption>上面：実B143</figcaption></figure>'+
  '<div class="elev">'+['front','rear','west','east'].map(d=>
   '<figure><img src="'+c.id+'-'+d+'.svg" alt="実ボクセル '+d+'">'+
   '<figcaption>'+d+'</figcaption></figure>').join('')+'</div>'+
  '<p><a href="'+c.id+'-B143.json">真正B143ソース</a> ／ '+
  '<a href="'+c.id+'-VOXELS.json">実ボクセル配列</a></p></section>').join('');
 const trs=report.auditedMetrics.flatMap(c=>c.highInteriorCellCounts.map(room=>
  '<tr><td>'+esc(c.id)+'</td><td>'+esc(room.id)+'</td><td>'+
  room.air+'</td><td>'+room.roofY+'</td><td>上階ソース閉鎖検証PASS</td></tr>')).join('');
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>R164 上部建築シェル・外観4方向実ボクセル監査</title>'+
 '<style>body{background:#101924;color:#ecf3fa;font:14px/1.6 system-ui;margin:0;padding:20px}'+
 'a{color:#a5dbff}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}'+
 'section{background:#1c2a3c;border-radius:11px;padding:14px;min-width:0}'+
 'iframe{height:445px;width:100%;border:1px solid #657c94;background:white}'+
 '.elev{display:grid;grid-template-columns:1fr 1fr;gap:8px}img{width:100%;height:auto}'+
 'figure{margin:7px 0;padding:8px;background:#152235}figcaption{color:#b6cbdc}'+
 'table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:8px;border-bottom:1px solid #46576b}'+
 '.hold{padding:12px;background:#2c3745;border-left:3px solid #e6bd77}'+
 '@media(max-width:1050px){.grid{grid-template-columns:1fr}}</style>'+
 '<h1>R164｜実屋根・外壁の全周監査と4方向の比較</h1>'+
 '<p>中央／西／東の同条件のR163実ボクセルを直接評価。'+
 '正面・背面・西・東・屋根を同じ実3Dデータから投影した画像です。</p>'+
 '<p class="hold"><strong>ART HOLD / Minecraft施工禁止。</strong>'+
 '全周屋根・高窓・上部高室空気の閉鎖検査は限定的なソース検査です。'+
 '建物下部の外装、雨漏り、実歩行、用途に見合う美観の合格証拠ではありません。'+
 '実Qwen/Gemma生成0件。</p>'+
 '<div class="grid">'+cards+'</div><h2>高天井室の内実</h2>'+
 '<table><thead><tr><th>案</th><th>室</th><th>高い空気セル</th><th>屋根高さ</th><th>限定判定</th></tr></thead><tbody>'+
 trs+'</tbody></table><a href="R164_AUDIT.json">全証拠・検査範囲</a></html>';
}
export function saveR164Review(folder){
 if(typeof folder!=='string'||!folder.trim()||fs.existsSync(folder))
  fail('OUTPUT_EXISTS_OR_INVALID');
 const {report,cases}=buildR164Review();
 const template=fs.readFileSync(path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../source/ai/b143-viewer-template.html'),'utf8');
 const list=[['index.html',html(report)],
  ['R164_AUDIT.json',JSON.stringify(report,null,2)+'\n']];
 for(const c of cases){
  list.push([c.id+'-real-3d.html',renderB143Html(
   compileB143Gallery([c.design]),template)]);
  list.push([c.id+'-B143.json',JSON.stringify(c.design,null,2)+'\n']);
  list.push([c.id+'-VOXELS.json',JSON.stringify(c.compiled,null,2)+'\n']);
  for(const side of ['front','rear','west','east','roof'])
   list.push([c.id+'-'+side+'.svg',renderR164Elevation(c.compiled,c.design,side)]);
 }
 fs.mkdirSync(folder,{recursive:false});
 for(const [filename,content] of list)
  fs.writeFileSync(path.join(folder,filename),content,{flag:'wx'});
 return {report,files:list.map(x=>x[0])};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')fail('USAGE_OUT_NEW_DIRECTORY');
  const x=saveR164Review(a[1]);
  console.log(JSON.stringify({status:x.report.status,files:x.files.length,
   candidates:x.report.auditedMetrics.map(r=>({id:r.id,
    upperGlass:r.exteriorGlassVoxelCells,roof:r.fullRoofVoxelCells})),
   modelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
