/**
 * B198Z-R95 ART FIRST: seven small sight/sky apertures cut into actual R79
 * inner wall triangles in a NEW active preview only. Historic R94 and raw
 * Qwen c01 are NOT modified. Geometry visibility is NOT real daylight,
 * structural strength, headroom, human access or construction permission.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR94RoomEntranceVariant,prepareR94DoorwayReview,
 SCHEMA as R94_SCHEMA} from './b198zr94-seven-room-entry-redesign.mjs';
import {buildR93ArchitecturalReadingVariant} from './b198zr93-contiguous-reading-arcades.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr95-real-inner-wall-daylight-slits-v1';
const fail=x=>{throw Error('B198ZR95_'+x)};
const digest=x=>createHash('sha256').update(x).digest('hex');
const R=x=>+x.toFixed(7),V=p=>p.map(R);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
 a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=f=>Math.hypot(...cross(sub(f.b,f.a),sub(f.c,f.a)))/2;
const tri=(arr,a,b,c,kind)=>arr.push({a:V(a),b:V(b),c:V(c),kind});
const quad=(arr,a,b,c,d,kind)=>{tri(arr,a,b,c,kind);tri(arr,a,c,d,kind)};
const enc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const near=(p,a,b)=>p.map((x,i)=>a[i]+(b[i]-a[i])*.5);
const planeValue=(p,axis)=>p[axis];
const lerp=(a,b,t)=>V(a.map((x,i)=>x+(b[i]-x)*t));
/**
 * Keep the outward polygon, pass the inward polygon to the next rectangle
 * plane. Polygon clipping never invents interior infill faces.
 */
function splitPolygon(poly,axis,cut,keepSmall){
 const signed=p=>keepSmall?cut-p[axis]:p[axis]-cut;
 const inside=[],outside=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],
   da=signed(a),db=signed(b),aa=da>=-1e-11,bb=db>=-1e-11;
  if(aa)outside.push(a);else inside.push(a);
  if(aa!==bb){
   const intersect=lerp(a,b,da/(da-db));
   outside.push(intersect);inside.push(intersect);
  }
 }
 return {outside,inside};
}
const triangulate=(poly,kind)=>{
 const faces=[];
 if(poly.length<3)return faces;
 for(let i=1;i+1<poly.length;i++){
  const f={a:V(poly[0]),b:V(poly[i]),c:V(poly[i+1]),kind};
  if(area(f)>1e-12)faces.push(f);
 }
 return faces;
};
/** Subtract open YZ rectangle, keeping all original triangle fragments. */
export function subtractR95WallWindow(face,box){
 if(!face||![face.a,face.b,face.c].every(x=>
  Array.isArray(x)&&x.length===3&&x.every(Number.isFinite))||
  !box||!(box.yMin<box.yMax&&box.zMin<box.zMax))
  fail('VALID_FACE_AND_RECTANGLE_REQUIRED');
 if(!face.kind.endsWith('_inner'))fail('ONLY_SOURCE_INNER_WALL_CAN_BE_CUT');
 const p=[face.a,face.b,face.c];
 if(Math.max(...p.map(q=>q[1]))<=box.yMin||
  Math.min(...p.map(q=>q[1]))>=box.yMax||
  Math.max(...p.map(q=>q[2]))<=box.zMin||
  Math.min(...p.map(q=>q[2]))>=box.zMax)
  return {faces:[face],cut:false};
 let inner=p,fragments=[];
 for(const [axis,bound,small] of [
  [1,box.yMin,true],[1,box.yMax,false],
  [2,box.zMin,true],[2,box.zMax,false]
 ]){
  const result=splitPolygon(inner,axis,bound,small);
  fragments.push(...triangulate(result.outside,face.kind));
  inner=result.inside;
  if(inner.length<3)break;
 }
 const innerArea=triangulate(inner,face.kind).reduce((s,f)=>s+area(f),0);
 if(innerArea<=1e-11)return {faces:[face],cut:false};
 const expected=area(face)-innerArea;
 const actual=fragments.reduce((s,f)=>s+area(f),0);
 if(Math.abs(actual-expected)>5e-6)
  fail('SOURCE_WALL_SURFACE_AREA_NOT_CONSERVED');
 return {faces:fragments,cut:true,areaRemoved:R(innerArea)};
}
function sourceInnerWallAt(wall,y,z){
 for(const f of wall){
  const [a,b,c]=[f.a,f.b,f.c];
  const orient=(p,q,r)=>
   (q[1]-p[1])*(r[2]-p[2])-(r[1]-p[1])*(q[2]-p[2]);
  const q=[0,y,z],D=orient(a,b,c);
  if(Math.abs(D)<1e-11)continue;
  const weights=[orient(q,b,c)/D,orient(a,q,c)/D,orient(a,b,q)/D];
  if(Math.min(...weights)<-1e-7)continue;
  return V([weights.reduce((s,w,i)=>s+w*[a,b,c][i][0],0),y,z]);
 }
 return null;
}
function headAndSight(foyer,side,wall){
 const eye=[foyer[0],foyer[1]+.08,foyer[2]],
  atrium=[side==='left'?.04:-.04,foyer[1]+.08,foyer[2]];
 const blockers=[];
 for(const f of wall){
  const hit=intersectR81SegmentTriangle(eye,atrium,f);
  if(hit)blockers.push({kind:f.kind,point:hit.point,t:hit.t});
 }
 blockers.sort((a,b)=>a.t-b.t);
 return blockers;
}
/**
 * A daylight slit must occur ONLY at a demonstrably source-blocked view.
 * Create new cap/frame faces connected to actual inner shell YZ samples.
 * Existing R94 gets an alternate display variant; old proofs stay inspectable.
 */
