/** B93: non-executable whole-floor programme alternatives. All positions are LOCAL only.
 * Alternative pathways are DESIGN CHANGES, not statements about Minecraft's existing blocks. */
import {key,maskHasFloor} from '../../b79/main/compile-b79.mjs';
const dirs=[{x:1,z:0},{x:0,z:1},{x:-1,z:0},{x:0,z:-1}];
const vk=p=>`${p.x},${p.y},${p.z}`;
export const cells=r=>Array.from({length:r.width*r.depth},(_,i)=>({x:r.x+i%r.width,z:r.z+Math.floor(i/r.width)}));
const contains=(r,p)=>p.x>=r.x&&p.z>=r.z&&p.x<r.x+r.width&&p.z<r.z+r.depth;
export const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
function voxelAt(p,y,idx){const hit=idx.final.get(`${p.x},${y},${p.z}`);return hit?.occupied?hit:null;}
export function layerEvidence(p,shape,idx,fixed){
 const y=(shape.level-1)*5;
 const voxels=[1,2].map(dy=>{const at={x:p.x,y:y+dy,z:p.z},h=voxelAt(p,y+dy,idx);
  const reserved=fixed.reserved.has(vk(at))||fixed.solids.has(vk(at));
  return {x:at.x,y:at.y,z:at.z,block:h?.block??null,role:h?.role??null,originalOccupied:!!h,protectedReservation:reserved};});
 return {x:p.x,z:p.z,voxels,productionOccupied:voxels.filter(v=>v.originalOccupied).length,
  hardGlass:voxels.some(v=>/glass|pane|window/i.test(String(v.block??'')+' '+String(v.role??''))),
  protected:fixed.protectedSites.has(key(p))||voxels.some(v=>v.protectedReservation)};
}
/** Strict actual-air corridor components; adjacency to core reservation, not verified stair use or egress. */
export function coreCorridorCells(shape,idx,fixed){
 const named=new Map(shape.conceptReservations.corridors.map(p=>[key(p),p]));
 const core=[...shape.conceptReservations.stairs,...shape.conceptReservations.elevators];
 const open=p=>named.has(key(p))&&!layerEvidence(p,shape,idx,fixed).productionOccupied&&!layerEvidence(p,shape,idx,fixed).protected;
 const seeds=[...named.values()].filter(p=>core.some(q=>adjacent(p,q))&&open(p));
 const connected=new Map(seeds.map(p=>[key(p),p]));const todo=[...seeds];
 for(let i=0;i<todo.length;i++)for(const d of dirs){const p={x:todo[i].x+d.x,z:todo[i].z+d.z},k=key(p);if(connected.has(k)||!open(p))continue;connected.set(k,p);todo.push(p);}
 return {sites:connected,seeds:seeds.length,physicalCorridorSites:connected.size,certifiedEgress:false};
}
/** Search use-programme branch: repurpose only held room cells + unassigned floor.
 * Can propose changes to existing non-glass interior production but never apply them.
 * Any path involving frozen prior candidates is rejected outright. */
