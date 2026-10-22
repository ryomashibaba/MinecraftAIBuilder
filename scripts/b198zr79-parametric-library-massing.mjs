/**
 * R79: original parametric THREE-DIMENSIONAL architectural massing study.
 * NOT B143 voxels, model-generated output, Minecraft construction, a safe
 * walking route or an independently verified aesthetic result.
 *
 * Output: OBJ triangle surface study + static SVG views/sections + JSON.
 * Source evidence is checked against the complete recomputed R78 record.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareR78SpatialProgramSpec,SCHEMA as R78_SCHEMA}
 from './b198zr78-spatial-program-design-spec.mjs';
export const SCHEMA='minecraftaibuilder-b198zr79-original-parametric-massing-v1';
const err=t=>{throw Error('B198ZR79_'+t)};
const sha=t=>createHash('sha256').update(t).digest('hex');
const esc=t=>String(t).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const MAXY={left:.83,right:.98};
const RANGE=[-.94,.94];
function profile(side,t,z){
 const ytop=side==='left'?MAXY.left-.065*(z+.28)**2:
  MAXY.right-.095*(z-.17)**2;
 const y=t*ytop;
 const wobble=.017*Math.sin(z*4.4+t*2.5);
 const inset=(side==='left'?.29:.27)+.095*Math.sin(Math.PI*t)+.04*z*z+
  (side==='left'?.017:-.012)*z+wobble;
 const out=(side==='left'?.84:.82)+.09*Math.sin(t*Math.PI+(side==='left'?.4:.9))+
  .065*z*z+(side==='left'?-.034:.047)*z;
 const sign=side==='left'?-1:1;
 return {inner:[sign*inset,y,z],outer:[sign*out,y,z],height:ytop,
  corridorHalfWidth:inset,occupiedWingDepth:out-inset};
}
const tri=(all,a,b,c,kind)=>all.push({a,b,c,kind});
const quad=(all,a,b,c,d,kind)=>{
 tri(all,a,b,c,kind);tri(all,a,c,d,kind);
};
function appendWing(faces,side,N=22,M=16){
 const P=Array.from({length:N+1},(_,i)=>{
  const z=RANGE[0]+(RANGE[1]-RANGE[0])*i/N;
  return Array.from({length:M+1},(_,j)=>profile(side,j/M,z));
 });
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){
  const a=P[i][j],b=P[i+1][j],c=P[i+1][j+1],d=P[i][j+1];
  quad(faces,a.outer,b.outer,c.outer,d.outer,side+'_outer');
  quad(faces,b.inner,a.inner,d.inner,c.inner,side+'_inner');
 }
 for(let i=0;i<N;i++){
  const a=P[i][M],b=P[i+1][M],c=P[i+1][0],d=P[i][0];
  quad(faces,a.inner,b.inner,b.outer,a.outer,side+'_crown');
  quad(faces,d.outer,c.outer,c.inner,d.inner,side+'_base');
 }
 for(const i of [0,N])for(let j=0;j<M;j++){
  const a=P[i][j],b=P[i][j+1];
  quad(faces,a.inner,a.outer,b.outer,b.inner,side+'_end');
 }
 // Broad, internally housed reading terraces, NOT certified floors.
 for(const t of [.19,.36,.53,.68]){
  if(side==='left'&&t===.68)continue;
  for(let i=0;i<N;i++){
   const a=P[i][Math.round(t*M)],b=P[i+1][Math.round(t*M)];
   const innerA=a.inner,innerB=b.inner;
   const xA=innerA[0]+(a.outer[0]-innerA[0])*.43;
   const xB=innerB[0]+(b.outer[0]-innerB[0])*.43;
   quad(faces,innerA,innerB,[xB,innerB[1],innerB[2]],
    [xA,innerA[1],innerA[2]],side+'_reading_terrace');
  }
 }
 return P;
}
function appendLounge(faces){
 const center=[.55,.824,.35],radii=[.205,.084,.185];
 const L=20,H=8;
 const sphere=(u,v)=>{
  const a=u*Math.PI*2,b=v*Math.PI;
  return [center[0]+radii[0]*Math.sin(b)*Math.cos(a),
   center[1]+radii[1]*Math.cos(b),
   center[2]+radii[2]*Math.sin(b)*Math.sin(a)];
 };
 for(let j=0;j<H;j++)for(let i=0;i<L;i++){
  const a=sphere(i/L,j/H),b=sphere((i+1)/L,j/H),
   c=sphere((i+1)/L,(j+1)/H),d=sphere(i/L,(j+1)/H);
  quad(faces,a,b,c,d,'sky_lounge_glass');
 }
}
export function buildR79OriginalMesh(){
 const faces=[];
 const left=appendWing(faces,'left');
 const right=appendWing(faces,'right');
 appendLounge(faces);
 let minGap=Infinity,minThickness=Infinity,lowestTop=Infinity;
 for(let i=0;i<left.length;i++)for(let j=0;j<left[i].length;j++){
  const a=left[i][j],b=right[i][j];
  minGap=Math.min(minGap,b.inner[0]-a.inner[0]);
  minThickness=Math.min(minThickness,a.occupiedWingDepth,b.occupiedWingDepth);
  lowestTop=Math.min(lowestTop,left[i][left[i].length-1].height,
   right[i][right[i].length-1].height);
 }
 const vertices=faces.flatMap(f=>[f.a,f.b,f.c]);
 if(vertices.some(v=>v.some(x=>!Number.isFinite(x))))
  err('NONFINITE_MESH_COORDINATE');
 if(minGap<.40||minThickness<.29||lowestTop<.68)
  err('ATRIUM_OR_VOLUME_COLLAPSED');
 const result={geometryKind:'NEW_ORIGINAL_NORMALIZED_STUDY_NOT_B143_VOXELS',
  units:'dimensionless normalized art-study units, NOT metres or Minecraft blocks',
  yAxis:'vertical',
  leftCrownPeakBound:MAXY.left,
  rightCrownPeakBound:MAXY.right,
  minSampledAirAtriumGap:minGap,
  minSampledWingDepth:minThickness,
  facetedTriangles:faces.length,
  artStudy:faces,
  programZoneIntent:['SEASIDE_APPROACH','ENTRY_FORUM','CENTRAL_SKY_ATRIUM',
   'LEFT_BOOK_WING','RIGHT_BOOK_WING','SUPPORTED_PUBLIC_ASCENT',
   'GLASS_STARGAZING_LOUNGE','FOLDED_STRUCTURAL_ENVELOPE'],
  conceptualTerraceGeometryNotCertifiedSupportedFloors:true,
  glassLoungeNotCertifiedAccessible:true,
  hasNoArchitecturallySafeConstructibleRoutes:true,
  meshStructuralValidityNotVerified:true,
  humanVisualQuality:'NOT_REVIEWED'};
 return result;
}
function obj(mesh){
 const rows=[
  '# R79 ORIGINAL PARAMETRIC CONCEPT -- DIMENSIONLESS, NOT BUILT',
  '# Y is up. Triangle surfaces are an art study; not waterproof/watertight verified.',
  '# Not B143 compiled voxels. No Minecraft world operations.',
  'o TidalLightLibrary_R79_ArtStudy'
 ];
 let i=1,lastKind='';
 for(const f of mesh.artStudy){
  if(f.kind!==lastKind){rows.push('g '+f.kind);lastKind=f.kind;}
  for(const v of [f.a,f.b,f.c])rows.push('v '+v.map(x=>x.toFixed(6)).join(' '));
  rows.push('f '+i+' '+(i+1)+' '+(i+2));i+=3;
 }
 return rows.join('\n')+'\n';
}
const PALETTE={
 left_outer:'#6c9cb2',left_inner:'#294c6b',left_crown:'#cde0de',
 left_base:'#54788d',left_end:'#89b5c5',left_reading_terrace:'#d5b47c',
 right_outer:'#8b9bb9',right_inner:'#3c4c77',right_crown:'#e1d8d4',
 right_base:'#536889',right_end:'#adb4c8',right_reading_terrace:'#f0c28b',
 sky_lounge_glass:'#7ad4dc'
};
const opacity=kind=>kind==='sky_lounge_glass'?.52:kind.includes('terrace')?.95:1;
function project(pt,az,el){
 const A=az*Math.PI/180,E=el*Math.PI/180;
 const sa=Math.sin(A),ca=Math.cos(A),se=Math.sin(E),ce=Math.cos(E);
 return [ca*pt[0]-sa*pt[2],ce*pt[1]-se*(sa*pt[0]+ca*pt[2]),
  ce*(sa*pt[0]+ca*pt[2])+se*pt[1]];
}
function renderSvg(mesh,az,el,label){
 const all=mesh.artStudy.map(f=>{
  const pts=[f.a,f.b,f.c].map(p=>project(p,az,el));
  return {pts,color:PALETTE[f.kind]??'#748699',
   alpha:opacity(f.kind),z:pts.reduce((s,p)=>s+p[2],0)/3,
   kind:f.kind};
 }).sort((a,b)=>a.z-b.z);
 const xs=all.flatMap(t=>t.pts.map(p=>p[0])),ys=all.flatMap(t=>t.pts.map(p=>p[1]));
 const loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
 const W=820,H=610,pad=42,scale=Math.min((W-pad*2)/(hiX-loX),
  (H-pad*2)/(hiY-loY));
 const cx=(loX+hiX)/2,cy=(loY+hiY)/2;
 const px=p=>[(W/2+(p[0]-cx)*scale).toFixed(1),
  (H/2-(p[1]-cy)*scale).toFixed(1)];
 const polys=all.map(f=>'<polygon points="'+f.pts.map(p=>px(p).join(',')).join(' ')+
  '" fill="'+f.color+'" fill-opacity="'+f.alpha+'" stroke="#20374d" stroke-opacity=".12" stroke-width=".44"/>').join('');
 const marker=px(project([0,.43,-.08],az,el));
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+
  '" role="img" aria-label="'+esc(label)+'">'+
  '<rect width="'+W+'" height="'+H+'" fill="#e8f1f3"/>'+
  '<path d="M40 560 H780" stroke="#a3bdc9" stroke-dasharray="5 8"/>'+
  polys+'<g font-family="system-ui" font-size="16" font-weight="700">'+
  '<text x="28" y="32" fill="#294255">'+esc(label)+'</text>'+
  '<text x="'+marker[0]+'" y="'+marker[1]+'" text-anchor="middle" fill="#0b5870" stroke="#eef6f8" stroke-width="3" paint-order="stroke">OPEN ATRIUM</text>'+
  '</g></svg>';
}
function drawFrontSection(){
 const W=920,H=480,base=400,sca=360, mid=460;
 const X=x=>(mid+x*sca).toFixed(1),Y=y=>(base-y*sca).toFixed(1);
 const section=[];
 for(const side of ['left','right']){
  const P=Array.from({length:46},(_,i)=>profile(side,i/45,0));
  const outline=[...P.map(p=>p.outer),...P.toReversed().map(p=>p.inner)];
  section.push('<polygon points="'+outline.map(p=>X(p[0])+','+Y(p[1])).join(' ')+
   '" fill="'+(side==='left'?'#648fa8':'#889ab9')+
   '" stroke="#274761" stroke-width="2"/>');
  for(const t of [.19,.36,.53,.68]){
   if(side==='left'&&t===.68)continue;
   const q=profile(side,t,0);
   const inner=q.inner[0],outer=q.outer[0];
   section.push('<path d="M '+X(inner)+' '+Y(q.inner[1])+' L '+
    X(inner+(outer-inner)*.53)+' '+Y(q.inner[1])+
    '" stroke="#f3be73" stroke-width="7" stroke-linecap="round"/>');
  }
 }
 const lounge=profile('right',.83,0);
 section.push('<ellipse cx="'+X(lounge.inner[0]+.20)+
  '" cy="'+Y(.83)+'" rx="55" ry="23" fill="#81d2df" fill-opacity=".48" stroke="#05718a" stroke-width="3"/>');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+
  '" role="img" aria-label="Concept front transverse section">'+
  '<rect width="'+W+'" height="'+H+'" fill="#eaf3f4"/>'+
  '<path d="M30 '+base+' H890" stroke="#6c8998" stroke-width="2"/>'+
  section.join('')+
  '<text x="460" y="173" text-anchor="middle" font-family="system-ui" font-weight="bold" font-size="18" fill="#174a61">SKY VOID — NO WALKING FLOOR</text>'+
  '<text x="25" y="27" font-family="system-ui" font-weight="bold" font-size="18" fill="#284b61">FRONT SECTION: book wings + roof-height open atrium</text>'+
  '</svg>';
}
function drawPlan(){
 const W=920,H=440,scale=185,Cx=460,Cz=220;
 const X=x=>Cx+x*scale,Y=z=>Cz-z*scale;
 const zones=[];
 for(const side of ['left','right']){
  const N=44,T=.42;
  const samples=Array.from({length:N+1},(_,i)=>profile(side,T,
   RANGE[0]+(RANGE[1]-RANGE[0])*i/N));
  const q=[...samples.map(s=>s.inner),...samples.toReversed().map(s=>s.outer)];
  zones.push('<polygon points="'+q.map(p=>X(p[0]).toFixed(1)+','+Y(p[2]).toFixed(1)).join(' ')+
   '" fill="'+(side==='left'?'#7aa8b9':'#9daccb')+
   '" stroke="#49687d" stroke-width="2"/>');
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+
  '" role="img" aria-label="Concept plan at midheight">'+
  '<rect width="'+W+'" height="'+H+'" fill="#eaf2f3"/>'+zones.join('')+
  '<path d="M460 38 V402" stroke="#137c91" stroke-width="2" stroke-dasharray="5 8"/>'+
  '<text x="460" y="200" text-anchor="middle" font-family="system-ui" font-weight="bold" font-size="16" fill="#0b6170">OPEN VOID</text>'+
  '<text x="24" y="26" font-family="system-ui" font-weight="bold" font-size="17" fill="#244356">MIDLEVEL PLAN — not a playable floor plan</text></svg>';
}
export function prepareR79ParametricStudy({
 raw,expectedRawSha256,b143Status,expectedGeometrySha256=null,
 r61Evidence=null,r64Evidence=null,r66Evidence=null,r67Evidence=null,
 r68Evidence=null,r69Evidence=null,r70Evidence=null,r71Evidence=null,
 r72Evidence=null,r73Evidence=null,r74Evidence=null,
 r62Evidence,r76Evidence,r77Evidence,r78Evidence
}={}){
 if(typeof raw!=='string'||sha(raw)!==expectedRawSha256||
  Buffer.byteLength(raw)>120000)err('ORIGINAL_MODEL_SOURCE_SHA_REQUIRED');
 const r78=prepareR78SpatialProgramSpec({
  raw,expectedRawSha256,b143Status,expectedGeometrySha256,
  r61Evidence,r64Evidence,r66Evidence,r67Evidence,r68Evidence,
  r69Evidence,r70Evidence,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,r62Evidence,r76Evidence,r77Evidence});
 if(!r78Evidence||r78Evidence.schema!==R78_SCHEMA||
  JSON.stringify(r78Evidence)!==JSON.stringify(r78))
  err('R78_SOURCE_EVIDENCE_RECOMPUTE_MISMATCH');
 const mesh=buildR79OriginalMesh();
 if(mesh.programZoneIntent.length!==r78.zones.length||
  r78.zones.some((z,i)=>z.id!==mesh.programZoneIntent[i]))
  err('R78_FROZEN_PROGRAM_ZONES_NOT_PRESERVED');
 return {schema:SCHEMA,
  status:'NEW_ART_STUDY_MESH_NOT_REAL_MODEL_IMPROVEMENT',
  originalRawSha256:expectedRawSha256,
  r78RecomputedAndAuthenticated:true,
  oldB143Status:b143Status,
  independentHumanCriteria:r78.humanReviewCriteria.map(c=>({
   id:c.id,reviewStatus:'NOT_REVIEWED'})),
  designReference:'潮光の裂帆図書館 — original parametric variant, not adopted',
  dimensionlessGeometry:{
   leftCrownPeakBound:mesh.leftCrownPeakBound,
   rightCrownPeakBound:mesh.rightCrownPeakBound,
   minSampledAirAtriumGap:mesh.minSampledAirAtriumGap,
   minSampledWingDepth:mesh.minSampledWingDepth,
   facetedTriangles:mesh.facetedTriangles},
  programReferences:mesh.programZoneIntent,
  actual3DArtifact:true,geometryIsArchitecturalProposal:true,
  renderedViews:['FRONT','OBLIQUE','SIDE','AERIAL','FRONT_SECTION','MIDLEVEL_PLAN'],
  svgIsProjectedFromSameMesh:true,
  originalArtNotActualQwenOutput:true,
  meshNotWatertightOrStructurallyCertified:true,
  terracesNotWalkabilityCertified:true,
  conceptualSkyLoungeNotCertifiedReachable:true,
  exteriorGroundNotModelled:true,
  allHumanCriteria:'NOT_REVIEWED',
  approvedForModelInference:false,
  readyForConstruction:false,
  modelCalls:0,worldWrites:0,safety:safety()};
}
export function writeR79ParametricStudy({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  err('EXISTING_OUTPUT_FOLDER_REQUIRED');
 const json=path.join(destination,'R79_ART_STUDY_EVIDENCE.json'),
  objPath=path.join(destination,'R79_TIDAL_LIGHT_ART_STUDY.obj'),
  html=path.join(destination,'R79_ARCHITECTURE_FOUR_VIEWS_AND_SECTIONS.html');
 if([json,objPath,html].some(x=>fs.existsSync(x)))err('DO_NOT_OVERWRITE');
 const report=prepareR79ParametricStudy(args),mesh=buildR79OriginalMesh();
 const views=[
  renderSvg(mesh,0,12,'FRONT'),renderSvg(mesh,35,23,'OBLIQUE'),
  renderSvg(mesh,90,15,'SIDE'),renderSvg(mesh,35,70,'AERIAL'),
  drawFrontSection(),drawPlan()
 ];
 const labels=['正面','斜視','側面','俯瞰','正面断面','中層平面'];
 const cards=views.map((v,i)=>'<figure><figcaption>'+labels[i]+
  '</figcaption>'+v+'</figure>').join('');
 const page='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R79 Original parametric architectural art study</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:1280px;margin:25px auto;padding:0 20px;color:#294354}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:15px}figure{margin:0}figcaption{font-weight:bold;margin-bottom:5px}figure svg{width:100%;height:auto;display:block;border:1px solid #c1d2db}.warn{background:#fff1dc;padding:12px}a{color:#146f9e}</style></head><body>'+
  '<h1>R79 曲面の二翼に抱かれた未来図書館 — 原創3D形態研究</h1>'+
  '<p class="warn">これは新たに組み立てた正規化単位の3D表面形態研究です。旧Qwenの最終ボクセル・Minecraft施工図・構造認証ではありません。書架段丘・ガラスラウンジ・動線は構想の表現で、実際に歩けるとは証明していません。中央空洞は床で埋めていません。人間の建築美術品質審査は未実施です。</p>'+
  '<p>実体となる三角形面 '+report.dimensionlessGeometry.facetedTriangles+
  '、中央の最小標本空隙 '+report.dimensionlessGeometry.minSampledAirAtriumGap.toFixed(3)+
  '（正規化単位。メートルやブロックではない）。'+
  '編集・3D閲覧可能な <a href="R79_TIDAL_LIGHT_ART_STUDY.obj">OBJ形態</a>も生成。</p>'+
  '<div class="grid">'+cards+'</div>'+
  '<p><a href="R78_LIBRARY_SECTIONS_AND_ROUTE_SPEC.html">R78 空間と動線の設計仕様</a>、'+
  '<a href="R77_COHESIVE_LIBRARY_DESIGN_BRIEF.html">R77 造形の着想</a>を参照。</p>'+
  '<p>元回答SHA '+esc(report.originalRawSha256)+' ／ NOT_PREPARED ／ 施工9ゲートBLOCKED ／ Qwen追加推論0 ／ ワールド操作0。</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(objPath,obj(mesh),{flag:'wx'});
 fs.writeFileSync(html,page,{flag:'wx'});
 return {relativeFile:path.basename(html),objFile:path.basename(objPath),
  triangleCount:mesh.facetedTriangles,modelCalls:0,worldWrites:0};
}
