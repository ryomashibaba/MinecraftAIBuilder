/** B92 joint floor spatial retiler. Read-only design alternatives, NEVER BuildPlan instructions. */
import {key,maskHasFloor} from '../../b79/main/compile-b79.mjs';
import {interiorEdges} from '../../b86/main/compile-b86.mjs';
import {frameAt,walkable,findCorridorRoute,corridorNetwork} from '../../b88/main/compile-b88.mjs';
import {chooseCoreAndPaths} from '../../b78/main/compile-b78.mjs';
const ds=[{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:-1,z:0}];
const vk=p=>`${p.x},${p.y},${p.z}`;
export const sites=r=>Array.from({length:r.depth*r.width},(_,i)=>({x:r.x+i%r.width,z:r.z+Math.floor(i/r.width)}));
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const touch=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
const guarded=(p,level,idx,fixed)=>fixed.protectedSites.has(key(p))||[1,2].some(dy=>{
 const v={...p,y:(level-1)*5+dy};return fixed.solids.has(vk(v))||fixed.reserved.has(vk(v))||idx.final.get(vk(v))?.occupied;
});
/** Physical two-block air and pinned-core adjacency, NOT a global exit certification. */
export function physicalCoreRoute(start,shape,idx,fixed,otherRooms,{limit=4096}={}){
 const vertical=[...shape.conceptReservations.stairs,...shape.conceptReservations.elevators];
 const floorNamed=new Set(shape.conceptReservations.corridors.map(key));
 if(!walkable(start,shape.level,shape,idx,fixed,otherRooms))return {reachable:false,reason:'START_NOT_TWO_HIGH_CLEAR',length:null};
 const seen=new Set([key(start)]),q=[{p:start,n:0}];
 for(let i=0;i<q.length&&i<limit;i++){
  const a=q[i];if(floorNamed.has(key(a.p))&&vertical.some(s=>touch(s,a.p)))
   return {reachable:true,reason:'NOMINAL_VERTICAL_CORE_NEIGHBOR_TWO_HIGH_AIR',length:a.n,endpoint:a.p,visited:seen.size,exitCertified:false};
  for(const d of ds){const p={x:a.p.x+d.x,z:a.p.z+d.z},k=key(p);
   if(seen.has(k)||!floorNamed.has(k)||!walkable(p,shape.level,shape,idx,fixed,otherRooms))continue;
   seen.add(k);q.push({p,n:a.n+1});
  }
 }
 return {reachable:false,reason:'NO_PHYSICAL_NAMED_CORRIDOR_TO_VERTICAL_CORE',length:null,visited:seen.size,exitCertified:false};
}
/** Search rectangle relocation/axis rotation. No approved room ever shrunk or modified.
 * Prohibit occupying old named corridor, other rooms, existing protected slots or any pinned voxel.
 * A recovered doorway needs a full frame + actual 2-high air + geometrical indoor core + linked hall. */
