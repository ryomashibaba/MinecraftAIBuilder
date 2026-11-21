/**
 * R94: R93's continuous furniture occupied the REAL R84 entrance zone on
 * seven floors. Intentionally recompose each ACTIVE art-study room: REMOVE
 * two central bays of bookwall/canopy/bench (keeping the R93 source intact),
 * and install a TRUE source-floor doorway/reading foyer with sculpted jambs.
 * Neither graph reachability nor art-floor coverage is safe avatar movement.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR93ArchitecturalReadingVariant,prepareR93ReadingGalleryReview,
 SCHEMA as R93_SCHEMA} from './b198zr93-contiguous-reading-arcades.mjs';
import {buildR84MultilevelResearch} from './b198zr84-multilevel-bookstack-review.mjs';
import {sourceSurfaceAtXZ} from './b198zr90-source-surface-seams.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr94-seven-reading-entrances-v1';
const fail=x=>{throw Error('B198ZR94_'+x)};
const SHA=x=>createHash('sha256').update(x).digest('hex');
const R=x=>+x.toFixed(7),V=p=>p.map(R);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=f=>Math.hypot(...cross(sub(f.b,f.a),sub(f.c,f.a)))/2;
const center=f=>[f.a,f.b,f.c].reduce((n,p)=>n.map((v,i)=>v+p[i]/3),[0,0,0]);
const lift=(p,h)=>V([p[0],p[1]+h,p[2]]);
const tri=(arr,a,b,c,k)=>arr.push({a:V(a),b:V(b),c:V(c),kind:k});
const quad=(arr,a,b,c,d,k)=>{tri(arr,a,b,c,k);tri(arr,a,c,d,k)};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const sourceQuery=(point,faces)=>{
 const q=faces.map(f=>sourceSurfaceAtXZ(point,f))
  .find(s=>s?.containedXZ);
 return q??null;
};
const furniture=f=>f.kind.includes('_R87_BOOK_WALL')||
 f.kind.includes('_R87_RISING_SAIL_FIN')||
 f.kind.includes('_R87_PRISMATIC_BOOK_FIN')||
 f.kind.includes('_R87_READING_TABLE');
/** Visible planimetric gap, not swept avatar-clearance proof. */
export function designR94RoomDoorway(t,room,originalR84){
 if(!t||!room||!originalR84||room.stationSamples?.length!==5)
  fail('ACTUAL_SOURCE_TIER_AND_R93_STATIONS_REQUIRED');
 if(t.side!==room.source.side||t.tier!==room.source.tier)
  fail('MISMATCHED_SOURCE_READING_ROOM');
 const faces=room.source.sourceFaceIndices.map(i=>originalR84.faces[i]);
 if(faces.length!==9||faces.some(f=>f.kind!==t.side+'_reading_terrace'))
  fail('NINE_ORIGINAL_CONTIGUOUS_FLOOR_FACETS_REQUIRED');
 const [lo,mid,hi]=[room.stationSamples[1],room.stationSamples[2],
  room.stationSamples[3]];
 const sourcePad=sourceQuery(t.padCenter,faces);
 if(!sourcePad)fail('ORIGINAL_PAD_OUTSIDE_SOURCE_ROOM_FLOOR');
 if(Math.abs(t.padCenter[2]-mid.z)>1e-6)
  fail('SOURCE_PAD_NOT_AT_CENTRAL_FURNITURE_BAY');
 const clearZ=R(hi.z-lo.z),entryCenter=sourceQuery(mid.innerSeat,faces);
 if(clearZ<.10||!entryCenter)fail('PROPOSED_PASSAGE_NOT_ON_SOURCE_FLOOR');
 const base=[],out=[],metrics=[];
 for(const station of [lo,hi]){
  // Both x positions really lie on the (possibly sloped) original terraces.
  const seat=sourceQuery(station.innerSeat,faces),
   shelf=sourceQuery(station.shelf,faces);
  if(!seat||!shelf)fail('DOOR_JAMBS_NOT_ON_REAL_SOURCE_FLOOR');
  base.push({seat:seat.point,shelf:shelf.point,
   originalElevationDifference:R(
     Math.abs(station.innerSeat[1]-seat.point[1]))});
 }
 const [a,b]=base,side=t.side,kind=side+'_R94_';
 // Low 3D flooring running along the ORIGINAL contiguous reading triangles.
 const A=lift(a.seat,.004),B=lift(a.shelf,.004),
  C=lift(b.shelf,.004),D=lift(b.seat,.004);
 quad(out,A,B,C,D,kind+'UNFURNISHED_TRUE_TERRACE_THRESHOLD_NOT_WALKABLE');
 // Two asymmetric portal posts + open, high spandrels at z boundaries.
 // These are deliberately off the central walking-line; no closed walls.
 for(let i=0;i<2;i++){
  const p=base[i],zDir=i===0?-1:1,
   topSeat=lift(p.seat,side==='left'?.076:.082),
   topShelf=lift(p.shelf,side==='left'?.094:.106),
   baseShelf=lift(p.shelf,.004);
  // Real floor-anchored pointed fin stays on the outside shelf edge.
  const spur=V([p.shelf[0]+(side==='left'?-.008:.008),
   p.shelf[1]+.037,p.shelf[2]+zDir*.012]);
  tri(out,baseShelf,topShelf,spur,
   kind+(side==='left'?'OPEN_SAIL_JAMB':'FOLDED_LANTERN_JAMB')+'_NOT_STRUCTURE');
  // Open over-door rib, spanning across above the actual floor.
  const crown=V([topSeat[0],topSeat[1]+.010,topSeat[2]+zDir*.009]);
  tri(out,topShelf,topSeat,crown,
   kind+'SUSPENDED_LIGHT_RIB_NOT_HEADROOM_CERTIFIED');
  tri(out,topShelf,crown,V([topShelf[0],topShelf[1]+.008,
    topShelf[2]+zDir*.010]),
   kind+'DAYLIGHT_EDGE_NOT_GUARD');
  metrics.push({side:i===0?'before':'after',
   sourceFloorVerticalGap:p.originalElevationDifference,
   entranceJambOnOriginalR79Surface:true});
 }
 if(out.some(f=>!Number.isFinite(area(f))||area(f)<1e-11))
  fail('DEGENERATE_SOURCE_ANCHORED_FOYER');
 // Probe the floor-to-room axis against existing R87 furnishings.
 // A negative discrete-ray test is NOT swept-volume clearance.
 const furnitureFaces=originalR84.faces.filter(furniture);
 // Original R87 furnishings are tested separately by caller (full R93).
 return {faces:out,sourcePadInsideOriginalTerrace:true,
  sourceFloorFacetIndices:[...room.source.sourceFaceIndices],
  entranceAxisSourceFloor:entryCenter.point,
  researchOpeningLongitudinalLength:clearZ,
  doorwayTriangles:out.length,
  retainedOuterReadingBays:2,
  replacedMiddleFurnitureBays:2,
  sourceJambs:metrics,
  originallyR93BenchCrossedPad:true,
  walkingWidthAndSupportNotCertified:true,
  headroomNotCertified:true,
  originalR87FurnitureCollisionNotEvaluatedByThisHelper:true};
}
export function buildR94RoomEntranceVariant(nodes){
 const prev=buildR93ArchitecturalReadingVariant(nodes),
  r84=buildR84MultilevelResearch(nodes);
 if(prev.longitudinalRoomsWithArchitecture!==7||prev.totalEmittedBays!==28)
  fail('R93_ORIGINAL_ROOM_PLAN_NOT_VERIFIED');
 const skipped=new Set(),added=[],rooms=[],baseline=prev.faces;
 for(const tier of r84.tiers){
  const record=prev.levels.find(r=>r.source.side===tier.side&&
   r.source.tier===tier.tier);
  const root=record.stationSamples;
  const low=root[1].z,high=root[3].z,prefix=tier.side+'_R93_';
  let cut=0;
  for(let i=prev.sourceR92Faces;i<baseline.length;i++){
   const f=baseline[i];
   if(!f.kind.startsWith(prefix))continue;
   const c=center(f);
   if(c[2]>low+1e-6&&c[2]<high-1e-6&&
    Math.abs(c[1]-tier.padCenter[1])<.18){
    if(skipped.has(i))fail('AMBIGUOUS_CROSS_TIER_ROOM_FURNITURE');
    skipped.add(i);cut++;
   }
  }
  if(cut!==12)fail('EXPECTED_TWELVE_CENTER_BAY_FURNITURE_TRIANGLES_'+tier.side+'_'+tier.tier+'_'+cut);
  const design=designR94RoomDoorway(tier,record,r84);
  added.push(...design.faces);
  // Conservative probes across the ORIGINAL R87 built-in furniture:
  // collisions stay disclosed, cannot be promoted to certified walking.
  const oldFurniture=baseline.slice(0,prev.sourceR92Faces).filter(furniture);
  let sampledExistingFurnitureRayHits=0;
  const pos=design.entranceAxisSourceFloor;
  for(const dy of [.01,.035,.07]){
   const start=[tier.padCenter[0],tier.padCenter[1]+dy,tier.padCenter[2]];
   const end=[pos[0],pos[1]+dy,pos[2]];
   for(const f of oldFurniture)
    if(intersectR81SegmentTriangle(start,end,f))
     sampledExistingFurnitureRayHits++;
  }
  const {faces, ...metadata}=design;
  rooms.push({side:tier.side,tier:tier.tier,
   removedSourceR93FurnitureTriangles:cut,
   sampledExistingFurnitureRayHits,...metadata,
   existingR87FurnitureNotClaimedClear:sampledExistingFurnitureRayHits>0,
   actualHumanWalkingAndStructuralApproval:false});
 }
 if(skipped.size!==84||rooms.length!==7)
  fail('SEVEN_SOURCE_FLOOR_GATEWAYS_REQUIRED');
 const active=[...baseline.filter((_,i)=>!skipped.has(i)),...added];
 return {faces:active,rooms,
  sourceR93Faces:baseline.length,
  oldR93ArchitectureRemainsIntactInHistoricalEvidence:true,
  displacedFurnishingTriangles:skipped.size,
  newTrueSourceFloorDoorwayTriangles:added.length,
  newActiveArchitectureTriangles:active.length,
  originalR92SourcePrefixUnchanged:true,
  connectedResearchDoorwayCount:rooms.filter(r=>r.sourcePadInsideOriginalTerrace).length,
  totalRemainingR93FurnishingBays:14,
  certifiedPhysicalDoorways:0,
  independentVisualArchitecturalReview:'NOT_REVIEWED',
  allMinecraftConstructionBlocked:true};
}
export function prepareR94DoorwayReview(args={}){
 const {r93Evidence,...old}=args;
 const checked=prepareR93ReadingGalleryReview(old);
 if(!r93Evidence||r93Evidence.schema!==R93_SCHEMA||
  JSON.stringify(r93Evidence)!==JSON.stringify(checked))
  fail('R93_COMPLETE_EVIDENCE_MISMATCH');
 if(typeof args.raw!=='string'||SHA(args.raw)!==args.expectedRawSha256)
  fail('FROZEN_RAW_SHA_MISMATCH');
 const {faces,...r}=buildR94RoomEntranceVariant(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:checked.oldB143Status,
  priorR93EvidenceFullyRecomputed:true,...r,
  sourceR93VisualMeshCanBeComparedIndependently:true,
  modelCalls:0,worldReads:0,worldWrites:0,safety:safe()};
}
const obj=faces=>{
 let id=1,previous=null;
 const rows=['# R94 ACTIVE room-entry redesign; R93 original retained in its own evidence OBJ',
 '# 7 true-terrrace door openings; zero certified public access or world work'];
 for(const f of faces){
  if(previous!==f.kind){previous=f.kind;rows.push('g '+f.kind.replace(/[^a-zA-Z0-9_]/g,'_'))}
  for(const p of [f.a,f.b,f.c])rows.push('v '+p.join(' '));
  rows.push('f '+id+' '+(id+1)+' '+(id+2));id+=3;
 }
 return rows.join('\n')+'\n';
};
export function writeR94DoorwayReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())fail('EXISTING_SAFE_REVIEW_FOLDER_REQUIRED');
 const base='R94_READING_ROOM_TRUE_TERRACE_ENTRY',
  files=[base+'_EVIDENCE.json',base+'_ACTIVE_ARCHITECTURE.obj',
   base+'_ARCHITECTURAL_REVIEW.html'].map(f=>path.join(destination,f));
 if(files.some(f=>fs.existsSync(f)))fail('DO_NOT_OVERWRITE');
 const e=prepareR94DoorwayReview(args),
  r=buildR94RoomEntranceVariant(args.r80Evidence.conceptualRouteNodes);
 const rows=e.rooms.map(t=>'<tr><td>'+esc(t.side)+'</td><td>'+t.tier+
  '</td><td>'+t.researchOpeningLongitudinalLength.toFixed(4)+
  '</td><td>'+t.removedSourceR93FurnitureTriangles+
  '</td><td>'+t.sampledExistingFurnitureRayHits+
  '</td></tr>').join('');
 const h='<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
 '<title>R94 True Floor Reading Room Entrance Review</title>'+
 '<style>body{font:15px/1.75 system-ui;max-width:1180px;margin:25px auto;padding:0 16px}table{border-collapse:collapse;width:100%}td,th{padding:8px;border:1px solid #adbccb}</style>'+
 '<h1>R94 閲覧室7層への入口を床と部屋の実三角形へ接続する</h1>'+
 '<p>R93の長い書架壁・読書ベンチが7つの着地点中央を塞ぐおそれを再発見。'+
 '各層中央2区画の家具12三角形を比較モデルから除き、源R79の共有辺でつながった床面を使う低い敷居、'+
 '左右で意匠を変えた開放門柱と採光リブを追加。源R93と過去の不具合記録はそのまま保持。</p>'+
 '<p>元のR93 4,474面、除外 '+e.displacedFurnishingTriangles+
 '面、入口意匠の新規 '+e.newTrueSourceFloorDoorwayTriangles+
 '面、最新の比較用3Dモデル '+e.newActiveArchitectureTriangles+'面。</p>'+
 '<table><tr><th>側</th><th>層</th><th>研究用開口の長さ</th><th>外した元家具面</th><th>R87家具検査線の交差数</th></tr>'+
 rows+'</table><p><a href="'+base+'_ACTIVE_ARCHITECTURE.obj">R94 入口改善3Dモデル</a> ／'+
 '<a href="R93_ORIGINAL_SEVEN_LONG_READING_GALLERIES_FIVE_VIEW.html">R93 全館美術案と5視点</a></p>'+
 '<p>源三角形との計算上の連続と局所的なray照合は、身体の通行・頭上有効高・階段と同じ支持構造・'+
 '読書室の利用安全や実Minecraftアバター歩行を保証しません。</p>'+
 '<p>NOT_PREPARED / BLOCKED×9 / Qwen実行0 / Minecraft読取書込0 / 独立美術評価NOT_REVIEWED。</p></html>';
 fs.writeFileSync(files[0],JSON.stringify(e,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(files[1],obj(r.faces),{flag:'wx'});
 fs.writeFileSync(files[2],h,{flag:'wx'});
 return {relativeFile:path.basename(files[2]),faces:e.newActiveArchitectureTriangles,
  removed:e.displacedFurnishingTriangles,modelCalls:0,worldWrites:0};
}
