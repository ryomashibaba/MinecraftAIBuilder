/** B78 — deterministic whole-section arbitration of room-side wall cells.
 * Input: B77 pinned local final-voxel collision evidence, B65/66 room intents.
 * Output: NON-EXECUTABLE local candidates. No world coordinate / block operation output.
 * Conservative: collision-free sites != approved Minecraft placement.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const home=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(home,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.resolve(root,p),'utf8'));
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=m=>{throw new Error('B78_'+m)};
const xy=p=>`${p.x},${p.z}`;
const parse=s=>{const [x,z]=s.split(',').map(Number);return {x,z}};
const adjacent=(p)=>[{x:p.x-1,z:p.z},{x:p.x+1,z:p.z},{x:p.x,z:p.z-1},{x:p.x,z:p.z+1}];
const isRect=(p,r)=>p.x>=r.x&&p.z>=r.z&&p.x<r.x+r.width&&p.z<r.z+r.depth;
function verify(report,expected){if(report?.schema!==expected||report.readiness!=='NOT_PREPARED'||report.constructionApproved!==false||report.executionAllowed!==false||report.worldContacts!==0||report.gates?.length!==9||report.gates.some(x=>x.status!=='BLOCKED')||report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||report.BuildPlan.commandCount!==0||report.BuildPlan.worldCoordinates!==null)fail('SAFETY');const {reportSha256,...body}=report;if(digest(body)!==reportSha256)fail('TAMPER');}
const schemas={
 b65:'minecraftaibuilder-b65-interior-assembly-intents-v1',
 b66:'minecraftaibuilder-b66-local-3d-nominal-assembly-v1',
 b77:'minecraftaibuilder-b77-production-local-voxel-collision-review-v1'
};
export function shortestPath(room,start,goal,forbidden){
 if(!isRect(start,room)||forbidden.has(xy(start)))return null;
 const todo=[start],prev=new Map([[xy(start),null]]);let end=null;
 for(let i=0;i<todo.length;i++){
  const p=todo[i],k=xy(p);
  if(goal.has(k)){end=k;break;}
  for(const next of adjacent(p)){
   const n=xy(next);if(isRect(next,room)&&!forbidden.has(n)&&!prev.has(n)){prev.set(n,k);todo.push(next);}
  }
 }
 if(end===null)return null;
 const path=[];for(let k=end;k!==null;k=prev.get(k))path.push(k);
 return path.reverse();
}
export function chooseCoreAndPaths(room,doorPoints,knownSolid){
 // Do not infer that an unknown central cell is free of actual production solids.
 // This is a geometry-only reserved 2x2 island with known-solid-site exclusions.
 const cells=[];
 for(let z=room.z;z<room.z+room.depth-1;z++)for(let x=room.x;x<room.x+room.width-1;x++){
  const a=[{x,z},{x:x+1,z},{x,z:z+1},{x:x+1,z:z+1}].map(xy);
  if(!a.some(p=>knownSolid.has(p)))cells.push({x,z,core:a});
 }
 cells.sort((a,b)=>{
  const ax=Math.abs(a.x+0.5-(room.x+(room.width-1)/2))+Math.abs(a.z+0.5-(room.z+(room.depth-1)/2));
  const bx=Math.abs(b.x+0.5-(room.x+(room.width-1)/2))+Math.abs(b.z+0.5-(room.z+(room.depth-1)/2));
  return ax-bx||a.z-b.z||a.x-b.x;
 });
 for(const c of cells){const goal=new Set(c.core),paths=[];let good=true;
  for(const p of doorPoints){const route=shortestPath(room,p,goal,knownSolid);if(!route){good=false;break;}paths.push(route);}
  if(good){const reserved=new Set(c.core);for(const p of paths)for(const s of p)reserved.add(s);
   return {core:c.core,paths,reserved:[...reserved].sort(),nominalOnly:true};}
 }
 return null;
}
/** Global arbitration for a single original section: no site shared across rooms, no walls
 * inside named circulation reservations and no approved door room-side cell overwritten. */
