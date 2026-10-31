/**
 * R82 — conservative geometric probes on R81's dimensionless mesh:
 * sampled portal rays, roof ray intersections and actual reading-terrace
 * triangle proximity. Visual study markers, never fictional stairs.
 * Not continuous swept-person clearance, structural certification, nor
 * full triangle/triangle or Minecraft voxel collision.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR81EnvelopeVariant,intersectR81SegmentTriangle,
 prepareR81ArchitectureReview,SCHEMA as R81_SCHEMA}
 from './b198zr81-envelope-portal-connection-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr82-mesh-clearance-terrrace-proximity-v1';
const fail=t=>{throw Error('B198ZR82_'+t)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const norm=a=>Math.hypot(...a);
const distance=(a,b)=>norm(subtract(a,b));
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const round=p=>p.map(x=>+x.toFixed(7));
function segmentTriangles(a,b,faces,kind){
 let hits=0;
 for(const f of faces){
  if(f.kind!==kind)continue;
  if(intersectR81SegmentTriangle(a,b,f))hits++;
 }
 return hits;
}
/**
 * Distance to triangle *as projected into x/z* with interpolation of
 * vertical terrace Y at closest projected point. Exact for this planar
 * barycentric interpolation, not a Euclidean triangle-to-triangle distance.
 */
