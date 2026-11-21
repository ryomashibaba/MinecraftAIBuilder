/**
 * R96: a seven-aperture architectural edge and wall-continuity study.
 * R95 true cutout mesh is an unchanged exact prefix. All new visible ribs
 * follow REAL R94 source inner-wall points, outside R95's open YZ windows.
 * No structural, daylight, glazing, people or Minecraft certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR95DaylightAtriumVariant,prepareR95DaylightReview,
 SCHEMA as R95_SCHEMA} from './b198zr95-atrium-daylight-portals.mjs';
import {buildR94RoomEntranceVariant} from './b198zr94-seven-room-entry-redesign.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr96-source-anchored-atrium-window-ribs-v1';
const fail=m=>{throw Error('B198ZR96_'+m)};
const hash=x=>createHash('sha256').update(x).digest('hex');
const R=x=>+x.toFixed(7),V=p=>p.map(R);
const kindHull=new Set(['left_inner','right_inner']);
const diff=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=f=>Math.hypot(...cross(diff(f.b,f.a),diff(f.c,f.a)))/2;
const tri=(out,a,b,c,kind)=>out.push({a:V(a),b:V(b),c:V(c),kind});
const quad=(out,a,b,c,d,kind)=>{tri(out,a,b,c,kind);tri(out,a,c,d,kind)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const MIN_AREA=1e-11;
/** Extract actual shell X coordinate at a given Y/Z, NOT a notional wall. */
export function sampleR96RealInnerShell(inner,y,z){
 if(!Array.isArray(inner)||!Number.isFinite(y)||!Number.isFinite(z))
  fail('FINITE_REAL_SOURCE_SURFACE_REQUIRED');
 for(const f of inner){
  if(!kindHull.has(f.kind))continue;
  const pts=[f.a,f.b,f.c],det=(a,b,c)=>
   (b[1]-a[1])*(c[2]-a[2])-(c[1]-a[1])*(b[2]-a[2]);
  const target=[0,y,z],d=det(...pts);
  if(Math.abs(d)<1e-11)continue;
  const w=[det(target,pts[1],pts[2])/d,
   det(pts[0],target,pts[2])/d,
   det(pts[0],pts[1],target)/d];
  if(Math.min(...w)<-1e-7)continue;
  return V([w.reduce((s,v,i)=>s+v*pts[i][0],0),y,z]);
 }
 return null;
}
const crown=(side,z)=>side==='left'?.83-.065*(z+.28)**2:
 .98-.095*(z-.17)**2;