export function arbitrateSection(section,sourceSection,productionWalls,productionDoors){
 if(section.id!==sourceSection.id||productionWalls.length!==sourceSection.nominalWalls.length||productionDoors.length!==sourceSection.openingPorts.length)fail('SECTION_SCOPE');
 const rooms=new Map(section.conceptRooms.map(r=>[r.id,r]));
 if(rooms.size!==section.conceptRooms.length||section.conceptRooms.some(r=>r.width<2||r.depth<2))fail('ROOMS');
 const wallsById=new Map(sourceSection.nominalWalls.map(w=>[w.id,w]));
 const productionWallById=new Map(productionWalls.map(w=>[w.wallId,w]));
 const pDoors=new Map(productionDoors.map(d=>[d.portId,d]));
 if(wallsById.size!==productionWallById.size||pDoors.size!==productionDoors.length)fail('WALL_IDS');
 const reservedCorridors=new Set(section.conceptReservations.corridors.map(xy));
 const reservedVertical=new Set([...section.conceptReservations.stairs,...section.conceptReservations.elevators].map(xy));
 const mask=section.floorMaskRows;
 const floor=p=>p.z>=0&&p.z<mask.length&&p.x>=0&&p.x<mask[0].length&&mask[p.z][p.x]==='1';
  const knownSolidByRoom=new Map([...rooms.keys()].map(id=>[id,new Set()]));
 const candidateCellOwners=new Map();
 for(const w of productionWalls){
  const intent=wallsById.get(w.wallId);if(!intent||w.sectionId!==section.id||intent.insideCell.x!==w.localInsideCell.x||intent.insideCell.z!==w.localInsideCell.z||Boolean(intent.openingPortId)!==w.isDoor||intent.adjacentCell.x!==w.localAdjacentCell.x||intent.adjacentCell.z!==w.localAdjacentCell.z)fail('WALL_LINK');
  const r=rooms.get(intent.roomId);if(!r||!isRect(w.localInsideCell,r))fail('ROOM_WALL_GEOMETRY');
  if(!w.inside.productionClear)knownSolidByRoom.get(intent.roomId).add(xy(w.localInsideCell));
  const key=xy(w.localInsideCell);if(!candidateCellOwners.has(key))candidateCellOwners.set(key,new Set());candidateCellOwners.get(key).add(intent.roomId);
 }
 const doorByRoom=new Map([...rooms.keys()].map(id=>[id,[]]));
 for(const intent of sourceSection.openingPorts){
  const d=pDoors.get(intent.id);if(!d||intent.wallBoundaryId!==d.wallBoundaryId||xy(intent.roomCell)!==xy(d.localRoomSide)||xy(intent.hallCell)!==xy(d.localHallSide))fail('DOOR_LINK');
  if(!rooms.has(intent.roomId)||!isRect(d.localRoomSide,rooms.get(intent.roomId)))fail('DOOR_ROOM');
  doorByRoom.get(intent.roomId).push(d);
 }
 const perRoom=[],roomReserves=new Map();
 for(const [roomId,room] of rooms){
  const ds=doorByRoom.get(roomId);
  const known=knownSolidByRoom.get(roomId);
  const validDoors=ds.filter(d=>d.roomSide.productionFinalSolidContacts===0&&floor(d.localRoomSide)&&!reservedCorridors.has(xy(d.localRoomSide))&&!reservedVertical.has(xy(d.localRoomSide)));
  const allDoorsLocallyClear=validDoors.length===ds.length&&ds.length>0;
  const forbidden=new Set(known);for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++){const p={x,z},k=xy(p);if(!floor(p)||reservedCorridors.has(k)||reservedVertical.has(k))forbidden.add(k);}
  const core=allDoorsLocallyClear?chooseCoreAndPaths(room,validDoors.map(d=>d.localRoomSide),forbidden):null;
  const remainingCandidateCore=core?core.core.length:0;
  const reservation=core?new Set(core.reserved):new Set();
  roomReserves.set(roomId,reservation);
  perRoom.push({roomId,nominalSize:{width:room.width,depth:room.depth},doorCount:ds.length,
   locallyClearDoors:validDoors.length,nominalRouteAndCorePossible:!!core,
   reservedMinimumRoomCore:core?.core??[],reservedDoorToCorePaths:core?.paths??[],
   reservedCoreCells:remainingCandidateCore,
   qualification:'CONCEPT_GEOMETRY_ONLY_REAL_CLEARANCES_AND_PRODUCTION_INTERIOR_UNKNOWN'});
 }
 const perRoomIndex=new Map(perRoom.map(x=>[x.roomId,x]));
 const claimed=new Map(),wallDecisions=[];
 const ordered=productionWalls.slice().sort((a,b)=>a.wallId.localeCompare(b.wallId,'en',{numeric:true}));
 const doorSites=new Set(productionDoors.map(d=>xy(d.localRoomSide)));
 for(const w of ordered){const intent=wallsById.get(w.wallId),owner=intent.roomId,site=xy(w.localInsideCell),r=perRoomIndex.get(owner);
  let status='HOLD_UNRESOLVED';
  if(w.isDoor)status='DOOR_OPENING_RESERVED_NO_WALL';
  else if(w.neighborClass==='OUTSIDE_REFERENCE_FLOOR')status='FACADE_DELEGATION_UNAPPROVED';
  else if(!r.nominalRouteAndCorePossible)status='HOLD_NO_CONNECTED_ROOM_CORE';
  else if(!w.inside.productionClear)status='HOLD_PRODUCTION_SOLID';
  else if(!floor(w.localInsideCell)||reservedCorridors.has(site)||reservedVertical.has(site))status='HOLD_RESERVED_OR_OUTSIDE_FLOOR';
  else if(doorSites.has(site))status='HOLD_DOOR_LOCAL_CLEARANCE';
  else if(roomReserves.get(owner).has(site))status='HOLD_NOMINAL_ROOM_CORE_OR_PATH';
  else if(candidateCellOwners.get(site).size>1)status='HOLD_MULTIPLE_ROOM_OWNERS';
  else if(claimed.has(site)&&claimed.get(site).owner!==owner)status='HOLD_CROSS_ROOM_SITE';
  else {status=claimed.has(site)?'MERGED_CORNER_CANDIDATE':'STAGED_ROOM_SIDE_CANDIDATE';
   const entry=claimed.get(site)??{site,localCell:w.localInsideCell,sectionId:section.id,owner,wallIds:[],candidateMaterialRole:'INTERIOR_PARTITION_REVIEW_ONLY',emitAllowed:false};
   entry.wallIds.push(w.wallId);claimed.set(site,entry);
  }
  wallDecisions.push({wallId:w.wallId,roomId:owner,sectionId:section.id,insideCell:w.localInsideCell,neighborClass:w.neighborClass,
   productionClear:w.inside.productionClear,decision:status,emitAllowed:false});
 }
 const doorDecisions=productionDoors.map(d=>{
  const intent=sourceSection.openingPorts.find(p=>p.id===d.portId),r=perRoomIndex.get(intent.roomId),site=xy(d.localRoomSide);
  const status=!r.nominalRouteAndCorePossible?'HOLD_NO_CONNECTED_ROOM_CORE':
    d.roomSide.productionFinalSolidContacts>0?'HOLD_PRODUCTION_SOLID':
    claimed.has(site)?'HOLD_WALL_COLLISION':
    'PASSAGE_SITE_RESERVED_HINGE_AND_GRID_UNVERIFIED';
  const facing={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]}[d.nominalNormal];
  if(!facing)fail('INVALID_DOOR_NORMAL');
  const [dx,dz]=facing;
  const alternatives=[{side:'left',position:{x:d.localRoomSide.x+dz,z:d.localRoomSide.z-dx}},
    {side:'right',position:{x:d.localRoomSide.x-dz,z:d.localRoomSide.z+dx}}].map(a=>({
     hingeSide:a.side,localSwingAdjacentCell:a.position,roomNominalGeometryClear:isRect(a.position,rooms.get(intent.roomId))&&
       !claimed.has(xy(a.position))&&!knownSolidByRoom.get(intent.roomId).has(xy(a.position)),
     note:'NOT_A_VERIFIED_BEDROCK_HINGE_OR_SWING_SIMULATION'}));
  return {portId:d.portId,roomId:intent.roomId,sectionId:section.id,nominalNormal:d.nominalNormal,
   roomCell:d.localRoomSide,hallCell:d.localHallSide,siteStatus:status,hingeAlternatives:alternatives,
   hinge:'UNDECIDED',doorState:'NOT_FINAL',swingAndHallClearance:'NOT_VERIFIED',emitAllowed:false};
 }).sort((a,b)=>a.portId.localeCompare(b.portId));
 // Verify that every candidate room leaves protected approach sites and 2x2 core free;
 // no candidate uses a corridor, stair, elevator, or already occupied production wall site.
 for(const entry of claimed.values()){
  if(roomReserves.get(entry.owner).has(entry.site)||reservedCorridors.has(entry.site)||reservedVertical.has(entry.site)||candidateCellOwners.get(entry.site).size!==1)fail('PROTECTED_SITE_VIOLATION');
 }
 const count=s=>wallDecisions.filter(w=>w.decision===s).length;
 return {id:section.id,level:sourceSection.level,rooms:perRoom,wallDecisions,doorDecisions,
  stagedCells:[...claimed.values()].sort((a,b)=>a.site.localeCompare(b.site,'en',{numeric:true})),
  baselineReservations:{corridorCells:reservedCorridors.size,verticalCells:reservedVertical.size,
   offMaskCorridorCells:[...reservedCorridors].filter(k=>!floor(parse(k))).length},
  summary:{nominalWalls:wallDecisions.length,nominalDoors:doorDecisions.length,
   roomsWithNominalConnectedCore:perRoom.filter(x=>x.nominalRouteAndCorePossible).length,
   roomsHeld:perRoom.filter(x=>!x.nominalRouteAndCorePossible).length,
   stagedUniquePartitionCells:claimed.size,
   stagedWallBoundaryReferences:count('STAGED_ROOM_SIDE_CANDIDATE')+count('MERGED_CORNER_CANDIDATE'),
   delegatedFacadeEdges:count('FACADE_DELEGATION_UNAPPROVED'),
   heldProductionSolidEdges:count('HOLD_PRODUCTION_SOLID'),
   heldRoomCoreOrPathEdges:count('HOLD_NOMINAL_ROOM_CORE_OR_PATH'),
   heldDoorClearanceEdges:count('HOLD_DOOR_LOCAL_CLEARANCE'),
   geometricallyReservedPassageSites:doorDecisions.filter(d=>d.siteStatus==='PASSAGE_SITE_RESERVED_HINGE_AND_GRID_UNVERIFIED').length,
   doorSitesHeld:doorDecisions.filter(d=>d.siteStatus!=='PASSAGE_SITE_RESERVED_HINGE_AND_GRID_UNVERIFIED').length}};
}
export function compileB78({b65,b66,b77}){
 verify(b65,schemas.b65);verify(b66,schemas.b66);verify(b77,schemas.b77);
 if(b77.totals.nominalWalls!==5704||b77.totals.nominalDoors!==314||b77.totals.stairLinks!==25)fail('BASELINE_SCOPE');
 const b65s=new Map(b65.sections.map(s=>[s.id,s])),b66s=new Map(b66.sections.map(s=>[s.id,s]));
 if(b65s.size!==30||b66s.size!==30||b77.buildings.length!==5)fail('SECTION_COUNT');
 const sections=[];
 for(const b of b77.buildings){const p=new Set();for(const w of b.walls)p.add(w.sectionId);
  for(const id of [...p].sort()){
   const source=b65s.get(id),shape=b66s.get(id);if(!source||!shape)fail('SECTION_MISSING');
   sections.push(arbitrateSection(shape,source,b.walls.filter(w=>w.sectionId===id),b.doors.filter(d=>d.sectionId===id)));
  }
 }
 const totals={buildings:5,sections:sections.length,rooms:sections.reduce((n,s)=>n+s.rooms.length,0),
  nominalWalls:sections.reduce((n,s)=>n+s.summary.nominalWalls,0),nominalDoors:sections.reduce((n,s)=>n+s.summary.nominalDoors,0),
  nominalStairLinks:b77.totals.stairLinks,roomCoresWithNominalRoutes:sections.reduce((n,s)=>n+s.summary.roomsWithNominalConnectedCore,0),
  roomsHeld:sections.reduce((n,s)=>n+s.summary.roomsHeld,0),
  stagedLocalPartitionCells:sections.reduce((n,s)=>n+s.summary.stagedUniquePartitionCells,0),
  stagedWallBoundaryReferences:sections.reduce((n,s)=>n+s.summary.stagedWallBoundaryReferences,0),
  facadeDelegatedEdges:sections.reduce((n,s)=>n+s.summary.delegatedFacadeEdges,0),
  wallEdgesHeldByProduction:sections.reduce((n,s)=>n+s.summary.heldProductionSolidEdges,0),
  wallEdgesHeldByRoomCoreOrRoute:sections.reduce((n,s)=>n+s.summary.heldRoomCoreOrPathEdges,0),
  wallEdgesHeldByDoorClearance:sections.reduce((n,s)=>n+s.summary.heldDoorClearanceEdges,0),
  nominalDoorPassageSitesStaged:sections.reduce((n,s)=>n+s.summary.geometricallyReservedPassageSites,0),
  nominalDoorSitesHeld:sections.reduce((n,s)=>n+s.summary.doorSitesHeld,0),
  outOfMaskCorridorsHeld:sections.reduce((n,s)=>n+s.baselineReservations.offMaskCorridorCells,0),
  physicalWallsEmitted:0,physicalDoorsEmitted:0,physicalStairsEmitted:0,worldCommands:0};
 if(totals.sections!==30||totals.nominalWalls!==5704||totals.nominalDoors!==314||totals.rooms!==314||totals.outOfMaskCorridorsHeld!==18)fail('COUNT_DRIFT');
 const body={schema:'minecraftaibuilder-b78-global-grid-arbitration-v1',kind:'NON_EXECUTABLE_LOCAL_GRID_CANDIDATES',
  provenance:{b65ReportSha256:b65.reportSha256,b66ReportSha256:b66.reportSha256,b77ReportSha256:b77.reportSha256},
  totals,sections,limits:[
   'CANDIDATE_PARTITION_SITES_ARE_NOT_EXECUTABLE_BLOCK_OPERATIONS',
   'PRESERVED_MINIMUM_2X2_ROOM_CORE_IS_A_NOMINAL_GEOMETRIC_TEST_ONLY_NOT_CERTIFIED_EGRESS',
   'PRODUCTION_OCCUPANCY_KNOWN_FOR_WALL_SITES_ONLY_NOT_ALL_CIRCULATION_AND_ROOM_CELLS',
   'FACADE_DELEGATION_DOES_NOT_AUTHORIZE_GLASS_WINDOW_OR_EXTERIOR_MODIFICATION',
   'DOOR_ROOM_SIDE_RESERVATION_DOES_NOT_ESTABLISH_MINECRAFT_DOOR_HINGE_OR_SWING',
   'CORRIDOR_WIDTH_UNCHANGED_BUT_REAL_EGRESS_NOT_CERTIFIED',
   'STAIR_240_UPPER_SLAB_REVIEW_CELLS_UNCUT_AND_25_LINKS_HELD',
   'HOTEL_SLAB_PROGRAM_EXCEPTION_UNAPPROVED',
   'B70_18_OFF_MASK_CORRIDOR_CELLS_HELD',
   'WORLD_ANCHOR_UNCALIBRATED_NO_COMMANDS_NO_MINECRAFT_CONNECTION'],
  approval:'PROPOSED_ONLY',readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:b77.gates.map(x=>({...x,status:'BLOCKED'})),worldContacts:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:digest(body)};
}
export function runB78(){return compileB78({b65:read('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json'),b66:read('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json'),b77:read('parallel/b77/main/B77_VOXEL_CONFLICT_REPORT.json')});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=runB78();if(process.argv.includes('--write'))fs.writeFileSync(path.join(home,'B78_GLOBAL_GRID_REPORT.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify({totals:r.totals,safety:r.readiness},null,2));
}
