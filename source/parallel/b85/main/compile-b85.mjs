/** B85: Whole-floor layout envelope search (read-only).
 * Compares frozen production after all writes. Never alters actual block operations.
 * Existing B81-B84 proposals, openings, paths, slabs and stairs remain protected.
 */
/** B84: non-destructive room-boundary redesign and short corridor reconnection research.
 * No source edits, building operations, world anchors or Minecraft connectivity.
 * Strictly preserves all 275 prior alternatives as protected conceptual occupancy.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex,inspectSite} from '../../b77/main/compile-b77.mjs';
import {chooseCoreAndPaths} from '../../b78/main/compile-b78.mjs';
import {key,hash,safe,maskHasFloor} from '../../b79/main/compile-b79.mjs';
import {corridorComponents,finalSolid} from '../../b80/main/compile-b80.mjs';
import {immutableFootprint,checkWholeFloorCandidate} from '../../b82/main/compile-b82.mjs';
import {claimExistingProposal} from '../../b83/main/compile-b83.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const get=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const fail=x=>{throw Error('B85_'+x)};
const vk=p=>`${p.x},${p.y},${p.z}`;
const site=p=>typeof p==='string'?p:key(p);
const rect=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const D=[{x:0,z:-1},{x:1,z:0},{x:0,z:1},{x:-1,z:0}];
const add=(p,d)=>({x:p.x+d.x,z:p.z+d.z});
const man=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const point=k=>{const [x,z]=k.split(',').map(Number);return {x,z}};
function frozenVoxels(fixed,added){return {
 solids:new Set([...fixed.solids,...added.solids]),reserved:new Set([...fixed.reserved,...added.reserved]),
 protectedSites:new Set([...fixed.protectedSites,...added.protectedSites])};}
export function variants(room){
 const v=[{...room,kind:'UNCHANGED_ROOM'}];
 for(const dir of ['west','east','north','south']){
  const r={...room,kind:`RETRACT_${dir.toUpperCase()}_ONE`};
  if(dir==='west'){r.x++;r.width--;}if(dir==='east')r.width--;
  if(dir==='north'){r.z++;r.depth--;}if(dir==='south')r.depth--;
  if(r.width>=3&&r.depth>=3)v.push(r);
 }
 return v;
}
/** Only clear, nominally unowned floor cells may become a proposed connection.
 * The target is an ACTUALLY CLEAR cell in the existing named corridor, never a guessed exit.
 */
export function shortestProtectedCorridor({hall,shape,idx,rooms,ownRoomId,immutable,claimedCorridors=new Set(),retainedRoom=null,maxCells=12}){
 const vertical=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const named=new Set(shape.conceptReservations.corridors.map(key));
 const otherRooms=rooms.filter(r=>r.id!==ownRoomId);
 const clear=p=>{
  const k=key(p);if(!maskHasFloor(shape.floorMaskRows,p)||vertical.has(k)||immutable.protectedSites.has(k)||claimedCorridors.has(k)||otherRooms.some(r=>rect(r,p))||(retainedRoom&&rect(retainedRoom,p)))return false;
  const lo=(shape.level-1)*5+1;
  return ![lo,lo+1].some(y=>finalSolid(idx,p,y)||immutable.solids.has(`${p.x},${y},${p.z}`)||immutable.reserved.has(`${p.x},${y},${p.z}`));
 };
 if(!clear(hall))return null;
 const queue=[[hall]],seen=new Set([key(hall)]);
 for(let q=0;q<queue.length;q++){
  const route=queue[q],end=route.at(-1),last=key(end);
  if(named.has(last))return {cells:route,addedCorridorCells:route.filter(p=>!named.has(key(p))),namedTarget:end,nominalOnly:true};
  if(route.length>=maxCells)continue;
  for(const dir of D){const n=add(end,dir),k=key(n);if(!seen.has(k)&&clear(n)){seen.add(k);queue.push([...route,n]);}}
 }
 return null;
}
function proposedEdges(r){const edges=[];for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
 const p={x,z};for(const normal of D){if(rect(r,add(p,normal)))continue;
  const tangent={x:normal.z,z:-normal.x};const left=add(p,tangent),right=add(p,{x:-tangent.x,z:-tangent.z});
  if(rect(r,left)&&rect(r,right))edges.push({cell:p,hall:add(p,normal),normal,left,right});
 }}return edges;}
