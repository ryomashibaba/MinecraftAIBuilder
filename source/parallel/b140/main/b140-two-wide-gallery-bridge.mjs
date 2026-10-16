/**
 * B140 source-preserving two-wide corridor BRIDGE PLANNER for every B138/B139
 * 5-block-rise stair interface. Geometry and routed overlays are OFFLINE IDEAS:
 * never world commands, never trusted as actual Education walkability.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {b138Fleet,b138FiveRiseSketch,verifyB138} from '../../b138/main/b138-five-rise-fleet.mjs';
import {b139Fleet,verifyB139} from '../../b139/main/b139-five-rise-repair.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const P=p=>p.x+','+p.z;
const XYZ=p=>p.x+','+p.y+','+p.z;
const DELTAS=[[1,0],[-1,0],[0,1],[0,-1]];
const int=n=>Number.isSafeInteger(n);
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const cross=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
export const B140_LIMITS=Object.freeze({
 sourceBuildings:15,sourceFloors:66,sourceStairs:102,
 expectedPinned:78,expectedMissing:24,
 searchRadius:10,maxExploredAlternatives:120,
 maxRouteSteps:96,maxAddedCellsPerSide:120,
 approvedCommands:0
});
function partCells(stair,location){
 const {origin,ascent}=location;
 return Array.from({length:7},(_,i)=>[0,1].map(lane=>({
  x:origin.x+ascent.dx*i-ascent.dz*lane,
  z:origin.z+ascent.dz*i+ascent.dx*lane
 }))).flat();
}
function sideCells(landing,ascent,side){
 const sign=side==='LOWER'?-1:1;
 return landing.map(p=>({x:p.x+sign*ascent.dx,z:p.z+sign*ascent.dz}));
}
function walkable(floor,cores,p,blocked){
 if(floor.footprintRows?.[p.z]?.[p.x]!=='1'||blocked.has(P(p)))return false;
 if(floor.rooms.some(r=>inside(r,p))||cores.some(r=>inside(r,p)))return false;
 return true;
}
function horizontalPrefix(design,source,level){
 const floor=design.plan.floors[level],r=source.horizontalRoutes[level];
 if(!floor||!r||r.level!==level||
  r.repair?.sourceCellsPreserved!==true||
  r.repair?.allNewCellsOutsideRoomsAndCores!==true)
  throw Error('B140_UNTRUSTED_B113_SOURCE_GALLERY');
 return new Set([...floor.gallery,...r.repair.addedCells].map(P));
}
function stepPoints(floor,cores,blocked,step){
 return step.length===2&&step.every(p=>walkable(floor,cores,p,blocked))&&
  cross(step[0],step[1]);
}
/** Compact heap Dijkstra: minimize added corridor cells first, then travel steps. */
class Heap{
 constructor(){this.a=[];}
 push(x){const a=this.a;let i=a.length;a.push(x);
  while(i>0){const j=(i-1)>>1;if(a[j].cost<=x.cost)break;
   a[i]=a[j];i=j;}a[i]=x;
 }
 pop(){const a=this.a;if(!a.length)return null;
  const first=a[0],last=a.pop();if(!a.length)return first;
  let i=0;while(2*i+1<a.length){let j=2*i+1;
   if(j+1<a.length&&a[j+1].cost<a[j].cost)j++;
   if(a[j].cost>=last.cost)break;a[i]=a[j];i=j;}
  a[i]=last;return first;
 }
 get size(){return this.a.length;}
}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
/**
 * Dijkstra on overlapping 2x2 squares. Every move shares a complete two-cell
 * boundary with the previous square: width two is preserved THROUGH CORNERS.
 * Start square must cover BOTH approach cells outside the stair landing.
 * Goal square must be made entirely from existing source/B113-gallery cells.
 */
