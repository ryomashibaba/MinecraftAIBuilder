/**
 * Four source-pinned previews: two original user-supplied Qwen14B designs
 * and two deterministic feature-layout demonstration derivatives.
 * The derivatives are NOT model-authored. No Minecraft API or world writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {proposeR125ThresholdRepair} from '../source/ai/r125-entrance-repair.mjs';
import {applyR125FeatureIntent,SCHEMA} from '../source/ai/r125-functional-layer.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=x=>{throw Error('R125_PREVIEW_'+x);};
const CASES=[
 {id:'shop',file:'r125-qwen14b-shop-20261024.json',voxels:933,
  features:[
   {id:'merch-a',zoneId:'front-retail-space',role:'display-stand',corner:'far-left'},
   {id:'staff-a',zoneId:'back-employee-space',role:'storage-rack',corner:'far-right'}
  ]},
 {id:'research',file:'r125-qwen14b-research-20261024.json',voxels:2936,
  features:[
   {id:'observation-bench',zoneId:'observation-lab',role:'work-surface',corner:'far-right'},
   {id:'equipment-bank',zoneId:'equipment-storage',role:'equipment-bank',corner:'far-right'},
   {id:'meeting-seat',zoneId:'collaboration-hub',role:'seating',corner:'far-left'},
   {id:'record-console',zoneId:'data-recording',role:'equipment-bank',corner:'far-right'}
  ]}
];
export function buildR125FunctionalPreview(){
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const pages=[],records=[];
 for(const row of CASES){
  const source=JSON.parse(fs.readFileSync(path.join(ROOT,
   'scripts/fixtures',row.file),'utf8'));
  const original=compileArchitecturePlan(source);
  if(original.compiled.primitives.length!==row.voxels)fail('REAL_SOURCE_DRIFT');
  const repair=proposeR125ThresholdRepair(original);
  const featured=applyR125FeatureIntent({base:repair.candidate,intent:{
   schema:SCHEMA,basePlanSha256:original.planSha256,objects:row.features}});
  for(const [type,result] of [['original',original],['feature-derivative',featured]]){
   const name=row.id+'-'+type+'.html';
   // Every HTML contains one exact, individually hashed design. No
   // source-ID editing merely to fit a combined gallery.
   pages.push({filename:name,html:renderB143Html(
    compileB143Gallery([result.design]),template)});
   records.push({
    building:row.id,kind:type,file:name,
    provenance:type==='original'?
     'REAL_QWEN14B_UPLOADED_PLAN_UNCHANGED':
     'USER_INDEPENDENT_DEMONSTRATION_FEATURE_INTENT_NOT_NEW_LLM_OUTPUT',
    sourceSha256:result.compiled.sourceSha256,
    geometrySha256:result.compiled.geometrySha256,
    voxels:result.compiled.primitives.length,
    sourceRoutes:type==='original'?
     (repair.sourceChanged?'HOLD_ORIGINAL_ENTRANCE_BLOCKED':'SOURCE_ROUTES_REACH_ALL_ZONES'):
     featured.sourceRouteAudit.status,
    featureCount:type==='original'?0:featured.placements.length,
    addedVoxelCount:type==='original'?0:featured.addedVoxelCount,
    entranceRelocated:type==='original'?false:repair.sourceChanged,
    worldWrites:0,realMinecraftWalkingCertified:false,
    visualQualityHumanApproved:false
   });
  }
 }
 const links=records.map(x=>'<li><a href="'+x.file+'">'+x.building+
  ' · '+x.kind+'</a> — '+x.voxels+' voxels · '+x.sourceRoutes+'</li>').join('');
 const landing='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<title>R125 Qwen14B Source Review</title>'+
  '<style>body{font:16px system-ui;margin:5vh auto;padding:20px;max-width:800px;'+
  'background:#101923;color:#ebf4f8;line-height:1.8}a{color:#94d9ff}</style>'+
  '</head><body><h1>R125 建築の機能設備：実ボクセル比較</h1>'+
  '<p>元のQwen14B計画2件と、別ソースとして生成した設備付き派生案2件。'+
  '各HTMLの3Dはマウスで回転可能です。</p><ul>'+links+'</ul>'+
  '<p>設備は<strong>モデルに再生成させたものではなく</strong>、共通エンジンの'+
  '機能IRを手動で指定した検証例です。Minecraft施工0、実歩行未認証。</p>'+
  '</body></html>';
 pages.unshift({filename:'index.html',html:landing});
 return {schema:'r125-functional-source-visual-review-v1',
  pages,records,originalQwenPlanPreserved:true,modelCalls:0,
  humanProvidedFeatureIntents:true,minecraftWrites:0,
  constructionApproved:false,gates:Array(9).fill('BLOCKED')};
}
export function saveR125FunctionalPreview(out){
 if(typeof out!=='string'||!out.trim())fail('OUTPUT_REQUIRED');
 const dir=path.resolve(out);
 if(fs.existsSync(dir))fail('OUTPUT_ALREADY_EXISTS');
 const r=buildR125FunctionalPreview();
 fs.mkdirSync(dir,{recursive:false});
 for(const p of r.pages)
  fs.writeFileSync(path.join(dir,p.filename),p.html,{flag:'wx'});
 const manifest={...r,pages:r.pages.map(x=>x.filename)};
 fs.writeFileSync(path.join(dir,'R125_FUNCTIONAL_REVIEW.json'),
  JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('CLI_REQUIRES_OUT');
  const r=saveR125FunctionalPreview(args[1]);
  console.log(JSON.stringify({status:'OFFLINE_SOURCE_REVIEW_READY',
   scenes:r.records.length,
   featureVoxelCounts:r.records.filter(x=>x.featureCount).map(x=>x.addedVoxelCount),
   worldWrites:0}));
 }catch(e){console.error('R125_PREVIEW_HOLD',String(e?.message??e));process.exitCode=2;}
}
