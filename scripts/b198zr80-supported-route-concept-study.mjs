/**
 * R80 — dimensionless 3D public-circulation research overlay on R79.
 * Not Minecraft blocks, physically certified stairs, public accessibility,
 * structural calculations, a remodel of the old Qwen source, or an approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR79OriginalMesh,prepareR79ParametricStudy,SCHEMA as R79_SCHEMA}
 from './b198zr79-parametric-library-massing.mjs';
export const SCHEMA='minecraftaibuilder-b198zr80-public-circulation-3d-study-v1';
const fail=m=>{throw Error('B198ZR80_'+m)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
// All following [x,y,z] positions are human-defined parametric art coordinates.
// The wings and the upper lounge are reached in this abstract design graph,
// NOT by a Minecraft avatar.
const NETWORK=Object.freeze({
  entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
  westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
  westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
   [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
  eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
   [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],[.68,.64,.73],
   [.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
});
const V=v=>v.map(n=>+n.toFixed(7));
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const same=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-7);
const faces=[];
const tri=(dst,a,b,c,kind)=>dst.push({a:V(a),b:V(b),c:V(c),kind});
const quad=(dst,a,b,c,d,kind)=>{
 tri(dst,a,b,c,kind);tri(dst,a,c,d,kind);
};
function panel(dst,aa,bb,width,kind){
 const span=distance(aa,bb);if(span<1e-7)fail('DEGENERATE_SEGMENT');
 const ox=(bb[2]-aa[2])*width/(2*span),
  oz=-(bb[0]-aa[0])*width/(2*span);
 const p=aa.map((v,i)=>v+(i===0?ox:i===2?oz:0)),
  q=aa.map((v,i)=>v-(i===0?ox:i===2?oz:0)),
  r=bb.map((v,i)=>v-(i===0?ox:i===2?oz:0)),
  s=bb.map((v,i)=>v+(i===0?ox:i===2?oz:0));
 const thick=.012;
 quad(dst,p,q,r,s,kind);
 quad(dst,p.map((x,i)=>i===1?x-thick:x),
  s.map((x,i)=>i===1?x-thick:x),
  r.map((x,i)=>i===1?x-thick:x),
  q.map((x,i)=>i===1?x-thick:x),kind+'_underside');
 quad(dst,p,s,s.map((x,i)=>i===1?x-thick:x),
  p.map((x,i)=>i===1?x-thick:x),kind+'_edge');
 quad(dst,q,q.map((x,i)=>i===1?x-thick:x),
  r.map((x,i)=>i===1?x-thick:x),r,kind+'_edge');
}
function landing(dst,p,width,kind){
 const x=p[0],y=p[1],z=p[2],r=width/2;
 quad(dst,[x-r,y,z-r],[x+r,y,z-r],
  [x+r,y,z+r],[x-r,y,z+r],kind);
}
function beam(dst,a,b,width,kind){
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
 const len=Math.hypot(dx,dy,dz);
 if(len<.04)fail('SUPPORT_TOO_SHORT');
 const ref=Math.abs(dy/len)<.95?[0,1,0]:[1,0,0];
 let u=[dy*ref[2]-dz*ref[1],dz*ref[0]-dx*ref[2],
  dx*ref[1]-dy*ref[0]];
 const ul=Math.hypot(...u);u=u.map(v=>v/ul*width/2);
 const v=[dy*u[2]-dz*u[1],dz*u[0]-dx*u[2],
  dx*u[1]-dy*u[0]].map(k=>k/len);
 const ring=(p)=>[[1,1],[-1,1],[-1,-1],[1,-1]].map(([a,b])=>
  p.map((d,i)=>d+a*u[i]+b*v[i]));
 const A=ring(a),B=ring(b);
 for(let i=0;i<4;i++)quad(dst,A[i],A[(i+1)%4],
  B[(i+1)%4],B[i],kind);
 quad(dst,A[3],A[2],A[1],A[0],kind);
 quad(dst,B[0],B[1],B[2],B[3],kind);
}
function domeFloor(dst){
 const center=[.55,.80,.35],N=32;
 for(let i=0;i<N;i++){
  const ang=i*Math.PI*2/N,next=(i+1)*Math.PI*2/N;
  tri(dst,center,[center[0]+.155*Math.cos(ang),center[1],
   center[2]+.135*Math.sin(ang)],
   [center[0]+.155*Math.cos(next),center[1],
   center[2]+.135*Math.sin(next)],'lounge_deck');
 }
}
const edges=()=>Object.entries(NETWORK).flatMap(([id,nodes])=>
 nodes.slice(1).map((to,i)=>({routeId:id,from:nodes[i],to,
  rise:to[1]-nodes[i][1],planLength:distance(nodes[i],to)})));
export function auditR80ResearchRoutes(network=NETWORK){
 if(Object.keys(network).sort().join(',')!==
  Object.keys(NETWORK).sort().join(','))
  fail('REQUIRED_PUBLIC_BRANCHES_MISSING');
 for(const [id,nodes] of Object.entries(network)){
  if(nodes.length!==NETWORK[id].length||
   nodes.some(p=>p.length!==3||p.some(x=>!Number.isFinite(x))))
   fail('RESEARCH_WAYPOINTS_MISSING');
  for(let i=1;i<nodes.length;i++){
   const a=nodes[i-1],b=nodes[i],run=distance(a,b);
   if(run<.09||Math.abs(b[1]-a[1])/run>.23||
    b[1]<a[1]-1e-7)
    fail('CONTINUITY_OR_SLOPE_NOT_ACCEPTABLE_FOR_ART_REVIEW');
  }
 }
 if(!same(network.entrance[0],network.westAccess[0])||
  !same(network.entrance.at(-1),network.eastAscent[0])||
  !same(network.westAccess.at(-1),network.westAscent[0])||
  !same(network.eastAscent.at(-1),[.55,.80,.35]))
  fail('PUBLIC_ROUTE_BRANCHES_OR_DESTINATION_DISCONNECTED');
 const all=Object.values(network).flat();
 if(all.some(p=>Math.abs(p[2])<.94&&Math.abs(p[0])<.40))
  fail('FULL_HEIGHT_ATRIUM_INTRUDED');
 const segments=Object.entries(network).flatMap(([id,nodes])=>
  nodes.slice(1).map((b,i)=>({id,a:nodes[i],b})));
 // Check the INTERIOR of every open-air segment, not only its endpoint.
 for(const {a,b} of segments)
  for(let t=0;t<=40;t++){
   const u=t/40,x=a[0]*(1-u)+b[0]*u,
    z=a[2]*(1-u)+b[2]*u;
   if(Math.abs(z)<.94&&Math.abs(x)<.40)
    fail('OPEN_ATRIUM_CROSSED_BY_DECK');
  }
 return {conceptRoutes:Object.keys(network).length,
  conceptualSegments:segments.length,
  maximumPlanSlope:Math.max(...segments.map(s=>
   Math.abs(s.b[1]-s.a[1])/distance(s.a,s.b))),
  reachesWestReadingWing:true,reachesEastReadingWing:true,
  reachesConceptualSkyLounge:true,
  centralRoofHeightVoidPreservedByResearchDecks:true,
  interiorAndHeadroomCollisionNotTested:true,
  realHumanWalkabilityProved:false,
  minecraftPlayerRouteCertified:false,
  structuralLoadCalculationPassed:false,
  sourceWorldModified:false};
}
export function buildR80CompositeStudy(network=NETWORK){
 const audit=auditR80ResearchRoutes(network);
 const base=buildR79OriginalMesh();
 const overlays=[];
 for(const [routeName,nodes] of Object.entries(network)){
  for(let i=0;i<nodes.length-1;i++)
   panel(overlays,nodes[i],nodes[i+1],
    routeName==='entrance'||routeName==='westAccess'?.085:.076,
    routeName.includes('Ascent')?'switchback_deck':'entry_deck');
  nodes.forEach(p=>landing(overlays,p,.086,'flat_landing'));
 }
 // Brackets from outer-wing region to distinct deck elevations. These
 // suggest architectural attachment, not validated load-bearing columns.
 for(const side of [-1,1])for(const h of side===1?[.24,.44,.64,.80]:[.20,.38,.54]){
  const z=h===.80?-.70:h>=.54?.69:h>=.38?-.69:.70;
  const target=[side*(h>=.54?.57:.60),h-.04,z];
  const from=[side*.84,Math.max(.05,h-.095),z];
  beam(overlays,from,target,.018,'shell_side_bracket');
 }
 domeFloor(overlays);
 const all=[...base.artStudy,...overlays];
 if(all.some(f=>[f.a,f.b,f.c].some(p=>p.some(x=>!Number.isFinite(x)))))
  fail('BAD_COMPOSITE_FACE_COORDINATE');
 return {audit,faces:all,originalWingAndLoungeFaces:base.facetedTriangles,
  originalR79AirAtriumGap:base.minSampledAirAtriumGap,
  newlyAddedFaces:overlays.length,
  totalFaces:all.length,sourceDimension:'dimensionless',
  humanAestheticQuality:'NOT_REVIEWED',
  meshNotCollisionOrStructuralCertified:true};
}
function exportObj(composite){
 const s=['# R80: dimensionless research mesh. NOT Minecraft-safe stairs.',
  '# R79 surface preserved plus experimental raised public ramps and brackets.',
  'o TidalLightLibrary_R80_ConceptCirculation'];
 let i=1,old='';
 for(const face of composite.faces){
  if(old!==face.kind){old=face.kind;s.push('g '+old);}
  for(const p of [face.a,face.b,face.c])
   s.push('v '+p.map(x=>x.toFixed(6)).join(' '));
  s.push('f '+i+' '+(i+1)+' '+(i+2));i+=3;
 }
 return s.join('\n')+'\n';
}
const colors={
 switchback_deck:'#efa642',entry_deck:'#f2c67c',
 flat_landing:'#eac17f',shell_side_bracket:'#ba976e',
 lounge_deck:'#92d9da',sky_lounge_glass:'#83d4e1',
 left_reading_terrace:'#dfbe85',right_reading_terrace:'#efc691',
 left_outer:'#6793b1',right_outer:'#8b9ab7',
 left_inner:'#375877',right_inner:'#465379',
 left_crown:'#d8e6e5',right_crown:'#dbd9e5'
};
const project=(p,az,el)=>{
 const A=az*Math.PI/180,E=el*Math.PI/180;
 return [Math.cos(A)*p[0]-Math.sin(A)*p[2],
  Math.cos(E)*p[1]-Math.sin(E)*
   (Math.sin(A)*p[0]+Math.cos(A)*p[2]),
  Math.cos(E)*(Math.sin(A)*p[0]+Math.cos(A)*p[2])+Math.sin(E)*p[1]];
};
function svgView(c,az,el,label){
 const faces=c.faces.map(f=>{
  const p=[f.a,f.b,f.c].map(v=>project(v,az,el));
  return {p,z:p.reduce((s,v)=>s+v[2],0)/3,
   kind:f.kind};
 }).sort((a,b)=>a.z-b.z);
 const xs=faces.flatMap(f=>f.p.map(v=>v[0])),
  ys=faces.flatMap(f=>f.p.map(v=>v[1]));
 const minX=Math.min(...xs),maxX=Math.max(...xs),
  minY=Math.min(...ys),maxY=Math.max(...ys);
 const scale=Math.min(725/(maxX-minX),515/(maxY-minY)),
  midX=(minX+maxX)/2,midY=(minY+maxY)/2;
 const xy=p=>[(410+(p[0]-midX)*scale).toFixed(1),
  (300-(p[1]-midY)*scale).toFixed(1)];
 const polygons=faces.map(f=>'<polygon points="'+
  f.p.map(p=>xy(p).join(',')).join(' ')+
  '" fill="'+(colors[f.kind]??'#68849a')+
  '" opacity="'+(f.kind==='sky_lounge_glass'?.38:.92)+
  '" stroke="#203e58" stroke-width=".32" stroke-opacity=".15"/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+
  esc(label)+'" viewBox="0 0 820 610"><rect width="820" height="610" fill="#eef4f5"/>'+
  polygons+'<text x="24" y="32" font-family="system-ui" fill="#253e50" font-size="18" font-weight="700">'+
  esc(label)+'</text></svg>';
}
function routePlan(){
 const labels=[...Object.entries(NETWORK)].map(([id,n])=>{
  const points=n.map(p=>
   (470+p[0]*195).toFixed(2)+','+(235-p[2]*180).toFixed(2)).join(' ');
  const color=id==='westAscent'?'#9660b5':
   id==='eastAscent'?'#d07d1f':'#278b9a';
  return '<polyline points="'+points+'" fill="none" stroke="'+color+
   '" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>'+
   '<text x="'+(470+n.at(-1)[0]*195+6).toFixed(2)+
   '" y="'+(235-n.at(-1)[2]*180-10).toFixed(2)+
   '" font-size="13" font-family="system-ui" fill="'+color+'">'+esc(id)+'</text>';
 });
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 510" role="img" aria-label="Plan of abstract deck network">'+
  '<rect width="940" height="510" fill="#eef5f6"/>'+
  '<rect x="385" y="60" width="170" height="350" fill="#d1e6e7" opacity=".65"/>'+
  labels.join('')+
  '<text x="470" y="220" text-anchor="middle" font-family="system-ui" font-size="16" fill="#287084">OPEN ATRIUM</text>'+
  '<text x="24" y="32" font-size="17" fill="#29495f" font-family="system-ui">RESEARCH ROUTE PLAN — layers overlap / not certified</text></svg>';
}
function routeElevation(){
 const W=940,H=520;
 const content=Object.entries(NETWORK).map(([id,n])=>{
  const points=n.map(p=>
   (460+p[2]*193).toFixed(1)+','+(460-p[1]*430).toFixed(1)).join(' ');
  return '<polyline points="'+points+'" fill="none" stroke="'+
   (id==='eastAscent'?'#c77421':id==='westAscent'?'#8d5fb2':'#38889b')+
   '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+
  '" role="img" aria-label="Vertical progress of each conceptual flight">'+
  '<rect width="'+W+'" height="'+H+'" fill="#eef5f6"/>'+
  '<path d="M70 460 H870" stroke="#7799a9" stroke-width="2"/>'+content+
  '<text x="25" y="31" font-family="system-ui" font-size="18" fill="#264357">LONGITUDINAL PATH ELEVATION — not real ramps</text>'+
  '<text x="800" y="72" font-size="14" fill="#264357">upper lounge</text></svg>';
}
export function prepareR80ResearchEvidence({
 raw,expectedRawSha256,b143Status,expectedGeometrySha256=null,
 r61Evidence=null,r64Evidence=null,r66Evidence=null,r67Evidence=null,
 r68Evidence=null,r69Evidence=null,r70Evidence=null,r71Evidence=null,
 r72Evidence=null,r73Evidence=null,r74Evidence=null,
 r62Evidence,r76Evidence,r77Evidence,r78Evidence,r79Evidence
}={}){
 if(typeof raw!=='string'||sha(raw)!==expectedRawSha256||
  Buffer.byteLength(raw)>120000)fail('FROZEN_ORIGINAL_SHA_REQUIRED');
 const r79=prepareR79ParametricStudy({
  raw,expectedRawSha256,b143Status,expectedGeometrySha256,
  r61Evidence,r64Evidence,r66Evidence,r67Evidence,r68Evidence,
  r69Evidence,r70Evidence,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,r62Evidence,r76Evidence,r77Evidence,r78Evidence});
 if(!r79Evidence||r79Evidence.schema!==R79_SCHEMA||
  JSON.stringify(r79Evidence)!==JSON.stringify(r79))
  fail('R79_SOURCE_EVIDENCE_RECOMPUTE_MISMATCH');
 const composite=buildR80CompositeStudy();
 return {schema:SCHEMA,status:'CONCEPTUAL_STAIR_AND_SUPPORT_RESEARCH_NOT_PLAYABLE',
  originalRawSha256:expectedRawSha256,previousB143Status:b143Status,
  r79RecomputedAndAuthenticated:true,
  mesh:{baselineFaces:composite.originalWingAndLoungeFaces,
   newFaces:composite.newlyAddedFaces,totalFaces:composite.totalFaces,
   baseAtriumGap:composite.originalR79AirAtriumGap,
   units:'dimensionless concept units, no metre or block scale'},
  circulationEvidence:composite.audit,
  conceptualRouteNodes:Object.fromEntries(Object.entries(NETWORK).map(([id,n])=>[id,n.map(V)])),
  reviewWarnings:[
   'Route deck geometry exists and is piecewise continuous by coordinate, but headroom, human-scale width and collision clearance are not proved.',
   'Brackets connect conceptually toward the outer shell; load transfer, attachment, beams and stairs are not structurally verified.',
   'Lounge disc is a concept floor, not verified as usable interior with adequate headroom or closed glazing.',
   'The entrance forecourt spans the void only outside the wing longitudinal envelope; actual exterior world grade is unknown.',
   'Old Qwen raw evidence and compiled B143 final voxels are unchanged. This is new human-authored parametric research.'
  ],
  actualNew3DArtStudy:true,
  noPhysicalWalkingCertificate:true,
  noHumanArchitecturalPass:true,
  noNewQwenInferenceAuthorized:true,
  noRealWorldOrMinecraftConstruction:true,
  fullHumanCriteria:'NOT_REVIEWED',
  geometryProposedButNotBuilt:true,
  modelCalls:0,worldWrites:0,safety:safety()};
}
export function writeR80ResearchGeometry({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_ORDINARY_REVIEW_DIR_REQUIRED');
 const evidence=path.join(destination,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),
  objPath=path.join(destination,'R80_LIBRARY_RAMP_AND_SUPPORT_STUDY.obj'),
  html=path.join(destination,'R80_LIBRARY_ACCESS_AND_STRUCTURE_VIEWS.html');
 if([evidence,objPath,html].some(x=>fs.existsSync(x)))
  fail('NEVER_OVERWRITE_PREVIOUS_STUDY');
 const r=prepareR80ResearchEvidence(args);
 const m=buildR80CompositeStudy();
 const views=[
  svgView(m,0,12,'FRONT'),svgView(m,35,25,'OBLIQUE'),
  svgView(m,90,15,'SIDE'),svgView(m,35,70,'AERIAL'),
  routePlan(),routeElevation()];
 const labels=['正面','斜視','側面','俯瞰','折り返し動線の平面','折り返し動線の縦断'];
 const fig=views.map((v,i)=>'<figure><figcaption>'+
  labels[i]+'</figcaption>'+v+'</figure>').join('');
 const h='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R80 Architectural circulation and support study</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:1320px;margin:25px auto;padding:0 22px;color:#273f53}.views{display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:18px}figure{margin:0}figcaption{font-weight:bold}svg{width:100%;border:1px solid #c4d2dd}.warn{background:#fff0da;padding:14px}</style></head><body>'+
  '<h1>R80 書架と最上層ラウンジを結ぶ研究用3Dデッキ</h1>'+
  '<p class="warn">連続したデッキと踊り場、外殻側ブラケット、ラウンジ床を表面モデル化しました。建設可能な階段、Minecraftで歩行可能な道、構造計算済みの支持材ではありません。研究用の正規化単位で、原本にない設計を追加しています。実機での幅・頭上・衝突・安全性と人間による造形品質の審査は未実施です。</p>'+
  '<p>新規三角形 '+r.mesh.newFaces+
  ' / 合計 '+r.mesh.totalFaces+
  '。研究上の最大縦断傾斜 '+r.circulationEvidence.maximumPlanSlope.toFixed(3)+
  '（単位を持たない比）。<a href="R80_LIBRARY_RAMP_AND_SUPPORT_STUDY.obj">OBJモデル</a></p>'+
  '<div class="views">'+fig+'</div>'+
  '<p><a href="R79_ARCHITECTURE_FOUR_VIEWS_AND_SECTIONS.html">R79外観の基礎案</a>・'+
  '<a href="R78_LIBRARY_SECTIONS_AND_ROUTE_SPEC.html">R78空間計画</a>を参照。</p>'+
  '<p>元原本SHA '+esc(r.originalRawSha256)+
  ' / NOT_PREPARED / 施工9ゲートBLOCKED / Qwen再推論0 / Minecraft操作0</p></body></html>';
 fs.writeFileSync(evidence,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(objPath,exportObj(m),{flag:'wx'});
 fs.writeFileSync(html,h,{flag:'wx'});
 return {relativeFile:path.basename(html),objFile:path.basename(objPath),
  triangles:m.totalFaces,modelCalls:0,worldWrites:0};
}
