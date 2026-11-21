/**
 * R92: one architectural circulation atlas across entrance / seven tier
 * galleries / rooftop lounge, PLUS actual shared-edge entrance-folio geometry.
 * A graph path is NOT legal/public walking or independent art approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR91TurnoutStudy,prepareR91TurnoutReview,SCHEMA as R91_SCHEMA}
 from './b198zr91-tapered-gallery-turnout.mjs';
import {buildR90SurfaceSeams} from './b198zr90-source-surface-seams.mjs';
import {buildR88GalleryStudy} from './b198zr88-gallery-circulation-study.mjs';
import {auditR80ResearchRoutes} from './b198zr80-supported-route-concept-study.mjs';

export const SCHEMA='minecraftaibuilder-b198zr92-whole-library-circulation-atlas-v1';
const fail=s=>{throw Error('B198ZR92_'+s)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const R=x=>+x.toFixed(7);
const V=p=>p.map(R);
const mid=(a,b,t)=>V(a.map((x,i)=>x+(b[i]-x)*t));
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=f=>Math.hypot(...cross(sub(f.b,f.a),sub(f.c,f.a)))/2;
const tri=(faces,a,b,c,kind)=>faces.push({a:V(a),b:V(b),c:V(c),kind});
const quad=(faces,a,b,c,d,k)=>{tri(faces,a,b,c,k);tri(faces,a,c,d,k)};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const matches=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-7);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
/** Geometry derived from R80's public entrance branch endpoints. */
export function designR92EntranceFolio(nodes){
 if(!nodes||!Array.isArray(nodes.entrance)||!Array.isArray(nodes.westAccess)||
  !matches(nodes.entrance[0],nodes.westAccess[0])||
  !matches(nodes.entrance[1],nodes.eastAscent[0].map((x,i)=>i===2?-1.11:x))||
  !matches(nodes.westAccess[1],[-.53,.05,-1.11]))
  fail('R80_REAL_FRONT_DOOR_BRANCH_REQUIRED');
 const faces=[];
 const groundZ=nodes.entrance[0][2], left=nodes.westAccess[1],
  right=nodes.entrance[1];
 if(groundZ>=-.94||left[0]>=0||right[0]<=0)
  fail('R92_FOLIO_WOULD_INTRUDE_INTO_ATRIUM');
 // Two distinct folded, independent pages, a recognizable library portal:
 // lower edges attach at source R80's left/right public route junction.
 for(const side of ['left','right']){
  const sign=side==='left'?-1:1,anchor=side==='left'?left:right;
  const stations=[
   V([anchor[0],anchor[1],groundZ]),
   V([sign*.39,.18,groundZ+.018]),
   V([sign*.15,side==='left'?.29:.265,groundZ+.07])
  ];
  for(let i=0;i<2;i++){
   const a=stations[i],b=stations[i+1];
   const a1=V([a[0],a[1],a[2]-.020]),
    a2=V([a[0],a[1],a[2]+.020]),
    b1=V([b[0],b[1],b[2]-.027]),
    b2=V([b[0],b[1],b[2]+.027]);
   quad(faces,a1,a2,b2,b1,
    side+'_R92_FOLDED_ENTRANCE_READING_FOLIO_NOT_CERTIFIED');
  }
  const start=stations[0],end=stations.at(-1);
  const midPoint=stations[1];
  tri(faces,start,midPoint,V([midPoint[0],midPoint[1]+.035,midPoint[2]+.045]),
   side+'_R92_FOYER_AERIAL_BUTTRESS_NOT_LOAD_CERTIFIED');
  tri(faces,midPoint,end,V([end[0],end[1]+.016,end[2]-.040]),
   side+'_R92_FOYER_FOLD_FIN_NOT_LOAD_CERTIFIED');
 }
 if(faces.some(f=>!Number.isFinite(area(f))||area(f)<1e-8))
  fail('ENTRANCE_FOLIO_FACE_DEGENERATE');
 return {faces,leftSourceBranch:left,rightSourceBranch:right,
  originalSharedPublicEntrance:nodes.entrance[0],
  dimensionlessDesignOnly:true,
  verifiedGalleryBodyClearance:false};
}
const sideKey=side=>side==='left'?'westAscent':'eastAscent';
/** Document the exact sampled segment for every gallery, not a name-only edge. */
export function auditR92CirculationGraph(nodes){
 const base=auditR80ResearchRoutes(nodes),r88=buildR88GalleryStudy(nodes),
  r90=buildR90SurfaceSeams(nodes),r91=buildR91TurnoutStudy(nodes);
 if(base.conceptRoutes!==4||r88.tiers.length!==7||
  r90.tiers.length!==7||!r91.rightTier2Alternative.chosenTaper)
  fail('ORIGINAL_CONTINUOUS_BRANCHES_REQUIRED');
 const floors=[],branches=[
  {id:'PUBLIC_MAIN_ENTRANCE',from:nodes.entrance[0],to:nodes.entrance.at(-1),
   source:'R80 entrance',researchTraversable:true},
  {id:'PUBLIC_LEFT_ENTRY',from:nodes.westAccess[0],to:nodes.westAccess.at(-1),
   source:'R80 westAccess',researchTraversable:true}
 ];
 const record=[];
 for(const t of r88.tiers){
  const c=t.candidate;
  const r90Tier=r90.tiers.find(p=>p.side===t.side&&p.tier===t.tier);
  const corrected=t.side==='right'&&t.tier===2;
  const found=corrected?
    r91.rightTier2Alternative.status==='SOURCE_PAD_CONTAINED_TAPERED_ALTERNATIVE_ONLY':
    Boolean(r90Tier.entryTaperAdded);
  if(!c||!r90Tier.sourceDeckEdgeRegistered)
   fail('ORIGINAL_R80_OR_R88_RESEARCH_CONNECTOR_MISSING');
  const segment=nodes[sideKey(t.side)][c.segmentIndex],
   next=nodes[sideKey(t.side)][c.segmentIndex+1];
  const sampled=mid(segment,next,c.sampleIndex/16);
  if(!matches(sampled,c.routeAnchor))
   fail('R88_ANCHOR_NOT_ON_SOURCE_R80_SEGMENT');
  record.push({id:t.side+'_'+t.tier,
   side:t.side,tier:t.tier,routeBranch:sideKey(t.side),
   r80SegmentIndex:c.segmentIndex,segmentFraction:c.sampleIndex/16,
   r80WaypointSource:[segment,next],r88GalleryFrom:c.routeAnchor,
   r84ReadingRoomAt:c.padCenter,
   terminalResearchPatch:corrected?'R91_TAPERED_REPLACEMENT':'R90_PAD_THRESHOLD',
   local3DFloorSourceRegistered:true,
   originalLandingCrossSectionContained:corrected?
    r91.rightTier2Alternative.revisedTerminalBarycentrics.every(x=>Math.min(...x)>.07):
    r90Tier.terminalPadContained,
   limitedGeometricRouteCompleted:found,
   physicalStructuralOrWalkingApproval:false});
 }
 if(record.filter(x=>x.limitedGeometricRouteCompleted).length!==7)
  fail('SOME_SOURCE_READING_AREA_HAS_NO_RESEARCH_FLOOR_INTERFACE');
 // The terminal R80 eastAscent vertex is the R80 dome floor center;
 // still no independently validated vertical headroom or human access.
 const lounge=nodes.eastAscent.at(-1);
 if(!matches(lounge,[.55,.80,.35])||!matches(nodes.eastAscent[0],
  nodes.entrance.at(-1))||!matches(nodes.westAscent[0],nodes.westAccess.at(-1)))
  fail('PUBLIC_ENTRANCE_TO_LOUNGE_GRAPH_NOT_JOINED');
 const outputs={
  researchGraphRoomsReached:record.length,
  researchGraphLoungeReached:true,
  physicalCertifiedRoomsReached:0,
  actualBodyWidthOrHeadroomProved:false,
  sourceSegmentFractionsVerified:record.length,
  branchSegments:nodes.entrance.length+nodes.westAccess.length+
   nodes.westAscent.length+nodes.eastAscent.length-4,
  largestResearchSlopeR80:R(base.maximumPlanSlope),
  r91ReplacesOneInvalidRightTier2Tip:true,
  remainingEntranceToInteriorPortalClearanceUnproven:true,
  trueStepAndLandingGradientSafetyUnproven:true
 };
 return {levels:record,branches,roofLoungePosition:lounge,summary:outputs};
}
export function buildR92WholeLibraryAtlas(nodes){
 const r91=buildR91TurnoutStudy(nodes),graph=auditR92CirculationGraph(nodes),
  doorway=designR92EntranceFolio(nodes);
 const faces=[...r91.faces,...doorway.faces];
 return {faces,sourceR91ActiveTriangles:r91.faces.length,
  newArchitecturalEntranceFaces:doorway.faces.length,
  activeWholeLibraryTriangles:faces.length,
  sourceR91PreservedExactPrefix:true,
  atriumVoidStillPreservedInEntranceFolio:true,
  graph,architecturalDesignNotIndependentlyApproved:true};
}
export function prepareR92WholeLibraryReview(args={}){
 const {r91Evidence,...old}=args;
 const recomputed=prepareR91TurnoutReview(old);
 if(!r91Evidence||r91Evidence.schema!==R91_SCHEMA||
  JSON.stringify(r91Evidence)!==JSON.stringify(recomputed))
  fail('R91_COMPLETE_EVIDENCE_MISMATCH');
 if(typeof args.raw!=='string'||sha(args.raw)!==args.expectedRawSha256)
  fail('HISTORIC_RAW_SOURCE_SHA_MISMATCH');
 const {faces,...r}=buildR92WholeLibraryAtlas(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:recomputed.oldB143Status,
  r91FullEvidenceAuthenticated:true,...r,
  independentArchitecturalArtReview:'NOT_REVIEWED',
  modelCalls:0,worldReads:0,worldWrites:0,safety:safety()};
}
function obj(faces){
 let i=1,k=null;
 const out=['# R92 whole library. R91 active mesh exact prefix + public front folio.',
 '# Research branch graph not architectural building code or safe walking.'];
 for(const f of faces){
  if(f.kind!==k){k=f.kind;out.push('g '+k.replace(/[^a-zA-Z0-9_]/g,'_'))}
  for(const p of [f.a,f.b,f.c])out.push('v '+p.join(' '));
  out.push('f '+i+' '+(i+1)+' '+(i+2));i+=3;
 }
 return out.join('\n')+'\n';
}
function svg(faces,az,el,title){
 const A=az*Math.PI/180,E=el*Math.PI/180;
 const project=p=>{
  const d=Math.sin(A)*p[0]+Math.cos(A)*p[2];
  return [Math.cos(A)*p[0]-Math.sin(A)*p[2],
   Math.cos(E)*p[1]-Math.sin(E)*d,
   Math.sin(E)*p[1]+Math.cos(E)*d];
 };
 const shown=faces.filter((f,i)=>f.kind.includes('R92')||
  f.kind.includes('R91')||(i%7===0&&!f.kind.includes('R90')))
  .map(f=>({kind:f.kind,p:[f.a,f.b,f.c].map(project)}));
 const xs=shown.flatMap(f=>f.p.map(q=>q[0])),
  ys=shown.flatMap(f=>f.p.map(q=>q[1]));
 const minX=Math.min(...xs),maxX=Math.max(...xs),
  minY=Math.min(...ys),maxY=Math.max(...ys);
 const sc=Math.min(690/(maxX-minX),490/(maxY-minY));
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 shown.sort((a,b)=>a.p.reduce((s,q)=>s+q[2],0)-
  b.p.reduce((s,q)=>s+q[2],0));
 const pick=k=>k.includes('R92')?'#edbe6e':
  k.includes('R91')?'#f1a665':
  k.includes('right')?'#8ca5b5':
  k.includes('left')?'#6990a4':'#b5bac3';
 const polygons=shown.map(f=>'<polygon points="'+f.p.map(p=>
  (400+(p[0]-cx)*sc).toFixed(1)+','+(270-(p[1]-cy)*sc).toFixed(1)).join(' ')+
  '" fill="'+pick(f.kind)+'" opacity="'+(f.kind.includes('glass')?.35:.87)+
  '" stroke="#2e4250" stroke-width=".35"/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560">'+
  '<rect width="800" height="560" fill="#eef3f5"/>'+polygons+
  '<text x="25" y="34" font-family="system-ui" font-size="19" fill="#273a50">'+
  esc(title)+'</text></svg>';
}
export function writeR92WholeLibraryReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_SAFE_REVIEW_FOLDER_REQUIRED');
 const j=path.join(destination,'R92_LIBRARY_PUBLIC_CIRCULATION_ATLAS.json'),
  o=path.join(destination,'R92_FOLIO_ENTRANCE_WHOLE_ARCHITECTURE.obj'),
  h=path.join(destination,'R92_ENTRANCE_SEVEN_ROOMS_LOUNGE_REVIEW.html');
 if([j,o,h].some(p=>fs.existsSync(p)))fail('NO_OVERWRITE');
 const report=prepareR92WholeLibraryReview(args),
  study=buildR92WholeLibraryAtlas(args.r80Evidence.conceptualRouteNodes);
 const visual=[['FRONT',0,12],['OBLIQUE',35,25],['SIDE',90,15],
  ['AERIAL',35,70]].map(([t,a,e])=>'<figure><figcaption>'+t+'</figcaption>'+
  svg(study.faces,a,e,t)+'</figure>').join('');
 const rows=report.graph.levels.map(p=>'<tr><td>'+esc(p.side)+'</td><td>'+
  p.tier+'</td><td>'+esc(p.terminalResearchPatch)+'</td><td>'+
  (p.originalLandingCrossSectionContained?'元パッド内':'未成立')+
  '</td><td>'+esc(p.r80SegmentIndex+' + '+p.segmentFraction.toFixed(4))+
  '</td></tr>').join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
 '<title>R92 Whole Library Architecture Atlas</title>'+
 '<style>body{font:15px/1.75 system-ui;max-width:1370px;margin:28px auto;padding:0 18px;color:#263a48}figure{margin:0}.views{display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:22px}svg{width:100%;border:1px solid #adbcca}td,th{padding:7px;border:1px solid #b9c8d3}table{border-collapse:collapse;width:100%}</style>'+
 '<h1>R92 公共図書館：入口・左右7層・展望ラウンジの全館立体構成</h1>'+
 '<p>入口の左右分岐は二枚の非対称な折り本状の庇で建築的に一体化。元のR91の全三角形を保持し、新規'+
 report.newArchitecturalEntranceFaces+'面を追加。4視点は実際の三角形座標から射影して作成。</p>'+
 '<p>元のR80公共動線グラフから、左3層・右4層へのローカル通路は7/7件を研究面として照合。'+
 '右tier 2はR91の幅を絞った接続版。他6層はR90の元面内テーパー。最上階ラウンジへはR80の概念経路で到達。</p>'+
 '<p><strong>重要：</strong>グラフの連結は、人体の通過、建物内の動線成立、ヘッドルーム、連続支持床、階段、'+
 '手すり、実世界の長さ、Minecraftでの試走または美術合格を意味しません。建築の独立品質判定はNOT_REVIEWED。</p>'+
 '<div class="views">'+visual+'</div>'+
 '<table><tr><th>翼</th><th>層</th><th>研究用接合</th><th>元着地面</th><th>R80接続区間</th></tr>'+rows+'</table>'+
 '<p><a href="R92_FOLIO_ENTRANCE_WHOLE_ARCHITECTURE.obj">全館3D OBJ</a> ／'+
 '<a href="R91_TRUE_PAD_TAPERED_RIGHT_TIER2_ARCHITECTURAL_REVIEW.html">R91終端修正研究</a> ／'+
 '<a href="R90_GALLERY_THRESHOLD_VALIDITY_REVIEW.html">旧面不成立証拠</a></p>'+
 '<p>NOT_PREPARED / BLOCKED×9 / Qwen calls 0 / world reads &amp; writes 0 / construction none.</p></html>';
 fs.writeFileSync(j,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(o,obj(study.faces),{flag:'wx'});
 fs.writeFileSync(h,html,{flag:'wx'});
 return {relativeFile:path.basename(h),
  wholeBuildingTriangles:report.activeWholeLibraryTriangles,
  researchRooms:report.graph.summary.researchGraphRoomsReached,
  modelCalls:0,worldWrites:0};
}