const windowRect=(a)=>[a.yMin,a.yMax,a.zMin,a.zMax];
/** Four-sided ring sits OUTSIDE an existing actual Y/Z window, never infill. */
export function designR96OpenRib(aperture,originalInner){
 if(!aperture||!['left','right'].includes(aperture.side)||
  !aperture.box||!Array.isArray(aperture.originalInnerWallCorners)||
  aperture.originalInnerWallCorners.length!==4||
  !Array.isArray(originalInner))fail('REAL_R95_WINDOW_SOURCE_REQUIRED');
 const b=aperture.box,padY=.012,padZ=.016,
  outer=[[b.yMin-padY,b.zMin-padZ],[b.yMin-padY,b.zMax+padZ],
   [b.yMax+padY,b.zMax+padZ],[b.yMax+padY,b.zMin-padZ]];
 if(outer[0][0]<=0||Math.max(...outer.map(x=>x[0]))>=crown(aperture.side,b.zMin)-.04)
  fail('INSUFFICIENT_RETAINED_CROWN_OR_LOWER_WEB');
 if(Math.min(...outer.map(p=>p[1]))<=-.94||
  Math.max(...outer.map(p=>p[1]))>=.94)
  fail('DAYLIGHT_RING_OFF_THE_ORIGINAL_BUILDING');
 const outerCorners=outer.map(([y,z])=>sampleR96RealInnerShell(originalInner,y,z));
 if(outerCorners.some(p=>!p))
  fail('CANNOT_ANCHOR_WINDOW_SURROUND_ON_REAL_UNCUT_INNER_WALL');
 const faces=[],sign=aperture.side==='left'?-1:1,
  tag=aperture.side+'_R96_';
 for(let k=0;k<4;k++){
  const i=(k+1)%4,
   a=aperture.originalInnerWallCorners[k],
   b0=aperture.originalInnerWallCorners[i],
   c=outerCorners[i],d=outerCorners[k];
  quad(faces,a,b0,c,d,
   tag+(aperture.side==='left'?'FLOATING_SAIL_WINDOW_REVEAL':'FACETED_LANTERN_WINDOW_REVEAL')+'_NOT_LOAD_CERTIFIED');
 }
 // Alternating, asymmetric lateral plumes outside the four-sided opening:
 // represent a wing architecture rhythm without closing the glassless gap.
 for(let k=0;k<4;k++){
  const p=outerCorners[k],b=outerCorners[(k+1)%4];
  const q=V([p[0]+sign*(aperture.side==='left'?.016:.021),
   p[1]+(k<2?-.009:.015),
   p[2]+(k%2===0?-.016:.016)]);
  tri(faces,p,b,q,tag+
   (aperture.side==='left'?'ANGLED_SAIL_RIB':'FOLDED_LIGHT_FIN')+'_NONSTRUCTURAL');
 }
 if(faces.length!==12||faces.some(f=>!Number.isFinite(area(f))||area(f)<MIN_AREA))
  fail('R96_VISUAL_RIB_DEGENERATE');
 const minimumCrownMargin=Math.min(...outerCorners.map(p=>crown(aperture.side,p[2])-p[1]));
 const minimumJambClearance=Math.min(padY,padZ);
 return {faces,outerCorners,
  sourceSide:aperture.side,sourceTier:aperture.tier,
  sourceCornersShared:4,sourceSurfaceSampleCount:4,
  distinctArchitecturalFaces:12,
  minNormalizedRemainingCrownWeb:R(minimumCrownMargin),
  localDesignOutsideCutout:true,
  openingUnfilledByRibDesign:true,
  rimMarginNormalized:R(minimumJambClearance),
  supportStrengthNotAssessed:true};
}
const sightBlockCount=(aperture,faces)=>{
 let blocked=0,probes=0;
 const p=aperture.sourceCoordinates,side=aperture.side;
 for(const dz of [-.02,0,.02])for(const height of [.068,.08,.092]){
  const a=[p[0],p[1]+height,p[2]+dz],
   b=[side==='left'?.04:-.04,p[1]+height,p[2]+dz];
  if(faces.some(f=>intersectR81SegmentTriangle(a,b,f)))blocked++;
  probes++;
 }
 return {blocked,probes};
};
function normalizedInnerArea(faces){
 return faces.filter(f=>kindHull.has(f.kind)).reduce((s,f)=>s+area(f),0);
}
export function buildR96ArchitecturalWindowStudy(nodes){
 const old=buildR95DaylightAtriumVariant(nodes),
  r94=buildR94RoomEntranceVariant(nodes),
  sourceWalls=r94.faces.filter(f=>kindHull.has(f.kind));
 const newFaces=[],rooms=[],boxes=[];
 if(old.proofs.length!==7)fail('SEVEN_REAL_R95_WINDOWS_REQUIRED');
 for(const window of old.proofs){
  const source=sourceWalls.filter(f=>f.kind===window.side+'_inner');
  const detail=designR96OpenRib(window,source);
  const [y0,y1,z0,z1]=windowRect(window.box);
  for(const preceding of boxes.filter(x=>x.side===window.side)){
   const [a,b,c,d]=windowRect(preceding.box);
   if(Math.max(y0,a)<Math.min(y1,b)&&Math.max(z0,c)<Math.min(z1,d))
    fail('OVERLAPPING_RESEARCH_DAYLIGHT_WINDOWS');
  }
  boxes.push({side:window.side,box:window.box});
  newFaces.push(...detail.faces);
  const {faces,outerCorners,...audit}=detail;
  rooms.push({...audit,sourceBlockedSightlines:window.sourceBlockedSightlines,
   oldPostCutInnerWallHits:window.postCutInnerHullSightHits,
   openingBox:window.box,actualOuterCornices:outerCorners,
   physicalExteriorWallSupportCertified:false});
 }
 const result=[...old.faces,...newFaces];
 const beforeRibs=normalizedInnerArea(old.faces),
  originalArea=normalizedInnerArea(sourceWalls);
 if(!(beforeRibs<originalArea)||newFaces.length!==84)
  fail('SOURCE_OPENING_AREA_UNCHANGED_BY_ARCHITECTURAL_RIBS');
 const rays=old.proofs.map(a=>({
  side:a.side,tier:a.tier,
  before:sightBlockCount(a,old.faces.filter(f=>kindHull.has(f.kind))),
  after:sightBlockCount(a,result.filter(f=>kindHull.has(f.kind)||f.kind.includes('R96')))
 }));
 if(rays.some(x=>x.before.blocked!==0||x.after.blocked!==0||
    x.after.probes!==9))
  fail('REINFORCEMENT_VISUALS_REBLOCK_THE_ATRIUM');
 return {faces:result,rooms,sightlineRays:rays,
  sourceR95Triangles:old.faces.length,
  sourceR95ExactMeshPrefix:true,
  sourceInnerWallOriginalAreaNormalized:R(originalArea),
  sourceInnerWallCutAreaNormalized:R(beforeRibs),
  originalOpenAreaNormalized:R(originalArea-beforeRibs),
  addedArchitecturalSurroundTriangles:newFaces.length,
  newActiveBuildingTriangles:result.length,
  sevenIndependentSourceWallMarginsChecked:true,
  allNewSurroundsRemainOutsideExistingWindowYZRects:true,
  buildingFacadeStructuralContinuityCertified:false,
  daylightLuxOrSolarOrientationCalculated:false,
  visualQualityCertified:false,siteSpecificModelDimensionsKnown:false,
  independentVisualReview:'NOT_REVIEWED'};
}
export function prepareR96WindowReview(args={}){
 const {r95Evidence,...prior}=args,
  checked=prepareR95DaylightReview(prior);
 if(!r95Evidence||r95Evidence.schema!==R95_SCHEMA||
  JSON.stringify(checked)!==JSON.stringify(r95Evidence))
  fail('R95_COMPLETE_EVIDENCE_MISMATCH');
 if(typeof args.raw!=='string'||hash(args.raw)!==args.expectedRawSha256)
  fail('FROZEN_SOURCE_SHA_MISMATCH');
 const {faces,...result}=buildR96ArchitecturalWindowStudy(
  args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:checked.oldB143Status,
  strictR95SourceEvidenceAuthenticated:true,
  ...result,modelCalls:0,worldReads:0,worldWrites:0,safety:safety()};
}
function obj(faces){
 let n=1,k=null;const list=['# R96 double source-anchored 3D atrium windows',
  '# NOT real structural reinforcement, code or Minecraft execution'];
 for(const f of faces){
  if(k!==f.kind){k=f.kind;list.push('g '+k.replace(/[^a-zA-Z0-9_]/g,'_'))}
  for(const p of [f.a,f.b,f.c])list.push('v '+p.join(' '));
  list.push('f '+n+' '+(n+1)+' '+(n+2));n+=3;
 }
 return list.join('\n')+'\n';
}
function closeUpSvg(rooms){
 const all=[];
 const colors=['#f0ca84','#92b4cc','#e0a981','#819fba'];
 for(const q of rooms){
  const b=q.openingBox,o=q.actualOuterCornices;
  // Two-dimensional Y/Z section of the ACTUAL source-wall window per room.
  const x=60+(q.sourceSide==='right'?520:0),row=q.sourceTier,
   y=75+row*136;
  const yy=v=>y+55-(v-(b.yMin-.035))*350;
  const zz=v=>x+64+(v-(b.zMin-.06))*420;
  all.push('<rect x="'+(x+26)+'" y="'+(y-5)+
   '" width="390" height="106" fill="'+colors[row%4]+'" opacity=".25"/>');
  all.push('<polygon points="'+o.map(p=>zz(p[2]).toFixed(2)+','+yy(p[1]).toFixed(2)).join(' ')+
   '" fill="none" stroke="#355570" stroke-width="3"/>');
  all.push('<rect x="'+zz(b.zMin).toFixed(2)+'" y="'+yy(b.yMax).toFixed(2)+
   '" width="'+(420*(b.zMax-b.zMin)).toFixed(2)+'" height="'+(350*(b.yMax-b.yMin)).toFixed(2)+
   '" fill="#e6f4f8" stroke="#a7754c" stroke-width="2"/>');
  all.push('<text x="'+x+'" y="'+(y-12)+'" font-size="15" fill="#1e394a">'+
   q.sourceSide+' tier '+q.sourceTier+' — real window section</text>');
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 675">'+
  '<rect width="1080" height="675" fill="#edf3f7"/>'+all.join('')+'</svg>';
}
export function writeR96WindowReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())fail('EXISTING_SAFE_DESTINATION_REQUIRED');
 const base='R96_ATRIUM_SOURCE_WINDOW_SURROUND',
  files=[base+'_EVIDENCE.json',base+'_ARCHITECTURE.obj',
   base+'_ARCHITECTURAL_REVIEW.html'].map(x=>path.join(destination,x));
 if(files.some(x=>fs.existsSync(x)))fail('NO_OVERWRITE');
 const proof=prepareR96WindowReview(args),
  mesh=buildR96ArchitecturalWindowStudy(args.r80Evidence.conceptualRouteNodes);
 const rows=proof.rooms.map(q=>'<tr><td>'+esc(q.sourceSide)+'</td><td>'+
  q.sourceTier+'</td><td>'+q.minNormalizedRemainingCrownWeb+
  '</td><td>'+proof.sightlineRays.find(r=>r.side===q.sourceSide&&
   r.tier===q.sourceTier).after.blocked+
  '/9</td><td>'+q.distinctArchitecturalFaces+'</td></tr>').join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
 '<title>R96 Atrium Source-anchored Architectural Surrounds</title>'+
 '<style>body{max-width:1200px;padding:0 18px;margin:24px auto;font:15px/1.7 system-ui}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbccd5;padding:7px}svg{max-width:100%;height:auto}</style>'+
 '<h1>R96 7つの吹抜け窓と外殻：開口の周囲を建築としてつなぐ研究</h1>'+
 '<p>R95の本物の開口面はそのまま保持。元のR94内壁からサンプリングした外側4隅と、'+
 '実際に切り抜いたR95内側4隅を連続した二重リブと扇型フィンで結びました。'+
 'この部品が外殻を安全に支えるという意味ではありません。</p>'+
 '<p>R95元 '+proof.sourceR95Triangles+'面。新たな意匠リブ'+
 proof.addedArchitecturalSurroundTriangles+'面。新研究モデル '+proof.newActiveBuildingTriangles+
 '面。元内壁面積 '+proof.sourceInnerWallOriginalAreaNormalized+
 '、開口後 '+proof.sourceInnerWallCutAreaNormalized+
 '（正規化面積、内壁だけの値）。</p>'+
 closeUpSvg(proof.rooms)+
 '<table><tr><th>翼</th><th>階</th><th>源外殻に残る最小上部余白</th>'+
 '<th>改修後9光線の遮蔽</th><th>研究部品面数</th></tr>'+rows+'</table>'+
 '<p><a href="'+base+'_ARCHITECTURE.obj">R96全館OBJ</a> ／'+
 '<a href="R95_SEVEN_SOURCE_DAYLIGHT_PORTALS_REVIEW.html">R95の元4方向3D図</a></p>'+
 '<p>耐荷重、ガラス施工、雨風、lux、実人体幅、現実の寸法、独立美術品質は未認証。'+
 'NOT_PREPARED / 9 gates BLOCKED / BuildPlan空 / モデル0 / World0。</p></html>';
 fs.writeFileSync(files[0],JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(files[1],obj(mesh.faces),{flag:'wx'});
 fs.writeFileSync(files[2],html,{flag:'wx'});
 return {relativeFile:path.basename(files[2]),triangles:proof.newActiveBuildingTriangles,
  lightApertures:proof.rooms.length,modelCalls:0,worldWrites:0};
}
