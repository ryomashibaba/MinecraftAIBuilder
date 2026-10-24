/**
 * R121: an inspectable offline R120 architectural review, not a pass
 * for human walkability, structure, seating, daylight or artistic quality.
 * Source only: no models, Minecraft, external requests or user machine.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy} from './b198zr107-compact-reading-table-recovery.mjs';
import {studyR120RibAndReadingBench} from './b198zr120-r94-suspended-light-rib-relief.mjs';
import {buildR114ThreePaneReview} from './b198zr114-actual-three-pane-art-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr121-real-r120-six-view-art-packet-v1';
export const SOURCE_SELECTED_SHA='f83df1cea30da0e149ccd2159667bb8230cd5b3c1f444a774fdaa24d332588b2';
export const SOURCE_DELTA=Object.freeze([4471,4472,4473,4474,4475,4476,4535,4536]);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const key=p=>p.map(v=>(+v.toFixed(7)).toString()).join(',');
const fail=s=>{throw Error('B198ZR121_'+s)};
const valid=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const vertices=f=>[f.a,f.b,f.c];
const edges=f=>[[f.a,f.b],[f.b,f.c],[f.c,f.a]].map(([a,b])=>[key(a),key(b)].sort().join('|'));
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
function area(f){
 const u=f.b.map((v,i)=>v-f.a[i]),v=f.c.map((v,i)=>v-f.a[i]);
 return Math.hypot(u[1]*v[2]-u[2]*v[1],
  u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;
}
/** Report all exact shared-edge and shared-vertex seams incident to
 * edited facets. Verify original connections survive in candidate mesh.
 */
