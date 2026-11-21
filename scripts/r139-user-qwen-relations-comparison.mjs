/**
 * R139 source-only REAL-SAVED-QWEN program / HOST-AUTHORED relation comparison.
 * None of the 2026-10-25 Qwen raw messages contain model-authored relations.
 * Preserve raw SHA, purposes and 8 original Qwen-selected equipment per case.
 * Room links here are an explicit designer TEST SCENARIO, never Qwen output.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readR137SavedRealQwenCapture}
 from './r137-user-capture-replay.mjs';
import {recoverR137Furnished}
 from './r137-bounded-recovery.mjs';
import {parseR135FreshFurnishedReply}
 from './r135-furnished-program.mjs';
import {makeR134FreshRequest}
 from './r134-fresh-model-pilot.mjs';
import {CASES} from './r136-local-evidence.mjs';
import {deriveR138BranchedTopology}
 from '../source/ai/r138-branching-topology.mjs';
import {deriveR139RelationalTopology,SCHEMA}
 from '../source/ai/r139-room-relations.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
import {auditR143GraphEvidence}
 from './r143-independent-graph-audit.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
export function buildR139SavedQwenRelationGallery(){
 const archived=readR137SavedRealQwenCapture();
 const template=fs.readFileSync(path.join(ROOT,
  'source/ai/b143-viewer-template.html'),'utf8');
 const pages=[],records=[];
 for(const [i,capture] of archived.cases.entries()){
  const request=makeR134FreshRequest({brief:CASES[i].brief});
  const recovered=recoverR137Furnished({
   raw:capture.raw,request,build:parseR135FreshFurnishedReply});
  const base=recovered.result.base;
  const originalIds=base.program[0].zones.map(x=>x.id);
  if(originalIds.length!==4)throw Error('R139_GALLERY_FOUR_ROOMS_REQUIRED');
  const branched=deriveR138BranchedTopology(base);
  const intent={
   schema:SCHEMA,basePlanSha256:base.planSha256,
   entryFacingZoneId:originalIds[3],
   directAdjacencies:[
    [originalIds[0],originalIds[2]],
    [originalIds[1],originalIds[3]]
   ]
  };
  const relation=deriveR139RelationalTopology(base,intent);
  const objects=JSON.parse(capture.raw).objects.map(x=>({
   ...x,detail:'assembled'}));
  const furnish=stage=>applyR125FeatureIntent({base:stage,intent:{
   schema:ASSEMBLED_SCHEMA,basePlanSha256:stage.planSha256,objects
  }});
  const before=furnish(branched),after=furnish(relation);
  if(before.placements.length!==8||after.placements.length!==8||
   before.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   after.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')
   throw Error('R139_GALLERY_REAL_QWEN_FURNITURE_OR_ROUTES');
  const independent=auditR143GraphEvidence({
   intent,graphDesign:relation.design,finalDesign:after.design,
   finalCompiled:after.compiled,
   graphAudit:{
    sourceSha256:relation.sourceSha256,
    geometrySha256:relation.geometrySha256,
    entryFacing:relation.entryFacingZoneEvidence,
    directDoors:relation.directAdjacencyDoorEvidence
   },
   roomProgram:relation.program,
   featurePlacements:after.placements
  });
  if(independent.status!=='SOURCE_ROOM_GRAPH_VERIFIED')
   throw Error('R143_GALLERY_INDEPENDENT_SOURCE_ROOM_GRAPH_HOLD');
  const id=CASES[i].id;
  for(const [filename,design] of [
   ['r138-branch',before.design],['r139-room-graph',after.design]])
   pages.push({file:id+'/'+filename+'.html',html:
    renderB143Html(compileB143Gallery([design]),template)});
  records.push({
   id,originalRealQwenRawSha256:capture.raw_sha256,
   originalQwenSpatialGraphPresent:false,
   roomGraphOrigin:'HOST_DESIGNER_TEST_SCENARIO_NOT_QWEN_CHOICE',
   relationIntent:intent,
   roomAssignments:relation.program[0].zones.map(z=>({
    zoneId:z.id,purpose:z.purpose,sector:z.physicalSector})),
   physicalDoors:relation.directAdjacencyDoorEvidence,
   independentR143VoxelAudit:independent,
   retainedQwenEquipmentCount:after.placements.length,
   geometrySha256:{R138:before.geometrySha256,R139:after.geometrySha256},
   sourceRoutes:{R138:before.sourceRouteAudit.status,
    R139:after.sourceRouteAudit.status},
   modelCallsInReplay:0,minecraftWorldWrites:0,
   aestheticReview:'NOT_REVIEWED'
  });
 }
 const cards=records.map(r=>'<section><h2>'+escape(r.id)+'</h2>'+
  '<p>実Qwen回答の4室・8設備は保持。新しい入口/隣接グラフはモデルが'+
  '提案したものではなく、ホスト側の検証シナリオです。</p>'+
  '<p>R139入口向き: '+escape(r.relationIntent.entryFacingZoneId)+
  ' / 直接室間ドア: '+r.physicalDoors.length+
  ' / ボクセル独立監査: '+escape(r.independentR143VoxelAudit.status)+'</p>'+
  '<div class="compare"><div><b>R138 中央通路</b><iframe src="'+
  r.id+'/r138-branch.html" title="R138 source"></iframe></div>'+
  '<div><b>R139 指定関係を持つ実3D</b><iframe src="'+
  r.id+'/r139-room-graph.html" title="R139 source"></iframe></div>'+
  '</div></section>').join('');
 pages.unshift({file:'index.html',html:'<!doctype html><html lang="ja">'+
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width">'+
  '<style>body{font:14px/1.6 system-ui;background:#101c2a;color:white;'+
  'padding:20px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:12px}'+
  'iframe{width:100%;height:430px;border:1px solid #718397}'+
  'section{background:#23364b;padding:16px;margin:12px 0}'+
  '@media(max-width:800px){.compare{grid-template-columns:1fr}}</style>'+
  '<h1>R139｜実Qwen設計の部屋を、明示的なホスト指定グラフへ再配置</h1>'+
  '<p>回転できる真正B143の3D。元モデルに隣接指示はありません。'+
  '実モデル推論0回、Minecraft施工0件、美術評価と実機歩行は未検証。</p>'+
  cards+'</html>'});
 return {schema:'r139-real-qwen-intent-host-graph-source-comparison-v1',
  records,pages,modelCallsDuringReplay:0,worldWrites:0,
  originalQwenRelationsAuthored:false,
  humanAestheticPass:false,minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',executionAllowed:false,
  constructionApproved:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}};
}
export function saveR139SavedQwenRelationGallery(out){
 if(typeof out!=='string'||!out.trim())throw Error('R139_OUTPUT_REQUIRED');
 const dir=path.resolve(out);
 if(fs.existsSync(dir))throw Error('R139_NO_OVERWRITE');
 const data=buildR139SavedQwenRelationGallery();
 fs.mkdirSync(dir,{recursive:false});
 for(const page of data.pages){
  const dest=path.join(dir,page.file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,page.html,{flag:'wx'});
 }
 fs.writeFileSync(path.join(dir,'R139_SOURCE_EVIDENCE.json'),
  JSON.stringify({...data,pages:data.pages.map(x=>x.file)},null,2)+'\n',
  {flag:'wx'});
 return data;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')throw Error('R139_ARGS');
  const r=saveR139SavedQwenRelationGallery(a[1]);
  console.log(JSON.stringify({status:'R139_PHYSICAL_ROOM_RELATIONS_SOURCE_ONLY',
   cases:r.records.length,views:r.pages.length-1,
   retainedEquipment:r.records.map(x=>x.retainedQwenEquipmentCount),
   newDoors:r.records.map(x=>x.physicalDoors.length),
   modelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
