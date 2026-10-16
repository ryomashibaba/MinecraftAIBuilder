/**
 * B141 — coordinate the B140 per-stair plans into ONE per-building offline
 * 2-wide gallery overlay and a conceptual floor-to-floor reachability graph.
 * This is not a build instruction, a verified aperture or a world coordinate.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {b138Fleet,verifyB138} from '../../b138/main/b138-five-rise-fleet.mjs';
import {b139Fleet,verifyB139} from '../../b139/main/b139-five-rise-repair.mjs';
import {b140Fleet,verifyB140} from '../../b140/main/b140-two-wide-gallery-bridge.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=p=>p.x+','+p.z;
const Q=p=>p.x+','+p.y+','+p.z;
const xy=(s)=>{const [x,z]=s.split(',').map(Number);return {x,z};};
const P=p=>Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p?.z);
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const neighbors=[[0,1],[0,-1],[1,0],[-1,0]];
const square=p=>[p,{x:p.x+1,z:p.z},{x:p.x,z:p.z+1},{x:p.x+1,z:p.z+1}];
export const B141_LIMITS=Object.freeze({
 buildings:15,floors:66,stairs:102,
 b140IndependentPlans:70,b140HeldStairs:32,
 worldWrites:0,originalFloorRise:5
});
function stageFloor(design,c113,level){
 const floor=design.plan.floors[level],route=c113.horizontalRoutes[level];
 if(!floor||!route||route.level!==level||
  route.repair?.allNewCellsOutsideRoomsAndCores!==true||
  route.repair?.sourceCellsPreserved!==true)throw Error('B141_SOURCE_GALLERY_GUARDS');
 const original=new Set(floor.gallery.map(K));
 const base=new Set([...floor.gallery,...route.repair.addedCells].map(K));
 if([...original].some(k=>!base.has(k)))throw Error('B141_SOURCE_CELL_DROPPED');
 return {floor,original,base,add:new Map(),contributors:new Map()};
}
/** Join additive proposals without modifying a source cell. */
export function b141MergeCorridors(design,c113,c140){
 if(design.candidateId!==c113.id||design.candidateId!==c140.id||
  c140.rows.length!==c113.stairs.length)throw Error('B141_PARENT_BUILDING_MISMATCH');
 const levels=design.plan.floors.map((_,i)=>stageFloor(design,c113,i));
 const claimed=[];
 for(const row of c140.rows){
  if(!row.selected)continue;
  for(const [side,bridge,level] of [
   ['LOWER',row.selected.lowerBridge,row.fromLevel],
   ['UPPER',row.selected.upperBridge,row.toLevel]
  ]){
   if(!bridge?.sourceConnected||!Array.isArray(bridge.addedCells)||
      !Array.isArray(bridge.pathSquares)||!bridge.pathSquares.length)
    throw Error('B141_B140_SELECTED_BRIDGE_INVALID');
   const layer=levels[level],rooms=layer.floor.rooms,cores=design.plan.cores;
   const segments=new Map();
   for(const origin of bridge.pathSquares){
    if(!P(origin))throw Error('B141_BRIDGE_SQUARE_INVALID');
    for(const p of square(origin))segments.set(K(p),p);
   }
   for(const p of bridge.addedCells){
    if(!P(p)||!segments.has(K(p))||layer.base.has(K(p))||
     layer.floor.footprintRows[p.z]?.[p.x]!=='1'||
     [...rooms,...cores].some(r=>inside(r,p)))
     throw Error('B141_BRIDGE_PROTECTED_CELL_OR_BAD_GALLERY');
    if(!layer.add.has(K(p)))layer.add.set(K(p),p);
    const claim=layer.contributors.get(K(p))??new Set();
    claim.add(row.stairIndex);layer.contributors.set(K(p),claim);
    claimed.push({level,side,stairIndex:row.stairIndex,x:p.x,z:p.z});
   }
   // The complete B140 2x2 path must fit the merged source + additive
   // grid, and every adjacent 2x2 square must share two cells (not a diagonal).
   const union=new Set([...layer.base,...layer.add.keys()]);
   for(let i=0;i<bridge.pathSquares.length;i++){
    const origin=bridge.pathSquares[i];
    if(square(origin).some(p=>!union.has(K(p))))throw Error('B141_INCOMPLETE_TWO_WIDE_ROUTE');
    if(i>0){
     const previous=bridge.pathSquares[i-1];
     if(Math.abs(origin.x-previous.x)+Math.abs(origin.z-previous.z)!==1)
      throw Error('B141_ROUTE_SHRINKS_AT_CORNER');
    }
   }
  }
 }
 const snapshots=levels.map((v,level)=>{
  const novel=[...v.add.values()].sort((a,b)=>a.z-b.z||a.x-b.x);
  const shared=[...v.contributors].filter(([,s])=>s.size>1);
  return {level,sourceGalleryCells:v.original.size,
   inheritedB113AddedCells:v.base.size-v.original.size,
   b140RawNewCells:claimed.filter(c=>c.level===level).length,
   b141UniqueNewCells:novel.length,
   b141ReusedAdditions:claimed.filter(c=>c.level===level).length-novel.length,
   sharedNewCells:shared.length,
   novelCells:novel,
   combinedCells:[...v.base,...v.add.keys()].map(xy)
    .sort((a,b)=>a.z-b.z||a.x-b.x),
   originalSourceUnchanged:true,roomsMoved:0,coresMoved:0};
 });
 return {levels:snapshots,
  originalSourceCellsPreserved:true,
  totalProposedIndependentContributions:claimed.length,
  totalUniqueNovelCells:snapshots.reduce((n,c)=>n+c.b141UniqueNewCells,0),
  totalDeduplicatedCells:snapshots.reduce((n,c)=>n+c.b141ReusedAdditions,0),
  actualConstruction:false,worldOperations:[]};
}
/**
 * Graph nodes are 2x2 all-walkable squares on each floor. Two nodes connect
 * iff their origins move one grid cell, retaining the complete two-lane seam.
 * Add one conceptual stair edge when both sides have a valid portal square.
 */