export function retileRoom({room,shape,idx,fixed,otherRooms,maxShift=3,minRatio=0.75,maxOptions=4}){
 const named=new Set(shape.conceptReservations.corridors.map(key));
 const vertical=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const original=new Set(sites(room).map(key)),rejections={area:0,mask:0,otherRoom:0,reservedOrCorridor:0,production:0,core:0,doorOrFrame:0,noCorridor:0,coreTopology:0};
 const network=corridorNetwork(shape),cand=[];
 const kinds=[{width:room.width,depth:room.depth,layout:'TRANSLATE'}, ...(room.width!==room.depth?[{width:room.depth,depth:room.width,layout:'ROTATE_AND_TRANSLATE'}]:[]),
  ...[{width:room.width-1,depth:room.depth,layout:'SHRINK_X_AND_SHIFT'},
      {width:room.width,depth:room.depth-1,layout:'SHRINK_Z_AND_SHIFT'}].filter(q=>q.width>=3&&q.depth>=3&&q.width*q.depth>=Math.ceil(room.width*room.depth*minRatio))];
 for(const dims of kinds)for(let dz=-maxShift;dz<=maxShift;dz++)for(let dx=-maxShift;dx<=maxShift;dx++){
  if(dx===0&&dz===0&&dims.layout==='TRANSLATE')continue;
  const rect={id:room.id,x:room.x+dx,z:room.z+dz,width:dims.width,depth:dims.depth},cells=sites(rect);
  const overlap=cells.filter(p=>original.has(key(p))).length;
  const ratio=cells.length/(room.width*room.depth);
  if(ratio<minRatio||overlap<Math.ceil(room.width*room.depth*.5)){rejections.area++;continue;}
  if(cells.some(p=>!maskHasFloor(shape.floorMaskRows,p))){rejections.mask++;continue;}
  if(cells.some(p=>otherRooms.some(r=>inside(r,p)))){rejections.otherRoom++;continue;}
  if(cells.some(p=>named.has(key(p))||vertical.has(key(p))||fixed.protectedSites.has(key(p)))){rejections.reservedOrCorridor++;continue;}
  const gained=cells.filter(p=>!original.has(key(p)));
  if(gained.some(p=>guarded(p,shape.level,idx,fixed))){rejections.production++;continue;}
  // A new room's reserved indoor core must still have 2x2 usable air; do not change original production.
  const forbidden=new Set(cells.filter(p=>guarded(p,shape.level,idx,fixed)).map(key));
  const originalCandidates=[];
  for(const e of interiorEdges(rect)){
   if(!maskHasFloor(shape.floorMaskRows,e.hall)||otherRooms.some(r=>inside(r,e.hall))||vertical.has(key(e.hall)))continue;
   if(guarded(e.cell,shape.level,idx,fixed)||guarded(e.hall,shape.level,idx,fixed))continue;
   const frame=frameAt(e,shape,idx,fixed,otherRooms);if(!frame)continue;
   const access=findCorridorRoute(e.hall,shape,idx,fixed,[...otherRooms,rect],network,{maxLength:12});
   if(!access)continue;
   const forbiddenForCore=new Set([...forbidden,...frame.voxels.map(key),...named]);
   forbiddenForCore.delete(key(e.cell));
   const roomCore=chooseCoreAndPaths(rect,[e.cell],forbiddenForCore);
   if(!roomCore)continue;
   const topology=physicalCoreRoute(access.target??access.sites.at(-1),shape,idx,fixed,[...otherRooms,rect]);
   originalCandidates.push({roomCell:e.cell,hallCell:e.hall,normal:e.normal,
     corridorCells:access.sites,extraCorridorCells:access.newHallSites,physicalCoreRoute:topology,
     roomCore:roomCore.core,retainedFullFrameExisting:frame.jambEvidence.length===6,
     oldDoorClosed:false,bedrockHingeVerified:false});
  }
  if(!originalCandidates.length){rejections.doorOrFrame++;continue;}
  originalCandidates.sort((a,b)=>Number(b.physicalCoreRoute.reachable)-Number(a.physicalCoreRoute.reachable)||
   a.extraCorridorCells.length-b.extraCorridorCells.length||key(a.roomCell).localeCompare(key(b.roomCell)));
  const selected=originalCandidates[0];
  // A new room footprint cannot claim the existing old footprint has been removed or reused until authorization.
  cand.push({roomId:room.id,rect,originalRect:room,layout:dims.layout,dx,dz,roomAreaRatio:ratio,
   overlapCellCount:overlap,relocatedCellCount:gained.length,surrenderedCells:sites(room).filter(p=>!cells.some(q=>key(q)===key(p))),
   newFootprintCells:gained,door:selected,viableLocalGeometry:true,
   verifiedPhysicalCoreNeighbor:selected.physicalCoreRoute.reachable,
   originalRoomDeletionApproved:false,independentRoomApproved:false,reviewOnly:true,
   requiredApprovals:['FULL_FLOOR_ZONING','OLD_ROOM_BOUNDARY_RELOCATION','INTERIOR_PARTITION_REVIEW','DOOR_SWING_AND_EGRESS'],
   worldCoordinates:null,executionAllowed:false,blockOperations:[]});
 }
 cand.sort((a,b)=>Number(b.verifiedPhysicalCoreNeighbor)-Number(a.verifiedPhysicalCoreNeighbor)||
  a.relocatedCellCount-b.relocatedCellCount||a.door.extraCorridorCells.length-b.door.extraCorridorCells.length||
  a.rect.z-b.rect.z||a.rect.x-b.rect.x);
 return {tested:(kinds.length*(2*maxShift+1)**2)-1,rejections,
  passingTotal:cand.length,reviewOptions:cand.slice(0,maxOptions),accepted:0,productionEdits:0};
}
export function auditExistingAperture(a,shape,idx,fixed,otherRooms){
 if(a.geometryFailures.length||a.productionContacts||a.priorProposalConflicts.length)return {roomId:a.roomId,considered:false,reason:'PRIOR_LOCAL_GEOMETRY_HELD',corePathVerified:false};
 const physical=physicalCoreRoute(a.doorHallCell,shape,idx,fixed,otherRooms);
 return {roomId:a.roomId,considered:true,door:a.doorRoomCell,physicalCoreRoute:physical,
  corePathVerified:physical.reachable,exitCertified:false,constructionApproved:false};
}
/** Review alternatives cannot set structural, functional or readiness approval. */
export function validateB92(report){
 if(report.readiness!=='NOT_PREPARED'||report.executionAllowed!==false||report.constructionApproved!==false||report.worldContacts!==0)return false;
 if(report.BuildPlan?.operations?.length!==0||report.gates?.length!==9||report.gates.some(g=>g.status!=='BLOCKED'))return false;
 if(report.totals?.previousUnapprovedCandidates!==296||report.totals?.originalHeldRooms!==18||report.totals?.newlyApprovedRooms!==0||report.rooms?.length!==18||report.floors?.length!==10)return false;
 if(report.rooms.some(r=>r.retile.reviewOptions.some(v=>v.executionAllowed!==false||v.blockOperations.length||v.independentRoomApproved!==false)))return false;
 if(report.totals.productionEdits!==0||report.totals.constructionCommands!==0||report.totals.worldContacts!==0)return false;
 return true;
}
