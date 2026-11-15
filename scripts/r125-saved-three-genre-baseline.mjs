/**
 * Review the THREE ALREADY-PUBLIC saved genuine Qwen14B semantic plans as
 * real frozen B143 voxels on ONE phone/desktop viewer. NOT new inference:
 * the saved user-supplied plans are pinned by original/source/geometry SHA.
 * Never modifies the historical plans, worlds, model services or paid APIs.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan,auditArchitecturePlanCirculation,
 assessR125ProgramGeometry} from '../source/ai/r125-architecture-plan.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=x=>{throw Error('R125_SAVED_THREE_'+x);};
const CASES=[
 {genre:'housing',file:'r125-qwen14b-residential-2024a.json',
  plan:'46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271',
  source:'4ca2edf2eb066f2f0eecd7dfdc4a710a1e69bc7196c5f85c65483caaa0d9fbd1',
  geometry:'0fc0db6814e105db62da272abb1235cce9d77d4950eab2a0e91d940283201a2e',
  voxels:2620},
 {genre:'retail',file:'r125-qwen14b-shop-20261024.json',
  plan:'e7a6f04c7aa6760805939a90ecce43d42a40cd68c9458d9591fe43ea76824e71',
  source:'05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d',
  geometry:'693edc6c969ef5c295d8ef84b499cc8140c3ab8ab550a00e500ae915256edb28',
  voxels:933},
 {genre:'research',file:'r125-qwen14b-research-20261024.json',
  plan:'aaa0521547a284c2170be3cc8c5db9195f6a953faeb05655f68b474938d3ab87',
  source:'662a79ac44d9ed0cc9d9e49bbc644a25b2e8237a25d7832fa1f8be4e3c3f32c6',
  geometry:'c855de91535e632b2a97dc28a93d8a8cb92d5720d26f8df6f8379b2dc8c284af',
  voxels:2936}
];
export function buildR125SavedThreeGenreBaseline(){
 const originalPlans=[],designs=[],scenes=[];
 for(const c of CASES){
  const original=JSON.parse(fs.readFileSync(new URL(
   './fixtures/'+c.file,import.meta.url),'utf8'));
  const snapshot=JSON.stringify(original);
  const product=compileArchitecturePlan(original);
  if(product.planSha256!==c.plan||product.sourceSha256!==c.source||
     product.geometrySha256!==c.geometry||
     product.compiled.primitives.length!==c.voxels)
   fail('FROZEN_GENUINE_QWEN_DRIFT_'+c.genre);
  if(JSON.stringify(original)!==snapshot||product.worldWrites!==0||
     product.worldContacts!==0||product.compiled.BuildPlan.operations.length!==0||
     product.gates.length!==9||!product.gates.every(x=>x==='BLOCKED'))
   fail('ORIGINAL_OR_WORLD_BOUNDARY_'+c.genre);
  const critique=critiqueArchitecture({design:product.design,
   compiled:product.compiled});
  const floors=assessR125ProgramGeometry(product,critique);
  const circulation=auditArchitecturePlanCirculation(product);
  const routes=auditR125SourceRoutes(product);
  const rooms=product.program.flatMap(l=>l.zones.map(z=>({
   id:z.id,purpose:z.purpose,range:z.range})));
  const modelChosenEquipment=original.levels.reduce((n,l)=>
   n+l.spaces.reduce((sum,s)=>sum+(s.fixtures?.length??(s.fixture?1:0)),0),0);
  const builtEquipment=product.design.elements.filter(e=>
   e.id.startsWith('fx-')).length;
  const mismatch=c.genre==='retail'&&original.levels[0].splitAxis==='x'&&
   original.levels[0].spaces[0].id.includes('front')&&
   original.levels[0].spaces[1].id.includes('back');
  originalPlans.push(original);designs.push(product.design);
  scenes.push({
   genre:c.genre,title:original.title,planSha256:product.planSha256,
   sourceSha256:product.sourceSha256,geometrySha256:product.geometrySha256,
   voxels:product.compiled.primitives.length,
   footprint:original.footprint,levels:original.levels.length,
   roomCount:rooms.length,rooms,modelChosenEquipment,builtEquipment,
   splitAxes:original.levels.map(l=>l.splitAxis),
   roofProfile:original.expression?.roofProfile??'flat',
   highRiskCount:critique.highRiskCount,
   highRiskIds:critique.findings.filter(x=>x.severity==='HIGH').map(x=>x.id),
   programFloorStatus:floors.status,
   programFloorIssues:floors.programFloorIssues,
   exteriorAdvisories:floors.exteriorSurfaceAdvisories,
   sourceCirculation:circulation.status,sourceRouteStatus:routes.status,
   warning:mismatch?'Rooms named front/back are physically LEFT/RIGHT (x split), not FRONT/REAR.':null,
   provenance:'SAVED_USER_SUPPLIED_QWEN14B_SEMANTIC_PLAN_NO_NEW_INFERENCE',
   authorProviderIndependentlyAttested:false,
   newLLMInvocation:false,humanArt:'NOT_REVIEWED',
   minecraftWalking:'NOT_TESTED',worldWrites:0
  });
 }
 const gallery=compileB143Gallery(designs);
 if(gallery.scenes.length!==3||
    gallery.geometryHashes.some((s,i)=>s!==scenes[i].geometrySha256))
  fail('TRUE_B143_GALLERY_MISMATCH');
 const template=fs.readFileSync(path.join(ROOT,
  'source/ai/b143-viewer-template.html'),'utf8');
 const rawHtml=renderB143Html(gallery,template);
 const displayFacts=scenes.map(s=>({
  genre:s.genre,rooms:s.rooms.map(r=>r.purpose),
  equipment:s.modelChosenEquipment,voxels:s.voxels,
  levels:s.levels,roof:s.roofProfile,
  floor:s.programFloorStatus,routes:s.sourceRouteStatus,
  circulation:s.sourceCirculation,high:s.highRiskIds,
  warning:s.warning,source:s.sourceSha256
 }));
 const encoded=JSON.stringify(displayFacts)
  .replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028')
  .replaceAll('\u2029','\\u2029');
 const note='<section id="qwen-three-review" class="info" aria-live="polite">'+
  '<strong>保存済み実Qwen14B・3用途の形状比較</strong>'+
  '<p style="margin:6px 0">3件とも当時の意味設計原本。新規Qwen推論0回。'+
  '幾何は共通HOST→真正B143で再生したものです。</p>'+
  '<div id="qwen-three-facts"></div>'+
  '<p id="qwen-three-warning" style="color:#ffc78d"></p>'+
  '<small>SOURCE検査≠美術合格／設備機能≠用途名。Minecraft歩行は今回未実施。'+
  'モデル提供元の独立認証はありません。</small></section>';
 const browserScript='<script>(function(){"use strict";const facts='+encoded+';'+
  'const select=document.getElementById("building");'+
  'const target=document.getElementById("qwen-three-facts");'+
  'const warning=document.getElementById("qwen-three-warning");'+
  'function update(){const f=facts[Number(select.value)];if(!f)return;'+
  'const cells=['+
   '["用途",f.genre],["実B143",f.voxels+" cells"],'+
   '["建築階数",f.levels],["屋根",f.roof],'+
   '["当時のQwen指定設備",f.equipment],["室内経路",f.routes],'+
   '["床SOURCE",f.floor],["HIGH指摘",f.high.join(" / ")||"なし"],'+
   '["部屋の用途",f.rooms.join(" / ")]'+
  '];target.replaceChildren();for(const [k,v]of cells){'+
   'const p=document.createElement("p");p.style.margin="5px 0";'+
   'p.textContent=k+"： "+v;target.appendChild(p);'+
  '}warning.textContent=f.warning||"";'+
  '}select.addEventListener("change",update);update();})();</script>';
 if(rawHtml.split('<h2 style="margin-top:20px">表示設定</h2>').length!==2||
    rawHtml.split('</body>').length!==2)
  fail('VIEWER_INSERTION_POINT_CHANGED');
 const html=rawHtml.replace('<h2 style="margin-top:20px">表示設定</h2>',
  note+'<h2 style="margin-top:20px">表示設定</h2>')
  .replace('</body>',browserScript+'</body>');
 return {report:{
  schema:'r125-saved-qwen-3genre-baseline-v1',model:'qwen3:14b',
  provenance:'THREE_PREVIOUSLY_USER_SUPPLIED_PUBLIC_SEMANTIC_PLANS',
  originalModelProviderIndependentlyAttested:false,
  newModelCalls:0,authoredPlansUnmodified:true,sourceOnly:true,
  threeGenreComparison:true,allScenesFromFinalB143Voxels:true,
  scenes,art:'NOT_REVIEWED',minecraft:'NOT_TESTED',
  constructionApproved:false,executionAllowed:false,worldWrites:0,
  gates:Array(9).fill('BLOCKED')
 },html};
}
export function saveR125SavedThreeGenreBaseline(directory){
 if(typeof directory!=='string'||!directory.trim())fail('OUTPUT_REQUIRED');
 const out=path.resolve(directory),parent=path.dirname(out);
 if(fs.existsSync(out)||!fs.existsSync(parent)||
    !fs.statSync(parent).isDirectory())fail('OUTPUT_MUST_BE_NEW');
 const built=buildR125SavedThreeGenreBaseline();
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'index.html'),built.html,{flag:'wx'});
 fs.writeFileSync(path.join(out,'SAVED_3GENRE_BASELINE.json'),
  JSON.stringify(built.report,null,2)+'\n',{flag:'wx'});
 return built.report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')
   fail('REQUIRE_OUT');
  const result=saveR125SavedThreeGenreBaseline(process.argv[3]);
  console.log('R125_THREE_SAVED_QWEN_REAL_B143_BASELINE',JSON.stringify({
   scenes:result.scenes.length,voxels:result.scenes.map(s=>s.voxels),
   newModelCalls:0,worldWrites:0,art:'NOT_REVIEWED'}));
 }catch(e){console.error('R125_SAVED_THREE_HOLD',String(e.message??e));
  process.exitCode=2;}
}