export function buildR95DaylightAtriumVariant(nodes){
 const historic=buildR94RoomEntranceVariant(nodes),
  r93=buildR93ArchitecturalReadingVariant(nodes);
 const old=historic.faces;
 const apertures=[],newFrames=[];
 const originalInner=old.filter(f=>['left_inner','right_inner'].includes(f.kind));
 for(const t of historic.rooms){
  const wall=originalInner.filter(f=>f.kind===t.side+'_inner');
  const from=t.entranceAxisSourceFloor,
   initial=headAndSight(from,t.side,wall);
  if(initial.length===0)
   fail('OPEN_ATRIUM_VIEW_NOT_ACTUALLY_BLOCKED_'+t.side+t.tier);
  const eyeY=from[1]+.08,z=from[2],box={
   yMin:R(eyeY-.038),yMax:R(eyeY+.038),
   zMin:R(z-.048),zMax:R(z+.048)
  };
  const sourceCorner=[
   sourceInnerWallAt(wall,box.yMin,box.zMin),
   sourceInnerWallAt(wall,box.yMin,box.zMax),
   sourceInnerWallAt(wall,box.yMax,box.zMax),
   sourceInnerWallAt(wall,box.yMax,box.zMin)
  ];
  if(sourceCorner.some(x=>!x))fail('DAYLIGHT_OPENING_CANNOT_ATTACH_TO_REAL_INNER_WALL');
  const sign=t.side==='left'?-1:1;
  for(let i=0;i<4;i++){
   const a=sourceCorner[i],b=sourceCorner[(i+1)%4];
   // Open solid void; frames splay back toward the occupied wing.
   const liftA=V([a[0]+sign*.012,a[1],a[2]]),
    liftB=V([b[0]+sign*.012,b[1],b[2]]);
   quad(newFrames,a,b,liftB,liftA,
    t.side+'_R95_SOURCE_SAMPLED_DAYLIGHT_REVEAL_NOT_STRUCTURE');
  }
  apertures.push({side:t.side,tier:t.tier,box,
   sourceBlockedSightlines:initial.length,
   originalFirstBlocker:initial[0].kind,
   sourceCoordinates:from,
   originalInnerWallCorners:sourceCorner,
   solarPerformanceNotCalculated:true,
   apertureCannotCertifyHumanPassage:true});
 }
 let replacedSourceTriangles=0,retainedInnerOriginal=0;
 const clipped=[];
 for(const f of old){
  if(!['left_inner','right_inner'].includes(f.kind)){clipped.push(f);continue}
  let parts=[f],cut=false;
  for(const opening of apertures.filter(q=>f.kind===q.side+'_inner')){
   const next=[];
   for(const part of parts){
    const result=subtractR95WallWindow(part,opening.box);
    next.push(...result.faces);cut ||= result.cut;
   }
   parts=next;
  }
  if(cut)replacedSourceTriangles++;else retainedInnerOriginal++;
  clipped.push(...parts);
 }
 const after=clipped.filter(f=>['left_inner','right_inner'].includes(f.kind));
 const proofs=apertures.map(q=>{
  const p=q.sourceCoordinates;const first=headAndSight(p,q.side,after);
  const zDelta=[-.02,0,.02],levels=[.068,.08,.092];
  let totalProbes=0,passed=0;
  for(const dz of zDelta)for(const height of levels){
   const at=[p[0],p[1]+height,p[2]+dz],
    dst=[q.side==='left'?.04:-.04,p[1]+height,p[2]+dz];
   const hit=after.some(f=>f.kind===q.side+'_inner'&&
    intersectR81SegmentTriangle(at,dst,f));
   totalProbes++;if(!hit)passed++;
  }
  return {...q,postCutInnerHullSightHits:first.length,
   sightlineProbes:totalProbes,unobstructedSamples:passed,
   actualGlazingAndDaylightNotValidated:true};
 });
 if(proofs.some(p=>p.postCutInnerHullSightHits>0||
   p.unobstructedSamples!==p.sightlineProbes))
  fail('CENTRAL_ATRIUM_VIEW_STILL_WALL_BLOCKED');
 // R95 limited vertical headroom *probe* from the actual R94 doorway,
 // not a swept-person volume or an architectural headroom certificate.
 const headroomChecks=historic.rooms.map(q=>{
  const p=q.entranceAxisSourceFloor,
   hull=old.filter(f=>f.kind===q.side+'_inner'||
    f.kind===q.side+'_outer'||f.kind===q.side+'_crown'||
    f.kind==='sky_lounge_glass');
  let nearest=null,kind=null;
  for(const f of hull){
   const hit=intersectR81SegmentTriangle(
    [p[0],p[1]+.008,p[2]],[p[0],p[1]+.34,p[2]],f);
   if(hit&&(!nearest||hit.point[1]<nearest[1])){
    nearest=hit.point;kind=f.kind;
   }
  }
  return {side:q.side,tier:q.tier,
   probeExtentNormalized:.34,
   firstVerticalSurfaceDistanceNormalized:nearest?
    R(nearest[1]-p[1]):null,
   firstVerticalBlockerKind:kind,
   noHitWithinProbeRangeDoesNotProveFullHeadroom:true,
   actualBodyVolumeAndRoofSupportUncertified:true};
 });
 const active=[...clipped,...newFrames];
 if(newFrames.length!==56||proofs.length!==7)
  fail('SEVEN_DAYLIGHT_SLOTS_NOT_CREATED');
 return {faces:active,proofs,headroomChecks,
  sourceR94Faces:historic.faces.length,
  replacedOriginalInnerHullTriangleCount:replacedSourceTriangles,
  originalUnaffectedInnerTriangleCount:retainedInnerOriginal,
  addedSplayedRevealFaces:newFrames.length,
  clippedSurfaceTriangleCount:clipped.length,
  wholeAtriumPreviewTriangles:active.length,
  certifiedPublicSightlineQuality:false,
  physicalSunlightIlluminationLuxMeasured:false,
  structuralCapacityOfCutWallVerified:false,
  buildingScaleAndSunlightUnknown:true,
  originalHistoricalR94PreservedSeparately:true,
  independentHumanAestheticReview:'NOT_REVIEWED'};
}
export function prepareR95DaylightReview(args={}){
 const {r94Evidence,...prior}=args;
 const checked=prepareR94DoorwayReview(prior);
 if(!r94Evidence||r94Evidence.schema!==R94_SCHEMA||
  JSON.stringify(checked)!==JSON.stringify(r94Evidence))
  fail('R94_FULL_EVIDENCE_MISMATCH');
 if(typeof args.raw!=='string'||digest(args.raw)!==args.expectedRawSha256)
  fail('HISTORIC_FROZEN_SOURCE_HASH_MISMATCH');
 const {faces,...study}=buildR95DaylightAtriumVariant(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:checked.oldB143Status,r94EvidenceStrictlyValidated:true,
  ...study,modelCalls:0,worldReads:0,worldWrites:0,safety:safe()};
}
function obj(faces){
 const out=['# R95: source-clipped seven daylight windows, history intact.',
 '# No verified sunlight, structural safety, headroom or human walking.'];
 let last=null,index=1;
 for(const f of faces){
  if(f.kind!==last){last=f.kind;out.push('g '+f.kind.replace(/[^a-zA-Z0-9_]/g,'_'))}
  for(const p of [f.a,f.b,f.c])out.push('v '+p.join(' '));
  out.push('f '+index+' '+(index+1)+' '+(index+2));index+=3;
 }
 return out.join('\n')+'\n';
}

