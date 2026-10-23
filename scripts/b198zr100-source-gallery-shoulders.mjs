/**
 * R100 — bounded R88 gallery shoulder-width architectural alternative.
 * Real R88 source centerlines, 4 actual triangles per accepted connection.
 * Original R98 mesh is an exact prefix; NO physical walking certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditR92CirculationGraph} from './b198zr92-whole-library-circulation-atlas.mjs';
import {buildR98ElevatedCrownStudy} from './b198zr98-elevated-right-crown.mjs';
import {screenR99FiniteRoute,prepareR99FiniteVolumeReview,
 SCHEMA as R99_SCHEMA} from './b198zr99-finite-volume-route-witness.mjs';
import {buildR97CompareViews} from './b198zr97-multiview-mesh-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr100-source-gallery-shoulder-variant-v1';
const fail=s=>{throw Error('B198ZR100_'+s)};
const sha=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const R=x=>+x.toFixed(7);
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

const OLD_HALF=.016,NEW_HALF=.030;
function tri(list,a,b,c,kind){list.push({a:a.map(R),b:b.map(R),c:c.map(R),kind});}
function quad(list,a,b,c,d,kind){tri(list,a,b,c,kind);tri(list,a,c,d,kind);}
function normal2D(a,b){
 const dx=b[0]-a[0],dz=b[2]-a[2],run=Math.hypot(dx,dz);
 if(run<.03||run>.38)fail('SOURCE_CONNECTOR_OUTSIDE_FINITE_LOCAL_SPAN');
 return [-dz/run,dx/run];
}
function shift(p,n,side,width){return [
 R(p[0]+n[0]*side*width),p[1],R(p[2]+n[1]*side*width)
];}
/**
 * Build two side shoulders only, between actual source R88 outer edges.
 * The old .032-wide R88 two-leg deck stays intact. No new freestanding
 * center line, entrance or stair is invented.
 */
