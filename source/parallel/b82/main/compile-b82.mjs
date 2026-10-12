/** B82 read-only local room/corridor boundary retargeting.
 * Only B78 speculative partitions owned by the held room may be reconsidered.
 * Pinned production voxels and all existing B81 doors/walls/routes are immutable.
 * This script does NOT emit executable Minecraft operations or world coordinates.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {inspectProposedPort,hash,safe,key} from '../../b79/main/compile-b79.mjs';
import {assessFrame,corridorComponents} from '../../b80/main/compile-b80.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const get=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const fail=s=>{throw Error('B82_'+s)};
const vk=p=>`${p.x},${p.y},${p.z}`;
const site=p=>typeof p==='string'?p:key(p);
const asPoint=p=>typeof p==='string'?Object.fromEntries(p.split(',').map((v,i)=>[i===0?'x':'z',Number(v)])):p;
const dist=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z);
const schemas=Object.freeze({
 b65:'minecraftaibuilder-b65-interior-assembly-intents-v1',
 b66:'minecraftaibuilder-b66-local-3d-nominal-assembly-v1',
 b76:'minecraftaibuilder-b76-production-footprint-and-interior-staging-v1',
 b78:'minecraftaibuilder-b78-global-grid-arbitration-v1',
 b80:'minecraftaibuilder-b80-readonly-local-3d-door-frame-mock-v1',
 b81:'minecraftaibuilder-b81-typed-local-construction-intents-v1'});
/** Existing locally proposed B81 assembly is a HARD protection for this delta. */
export function immutableFootprint(typedSection,previousSection){
 if(typedSection.id!==previousSection.id)fail('DIFFERENT_SECTION');
 const solids=new Set(typedSection.solidVoxelIntents.map(vk));
 const reserved=new Set(),protectedSites=new Set();
 for(const d of typedSection.doorPairs)for(const v of d.parts){if(solids.has(vk(v)))fail('BASE_CONFLICT');reserved.add(vk(v));}
 for(const room of previousSection.rooms)if(room.selected){
  for(const v of room.selected.localSwingAirReservation)reserved.add(vk(v));
  for(const p of [...room.selected.protectedRoomCore,...room.selected.protectedRoute])protectedSites.add(site(p));
 }
 return {solids,reserved,protectedSites};
}
export function checkWholeFloorCandidate(candidate,fixed,added){
 // A candidate may not override old proposed solids, doors, swing air, core, or route.
 const vox=candidate.local3DVoxels,swing=candidate.localSwingAirReservation;
 if(!vox?.length||!swing?.length||!candidate.protectedRoute?.length||!candidate.protectedRoomCore?.length)return ['MISSING_3D_OR_ROUTE'];
 const reasons=new Set();
 for(const v of vox){if(fixed.solids.has(vk(v))||added.solids.has(vk(v)))reasons.add('COLLIDES_WITH_EXISTING_LOCAL_SOLID');
  if(fixed.reserved.has(vk(v))||added.reserved.has(vk(v)))reasons.add('COLLIDES_WITH_EXISTING_DOOR_OR_AIR');
  if(fixed.protectedSites.has(site(v))||added.protectedSites.has(site(v)))reasons.add('TAKES_EXISTING_ROOM_CORE_OR_ROUTE');}
 for(const v of swing){if(fixed.solids.has(vk(v))||added.solids.has(vk(v)))reasons.add('SWING_BLOCKED_BY_EXISTING_SOLID');
  if(fixed.reserved.has(vk(v))||added.reserved.has(vk(v)))reasons.add('SWING_OVERLAPS_ANOTHER_DOOR_RESERVATION');}
 for(const p of [...candidate.protectedRoomCore,...candidate.protectedRoute]){
  for(const y of candidate.opening.map(v=>v.y)){
   const q=asPoint(p);
   if(fixed.solids.has(`${q.x},${y},${q.z}`)||added.solids.has(`${q.x},${y},${q.z}`))reasons.add('NEW_ROOM_ROUTE_BLOCKED_BY_EXISTING_SOLID');
  }
  if(added.protectedSites.has(site(p)))reasons.add('SHARED_CORE_OR_ROUTE_WITH_NEW_ROOM');
 }
 return [...reasons].sort();
}
function claim(candidate,added){
 for(const v of candidate.local3DVoxels){const k=vk(v);if(added.solids.has(k)||added.reserved.has(k))fail('SELF_CLAIM_CONFLICT');
  if(v.role==='DOOR_VOID')added.reserved.add(k);else added.solids.add(k);}
 for(const v of candidate.localSwingAirReservation)added.reserved.add(vk(v));
 for(const p of [...candidate.protectedRoomCore,...candidate.protectedRoute])added.protectedSites.add(site(p));
}
/** Evaluate a held room without changing source or any existing B81 placements. */
export function searchHeldRoom({held,source,shape,stage,idx,corridors,existing,added}){
 const port=source.openingPorts.find(p=>p.id===held.portId);
 const room=shape.conceptRooms.find(r=>r.id===held.roomId);
 if(!port||!room||port.roomId!==room.id)fail('PORT_ROOM_LINK');
 const boundary=source.nominalWalls.filter(w=>w.roomId===room.id&&w.neighborClass==='CONCEPT_CORRIDOR');
 // Room-owned B78 wall cells were never placed; only these may be reconsidered.
 const own=stage.stagedCells.filter(c=>c.owner===room.id);
 const relaxed={...stage,stagedCells:stage.stagedCells.filter(c=>c.owner!==room.id)};
 const considered=[],valid=[];
 for(const edge of boundary){
  const normal={dx:edge.adjacentCell.x-edge.insideCell.x,dz:edge.adjacentCell.z-edge.insideCell.z};
  const p={...port,normal};
  const nominal=inspectProposedPort({edge,port:p,room,shape,stage:relaxed,idx,source,baselineDoors:source.openingPorts});
  const frame=assessFrame({proposal:nominal,port,room,shape,source,idx,corridors});
  const defects=frame.rejects.length?frame.rejects:checkWholeFloorCandidate(frame,existing,added);
  considered.push({edgeId:edge.id,roomCell:edge.insideCell,hallCell:edge.adjacentCell,normal,blockers:defects});
  if(!defects.length)valid.push(frame);
 }
 valid.sort((a,b)=>Number(a.doorReoriented)-Number(b.doorReoriented)||dist(a.localDoorRoomCell,port.roomCell)-dist(b.localDoorRoomCell,port.roomCell)||a.wallBoundaryId.localeCompare(b.wallBoundaryId));
 const selected=valid[0]??null;
 if(selected){const post=checkWholeFloorCandidate(selected,existing,added);if(post.length)fail('SELECTED_CONFLICT');claim(selected,added);}
 const protectedNew=selected?new Set([...selected.protectedRoute,...selected.protectedRoomCore,...selected.local3DVoxels,...selected.localSwingAirReservation].map(site)):new Set();
 const deferredOwnWalls=own.filter(c=>protectedNew.has(c.site)).map(c=>({site:c.site,sourceWallIds:c.wallIds,owner:c.owner,status:'PROPOSED_TO_DEFER__B78_ONLY_NOT_A_WORLD_CHANGE'}));
 const rejectionFrequency={};for(const c of considered)for(const reason of c.blockers)rejectionFrequency[reason]=(rejectionFrequency[reason]??0)+1;
 return {portId:port.id,roomId:room.id,oldCategory:held.category,originalPortCell:port.roomCell,
  sourceBoundaryCount:boundary.length,existingSourceCorridorBoundaries:boundary.length,
  recheckedWithOnlyOwnSpeculativeWallsRelaxed:own.length,
  strictlyValidVariants:valid.length,
  proposed:selected?{sourceWallId:selected.wallBoundaryId,roomCell:selected.localDoorRoomCell,hallCell:selected.localDoorHallCell,normal:selected.normal,
    doorReoriented:selected.doorReoriented,requiresOldOpeningRedesign:selected.requiresOldOpeningRedesign,
    opening:selected.opening,frame:selected.frame,local3DVoxels:selected.local3DVoxels,
    localSwingAirReservation:selected.localSwingAirReservation,protectedRoomCore:selected.protectedRoomCore,protectedRoute:selected.protectedRoute,
    oldOpeningClosure:'NOT_PROPOSED_OR_APPROVED',doorHinge:null,doorStateCalibration:'UNVERIFIED',placementAllowed:false}:null,
  proposedDeferredB78WallCells:deferredOwnWalls,
  rejectionFrequency,reasonForHold:selected?null:'NO_CANDIDATE_SATISFIES_PRODUCTION_AND_EXISTING_B81_IMMUTABILITY',
  autoApply:false,operations:[],worldCoordinates:null};
}
export async function compileB82(){
 const b={};for(const n of Object.keys(schemas)){b[n]=get(`parallel/${n}/main/${({b65:'B65_INTERIOR_ASSEMBLY_INTENTS.json',b66:'B66_LOCAL_3D_ASSEMBLY.json',b76:'B76_STAGING_REPORT.json',b78:'B78_GLOBAL_GRID_REPORT.json',b80:'B80_LOCAL_3D_FRAME_REPORT.json',b81:'B81_TYPED_LOCAL_ASSEMBLY.json'})[n]}`);safe(b[n],schemas[n]);}
 for(const [p,h] of [['b80',b.b81.provenance.b80],['b65',b.b81.provenance.b65]])if(b[p].reportSha256!==h)fail('PROVENANCE_'+p);
 const sectionsBy={};for(const n of ['b65','b66','b78','b80','b81'])sectionsBy[n]=new Map(b[n].sections.map(s=>[s.id,s]));
 const input=get('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json');
 const {report:b72}=buildB72();
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b82-pinned-offline-'));
 const sections=[],replays=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const official=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  if(hash(official)!==b.b81.provenance.officialBlocksSha256)fail('OFFICIAL_CATALOG_CHANGED');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,input);
  for(const job of b72.jobs){
   const ref=b.b76.buildings.find(x=>x.id===job.id),frozen=b.b80.productionReplays.find(x=>x.building===job.id);
   if(!ref||!frozen||ref.floorMask.delta!==0)fail('REFERENCE');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   const digest=hash(plan.operations);if(digest!==frozen.operationsSha256)fail('PRODUCTION_CHANGED');
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   replays.push({building:job.id,operationsSha256:digest});
   for(const base of b.b81.sections.filter(s=>s.id.startsWith(job.id+'/'))){
    const id=base.id,src=sectionsBy.b65.get(id),shape=sectionsBy.b66.get(id),stage=sectionsBy.b78.get(id),previous=sectionsBy.b80.get(id);
    if(!src||!shape||!stage||!previous)fail('MISSING_SECTION');
    const oldHeld=base.held.filter(h=>h.category==='NO_VALID_DOOR_BOUNDARY').sort((a,b)=>a.portId.localeCompare(b.portId));
    const existing=immutableFootprint(base,previous),added={solids:new Set(),reserved:new Set(),protectedSites:new Set()};
    const corridors=corridorComponents(shape,idx);
    const rooms=oldHeld.map(held=>searchHeldRoom({held,source:src,shape,stage,idx,corridors,existing,added}));
    const initial=base.held.length,selected=rooms.filter(r=>r.proposed).length;
    sections.push({id,level:base.level,originalTypedDoorPairs:base.doorPairs.length,
      originalHeld:initial,originalNoValidBoundary:oldHeld.length,newlyReviewableFromHeld:selected,remainingHeld:initial-selected,
      heldBoundaryRedesigns:rooms,existingTypedAssemblyUntouched:true,worldCoordinates:null,operations:[],placementAuthorized:false});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const rooms=sections.flatMap(x=>x.heldBoundaryRedesigns),redesigned=rooms.filter(x=>x.proposed),still=rooms.filter(x=>!x.proposed);
 const totals={buildings:replays.length,sections:sections.length,roomsInScope:314,originalTypedDoors:b.b81.totals.typedDoorPairs,
   originallyHeld:b.b81.totals.blockedRooms,missingBoundaryCategory:rooms.length,
   newCandidateRooms:redesigned.length,remainingInMissingBoundaryCategory:still.length,
   heldOtherCategories:b.b81.totals.blockedRooms-rooms.length,
   remainingHeldIfAlternativesAccepted:b.b81.totals.blockedRooms-redesigned.length,
   existingB81DoorPairsPreserved:b.b81.totals.typedDoorPairs,
   deferredB78SpeculativeWallCells:redesigned.reduce((n,r)=>n+r.proposedDeferredB78WallCells.length,0),
   acceptedProductionEdits:0,worldCommands:0,worldContacts:0};
 if(totals.buildings!==5||totals.sections!==30||totals.missingBoundaryCategory!==32||totals.originalTypedDoors!==260||totals.originallyHeld!==54||totals.newCandidateRooms>32)fail('COUNTS');
 const body={schema:'minecraftaibuilder-b82-readonly-speculative-wall-reroute-v1',kind:'NON_EXECUTABLE_CONCEPT_CORRIDOR_BOUNDARY_DELTA',
  provenance:{b81:b.b81.reportSha256,b80:b.b80.reportSha256,b78:b.b78.reportSha256,b65:b.b65.reportSha256,b66:b.b66.reportSha256},
  productionReplays:replays,totals,sections,scope:{onlyNoValidDoorBoundary:true,onlyRetargetOwnRoomB78SpeculativeWallCells:true,
   unchangedOfficialProduction:true,unchangedOld260TypedDoors:true,unchangedB81Solids:true,
   addedWallsOrDoorsAreNotPlacementPlans:true},
  remainingRisks:['ALL_NEW_CANDIDATES_REQUIRE_WHOLE_BUILDING_EGRESS_AND_SWING_VERIFICATION','EXISTING_DOOR_FACING_HINGE_STILL_UNCALIBRATED','OLD_PORT_CLOSURES_REQUIRE_SEPARATE_AUTHORIZATION','24_OTHER_HELD_ROOMS_REQUIRE_PRODUCTION_OR_ROOM_LAYOUT_REDESIGN','25_STAIRS_AND_240_SLAB_CUTS_UNVERIFIED','18_OUTSIDE_MASK_CORRIDOR_SITES','HOTEL_FACADE_APPROVAL'],
  readiness:'NOT_PREPARED',approval:'PROPOSED_ONLY',constructionApproved:false,executionAllowed:false,worldContacts:0,
  gates:b.b81.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await compileB82();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B82_ROOM_CORRIDOR_REDESIGN.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result.totals,null,2));
}
