/** B89 floor-wide room-grid and corridor topology arbitration. Readonly; no world commands. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {hash,safe,key} from '../../b79/main/compile-b79.mjs';
import {protectedFloor} from '../../b86/main/compile-b86.mjs';
import {corridorNetwork,proposeDoor} from '../../b88/main/compile-b88.mjs';
import {checkWholeFloorCandidate} from '../../b82/main/compile-b82.mjs';
import {optionsForRoom,relocationFeasibility,reconcileNominalCorridors,validateRedesignIntent,productionFootprintContacts,classifyIntervention} from './b89-space-planner.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const fail=s=>{throw Error('B89_'+s)};
const vk=p=>`${p.x},${p.y},${p.z}`;
const empty=()=>({solids:new Set(),reserved:new Set(),protectedSites:new Set()});
function claim(candidate,store){
 for(const p of candidate.local3DVoxels)(p.role==='DOOR_VOID'?store.reserved:store.solids).add(vk(p));
 for(const p of candidate.localSwingAirReservation)store.reserved.add(vk(p));
 for(const p of [...candidate.protectedRoomCore,...candidate.protectedRoute,...candidate.proposedCorridorAirCells])store.protectedSites.add(typeof p==='string'?p:key(p));
}
function merge(a,b){return {solids:new Set([...a.solids,...b.solids]),reserved:new Set([...a.reserved,...b.reserved]),protectedSites:new Set([...a.protectedSites,...b.protectedSites])};}
const Pinned={b65:'B65_INTERIOR_ASSEMBLY_INTENTS.json',b66:'B66_LOCAL_3D_ASSEMBLY.json',b80:'B80_LOCAL_3D_FRAME_REPORT.json',b81:'B81_TYPED_LOCAL_ASSEMBLY.json',b82:'B82_ROOM_CORRIDOR_REDESIGN.json',b83:'B83_HELD_ROOM_TEMPLATE_REPORT.json',b84:'B84_LAYOUT_OPTIONS_REPORT.json'};
const patterns=new Set(['apartment/candidate-01/013','apartment/candidate-01/006','apartment/candidate-01/012','office/candidate-01/004']);
export function createRoomIntent({held,original,room,proposal,feasibility,topology,sourceSection,shape,productionValidated}){
 return {schema:'b89-local-room-redraft-intent-v1',sourceSection,roomId:held.roomId,portId:held.portId,pattern:`${sourceSection.split('/L')[0]}/${original.id.split('-R')[1]}`,
  originalRoom:{x:original.x,z:original.z,width:original.width,depth:original.depth},
  proposedRoom:{x:room.x,z:room.z,width:room.width,depth:room.depth},retainedRoomAreaRatio:feasibility.areaRatio,
  movedRoomCells:Math.abs(room.x-original.x)+Math.abs(room.z-original.z),
  displacedNominalCorridors:topology.removed,proposedDetourCells:topology.detours,
  corridorTopology:{preservesOriginalComponents:topology.ok,originalComponents:topology.initialComponents,finalComponents:topology.finalComponents},
  doorRoomCell:proposal.doorRoomCell,doorHallCell:proposal.doorHallCell,doorNormal:proposal.normal,
  doorJambReuse:proposal.existingWallJambEvidence,doorLintelReuse:proposal.existingLintelEvidence,
  clearance:{twoHighPinnedBlockClear:productionValidated,doorFrameChecked:true},
  newCorridorCells:proposal.proposedNewCorridorCells,protectedRoomCore:proposal.protectedRoomCore,
  protectedRoute:proposal.protectedRoute,local3DVoxels:proposal.local3DVoxels,localSwingAirReservation:proposal.localSwingAirReservation,
  proposedCorridorAirCells:proposal.proposedCorridorAirCells,
  oldPortMoved:proposal.oldPortMoved,bedrockDoorSemantics:'UNVERIFIED',globalEgress:'UNVERIFIED',corridorWidth:'UNVERIFIED',
  productionEditsRequested:0,glassEditsRequested:0,earlierProposalEditsRequested:0,
  approval:'REVIEW_ONLY',executionAllowed:false,operations:[],worldCoordinates:null};
}
export function rankCandidates(a,b){return b.retainedRoomAreaRatio-a.retainedRoomAreaRatio||a.displacedNominalCorridors.length-b.displacedNominalCorridors.length||a.proposedDetourCells.length-b.proposedDetourCells.length||a.newCorridorCells.length-b.newCorridorCells.length||a.movedRoomCells-b.movedRoomCells||a.roomId.localeCompare(b.roomId)||key(a.doorRoomCell).localeCompare(key(b.doorRoomCell));}
export async function compileB89(){
 const b88=read('parallel/b88/main/B88_CORRIDOR_NETWORK_REPORT.json');safe(b88,'minecraftaibuilder-b88-floor-corridor-network-pinned-air-v1');
 const backlog=read('parallel/b88/main/B88_PATTERN_BACKLOG.json');if(backlog.provenance.b88!==b88.reportSha256||backlog.totalHeldRooms!==18||backlog.uniqueHeldPatterns!==4)fail('BACKLOG');
 const b87=read('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');safe(b87,'minecraftaibuilder-b87-structural-free-room-redraft-v1');
 if(b88.provenance.b87!==b87.reportSha256)fail('B88_PROVENANCE');
 const data=Object.fromEntries(Object.entries(Pinned).map(([k,f])=>[k,new Map(read(`parallel/${k}/main/${f}`).sections.map(s=>[s.id,s]))]));
 const jobs=read('parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json').jobs,b76=read('parallel/b76/main/B76_STAGING_REPORT.json');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b89-offline-planner-'));
 const sections=[],replayed=[],ledger=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const blocks=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  if(hash(blocks)!==b88.provenance.officialBlocksSha256)fail('OFFICIAL_CATALOG_DRIFT');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,read('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  const heldSections=b88.sections.filter(s=>s.rooms.length);
  for(const job of jobs.filter(j=>heldSections.some(s=>s.id.startsWith(`${j.id}/`)))){
   const ref=b76.buildings.find(b=>b.id===job.id),prev=b88.productionReplays.find(b=>b.building===job.id);
   if(!ref||!prev)fail('PRODUCTION_JOB');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   const digest=hash(plan.operations);if(digest!==prev.operationsSha256)fail('PINNED_PRODUCTION_DRIFT');
   replayed.push({building:job.id,operationsSha256:digest,readonly:true});
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   for(const prevSection of heldSections.filter(s=>s.id.startsWith(`${job.id}/`))){
    const shape=data.b66.get(prevSection.id),source=data.b65.get(prevSection.id),b87Section=b87.sections.find(s=>s.id===prevSection.id);
    if(!shape||!source||!b87Section)fail('FLOOR_SOURCE');
    const fixed=protectedFloor(...['b81','b80','b82','b83','b84'].map(k=>data[k].get(prevSection.id)));
    for(const r of b87Section.rooms.filter(r=>r.selected))claim(r.selected,fixed);
    const added=empty(),newRooms=[];
    for(const h of [...prevSection.rooms].sort((a,b)=>a.roomId.localeCompare(b.roomId))){
     const original=shape.conceptRooms.find(r=>r.id===h.roomId),port=source.openingPorts.find(p=>p.id===h.portId);
     if(!original||!port||port.roomId!==original.id)fail('ROOM_PORT');
     const pattern=`${job.id}/${original.id.split('-R')[1]}`;if(!patterns.has(pattern))fail('UNKNOWN_PATTERN');
     const others=shape.conceptRooms.filter(r=>r.id!==original.id),merged=merge(fixed,added),variants=[];
     const reject={roomAreaOrMask:0,protectedFootprint:0,productionFootprint:0,corridorTopology:0,doorGeometry:0,wholeFloorCollision:0,validTemplates:0};
     for(const proposedRoom of optionsForRoom(original,shape)){
      const fsibility=relocationFeasibility(original,proposedRoom,shape,merged,others,{idx});
      if(!fsibility.ok){if(fsibility.why==='FROZEN_OTHER_ROOM_CLAIM')reject.protectedFootprint++;else if(fsibility.why==='PRODUCTION_WALKSPACE_OCCUPIED')reject.productionFootprint++;else reject.roomAreaOrMask++;continue;}
      const topo=reconcileNominalCorridors({shape,relocated:proposedRoom,idx,fixed:merged,otherRooms:others,maxDetourCells:12});
      if(!topo.ok){reject.corridorTopology++;continue;}
      const network=corridorNetwork(topo.updated);
      const local=proposeDoor({held:h,room:proposedRoom,port,shape:topo.updated,source,idx,fixed:merged,otherRooms:others,network,maxRoute:18});
      if(!local.candidates.length){reject.doorGeometry++;continue;}
      for(const draft of local.candidates.slice(0,3)){
       const conflicts=checkWholeFloorCandidate({...draft,opening:draft.local3DVoxels.filter(v=>v.role==='DOOR_VOID')},fixed,added);
       if(conflicts.length){reject.wholeFloorCollision++;continue;}
       const intent=createRoomIntent({held:h,original,room:proposedRoom,proposal:draft,feasibility:fsibility,topology:topo,sourceSection:prevSection.id,shape,productionValidated:true});
       if(validateRedesignIntent(intent).length)fail('INVALID_GENERATED_INTENT');
       variants.push(intent);reject.validTemplates++;
      }
     }
     variants.sort(rankCandidates);
     // Secondary report lane: investigate minimal required production intervention,
     // NEVER promote conditional geometry to an adopted room or executable block command.
     const conditional=[];
     if(variants.length===0){for(const proposedRoom of optionsForRoom(original,shape)){
      const feasibility=relocationFeasibility(original,proposedRoom,shape,merged,others);if(!feasibility.ok)continue;
      const impacted=productionFootprintContacts(original,proposedRoom,shape,idx);
      if(!impacted.length||impacted.length>24)continue;
      const topo=reconcileNominalCorridors({shape,relocated:proposedRoom,idx,fixed:merged,otherRooms:others,maxDetourCells:12});if(!topo.ok)continue;
      const local=proposeDoor({held:h,room:proposedRoom,port,shape:topo.updated,source,idx,fixed:merged,otherRooms:others,network:corridorNetwork(topo.updated),maxRoute:18});
      if(!local.candidates.length)continue;
      const statuses=[...new Set(impacted.map(classifyIntervention))].sort();
      conditional.push({originalRoom:{x:original.x,z:original.z,width:original.width,depth:original.depth},
       proposedRoom:{x:proposedRoom.x,z:proposedRoom.z,width:proposedRoom.width,depth:proposedRoom.depth},
       areaRatio:feasibility.areaRatio,contactCount:impacted.length,productionContacts:impacted,
       interventionClasses:statuses,displacedNominalCorridors:topo.removed,detourCells:topo.detours,
       doorRoomCell:local.candidates[0].doorRoomCell,doorHallCell:local.candidates[0].doorHallCell,
       status:'HOLD_CONDITIONAL_PINNED_PRODUCTION_REDESIGN',approved:false,executionAllowed:false,operations:[],worldCoordinates:null});
     }}
     conditional.sort((a,b)=>a.contactCount-b.contactCount||a.interventionClasses.length-b.interventionClasses.length||b.areaRatio-a.areaRatio||a.displacedNominalCorridors.length-b.displacedNominalCorridors.length||a.proposedRoom.x-b.proposedRoom.x||a.proposedRoom.z-b.proposedRoom.z);

     // Reserve the complete provisional floor envelope of each chosen room, not just door slots.
     const selected=variants.find(v=>{
      for(let z=v.proposedRoom.z;z<v.proposedRoom.z+v.proposedRoom.depth;z++)for(let x=v.proposedRoom.x;x<v.proposedRoom.x+v.proposedRoom.width;x++){
       if(added.protectedSites.has(`${x},${z}`))return false;
      }
      return true;
     })??null;
     if(selected){claim(selected,added);for(let z=selected.proposedRoom.z;z<selected.proposedRoom.z+selected.proposedRoom.depth;z++)for(let x=selected.proposedRoom.x;x<selected.proposedRoom.x+selected.proposedRoom.width;x++)added.protectedSites.add(`${x},${z}`);}
     const row={roomId:h.roomId,portId:h.portId,pattern,originalRoom:{x:original.x,z:original.z,width:original.width,depth:original.depth},
      testedDesigns:Object.values(reject).slice(0,6).reduce((a,b)=>a+b,0),totalValidLocalOptions:variants.length,
      conditionalProductionRedesigns:conditional.slice(0,3),totalConditionalVariants:conditional.length,
      rejectionSummary:reject,selected,alternatives:variants.slice(0,3).map(v=>({proposedRoom:v.proposedRoom,retainedRoomAreaRatio:v.retainedRoomAreaRatio,doorRoomCell:v.doorRoomCell,
       displacedCorridors:v.displacedNominalCorridors.length,detours:v.proposedDetourCells.length})),
      status:selected?'UNAPPROVED_FULL_FLOOR_ZONING_REDRAFT':'HOLD_CONSTRAINTS_UNRESOLVED',executionAllowed:false,operations:[]};
     newRooms.push(row);ledger.push({sectionId:prevSection.id,...row,selected:row.selected?{proposedRoom:row.selected.proposedRoom,doorRoomCell:row.selected.doorRoomCell,areaRatio:row.selected.retainedRoomAreaRatio}:null});
    }
    sections.push({id:prevSection.id,level:shape.level,originalFloorMaskRows:shape.floorMaskRows,previousUnapprovedCandidatesUntouched:true,
     originalNominalCorridorComponents:prevSection.nominalCorridorComponents.length,rooms:newRooms,executionAllowed:false,operations:[],worldCoordinates:null});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const held=sections.flatMap(s=>s.rooms),accepted=held.filter(h=>h.selected);
 const conditionalCount=held.filter(h=>!h.selected&&h.totalConditionalVariants>0).length;
 const totals={referenceBuildings:5,replayedHeldBuildings:replayed.length,referenceFloors:30,redesignedHeldFloors:sections.length,
  originalRooms:314,previousUnapprovedLocalCandidates:296,originalHeldRooms:18,
  newlyReviewableFloorZoningOptions:accepted.length,totalUnapprovedLocalCandidates:296+accepted.length,remainingHeldRooms:18-accepted.length,
  conditionalArchitecturalRedesignRoomsNotAdopted:conditionalCount,
  preserved75PercentArea:accepted.filter(h=>h.selected.retainedRoomAreaRatio>=.75).length,
  fullAreaPreserved:accepted.filter(h=>h.selected.retainedRoomAreaRatio>=1).length,
  corridorNominalDetourCells:accepted.reduce((n,r)=>n+r.selected.proposedDetourCells.length,0),
  existingWallEdits:0,pinnedFacadeEdits:0,prior296Edits:0,worldContacts:0,constructionCommands:0};
 if(held.length!==18||accepted.length+totals.remainingHeldRooms!==18||totals.totalUnapprovedLocalCandidates+totals.remainingHeldRooms!==314||replayed.length!==2||sections.length!==10)fail('COUNTS');
 const body={schema:'minecraftaibuilder-b89-constraint-room-corridor-zoning-v1',kind:'READONLY_CONCEPTUAL_FLOOR_WIDE_REDESIGN',
  provenance:{b88:b88.reportSha256,b87:b87.reportSha256,officialBlocksSha256:b88.provenance.officialBlocksSha256},
  totals,replayed,sections,patternLedger:ledger,
  nonClaims:['UNAPPROVED_ZONING_REDRAFT_NOT_CONSTRUCTION','NOMINAL_CORRIDOR_TOPOLOGY_ONLY_NOT_PHYSICAL_EGRESS',
   'ALL_RELOCATED_ROOM_BOUNDS_REQUIRE_ARCHITECTURAL_APPROVAL','BEDROCK_DOOR_STATES_UNVERIFIED',
   'OFFICIAL_BLOCK_STATE_CALIBRATION_NOT_CERTIFIED','ORIGINAL_296_PROPOSALS_ARE_UNAPPROVED',
   'STAIR_HEADROOM_AND_FLOOR_CUTS_UNVERIFIED','NONHORIZONTAL_WORLD_GEOMETRY_UNVERIFIED'],
  readiness:'NOT_PREPARED',approval:'REVIEW_ONLY',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:b88.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=await compileB89();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B89_FLOOR_ZONING_REPORT.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify(r.totals,null,2));
}
