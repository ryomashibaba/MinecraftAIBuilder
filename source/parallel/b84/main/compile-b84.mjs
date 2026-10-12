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
const fail=x=>{throw Error('B84_'+x)};
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
export function searchRoomRelayout({held,port,room,shape,source,idx,immutable,otherRooms,claimedCorridors=new Set()}){
 const originalRooms=shape.conceptRooms,vertical=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const named=new Set(shape.conceptReservations.corridors.map(key));
 const originalDoorCells=new Set(source.openingPorts.filter(p=>p.id!==port.id).map(p=>key(p.roomCell)));
 const base=(shape.level-1)*5;
 const observed={variants:0,edges:0,clearDoorAndFrame:0,roomCoreAndRoute:0,linkedToExistingNamedCorridor:0};
 const reject={};const nope=r=>{reject[r]=(reject[r]??0)+1;};
 const candidate=[];
 for(const r of variants(room)){
  const removed=[];for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++)if(!rect(r,{x,z}))removed.push({x,z});
  if(removed.some(p=>immutable.protectedSites.has(key(p))||vertical.has(key(p))||[base+1,base+2,base+3].some(y=>immutable.solids.has(`${p.x},${y},${p.z}`)||immutable.reserved.has(`${p.x},${y},${p.z}`)))){nope('RETRACTS_IMMUTABLE_OR_VERTICAL_SITE');continue;}
  observed.variants++;
  for(const e of proposedEdges(r)){
   observed.edges++;
   const {cell,hall,left,right,normal}=e;
   if(originalDoorCells.has(key(cell))||originalDoorCells.has(key(left))||originalDoorCells.has(key(right))){nope('OTHER_DOOR_SITE');continue;}
   if([cell,left,right].some(p=>!rect(room,p)||named.has(key(p))||vertical.has(key(p))||!maskHasFloor(shape.floorMaskRows,p))){nope('FRAME_NOT_IN_RETAINED_ROOM');continue;}
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
    changeType:r.kind,removedFromRoom:removed,doorRoomCell:cell,doorHallCell:hall,normal:{dx:normal.x,dz:normal.z},
    doorMoved:man(cell,port.roomCell)!==0||normal.x!==port.normal.dx||normal.z!==port.normal.dz,
    local3DVoxels:candidateVoxels,localSwingAirReservation:swingVoxels,protectedRoomCore:core.core,protectedRoute:core.paths[0],
    proposedCorridorAirCells:connection.cells,proposedNewCorridorCells:connection.addedCorridorCells,verifiedNamedCorridorTarget:connection.namedTarget,
    requiredRoomAreaChange:removed.length,requiredCorridorReclassification:connection.addedCorridorCells.length,
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
 candidate.sort((a,b)=> a.requiredRoomAreaChange-b.requiredRoomAreaChange||a.requiredCorridorReclassification-b.requiredCorridorReclassification||Number(a.doorMoved)-Number(b.doorMoved)||
  man(a.doorRoomCell,port.roomCell)-man(b.doorRoomCell,port.roomCell)||key(a.doorRoomCell).localeCompare(key(b.doorRoomCell)));
 return {portId:held.portId,roomId:room.id,candidatesInvestigated:observed,rejections:reject,best:candidate[0]??null,
   eligibleCount:candidate.length,status:candidate.length?'LOCAL_RELAYOUT_REVIEW_ONLY':'HOLD_NEEDS_DEEPER_TOPOLOGY_OR_PRODUCTION_EDIT',
   worldCoordinates:null,operations:[],autoApply:false};
}
export async function compileB84(){
 const b83=get('parallel/b83/main/B83_HELD_ROOM_TEMPLATE_REPORT.json'),b82=get('parallel/b82/main/B82_ROOM_CORRIDOR_REDESIGN.json');
 const b81=get('parallel/b81/main/B81_TYPED_LOCAL_ASSEMBLY.json'),b80=get('parallel/b80/main/B80_LOCAL_3D_FRAME_REPORT.json');
 safe(b83,'minecraftaibuilder-b83-readonly-typed-held-room-template-research-v1');
 if(b83.provenance.b82!==b82.reportSha256||b83.provenance.b81!==b81.reportSha256||b83.provenance.b80!==b80.reportSha256||b83.totals.heldAfterB83!==39)fail('CHAIN');
 const b65=get('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json'),b66=get('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json'),b76=get('parallel/b76/main/B76_STAGING_REPORT.json');
 const by={};for(const [k,b] of Object.entries({b65,b66,b80,b81,b82,b83}))by[k]=new Map(b.sections.map(s=>[s.id,s]));
 const {report:b72}=buildB72(),sections=[],replays=[];
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b84-no-network-'));
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const official=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  if(hash(official)!==b81.provenance.officialBlocksSha256)fail('OFFICIAL_BLOCKS_CHANGED');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,get('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs){
   const ref=b76.buildings.find(x=>x.id===job.id),old=b83.productionReplays.find(x=>x.building===job.id);
   if(!ref||!old)fail('PRODUCTION_MISSING');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   if(hash(plan.operations)!==old.operationsSha256)fail('PRODUCTION_CHANGED');
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   replays.push({building:job.id,operationsSha256:old.operationsSha256});
   for(const section of b83.sections.filter(x=>x.id.startsWith(job.id+'/'))){
    const id=section.id,source=by.b65.get(id),shape=by.b66.get(id),old81=by.b81.get(id),old80=by.b80.get(id),old82=by.b82.get(id);
    if(!source||!shape||!old81||!old80||!old82)fail('SECTION_MISSING');
    const fixed=immutableFootprint(old81,old80),added={solids:new Set(),reserved:new Set(),protectedSites:new Set()};
    for(const entry of old82.heldBoundaryRedesigns.filter(x=>x.proposed))claimExistingProposal(entry.proposed,added,fixed);
    for(const entry of section.rooms.filter(x=>x.proposed))claimExistingProposal(entry.proposed,added,fixed);
    const selectedCorridors=new Set(),rooms=[];
    // Review-only alternatives, rank but never promote or overwrite B81/82/83 candidates.
    for(const h of section.rooms.filter(x=>!x.proposed).sort((a,b)=>a.portId.localeCompare(b.portId))){
     const port=source.openingPorts.find(p=>p.id===h.portId),room=shape.conceptRooms.find(r=>r.id===h.roomId);
     if(!port||!room)fail('HELD_PORT_ROOM');
     const immutable=frozenVoxels(fixed,added);const result=searchRoomRelayout({held:h,port,room,shape,source,idx,immutable,
       otherRooms:shape.conceptRooms.filter(x=>x.id!==room.id),claimedCorridors:selectedCorridors});
     // The B84 solution is an EXPLICIT LAYOUT CHANGE. Its reservations protect later B84 candidates, but do not modify previous reports.
     if(result.best){const c=result.best;for(const v of c.local3DVoxels){if(v.role==='DOOR_VOID')added.reserved.add(vk(v));else added.solids.add(vk(v));}
      for(const v of c.localSwingAirReservation)added.reserved.add(vk(v));
      for(const p of [...c.protectedRoomCore,...c.protectedRoute])added.protectedSites.add(site(p));
      for(const p of c.proposedCorridorAirCells){selectedCorridors.add(key(p));added.protectedSites.add(key(p));}
     }
     rooms.push({...result,templateId:b83.templateAnalysis.find(t=>t.perFloorProof.some(p=>p.portId===h.portId))?.templateId??null});
    }
    sections.push({id,level:shape.level,rooms,reviewOnlyRelayoutCandidates:rooms.filter(r=>r.best).length,
      previouslyImmutableCandidateCount:old81.doorPairs.length+old82.heldBoundaryRedesigns.filter(r=>r.proposed).length+section.newStrictCandidates,
      operations:[],worldCoordinates:null,emitAllowed:false});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const all=sections.flatMap(s=>s.rooms),reviewable=all.filter(x=>x.best),held=all.filter(x=>!x.best);
 if(all.length!==39||replays.length!==5||sections.length!==30)fail('COUNT');
 const byTemplate=b83.templateAnalysis.map(t=>{const a=all.filter(x=>t.perFloorProof.some(p=>p.portId===x.portId));return {templateId:t.templateId,members:a.length,localRelayoutAlternatives:a.filter(x=>x.best).length,stillBlocked:a.filter(x=>!x.best).length,
  crossFloorValidationRequired:true,noSourceMutation:true};});
 const totals={buildings:5,sections:30,rooms:314,immutableEarlierCandidates:275,examinedHeld:39,
  layoutChangeAlternatives:reviewable.length,stillHeldWithoutLayoutAlternative:held.length,commonTemplateCount:8,
  namedCorridorLinksProposed:reviewable.filter(x=>x.best?.proposedCorridorAirCells.length).length,
  roomsNeedingResize:reviewable.filter(x=>x.best?.requiredRoomAreaChange).length,
  corridorCellReclassifications:reviewable.reduce((n,x)=>n+(x.best?.requiredCorridorReclassification??0),0),
  previousDoorChangesApproved:0,physicalBlocksPlaced:0,productionModifications:0,constructionCommands:0,worldContacts:0};
 const body={schema:'minecraftaibuilder-b84-local-room-corridor-relayout-options-v1',kind:'READONLY_LAYOUT_PROPOSALS_NOT_DOOR_APPROVAL',
  provenance:{b83:b83.reportSha256,b82:b82.reportSha256,b81:b81.reportSha256,officialBlocksSha256:b81.provenance.officialBlocksSha256},
  productionReplays:replays,totals,templateValidation:byTemplate,sections,
  importantLimits:['ROOM_RECT_RETRACTION_AND_CORRIDOR_RECLASSIFICATION_NOT_APPROVED','EXISTING_IMMUTABLE_275_DOOR_CANDIDATES_UNCHANGED','NAMED_CORRIDOR_TARGET_DOES_NOT_PROVE_EXTERNAL_EXIT','HINGE_AND_BEDROCK_DOOR_STATE_UNVERIFIED','CORRIDOR_WIDTH_AND_GLOBAL_EGRESS_UNVERIFIED','25_STAIRS_240_SLAB_CUTS_18_OFF_MASK_RESERVATIONS_HOLD'],
  approval:'PROPOSED_ONLY',readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,worldContacts:0,
  gates:b83.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await compileB84();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B84_LAYOUT_OPTIONS_REPORT.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result.totals,null,2));
}
