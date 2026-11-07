
/**
 * R131 source-pinned REAL Qwen14B vs compact vs assembled 3D comparison.
 * Offline, no new model generation, no world contact, no geometry substitution.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {proposeR125ThresholdRepair} from '../source/ai/r125-entrance-repair.mjs';
import {applyR125FeatureIntent,SCHEMA as OLD,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
import {auditR129FunctionalAcceptance,SCHEMA as ACCEPT}
 from '../source/ai/r125-functional-acceptance.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const halt=x=>{throw Error('R131_COMPARE_'+x);};
const FEAT=[
 {id:'merch-a',zoneId:'front-retail-space',role:'display-stand',corner:'far-left'},
 {id:'staff-a',zoneId:'back-employee-space',role:'storage-rack',corner:'far-right'}
];
const RESEARCH=[
 {id:'observation-bench',zoneId:'observation-lab',role:'work-surface',corner:'far-right'},
 {id:'equipment-bank',zoneId:'equipment-storage',role:'equipment-bank',corner:'far-right'},
 {id:'meeting-seat',zoneId:'collaboration-hub',role:'seating',corner:'far-left'},
 {id:'record-console',zoneId:'data-recording',role:'equipment-bank',corner:'far-right'}
];
const CASES=[
 {id:'shop',fixture:'r125-qwen14b-shop-20261024.json',
  voxels:933,sha:'05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d',
  features:FEAT,zoneOrders:[{id:'front-behind-entrance-on-z',
   nearZoneId:'front-retail-space',farZoneId:'back-employee-space',axis:'z'}]},
 {id:'research',fixture:'r125-qwen14b-research-20261024.json',
  voxels:2936,sha:'662a79ac44d9ed0cc9d9e49bbc644a25b2e8237a25d7832fa1f8be4e3c3f32c6',
  features:RESEARCH,zoneOrders:[]}
];
const plain=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const name={original:'Qwen14B原本',compact:'旧コンパクト設備',
 assembled:'R130複合設備'};
function indexHtml(records){
 const groups=CASES.map(({id})=>{
  const rr=records.filter(r=>r.building===id);
  const cells=rr.map(r=>'<section><h3>'+name[r.mode]+'</h3>'+
   '<p>'+r.voxels+' voxels / added '+r.addedVoxelCount+
   ' / components '+r.physicalPartCount+'</p>'+
   '<iframe loading="lazy" title="'+plain(id+' '+name[r.mode])+
   '" src="'+plain(r.filename)+'"></iframe>'+
   '<p><a target="_blank" rel="noopener" href="'+plain(r.filename)+
   '">独立3D表示</a></p><p>'+plain(r.independentStatus)+'</p></section>').join('');
  return '<article><h2>'+plain(id)+'</h2><div class="grid">'+cells+'</div></article>';
 }).join('');
 return '<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R131 source-pinned comparison</title>'+
  '<style>body{font:15px/1.6 system-ui;margin:0;padding:clamp(12px,3vw,32px);'+
  'background:#0e1a29;color:#edf6ff}h1{font-size:1.8rem}.muted{color:#a7bed0}'+
  '.grid{display:grid;grid-template-columns:repeat(3,minmax(250px,1fr));gap:12px}'+
  'section{background:#1b2d42;border:1px solid #344f68;border-radius:10px;padding:10px}'+
  'section h3{margin:5px 0}section p{overflow-wrap:anywhere}'+
  'iframe{display:block;width:100%;height:440px;background:#08121c;border:1px solid #3c586b}'+
  'a{color:#93dfff}@media(max-width:920px){.grid{grid-template-columns:1fr}}</style>'+
  '</head><body><h1>R131｜3D実体比較</h1>'+
  '<p class="muted">同じ元Qwen14B建築を原本・小型設備・複合設備の3条件で比較。各3Dはドラッグ回転・'+
  'ホイール拡大・上階非表示・素材切替に対応。複合設備はホスト製で、新しいLLM生成ではありません。</p>'+
  groups+
  '<p class="muted">数値の追加やSource到達性だけでは美術・実利用を認証しません。'+
  '店舗の前後配置は別途HOLD。実Minecraft施工・実機歩行・追加の本物LLM推論は0。</p>'+
  '<a href="R131_COMPARISON_EVIDENCE.json">比較・未達要求の機械可読証拠</a>'+
  '</body></html>';
}
export function buildR131SourceComparison(){
 const template=fs.readFileSync(path.join(ROOT,
  'source/ai/b143-viewer-template.html'),'utf8');
 const records=[],pages=[];
 for(const row of CASES){
  const plan=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts/fixtures',
   row.fixture),'utf8'));
  const original=compileArchitecturePlan(plan);
  if(original.compiled.primitives.length!==row.voxels||
   original.compiled.sourceSha256!==row.sha)halt('ORIGINAL_SOURCE_DRIFT_'+row.id);
  const repair=proposeR125ThresholdRepair(original),base=repair.candidate;
  const independent={
   schema:ACCEPT,basePlanSha256:base.planSha256,
   needs:row.features.map(f=>({
    id:'need-'+f.id,zoneId:f.zoneId,role:f.role,
    minCount:1,minAddedVoxels:8,minReachablePads:1})),
   zoneOrders:row.zoneOrders
  };
  for(const mode of ['original','compact','assembled']){
   const unchanged=mode==='original';
   const intent=unchanged?null:{
    schema:mode==='compact'?OLD:ASSEMBLED_SCHEMA,
    basePlanSha256:base.planSha256,
    objects:row.features.map(f=>mode==='assembled'?
     {...f,detail:'assembled'}:f)
   };
   const featured=unchanged?null:applyR125FeatureIntent({base,intent});
   const output=featured??original;
   const checked=featured?auditR129FunctionalAcceptance({
    base,featured,spec:independent}):null;
   const filename=row.id+'-'+mode+'.html';
   pages.push({filename,html:renderB143Html(
    compileB143Gallery([output.design]),template)});
   records.push({
    building:row.id,mode,filename,
    provenance:unchanged?'ORIGINAL_ACTUAL_QWEN14B_SAVED':
     'HOST_ASSEMBLED_FROM_HUMAN_FEATURE_INTENT_NOT_NEW_REAL_LLM',
    originalSourceSha256:row.sha,
    sourceSha256:output.compiled.sourceSha256,
    geometrySha256:output.compiled.geometrySha256,
    voxels:output.compiled.primitives.length,
    addedVoxelCount:featured?.addedVoxelCount??0,
    featureCount:featured?.placements.length??0,
    physicalPartCount:featured?.placements.reduce(
     (n,p)=>n+(p.elementIds?.length??1),0)??0,
    sourceRoutes:unchanged?(repair.sourceChanged?
     'HOLD_ORIGINAL_ENTRANCE_BLOCKED':'SOURCE_ROUTES_REACH_ALL_ZONES'):
     featured.sourceRouteAudit.status,
    independentStatus:checked?.status??'ORIGINAL_NOT_FEATURE_AUDITED',
    independentUnmetIds:checked?.unmetIds??[],
    independentChecks:checked?.needChecks??[],
    independentZoneOrders:checked?.spatialChecks??[],
    humanArtApproval:false,
    minecraftInGameWalking:'NOT_TESTED',worldWrites:0
   });
  }
 }
 pages.unshift({filename:'index.html',html:indexHtml(records)});
 return {schema:'r131-source-pinned-six-scene-comparison-v1',
  records,pages,originalQwenSourcesImmutable:true,
  originalModelCalls:0,derivativeModelCalls:0,
  independentCriterion:'REQUIRED_EQUIPMENT_8_NEW_VOXELS_AND_1_REACHABLE_PAD',
  originalHumanAuthoredFeatureIR:true,
  aestheticApproval:'NOT_REVIEWED',
  constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',worldWrites:0,worldContacts:0,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
}
export function saveR131SourceComparison(out){
 if(typeof out!=='string'||!out.trim())halt('OUTPUT_REQUIRED');
 const folder=path.resolve(out);
 if(fs.existsSync(folder))halt('EXISTS');
 const result=buildR131SourceComparison();
 fs.mkdirSync(folder,{recursive:false});
 for(const item of result.pages)
  fs.writeFileSync(path.join(folder,item.filename),item.html,{flag:'wx'});
 fs.writeFileSync(path.join(folder,'R131_COMPARISON_EVIDENCE.json'),
  JSON.stringify({...result,pages:result.pages.map(x=>x.filename)},null,2)+'\n',
  {flag:'wx'});
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')halt('CLI');
  const r=saveR131SourceComparison(args[1]);
  console.log(JSON.stringify({status:'SOURCE_SIX_SCENES_READY',
   scenes:r.records.length,
   comparison:r.records.map(x=>({building:x.building,mode:x.mode,
    added:x.addedVoxelCount,parts:x.physicalPartCount,
    independent:x.independentStatus,unmet:x.independentUnmetIds})),
   worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
