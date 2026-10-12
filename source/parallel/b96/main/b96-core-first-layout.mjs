/** B96 isolated, non-executable redesign branch. 2D/3D-local planning only; not a Minecraft BuildPlan. */
import {maskHasFloor,key} from '../../b79/main/compile-b79.mjs';
const as=(x,z)=>({x,z});
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const taxi=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const rectSites=r=>Array.from({length:r.width*r.depth},(_,i)=>as(r.x+i%r.width,r.z+Math.floor(i/r.width)));
const unique=xs=>[...new Set(xs)];
const touches=(a,b)=>rectSites(a).some(p=>rectSites(b).some(q=>taxi(p,q)===1));
const rectOf=sites=>{const xs=sites.map(p=>p.x),zs=sites.map(p=>p.z);return {x:Math.min(...xs),z:Math.min(...zs),width:Math.max(...xs)-Math.min(...xs)+1,depth:Math.max(...zs)-Math.min(...zs)+1};};
const floorMask=s=>new Set(s.floorMaskRows.flatMap((row,z)=>[...row].flatMap((v,x)=>v==='1'?[`${x},${z}`]:[])));
function isValidRectangle(r,mask){return rectSites(r).every(p=>mask.has(key(p)));}
function area(r){return r.width*r.depth;}
function intersects(r,occupied){return rectSites(r).some(p=>occupied.has(key(p)));}
const heldId=(r,s)=>!!s.heldRoomIds?.includes(r.id);
export function candidateCoreSites(sections,{width=3,depth=3,near=null,maximum=5}={}){
 const masks=sections.map(floorMask),w=Math.min(...sections.map(s=>s.floorMaskRows[0].length)),h=Math.min(...sections.map(s=>s.floorMaskRows.length));
 const choices=[];
 for(let z=1;z<h-depth;z++)for(let x=1;x<w-width;x++){
  const core={x,z,width,depth},cells=rectSites(core);
  if(masks.some(m=>cells.some(p=>!m.has(key(p)))))continue;
  const stairOverlap=sections.some(s=>cells.some(p=>s.conceptReservations.stairs.some(q=>key(q)===key(p))));
  const liftOverlap=sections.some(s=>cells.some(p=>s.conceptReservations.elevators.some(q=>key(q)===key(p))));
  if(stairOverlap||liftOverlap)continue;
  let touchesHeld=0,otherRoomTouches=0,nominalCorridors=0;
  for(const s of sections)for(const p of cells){
   const r=s.conceptRooms.find(r=>inside(r,p));if(r){if((near?.roomIds??[]).includes(r.id.replace(/^F\d+/,'F1'))||heldId(r,s))touchesHeld++;else otherRoomTouches++;}
   if(s.conceptReservations.corridors.some(q=>q.x===p.x&&q.z===p.z))nominalCorridors++;
  }
  const distance=near?taxi(as(x+1,z+1),near):0;
  choices.push({...core,otherRoomTouches,touchesHeld,nominalCorridors,distance});
 }
 choices.sort((a,b)=>a.otherRoomTouches-b.otherRoomTouches||b.touchesHeld-a.touchesHeld||a.distance-b.distance||a.z-b.z||a.x-b.x);
 return choices.slice(0,maximum);
}
/** 2x2 moving square = certified *concept* corridor width 2; avoids original elevator footprint.
 * Paths can cross nominal rooms because this is a distinct architecture, never baseline construction. */
