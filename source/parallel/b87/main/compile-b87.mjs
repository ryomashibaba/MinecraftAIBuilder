/** B87 read-only, structure-preserving full-floor room allocation search.
 * All outputs are conceptual local coordinates; no world ops or production edits.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {hash,key,maskHasFloor,safe} from '../../b79/main/compile-b79.mjs';
import {checkWholeFloorCandidate} from '../../b82/main/compile-b82.mjs';
import {designJointRoom,protectedFloor} from '../../b86/main/compile-b86.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const vk=v=>`${v.x},${v.y},${v.z}`;
const stop=(r)=>{throw Error('B87_'+r)};
const at=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const onFloor=(s,p)=>maskHasFloor(s.floorMaskRows,p);
const isNamed=(shape,p)=>['corridors','stairs','elevators'].some(k=>shape.conceptReservations[k].some(q=>key(q)===key(p)));
export function shapeVariants(room,{minArea=0.75,withShift=true}={}){
 const original=room.width*room.depth,out=[],seen=new Set();
 // Full-size proposals are examined first, then inward strips and small legal translations.
 for(const l of [0,1,2])for(const r of [0,1,2])for(const t of [0,1,2])for(const b of [0,1,2]){
  const w=room.width-l-r,d=room.depth-t-b;if(w<2||d<2||w*d/original<minArea)continue;
  const rect={...room,x:room.x+l,z:room.z+t,width:w,depth:d};
  const id=[rect.x,rect.z,rect.width,rect.depth].join(':');if(!seen.has(id)){out.push({rect,areaRatio:w*d/original,mode:l+r+t+b?'INWARD_REALLOCATION':'ORIGINAL_FOOTPRINT',changedCells:original-w*d});seen.add(id);}
 }
 if(withShift){for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
  if(!dx&&!dz)continue;const rect={...room,x:room.x+dx,z:room.z+dz};
  const id=[rect.x,rect.z,rect.width,rect.depth].join(':');if(!seen.has(id)){out.push({rect,areaRatio:1,mode:'TRANSLATED_SAME_AREA',changedCells:Math.abs(dx)*room.depth+Math.abs(dz)*room.width});seen.add(id);}
 }}
 return out.sort((a,b)=>b.areaRatio-a.areaRatio||a.changedCells-b.changedCells||a.mode.localeCompare(b.mode));
}
export function validAllocation(room,variant,shape,otherRooms,protectedSites){
 const r=variant.rect;
 // No other nominal room, stairs, elevator, or existing named corridor may be silently reassigned.
 // Conserve at least 75% of original nominal area; proof is geometry-only.
 if(variant.areaRatio<0.75||r.width<2||r.depth<2)return false;
 for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
  const p={x,z},k=key(p);
  if(!onFloor(shape,p)||protectedSites.has(k)||otherRooms.some(o=>at(o,p)))return false;
  if(!at(room,p)&&isNamed(shape,p))return false;
 }
 return true;
}
export function structuralFree(v){
 if(!v||v.structuralReviewRequired||v.facadeReviewRequired||v.existingGlassRemoved||v.facadeGlazingCompensation?.length)return false;
 return (v.virtualLocalEnvelopePatch??[]).every(p=>p.reviewClass==='REPLACEABLE_PARTITION_REVIEW'&&p.priorRole==='secondaryWall');
}
/** Existing FULL, opaque blocks may serve as a jamb WITHOUT a block replacement.
 * Never claim existing glass/slab/fence or a wall on a door void as a reusable jamb.
 * This is geometry-only proof, not a Bedrock door/structural permit. */
