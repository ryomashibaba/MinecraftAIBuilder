/** B80 - fixed production planner / one-cell-thick local partition and door FRAME MOCK.
 * Non-executable; checks all voxels against last-write production result.
 * Does not resolve Bedrock block states, world anchor, stair slab cut, facade materials,
 * or permission to issue any world operation.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex,inspectSite} from '../../b77/main/compile-b77.mjs';
import {inspectProposedPort,maskHasFloor,safe,hash,key} from '../../b79/main/compile-b79.mjs';
import {validateOfficialEvidence} from '../../b75/main/compile-b75.mjs';
import {verifyCatalogShapes} from '../../b76/main/compile-b76.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const fail=s=>{throw Error('B80_'+s)};
const coords=(p,y)=>`${p.x},${y},${p.z}`;
const at=(p,v)=>({x:p.x+v.x,z:p.z+v.z});
const adj=(p,v)=>({x:p.x+v.x,z:p.z+v.z});
const add=(p,v)=>({x:p.x+v.x,z:p.z+v.z});
const inRoom=(p,r)=>p.x>=r.x&&p.z>=r.z&&p.x<r.x+r.width&&p.z<r.z+r.depth;
const dirs=[{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
const schemas={b65:'minecraftaibuilder-b65-interior-assembly-intents-v1',b66:'minecraftaibuilder-b66-local-3d-nominal-assembly-v1',b76:'minecraftaibuilder-b76-production-footprint-and-interior-staging-v1',b78:'minecraftaibuilder-b78-global-grid-arbitration-v1',b79:'minecraftaibuilder-b79-readonly-door-jamb-and-corridor-resolution-v1'};
export function finalSolid(idx,p,y){return idx.final.get(coords(p,y))?.occupied===true;}
/** Run BFS on actual two-high open corridor reservation cells (no assumption of true egress). */
export function corridorComponents(shape,idx){
 const named=new Set(shape.conceptReservations.corridors.map(key));
 const clear=new Set([...named].filter(k=>{const [x,z]=k.split(',').map(Number),p={x,z};return maskHasFloor(shape.floorMaskRows,p)&&inspectSite(idx,p,shape.level,2).contacts===0;}));
 const components=[],which=new Map();
 for(const site of [...clear].sort()){
  if(which.has(site))continue;
  const id=components.length,todo=[site];which.set(site,id);
  for(let i=0;i<todo.length;i++){
   const [x,z]=todo[i].split(',').map(Number);for(const v of dirs){const k=key({x:x+v.x,z:z+v.z});if(clear.has(k)&&!which.has(k)){which.set(k,id);todo.push(k);}}
  }
  components.push({id,size:todo.length});
 }
 const max=components.length?Math.max(...components.map(x=>x.size)):0;
 const mainIds=new Set(components.filter(c=>c.size===max).map(c=>c.id));
 return {named,clear,which,components,mainIds,maxComponentSize:max};
}
/** Tests a physically shaped 1-block-thick frame proposal, not a Minecraft placement. */
export function assessFrame({proposal,port,room,shape,source,idx,corridors}){
 const blocked=[...proposal.disqualifications];const reasons=new Set(blocked);
 const normal={x:proposal.normal.dx,z:proposal.normal.dz};
 const tangents=[{x:normal.z,z:-normal.x},{x:-normal.z,z:normal.x}];
 const cell=proposal.roomCell, hall=proposal.hallCell;
 const base=(shape.level-1)*5;
 const prohibited=new Set([...shape.conceptReservations.corridors,...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const sourcePortWalls=new Set(source.openingPorts.filter(p=>p.id!==port.id).map(p=>key(p.roomCell)));
 const roomInternal=add(cell,{x:-normal.x,z:-normal.z});
 const frame=[{role:'JAMB_LEFT',site:add(cell,tangents[0])},{role:'JAMB_RIGHT',site:add(cell,tangents[1])},{role:'LINTEL',site:cell}].map(c=>({...c,yLevels:c.role==='LINTEL'?[base+3]:[base+1,base+2,base+3]}));
 const wallCandidates=new Set(source.nominalWalls.filter(w=>w.roomId===room.id&&!w.openingPortId&&w.neighborClass==='CONCEPT_CORRIDOR'&&w.adjacentCell.x-w.insideCell.x===normal.x&&w.adjacentCell.z-w.insideCell.z===normal.z).map(w=>key(w.insideCell)));
 for(const f of frame){
  if(f.role!=='LINTEL'&&(!wallCandidates.has(key(f.site))||!inRoom(f.site,room)))reasons.add('JAMB_NOT_ALIGNED_WITH_NOMINAL_BOUNDARY');
  if(prohibited.has(key(f.site))||sourcePortWalls.has(key(f.site)))reasons.add('FRAME_OVER_PROTECTED_OR_OTHER_DOOR');
  if(!maskHasFloor(shape.floorMaskRows,f.site))reasons.add('FRAME_OUTSIDE_FLOOR');
  if(f.yLevels.some(y=>finalSolid(idx,f.site,y)))reasons.add('FRAME_COLLIDES_WITH_PRODUCTION');
  if(f.yLevels.some(y=>y>base+4))reasons.add('FRAME_TOO_HIGH');
 }
 if([base+1,base+2].some(y=>finalSolid(idx,cell,y)||finalSolid(idx,hall,y)))reasons.add('OPENING_OVER_PRODUCTION');
 const opening=[base+1,base+2].map(y=>({x:cell.x,y,z:cell.z,role:'DOOR_VOID'}));
 const hallAir=[base+1,base+2].map(y=>({x:hall.x,y,z:hall.z,role:'CORRIDOR_AIR_RESERVED'}));
 const hingeOptions=[];
 // Door swings only into room in this mock; frame side cells themselves are solid.
 for(const [i,t] of tangents.entries()){
  const side=add(roomInternal,t);const swing=[roomInternal,side];
  const fits=swing.every(p=>inRoom(p,room)&&maskHasFloor(shape.floorMaskRows,p)&&!prohibited.has(key(p))&&
   !sourcePortWalls.has(key(p))&&inspectSite(idx,p,shape.level,2).contacts===0&&
   !frame.some(f=>f.role!=='LINTEL'&&key(f.site)===key(p)));
  hingeOptions.push({side:i===0?'left':'right',localSwingClearance:swing,geometryClear:fits,bedrockHingeState:'UNVERIFIED'});
 }
 const selectedSwing=hingeOptions.find(x=>x.geometryClear)??null;
 if(!selectedSwing)reasons.add('NO_ROOM_SIDE_SWING_CLEARANCE');
 const comp=corridors.which.get(key(hall));
 if(comp===undefined||corridors.components[comp].size<2)reasons.add('HALL_CLEAR_COMPONENT_TOO_SMALL');
 // Origin in room is nominally connected to the 2x2 core but future wall placements may affect it.
 if(!proposal.preservedNominalRoute.length||!proposal.preservedNominalCore.length)reasons.add('NO_PRESERVED_INTERIOR_ROUTE');
 const voxels=[...opening,...frame.flatMap(f=>f.yLevels.map(y=>({x:f.site.x,y,z:f.site.z,role:f.role})))];
 const voxelKeys=voxels.map(v=>`${v.x},${v.y},${v.z}`);
 if(new Set(voxelKeys).size!==voxelKeys.length)reasons.add('SELF_OVERLAPPING_VOXELS');
 return {doorId:port.id,roomId:room.id,wallBoundaryId:proposal.sourceWallId,
  localDoorRoomCell:cell,localDoorHallCell:hall,normal:proposal.normal,originalPortMoved:proposal.originalPortMoved,doorReoriented:normal.x!==port.normal.dx||normal.z!==port.normal.dz,requiresOldOpeningRedesign:proposal.originalPortMoved||normal.x!==port.normal.dx||normal.z!==port.normal.dz,
  opening,frame,hingeOptions,clearedRoomSideSwing:hingeOptions.filter(o=>o.geometryClear).map(o=>o.side),chosenMockSwingSide:selectedSwing?.side??null,localSwingAirReservation:selectedSwing?selectedSwing.localSwingClearance.flatMap(p=>[base+1,base+2].map(y=>({x:p.x,y,z:p.z,role:'SWING_RESERVED_AIR'}))):[],
  corridorMainComponentSize:corridors.maxComponentSize,connectedLocalCorridorSize:comp===undefined?0:corridors.components[comp].size,externallyReachable:false,
  local3DVoxels:voxels,protectedRoomCore:proposal.preservedNominalCore,protectedRoute:proposal.preservedNominalRoute,
  rejects:[...reasons].sort(),status:reasons.size?'HOLD_FRAME_OR_CORRIDOR':'MOCK_FRAME_REVIEW_ONLY',
  material:null,bedrockFacing:'UNVERIFIED',oldOpeningClosure:(proposal.originalPortMoved||normal.x!==port.normal.dx||normal.z!==port.normal.dz)?'UNRESOLVED':null,
  hinge:'UNDECIDED',swingVerifiedInMinecraft:false,worldCoordinates:null,emitAllowed:false};
}
/** Retarget a conceptual door onto another existing named-corridor boundary; never changes frozen source. */
function reorientedFrames({port,source,shape,stage,idx,room,corridors}){
 const candidates=source.nominalWalls.filter(w=>w.roomId===room.id&&w.neighborClass==='CONCEPT_CORRIDOR'&&!w.openingPortId&&
   (w.adjacentCell.x-w.insideCell.x!==port.normal.dx||w.adjacentCell.z-w.insideCell.z!==port.normal.dz));
 const found=[];
 for(const edge of candidates){
  const d={...port,normal:{dx:edge.adjacentCell.x-edge.insideCell.x,dz:edge.adjacentCell.z-edge.insideCell.z}};
  const proposal=inspectProposedPort({edge,port:d,room,shape,stage,idx,source,baselineDoors:source.openingPorts});
  if(proposal.disqualifications.length)continue;
  proposal.originalPortMoved=true;proposal.originalOpeningRequiresSeparateReview=true;
  const frame=assessFrame({proposal,port:d,room,shape,source,idx,corridors});
  if(!frame.rejects.length)found.push({...frame,doorReoriented:true,oldOpeningClosure:'UNRESOLVED'});
 }
 return found;
}
/** Reuse B79's accepted slots, only computing fallback geometry when needed. */
function candidatePorts({port,source,shape,stage,idx,room,corridors,prior}){
 if(!prior?.selectedForReview)return reorientedFrames({port,source,shape,stage,idx,room,corridors});
 const initial=assessFrame({proposal:prior.selectedForReview,port,room,shape,source,idx,corridors});
 if(!initial.rejects.length)return [initial];
 const rejects=new Set(prior.candidatesRejected.map(x=>x.sourceWallId));
 const others=source.nominalWalls.filter(w=>w.roomId===room.id&&w.neighborClass==='CONCEPT_CORRIDOR'&&
  w.adjacentCell.x-w.insideCell.x===port.normal.dx&&w.adjacentCell.z-w.insideCell.z===port.normal.dz&&
  !w.openingPortId&&!rejects.has(w.id)&&w.id!==initial.wallBoundaryId);
 const fallback=others.map(edge=>{
  const proposal=inspectProposedPort({edge,port,room,shape,stage,idx,source,baselineDoors:source.openingPorts});
  return assessFrame({proposal,port,room,shape,source,idx,corridors});
 });
 if(fallback.some(x=>!x.rejects.length))return [initial,...fallback];
 return [initial,...fallback,...reorientedFrames({port,source,shape,stage,idx,room,corridors})];
}
/** Select non-overlapping local mock frame cells across an entire section, never world ops. */
export function assembleSection({b79section,b78section,source,shape,idx}){
 if(b79section.id!==source.id||shape.id!==source.id||b78section.id!==source.id)fail('SECTION_SCOPE');
 const roomMap=new Map(shape.conceptRooms.map(r=>[r.id,r]));
 const corridors=corridorComponents(shape,idx);
 const all=source.openingPorts.map(port=>{
  const r=roomMap.get(port.roomId);if(!r)fail('MISSING_ROOM');
  const prior=b79section.doors.find(d=>d.portId===port.id);
  const variants=candidatePorts({port,source,shape,stage:b78section,idx,room:r,corridors,prior});
  const nominalSelected=prior?.selectedForReview;
  if(nominalSelected===undefined)fail('B79_CANDIDATE_MISSING');
  const leastRejected=prior.candidatesRejected.slice().sort((a,b)=>a.disqualifications.length-b.disqualifications.length)[0];
  return {portId:port.id,roomId:port.roomId,oldB79Reviewable:!!nominalSelected,variants,
   b79MinimalBlockers:leastRejected?.disqualifications??[],b79AttemptedCandidates:prior.candidatesRejected.length};
 });
 // Most constrained room first; maintain deterministic ownership by local 3d voxel.
 all.sort((a,b)=>a.variants.filter(x=>!x.rejects.length).length-b.variants.filter(x=>!x.rejects.length).length||a.portId.localeCompare(b.portId));
 const allocated=new Map(),reservedAir=new Set(),doors=[];
 for(const door of all){let chosen=null,collision=false;
  for(const c of door.variants.filter(x=>!x.rejects.length)){
   if(c.local3DVoxels.some(v=>allocated.has(`${v.x},${v.y},${v.z}`)||reservedAir.has(`${v.x},${v.y},${v.z}`))||
      c.localSwingAirReservation.some(v=>allocated.has(`${v.x},${v.y},${v.z}`))){collision=true;continue;}
   chosen=c;break;
  }
  if(chosen){for(const v of chosen.local3DVoxels)allocated.set(`${v.x},${v.y},${v.z}`,door.roomId);
   for(const v of chosen.localSwingAirReservation)reservedAir.add(`${v.x},${v.y},${v.z}`);}
  const closest=door.variants[0];
  doors.push({portId:door.portId,roomId:door.roomId,previousB79Reviewable:door.oldB79Reviewable,
   candidateCount:door.variants.length,b79MinimalBlockers:door.b79MinimalBlockers,b79RejectedCandidates:door.b79AttemptedCandidates,locallyValidFrameVariants:door.variants.filter(x=>!x.rejects.length).length,
   selected:chosen,heldReason:chosen?null:collision?'CROSS_ROOM_FRAME_CONFLICT':closest?.rejects.join('|')||(door.oldB79Reviewable?'NO_VARIANTS':'B79_HELD_GEOMETRY_OR_PRODUCTION'),
   bestRejected:chosen?null:closest?{wallBoundaryId:closest.wallBoundaryId,reasons:closest.rejects}:null,
   emitAllowed:false});
 }
 doors.sort((a,b)=>a.portId.localeCompare(b.portId));
 const approvedRoomReserve=new Map(doors.filter(d=>d.selected).map(d=>[d.roomId,new Set([...d.selected.protectedRoomCore,...d.selected.protectedRoute])]));
 const protectedSites=new Set([...shape.conceptReservations.corridors,...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const roomGeometry=new Map(doors.filter(d=>d.selected).map(d=>[d.roomId,d.selected]));
 const swingSites=new Set(doors.filter(d=>d.selected).flatMap(d=>d.selected.localSwingAirReservation.map(v=>key(v))));
 const wallCells=[];let skipped=0;
 for(const stage of b78section.stagedCells){
  const c=stage.localCell,site=stage.site,reserve=approvedRoomReserve.get(stage.owner),assembly=roomGeometry.get(stage.owner);
  if(!reserve||protectedSites.has(site)||reserve.has(site)||swingSites.has(site)||!maskHasFloor(shape.floorMaskRows,c)||
     assembly.local3DVoxels.some(v=>v.x===c.x&&v.z===c.z)||
     inspectSite(idx,c,shape.level,3).contacts){skipped++;continue;}
  wallCells.push({site,roomId:stage.owner,sourceWallIds:stage.wallIds,localBlockVoxels:[1,2,3].map(h=>({x:c.x,y:(shape.level-1)*5+h,z:c.z,role:'PARTITION'})),emitAllowed:false});
 }
 const wallKeys=new Set(wallCells.map(x=>x.site));if(wallKeys.size!==wallCells.length)fail('WALL_DUPLICATION');
 const frameKeys=new Set([...allocated.keys(),...reservedAir]);if(wallCells.some(w=>w.localBlockVoxels.some(c=>frameKeys.has(`${c.x},${c.y},${c.z}`))))fail('WALL_FRAME_OR_SWING_INTERSECTION');
 return {id:source.id,level:shape.level,rooms:doors,localFrameVoxels:doors.filter(d=>d.selected).reduce((sum,d)=>sum+d.selected.local3DVoxels.length,0),
  stagedPartitionCells:b78section.stagedCells.length,partitionCells:wallCells,partitionCellCount:wallCells.length,partitionCellsDeferred:skipped,
  clearCorridorComponents:corridors.components,mainClearCorridorSize:corridors.maxComponentSize,readyFrameCount:doors.filter(d=>d.selected).length,
  actualBlocksEmitted:0,worldCommands:0,emitAllowed:false};
}
export async function compileB80(){
 const a={b65:read('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json'),b66:read('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json'),
  b76:read('parallel/b76/main/B76_STAGING_REPORT.json'),b78:read('parallel/b78/main/B78_GLOBAL_GRID_REPORT.json'),b79:read('parallel/b79/main/B79_DOOR_SLOT_REVIEW.json')};
 for(const [k,v]of Object.entries(a))safe(v,schemas[k]);
 if(a.b79.provenance.b65!==a.b65.reportSha256||a.b79.provenance.b66!==a.b66.reportSha256||a.b79.provenance.b78!==a.b78.reportSha256)fail('SOURCE_LINK');
 const {report:b72}=buildB72();
 const evidencePath=path.join(root,'parallel/b75/main/evidence');const official=fs.readFileSync(path.join(evidencePath,'Blocks.md'));verifyCatalogShapes(official);
 validateOfficialEvidence(JSON.parse(fs.readFileSync(path.join(evidencePath,'B74_OFFLINE_PLANNER_REPORT.json'))),official);
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b80-only-local-review-'));
 const sections=[],replays=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  fs.copyFileSync(path.join(evidencePath,'Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,read('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs){
   const reference=a.b76.buildings.find(x=>x.id===job.id),pinned=a.b79.replay.find(x=>x.building===job.id);
   if(!reference||!pinned||reference.floorMask.delta!==0)fail('PRODUCTION_REFERENCE');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:reference.massing,seed:reference.seed});
   if(hash(plan.operations)!==pinned.productionOperationsSha256)fail('PRODUCTION_CHANGED');
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   replays.push({building:job.id,operationsSha256:pinned.productionOperationsSha256});
   for(const src of a.b65.sections.filter(s=>s.id.startsWith(job.id+'/'))){
    const stage=a.b78.sections.find(s=>s.id===src.id),nominal=a.b66.sections.find(s=>s.id===src.id),previous=a.b79.sections.find(s=>s.id===src.id);
    if(!stage||!nominal||!previous)fail('SECTION_MISSING');
    sections.push(assembleSection({b79section:previous,b78section:stage,source:src,shape:nominal,idx}));
   }
  }
 }finally{fs.rmSync(scratch,{force:true,recursive:true});}
 const rows=sections.flatMap(s=>s.rooms);
 const totals={buildings:replays.length,sections:sections.length,rooms:rows.length,
  b79Reviewable:rows.filter(x=>x.previousB79Reviewable).length,b80MockFrames:rows.filter(x=>x.selected).length,b80Held:rows.filter(x=>!x.selected).length,
  b79HeldWithNewFrame:rows.filter(x=>!x.previousB79Reviewable&&x.selected).length,b79ReviewableNowHeld:rows.filter(x=>x.previousB79Reviewable&&!x.selected).length,
  proposedDoorRelocations:rows.filter(x=>x.selected?.originalPortMoved).length,proposedDoorReorientations:rows.filter(x=>x.selected?.doorReoriented).length,
  framedDoorVoxelCount:sections.reduce((n,x)=>n+x.localFrameVoxels,0),localWallCells:sections.reduce((n,x)=>n+x.partitionCellCount,0),
  localWallVoxelCount:sections.reduce((n,x)=>n+3*x.partitionCellCount,0),worldCommands:0,actualDoorBlocks:0,actualWallBlocks:0,actualStairs:0};
 if(totals.buildings!==5||totals.sections!==30||totals.rooms!==314||totals.b79Reviewable!==239||totals.b80Held+totals.b80MockFrames!==314)fail('SCOPE');
 const body={schema:'minecraftaibuilder-b80-readonly-local-3d-door-frame-mock-v1',kind:'NOT_EXECUTABLE_LOCAL_3D_GEOMETRY',
  provenance:{b65:a.b65.reportSha256,b66:a.b66.reportSha256,b76:a.b76.reportSha256,b78:a.b78.reportSha256,b79:a.b79.reportSha256,officialBlocksSha256:hash(official)},
  productionReplays:replays,totals,sections,
  conclusions:['DOOR_VOID_IS_NOT_A_BEDROCK_DOOR_BLOCK','FRAME_IS_UNMATERIALIZED_3D_LOCAL_VOXEL_ONLY','CLEAR_CORRIDOR_COMPONENT_DOES_NOT_PROVE_EGRESS','HINGE_SWING_NOT_VERIFIED_IN_MINECRAFT','REJECTED_PRODUCTION_OCCUPIED_CELLS_NOT_CUT','LOCAL_WALL_CANDIDATES_NOT_WORLD_OPERATIONS'],
  heldDependencies:['18_NOMINAL_OUTSIDE_MASK_CORRIDORS','25_STAIRS_AND_240_SLAB_CUT_SITES','HOTEL_EXTERIOR_PROPOSAL_UNAPPROVED','UNKNOWN_WORLD_ANCHOR_AND_DOOR_BLOCK_STATES','MOVED_OR_REORIENTED_OLD_PORT_NEEDS_CLOSURE_REVIEW'],
  approval:'PROPOSED_ONLY',readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,worldContacts:0,
  gates:a.b79.gates.map(x=>({...x,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=await compileB80();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B80_LOCAL_3D_FRAME_REPORT.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify(r.totals,null,2));
}
