/**
 * R83 — one local reading-terrace landing prototype per wing, grounded
 * in R81 triangles and R82 source-verified distance measurements.
 * Research geometry ONLY. Never turns a closest gap into a stair/bridge
 * on faith, and never grants actual Minecraft walking or structural PASS.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {nearestR82TerracePointXZ,auditR82GeometricGaps,
 prepareR82GeometryAudit,SCHEMA as R82_SCHEMA} from './b198zr82-mesh-clearance-and-terrace-audit.mjs';
import {buildR81EnvelopeVariant,intersectR81SegmentTriangle}
 from './b198zr81-envelope-portal-connection-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr83-wing-terrace-landing-prototypes-v1';
const fail=s=>{throw Error('B198ZR83_'+s)};
const hash=s=>createHash('sha256').update(s).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});
const rv=x=>x.map(n=>+n.toFixed(7));
const norm=v=>Math.hypot(...v);
const diff=(a,b)=>a.map((x,i)=>x-b[i]);
const interp=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
const midpoint=(a,b)=>interp(a,b,.5);
const dist=(a,b)=>norm(diff(a,b));
const lerp=(a,b,t)=>rv(interp(a,b,t));
const tri=(faces,a,b,c,kind)=>faces.push({a:rv(a),b:rv(b),c:rv(c),kind});
function landingOnTriangle(faces,f,kind){
 const center=rv(f.a.map((_,i)=>(f.a[i]+f.b[i]+f.c[i])/3));
 // Each vertex lies strictly within the SAME existing terrace triangle.
 const inset=[f.a,f.b,f.c].map(v=>rv(center.map((x,i)=>
  x+.57*(v[i]-x)+(i===1?.003:0))));
 tri(faces,inset[0],inset[1],inset[2],kind);
 return {center:rv([center[0],center[1]+.003,center[2]]),
  triangleVertices:[f.a,f.b,f.c],padVertices:inset};
}
function bridgeFaces(faces,a,b,kind){
 const run=Math.hypot(b[0]-a[0],b[2]-a[2]);
 if(run<.01)fail('RESEARCH_CONNECTOR_DEGENERATE');
 const dx=(b[2]-a[2])*.014/run,dz=-(b[0]-a[0])*.014/run;
 const p=rv([a[0]+dx,a[1],a[2]+dz]),
  q=rv([a[0]-dx,a[1],a[2]-dz]),
  r=rv([b[0]-dx,b[1],b[2]-dz]),
  s=rv([b[0]+dx,b[1],b[2]+dz]);
 tri(faces,p,q,r,kind);tri(faces,p,r,s,kind);
}
function connectorClearance(a,b,faces,side){
 const screening=faces.filter(f=>
  ['left_inner','right_inner','left_outer','right_outer',
   'left_crown','right_crown','left_end','right_end',
   'sky_lounge_glass'].includes(f.kind));
 let obstructions=0;
 const checkedKinds=new Set();
 for(const f of screening){
  const hit=intersectR81SegmentTriangle(a,b,f);
  if(hit){obstructions++;checkedKinds.add(f.kind);}
 }
 const samples=[];
 for(let i=0;i<=24;i++){
  const t=i/24,p=lerp(a,b,t);
  samples.push({t,point:p,withinProtectedAtrium:
   Math.abs(p[0])<.40&&Math.abs(p[2])<.94,
   onIntendedWing:side==='left'?p[0]<-.40:p[0]>.40});
 }
 const entersVoid=samples.some(x=>x.withinProtectedAtrium);
 const leavesWing=samples.some(x=>!x.onIntendedWing);
 return {obstructions,obstructionKinds:[...checkedKinds],
  centerlineSampleCount:samples.length,
  entersProtectedAtrium:entersVoid,leavesIntendedWing:leavesWing,
  fullDeckSurfaceCollisionNotTested:true,
  headroomAndBodyWidthNotVerified:true};
}
function chooseWing(faces,probes,route,side){
 const picks=probes.filter(p=>p.route===route&&
  Number.isFinite(p.spatialGap)).toSorted((a,b)=>{
    const aScore=a.spatialGap+.3*Math.abs(a.verticalGap);
    const bScore=b.spatialGap+.3*Math.abs(b.verticalGap);
    return aScore-bScore||a.index-b.index;
  });
 if(!picks.length)fail('NO_GROUNDED_READING_WING_PROBES');
 // This is strictly one localized review candidate per wing, NOT an
 // automatic globally shortest construction route.
 const selection=picks[0],targetKind=side+'_reading_terrace';
 let best=null;
 for(let i=0;i<faces.length;i++){
  const f=faces[i];
  if(f.kind!==targetKind)continue;
  const q=nearestR82TerracePointXZ(selection.deckCenter,f);
  if(!best||q.spatialDistance<best.measure.spatialDistance)
   best={index:i,triangle:f,measure:q};
 }
 if(!best)fail('TERRACE_TARGET_SURFACE_NOT_FOUND');
 const local=[];
 const landing=landingOnTriangle(local,best.triangle,
  side+'_contained_landing_PAD_NOT_CERTIFIED');
 const a=selection.deckCenter,b=landing.center;
 const planRun=Math.hypot(b[0]-a[0],b[2]-a[2]);
 const slope=planRun>.001?Math.abs(b[1]-a[1])/planRun:null;
 const screen=planRun>.009?connectorClearance(a,b,faces,side):{
  obstructions:0,obstructionKinds:[],centerlineSampleCount:0,
  entersProtectedAtrium:false,leavesIntendedWing:false,
  fullDeckSurfaceCollisionNotTested:true,headroomAndBodyWidthNotVerified:true};
 const rejection=[];
 if(planRun<.035)rejection.push('NO_RESEARCH_RUN_LENGTH');
 if(planRun>.28)rejection.push('TOO_LONG_FOR_LOCAL_WING_CONNECTION');
 if(slope===null||slope>.28)rejection.push('STUDY_SLOPE_LIMIT_EXCEEDED');
 if(screen.entersProtectedAtrium||screen.leavesIntendedWing)
  rejection.push('PROTECTED_ATRIUM_OR_OPPOSITE_WING');
 if(screen.obstructions>0)rejection.push('CENTERLINE_HITS_ORIGINAL_ENVELOPE');
 const connectorEmitted=rejection.length===0;
 if(connectorEmitted)
  bridgeFaces(local,a,b,side+'_local_connection_CONCEPT_NOT_CERTIFIED');
 const delta=rv(diff(b,a));
 return {route,side,sourceDeckWaypointIndex:selection.index,
  sourceR82Gap:selection.spatialGap,
  exactTerraceTriangleIndex:best.index,
  targetedOriginalTerracePoint:best.measure.point,
  landingTriangleInsetInOriginalTerrace:true,
  padCenter:landing.center,padVertexCount:landing.padVertices.length,
  segmentStart:a,segmentEnd:b,endpointDelta:delta,
  planLength:+planRun.toFixed(7),
  absoluteVerticalRise:+Math.abs(delta[1]).toFixed(7),
  researchSlope:slope===null?null:+slope.toFixed(7),
  centerlineCollisionScreen:screen,
  connectorEmitted,rejectionReasons:rejection,
  physicalFloorSupportCertified:false,
  entireConnectorSweptCollisionVerified:false,
  localLandingIsNotApprovedForConstruction:true,
  createdFaces:local};
}
export function buildR83WingLandingStudy(nodes){
 if(!nodes||!nodes.westAscent||!nodes.eastAscent)
  fail('R80_CONCEPT_PUBLIC_PATH_REQUIRED');
 const base=buildR81EnvelopeVariant(nodes);
 // Recompute R82's geometrically sourced terrace measurements here,
 // rather than trusting model-declared locations.
 const checked=auditR82GeometricGaps({
  routeNodes:nodes,portalSites:base.openingTests,faces:base.faces});
 const west=chooseWing(base.faces,checked.terraceProbes,'westAscent','left');
 const east=chooseWing(base.faces,checked.terraceProbes,'eastAscent','right');
 const additions=[...west.createdFaces,...east.createdFaces];
 const all=[...base.faces,...additions];
 if(all.some(f=>[f.a,f.b,f.c].some(p=>p.length!==3||
  p.some(v=>!Number.isFinite(v)))))
  fail('INVALID_3D_RESEARCH_TRIANGLES');
 const publicRouteUntouched=true;
 const rejected=[west,east].filter(x=>!x.connectorEmitted);
 return {faces:all,sourceFaceCount:base.faces.length,
  addedFaceCount:additions.length,
  sourceR82UnresolvedCount:checked.unresolved.length,
  sourceR82UnresolvedKinds:[...new Set(checked.unresolved.map(x=>x.id))],
  landingPrototypes:[west,east].map(({createdFaces,...other})=>other),
  candidateConnectorCount:2,
  acceptedForArtStudyOnly:2-rejected.length,
  rejectedForArtStudy:rejected.length,
  publicRouteUntouched,
  containedLandingCount:2,
  noAssumptionThatProgramZonesAreNowAccessible:true,
  directConnectionsDoNotProveConstructionReadiness:true};
}
function obj(faces){
 const rows=['# R83: R81 model + INSET reading-landings and only screened connector proposals',
  '# Not validated structural floors, Minecraft paths, safe pedestrian ramps or stairs.',
  'o TidalLightLibrary_R83_LocalWingLandingStudy'];
 let n=1,group='';
 for(const f of faces){
  if(f.kind!==group){group=f.kind;rows.push('g '+group);}
  for(const p of [f.a,f.b,f.c])
   rows.push('v '+p.map(x=>x.toFixed(7)).join(' '));
  rows.push('f '+n+' '+(n+1)+' '+(n+2));n+=3;
 }
 return rows.join('\n')+'\n';
}
const projection=(p,az,el)=>{
 const A=az*Math.PI/180,E=el*Math.PI/180;
 return [Math.cos(A)*p[0]-Math.sin(A)*p[2],
  Math.cos(E)*p[1]-Math.sin(E)*
   (Math.sin(A)*p[0]+Math.cos(A)*p[2]),
  Math.cos(E)*(Math.sin(A)*p[0]+Math.cos(A)*p[2])+Math.sin(E)*p[1]];
};
function svg(faces,az,el,label){
 const poly=faces.map(f=>{
  const p=[f.a,f.b,f.c].map(v=>projection(v,az,el));
  return {p,z:p.reduce((s,x)=>s+x[2],0)/3,kind:f.kind};
 }).sort((a,b)=>a.z-b.z);
 const all=poly.flatMap(x=>x.p),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
 const cx=(Math.min(...xs)+Math.max(...xs))/2,
  cy=(Math.min(...ys)+Math.max(...ys))/2;
 const scale=Math.min(748/(Math.max(...xs)-Math.min(...xs)),
  532/(Math.max(...ys)-Math.min(...ys)));
 const pos=p=>[(420+(p[0]-cx)*scale).toFixed(1),
  (307-(p[1]-cy)*scale).toFixed(1)];
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 630" role="img" aria-label="'+
  esc(label)+'"><rect width="840" height="630" fill="#edf4f5"/>'+
  poly.map(f=>{
   const color=f.kind.includes('contained_landing')?'#4eae73':
    f.kind.includes('local_connection')?'#d68239':
    f.kind.includes('marker')?'#d74b74':
    f.kind.includes('glass')?'#81d5da':
    f.kind.includes('deck')?'#e9b671':
    f.kind.startsWith('left_')?'#779ab1':'#98a7c1';
   return '<polygon points="'+f.p.map(p=>pos(p).join(',')).join(' ')+
    '" fill="'+color+'" fill-opacity="'+(f.kind.includes('glass')?.4:.89)+
    '" stroke="#294455" stroke-opacity=".15" stroke-width=".35"/>';
  }).join('')+
  '<text x="20" y="32" font-family="system-ui" font-size="20" font-weight="bold" fill="#26465a">'+
  esc(label)+'</text></svg>';
}
export function prepareR83ArchitecturalLandingReview({
 raw,expectedRawSha256,b143Status,expectedGeometrySha256=null,
 r61Evidence=null,r64Evidence=null,r66Evidence=null,r67Evidence=null,
 r68Evidence=null,r69Evidence=null,r70Evidence=null,r71Evidence=null,
 r72Evidence=null,r73Evidence=null,r74Evidence=null,
 r62Evidence,r76Evidence,r77Evidence,r78Evidence,r79Evidence,
 r80Evidence,r81Evidence,r82Evidence
}={}){
 if(typeof raw!=='string'||hash(raw)!==expectedRawSha256||
  Buffer.byteLength(raw)>120000)fail('FROZEN_SOURCE_SHA_REQUIRED');
 const r82=prepareR82GeometryAudit({raw,expectedRawSha256,
  b143Status,expectedGeometrySha256,r61Evidence,r64Evidence,
  r66Evidence,r67Evidence,r68Evidence,r69Evidence,r70Evidence,
  r71Evidence,r72Evidence,r73Evidence,r74Evidence,r62Evidence,
  r76Evidence,r77Evidence,r78Evidence,r79Evidence,r80Evidence,
  r81Evidence});
 if(!r82Evidence||r82Evidence.schema!==R82_SCHEMA||
  JSON.stringify(r82Evidence)!==JSON.stringify(r82))
  fail('R82_FULL_GEOMETRIC_EVIDENCE_RECOMPUTE_MISMATCH');
 const study=buildR83WingLandingStudy(r80Evidence.conceptualRouteNodes);
 const {faces,...info}=study;
 return {schema:SCHEMA,
  status:info.rejectedForArtStudy?
   'LOCAL_LANDINGS_GENERATED_CONNECTOR_DESIGN_GAPS_REMAIN':
   'TWO_LOCAL_CONCEPT_CONNECTORS_PROPOSED_NOT_REAL_WALKABILITY_PASS',
  originalRawSha256:expectedRawSha256,
  oldB143Status:b143Status,
  r82RecomputedAndAuthenticated:true,
  ...info,
  independentHumanCriteria:'NOT_REVIEWED',
  actualFunctionalLibraryUseVerified:false,
  actualMinecraftWalkingVerified:false,
  structuralFloorOrLandingApproval:false,
  newlyGeneratedResearchTrianglesNotB143Voxels:true,
  oldR81GeometryUnmodified:true,
  newModelInferenceNotAuthorized:true,
  executionAllowed:false,
  modelCalls:0,worldWrites:0,safety:safe()};
}
export function writeR83ArchitecturalLandingReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_NORMAL_DESTINATION_REQUIRED');
 const json=path.join(destination,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),
  mesh=path.join(destination,'R83_READING_WING_LANDING_STUDY.obj'),
  html=path.join(destination,'R83_BOOKSTACK_ACCESS_GEOMETRY_REVIEW.html');
 if([json,mesh,html].some(x=>fs.existsSync(x)))fail('NO_OVERWRITE');
 const result=prepareR83ArchitecturalLandingReview(args);
 const study=buildR83WingLandingStudy(args.r80Evidence.conceptualRouteNodes);
 const views=[
  svg(study.faces,0,14,'FRONT'),svg(study.faces,36,25,'OBLIQUE'),
  svg(study.faces,90,15,'SIDE'),svg(study.faces,36,69,'AERIAL')];
 const cards=views.map((v,i)=>'<figure><figcaption>'+
  ['正面','斜視','側面','俯瞰'][i]+'</figcaption>'+v+'</figure>').join('');
 const rows=result.landingPrototypes.map(p=>
  '<tr><td>'+esc(p.side)+'</td><td>'+p.sourceDeckWaypointIndex+
  '</td><td>'+p.sourceR82Gap.toFixed(4)+
  '</td><td>'+p.planLength.toFixed(4)+
  '</td><td>'+String(p.researchSlope)+
  '</td><td>'+(p.connectorEmitted?'研究用の短い面を追加':'保留')+
  '</td><td>'+esc(p.rejectionReasons.join(', ')||'実用性・強度は未審査')+
  '</td></tr>').join('');
 const page='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R83 Bookstack landing studies</title>'+
  '<style>body{font:15px/1.65 system-ui;max-width:1280px;margin:24px auto;padding:0 20px;color:#273e51}.warn{background:#fff1d7;padding:13px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(410px,1fr));gap:16px}figure{margin:0}figcaption{font-weight:bold}svg{width:100%;border:1px solid #cbd7df}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bdcbd8;padding:7px;text-align:left}</style></head><body>'+
  '<h1>R83 左右の書架翼とデッキを結ぶ段丘踊り場の研究</h1>'+
  '<p class="warn">緑は元の書架段丘三角形の内側にだけ作った研究用の着地点、橙は限定的な直線中心線検査に通った場合だけの短い接続候補です。自動的に長い橋を追加していません。身体の実際の幅・階段、材料強度、屋根や床の全面衝突、Minecraftでの歩行を証明しません。数値は正規化単位です。</p>'+
  '<table><tr><th>翼</th><th>デッキ節点</th><th>元の3Dずれ</th><th>計画水平長</th><th>傾斜</th><th>研究接続</th><th>保留理由</th></tr>'+
  rows+'</table>'+
  '<p>追加三角形：'+study.addedFaceCount+
  ' / 研究用連絡面あり：'+result.acceptedForArtStudyOnly+
  ' / 保留：'+result.rejectedForArtStudy+
  '。<a href="R83_READING_WING_LANDING_STUDY.obj">研究用3D OBJ</a></p>'+
  '<div class="grid">'+cards+'</div>'+
  '<p><a href="R82_INTERIOR_CLEARANCE_AND_LANDING_REVIEW.html">R82の実距離・未解決箇所</a> ／'+
  '<a href="R81_ARCHITECTURE_PORTAL_AND_SUPPORT_REVIEW.html">R81モデル</a></p>'+
  '<p>NOT_PREPARED、施工9ゲートBLOCKED、Qwen推論0、Minecraft操作0、独立人間品質NOT_REVIEWED</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(mesh,obj(study.faces),{flag:'wx'});
 fs.writeFileSync(html,page,{flag:'wx'});
 return {relativeFile:path.basename(html),status:result.status,
  addedFaces:study.addedFaceCount,modelCalls:0,worldWrites:0};
}

