/** R161 controlled real-B143 comparative visual and source-usability evidence. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileR134MultiZonePlan,SCHEMA as R134} from '../source/ai/r134-multi-zone-plan.mjs';
import {SCHEMA as R139,deriveR139RelationalTopology} from '../source/ai/r139-room-relations.mjs';
import {deriveR160SideGalleryTopology} from '../source/ai/r160-side-gallery.mjs';
import {ASSEMBLED_SCHEMA,applyR125FeatureIntent} from '../source/ai/r125-functional-layer.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const fail=x=>{throw Error('R161_'+x);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const k=(x,y,z)=>x+','+y+','+z;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
export const PLAN=Object.freeze({
 schema:R134,id:'r161-neutral-atelier',title:'Neutral three-room source comparison',
 brief:'Independent room circulation and functional equipment comparison',
 footprint:{width:30,depth:32},
 materials:{floor:'stone',wall:'concrete',roof:'metal'},
 layout:{axis:'z',spaces:[
  {id:'zone-1',purpose:'Independent practical activity',weight:1},
  {id:'zone-2',purpose:'Independent storage',weight:2},
  {id:'zone-3',purpose:'Independent planning and sitting',weight:3}
 ]},
 form:{roofProfile:'flat',facadeLanguage:'plain'}
});
export const EQUIPMENT=Object.freeze([
 {id:'fixture-1',zoneId:'zone-1',role:'work-surface',corner:'near-left',detail:'assembled'},
 {id:'fixture-2',zoneId:'zone-2',role:'storage-rack',corner:'far-right',detail:'assembled'},
 {id:'fixture-3',zoneId:'zone-3',role:'seating',corner:'near-right',detail:'assembled'}
]);
const scenarios=[['central','中央通路',null],['west','西側通路','west-gallery'],
 ['east','東側通路','east-gallery']];
const safe=x=>x.constructionApproved===false&&x.executionAllowed===false&&
 x.worldWrites===0&&x.worldContacts===0&&x.gates?.length===9&&
 x.gates.every(y=>y==='BLOCKED')&&x.BuildPlan?.operations?.length===0;
export function assessR161(graph,featured){
 if(!verifyCompiled(featured.design,featured.compiled))fail('UNVERIFIED_B143');
 const route=auditR125SourceRoutes({...graph,design:featured.design,
  compiled:featured.compiled,sourceSha256:featured.sourceSha256,
  geometrySha256:featured.geometrySha256},{featureTargets:featured.placements});
 if(route.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  route.zones.length!==3||route.featureAccess.length!==3||
  !route.featureAccess.every(x=>x.reachableFromEntrance))
  fail('SOURCE_ROUTES_NOT_GENUINE');
 const filled=new Set(featured.compiled.primitives.map(p=>k(p[0],p[1],p[2])));
 const has=(x,y,z)=>filled.has(k(x,y,z));
 const rooms=graph.program[0].zones.map(z=>{
  let clear2=0,clear1=0;
  for(let zz=z.range.z[0];zz<=z.range.z[1];zz++)
   for(let x=z.range.x[0];x<=z.range.x[1];x++){
    const clear=has(x,1,zz)&&!has(x,2,zz)&&!has(x,3,zz);
    if(clear)clear1++;
    if(clear&&x<z.range.x[1]&&has(x+1,1,zz)&&
     !has(x+1,2,zz)&&!has(x+1,3,zz))clear2++;
   }
  const item=route.zones.find(x=>x.id===z.id);
  return {id:z.id,range:z.range,
   assignedFloorCells:(z.range.x[1]-z.range.x[0]+1)*(z.range.z[1]-z.range.z[0]+1),
   clearSupportedOneWide:clear1,clearSupportedTwoWide:clear2,
   reachableTwoWide:item.reachedTwoWidePadCount,
   sourceGraphMoves:item.sourceGraphMoves};
 });
 const service=route.featureAccess.map(x=>({id:x.id,zoneId:x.zoneId,
  sourceGraphMoves:x.sourceGraphMoves,reachable:x.reachableFromEntrance}));
 const upper=featured.compiled.primitives.filter(p=>p[1]>=6)
  .map(p=>p.slice(0,4).join(',')).sort();
 return {
  sourceSha256:featured.sourceSha256,geometrySha256:featured.geometrySha256,
  upperMassSha256:sha(JSON.stringify(upper)),upperVoxelCount:upper.length,
  realVoxelCount:featured.compiled.primitives.length,
  equipmentCount:featured.placements.length,rooms,service,
  sourceRoomMoves:rooms.reduce((n,x)=>n+x.sourceGraphMoves,0),
  sourceEquipmentMoves:service.reduce((n,x)=>n+x.sourceGraphMoves,0),
  sourceRouteStatus:route.status,
  allRoomsReachable:rooms.every(x=>x.reachableTwoWide>0),
  blocked:safe(graph)&&safe(featured),
  humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED'
 };
}
export function buildR161(){
 const base=compileR134MultiZonePlan(PLAN);
 const before=JSON.stringify(base);
 const ir={schema:R139,basePlanSha256:base.planSha256,
  entryFacingZoneId:'zone-3',directAdjacencies:[['zone-1','zone-2']]};
 const results=scenarios.map(([id,label,side])=>{
  const graph=side?deriveR160SideGalleryTopology(base,ir,{gallerySide:side}):
   deriveR139RelationalTopology(base,ir);
  const featured=applyR125FeatureIntent({base:graph,intent:{
   schema:ASSEMBLED_SCHEMA,basePlanSha256:graph.planSha256,
   objects:EQUIPMENT.map(x=>({...x}))}});
  return {id,label,graph,featured,evidence:assessR161(graph,featured)};
 });
 if(JSON.stringify(base)!==before)fail('ORIGINAL_SEMANTIC_PLAN_CHANGED');
 if(new Set(results.map(x=>x.evidence.geometrySha256)).size!==3)
  fail('NON_DISTINCT_REAL_GEOMETRY');
 if(!results.every(x=>x.evidence.blocked&&x.evidence.allRoomsReachable&&
  x.evidence.equipmentCount===3))fail('SAFETY_OR_ROOMS_REGRESSION');
 const upperEqual=new Set(results.map(x=>x.evidence.upperMassSha256)).size===1;
 const report={
  schema:'r161-controlled-b143-quality-v1',
  status:'SOURCE_VARIANTS_VALID_ART_HOLD',
  authorship:'HOST_SAME_INPUT_THREE_VARIATIONS_NOT_NEW_REAL_QWEN',
  newLLMCalls:0,sourceOnly:true,
  controlledInputs:{plan:PLAN,equipment:EQUIPMENT,relation:ir},
  realGeometryDistinct:3,upperMassIdentical:upperEqual,
  finding:upperEqual?'FLOORPLAN_CHANGED_EXTERIOR_HIGH_MASS_UNCHANGED':
   'EXTERIOR_HIGH_MASS_DIFFERENT_ART_UNREVIEWED',
  automaticArtWinner:'NONE',
  candidates:results.map(x=>({id:x.id,label:x.label,
   topology:x.graph.zoneLayoutShape,...x.evidence})),
  humanArtReview:'ART_HOLD',realMinecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldWrites:0,worldContacts:0
 };
 return {report,results};
}
function planSvg(r){
 const {width,depth}=r.featured.design.bounds,scale=8;
 const map=new Map(r.featured.compiled.primitives.map(p=>[k(p[0],p[1],p[2]),p[3]]));
 const colors=['#6b95ad','#9fa59e','#adbcca','#8eaba5','#bb9769','#999eb0'];
 const out=['<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Actual B143 horizontal voxel slice" viewBox="0 0 '+width*scale+' '+depth*scale+'">',
 '<rect width="100%" height="100%" fill="#12202e"/>'];
 for(let z=0;z<depth;z++)for(let x=0;x<width;x++){
  const m=map.get(k(x,3,z));
  if(m!==undefined)out.push('<rect x="'+x*scale+'" y="'+z*scale+
   '" width="'+scale+'" height="'+scale+
   '" fill="'+colors[m%colors.length]+'"/>');
 }
 for(const zone of r.graph.program[0].zones){
  const q=zone.range;
  out.push('<rect x="'+q.x[0]*scale+'" y="'+q.z[0]*scale+
   '" width="'+(q.x[1]-q.x[0]+1)*scale+
   '" height="'+(q.z[1]-q.z[0]+1)*scale+
   '" stroke="#e7bb68" stroke-width="1.4" stroke-dasharray="3 2" fill="none"/>');
  out.push('<text x="'+(q.x[0]+1)*scale+'" y="'+(q.z[0]+2)*scale+
   '" font-size="8" fill="#e7bb68">'+esc(zone.id)+'</text>');
 }
 return out.join('')+'</svg>';
}
function comparisonHtml(report){
 const cards=report.candidates.map(x=>
  '<section><h2>'+esc(x.label)+'</h2><p>3室・3設備 | voxel '+x.realVoxelCount+
  ' | rooms source moves '+x.sourceRoomMoves+'</p><iframe loading="lazy" src="'+
  x.id+'-furnished.html" title="'+esc(x.label)+' genuine B143"></iframe>'+
  '<details><summary>実ボクセル水平断面 Y=3</summary><object type="image/svg+xml" data="'+
  x.id+'-section.svg"></object></details><p><a href="'+x.id+
  '-empty.html">設備前の空室3D</a> / <a href="'+x.id+'-B143.json">実B143ソース</a></p></section>').join('');
 const roomRows=report.candidates.flatMap(x=>x.rooms.map(r=>
  '<tr><td>'+esc(x.label)+'</td><td>'+esc(r.id)+'</td><td>'+r.assignedFloorCells+
  '</td><td>'+r.clearSupportedTwoWide+'</td><td>'+r.reachableTwoWide+
  '</td><td>'+r.sourceGraphMoves+'</td></tr>')).join('');
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>R161 同条件・実B143 3D比較</title>'+
 '<style>body{background:#101925;color:#eaf2fc;font:14px/1.7 system-ui;margin:0;padding:20px}'+
 '.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'+
 'section{background:#1c2a3e;padding:12px;border-radius:10px;min-width:0}'+
 'iframe{width:100%;height:480px;border:1px solid #526680;background:#fff}'+
 'object{width:100%;max-width:300px;height:350px;display:block;margin:auto}'+
 'a{color:#a1d8ff}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #34465b;padding:8px;text-align:left}'+
 '.warning{background:#303440;padding:12px;border-left:3px solid #e7bb68}'+
 '@media(max-width:920px){.grid{grid-template-columns:1fr}}</style>'+
 '<h1>R161 真正B143・中央／西／東の同条件比較</h1>'+
 '<p>同じ30×32敷地／3室／3設備／材質／入口／室接続。モデル新規呼び出しなし、ホスト研究3案。</p>'+
 '<p class="warning"><strong>ART HOLD／施工BLOCKED。</strong>Y≥6の外観上部実ボクセルが一致：'+
 (report.upperMassIdentical?'<strong>YES — 外観の改善は証明されない</strong>':'NO')+
 '。ソース到達≠実Minecraft歩行、数値差≠美術合格。</p>'+
 '<div class="grid">'+cards+'</div><h2>実室の支持・到達ソース床</h2>'+
 '<table><thead><tr><th>案</th><th>室</th><th>割当面積</th><th>空き2幅床</th>'+
 '<th>到達2幅床</th><th>入口からのグラフ移動</th></tr></thead><tbody>'+
 roomRows+'</tbody></table><p><a href="R161_AUDIT.json">全ての監査値</a>。'+
 '人による用途・見た目・室内品質の最終審査待ち。</p></html>';
}
export function saveR161(out){
 if(typeof out!=='string'||!out.trim()||fs.existsSync(out))fail('NO_OVERWRITE');
 const {report,results}=buildR161();
 const template=fs.readFileSync(path.join(
  path.dirname(fileURLToPath(import.meta.url)),'../source/ai/b143-viewer-template.html'),'utf8');
 const files=[['index.html',comparisonHtml(report)],
  ['R161_AUDIT.json',JSON.stringify(report,null,2)+'\n']];
 for(const r of results){
  files.push([r.id+'-furnished.html',renderB143Html(
   compileB143Gallery([r.featured.design]),template)]);
  files.push([r.id+'-empty.html',renderB143Html(
   compileB143Gallery([r.graph.design]),template)]);
  files.push([r.id+'-section.svg',planSvg(r)]);
  files.push([r.id+'-B143.json',JSON.stringify(r.featured.design,null,2)+'\n']);
  files.push([r.id+'-VOXELS.json',JSON.stringify(r.featured.compiled,null,2)+'\n']);
 }
 fs.mkdirSync(out,{recursive:false});
 for(const [filename,content] of files)
  fs.writeFileSync(path.join(out,filename),content,{flag:'wx'});
 return {report,files:files.map(x=>x[0])};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')fail('USAGE_OUT_NEW');
  const r=saveR161(a[1]);
  console.log(JSON.stringify({status:r.report.status,
   upperMassIdentical:r.report.upperMassIdentical,
   scenes:r.report.candidates.map(x=>({id:x.id,voxels:x.realVoxelCount})),
   modelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2}
}
