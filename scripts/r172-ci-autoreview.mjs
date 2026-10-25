/**
 * R172: unattended CI architectural review, 100% SYNTHETIC named programs.
 * These are NOT genuine Qwen/Gemma replies. They exercise the same B143
 * source and room/furnishing/height compilers on every change.
 * Real local model is used only at milestones with explicit local consent.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeR134FreshRequest} from './r134-fresh-model-pilot.mjs';
import {parseR139RelationalFurnishedReply} from './r139-relational-model.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const fail=s=>{throw Error('R172_AUTOMATED_QA_'+s);};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const Z=(id,purpose,weight)=>({id,purpose,weight});
const O=(id,zoneId,role,corner)=>({id,zoneId,role,corner});
const SYNTHETIC=Object.freeze([
 {id:'home',use:'住宅',form:'flat',material:'wood',
  zones:[Z('living','Living and relaxing',4),Z('sleeping','Rest and privacy',3),
   Z('kitchen','Preparing meals',2),Z('storage','Household inventory',1)],
  objects:[O('sofa','living','seating','near-left'),
   O('bed','sleeping','seating','far-right'),
   O('counter','kitchen','work-surface','near-right'),
   O('shelves','storage','storage-rack','far-left')],
  entry:'living',edges:[['living','sleeping'],['living','kitchen']]},
 {id:'shop',use:'店舗',form:'flat',material:'concrete',
  zones:[Z('craftwork','Building products',4),Z('storefront','Customers browse',3),
   Z('inventory','Organized stock',2),Z('employee','Staff administration',1)],
  objects:[O('workbench','craftwork','work-surface','near-left'),
   O('shelves','storefront','display-stand','far-right'),
   O('stockrack','inventory','storage-rack','far-left'),
   O('staffdesk','employee','work-surface','near-right')],
  entry:'storefront',edges:[['storefront','craftwork'],['storefront','inventory']]},
 {id:'laboratory',use:'研究施設',form:'ridge',material:'stone',
  zones:[Z('observatory','Instrument observation',2),
   Z('analysis','Reviewing data',3),Z('storage','Storing instruments',1),
   Z('discussion','Working together',4)],
  objects:[O('instrument','observatory','equipment-bank','far-right'),
   O('console','analysis','work-surface','near-left'),
   O('storageunit','storage','storage-rack','far-left'),
   O('table','discussion','work-surface','near-right')],
  entry:'discussion',edges:[['observatory','analysis']] }
]);
const safety=p=>p?.readiness==='NOT_PREPARED'&&p.constructionApproved===false&&
 p.executionAllowed===false&&p.worldWrites===0&&p.worldContacts===0&&
 p.BuildPlan?.operations?.length===0&&p.gates?.length===9&&
 p.gates.every(x=>x==='BLOCKED');
export function buildR172Autoreview(){
 const results=SYNTHETIC.map((t,i)=>{
  const raw={id:'r172-auto-'+t.id,title:'Synthetic source review '+t.id,
   footprint:{width:28,depth:28},
   materials:{floor:'stone',wall:t.material,roof:'metal'},
   layout:{axis:'z',spaces:t.zones},
   form:{roofProfile:t.form,facadeLanguage:'plain'},
   objects:t.objects,
   relations:{entryFacingZoneId:t.entry,directAdjacencies:t.edges},
   architecture:{schema:'minecraftaibuilder-r160-topology-ir-v1',
    entryHierarchy:'quiet',daylightStrategy:'even',
    roofEdge:'fine',spatialTopology:'central-spine'}};
  const request=makeR134FreshRequest({
   brief:'Synthetic CI four-room design source for '+t.id,
   siteWidth:32,siteDepth:32});
  const r=parseR139RelationalFurnishedReply(JSON.stringify(raw),request,{
   allowTopologyComposition:true,
   allowHostGridResearch:true,allowHostVolumeResearch:true});
  const model=r.architectural?.completed;
  const variant=parseR139RelationalFurnishedReply(JSON.stringify(raw),request,{
   allowTopologyComposition:true,allowHostGridResearch:true,
   allowHostVolumeResearch:true,allowHostSculpturalResearch:true
  }).architectural?.completed;
  if(!model||!verifyCompiled(model.design,model.compiled)||
   !safety(model)||!safety(r)||
   model.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   model.sourceRouteAudit.zones?.length!==4||
   model.sourceRouteAudit.featureAccess?.length!==t.objects.length||
   !model.sourceRouteAudit.featureAccess.every(x=>x.reachableFromEntrance)||
   model.r170FourRoomVolumeEvidence?.roomSections?.length!==4||
   !model.r170FourRoomVolumeEvidence.originalLowerFiveLevelsUnchanged||
   model.r170FourRoomVolumeEvidence.clearHighInteriorSampleCount<120)
   fail('SYNTHETIC_SOURCE_OR_SAFETY_'+t.id);
  if(!variant||!verifyCompiled(variant.design,variant.compiled)||
   !safety(variant)||
   variant.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   variant.sourceRouteAudit.featureAccess.length!==t.objects.length||
   !variant.sourceRouteAudit.featureAccess.every(x=>x.reachableFromEntrance)||
   variant.r170FourRoomVolumeEvidence?.sculptedVolumeVariant!==true||
   variant.r170FourRoomVolumeEvidence.realExteriorClerestoryWindows<4||
   !variant.r170FourRoomVolumeEvidence.originalLowerFiveLevelsUnchanged||
   variant.compiled.primitives.some(p=>p[1]>=18)||
   model.compiled.primitives.filter(p=>p[1]<=5).length!==
    variant.compiled.primitives.filter(p=>p[1]<=5).length)
   fail('SCULPTED_SOURCE_OR_ROOM_SAFETY_'+t.id);
  const ymax=p=>Math.max(...p.compiled.primitives.map(v=>v[1]));
  const maxBaselineY=ymax(model),maxSculptedY=ymax(variant);
  if(maxSculptedY<=maxBaselineY+1)
   fail('SCULPTED_SILHOUETTE_NOT_HIGHER_'+t.id);
  const highGlass=variant.compiled.primitives.filter(p=>p[1]>=6&&
   p[3]===3).length;
  if(highGlass<12)fail('REAL_CLERESTORY_VOXELS_MISSING_'+t.id);
  return {id:t.id,use:t.use,source:model,sculpted:variant,
   audit:{id:t.id,use:t.use,sourceSha256:model.sourceSha256,
    geometrySha256:model.geometrySha256,voxels:model.compiled.primitives.length,
    rooms:4,originalObjectsPreserved:t.objects.length,
    modelRequestedRoofFamily:t.form,
    hostDerivedHeights:model.r170FourRoomVolumeEvidence.roomSections.map(
     q=>({zoneId:q.zoneId,roofY:q.roofY,clearCells:q.extraAirColumnsAtY6Y7})),
    sourceRouteStatus:model.sourceRouteAudit.status,
    hostGridOverrideUsed:Boolean(r.hostGridResearchOverride),
    sculptedSourceSha256:variant.sourceSha256,
    sculptedGeometrySha256:variant.geometrySha256,
    sculptedVoxelCount:variant.compiled.primitives.length,
    actualBaselineHighestOccupiedY:maxBaselineY,
    actualSculptedHighestOccupiedY:maxSculptedY,
    realSculptedClerestoryGlazingCells:highGlass,
    realSculptedClerestoryWindows:
     variant.r170FourRoomVolumeEvidence.realExteriorClerestoryWindows,
    sculptedHeights:variant.r170FourRoomVolumeEvidence.roomSections.map(q=>q.roofY),
    freshModelCalls:0,realLocalInference:false,
    provenance:'SYNTHETIC_CI_FIXTURE_HOST_DERIVED_NOT_GENUINE_QWEN',
    humanArtReview:'ART_HOLD',readiness:'NOT_PREPARED',
    gates:Array(9).fill('BLOCKED'),worldWrites:0}};
 });
 if(new Set(results.map(x=>x.audit.geometrySha256)).size!==3)
  fail('FIXTURES_NOT_PHYSICALLY_DISTINCT');
 return {schema:'r172-ci-auto-architectural-review-v1',
  status:'SYNTHETIC_B143_SOURCE_QA_PASS_ART_HOLD',
  implementationEvidence:'HOST_GENERATED_FROM_THREE_STATIC_SYNTHETIC_USE_FIXTURES',
  NOT_REAL_MODEL_EVIDENCE:true,
  syntheticCases:3,realModelCalls:0,worldWrites:0,
  safeBlocked:results.every(x=>safety(x.source)),
  humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},cases:results};
}
function html(report){
 const cases=report.cases.map(c=>
  '<section><h2>'+esc(c.use)+'</h2><p>'+c.voxels+
  ' B143 voxels · 四室の天井高さ '+
  c.hostDerivedHeights.map(r=>r.roofY).join(' / ')+'</p>'+
  '<p>基準: 最大Y='+c.actualBaselineHighestOccupiedY+' / 彫塑研究: 最大Y='+
   c.actualSculptedHighestOccupiedY+' · 上部実ガラス '+c.realSculptedClerestoryGlazingCells+
   'セル。美術判定は未実施。</p>'+
  '<h3>基準 R170</h3><iframe loading="lazy" title="'+esc(c.use)+' R170" src="'+c.id+'.html"></iframe>'+
  '<h3>研究候補 R173</h3><iframe loading="lazy" title="'+esc(c.use)+' R173" src="'+c.id+'-sculpted.html"></iframe>'+
  '<div class="elev">'+['front','rear','west','east','roof'].map(d=>
   '<figure><img src="'+c.id+'-'+d+'.svg" alt="'+esc(d)+
   '"><img src="'+c.id+'-sculpted-'+d+'.svg" alt="sculpted '+esc(d)+
   '"><figcaption>'+esc(d)+' · 上 R170 / 下 R173</figcaption></figure>').join('')+'</div></section>'
 ).join('');
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>R172 GitHub自動・模擬3用途 3D評価</title>'+
 '<style>body{background:#121b28;color:#e9f3fb;font:15px/1.6 system-ui;margin:0;padding:20px}'+
 '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px}'+
 'section{border:1px solid #364759;background:#1a2838;padding:14px;border-radius:10px}'+
 'iframe{width:100%;height:450px;border:1px solid #53667a;background:white}'+
 '.elev{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}'+
 'img{width:100%;height:auto}figure{margin:5px 0;padding:7px;background:#111d29}'+
 '.notice{border-left:4px solid #d3a767;background:#302f2e;padding:12px}</style>'+
 '<h1>R172 自動CI生成・3用途実B143比較</h1>'+
 '<p class="notice"><strong>静的な合成入力のみ。</strong>Qwen/Gemmaの実回答ではなく、'+
 '美術合格もMinecraft施工許可もありません。追加推論0、worldWrites=0、ART HOLD。</p>'+
 '<div class="grid">'+cases+'</div>'+
 '<p><a href="R172_CI_QA.json">全監査データ</a></p>';
}
export function saveR172Autoreview(out){
 if(typeof out!=='string'||!out.trim()||fs.existsSync(out))
  fail('NEW_OUTPUT_DIR_REQUIRED');
 const r=buildR172Autoreview();
 const dir=path.resolve(out),template=fs.readFileSync(path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../source/ai/b143-viewer-template.html'),'utf8');
 const files=new Map();
 for(const {id,source,sculpted} of r.cases){
  files.set(id+'.html',renderB143Html(
   compileB143Gallery([source.design]),template));
  files.set(id+'-sculpted.html',renderB143Html(
   compileB143Gallery([sculpted.design]),template));
  for(const d of ['front','rear','west','east','roof']){
   files.set(id+'-'+d+'.svg',
    renderR164Elevation(source.compiled,source.design,d));
   files.set(id+'-sculpted-'+d+'.svg',
    renderR164Elevation(sculpted.compiled,sculpted.design,d));
  }
 }
 const {cases,...top}=r;
 const report={...top,cases:r.cases.map(c=>c.audit)};
 files.set('R172_CI_QA.json',JSON.stringify(report,null,2)+'\n');
 files.set('index.html',html(report));
 fs.mkdirSync(dir,{recursive:false});
 for(const [name,content] of files)
  fs.writeFileSync(path.join(dir,name),content,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['### R172 自動3用途・B143ソースレビュー',
   '**静的な合成入力のみ。実Qwen推論ではありません。ART HOLD / 施工禁止。**','',
   '| 用途 | R170実ボクセル | R173実ボクセル | 最上部Yの変化 | 外部高窓 | 結果 |',
   '|---|---:|---:|---|---:|---|',...report.cases.map(c=>
    '| '+c.use+' | '+c.voxels+' | '+c.sculptedVoxelCount+
    ' | '+c.actualBaselineHighestOccupiedY+' → '+c.actualSculptedHighestOccupiedY+
    ' | '+c.realSculptedClerestoryWindows+' | ソースPASS / 美術HOLD |'),
    '', 'モデル推論0、Minecraft書込0。5方向画像と3Dは成果物 R172-CI-THREE-USE-SOURCE-3D を確認。',''];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n'));
 }
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')fail('USAGE_OUT_NEW_DIR');
  const r=saveR172Autoreview(a[1]);
  console.log(JSON.stringify({status:r.status,
   cases:r.cases.map(c=>({use:c.use,voxels:c.voxels})),
   realModelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
