/** B86 joint facade/interior schematic branch. Completely non-executable.
 * Uses the FINAL frozen production voxel index. Conceptual changes never rewrite it.
 * Protects all B81-B84 proposals, reserved routes, slabs, stair/elevator locations.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {chooseCoreAndPaths} from '../../b78/main/compile-b78.mjs';
import {key,hash,safe,maskHasFloor} from '../../b79/main/compile-b79.mjs';
import {immutableFootprint,checkWholeFloorCandidate} from '../../b82/main/compile-b82.mjs';
import {claimExistingProposal} from '../../b83/main/compile-b83.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const fail=(r)=>{throw Error('B86_'+r)};
const vk=p=>`${p.x},${p.y},${p.z}`;
const at=(p,d)=>({x:p.x+d.x,z:p.z+d.z});
const rect=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const dirs=[{x:1,z:0},{x:0,z:1},{x:-1,z:0},{x:0,z:-1}];
const adjacent=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z)===1;
const claimEmpty=()=>({solids:new Set(),reserved:new Set(),protectedSites:new Set()});
const normalizeSite=v=>typeof v==='string'?v:key(v);
function claimAlternative(c,added){
 for(const v of c.local3DVoxels??[]){(v.role==='DOOR_VOID'?added.reserved:added.solids).add(vk(v));}
 for(const v of c.localSwingAirReservation??[])added.reserved.add(vk(v));
 for(const p of [...(c.protectedRoomCore??[]),...(c.protectedRoute??[]),...(c.proposedCorridorAirCells??[])])added.protectedSites.add(normalizeSite(p));
}
export function protectedFloor(section81,section80,section82,section83,section84){
 const protectedBase=immutableFootprint(section81,section80),added=claimEmpty();
 for(const s of section82.heldBoundaryRedesigns)if(s.proposed)claimExistingProposal(s.proposed,added,protectedBase);
 for(const s of section83.rooms)if(s.proposed)claimExistingProposal(s.proposed,added,protectedBase);
 for(const s of section84.rooms)if(s.best)claimAlternative(s.best,added);
 return {solids:new Set([...protectedBase.solids,...added.solids]),reserved:new Set([...protectedBase.reserved,...added.reserved]),protectedSites:new Set([...protectedBase.protectedSites,...added.protectedSites])};
}
export function interiorEdges(room){
 const out=[];
 for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++)for(const normal of dirs){
  const p={x,z};if(rect(room,at(p,normal)))continue;
  const tangent={x:normal.z,z:-normal.x},left=at(p,tangent),right=at(p,{x:-tangent.x,z:-tangent.z});
  if(rect(room,left)&&rect(room,right))out.push({cell:p,hall:at(p,normal),normal,left,right});
 }
 return out;
}
export function productionEditClass(state){
 if(!state?.occupied)return 'NONE';
 const r=state.role;
 if(['secondaryWall'].includes(r))return 'REPLACEABLE_PARTITION_REVIEW';
 if(r==='primaryWall')return 'STRUCTURAL_ENVELOPE_REVIEW';
 if(['glass','frame'].includes(r))return 'FACADE_WINDOW_REVIEW';
 return 'IMMUTABLE_PRODUCTION';
}
const stateAt=(idx,v)=>idx.final.get(vk(v))??{role:'air',block:'air',occupied:false,phase:'none'};
/** Windows removed in a candidate must be replaced at a distinct same-height, same-plane bay.
 * Does not assert structural safety or approve the resulting facade appearance. */
