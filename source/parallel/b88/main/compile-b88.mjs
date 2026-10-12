/** B88 nominal corridor-network + pinned production 3D clearance.
 * All data LOCAL CONCEPTUAL ONLY. No commands, no Minecraft connection, no production writes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {chooseCoreAndPaths} from '../../b78/main/compile-b78.mjs';
import {hash,safe,key,maskHasFloor} from '../../b79/main/compile-b79.mjs';
import {checkWholeFloorCandidate} from '../../b82/main/compile-b82.mjs';
import {protectedFloor} from '../../b86/main/compile-b86.mjs';
import {validateDelta} from '../../b87/main/compile-b87.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const fail=t=>{throw new Error('B88_'+t)};
const vk=v=>`${v.x},${v.y},${v.z}`;
const ds=[{x:0,z:-1},{x:1,z:0},{x:0,z:1},{x:-1,z:0}];
const move=(a,d)=>({x:a.x+d.x,z:a.z+d.z});
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const allSites=r=>{const a=[];for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)a.push({x,z});return a;};
const blank=()=>({solids:new Set(),reserved:new Set(),protectedSites:new Set()});
const addClaims=(a,v)=>{
 for(const p of v.local3DVoxels)(p.role==='DOOR_VOID'?a.reserved:a.solids).add(vk(p));
 for(const p of v.localSwingAirReservation)a.reserved.add(vk(p));
 for(const p of [...v.protectedRoomCore,...v.protectedRoute,...v.proposedCorridorAirCells])a.protectedSites.add(typeof p==='string'?p:key(p));
};
function retainedClaims(s){const c=blank();for(const r of s.rooms)if(r.selected)addClaims(c,r.selected);return c;}
const union=(a,b)=>({solids:new Set([...a.solids,...b.solids]),reserved:new Set([...a.reserved,...b.reserved]),protectedSites:new Set([...a.protectedSites,...b.protectedSites])});
function touch(a,b){return Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;}

/** Formal corridor graph, without asserting any path is a code-compliant exit. */
export function corridorNetwork(shape){
 const pts=new Map(shape.conceptReservations.corridors.filter(p=>maskHasFloor(shape.floorMaskRows,p)).map(p=>[key(p),p]));
 const visited=new Set(),components=[],bySite=new Map();
 const vertical=[...shape.conceptReservations.stairs,...shape.conceptReservations.elevators];
 for(const [k,p] of pts){if(visited.has(k))continue;
  const q=[p],members=[];visited.add(k);
  for(let i=0;i<q.length;i++){const n=q[i];members.push(n);
   for(const d of ds){const next=move(n,d),id=key(next);if(pts.has(id)&&!visited.has(id)){visited.add(id);q.push(next);}}
  }
  const anchors=members.filter(c=>vertical.some(v=>touch(c,v)));
  const id=components.length,component={id,cellCount:members.length,coreAdjacent:anchors.length>0,anchorCells:anchors.length,sites:members};
  components.push(component);for(const site of members)bySite.set(key(site),id);
 }
 components.sort((a,b)=>Number(b.coreAdjacent)-Number(a.coreAdjacent)||b.cellCount-a.cellCount||a.id-b.id);
 return {components,bySite,largestComponentSize:Math.max(0,...components.map(c=>c.cellCount)),coreAdjacentComponents:components.filter(c=>c.coreAdjacent).length};
}
/** Refuse any site occupied at either walking height by pinned production or owned concepts. */
export function walkable(site,level,shape,idx,fixed,otherRooms,{allowNominalCorridor=true}={}){
 if(!maskHasFloor(shape.floorMaskRows,site)||otherRooms.some(r=>inside(r,site)))return false;
 const k=key(site),reserved=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 if(reserved.has(k)||fixed.protectedSites.has(k))return false;
 if(!allowNominalCorridor&&shape.conceptReservations.corridors.some(p=>key(p)===k))return false;
 for(const y of [(level-1)*5+1,(level-1)*5+2]){
  const v={...site,y},id=vk(v);
  if(fixed.solids.has(id)||fixed.reserved.has(id)||idx.final.get(id)?.occupied)return false;
 }
 return true;
}
/** Shortest connected route; forbids other rooms, placed voxels, all pinned production.
 * A named-corridor component is not proof of a world exit; core adjacency is only a topology label. */