/** Non-executable feasibility candidate; does NOT claim a Bedrock door is valid. */
/** Candidate rectangles occupy ONLY the existing room's area: no room or building grows.
 * Explore coupled north/south/east/west withdrawals as one whole-floor decision.
 * Reject tiny residual rooms and excessive loss; no automatic source edits. */
export function floorVariants(room){
 const out=[],oldArea=room.width*room.depth;
 for(let west=0;west<=Math.min(3,room.width-3);west++)
 for(let east=0;east<=Math.min(3,room.width-west-3);east++)
 for(let north=0;north<=Math.min(3,room.depth-3);north++)
 for(let south=0;south<=Math.min(3,room.depth-north-3);south++){
  const w=room.width-west-east,d=room.depth-north-south,lost=oldArea-w*d;
  if(lost<2||lost>Math.max(12,Math.floor(oldArea*.52)))continue;
  out.push({...room,x:room.x+west,z:room.z+north,width:w,depth:d,
   kind:`RETRACT_W${west}_E${east}_N${north}_S${south}`});
 }
 // Shift a complete room up to two grid cells, not into another room or fixed corridor.
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
  if(!dx&&!dz)continue;
  out.push({...room,x:room.x+dx,z:room.z+dz,kind:`SHIFT_X${dx}_Z${dz}`});
 }
 return out.sort((a,b)=>{const aCost=oldArea-a.width*a.depth,bCost=oldArea-b.width*b.depth;
  return aCost-bCost||Math.abs(a.x-room.x)+Math.abs(a.z-room.z)-Math.abs(b.x-room.x)-Math.abs(b.z-room.z);
 });
}
export function searchFloorRelayout({held,port,room,shape,source,idx,immutable,otherRooms,claimedCorridors=new Set()}){
 const originalRooms=shape.conceptRooms,vertical=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const named=new Set(shape.conceptReservations.corridors.map(key));
 const originalDoorCells=new Set(source.openingPorts.filter(p=>p.id!==port.id).map(p=>key(p.roomCell)));
 const base=(shape.level-1)*5;
 const observed={variants:0,edges:0,clearDoorAndFrame:0,roomCoreAndRoute:0,linkedToExistingNamedCorridor:0};
 const reject={};const nope=r=>{reject[r]=(reject[r]??0)+1;};
 const candidate=[];
 for(const r of floorVariants(room)){
  const removed=[];for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++)if(!rect(r,{x,z}))removed.push({x,z});
  if(removed.some(p=>immutable.protectedSites.has(key(p))||vertical.has(key(p))||[base+1,base+2,base+3].some(y=>immutable.solids.has(`${p.x},${y},${p.z}`)||immutable.reserved.has(`${p.x},${y},${p.z}`)))){nope('RETRACTS_IMMUTABLE_OR_VERTICAL_SITE');continue;}
  const newRoomCells=[];
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)if(!rect(room,{x,z}))newRoomCells.push({x,z});
  if(newRoomCells.some(p=>!maskHasFloor(shape.floorMaskRows,p)||vertical.has(key(p))||named.has(key(p))||immutable.protectedSites.has(key(p))||otherRooms.some(o=>rect(o,p))||
    [base+1,base+2,base+3].some(y=>finalSolid(idx,p,y)||immutable.solids.has(`${p.x},${y},${p.z}`)||immutable.reserved.has(`${p.x},${y},${p.z}`)))){nope('ROOM_SHIFT_NEEDS_FIXED_OR_NEIGHBOR_EDIT');continue;}
  observed.variants++;
  for(const e of proposedEdges(r)){
   observed.edges++;
   const {cell,hall,left,right,normal}=e;
   if(originalDoorCells.has(key(cell))||originalDoorCells.has(key(left))||originalDoorCells.has(key(right))){nope('OTHER_DOOR_SITE');continue;}
   if([cell,left,right].some(p=>!rect(r,p)||named.has(key(p))||vertical.has(key(p))||!maskHasFloor(shape.floorMaskRows,p))){nope('FRAME_NOT_IN_RETAINED_ROOM');continue;}
   if(otherRooms.some(o=>rect(o,hall))){nope('HALL_OCCUPIED_BY_ANOTHER_ROOM');continue;}
   const vox=[...Array.from({length:2},(_,i)=>({x:cell.x,z:cell.z,y:base+1+i,role:'DOOR_VOID'})),
    ...[left,right].flatMap((p,i)=>Array.from({length:3},(_,n)=>({x:p.x,z:p.z,y:base+1+n,role:i?'JAMB_RIGHT':'JAMB_LEFT'}))),
    {x:cell.x,z:cell.z,y:base+3,role:'LINTEL'}];
   if(vox.some(v=>finalSolid(idx,v,v.y)||immutable.solids.has(vk(v))||immutable.reserved.has(vk(v))||immutable.protectedSites.has(key(v)))){nope('FRAME_PRODUCTION_OR_PRIOR_ASSEMBLY');continue;}
   if([cell,hall].some(p=>[base+1,base+2].some(y=>finalSolid(idx,p,y)))){nope('DOOR_CLEARANCE_OVER_PRODUCTION');continue;}
   const roomInternal=add(cell,{x:-normal.x,z:-normal.z});const tangent={x:normal.z,z:-normal.x};
   const swOptions=[add(roomInternal,tangent),add(roomInternal,{x:-tangent.x,z:-tangent.z})];
   const swings=swOptions.map(side=>[roomInternal,side]).filter(ps=>ps.every(p=>rect(r,p)&&maskHasFloor(shape.floorMaskRows,p)&&!vertical.has(key(p))&&!named.has(key(p))&&
    !originalDoorCells.has(key(p))&&!immutable.protectedSites.has(key(p))&&[base+1,base+2].every(y=>!finalSolid(idx,p,y)&&!immutable.solids.has(`${p.x},${y},${p.z}`)&&!immutable.reserved.has(`${p.x},${y},${p.z}`))));
   if(!swings.length){nope('NO_ROOM_SIDE_SWING');continue;}
   observed.clearDoorAndFrame++;
   const forbidden=new Set();
   for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
    const p={x,z},k=key(p);
    if(!maskHasFloor(shape.floorMaskRows,p)||vertical.has(k)||named.has(k)||immutable.protectedSites.has(k)||[base+1,base+2].some(y=>finalSolid(idx,p,y)||immutable.solids.has(`${x},${y},${z}`)||immutable.reserved.has(`${x},${y},${z}`)))forbidden.add(k);
   }
   forbidden.add(key(left));forbidden.add(key(right));const core=chooseCoreAndPaths(r,[cell],forbidden);
   if(!core){nope('NO_RETAINED_2X2_ROOM_CORE_AND_ROUTE');continue;}
   observed.roomCoreAndRoute++;
   const connection=shortestProtectedCorridor({hall,shape,idx,rooms:originalRooms,ownRoomId:room.id,retainedRoom:r,immutable,claimedCorridors});
   if(!connection){nope('NO_UNOBSTRUCTED_CORRIDOR_LINK');continue;}
   observed.linkedToExistingNamedCorridor++;
   const swing=swings[0];
   if(core.reserved.some(k=>connection.cells.some(p=>key(p)===k))){nope('CORRIDOR_CROSSES_ROOM_CORE');continue;}
   const candidateVoxels=vox.map(v=>({...v}));
   const swingVoxels=swing.flatMap(p=>[base+1,base+2].map(y=>({x:p.x,y,z:p.z,role:'SWING_RESERVED_AIR'})));
   const proposal={portId:port.id,roomId:room.id,originalRoomRect:{x:room.x,z:room.z,width:room.width,depth:room.depth},newRoomRect:{x:r.x,z:r.z,width:r.width,depth:r.depth},
    changeType:r.kind,removedFromRoom:removed,proposedNewRoomCells:newRoomCells,doorRoomCell:cell,doorHallCell:hall,normal:{dx:normal.x,dz:normal.z},
    doorMoved:man(cell,port.roomCell)!==0||normal.x!==port.normal.dx||normal.z!==port.normal.dz,
    local3DVoxels:candidateVoxels,localSwingAirReservation:swingVoxels,protectedRoomCore:core.core,protectedRoute:core.paths[0],
    proposedCorridorAirCells:connection.cells,proposedNewCorridorCells:connection.addedCorridorCells,verifiedNamedCorridorTarget:connection.namedTarget,
    requiredRoomAreaChange:removed.length,requiredNewRoomCells:newRoomCells.length,
    retainedFloorAreaRatio:Number((r.width*r.depth/(room.width*room.depth)).toFixed(3)),requiredCorridorReclassification:connection.addedCorridorCells.length,
    immutableEnvelopeModified:false,existingTypedAssemblyModified:false,existingSourceDoorModified:false,
    doorHinge:null,doorStateCalibration:'UNVERIFIED',doorClosure:'UNAPPROVED',placementAllowed:false,worldCoordinates:null,operations:[]};
   const errors=checkWholeFloorCandidate({...proposal,opening:vox.filter(v=>v.role==='DOOR_VOID')},immutable,{solids:new Set(),reserved:new Set(),protectedSites:new Set()});
   if(errors.length){nope('EXISTING_ASSEMBLY_'+errors[0]);continue;}
   // Do not route a newly reserved corridor through the candidate solid frame or interior swing.
   const localAir=new Set([...swingVoxels,...vox].map(v=>key(v)));
   if(connection.cells.some(p=>localAir.has(key(p)))){nope('NEW_CORRIDOR_OVERLAPS_DOOR_FRAME_OR_SWING');continue;}
   candidate.push(proposal);
  }
 }
 candidate.sort((a,b)=> (b.retainedFloorAreaRatio-a.retainedFloorAreaRatio) || a.requiredNewRoomCells-b.requiredNewRoomCells || a.requiredRoomAreaChange-b.requiredRoomAreaChange||a.requiredCorridorReclassification-b.requiredCorridorReclassification||Number(a.doorMoved)-Number(b.doorMoved)||
  man(a.doorRoomCell,port.roomCell)-man(b.doorRoomCell,port.roomCell)||key(a.doorRoomCell).localeCompare(key(b.doorRoomCell)));
 return {portId:held.portId,roomId:room.id,candidatesInvestigated:observed,rejections:reject,best:candidate[0]??null,
   eligibleCount:candidate.length,status:candidate.length?'LOCAL_RELAYOUT_REVIEW_ONLY':'HOLD_NEEDS_DEEPER_TOPOLOGY_OR_PRODUCTION_EDIT',
   worldCoordinates:null,operations:[],autoApply:false};
}

