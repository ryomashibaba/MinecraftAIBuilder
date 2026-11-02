/**
 * R125 repair study: original Qwen plan, legacy HOST C expression vs a
 * separate source-repaired C. No model requests or Minecraft world writes.
 * Never replace frozen A–E or relabel HOST geometry as model-authored.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan,assessR125ProgramGeometry}
 from '../source/ai/r125-architecture-plan.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PIN='46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271';
const fail=x=>{throw Error('R125_UPPER_DOOR_RESEARCH_'+x);};
const targetPlan=()=>JSON.parse(fs.readFileSync(
 path.join(ROOT,'scripts/fixtures/r125-qwen14b-residential-2024a.json'),'utf8'));
export function studyR125UpperDoorRepair(){
 const plan=targetPlan(),original=JSON.stringify(plan);
 const candidate=structuredClone(plan);
 candidate.id='lumina-sawtooth-screen';
 candidate.title='C: Rear setback · sawtooth roof · side screen';
 candidate.expression={setbackSide:'rear',setbackDepth:4,
  roofProfile:'sawtooth',roofAxis:'z',facadeLanguage:'screen'};
 const before=compileArchitecturePlan(candidate);
 const after=compileArchitecturePlan(candidate,{upperDoorPlacement:'stair-clear'});
 if(before.planSha256!==after.planSha256||
  before.planSha256===PIN||JSON.stringify(plan)!==original)
  fail('PROVENANCE_OR_INPUT_MUTATION');
 if(before.geometrySha256!=='4d4c1b19196e14b8aaa99edc53c94d1511ef8e3e622675883f302658a334a5dc')
  fail('LEGACY_C_GEOMETRY_DRIFT');
 if(after.geometrySha256===before.geometrySha256)fail('NO_REAL_GEOMETRY_CHANGE');
 const oldAudit=critiqueArchitecture({design:before.design,compiled:before.compiled});
 const newAudit=critiqueArchitecture({design:after.design,compiled:after.compiled});
 const oldRisk=assessR125ProgramGeometry(before,oldAudit);
 const newRisk=assessR125ProgramGeometry(after,newAudit);
 const standingY=7;
 const elevated=critique=>critique.objectiveAudit.elevationConnectivity
  .find(x=>x.standingY===standingY);
 const oldElevation=elevated(oldAudit),newElevation=elevated(newAudit);
 if(oldElevation?.componentCount!==2||newElevation?.componentCount!==1||
  !oldRisk.programFloorIssues.some(x=>x.standingY===7)||
  newRisk.programFloorIssues.length!==0)
  fail('SOURCE_FLOOR_REPAIR_NOT_PROVEN');
 if([before,after].some(x=>x.worldWrites!==0||x.constructionApproved!==false||
  x.gates.length!==9||x.gates.some(g=>g!=='BLOCKED')))
  fail('WORLD_SAFETY');
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 // One scene per HTML: B143 gallery source ids must remain identical to
 // the original design rather than fabricating a changed model design ID.
 const originalHtml=renderB143Html(compileB143Gallery([before.design]),template);
 const repairedHtml=renderB143Html(compileB143Gallery([after.design]),template);
 const report={
  schema:'r125-upper-divider-stair-clear-repair-study-v1',
  originalQwenPlanSha256:PIN,originalModelProgramUnchanged:true,
  authorship:'HOST_GEOMETRY_RESEARCH_NOT_NEW_MODEL_OUTPUT',
  legacyC:{planSha256:before.planSha256,sourceSha256:before.sourceSha256,
   geometrySha256:before.geometrySha256,
   programFloorStatus:oldRisk.status,secondLevel:oldElevation},
  repairedC:{planSha256:after.planSha256,sourceSha256:after.sourceSha256,
   geometrySha256:after.geometrySha256,
   programFloorStatus:newRisk.status,secondLevel:newElevation,
   programFloorIssues:newRisk.programFloorIssues,
   exteriorWarnings:newRisk.exteriorSurfaceAdvisories},
  sourceOnly:true,modelCalls:0,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'
 };
 const compareHtml='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R125 上階2幅床：旧Cと共通ドア配置修復案</title>'+
  '<style>body{margin:0;background:#0b1b2a;color:#e6f4ff;font:16px system-ui,sans-serif}'+
  'header{padding:20px}a{color:#82e6fa}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,390px),1fr));gap:10px;padding:10px}'+
  'iframe{width:100%;height:75vh;min-height:440px;border:1px solid #517184;border-radius:8px}</style></head><body>'+
  '<header><h1>真正SOURCEで2幅床を比較する研究</h1>'+
  '<p>左：旧C（2階で2領域）。右：共通の階段シャフト回避規則で扉を移動（2階で1領域）。</p>'+
  '<p>変更はHOSTのみ。Qwen原文は不変、ART HOLD、ゲーム歩行未確認、Minecraft施工禁止。</p>'+
  '<a href="REPAIR_SOURCE_REPORT.json">幾何SHA・2幅床の独立照合を読む</a></header>'+
  '<main><section><h2>旧C — SOURCE HOLD</h2><iframe title="従来Cの真正ボクセル" src="legacy/index.html"></iframe></section>'+
  '<section><h2>修復案 — HOST派生研究</h2><iframe title="修復案の真正ボクセル" src="stair-clear/index.html"></iframe></section></main></body></html>';
 return {report,originalHtml,repairedHtml,compareHtml};
}
export function saveR125UpperDoorRepair(outputDir){
 if(typeof outputDir!=='string'||!outputDir.trim())fail('OUTPUT_REQUIRED');
 const dir=path.resolve(outputDir);
 if(fs.existsSync(dir))fail('OUTPUT_ALREADY_EXISTS');
 const r=studyR125UpperDoorRepair();
 fs.mkdirSync(path.join(dir,'legacy'),{recursive:true});
 fs.mkdirSync(path.join(dir,'stair-clear'),{recursive:true});
 fs.writeFileSync(path.join(dir,'index.html'),r.compareHtml,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'legacy/index.html'),r.originalHtml,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'stair-clear/index.html'),r.repairedHtml,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'REPAIR_SOURCE_REPORT.json'),JSON.stringify(r.report,null,2)+'\n',{flag:'wx'});
 return r.report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')fail('REQUIRE_OUT');
  const report=saveR125UpperDoorRepair(process.argv[3]);
  console.log('R125_SOURCE_REPAIR_'+report.legacyC.secondLevel.componentCount+
   '_TO_'+report.repairedC.secondLevel.componentCount+'_RESEARCH_ONLY');
 }catch(e){console.error(String(e));process.exitCode=2;}
}
