/**
 * R102 architectural alternative. Taper R100 source gallery shoulders into
 * original R88 narrow endpoint sections. Retain R100 when new geometry has
 * no witnessed functional benefit or breaks original source constraints.
 * Still NOT a physical path or structural / Minecraft certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR100WidenedGalleryStudy,designR100ShoulderTriangles,
 prepareR100ShoulderReview,SCHEMA as R100_SCHEMA}
 from './b198zr100-source-gallery-shoulders.mjs';
import {screenR99FiniteRoute}
 from './b198zr99-finite-volume-route-witness.mjs';
import {buildR97CompareViews}
 from './b198zr97-multiview-mesh-review.mjs';
import {auditR103SourceJoint,auditR103SevenJunctions}
 from './b198zr103-source-junction-integrity.mjs';
import {reconcileR104SourceMesh} from './b198zr104-r91-active-throat-repair.mjs';
import {optimizeR105LiveR91Widening} from './b198zr105-active-r91-throat-width-selection.mjs';
import {reflowR106SourceTable} from './b198zr106-reading-table-doorway-reflow.mjs';
import {proposeR107CompactRecovery} from './b198zr107-compact-reading-table-recovery.mjs';
import {inspectR108RightLaneSourceHits}
 from './b198zr108-r91-right-lane-hit-triage.mjs';
import {inspectR109RealFloorReferencedRoute}
 from './b198zr109-realfloor-referenced-r91-route.mjs';
import {inspectR110RightSourceContouredApproach}
 from './b198zr110-source-contoured-right-room-approach.mjs';
import {studyR111RealFinishTransition}
 from './b198zr111-reversible-floor-finish-transition.mjs';
import {inspectR112LanternCanopyRevision}
 from './b198zr112-lantern-canopy-clearance.mjs';
import {inspectR113PitchedCanopyStudy}
 from './b198zr113-pitched-lantern-daylight-canopy.mjs';

export const SCHEMA='minecraftaibuilder-b198zr102-tapered-source-gallery-end-transitions-v1';
const fail=s=>{throw Error('B198ZR102_'+s)};
const R=n=>+n.toFixed(7);
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const OLD_HALF=.016,OUT_HALF=.030;
const tri=(out,a,b,c,kind)=>out.push({a:a.map(R),b:b.map(R),c:c.map(R),kind});
function area(f){
 const u=f.b.map((x,i)=>x-f.a[i]),v=f.c.map((x,i)=>x-f.a[i]);
 const c=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 return Math.hypot(...c)*.5;
}
const lerp=(a,b,t)=>a.map((v,i)=>R(v+(b[i]-v)*t));
const offset=(p,n,half,sign)=>[R(p[0]+sign*half*n[0]),R(p[1]),R(p[2]+sign*half*n[1])];
/**
 * Source anchored and nondegenerate: inner strip remains at original .016
 * half width while outer strip ramps 0.016 -> 0.030 -> 0.016. At start/end
 * there is no invented new overhanging rectangular outer edge.
 */
