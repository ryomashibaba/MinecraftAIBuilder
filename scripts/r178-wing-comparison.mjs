/**
 * R178 independently generated 3-use SYNTHETIC physical wing+court pilot.
 * Every fixture is static host-authored test data; NO Qwen/Gemma inference.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseR178CourtyardReply,R178_SCHEMA} from '../source/ai/r178-wing-courtyard.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const fail=s=>{throw Error('R178_COURTYARD_PILOT_'+s);};
const space=(id,purpose,weight)=>({id,purpose,weight});
const object=(id,zoneId,role,corner)=>({id,zoneId,role,corner});
export const R178_SYNTHETIC_CASES=[
 {id:'home',use:'住宅',material:'wood',roof:'flat',
  spaces:[space('living','Living and relaxing',4),
   space('sleeping','Rest and privacy',3),
   space('kitchen','Preparing meals',2),
   space('storage','Household inventory',1)],
  objects:[object('sofa','living','seating','near-left'),
   object('bed','sleeping','seating','far-right'),
   object('counter','kitchen','work-surface','near-right'),
   object('shelves','storage','storage-rack','far-left')],
  westWing:['living','sleeping'],eastWing:['kitchen','storage'],
  roofs:{west:9,east:12},bridge:'front',entry:'living',
  direct:[['living','sleeping'],['kitchen','storage']]},
 {id:'shop',use:'店舗',material:'concrete',roof:'flat',
  spaces:[space('craftwork','Building products',4),
   space('storefront','Customers browse',3),
   space('inventory','Organized stock',2),
   space('employee','Staff administration',1)],
  objects:[object('workbench','craftwork','work-surface','near-left'),
   object('shelves','storefront','display-stand','far-right'),
   object('stockrack','inventory','storage-rack','far-left'),
   object('staffdesk','employee','work-surface','near-right')],
  westWing:['storefront','inventory'],eastWing:['craftwork','employee'],
  roofs:{west:11,east:8},bridge:'front',entry:'storefront',
  direct:[['storefront','inventory'],['craftwork','employee']]},
 {id:'laboratory',use:'研究施設',material:'stone',roof:'ridge',
  spaces:[space('observatory','Instrument observation',2),
   space('analysis','Reviewing data',3),
   space('storage','Storing instruments',1),
   space('discussion','Working together',4)],
  objects:[object('instrument','observatory','equipment-bank','far-right'),
   object('console','analysis','work-surface','near-left'),
   object('storageunit','storage','storage-rack','far-left'),
   object('table','discussion','work-surface','near-right')],
  westWing:['discussion','analysis'],eastWing:['observatory','storage'],
  roofs:{west:12,east:9},bridge:'rear',entry:'discussion',
  direct:[['discussion','analysis'],['observatory','storage']]}
];
export function makeR178SyntheticReply(t){
 return {id:'r178-court-'+t.id,
  title:'Synthetic wing court physical pilot '+t.id,
  footprint:{width:32,depth:32},
  materials:{floor:'stone',wall:t.material,roof:'metal'},
  layout:{axis:'z',spaces:t.spaces},
  form:{roofProfile:t.roof,facadeLanguage:'plain'},
  objects:t.objects,
  relations:{entryFacingZoneId:t.entry,directAdjacencies:t.direct},
  architecture:{schema:R178_SCHEMA,westWing:t.westWing,
   eastWing:t.eastWing,roofYs:t.roofs,bridge:t.bridge}};
}
const safe=p=>p?.readiness==='NOT_PREPARED'&&p?.worldWrites===0&&
 p?.worldContacts===0&&p?.executionAllowed===false&&
 p?.constructionApproved===false&&p?.BuildPlan?.operations?.length===0&&
 p?.gates?.length===9&&p.gates.every(x=>x==='BLOCKED');
export function buildR178WingComparisons(){
 const cases=R178_SYNTHETIC_CASES.map(t=>{
  const reply=makeR178SyntheticReply(t);
  const request={naturalLanguageBrief:
   'Static synthetic wing court source design for '+t.id};
  const r=parseR178CourtyardReply(JSON.stringify(reply),request);
  const p=r.designOnlySource;
  const e=p.r178WingEvidence;
  if(!verifyCompiled(p.design,p.compiled)||
   !safe(p)||!safe(r)||r.modelCalls!==0||
   p.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   !p.sourceRouteAudit.featureAccess.every(x=>x.reachableFromEntrance)||
   p.program[0].zones.length!==4||p.placements.length!==t.objects.length||
   !e?.courtyardUnroofed||!e.courtWalkSourceSupported||
   e.physicalDoorCount!==2||
   !e.modelDirectPairsVerifiedAgainstPhysicalWingWall||
   e.legacyR168FourRoomGridUsed!==false||
   p.compiled.primitives.length<1000)
   fail('PHYSICAL_MULTI_WING_OR_ACCESS_SOURCE_QA_'+t.id);
  return {id:t.id,use:t.use,result:p,
   audit:{id:t.id,use:t.use,sourceSha256:p.sourceSha256,
    geometrySha256:p.geometrySha256,
    genuineB143VoxelCount:p.compiled.primitives.length,
    b143ElementCount:p.design.elements.length,
    separatedRoomWings:2,rooms:p.program[0].zones.length,
    modelRequestedDirectDoors:t.direct.length,
    actualPhysicalSharedWallDoors:e.physicalDoorCount,
    appendedObjects:p.placements.length,
    actualHighWingRoofYs:e.roofYs,
    coveredConnectorLocation:e.bridgeEnd,
    accessibleUnroofedCourtyard:e.courtyardUnroofed,
    supportedOutdoorWalk:e.courtWalkSourceSupported,
    realCourtyardWitness:e.coreCourtWitness,
    sourceRouteStatus:p.sourceRouteAudit.status,
    featureAccessesReached:p.sourceRouteAudit.featureAccess.length,
    spatialIR:R178_SCHEMA,
    provenance:'STATIC_SYNTHETIC_REPLY_NOT_GENUINE_QWEN',
    humanArtReview:'ART_HOLD',realLocalInference:false,
    minecraftWalking:'NOT_TESTED',
    readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
    worldContacts:0,worldWrites:0,
    BuildPlan:{operations:[]},constructionApproved:false}}
 });
 if(new Set(cases.map(x=>x.audit.geometrySha256)).size!==3)
  fail('THREE_SOURCES_NOT_DISTINCT');
 return {schema:'r178-independent-courtyard-source-pilot-v1',
  NOT_REAL_MODEL_EVIDENCE:true,
  syntheticCases:3,realModelCalls:0,worldWrites:0,
  aestheticStatus:'ART_HOLD',buildPrepared:false,
  cases};
}
function esc(s){return String(s).replaceAll('&','&amp;')
 .replaceAll('<','&lt;').replaceAll('>','&gt;');}
export function saveR178WingComparisons(out){
 if(!out||typeof out!=='string'||fs.existsSync(out))
  fail('NEW_OUTPUT_DIR_REQUIRED');
 const r=buildR178WingComparisons(),dir=path.resolve(out);
 const base=path.dirname(fileURLToPath(import.meta.url));
 const template=fs.readFileSync(path.join(base,
  '../source/ai/b143-viewer-template.html'),'utf8');
 const files=new Map();
 for(const c of r.cases){
  files.set(c.id+'.html',renderB143Html(
   compileB143Gallery([c.result.design]),template));
  for(const d of ['front','rear','west','east','roof'])
   files.set(c.id+'-'+d+'.svg',renderR164Elevation(
    c.result.compiled,c.result.design,d));
 }
 const report={...r,cases:r.cases.map(x=>x.audit)};
 files.set('R178_CI_QA.json',JSON.stringify(report,null,2)+'\n');
 const tiles=r.cases.map(c=>'<section><h2>'+esc(c.use)+'</h2>'+
  '<p>実B143 '+c.audit.genuineB143VoxelCount+'セル、棟屋根の高さ '+
  c.audit.actualHighWingRoofYs.west+'/'+c.audit.actualHighWingRoofYs.east+
  '、渡り廊下 '+c.audit.coveredConnectorLocation+'</p>'+
  '<iframe loading="lazy" src="'+c.id+'.html"></iframe>'+
  '<div class="views">'+['front','rear','west','east','roof'].map(d=>
   '<figure><img src="'+c.id+'-'+d+'.svg"><figcaption>'+d+'</figcaption></figure>').join('')+
  '</div></section>').join('');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R178 複数棟・中庭 実B143合成QA</title>'+
  '<style>body{background:#13202d;color:#eaf3fa;font:15px/1.6 system-ui;padding:20px}'+
  'section{background:#203044;padding:14px;margin:12px 0;border-radius:12px}'+
  'iframe{height:520px;width:100%;background:white} .views{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}'+
  'img{width:100%} figure{margin:0} .warn{color:#f9ca7f}</style>'+
  '<h1>R178 独立した2棟・中庭・接続通路</h1>'+
  '<p class="warn">すべて静的な合成入力。実Qwen/Gemma推論なし。'+
  'ART HOLD／Minecraftへの書込み0／NOT_PREPARED。</p>'+tiles+
  '<p><a href="R178_CI_QA.json">QA JSON</a></p>');
 fs.mkdirSync(dir,{recursive:false});
 for(const [name,body] of files)
  fs.writeFileSync(path.join(dir,name),body,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY){
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   ['### R178 独立2棟＋中庭 — 100%合成検証',
    '**実LLM回答ではありません。ART HOLD、worldWrites=0。**',
    '| 用途 | B143実ボクセル | W/E最高屋根Y | 2棟ドア | 中庭屋根 | 判定 |',
    '|---|---:|---|---:|---|---|',
    ...r.cases.map(x=>'| '+x.use+' | '+x.audit.genuineB143VoxelCount+
     ' | '+Object.values(x.audit.actualHighWingRoofYs).join('/')+
     ' | '+x.audit.actualPhysicalSharedWallDoors+
     ' | 無（実ボクセル検証） | ソースPASS／美術HOLD |'), ''].join('\n'));
 }
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('USAGE');
  const r=saveR178WingComparisons(args[1]);
  console.log(JSON.stringify({cases:r.cases.map(c=>c.use),
   modelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2;}
}
