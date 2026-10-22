/**
 * R91: alternative, purpose-designed right-wing tier2 gallery turnout.
 * Not a blind filler over the R90 original tip overhang. Preserve R90 as
 * immutable audit evidence; curate an ACTIVE research mesh with a tapered
 * replacement terminus that fits INSIDE the TRUE R84 reading pad.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR90SurfaceSeams,sourceSurfaceAtXZ,
 prepareR90SeamReview,SCHEMA as R90_SCHEMA} from './b198zr90-source-surface-seams.mjs';
import {buildR88GalleryStudy} from './b198zr88-gallery-circulation-study.mjs';
import {buildR84MultilevelResearch} from './b198zr84-multilevel-bookstack-review.mjs';
import {extractR89GalleryEdges} from './b198zr89-gallery-interface-architecture.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr91-tapered-gallery-turnout-v1';
const fail=s=>{throw Error('B198ZR91_'+s)};
const SHA=s=>createHash('sha256').update(s).digest('hex');
const V=p=>p.map(x=>+x.toFixed(7));
const mid=(a,b,f)=>V(a.map((x,i)=>x+(b[i]-x)*f));
const plus=(p,h)=>V([p[0],p[1]+h,p[2]]);
const vec=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=f=>Math.hypot(...cross(vec(f.b,f.a),vec(f.c,f.a)))/2;
const tri=(out,a,b,c,kind)=>out.push({a:V(a),b:V(b),c:V(c),kind});
const quad=(out,a,b,c,d,kind)=>{tri(out,a,b,c,kind);tri(out,a,c,d,kind)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const obstacles=f=>['left_outer','left_inner','left_crown','left_end',
 'right_outer','right_inner','right_crown','right_end','sky_lounge_glass']
 .includes(f.kind)||f.kind.includes('_R87_BOOK_WALL')||
 f.kind.includes('_R87_RISING_SAIL_FIN')||
 f.kind.includes('_R87_PRISMATIC_BOOK_FIN')||
 f.kind.includes('_R87_READING_TABLE');
const closeXZ=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2])<2e-7;
function obstructedRays(middle,end,faces){
 const obs=faces.filter(obstacles);
 let hits=0;
 for(const k of [0,1,2])for(const h of [0,.035,.09]){
  const a=mid(middle[0],middle[1],k/2);
  const b=mid(end[0],end[1],k/2);
  for(const f of obs)if(intersectR81SegmentTriangle(plus(a,h),plus(b,h),f))hits++;
 }
 return hits;
}
function padOriginal(r84){
 const t=r84.tiers.find(x=>x.side==='right'&&x.tier===2);
 if(!t)fail('R84_RIGHT_TIER2_PAD_UNEXPECTED');
 const k=t.reuseR83Landing?
  'right_contained_landing_PAD_NOT_CERTIFIED':
  'right_tier2_contained_bookstack_PAD_NOT_ACCESS_CERTIFIED';
 const arr=r84.faces.filter(x=>x.kind===k);
 if(arr.length!==1)fail('UNIQUE_RIGHT_TIER2_PAD_REQUIRED');
 return arr[0];
}
/** Pure geometry: preserve R88 mid span and redesign the final narrowed bay. */
export function proposeR91Turnout(underlay,pad,obstacleFaces=[]){
 if(!Array.isArray(underlay)||underlay.length!==5||
  underlay.slice(0,4).some(f=>f.kind!=='R86_RESEARCH_DECK_NOT_CERTIFIED')||
  !pad||!Array.isArray(obstacleFaces))
  fail('FIVE_REAL_SOURCE_R88_FACES_AND_PAD_REQUIRED');
 const e=extractR89GalleryEdges(underlay.slice(0,4));
 const original=e[2],middle=e[1];
 if(original.every(p=>sourceSurfaceAtXZ(p,pad)?.containedXZ))
  fail('SOURCE_PAD_OVERHANG_MUST_BE_PROVED_FIRST');
 const center=mid(original[0],original[1],.5);
 const widths=[.95,.9,.85,.8,.75,.7];
 let accepted=null;const probes=[];
 for(const taper of widths){
  const endpoints=original.map(p=>V([center[0]+(p[0]-center[0])*taper,
   p[1],center[2]+(p[2]-center[2])*taper]));
  const projected=endpoints.map(p=>sourceSurfaceAtXZ(p,pad));
  const minWeight=Math.min(...projected.flatMap(q=>q?.barycentric??[-Infinity]));
  const rise=Math.max(...projected.map(q=>Math.abs(q?.verticalGap??Infinity)));
  const room=projected.every(q=>q?.containedXZ)&&minWeight>=.07&&rise<=.003;
  const lines=obstructedRays(middle,endpoints,obstacleFaces);
  probes.push({taper,minimumSourcePadBarycentric:+minWeight.toFixed(7),
   sourcePadMaximumVerticalGap:+rise.toFixed(7),screenedObstacleRayHits:lines,
   accepted:room&&lines===0});
  if(room&&lines===0){accepted={taper,endpoints,projected};break}
 }
 if(!accepted)return {status:'REVISED_TURNOUT_UNRESOLVED',faces:[],
  sourceOriginalTipUnmodified:true,probes,chosenTaper:null,
  originalPadAccessible:false};
 const end=accepted.endpoints.map((p,i)=>
  V([p[0],accepted.projected[i].point[1],p[2]]));
 const f=[],tag='right_R91_NARROWING_GALLERY_TURNOUT_NOT_CERTIFIED';
 tri(f,middle[0],middle[1],end[1],tag);
 tri(f,middle[0],end[1],end[0],tag);
 const c=V([0,1,2].map(i=>(pad.a[i]+pad.b[i]+pad.c[i])/3));
 const approach=mid(middle[0],middle[1],.5);
 const forwards=[c[0]-approach[0],c[2]-approach[2]];
 const corner=[pad.a,pad.b,pad.c].toSorted((a,b)=>
   (b[0]-c[0])*forwards[0]+(b[2]-c[2])*forwards[1]-
   (a[0]-c[0])*forwards[0]-(a[2]-c[2])*forwards[1])[0];
 const interior=mid(c,corner,.22);
 const inEnds=end.map(p=>{
  const q=sourceSurfaceAtXZ(mid(p,interior,.5),pad);
  if(!q?.containedXZ)fail('INSET_ENTRY_MUST_REMAIN_IN_ORIGINAL_PAD');
  return q.point;
 });
 for(const pair of [[end[0],inEnds[0]],[end[1],inEnds[1]],
  [inEnds[0],interior],[inEnds[1],interior]]){
  if(obstructedRays([pair[0],pair[0]],[pair[1],pair[1]],obstacleFaces))
   return {status:'REVISED_ENTRY_INTERSECTS_ORIGINAL_MESH',faces:[],
    sourceOriginalTipUnmodified:true,probes,chosenTaper:null,
    originalPadAccessible:false};
 }
 tri(f,end[0],end[1],inEnds[1],'right_R91_TRUE_PAD_THRESHOLD_NOT_WALKABLE');
 tri(f,end[0],inEnds[1],inEnds[0],'right_R91_TRUE_PAD_THRESHOLD_NOT_WALKABLE');
 tri(f,inEnds[0],inEnds[1],interior,'right_R91_TRUE_PAD_THRESHOLD_NOT_WALKABLE');
 // Research-level open gallery edge, paired with source R89 visual language.
 for(const side of [0,1]){
  const a=middle[side],b=end[side],h=.058;
  quad(f,plus(a,h),plus(b,h),plus(b,h+.004),plus(a,h+.004),
   'right_R91_REPROFILED_OPEN_GALLERY_RAIL_NOT_GUARD');
  tri(f,a,plus(a,h),V([a[0]+.008,a[1]+h*.68,a[2]-.004]),
   'right_R91_SHELL_FACING_LANTERN_UPRIGHT_NOT_STRUCTURE');
 }
 if(f.some(face=>area(face)<1e-11||!Number.isFinite(area(face))))
  fail('DEGENERATE_REPROFILED_SOURCE_TRIANGLES');
 return {status:'SOURCE_PAD_CONTAINED_TAPERED_ALTERNATIVE_ONLY',
  faces:f,probes,chosenTaper:accepted.taper,
  originalPadAccessible:false,
  sourceOriginalTipUnmodified:true,
  initialEndHalfWidth:.016,
  resultingTerminalWidth:+Math.hypot(end[0][0]-end[1][0],
   end[0][2]-end[1][2]).toFixed(7),
  originalTipBarycentrics:original.map(p=>
   sourceSurfaceAtXZ(p,pad).barycentric),
  revisedTerminalBarycentrics:end.map(p=>
   sourceSurfaceAtXZ(p,pad).barycentric),
  revisedEndCoordinates:end,
  originalR88StartAndMidEdgesPreserved:true,
  sweepingHumanBodyCollisionNotProved:true};
}
export function buildR91TurnoutStudy(nodes){
 const r90=buildR90SurfaceSeams(nodes),r88=buildR88GalleryStudy(nodes),
  r84=buildR84MultilevelResearch(nodes);
 const record=r88.tiers.find(x=>x.side==='right'&&x.tier===2);
 if(!record||record.addedResearchTriangles!==5||!record.candidate)
  fail('ORIGINAL_RIGHT_TIER2_R88_RECORD_MISSING');
 if(r90.unresolvedTrue3DSeams!==1||
  !r90.tiers.find(x=>x.side==='right'&&x.tier===2&&
   x.status==='UNRESOLVED_TRUE_3D_SEAM'))
  fail('HISTORICAL_RIGHT_TIER2_OVERHANG_EVIDENCE_REQUIRED');
 const before=r88.tiers.filter(x=>x.side==='left'||x.tier<2)
  .reduce((s,t)=>s+t.addedResearchTriangles,0);
 const offset=r88.sourceR87Triangles+before;
 const source5=r88.faces.slice(offset,offset+5);
 const pad=padOriginal(r84);
 const redesign=proposeR91Turnout(source5,pad,r90.faces);
 if(!redesign.faces.length)
  fail('TRUE_TAPER_REDESIGN_NOT_FEASIBLE_UNDER_SOURCE_TESTS');
 const registeredEdges=extractR89GalleryEdges(source5.slice(0,4));
 const tips=registeredEdges[2],midRailRoots=registeredEdges[1];
 const skipped=[],active=[];
 for(let i=0;i<r90.faces.length;i++){
  const f=r90.faces[i];
  const obsoleteGalleryFace=i===offset+2||i===offset+3;
  const obsoleteRail=f.kind.startsWith('right_R89_')&&
   ((f.kind.includes('OPEN_GALLERY')&&
    [f.a,f.b,f.c].some(p=>tips.some(t=>closeXZ(p,t))))||
    (f.kind.includes('UPRIGHT')&&
    [f.a,f.b,f.c].some(p=>midRailRoots.some(t=>closeXZ(p,t)))));
  if(obsoleteGalleryFace||obsoleteRail){skipped.push(i);continue}
  active.push(f);
 }
 const f=[...active,...redesign.faces];
 return {faces:f,sourceR90Faces:r90.faces.length,
  sourceR90PreservedSeparately:true,
  excludedObsoleteResearchFaceIndices:skipped,
  excludedObsoleteResearchFaceCount:skipped.length,
  newTurnoutFaces:redesign.faces.length,
  activeModelTriangleCount:f.length,
  rightTier2OriginalPadStillUnmodified:true,
  originalSourceOverhangRecorded:true,
  rightTier2Alternative:(( {faces,...details} )=>details)(redesign),
  oldSevenTiersOtherwiseKept:true,
  approvedHumanWalkingPaths:0,
  originalModelInferenceRepeated:false,
  independentAestheticReview:'NOT_REVIEWED'};
}
export function prepareR91TurnoutReview(args={}){
 const {r90Evidence,...old}=args;
 const checked=prepareR90SeamReview(old);
 if(!r90Evidence||r90Evidence.schema!==R90_SCHEMA||
  JSON.stringify(r90Evidence)!==JSON.stringify(checked))
  fail('R90_COMPLETE_EVIDENCE_MISMATCH');
 if(typeof args.raw!=='string'||SHA(args.raw)!==args.expectedRawSha256)
  fail('ORIGINAL_RAW_SHA_REQUIRED');
 const {faces,...details}=buildR91TurnoutStudy(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:checked.oldB143Status,
  r90FullEvidenceAuthenticated:true,...details,
  constructionApproved:false,readiness:'NOT_PREPARED',
  modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0,
  safety:safe()};
}
function obj(faces){
 const o=['# R91 active 3D art-study variant, original R90 retained separately.',
 '# Obsolete research faces excluded from THIS view, not from GitHub history.',
 '# NOT a real access/safety/structural certificate'];
 let n=1,kind=null;
 for(const f of faces){
  if(kind!==f.kind){kind=f.kind;o.push('g '+kind.replace(/[^a-zA-Z0-9_]/g,'_'))}
  for(const p of [f.a,f.b,f.c])o.push('v '+p.join(' '));
  o.push('f '+n+' '+(n+1)+' '+(n+2));n+=3;
 }
 return o.join('\n')+'\n';
}
export function writeR91TurnoutReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())fail('EXISTING_SAFE_REVIEW_FOLDER_REQUIRED');
 const base='R91_TRUE_PAD_TAPERED_RIGHT_TIER2';
 const locations=[base+'_EVIDENCE.json',base+'_ACTIVE_VARIANT.obj',
  base+'_ARCHITECTURAL_REVIEW.html'].map(n=>path.join(destination,n));
 if(locations.some(p=>fs.existsSync(p)))fail('NO_OVERWRITES');
 const e=prepareR91TurnoutReview(args);
 const study=buildR91TurnoutStudy(args.r80Evidence.conceptualRouteNodes);
 const d=e.rightTier2Alternative;
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
 '<title>R91 right gallery turnout original study</title>'+
 '<style>body{font:15px/1.75 system-ui;max-width:1000px;margin:25px auto;padding:0 20px}table{border-collapse:collapse}td,th{padding:7px;border:1px solid #bbc4ce}</style>'+
 '<h1>R91 右書架 tier 2：着地パッドに収める絞り込みギャラリー案</h1>'+
 '<p>元のR88・R90研究面は証拠として保存。現在の比較3Dには、着地三角形をはみ出す旧研究終端と、それに依存する旧側縁だけを除外した別案を収録。'+
 '本当の元R84パッド境界内に、通路の最後の区間を漸減幅で入れる新形状を追加しました。</p>'+
 '<p>新たな終端幅 '+d.resultingTerminalWidth+' 正規化単位。旧研究形状から除外した面数 '+e.excludedObsoleteResearchFaceCount+
 '、代替面 '+e.newTurnoutFaces+'。元のR90原本は未変更。新形式は実歩行も負荷にも未承認。</p>'+
 '<table><tr><th>候補の絞り率</th><th>元R84面内の最小重心座標</th><th>外殻・家具の交差線数</th><th>候補</th></tr>'+
 d.probes.map(p=>'<tr><td>'+p.taper+'</td><td>'+p.minimumSourcePadBarycentric+
 '</td><td>'+p.screenedObstacleRayHits+'</td><td>'+ (p.accepted?'形状研究採用':'保留')+'</td></tr>').join('')+
 '</table><p><a href="'+base+'_ACTIVE_VARIANT.obj">活性版の完全3D OBJ</a> ／'+
 '<a href="R90_GALLERY_THRESHOLD_VALIDITY_REVIEW.html">元のR90未成立証拠</a></p>'+
 '<p>独立美術審査NOT_REVIEWED、現実の手すり強度・全幅掃引体積・3D構造支持・Minecraft歩行・旧Qwenモデル改善の証明なし。</p>'+
 '<p>NOT_PREPARED / BLOCKED×9 / BuildPlan空 / モデル推論0 / World読取・書込0</p></html>';
 fs.writeFileSync(locations[0],JSON.stringify(e,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(locations[1],obj(study.faces),{flag:'wx'});
 fs.writeFileSync(locations[2],html,{flag:'wx'});
 return {relativeFile:path.basename(locations[2]),
  newTriangles:e.newTurnoutFaces,excludedHistoricalTriangles:e.excludedObsoleteResearchFaceCount,
  modelCalls:0,worldWrites:0};
}