export function samePlaneWindowReplacements({glassTouches,idx,shape,room,exclude,protectedSites,protectedVoxels}){
 const reserved=new Set(exclude),out=[];
 const bounds={width:shape.floorMaskRows[0].length,depth:shape.floorMaskRows.length};
 for(const touch of glassTouches){
  const possibilities=[];
  for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){
   if(!!dx===!!dz)continue;
   const x=touch.x+dx,z=touch.z+dz,y=touch.y,v={x,y,z};
   if(x<0||z<0||x>=bounds.width||z>=bounds.depth||Math.abs(dx)+Math.abs(dz)>5||!maskHasFloor(shape.floorMaskRows,v))continue;
   // Windows shift ALONG the same elevation line; never to a perpendicular facade.
   if((dx!==0&&z!==touch.z)||(dz!==0&&x!==touch.x))continue;
   const k=vk(v);if(reserved.has(k)||protectedVoxels.has(k)||protectedSites.has(key(v))||rect(room,v))continue;
   const old=stateAt(idx,v);
   if(!old.occupied||!['secondaryWall','primaryWall'].includes(old.role))continue; // primary wall candidate requires separate structural approval
   possibilities.push({x,y,z,priorRole:old.role,priorBlock:old.block,role:'NEW_GLAZING_BAY_REVIEW',structuralReviewRequired:old.role==='primaryWall',restoresGlassCount:1});
  }
  possibilities.sort((a,b)=>Math.abs(a.x-touch.x)+Math.abs(a.z-touch.z)-Math.abs(b.x-touch.x)-Math.abs(b.z-touch.z)||vk(a).localeCompare(vk(b)));
  if(!possibilities.length)return null;
  out.push(possibilities[0]);reserved.add(vk(possibilities[0]));
 }
 return out;
}
function specs(edge,base){
 const {cell,hall,left,right}=edge;
 return {door:[{...cell,y:base+1,role:'DOOR_VOID'},{...cell,y:base+2,role:'DOOR_VOID'}],
  jamb:[left,right].flatMap((p,i)=>[1,2,3].map(d=>({...p,y:base+d,role:i?'JAMB_RIGHT':'JAMB_LEFT'}))),
  lintel:[{...cell,y:base+3,role:'LINTEL'}],
  hall:[{...hall,y:base+1,role:'CORRIDOR_AIR'},{...hall,y:base+2,role:'CORRIDOR_AIR'}]};
}
function hallRoute({edge,shape,idx,protectedFloor,otherRooms,blockedFootprint,maxLength=8}){
 const stair=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const named=new Set(shape.conceptReservations.corridors.map(key));
 const walk=p=>{
  const k=key(p);if(!maskHasFloor(shape.floorMaskRows,p)||stair.has(k)||protectedFloor.protectedSites.has(k)||otherRooms.some(r=>rect(r,p)))return null;
  const y=(shape.level-1)*5+1,updates=[];
  for(let dy=0;dy<2;dy++){
   const v={...p,y:y+dy},s=stateAt(idx,v),cls=productionEditClass(s);
   if(protectedFloor.solids.has(vk(v))||protectedFloor.reserved.has(vk(v)))return null;
   if(s.occupied){if(cls!=='REPLACEABLE_PARTITION_REVIEW')return null;updates.push({...v,wasRole:s.role,wasBlock:s.block,reason:'CORRIDOR_PASSAGE'});}
  }
  return updates;
 };
 const initial=walk(edge.hall);if(!initial)return null;
 const queue=[{at:edge.hall,cells:[edge.hall],patches:initial}],seen=new Set([key(edge.hall)]);
 for(let i=0;i<queue.length;i++){
  const cur=queue[i];if(named.has(key(cur.at))){
   if(cur.cells.some(p=>blockedFootprint.has(key(p))))continue;
   return {...cur,target:cur.at,newCorridorSites:cur.cells.filter(p=>!named.has(key(p)))};
  }
  if(cur.cells.length>=maxLength)continue;
  for(const d of dirs){const p=at(cur.at,d),k=key(p);if(seen.has(k)||blockedFootprint.has(k))continue;
   const edits=walk(p);if(edits===null)continue;seen.add(k);
   queue.push({at:p,cells:[...cur.cells,p],patches:[...cur.patches,...edits]});
  }
 }
 return null;
}
/** A full-size room and corridor jointly designed with a virtual local envelope revision.
 * Every production edit is explicit and NEVER applied to the planner or to Minecraft. */