export function b140RouteTwoWide({floor,cores,sourceGallery,landing,ascent,side,
 blocked=new Set(),maxAdded=B140_LIMITS.maxAddedCellsPerSide}){
 if(!floor||!Array.isArray(floor.footprintRows)||!Array.isArray(cores)||
  !(sourceGallery instanceof Set)||!(blocked instanceof Set)||
  !Array.isArray(landing)||landing.length!==2||
  !landing.every(p=>int(p.x)&&int(p.z))||!cross(landing[0],landing[1])||
  !int(ascent?.dx)||!int(ascent?.dz)||
  Math.abs(ascent.dx)+Math.abs(ascent.dz)!==1||
  !['LOWER','UPPER'].includes(side))
  throw Error('B140_ROUTE_INPUT_INVALID');
 const portal=sideCells(landing,ascent,side);
 if(!portal.every(p=>walkable(floor,cores,p,blocked)))
  return {status:'HOLD_STAIR_APPROACH_BLOCKED',side,
   sourceConnected:false,addedCells:[],pathSquares:[],visited:0};
 const square=p=>[p,{x:p.x+1,z:p.z},{x:p.x,z:p.z+1},
  {x:p.x+1,z:p.z+1}];
 const maxZ=floor.footprintRows.length;
 const maxX=Math.max(...floor.footprintRows.map(r=>r.length));
 const valid=p=>p.x>=0&&p.z>=0&&p.x<maxX-1&&p.z<maxZ-1&&
  square(p).every(c=>walkable(floor,cores,c,blocked));
 const starts=portal[0].x===portal[1].x?
  [{x:portal[0].x-1,z:Math.min(portal[0].z,portal[1].z)},
   {x:portal[0].x,z:Math.min(portal[0].z,portal[1].z)}]:
  [{x:Math.min(portal[0].x,portal[1].x),z:portal[0].z-1},
   {x:Math.min(portal[0].x,portal[1].x),z:portal[0].z}];
 const startList=starts.filter(valid);
 if(!startList.length)return {status:'HOLD_STAIR_APPROACH_NO_2x2_TURN_CLEARANCE',side,
  sourceConnected:false,addedCells:[],pathSquares:[],visited:0};
 const isGoal=p=>square(p).every(c=>sourceGallery.has(P(c)));
 const best=new Map(),previous=new Map(),queue=new Heap();
 const entryCost=p=>square(p).reduce((n,c)=>n+Number(!sourceGallery.has(P(c))),0);
 for(const start of startList){
  const cost=1000*entryCost(start),key=P(start);
  if(cost<(best.get(key)??Infinity)){
   best.set(key,cost);previous.set(key,null);
   queue.push({p:start,cost,steps:0});
  }
 }
 let visited=0,final=null;
 while(queue.size){
  const q=queue.pop(),key=P(q.p);
  if(q.cost!==best.get(key))continue;
  visited++;
  if(isGoal(q.p)){final=q.p;break;}
  if(q.steps>=B140_LIMITS.maxRouteSteps)continue;
  const current=new Set(square(q.p).map(P));
  for(const [dx,dz] of DELTAS){
   const next={x:q.p.x+dx,z:q.p.z+dz},k=P(next);
   if(!valid(next))continue;
   const inc=square(next).filter(p=>
    !current.has(P(p))&&!sourceGallery.has(P(p))).length;
   const cost=q.cost+1000*inc+1;
   if(cost>=(best.get(k)??Infinity))continue;
   best.set(k,cost);previous.set(k,key);
   queue.push({p:next,cost,steps:q.steps+1});
  }
 }
 if(!final)return {status:'HOLD_NO_TWO_WIDE_SOURCE_ROUTE',side,
  sourceConnected:false,addedCells:[],pathSquares:[],visited};
 const points=[];let key=P(final);
 while(key!==null&&key!==undefined){const [x,z]=key.split(',').map(Number);
  points.push({x,z});key=previous.get(key);
 }
 points.reverse();
 const newCells=new Map();
 for(const p of points)for(const c of square(p))
  if(!sourceGallery.has(P(c)))newCells.set(P(c),c);
 if(newCells.size>maxAdded)
  return {status:'HOLD_ROUTE_EXCEEDS_ADDITION_BUDGET',side,
   sourceConnected:false,addedCells:[],pathSquares:[],visited,
   requiredCells:newCells.size};
 return {status:'PROPOSED_TWO_WIDE_ADD_ONLY_BRIDGE',side,
  sourceConnected:true,approachPortal:portal,
  addedCells:[...newCells.values()],
  pathSquares:points,steps:points.length-1,visited,
  sourceGalleryUntouched:true,protectedRoomsAndCoresUntouched:true,
  actualMinecraftConnectivityProven:false,worldCommands:[]};
}
/** Pure geometry screening. Separate from the corridor BFS. */
export function b140CandidateGeometry(design,stair,location){
 const cells=partCells(stair,location);
 const a=design.plan.floors[stair.fromLevel],b=design.plan.floors[stair.toLevel],
  own=design.plan.cores[stair.coreIndex];
 if(!own||cells.length!==14||new Set(cells.map(P)).size!==14)
  return {valid:false,reason:'STAIR_FOOTPRINT_OR_CORE_INVALID'};
 const fits=cells.every(p=>a.footprintRows?.[p.z]?.[p.x]==='1'&&
  b.footprintRows?.[p.z]?.[p.x]==='1'&&
  ![...a.rooms,...b.rooms].some(r=>inside(r,p))&&
  !design.plan.cores.some((c,i)=>i!==stair.coreIndex&&inside(c,p)));
 if(!fits||!cells.some(p=>inside(own,p)))
  return {valid:false,reason:'ROOM_PLATE_OTHER_CORE_OR_NO_CORE_CONTACT'};
 return {valid:true,cells,
  low:cells.slice(0,2),upper:cells.slice(-2),
  footprintKeys:new Set(cells.map(P)),
  sourceRoomsMoved:false};
}
function descriptor(sketch){
 const low=sketch.lowerSeam,high=sketch.upperSeam;
 const a=sketch.positions.find(p=>p.index===0&&p.lane===0).position,
  b=sketch.positions.find(p=>p.index===1&&p.lane===0).position;
 return {origin:{x:a.x,z:a.z},ascent:{dx:b.x-a.x,dz:b.z-a.z},
  lowerLanding:low,upperLanding:high};
}
function validDescriptor(d){
 return d&&int(d.origin?.x)&&int(d.origin?.z)&&
  Math.abs(d.ascent?.dx)+Math.abs(d.ascent?.dz)===1;
}
function footprintAllows(design,stair,entry){
 if(!validDescriptor(entry))return false;
 return b140CandidateGeometry(design,stair,entry).valid;
}
function spreadCandidates(design,stair,radius=B140_LIMITS.searchRadius){
 const own=design.plan.cores[stair.coreIndex];
 if(!own)throw Error('B140_SOURCE_CORE_NOT_FOUND');
 const found=[],all=[{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}];
 for(const ascent of all)
  for(let x=own.x-radius;x<=own.x+own.width+radius;x++)
   for(let z=own.z-radius;z<=own.z+own.depth+radius;z++){
    const d={origin:{x,z},ascent};
    if(!footprintAllows(design,stair,d))continue;
    found.push(d);
   }
 const mid={x:own.x+own.width/2,z:own.z+own.depth/2};
 found.sort((a,b)=>Math.abs(a.origin.x-mid.x)+Math.abs(a.origin.z-mid.z)-
   Math.abs(b.origin.x-mid.x)-Math.abs(b.origin.z-mid.z)||
   a.origin.z-b.origin.z||a.origin.x-b.origin.x||
   a.ascent.dx-b.ascent.dx||a.ascent.dz-b.ascent.dz);
 return found;
}
function stitch(design,case113,stair,location){
 const geo=b140CandidateGeometry(design,stair,location);
 if(!geo.valid)return {status:'HOLD_GEOMETRY',geo,bridges:[]};
 const blocked=geo.footprintKeys,
  runSide=(side,level,landing)=>{
   const floor=design.plan.floors[level];
   return b140RouteTwoWide({floor,cores:design.plan.cores,
    sourceGallery:horizontalPrefix(design,case113,level),
    landing,ascent:location.ascent,side,blocked});
  };
 const lower=runSide('LOWER',stair.fromLevel,geo.low),
  upper=runSide('UPPER',stair.toLevel,geo.upper);
 const good=lower.sourceConnected&&upper.sourceConnected;
 return {status:good?'CANDIDATE_WITH_TWO_WIDE_ADDITIVE_BRIDGES':
  'HOLD_ONE_OR_BOTH_CORRIDOR_BRIDGES',geo,
  bridges:[lower,upper],
  addedCells:good?lower.addedCells.length+upper.addedCells.length:null,
  lowerConnected:lower.sourceConnected,upperConnected:upper.sourceConnected};
}
/** Plan one original flight; never delete rooms, stairs or source corridor. */
export function b140PlanStair(design,case113,stair,{pinnedSketch=null,
 searchRadius=B140_LIMITS.searchRadius,maxCandidates=B140_LIMITS.maxExploredAlternatives}={}){
 if(!stair||!int(stair.fromLevel)||!int(stair.toLevel)||
  stair.toLevel!==stair.fromLevel+1||
  searchRadius<0||searchRadius>12||maxCandidates<1||maxCandidates>600)
  throw Error('B140_BAD_STAIR_SOURCE_OR_SEARCH');
 let candidates=[],usedPinned=!!pinnedSketch,geometricCount=0;
 let original=null;
 if(pinnedSketch){
  original=descriptor(pinnedSketch);
  if(!footprintAllows(design,stair,original))
   throw Error('B140_PINNED_B138_GEOMETRY_REJECTED');
  candidates=[original];
 }else{
  const all=spreadCandidates(design,stair,searchRadius);
  geometricCount=all.length;
  candidates=all.slice(0,maxCandidates);
 }
 let best=null,rejections={},evaluated=0;
 const seen=new Set();
 const runCandidates=(options)=>{
 for(const entry of options){
  const key=P(entry.origin)+':'+entry.ascent.dx+','+entry.ascent.dz;
  if(seen.has(key))continue;seen.add(key);evaluated++;
  const tested=stitch(design,case113,stair,entry);
  if(tested.status!=='CANDIDATE_WITH_TWO_WIDE_ADDITIVE_BRIDGES'){
   for(const b of tested.bridges){
    if(!b.sourceConnected)rejections[b.status]=(rejections[b.status]??0)+1;
   }
   continue;
  }
  if(!best||tested.addedCells<best.stitch.addedCells||
    (tested.addedCells===best.stitch.addedCells&&
     tested.bridges.reduce((n,b)=>n+b.steps,0)<
     best.stitch.bridges.reduce((n,b)=>n+b.steps,0))){
   best={entry,stitch:tested};
   if(tested.addedCells===0)break;
  }
 }
 };
 runCandidates(candidates);
 // A pinned B113 reservation is prioritized, but it is NOT locked if its
 // gallery access is impossible. Search source-preserving relocations too.
 if(usedPinned&&(!best||best.stitch.addedCells>0)){
  const expanded=spreadCandidates(design,stair,searchRadius);
  geometricCount=expanded.length;
  runCandidates(expanded.slice(0,maxCandidates));
 }
 if(!usedPinned)geometricCount=Math.max(geometricCount,candidates.length);
 if(!best)return {status:geometricCount===0?
  'HOLD_NO_ROOM_PRESERVING_FIVE_RISE_7x2_GEOMETRY':
  'HOLD_TWO_WIDE_ROUTE_NOT_FOUND_OR_SEARCH_BUDGET',
  sourcePinned:usedPinned,examined:evaluated,
  totalSourceCompatibleGeometries:geometricCount,
  bridgeRejections:rejections,selected:null,
  sourceModified:false,worldCommands:[]};
 const sketch=b138FiveRiseSketch(stair,{
  origin:best.entry.origin,ascent:best.entry.ascent,
  footprintCells:partCells(stair,best.entry),
  lowerLanding:best.stitch.geo.low,upperLanding:best.stitch.geo.upper
 });
 return {status:'OFFLINE_FIVE_RISE_CONNECTED_BY_CONCEPTUAL_2WIDE_CORRIDOR',
  sourcePinned:usedPinned,examined:evaluated,
  selectedRelocatesPinnedGeometry:usedPinned&&
   (P(original.origin)!==P(best.entry.origin)||
    original.ascent.dx!==best.entry.ascent.dx||
    original.ascent.dz!==best.entry.ascent.dz),
  totalSourceCompatibleGeometries:geometricCount,
  selected:{
   origin:best.entry.origin,ascent:best.entry.ascent,
   fromLevel:stair.fromLevel,toLevel:stair.toLevel,
   sketch,lowerBridge:best.stitch.bridges[0],
   upperBridge:best.stitch.bridges[1],
   totalConceptualNewCorridorCells:best.stitch.addedCells,
   actualEducationWalkable:false,
   upperFloorSlabOpeningApproved:false,
   doorwayHeadroomAndSupportCertified:false,
   worldCoordinates:null,commandCount:0
  },
  sourceModified:false,worldCommands:[]};
}
function conflicts(a,b){
 const aa=a?.selected?.sketch?.positions.filter(p=>p.kind==='NORMAL_OAK_STAIR_CONCEPT')??[];
 const bb=b?.selected?.sketch?.positions.filter(p=>p.kind==='NORMAL_OAK_STAIR_CONCEPT')??[];
 const sa=new Set(aa.map(v=>XYZ(v.position)));
 const hit=bb.filter(v=>sa.has(XYZ(v.position)));
 return hit.slice(0,3).map(v=>v.position);
}
export function b140PlanBuilding(design,case113,case138){
 if(!design||!case113||!case138||
  case113.id!==design.candidateId||case138.id!==design.candidateId||
  case113.stairs.length!==case138.stairInterfaces.length)
  throw Error('B140_SOURCE_BUILDING_OR_STAIR_DRIFT');
 const rows=case113.stairs.map((stair,i)=>{
  const sketch=case138.stairInterfaces[i].fiveRiseSketch;
  const result=b140PlanStair(design,case113,stair,{pinnedSketch:sketch});
  return {stairIndex:i,coreIndex:stair.coreIndex,
   fromLevel:stair.fromLevel,toLevel:stair.toLevel,...result};
 });
 const overlaps=[];
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  if(Math.abs(rows[i].fromLevel-rows[j].fromLevel)>1)continue;
  const overlap=conflicts(rows[i],rows[j]);
  if(overlap.length)overlaps.push({first:i,second:j,samples:overlap});
 }
 return {id:case113.id,floors:design.plan.floors.length,stairs:rows.length,
  newlyConnected:rows.filter(x=>x.selected&&!x.sourcePinned).length,
  pinnedConnected:rows.filter(x=>x.selected&&x.sourcePinned).length,
  selectedIndependentPlans:rows.filter(x=>x.selected).length,
  crossFlightVoxelOverlapPairs:overlaps.length,
  conflictingPairs:overlaps,
  rows,originalDesignMutated:false,gameWrites:0};
}
export function b140Fleet(parent,b113,b138,b139){
 if(!validateB113(b113)||!verifyB138(b138)||!verifyB139(b139)||
  b139.B113Integrity!==b113.integritySha256||
  b139.B138Integrity!==b138.integritySha256||
  parent?.sourceDesigns?.length!==15||
  b138.cases?.length!==15||b139.cases?.length!==15)
  throw Error('B140_PARENT_INTEGRITY_OR_INVENTORY_FAILED');
 const cases=parent.sourceDesigns.map(d=>{
  const a=b113.cases.find(x=>x.id===d.candidateId);
  const b=b138.cases.find(x=>x.id===d.candidateId);
  if(!a||!b)throw Error('B140_PARENT_CASE_MISSING');
  return b140PlanBuilding(d,a,b);
 });
 const r=cases.flatMap(c=>c.rows);
 const proposed=r.filter(x=>!!x.selected);
 const allAdded=proposed.reduce((n,x)=>n+x.selected.totalConceptualNewCorridorCells,0);
 const totals={
  buildings:cases.length,floors:cases.reduce((n,x)=>n+x.floors,0),
  stairs:r.length,
  b139OriginalPinned:78,b139OriginallyMissing:24,
  pinnedWithTwoWideBridge:proposed.filter(x=>x.sourcePinned).length,
  missingWithNewRoomPreservingGeometryAndTwoWideBridge:proposed.filter(x=>!x.sourcePinned).length,
  stillUnrouted:r.length-proposed.length,
  independentStairCorridorConcepts:proposed.length,
  totalConceptualCorridorCellsAcrossIndependentPlans:allAdded,
  crossStairSameVoxelCollisionPairs:cases.reduce((n,c)=>n+c.crossFlightVoxelOverlapPairs,0),
  sourceRoomsMoved:0,sourceCoresMoved:0,sourceStairsModified:0,
  worldContacts:0,authorizedWorldWrites:0
 };
 if(totals.buildings!==15||totals.floors!==66||totals.stairs!==102||
  totals.pinnedWithTwoWideBridge>78||
  totals.missingWithNewRoomPreservingGeometryAndTwoWideBridge>24||
  totals.stillUnrouted+totals.independentStairCorridorConcepts!==102)
  throw Error('B140_REAL_FLEET_15_66_102_INVALID');
 const data={
  schema:'minecraftaibuilder-b140-2wide-bridge-planning-v1',
  sourceB113:b113.integritySha256,sourceB138:b138.integritySha256,
  sourceB139:b139.integritySha256,
  grounding:{
   B137VisualAndDownMotion:'USER_REPORTED_SINGLE_TEST_NOT_FLEET_CERTIFICATE',
   B139NoDirectTwoLaneBridgeSourceCount:77,
   b139AlreadyBothEndsConnected:1,
   preserveOriginalRoomsAndCores:true,
   originalInterfloorRiseBlocks:5,
   routeDerivedFromSourceGalleryAndB113AdditiveRepair:true,
   corridorRootIsTwoByTwoSourceSquareNotIndependentEntranceConnectivity:true,
   selectedCandidatesAreIndependentNotGloballyCoordinated:true,
   actualWorldCollisionOrDoorOpeningCertified:false
  },
  cases,totals,
  nextIntegration:'COORDINATED_MULTI_STAIR_CORRIDOR_AND_UPPER_APERTURE_REDRAW',
  worldCoordinates:null,worldContacts:0,constructionApproved:false,
  executionAllowed:false,readiness:'NOT_PREPARED',
  gates:b113.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],worldCoordinates:null,commandCount:0}
 };
 return {...data,integritySha256:H(data)};
}
export function verifyB140(r){
 try{
  const {integritySha256,...body}=r??{};
  const t=r.totals;
  return integritySha256===H(body)&&
   r.schema==='minecraftaibuilder-b140-2wide-bridge-planning-v1'&&
   t.buildings===15&&t.floors===66&&t.stairs===102&&
   t.b139OriginalPinned===78&&t.b139OriginallyMissing===24&&
   t.independentStairCorridorConcepts+t.stillUnrouted===102&&
   t.worldContacts===0&&t.authorizedWorldWrites===0&&
   r.cases.length===15&&r.gates.length===9&&
   r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan?.operations?.length===0&&
   r.worldCoordinates===null&&r.worldContacts===0&&
   r.constructionApproved===false&&r.executionAllowed===false&&
   r.readiness==='NOT_PREPARED'&&r.cases.every(c=>
    c.originalDesignMutated===false&&c.gameWrites===0&&
    c.rows.every(x=>x.worldCommands.length===0&&
     (!x.selected||x.selected.commandCount===0)));
 }catch{return false;}
}
export function writeB140(r,folder=path.join(ROOT,'b140-review-output')){
 if(!verifyB140(r))throw Error('B140_FAIL_CLOSED_REPORT_VERIFICATION');
 fs.mkdirSync(folder,{recursive:true});
 const json=path.join(folder,'B140_15Building_TwoWide_Gallery_Bridge_Plan.json');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const t=r.totals;
 const text=[
  '# B140 — 15棟の階段・幅2廊下 自動接続案',
  '',
  '102階段のうち、部屋とコアを変更せずに幅2の廊下へつなぐ',
  '**概念的な増設ルート**をB113/B138/B139凍結ソースから生成。',
  '**現地施工可能性、出入口からの完全な歩行保証、102階段の合格ではありません。**',
  '',
  '|項目|結果|','|---|---:|',
  '|元設計の建物/階床/階段|'+t.buildings+' / '+t.floors+' / '+t.stairs+'|',
  '|B139の78既存候補中、接続橋を計画できたもの|'+t.pinnedWithTwoWideBridge+'|',
  '|B139の24候補なし箇所中、新規の接続案を計画できたもの|'+t.missingWithNewRoomPreservingGeometryAndTwoWideBridge+'|',
  '|廊下両端の接続案がまだ見つからない階段|'+t.stillUnrouted+'|',
  '|階段ごとに独立して成立した接続案|'+t.independentStairCorridorConcepts+'|',
  '|個別計画での追加廊下セルの合算（重複未除去）|'+t.totalConceptualCorridorCellsAcrossIndependentPlans+'|',
  '|他の候補階段と同じ階段ブロック座標を使う衝突組|'+t.crossStairSameVoxelCollisionPairs+'|',
  '',
  'B139までの「廊下に直接接しているか」だけでなく、幅2のパスを',
  '部屋・元コアを避けながら追加設計するため、改善の余地を判定。',
  'ただし本工程は各階段を**独立**に計画したため、共用廊下の統合、',
  '上階開口、階段支持、ドア、元廊下から建物入口までの保証は次の工程。',
  '',
  '|建物|元階段|B138由来の候補で接続|元24不足からの新候補|その他のHOLD|',
  '|---|---:|---:|---:|---:|',
  ...r.cases.map(c=>'|'+c.id+'|'+c.stairs+'|'+c.pinnedConnected+'|'+
   c.newlyConnected+'|'+(c.stairs-c.selectedIndependentPlans)+'|'),
  '',
  '**NOT_PREPARED / 9 BLOCKED / BuildPlan.operations=[] / Minecraft操作なし。**'
 ];
 const report=path.join(folder,'B140_CONNECTED_CORRIDOR_SUMMARY_JA.md');
 fs.writeFileSync(report,text.join('\n')+'\n');
 return {json,report,totals:t,integritySha256:r.integritySha256};
}
export async function runB140(){
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113))throw Error('B140_REAL_B113_NOT_VERIFIED');
 const b138=b138Fleet(parent,b113);
 if(!verifyB138(b138))throw Error('B140_REAL_B138_NOT_VERIFIED');
 const b139=b139Fleet(parent,b113,b138);
 if(!verifyB139(b139))throw Error('B140_REAL_B139_NOT_VERIFIED');
 return writeB140(b140Fleet(parent,b113,b138,b139));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runB140(),null,2));}
 catch(e){console.error('B140_HOLD:',e.message);process.exitCode=1;}
}
