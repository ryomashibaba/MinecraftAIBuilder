/**
 * R87: a reversible, original seven-room architecture study ON source terraces.
 * West = stepped sail-reading coves; east = vertical lantern book galleries.
 * NO model inference, real-world scale, Minecraft execution or walking certificate.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR84MultilevelResearch} from './b198zr84-multilevel-bookstack-review.mjs';
import {buildR86Candidate3D,prepareR86DeckReview,SCHEMA as R86_SCHEMA}
 from './b198zr86-finite-width-deck-study.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr87-seven-reading-room-architecture-v1';
const fail=s=>{throw Error('B198ZR87_'+s)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const R=x=>+x.toFixed(7);
const V=p=>p.map(R);
const mid=(a,b,t)=>V(a.map((v,i)=>v+(b[i]-v)*t));
const centroid=f=>[f.a,f.b,f.c].reduce((s,p)=>s.map((n,i)=>n+p[i]/3),[0,0,0]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
 a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const area=f=>Math.hypot(...cross(sub(f.b,f.a),sub(f.c,f.a)))/2;
const yplus=(p,y)=>V([p[0],p[1]+y,p[2]]);
const tri=(out,a,b,c,kind)=>out.push({a:V(a),b:V(b),c:V(c),kind});
const quad=(out,a,b,c,d,k)=>{tri(out,a,b,c,k);tri(out,a,c,d,k)};
const enc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});
const hull=new Set(['left_outer','left_inner','left_crown','left_end',
 'right_outer','right_inner','right_crown','right_end','sky_lounge_glass']);
function clearance(a,b,faces){
 let hits=0;
 for(const f of faces)if(hull.has(f.kind)&&intersectR81SegmentTriangle(a,b,f))hits++;
 return hits;
}
function roof(side,z){
 return side==='left'?.83-.065*(z+.28)**2:.98-.095*(z-.17)**2;
}
/** Pure architectural component geometry. No hidden PASS implied. */
export function designR87StudyBay(parent,side,tier,faces=[]){
 if(!parent||parent.kind!==side+'_reading_terrace'||
  !['left','right'].includes(side)||!Number.isInteger(tier)||
  tier<0||tier>(side==='left'?2:3)||
  !Array.isArray(faces))fail('ORIGINAL_TERRACE_AND_TIER_REQUIRED');
 const base=[parent.a,parent.b,parent.c],baseArea=area(parent),c=centroid(parent);
 if(!base.every(p=>p.length===3&&p.every(Number.isFinite))||
  baseArea<1e-6)fail('SOURCE_FACE_DEGENERATE');
 const out=[],reasons=[],program=side==='left'?'SAIL_READING_COVE':'LANTERN_BOOK_GALLERY';
 // Every overlay foot point is in its parent real R79 terrace triangle.
 const site=base.map(p=>V(p.map((v,i)=>v+(i===1?.0035:0))));
 tri(out,site[0],site[1],site[2],side+'_R87_SOURCE_CONTAINED_ROOM_FLOOR_NOT_CERTIFIED');
 const orientation=side==='left'?-1:1;
 const indexed=[[0,1],[1,2],[2,0]];
 const edge=indexed.toSorted((a,b)=>
  orientation*(base[b[0]][0]+base[b[1]][0]-base[a[0]][0]-base[a[1]][0]))[0];
 const a=site[edge[0]],b=site[edge[1]];
 const z=c[2],ceilingRoom=roof(side,z)-c[1];
 const designHeight=Math.min(side==='left'?.071+tier*.009:.093+tier*.006,
  ceilingRoom-.04);
 if(designHeight<.035)reasons.push('ROOF_OR_LEVEL_CLEARANCE_TOO_SMALL');
 // The original building void stays open; new furnishing does not go outside
 // the source terrace footprint in plan. Source terrace may extend to x=.3.
 if(base.some(p=>side==='left'?p[0]>=-.285:p[0]<=.285))
  reasons.push('CENTRAL_PUBLIC_ATRIUM_CORE_NOT_GUARANTEED');
 const shell=faces.filter(f=>hull.has(f.kind));
 const upperA=yplus(a,Math.max(0,designHeight)),upperB=yplus(b,Math.max(0,designHeight));
 const capCenter=yplus(mid(a,b,.5),Math.max(0,designHeight)*.92);
 const segments=[[a,upperA],[b,upperB],[upperA,upperB],
  [a,capCenter],[b,capCenter]];
 let blocked=0;
 for(const [p,q] of segments)blocked+=clearance(p,q,shell);
 if(blocked)reasons.push('ORIGINAL_HULL_OR_ROOF_INTERSECTS_BOOKSHELVES');
 if(reasons.length===0){
  // Facing the OUTBOARD shell: patterned solid panels and slanted ribs;
  // opposite reading access edge remains unclosed.
  quad(out,a,b,upperB,upperA,side+'_R87_BOOK_WALL');
  if(side==='left'){
   const crown=yplus(mid(a,b,.48),designHeight*1.30);
   const raked=yplus(mid(a,b,.63),designHeight*.34);
   if(clearance(a,crown,shell)+clearance(b,crown,shell)===0){
    tri(out,upperA,crown,raked,'left_R87_RISING_SAIL_FIN');
    tri(out,crown,upperB,raked,'left_R87_RISING_SAIL_FIN');
   }else reasons.push('OPTIONAL_SAIL_PEAK_NOT_EMITTED_HULL');
  }else{
   for(let k=1;k<=3;k++){
    const v=mid(a,b,k/4),top=yplus(v,designHeight*(.6+.12*k));
    const u=mid(a,b,Math.min(1,k/4+.055));
    if(clearance(v,top,shell)===0)
     tri(out,v,yplus(u,.011),top,'right_R87_PRISMATIC_BOOK_FIN');
    else reasons.push('OPTIONAL_LANTERN_FIN_SKIPPED_HULL');
   }
  }
  // Interior triangular shared reading table, inset by barycentric convexity.
  const inner=site.map(p=>mid(p,c,.73));
  const top=inner.map(p=>yplus(p,.018+tier*.002));
  tri(out,top[0],top[1],top[2],side+'_R87_READING_TABLE_NOT_OCCUPANCY');
  // Tiny counter: all legs end on the documented source terrace triangles.
  for(let i=0;i<3;i++)
   quad(out,inner[i],inner[(i+1)%3],top[(i+1)%3],top[i],
    side+'_R87_TABLE_SIDE');
 }
 return {program,sourceArea:R(baseArea),
  floorContainedInSourceTriangle:true,
  furnishingGeometryEmitted:reasons.filter(x=>!x.startsWith('OPTIONAL')).length===0,
  warningCodes:reasons,studyHeadspaceAvailable:R(ceilingRoom),
  designTopHeight:R(Math.max(0,designHeight)),faces:out,
  accessProved:false,sweptCollisionTested:false,
  interiorFurnitureNotConstructionCertified:true};
}
function oculus(){
 const faces=[],C=[.55,.806,.35],N=16;
 for(let i=0;i<N;i++){
  const a=i*2*Math.PI/N,b=(i+1)*2*Math.PI/N;
  const ring=(t,r)=>V([C[0]+r*Math.cos(t),C[1],
   C[2]+r*Math.sin(t)]);
  quad(faces,ring(a,.080),ring(b,.080),ring(b,.091),ring(a,.091),
   'R87_SKY_LOUNGE_INNER_OCULUS_RING');
  if(i%4===0){
   const p=ring(a,.061),q=ring(a,.092);
   tri(faces,p,q,yplus(mid(p,q,.6),.038),
    'R87_SKY_LOUNGE_TELESCOPE_SEAT_LANDMARK');
  }
 }
 return faces;
}
export function buildR87InteriorStudy(nodes){
 const upstream=buildR86Candidate3D(nodes);
 const r84=buildR84MultilevelResearch(nodes);
 if(upstream.sourceTriangleCount!==r84.faces.length||
  JSON.stringify(upstream.faces.slice(0,r84.faces.length))!==
   JSON.stringify(r84.faces))fail('R84_SOURCE_TRIANGLES_NOT_IDENTICAL');
 const rooms=[],addition=[],used=new Set();
 for(const t of r84.tiers){
  const original=r84.faces[t.triangleIndex];
  if(!original||original.kind!==t.side+'_reading_terrace')
   fail('MISSING_ORIGIN_TERRACE_TRIANGLE');
  const c=centroid(original);
  const neighbors=r84.faces.map((f,i)=>({f,i}))
   .filter(x=>x.f.kind===t.side+'_reading_terrace'&&
    Math.abs(centroid(x.f)[2]-c[2])<=.145&&
    Math.abs(centroid(x.f)[1]-c[1])<=.021)
   .sort((a,b)=>Math.abs(centroid(a.f)[2]-c[2])-
    Math.abs(centroid(b.f)[2]-c[2])||a.i-b.i)
   .slice(0,7);
  if(!neighbors.some(x=>x.i===t.triangleIndex))
   neighbors.unshift({f:original,i:t.triangleIndex});
  const floorOnly=[];
  for(const {f,i} of neighbors){
   const key=t.side+':'+t.tier+':'+i;
   if(used.has(key))continue;
   used.add(key);
   tri(floorOnly,yplus(f.a,.0035),yplus(f.b,.0035),yplus(f.c,.0035),
    t.side+'_R87_CONTIGUOUS_PROGRAM_TERRACE_NOT_WALKABLE');
  }
  const one=designR87StudyBay(original,t.side,t.tier,r84.faces);
  addition.push(...floorOnly,...one.faces);
  rooms.push({side:t.side,tier:t.tier,
   program:one.program,sourceTriangleIndex:t.triangleIndex,
   retainedOriginalLanding:t.reuseR83Landing,
   upstreamR86Status:upstream.decisions.find(d=>d.side===t.side&&d.tier===t.tier)?.status,
   originalRoomParentArea:one.sourceArea,
   researchDeckSegments:floorOnly.length,
   actualNewMeshTriangles:floorOnly.length+one.faces.length,
   furnishingsEmitted:one.furnishingGeometryEmitted,
   warnings:one.warningCodes,
   humanWalkabilityProved:false,supportVerified:false,
   occupancyHeadroomNotVerified:true});
 }
 if(rooms.length!==7||rooms.filter(x=>x.side==='left').length!==3||
  rooms.filter(x=>x.side==='right').length!==4)
  fail('SEVEN_DISTINCT_ARCHITECTURAL_PROGRAM_AREAS_REQUIRED');
 const oculusFaces=oculus();
 addition.push(...oculusFaces);
 const all=[...upstream.faces,...addition];
 // R79's historical glass dome has pole-degenerate inherited faces: preserve
 // them faithfully rather than silently editing frozen upstream source mesh.
 if(addition.some(f=>!Number.isFinite(area(f))||area(f)<1e-9||
  [f.a,f.b,f.c].some(p=>p.some(v=>!Number.isFinite(v)))))
  fail('ZERO_AREA_OR_INVALID_FACET');
 // Proven by ORIGINAL source triangle placement only, not occupant circulation.
 return {faces:all,rooms,upstreamFaces:upstream.faces.length,
  newlyAdded3DResearchFaces:addition.length,oculusTriangles:oculusFaces.length,
  originalR86TrianglesPreserved:true,originalSevenTerraceParentsPreserved:true,
  atriumBaseMeshUnmodified:true,
  createdProgramAreaCount:7,fullyAccessibleReadingRooms:0,
  realArchitecturalAccessibilityApproved:false,structuralLoadVerified:false,
  allRoomFurnitureVerifiedByHuman:false};
}
export function prepareR87InteriorReview(args={}){
 const {r86Evidence,...prior}=args;
 const verified=prepareR86DeckReview(prior);
 if(!r86Evidence||r86Evidence.schema!==R86_SCHEMA||
  JSON.stringify(r86Evidence)!==JSON.stringify(verified))
  fail('R86_COMPLETE_EVIDENCE_RECOMPUTE_MISMATCH');
 if(typeof args.raw!=='string'||sha(args.raw)!==args.expectedRawSha256)
  fail('FROZEN_SOURCE_BYTES_MISMATCH');
 const {faces,...report}=buildR87InteriorStudy(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,status:'ARCHITECTURAL_READING_ROOMS_3D_STUDY_ONLY',
  originalRawSha256:args.expectedRawSha256,
  oldB143Status:verified.oldB143Status,
  r86RecomputedAndAuthenticated:true,...report,
  humanArchitecturalCriteria:'NOT_REVIEWED',
  fullFloorStairEntryLoungeTravelProven:false,
  allSourceUnmodified:true,actualMinecraftPlayerWalkingProven:false,
  modelCalls:0,worldWrites:0,safety:safety()};
}
function toObj(faces){
 const result=['# R87 c01 reading-room art variant ON real R79 terrace triangles.',
  '# Not Minecraft, occupancy certification, or approved structural support.'];
 let i=1,k=null;
 for(const f of faces){
  if(f.kind!==k){k=f.kind;result.push('g '+k.replace(/[^a-zA-Z0-9_]/g,'_'));}
  for(const p of [f.a,f.b,f.c])result.push('v '+p.join(' '));
  result.push('f '+i+' '+(i+1)+' '+(i+2));i+=3;
 }
 return result.join('\n')+'\n';
}
const palette=k=>k.includes('R87_SKY')?'#91c5ce':
 k.includes('left_R87')?'#d7b17c':
 k.includes('right_R87')?'#b8d8d6':
 k.includes('R86')?'#d3b992':
 k.includes('sky_lounge_glass')?'#97cddd':
 k.includes('left_outer')?'#617e91':
 k.includes('right_outer')?'#787ca0':
 k.includes('_inner')?'#3d5269':'#aaafbb';