export function designR100ShoulderTriangles({side,sourceAnchor,sourcePad,
 oldHalf=OLD_HALF,newHalf=NEW_HALF}){
 if(!['left','right'].includes(side)||!finite(sourceAnchor)||!finite(sourcePad)||
  !Number.isFinite(oldHalf)||!Number.isFinite(newHalf)||
  oldHalf<.001||newHalf<=oldHalf||newHalf>.040)
  fail('VALID_R88_LINE_AND_WIDENING_REQUIRED');
 const n=normal2D(sourceAnchor,sourcePad);
 const faces=[],key=side+'_R100_SOURCE_CONNECTED_GALLERY_SHOULDER_NOT_WALKABLE';
 for(const s of [-1,1]){
  const a=shift(sourceAnchor,n,s,oldHalf),
   b=shift(sourceAnchor,n,s,newHalf),
   c=shift(sourcePad,n,s,newHalf),
   d=shift(sourcePad,n,s,oldHalf);
  quad(faces,a,b,c,d,key);
 }
 if(faces.length!==4)fail('SHOULDER_QUAD_FACE_COUNT');
 const outer=[-1,1].flatMap(s=>[
  shift(sourceAnchor,n,s,newHalf),
  shift(sourcePad,n,s,newHalf)
 ]);
 return {faces,outer,oldNormalizedWidth:OLD_HALF*2,
  newNormalizedWidth:newHalf*2,
  sourceConnectorPlanLength:R(Math.hypot(
   sourcePad[0]-sourceAnchor[0],sourcePad[2]-sourceAnchor[2]))};
}
function checkVoidBoundary(points,side){
 return points.every(p=>side==='right'?p[0]>.400001:p[0]<-.400001);
}
export function buildR100WidenedGalleryStudy(nodes){
 const prior=buildR98ElevatedCrownStudy(nodes),graph=auditR92CirculationGraph(nodes);
 if(prior.faces.length!==4692||graph.levels.length!==7)
  fail('HISTORIC_SOURCE_NOT_VERIFIED');
 let active=prior.faces,adopted=0;
 const records=[];
 for(const t of graph.levels){
  const id=t.side+'_tier'+t.tier,entry=t.r88GalleryFrom,pad=t.r84ReadingRoomAt;
  const record={id,side:t.side,tier:t.tier,
   sourceGraphConnection:t.limitedGeometricRouteCompleted,
   actualSourceSegment:[entry,pad],
   sourceWidthBeforeNormalized:OLD_HALF*2,
   proposedWidthAfterNormalized:NEW_HALF*2};
  let geometry;
  try{
   geometry=designR100ShoulderTriangles({
    side:t.side,sourceAnchor:entry,sourcePad:pad
   });
  }catch(e){
   records.push({...record,status:'HOLD_GEOMETRY_NOT_GENERATED',
    reason:String(e?.message??e),addedSourceFaces:0});
   continue;
  }
  if(!checkVoidBoundary(geometry.outer,t.side)){
   records.push({...record,status:'HOLD_PRESERVED_ATRIUM_EDGE',
    addedSourceFaces:0});continue;
  }
  const baseline=screenR99FiniteRoute(active,[entry,pad]);
  const improved=screenR99FiniteRoute([...active,...geometry.faces],[entry,pad]);
  const b=baseline.witnessCounts,a=improved.witnessCounts;
  const regained=Math.max(0,b.floor-a.floor);
  const noNewOtherCollision=a.overhead<=b.overhead&&a.lateral<=b.lateral;
  const adopt=regained>0&&noNewOtherCollision;
  if(adopt){active=[...active,...geometry.faces];adopted++;}
  records.push({...record,status:adopt?
   'GEOMETRIC_FLOOR_WITNESS_GAIN_BUT_ARCHITECTURAL_HOLD':
   'HOLD_NO_MEASURABLE_FLOOR_GAIN_OR_NEW_INTERSECTION',
   beforeWitnessCounts:b,afterWitnessCounts:a,
   restoredSampledFloorWitnesses:regained,
   noNewOverheadOrLateralProbeIntersections:noNewOtherCollision,
   addedSourceFaces:adopt?geometry.faces.length:0,
   rejectedCandidateDoesNotAlterActiveMesh:!adopt});
 }
 const totalAdded=active.length-prior.faces.length;
 if(totalAdded!==4*adopted)fail('INVALID_DELTA_FACE_COUNT');
 if(sha(active.slice(0,prior.faces.length))!==sha(prior.faces))
  fail('ORIGINAL_R98_MESH_PREFIX_CHANGED');
 const aggregate={
  schema:SCHEMA,sourceR98Faces:prior.faces.length,
  newActiveTriangles:active.length,
  addedRealShoulderFaces:totalAdded,
  widenedResearchGalleryCount:adopted,
  unresolvedOrRejectedGalleryCount:records.length-adopted,
  numberOfSourceRooms:records.length,
  sourceR98MeshSha256:sha(prior.faces),
  alternativeMeshSha256:sha(active),
  oldResearchGalleryWidthNormalized:OLD_HALF*2,
  selectedNewGalleryWidthNormalized:NEW_HALF*2,
  // A metric cannot be invented from a small sample.
  genuineHumanWalkabilityCertified:false,continuousFiniteSweepCertified:false,
  realBuildingSupportOrLoadTransferCertified:false,
  dimensionsInMetresOrBlocks:false,
  independentArchitecturalArtReview:'NOT_REVIEWED',
  originalR98Preserved:true,
  newModelRuns:0,worldOperations:0,
  records,safety:safe()
 };
 return {faces:active,sourceFaces:prior.faces,records,report:aggregate};
}
export function prepareR100ShoulderReview(args={}){
 const {r99Evidence,...older}=args;
 const exact=prepareR99FiniteVolumeReview(older);
 if(!r99Evidence||r99Evidence.schema!==R99_SCHEMA||
  JSON.stringify(exact)!==JSON.stringify(r99Evidence))
  fail('R99_FULL_ANCESTRY_MISMATCH');
 const study=buildR100WidenedGalleryStudy(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:exact.oldB143Status,
  strictR99AncestryRecomputed:true,...study.report};
}
function obj(faces){
 let id=1,last='',out=['# R100 actual R98 exact-prefix mesh + conditional shoulders',
 '# NOT source Qwen, real Minecraft, structural or human-walkable'];
 for(const f of faces){
  if(f.kind!==last){last=f.kind;out.push('g '+last.replace(/[^A-Za-z0-9_]/g,'_'));}
  for(const p of [f.a,f.b,f.c])out.push('v '+p.join(' '));
  out.push('f '+id+' '+(id+1)+' '+(id+2));id+=3;
 }
 return out.join('\n')+'\n';
}
export function writeR100ShoulderReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('SAFE_EXISTING_REVIEW_DIRECTORY_REQUIRED');
 const prefix='R100_SOURCE_GALLERY_WIDENING',
  paths=[prefix+'_EVIDENCE.json',prefix+'_ACTIVE_ARCHITECTURE.obj',
   prefix+'_SIX_VIEW.html'].map(f=>path.join(destination,f));
 if(paths.some(f=>fs.existsSync(f)))fail('NO_OVERWRITE');
 const report=prepareR100ShoulderReview(args),study=buildR100WidenedGalleryStudy(
  args.r80Evidence.conceptualRouteNodes);
 const views=buildR97CompareViews([
  {revision:'R98 source',faces:study.sourceFaces},
  {revision:'R100 study',faces:study.faces},
  {revision:'R100 study [repeat] (camera match)',faces:study.faces}
 ],[.53,.36,0]);
 const rows=report.records.map(t=>'<tr><td>'+esc(t.id)+'</td><td>'+
  esc(t.status)+'</td><td>'+t.addedSourceFaces+'</td><td>'+
  (t.beforeWitnessCounts?.floor??'—')+'</td><td>'+
  (t.afterWitnessCounts?.floor??'—')+'</td></tr>').join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R100 Bounded Gallery Shoulder Alternative</title>'+
  '<style>body{font:15px/1.65 system-ui;max-width:1440px;margin:22px auto;padding:0 16px}'+
  'table{border-collapse:collapse;width:100%}td,th{border:1px solid #aabcce;padding:7px}'+
  'svg{width:100%}.triptych{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'+
  '@media(max-width:850px){.triptych{grid-template-columns:1fr}}</style>'+
  '<h1>R100: 実際のR88連絡デッキ両側に有限幅の床を足す</h1>'+
  '<p>元R98を非改変の完全prefixとして保持。半幅0.016 → 0.030正規化単位の'+
  '薄い追加床を実三角形で設計。源R88と一致する連絡線だけが対象。'+
  '吹抜けに侵入したり、局所床検査が改善しない案は採用しない。</p>'+
  '<p>計測により幾何改善した研究用デッキ '+report.widenedResearchGalleryCount+
  '/7。追加した実三角形 '+report.addedRealShoulderFaces+
  '。建築美術・人間歩行・耐荷・Minecraft施工の認証は0件。</p>'+
  '<table><tr><th>ソース室</th><th>局所判断</th><th>新規面</th><th>元の床未検出レイ</th>'+
  '<th>候補床未検出レイ</th></tr>'+rows+'</table>'+
  views.map(x=>x.html).join('')+
  '<p><a href="'+prefix+'_ACTIVE_ARCHITECTURE.obj">実三角形の比較OBJ</a> ／ '+
  '<a href="R99_FINITE_WIDTH_HEADROOM_SOURCE_ROUTES_REVIEW.html">R99元動線検査</a></p>'+
  '<p>HOLD / NOT_REVIEWED / NOT_PREPARED / 9 BLOCKED / BuildPlan空 / model0 / world0</p></html>';
 const bytes=[JSON.stringify(report,null,2)+'\n',obj(study.faces),html],created=[];
 try{for(let i=0;i<paths.length;i++){fs.writeFileSync(paths[i],bytes[i],{flag:'wx'});created.push(paths[i]);}}
 catch(e){for(const p of created)fs.rmSync(p,{force:true});throw e;}
 return {relativeFile:path.basename(paths[2]),
  candidateCount:report.widenedResearchGalleryCount,
  addedTriangles:report.addedRealShoulderFaces,modelCalls:0,worldWrites:0};
}
