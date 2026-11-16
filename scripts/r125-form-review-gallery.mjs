/**
 * Offline, provenance-separated TRUE B143 3D comparison:
 * three archived Qwen designs (unaltered) plus a CONTROLLED synthetic
 * front-courtyard A/B study. Not a new local model call or ART approval.
 * Writes ONLY to a new user-supplied output directory.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SCHEMA,compileArchitecturePlan,auditArchitecturePlanCirculation,
 assessR125ProgramGeometry} from '../source/ai/r125-architecture-plan.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
import {buildR125SavedThreeGenreBaseline}
 from './r125-saved-three-genre-baseline.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stop=reason=>{throw Error('R125_FORM_REVIEW_'+reason);};
const saved=[
 'r125-qwen14b-residential-2024a.json',
 'r125-qwen14b-shop-20261024.json',
 'r125-qwen14b-research-20261024.json'
];
function controlledForm(withCourt){
 const p={
  schema:SCHEMA,id:withCourt?'research-front-court':'research-plain-control',
  title:withCourt?'Controlled front open-air court':'Controlled rectangular envelope',
  brief:'SYNTHETIC generic public making and exhibition, not local Qwen authorship',
  footprint:{width:28,depth:28},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'public-making',purpose:'public practical maker workspace',fixtures:['workbench']},
   {id:'public-display',purpose:'visitor exhibition area',fixtures:['display']}
  ]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain',
   ...(withCourt?{frontCornerCut:{
    width:6,depth:5,side:'west',access:'paved'}}:{})}
 };
 return p;
}
export function buildR125FormReviewGallery(){
 const pinned=buildR125SavedThreeGenreBaseline();
 if(pinned.report?.scenes?.length!==3)stop('ARCHIVED_COUNT');
 const designs=[],scenes=[];
 for(let i=0;i<saved.length;i++){
  const raw=fs.readFileSync(new URL('./fixtures/'+saved[i],import.meta.url),'utf8');
  const p=JSON.parse(raw),r=compileArchitecturePlan(p),original=pinned.report.scenes[i];
  if(r.planSha256!==original.planSha256||
     r.sourceSha256!==original.sourceSha256||
     r.geometrySha256!==original.geometrySha256||
     r.compiled.primitives.length!==original.voxels)
   stop('ARCHIVED_QWEN_GEOMETRY_DRIFT_'+i);
  designs.push(r.design);
  scenes.push({kind:'ARCHIVED_GENUINE_QWEN_PLAN',
   label:original.genre,id:p.id,
   sourceSha256:r.sourceSha256,geometrySha256:r.geometrySha256,
   voxels:r.compiled.primitives.length,authoredPlanModified:false,
   localModelCalls:0,art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'});
 }
 const pair=[];
 for(const withCourt of [false,true]){
  const p=controlledForm(withCourt),original=JSON.stringify(p);
  const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  if(JSON.stringify(p)!==original)stop('CONTROLLED_INPUT_MUTATION');
  const circulation=auditArchitecturePlanCirculation(r);
  const routes=auditR125SourceRoutes(r,{featureTargets:r.fixtureTargets??[]});
  const critique=critiqueArchitecture({design:r.design,compiled:r.compiled});
  const floors=assessR125ProgramGeometry(r,critique);
  if(circulation.status!=='SOURCE_CLEARANCE_PROBES_PASS'||
     routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
     floors.programFloorIssues.length!==0)
   stop('CONTROLLED_SOURCE_REJECT_'+(withCourt?'COURT':'PLAIN')+'_'+
    [circulation.status,routes.status,floors.programFloorIssues.length].join('_'));
  if(withCourt&&r.courtyardSourceOnly?.status!=='SOURCE_2_WIDE_PAVED_COURT_REACHABLE')
   stop('COURT_NOT_REACHABLE');
  if(r.worldWrites!==0||r.compiled.BuildPlan?.operations?.length!==0||
     !r.gates?.every(x=>x==='BLOCKED'))
   stop('WORLD_BOUNDARY_DRIFT');
  const cells=new Set(r.compiled.primitives.map(v=>v.slice(0,3).join(',')));
  const item={kind:'CONTROLLED_SYNTHETIC_FORM_STUDY',
   label:withCourt?'author-selectable-front-court':'unchanged-shape-control',
   id:p.id,authoredBy:'RESEARCH_FIXTURE_NOT_LOCAL_QWEN',
   featuresChanged:withCourt?['frontCornerCut']:[],
   fixturesSelected:['workbench','display'],
   sourceSha256:r.sourceSha256,geometrySha256:r.geometrySha256,
   voxels:r.compiled.primitives.length,sourceRoutes:routes.status,
   sourceCirculation:circulation.status,programFloorIssues:floors.programFloorIssues,
   highRiskFindings:critique.findings.filter(f=>f.severity==='HIGH').map(f=>f.id),
   frontCourtyard:withCourt?{
    size:{width:6,depth:5},side:'west',groundCells:30,
    trueOpenSky:true,twoWideReachable:r.courtyardSourceOnly.status,
    independentExteriorDoorway:true
   }:null,
   authorProviderIndependentlyAttested:false,localModelCalls:0,
   originalPlanEdited:false,art:'NOT_REVIEWED',
   minecraftWalking:'NOT_TESTED',worldWrites:0};
  pair.push({item,cells});scenes.push(item);designs.push(r.design);
 }
 const control=pair[0].cells,court=pair[1].cells;
 const removed=[...control].filter(c=>!court.has(c)).length;
 const added=[...court].filter(c=>!control.has(c)).length;
 if(!removed||!added||scenes[3].geometrySha256===scenes[4].geometrySha256)
  stop('NO_TRUE_MASSING_DIFFERENCE');
 const comparison={removedSolidCells:removed,addedSolidCells:added,
  method:'ACTUAL_B143_OCCUPIED_VOXEL_SET_DIFFERENCE',
  visualImprovement:'NOT_CERTIFIED_BY_DIFFERENCE',
  sameProgramAndMaterials:true};
 const gallery=compileB143Gallery(designs);
 if(gallery.scenes.length!==5||
    gallery.geometryHashes.some((hash,i)=>hash!==scenes[i].geometrySha256))
  stop('TRUE_B143_GALLERY_MISMATCH');
 const template=fs.readFileSync(path.join(ROOT,
  'source/ai/b143-viewer-template.html'),'utf8');
 let html=renderB143Html(gallery,template);
 const banner='<section class="info" id="r125-form-provenance">'+
  '<strong>真正Qwen保存3棟 + 合成研究の同一用途A/B比較</strong>'+
  '<p>選択欄の最初の3棟は保存済みの真正Qwen原案を無変更で再生。'+
  '後半2棟は研究用の合成計画であり、Qwenが考案した建築ではありません。'+
  '新規ローカル推論・Minecraft施工・美術合格は一切主張しません。</p>'+
  '<p>合成A/Bの実ボクセル差：削除 '+removed+' セル、追加 '+added+
  ' セル。品質向上かどうかは人間の3D比較と実機で要検証。</p></section>';
 const slot='<h2 style="margin-top:20px">表示設定</h2>';
 if(html.split(slot).length!==2)stop('VIEWER_INSERTION_CHANGED');
 html=html.replace(slot,banner+slot);
 return {html,report:{schema:'r125-v11-form-review-gallery-v1',
  provenance:'THREE_ARCHIVED_QWEN_PLUS_TWO_LABELED_SYNTHETIC_RESEARCH_FORMS',
  newLocalModelCalls:0,allScenesTrueB143:true,originalThreeQwenUnchanged:true,
  experimentalDifference:comparison,scenes,art:'NOT_REVIEWED',
  minecraft:'NOT_TESTED',worldWrites:0,constructionApproved:false,
  gates:Array(9).fill('BLOCKED')}};
}
export function saveR125FormReviewGallery(directory){
 if(typeof directory!=='string'||!directory.trim())stop('OUTPUT_REQUIRED');
 const out=path.resolve(directory),parent=path.dirname(out);
 if(fs.existsSync(out)||!fs.existsSync(parent)||!fs.statSync(parent).isDirectory())
  stop('OUTPUT_MUST_BE_NEW');
 const built=buildR125FormReviewGallery();
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'index.html'),built.html,{flag:'wx'});
 fs.writeFileSync(path.join(out,'FORM_REVIEW.json'),
  JSON.stringify(built.report,null,2)+'\n',{flag:'wx'});
 return built.report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')
   stop('REQUIRE_OUT');
  const report=saveR125FormReviewGallery(process.argv[3]);
  console.log('R125_FORM_REVIEW',JSON.stringify({
   scenes:report.scenes.length,comparison:report.experimentalDifference,
   newLocalModelCalls:0,worldWrites:0,art:'NOT_REVIEWED'}));
 }catch(e){console.error(String(e.message??e));process.exitCode=2;}
}