export function b141ConceptualNetwork(design,c140,merged){
 if(merged.levels.length!==design.plan.floors.length)
  throw Error('B141_NETWORK_LEVEL_MISMATCH');
 const graph=new Map(),byFloor=[];
 for(const f of merged.levels){
  const all=new Set(f.combinedCells.map(K)),nodes=new Set();
  for(const key of all){
   const p=xy(key);
   if(square(p).every(q=>all.has(K(q))))nodes.add(K(p));
  }
  byFloor.push(nodes);
  for(const p of nodes)graph.set(f.level+':'+p,new Set());
 }
 for(const f of merged.levels){
  const nodes=byFloor[f.level];
  for(const key of nodes){
   const p=xy(key),a=f.level+':'+key;
   for(const [dx,dz] of neighbors){
    const b=f.level+':'+(p.x+dx)+','+(p.z+dz);
    if(graph.has(b)){graph.get(a).add(b);graph.get(b).add(a);}
   }
  }
 }
 const joins=[],invalid=[];
 const getPortalKey=(bridge,level)=>{
  const candidate=bridge?.pathSquares?.[0];
  if(!P(candidate))return null;
  const id=level+':'+K(candidate);
  return graph.has(id)?id:null;
 };
 for(const row of c140.rows){
  if(!row.selected)continue;
  const lo=getPortalKey(row.selected.lowerBridge,row.fromLevel),
    hi=getPortalKey(row.selected.upperBridge,row.toLevel);
  if(!lo||!hi){invalid.push(row.stairIndex);continue;}
  graph.get(lo).add(hi);graph.get(hi).add(lo);
  joins.push({stairIndex:row.stairIndex,fromLevel:row.fromLevel,
   toLevel:row.toLevel,lowerNode:lo,upperNode:hi,
   collisionAndSlabCertified:false});
 }
 const rootNodes=new Set();
 for(const exit of design.plan.floors[0].exits){
  const edge=new Set((exit.edge??[]).map(K));
  for(const node of byFloor[0]){
   if(square(xy(node)).some(p=>edge.has(K(p))))
    rootNodes.add('0:'+node);
  }
 }
 const q=[...rootNodes],seen=new Set(q);
 for(let i=0;i<q.length;i++)for(const n of graph.get(q[i])??[]){
  if(!seen.has(n)){seen.add(n);q.push(n);}
 }
 const reachableFloors=new Set([...seen].map(x=>Number(x.split(':')[0])));
 const connectedJoins=joins.filter(j=>seen.has(j.lowerNode)&&seen.has(j.upperNode));
 return {twoWideSquareNodes:graph.size,
  sourceGroundExitRootSquares:rootNodes.size,
  sourceExitToAllFloorsConceptual:reachableFloors.size===merged.levels.length&&
    rootNodes.size>0&&invalid.length===0,
  conceptualReachableFloors:[...reachableFloors].sort((a,b)=>a-b),
  floorsNotReachableFromGroundExit:merged.levels.map(x=>x.level).filter(x=>!reachableFloors.has(x)),
  stairEdgesWithBothPortalNodes:joins.length,
  stairEdgesWithoutValidPortalNode:invalid,
  joinEdgesReachedFromGroundExit:connectedJoins.length,
  independentWalkabilityCertified:false,
  actualMinecraftCollisionCertified:false,
  worldCoordinates:null};
}
/**
 * Audit all stair vs stair volumes using expanded conceptual stair occupancy
 * and headroom, plus conceptual slab opening cells against merged corridors.
 * This does not validate true Education collisions or support geometry.
 */
