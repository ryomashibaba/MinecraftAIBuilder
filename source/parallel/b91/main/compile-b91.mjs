/** B91 offline 3D architectural options, strict pinned production replay, never executable. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
import {protectedFloor} from '../../b86/main/compile-b86.mjs';
import {corridorNetwork} from '../../b88/main/compile-b88.mjs';
import {programDoorFrontiers} from '../../b90/main/b90-program-zoning.mjs';
import {draftAperture,arbitrateFloor,validateB91} from './b91-floor-design.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
function demand(x,reason){if(!x)throw Error('B91_'+reason)}
function addClaims(a,v){
 for(const p of v.local3DVoxels??[])a[p.role==='DOOR_VOID'?'reserved':'solids'].add(`${p.x},${p.y},${p.z}`);
 for(const p of v.localSwingAirReservation??[])a.reserved.add(`${p.x},${p.y},${p.z}`);
 for(const p of [...(v.protectedRoomCore??[]),...(v.protectedRoute??[]),...(v.proposedCorridorAirCells??[])])a.protectedSites.add(typeof p==='string'?p:`${p.x},${p.z}`);
}
const coord=v=>`${v.x},${v.y},${v.z}`;
export function checkPinnedProduction(derived,idx){
 for(const p of derived.openingAirSlots){const s=idx.final.get(coord(p));if(!!s?.occupied!==p.originalOccupied||s?.occupied&&(s.block!==p.originalBlock||s.role!==p.originalRole||s.operationIndex!==p.originalOperationIndex))throw Error('B91_PRODUCTION_VOXEL_DRIFT');}
 for(const p of derived.explicitBlockChangeRequests)if(p.changeAllowed!==false||p.blockOperations.length)throw Error('B91_UNSAFE_BLOCK_CHANGE');
 return true;
}
/** Four program-level templates, not a substitution for physical clearance or independent access. */
function makeFloorPrograms(rows,arb){
 const area=rows.reduce((n,r)=>n+r.roomArea,0);
 return [
  {id:'KEEP_ORIGINAL_ROOM_COUNT_WITH_UNPROVEN_ACCESS',roomCountRetained:0,roomCountHeld:rows.length,
    usableAreaClaimed:0,nominalAreaHeld:area,requiredApprovals:['PHYSICAL_PASSAGE','EGRESS','BEDROCK_DOOR'],status:'HOLD',operations:[]},
  {id:'CANDIDATE_JOINT_APERTURE_AND_CIRCULATION_REDESIGN',roomCountRetained:0,roomCountHeld:rows.length,
    local3dCandidates:arb.reviewOnlyAlternatives.length,usableAreaClaimed:0,nominalAreaHeld:area,
    requiredApprovals:['FLOOR_PROGRAM','EXISTING_VOXEL_CHANGES','DOOR_HINGE','EGRESS','PRIOR_CANDIDATE_PROTECTION'],status:'REVIEW_ONLY',operations:[]},
  {id:'CONVERT_HELD_ROOMS_TO_UNOCCUPIABLE_SERVICE_BUFFER',roomCountRetained:0,roomCountHeld:rows.length,
    removedNominalIndependentRoomCount:rows.length,reassignedNominalArea:area,usableAreaClaimed:0,
    requiredApprovals:['PROGRAM_REDUCTION','BUILDING_ACCESS','MAINTENANCE'],status:'HOLD_ROOM_COUNT_REDUCTION',operations:[]}
 ];
}
export async function compileB91(){
 const prev=read('parallel/b90/main/B90_PROGRAM_ZONING_REPORT.json');safe(prev,'minecraftaibuilder-b90-program-zoning-intervention-frontier-v1');
 const b89=read('parallel/b89/main/B89_FLOOR_ZONING_REPORT.json');safe(b89,'minecraftaibuilder-b89-constraint-room-corridor-zoning-v1');
 demand(prev.provenance.b89===b89.reportSha256,'B89_PROVENANCE');
 const b87=read('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');safe(b87,'minecraftaibuilder-b87-structural-free-room-redraft-v1');
 const source={};for(const [n,file] of Object.entries({b65:'B65_INTERIOR_ASSEMBLY_INTENTS.json',b66:'B66_LOCAL_3D_ASSEMBLY.json',b80:'B80_LOCAL_3D_FRAME_REPORT.json',b81:'B81_TYPED_LOCAL_ASSEMBLY.json',b82:'B82_ROOM_CORRIDOR_REDESIGN.json',b83:'B83_HELD_ROOM_TEMPLATE_REPORT.json',b84:'B84_LAYOUT_OPTIONS_REPORT.json'})){
  source[n]=new Map(read(`parallel/${n}/main/${file}`).sections.map(s=>[s.id,s]));
 }
 const b72=read('parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json'),b76=read('parallel/b76/main/B76_STAGING_REPORT.json');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b91-joint-floor-'));
 const rooms=[],floors=[],replayed=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const catalog=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  demand(hash(catalog)===prev.provenance.officialBlocksSha256,'CATALOG_DRIFT');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,read('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs.filter(j=>prev.replayed.some(p=>p.building===j.id))){
   const ref=b76.buildings.find(b=>b.id===job.id),pin=prev.replayed.find(p=>p.building===job.id);
   demand(ref&&pin,'BUILDING_MISSING');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   demand(hash(plan.operations)===pin.operationsSha256,'PINNED_PLANNER_DRIFT');
   replayed.push({building:job.id,operationsSha256:pin.operationsSha256,verifiedWithoutExecution:true});
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   for(const prevFloor of prev.floors.filter(f=>f.sectionId.startsWith(`${job.id}/`))){
    const shape=source.b66.get(prevFloor.sectionId),src=source.b65.get(prevFloor.sectionId),before=b87.sections.find(s=>s.id===prevFloor.sectionId);
    demand(shape&&src&&before,'SECTION_MISSING');
    const fixed=protectedFloor(...['b81','b80','b82','b83','b84'].map(n=>source[n].get(prevFloor.sectionId)));
    for(const r of before.rooms.filter(x=>x.selected))addClaims(fixed,r.selected);
    const network=corridorNetwork(shape);
    const floorRows=[];
    for(const r of prev.rooms.filter(x=>x.sectionId===prevFloor.sectionId)){
     const room=shape.conceptRooms.find(a=>a.id===r.roomId),port=src.openingPorts.find(p=>p.id===r.portId);
     demand(room&&port&&port.roomId===r.roomId,'HELD_PORT_MISSING');
     const frontiers=programDoorFrontiers({room,port,shape,idx,fixed,network,
      otherRooms:shape.conceptRooms.filter(a=>a.id!==r.roomId),maxFrontiers:64});
     demand(frontiers.scannedValidFrontiers===r.doorFrontiers.scannedValidFrontiers,'B90_FRONTIER_DRIFT');
     const apertures=frontiers.frontiers.map(f=>draftAperture({row:r,f,shape,idx,fixed,
      otherRooms:shape.conceptRooms.filter(a=>a.id!==room.id)}));
     for(const a of apertures)checkPinnedProduction(a,idx);
     apertures.sort((a,b)=>a.score-b.score||a.doorRoomCell.x-b.doorRoomCell.x||a.doorRoomCell.z-b.doorRoomCell.z);
     const row={sectionId:r.sectionId,roomId:r.roomId,portId:r.portId,pattern:r.pattern,
      originalRoom:room,roomArea:r.roomArea,productionFrontierCount:frontiers.scannedValidFrontiers,
      geometryScan:frontiers.rejections,apertures,
      originalIndependentRoomHeld:true,independentRoomApproved:false,
      originalRoomFootprintUntouched:true,globalEgressCertified:false,
      existingProductionEdited:false,worldCoordinates:null,executionAllowed:false,operations:[]};
     rooms.push(row);floorRows.push(row);
    }
    const arbitration=arbitrateFloor(floorRows);
    floors.push({sectionId:prevFloor.sectionId,heldRooms:floorRows.length,
      heldNominalArea:floorRows.reduce((sum,r)=>sum+r.roomArea,0),
      prior296ProposalsModified:0,productionModified:0,facadeGlazingModified:0,
      designOptions:makeFloorPrograms(floorRows,arbitration),arbitration,
      reviewOnly:true,constructionCommands:0,worldCoordinates:null});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const patterns=[...new Set(rooms.map(r=>r.pattern))].sort().map(pattern=>{
  const group=rooms.filter(r=>r.pattern===pattern);
  const all=group.flatMap(r=>r.apertures);
  return {pattern,roomCount:group.length,floors:group.map(r=>r.sectionId),
   scanned3dArchitecturalVariants:all.length,roomsWithoutAnyFrontier:group.filter(r=>!r.apertures.length).length,
   roomsWithFullyClearApertureReview:group.filter(r=>r.apertures.some(a=>!a.geometryFailures.length&&a.productionContacts===0)).length,
   roomsWithConditionalMaterialReview:group.filter(r=>r.apertures.some(a=>!a.geometryFailures.length&&a.productionContacts>0)).length,
   allFloorApprovalRequired:true,approvedRooms:0};
 });
 const all=rooms.flatMap(r=>r.apertures);
 const totals={referenceBuildings:5,referenceFloors:30,reviewedHeldFloors:floors.length,originalRooms:314,
  previousUnapprovedCandidates:296,originalHeldRooms:18,heldRoomsAfterReview:18,newlyApprovedRooms:0,
  inspectedArchitecturalBranches:all.length,materialChangeReviewSlots:all.reduce((n,a)=>n+a.productionContacts,0),
  reviewOnlyNoProductionContactVariants:all.filter(a=>a.productionContacts===0).length,
  geometryCompleteWithoutProductionEdit:all.filter(a=>a.branchClass==='REVIEW_ONLY_ZERO_PRODUCTION_EDIT').length,
  conditionalProductionChangeBranches:all.filter(a=>a.branchClass==='HOLD_CONDITIONAL_BLOCK_CHANGE').length,
  rejectedGeometryOrProtectedBranches:all.filter(a=>a.geometryFailures.length).length,
  collisionFreeWholeFloorSelections:floors.reduce((n,f)=>n+f.arbitration.reviewOnlyAlternatives.length,0),
  prior296ClaimsModified:0,productionEdits:0,constructionCommands:0,worldContacts:0};
 demand(replayed.length===2&&rooms.length===18&&floors.length===10&&patterns.length===4,'COUNTS');
 const report={schema:'minecraftaibuilder-b91-joint-floor-voxel-architectural-branches-v1',
  kind:'READONLY_ARCHITECTURAL_BRANCHES_NOT_BLUEPRINT_NOT_CONSTRUCTION',
  provenance:{b90:prev.reportSha256,b89:b89.reportSha256,officialBlocksSha256:prev.provenance.officialBlocksSha256},
  totals,replayed,rooms,floors,patterns,
  limitations:['LOCAL_GEOMETRY_ONLY','REVIEW_ONLY_NO_CONSTRUCTION_AUTHORIZATION',
    'PROPOSED_OPENING_REQUIRES_APPROVED_STRUCTURAL_OR_FLOOR_ENGINEERING_REVIEW',
    'PRIOR_296_UNAPPROVED_CANDIDATES_MUST_STAY_UNMODIFIED',
    'ROOM_COUNT_296_IS_NOT_CERTIFIED_OCCUPANCY','EXIT_ROUTE_DOOR_HINGE_LINTEL_NOT_CERTIFIED',
    'ZERO_VOXEL_COLLISION_IS_NOT_SAFETY_OR_FUNCTIONAL_CERTIFICATION'],
  readiness:'NOT_PREPARED',approval:'REVIEW_ONLY',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:prev.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 demand(validateB91(report),'SAFETY');return {...report,reportSha256:hash(report)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=await compileB91();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B91_FLOOR_BRANCHES_REPORT.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify(r.totals,null,2));console.log('PATTERNS',JSON.stringify(r.patterns));
}
