/**
 * R90B: Source-triangle-registered seam research between R80 ascent,
 * R88 gallery, and R84 reading pad. Every seam is conditional and remains
 * uncertified; existing R89 geometry and earlier evidence untouched.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR89IntegratedAccessStudy,prepareR89AccessReview,SCHEMA as R89_SCHEMA,
 extractR89GalleryEdges} from './b198zr89-gallery-interface-architecture.mjs';
import {buildR88GalleryStudy} from './b198zr88-gallery-circulation-study.mjs';
import {buildR84MultilevelResearch} from './b198zr84-multilevel-bookstack-review.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr90-source-surface-gallery-seams-v1';
const fail=s=>{throw Error('B198ZR90_'+s)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const R=n=>+n.toFixed(7),V=p=>p.map(R);
const mid=(a,b,f)=>V(a.map((x,i)=>x+(b[i]-x)*f));
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=f=>Math.hypot(...cross(sub(f.b,f.a),sub(f.c,f.a)))/2;
const tri=(faces,a,b,c,kind)=>faces.push({a:V(a),b:V(b),c:V(c),kind});
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const envelope=new Set(['left_outer','left_inner','left_crown','left_end',
 'right_outer','right_inner','right_crown','right_end','sky_lounge_glass']);
const obstruction=f=>envelope.has(f.kind)||
 f.kind.includes('_R87_BOOK_WALL')||
 f.kind.includes('_R87_RISING_SAIL_FIN')||
 f.kind.includes('_R87_PRISMATIC_BOOK_FIN')||
 f.kind.includes('_R87_READING_TABLE');
const roughEnd=/^R86_RESEARCH_DECK_NOT_CERTIFIED$/;
/** Interpolate actual 3D triangle elevation from projected XZ barycentrics. */
export function sourceSurfaceAtXZ(p,f){
 if(!Array.isArray(p)||p.length!==3||p.some(x=>!Number.isFinite(x))||
  !f||[f.a,f.b,f.c].some(x=>!Array.isArray(x)||x.length!==3||
   x.some(v=>!Number.isFinite(v))))
  fail('VALID_SOURCE_TRIANGLE_REQUIRED');
 const [a,b,c]=[f.a,f.b,f.c];
 const det=(u,v,w)=>(v[0]-u[0])*(w[2]-u[2])-
  (w[0]-u[0])*(v[2]-u[2]);
 const den=det(a,b,c);
 if(Math.abs(den)<1e-12)return null;
 const weights=[det(p,b,c)/den,det(a,p,c)/den,det(a,b,p)/den];
 const y=weights[0]*a[1]+weights[1]*b[1]+weights[2]*c[1];
 return {point:V([p[0],y,p[2]]),
  barycentric:weights.map(R),
  containedXZ:Math.min(...weights)>=-1e-6,
  verticalGap:R(p[1]-y)};
}
function supportingDeckSample(p,faces){
 let best=null;
 for(const f of faces){
  if(!['switchback_deck','flat_landing'].includes(f.kind))continue;
  const q=sourceSurfaceAtXZ(p,f);
  if(!q?.containedXZ)continue;
  const deviation=Math.abs(q.verticalGap);
  if(!best||deviation<best.deviation-1e-8){
   best={...q,deviation:R(deviation),sourceKind:f.kind};
  }
 }
 return best;
}
function padsFor(r84,t){
 const record=r84.tiers.find(x=>x.side===t.side&&x.tier===t.tier);
 if(!record)fail('ORIGINAL_R84_TIER_MISSING');
 const k=record.reuseR83Landing?t.side+'_contained_landing_PAD_NOT_CERTIFIED':
  t.side+'_tier'+t.tier+'_contained_bookstack_PAD_NOT_ACCESS_CERTIFIED';
 const original=r84.faces.filter(f=>f.kind===k);
 if(original.length!==1)fail('UNIQUE_R84_PAD_SOURCE_TRIANGLE_REQUIRED');
 const center=V([0,1,2].map(i=>
  (original[0].a[i]+original[0].b[i]+original[0].c[i])/3));
 if(Math.hypot(...sub(center,record.padCenter))>.000003)
  fail('ORIGINAL_PAD_CENTER_DRIFT');
 return {pad:original[0],center};
}
function checkObstructions(lines,faces){
 let hits=0;
 const screen=faces.filter(obstruction);
 for(const [a,b] of lines)for(const height of [.005,.045]){
  const p=V([a[0],a[1]+height,a[2]]);
  const q=V([b[0],b[1]+height,b[2]]);
  for(const f of screen)if(intersectR81SegmentTriangle(p,q,f))hits++;
 }
 return hits;
}
/** Return real triangular seam meshes only where both R80 and R84 exist. */
export function buildR90SurfaceSeams(nodes){
 const r89=buildR89IntegratedAccessStudy(nodes),
  r88=buildR88GalleryStudy(nodes),
  r84=buildR84MultilevelResearch(nodes);
 if(JSON.stringify(r89.faces.slice(0,r88.faces.length))!==
  JSON.stringify(r88.faces))fail('R89_NOT_EXACT_R88_PREFIX');
 const additions=[],tiers=[];
 const originalDecks=r88.faces.filter(f=>
  f.kind==='switchback_deck'||f.kind==='flat_landing');
 let from=r88.sourceR87Triangles;
 for(const t of r88.tiers){
  const overlay=r88.faces.slice(from,from+t.addedResearchTriangles);
  from+=t.addedResearchTriangles;
  const issues=[],piece=[];
  if(!t.candidate||overlay.length!==5||overlay.slice(0,4).some(f=>
   !roughEnd.test(f.kind))){
   tiers.push({side:t.side,tier:t.tier,status:'R88_SOURCE_DECK_NOT_FOUND',
    newFaces:0,sourceDeckEdgeRegistered:false,
    terminalPadContained:false,issues:['MISSING_R88_SOURCE']});
   continue;
  }
  const edges=extractR89GalleryEdges(overlay.slice(0,4)),
   starting=edges[0],finishing=edges[2];
  const origin=starting.map(p=>supportingDeckSample(p,originalDecks));
  const startPass=origin.every(x=>x&&Math.abs(x.verticalGap)<=.003);
  if(!startPass)issues.push('R80_ACTUAL_DECK_ANCHOR_UNRESOLVED');
  if(startPass){
   const a=origin[0].point,b=origin[1].point;
   if(Math.abs(origin[0].verticalGap)+Math.abs(origin[1].verticalGap)>1e-7){
    tri(piece,starting[0],starting[1],b,
     t.side+'_R90_SOURCE_DECK_HEIGHT_INTERFACE_NOT_CERTIFIED');
    tri(piece,starting[0],b,a,
     t.side+'_R90_SOURCE_DECK_HEIGHT_INTERFACE_NOT_CERTIFIED');
   }
  }
  const {pad,center}=padsFor(r84,t);
  const terminal=finishing.map(p=>sourceSurfaceAtXZ(p,pad));
  const padInside=terminal.every(x=>x?.containedXZ);
  if(!padInside)issues.push('R88_SOURCE_DECK_TERMINAL_OVERHANGS_TRUE_R84_PAD');
  const verticalOk=terminal.every(x=>x&&Math.abs(x.verticalGap)<=.003);
  if(!verticalOk)issues.push('RESEARCH_VERTICAL_PAD_SEAM_TOO_LARGE');
  let padSeamBuilt=false;
  if(padInside&&verticalOk){
   // The R88 end is centered on the pad, so extending only toward
   // the centroid would make a ZERO-AREA collinear third facet. Choose
   // a genuinely interior, forward-offset room threshold instead.
   const approach=mid(starting[0],starting[1],.5);
   const forward=[center[0]-approach[0],center[2]-approach[2]];
   const corners=[pad.a,pad.b,pad.c].toSorted((a,b)=>
    ((b[0]-center[0])*forward[0]+(b[2]-center[2])*forward[1])-
    ((a[0]-center[0])*forward[0]+(a[2]-center[2])*forward[1]));
   const interior=mid(center,corners[0],.22);
   const inner=finishing.map(p=>{
    const m=mid(p,interior,.50);
    const source=sourceSurfaceAtXZ(m,pad);
    if(!source?.containedXZ)fail('MIDPOINT_OUTSIDE_CONVEX_PAD');
    return source.point;
   });
   const rays=[[finishing[0],inner[0]],[finishing[1],inner[1]],
    [inner[0],interior],[inner[1],interior]];
   if(checkObstructions(rays,r89.faces)){
    issues.push('PAD_ENTRY_COLLIDES_WITH_ORIGINAL_ENVELOPE_OR_FURNITURE');
   }else{
    tri(piece,finishing[0],finishing[1],inner[1],
     t.side+'_R90_SOURCE_PAD_ENTRY_TAPER_NOT_WALKABLE');
    tri(piece,finishing[0],inner[1],inner[0],
     t.side+'_R90_SOURCE_PAD_ENTRY_TAPER_NOT_WALKABLE');
    tri(piece,inner[0],inner[1],interior,
     t.side+'_R90_ORIGINAL_PAD_CONNECTED_THRESHOLD_NOT_CERTIFIED');
    padSeamBuilt=true;
   }
  }
  if(piece.some(f=>!Number.isFinite(area(f))||area(f)<1e-11))
   fail('NEW_SOURCE_SEAM_TRIANGLE_DEGENERATE_'+t.side+'_'+t.tier);
  additions.push(...piece);
  tiers.push({side:t.side,tier:t.tier,
   status:padSeamBuilt&&startPass?
    'SOURCE_ALIGNED_RESEARCH_SEAMS_ONLY':'UNRESOLVED_TRUE_3D_SEAM',
   sourceDeckEdgeRegistered:startPass,
   sourceHeightDeviationNormalized:origin.map(x=>x?.verticalGap??null),
   terminalPadContained:padInside,
   terminalPadMinBarycentric:terminal.map(x=>x?
    Math.min(...x.barycentric):null),
   padVerticalDeviationNormalized:terminal.map(x=>x?.verticalGap??null),
   entryTaperAdded:padSeamBuilt,
   newFaces:piece.length,issues,
   connectivityCertified:false,
   actualFloorOrWallStructuralSupportProven:false});
 }
 if(from!==r88.faces.length||tiers.length!==7)
  fail('SOURCE_R88_GALLERY_TRIANGLES_NOT_CONSUMED');
 return {faces:[...r89.faces,...additions],tiers,
  originalR89Triangles:r89.faces.length,
  new3DSurfaceSeamTriangles:additions.length,
  sourceDeckAnchorRegistered:tiers.filter(t=>t.sourceDeckEdgeRegistered).length,
  originalPadEntryTapers:tiers.filter(t=>t.entryTaperAdded).length,
  unresolvedTrue3DSeams:tiers.filter(t=>t.status!=='SOURCE_ALIGNED_RESEARCH_SEAMS_ONLY').length,
  fullPhysicalHumanWalkabilityProven:false,
  oldR89MeshesByteIdentical:true,
  gapDisclosuresCannotBeAutoPromotedToSafe:true};
}
export function prepareR90SeamReview(args={}){
 const {r89Evidence,...prior}=args;
 const priorReview=prepareR89AccessReview(prior);
 if(!r89Evidence||r89Evidence.schema!==R89_SCHEMA||
  JSON.stringify(r89Evidence)!==JSON.stringify(priorReview))
  fail('R89_FULL_EVIDENCE_RECOMPUTE_MISMATCH');
 if(typeof args.raw!=='string'||sha(args.raw)!==args.expectedRawSha256)
  fail('FROZEN_RAW_SHA_MISMATCH');
 const {faces,...study}=buildR90SurfaceSeams(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:priorReview.oldB143Status,
  r89FullEvidenceAuthenticated:true,...study,
  humanAesthetics:'NOT_REVIEWED',constructionAllowed:false,
  modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0,
  safety:safe()};
}
function obj(faces){
 const o=['# R90 source R89 geometry + conservative seam triangles.',
  '# One inherited pad overhang remains diagnosed, not concealed'];
 let i=1,k=null;
 for(const f of faces){
  if(f.kind!==k){k=f.kind;o.push('g '+k.replace(/[^a-zA-Z0-9_]/g,'_'))}
  for(const p of [f.a,f.b,f.c])o.push('v '+p.join(' '));
  o.push('f '+i+' '+(i+1)+' '+(i+2));i+=3;
 }
 return o.join('\n')+'\n';
}
export function writeR90SeamReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_SAFE_DESTINATION_REQUIRED');
 const json=path.join(destination,'R90_SOURCE_SURFACE_SEAM_EVIDENCE.json'),
  objFile=path.join(destination,'R90_SOURCE_DECK_TO_PAD_3D_SEAMS.obj'),
  html=path.join(destination,'R90_GALLERY_THRESHOLD_VALIDITY_REVIEW.html');
 if([json,objFile,html].some(x=>fs.existsSync(x)))fail('NO_OVERWRITE');
 const report=prepareR90SeamReview(args),
  study=buildR90SurfaceSeams(args.r80Evidence.conceptualRouteNodes);
 const rows=report.tiers.map(t=>'<tr><td>'+esc(t.side)+'</td><td>'+t.tier+
  '</td><td>'+esc(t.sourceDeckEdgeRegistered?'接続候補':'未成立')+'</td><td>'+
  esc(t.terminalPadContained?'内部':'はみ出し')+'</td><td>'+
  esc(t.entryTaperAdded?'追加':'なし')+'</td><td>'+t.newFaces+
  '</td><td>'+esc(t.issues.join('、')||'局所予備検査で拒否なし')+'</td></tr>').join('');
 const h='<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
 '<title>R90 3D research seam review</title>'+
 '<style>body{font:15px/1.7 system-ui;max-width:1100px;margin:30px auto;padding:0 20px}th,td{border:1px solid #bbc8d2;padding:8px}table{border-collapse:collapse;width:100%}</style>'+
 '<h1>R90 昇降路から閲覧室：本物の三角形面に接する3D継ぎ目</h1>'+
 '<p>R80の昇降路デッキ三角形の実高度とR88の始端を照合し、'+
 'R84の着地パッドにはみ出していない場合だけ源三角形内へ接続テーパーを生成します。'+
 '前段R89の造形は切り取らず、不成立を隠す板を追加しません。</p>'+
 '<p>元の昇降床登録 '+report.sourceDeckAnchorRegistered+'/7、'+
 '着地テーパー '+report.originalPadEntryTapers+'/7、残る立体継ぎ目の未成立 '+report.unresolvedTrue3DSeams+
 '件。新規研究面 '+report.new3DSurfaceSeamTriangles+'。</p>'+
 '<table><tr><th>翼</th><th>層</th><th>実デッキ</th><th>パッド境界</th><th>新テーパー</th><th>面数</th><th>未解決問題</th></tr>'+
 rows+'</table><p><a href="R90_SOURCE_DECK_TO_PAD_3D_SEAMS.obj">3D OBJ</a> ／'+
 '<a href="R89_GALLERY_LANDING_INTEGRATION_REVIEW.html">R89の着地縁研究</a></p>'+
 '<p>正規化の研究座標であり、身体幅、手すり、構造荷重、'+
 '全域掃引衝突、Minecraftでの実歩行、設計の美術合格は未認証です。</p>'+
 '<p>NOT_PREPARED / BLOCKED×9 / BuildPlan空 / Qwen・Minecraft操作0 / NOT_REVIEWED</p></html>';
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(objFile,obj(study.faces),{flag:'wx'});
 fs.writeFileSync(html,h,{flag:'wx'});
 return {relativeFile:path.basename(html),
  addedFaces:report.new3DSurfaceSeamTriangles,blocked:report.unresolvedTrue3DSeams,
  modelCalls:0,worldWrites:0};
}