function svgView(faces,az,el,label){
 const A=az*Math.PI/180,E=el*Math.PI/180;
 const projection=p=>{
  const d=Math.sin(A)*p[0]+Math.cos(A)*p[2];
  return [Math.cos(A)*p[0]-Math.sin(A)*p[2],
   Math.cos(E)*p[1]-Math.sin(E)*d,
   Math.sin(E)*p[1]+Math.cos(E)*d];
 };
 const rendered=faces.filter((f,i)=>f.kind.includes('R87')||
  (i%7===0&&!f.kind.includes('R86')))
 .map(f=>({kind:f.kind,points:[f.a,f.b,f.c].map(projection)}));
 const xs=rendered.flatMap(f=>f.points.map(p=>p[0])),
  ys=rendered.flatMap(f=>f.points.map(p=>p[1]));
 const minX=Math.min(...xs),maxX=Math.max(...xs),
  minY=Math.min(...ys),maxY=Math.max(...ys);
 const scale=Math.min(740/(maxX-minX),485/(maxY-minY));
 const midX=(minX+maxX)/2,midY=(minY+maxY)/2;
 rendered.sort((a,b)=>a.points.reduce((s,p)=>s+p[2],0)-
  b.points.reduce((s,p)=>s+p[2],0));
 const figures=rendered.map(f=>{
  const ps=f.points.map(p=>[
   (420+(p[0]-midX)*scale).toFixed(1),
   (270-(p[1]-midY)*scale).toFixed(1)].join(',')).join(' ');
  return '<polygon points="'+ps+'" fill="'+palette(f.kind)+
   '" stroke="#233746" stroke-width=".38" stroke-opacity=".27" opacity="'+
   (f.kind.includes('glass')?.25:.95)+'"/>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 570">'+
  '<rect width="840" height="570" fill="#eff4f4"/>'+
  figures+'<text x="25" y="35" fill="#253d55" font-family="system-ui" font-size="20">'+
  enc(label)+'</text></svg>';
}
export function writeR87InteriorReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('SAFE_EXISTING_REVIEW_FOLDER_REQUIRED');
 const json=path.join(destination,'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),
  obj=path.join(destination,'R87_SAIL_COVE_LANTERN_GALLERY_ARCHITECTURE.obj'),
  html=path.join(destination,'R87_ROOM_TO_PUBLIC_ROUTE_3D_REVIEW.html');
 if([json,obj,html].some(x=>fs.existsSync(x)))fail('NO_OVERWRITES');
 const audit=prepareR87InteriorReview(args);
 const built=buildR87InteriorStudy(args.r80Evidence.conceptualRouteNodes);
 const headings=[['FRONT',0,12],['OBLIQUE',35,25],
  ['SIDE',90,15],['AERIAL',35,70]];
 const views=headings.map(([t,a,e])=>
  '<figure><figcaption>'+t+'</figcaption>'+
  svgView(built.faces,a,e,t)+'</figure>').join('');
 const rows=audit.rooms.map(r=>'<tr><td>'+enc(r.side)+'</td><td>'+
  r.tier+'</td><td>'+enc(r.program)+'</td><td>'+
  r.researchDeckSegments+'</td><td>'+r.actualNewMeshTriangles+
  '</td><td>'+enc(r.upstreamR86Status??'UNKNOWN')+'</td><td>'+
  enc(r.warnings.join(', ')||'幾何予備検査で追加拒否なし')+
  '</td></tr>').join('');
 const page='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R87 original 3D reading architecture</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:1440px;margin:26px auto;padding:0 20px;color:#263a4d}'+
  '.views{display:grid;grid-template-columns:repeat(auto-fit,minmax(450px,1fr));gap:20px}'+
  'figure{margin:0}svg{width:100%;border:1px solid #bac6cf}figcaption{font-weight:700}'+
  'table{border-collapse:collapse;width:100%}td,th{border:1px solid #b5c4cd;padding:7px}</style>'+
  '<h1>R87 7層の閲覧建築を立体化：左・帆状読書コーブ／右・灯籠書架ギャラリー</h1>'+
  '<p>R84元三角形の上で7層の床面、家具・棚壁、意匠別の立体フレームと、上層ガラスラウンジの内装指標を研究用メッシュ化。'+
  '源三角形の保護と原本SHA照合を維持。追加された研究面数：'+
  audit.newlyAdded3DResearchFaces+'。書架層の形状は実寸や施工設計ではありません。</p>'+
  '<p>閲覧空間7件は明示されていますが、全層の入口からラウンジまでの連続床・階段・頭上・強度・人体幅を証明していません。'+
  '独立美術審査も未実施で、造形合否を自動認定しません。</p>'+
  '<div class="views">'+views+'</div>'+
  '<table><tr><th>翼</th><th>層</th><th>意匠種別</th><th>既存面内床</th><th>新三角形</th><th>R86</th><th>残留懸念</th></tr>'+rows+'</table>'+
  '<p><a href="R87_SAIL_COVE_LANTERN_GALLERY_ARCHITECTURE.obj">3D研究OBJ</a> ／'+
  '<a href="R86_WIDE_DECK_CONCEPT_REVIEW.html">R86 有限幅ルート検討</a></p>'+
  '<p>NOT_PREPARED、9ゲートBLOCKED、実Qwen0、Minecraft操作0、人間品質審査NOT_REVIEWED。</p></html>';
 fs.writeFileSync(json,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(obj,toObj(built.faces),{flag:'wx'});
 fs.writeFileSync(html,page,{flag:'wx'});
 return {relativeFile:path.basename(html),programAreas:7,
  new3DTriangles:audit.newlyAdded3DResearchFaces,
  modelCalls:0,worldWrites:0};
}
