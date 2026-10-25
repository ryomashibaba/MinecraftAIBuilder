/** R149 offline paired genuine B143 3D from unchanged archived Qwen text. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseR139RelationalFurnishedReply}
 from './r139-relational-model.mjs';
import {makeR134FreshRequest} from './r134-fresh-model-pilot.mjs';
import {CASE} from './r141-local-graph-evidence.mjs';
import {auditR143GraphEvidence} from './r143-independent-graph-audit.mjs';
import {deriveR149EnvelopeExpression,R152_EXPRESSION_SCHEMA}
 from '../source/ai/r149-architectural-expression.mjs';
import {deriveR150FurnitureArticulation}
 from '../source/ai/r150-furniture-articulation.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const EXPECTED_RAW='d67dc624744b4745e8e8c228e20bde00ccd39c7b506d0ad82753f54f1db82591';
const EXPECTED_R146_SOURCE='9003677576db7ccf1766f7bfdc9c80c03b10ac19a9975d8656cb1919b539a299';
const EXPECTED_R146_GEOMETRY='3adee1495ae0295eaadd5555c4b7538b38aceda740751ffe654c9976841e472f';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
export function buildR149PairedComparison(){
 const raw=fs.readFileSync(path.join(root,
  'scripts/fixtures/r146-user-qwen14b-20261025-raw.json'),'utf8');
 if(sha(raw)!==EXPECTED_RAW)throw Error('R149_ARCHIVED_QWEN_RAW_CHANGED');
 const result=parseR139RelationalFurnishedReply(raw,
  makeR134FreshRequest({brief:CASE.brief}),
  {allowRoofMaterialCorrection:true});
 const before=result.featured,graph=result.relationalBase;
 if(before.sourceSha256!==EXPECTED_R146_SOURCE||
  before.geometrySha256!==EXPECTED_R146_GEOMETRY||
  before.placements.length!==8||
  graph.program[0].zones.length!==4||
  graph.directAdjacencyDoorEvidence.length!==1||
  !result.boundedHostRepairRequired)
  throw Error('R149_R146_BASELINE_DRIFT');
 const independent=auditR143GraphEvidence({
  intent:result.semanticIntent,graphDesign:graph.design,
  finalDesign:before.design,finalCompiled:before.compiled,
  graphAudit:{sourceSha256:graph.sourceSha256,
   geometrySha256:graph.geometrySha256,
   entryFacing:graph.entryFacingZoneEvidence,
   directDoors:graph.directAdjacencyDoorEvidence},
  roomProgram:graph.program,featurePlacements:before.placements
 });
 if(independent.status!=='SOURCE_ROOM_GRAPH_VERIFIED')
  throw Error('R149_R146_INDEPENDENT_AUDIT_HOLD');
 const after=deriveR149EnvelopeExpression(before,{plan:graph.plan});
 const complete=deriveR150FurnitureArticulation(after);
 // Archived Qwen did NOT select this shape; HOST research option only.
 const massingIntent={schema:R152_EXPRESSION_SCHEMA,
  entryHierarchy:'quiet',daylightStrategy:'even',
  roofEdge:'fine',section:'raised-entry'};
 const raisedEnvelope=deriveR149EnvelopeExpression(before,{
  plan:graph.plan,expressionIntent:massingIntent});
 const raised=deriveR150FurnitureArticulation(raisedEnvelope);
 const template=fs.readFileSync(path.join(root,
  'source/ai/b143-viewer-template.html'),'utf8');
 const pages=[
  {file:'before-r146.html',content:renderB143Html(
   compileB143Gallery([before.design]),template)},
  {file:'after-r149.html',content:renderB143Html(
   compileB143Gallery([after.design]),template)},
  {file:'after-r150.html',content:renderB143Html(
   compileB143Gallery([complete.design]),template)},
  {file:'after-r152-host-study.html',content:renderB143Html(
   compileB143Gallery([raised.design]),template)}
 ];
 const evidence={
  schema:'r149-exterior-source-visual-paired-audit-v1',
  status:'SOURCE_NONREGRESSION_PASSED_ART_HOLD',
  originalModel:'SAVED_USER_LOCAL_QWEN3_14B_NOT_NEW_INFERENCE',
  originalQwenRawSha256:sha(raw),modelCalls:0,
  hostCorrection:'R146_EXPLICIT_ONE_FIELD_ROOF_MATERIAL_ONLY',
  r149ExpressionAuthorship:after.expressionAuthorship,
  roomCount:4,equipmentCount:8,directDoorCount:1,
  originalIndependentAudit:independent.status,
  originalSourceSha256:before.sourceSha256,
  originalGeometrySha256:before.geometrySha256,
  enhancedSourceSha256:after.sourceSha256,
  enhancedGeometrySha256:after.geometrySha256,
  originalVoxels:before.compiled.primitives.length,
  enhancedVoxels:after.compiled.primitives.length,
  sourceRoutesAfter:after.sourceRouteAudit.status,
  reachableEquipmentAfter:after.sourceRouteAudit.featureAccess.filter(
   f=>f.reachableFromEntrance).length,
  expression:after.r149ExpressionEvidence,
  r150SourceSha256:complete.sourceSha256,
  r150GeometrySha256:complete.geometrySha256,
  r150Voxels:complete.compiled.primitives.length,
  r150EquipmentEvidence:complete.r150EquipmentEvidence,
  r150SourceRoutes:complete.sourceRouteAudit.status,
  threeGenuineB143Viewers:true,
  r152HostStudy:{
   intentAuthorship:'HOST_RESEARCH_NOT_QWEN_MODEL_SELECTION',
   modelCallsDuringStudy:0,
   sourceSha256:raised.sourceSha256,
   geometrySha256:raised.geometrySha256,
   voxelCount:raised.compiled.primitives.length,
   raisedSection:raisedEnvelope.r149ExpressionEvidence.r152RealRoomRaisedSection,
   sourceRoutes:raised.sourceRouteAudit.status,
   reachedEquipment:raised.sourceRouteAudit.featureAccess.filter(
    x=>x.reachableFromEntrance).length,
   humanArtReview:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
   safety:'NOT_PREPARED_9_BLOCKED'
  },
  actualPairedB143Viewers:true,humanArtReview:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0
 };
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R152｜R146・R149・R150・R152の真正B143比較</title>'+
  '<style>body{background:#0d1724;color:#eaf2ff;font:14px/1.6 system-ui;'+
  'padding:16px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));'+
  'gap:12px}section{background:#192a40;padding:12px;border-radius:9px}'+
  'iframe{width:100%;height:600px;border:1px solid #61748b}'+
  '@media(max-width:850px){main{grid-template-columns:1fr}}</style>'+
  '<h1>R152｜R146から実天井高変更までの4段階比較</h1>'+
  '<p>R146原本→R149外装→R150内部設備の3段階。'+
  '4室・8設備・直接接続は維持。R152はホストによる比較用研究案で、Qwenが選んだ形ではありません。</p>'+
  '<p>変更した意匠はモデル自身の選択ではありません。美術審査HOLD、Minecraft未施工。'+
  '部屋・設備のソース到達検証のみPASS。数値改善を美術合格と見なしません。</p>'+
  '<main><section><h2>R146 従来版</h2><iframe src="before-r146.html" title="R146 B143 genuine viewer"></iframe></section>'+
  '<section><h2>R149 汎用外装派生案</h2><iframe src="after-r149.html" title="R149 B143 genuine viewer"></iframe></section>'+
  '<section><h2>R150 機能が読める設備形態</h2><iframe src="after-r150.html" title="R150 B143 genuine viewer"></iframe></section>'+
  '<section><h2>R152 実際の天井高を変える案（ホスト提案）</h2><iframe src="after-r152-host-study.html" title="R152 B143 host study"></iframe></section></main>'+
  '<p><a style="color:#9bd8ff" href="R149_EVIDENCE.json">出所・ソース非退行・安全証拠</a></p>'+
  '</html>';
 pages.unshift({file:'index.html',content:html});
 pages.push({file:'R149_EVIDENCE.json',content:JSON.stringify(evidence,null,2)+'\n'});
 pages.push({file:'R149_DERIVED_SOURCE.json',content:JSON.stringify(after.design,null,2)+'\n'});
 pages.push({file:'R150_DERIVED_SOURCE.json',content:JSON.stringify(complete.design,null,2)+'\n'});
 pages.push({file:'R150_EVIDENCE.json',content:JSON.stringify(complete.r150EquipmentEvidence,null,2)+'\n'});
 pages.push({file:'R152_HOST_DERIVED_SOURCE.json',content:JSON.stringify(raised.design,null,2)+'\n'});
 return {evidence,pages};
}
export function saveR149PairedComparison(out){
 if(typeof out!=='string'||!out.trim()||fs.existsSync(out))
  throw Error('R149_NO_OVERWRITE_OR_INVALID_OUTPUT');
 // Complete before creating a directory; fail without half-filled evidence.
 const bundle=buildR149PairedComparison();
 fs.mkdirSync(out,{recursive:false});
 for(const p of bundle.pages)
  fs.writeFileSync(path.join(out,p.file),p.content,{flag:'wx'});
 return bundle.evidence;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')throw Error('R149_USAGE --out NEW_DIRECTORY');
  const e=saveR149PairedComparison(a[1]);
  console.log(JSON.stringify({status:e.status,
   originalVoxels:e.originalVoxels,enhancedVoxels:e.enhancedVoxels,
   roomCount:e.roomCount,equipmentCount:e.equipmentCount,
   sourceRoutes:e.sourceRoutesAfter,modelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
