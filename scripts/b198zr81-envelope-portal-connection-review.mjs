/**
 * R81 — identify two real barrier penetrations in the R80 concept and
 * create an explicitly non-buildable research variant with large portal
 * openings and hull-sampled bracket anchor points.
 *
 * Triangles are art-study surfaces, not physical solid occupancy.
 * Segment/triangle crossing checks are exact for non-coplanar intersections,
 * but incomplete for full collision, accessibility and structural validation.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {sampleR79WingOuterAtElevation} from './b198zr79-parametric-library-massing.mjs';
import {buildR80CompositeStudy,getR80ConceptBracketSpecs,
 prepareR80ResearchEvidence,SCHEMA as R80_SCHEMA}
 from './b198zr80-supported-route-concept-study.mjs';
export const SCHEMA='minecraftaibuilder-b198zr81-envelope-portal-connection-review-v1';
const fail=m=>{throw Error('B198ZR81_'+m)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const subtract=(a,b)=>a.map((n,i)=>n-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
 a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const vec=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
const len=a=>Math.hypot(...a);
const ROUND=p=>p.map(x=>+x.toFixed(7));
/** Moller-Trumbore segment/triangle, double-sided, not coplanar. */
export function intersectR81SegmentTriangle(from,to,f){
 const d=subtract(to,from),e1=subtract(f.b,f.a),e2=subtract(f.c,f.a);
 const p=cross(d,e2),det=dot(e1,p);
 if(Math.abs(det)<1e-11)return null;
 const inv=1/det,t=subtract(from,f.a),u=dot(t,p)*inv;
 if(u<-1e-8||u>1+1e-8)return null;
 const q=cross(t,e1),v=dot(d,q)*inv;
 if(v<-1e-8||u+v>1+1e-8)return null;
 const hit=dot(e2,q)*inv;
 if(hit<1e-7||hit>1-1e-7)return null;
 return {t:hit,point:ROUND(vec(from,to,hit))};
}
const bbox=f=>{
 const p=[f.a,f.b,f.c];
 return {min:p[0].map((_,i)=>Math.min(...p.map(x=>x[i]))),
  max:p[0].map((_,i)=>Math.max(...p.map(x=>x[i])))};
};
function isFrontEntranceRelief(f){
 if(!['left_end','right_end'].includes(f.kind))return false;
 const b=bbox(f);
 return b.max[2]<-.939&&b.min[1]<.23&&b.max[1]>.018;
}
function isGlazedEntranceRelief(f){
 if(f.kind!=='sky_lounge_glass')return false;
 const b=bbox(f);
 return b.min[2]<.31&&b.max[2]<.36&&
  b.min[0]<.82&&b.max[0]>.54&&b.min[1]<.92&&b.max[1]>.745;
}
function tube(dst,a,b,width,kind){
 const d=subtract(b,a),L=len(d);
 if(L<.04)fail('BRACKET_TOO_SHORT');
 const ref=Math.abs(d[1]/L)<.95?[0,1,0]:[1,0,0];
 const v=cross(d,ref),U=len(v),u=v.map(n=>n*width/(2*U));
 const w=cross(d,u).map(n=>n/L);
 const ring=p=>[[1,1],[-1,1],[-1,-1],[1,-1]].map(([q,r])=>
  ROUND(p.map((n,i)=>n+q*u[i]+r*w[i])));
 const A=ring(a),B=ring(b),tri=(p,q,r)=>dst.push({a:p,b:q,c:r,kind});
 for(let i=0;i<4;i++){
  const j=(i+1)%4;
  tri(A[i],A[j],B[j]);tri(A[i],B[j],B[i]);
 }
 tri(A[0],A[1],A[2]);tri(A[0],A[2],A[3]);
 tri(B[2],B[1],B[0]);tri(B[3],B[2],B[0]);
}
function targetedSegments(nodes){
 return [
  {id:'EAST_ENTRY_WALL',from:nodes.entrance[1],to:nodes.entrance[2],
   kind:'right_end'},
  {id:'WEST_ENTRY_WALL',from:nodes.westAccess[1],to:nodes.westAccess[2],
   kind:'left_end'},
  {id:'SKY_LOUNGE_FRONT_GLAZING',
   from:nodes.eastAscent[7],to:nodes.eastAscent[8],
   kind:'sky_lounge_glass'}
 ];
}
function hits(faces,seg){
 return faces.flatMap((f,i)=>{
  if(f.kind!==seg.kind)return [];
  const p=intersectR81SegmentTriangle(seg.from,seg.to,f);
  return p?[{triangleIndex:i,kind:f.kind,at:p.point}]:[];
 });
}
export function buildR81EnvelopeVariant(nodes){
 if(!nodes||!nodes.entrance||!nodes.eastAscent||
  !nodes.westAccess||!nodes.westAscent)
  fail('R80_FULL_ROUTE_NODES_REQUIRED');
 const base=buildR80CompositeStudy();
 const original=base.faces;
 const removed={frontEntranceTriangles:0,glazedPortalTriangles:0,
  replacedBracketTriangles:0};
 const retained=[];
 for(const f of original){
  if(f.kind==='shell_side_bracket'){removed.replacedBracketTriangles++;continue;}
  if(isFrontEntranceRelief(f)){removed.frontEntranceTriangles++;continue;}
  if(isGlazedEntranceRelief(f)){removed.glazedPortalTriangles++;continue;}
  retained.push(f);
 }
 const bracketSpecs=getR80ConceptBracketSpecs();
 const newBrackets=[],bracketConnections=[];
 for(const spec of bracketSpecs){
  const side=spec.side<0?'left':'right';
  const sideRoute=nodes[spec.side<0?'westAscent':'eastAscent'];
  const levelPoints=sideRoute.filter(p=>Math.abs(p[1]-spec.h)<1e-6);
  if(levelPoints.length===0)fail('BRACKET_LEVEL_MISSING_IN_ROUTE');
  const selected=levelPoints.toSorted((a,b)=>
   Math.hypot(a[0]-spec.target[0],a[2]-spec.z)-
   Math.hypot(b[0]-spec.target[0],b[2]-spec.z))[0];
  const surfaceY=Math.max(.05,spec.h-.095);
  const start=ROUND(sampleR79WingOuterAtElevation(side,surfaceY,spec.z));
  const end=ROUND([selected[0],selected[1]-.012,selected[2]]);
  tube(newBrackets,start,end,.018,'research_hull_snapped_bracket');
  bracketConnections.push({
   side,level:spec.h,
   formerStart:spec.from,proposedHullAnchor:start,
   linkedDeckCenter:selected,tipBelowDeck:end,
   formerHullDisplacement:ROUND(subtract(spec.from,start)),
   formerHullAnchorGap:len(subtract(spec.from,start)),
   newIdealizedSurfaceSampleGap:0,
   attachmentAndLoadUncertified:true});
 }
 const improved=[...retained,...newBrackets];
 const sites=targetedSegments(nodes).map(s=>{
  const before=hits(original,s),after=hits(improved,s);
  return {id:s.id,kind:s.kind,from:s.from,to:s.to,
   beforeNonCoplanarBarrierIntersections:before.length,
   afterNonCoplanarBarrierIntersections:after.length,
   beforeHitWitnesses:before.slice(0,3),
   afterHitWitnesses:after.slice(0,3),
   portalOpenInSpecificCenterlineTest:
    before.length>0&&after.length===0,
   wholeBodyOrDoorClearanceNotProven:true};
 });
 const allPassed=sites.every(s=>s.portalOpenInSpecificCenterlineTest);
 const roofSamples=[];
 for(const [routeName,route] of Object.entries(nodes))
  for(const p of route){
   if(Math.abs(p[2])>.94||Math.abs(p[0])<.4)continue;
   const side=p[0]<0?'left':'right';
   const z=p[2],crown=side==='left'?.83-.065*(z+.28)**2:
    .98-.095*(z-.17)**2;
   roofSamples.push({routeName,point:p,
    verticalCrownGap:crown-p[1]});
  }
 const smallestRoofGap=roofSamples.length?
  Math.min(...roofSamples.map(x=>x.verticalCrownGap)):null;
 const maxUncorrectedStartGap=Math.max(...bracketConnections.map(x=>
  x.formerHullAnchorGap));
 const result={faces:improved,removed,bracketConnections,
  beforeTriangleCount:original.length,afterTriangleCount:improved.length,
  openingTests:sites,allThreeCrossingWardsRemoved:allPassed,
  minWaypointToCrownVerticalGap:smallestRoofGap,
  sampledCrownGaps:roofSamples,
  previousLargestBracketHullGap:maxUncorrectedStartGap,
  runIsDimensionlessResearch:true,full3DCollisionNotTested:true,
  humanHeadroomAndHandrailDesignUnspecified:true,
  newOpeningsNotCertifiedDoorways:true,
  shellBracketLoadAndJointUncertified:true};
 return result;
}
const project=(p,az,el)=>{
 const A=az*Math.PI/180,E=el*Math.PI/180;
 return [Math.cos(A)*p[0]-Math.sin(A)*p[2],
  Math.cos(E)*p[1]-Math.sin(E)*
   (Math.sin(A)*p[0]+Math.cos(A)*p[2]),
  Math.cos(E)*(Math.sin(A)*p[0]+Math.cos(A)*p[2])+Math.sin(E)*p[1]];
};
function svg(faces,az,el,label){
 const data=faces.map(f=>{
  const p=[f.a,f.b,f.c].map(v=>project(v,az,el));
  return {p,k:f.kind,z:p.reduce((sum,v)=>sum+v[2],0)/3};
 }).sort((a,b)=>a.z-b.z);
 const xy=data.flatMap(f=>f.p),xs=xy.map(p=>p[0]),ys=xy.map(p=>p[1]);
 const mx=(Math.min(...xs)+Math.max(...xs))/2,
  my=(Math.min(...ys)+Math.max(...ys))/2;
 const scale=Math.min(750/(Math.max(...xs)-Math.min(...xs)),
  525/(Math.max(...ys)-Math.min(...ys)));
 const px=p=>[(420+(p[0]-mx)*scale).toFixed(1),
  (300-(p[1]-my)*scale).toFixed(1)];
 const shapes=data.map(f=>{
  let color=f.k==='research_hull_snapped_bracket'?'#d49a59':
   f.k==='sky_lounge_glass'?'#77cbd7':
   f.k.includes('deck')?'#f0b05e':
   f.k.includes('landing')?'#f7c688':
   f.k.startsWith('left_')?'#789bb1':'#8999ba';
  return '<polygon points="'+f.p.map(p=>px(p).join(',')).join(' ')+
   '" fill="'+color+'" fill-opacity="'+(f.k==='sky_lounge_glass'?.44:.91)+
   '" stroke="#224054" stroke-width=".3" stroke-opacity=".14"/>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+
  esc(label)+'" viewBox="0 0 840 620"><rect width="840" height="620" fill="#edf5f6"/>'+
  shapes+'<text x="25" y="32" fill="#243e53" font-size="20" font-weight="bold" font-family="system-ui">'+esc(label)+'</text></svg>';
}
function obj(faces){
 const lines=['# R81 experimental PORTALS + adjusted research brackets, NOT construction',
  '# Full mesh collision, actual door sizing, live Minecraft movement unverified',
  'o TidalLightLibrary_R81_PortalRelief_ArtStudy'];
 let n=1,group='';
 for(const f of faces){
  if(group!==f.kind){group=f.kind;lines.push('g '+group);}
  for(const p of [f.a,f.b,f.c])lines.push('v '+p.map(x=>x.toFixed(6)).join(' '));
  lines.push('f '+n+' '+(n+1)+' '+(n+2));n+=3;
 }
 return lines.join('\n')+'\n';
}
export function prepareR81ArchitectureReview({
 raw,expectedRawSha256,b143Status,expectedGeometrySha256=null,
 r61Evidence=null,r64Evidence=null,r66Evidence=null,r67Evidence=null,
 r68Evidence=null,r69Evidence=null,r70Evidence=null,r71Evidence=null,
 r72Evidence=null,r73Evidence=null,r74Evidence=null,
 r62Evidence,r76Evidence,r77Evidence,r78Evidence,r79Evidence,
 r80Evidence
}={}){
 if(typeof raw!=='string'||sha(raw)!==expectedRawSha256||
  Buffer.byteLength(raw)>120000)fail('FROZEN_RAW_SHA_REQUIRED');
 const verified=prepareR80ResearchEvidence({raw,expectedRawSha256,
  b143Status,expectedGeometrySha256,r61Evidence,r64Evidence,
  r66Evidence,r67Evidence,r68Evidence,r69Evidence,r70Evidence,
  r71Evidence,r72Evidence,r73Evidence,r74Evidence,r62Evidence,
  r76Evidence,r77Evidence,r78Evidence,r79Evidence});
 if(!r80Evidence||r80Evidence.schema!==R80_SCHEMA||
  JSON.stringify(r80Evidence)!==JSON.stringify(verified))
  fail('R80_RECOMPUTED_EVIDENCE_MISMATCH');
 const mod=buildR81EnvelopeVariant(verified.conceptualRouteNodes);
 return {schema:SCHEMA,
  status:mod.allThreeCrossingWardsRemoved?
   'THREE_CENTERLINE_PORTALS_OPEN_BUT_NOT_BUILDABLE':
   'HOLD_REMAINING_CENTERLINE_ENVELOPE_CROSSINGS',
  originalRawSha256:expectedRawSha256,oldB143Status:b143Status,
  r80RecomputedAndAuthenticated:true,
  artStudyFacetCounts:{previous:mod.beforeTriangleCount,
   modified:mod.afterTriangleCount,
   cutFrontTriangles:mod.removed.frontEntranceTriangles,
   cutGlazingTriangles:mod.removed.glazedPortalTriangles,
   replacedLegacyBracketTriangles:mod.removed.replacedBracketTriangles},
  selectedPortalCenterlineTests:mod.openingTests,
  hullMatchedBracketConcepts:mod.bracketConnections,
  previousMaxHullStartGap:mod.previousLargestBracketHullGap,
  sourceExactHullSampleUsedForNewAnchor:true,
  waypointVerticalCrownSamples:mod.sampledCrownGaps,
  minCenterlineVerticalGapBelowCrown:mod.minWaypointToCrownVerticalGap,
  remainingUnknowns:[
   'Openings remove overlapping facade triangles in a limited art-study envelope; edge trims, doors, weather protection, room boundaries and actual headroom are NOT designed.',
   'Only the three chosen centerline segments were tested against selected surface types; complete swept-body/deck-to-terrace and triangle-triangle collisions were not checked.',
   'Hull-sampled bracket starts and deck-tip points do not prove a real load path, structural joint or stable platform.',
   'The research model still has no real block/metre scale, occupancy proof, playable stairs, or live world validation.',
   'Original AI source, B143 compliance and independent architectural beauty are unchanged and unverified.'
  ],
  firstSourceModelOutputUnmodified:true,
  genuineNewTriangleGeometryButNotArchitecturallyApproved:true,
  programRequirementsPassed:false,
  minecraftWalkingVerified:false,
  independentHumanQuality:'NOT_REVIEWED',
  actualQwenModelCalls:0,worldWrites:0,safety:safety()};
}
export function writeR81ArchitectureReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_ORDINARY_REVIEW_DIRECTORY_REQUIRED');
 const json=path.join(destination,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),
  objPath=path.join(destination,'R81_TIDAL_LIBRARY_PORTAL_RELIEF_STUDY.obj'),
  html=path.join(destination,'R81_ARCHITECTURE_PORTAL_AND_SUPPORT_REVIEW.html');
 if([json,objPath,html].some(p=>fs.existsSync(p)))
  fail('REFUSE_OVERWRITE');
 const r=prepareR81ArchitectureReview(args);
 const m=buildR81EnvelopeVariant(args.r80Evidence.conceptualRouteNodes);
 const views=[svg(m.faces,0,13,'FRONT'),svg(m.faces,38,26,'OBLIQUE'),
  svg(m.faces,90,16,'SIDE'),svg(m.faces,38,70,'AERIAL')];
 const gallery=views.map((v,i)=>'<figure><figcaption>'+
  ['正面','斜視','側面','俯瞰'][i]+'</figcaption>'+v+'</figure>').join('');
 const rows=r.selectedPortalCenterlineTests.map(x=>'<tr><td>'+esc(x.id)+
  '</td><td>'+x.beforeNonCoplanarBarrierIntersections+
  '</td><td>'+x.afterNonCoplanarBarrierIntersections+
  '</td></tr>').join('');
 const page='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R81 Portals and shell attachment research</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:1270px;margin:23px auto;padding:0 20px;color:#273f53}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:15px}figure{margin:0}svg{width:100%;border:1px solid #cbd7df}figcaption{font-weight:bold}table{border-collapse:collapse}td,th{border:1px solid #b7c9d5;padding:8px}.warn{background:#fff0d9;padding:12px}</style></head><body>'+
  '<h1>R81 閉じた入口とラウンジ外皮の研究用開口・支持接合</h1>'+
  '<p class="warn">これは三角形面の開口を設けた新しい非施工の3D比較案です。指定された3本の中心線が端面・ガラス面を貫通しなくなったことを検査します。幅・身体の通過・防水・戸・全三角形衝突・頭上高さ・荷重・Minecraft実機の安全性は証明されません。</p>'+
  '<table><tr><th>対象</th><th>R80の中心線交差</th><th>R81の中心線交差</th></tr>'+
  rows+'</table>'+
  '<p>古いブラケット根元の外殻表面との差の最大：'+
  r.previousMaxHullStartGap.toFixed(4)+
  '（正規化単位）。新案は元の曲面形状から根元をサンプリング。'+
  '<a href="R81_TIDAL_LIBRARY_PORTAL_RELIEF_STUDY.obj">改訂研究OBJ</a></p>'+
  '<div class="grid">'+gallery+'</div>'+
  '<p><a href="R80_LIBRARY_ACCESS_AND_STRUCTURE_VIEWS.html">R80元の3D動線</a> ／'+
  '<a href="R79_ARCHITECTURE_FOUR_VIEWS_AND_SECTIONS.html">R79元の建築外観</a></p>'+
  '<p>NOT_PREPARED、施工9ゲートBLOCKED、Qwen推論0、Minecraft操作0、独立した美術品質はNOT_REVIEWED</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(objPath,obj(m.faces),{flag:'wx'});
 fs.writeFileSync(html,page,{flag:'wx'});
 return {relativeFile:path.basename(html),status:r.status,
  triangles:m.faces.length,modelCalls:0,worldWrites:0};
}
