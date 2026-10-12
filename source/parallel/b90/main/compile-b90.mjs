/** B90 program-level zoning arbitration, READONLY, no production edit or Minecraft transport. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
import {protectedFloor} from '../../b86/main/compile-b86.mjs';
import {corridorNetwork} from '../../b88/main/compile-b88.mjs';
import {programDoorFrontiers,programAlternatives,patternConsensus,validateB90Plan} from './b90-program-zoning.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
function assert(b,msg){if(!b)throw Error('B90_'+msg)}
function addClaims(a,v){
 for(const p of v.local3DVoxels??[])a[p.role==='DOOR_VOID'?'reserved':'solids'].add(`${p.x},${p.y},${p.z}`);
 for(const p of v.localSwingAirReservation??[])a.reserved.add(`${p.x},${p.y},${p.z}`);
 for(const p of [...(v.protectedRoomCore??[]),...(v.protectedRoute??[]),...(v.proposedCorridorAirCells??[])])a.protectedSites.add(typeof p==='string'?p:`${p.x},${p.z}`);
}
export async function compileB90(){
 const old=read('parallel/b89/main/B89_FLOOR_ZONING_REPORT.json');safe(old,'minecraftaibuilder-b89-constraint-room-corridor-zoning-v1');
 const b88=read('parallel/b88/main/B88_CORRIDOR_NETWORK_REPORT.json');safe(b88,'minecraftaibuilder-b88-floor-corridor-network-pinned-air-v1');
 assert(old.provenance.b88===b88.reportSha256,'B88_PROVENANCE');
 const pinned={};for(const [name,filename] of Object.entries({b66:'B66_LOCAL_3D_ASSEMBLY.json',b65:'B65_INTERIOR_ASSEMBLY_INTENTS.json',b80:'B80_LOCAL_3D_FRAME_REPORT.json',b81:'B81_TYPED_LOCAL_ASSEMBLY.json',b82:'B82_ROOM_CORRIDOR_REDESIGN.json',b83:'B83_HELD_ROOM_TEMPLATE_REPORT.json',b84:'B84_LAYOUT_OPTIONS_REPORT.json'})){
  pinned[name]=new Map(read(`parallel/${name}/main/${filename}`).sections.map(s=>[s.id,s]));
 }
 const b87=read('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');safe(b87,'minecraftaibuilder-b87-structural-free-room-redraft-v1');
 const b72=read('parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json');
 const b76=read('parallel/b76/main/B76_STAGING_REPORT.json');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b90-program-zone-'));
 const rooms=[],floors=[],replayed=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const catalog=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  assert(hash(catalog)===old.provenance.officialBlocksSha256,'CATALOG_DRIFT');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,read('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs.filter(j=>old.replayed.some(p=>p.building===j.id))){
   const ref=b76.buildings.find(b=>b.id===job.id),prev=old.replayed.find(p=>p.building===job.id);
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   assert(hash(plan.operations)===prev.operationsSha256,'PRODUCTION_DRIFT');
   replayed.push({building:job.id,operationsSha256:prev.operationsSha256,readOnly:true});
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   for(const section of old.sections.filter(s=>s.id.startsWith(`${job.id}/`))){
    const shape=pinned.b66.get(section.id),source=pinned.b65.get(section.id),prev87=b87.sections.find(s=>s.id===section.id);
    assert(shape&&source&&prev87,'MISSING_SECTION');
    const fixed=protectedFloor(...['b81','b80','b82','b83','b84'].map(n=>pinned[n].get(section.id)));
    for(const rr of prev87.rooms.filter(r=>r.selected))addClaims(fixed,rr.selected);
    const network=corridorNetwork(shape),items=[];
    for(const oldHeld of section.rooms){
     assert(oldHeld.selected===null,'B89_UNEXPECTED_NEW_SELECTION');
     const room=shape.conceptRooms.find(r=>r.id===oldHeld.roomId),port=source.openingPorts.find(p=>p.id===oldHeld.portId);
     assert(room&&port&&port.roomId===room.id,'BAD_ROOM_PORT');
     const frontiers=programDoorFrontiers({room,port,shape,idx,fixed,network,otherRooms:shape.conceptRooms.filter(r=>r.id!==room.id)});
     const programOptions=programAlternatives({room,frontiers,sectionId:section.id});
     const row={sectionId:section.id,roomId:room.id,portId:port.id,pattern:oldHeld.pattern,
      originalRoom:{x:room.x,z:room.z,width:room.width,depth:room.depth},roomArea:room.width*room.depth,
      doorFrontiers:frontiers,programOptions,
      independentlyAccessible:false,originalPrivateRoomRemainsHeld:true,
      productionMaterialEditsAuthorized:0,globalEgress:'UNVERIFIED',approval:'REVIEW_ONLY',executionAllowed:false,operations:[],worldCoordinates:null};
     rooms.push(row);items.push(row);
    }
    floors.push({sectionId:section.id,roomCount:shape.conceptRooms.length,heldRoomCount:items.length,
     heldNominalArea:items.reduce((a,r)=>a+r.roomArea,0),nominalCoreAdjacentComponents:network.coreAdjacentComponents,
     optionalCommonProgramAreaNotCertified:0,roomProgramChanged:false,productionChanged:false,
     previousCandidatesUntouched:true,operations:[]});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const patterns=patternConsensus(rooms);
 const totals={referenceBuildings:5,referenceFloors:30,reviewedHeldFloors:floors.length,originalRooms:314,
  previousUnapprovedCandidates:296,previousHeldRooms:18,unresolvedIndependentRooms:rooms.length,newlyApprovedRooms:0,
  strictlyRecoveredRooms:0,reviewOnlyFrontiers:rooms.reduce((a,r)=>a+r.doorFrontiers.scannedValidFrontiers,0),
  heldNominalArea:rooms.reduce((a,r)=>a+r.roomArea,0),
  frontierRoomsWithoutStructuralOrGlass:rooms.filter(r=>r.doorFrontiers.noPrimaryOrGlazingChange).length,
  noProductionContactButStillUnapprovedRooms:rooms.filter(r=>r.doorFrontiers.partialAirSlotWithoutCompleteDoorGeometry>0).length,
  frameAndNominalHallLocallyClearRooms:rooms.filter(r=>r.doorFrontiers.strictLocalGeometryOnly).length,
  floorsWithPinnedBasaltAtDoor:rooms.filter(r=>r.doorFrontiers.frontiers.some(f=>f.openingProductionContacts.some(v=>v.role==='floor'))).length,
  patterns:patterns.length,constructionCommands:0,worldContacts:0,productionEdits:0,priorProposalEdits:0};
 assert(replayed.length===2&&rooms.length===18&&floors.length===10&&patterns.length===4,'COUNTS');
 const report={schema:'minecraftaibuilder-b90-program-zoning-intervention-frontier-v1',
  kind:'OFFLINE_FULL_FLOOR_PROGRAM_OPTIONS_NOT_CONSTRUCTION',provenance:{b89:old.reportSha256,b88:b88.reportSha256,
   officialBlocksSha256:old.provenance.officialBlocksSha256},totals,replayed,rooms,floors,patterns,
  interpretation:['NO_HELD_ROOM_BECOMES_AN_APPROVED_INDEPENDENT_ROOM',
   'PROGRAM_BUFFER_ALTERNATIVE_REDUCES_ROOM_COUNT_AND_IS_UNAPPROVED',
   'DOOR_FRONTIER_IS_NOT_CONSTRUCTION_GEOMETRY_OR_CERTIFIED_EXIT',
   'ALL_BEDROCK_DOOR_HINGES_AND_SWINGS_UNVERIFIED',
   'PINNED_PRODUCTION_AND_PREVIOUS_296_PROPOSALS_UNMODIFIED',
   'NOMINAL_CORRIDOR_CORE_ADJACENCY_NOT_A_PHYSICAL_EXIT',
   'BUILDING_FACADE_WINDOW_AND_STRUCTURAL_CHANGES_REQUIRE_APPROVAL'],
  readiness:'NOT_PREPARED',approval:'REVIEW_ONLY',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:old.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 assert(validateB90Plan(report),'SAFETY');return {...report,reportSha256:hash(report)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=await compileB90();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B90_PROGRAM_ZONING_REPORT.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify(r.totals,null,2));console.log('PATTERNS',JSON.stringify(r.patterns));
}