export function routeTwoWide(section,core,{maxVisits=2000}={}){
 const mask=floorMask(section),exclude=new Set(section.conceptReservations.elevators.map(key));
 const coreKeys=new Set(rectSites(core).map(key)),stairs=new Set(section.conceptReservations.stairs.map(key));
 const nominal=new Set(section.conceptReservations.corridors.map(key));
 const blockedForRoute=(x,z)=>{
  const sites=rectSites({x,z,width:2,depth:2});
  return sites.some(p=>!mask.has(key(p))||exclude.has(key(p))||coreKeys.has(key(p)));
 };
 const candidates=[];for(let z=0;z<section.floorMaskRows.length-1;z++)for(let x=0;x<section.floorMaskRows[0].length-1;x++){
  if(blockedForRoute(x,z))continue;
  const square=rectSites({x,z,width:2,depth:2});
  if(square.some(p=>rectSites(core).some(q=>taxi(p,q)===1)))candidates.push({x,z});
 }
 const originalCore=section.conceptReservations.stairs;
 const scoreCell=p=>{
  const r=section.conceptRooms.find(r=>inside(r,p));return (r?heldId(r,section)?4:14:0)+(nominal.has(key(p))?-0.2:0);
 };
 const best=new Map(),prev=new Map(),queue=[];
 for(const p of candidates){const k=key(p);best.set(k,0);queue.push([0,k]);prev.set(k,null);}
 let end=null,visits=0;
 while(queue.length&&visits++<maxVisits){queue.sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1]));const [cost,k]=queue.shift();if(cost!==best.get(k))continue;
  const [x,z]=k.split(',').map(Number),square=rectSites({x,z,width:2,depth:2});
  if(square.some(p=>originalCore.some(q=>taxi(p,q)===1))){end=k;break;}
  for(const [dx,dz] of dirs){const nx=x+dx,nz=z+dz,nk=`${nx},${nz}`;if(blockedForRoute(nx,nz))continue;
   const entering=rectSites({x:nx,z:nz,width:2,depth:2}).filter(p=>!square.some(q=>key(p)===key(q)));
   const increment=1+entering.reduce((v,p)=>v+scoreCell(p),0);
   const proposed=cost+increment;
   if(proposed<(best.get(nk)??Infinity)){best.set(nk,proposed);prev.set(nk,k);queue.push([proposed,nk]);}
  }
 }
 if(!end)return {connectedToExistingStair:false,widthGuaranteed:0,sites:[],anchorPath:[],reason:'NO_TWO_WIDE_ROUTE_TO_EXISTING_STAIR',localReviewOnly:true};
 const path=[],seen=new Set();for(let k=end;k!==null&&k!==undefined;k=prev.get(k)){if(seen.has(k))throw Error('CORRIDOR_ROUTE_PARENT_CYCLE');seen.add(k);path.push(k);}path.reverse();
 const newCorridor=unique(path.flatMap(k=>{const [x,z]=k.split(',').map(Number);return rectSites({x,z,width:2,depth:2}).map(key);})).map(k=>{const [x,z]=k.split(',').map(Number);return as(x,z);});
 return {connectedToExistingStair:true,widthGuaranteed:2,sites:newCorridor,anchorPath:path,nominalCorridorReuse:newCorridor.filter(p=>nominal.has(key(p))).length,
  originalRoomSitesReassigned:newCorridor.filter(p=>section.conceptRooms.some(r=>inside(r,p))).length,cost:best.get(end),localReviewOnly:true};
}
function candidatesForRoom(original,mask,occupied){
 const minArea=Math.ceil(area(original)*0.75);
 const variants=[];
 for(const rotate of [false,true]){
  const w=rotate?original.depth:original.width,h=rotate?original.width:original.depth;
  for(const [rw,rh] of [[w,h],[w-1,h],[w,h-1],[w-1,h-1]]){
   if(rw<2||rh<2||rw*rh<minArea)continue;
   for(let z=original.z-5;z<=original.z+5;z++)for(let x=original.x-5;x<=original.x+5;x++){
    const r={x,z,width:rw,depth:rh};if(!isValidRectangle(r,mask)||intersects(r,occupied))continue;
    const delta=taxi(r,original);variants.push({r,delta,area:rw*rh,rotate,score:delta*10+(area(original)-rw*rh)*8+(rotate?2:0)});
   }
  }
 }
 variants.sort((a,b)=>a.score-b.score||b.area-a.area||a.r.z-b.r.z||a.r.x-b.r.x);
 return variants;
}
export function tileFloorAfterCore(section,core,route){
 const mask=floorMask(section),mandatory=[...rectSites(core),...route.sites, ...section.conceptReservations.stairs, ...section.conceptReservations.elevators],reserved=new Set(mandatory.map(key));
 const original=section.conceptRooms,allRooms=original.map(r=>({id:r.id,originalArea:area(r),original:{...r},heldPattern:heldId(r,section)}));
 // Preserve feasible rooms first, then retile only displaced ones. All rooms are NEW BRANCH virtual references, not changed B95.
 const occupied=new Set(reserved),pending=[],rooms=[];
 for(const r of original){if(isValidRectangle(r,mask)&&!intersects(r,occupied)){
  rectSites(r).forEach(p=>occupied.add(key(p)));rooms.push({...allRooms.find(q=>q.id===r.id),room:{...r},originalAreaRetainedRatio:1,relocation:'UNCHANGED_IN_NEW_BRANCH'});
 }else pending.push(r);}
 pending.sort((a,b)=>area(b)-area(a)||a.id.localeCompare(b.id));
 for(const r of pending){const v=candidatesForRoom(r,mask,occupied)[0];
  if(!v){rooms.push({...allRooms.find(q=>q.id===r.id),room:null,originalAreaRetainedRatio:0,relocation:'NO_ROOM_ALLOCATION_FOUND'});continue;}
  rectSites(v.r).forEach(p=>occupied.add(key(p)));rooms.push({...allRooms.find(q=>q.id===r.id),room:v.r,originalAreaRetainedRatio:v.area/area(r),relocation:'MOVED_OR_RETILED'});
 }
 rooms.sort((a,b)=>a.id.localeCompare(b.id));
 const corridor=new Set(route.sites.map(key)),nominalCorridor=new Set(section.conceptReservations.corridors.map(key));
 const entry=rooms.map(r=>({roomId:r.id,hasAdjacentTwoWideCorridor:!!r.room&&rectSites(r.room).some(p=>dirs.some(([dx,dz])=>corridor.has(`${p.x+dx},${p.z+dz}`))),
  adjacentToLegacyNamedCorridor:!!r.room&&rectSites(r.room).some(p=>dirs.some(([dx,dz])=>nominalCorridor.has(`${p.x+dx},${p.z+dz}`)))}));
 const allAssigned=rooms.filter(r=>r.room),heldAssigned=rooms.filter(r=>r.heldPattern&&r.room),areaOld=rooms.reduce((n,r)=>n+r.originalArea,0),areaNew=allAssigned.reduce((n,r)=>n+area(r.room),0);
 return {sectionId:section.id,level:section.level,virtualFloorMaskRows:section.floorMaskRows,legacyReferenceCores:{stairs:section.conceptReservations.stairs,elevators:section.conceptReservations.elevators},
 legacyNamedCorridorSites:section.conceptReservations.corridors,core,route,rooms,entrances:entry,stats:{originalRooms:original.length,allocatedRooms:allAssigned.length,
  unallocatedRooms:rooms.length-allAssigned.length,heldPatternRooms:rooms.filter(r=>r.heldPattern).length,heldPatternAssigned:heldAssigned.length,
  roomsAtLeast75Percent:rooms.filter(r=>r.originalAreaRetainedRatio>=.75).length,
  roomsAdjacentToTwoWideCoreRoute:entry.filter(r=>r.hasAdjacentTwoWideCorridor).length,
  roomsAdjacentToOriginalNominalCorridor:entry.filter(r=>r.adjacentToLegacyNamedCorridor).length,
  nominalRoomArea:areaOld,virtualAllocatedArea:areaNew,
  allocatedAreaRatio:areaOld?areaNew/areaOld:1,
  corridorSites:route.sites.length,coreSites:area(core),virtualSlabPenetrations:area(core),
  constructionOrProductionChangesApproved:0},localOnly:true};
}
export function buildCoreFirstBranch(sections,core){
 const floors=[];for(const s of sections){const route=routeTwoWide(s,core);const floor=tileFloorAfterCore(s,core,route);floors.push(floor);}
 const nominal=sections.reduce((n,s)=>n+s.conceptRooms.length,0),nominalArea=sections.reduce((n,s)=>n+s.conceptRooms.reduce((a,r)=>a+area(r),0),0);
 const allocated=floors.reduce((n,f)=>n+f.stats.allocatedRooms,0),fullEntrances=floors.reduce((n,f)=>n+f.stats.roomsAdjacentToTwoWideCoreRoute,0);
 const allRoutes=floors.every(f=>f.route.connectedToExistingStair),protectedFloorCutSites=area(core)*(sections.length-1);
 const aligned=sections.every(s=>isValidRectangle(core,floorMask(s)));
 const corridorArea=floors.reduce((n,f)=>n+f.stats.corridorSites,0);
 const changedRooms=floors.flatMap(f=>f.rooms.filter(r=>r.relocation==='MOVED_OR_RETILED'||!r.room).map(r=>`${f.sectionId}::${r.id}`));
 return {core,tiers:{floorPitch:5,internalClearHeightTarget:3,coreSitesPerLevel:area(core),virtualSlabOpeningsBetweenLevels:protectedFloorCutSites,
  continuousVirtualCore:aligned,virtualRoofKeptClosed:true,actualStairsGeometrySpecified:false},floors,
  summary:{nominalRooms:nominal,allocatedRooms:allocated,unallocatedRooms:nominal-allocated,nominalArea,retainedVirtualRoomArea:floors.reduce((n,f)=>n+f.stats.virtualAllocatedArea,0),
   retentionRatio:nominalArea?floors.reduce((n,f)=>n+f.stats.virtualAllocatedArea,0)/nominalArea:1,
   fullConceptCorridorConnections:allRoutes,roomDoorwayAdjacencyChecksPassed:fullEntrances,
   roomDoorwayAdjacencyChecksTotal:allocated,adjacentToUnverifiedLegacyCorridor:floors.reduce((n,f)=>n+f.stats.roomsAdjacentToOriginalNominalCorridor,0),
   convertedOrRelocatedRoomCount:changedRooms.length,interiorCorridorSites:corridorArea,
   structuralSlabCutApproved:false,accessibleEgressCertified:false,existingProductionRetainedUnmodified:true,
   constructionApproved:false,worldContacts:0,operations:[]},changedRoomRefs:changedRooms,
  status:'NEW_DESIGN_BRANCH_CONCEPT_ONLY_NEEDS_ARCHITECTURAL_REVIEW'};
}
export function verifyBranch(branch){
 if(branch.summary.constructionApproved!==false||branch.summary.operations.length||!branch.summary.existingProductionRetainedUnmodified||branch.summary.worldContacts!==0)return false;
 if(!branch.tiers.continuousVirtualCore||branch.tiers.actualStairsGeometrySpecified!==false||branch.tiers.virtualRoofKeptClosed!==true)return false;
 for(const f of branch.floors){
  const mask=floorMask({floorMaskRows:f.virtualFloorMaskRows});
  if([...rectSites(f.core),...f.route.sites].some(p=>!mask.has(key(p))))return false;
  const occupied=new Set();for(const p of [...rectSites(f.core),...f.route.sites])occupied.add(key(p));
  for(const r of f.rooms){if(!r.room)continue;
   if(area(r.room)/r.originalArea<.75-1e-9||rectSites(r.room).some(p=>!mask.has(key(p))))return false;
   for(const p of rectSites(r.room)){if(occupied.has(key(p)))return false;occupied.add(key(p));}
  }
  if(f.stats.allocatedRooms!==f.rooms.filter(r=>r.room).length)return false;
 }
 return true;
}