export function auditR121LocalSourceConnectivity(before,after,expectedIndices){
 if(!Array.isArray(before)||!Array.isArray(after)||
  before.length!==after.length||!Array.isArray(expectedIndices)||
  !expectedIndices.length||new Set(expectedIndices).size!==expectedIndices.length)
  fail('SOURCE_FACE_COUNTS_AND_DECLARED_LOCAL_CHANGES_REQUIRED');
 const edited=new Set(expectedIndices),actual=[];
 const oldEdgeIndex=new Map(),oldVertexIndex=new Map();
 for(let i=0;i<before.length;i++){
  const a=before[i],b=after[i];
  if(!a||!b||a.kind!==b.kind||
    [...vertices(a),...vertices(b)].some(p=>!valid(p))||
    area(a)<1e-11||area(b)<1e-11)
   fail('SOURCE_TRIANGLE_KIND_OR_AREA_CHANGED');
  const modified=JSON.stringify(a)!==JSON.stringify(b);
  if(modified!==edited.has(i))fail('UNDISCLOSED_OR_MISSING_ACTUAL_DELTA');
  if(modified)actual.push({index:i,kind:a.kind,before:vertices(a),
   after:vertices(b)});
  if(!edited.has(i)&&modified)fail('UNRELATED_SOURCE_FACE_EDIT');
  for(const e of edges(a)){
   if(!oldEdgeIndex.has(e))oldEdgeIndex.set(e,[]);
   oldEdgeIndex.get(e).push(i);
  }
  for(const p of vertices(a)){
   const k=key(p);if(!oldVertexIndex.has(k))oldVertexIndex.set(k,new Set());
   oldVertexIndex.get(k).add(i);
  }
 }
 const reported=new Set(),lostEdgePairs=[],lostVertexPairs=[];
 let edgePairs=0,vertexPairs=0;
 for(const [e,indices] of oldEdgeIndex){
  if(indices.length<2||!indices.some(i=>edited.has(i)))continue;
  for(let a=0;a<indices.length;a++)for(let b=a+1;b<indices.length;b++){
   const i=indices[a],j=indices[b];
   const now=new Set(edges(after[i]));
   edgePairs++;
   if(!edges(after[j]).some(q=>now.has(q)))
    lostEdgePairs.push({first:i,second:j,previousEdge:e});
  }
 }
 for(const [v,set] of oldVertexIndex){
  const indices=[...set];
  if(indices.length<2||!indices.some(i=>edited.has(i)))continue;
  for(let a=0;a<indices.length;a++)for(let b=a+1;b<indices.length;b++){
   const i=indices[a],j=indices[b],pair=[i,j].sort((x,y)=>x-y).join(':');
   if(reported.has(pair))continue;reported.add(pair);vertexPairs++;
   const second=new Set(vertices(after[j]).map(key));
   if(!vertices(after[i]).some(q=>second.has(key(q))))
    lostVertexPairs.push({first:i,second:j,formerSharedVertex:v});
  }
 }
 return {actual,changedFaceIndices:actual.map(x=>x.index),
  oldLocalSharedEdgePairs:edgePairs,oldLocalSharedVertexPairs:vertexPairs,
  brokenSharedEdgePairs:lostEdgePairs,brokenSharedVertexPairs:lostVertexPairs,
  noNewlyDisconnectedPreviouslySharedSourceFaces:
   lostEdgePairs.length===0&&lostVertexPairs.length===0};
}
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
function serializeObj(faces,label){
 const lines=['# '+label,'# SOURCE MESH STUDY — NOT A MINECRAFT BUILD PLAN'];
 let id=1,k=null;
 for(const f of faces){
  if(f.kind!==k){k=f.kind;lines.push('g '+f.kind.replace(/[^a-zA-Z0-9_]/g,'_'))}
  for(const p of vertices(f))lines.push('v '+p.join(' '));
  lines.push('f '+id+' '+(id+1)+' '+(id+2));id+=3;
 }
 return lines.join('\n')+'\n';
}
export function buildR121SourceArtPacket(r107){
 if(!r107||!Array.isArray(r107.faces)||
  !Array.isArray(r107.originalR98Faces)||r107.originalR98Faces.length!==4692||
  sha(r107.faces)!==r107.report?.alternativeR107Sha256||
  sha(r107.originalR98Faces)!==r107.report?.originalR98Sha256)
  fail('REAL_SIGNED_R107_AND_HISTORIC_R98_REQUIRED');
 const before=r107.faces,original=sha(before);
 const candidate=studyR120RibAndReadingBench(r107);
 if(!candidate.report.geometryChanged||
  candidate.report.selected?.rise!==.1||
  candidate.report.selected?.overhead!==0||
  candidate.report.selected?.floor!==0||
  candidate.report.selected?.lateral!==0||
  !candidate.report.selected?.oldFiveSourceCorridorsNonregressing||
  candidate.report.activeSha256!==SOURCE_SELECTED_SHA)
  fail('CI_CONFIRMED_R120_EXACT_SELECTED_SOURCE_REQUIRED');
 const continuity=auditR121LocalSourceConnectivity(
  before,candidate.faces,SOURCE_DELTA);
 if(continuity.changedFaceIndices.join(',')!==SOURCE_DELTA.join(',')||
  !continuity.noNewlyDisconnectedPreviouslySharedSourceFaces||
  continuity.oldLocalSharedEdgePairs<2)
  fail('REAL_SOURCE_ADJACENCY_OR_DELTA_REGRESSION');
 const review=buildR114ThreePaneReview(before,candidate.faces,
  {phase:'R120',focus:[.54,.55,-.69]});
 if(review.sourceFacetIndicesChanged.join(',')!==SOURCE_DELTA.join(',')||
  review.views.length!==6||
  review.views.some(v=>v.sampleTriangleCounts.join(',')!==
   [before.length,candidate.faces.length,8].join(',')))
  fail('SIX_VIEWS_OR_SOURCE_DELTA_INVALID');
 if(sha(before)!==original)fail('ORIGINAL_BUILDING_CHANGED');
 return {source:before,faces:candidate.faces,review,continuity,
  evidence:{schema:SCHEMA,sourceR107Sha256:original,
   sourceR98Sha256:sha(r107.originalR98Faces),
   r120SelectedSha256:candidate.report.activeSha256,
   selectedRibLift:candidate.report.selected.rise,
   sourceTriangleCount:before.length,
   actualEditedSourceFacetIndices:continuity.changedFaceIndices,
   originalR110Overhead:7,postR120R110Overhead:0,
   sourceProbeFloor:0,sourceProbeLateral:0,
   oldFiveSourceCorridorsNonregressing:true,
   sharedSourceEdgeAndVertexContinuity:continuity,
   humanAestheticApproval:'NOT_REVIEWED',
   fullAvatarSweepCertified:false,readingSeatUsabilityCertified:false,
   sunlightAndStructuralSupportCertified:false,
   renderer:'SCHEMATIC SOURCE SVG WITH DEPTH SORT, NOT ACCURATE OCCLUSION',
   reviewViewIds:review.views.map(v=>v.id),
   originalQwenGenerationImproved:false,safety:safe()}};
}
export function buildR121FromNodes(nodes){
 return buildR121SourceArtPacket(buildR107CompactReadingStudy(nodes));
}
export function writeR121SourceArtPacket(packet,destination){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
   !fs.existsSync(destination)||!fs.statSync(destination).isDirectory()||
   fs.lstatSync(destination).isSymbolicLink())
  fail('SAFE_EXISTING_ARTIFACT_DIRECTORY_REQUIRED');
 const body='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R121 / R120 実源3D・6視点比較</title>'+
  '<style>body{font:15px/1.6 system-ui;max-width:1800px;margin:auto;padding:20px;color:#253344}'+
  '.triptych{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'+
  'figure{margin:0}svg{width:100%;height:auto;border:1px solid #ddd}'+
  'section{margin:26px 0}figcaption{font-size:12px}a{margin-right:16px}</style>'+
  '<h1>R121：R120実源メッシュ比較 — 人による美術審査待ち</h1>'+
  '<p>同じカメラ：原本全館／R120選定案全館／変更した実三角形8枚。右R91の局所焦点[.54,.55,-.69]。'+
  '6番目の旧表示名「右最上層」はR97から継承された名称であり、焦点は右tier2のR91領域。</p>'+
  '<p>既存R110のプローブで頭上7→0・床0・側面0、旧5経路非悪化。'+
  '正規化座標のみであり、人体歩行/座席/構造/採光/美術は未認証。</p>'+
  '<p><a href="R121_SOURCE_EVIDENCE.json">源面・共有頂点・検査証拠</a>'+
  '<a href="R121_ORIGINAL_FULL.obj">元全館OBJ</a>'+
  '<a href="R121_SELECTED_FULL.obj">候補全館OBJ</a>'+
  '<a href="R121_CHANGED_EIGHT_FACETS.obj">変更8面OBJ</a></p>'+
  packet.review.views.map(v=>v.html).join('')+
  '<p>HOLD / NOT_REVIEWED / NOT_PREPARED / 9 BLOCKED / BuildPlan空 / world0 / model0</p></html>';
 const writes=[
  ['R121_SOURCE_EVIDENCE.json',JSON.stringify(packet.evidence,null,2)+'\n'],
  ['R121_SIX_VIEW_REVIEW.html',body],
  ['R121_ORIGINAL_FULL.obj',serializeObj(packet.source,'R107 historic full architecture')],
  ['R121_SELECTED_FULL.obj',serializeObj(packet.faces,'R120 accepted geometry, art HOLD')],
  ['R121_CHANGED_EIGHT_FACETS.obj',serializeObj(
   packet.continuity.actual.map(q=>packet.faces[q.index]),'R120 exact changed facets')]];
 if(writes.some(([f])=>fs.existsSync(path.join(destination,f))))
  fail('NO_OVERWRITE_REVIEW_EVIDENCE');
 const produced=[];
 try{for(const [f,content] of writes){
   const dest=path.join(destination,f);
   fs.writeFileSync(dest,content,{flag:'wx'});produced.push(dest);
  }}catch(e){for(const f of produced)fs.rmSync(f,{force:true});throw e;}
 return {files:writes.map(([f])=>f),candidateSha256:packet.evidence.r120SelectedSha256};
}
