/**
 * R93: replace tiny, isolated reading-room markers with architectural
 * LONGITUDINAL program bays rooted in the existing contiguous source
 * terrace triangles. Art-first parametric study, never construction.
 * R92 active mesh is an immutable exact prefix.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR92WholeLibraryAtlas,prepareR92WholeLibraryReview,
 SCHEMA as R92_SCHEMA} from './b198zr92-whole-library-circulation-atlas.mjs';
import {buildR84MultilevelResearch} from './b198zr84-multilevel-bookstack-review.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr93-contiguous-reading-arcades-v1';
const fail=s=>{throw Error('B198ZR93_'+s)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const round=n=>+n.toFixed(7);
const V=p=>p.map(round);
const interpolate=(a,b,t)=>V(a.map((x,i)=>x+(b[i]-x)*t));
const difference=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=f=>Math.hypot(...cross(difference(f.b,f.a),difference(f.c,f.a)))/2;
const center=f=>[f.a,f.b,f.c].reduce((acc,p)=>acc.map((x,i)=>x+p[i]/3),[0,0,0]);
const uplift=(p,h)=>V([p[0],p[1]+h,p[2]]);
const tri=(arr,a,b,c,kind)=>arr.push({a:V(a),b:V(b),c:V(c),kind});
const quad=(arr,a,b,c,d,k)=>{tri(arr,a,b,c,k);tri(arr,a,c,d,k)};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const matching=(p,q)=>p.every((x,i)=>Math.abs(x-q[i])<1e-8);
const sharedEdge=(a,b)=>{
 let count=0;
 for(const p of [a.a,a.b,a.c])
  if([b.a,b.b,b.c].some(q=>matching(p,q)))count++;
 return count>=2;
};
const validTerrace=(face,t,origin)=>{
 if(face.kind!==t.side+'_reading_terrace')return false;
 const c=center(face);
 return Math.abs(c[2]-origin[2])<=.18&&Math.abs(c[1]-origin[1])<=.028;
};
/** BFS through REAL R79 adjacent triangular reading-floor facets. */
export function selectR93ContiguousFloor(r84,t){
 if(!r84||!Array.isArray(r84.faces)||!t||
  !Number.isInteger(t.triangleIndex))fail('SOURCE_R84_TIER_REQUIRED');
 const originFace=r84.faces[t.triangleIndex];
 if(!originFace||originFace.kind!==t.side+'_reading_terrace')
  fail('SOURCE_ROOM_MUST_BE_ORIGINAL_READING_TERRACE');
 const origin=center(originFace);
 const nearby=r84.faces.map((f,i)=>({f,i}))
  .filter(x=>validTerrace(x.f,t,origin));
 const collected=new Set([t.triangleIndex]),queue=[t.triangleIndex];
 while(queue.length&&collected.size<14){
  const index=queue.shift();
  for(const item of nearby){
   if(collected.has(item.i)||!sharedEdge(r84.faces[index],item.f))continue;
   collected.add(item.i);queue.push(item.i);
   if(collected.size>=14)break;
  }
 }
 const indices=[...collected].sort((a,b)=>a-b),
  floors=indices.map(i=>r84.faces[i]);
 const sourceArea=floors.reduce((v,f)=>v+area(f),0);
 if(indices.length<8||sourceArea<.05||
  !indices.includes(t.triangleIndex))
  fail('MEANINGFUL_CONTIGUOUS_SOURCE_READING_FLOOR_MISSING');
 const zMin=Math.min(...floors.flatMap(f=>[f.a[2],f.b[2],f.c[2]])),
  zMax=Math.max(...floors.flatMap(f=>[f.a[2],f.b[2],f.c[2]]));
 return {side:t.side,tier:t.tier,sourceFaceIndices:indices,
  sourceTriangles:indices.length,sourceNormalizedArea:round(sourceArea),
  originalTriangleArea:round(area(originFace)),
  longitudinalRange:[round(zMin),round(zMax)],
  coreStationRange:[round(origin[2]-.135),round(origin[2]+.135)],
  floors};
}
function sectionAtZ(floors,z){
 const hits=[];
 for(const f of floors){
  for(const [a,b] of [[f.a,f.b],[f.b,f.c],[f.c,f.a]]){
   const dz=b[2]-a[2];if(Math.abs(dz)<1e-9)continue;
   const t=(z-a[2])/dz;
   if(t>=-1e-8&&t<=1+1e-8)
    hits.push(interpolate(a,b,Math.max(0,Math.min(1,t))));
  }
 }
 hits.sort((a,b)=>a[0]-b[0]);
 const dedup=[];
 for(const p of hits)if(!dedup.some(q=>Math.abs(q[0]-p[0])<1e-7))
  dedup.push(p);
 if(dedup.length<2)return null;
 const inn=dedup.reduce((a,b)=>Math.abs(a[0])<Math.abs(b[0])?a:b);
 const out=dedup.reduce((a,b)=>Math.abs(a[0])>Math.abs(b[0])?a:b);
 if(Math.abs(out[0]-inn[0])<.13)return null;
 return {inner:inn,outer:out};
}
const roof=(side,z)=>side==='left'?.83-.065*(z+.28)**2:
 .98-.095*(z-.17)**2;
