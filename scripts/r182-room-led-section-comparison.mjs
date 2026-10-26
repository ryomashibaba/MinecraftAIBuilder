/**
 * R182 matched-input, SOURCE-ONLY real B143 section/elevation comparison.
 * All three cases are static test-data authored in this script.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R178_SYNTHETIC_CASES} from './r178-wing-comparison.mjs';
import {R181_SYNTHETIC_SETTINGS,makeR181SyntheticReply}
 from './r181-courtyard-graph-comparison.mjs';
import {parseR181CourtyardGraphReply}
 from '../source/ai/r181-courtyard-graph.mjs';
import {parseR182RoomSectionReply,R182_SCHEMA}
 from '../source/ai/r182-room-led-section.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const fail=s=>{throw Error('R182_SECTION_PILOT_'+s);};
export const R182_SYNTHETIC_SECTION_CHOICES=[
 [{volumeId:'anchor',room:'front',breakZ:16,rise:3,insetX:2},
  {volumeId:'north',room:'front',breakZ:7,rise:3,insetX:1},
  {volumeId:'south',room:'rear',breakZ:25,rise:3,insetX:2}],
 [{volumeId:'anchor',room:'front',breakZ:16,rise:2,insetX:1},
  {volumeId:'north',room:'rear',breakZ:8,rise:3,insetX:2},
  {volumeId:'south',room:'front',breakZ:25,rise:3,insetX:1}],
 [{volumeId:'anchor',room:'rear',breakZ:16,rise:3,insetX:2},
  {volumeId:'north',room:'front',breakZ:7,rise:3,insetX:1},
  {volumeId:'south',room:'rear',breakZ:25,rise:2,insetX:2}]
];
export function makeR182SyntheticReply(t,i){
 const r=makeR181SyntheticReply(t,R181_SYNTHETIC_SETTINGS[i]);
 const sections=R182_SYNTHETIC_SECTION_CHOICES[i].map(q=>{
  const v=r.architecture.volumes.find(v=>v.id===q.volumeId);
  return {volumeId:v.id,raisedRoomId:v.roomIds.length===2?
   v.roomIds[q.room==='front'?0:1]:v.roomIds[0],
   highSide:q.room,breakZ:q.breakZ,rise:q.rise,insetX:q.insetX};
 });
 return {...r,roofSections:{
  schema:R182_SCHEMA,supersedesLegacyRoofProfile:true,sections}};
}
const checkSafe=p=>p.readiness==='NOT_PREPARED'&&
 p.worldWrites===0&&p.worldContacts===0&&
 p.executionAllowed===false&&p.constructionApproved===false&&
 p.BuildPlan.operations.length===0&&p.gates.length===9&&
 p.gates.every(g=>g==='BLOCKED');
export function buildR182MatchedSectionReview(){
 const cases=R178_SYNTHETIC_CASES.map((t,i)=>{
  const full=makeR182SyntheticReply(t,i);
  const r181=structuredClone(full);delete r181.roofSections;
  const request={naturalLanguageBrief:
   'Synthetic matched-input roofline research '+t.id};
  const old=parseR181CourtyardGraphReply(JSON.stringify(r181),request);
  const out=parseR182RoomSectionReply(JSON.stringify(full),request);
  const before=old.designOnlySource,after=out.designOnlySource;
  const evidence=after.r182SectionEvidence;
  if(!checkSafe(out)||!checkSafe(before)||!checkSafe(after)||
   !verifyCompiled(before.design,before.compiled)||
   !verifyCompiled(after.design,after.compiled)||
   after.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   after.sourceRouteAudit.featureAccess.length!==4||
   after.placements.length!==4||
   after.design.elements.length>160||
   evidence.buildingShellsWithRaisedCeilings!==3||
   !evidence.roomFurnitureAndCourtRoutesSourceVerified||
   after.geometrySha256===before.geometrySha256||
   out.modelCalls!==0||out.originalRawString!==JSON.stringify(full))
   fail('SOURCE_PHYSICAL_QA_'+t.id);
  return {id:t.id,use:t.use,before,after,
   audit:{id:t.id,use:t.use,
    originalRawSha256:out.originalRawSha256,
    beforeGeometrySha256:before.geometrySha256,
    afterGeometrySha256:after.geometrySha256,
    oldB143Voxels:before.compiled.primitives.length,
    newB143Voxels:after.compiled.primitives.length,
    beforeB143Elements:before.design.elements.length,
    afterB143Elements:after.design.elements.length,
    sections:evidence.explicitModelRoofIntent.sections,
    raisedShellCount:3,realClerestoryGlassVerified:true,
    allFourRoomsAndFurnitureReached:true,
    courtyardSourceAccessVerified:true,
    aestheticStatus:'ART_HOLD',inputType:'STATIC_SYNTHETIC',
    localModelCalls:0,minecraftWalking:'NOT_TESTED',
    worldWrites:0,worldContacts:0,readiness:'NOT_PREPARED',
    gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}}};
 });
 if(new Set(cases.map(c=>c.after.geometrySha256)).size!==3)
  fail('SOURCE_SHAPES_NOT_DISTINCT');
 return {schema:'r182-room-led-tectonic-sections-pilot-v1',
  actualLocalModelCalls:0,worldWrites:0,
  genuineModelInference:false,aestheticStatus:'ART_HOLD',cases};
}
const esc=x=>String(x).replaceAll('&','&amp;')
 .replaceAll('<','&lt;').replaceAll('>','&gt;');
export function saveR182MatchedSectionReview(out){
 if(!out||typeof out!=='string'||fs.existsSync(out))
  fail('OUTPUT_MUST_BE_NEW');
 const report=buildR182MatchedSectionReview(),
  dir=path.resolve(out),root=path.dirname(fileURLToPath(import.meta.url));
 const template=fs.readFileSync(path.join(root,
  '../source/ai/b143-viewer-template.html'),'utf8');
 const files=new Map();
 for(const c of report.cases)
  for(const [version,p] of [['r181',c.before],['r182',c.after]]){
   const prefix=c.id+'-'+version;
   files.set(prefix+'.html',renderB143Html(
    compileB143Gallery([p.design]),template));
   for(const side of ['front','rear','west','east','roof'])
    files.set(prefix+'-'+side+'.svg',
     renderR164Elevation(p.compiled,p.design,side));
  }
 files.set('R182_CI_QA.json',JSON.stringify({...report,
  cases:report.cases.map(c=>c.audit)},null,2)+'\n');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R181/R182 同一部屋・用途で屋根断面の実立体比較</title>'+
  '<style>body{font:15px/1.5 system-ui;background:#152336;color:#e7eef6;'+
  'padding:20px}section{background:#253e54;padding:14px;margin:15px 0}'+
  '.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}article{background:#35485b;padding:9px}'+
  'iframe{width:100%;height:400px}img{width:19.5%;max-height:300px}</style>'+
  '<h1>R182 室用途と屋根断面が結びついた実B143比較</h1>'+
  '<p>完全合成モデル入力。Qwen/Gemma本物の推論ではない。施工・書込み0。美術ART HOLD。</p>'+
  report.cases.map(c=>'<section><h2>'+esc(c.use)+'</h2><div class="grid">'+
   [['r181',c.before],['r182',c.after]].map(([version])=>
    '<article><h3>'+version.toUpperCase()+'</h3><iframe src="'+
    c.id+'-'+version+'.html"></iframe>'+
    ['front','rear','west','east','roof'].map(s=>'<img src="'+c.id+
     '-'+version+'-'+s+'.svg" alt="'+s+'">').join('')+'</article>').join('')+
   '</div></section>').join(''));
 fs.mkdirSync(dir,{recursive:false});
 for(const [file,content] of files)
  fs.writeFileSync(path.join(dir,file),content,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   ['### R182 true B143 stepped room-led skyline, entirely SYNTHETIC',
    'No Qwen/Gemma invocation, Minecraft operation or art approval.',
    '| Use | R181 voxels | R182 voxels | R182 elements |',
    '|---|---:|---:|---:|',
    ...report.cases.map(c=>'| '+c.use+' | '+c.audit.oldB143Voxels+
     ' | '+c.audit.newB143Voxels+' | '+c.audit.afterB143Elements+' |'),
    ''].join('\n'));
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('USAGE');
  const r=saveR182MatchedSectionReview(args[1]);
  console.log(JSON.stringify({cases:r.cases.length,realModelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2}
}