export function findCorridorRoute(start,shape,idx,fixed,otherRooms,network,{maxLength=18}={}){
 const named=network.bySite;
 if(!walkable(start,shape.level,shape,idx,fixed,otherRooms))return null;
 const queue=[{site:start,path:[start]}],seen=new Set([key(start)]);
 for(let i=0;i<queue.length;i++){
  const cur=queue[i],componentId=named.get(key(cur.site));
  if(componentId!==undefined){const c=network.components.find(c=>c.id===componentId);
   return {sites:cur.path,connectedComponentId:componentId,componentSize:c.cellCount,componentCoreAdjacent:c.coreAdjacent,
     newHallSites:cur.path.filter(p=>!named.has(key(p)))};
  }
  if(cur.path.length>=maxLength)continue;
  for(const d of ds){const p=move(cur.site,d),k=key(p);
   if(seen.has(k)||!walkable(p,shape.level,shape,idx,fixed,otherRooms))continue;
   seen.add(k);queue.push({site:p,path:[...cur.path,p]});
  }
 }
 return null;
}
const state=(idx,p)=>idx.final.get(vk(p));
const existingOpaque=new Set(['minecraft:light_gray_concrete','minecraft:oak_planks','minecraft:sandstone']);
/** Frame must be actually empty, or reuse exactly compatible pinned FULL wall material.
 * Never cut/replace glass, wall, slab or production opening. */
