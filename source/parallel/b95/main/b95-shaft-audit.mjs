/** B95: physically grounded, local-only vertical-core and corridor-cut audit. NON-EXECUTABLE. */
import {key,maskHasFloor} from '../../b79/main/compile-b79.mjs';
import {layerEvidence} from '../../b93/main/b93-program-branches.mjs';
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const V=(p,y)=>`${p.x},${y},${p.z}`;
const footprint=(x,z,w,d)=>Array.from({length:w*d},(_,i)=>({x:x+i%w,z:z+Math.floor(i/w)}));
const has=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const isGlass=v=>/glass|pane|window/i.test(String(v?.block??'')+' '+String(v?.role??''));
const sample=(idx,p,y)=>idx.final.get(V(p,y))??null;
export function corridorConnectivity({section,idx,fixed,removed=[]}){
 const removal=new Set(removed.map(key)),named=new Map(section.conceptReservations.corridors.map(p=>[key(p),p]));
 const oldCore=[...section.conceptReservations.stairs,...section.conceptReservations.elevators];
 const air=new Map([...named].filter(([k,p])=>{const e=layerEvidence(p,section,idx,fixed);return !e.productionOccupied&&!e.protected;}));
 const traverse=(s)=>{const seen=new Set(),stack=[s];seen.add(s);for(let i=0;i<stack.length;i++){
  const p=named.get(stack[i]);for(const [dx,dz] of dirs){const nk=key({x:p.x+dx,z:p.z+dz});if(!air.has(nk)||removal.has(nk)||seen.has(nk))continue;seen.add(nk);stack.push(nk);}
 }return seen;};
 const components=[],done=new Set();for(const k of air.keys()){if(done.has(k)||removal.has(k))continue;const c=traverse(k);for(const t of c)done.add(t);components.push(c);}
 const seeds=[...air].filter(([k,p])=>!removal.has(k)&&oldCore.some(c=>Math.abs(c.x-p.x)+Math.abs(c.z-p.z)===1)).map(([k])=>k);
 const reach=new Set();for(const s of seeds){if(reach.has(s))continue;for(const k of traverse(s))reach.add(k);}
 return {physicalNamedCorridorCells:air.size,removedPhysicalNamedCorridorCells:[...air.keys()].filter(k=>removal.has(k)).length,
  remainingComponents:components.length,remainingComponentSizes:components.map(c=>c.size).sort((a,b)=>b-a),
  physicallyConnectedToOriginalCore:reach.size,physicalNamedCorridorKeySet:[...air.keys()].sort(),connectedToCoreKeySet:[...reach].sort(),
  certifiedEmergencyEgress:false};
}
export function auditShaftCandidate({x,z,width=2,depth=2,sections,indices,fixedBySection,heldBySection}){
 if(![x,z,width,depth].every(Number.isInteger)||width<2||depth<2||width>5||depth>5||sections.length<2)throw Error('B95_BAD_SHAFT_CONTEXT');
 const localSites=footprint(x,z,width,depth),slices=[],allContacts=[],interFloorGaps=[];
 let forbidden=0,glass=0,prior=0,uncertifiedOther=0,headroomContacts=0,nominalCorridorRemoved=0,disconnectedOutside=0;
 const heldTouches=new Set(),protectedNonHeld=new Set();
 for(const section of [...sections].sort((a,b)=>a.level-b.level)){
  const idx=indices.get(section.id),fixed=fixedBySection.get(section.id);if(!idx||!fixed)throw Error('B95_PINNED_SOURCE_MISSING');
  const held=new Set(heldBySection.get(section.id)||[]),base=(section.level-1)*5;
  const hitSites=new Set(localSites.map(key)),contacts=[],otherRooms=[],heldRooms=[],protectedSites=[],glassSites=[],floorMaskMissing=[];
  for(const p of localSites){
   if(!maskHasFloor(section.floorMaskRows,p)){forbidden++;floorMaskMissing.push(key(p));continue;}
   if(section.conceptReservations.stairs.concat(section.conceptReservations.elevators).some(c=>key(c)===key(p))){forbidden++;protectedSites.push({site:key(p),kind:'ORIGINAL_CORE'});}
   for(const room of section.conceptRooms.filter(r=>has(r,p))){if(held.has(room.id)){heldTouches.add(section.id+'::'+room.id);heldRooms.push(room.id);}else{uncertifiedOther++;protectedNonHeld.add(section.id+'::'+room.id);otherRooms.push(room.id);}}
   if(fixed.protectedSites.has(key(p))){prior++;protectedSites.push({site:key(p),kind:'PRIOR_296_RESERVED_SITE'});}
   for(let dy=0;dy<=4;dy++){
    const y=base+dy,state=sample(idx,p,y),vk=V(p,y),freeze=fixed.solids.has(vk)||fixed.reserved.has(vk);
    if(freeze){prior++;protectedSites.push({site:key(p),dy,kind:'PRIOR_296_RESERVED_VOXEL'});}
    if(state?.occupied){const entry={site:key(p),dy,level:section.level,role:state.role,block:state.block,phase:state.phase,
     category:(dy===0?'BASE_FLOOR':dy===4?'UPPER_CEILING_OR_ROOF':'SHAFT_BODY'),
     structuralReviewRequired:true,automaticChangeAllowed:false};contacts.push(entry);allContacts.push(entry);
     if(dy>=1&&dy<=3)headroomContacts++;
     if(isGlass(state)){glass++;glassSites.push({site:key(p),dy});}
    }
   }
  }
  const corridorBefore=corridorConnectivity({section,idx,fixed}),after=corridorConnectivity({section,idx,fixed,removed:localSites});
  const b=new Set(corridorBefore.connectedToCoreKeySet),a=new Set(after.connectedToCoreKeySet),lostOutside=[...b].filter(k=>!hitSites.has(k)&&!a.has(k));
  nominalCorridorRemoved+=localSites.filter(p=>section.conceptReservations.corridors.some(c=>key(c)===key(p))).length;
  disconnectedOutside+=lostOutside.length;
  slices.push({sectionId:section.id,level:section.level,footprintInsideFloorMask:floorMaskMissing.length===0,
   floorMaskMissing,heldRooms:[...new Set(heldRooms)],otherRooms:[...new Set(otherRooms)],protectedSites,
   productionContacts:contacts,productionContactCount:contacts.length,hardGlassContacts:glassSites,
   bodyHeadroomOccupied:contacts.filter(c=>c.category==='SHAFT_BODY').length,
   baselineCoreCorridorReachable:corridorBefore.physicallyConnectedToOriginalCore,
   afterCoreCorridorReachable:after.physicallyConnectedToOriginalCore,
   deletedPhysicalCorridorSites:after.removedPhysicalNamedCorridorCells,
   outsideCorridorDisconnectedFromCore:lostOutside.length,lostOutsideCorridorSites:lostOutside,
   nominalCorridorSitesConverted:localSites.filter(p=>section.conceptReservations.corridors.some(c=>key(c)===key(p))).map(key),
   originalCoreUnchanged:true,operations:[]});
 }
 for(let i=0;i<slices.length-1;i++){
  const low=slices[i],upper=slices[i+1],lowerBase=(low.level-1)*5,upperBase=(upper.level-1)*5;
  if(upper.level!==low.level+1)throw Error('B95_FLOORS_NOT_CONTIGUOUS');
  const cuts=[];for(const p of localSites)for(const y of [lowerBase+4,upperBase]){
   const state=sample(indices.get(y===upperBase?upper.sectionId:low.sectionId),p,y);if(state?.occupied)cuts.push({site:key(p),relativeToLowerBase:y-lowerBase,
    role:state.role,block:state.block,phase:state.phase,modificationApproved:false});
  }
  interFloorGaps.push({lowerLevel:low.level,upperLevel:upper.level,
   inspectedBoundaryYOffsets:[4,5],productionCutRequests:cuts,productionCutCount:cuts.length,
   clearVerticalPassageDemonstrated:cuts.length===0&&low.bodyHeadroomOccupied===0&&upper.bodyHeadroomOccupied===0,
   slabCutApproved:false,loadBearingCapacityVerified:false,operations:[]});
 }
 const lastSection=[...sections].sort((a,b)=>a.level-b.level).at(-1),roofLevelY=lastSection.level*5,roofContacts=[];
 for(const p of localSites){const state=sample(indices.get(lastSection.id),p,roofLevelY);if(state?.occupied)roofContacts.push({site:key(p),role:state.role,block:state.block,roofModificationApproved:false});}
 const roofBoundary={aboveTopFloorLocalY:roofLevelY,productionContacts:roofContacts,roofChangeApproved:false,
  weatherproofingAndSupportUnverified:true,operations:[]};
 const zeroDestructiveContacts=allContacts.length===0&&roofContacts.length===0&&prior===0&&glass===0&&uncertifiedOther===0&&forbidden===0;
 const needsFloorEngineering=interFloorGaps.some(g=>g.productionCutCount>0),circulationDisrupted=disconnectedOutside>0;
 const reasons=[...(forbidden?['MASK_OR_EXISTING_CORE_CONFLICT']:[]),...(prior?['PREVIOUS_296_RESERVATIONS']:[]),
  ...(uncertifiedOther?['NONHELD_ROOM_DISPLACEMENT']:[]),...(glass?['GLAZING_CANNOT_BE_CUT']:[]),
  ...(headroomContacts?['OCCUPIED_SHAFT_BODY']:[]),...(needsFloorEngineering?['INTERFLOOR_BOUNDARY_CUT_REQUIRES_APPROVAL']:[]),...(roofContacts.length?['TOP_ROOF_PENETRATION_REQUIRES_APPROVAL']:[]),
  ...(circulationDisrupted?['EXISTING_CORRIDOR_REACHABILITY_REDUCED']:[]),
  'VERTICAL_TRANSPORT_GEOMETRY_NOT_DEFINED','EGRESS_AND_ACCESSIBILITY_UNVERIFIED'];
 return {x,z,width,depth,localFootprint:localSites,slices,interFloorGaps,roofBoundary,counts:{allProductionVoxelContacts:allContacts.length,
  hardGlassContacts:glass,prior296Reservations:prior,nonHeldRoomFootprintContacts:uncertifiedOther,
  missingFloorOrOriginalCoreContacts:forbidden,headroomContacts,
  interFloorProductionCutRequests:interFloorGaps.reduce((n,g)=>n+g.productionCutCount,0),roofPenetrationContacts:roofContacts.length,
  physicallyReachableCorridorSitesLostOutsideFootprint:disconnectedOutside,
  nominalCorridorCellsRepurposed:nominalCorridorRemoved,heldRoomsTouched:heldTouches.size},
  affectedHeldRoomIds:[...heldTouches].sort(),protectedNonHeldRooms:[...protectedNonHeld].sort(),
  noOriginalBuildingEditsNeeded:zeroDestructiveContacts,
  needSlabEngineering:needsFloorEngineering,existingCorridorSeveranceDetected:circulationDisrupted,
  designReviewClass:forbidden||prior||glass||uncertifiedOther?'REJECT_PROTECTED_GEOMETRY':
    circulationDisrupted?'HOLD_CORRIDOR_DISCONNECTION':needsFloorEngineering||headroomContacts||roofContacts.length?'HOLD_STRUCTURAL_CUT_OR_HEADROOM':'HOLD_VERTICAL_ACCESS_UNVERIFIED',
  allDesignAndConstructionApprovalsGranted:false,emergencyEgressCertified:false,shaftConstructible:false,
  requiredApprovals:reasons,worldCoordinates:null,operations:[]};
}
export function exploreR013Shafts(context,{x=24,z=18,radius=2,limit=150}={}){
 const trials=[];for(const [w,d] of [[2,2],[2,3],[3,2],[3,3]])for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
  if(trials.length>=limit)break;const q=auditShaftCandidate({...context,x:x+dx,z:z+dz,width:w,depth:d});
  trials.push({x:q.x,z:q.z,width:w,depth:d,counts:q.counts,reviewClass:q.designReviewClass,
   impactedHeldRooms:q.affectedHeldRoomIds,neededSlabReview:q.needSlabEngineering,
   corridorDisconnected:q.existingCorridorSeveranceDetected,approved:false});
 }
 const selected=auditShaftCandidate({...context,x,z,width:2,depth:2});
 const scored=[...trials].sort((a,b)=>{const cv=v=>(v.reviewClass==='REJECT_PROTECTED_GEOMETRY'?100000:0)+
  (v.counts.heldRoomsTouched===0?10000:0)+v.counts.prior296Reservations*500+v.counts.nonHeldRoomFootprintContacts*500+
  v.counts.hardGlassContacts*500+v.counts.missingFloorOrOriginalCoreContacts*500+
  v.counts.physicallyReachableCorridorSitesLostOutsideFootprint*40+
  v.counts.headroomContacts*40+v.counts.interFloorProductionCutRequests*10+v.counts.nominalCorridorCellsRepurposed*2-v.counts.heldRoomsTouched*2;
  return cv(a)-cv(b)||a.width*a.depth-b.width*b.depth||a.x-b.x||a.z-b.z;});
 return {selected,trialCount:trials.length,trialOutcomes:trials,topScoringConcepts:scored.slice(0,8),
  verifiedNewCoreStairs:0,constructionApproved:false,operations:[]};
}
export function validateB95(r){
 if(r.schema!=='minecraftaibuilder-b95-vertical-core-slab-corridor-audit-v1'||r.readiness!=='NOT_PREPARED'||r.executionAllowed!==false||r.constructionApproved!==false||r.worldContacts!==0||r.BuildPlan?.operations?.length!==0||r.BuildPlan?.worldCoordinates!==null)return false;
 if(r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED'))return false;
 if(r.totals?.originalNominalRooms!==314||r.totals?.priorUnapprovedCandidates!==296||r.totals?.heldRooms!==18||r.totals?.approvedNewRooms!==0||r.totals?.worldOperations!==0||r.totals?.priorProtectedFilesChanged!==0)return false;
 if(!r.verticalAudit||r.verticalAudit.selected.allDesignAndConstructionApprovalsGranted!==false||r.verticalAudit.selected.shaftConstructible!==false||r.verticalAudit.selected.operations.length||r.verticalAudit.selected.slices.length!==6||r.verticalAudit.selected.interFloorGaps.length!==5)return false;
 if(r.verticalAudit.trialOutcomes.some(x=>x.approved)||r.verticalAudit.verifiedNewCoreStairs!==0)return false;
 if(r.remediationPatterns?.length!==4||r.remediationPatterns.reduce((n,p)=>n+p.roomCount,0)!==18)return false;
 if(r.replayed?.length!==2||r.replayed.some(b=>!b.verifiedReadOnly))return false;
 return true;
}
/** Offline local corridor-bypass proposals after reassigning a shaft. New sites only if 2-high *actual* air.
 * May traverse a held room ONLY as unapproved programme retirement; cannot touch 296 or nominal non-held rooms. */
export function planCoreCorridorBypasses({section,idx,fixed,heldRoomIds,shaft,maximumNewSites=12}){
 const removed=new Set(shaft.map(key)),before=corridorConnectivity({section,idx,fixed}),after=corridorConnectivity({section,idx,fixed,removed:shaft}),
  core=new Set(after.connectedToCoreKeySet),prior=new Set(before.connectedToCoreKeySet),
  targets=[...prior].filter(k=>!removed.has(k)&&!core.has(k)).sort();
 const oldCorridor=new Set(section.conceptReservations.corridors.map(key));
 const forbiddenCore=new Set([...section.conceptReservations.stairs,...section.conceptReservations.elevators].map(key));
 const held=new Set(heldRoomIds),inside=p=>maskHasFloor(section.floorMaskRows,p)&&!removed.has(key(p))&&!forbiddenCore.has(key(p));
 const roomAt=p=>section.conceptRooms.filter(r=>has(r,p)).map(r=>r.id);
 const valid=p=>inside(p)&&roomAt(p).every(r=>held.has(r))&&
  (()=>{const e=layerEvidence(p,section,idx,fixed);return e.productionOccupied===0&&!e.protected&&!e.hardGlass;})();
 const bypasses=[];let unresolved=0;
 for(const from of targets){
  const [x,z]=from.split(',').map(Number),seed={x,z},queue=[seed],parents=new Map([[from,null]]);let last=null;
  if(!valid(seed)){bypasses.push({from,resolved:false,reason:'START_NOT_CLEAR',path:[],approved:false});unresolved++;continue;}
  for(let i=0;i<queue.length;i++){
   const p=queue[i],pk=key(p);if(core.has(pk)){last=pk;break;}
   for(const [dx,dz] of dirs){const n={x:p.x+dx,z:p.z+dz},k=key(n);if(parents.has(k)||!valid(n))continue;parents.set(k,pk);queue.push(n);}
  }
  if(last===null){bypasses.push({from,resolved:false,reason:'NO_PROTECTED_FREE_PHYSICAL_CONNECTION',path:[],approved:false});unresolved++;continue;}
  const path=[];for(let cur=last;cur!==null;cur=parents.get(cur))path.push(cur);path.reverse();
  const newCorridor=path.filter(k=>!oldCorridor.has(k)),convertedHeld=[...new Set(path.flatMap(k=>{const [x,z]=k.split(',').map(Number);return roomAt({x,z}).filter(r=>held.has(r));}))].sort();
  const withinConceptBudget=newCorridor.length<=maximumNewSites&&path.length<=maximumNewSites+8;
  bypasses.push({from,resolved:true,path,newCorridorSites:newCorridor,convertedHeldRooms:convertedHeld,
   withinConceptBudget,physicalTwoHighAirOnly:true,compromisesPrior296:false,
   routeDoesNotCertifyEmergencyEgress:true,requiresNewWallsAndLegalAccessReview:true,approved:false});
 }
 return {sectionId:section.id,disconnectedNominalCorridorSites:targets,localBypasses:bypasses,
  reachableProposals:bypasses.filter(b=>b.resolved).length,conceptBudgetProposals:bypasses.filter(b=>b.resolved&&b.withinConceptBudget).length,
  unresolved,allFullyApproved:false,operations:[],worldCoordinates:null};
}
