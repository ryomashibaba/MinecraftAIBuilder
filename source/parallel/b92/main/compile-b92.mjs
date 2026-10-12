/** B92 whole-floor constrained retiling and air-corridor validation. NO construction. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
import {protectedFloor} from '../../b86/main/compile-b86.mjs';
import {retileRoom,auditExistingAperture,validateB92} from './b92-floor-retiler.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
function must(ok,why){if(!ok)throw Error('B92_'+why)}
const vk=p=>`${p.x},${p.y},${p.z}`;
function claim(fixed,v){
 for(const p of v.local3DVoxels??[])(p.role==='DOOR_VOID'?fixed.reserved:fixed.solids).add(vk(p));
 for(const p of v.localSwingAirReservation??[])fixed.reserved.add(vk(p));
 for(const p of [...(v.protectedRoomCore??[]),...(v.protectedRoute??[]),...(v.proposedCorridorAirCells??[])])fixed.protectedSites.add(typeof p==='string'?p:`${p.x},${p.z}`);
}
export function conflictBundle(rows){
 // Deterministic cross-room set-packing. Remains review-only even when geometry is non-overlapping.
 const used=new Set(),accepted=[],rejected=[];
 const all=rows.flatMap(r=>r.retile.reviewOptions.map(o=>({...o,sectionId:r.sectionId})));
 all.sort((a,b)=>Number(b.verifiedPhysicalCoreNeighbor)-Number(a.verifiedPhysicalCoreNeighbor)||a.relocatedCellCount-b.relocatedCellCount||a.roomId.localeCompare(b.roomId));
 for(const v of all){if(used.has(v.roomId))continue;
  const usedCells=new Set(accepted.flatMap(a=>[...a.reviewOption.newFootprintCells.map(p=>`${p.x},${p.z}`),...a.reviewOption.door.extraCorridorCells.map(p=>`${p.x},${p.z}`)]));
  const footprint=v.newFootprintCells.map(p=>`${p.x},${p.z}`),corridor=v.door.extraCorridorCells.map(p=>`${p.x},${p.z}`);
  if([...footprint,...corridor].some(k=>usedCells.has(k))){rejected.push({roomId:v.roomId,reason:'CROSS_ROOM_REZONE_OVERLAP'});continue;}
  accepted.push({roomId:v.roomId,reviewOption:v,authorised:false,executionAllowed:false,operations:[]});used.add(v.roomId);
 }
 return {nonOverlappingReviewBundles:accepted,alternativesRejected:rejected,approvedRooms:0,commands:0,worldContacts:0};
}
export async function compileB92(){
 const prev=read('parallel/b91/main/B91_FLOOR_BRANCHES_REPORT.json');safe(prev,'minecraftaibuilder-b91-joint-floor-voxel-architectural-branches-v1');
 const old=read('parallel/b90/main/B90_PROGRAM_ZONING_REPORT.json');safe(old,'minecraftaibuilder-b90-program-zoning-intervention-frontier-v1');
 must(prev.provenance.b90===old.reportSha256,'PROVENANCE');
 const refs={};for(const [k,p] of Object.entries({b65:'B65_INTERIOR_ASSEMBLY_INTENTS.json',b66:'B66_LOCAL_3D_ASSEMBLY.json',
  b80:'B80_LOCAL_3D_FRAME_REPORT.json',b81:'B81_TYPED_LOCAL_ASSEMBLY.json',b82:'B82_ROOM_CORRIDOR_REDESIGN.json',
  b83:'B83_HELD_ROOM_TEMPLATE_REPORT.json',b84:'B84_LAYOUT_OPTIONS_REPORT.json'}))refs[k]=new Map(read(`parallel/${k}/main/${p}`).sections.map(s=>[s.id,s]));
 const b72=read('parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json'),b76=read('parallel/b76/main/B76_STAGING_REPORT.json');
 const b87=read('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');safe(b87,'minecraftaibuilder-b87-structural-free-room-redraft-v1');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b92-readonly-')),rooms=[],floors=[],replayed=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const catalog=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  must(hash(catalog)===prev.provenance.officialBlocksSha256,'BLOCK_CATALOG_PIN');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,read('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const j of b72.jobs.filter(j=>prev.replayed.some(v=>v.building===j.id))){
   const ref=b76.buildings.find(b=>b.id===j.id),pin=prev.replayed.find(v=>v.building===j.id);
   must(ref&&pin,'PINNED_INPUT');
   const plan=planner.makePlan({...j.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   must(hash(plan.operations)===pin.operationsSha256,'PINNED_OPERATIONS');
   const idx=finalProductionIndex(plan.operations,j.createBuildingPlanInputCandidate.width,j.createBuildingPlanInputCandidate.depth);
   replayed.push({building:j.id,operationsSha256:pin.operationsSha256,readOnly:true});
   for(const oldFloor of prev.floors.filter(f=>f.sectionId.startsWith(`${j.id}/`))){
    const sectionId=oldFloor.sectionId,shape=refs.b66.get(sectionId),source=refs.b65.get(sectionId),section87=b87.sections.find(s=>s.id===sectionId);
    must(shape&&source&&section87,'FLOOR_DATA');
    const fixed=protectedFloor(...['b81','b80','b82','b83','b84'].map(k=>refs[k].get(sectionId)));
    for(const row of section87.rooms.filter(r=>r.selected))claim(fixed,row.selected);
    const rows=[];
    for(const original of prev.rooms.filter(r=>r.sectionId===sectionId)){
     const room=shape.conceptRooms.find(r=>r.id===original.roomId);
     must(room,'ROOM_ID');
     const otherRooms=shape.conceptRooms.filter(r=>r.id!==room.id);
     const retile=retileRoom({room,shape,idx,fixed,otherRooms});
     const localApertures=original.apertures.map(a=>auditExistingAperture(a,shape,idx,fixed,otherRooms));
     const row={sectionId,roomId:room.id,pattern:original.pattern,originalRoom:room,roomArea:room.width*room.depth,
      oldApertures:original.apertures.length,existingApertureCoreAudits:localApertures,retile,
      requiredReview:['OLD_BOUNDARY_AND_SERVICE_ZONING','FLOOR_DESIGN','EXIT_ROUTE','BEDROCK_DOOR_STATES'],
      retainedAreaClaimed:0,independentRoomApproved:false,constructionApproved:false,executionAllowed:false,operations:[]};
     rooms.push(row);rows.push(row);
    }
    const arbitration=conflictBundle(rows);
    floors.push({sectionId,heldRooms:rows.length,geometryCandidates:rows.reduce((n,r)=>n+r.retile.passingTotal,0),
     provisionallyNonoverlap:arbitration.nonOverlappingReviewBundles.length,arbitration,
     prior296Modified:0,productionModified:0,worldCoordinates:null,worldCommands:0,approval:'HOLD'});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const patterns=[...new Set(rooms.map(r=>r.pattern))].sort().map(pattern=>{
  const rows=rooms.filter(r=>r.pattern===pattern);
  return {pattern,rooms:rows.length,roomsWithGeometryAlternatives:rows.filter(r=>r.retile.passingTotal>0).length,
   fullyPhysicalNamedCoreNeighbor:rows.filter(r=>r.retile.reviewOptions.some(o=>o.verifiedPhysicalCoreNeighbor)).length,
   newApprovals:0,perFloorDecisionRequired:true};
 });
 const totals={referenceBuildings:5,referenceFloors:30,reviewedHeldFloors:floors.length,originalRooms:314,
  previousUnapprovedCandidates:296,originalHeldRooms:18,heldRoomsAfterReview:18,newlyApprovedRooms:0,
  retileAlternativesFound:rooms.reduce((n,r)=>n+r.retile.passingTotal,0),
  roomsWithRetileAlternatives:rooms.filter(r=>r.retile.passingTotal>0).length,
  physicalCoreVerifiedLocalRetiles:rooms.filter(r=>r.retile.reviewOptions.some(o=>o.verifiedPhysicalCoreNeighbor)).length,
  physicalCoreCheckedOriginalLocalDoors:rooms.flatMap(r=>r.existingApertureCoreAudits).filter(a=>a.considered&&a.corePathVerified).length,
  floorNonoverlapReviews:floors.reduce((n,f)=>n+f.arbitration.nonOverlappingReviewBundles.length,0),
  prior296ClaimsModified:0,productionEdits:0,constructionCommands:0,worldContacts:0};
 must(rooms.length===18&&floors.length===10&&patterns.length===4&&replayed.length===2,'EXPECTED_SCOPE');
 const report={schema:'minecraftaibuilder-b92-joint-room-floor-corridor-retiler-v1',
  kind:'CONSTRAINED_OFFLINE_REZONE_REVIEW_NOT_BUILDING_BLUEPRINT',provenance:{b91:prev.reportSha256,b90:old.reportSha256,
    officialBlocksSha256:prev.provenance.officialBlocksSha256},replayed,totals,rooms,floors,patterns,
  limitations:['ALL_ROOM_PORTFOLIO_CHANGE_OPTIONS_ARE_UNAPPROVED','PHYSICAL_NAMED_VERTICAL_CORE_NEIGHBOR_NOT_EGRESS_CERTIFICATION',
   'OLD_ROOM_AND_OPENING_CLOSURE_NOT_VALIDATED','NO_BEDROCK_DOOR_OR_HINGE_VERIFICATION','NO_CONSTRUCTION_AUTHORIZATION',
   'PREVIOUS_296_LOCAL_CANDIDATES_ARE_NOT_APPROVED_OCCUPANCY'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:prev.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 must(validateB92(report),'SAFETY_VALIDATOR');return {...report,reportSha256:hash(report)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=await compileB92();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B92_FLOOR_RETILE_REPORT.json'),JSON.stringify(out,null,2)+'\n');
 console.log('B92 TOTALS',JSON.stringify(out.totals));console.log('B92 PATTERNS',JSON.stringify(out.patterns));
}