export function conceptualServiceConnection({room,shape,idx,fixed,heldRooms,allRooms,maxNodes=900}){
 const roomOrigin=new Map(heldRooms.flatMap(r=>cells(r).map(p=>[key(p),r.id])));
 const otherApproved=allRooms.filter(r=>!heldRooms.some(h=>h.id===r.id));
 const corridor=new Set(shape.conceptReservations.corridors.map(key));
 const core=coreCorridorCells(shape,idx,fixed);
 const vertical=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const annotations=new Map();
 const valid=p=>{const k=key(p);if(!maskHasFloor(shape.floorMaskRows,p)||vertical.has(k)||otherApproved.some(r=>contains(r,p)))return false;
  let e=annotations.get(k);if(!e){e=layerEvidence(p,shape,idx,fixed);annotations.set(k,e);}
  return !e.protected&&!e.hardGlass;};
 const original=cells(room).filter(valid);
 const seeds=original.map(p=>({p,cost:0,len:0,previous:null}));
 const best=new Map(seeds.map(s=>[key(s.p),s]));const queue=[...seeds];let visited=0,finish=null;
 while(queue.length&&visited<maxNodes){queue.sort((a,b)=>a.cost-b.cost||a.len-b.len||key(a.p).localeCompare(key(b.p)));
  const a=queue.shift();if(best.get(key(a.p))!==a)continue;visited++;
  if(core.sites.has(key(a.p))){finish=a;break;}
  for(const d of dirs){const p={x:a.p.x+d.x,z:a.p.z+d.z},k=key(p);if(!valid(p))continue;
   const e=annotations.get(k),sameHeld=roomOrigin.has(k),isCorridor=corridor.has(k);
   const extra=(isCorridor?0:1)+(sameHeld?0:3)+e.productionOccupied*12;
   const val={p,cost:a.cost+extra,len:a.len+1,previous:a};
   const prior=best.get(k);if(!prior||val.cost<prior.cost||(val.cost===prior.cost&&val.len<prior.len)){
    best.set(k,val);queue.push(val);
   }
  }
 }
 if(!finish)return {found:false,reason:core.physicalCorridorSites?'NO_PATH_WITHOUT_FROZEN_OR_GLASS_INTRUSION':'NO_TWO_HIGH_NAMED_CORE_ADJACENCY',
  reachableCoreCorridorSites:core.physicalCorridorSites,seeds:original.length,examined:visited,
  interventionRequirements:[],roomCountDelta:0,constructionApproved:false,operations:[]};
 const path=[];for(let cur=finish;cur;cur=cur.previous)path.push(cur.p);path.reverse();
 const reassigned=path.filter(p=>!corridor.has(key(p))),heldInPath=[...new Set(reassigned.map(p=>roomOrigin.get(key(p))).filter(Boolean))].sort();
 const impacts=reassigned.flatMap(p=>annotations.get(key(p)).voxels.filter(v=>v.originalOccupied).map(v=>({...v,
  requiresApproval:true,changeAllowed:false,blockOperations:[]})));
 const newlyCorridor=reassigned.filter(p=>!roomOrigin.has(key(p)));
 const budgetPass=path.length<=12&&impacts.length<=2&&newlyCorridor.length<=6;
 const budgetFailures=[...(path.length>12?['ROUTE_TOO_LONG']:[]),...(impacts.length>2?['TOO_MANY_PRODUCTION_CHANGES']:[]),...(newlyCorridor.length>6?['COMMON_FLOOR_RECLASSIFICATION_TOO_EXTENSIVE']:[])];
 return {found:true,path,conceptualCorridorCells:reassigned,unassignedFloorCells:newlyCorridor,
  heldRoomsRetired:heldInPath,roomCountDelta:-heldInPath.length,nominalIndependentAreaRetired:heldRooms.filter(r=>heldInPath.includes(r.id)).reduce((n,r)=>n+r.width*r.depth,0),
  localProductionBlockChangeRequests:impacts,productionContactCount:impacts.length,
  preservedGlass:true,priorCandidateContacts:0,coreAdjacencyOnly:true,physicalRouteClaim:false,withinConceptQualityBudget:budgetPass,qualityHoldReasons:budgetFailures,
  reachableCoreCorridorSites:core.physicalCorridorSites,conditionalDesignCost:finish.cost,examined:visited,
  requiredApprovals:['PROGRAM_ROOM_COUNT_REDUCTION','LOCAL_INTERIOR_OR_STRUCTURAL_BLOCK_REVIEW','COMMON_PATH_WIDTH_AND_CIRCULATION',
   'OLD_ROOM_PARTITIONS_AND_OPENING_CLOSURE','FLOOR_STAIR_ELEVATOR_EGRESS','BEDROCK_DOOR_HINGE'],
  constructionApproved:false,worldCoordinates:null,operations:[]};
}
function touches(a,b){let count=0;for(const p of cells(a))for(const d of dirs)if(contains(b,{x:p.x+d.x,z:p.z+d.z}))count++;return count;}
export function suiteAdjacency(room,otherRooms){return otherRooms.map(r=>({otherRoomId:r.id,sharedBoundaryCells:touches(room,r),otherNominalArea:r.width*r.depth}))
 .filter(r=>r.sharedBoundaryCells>0).sort((a,b)=>b.sharedBoundaryCells-a.sharedBoundaryCells||a.otherRoomId.localeCompare(b.otherRoomId));}
