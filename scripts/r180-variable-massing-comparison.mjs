/**
 * R180 independent model-declared wing envelope geometry pilot.
 * Exact same static programs and rooms as R178, changed ONLY by supplied IR.
 * No LLM inference or Minecraft world access.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R178_SYNTHETIC_CASES,makeR178SyntheticReply} from './r178-wing-comparison.mjs';
import {parseR178CourtyardReply,R180_SCHEMA} from '../source/ai/r178-wing-courtyard.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const fail=x=>{throw Error('R180_MASSING_PILOT_'+x);};
// Each choice is human-authored synthetic IR, NOT a simulated LLM discovery.
// The three choices are intentionally geometrically distinct, not typology rules.
export const R180_SYNTHETIC_EXTENTS=[
 {west:{innerX:12,frontZ:1,rearZ:30},
  east:{innerX:21,frontZ:5,rearZ:24}},
 {west:{innerX:10,frontZ:3,rearZ:26},
  east:{innerX:20,frontZ:1,rearZ:30}},
 {west:{innerX:11,frontZ:1,rearZ:28},
  east:{innerX:20,frontZ:5,rearZ:30}}
];
function safe(p){return p.readiness==='NOT_PREPARED'&&
 p.worldWrites===0&&p.worldContacts===0&&!p.constructionApproved&&
 !p.executionAllowed&&p.BuildPlan.operations.length===0&&
 p.gates.length===9&&p.gates.every(g=>g==='BLOCKED');}
function floor(p,side){return p.design.elements.find(e=>e.id===side+'-floor');}
export function buildR180MassingComparisons(){
 const cases=R178_SYNTHETIC_CASES.map((t,i)=>{
  const baseline=makeR178SyntheticReply(t),variable=structuredClone(baseline);
  variable.architecture={...variable.architecture,
   schema:R180_SCHEMA,wingExtents:structuredClone(R180_SYNTHETIC_EXTENTS[i])};
  // Same user program, rooms, furniture, relations; only architectural IR varies.
  const req={naturalLanguageBrief:'Static synthetic matched-program massing study '+t.id};
  const r0=parseR178CourtyardReply(JSON.stringify(baseline),req);
  const r1=parseR178CourtyardReply(JSON.stringify(variable),req);
  const before=r0.designOnlySource,after=r1.designOnlySource;
  const ext=variable.architecture.wingExtents;
  const west=floor(after,'west'),east=floor(after,'east');
  const expected=[
   {e:west,origin:[1,1,ext.west.frontZ],
    size:[ext.west.innerX,1,ext.west.rearZ-ext.west.frontZ+1]},
   {e:east,origin:[ext.east.innerX,1,ext.east.frontZ],
    size:[31-ext.east.innerX,1,ext.east.rearZ-ext.east.frontZ+1]}
  ];
  if(!safe(r0)||!safe(r1)||!safe(after)||!safe(before)||
   !verifyCompiled(after.design,after.compiled)||
   after.geometrySha256===before.geometrySha256||
   after.program[0].zones.length!==4||
   after.placements.length!==variable.objects.length||
   after.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   !after.sourceRouteAudit.zones.every(q=>q.reachedFromEntrance)||
   !after.sourceRouteAudit.featureAccess.every(q=>q.reachableFromEntrance)||
   !after.r178WingEvidence.courtyardReachedFromEntrance||
   after.design.elements.length>160||
   expected.some(x=>JSON.stringify(x.e?.origin)!==JSON.stringify(x.origin)||
    JSON.stringify(x.e?.size)!==JSON.stringify(x.size))||
   r1.modelCalls!==0)
   fail('PHYSICAL_MASSING_OR_ROOM_PROGRAM_'+t.id);
  return {id:t.id,use:t.use,before,after,
   audit:{id:t.id,use:t.use,
    rawBaselineSha:r0.originalRawSha256,
    rawMassingSha:r1.originalRawSha256,
    oldGeometrySha:before.geometrySha256,
    newGeometrySha:after.geometrySha256,
    modelDeclaredWingExtents:ext,
    actualPhysicalFloorWitnesses:expected.map(x=>({origin:x.e.origin,size:x.e.size})),
    oldB143Elements:before.design.elements.length,
    newB143Elements:after.design.elements.length,
    oldGenuineVoxelCount:before.compiled.primitives.length,
    newGenuineVoxelCount:after.compiled.primitives.length,
    indoorRooms:4,modelRequestedDirectDoors:2,
    actualPlacedFurniture:after.placements.length,
    outdoorCourtReachable:true,allSourceRoomRoutes:true,
    allSourceFeatureRoutes:true,sourceOnly:true,
    origin:'STATIC_HOST_FIXTURE_NOT_REAL_LOCAL_MODEL',
    aestheticStatus:'ART_HOLD',worldWrites:0,worldContacts:0,
    minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
    gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}}};
 });
 if(new Set(cases.map(c=>c.after.geometrySha256)).size!==3)
  fail('MASSINGS_NOT_DISTINCT');
 return {schema:'r180-variable-massing-source-compare-v1',
  syntheticCases:3,realModelCalls:0,worldWrites:0,ART_HOLD:true,cases};
}
export function saveR180MassingComparisons(out){
 if(!out||fs.existsSync(out))fail('NEW_OUTPUT_DIR_REQUIRED');
 const r=buildR180MassingComparisons();
 const dir=path.resolve(out);
 const root=path.dirname(fileURLToPath(import.meta.url));
 const template=fs.readFileSync(path.join(root,'../source/ai/b143-viewer-template.html'),'utf8');
 const files=new Map();
 for(const c of r.cases){
  for(const [label,p] of [['r178',c.before],['r180',c.after]]){
   const prefix=c.id+'-'+label;
   files.set(prefix+'.html',renderB143Html(compileB143Gallery([p.design]),template));
   for(const side of ['front','rear','west','east','roof'])
    files.set(prefix+'-'+side+'.svg',renderR164Elevation(p.compiled,p.design,side));
  }
 }
 const report={...r,cases:r.cases.map(c=>c.audit)};
 files.set('R180_CI_QA.json',JSON.stringify(report,null,2)+'\n');
 const tile=r.cases.map(c=>{
  const samples=['r178','r180'].map(label=>'<article><h3>'+label.toUpperCase()+
   '</h3><iframe loading="lazy" src="'+c.id+'-'+label+'.html"></iframe>'+
   ['front','rear','west','east','roof'].map(s=>'<img alt="'+s+
    '" src="'+c.id+'-'+label+'-'+s+'.svg">').join('')+'</article>').join('');
  return '<section><h2>'+c.use+'</h2><div class="grid">'+samples+'</div></section>';
 }).join('');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R178 vs R180 同一プログラムの建築構成比較</title>'+
  '<style>body{font:15px system-ui;background:#162536;color:#fff;padding:20px}'+
  '.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}'+
  'article{background:#2b4057;padding:10px}iframe{width:100%;height:400px}'+
  'img{width:19%;margin:.5%}section{margin:20px 0}h3{margin:4px}</style>'+
  '<h1>R180 独立棟の幅・前後位置・奥行を明示するIR</h1>'+
  '<p>同一の完全合成用途・室・家具を固定し、R178 vs R180の3D・5方向実B143を比較。'+
  '本物のQwen/Gemma応答ではありません。ART HOLD。世界書込み0。</p>'+tile);
 fs.mkdirSync(dir,{recursive:false});
 for(const [filename,contents] of files)
  fs.writeFileSync(path.join(dir,filename),contents,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   ['### R180 independent wing envelopes — synthetic matched program',
    'Actual B143 source only. NOT genuine model; ART HOLD / worldWrites=0.',
    '| Use | R178 voxels | R180 voxels | R180 elements |',
    '|---|---:|---:|---:|',
    ...r.cases.map(c=>'| '+c.use+' | '+c.audit.oldGenuineVoxelCount+
     ' | '+c.audit.newGenuineVoxelCount+' | '+c.audit.newB143Elements+' |'),
    ''].join('\n'));
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('USAGE');
  const report=saveR180MassingComparisons(args[1]);
  console.log(JSON.stringify({syntheticCases:report.syntheticCases,realModelCalls:0,worldWrites:0}));
 }catch(err){console.error(String(err?.stack??err));process.exitCode=2;}
}