export function frameAt(edge,shape,idx,fixed,otherRooms){
 const {cell,normal}=edge,side={x:normal.z,z:-normal.x},left=move(cell,side),right=move(cell,{x:-side.x,z:-side.z});
 const base=(shape.level-1)*5,voxel=[],jambEvidence=[];
 for(const [i,p] of [left,right].entries()){
  if(!maskHasFloor(shape.floorMaskRows,p)||otherRooms.some(r=>inside(r,p))||fixed.protectedSites.has(key(p)))return null;
  const states=[];for(let dy=1;dy<=3;dy++){const v={...p,y:base+dy};if(fixed.solids.has(vk(v))||fixed.reserved.has(vk(v)))return null;
   const s=state(idx,v);if(s?.occupied&&!(['primaryWall','secondaryWall'].includes(s.role)&&existingOpaque.has(s.block)))return null;
   states.push(s);voxel.push({...v,role:i?'JAMB_RIGHT':'JAMB_LEFT'});
  }
  // Existing jamb must be a single 3-high homogeneous source column; mixed blocks are held.
  if(states.some(s=>s?.occupied)){
   if(states.some(s=>!s?.occupied||s.role!==states[0].role||s.block!==states[0].block))return null;
   for(let dy=1;dy<=3;dy++)jambEvidence.push({...p,y:base+dy,existingBlock:states[0].block,existingProductionRole:states[0].role,operationIndex:states[dy-1].operationIndex,role:i?'JAMB_RIGHT':'JAMB_LEFT',action:'KEEP_EXISTING_WALL_NO_EDIT'});
  }
 }
 const lintel={...cell,y:base+3,role:'LINTEL'},old=state(idx,lintel);
 if(fixed.solids.has(vk(lintel))||fixed.reserved.has(vk(lintel))||fixed.protectedSites.has(key(cell))||old?.occupied&&!(['primaryWall','secondaryWall'].includes(old.role)&&existingOpaque.has(old.block)))return null;
 const lintelEvidence=old?.occupied?{...lintel,action:'KEEP_EXISTING_WALL_NO_EDIT',existingBlock:old.block,existingProductionRole:old.role,operationIndex:old.operationIndex}:null;
 return {voxels:[...voxel,lintel],jambEvidence,lintelEvidence};
}
/** Full-area, local grid door + corridor network proposal. Never creates executable commands. */
export function proposeDoor({held,room,port,shape,source,idx,fixed,otherRooms,network,maxRoute=18}){
 const base=(shape.level-1)*5,candidates=[],diagnostics={edgeCount:0,noFrame:0,doorBlocked:0,noCorridorRoute:0,noInteriorCore:0,noSwing:0,occupiedReservation:0};
 const otherDoor=new Set(source.openingPorts.filter(p=>p.id!==port.id).map(p=>key(p.roomCell)));
 const named=new Set(shape.conceptReservations.corridors.map(key));
 for(const cell of allSites(room))for(const normal of ds){const hall=move(cell,normal);if(inside(room,hall))continue;diagnostics.edgeCount++;
  if(!maskHasFloor(shape.floorMaskRows,hall)||otherRooms.some(r=>inside(r,hall))||otherDoor.has(key(cell))){diagnostics.occupiedReservation++;continue;}
  const door=[1,2].map(dy=>({...cell,y:base+dy,role:'DOOR_VOID'}));
  if(fixed.protectedSites.has(key(cell))||door.some(v=>fixed.solids.has(vk(v))||fixed.reserved.has(vk(v))||state(idx,v)?.occupied)){diagnostics.doorBlocked++;continue;}
  const e={cell,hall,normal};const f=frameAt(e,shape,idx,fixed,otherRooms);if(!f){diagnostics.noFrame++;continue;}
  const local3DVoxels=[...door,...f.voxels],frameSites=new Set(f.voxels.map(key));
  const inner=move(cell,{x:-normal.x,z:-normal.z}),t={x:normal.z,z:-normal.x},swingOptions=[move(inner,t),move(inner,{x:-t.x,z:-t.z})];
  const swing=swingOptions.find(sw=>[inner,sw].every(p=>inside(room,p)&&!frameSites.has(key(p))&&
   !fixed.protectedSites.has(key(p))&&[base+1,base+2].every(y=>{const v={...p,y};return !fixed.solids.has(vk(v))&&!fixed.reserved.has(vk(v))&&!state(idx,v)?.occupied;})));
  if(!swing){diagnostics.noSwing++;continue;}
  const swingAir=[inner,swing].flatMap(p=>[base+1,base+2].map(y=>({...p,y,role:'SWING_RESERVED_AIR'})));
  const allFixed={...fixed,protectedSites:new Set([...fixed.protectedSites,...frameSites])};
  const forbidden=new Set([...fixed.protectedSites,...frameSites,...shape.conceptReservations.stairs.map(key),...shape.conceptReservations.elevators.map(key),...named]);
  for(const p of allSites(room))for(const y of [base+1,base+2]){
   const v={...p,y};if(fixed.solids.has(vk(v))||fixed.reserved.has(vk(v))||state(idx,v)?.occupied)forbidden.add(key(p));
  }
  forbidden.delete(key(cell));
  const core=chooseCoreAndPaths(room,[cell],forbidden);
  if(!core){diagnostics.noInteriorCore++;continue;}
  const route=findCorridorRoute(hall,shape,idx,allFixed,otherRooms,network,{maxLength:maxRoute});
  if(!route){diagnostics.noCorridorRoute++;continue;}
  const newCandidate={roomId:room.id,portId:port.id,sourceSection:shape.id,roomRect:{x:room.x,z:room.z,width:room.width,depth:room.depth},retainedRoomAreaRatio:1,
   doorRoomCell:cell,doorHallCell:hall,normal:{dx:normal.x,dz:normal.z},local3DVoxels,localSwingAirReservation:swingAir,
   protectedRoomCore:core.core,protectedRoute:core.paths[0],proposedCorridorAirCells:route.sites,proposedNewCorridorCells:route.newHallSites,
   virtualLocalEnvelopePatch:[],facadeGlazingCompensation:[],existingGlassRemoved:0,glassAreaNetChange:0,jointPatchVoxelCount:0,
   structuralReviewRequired:false,facadeReviewRequired:false,existingWallJambEvidence:f.jambEvidence,existingLintelEvidence:f.lintelEvidence,
   existingFrameRetentionProof:'NO_PRODUCTION_BLOCK_MUTATED__GEOMETRY_ONLY',pinnedEnvelopeBlocksUntouched:true,structuralLoadPathAlterationProposed:false,
   oldPortMoved:key(port.roomCell)!==key(cell),bedrockDoorSemantics:'UNVERIFIED',globalEgress:'UNVERIFIED',corridorWidth:'UNVERIFIED',
   networkComponentId:route.connectedComponentId,networkCoreAdjacent:route.componentCoreAdjacent,networkSiteCount:route.componentSize,
   approval:'REVIEW_ONLY',executionAllowed:false,operations:[],worldCoordinates:null};
  if(validateDelta(newCandidate,idx,shape.level).length){diagnostics.occupiedReservation++;continue;}
  if(checkWholeFloorCandidate({...newCandidate,opening:door},fixed,blank()).length){diagnostics.occupiedReservation++;continue;}
  candidates.push(newCandidate);
 }
 candidates.sort((a,b)=>Number(b.networkCoreAdjacent)-Number(a.networkCoreAdjacent)||a.proposedNewCorridorCells.length-b.proposedNewCorridorCells.length||Number(a.oldPortMoved)-Number(b.oldPortMoved)||key(a.doorRoomCell).localeCompare(key(b.doorRoomCell)));
 return {candidates:candidates.slice(0,16),totalLocalVariants:candidates.length,diagnostics};
}
export async function compileB88(){
 const b87=read('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');safe(b87,'minecraftaibuilder-b87-structural-free-room-redraft-v1');
 const b86=read('parallel/b86/main/B86_JOINT_ENVELOPE_INTERIOR_REPORT.json');safe(b86,'minecraftaibuilder-b86-joint-facade-interior-virtual-branch-v1');
 if(b87.provenance.b86!==b86.reportSha256)fail('PROVENANCE');
 const b72=read('parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json');
 const b76=read('parallel/b76/main/B76_STAGING_REPORT.json');
 const data={};for(const [name,file] of Object.entries({b65:'B65_INTERIOR_ASSEMBLY_INTENTS.json',b66:'B66_LOCAL_3D_ASSEMBLY.json',b80:'B80_LOCAL_3D_FRAME_REPORT.json',b81:'B81_TYPED_LOCAL_ASSEMBLY.json',b82:'B82_ROOM_CORRIDOR_REDESIGN.json',b83:'B83_HELD_ROOM_TEMPLATE_REPORT.json',b84:'B84_LAYOUT_OPTIONS_REPORT.json'})){
  const r=read(`parallel/${name}/main/${file}`);data[name]=new Map(r.sections.map(s=>[s.id,s]));
 }
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b88-pinned-offline-'));
 const sections=[],productionReplays=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const catalog=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  if(hash(catalog)!==b87.provenance.officialBlocksSha256)fail('CATALOG_DRIFT');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,read('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs){
   const ref=b76.buildings.find(b=>b.id===job.id),prev=b87.productionReplays.find(b=>b.building===job.id);
   if(!ref||!prev)fail('BUILDING_REF');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   if(hash(plan.operations)!==prev.operationsSha256)fail('PINNED_PRODUCTION_DRIFT');
   productionReplays.push({...prev});
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   for(const prior of b87.sections.filter(s=>s.id.startsWith(`${job.id}/`))){
    const shape=data.b66.get(prior.id),source=data.b65.get(prior.id);
    if(!shape||!source)fail('NOMINAL_FLOOR_REF');
    const base=protectedFloor(...['b81','b80','b82','b83','b84'].map(x=>data[x].get(prior.id)));
    const retained=retainedClaims(prior),fixed=union(base,retained),network=corridorNetwork(shape),rooms=[];
    for(const h of prior.rooms.filter(r=>!r.selected)){
     const port=source.openingPorts.find(p=>p.id===h.portId),room=shape.conceptRooms.find(r=>r.id===h.roomId);
     if(!port||!room||port.roomId!==room.id)fail('PORT_ROOM');
     const rr=proposeDoor({held:h,room,port,shape,source,idx,fixed,otherRooms:shape.conceptRooms.filter(r=>r.id!==room.id),network});
     rooms.push({roomId:room.id,portId:port.id,diagnostics:rr.diagnostics,variants:rr.candidates,totalLocalVariants:rr.totalLocalVariants,
      selected:null,status:'HOLD_AFTER_PINNED_GLOBAL_CORRIDOR_AUDIT',operations:[],worldCoordinates:null});
    }
    // Apply per-floor consensus only to local PROPOSAL arbitration: never mutate pinned production or previous drafts.
    const claimed=blank();
    for(const r of rooms.sort((a,b)=>a.totalLocalVariants-b.totalLocalVariants||a.roomId.localeCompare(b.roomId))){
     const candidates=r.variants;
     for(const candidate of candidates){
      const errs=checkWholeFloorCandidate({...candidate,opening:candidate.local3DVoxels.filter(v=>v.role==='DOOR_VOID')},fixed,claimed);
      const sites=[...candidate.proposedCorridorAirCells,...candidate.protectedRoomCore,...candidate.protectedRoute];
      if(errs.length||sites.some(p=>claimed.protectedSites.has(typeof p==='string'?p:key(p))))continue;
      r.selected=candidate;r.status='UNAPPROVED_INTEGRATED_NETWORK_OPTION';addClaims(claimed,candidate);break;
     }
     // Preserve rejections in report but do not promote invalid candidates.
     r.variants=r.variants.map(c=>({doorRoomCell:c.doorRoomCell,doorHallCell:c.doorHallCell,oldPortMoved:c.oldPortMoved,
       networkComponentId:c.networkComponentId,networkCoreAdjacent:c.networkCoreAdjacent,proposedNewCorridorCells:c.proposedNewCorridorCells,
       retainedRoomAreaRatio:c.retainedRoomAreaRatio,pinnedEnvelopeBlocksUntouched:c.pinnedEnvelopeBlocksUntouched}));
    }
    sections.push({id:prior.id,level:shape.level,width:shape.floorMaskRows[0].length,depth:shape.floorMaskRows.length,
     floorMaskRows:shape.floorMaskRows,nominalCorridorComponents:network.components.map(c=>({id:c.id,cellCount:c.cellCount,coreAdjacent:c.coreAdjacent,anchorCells:c.anchorCells,
       sites:c.sites})),nominalCoreConnectedComponents:network.coreAdjacentComponents,
     earlierCandidatesUntouched:true,rooms,operations:[],worldCoordinates:null});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const held=sections.flatMap(s=>s.rooms),added=held.filter(x=>x.selected),without=held.filter(x=>!x.selected);
 const totals={buildings:5,floors:30,originalRooms:314,previousUnapprovedLocalCandidates:296,previousHeldRooms:18,
  networkResolvedProposalOnly:added.length,totalUnapprovedLocalCandidates:296+added.length,remainingHeld:without.length,
  originalRoomAreaPreserved:added.length,productionWallBlockReplacements:0,existingProductionEdits:0,
  namedCorridorComponents:sections.reduce((n,s)=>n+s.nominalCorridorComponents.length,0),
  nominalCoreAdjacentComponents:sections.reduce((n,s)=>n+s.nominalCoreConnectedComponents,0),
  newCorridorCells:added.reduce((n,r)=>n+r.selected.proposedNewCorridorCells.length,0),
  worldContacts:0,constructionCommands:0};
 if(productionReplays.length!==5||sections.length!==30||held.length!==18||totals.previousUnapprovedLocalCandidates+added.length+without.length!==314)fail('COUNTS');
 const body={schema:'minecraftaibuilder-b88-floor-corridor-network-pinned-air-v1',kind:'OFFLINE_READONLY_NETWORK_RECONCILIATION',
  provenance:{b87:b87.reportSha256,b86:b86.reportSha256,officialBlocksSha256:b87.provenance.officialBlocksSha256},totals,productionReplays,sections,
  remainingRisks:['NOT_PHYSICAL_OR_EXIT_ROUTE_PROOF','BEDROCK_DOOR_STATES_UNVERIFIED','STAIRS_25_AND_SLAB_OPENINGS_240_NOT_VALIDATED','OLD_DOOR_OPENINGS_UNAPPROVED','CORRIDOR_WIDTH_NOT_CERTIFIED','B87_PRIOR_CANDIDATES_UNAPPROVED'],
  readiness:'NOT_PREPARED',approval:'REVIEW_ONLY',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:b87.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=await compileB88();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B88_CORRIDOR_NETWORK_REPORT.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r.totals,null,2));
}
