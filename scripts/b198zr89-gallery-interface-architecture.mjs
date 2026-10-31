/**
 * R89: make seven source-derived gallery interfaces physically visible in 3D:
 * outer balustrade sketches and small terrace boundary light-rails.
 * Research art only, NEVER a safety guardrail or certified supported path.
 * R88, R87, R84 historical triangles are preserved bit-for-bit.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR88GalleryStudy,prepareR88GalleryReview,SCHEMA as R88_SCHEMA}
 from './b198zr88-gallery-circulation-study.mjs';
import {buildR84MultilevelResearch} from './b198zr84-multilevel-bookstack-review.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr89-gallery-balustrade-and-landing-study-v1';
const fail=s=>{throw Error('B198ZR89_'+s)};
const digest=s=>createHash('sha256').update(s).digest('hex');
const V=v=>v.map(x=>+x.toFixed(7));
const lift=(p,h)=>V([p[0],p[1]+h,p[2]]);
const subtraction=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=({a,b,c})=>Math.hypot(...cross(subtraction(b,a),subtraction(c,a)))/2;
const triangle=(arr,a,b,c,kind)=>arr.push({a:V(a),b:V(b),c:V(c),kind});
const quad=(arr,a,b,c,d,kind)=>{
 triangle(arr,a,b,c,kind);triangle(arr,a,c,d,kind);
};
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
 .replaceAll('"','&quot;').replaceAll("'",'&#39;');
const screenKinds=new Set(['left_outer','left_inner','left_crown','left_end',
 'right_outer','right_inner','right_crown','right_end','sky_lounge_glass']);
const isFurniture=f=>f.kind.includes('_R87_BOOK_WALL')||
 f.kind.includes('_R87_RISING_SAIL_FIN')||
 f.kind.includes('_R87_PRISMATIC_BOOK_FIN')||
 f.kind.includes('_R87_READING_TABLE');
function blockers(faces){return faces.filter(f=>screenKinds.has(f.kind)||isFurniture(f))}
function clashes(a,b,blocked){
 let n=0;
 for(const f of blocked)if(intersectR81SegmentTriangle(a,b,f))n++;
 return n;
}
/**
 * Validate R88 two-section ribbon's exact shared edges. Does not certify
 * manifold-closed geometry, supports, a physical walking path or stairs.
 */