/** Static four-angle projection of the TRUE active mesh (not generated art). */
function projectionR95(faces,angle,elevation,name){
 const A=angle*Math.PI/180,E=elevation*Math.PI/180;
 const p=v=>{
  const d=Math.sin(A)*v[0]+Math.cos(A)*v[2];
  return [Math.cos(A)*v[0]-Math.sin(A)*v[2],
   Math.cos(E)*v[1]-Math.sin(E)*d,
   Math.sin(E)*v[1]+Math.cos(E)*d];
 };
 const show=faces.filter((f,i)=>f.kind.includes('R95')||
  (f.kind.endsWith('_inner')&&i%3===0)||i%9===0)
  .map(f=>({kind:f.kind,verts:[f.a,f.b,f.c].map(p)}));
 const xs=show.flatMap(f=>f.verts.map(v=>v[0])),
  ys=show.flatMap(f=>f.verts.map(v=>v[1]));
 const midX=(Math.min(...xs)+Math.max(...xs))/2,
  midY=(Math.min(...ys)+Math.max(...ys))/2,
  scale=Math.min(740/(Math.max(...xs)-Math.min(...xs)),
   475/(Math.max(...ys)-Math.min(...ys)));
 show.sort((a,b)=>a.verts.reduce((z,x)=>z+x[2],0)-
  b.verts.reduce((z,x)=>z+x[2],0));
 const color=k=>k.includes('R95')?'#f8bc67':
  k==='left_inner'?'#3a6c92':k==='right_inner'?'#445a87':
  k.startsWith('left')?'#7da0af':k.startsWith('right')?'#8b9ba9':'#b7c6c9';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 555">'+
  '<rect width="820" height="555" fill="#edf3f6"/>'+
  show.map(f=>'<polygon points="'+f.verts.map(v=>
   (410+(v[0]-midX)*scale).toFixed(1)+','+
   (290-(v[1]-midY)*scale).toFixed(1)).join(' ')+
   '" fill="'+color(f.kind)+'" stroke="#2e495c" stroke-width=".35"'+
   ' opacity="'+(f.kind.includes('glass')?.28:.91)+'"/>').join('')+
  '<text x="20" y="36" font-family="system-ui" font-size="18" fill="#1d3749">'+enc(name)+
  ' — R95 active preview, non-certified</text></svg>';
}
export function writeR95DaylightReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())fail('EXISTING_SAFE_REVIEW_DIR_REQUIRED');
 const base='R95_SEVEN_SOURCE_DAYLIGHT_PORTALS',
  files=[base+'_EVIDENCE.json',base+'_ARCHITECTURE.obj',
   base+'_REVIEW.html'].map(p=>path.join(destination,p));
 if(files.some(p=>fs.existsSync(p)))fail('DO_NOT_OVERWRITE');
 const proof=prepareR95DaylightReview(args);
 const study=buildR95DaylightAtriumVariant(args.r80Evidence.conceptualRouteNodes);
 const pictures=[['FRONT',0,12],['OBLIQUE',35,25],['SIDE',90,15],['AERIAL',35,70]]
  .map(([name,az,el])=>'<figure><figcaption>'+name+'</figcaption>'+
   projectionR95(study.faces,az,el,name)+'</figure>').join('');
 const rows=proof.proofs.map(q=>'<tr><td>'+enc(q.side)+'</td><td>'+q.tier+
  '</td><td>'+q.sourceBlockedSightlines+'</td><td>'+
  q.postCutInnerHullSightHits+'</td><td>'+q.unobstructedSamples+'/'+q.sightlineProbes+
  '</td></tr>').join('');
 const h='<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
 '<title>R95 Atrium Light Apertures — Research</title>'+
 '<style>body{font:15px/1.7 system-ui;margin:24px auto;max-width:1200px;padding:0 18px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #adbcca;padding:8px}.views{display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:18px}.views svg{width:100%;border:1px solid #9cb0bd}</style>'+
 '<h1>R95：七つの書架室から中央吹抜けへ、実内壁を切り抜く採光開口</h1>'+
 '<p>R94旧モデルでは入口・座席からの視線を7室の内壁がすべて遮っていた。'+
 '元R79内壁の実三角形をY/Z長方形窓で切り分け、窓内に穴を残し、'+
 '源内壁の座標に一致する折り込み縁を構成する。これはR94を変更せず新比較用モデルだけを制作したもの。</p>'+
 '<p>頭上方向0.34正規化単位までの7室の限定検査では、'+
 proof.headroomChecks.filter(q=>q.firstVerticalSurfaceDistanceNormalized!==null).length+
 '室で外殻に交差しました。交差しなかった部屋も実有効高さの証明ではありません。</p>'+
 '<p>R94元 '+proof.sourceR94Faces+'面、変更した源内壁 '+proof.replacedOriginalInnerHullTriangleCount+
 '面、窓枠 '+proof.addedSplayedRevealFaces+'面、改修形 '+proof.wholeAtriumPreviewTriangles+'面。</p>'+
 '<div class="views">'+pictures+'</div>'+ 
 '<table><tr><th>翼</th><th>層</th><th>元内壁への視線交差</th><th>改修後の中央視線交差</th><th>局所9本光線中の開放</th></tr>'+
 rows+'</table><p><a href="'+base+'_ARCHITECTURE.obj">窓の空洞がある全館3D OBJ</a> ／'+
 '<a href="R94_READING_ROOM_TRUE_TERRACE_ENTRY_ARCHITECTURAL_REVIEW.html">R94元の入口研究</a> ／'+
 '<a href="R93_ORIGINAL_SEVEN_LONG_READING_GALLERIES_FIVE_VIEW.html">旧5視点図</a></p>'+
 '<p>明るさ、日射量、ガラス、雨水、風、外殻の構造支持、避難・人間歩行・頭上安全・美術合格は未認証。'+
 '全照明・衝突ボリュームを調べたことにはならない。</p>'+
 '<p>NOT_PREPARED / BLOCKED×9 / BuildPlan空 / Qwen0 / Minecraft接続0 / NOT_REVIEWED</p></html>';
 fs.writeFileSync(files[0],JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(files[1],obj(study.faces),{flag:'wx'});
 fs.writeFileSync(files[2],h,{flag:'wx'});
 return {relativeFile:path.basename(files[2]),
  activeTriangles:proof.wholeAtriumPreviewTriangles,openings:proof.proofs.length,
  modelCalls:0,worldWrites:0};
}