export function b141AuditJoint3D(design,c140,merged){
 const floors=design.plan.floors,panels=new Map(),cuts=new Map(),stairVoxels=new Map();
 const issues=[],requiredSupports=new Map(),perStair=[];
 const claim=(map,key,obj)=>{
  const e=map.get(key)??[];
  e.push(obj);map.set(key,e);
 };
 for(const row of c140.rows){
  if(!row.selected)continue;
  const from=row.fromLevel,to=row.toLevel,upperY=to*5;
  const route=row.selected.sketch;
  if(route.sourceFloorRise!==5||route.positions.length!==14)
   throw Error('B141_UNEXPECTED_STAIR_RISE_OR_SHAPE');
  const ownCuts=new Set(),ownSupports=new Set();
  for(const part of route.positions.filter(x=>x.kind==='NORMAL_OAK_STAIR_CONCEPT')){
   const loc=part.position;
   claim(stairVoxels,Q(loc),{stairIndex:row.stairIndex,fromLevel:from});
   const sup={...loc,y:loc.y-1};
   ownSupports.add(Q(sup));
   claim(requiredSupports,Q(sup),{stairIndex:row.stairIndex});
   // The body envelope is conservatively 2 blocks above a stair voxel.
   for(let dy=0;dy<=2;dy++){
    const at={...loc,y:loc.y+dy},key=Q(at);
    claim(panels,key,{stairIndex:row.stairIndex,fromLevel:from,at});
    if(at.y===upperY&&floors[to].footprintRows[at.z]?.[at.x]==='1'){
     ownCuts.add(key);
     claim(cuts,key,{stairIndex:row.stairIndex,toLevel:to,position:at});
    }
   }
  }
  perStair.push({stairIndex:row.stairIndex,lowerLevel:from,upperLevel:to,
   requiredUpperOpeningCells:ownCuts.size,requiredSupportCells:ownSupports.size,
   upperApertureApproved:false,actualCollisionCertified:false});
 }
 const intersect=new Set();
 for(const [key,claims] of panels){
  if(new Set(claims.map(x=>x.stairIndex+':'+x.fromLevel)).size>1){
   intersect.add(key);
   if(issues.length<120)issues.push({code:'JOINT_STAIR_HEADROOM_INTERSECTION',
    voxel:key,stairIndices:[...new Set(claims.map(x=>x.stairIndex))]});
  }
 }
 const novelCorridorsByLevel=merged.levels.map(f=>new Set(f.novelCells.map(K)));
 const sourceCorridorsByLevel=merged.levels.map((f,i)=>new Set(design.plan.floors[i].gallery.map(K)));
 const protectedRooms=[],sourceGallery=[],newCorridor=[];
 for(const [key,claims] of cuts){
  const p=claims[0].position;
  const target=claims[0].toLevel;
  if(floors[target].rooms.some(r=>inside(r,p)))protectedRooms.push(key);
  if(sourceCorridorsByLevel[target].has(K(p)))sourceGallery.push(key);
  if(novelCorridorsByLevel[target].has(K(p)))newCorridor.push(key);
 }
 const cutCount=[...cuts].length;
 return {selectedStairs:perStair.length,
  perStair,
  jointHeadroomCollisionCells:intersect.size,
  jointHeadroomCollisionExamples:issues,
  conceptualOpeningUniqueCells:cutCount,
  conceptualOpeningDuplicateClaims:[...cuts.values()].reduce((n,a)=>n+Math.max(0,a.length-1),0),
  requiredSupportUniqueCells:requiredSupports.size,
  upperOpeningTouchesProtectedRooms:protectedRooms.length,
  upperOpeningTouchesOriginalGallery:sourceGallery.length,
  upperOpeningTouchesProposedNewGallery:newCorridor.length,
  upperOpeningConflictExamples:{
   protectedRooms:protectedRooms.slice(0,12),
   originalGallery:sourceGallery.slice(0,12),
   addedGallery:newCorridor.slice(0,12)},
  slabModificationPermitted:false,physicalSupportCertified:false,
  actualMinecraftBlockContacts:0};
}
/** Structure-first classification for the remaining 32. No fabricated success. */
export function b141Unresolved(c140,c139){
 const keyed=new Map(c139.rows.map(r=>[r.stairIndex,r]));
 const remaining=[];
 for(const r of c140.rows.filter(r=>!r.selected)){
  const p=keyed.get(r.stairIndex);
  if(!p)throw Error('B141_UNRESOLVED_B139_STAIR_MISSING');
  const status=r.status;
  const tier=status==='HOLD_NO_ROOM_PRESERVING_FIVE_RISE_7x2_GEOMETRY'?
   'CORE_FLOORPLATE_OR_ROOM_RECONFIGURATION':
   'CORRIDOR_ROOT_OR_TWO_WIDE_INTERFLOOR_REDESIGN';
  remaining.push({stairIndex:r.stairIndex,
   fromLevel:r.fromLevel,toLevel:r.toLevel,
   b140Reason:status,b139Reason:p.routeStatus,
   priority:tier,roomEditsAuthorized:false,
   offlineNextStep:tier==='CORE_FLOORPLATE_OR_ROOM_RECONFIGURATION'?
    'GENERATE_SOURCE_PRESERVING_WINDING_OR_SWITCHBACK_5_RISE_ALTERNATIVE':
    'BUILD_MULTI_STAIR_SHARED_ROUTE_OR_WIDER_GALLERY_HUB',
   worldOperations:[]});
 }
 return remaining;
}
export function b141AssembleBuilding(design,c113,c139,c140){
 if(design?.candidateId!==c140?.id||c139?.id!==c140.id||
    c113?.id!==c140.id||c140.stairs!==c139.rows.length)
  throw Error('B141_CASE_INVENTORY_MISMATCH');
 const vol=generateB105(design),qa=auditB105(vol,design.plan);
 if(qa.issueCount||qa.envelopeConflicts)throw Error('B141_SOURCE_VOXEL_FAIL');
 const merged=b141MergeCorridors(design,c113,c140);
 const network=b141ConceptualNetwork(design,c140,merged);
 const collisions=b141AuditJoint3D(design,c140,merged);
 const unresolved=b141Unresolved(c140,c139);
 if(unresolved.length+c140.selectedIndependentPlans!==c140.stairs||
    collisions.selectedStairs!==c140.selectedIndependentPlans)
  throw Error('B141_STAIR_WORKLIST_OUT_OF_SYNC');
 return {id:c140.id,conceptFloors:design.plan.floors.length,
  sourceStairs:c140.stairs,selectedStairs:c140.selectedIndependentPlans,
  merged,network,collisions,unresolved,
  originalFloorsRoomsAndCoresUnchanged:true,worldCommands:[]};
}
export function b141Fleet(parent,b113,b138,b139,b140){
 if(!validateB113(b113)||!verifyB138(b138)||!verifyB139(b139)||
  !verifyB140(b140)||b140.sourceB113!==b113.integritySha256||
  b140.sourceB138!==b138.integritySha256||
  b140.sourceB139!==b139.integritySha256||
  parent?.sourceDesigns?.length!==15||b140.cases.length!==15)
  throw Error('B141_FROZEN_CHAIN_INVALID');
 const cases=parent.sourceDesigns.map(d=>{
  const id=d.candidateId;
  const c113=b113.cases.find(c=>c.id===id),
   c139=b139.cases.find(c=>c.id===id),
   c140=b140.cases.find(c=>c.id===id);
  if(!c113||!c139||!c140)throw Error('B141_UNMATCHED_BUILDING');
  return b141AssembleBuilding(d,c113,c139,c140);
 });
 const sum=f=>cases.reduce((n,c)=>n+f(c),0);
 const totals={
  buildings:cases.length,floors:sum(c=>c.conceptFloors),
  stairs:sum(c=>c.sourceStairs),selectedIndependent:sum(c=>c.selectedStairs),
  held:sum(c=>c.unresolved.length),
  rawAddedCorridorCellClaims:sum(c=>c.merged.totalProposedIndependentContributions),
  mergedUniqueNewCorridorCells:sum(c=>c.merged.totalUniqueNovelCells),
  duplicateCorridorCellClaimsRemoved:sum(c=>c.merged.totalDeduplicatedCells),
  sourceExitReachableBuildings:sum(c=>Number(c.network.sourceExitToAllFloorsConceptual)),
  conceptualStairEdgesReachedFromExit:sum(c=>c.network.joinEdgesReachedFromGroundExit),
  jointHeadroomCollisionCells:sum(c=>c.collisions.jointHeadroomCollisionCells),
  conceptualUniqueUpperOpeningCells:sum(c=>c.collisions.conceptualOpeningUniqueCells),
  upperOpeningAgainstProtectedRooms:sum(c=>c.collisions.upperOpeningTouchesProtectedRooms),
  upperOpeningAgainstOriginalGallery:sum(c=>c.collisions.upperOpeningTouchesOriginalGallery),
  upperOpeningAgainstNewGallery:sum(c=>c.collisions.upperOpeningTouchesProposedNewGallery),
  actualWorldWritesAllowed:0,certified102StairPhysicalConnections:0
 };
 if(totals.buildings!==15||totals.floors!==66||totals.stairs!==102||
    totals.selectedIndependent!==70||totals.held!==32||
    totals.duplicateCorridorCellClaimsRemoved!==
    totals.rawAddedCorridorCellClaims-totals.mergedUniqueNewCorridorCells)
  throw Error('B141_15_66_102_OR_B140_COUNTS_DRIFT');
 const base={schema:'minecraftaibuilder-b141-shared-2wide-network-v1',
  originalBaseline:{buildings:15,floors:66,stairs:102,
   b140IndependentConcepts:70,b140Held:32},
  pinned:{B113:b113.integritySha256,B138:b138.integritySha256,
   B139:b139.integritySha256,B140:b140.integritySha256},
  evidence:{
   sourceFromB113TrueParent:true,
   b140IndependentPlansNotPhysicalCertificates:true,
   collisionAssessmentIsConservativeBlockEnvelope:true,
   b136B137ActualGameEvidenceAppliesOnlyToSmallTestRoute:true,
   jointPlanDoesNotAuthorizeFloorCutsOrDoorChanges:true
  },
  totals,cases,
  nextGate:'COORDINATED_5_RISE_STAIR_SUPPORT_APERTURE_AND_ROOM_SAFE_GLOBAL_NETWORK',
  readiness:'NOT_PREPARED',sourceDesignModified:false,worldContacts:0,
  worldCoordinates:null,commandCount:0,constructionApproved:false,
  executionAllowed:false,gates:b113.gates.map(x=>({...x,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}
 };
 return {...base,integritySha256:digest(base)};
}
export function verifyB141(r){
 try{
  const {integritySha256,...b}=r??{},t=r.totals;
  return digest(b)===integritySha256&&
   r.schema==='minecraftaibuilder-b141-shared-2wide-network-v1'&&
   t.buildings===15&&t.floors===66&&t.stairs===102&&
   t.selectedIndependent===70&&t.held===32&&
   t.rawAddedCorridorCellClaims-t.mergedUniqueNewCorridorCells===
    t.duplicateCorridorCellClaimsRemoved&&
   r.cases.length===15&&r.cases.every(c=>c.originalFloorsRoomsAndCoresUnchanged&&
    c.worldCommands.length===0&&c.merged.worldOperations.length===0&&
    c.collisions.slabModificationPermitted===false)&&
   r.sourceDesignModified===false&&r.worldContacts===0&&
   r.worldCoordinates===null&&r.commandCount===0&&
   r.constructionApproved===false&&r.executionAllowed===false&&
   r.readiness==='NOT_PREPARED'&&
   r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan?.operations.length===0;
 }catch{return false;}
}
export function writeB141(r,out=path.join(ROOT,'b141-review-output')){
 if(!verifyB141(r))throw Error('B141_OUTPUT_NOT_SAFE');
 fs.mkdirSync(out,{recursive:true});
 const json=path.join(out,'B141_15Buildings_Shared_2Wide_Network.json');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const t=r.totals;
 const report=path.join(out,'B141_NETWORK_INTEGRATION_JA.md');
 const lines=[
  '# B141 — 70の独立階段案を15棟の共用廊下に統合（オフライン設計）',
  '',
  '**実際のMinecraftワールドへ接続・施工・改変はしていません。**',
  '',
  '|設計指標|値|','|---|---:|',
  '|建物 / 階床 / 元の階段|'+t.buildings+' / '+t.floors+' / '+t.stairs+'|',
  '|統合対象の独立5-rise階段接続案|'+t.selectedIndependent+'|',
  '|依然として配置・廊下問題が残る階段|'+t.held+'|',
  '|元の70案を単純合算した追加廊下セル|'+t.rawAddedCorridorCellClaims+'|',
  '|階ごとに重複を整理した新規廊下セル|'+t.mergedUniqueNewCorridorCells+'|',
  '|統合により重複扱いとなったセル数|'+t.duplicateCorridorCellClaimsRemoved+'|',
  '|出入口から全階床に概念的に到達できる建物|'+t.sourceExitReachableBuildings+'|',
  '|出入口側の2x2通路ネットワークに接続する階段|'+t.conceptualStairEdgesReachedFromExit+'|',
  '|異なる階段の頭上空間が交差する概念3Dセル|'+t.jointHeadroomCollisionCells+'|',
  '|必要な上階開口の概念セル数（共有部分は統合）|'+t.conceptualUniqueUpperOpeningCells+'|',
  '|開口が部屋と重なる概念セル|'+t.upperOpeningAgainstProtectedRooms+'|',
  '|開口が元のギャラリーと重なる概念セル|'+t.upperOpeningAgainstOriginalGallery+'|',
  '|開口が新規追加廊下と重なる概念セル|'+t.upperOpeningAgainstNewGallery+'|',
  '',
  '## 建物別',
  '|建物|階床|階段案|残るHOLD|追加廊下セル（重複排除後）|出口から到達できる階床|3D干渉セル|',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...r.cases.map(c=>'|'+c.id+'|'+c.conceptFloors+'|'+c.selectedStairs+'|'+
   c.unresolved.length+'|'+c.merged.totalUniqueNovelCells+'|'+
   c.network.conceptualReachableFloors.length+'/'+c.conceptFloors+'|'+
   c.collisions.jointHeadroomCollisionCells+'|'),
  '',
  '## 解釈と次工程',
  '概念的な「同じ床での幅2の通路」と「階段の階をまたぐ接続」を結んだグラフです。',
  'ゲーム内でジャンプなしに歩けることや、部屋のドアの開閉、天井高、構造支持を意味しません。',
  'B140案同士の3D交差・上階スラブ開口と廊下の重なりを新たに記録したので、',
  '次はその衝突を避ける一括再配置・支持材/開口設計に進めます。',
  '32件の未解決階段は建物/階/理由付きの作業リストとしてJSONに含まれます。',
  '',
  '**施工: NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]**'
 ];
 fs.writeFileSync(report,lines.join('\n')+'\n');
 return {json,report,totals:t,integritySha256:r.integritySha256};
}
export async function runB141(){
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113))throw Error('B141_UNVERIFIED_B113');
 const b138=b138Fleet(parent,b113);
 if(!verifyB138(b138))throw Error('B141_UNVERIFIED_B138');
 const b139=b139Fleet(parent,b113,b138);
 if(!verifyB139(b139))throw Error('B141_UNVERIFIED_B139');
 const b140=b140Fleet(parent,b113,b138,b139);
 if(!verifyB140(b140))throw Error('B141_UNVERIFIED_B140');
 return writeB141(b141Fleet(parent,b113,b138,b139,b140));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runB141(),null,2));}
 catch(e){console.error('B141_HOLD:',e.message);process.exitCode=1;}
}