export function extractR89GalleryEdges(faces){
 if(!Array.isArray(faces)||faces.length<4||
  faces.slice(0,4).some(f=>f.kind!=='R86_RESEARCH_DECK_NOT_CERTIFIED'))
  fail('FOUR_SOURCE_R88_STRIP_TRIANGLES_REQUIRED');
 const same=(a,b)=>a.every((x,i)=>Math.abs(x-b[i])<=1e-7);
 const nodes=[
  [faces[0].a,faces[0].b],
  [faces[2].a,faces[2].b],
  [faces[3].c,faces[2].c]
 ];
 if(!same(faces[0].c,nodes[1][1])||
  !same(faces[1].c,nodes[1][0])||
  !same(faces[3].a,nodes[1][0])||
  !same(faces[3].b,nodes[2][1]))
  fail('GALLERY_CENTERLINE_EDGE_JOIN_NOT_EXACT');
 return nodes;
}
function findOriginalPad(r84,t){
 const kind=t.side+(t.reuseR83Landing?
  '_contained_landing_PAD_NOT_CERTIFIED':
  '_tier'+t.tier+'_contained_bookstack_PAD_NOT_ACCESS_CERTIFIED');
 const pads=r84.faces.filter(f=>f.kind===kind);
 if(pads.length!==1)fail('UNIQUE_R84_SOURCE_PAD_REQUIRED');
 const f=pads[0];
 const p=V([0,1,2].map(i=>(f.a[i]+f.b[i]+f.c[i])/3));
 if(Math.hypot(...subtraction(p,t.padCenter))>.00001)
  fail('R84_PAD_CENTER_DOES_NOT_MATCH_REAL_GEOMETRY');
 return f;
}
/** Create 3D border lines only when sampled segment/hull + furniture is clear. */
export function designR89GalleryInterface(t,sourceStrip,pad,sourceBlockers){
 if(!t||!t.candidate||!pad||!Array.isArray(sourceBlockers))
  fail('SOURCE_GALLERY_AND_PAD_REQUIRED');
 const nodes=extractR89GalleryEdges(sourceStrip);
 const result=[],warnings=[];
 const railHeight=t.side==='left'?.044:.058;
 let addedRailSegments=0;
 for(const sideIndex of [0,1])for(let i=0;i<2;i++){
  const a=nodes[i][sideIndex],b=nodes[i+1][sideIndex];
  const railLoA=lift(a,railHeight),railLoB=lift(b,railHeight);
  const railHiA=lift(a,railHeight+.004),railHiB=lift(b,railHeight+.004);
  const checks=[[a,railLoA],[b,railLoB],
   [railLoA,railLoB],[railHiA,railHiB]];
  if(checks.some(([u,v])=>clashes(u,v,sourceBlockers))){
   warnings.push('GUARD_SKETCH_NOT_CREATED_DUE_TO_SOURCE_INTERSECTION');
   continue;
  }
  const kind=t.side+'_R89_OPEN_GALLERY_OUTBOARD_RAIL_NOT_CERTIFIED';
  // A rail cap, not a solid bulkhead. Open slots preserve a room relationship.
  quad(result,railLoA,railLoB,railHiB,railHiA,kind);
  // Right: vertical glazed ribs; left: slanted sail uprights.
  const h=railHeight;
  const supportShape=lift(V([a[0]+(t.side==='left'?-.008:.008),
   a[1],a[2]+(t.side==='left'?.004:-.004)]),h*.68);
  triangle(result,a,railLoA,supportShape,
   t.side+'_R89_ARCHITECTURAL_UPRIGHT_NOT_STRUCTURE');
  addedRailSegments++;
 }
 // Low rim at the existing pad's true triangle edge (no imaginary deck).
 const p=[pad.a,pad.b,pad.c];
 let rimCount=0;
 for(let i=0;i<3;i++){
  const a=p[i],b=p[(i+1)%3],aa=lift(a,.006),bb=lift(b,.006);
  if(clashes(aa,bb,sourceBlockers)){
   warnings.push('LANDING_EDGE_RIM_SKIPPED_ORIGINAL_OBSTRUCTION');
   continue;
  }
  quad(result,a,b,bb,aa,t.side+'_R89_READING_TERRACE_EDGE_LIGHT_NOT_RAIL');
  rimCount++;
 }
 if(result.some(f=>area(f)<1e-11||!Number.isFinite(area(f))))
  fail('DEGENERATE_DESIGN_SURFACE');
 return {faces:result,rails:addedRailSegments,padRims:rimCount,
  warnings:[...new Set(warnings)],
  allRailPiecesTouchOriginalR88Vertices:true,
  allLandingRimsTouchExactR84PadVertices:true,
  railingNotFallProtectionCertified:true};
}
export function buildR89IntegratedAccessStudy(nodes){
 const r88=buildR88GalleryStudy(nodes);
 const r84=buildR84MultilevelResearch(nodes);
 const screen=blockers(r88.faces);
 const out=[],levels=[];
 const sourceNew=r88.faces.slice(r88.sourceR87Triangles);
 let offset=0;
 for(const t of r88.tiers){
  if(!t.candidate){
   levels.push({side:t.side,tier:t.tier,
    status:'SOURCE_GALLERY_MISSING_RAILS_CANNOT_BE_CREATED',
    sourceGalleryVerified:false,additionalFaces:0,
    rails:0,padRims:0,warnings:['NO_R88_SOURCE_GALLERY']});
   continue;
  }
  const sourceStrip=sourceNew.slice(offset,offset+t.addedResearchTriangles);
  offset+=t.addedResearchTriangles;
  const record=r84.tiers.find(x=>x.side===t.side&&x.tier===t.tier);
  if(!record)fail('R84_TIER_MISSING');
  const pad=findOriginalPad(r84,record);
  const piece=designR89GalleryInterface(t,sourceStrip,pad,screen);
  out.push(...piece.faces);
  levels.push({side:t.side,tier:t.tier,
   status:'VISUAL_BARRIER_AND_PAD_INTERFACE_CONCEPT_NOT_APPROVED',
   sourceGalleryVerified:true,additionalFaces:piece.faces.length,
   rails:piece.rails,padRims:piece.padRims,
   warnings:piece.warnings,
   actualSafetyAndAccessProven:false});
 }
 if(offset!==sourceNew.length||levels.length!==7)
  fail('ALL_SOURCE_GALLERY_FACES_ACCOUNTED');
 const faces=[...r88.faces,...out];
 return {faces,levels,
  originalR88Triangles:r88.faces.length,
  newArchitecturalInterfaceTriangles:out.length,
  levelsWithStudyRail:levels.filter(t=>t.rails>0).length,
  levelsWithStudyLandingRim:levels.filter(t=>t.padRims>0).length,
  totalRailSegments:levels.reduce((a,t)=>a+t.rails,0),
  allSourceFacesUnmodified:true,
  actualHumanWalkabilityCertified:false,
  independentArchitecturalQuality:'NOT_REVIEWED',
  scaleDimensionless:true};
}
export function prepareR89AccessReview(args={}){
 const {r88Evidence,...old}=args;
 const proof=prepareR88GalleryReview(old);
 if(!r88Evidence||r88Evidence.schema!==R88_SCHEMA||
  JSON.stringify(r88Evidence)!==JSON.stringify(proof))
  fail('R88_COMPLETE_EVIDENCE_MISMATCH');
 if(typeof args.raw!=='string'||digest(args.raw)!==args.expectedRawSha256)
  fail('HISTORIC_RAW_SHA_MISMATCH');
 const {faces,...result}=buildR89IntegratedAccessStudy(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,status:'RESEARCH_INTEGRATED_GALLERY_COVES_ONLY',
  originalRawSha256:args.expectedRawSha256,oldB143Status:proof.oldB143Status,
  r88FullEvidenceRevalidated:true,...result,
  noStaircaseHandrailBuildingCodeOrRoofCertificate:true,
  sourceModelResultsNeverRewritten:true,
  worldInteractionOccurred:false,modelCalls:0,worldWrites:0,safety:safe()};
}
const obj=faces=>{
 const o=['# R89 true 3D research overlays: R88 source + scoped rail/landing ribs',
 '# NOT Minecraft, fall protection, body clearance or structure certification'];
 let n=1,k=null;
 for(const f of faces){
  if(k!==f.kind){o.push('g '+f.kind.replace(/[^a-zA-Z0-9_]/g,'_'));k=f.kind}
  for(const p of [f.a,f.b,f.c])o.push('v '+p.join(' '));
  o.push('f '+n+' '+(n+1)+' '+(n+2));n+=3;
 }
 return o.join('\n')+'\n';
};
export function writeR89AccessReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())fail('EXISTING_SAFE_DESTINATION_REQUIRED');
 const json=path.join(destination,'R89_GALLERY_INTEGRATION_EVIDENCE.json'),
  model=path.join(destination,'R89_GALLERY_RAILS_AND_LANDING_PROPOSALS.obj'),
  html=path.join(destination,'R89_GALLERY_LANDING_INTEGRATION_REVIEW.html');
 if([json,model,html].some(x=>fs.existsSync(x)))fail('DO_NOT_OVERWRITE');
 const evidence=prepareR89AccessReview(args);
 const st=buildR89IntegratedAccessStudy(args.r80Evidence.conceptualRouteNodes);
 const rows=evidence.levels.map(l=>'<tr><td>'+esc(l.side)+'</td><td>'+l.tier+
  '</td><td>'+l.rails+'</td><td>'+l.padRims+'</td><td>'+l.additionalFaces+
  '</td><td>'+esc(l.warnings.join(' / ')||'研究形状の限定チェックで拒否なし')+'</td></tr>').join('');
 const h='<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
 '<title>R89 gallery architectural interfaces — review, not clearance</title>'+
 '<style>body{font:15px/1.7 system-ui;max-width:1150px;margin:25px auto;padding:0 16px}td,th{border:1px solid #a7b6c5;padding:7px}table{border-collapse:collapse;width:100%}</style>'+
 '<h1>R89 閲覧室7層へのギャラリーと着地点の立体建築研究</h1>'+
 '<p>R88の通路面の実際のエッジを共有する側縁／帆型フィン／縦桟と、R84の本物の着地パッド三角形に接する低い縁を追加。'+
 '衝突候補は発生時に除外して理由を記録。R88原本と元の書架家具は切り取らずに保持します。</p>'+
 '<p>追加した研究用3D面 '+evidence.newArchitecturalInterfaceTriangles+
 '、側縁が存在する層 '+evidence.levelsWithStudyRail+
 '/7、着地点の縁が存在する層 '+evidence.levelsWithStudyLandingRim+
 '/7。</p>'+
 '<table><tr><th>翼</th><th>層</th><th>側縁区間</th><th>着地縁</th><th>追加面</th><th>留保条件</th></tr>'+rows+'</table>'+
 '<p><a href="R89_GALLERY_RAILS_AND_LANDING_PROPOSALS.obj">全研究面を含む3D OBJ</a> ／'+
 '<a href="R88_ARCHITECTURAL_CIRCULATION_REVIEW.html">R88 研究用通路</a> ／'+
 '<a href="R87_ROOM_TO_PUBLIC_ROUTE_3D_REVIEW.html">R87 4方向の内外観資料</a></p>'+
 '<p>絶対寸法・支持強度・滑り/落下防止・完全3D掃引衝突・出入口から各室の機能動線・Minecraft歩行・美術品質は一切認証していません。</p>'+
 '<p>NOT_PREPARED / BLOCKED×9 / Qwen0 / Minecraft読取書込0 / 人間審査NOT_REVIEWED。</p></html>';
 fs.writeFileSync(json,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(model,obj(st.faces),{flag:'wx'});
 fs.writeFileSync(html,h,{flag:'wx'});
 return {relativeFile:path.basename(html),addedFaces:evidence.newArchitecturalInterfaceTriangles,
  modelCalls:0,worldWrites:0};
}
