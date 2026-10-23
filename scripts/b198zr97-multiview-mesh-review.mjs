/**
 * R97 — source-triangle multiview comparison. Research-only orthographic SVG.
 * 3 variants, shared cameras/scale; neither pixel-accurate occlusion nor
 * architectural aesthetic, headroom, structural or Minecraft certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR94RoomEntranceVariant} from './b198zr94-seven-room-entry-redesign.mjs';
import {buildR95DaylightAtriumVariant} from './b198zr95-atrium-daylight-portals.mjs';
import {buildR96ArchitecturalWindowStudy,
  prepareR96WindowReview,SCHEMA as R96_SCHEMA}
  from './b198zr96-window-structure-and-light-study.mjs';

export const SCHEMA='minecraftaibuilder-b198zr97-mesh-bound-six-view-comparison-v1';
const fail=s=>{throw Error('B198ZR97_'+s)};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const VIEWS=Object.freeze([
 {id:'front',title:'正面 / FRONT',az:0,el:12},
 {id:'oblique',title:'斜視 / OBLIQUE',az:35,el:25},
 {id:'side',title:'側面 / SIDE',az:90,el:15},
 {id:'aerial',title:'俯瞰 / AERIAL',az:35,el:70},
 {id:'atrium',title:'吹抜け側の反対向き外形 / REVERSE',az:180,el:14},
 {id:'right-top-detail',title:'右最上層閲覧室の局所拡大 / DETAIL',az:130,el:18,detail:true}
]);
export const R97_VIEW_IDS=VIEWS.map(v=>v.id);

// Actual XYZ orthographic transform, never inferred outline or generated art.
export function projectR97Vertex(point,az,el){
 if(!finite(point)||![az,el].every(Number.isFinite))fail('INVALID_SOURCE_VERTEX_OR_CAMERA');
 const a=az*Math.PI/180,e=el*Math.PI/180;
 const u=point[0]*Math.cos(a)-point[2]*Math.sin(a);
 const depth=point[0]*Math.sin(a)+point[2]*Math.cos(a);
 return [u,point[1]*Math.cos(e)-depth*Math.sin(e),
  point[1]*Math.sin(e)+depth*Math.cos(e)];
}
function prepared(faces,v){
 if(!Array.isArray(faces)||!faces.length)fail('SOURCE_TRIANGLES_REQUIRED');
 return faces.map(f=>{
  if(!['a','b','c'].every(k=>finite(f[k]))||typeof f.kind!=='string')
   fail('SOURCE_FACE_MALFORMED');
  const p=[f.a,f.b,f.c].map(x=>projectR97Vertex(x,v.az,v.el));
  return {p,kind:f.kind,depth:p.reduce((s,q)=>s+q[2],0)/3};
 });
}
const points=faces=>faces.flatMap(f=>f.p);
function framing(projected,view,target=null){
 // Every variant uses this SAME camera framing based on their union.
 const all=points(projected.flat());
 if(!all.length)fail('CAMERA_NO_GEOMETRY');
 const lo=[Math.min(...all.map(p=>p[0])),Math.min(...all.map(p=>p[1]))];
 const hi=[Math.max(...all.map(p=>p[0])),Math.max(...all.map(p=>p[1]))];
 if(!(hi[0]>lo[0]&&hi[1]>lo[1]))fail('DEGENERATE_CAMERA_BOUNDS');
 const fit=Math.min(560/(hi[0]-lo[0]),355/(hi[1]-lo[1]));
 const center=view.detail?projectR97Vertex(target,view.az,view.el).slice(0,2):
  [(lo[0]+hi[0])/2,(lo[1]+hi[1])/2];
 if(!center.every(Number.isFinite))fail('INVALID_DETAIL_FOCUS');
 return {center,scale:fit*(view.detail?3:1),fitScale:fit,
  camera:[view.az,view.el],globalProjectedBounds:[lo,hi],
  detail:!!view.detail};
}
function color(k){
 if(k.includes('R96'))return '#ef9369';
 if(k.includes('R95'))return '#f1ca85';
 if(k.includes('R94'))return '#e9bb7b';
 if(k.includes('R93'))return '#b5b87e';
 if(k.includes('glass'))return '#a7d7e4';
 if(k.includes('left'))return '#6795b3';
 if(k.includes('right'))return '#9994b3';
 if(k.includes('R92'))return '#b4a3a1';
 return '#9eafba';
}
function panel(projected,camera,title,revision){
 const {center,scale}=camera;
 const faceSVG=[...projected].sort((a,b)=>b.depth-a.depth).map(f=>{
  const pts=f.p.map(q=>(320+(q[0]-center[0])*scale).toFixed(2)+','+
   (219-(q[1]-center[1])*scale).toFixed(2)).join(' ');
  return '<polygon points="'+pts+'" fill="'+color(f.kind)+'" stroke="#2c4052" stroke-width=".25"/>';
 }).join('');
 return '<figure><figcaption>'+esc(revision)+' · '+esc(title)+'</figcaption>'+
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 440" role="img" aria-label="'+
  esc(revision+' '+title)+'"><rect width="640" height="440" fill="#f0f4f6"/>'+
  faceSVG+'</svg></figure>';
}

// The SVG painter ordering is only illustrative (no z-buffer).
// No facet synthesis or reinterpretation of geometry, all polygons project
// vertices of R94/R95/R96 actual source meshes.
export function buildR97CompareViews(variants,focus){
 if(!Array.isArray(variants)||variants.length!==3||
  variants.some(v=>!Array.isArray(v.faces)||!v.faces.length)||
  !finite(focus))fail('THREE_SOURCE_VARIANTS_AND_DETAIL_FOCUS_REQUIRED');
 const views=[];
 for(const view of VIEWS){
  const p=variants.map(v=>prepared(v.faces,view));
  const frame=framing(p,view,focus);
  views.push({id:view.id,title:view.title,
   projection:'source-triangle orthographic SVG, approximate painter sorting',
   camera:frame,
   sampleTriangleCounts:p.map(q=>q.length),
   html:'<section><h2>'+esc(view.title)+'</h2><div class="triptych">'+
    p.map((v,i)=>panel(v,frame,view.title,variants[i].revision)).join('')+
    '</div></section>'});
 }
 return views;
}
export function buildR97Comparison(nodes){
 const r94=buildR94RoomEntranceVariant(nodes),
  r95=buildR95DaylightAtriumVariant(nodes),
  r96=buildR96ArchitecturalWindowStudy(nodes);
 if(r94.faces.length!==4446||r95.faces.length!==4608||
  r96.faces.length!==4692)fail('SOURCE_VARIANT_FACE_COUNTS_CHANGED');
 if(JSON.stringify(r96.faces.slice(0,r95.faces.length))!==
    JSON.stringify(r95.faces))fail('R96_NOT_EXACT_R95_PREFIX');
 const target=r95.proofs.find(q=>q.side==='right'&&q.tier===3);
 if(!target||!finite(target.sourceCoordinates))fail('RIGHT_TOP_TIER3_FOCUS_UNAVAILABLE');
 const versions=[
  {revision:'R94',faces:r94.faces},
  {revision:'R95',faces:r95.faces},
  {revision:'R96',faces:r96.faces}
 ];
 const viewResults=buildR97CompareViews(versions,target.sourceCoordinates);
 const headroom=r95.headroomChecks.map(q=>({...q}));
 const rightTop=headroom.find(q=>q.side==='right'&&q.tier===3);
 if(!rightTop||rightTop.firstVerticalSurfaceDistanceNormalized===null)
  fail('R95_RIGHT_TOP_OVERHEAD_EVIDENCE_MISSING');
 return {versions:versions.map(v=>({revision:v.revision,
  triangles:v.faces.length,actualMeshSha256:hash(v.faces)})),
  views:viewResults,
  roofProbe:{...rightTop,normalizedUnitsAreNotMeters:true,
   humanClearanceNotCertified:true},
  otherRoofProbes:headroom,
  preservedSevenOpenings:r96.rooms.length,
  addedWindowDecorativeFaces:r96.addedArchitecturalSurroundTriangles,
  sourceR95ExactPrefix:r96.sourceR95ExactMeshPrefix,
  sourceGeometryFromIndependentAuthoredResearch:true,
  semanticVisualInterpretation:'HUMAN_NOT_REVIEWED',
  visibilityMethodLimit:'SVG painter depth sort is not pixel-accurate occlusion',
  sharedCameraForAllVariants:true,
  no3DShapeChanged:true};
}
function prepareR97Runtime(args={}){
 const {r96Evidence,...prior}=args;
 const exact=prepareR96WindowReview(prior);
 if(!r96Evidence||r96Evidence.schema!==R96_SCHEMA||
  JSON.stringify(exact)!==JSON.stringify(r96Evidence))
  fail('FULL_R96_ANCESTRY_MISMATCH');
 if(typeof args.raw!=='string'||hashSource(args.raw)!==args.expectedRawSha256)
  fail('FROZEN_RAW_SHA_MISMATCH');
 const r=buildR97Comparison(args.r80Evidence.conceptualRouteNodes);
 const {views,...rest}=r;
 return {report:{schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:exact.oldB143Status,strictR96EvidenceRecomputed:true,
  ...rest,
  viewSpecs:views.map(v=>({id:v.id,title:v.title,camera:v.camera,
   sourceTriangleCounts:v.sampleTriangleCounts})),
  multiViewAuthorReview:'NOT_REVIEWED',
  architectureQualityCertified:false,structuralSupportCertified:false,
  physicalTraversalCertified:false,modelGenerationImprovementCertified:false,
  safety:safe()},views};
}
export function prepareR97ComparisonReview(args={}){
 return prepareR97Runtime(args).report;
}
const hashSource=s=>createHash('sha256').update(s).digest('hex');
export function writeR97ComparisonReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_SAFE_OUTPUT_REQUIRED');
 const base='R97_MESH_BOUND_SIX_VIEW_COMPARISON',
  evidenceFile=path.join(destination,base+'_EVIDENCE.json'),
  reviewFile=path.join(destination,base+'_REVIEW.html');
 if(fs.existsSync(evidenceFile)||fs.existsSync(reviewFile))fail('NO_OVERWRITE');
 const {report,views}=prepareR97Runtime(args);
 const roof=report.roofProbe;
 const issues=[
  'P0: 右側tier 3の屋根方向の実三角形交差候補 ('+
   roof.firstVerticalSurfaceDistanceNormalized+
   ' 正規化単位)。人体掃引と実利用高さは未検証。',
  'P0: 入口→7閲覧室→上階の有限体積歩行経路は未認証。',
  'P1: R95の切り欠き窓7箇所の支持連続性・雨仕舞いは未認証。',
  'P1: 吹抜けの開放感、左右非対称性、全館の美術品質は人の審査待ち。'
 ];
 const body='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R97 / R94–R96 実メッシュ6視点比較</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:1600px;margin:25px auto;padding:0 18px;color:#243b4e}'+
  'section{margin:28px 0 44px}.triptych{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'+
  'figure{min-width:0;margin:0}svg{width:100%;height:auto;border:1px solid #b4c4d0}'+
  'figcaption{font-weight:600;font-size:13px}h2{font-size:19px}'+
  '@media(max-width:850px){.triptych{grid-template-columns:1fr}}</style>'+
  '<h1>R97：R94 / R95 / R96の同一カメラ・同一縮尺6視点比較</h1>'+
  '<p>全図は各版の実三角形から投影。カメラ・表示範囲を版間で固定。'+
  'ポリゴン奥行きの画家順近似につき、正確な遮蔽や実際のアバター視界を保証しません。'+
  'R95/R96の開口・意匠を見比べ、R98の修正対象を特定するための未採点レビュー資料です。</p>'+
  '<p>実モデル面数：'+report.versions.map(v=>v.revision+' '+v.triangles).join(' / ')+
  '。右上層検査：'+esc(roof.firstVerticalBlockerKind)+
  'が '+roof.firstVerticalSurfaceDistanceNormalized+' 正規化単位で交差（研究用プローブ）。</p>'+
  '<ol>'+issues.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+
  views.map(v=>v.html).join('')+
  '<p><a href="R94_READING_ROOM_TRUE_TERRACE_ENTRY_ACTIVE_ARCHITECTURE.obj">R94 OBJ</a> / '+
  '<a href="R95_SEVEN_SOURCE_DAYLIGHT_PORTALS_ARCHITECTURE.obj">R95 OBJ</a> / '+
  '<a href="R96_ATRIUM_SOURCE_WINDOW_SURROUND_ARCHITECTURE.obj">R96 OBJ</a></p>'+
  '<p>現実の建築基準、寸法、構造支持、歩行、Minecraft施工、Qwen汎用生成、美術合格すべて未認証。'+
  'NOT_REVIEWED / NOT_PREPARED / 9 BLOCKED / BuildPlan空 / model0 / world0。</p></html>';
 fs.writeFileSync(evidenceFile,JSON.stringify({...report,priorityIssues:issues},null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(reviewFile,body,{flag:'wx'});
 return {relativeFile:path.basename(reviewFile),views:views.length,
  revisions:report.versions.map(v=>v.revision),modelCalls:0,worldWrites:0};
}