/** Lowest-impact production-blocker atlas. This is *diagnostic*, not permission
 * to remove, replace, or reuse any production material. Each blocked voxel is
 * explicitly retained in the list with its final-write provenance. */
export function productionBlockerAtlas({room,port,shape,source,idx,immutable}){
 const base=(shape.level-1)*5,vertical=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const otherRooms=shape.conceptRooms.filter(r=>r.id!==room.id), corridors=new Set(shape.conceptReservations.corridors.map(key));
 const surveyed=[];
 for(const e of proposedEdges(room)){
  const {cell,hall,left,right,normal}=e;const excluded=[];
  if(!maskHasFloor(shape.floorMaskRows,cell)||!maskHasFloor(shape.floorMaskRows,hall))excluded.push('OUTSIDE_FLOOR_MASK');
  if(otherRooms.some(r=>rect(r,hall)))excluded.push('HALL_IN_OTHER_ROOM');
  if(vertical.has(key(cell))||vertical.has(key(hall)))excluded.push('VERTICAL_RESERVATION');
  if(source.openingPorts.some(p=>p.id!==port.id&&[cell,left,right].some(q=>key(q)===key(p.roomCell))))excluded.push('OTHER_SOURCE_DOOR');
  const footprint=[...Array.from({length:2},(_,i)=>({...cell,y:base+1+i,part:'DOOR_VOID'})),
    ...Array.from({length:2},(_,i)=>({...hall,y:base+1+i,part:'HALL_AIR'})),
    ...[left,right].flatMap((p,i)=>Array.from({length:3},(_,n)=>({...p,y:base+1+n,part:i?'RIGHT_JAMB':'LEFT_JAMB'}))),
    {...cell,y:base+3,part:'LINTEL'}];
  const production=[];const prior=[];
  for(const v of footprint){
   const k=vk(v),st=idx.final.get(k);
   if(st?.occupied)production.push({x:v.x,y:v.y,z:v.z,part:v.part,role:st.role,phase:st.phase,block:st.block,operationIndex:st.operationIndex});
   if(immutable.solids.has(k)||immutable.reserved.has(k)||immutable.protectedSites.has(key(v)))prior.push({x:v.x,y:v.y,z:v.z,part:v.part});
  }
  const unique=new Map(production.map(v=>[vk(v),v]));
  surveyed.push({doorCell:cell,hallCell:hall,normal:{dx:normal.x,dz:normal.z},
    fixedNeighborReasons:excluded,existingAssemblyContacts:prior.length,
    productionTouches:[...unique.values()],productionVoxelCount:unique.size});
 }
 surveyed.sort((a,b)=>a.fixedNeighborReasons.length-b.fixedNeighborReasons.length||a.existingAssemblyContacts-b.existingAssemblyContacts||a.productionVoxelCount-b.productionVoxelCount||key(a.doorCell).localeCompare(key(b.doorCell)));
 const best=surveyed[0]??null;
 return {roomId:room.id,portId:port.id,edgeCount:surveyed.length,
  minimumProductionConflictCount:best?.productionVoxelCount??null,
  topologyUnblockedEdges:surveyed.filter(c=>!c.fixedNeighborReasons.length&&!c.existingAssemblyContacts).length,
  preferredDiagnostic:best,notAnAuthorizedProductionChange:true};
}
/** Immutable floor fingerprint, used to check all 30 levels against actual production. */
function cloneClaims(existing){return {solids:new Set(existing.solids),reserved:new Set(existing.reserved),protectedSites:new Set(existing.protectedSites)};}
function claimReadOnly(c,added,immutable){
 const local={solids:new Set(),reserved:new Set(),protectedSites:new Set()};
 for(const v of c.local3DVoxels){
  const k=vk(v);if(v.role==='DOOR_VOID')local.reserved.add(k);else local.solids.add(k);
 }
 for(const v of c.localSwingAirReservation)local.reserved.add(vk(v));
 for(const p of [...c.protectedRoomCore,...c.protectedRoute,...c.proposedCorridorAirCells])local.protectedSites.add(site(p));
 const combined=frozenVoxels(immutable,added);
 const errors=checkWholeFloorCandidate({...c,opening:c.local3DVoxels.filter(v=>v.role==='DOOR_VOID')},combined,{solids:new Set(),reserved:new Set(),protectedSites:new Set()});
 if(errors.length)fail('CANDIDATE_OVERLAP_'+errors.join('_'));
 // Full column conflict protection rather than x,z alone.
 for(const k of local.solids){if(combined.solids.has(k)||combined.reserved.has(k))fail('CLAIM_SOLID');}
 for(const k of local.reserved){if(combined.solids.has(k)||combined.reserved.has(k))fail('CLAIM_RESERVATION');}
 for(const k of local.protectedSites){if(combined.protectedSites.has(k))fail('CLAIM_ROUTE');}
 for(const [k,v] of Object.entries(local))for(const x of v)added[k].add(x);
}
export async function compileB85(){
 const b84=get('parallel/b84/main/B84_LAYOUT_OPTIONS_REPORT.json');
 const b83=get('parallel/b83/main/B83_HELD_ROOM_TEMPLATE_REPORT.json');
 const b82=get('parallel/b82/main/B82_ROOM_CORRIDOR_REDESIGN.json');
 const b81=get('parallel/b81/main/B81_TYPED_LOCAL_ASSEMBLY.json');
 const b80=get('parallel/b80/main/B80_LOCAL_3D_FRAME_REPORT.json');
 const b65=get('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json');
 const b66=get('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json');
 const b76=get('parallel/b76/main/B76_STAGING_REPORT.json');
 safe(b84,'minecraftaibuilder-b84-local-room-corridor-relayout-options-v1');
 if(b84.provenance.b83!==b83.reportSha256||b84.totals.layoutChangeAlternatives!==12||b84.totals.stillHeldWithoutLayoutAlternative!==27)fail('PROVENANCE');
 const sectionsBy={};for(const [n,r] of Object.entries({b65,b66,b80,b81,b82,b83,b84}))sectionsBy[n]=new Map(r.sections.map(s=>[s.id,s]));
 const {report:b72}=buildB72(), sections=[], productionReplays=[];
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b85-pinned-no-network-'));
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const official=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  if(hash(official)!==b81.provenance.officialBlocksSha256)fail('OFFICIAL_HASH_CHANGED');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,get('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs){
   const ref=b76.buildings.find(b=>b.id===job.id),old=b84.productionReplays.find(b=>b.building===job.id);
   if(!ref||!old)fail('MISSING_REFERENCE');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   if(hash(plan.operations)!==old.operationsSha256)fail('PRODUCTION_CHANGED');
   productionReplays.push({...old});
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   for(const old84 of b84.sections.filter(s=>s.id.startsWith(job.id+'/'))){
    const id=old84.id, src=sectionsBy.b65.get(id),shape=sectionsBy.b66.get(id),prior80=sectionsBy.b80.get(id),prior81=sectionsBy.b81.get(id),prior82=sectionsBy.b82.get(id),prior83=sectionsBy.b83.get(id);
    if(!src||!shape||!prior80||!prior81||!prior82||!prior83)fail('MISSING_SECTION');
    const fixed=immutableFootprint(prior81,prior80),added={solids:new Set(),reserved:new Set(),protectedSites:new Set()};
    // B82 and B83 are previously frozen: preserve every voxel and every core.
    for(const h of prior82.heldBoundaryRedesigns.filter(h=>h.proposed))claimExistingProposal(h.proposed,added,fixed);
    for(const h of prior83.rooms.filter(h=>h.proposed))claimExistingProposal(h.proposed,added,fixed);
    // B84 is also protected, even though it is conceptual.
    for(const h of old84.rooms.filter(h=>h.best))claimReadOnly(h.best,added,fixed);
    const selectedCorridors=new Set(old84.rooms.filter(h=>h.best).flatMap(h=>h.best.proposedCorridorAirCells.map(key)));
    const rooms=[];
    for(const held of old84.rooms.filter(r=>!r.best).sort((a,b)=>a.portId.localeCompare(b.portId))){
     const port=src.openingPorts.find(p=>p.id===held.portId),room=shape.conceptRooms.find(r=>r.id===held.roomId);
     if(!port||!room)fail('HELD_MISSING');
     const immutable=frozenVoxels(fixed,added);
     const result=searchFloorRelayout({held,port,room,shape,source:src,idx,immutable,otherRooms:shape.conceptRooms.filter(r=>r.id!==room.id),claimedCorridors:selectedCorridors});
     if(result.best){claimReadOnly(result.best,added,fixed);for(const p of result.best.proposedCorridorAirCells)selectedCorridors.add(key(p));}
     const blockers=productionBlockerAtlas({room,port,shape,source:src,idx,immutable});
     const qualityStatus=result.best?(result.best.retainedFloorAreaRatio>=.75?'GEOMETRY_WITH_AREA_GATE_PASS__STILL_NOT_APPROVED':'GEOMETRY_ONLY_AREA_LOSS_TOO_LARGE'):'NO_NONDESTRUCTIVE_LAYOUT';
     rooms.push({...result,originalPort:{...port.roomCell},templateId:held.templateId,level:shape.level,qualityStatus,blockers});
    }
    sections.push({id,level:shape.level,rooms,retainedB84Alternatives:old84.rooms.filter(r=>r.best).length,newWholeFloorCandidates:rooms.filter(r=>r.best).length,
      sourceUnmodified:true,worldCoordinates:null,operations:[],emitAllowed:false});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const all=sections.flatMap(s=>s.rooms),review=all.filter(r=>r.best),still=all.filter(r=>!r.best);
 if(all.length!==27||sections.length!==30||productionReplays.length!==5)fail('TOTALS');
 const templateStats=[...new Set(all.map(r=>r.templateId).filter(Boolean))].sort().map(templateId=>{
  const rows=all.filter(r=>r.templateId===templateId);return {templateId,rooms:rows.length,proposalCount:rows.filter(r=>r.best).length,held:rows.filter(r=>!r.best).length,crossFloorRechecked:true};
 });
 const totals={buildings:5,levels:30,totalRooms:314,immutablePriorCandidates:287,examinedHeld:all.length,
  newWholeFloorLayoutAlternatives:review.length,combinedCandidates:287+review.length,remainingHeld:still.length,
  candidateWithoutMajorAreaLoss:review.filter(r=>r.best.retainedFloorAreaRatio>=0.75).length,
  candidateRequiringMajorAreaLoss:review.filter(r=>r.best.retainedFloorAreaRatio<0.75).length,
  heldOrQualityRejected:still.length+review.filter(r=>r.best.retainedFloorAreaRatio<0.75).length,
  diagnosedDoorEdges:all.reduce((sum,r)=>sum+r.blockers.edgeCount,0),
  roomsWithAreaChange:review.filter(r=>r.best.requiredRoomAreaChange>0).length,proposedCorridorCells:review.reduce((sum,r)=>sum+r.best.requiredCorridorReclassification,0),
  productionEdits:0,approvedDoorChanges:0,worldContacts:0,constructionCommands:0};
 const body={schema:'minecraftaibuilder-b85-floor-layout-rectangular-reallocation-review-v1',kind:'READONLY_WHOLE_FLOOR_LAYOUT_ALTERNATIVES_NOT_APPROVAL',
  provenance:{b84:b84.reportSha256,b83:b83.reportSha256,b82:b82.reportSha256,b81:b81.reportSha256,officialBlocksSha256:b81.provenance.officialBlocksSha256},
  productionReplays,totals,templateStats,sections,
  unresolved:['BEDROCK_DOOR_HINGE_AND_STATE_UNVERIFIED','BUILDING_WIDE_EGRESS_UNVERIFIED','STAIR_AND_UPPER_SLAB_CUTS_UNVERIFIED','ROOM_AREA_RETAINED_AT_LEAST_75_PERCENT_REQUIRED_FOR_QUALITY_GATED_REVIEW','ROOM_SIZE_AND_CORRIDOR_CHANGES_NOT_APPROVED','OLD_OPENING_CLOSURE_NOT_APPROVED','FACADE_UNCHANGED_AND_UNVERIFIED'],
  approval:'PROPOSED_ONLY',readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,worldContacts:0,
  gates:b84.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=await compileB85();
 if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B85_FLOOR_LAYOUT_REPORT.json'),JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify(output.totals,null,2));
}