export function nearestR82TerracePointXZ(p,f){
 const A=[f.a[0],f.a[2]],B=[f.b[0],f.b[2]],C=[f.c[0],f.c[2]],P=[p[0],p[2]];
 const dx=(a,b)=>[a[0]-b[0],a[1]-b[1]];
 const cross2=(a,b)=>a[0]*b[1]-a[1]*b[0];
 const den=cross2(dx(B,A),dx(C,A));
 let weights=null;
 if(Math.abs(den)>1e-12){
  const w=cross2(dx(P,A),dx(C,A))/den;
  const v=cross2(dx(B,A),dx(P,A))/den;
  if(w>=-1e-9&&v>=-1e-9&&w+v<=1+1e-9)
   weights=[1-w-v,w,v];
 }
 if(!weights){
  let best={d:Infinity,w:null};
  for(const [i,j] of [[0,1],[1,2],[2,0]]){
   const corners=[A,B,C],v=dx(corners[j],corners[i]);
   const ls=dot(v,v);
   const t=ls>1e-12?clamp(dot(dx(P,corners[i]),v)/ls):0;
   const q=[corners[i][0]+v[0]*t,corners[i][1]+v[1]*t];
   const d=Math.hypot(P[0]-q[0],P[1]-q[1]);
   if(d<best.d){
    const w=[0,0,0];w[i]=1-t;w[j]=t;
    best={d,w};
   }
  }
  weights=best.w;
 }
 const result=[f.a,f.b,f.c][0].map((_,i)=>
  weights[0]*f.a[i]+weights[1]*f.b[i]+weights[2]*f.c[i]);
 return {point:round(result),
  horizontalDistance:+Math.hypot(result[0]-p[0],result[2]-p[2]).toFixed(7),
  verticalDifference:+(result[1]-p[1]).toFixed(7),
  spatialDistance:+distance(result,p).toFixed(7)};
}
function scanPortalSamples(segment,faces){
 const a=segment.from,b=segment.to;
 const dx=b[0]-a[0],dz=b[2]-a[2],run=Math.hypot(dx,dz);
 if(run<.01)fail('PORTAL_SEGMENT_INVALID');
 const side=[dz/run,0,-dx/run];
 // DO NOT interpret grid spacing as metres or a complete aperture proof.
 const lateralOffsets=[-.070,-.045,-.0225,0,.0225,.045,.070];
 const headOffsets=[0,.045,.090,.145,.200];
 const grid=[],kind=segment.kind;
 for(const y of headOffsets)for(const x of lateralOffsets){
  const change=[side[0]*x,y,side[2]*x];
  const from=round(a.map((v,i)=>v+change[i]));
  const to=round(b.map((v,i)=>v+change[i]));
  const number=segmentTriangles(from,to,faces,kind);
  grid.push({lateralOffset:x,verticalOffset:y,barrierHits:number,
   sampledCenterlineClear:number===0});
 }
 return {id:segment.id,kind,grid,
  referenceOnlyNormalizedOffsets:true,
  sampledRayCount:grid.length,
  sampledBarrierHits:grid.reduce((n,r)=>n+r.barrierHits,0),
  allSampledRaysClear:grid.every(p=>p.barrierHits===0),
  noSweptVolumeOrCertifiedDoorEnvelope:true};
}
function roofProbes(faces,routeNodes){
 const roof=faces.filter(f=>f.kind==='left_crown'||f.kind==='right_crown');
 const points=[];
 for(const route of ['westAscent','eastAscent']){
  for(const [index,p] of routeNodes[route].entries()){
   if(p[1]<.15||Math.abs(p[2])>.94)continue;
   const start=[p[0],p[1]+.002,p[2]],end=[p[0],1.18,p[2]];
   const vertical=[];
   for(const f of roof){
    const h=intersectR81SegmentTriangle(start,end,f);
    if(h)vertical.push(h.point[1]-p[1]);
   }
   const gap=vertical.length?Math.min(...vertical):null;
   points.push({route,index,point:p,overheadTriangleHits:vertical.length,
    roofGapFromRouteCenterPoint:gap===null?null:+gap.toFixed(7),
    gapBelowIllustrativeResearchMarker:gap!==null&&gap<.15,
    noRoofIntersectionIsNotProofOfClearHeadroom:gap===null});
  }
 }
 return points;
}
function terraceProbes(faces,nodes){
 const result=[];
 for(const [route,side] of [['westAscent','left'],['eastAscent','right']]){
  const terraces=faces.filter(f=>f.kind===side+'_reading_terrace');
  if(!terraces.length)fail('R79_READING_TERRACE_MISSING');
  for(const [index,p] of nodes[route].entries()){
   if(p[1]<.15||Math.abs(p[2])>.94)continue;
   let best=null;
   for(const f of terraces){
    const q=nearestR82TerracePointXZ(p,f);
    if(!best||q.spatialDistance<best.spatialDistance)best=q;
   }
   if(!best)fail('NO_READING_TERRACE_PROJECTION');
   result.push({route,index,deckCenter:p,
    nearestTerraceSurface:best.point,
    horizontalGap:best.horizontalDistance,
    verticalGap:best.verticalDifference,
    spatialGap:best.spatialDistance,
    exactPhysicalWalkingTransitionProven:false,
    missingJoinReviewNeeded:best.spatialDistance>.025,
    requestedDesignCorrection:'Design real reading-floor access with supported landings and collision/headroom testing; do not bridge by an automatic shortest line.'});
  }
 }
 return result;
}
const markTri=(out,a,b,c,kind)=>out.push({a:round(a),b:round(b),c:round(c),kind});
function pointer(out,a,b,kind){
 // Thin four-sided marker oriented along the offset; it is ANNOTATION ONLY.
 const d=subtract(b,a),L=norm(d);
 if(L<.00001)return;
 let crossDir=[-d[2],0,d[0]],S=norm(crossDir);
 if(S<.000001){crossDir=[.007,0,0];S=.007}
 const v=crossDir.map(x=>x/S*.005);
 const pa=a.map((x,i)=>x+v[i]),pb=a.map((x,i)=>x-v[i]);
 const qa=b.map((x,i)=>x+v[i]),qb=b.map((x,i)=>x-v[i]);
 markTri(out,pa,pb,qb,kind);markTri(out,pa,qb,qa,kind);
}
export function auditR82GeometricGaps({routeNodes,portalSites,faces}={}){
 if(!routeNodes||!Array.isArray(portalSites)||portalSites.length!==3||
  !Array.isArray(faces)||faces.length<1000)
  fail('R81_VERIFIED_FACE_AND_ROUTE_DATA_REQUIRED');
 const portal=portalSites.map(s=>scanPortalSamples(s,faces));
 const roof=roofProbes(faces,routeNodes);
 const terrace=terraceProbes(faces,routeNodes);
 const issues=[];
 for(const p of portal)if(!p.allSampledRaysClear)
  issues.push({id:'SAMPLED_PORTAL_BARRIER_REMAINS',site:p.id,
   sampledBarrierHits:p.sampledBarrierHits});
 for(const r of roof)if(r.gapBelowIllustrativeResearchMarker)
  issues.push({id:'ROOF_CROWN_NEAR_ROUTE_POINT',site:r.route+'/'+r.index,
   sampledGap:r.roofGapFromRouteCenterPoint});
 for(const d of terrace)if(d.missingJoinReviewNeeded)
  issues.push({id:'DECK_TO_READING_TERRACE_NOT_IN_SAME_SURFACE',site:d.route+'/'+d.index,
   spatialGap:d.spatialGap});
 const annotationFaces=[];
 for(const d of terrace)
  if(d.missingJoinReviewNeeded)
   pointer(annotationFaces,d.deckCenter,d.nearestTerraceSurface,
    'unresolved_terrace_join_marker_NOT_WALKABLE');
 for(const r of roof)if(r.gapBelowIllustrativeResearchMarker)
  pointer(annotationFaces,r.point,
   [r.point[0],r.point[1]+r.roofGapFromRouteCenterPoint,r.point[2]],
   'roof_clearance_marker_NOT_STRUCTURE');
 return {portalSamples:portal,roofProbes:roof,terraceProbes:terrace,
  unresolved:issues,annotationFaces,
  sampledPortalRays:portal.reduce((n,p)=>n+p.sampledRayCount,0),
  roofProbeCount:roof.length,terraceProbeCount:terrace.length,
  illustrativeThresholdsAreNotMinecraftOrBuildingStandards:true,
  noContinuousVolumeCollisionTest:true,
  surfaceDistanceDoesNotProveAnAccessibleLanding:true,
  unscaledModelCannotCertifyRealHeadroom:true,
  humanSpatialReview:'NOT_REVIEWED'};
}
function obj(faces){
 let n=1,old='';
 const rows=['# R82 RESEARCH AUDIT ANNOTATIONS -- NOT ACCESSIBLE RAMPS',
  '# Pink marker faces highlight unresolved transitions / roof clearance.',
  'o TidalLightLibrary_R82_GeometricReview'];
 for(const f of faces){
  if(f.kind!==old){rows.push('g '+f.kind);old=f.kind;}
  for(const v of [f.a,f.b,f.c])rows.push('v '+v.map(x=>x.toFixed(7)).join(' '));
  rows.push('f '+n+' '+(n+1)+' '+(n+2));n+=3;
 }
 return rows.join('\n')+'\n';
}
const project=(p,az,el)=>{
 const A=az*Math.PI/180,E=el*Math.PI/180;
 return [Math.cos(A)*p[0]-Math.sin(A)*p[2],
  Math.cos(E)*p[1]-Math.sin(E)*(Math.sin(A)*p[0]+Math.cos(A)*p[2]),
  Math.cos(E)*(Math.sin(A)*p[0]+Math.cos(A)*p[2])+Math.sin(E)*p[1]];
};
function svg(faces,az,el,title){
 const polys=faces.map(f=>{
  const pts=[f.a,f.b,f.c].map(p=>project(p,az,el));
  const z=pts.reduce((a,p)=>a+p[2],0)/3;
  return {kind:f.kind,pts,z};
 }).sort((a,b)=>a.z-b.z);
 const all=polys.flatMap(f=>f.pts),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
 const mx=(Math.min(...xs)+Math.max(...xs))/2,
  my=(Math.min(...ys)+Math.max(...ys))/2;
 const scale=Math.min(760/(Math.max(...xs)-Math.min(...xs)),
  520/(Math.max(...ys)-Math.min(...ys)));
 const px=p=>[(425+(p[0]-mx)*scale).toFixed(1),
  (300-(p[1]-my)*scale).toFixed(1)];
 const blocks=polys.map(f=>{
  const isMark=f.kind.includes('_NOT_');
  const color=isMark?'#eb3260':f.kind.includes('glass')?'#77ccd5':
   f.kind.includes('deck')||f.kind.includes('landing')?'#eeb46c':
   f.kind.startsWith('left_')?'#739bb5':'#93a0b9';
  return '<polygon points="'+f.pts.map(p=>px(p).join(',')).join(' ')+
   '" fill="'+color+'" fill-opacity="'+(isMark?1:f.kind.includes('glass')?.38:.80)+
   '" stroke="#20455a" stroke-opacity=".13" stroke-width=".35"/>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 620" role="img" aria-label="'+esc(title)+'">'+
  '<rect width="850" height="620" fill="#ebf3f5"/>'+blocks+
  '<text x="22" y="30" fill="#253b51" font-family="system-ui" font-size="18" font-weight="bold">'+esc(title)+'</text></svg>';
}
export function prepareR82GeometryAudit({
 raw,expectedRawSha256,b143Status,expectedGeometrySha256=null,
 r61Evidence=null,r64Evidence=null,r66Evidence=null,r67Evidence=null,
 r68Evidence=null,r69Evidence=null,r70Evidence=null,r71Evidence=null,
 r72Evidence=null,r73Evidence=null,r74Evidence=null,
 r62Evidence,r76Evidence,r77Evidence,r78Evidence,r79Evidence,
 r80Evidence,r81Evidence
}={}){
 if(typeof raw!=='string'||sha(raw)!==expectedRawSha256||
  Buffer.byteLength(raw)>120000)fail('FROZEN_MODEL_SOURCE_SHA_REQUIRED');
 const r81=prepareR81ArchitectureReview({raw,expectedRawSha256,
  b143Status,expectedGeometrySha256,r61Evidence,r64Evidence,
  r66Evidence,r67Evidence,r68Evidence,r69Evidence,r70Evidence,
  r71Evidence,r72Evidence,r73Evidence,r74Evidence,r62Evidence,
  r76Evidence,r77Evidence,r78Evidence,r79Evidence,r80Evidence});
 if(!r81Evidence||r81Evidence.schema!==R81_SCHEMA||
  JSON.stringify(r81Evidence)!==JSON.stringify(r81))
  fail('R81_COMPLETE_EVIDENCE_RECOMPUTE_MISMATCH');
 const m=buildR81EnvelopeVariant(r80Evidence.conceptualRouteNodes);
 const audit=auditR82GeometricGaps({
  routeNodes:r80Evidence.conceptualRouteNodes,
  portalSites:m.openingTests,faces:m.faces});
 return {schema:SCHEMA,status:audit.unresolved.length?
  'UNRESOLVED_PORTAL_TERRACE_OR_ROOF_GEOMETRY_REQUIRES_REDESIGN':
  'SAMPLED_RESEARCH_GEOMETRY_UNRESOLVED_REAL_ACCESS',
  originalRawSha256:expectedRawSha256,
  oldB143Status:b143Status,r81RecomputedAndAuthenticated:true,
  meshTriangleCount:m.faces.length,
  audit:{sampledPortalRays:audit.sampledPortalRays,
   portalTests:audit.portalSamples,
   roofProbeCount:audit.roofProbeCount,
   roof:audit.roofProbes,
   terraceProbeCount:audit.terraceProbeCount,
   terraces:audit.terraceProbes,
   unresolved:audit.unresolved,
   annotationTriangles:audit.annotationFaces.length},
  proposedPhysicalChanges:[],
  viewerMarkersAreNotWalkableSurfaces:true,
  noAssumedMetreOrBlockScale:true,
  noActual3DMeshIntersectionCompleteness:true,
  noHumanMovementOrAestheticPass:true,
  noNewQwenPermission:true,
  reviewerEvidenceStatus:'NOT_REVIEWED',
  modelCalls:0,worldWrites:0,safety:safety()};
}
export function writeR82GeometryAudit({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('NORMAL_EXISTING_DESTINATION_REQUIRED');
 const json=path.join(destination,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),
  html=path.join(destination,'R82_INTERIOR_CLEARANCE_AND_LANDING_REVIEW.html'),
  mesh=path.join(destination,'R82_ANNOTATED_GEOMETRY_ISSUES.obj');
 if([json,html,mesh].some(x=>fs.existsSync(x)))fail('REFUSE_OVERWRITE');
 const result=prepareR82GeometryAudit(args);
 const m=buildR81EnvelopeVariant(args.r80Evidence.conceptualRouteNodes);
 const audit=auditR82GeometricGaps({
  routeNodes:args.r80Evidence.conceptualRouteNodes,
  portalSites:m.openingTests,faces:m.faces});
 const rendered=[svg([...m.faces,...audit.annotationFaces],0,13,'FRONT'),
  svg([...m.faces,...audit.annotationFaces],38,25,'OBLIQUE'),
  svg([...m.faces,...audit.annotationFaces],90,16,'SIDE'),
  svg([...m.faces,...audit.annotationFaces],38,70,'AERIAL')];
 const rows=result.audit.portalTests.map(p=>
  '<tr><td>'+esc(p.id)+'</td><td>'+p.sampledRayCount+
  '</td><td>'+p.sampledBarrierHits+
  '</td><td>'+(p.allSampledRaysClear?'全部の標本は非交差':'標本に交差が残る')+'</td></tr>').join('');
 const section=result.audit.unresolved.slice(0,60).map(i=>
  '<li>'+esc(i.id)+' — '+esc(i.site)+'</li>').join('');
 const htmlText='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R82 Actual Mesh Clearance and Reading Landing Audit</title>'+
  '<style>body{font:15px/1.65 system-ui;max-width:1250px;margin:24px auto;padding:0 22px;color:#273f51}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:18px}.warn{background:#fff0d6;padding:13px}svg{width:100%;border:1px solid #bacbd6}figure{margin:0}figcaption{font-weight:bold}table{border-collapse:collapse}td,th{border:1px solid #bfd0dc;padding:7px}li{margin:4px 0}</style></head><body>'+
  '<h1>R82 デッキ・書架段丘・屋根・出入口の3D形状検査</h1>'+
  '<p class="warn">ピンク線は未解決の段丘接続/屋根余裕を示す**注釈**であり、歩ける橋ではありません。開口は35本×3箇所の直線サンプル、屋根は節点からの縦の線、書架は三角形表面の最近傍を検査します。人間の通過、メッシュ全体の衝突、手すり、支持やMinecraftでの安全性は証明しません。長さはすべて正規化単位で実寸ではありません。</p>'+
  '<table><tr><th>入口/ガラス</th><th>直線標本</th><th>残る交差</th><th>限定判定</th></tr>'+rows+'</table>'+
  '<p>屋根の節点標本 '+result.audit.roofProbeCount+
  '、段丘最近傍標本 '+result.audit.terraceProbeCount+
  '、未解決のレビュー事項 '+result.audit.unresolved.length+
  '。<a href="R82_ANNOTATED_GEOMETRY_ISSUES.obj">3D注釈OBJ</a></p>'+
  '<div class="grid">'+rendered.map((x,i)=>'<figure><figcaption>'+
  ['正面','斜視','側面','俯瞰'][i]+'</figcaption>'+x+'</figure>').join('')+'</div>'+
  '<h2>確認すべき箇所（最大60件）</h2><ul>'+section+'</ul>'+
  '<p><a href="R81_ARCHITECTURE_PORTAL_AND_SUPPORT_REVIEW.html">R81改訂モデル</a>・'+
  '<a href="R80_LIBRARY_ACCESS_AND_STRUCTURE_VIEWS.html">R80旧モデル</a>を並べて確認。</p>'+
  '<p>人間審査NOT_REVIEWED / NOT_PREPARED / 施工9ゲートBLOCKED / 推論0 / Minecraft操作0</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(mesh,obj([...m.faces,...audit.annotationFaces]),{flag:'wx'});
 fs.writeFileSync(html,htmlText,{flag:'wx'});
 return {relativeFile:path.basename(html),status:result.status,
  unresolvedCount:result.audit.unresolved.length,
  modelCalls:0,worldWrites:0};
}