export function designJointRoom({held,room,port,shape,source,idx,protectedFloor:fixedProtection,otherRooms,limit=2}){
 const base=(shape.level-1)*5,vertical=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const named=new Set(shape.conceptReservations.corridors.map(key));
 const otherDoors=new Set(source.openingPorts.filter(p=>p.id!==port.id).map(p=>key(p.roomCell)));
 const out=[],reject={};const block=s=>{reject[s]=(reject[s]??0)+1};
 for(const e of interiorEdges(room)){
  const {cell,hall,left,right,normal}=e;
  const touches=[cell,hall,left,right];
  if(touches.some(p=>!maskHasFloor(shape.floorMaskRows,p)||vertical.has(key(p)))||otherRooms.some(r=>rect(r,hall))){block('FLOOR_VERTICAL_OR_OTHER_ROOM');continue;}
  if([cell,left,right].some(p=>otherDoors.has(key(p)))){block('ANOTHER_SOURCE_DOOR');continue;}
  const build=specs(e,base),frame=[...build.door,...build.jamb,...build.lintel],changes=[];
  const occupiedSites=new Set(touches.map(key));
  if(touches.some(p=>fixedProtection.protectedSites.has(key(p)))){block('IMMUTABLE_PRIOR_ROOM_OR_ROUTE');continue;}
  let invalid=false;
  for(const v of [...frame,...build.hall]){
   if(fixedProtection.solids.has(vk(v))||fixedProtection.reserved.has(vk(v))){invalid=true;break;}
   const s=stateAt(idx,v),cls=productionEditClass(s);
   if(cls==='IMMUTABLE_PRODUCTION'){invalid=true;break;}
   if(s.occupied)changes.push({...v,priorRole:s.role,priorBlock:s.block,priorPhase:s.phase,operationIndex:s.operationIndex,
    intendedRole:v.role==='CORRIDOR_AIR'||v.role==='DOOR_VOID'?'AIR_CLEARANCE':'INTERIOR_FRAME',reviewClass:cls});
  }
  if(invalid){block('PINNED_PRODUCTION_OR_TYPED_COMPONENT');continue;}
  if(changes.length>14){block('EXCESSIVE_LOCAL_PRODUCTION_CHANGES');continue;}
  const blockedFootprint=new Set([cell,left,right].map(key));
  const route=hallRoute({edge:e,shape,idx,protectedFloor:fixedProtection,otherRooms,blockedFootprint,maxLength:8});
  if(!route){block('NO_BOUNDED_EXISTING_CORRIDOR_CONNECTION');continue;}
  const editMap=new Map(changes.map(v=>[vk(v),v]));
  for(const v of route.patches){const k=vk(v);if(!editMap.has(k))editMap.set(k,{...v,priorRole:v.wasRole,priorBlock:v.wasBlock,reviewClass:'REPLACEABLE_PARTITION_REVIEW',intendedRole:'AIR_CLEARANCE'});}
  if(editMap.size>16){block('EXCESSIVE_JOINT_PATCH');continue;}
  const excluded=new Set([...build.door,...build.jamb,...build.lintel,...build.hall].map(vk));
  const changesArr=[...editMap.values()];
  const windows=changesArr.filter(c=>c.priorRole==='glass');
  const glazing=samePlaneWindowReplacements({glassTouches:windows,idx,shape,room,
   exclude:excluded,protectedSites:fixedProtection.protectedSites,protectedVoxels:new Set([...fixedProtection.solids,...fixedProtection.reserved,...changesArr.map(vk)])});
  if(windows.length&&glazing===null){block('NO_GLASS_PRESERVING_FACADE_BAY');continue;}
  const reservedPositions=new Set([...build.jamb,...route.cells].map(key)); // door opening is a traversable room-side site, NEVER an obstacle
  const forbidden=new Set([...fixedProtection.protectedSites,...vertical,...named]);
  for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++){
   const p={x,z},k=key(p);
   if(reservedPositions.has(k)||[base+1,base+2].some(y=>{
     const v={x,y,z},s=stateAt(idx,v);
     return (s.occupied&&!editMap.has(vk(v)))||fixedProtection.solids.has(vk(v))||fixedProtection.reserved.has(vk(v));
   }))forbidden.add(k);
  }
  const core=chooseCoreAndPaths(room,[cell],forbidden);
  if(!core){block('NO_UNCHANGED_AREA_2X2_CORE_AND_ROUTE');continue;}
  // Reserve actual room-side 2-block-tall leaf swing clearance (geometry only).
  const inward=at(cell,{x:-normal.x,z:-normal.z}),tangent={x:normal.z,z:-normal.x};
  const possibleSwings=[at(inward,tangent),at(inward,{x:-tangent.x,z:-tangent.z})];
  const swingSite=possibleSwings.find(side=>[inward,side].every(p=>{
   if(!rect(room,p)||reservedPositions.has(key(p))||fixedProtection.protectedSites.has(key(p)))return false;
   return [base+1,base+2].every(y=>{const v={...p,y},st=stateAt(idx,v);
    return !fixedProtection.solids.has(vk(v))&&!fixedProtection.reserved.has(vk(v))&&(!st.occupied||editMap.has(vk(v)));
   });
  }));
  if(!swingSite){block('NO_TWO_BLOCK_ROOM_SWING_CLEARANCE');continue;}
  const local3DVoxels=frame,localSwingAirReservation=[inward,swingSite].flatMap(p=>[base+1,base+2].map(y=>({...p,y,role:'SWING_RESERVED_AIR'})));
  const alternative={portId:port.id,roomId:room.id,sourceSection:shape.id,roomRect:{x:room.x,z:room.z,width:room.width,depth:room.depth},retainedRoomAreaRatio:1,
   doorRoomCell:cell,doorHallCell:hall,normal:{dx:normal.x,dz:normal.z},
   local3DVoxels,localSwingAirReservation,protectedRoomCore:core.core,protectedRoute:core.paths[0],
   proposedCorridorAirCells:route.cells,proposedNewCorridorCells:route.newCorridorSites,
   virtualLocalEnvelopePatch:changesArr,facadeGlazingCompensation:glazing??[],existingGlassRemoved:windows.length,
   glassAreaNetChange:0,geometryWindowConservationOnly:true,
   jointPatchVoxelCount:changesArr.length+(glazing?.length??0),
   structuralReviewRequired:changesArr.some(v=>v.reviewClass==='STRUCTURAL_ENVELOPE_REVIEW')||(glazing??[]).some(v=>v.structuralReviewRequired),
   facadeReviewRequired:changesArr.some(v=>v.reviewClass==='FACADE_WINDOW_REVIEW')||!!glazing?.length,
   existingTypedAssemblyModified:false,originalPlannerOperationModified:false,
   allBuildingEnvelopeChangesUnapproved:true,bedrockDoorSemantics:'UNVERIFIED',globalEgress:'UNVERIFIED',
   corridorWidth:'UNVERIFIED',approval:'REVIEW_ONLY',executionAllowed:false,operations:[],worldCoordinates:null};
  // New candidate may not collide with typed additions, even in a hypothetical facade redesign.
  const errs=checkWholeFloorCandidate({...alternative,opening:build.door},fixedProtection,claimEmpty());
  if(errs.length){block('PROTECTED_ASSEMBLY_'+errs[0]);continue;}
  if(alternative.protectedRoute.some(k=>route.cells.some(p=>key(p)===normalizeSite(k)))){block('ROOM_CROSSING_CORRIDOR');continue;}
  out.push(alternative);
 }
 out.sort((a,b)=>a.jointPatchVoxelCount-b.jointPatchVoxelCount||Number(a.structuralReviewRequired)-Number(b.structuralReviewRequired)||
  Number(a.facadeReviewRequired)-Number(b.facadeReviewRequired)||a.proposedNewCorridorCells.length-b.proposedNewCorridorCells.length||vk({...a.doorRoomCell,y:0}).localeCompare(vk({...b.doorRoomCell,y:0})));
 return {portId:held.portId,roomId:room.id,edgesConsidered:interiorEdges(room).length,validJointDesigns:out.length,variants:out.slice(0,limit),rejections:reject,
  status:out.length?'JOINT_ENVELOPE_INTERIOR_REVIEW_ONLY':'HOLD_NEEDS_FULL_BUILDING_REDRAFT',placementAllowed:false,operations:[],worldCoordinates:null};
}
/** Greedy floor-wide arbitration. Drafts from independent rooms are never silently combined. */
export function reconcileJointFloor(roomDesigns){
 const vox=new Set(),routeSites=new Set(),glazingSites=new Set(),accepted=[],deferred=[];
 for(const d of roomDesigns){
  if(!d.variants.length)continue;
  let chosen=null;
  for(const c of d.variants){
   const intended=[...c.local3DVoxels,...c.localSwingAirReservation,...c.virtualLocalEnvelopePatch,...c.facadeGlazingCompensation];
   const keys=new Set(intended.map(vk));
   const newHallSites=c.proposedNewCorridorCells.map(key),interiorSites=[...c.protectedRoomCore,...c.protectedRoute].map(normalizeSite);
   const interior=new Set([...interiorSites,...newHallSites]);
   if(keys.size!==intended.length && c.virtualLocalEnvelopePatch.some(v=>!c.local3DVoxels.some(q=>vk(q)===vk(v))))continue;
   if(intended.some(v=>vox.has(vk(v)))||[...interior].some(k=>routeSites.has(k))||c.facadeGlazingCompensation.some(v=>glazingSites.has(vk(v))))continue;
   chosen=c;for(const v of intended)vox.add(vk(v));for(const k of interior)routeSites.add(k);
   for(const v of c.facadeGlazingCompensation)glazingSites.add(vk(v));break;
  }
  if(chosen)accepted.push({portId:d.portId,roomId:d.roomId,candidate:chosen});
  else deferred.push({portId:d.portId,roomId:d.roomId,reason:'CROSS_ROOM_SHARED_VOXEL_OR_ROUTE'});
 }
 return {accepted,deferred,distinctVoxels:vox.size};
}
export async function compileB86(){
 const b85=get('parallel/b85/main/B85_FLOOR_LAYOUT_REPORT.json');safe(b85,'minecraftaibuilder-b85-floor-layout-rectangular-reallocation-review-v1');
 const b84=get('parallel/b84/main/B84_LAYOUT_OPTIONS_REPORT.json');const b83=get('parallel/b83/main/B83_HELD_ROOM_TEMPLATE_REPORT.json');
 const b82=get('parallel/b82/main/B82_ROOM_CORRIDOR_REDESIGN.json');const b81=get('parallel/b81/main/B81_TYPED_LOCAL_ASSEMBLY.json');
 const b80=get('parallel/b80/main/B80_LOCAL_3D_FRAME_REPORT.json');const b65=get('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json');
 const b66=get('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json');const b76=get('parallel/b76/main/B76_STAGING_REPORT.json');
 if(b85.provenance.b84!==b84.reportSha256||b85.totals.heldOrQualityRejected!==27||b85.totals.immutablePriorCandidates!==287)fail('BASELINE_PROVENANCE');
 const map={};for(const [name,r] of Object.entries({b65,b66,b80,b81,b82,b83,b84}))map[name]=new Map(r.sections.map(s=>[s.id,s]));
 if(process.env.B86_TRACE)console.error('B86 input read'); const b72=get('parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json');safe(b72,'minecraftaibuilder-b72-production-input-and-mask-preflight-v1');if(process.env.B86_TRACE)console.error('B86 built b72');const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b86-readonly-planner-'));const sections=[],productionReplays=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const official=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  if(hash(official)!==b85.provenance.officialBlocksSha256)fail('OFFICIAL_CATALOG_CHANGED');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,get('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs){if(process.env.B86_TRACE)console.error('B86 job',job.id);
   const baseline=b85.productionReplays.find(x=>x.building===job.id),ref=b76.buildings.find(x=>x.id===job.id);
   if(!baseline||!ref)fail('MISSING_PRODUCTION');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   if(hash(plan.operations)!==baseline.operationsSha256)fail('PRODUCTION_MISMATCH');
   productionReplays.push({...baseline});
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   for(const s of b85.sections.filter(x=>x.id.startsWith(job.id+'/'))){if(process.env.B86_TRACE)console.error('B86 floor',s.id);
    const id=s.id,src=map.b65.get(id),shape=map.b66.get(id),b80s=map.b80.get(id),b81s=map.b81.get(id),b82s=map.b82.get(id),b83s=map.b83.get(id),b84s=map.b84.get(id);
    if(!src||!shape||!b80s||!b81s||!b82s||!b83s||!b84s)fail('SECTION_DATA');
    const fixed=protectedFloor(b81s,b80s,b82s,b83s,b84s),rooms=[];
    for(const h of s.rooms){
     const port=src.openingPorts.find(p=>p.id===h.portId),room=shape.conceptRooms.find(r=>r.id===h.roomId);
     if(!port||!room)fail('MISSING_HELD_INPUT');
     const v=designJointRoom({held:h,port,room,shape,source:src,idx,protectedFloor:fixed,otherRooms:shape.conceptRooms.filter(r=>r.id!==room.id)});
     rooms.push({...v,b85QualityStatus:h.qualityStatus,b85HadAreaLossAlternative:!!h.best,originalArea:room.width*room.depth});
    }
    const jointFloor=reconcileJointFloor(rooms);
    // B86 intents must never interfere with each other; a rejected row stays HOLD.
    const allowed=new Set(jointFloor.accepted.map(x=>x.portId));
    for(const r of rooms)if(r.variants.length&&!allowed.has(r.portId)){r.variants=[];r.status='HOLD_CROSS_ROOM_ARBITRATION';}
    sections.push({id,level:s.level,rooms,floorWideNewCandidateCount:jointFloor.accepted.length,conflictsDeferred:jointFloor.deferred,earlierProposalsPreserved:true,worldCoordinates:null,operations:[],emitAllowed:false});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const all=sections.flatMap(s=>s.rooms),possible=all.filter(x=>x.variants.length);
 if(all.length!==27||sections.length!==30||productionReplays.length!==5)fail('REPORT_COUNT');
 const selected=possible.map(x=>x.variants[0]),totals={buildings:5,sections:30,rooms:314,priorQualityGatedCandidates:287,heldFromB85:27,
  jointReviewOptions:possible.length,stillWithoutJointOption:all.length-possible.length,roomArea100PercentKept:possible.filter(x=>x.variants[0].retainedRoomAreaRatio===1).length,
  candidatePatchVoxels:selected.reduce((n,x)=>n+x.jointPatchVoxelCount,0),crossRoomConflictsHeld:sections.reduce((n,s)=>n+s.conflictsDeferred.length,0),structuralReviewRequired:selected.filter(x=>x.structuralReviewRequired).length,
  facadeReviewRequired:selected.filter(x=>x.facadeReviewRequired).length,glassBaysRetainedOrCompensated:selected.every(x=>x.glassAreaNetChange===0),
  completedOrConstructionApproved:0,productionSourceEdits:0,constructionCommands:0,worldContacts:0};
 const templateAnalysis=[...new Set(all.map(r=>r.roomId.replace(/F\d+-/,'R')))].sort().map(t=>({roomTemplate:t,
  floors:all.filter(r=>r.roomId.replace(/F\d+-/,'R')===t).length,
  reviewable:possible.filter(r=>r.roomId.replace(/F\d+-/,'R')===t).length,
  perFloorValidationRequired:true,notACommittedBuildingPattern:true}));
 const body={schema:'minecraftaibuilder-b86-joint-facade-interior-virtual-branch-v1',kind:'READONLY_NON_EXECUTABLE_ENVELOPE_AND_INTERIOR_CODE_DESIGN',
  provenance:{b85:b85.reportSha256,b84:b84.reportSha256,officialBlocksSha256:b85.provenance.officialBlocksSha256},
  productionReplays,totals,templateAnalysis,sections,
  unresolved:['VIRTUAL_ENVELOPE_PATCHES_NOT_PRODUCTION_WRITES','STRUCTURAL_LOAD_PATH_AND_FACADE_WEATHERPROOFING_NOT_VERIFIED','CORRIDOR_WIDTH_AND_WHOLE_BUILDING_EGRESS_NOT_VERIFIED','BEDROCK_DOOR_DIRECTION_HINGE_AND_OLD_OPENING_NOT_VERIFIED','STAIR_AND_UPPER_SLAB_OPENINGS_NOT_VERIFIED','EXISTING_18_OFF_FLOOR_MASK_RESERVATIONS_HOLD'],
  approval:'PROPOSED_ONLY',readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,worldContacts:0,
  gates:b85.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await compileB86();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B86_JOINT_ENVELOPE_INTERIOR_REPORT.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.totals,null,2));
}