export function designR102TaperedShoulderTriangles({
 side,sourceAnchor,sourcePad,rampFraction=.18
}={}){
 if(!['left','right'].includes(side)||!finite(sourceAnchor)||!finite(sourcePad)||
  !Number.isFinite(rampFraction)||rampFraction<=.05||rampFraction>=.30)
  fail('SOURCE_LINE_AND_TAPER_REQUIRED');
 const original=designR100ShoulderTriangles({side,sourceAnchor,sourcePad});
 const dx=sourcePad[0]-sourceAnchor[0],dz=sourcePad[2]-sourceAnchor[2];
 const planar=Math.hypot(dx,dz),n=[-dz/planar,dx/planar];
 const stations=[{t:0,width:OLD_HALF},{t:rampFraction,width:OUT_HALF},
  {t:1-rampFraction,width:OUT_HALF},{t:1,width:OLD_HALF}];
 const faces=[],kind=side+'_R102_TAPERED_SOURCE_GALLERY_APRON_NOT_CERTIFIED';
 for(const sign of [-1,1]){
  const slices=stations.map(s=>{
   const center=lerp(sourceAnchor,sourcePad,s.t);
   return {inside:offset(center,n,OLD_HALF,sign),
    outside:offset(center,n,s.width,sign)};
  });
  // Pinched first and last strips require triangles, not zero-area quads.
  tri(faces,slices[0].inside,slices[1].outside,slices[1].inside,kind);
  tri(faces,slices[1].inside,slices[1].outside,slices[2].outside,kind);
  tri(faces,slices[1].inside,slices[2].outside,slices[2].inside,kind);
  tri(faces,slices[2].inside,slices[2].outside,slices[3].inside,kind);
 }
 if(faces.length!==8||faces.some(f=>!Number.isFinite(area(f))||area(f)<1e-10))
  fail('TAPER_SHOULDER_HAS_DEGENERATE_REAL_TRIANGLES');
 const endpoints=stations.filter(s=>s.t===0||s.t===1).map(s=>{
  const p=lerp(sourceAnchor,sourcePad,s.t);
  return [-1,1].map(sign=>offset(p,n,OLD_HALF,sign));
 }).flat();
 if(endpoints.some(p=>!finite(p)))fail('SOURCE_END_TRIANGLES_NONFINITE');
 return {faces,endpoints,
  sourceLine:[sourceAnchor,sourcePad],taperFraction:rampFraction,
  sourceNarrowWidthNormalized:OLD_HALF*2,
  wideMiddleWidthNormalized:OUT_HALF*2,
  sourceR100WholeWidthNormalized:original.newNormalizedWidth,
  centralOriginalGalleryUnmodified:true};
}
function preservedAtrium(faces,side){
 return faces.every(f=>[f.a,f.b,f.c].every(p=>
  side==='right'?p[0]>.400001:p[0]<-.400001));
}
function assess(faces,line){
 const m=screenR99FiniteRoute(faces,line);
 return {floor:m.witnessCounts.floor,overhead:m.witnessCounts.overhead,
  lateral:m.witnessCounts.lateral,
  incomplete:m.unscreenedSegmentCount,stationCount:m.stationCount,
  sourceCoverageComplete:m.allDeclaredSourceSegmentsWithinProbeCoverage};
}
export function buildR102TaperedGalleryStudy(nodes){
 const old=buildR100WidenedGalleryStudy(nodes);
 if(old.sourceFaces.length!==4692||old.report.records.length!==7||
  old.report.newActiveTriangles!==old.faces.length)
  fail('ORIGINAL_SOURCE_EVIDENCE_MISSING');
 let next=[...old.sourceFaces],tapered=0,retained=0,rejected=0;
 const records=[];
 for(const r of old.records){
  if(r.addedSourceFaces!==4){
   rejected++;
   records.push({id:r.id,priorStatus:r.status,
    sourceLine:r.actualSourceSegment,
    status:'RETAIN_R100_REJECTED_NO_NEW_CANDIDATE',
    addedTriangles:0});continue;
  }
  const [entry,pad]=r.actualSourceSegment,side=r.side;
  const original=designR100ShoulderTriangles({side,sourceAnchor:entry,sourcePad:pad});
  const taperedShape=designR102TaperedShoulderTriangles({side,sourceAnchor:entry,sourcePad:pad});
  const line=[entry,pad];
  const source=assess([...old.sourceFaces],line);
  const rectangle=assess([...old.sourceFaces,...original.faces],line);
  const candidate=assess([...old.sourceFaces,...taperedShape.faces],line);
  const shared=source.sourceCoverageComplete&&rectangle.sourceCoverageComplete&&
   candidate.sourceCoverageComplete&&candidate.stationCount===source.stationCount;
  const noNewCollision=candidate.overhead<=rectangle.overhead&&
   candidate.lateral<=rectangle.lateral;
  const floorGain=candidate.floor<source.floor;
  // Conservative: allow a *small* cost in measured supports at the physical
  // end junction, but never lose most recovered floor witnesses.
  const rectangularGain=source.floor-rectangle.floor;
  const taperedGain=source.floor-candidate.floor;
  const sufficientGain=taperedGain>=Math.max(1,Math.ceil(rectangularGain*.6));
  const fit=preservedAtrium(taperedShape.faces,side);
  const join=auditR103SourceJoint({sourceFaces:old.sourceFaces,
   addedFaces:taperedShape.faces,sourceAnchor:entry,sourcePad:pad});
  const choose=shared&&noNewCollision&&floorGain&&sufficientGain&&fit&&
   join.sourceEndpointEdgesVerified&&join.addedApronEndpointCornersVerified;
  const kept=choose?taperedShape.faces:original.faces;
  next.push(...kept);
  if(choose)tapered++;else retained++;
  records.push({id:r.id,side:r.side,tier:r.tier,
   sourceLine:line,priorStatus:r.status,
   originalSourceR88EndEdgesVerified:join.sourceEndpointEdgesVerified,
   proposedTaperWeldsOriginalCorners:join.addedApronEndpointCornersVerified,
   status:choose?'TAPERED_END_TRANSITION_GEOMETRICALLY_SUPPORTED_ART_HOLD':
    'RETAIN_R100_RECTANGULAR_SHOULDER_NO_TAPER_CERTIFICATION',
   sourceProbes:source,R100RectangularProbes:rectangle,
   R102TaperedProbes:candidate,
   finiteSampleSourceCoverageComplete:shared,
   preservesResearchAtrium:fit,
   noNewOverheadOrLateralIntersections:noNewCollision,
   taperedRestoredFloorWitnesses:taperedGain,
   rectangularRestoredFloorWitnesses:rectangularGain,
   addedTriangles:kept.length});
 }
 const added=next.length-old.sourceFaces.length;
 if(added!==tapered*8+retained*4||sha(next.slice(0,4692))!==sha(old.sourceFaces))
  fail('SOURCE_PREFIX_OR_FACE_ACCOUNTING_FAILED');
 const junctionAudit=auditR103SevenJunctions({sourceFaces:old.sourceFaces,
  activeFaces:next,records});
 return {faces:next,priorR100Faces:old.faces,sourceR98Faces:old.sourceFaces,
  report:{schema:SCHEMA,junctionAudit,
   exactOriginalR98MeshSha256:sha(old.sourceFaces),
   priorR100MeshSha256:sha(old.faces),alternativeMeshSha256:sha(next),
   originalR98ExactPrefix:true,originalSourceFaces:4692,
   oldAcceptedGalleryCount:old.report.widenedResearchGalleryCount,
   taperedEndTransitionCount:tapered,retainedR100Rectangles:retained,
   unmodifiedRejectedGalleryCount:rejected,totalGalleryDestinations:7,
   addedNewActiveTriangles:added,sourceMeshesNotOverwritten:true,
   realOriginalR88EndpointsKept:true,records,
   humanContinuousRouteCertification:false,structureCertified:false,
   artQuality:'NOT_REVIEWED',sourceModelGenerationImproved:false,safety:safe()}};
}
function prepareR102Runtime(args){
 const {r100Evidence,...old}=args,source=prepareR100ShoulderReview(old);
 if(!r100Evidence||r100Evidence.schema!==R100_SCHEMA||
  JSON.stringify(r100Evidence)!==JSON.stringify(source))
  fail('R100_SOURCE_EVIDENCE_RECOMPUTE_MISMATCH');
 const mesh=buildR102TaperedGalleryStudy(args.r80Evidence.conceptualRouteNodes);
 return {report:{schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:source.oldB143Status,r100StrictAncestryVerified:true,
  ...mesh.report},mesh};
}
export function prepareR102TaperedReview(args={}){
 return prepareR102Runtime(args).report;
}
function obj(faces){
 let id=1,last='',out=['# R102 source gallery end transition; NOT a certified building'];
 for(const f of faces){
  if(f.kind!==last){last=f.kind;out.push('g '+last.replace(/[^A-Za-z0-9_]/g,'_'));}
  for(const p of [f.a,f.b,f.c])out.push('v '+p.join(' '));
  out.push('f '+id+' '+(id+1)+' '+(id+2));id+=3;
 }
 return out.join('\n')+'\n';
}
export function writeR102TaperedReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())fail('SAFE_EXISTING_DIR_REQUIRED');
 const prefix='R102_SOURCE_GALLERY_TAPERED_APRONS',
  paths=[prefix+'_EVIDENCE.json',prefix+'_ACTIVE_ARCHITECTURE.obj',
   prefix+'_SIX_VIEW.html','R104_R91_ACTIVE_THROAT_EVIDENCE.json',
   'R104_R91_ACTIVE_THROAT_REVISED.obj',
   'R105_R91_WIDTH_OVERHEAD_ORIGIN_EVIDENCE.json',
   'R105_R91_WIDTH_ALTERNATIVE.obj',
   'R106_READING_TABLE_REFLOW_EVIDENCE.json',
   'R106_READING_TABLE_REFLOW_ACTIVE_ARCHITECTURE.obj',
   'R107_R91_FIVE_LANES_EVIDENCE.json',
   'R107_R91_FIVE_LANES_ARCHITECTURE.obj',
   'R108_R91_RIGHT_LANES_EXACT_HIT_EVIDENCE.json',
   'R109_R91_REAL_FLOOR_DATUM_COMPARISON_EVIDENCE.json',
   'R110_R91_SOURCE_CONTOURED_ROUTE_EVIDENCE.json',
   'R110_R91_SOURCE_CONTOURED_ROUTE.obj',
   'R111_R87_R94_FLOOR_FINISH_EVIDENCE.json',
   'R111_R87_R94_REVISED_FINISH_ALTERNATIVE.obj',
   'R112_R93_LANTERN_CANOPY_CLEARANCE_EVIDENCE.json',
   'R112_R93_LANTERN_CANOPY_ALTERNATIVE.obj',
   'R113_R93_PITCHED_LANTERN_EVIDENCE.json',
   'R113_R93_PITCHED_LANTERN_ALTERNATIVE.obj'].map(x=>path.join(destination,x));
 if(paths.some(p=>fs.existsSync(p)))fail('NO_OVERWRITE');
 // Single source-bound build; no second expensive full mesh recreation.
 const {report,mesh}=prepareR102Runtime(args);
 // R104 uses these exact authenticated source faces, avoiding a second
 // expensive R98/R102 full-geometry build inside R60.
 const activeR104=reconcileR104SourceMesh(mesh);
 const r105=optimizeR105LiveR91Widening(activeR104);
 const r106=reflowR106SourceTable(r105);
 const r107=proposeR107CompactRecovery(r106);
 const r108=inspectR108RightLaneSourceHits(r107);
 const r109=inspectR109RealFloorReferencedRoute(r107);
 const r110=inspectR110RightSourceContouredApproach(r107);
 const r111=studyR111RealFinishTransition(r107);
 const r112=inspectR112LanternCanopyRevision(r107);
 const r113=inspectR113PitchedCanopyStudy(r107);
 const r113Views=r113.report.geometryChanged?buildR97CompareViews([
  {revision:'R107 source lantern',faces:r107.faces},
  {revision:'R113 high daylight inner ridge',faces:r113.faces}
 ],[.55,.45,-.69]):[];
 const r112Views=r112.report.sourceGeometryChanged?buildR97CompareViews([
  {revision:'R107 original lantern',faces:r107.faces},
  {revision:'R112 eave relief',faces:r112.faces}
 ],[.55,.45,-.69]):[];
 const r111Views=r111.report.sourceGeometryChanged?buildR97CompareViews([
  {revision:'R107 preserved source',faces:r107.faces},
  {revision:'R111 floor finish comparison',faces:r111.faces}
 ],[.55,.45,-.69]):[];
 const views=buildR97CompareViews([
  {revision:'R105 source collision',faces:r105.faces},
  {revision:'R106 relocated furniture',faces:r106.faces},
  {revision:'R107 five-lane comparison',faces:r107.faces}
 ],[.55,.37,0]);
 const rows=report.records.map(r=>{
  const joint=report.junctionAudit.details.find(q=>q.id===r.id);
  if(!joint)fail('MISSING_R103_SOURCE_JOINT_ROW');
  return '<tr><td>'+esc(r.id)+'</td><td>'+esc(r.status)+'</td><td>'+
   (r.rectangularRestoredFloorWitnesses??'—')+'</td><td>'+
   (r.taperedRestoredFloorWitnesses??'—')+'</td><td>'+
   (joint.sourceEndpointEdgesVerified?'両端に実R88辺あり':'接合元の端辺未確認')+
   '</td><td>'+(joint.addedTriangles?
    (joint.addedApronEndpointCornersVerified?'頂点一致':'追加床が端点未接続'):
    '研究追加なし')+'</td><td>'+r.addedTriangles+'</td></tr>';
 }).join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R102 Source-Joined Gallery Apron Architectural Comparison</title>'+
  '<style>body{font:15px/1.6 system-ui;max-width:1450px;margin:20px auto;padding:0 16px}'+
  'table{border-collapse:collapse;width:100%}td,th{border:1px solid #abc;padding:7px}'+
  'svg{width:100%;border:1px solid #b7c4d0}.triptych{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'+
  '@media(max-width:850px){.triptych{grid-template-columns:1fr}}</style>'+
  '<h1>R102 → R104：元R88と実R91終端に接続する通路の比較</h1>'+
  '<p>R98完全prefix。R100の矩形床帯の両端に急な幅変化があるため、'+
  '端部0.016/中央0.030正規化半幅の局所テーパを実三角形で研究。'+
  '床のRay改善、無新規衝突、保存空洞、R101の源区間検査を満たす候補だけ採用。</p>'+
  '<p>テーパ候補 '+report.taperedEndTransitionCount+
  '、矩形のまま '+report.retainedR100Rectangles+
  '、従来HOLD '+report.unmodifiedRejectedGalleryCount+
  '。美術・耐荷・実移動・Minecraftは未認証。</p>'+
  '<table><tr><th>連絡室</th><th>判断</th><th>R100改善レイ</th>'+
  '<th>R102改善レイ</th><th>元床の両端辺</th><th>追加床端点</th><th>追加面</th></tr>'+rows+'</table>'+
  '<p>R103源端辺確認 '+report.junctionAudit.originalR88EndpointEdgeRoutes+
  '/7、接合点一致 '+report.junctionAudit.sourceJoinedSelectedAprons+
  '、未確認の採択済み床 '+report.junctionAudit.selectedApronEndpointDefects+
  '。頂点一致は人の通行や支持安全の証明ではありません。</p>'+
  '<p>R104はR103で接合証拠のない追加床 '+activeR104.report.withheldCount+
  '件を次の比較形状から除外。右tier2は実際のR91置換床を出発点とし、'+
  '新形状は床Ray改善・頭上/横断非悪化でのみ条件付き追加：'+
  esc(activeR104.report.r91ProposedCorrectionStatus)+
  '。元R102成果物は別ファイルのまま保存。</p>'+
  views.map(x=>x.html).join('')+
  '<p>R107：左右5本の実通路線で移設テーブルを再検査。'+
  esc(r107.report.evaluationStatus)+
  '。これは研究用Rayであり人の実通行を保証しない。</p>'+ 
  '<p>R108：右通路の交差元を実メッシュで追跡（件数 '+
  r108.unresolvedOverheadTotal+'）。部材種別 '+
  esc(r108.remainingSourceKinds.join(', ')||'なし')+
  '。<a href="R108_R91_RIGHT_LANES_EXACT_HIT_EVIDENCE.json">三角形番号・交点・原本との一致</a>。'+
  '形状変更なし・人の歩行/美術/支持はHOLD。</p>'+ 
  '<p>R109：実床の高さと研究用足元線の差を再調査。条件付き頭上Ray '+
  r109.overheadBefore+'→'+r109.conditionalProxyOverheadAfter+
  '、証拠付きの補正候補 '+r109.verifiedFloorDatumLanes+
  '本。<a href="R109_R91_REAL_FLOOR_DATUM_COMPARISON_EVIDENCE.json">源床・勾配・非悪化証拠</a>。'+
  '床メッシュは非変更。R109の候補を人体可用性・美術合格とは見なさない。</p>'+ 
  '<p>R110：右tier2の源床を3本の幅方向×9駅で照合した連続経路設計 '+
  esc(r110.decision)+'。源の頭上Ray '+r110.previousRawSourceLaneOverheadTotal+
  '→R109候補 '+r110.r109ConditionalTotal+'→R110の条件付 '+r110.r110ConditionalTotal+
  '（建物の形状変更なし）。<a href="R110_R91_SOURCE_CONTOURED_ROUTE_EVIDENCE.json">源標高/勾配/衝突</a> / '+
  '<a href="R110_R91_SOURCE_CONTOURED_ROUTE.obj">3D経路線（床メッシュではない）</a>。'+
  '全て非施工・非人体認証。</p>'+ 
  '<p>R111：仕上げ面のみの局所補正条件 '+esc(r111.report.evaluationStatus)+
  '。既存床・家具・外殻は保持。'+
  '<a href="R111_R87_R94_FLOOR_FINISH_EVIDENCE.json">R110交差源・差分・採否</a> / '+
  '<a href="R111_R87_R94_REVISED_FINISH_ALTERNATIVE.obj">3D比較メッシュ（HOLDなら元R107と同形状）</a>。'+
  '人間の美術・利用審査は未実施。</p>'+r111Views.map(v=>v.html).join('')+ 
  '<p>R112：灯籠書架の外側取付点を保存して内側の庇だけ後退する比較 '+
  esc(r112.report.status)+'。R110頭上Ray '+r112.report.originalR110OverheadHits+
  '→'+(r112.report.selected?.overheadHits??'未改善')+
  '。<a href="R112_R93_LANTERN_CANOPY_CLEARANCE_EVIDENCE.json">実源検査・旧材保持・4候補</a> / '+
  '<a href="R112_R93_LANTERN_CANOPY_ALTERNATIVE.obj">採否付き実3D模型</a>。'+
  '人の美術・動線・施工は未認証。</p>'+r112Views.map(v=>v.html).join('')+ 
  '<p>R113：源R93灯籠庇の外側棚頂を残し、内側採光稜線を高める立体比較。'+
  esc(r113.report.status)+'。頭上Ray 7→'+
  (r113.report.selected?.newOverhead??'未改善')+
  '。<a href="R113_R93_PITCHED_LANTERN_EVIDENCE.json">源三角形・4候補・通路判定</a> / '+
  '<a href="R113_R93_PITCHED_LANTERN_ALTERNATIVE.obj">比較3D形状</a>。'+
  '認証済みの歩行路ではない。</p>'+r113Views.map(v=>v.html).join('')+ 
  '<p>R106衝突源はR87の読書テーブル。家具7三角形だけを対象にした別案：'+
  esc(r106.report.correctionMode)+
  '。R105の頭上検出 '+r106.report.beforeRoute.overhead+
  '→R106 '+r106.report.afterRoute.overhead+
  '。元R98/R105は独立して保存し、人体動線・美術は未認証。</p>'+
  '<p>R105 源メッシュ頭上の最初の交差: '+
  esc(r105.report.actualR91OverheadFirstHit?.sourceKind??'未検出')+
  '。優先事項：'+esc(r105.report.headroomPriority)+
  '。張り出し変更採用：'+(r105.report.changedMeshFromR104?'候補あり':'変更なし・HOLD')+
  '。本診断だけでは障害物除去・安全を証明しない。</p>'+
  '<p><a href="'+prefix+'_ACTIVE_ARCHITECTURE.obj">旧R102 OBJ</a> / '+
  '<a href="R104_R91_ACTIVE_THROAT_REVISED.obj">R104 実形状OBJ</a> / '+
  '<a href="R105_R91_WIDTH_ALTERNATIVE.obj">R105 張出し候補OBJ</a> / '+
  '<a href="R106_READING_TABLE_REFLOW_ACTIVE_ARCHITECTURE.obj">R106 家具修正OBJ</a> / '+
  '<a href="R107_R91_FIVE_LANES_ARCHITECTURE.obj">R107 家具・幅方向比較OBJ</a> / '+
  '<a href="R100_SOURCE_GALLERY_WIDENING_SIX_VIEW.html">旧R100</a></p>'+
  '<p>HOLD / NOT_REVIEWED / NOT_PREPARED / 9 BLOCKED / BuildPlan空 / model0 / world0</p></html>';
 const bytes=[JSON.stringify(report,null,2)+'\n',obj(mesh.faces),html,
  JSON.stringify(activeR104.report,null,2)+'\n',obj(activeR104.faces),
  JSON.stringify(r105.report,null,2)+'\n',obj(r105.faces),
  JSON.stringify(r106.report,null,2)+'\n',obj(r106.faces),
  JSON.stringify(r107.report,null,2)+'\n',obj(r107.faces),
  JSON.stringify(r108,null,2)+'\n',
  JSON.stringify(r109,null,2)+'\n',
  JSON.stringify(r110,null,2)+'\n',
  '# R110 3D research route polyline only; NOT a floor or a Minecraft BuildPlan\n'+
  (r110.selectedRoute?r110.selectedRoute.map(p=>'v '+p.join(' ')).join('\n')+'\n'+
   'l '+r110.selectedRoute.map((_,i)=>i+1).join(' ')+'\n':
   '# HOLD: no accepted route; no invented geometry\n'),
  JSON.stringify(r111.report,null,2)+'\n',obj(r111.faces),
  JSON.stringify(r112.report,null,2)+'\n',obj(r112.faces),
  JSON.stringify(r113.report,null,2)+'\n',obj(r113.faces)],created=[];
 try{for(let i=0;i<paths.length;i++){fs.writeFileSync(paths[i],bytes[i],{flag:'wx'});created.push(paths[i]);}}
 catch(e){for(const p of created)fs.rmSync(p,{force:true});throw e;}
 return {relativeFile:path.basename(paths[2]),
  taperCount:report.taperedEndTransitionCount,retainedCount:report.retainedR100Rectangles,
  modelCalls:0,worldWrites:0};
}
