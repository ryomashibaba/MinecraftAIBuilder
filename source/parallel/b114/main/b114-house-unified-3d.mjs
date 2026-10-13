/**
 * HOUSE_V3 unified local-coordinate 3D proposal and independent two-wide routing.
 * Read-only, no valid Minecraft placement commands, no world coordinates, no connections.
 * Solid AABBs and proxy blocks do not certify real Education stairs or doors.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {buildB114,validateB114} from './compile-b114.mjs';
import {inspectHouse} from './b114-house-v3-integrated.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {K,neighbors,straightFlight,intersects} from '../../b113/main/b113-geometry.mjs';

const key3=(x,y,z)=>x+','+y+','+z;
const p2=s=>{const [x,z]=s.split(',').map(Number);return {x,z};};
const cube=(p,y,h=1)=>({x:p.x,y,z:p.z,width:1,height:h,depth:1});
const inRect=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sorted=(a,b)=>a.level-b.level||a.z-b.z||a.x-b.x;
function cells(f){
 const a=[];
 for(let z=0;z<f.footprintRows.length;z++)for(let x=0;x<f.footprintRows[z].length;x++)
  if(f.footprintRows[z][x]==='1')a.push({x,z});
 return a;
}
function rotateAABB(b,link){
 const {x,z}=link.origin,{dx,dz}=link.ascent;
 const corners=[[b.x,b.z],[b.x+b.width,b.z],[b.x,b.z+b.depth],[b.x+b.width,b.z+b.depth]]
  .map(([u,v])=>[x+dx*u-dz*v,z+dz*u+dx*v]);
 const xs=corners.map(c=>c[0]),zs=corners.map(c=>c[1]);
 return {x:Math.min(...xs),y:link.fromLevel*5+1+b.y,z:Math.min(...zs),
  width:Math.max(...xs)-Math.min(...xs),height:b.height,depth:Math.max(...zs)-Math.min(...zs)};
}
function range(box,axis){
 const lo=box[axis],hi=lo+box[{x:'width',y:'height',z:'depth'}[axis]];
 const out=[];
 for(let n=Math.floor(lo);n<Math.ceil(hi-1e-9);n++)out.push(n);
 return out;
}
const sq=a=>[a,{x:a.x+1,z:a.z},{x:a.x,z:a.z+1},{x:a.x+1,z:a.z+1}];
const adjacent=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z)===1;
function containsAll(a,pts){const s=new Set(a.map(K));return pts.every(p=>s.has(K(p)));}
function stairAdjacent(anchor,landing){
 const area=sq(anchor);
 // Both ends of the landing must independently meet a two-wide 2x2 square.
 return landing.every(p=>area.some(a=>adjacent(a,p)));
}
function walk2Wide(floors,design,b113,b114,house,stairAABBs,voxelMap,apertures) {
 const overlays=floors.map((f,i)=>{
  const mask=new Set(cells(f).map(K));
  const occupied=new Set();
  const proposed=[...f.gallery,...b113.horizontalRoutes[i].repair.addedCells,
    ...house.gallery.twoWideDetours[i].addedCells.map(p2)];
  const eligible=p=>{
   const k=K(p);
   if(!mask.has(k)||apertures[i].has(k)||f.rooms.some(r=>inRect(r,p)))return false;
   const body=cube(p,i*5+1,2);
   if(stairAABBs.some(b=>intersects(body,b)))return false;
   for(let y=i*5+1;y<=i*5+2;y++){
    const occupiedBlock=voxelMap.get(key3(p.x,y,p.z));
    if(occupiedBlock&&occupiedBlock.types.some(t=>t!=='EXTERIOR_PORTAL_VOID_PROXY'))return false;
   }
   return true;
  };
  const valid=new Set(proposed.filter(eligible).map(K));
  const anchors=new Map();
  for(let z=0;z<f.footprintRows.length-1;z++)
   for(let x=0;x<f.footprintRows[z].length-1;x++){
    const p={x,z};
    if(sq(p).every(c=>valid.has(K(c))))anchors.set(K(p),p);
   }
  return {valid,anchors,proposed:new Set(proposed.map(K)),
   unavailable:[...new Set(proposed.map(K))].filter(k=>!valid.has(k))};
 });
 const requirements=[];
 for(const e of floors[0].exits)requirements.push({kind:'EXTERIOR_EXIT',level:0,id:'EXIT_'+requirements.length,
  edge:e.edge});
 for(const f of floors)for(const r of f.rooms)requirements.push({kind:'ROOM_DOOR',level:f.level,id:r.id,
  outside:r.conceptualDoorOpening.outside});
 const stairLinks=b114.stairs.map((l,i)=>{
  const selected=l.selected;
  if(!selected)throw Error('B114_UNRESERVED_STAIR');
  const low={kind:'LANDING',level:l.fromLevel,stair:i,edge:selected.lowerLanding},
   high={kind:'LANDING',level:l.toLevel,stair:i,edge:selected.upperLanding};
  requirements.push(low,high);
  return {low,high};
 });
 const compatible=req=>{
  const anchors=overlays[req.level].anchors;
  return [...anchors.values()].filter(a=>{
   const s=sq(a);
   if(req.kind==='EXTERIOR_EXIT')return containsAll(s,req.edge);
   if(req.kind==='ROOM_DOOR')return s.some(p=>K(p)===K(req.outside));
   if(req.kind==='LANDING')return stairAdjacent(a,req.edge);
   return false;
  }).map(K);
 };
 const groups=requirements.map(r=>({...r,eligibleAnchors:compatible(r)}));
 const byStair=stairLinks.map((_,i)=>({
  low:new Set(groups.filter(r=>r.kind==='LANDING'&&r.stair===i&&r.level===b114.stairs[i].fromLevel)
   .flatMap(r=>r.eligibleAnchors)),
  high:new Set(groups.filter(r=>r.kind==='LANDING'&&r.stair===i&&r.level===b114.stairs[i].toLevel)
   .flatMap(r=>r.eligibleAnchors))
 }));
 const visited=floors.map(()=>new Set()),q=[];
 const add=(level,k)=>{
  if(!overlays[level].anchors.has(k)||visited[level].has(k))return;
  visited[level].add(k);q.push({level,k});
 };
 for(const g of groups.filter(g=>g.kind==='EXTERIOR_EXIT'))for(const k of g.eligibleAnchors)add(0,k);
 for(let i=0;i<q.length;i++){
  const {level,k}=q[i],point=overlays[level].anchors.get(k);
  for(const next of neighbors(point))add(level,K(next));
  for(let j=0;j<stairLinks.length;j++){
   const stair=b114.stairs[j];
   const physicalCandidate=house.gallery.links[j].provisionalGeometryLink;
   if(!physicalCandidate)continue;
   const ends=byStair[j];
   if(level===stair.fromLevel&&ends.low.has(k))
    for(const other of ends.high)add(stair.toLevel,other);
   if(level===stair.toLevel&&ends.high.has(k))
    for(const other of ends.low)add(stair.fromLevel,other);
  }
 }
 const targetResults=groups.map(g=>({...g,
  reachableAnchors:g.eligibleAnchors.filter(k=>visited[g.level].has(k)).length,
  twoWideReachable:g.eligibleAnchors.some(k=>visited[g.level].has(k))}));
 const roomResults=targetResults.filter(g=>g.kind==='ROOM_DOOR').map(g=>{
  const room=b113.rooms.find(r=>r.level===g.level&&r.roomId===g.id);
  return {...g,interiorB113Clear:room?.offlineOccupancyClear===true,
   routeAndInteriorClear:g.twoWideReachable&&room?.offlineOccupancyClear===true,
   actualDoorCollisionVerified:false};
 });
 return {
  floorStats:overlays.map((o,i)=>({level:i,proposedGalleryCells:o.proposed.size,
   nonWalkableProposedGalleryCells:o.unavailable.length,eligibleGalleryCells:o.valid.size,
   continuousTwoWideSquares:o.anchors.size,reachableTwoWideSquares:visited[i].size})),
  targets:targetResults.map(({eligibleAnchors,...g})=>({...g,candidateSquares:eligibleAnchors.length})),
  rooms:roomResults.map(({eligibleAnchors,...g})=>({...g,candidateSquares:eligibleAnchors.length})),
  reachableRooms2Wide:roomResults.filter(r=>r.routeAndInteriorClear).length,
  reachableFloors2Wide:visited.filter(v=>v.size).length,
  candidateStairInterfacesTwoWide:byStair.filter((x,i)=>house.gallery.links[i].provisionalGeometryLink&&
   x.low.size&&x.high.size).length,
  unreachableTargets:targetResults.filter(x=>!x.twoWideReachable).map(x=>({kind:x.kind,
    level:x.level,id:x.id??null,stair:x.stair??null,availableSquares:x.eligibleAnchors.length})),
  simulatedVerticalEdges:'ASSUMED_APPROVED_GEOMETRY_ONLY_NOT_EDUCATION_PHYSICS',
  realPlayerAccessCertified:false};
}
export function buildHouseUnified3D(parent,b113,b114,house){
 if(!validateB113(b113)||!validateB114(b114)||house?.id!=='HOUSE_V3'||
  house.sourceB114Integrity!==b114.integritySha256||house.constructionApproved!==false||
  house.worldContacts!==0||house.physicalTravelCertified!==false)
  throw Error('B114_UNIFIED_UNSAFE_SOURCE');
 const design=parent.sourceDesigns.find(d=>d.candidateId==='HOUSE_V3');
 const c113=b113.cases.find(c=>c.id==='HOUSE_V3');
 const c114=b114.cases.find(c=>c.id==='HOUSE_V3');
 if(!design||!c113||!c114||design.plan.floors.length!==2||
  c113.rooms.length!==3||house.stairs.length!==2)
  throw Error('B114_UNIFIED_PARENT_DESIGN_CHANGED');
 const vol=generateB105(design),audit=auditB105(vol,design.plan);
 if(audit.issueCount||audit.envelopeConflicts)throw Error('B114_UNIFIED_VOLUME_PARENT_FAILED');
 const floors=design.plan.floors;
 const apertures=floors.map((f,i)=>{
  const set=new Set(house.floorApertureProposals[i].cells);
  if(set.size!==house.floorApertureProposals[i].count||
    [...set].some(k=>f.footprintRows[p2(k).z]?.[p2(k).x]!=='1'))
    throw Error('B114_UNIFIED_APERTURE_OUTSIDE_FLOOR');
  return set;
 });
 const model=new Map(),conflicts=[];
 function put(p,type,owner){
  const k=key3(p.x,p.y,p.z),prev=model.get(k);
  if(prev){
   if(!prev.types.includes(type))prev.types.push(type);
   prev.owners.push(owner);
  }else model.set(k,{x:p.x,y:p.y,z:p.z,types:[type],owners:[owner]});
 }
 for(const f of floors)for(const p of cells(f)){
  if(!apertures[f.level].has(K(p)))put({...p,y:f.level*5},'FLOOR_SLAB_PROXY','FLOOR_'+f.level);
 }
 for(const v of vol.voxels)if(v.kind!=='EXTERIOR_PORTAL_VOID_PROXY')
  put({x:v.x,y:v.y,z:v.z},v.kind,v.owner);
 const flight=straightFlight(),supportBoxes=[],stepBoxes=[];
 for(const s of house.stairs){
  const support=flight.supports.map(b=>rotateAABB(b,s));
  for(const box of support){
   supportBoxes.push({stair:s.index,box});
   for(const x of range(box,'x'))for(const y of range(box,'y'))for(const z of range(box,'z'))
    put({x,y,z},'STAIR_SUPPORT_PROXY','STAIR_'+s.index);
  }
  // Omit two prescribed landing solids: the floor slabs must remain the landing supports.
  for(const b of flight.solids.slice(0,-2))
   stepBoxes.push({stair:s.index,box:rotateAABB(b,s),halfHeightStairProxy:true});
 }
 for(const v of model.values())if(v.types.length>1){
  const a=new Set(v.types);
  const onlyCoalescedSupport=a.size===2&&a.has('FLOOR_SLAB_PROXY')&&a.has('STAIR_SUPPORT_PROXY');
  if(!onlyCoalescedSupport)conflicts.push({x:v.x,y:v.y,z:v.z,types:[...v.types]});
 }
 const coalescedSupportFloor=[...model.values()].filter(v=>
  v.types.includes('STAIR_SUPPORT_PROXY')&&v.types.includes('FLOOR_SLAB_PROXY')).length;
 const floorRemaining=floors.map(f=>cells(f).length-apertures[f.level].size);
 const placedFloorProxy=[...model.values()].filter(v=>v.types.includes('FLOOR_SLAB_PROXY')).length;
 if(floorRemaining.reduce((a,b)=>a+b,0)!==placedFloorProxy)
  throw Error('B114_UNIFIED_FLOOR_LOSS');
 const stepFloorConflicts=stepBoxes.flatMap(step=>[...model.values()]
  .filter(v=>v.types.includes('FLOOR_SLAB_PROXY')&&intersects(step.box,cube(v,v.y)))
  .map(v=>({stair:step.stair,x:v.x,y:v.y,z:v.z})));
 const stepSourceConflicts=stepBoxes.flatMap(step=>[...model.values()]
  .filter(v=>v.types.some(t=>t!=='FLOOR_SLAB_PROXY'&&t!=='STAIR_SUPPORT_PROXY')&&
   intersects(step.box,cube(v,v.y)))
  .map(v=>({stair:step.stair,x:v.x,y:v.y,z:v.z,types:v.types})));
 const passageBlockers=[...supportBoxes.map(a=>a.box),...stepBoxes.map(a=>a.box)];
 const routes=walk2Wide(floors,design,c113,c114,house,passageBlockers,model,apertures);
 const totals={
  original3DRoomPaths:house.totals.postPlacementRoomsReached,
  independentlyVerifiedTwoWideRoomPaths:routes.reachableRooms2Wide,
  floorLevels:2,conceptRooms:3,stairFlights:house.stairs.length,
  provisionalFloorSlabCells:placedFloorProxy,
  carvedUpperSlabCells:apertures.reduce((n,s)=>n+s.size,0),
  supportFloorSharedCells:coalescedSupportFloor,
  stairSupportProxyCells:[...model.values()].filter(v=>v.types.includes('STAIR_SUPPORT_PROXY')).length,
  stairHalfBlockShapes:stepBoxes.length,
  solidVoxelRoleConflicts:conflicts.length,
  stepOverlapsWithRemainingFloors:stepFloorConflicts.length,
  stairStepsAgainstSourceArchitecture:stepSourceConflicts.length,
  twoWideUnreachableTargets:routes.unreachableTargets.length,
  twoWideSquaresReachable:routes.floorStats.reduce((n,f)=>n+f.reachableTwoWideSquares,0),
  physicalWalkableStairsCertified:0,constructionCommands:0,worldContacts:0
 };
 const issues=[
  ...(conflicts.length?['MULTI_ROLE_SOLID_VOXEL_CONFLICT']:[]),
  ...(stepFloorConflicts.length?['STAIR_TREAD_COLLIDES_WITH_UNCUT_FLOOR']:[]),
  ...(stepSourceConflicts.length?['STAIR_TREAD_COLLIDES_WITH_ENVELOPE_OR_FURNITURE']:[]),
  ...(routes.unreachableTargets.length?['CONTINUOUS_TWO_WIDE_PATH_TARGETS_UNREACHABLE']:[]),
  'STAIR_FINAL_HALF_STEP_COLLISION_WITH_LANDING_REQUIRES_EDUCATION_CERTIFICATION',
  'NO_REAL_DOOR_OR_BED_BLOCK_STATE_CERTIFICATION',
  'EXTERIOR_AND_INTERIOR_VISUAL_QUALITY_NOT_APPROVED'
 ];
 const result={schema:'minecraftaibuilder-b114-house-unified-3d-offline-v1',id:'HOUSE_V3',
  sourceB114Integrity:b114.integritySha256,sourceHouseSourceDigest:house.sourceDesignProof,
  referenceSource:'B104_B105_B113_B114_PROVISIONAL_ONLY',
  floorLevels:floors.map((f,i)=>({level:i,slabY:i*5,
   originalFloorCellCount:cells(f).length,removedForShaft:[...apertures[i]].sort(),
   floorCellsRetained:floorRemaining[i]})),
  candidateSolids:[...model.values()].sort((a,b)=>a.y-b.y||a.z-b.z||a.x-b.x),
  stairHalfStepAABBs:stepBoxes,collisions:{voxelRoleConflicts:conflicts,
   stepFloorConflicts,stepSourceConflicts},
  corridors:routes,totals,issues,
  plannedBlocksAreNotMinecraftCommands:true,
  minecraftBlockStatesVerified:false,realMovementCertified:false,
  certificationStatus:'UNVERIFIED_EDUCATION_1_26_32_0',
  proposalAppliedToSource:false,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...result,integritySha256:hash(result)};
}
export function validateHouseUnified3D(r){
 try{
  if(!r)return false;
  const {integritySha256,...body}=r;
  return integritySha256===hash(body)&&r.schema==='minecraftaibuilder-b114-house-unified-3d-offline-v1'&&
   r.id==='HOUSE_V3'&&r.sourceB114Integrity?.length===64&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&r.commandCount===0&&
   r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan?.commandCount===0&&
   r.BuildPlan?.worldCoordinates===null&&r.BuildPlan?.operations?.length===0&&
   r.gates?.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.realMovementCertified===false&&r.plannedBlocksAreNotMinecraftCommands===true&&
   r.minecraftBlockStatesVerified===false&&r.proposalAppliedToSource===false&&
   r.totals.floorLevels===2&&r.totals.conceptRooms===3&&r.totals.stairFlights===2&&
   r.totals.physicalWalkableStairsCertified===0&&r.totals.worldContacts===0&&
   r.totals.constructionCommands===0&&
   r.totals.provisionalFloorSlabCells===r.floorLevels.reduce((n,f)=>n+f.floorCellsRetained,0)&&
   r.totals.carvedUpperSlabCells===r.floorLevels.reduce((n,f)=>n+f.removedForShaft.length,0)&&
   r.totals.independentlyVerifiedTwoWideRoomPaths<=3&&
   r.corridors.rooms.every(p=>p.actualDoorCollisionVerified===false);
 }catch{return false;}
}
export function writeUnified(r,dir){
 if(!validateHouseUnified3D(r))throw Error('B114_UNIFIED_UNSAFE_EXPORT');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B114_HOUSE_V3_Unified_3D_Proposal.json');
 const md=path.join(dir,'B114_HOUSE_V3_Unified_3D_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# HOUSE_V3 — 単一の局所3D建築案の独立監査（非施工）','',
  'B104・B105の床・外装・家具とB114階段・開口・迂回通路案を同一占有空間に結合。',
  'Minecraft Educationへ接続していない。ワールド座標・ブロック設置コマンドは含まない。','',
  '|検証|値|','|---|---:|',
  '|旧モデルの単セル仮経路|'+t.original3DRoomPaths+' / 3|',
  '|独立した幅2通路グラフから仮到達できる部屋|'+t.independentlyVerifiedTwoWideRoomPaths+' / 3|',
  '|幅2で到達できない要件|'+t.twoWideUnreachableTargets+'|',
  '|元床を保持した設計セル|'+t.provisionalFloorSlabCells+'|',
  '|上階床開口案|'+t.carvedUpperSlabCells+'|',
  '|階段支持体の占有セル|'+t.stairSupportProxyCells+'|',
  '|既存床と支持体の共有セル|'+t.supportFloorSharedCells+'|',
  '|階段の半段差AABB候補|'+t.stairHalfBlockShapes+'|',
  '|複数役割による非共有の占有衝突|'+t.solidVoxelRoleConflicts+'|',
  '|踏み面と未開口の床の衝突|'+t.stepOverlapsWithRemainingFloors+'|',
  '|踏み面と外装・家具の衝突|'+t.stairStepsAgainstSourceArchitecture+'|',
  '|実機で通れると認証した階段|0|','',
  '## 未解決・保留（合格と偽らない）',
  ...r.issues.map(x=>'- '+x),'',
  '幅2判定は2×2通路アンカーが連続し、玄関→階段→各室が同じネットワークに接続しているかを見る。',
  'ブロック衝突・屋根形状・家具の操作・ドア状態は実Educationで未認証。',
  '階段の最終半段差と支持床の重なりは非認証であり、通行成功と判定しない。',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / operations=[]'
 ].join('\n')+'\n');
 return {json,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const parent=await assembleReferenceParent(),b113=buildB113(parent),b114=buildB114(parent,b113);
 const house=inspectHouse(parent,b113,b114),out=buildHouseUnified3D(parent,b113,b114,house);
 writeUnified(out,path.resolve('b114-review-output'));
 console.log(JSON.stringify({totals:out.totals,issues:out.issues},null,2));
}