export function reuseExistingJamb(v,idx){
 if(!v||v.existingGlassRemoved||v.facadeGlazingCompensation?.length||v.facadeReviewRequired)return null;
 const allowed=new Set(['minecraft:light_gray_concrete','minecraft:oak_planks','minecraft:sandstone']);
 const frame=new Map(v.local3DVoxels.filter(x=>x.role==='JAMB_LEFT'||x.role==='JAMB_RIGHT').map(x=>[vk(x),x]));
 const reused=[],remain=[];
 for(const patch of v.virtualLocalEnvelopePatch){
  const original=idx.final.get(vk(patch)),slot=frame.get(vk(patch));
  if(slot&&['primaryWall','secondaryWall'].includes(patch.priorRole)&&allowed.has(patch.priorBlock)&&
     original?.occupied&&original.role===patch.priorRole&&original.block===patch.priorBlock&&original.operationIndex===patch.operationIndex&&
     patch.intendedRole==='INTERIOR_FRAME'){
   reused.push({x:patch.x,y:patch.y,z:patch.z,role:slot.role,existingBlock:patch.priorBlock,existingProductionRole:patch.priorRole,
     operationIndex:patch.operationIndex,action:'KEEP_EXISTING_WALL_NO_EDIT'});
  }else remain.push(patch);
 }
 if(remain.length)return null;
 const bySide=new Map();for(const r of reused){const k=`${r.x},${r.z},${r.role}`;const list=bySide.get(k)||[];list.push(r.y);bySide.set(k,list);}
 if([...bySide.values()].some(y=>y.length!==3||new Set(y).size!==3||Math.max(...y)-Math.min(...y)!==2))return null;
 const converted=structuredClone(v);
 converted.originalB86PatchCount=v.virtualLocalEnvelopePatch.length;
 converted.existingWallJambEvidence=reused;
 converted.virtualLocalEnvelopePatch=[];
 converted.jointPatchVoxelCount=0;
 converted.structuralReviewRequired=false;
 converted.facadeReviewRequired=false;
 converted.existingFrameRetentionProof='NO_PRODUCTION_BLOCK_MUTATED__GEOMETRY_ONLY';
 converted.pinnedEnvelopeBlocksUntouched=true;
 converted.sourceB86RiskClass=v.structuralReviewRequired?'PREVIOUSLY_FLAGGED_PRIMARY_WALL_REPLACEMENT':'PREVIOUSLY_FLAGGED_PARTITION_WALL_REPLACEMENT';
 converted.structuralLoadPathAlterationProposed=false;
 converted.bedrockDoorSemantics='UNVERIFIED';
 converted.operations=[];converted.worldCoordinates=null;converted.executionAllowed=false;
 return converted;
}
export function validateDelta(candidate,idx,level){
 const issues=[];
 const door=candidate.local3DVoxels.filter(v=>v.role==='DOOR_VOID');
 const solid=candidate.local3DVoxels.filter(v=>v.role!=='DOOR_VOID');
 if(door.length!==2||door[0].x!==door[1].x||door[0].z!==door[1].z||Math.abs(door[0].y-door[1].y)!==1)issues.push('BAD_DOOR_PAIR');
 if(solid.length!==7||solid.filter(v=>v.role.startsWith('JAMB_')).length!==6||solid.filter(v=>v.role==='LINTEL').length!==1)issues.push('BAD_FRAME');
 if(candidate.localSwingAirReservation.length!==4||candidate.retainedRoomAreaRatio<0.75)issues.push('BAD_CLEARANCE_OR_AREA');
 if(!structuralFree(candidate))issues.push('STRUCTURAL_OR_FACADE_EDIT');
 for(const evidence of candidate.existingWallJambEvidence??[]){const actual=idx.final.get(vk(evidence));
  if(!actual?.occupied||actual.block!==evidence.existingBlock||actual.role!==evidence.existingProductionRole||actual.operationIndex!==evidence.operationIndex)issues.push('INHERITED_JAMB_DRIFT');
  if(!solid.some(v=>vk(v)===vk(evidence)&&v.role===evidence.role))issues.push('INHERITED_JAMB_NO_FRAME');
 }
 if(candidate.glassAreaNetChange!==0||candidate.operations?.length||candidate.worldCoordinates!==null||candidate.executionAllowed!==false)issues.push('UNSAFE_EXECUTION_FIELDS');
 const owned=new Set();for(const v of [...candidate.local3DVoxels,...candidate.localSwingAirReservation]){
  const k=vk(v);if(owned.has(k))issues.push('DUPLICATE_ASSEMBLY_'+k);owned.add(k);
  if(v.y<(level-1)*5+1||v.y>(level-1)*5+3)issues.push('OUT_OF_LEVEL');
 }
 for(const patch of candidate.virtualLocalEnvelopePatch){
  const initial=idx.final.get(vk(patch));
  if(!initial?.occupied||initial.role!==patch.priorRole||initial.block!==patch.priorBlock||initial.operationIndex!==patch.operationIndex)issues.push('PINNED_VOXEL_DRIFT');
  if(!owned.has(vk(patch))&&patch.intendedRole!=='AIR_CLEARANCE')issues.push('ORPHAN_PATCH');
 }
 // Explicit residual clearance: each door/swing air cell either was already air,
 // or has its original secondary-wall removal explicitly represented in the patch.
 const patched=new Set(candidate.virtualLocalEnvelopePatch.map(vk));
 for(const v of [...door,...candidate.localSwingAirReservation]){
  const original=idx.final.get(vk(v));if(original?.occupied&&!patched.has(vk(v)))issues.push('UNCLEARED_AIR_'+vk(v));
 }
 return [...new Set(issues)].sort();
}
function blank(){return {solids:new Set(),reserved:new Set(),protectedSites:new Set()};}
function claim(c,added){
 for(const v of c.local3DVoxels){(v.role==='DOOR_VOID'?added.reserved:added.solids).add(vk(v));}
 for(const v of c.localSwingAirReservation)added.reserved.add(vk(v));
 for(const p of [...c.protectedRoomCore,...c.protectedRoute,...c.proposedCorridorAirCells])added.protectedSites.add(typeof p==='string'?p:key(p));
}
export function claimSafe(c,idx,level,fixed,added){
 const errs=validateDelta(c,idx,level);
 if(errs.length)return errs;
 const collision=checkWholeFloorCandidate({...c,opening:c.local3DVoxels.filter(v=>v.role==='DOOR_VOID')},fixed,added);
 // Proposed corridor cells also must not consume existing reserved floor sites.
 for(const p of c.proposedCorridorAirCells)if(fixed.protectedSites.has(key(p))||added.protectedSites.has(key(p)))collision.push('CORRIDOR_TAKES_OTHER_ROUTE');
 if(collision.length)return [...new Set(collision)].sort();
 claim(c,added);return [];
}
export function searchRoom({held,room,port,shape,source,idx,fixed,added,otherRooms,maxShapes=32}){
 const tried={shapes:0,allocationRejected:0,doorwayTrials:0,structuralRejected:0,collisionRejected:0,actualProductionRejected:0};
 const variants=[];
 for(const sv of shapeVariants(room).slice(0,maxShapes)){
  tried.shapes++;
  if(!validAllocation(room,sv,shape,otherRooms,fixed.protectedSites)){tried.allocationRejected++;continue;}
  const possible=designJointRoom({held,room:sv.rect,port,shape,source,idx,protectedFloor:fixed,otherRooms,limit:32});
  tried.doorwayTrials+=possible.edgesConsidered;
  for(const option of possible.variants){
   const v=reuseExistingJamb(option,idx);
   if(!v){tried.structuralRejected++;continue;}
   v.retainedRoomAreaRatio=sv.areaRatio;
   v.redraftMode=sv.mode;
   v.originalRoomRect={x:room.x,z:room.z,width:room.width,depth:room.depth};
   v.priorRoomFootprintChanged=sv.mode!=='ORIGINAL_FOOTPRINT';
   v.requiresOldOpeningReview=port.roomCell.x!==v.doorRoomCell.x||port.roomCell.z!==v.doorRoomCell.z;
   const quality=validateDelta(v,idx,shape.level);
   if(quality.length){tried.actualProductionRejected++;continue;}
   variants.push(v);
  }
 }
 variants.sort((a,b)=>b.retainedRoomAreaRatio-a.retainedRoomAreaRatio||a.priorRoomFootprintChanged-b.priorRoomFootprintChanged||a.jointPatchVoxelCount-b.jointPatchVoxelCount||a.proposedNewCorridorCells.length-b.proposedNewCorridorCells.length||a.doorRoomCell.x-b.doorRoomCell.x||a.doorRoomCell.z-b.doorRoomCell.z);
 let selected=null;
 for(const v of variants){const issues=claimSafe(v,idx,shape.level,fixed,added);if(issues.length){tried.collisionRejected++;continue;}selected=v;break;}
 return {roomId:room.id,portId:port.id,originalArea:room.width*room.depth,selected,feasibleCount:variants.length,search:tried,
  status:selected?'NONSTRUCTURAL_ROOM_ALLOCATION_CANDIDATE':'HOLD_NO_NONSTRUCTURAL_ALLOCATION',worldCoordinates:null,operations:[],autoApply:false};
}
export async function compileB87(){
 const b86=read('parallel/b86/main/B86_JOINT_ENVELOPE_INTERIOR_REPORT.json');safe(b86,'minecraftaibuilder-b86-joint-facade-interior-virtual-branch-v1');
 const b85=read('parallel/b85/main/B85_FLOOR_LAYOUT_REPORT.json');if(b86.provenance.b85!==b85.reportSha256)stop('BASE_CHAIN');
 const b76=read('parallel/b76/main/B76_STAGING_REPORT.json');const b66=read('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json');
 const b65=read('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json');const b80=read('parallel/b80/main/B80_LOCAL_3D_FRAME_REPORT.json');
 const b81=read('parallel/b81/main/B81_TYPED_LOCAL_ASSEMBLY.json');const b82=read('parallel/b82/main/B82_ROOM_CORRIDOR_REDESIGN.json');
 const b83=read('parallel/b83/main/B83_HELD_ROOM_TEMPLATE_REPORT.json');const b84=read('parallel/b84/main/B84_LAYOUT_OPTIONS_REPORT.json');
 const b72=read('parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json');
 const indexed={};for(const [k,b] of Object.entries({b65,b66,b80,b81,b82,b83,b84}))indexed[k]=new Map(b.sections.map(s=>[s.id,s]));
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b87-offline-planner-'));const replays=[],sections=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const official=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  if(hash(official)!==b86.provenance.officialBlocksSha256)stop('OFFICIAL_CATALOG_DRIFT');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,read('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs){
   const ref=b76.buildings.find(b=>b.id===job.id),frozen=b86.productionReplays.find(b=>b.building===job.id);
   if(!ref||!frozen)stop('MISSING_BUILDING');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   if(hash(plan.operations)!==frozen.operationsSha256)stop('PINNED_PLANNER_DRIFT');
   replays.push({...frozen});
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   for(const prev of b86.sections.filter(s=>s.id.startsWith(job.id+'/'))){
    const secid=prev.id,shape=indexed.b66.get(secid),source=indexed.b65.get(secid),fixed=protectedFloor(indexed.b81.get(secid),indexed.b80.get(secid),indexed.b82.get(secid),indexed.b83.get(secid),indexed.b84.get(secid));
    if(!shape||!source)stop('MISSING_FLOOR');
    const added=blank(),rooms=[];
    // Safe B86 alternatives can be held stable as proposals, never turned into world edits.
    for(const old of prev.rooms){
     const variants=old.variants.map(v=>reuseExistingJamb(v,idx)).filter(Boolean);if(!variants.length)continue;
     let accepted=null;for(const v of variants){if(claimSafe(v,idx,shape.level,fixed,added).length===0){accepted=v;break;}}
     if(!accepted)stop('B86_SAFE_CANDIDATE_CONFLICT');
     rooms.push({roomId:old.roomId,portId:old.portId,status:'B86_NONSTRUCTURAL_CANDIDATE_PRESERVED',selected:accepted,search:null,operations:[],worldCoordinates:null});
    }
    for(const old of prev.rooms.filter(r=>!rooms.some(p=>p.portId===r.portId))){
     const port=source.openingPorts.find(p=>p.id===old.portId),room=shape.conceptRooms.find(r=>r.id===old.roomId);
     if(!port||!room)stop('SOURCE_ROOM_MISMATCH');
     const result=searchRoom({held:old,room,port,shape,source,idx,fixed:{solids:new Set([...fixed.solids,...added.solids]),reserved:new Set([...fixed.reserved,...added.reserved]),protectedSites:new Set([...fixed.protectedSites,...added.protectedSites])},added:blank(),otherRooms:shape.conceptRooms.filter(r=>r.id!==room.id)});
     // global floor arbitration on all selected rooms and all earlier proposals
     if(result.selected){const existingAdded=blank();const err=claimSafe(result.selected,idx,shape.level,fixed,existingAdded);if(err.length||[...existingAdded.solids,...existingAdded.reserved].some(k=>added.solids.has(k)||added.reserved.has(k))||[...existingAdded.protectedSites].some(k=>added.protectedSites.has(k))){result.status='HOLD_CROSS_ROOM_CONFLICT';result.selected=null;}else claim(result.selected,added);}
     rooms.push(result);
    }
    sections.push({id:secid,level:shape.level,rooms,existingProposalsUnmodified:true,structuralModificationAccepted:false,executionAllowed:false,operations:[],worldCoordinates:null});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const all=sections.flatMap(s=>s.rooms),kept=all.filter(r=>r.status==='B86_NONSTRUCTURAL_CANDIDATE_PRESERVED'),newly=all.filter(r=>r.status==='NONSTRUCTURAL_ROOM_ALLOCATION_CANDIDATE');
 const originalStructural= b86.sections.flatMap(s=>s.rooms).filter(r=>r.variants.length&&r.variants[0].structuralReviewRequired).length;
 const held=all.filter(r=>!r.selected);
 const totals={buildings:5,floors:30,rooms:314,priorProposalsUnmodified:287,b86FrameReuseProposals:kept.length,b86PrimaryWallJambReuseProposals:kept.filter(r=>r.selected.existingWallJambEvidence.some(x=>x.existingProductionRole==='primaryWall')).length,b86StructuralReplacementAvoided:originalStructural,
  newNonStructuralCandidates:newly.length,totalLocalReviewCandidates:287+kept.length+newly.length, verifiedNoNewProductionEditsForB87:kept.length+newly.length, reusedExistingJambVoxels:kept.reduce((n,r)=>n+r.selected.existingWallJambEvidence.length,0),
  originalB86OpenIssues:18,stillHeldAfterB87:held.length,candidateRoomAreaMin:newly.length?Math.min(...newly.map(r=>r.selected.retainedRoomAreaRatio)):null,
  majorWallEditsApproved:0,productionFilesEdited:0,worldContacts:0,constructionCommands:0};
 if(replays.length!==5||sections.length!==30||all.length!==27||kept.length!==9||originalStructural!==6||totals.totalLocalReviewCandidates+held.length!==314)stop('COUNTS');
 const body={schema:'minecraftaibuilder-b87-structural-free-room-redraft-v1',kind:'OFFLINE_READONLY_NONSTRUCTURAL_ALLOCATION',
  provenance:{b86:b86.reportSha256,b85:b85.reportSha256,officialBlocksSha256:b86.provenance.officialBlocksSha256},productionReplays:replays,totals,sections,
  outstanding:['B86_SIX_PRIMARY_WALL_REPLACEMENTS_REDESIGNED_AS_IN_SITU_JAMBS__STILL_UNAPPROVED','BUILDING_WIDE_EGRESS_AND_CORRIDOR_WIDTH_UNVERIFIED','BEDROCK_DOOR_HINGE_FACING_AND_OLD_OPENING_UNVERIFIED','STAIR_SLAB_ACCESS_NOT_PREPARED','OFF_MASK_CORRIDOR_RESERVATIONS_HELD','ANY_NEW_ROOM_BOUNDS_ARE_REVIEW_ONLY'],
  approval:'PROPOSED_ONLY',readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:b86.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=await compileB87();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B87_STRUCTURAL_FREE_REPORT.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r.totals,null,2));
}
