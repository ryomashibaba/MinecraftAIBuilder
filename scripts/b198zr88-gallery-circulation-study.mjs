/**
 * R88. Search alternate ON-SOURCE R80 ramp attachment points rather than
 * mistaking nearest-point steep gaps for a permanent architectural dead end.
 * Conditional gallery strips and shell-cantilever art ribs. NO approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR84MultilevelResearch} from './b198zr84-multilevel-bookstack-review.mjs';
import {buildR87InteriorStudy,prepareR87InteriorReview,SCHEMA as R87_SCHEMA}
 from './b198zr87-seven-room-architecture.mjs';
import {screenR86ResearchRibbon} from './b198zr86-finite-width-deck-study.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';
import {sampleR79WingOuterAtElevation} from './b198zr79-parametric-library-massing.mjs';

export const SCHEMA='minecraftaibuilder-b198zr88-ramp-to-seven-program-terraces-v1';
const fail=x=>{throw Error('B198ZR88_'+x)};
const SHA=x=>createHash('sha256').update(x).digest('hex');
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const R=x=>+x.toFixed(7), V=p=>p.map(R);
const lerp=(a,b,t)=>V(a.map((x,i)=>x+(b[i]-x)*t));
const run=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const diff=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=f=>Math.hypot(...cross(diff(f.b,f.a),diff(f.c,f.a)))/2;
const tri=(out,a,b,c,kind)=>out.push({a:V(a),b:V(b),c:V(c),kind});
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const FURNITURE=['_R87_BOOK_WALL','_R87_RISING_SAIL_FIN','_R87_PRISMATIC_BOOK_FIN','_R87_READING_TABLE'];
const FURNITURE_H=[0,.025,.065];
const planOk=(a,b,side)=>{
 const L=run(a,b),grade=Math.abs(a[1]-b[1])/(L||1e-8);
 return L>=.065&&L<=.42&&grade<=.23&&Math.abs(a[2])<=.94&&
  (side==='left'?a[0]<-.40:a[0]>.40);
};
const intersectFurniture=(points,edges,faces)=>{
 let hits=0;
 for(let segment=0;segment<2;segment++){
  for(const part of ['center','left','right']){
   const a=part==='center'?points[segment]:edges[segment][part];
   const b=part==='center'?points[segment+1]:edges[segment+1][part];
   for(const f of faces){
    if(!FURNITURE.some(k=>f.kind.includes(k)))continue;
    // Center plus BOTH finite-width outside edges, multiple height probes.
    // Discrete mesh rays, not a certified swept-person volume.
    for(const h of FURNITURE_H){
     if(intersectR81SegmentTriangle([a[0],a[1]+h,a[2]],
      [b[0],b[1]+h,b[2]],f))hits++;
    }
   }
  }
 }
 return hits;
};
const sourceRoute=(nodes,side)=>nodes[side==='left'?'westAscent':'eastAscent'];
/** Probe 15 intervals per original R80 segment; find best source-derived path. */
export function proposeR88GalleryForTier(t,route,sourceFaces,r87Faces){
 if(!t||!['left','right'].includes(t.side)||
  !Array.isArray(t.padCenter)||!Array.isArray(route)||route.length<2||
  !Array.isArray(sourceFaces)||!Array.isArray(r87Faces))
  fail('VALID_SOURCE_ROUTE_AND_PAD_REQUIRED');
 const counted={slopeOrSpanRejected:0,originalEnvelopeRejected:0,
  furnishedRoomRejected:0},possibilities=[];
 for(let segmentIndex=0;segmentIndex<route.length-1;segmentIndex++){
  for(let sampleIndex=1;sampleIndex<16;sampleIndex++){
   const a=lerp(route[segmentIndex],route[segmentIndex+1],sampleIndex/16),
    b=t.padCenter;
   if(!planOk(a,b,t.side)){counted.slopeOrSpanRejected++;continue}
   const center=lerp(a,b,.5);
   const study=screenR86ResearchRibbon([a,center,b],t.side,sourceFaces);
   if(!study.accepted){counted.originalEnvelopeRejected++;continue}
   const furnitureHits=intersectFurniture([a,center,b],study.edges,r87Faces);
   if(furnitureHits){counted.furnishedRoomRejected++;continue}
   possibilities.push({segmentIndex,sampleIndex,
    anchor:a,target:b,
    run:R(run(a,b)),rise:R(Math.abs(a[1]-b[1])),
    grade:R(Math.abs(a[1]-b[1])/run(a,b)),
    score:run(a,b)+.25*Math.abs(a[1]-b[1]),
    surface:study.triangles,joinEdges:study.edges[1]});
  }
 }
 possibilities.sort((a,b)=>a.score-b.score||
  a.segmentIndex-b.segmentIndex||a.sampleIndex-b.sampleIndex);
 const chosen=possibilities[0]??null;
 const side=t.side,tier=t.tier,base={
  side,tier,sourceR84TriangleIndex:t.triangleIndex,
  sourceR84PadCenter:t.padCenter,
  initialCenterlineLinkClaim:false,
  testedSampledSourceRouteAnchors:counted.slopeOrSpanRejected+
   counted.originalEnvelopeRejected+counted.furnishedRoomRejected+possibilities.length,
  candidateCount:possibilities.length,counts:counted,
  actualWalkingOrStructuralCertification:false};
 if(!chosen)return { ...base,
  status:'UNRESOLVED_NO_SAFE_RESEARCH_GALLERY_VARIANT',
  reason:'NONE_MEETS_THE_DISCRETE_LOCAL_WIDTH_AND_FURNITURE_SCREENS',
  candidate:null,faces:[]};
 // The R87 furniture is not carved, modified or relocated. This is a genuine
 // new research surface between a sampled R80 deck and the original R84 pad.
 const faces=[...chosen.surface];
 const m=lerp(chosen.anchor,chosen.target,.5);
 const z=m[2],level=Math.max(.05,m[1]-.08);
 const originalOuterX=sampleR79WingOuterAtElevation(side,level,z);
 const hullAnchor=V(originalOuterX);
 // Tip touches the ACTUAL midsection edge vertices of this research deck.
 const footA=chosen.joinEdges.left,footB=chosen.joinEdges.right;
 // A tapered diagonal rib is connected to a SURFACE SAMPLE, not a
 // load-bearing structure. Crossing obstructions not independently cleared.
 tri(faces,hullAnchor,footA,footB,
  side+'_R88_SOURCE_SHELL_SAMPLED_SUPPORT_RIB_NOT_CERTIFIED');
 if(faces.some(f=>!Number.isFinite(area(f))||area(f)<1e-10))
  fail('DEGENERATE_NEW_RESEARCH_FLOOR_OR_SUPPORT');
 return {...base,status:'SOURCE_ATTACHED_WIDTH_RESEARCH_GALLERY_ONLY',
  candidate:{segmentIndex:chosen.segmentIndex,sampleIndex:chosen.sampleIndex,
   routeAnchor:chosen.anchor,padCenter:chosen.target,
   normalizedPlanRun:chosen.run,normalizedRise:chosen.rise,
   normalizedGradient:chosen.grade,
   shellSupportSample:hullAnchor,
   originalR80SegmentEndpoints:[route[chosen.segmentIndex],
    route[chosen.segmentIndex+1]],
   noRealFootFallOrLoadTransferProof:true},
  faces};
}
export function buildR88GalleryStudy(nodes){
 if(!nodes||!nodes.westAscent||!nodes.eastAscent)
  fail('SOURCE_R80_ROUTES_REQUIRED');
 const historical=buildR87InteriorStudy(nodes),
  r84=buildR84MultilevelResearch(nodes),newFaces=[],tiers=[];
 for(const t of r84.tiers){
  const proposal=proposeR88GalleryForTier(t,sourceRoute(nodes,t.side),
   r84.faces,historical.faces.slice(historical.upstreamFaces));
  const {faces,...facts}=proposal;
  tiers.push({...facts,addedResearchTriangles:faces.length});
  newFaces.push(...faces);
 }
 if(tiers.length!==7||tiers.filter(x=>x.side==='left').length!==3||
  tiers.filter(x=>x.side==='right').length!==4)
  fail('ALL_SEVEN_SOURCE_LAYERS_REQUIRED');
 const accepted=tiers.filter(t=>t.candidate!==null).length,
  unresolved=tiers.length-accepted;
 const faces=[...historical.faces,...newFaces];
 return {faces,tiers,
  sourceR87Triangles:historical.faces.length,
  newResearchGalleryTriangles:newFaces.length,
  proposedGalleryTierCount:accepted,
  unresolvedGalleryTierCount:unresolved,
  sourceR87FacesKeptByteEquivalent:true,
  newR88SurfaceNotConstructionCertified:true,
  fullEntryToReadingLoungeMotionProved:false,
  shapeStudyIsNotActualLLMGeneration:true,
  sourceAtriumUnmodified:true,
  certifiedPublicRoutes:0};
}
export function prepareR88GalleryReview(args={}){
 const {r87Evidence,...older}=args;
 const checked=prepareR87InteriorReview(older);
 if(!r87Evidence||r87Evidence.schema!==R87_SCHEMA||
  JSON.stringify(r87Evidence)!==JSON.stringify(checked))
  fail('R87_COMPLETE_EVIDENCE_RECOMPUTE_MISMATCH');
 if(typeof args.raw!=='string'||SHA(args.raw)!==args.expectedRawSha256)
  fail('HISTORIC_RAW_SOURCE_SHA_MISMATCH');
 const {faces,...study}=buildR88GalleryStudy(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:checked.oldB143Status,
  r87CompleteEvidenceVerified:true,...study,
  humanArchitectureReview:'NOT_REVIEWED',
  constructionPermitted:false,minecraftPlayerWalkingProven:false,
  modelCalls:0,worldWrites:0,safety:safety()};
}
function obj(faces){
 const out=['# R88 art study. SOURCE R87 faces preserved; galleries + ribs appended.',
  '# Local width probe != body traversal, staircase, load, or model success'];
 let k=null,i=1;
 for(const f of faces){
  if(k!==f.kind){k=f.kind;out.push('g '+k.replace(/[^a-zA-Z0-9_]/g,'_'));}
  for(const p of [f.a,f.b,f.c])out.push('v '+p.join(' '));
  out.push('f '+i+' '+(i+1)+' '+(i+2));i+=3;
 }
 return out.join('\n')+'\n';
}
const project=(p,a,e)=>{
 const A=a*Math.PI/180,E=e*Math.PI/180,
 d=Math.sin(A)*p[0]+Math.cos(A)*p[2];
 return [Math.cos(A)*p[0]-Math.sin(A)*p[2],
  Math.cos(E)*p[1]-Math.sin(E)*d];
};
function routeDiagram(tiers,az,el,label){
 const polylines=tiers.map(t=>{
  const c=t.candidate;
  if(!c)return '';
  const projected=[c.routeAnchor,c.padCenter].map(p=>project(p,az,el));
  const pt=p=>(430+p[0]*280).toFixed(1)+','+(290-p[1]*280).toFixed(1);
  return '<polyline points="'+projected.map(pt).join(' ')+
   '" stroke="'+(t.side==='left'?'#e8ab49':'#438bb3')+
   '" stroke-width="6" stroke-linecap="round" fill="none"/>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 600">'+
  '<rect width="860" height="600" fill="#eef4f6"/>'+polylines+
  '<text x="20" y="38" font-size="18" font-family="system-ui" fill="#34475b">'+
  esc(label)+'：既存3Dモデルに追加した研究通路の投影（建築性能未証明）</text></svg>';
}
export function writeR88GalleryReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('SAFE_EXISTING_REVIEW_DIRECTORY_REQUIRED');
 const j=path.join(destination,'R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json'),
  h=path.join(destination,'R88_ARCHITECTURAL_CIRCULATION_REVIEW.html'),
  o=path.join(destination,'R88_GALLERY_AND_SHELL_SUPPORT_STUDY.obj');
 if([j,h,o].some(p=>fs.existsSync(p)))fail('NO_OVERWRITES');
 const evidence=prepareR88GalleryReview(args);
 const built=buildR88GalleryStudy(args.r80Evidence.conceptualRouteNodes);
 const table=evidence.tiers.map(t=>'<tr><td>'+esc(t.side)+'</td><td>'+t.tier+
  '</td><td>'+esc(t.status)+'</td><td>'+t.addedResearchTriangles+
  '</td><td>'+esc(t.candidate?.normalizedGradient??'—')+
  '</td><td>'+esc(JSON.stringify(t.counts))+'</td></tr>').join('');
 const visual=[['PLAN',0,90],['SIDE',90,20]].map(([s,a,e])=>
  routeDiagram(evidence.tiers,a,e,s)).join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R88 Source-derived 7 level circulation architecture</title>'+
  '<style>body{font:15px/1.7 system-ui;margin:25px auto;padding:0 22px;max-width:1200px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bdc8d1;padding:7px}svg{max-width:95%}</style>'+
  '<h1>R88 7層への実際のソースから再探索した翼内ギャラリー</h1>'+
  '<p>先行R84の「一番近い」接続点をそのまま使わず、既存R80段差路上の候補位置を再探索。'+
  '中央吹抜けと元の家具を避ける条件に合う場合だけ、幅を持つ研究床・外殻上の試験ブラケットを3D化。</p>'+
  '<p>研究用ギャラリーが追加された層数：'+evidence.proposedGalleryTierCount+
  '／7。未接続：'+evidence.unresolvedGalleryTierCount+
  '層。新規三角形：'+evidence.newResearchGalleryTriangles+
  '。寸法はすべて研究用の正規化値。</p>'+
  visual+'<table><tr><th>翼</th><th>層</th><th>状態</th><th>新面</th><th>勾配</th><th>未成立候補</th></tr>'+
  table+'</table>'+
  '<p>これらは連続歩行、人体幅、構造支持、入口、上層ラウンジの実用性を認証しません。'+
  '建築意匠も人間未審査。既存R87全形状は保存しています。</p>'+
  '<a href="R88_GALLERY_AND_SHELL_SUPPORT_STUDY.obj">3D OBJ</a> ／'+
  '<a href="R87_ROOM_TO_PUBLIC_ROUTE_3D_REVIEW.html">元R87の4方向美術資料</a>'+
  '<p>NOT_PREPARED / BLOCKED×9 / modelCalls 0 / Minecraft操作 0</p></html>';
 fs.writeFileSync(j,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(o,obj(built.faces),{flag:'wx'});
 fs.writeFileSync(h,html,{flag:'wx'});
 return {relativeFile:path.basename(h),
  addedTriangles:evidence.newResearchGalleryTriangles,
  proposed:evidence.proposedGalleryTierCount,
  unresolved:evidence.unresolvedGalleryTierCount,
  modelCalls:0,worldWrites:0};
}