/** Three genuinely different programme policies, never approved usable-space claims. */
export function floorProgrammeBranches({sectionId,heldRows,shape,idx,fixed}){
 const rooms=shape.conceptRooms,held=heldRows.map(r=>rooms.find(v=>v.id===r.roomId));
 if(held.some(v=>!v))throw Error('B93_HELD_ROOM_NOT_IN_FLOOR');
 const service=held.map(r=>conceptualServiceConnection({room:r,shape,idx,fixed,heldRooms:held,allRooms:rooms}));
 const area=held.reduce((n,r)=>n+r.width*r.depth,0);
 const graph=held.map((r,i)=>({roomId:r.id,originalArea:r.width*r.depth,
  adjacentSuites:suiteAdjacency(r,rooms.filter(o=>o.id!==r.id)),
  serviceConnection:service[i],retainsPrior296WithoutModification:true}));
 const feasible=graph.filter(g=>g.serviceConnection.found&&g.serviceConnection.withinConceptQualityBudget);
 // Score favors preserving pre-existing 296 and avoiding production contacts, not pseudo-approvals.
 const best=[...feasible].sort((a,b)=>a.serviceConnection.heldRoomsRetired.length-b.serviceConnection.heldRoomsRetired.length||
  a.serviceConnection.productionContactCount-b.serviceConnection.productionContactCount||
  a.serviceConnection.conditionalDesignCost-b.serviceConnection.conditionalDesignCost||a.roomId.localeCompare(b.roomId))[0];
 const pairable=graph.filter(g=>g.adjacentSuites.length);
 return {sectionId,heldRoomCount:held.length,heldNominalArea:area,roomGraph:graph,
  alternatives:[
   {id:'KEEP_ALL_HELD_UNCERTIFIED',programmeIndependentRoomsRetired:0,approval:'HOLD',
    retainOriginal296:true,heldRemains:held.length,claimedUsableRooms:0,nominalHeldArea:area,requiresPrior296DesignChange:false,
    conceptualCorridorCells:[],physicalAccessCertified:false,operations:[]},
   {id:'REPURPOSE_HELD_ROOMS_AS_COMMON_SERVICE_ZONE',programmeIndependentRoomsRetired:held.length,
    approval:'PROGRAMME_REDUCTION_REVIEW',retainOriginal296:true,heldRemains:0,claimedUsableRooms:0,
    nominalHeldArea:area,reassignedCommonServiceArea:area,requiresPrior296DesignChange:false,
    accessibleCommonServiceAreaCertified:false,physicalAccessCertified:false,operations:[]},
   {id:'MINIMAL_HELD_ROOM_CORE_LINK',programmeIndependentRoomsRetired:best?.serviceConnection.heldRoomsRetired.length??0,
    approval:best?'CONDITIONAL_UNBUILT_REVIEW':'NO_OPTION_FOUND',retainOriginal296:true,
    heldRemains:held.length-(best?.serviceConnection.heldRoomsRetired.length??0),
    claimedUsableRooms:0,sourceRoomId:best?.roomId??null,localPath:best?.serviceConnection.path??[],
    conceptualCorridorCells:best?.serviceConnection.conceptualCorridorCells??[],
    productionBlockChangeRequests:best?.serviceConnection.localProductionBlockChangeRequests??[],
    requiresPrior296DesignChange:false,physicalAccessCertified:false,constructionApproved:false,operations:[]},
   {id:'MERGE_HELD_INTO_EXISTING_ADJACENT_SUITES',programmeIndependentRoomsRetired:held.length,
    approval:pairable.length?'HOLD_PRIOR_296_REDESIGN_REQUIRED':'HOLD_NO_ADJACENT_ROOM',retainOriginal296:true,
    heldRemains:0,claimedUsableRooms:0,roomsWithTouchingExistingSuite:pairable.length,
    nominalHeldArea:area,requiresPrior296DesignChange:true,affectedPriorProposalRooms:[...new Set(pairable.flatMap(g=>g.adjacentSuites.map(x=>x.otherRoomId)))].sort(),
    frozenProposalMutationsMade:0,operations:[]}
  ],
  physicalCorridorClaims:0,worldCoordinates:null,executionAllowed:false,constructionApproved:false,operations:[]};
}
export function validateB93(r){
 if(r.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||r.executionAllowed!==false||r.worldContacts!==0||r.BuildPlan?.operations?.length!==0)return false;
 if(r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED'))return false;
 if(r.totals.originalRooms!==314||r.totals.priorUnapprovedRooms!==296||r.totals.heldRooms!==18||r.totals.approvedAddedRooms!==0||r.totals.productionEdits!==0||r.totals.worldCommands!==0)return false;
 if(r.floors?.length!==10||r.floors.some(f=>f.alternatives.length!==4||f.executionAllowed!==false||f.alternatives.some(a=>a.operations?.length)))return false;
 for(const f of r.floors)for(const node of f.roomGraph){const s=node.serviceConnection;
  if(s.constructionApproved!==false||s.operations?.length||s.found&&(s.priorCandidateContacts!==0||s.preservedGlass!==true||
   s.withinConceptQualityBudget!==(s.path.length<=12&&s.productionContactCount<=2&&s.unassignedFloorCells.length<=6)||
   s.localProductionBlockChangeRequests.some(x=>x.changeAllowed!==false||x.blockOperations.length)))return false;
 }
 return true;
}