const FURNITURE=f=>f.kind.includes('_R87_BOOK_WALL')||
 f.kind.includes('_R87_RISING_SAIL_FIN')||
 f.kind.includes('_R87_PRISMATIC_BOOK_FIN')||
 f.kind.includes('_R87_READING_TABLE');
const intersectsRoomFurniture=(a,b,faces)=>{
 for(const f of faces){
  if(!FURNITURE(f))continue;
  if(intersectR81SegmentTriangle(a,b,f))return true;
 }
 return false;
};
/** Four visibly LONG architectural bays per tier; no generic style policy. */
export function designR93LongGallery(r84,t,activeR92Faces){
 const source=selectR93ContiguousFloor(r84,t);
 const [z0,z1]=source.coreStationRange;
 const width=z1-z0;
 if(width<.25)fail('LONGITUDINAL_READING_BAY_TOO_SHORT');
 const stations=[];
 for(let k=0;k<5;k++){
  const z=round(z0+.012+(width-.024)*k/4),
   section=sectionAtZ(source.floors,z);
  if(!section)fail('REAL_TERRACE_CROSS_SECTION_MISSING');
  const innerSeat=interpolate(section.inner,section.outer,.63),
   shelf=interpolate(section.inner,section.outer,.87);
  // Preserve the public central void: furnishings stay inside wing material.
  if([innerSeat,shelf].some(p=>t.side==='left'?p[0]>-.4:p[0]<.4))
   fail('PRESERVED_PUBLIC_ATRIUM_INTRUSION');
  const highShelf=uplift(shelf,t.side==='left'?.067:.078),
   canopy=uplift(innerSeat,t.side==='left'?.093:.106);
  if(Math.max(highShelf[1],canopy[1])>roof(t.side,z)-.09)
   fail('EXTERIOR_CROWN_CLEARANCE_INVALID');
  stations.push({z,innerSeat,shelf,highShelf,canopy});
 }
 const faces=[],warnings=[],openBays=[];
 for(let k=0;k<4;k++){
  const a=stations[k],b=stations[k+1],
   kind=t.side+'_R93_';
  const shelfFaces=[],studyRays=[
   [uplift(a.innerSeat,.018),uplift(b.innerSeat,.018)],
   [uplift(a.shelf,.018),uplift(b.shelf,.018)],
   [a.highShelf,b.highShelf],[a.canopy,b.canopy]
  ];
  if(studyRays.some(([start,end])=>
   intersectsRoomFurniture(start,end,activeR92Faces))){
   warnings.push('BAY_'+k+'_REJECTED_BY_PREEXISTING_ROOM_FURNITURE');
   openBays.push({index:k,status:'NOT_EMITTED_DUE_TO_SOURCE_FURNITURE'});
   continue;
  }
  // Long outer bookwall gives the wing legibility as a library from afar.
  quad(shelfFaces,a.shelf,b.shelf,b.highShelf,a.highShelf,
   kind+(t.side==='left'?'SAIL_BOOKWALL':'LANTERN_BOOKWALL')+'_NOT_CERTIFIED');
  // A continuous suspended translucent canopy follows the true floor's
  // smooth rises, open toward the air atrium and toward the interior.
  quad(shelfFaces,a.highShelf,b.highShelf,b.canopy,a.canopy,
   kind+(t.side==='left'?'SWEEPING_SAIL_CANOPY':'ANGLED_LANTERN_CANOPY')+'_ART_STUDY');
  // Functional architecture *research* expression: longitudinal seat ledge.
  quad(shelfFaces,uplift(a.innerSeat,.018),uplift(b.innerSeat,.018),
   uplift(b.shelf,.018),uplift(a.shelf,.018),
   kind+'CONTINUOUS_READING_SEAT_LEDGE_NOT_OCCUPANCY_CERTIFIED');
  if(shelfFaces.some(f=>!Number.isFinite(area(f))||area(f)<1e-10))
   fail('ZERO_AREA_ACTUAL_BUILDING_STUDY_FACE');
  faces.push(...shelfFaces);
  openBays.push({index:k,status:'FINITE_FLOOR_DERIVED_GALLERY_STUDY',
   triangles:shelfFaces.length});
 }
 return {source:{...source,floors:undefined},
  faces,stations,openBays,
  selectedConnectedFloorArea:source.sourceNormalizedArea,
  sourceFloorNormalizedAreaPerParent:round(
   source.sourceNormalizedArea/source.originalTriangleArea),
  actualLongitudinalDesignSpan:round(width-.024),
  designTriangles:faces.length,
  emittedLongitudinalBays:openBays.filter(x=>x.triangles).length,
  warnings,sourceAtriumFootprintProtected:true,
  humanOccupancyCertified:false,
  localStudyRoofMarginChecked:true,
  allPointReferencesOriginalTerrace:true};
}
export function buildR93ArchitecturalReadingVariant(nodes){
 const r92=buildR92WholeLibraryAtlas(nodes),
  r84=buildR84MultilevelResearch(nodes),
  newFaces=[],levels=[];
 for(const t of r84.tiers){
  const one=designR93LongGallery(r84,t,r92.faces);
  newFaces.push(...one.faces);
  const {faces,stations,...metadata}=one;
  levels.push({...metadata,stationSamples:stations,
   sourceAreaFromRealR79Triangles:true});
 }
 if(levels.length!==7||
  levels.reduce((s,x)=>s+x.emittedLongitudinalBays,0)<20)
  fail('ARCHITECTURAL_FLOOR_PROGRAM_UNDERBUILT');
 const faces=[...r92.faces,...newFaces];
 return {faces,levels,
  sourceR92Faces:r92.faces.length,
  realOriginalFloorFacetsReferenced:levels.reduce((n,v)=>
   n+v.source.sourceTriangles,0),
  newMultiBayBookGalleryTriangles:newFaces.length,
  longitudinalRoomsWithArchitecture:levels.filter(x=>x.designTriangles>0).length,
  totalEmittedBays:levels.reduce((n,v)=>n+v.emittedLongitudinalBays,0),
  totalOriginalConnectedRoomFloorArea:round(levels.reduce((s,r)=>
   s+r.selectedConnectedFloorArea,0)),
  sourceArchitectureR92Unchanged:true,
  certifiedFloorPaths:0,independentVisualReview:'NOT_REVIEWED',
  realWorldRoomAreaAndHeadroomUnproven:true};
}
export function prepareR93ReadingGalleryReview(args={}){
 const {r92Evidence,...old}=args;
 const validated=prepareR92WholeLibraryReview(old);
 if(!r92Evidence||r92Evidence.schema!==R92_SCHEMA||
  JSON.stringify(r92Evidence)!==JSON.stringify(validated))
  fail('R92_COMPLETE_EVIDENCE_MISMATCH');
 if(typeof args.raw!=='string'||sha(args.raw)!==args.expectedRawSha256)
  fail('FROZEN_ORIGINAL_SHA_MISMATCH');
 const {faces,...record}=buildR93ArchitecturalReadingVariant(
  args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:validated.oldB143Status,
  r92ProvenanceFullyRevalidated:true,...record,
  modelCalls:0,worldReads:0,worldWrites:0,
  safety:safety()};
}
function obj(faces){
 const lines=['# R93: original R92 active model, plus 7 connected floor based reading arcades.',
 '# This OBJ is not construction, real-life dimensions or certified access'];
 let n=1,k=null;
 for(const f of faces){
  if(f.kind!==k){k=f.kind;lines.push('g '+k.replace(/[^a-zA-Z0-9_]/g,'_'))}
  for(const p of [f.a,f.b,f.c])lines.push('v '+p.join(' '));
  lines.push('f '+n+' '+(n+1)+' '+(n+2));n+=3;
 }
 return lines.join('\n')+'\n';
}
function svg(faces,az,el,label){
 const A=az*Math.PI/180,E=el*Math.PI/180;
 const project=p=>{
  const d=Math.sin(A)*p[0]+Math.cos(A)*p[2];
  return [Math.cos(A)*p[0]-Math.sin(A)*p[2],
   Math.cos(E)*p[1]-Math.sin(E)*d,
   Math.sin(E)*p[1]+Math.cos(E)*d];
 };
 const shown=faces.filter((f,i)=>f.kind.includes('R93')||
   f.kind.includes('R92')||i%7===0)
  .map(f=>({k:f.kind,p:[f.a,f.b,f.c].map(project)}));
 const xs=shown.flatMap(f=>f.p.map(p=>p[0])),
  ys=shown.flatMap(f=>f.p.map(p=>p[1]));
 const scale=Math.min(770/(Math.max(...xs)-Math.min(...xs)),
  505/(Math.max(...ys)-Math.min(...ys)));
 const cx=(Math.max(...xs)+Math.min(...xs))/2,
  cy=(Math.max(...ys)+Math.min(...ys))/2;
 const color=k=>k.includes('R93')?
  (k.includes('left')?'#e7b779':'#e5b18f'):
  k.includes('R92')?'#cab98c':k.includes('right')?'#8096b3':
  k.includes('left')?'#658ca5':'#abb9be';
 shown.sort((a,b)=>a.p.reduce((n,x)=>n+x[2],0)-
  b.p.reduce((n,x)=>n+x[2],0));
 const shapes=shown.map(f=>'<polygon points="'+f.p.map(p=>
  (420+(p[0]-cx)*scale).toFixed(1)+','+
  (290-(p[1]-cy)*scale).toFixed(1)).join(' ')+
  '" fill="'+color(f.k)+'" stroke="#263849" stroke-width=".35"'+
  ' opacity="'+(f.k.includes('glass')?.25:.91)+'"/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 590">'+
  '<rect width="840" height="590" fill="#eaf1f5"/>'+shapes+
  '<text x="20" y="35" font-family="system-ui" font-size="20" fill="#243a54">'+esc(label)+'</text></svg>';
}
export function writeR93ReadingGalleryReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('SAFE_EXISTING_REVIEW_FOLDER_REQUIRED');
 const base='R93_ORIGINAL_SEVEN_LONG_READING_GALLERIES';
 const j=path.join(destination,base+'_EVIDENCE.json'),
  o=path.join(destination,base+'_ARCHITECTURE.obj'),
  h=path.join(destination,base+'_FIVE_VIEW.html');
 if([j,o,h].some(x=>fs.existsSync(x)))fail('NO_OVERWRITE');
 const audit=prepareR93ReadingGalleryReview(args);
 const built=buildR93ArchitecturalReadingVariant(args.r80Evidence.conceptualRouteNodes);
 const views=[['FRONT',0,12],['OBLIQUE',35,25],['SIDE',90,15],
  ['AERIAL',35,70],['ATRIUM-TO-GALLERY',0,2]]
  .map(([name,az,el])=>'<figure><figcaption>'+name+'</figcaption>'+
    svg(built.faces,az,el,name)+'</figure>').join('');
 const rows=audit.levels.map(t=>'<tr><td>'+t.source.side+'</td><td>'+
  t.source.tier+'</td><td>'+t.source.sourceTriangles+'</td><td>'+
  t.selectedConnectedFloorArea.toFixed(4)+'</td><td>'+
  t.emittedLongitudinalBays+'</td><td>'+esc(t.warnings.join(' / ')||'局所未承認面の拒否なし')+
  '</td></tr>').join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
 '<title>R93 7 Long Reading Galleries</title>'+
 '<style>body{font:15px/1.75 system-ui;color:#24394c;max-width:1400px;margin:25px auto;padding:0 18px}figure{margin:0}.views{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:22px}svg{width:100%;border:1px solid #aabac8}table{border-collapse:collapse;width:100%}td,th{border:1px solid #b6c5d2;padding:8px}</style>'+
 '<h1>R93 空間として長く連なる7つの閲覧室：左右異なる光の図書館</h1>'+
 '<p>R92の4,306面はそのまま保持し、元R79の連続した9枚ほどの閲覧テラス三角形を各層で追跡。'+
 '外殻側に長い書架、上部に帆／灯籠の採光形態、床面から読書用の連続ベンチを作る。'+
 '中央の吹抜けは残し、本物の屋根高さと有限面積の局所確認を実施した研究用建築。</p>'+
 '<p>元の連続テラス面 '+audit.realOriginalFloorFacetsReferenced+'、新規'+
 audit.newMultiBayBookGalleryTriangles+'三角形。幅と長さは正規化値であり実世界面積ではない。</p>'+
 '<div class="views">'+views+'</div>'+
 '<table><tr><th>翼</th><th>層</th><th>源三角形</th><th>床の正規化面積</th><th>長い閲覧ベイ</th><th>警告</th></tr>'+
 rows+'</table><p><a href="'+base+'_ARCHITECTURE.obj">全館3D研究モデル</a> ／'+
 '<a href="R92_ENTRANCE_SEVEN_ROOMS_LOUNGE_REVIEW.html">旧全館4視点</a></p>'+
 '<p>これは巨大未来図書館のc01個別美術研究であり、Minecraft施工、実LLM生成、人体有効幅、'+
 '耐荷重、床支持・階段の使用安全、独立美術評価はすべて未認証。'+
 'NOT_PREPARED / BLOCKED×9 / BuildPlan空 / Qwen0 / World操作0 / NOT_REVIEWED。</p></html>';
 fs.writeFileSync(j,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(o,obj(built.faces),{flag:'wx'});
 fs.writeFileSync(h,html,{flag:'wx'});
 return {relativeFile:path.basename(h),rooms:audit.longitudinalRoomsWithArchitecture,
  faces:audit.newMultiBayBookGalleryTriangles,modelCalls:0,worldWrites:0};
}
