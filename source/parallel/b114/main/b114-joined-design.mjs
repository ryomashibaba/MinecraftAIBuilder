/**
 * B114 OFFLINE joint circulation hypotheses (NOT executable Minecraft construction).
 * B113 supplied separate 2D gallery repairs + stair reservations.  Here we check
 * their proposed connection as a *conditional* floor graph, explicitly not 3D
 * clearance or actual walkable stairs. Original rooms, cores, and source voxels
 * are untouched.
 */
import {K,neighbors,reachable} from '../../b113/main/b113-geometry.mjs';
import {inspectRoomAssembly} from '../../b113/main/b113-interiors.mjs';
const D=[[1,0],[-1,0],[0,1],[0,-1]];
const inRect=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const footprint=(origin,dx,dz)=>{const out=[];for(let i=0;i<7;i++)for(let w=0;w<2;w++)
 out.push({x:origin.x+dx*i-dz*w,z:origin.z+dz*i+dx*w});return out;};
const gallerySet=(design,route,level)=>{
 const floor=design.plan.floors[level];
 return new Set([...floor.gallery,...route.repair.addedCells].map(K));
};
const touching=(p,walk)=>neighbors(p).filter(x=>walk.has(K(x))).length;
function landingMetrics(cells,walk,fromEnd=false){
 const landing=fromEnd?cells.slice(-2):cells.slice(0,2);
 return {connected:landing.every(p=>touching(p,walk)>0),
  adjacentEdges:landing.reduce((n,p)=>n+touching(p,walk),0),
  landing};
}
function candidateOptions(stair,design,overlays){
 const f=design.plan.floors[stair.fromLevel],g=design.plan.floors[stair.toLevel],core=stair.currentCore;
 const routeA=overlays[stair.fromLevel],routeB=overlays[stair.toLevel];
 const proposedA=gallerySet(design,routeA,stair.fromLevel),proposedB=gallerySet(design,routeB,stair.toLevel);
 const valid=cells=>cells.some(p=>inRect(core,p))&&[f,g].every(fl=>cells.every(p=>
  fl.footprintRows[p.z]?.[p.x]==='1'&&
  !fl.rooms.some(r=>inRect(r,p))&&!design.plan.cores.some(c=>c!==core&&
    !(c.x===core.x&&c.z===core.z)&&inRect(c,p))));
 // Previous B113 candidate is a verified footprint-only reservation, not a stair connection.
 const existing=stair.reservation.sample;
 const candidates=[];let searched=0,nonColliding=0;
 function add(cells,origin,dx,dz,kind){
  if(!valid(cells))return;
  nonColliding++;
  const lower=landingMetrics(cells,proposedA);
  const upper=landingMetrics(cells,proposedB,true);
  candidates.push({kind,origin,ascent:{dx,dz},cells,
   lowerLanding:lower.landing,upperLanding:upper.landing,
   lowerInterfaceLinked:lower.connected,upperInterfaceLinked:upper.connected,
   hypotheticalInterfloorLink:lower.connected&&upper.connected,
   score:(lower.connected?1000:0)+(upper.connected?1000:0)+
    lower.adjacentEdges*5+upper.adjacentEdges*5,
   requiresFloorAndCeilingApertures:true,
   requiresLandingSupports:true,requiresVerticalBodyCollisionSweep:true,
   educationCollisionVerified:false,canExecute:false});
 }
 if(existing?.footprintCells?.length===14)
  add(existing.footprintCells,existing.origin,existing.ascent.dx,existing.ascent.dz,'B113_FOOTPRINT_RECHECK');
 // Broader search only when B113 could not place a straight module. Keep the
 // source B113 2x7 dimensions, don't infer working spiral staircases.
 if(!stair.reservation.sample){
  const seen=new Set();
  for(const [dx,dz] of D)
   for(let oz=-9;oz<=5;oz++)for(let ox=-9;ox<=5;ox++){
    const origin={x:core.x+ox,z:core.z+oz},cells=footprint(origin,dx,dz);
    const key=cells.map(K).sort().join(';');if(seen.has(key))continue;seen.add(key);
    searched++;add(cells,origin,dx,dz,'EXTENDED_STRAIGHT_2X7_FOOTPRINT');
   }
 }
 candidates.sort((a,b)=>b.score-a.score||a.kind.localeCompare(b.kind,'en-US')||
  a.origin.z-b.origin.z||a.origin.x-b.origin.x);
 const winner=candidates[0]??null;
 return {fromLevel:stair.fromLevel,toLevel:stair.toLevel,coreIndex:stair.coreIndex,
  legacyOvershoot:stair.upperOvershoot,
  priorEligibleFootprints:stair.reservation.eligibleFootprints,
  checkedAdditionalFootprints:searched,
  sourcePreservingReservationOptions:nonColliding,
  selected:winner,
  hypothesis:!winner?'NO_SOURCE_PRESERVING_STRAIGHT_2X7_CANDIDATE':
   winner.hypotheticalInterfloorLink?
    'CONDITIONAL_UPPER_LOWER_GALLERY_LINK_ONLY':'STAIR_GALLERY_JUNCTIONS_NOT_BOTH_CONNECTED',
  requiredRedesign:!winner?
   ['CORE_ENLARGEMENT_OR_ROOM_RELOCATION','TURNING_OR_SWITCHBACK_STAIR_RESEARCH']:
   ['SUPPORT_FLOOR','FLOOR_CEILING_APERTURE','3D_BODY_AND_HALF_STEP_CLEARANCE',
    ...(!winner.hypotheticalInterfloorLink?['LANDING_TO_GALLERY_REALIGNMENT']:[])],
  actualTraversabilityCertified:false,worldOperations:0};
}
/** Evaluate B113 problematic bedroom without editing source anchors or room walls. */
function furnitureRelocationAdvisory(room,design,b110,b111){
 if(room.issues.length===0)return null;
 const source=design.plan.floors[room.level].rooms.find(r=>r.id===room.roomId);
 const door=b110.doors.find(x=>x.roomId===room.roomId&&x.level===room.level);
 const orig=b111.rooms.find(x=>x.roomId===room.roomId&&x.level===room.level);
 if(!source||!door||!orig)throw Error('B114_ROOM_SOURCE_UNAVAILABLE');
 const inner=p=>p.x>source.x&&p.x<source.x+source.width-1&&
  p.z>source.z&&p.z<source.z+source.depth-1;
 let trials=0,best={issues:room.issues.length,proposal:null},current=orig.furniture;
 const beds=current.filter(f=>f.role==='bed');
 // B113 already tried fixed-anchor rotations; B114 explicitly labels
 // moved-anchor alternatives as unapproved redesign proposals.
 for(const bed of beds){
  for(let z=source.z+1;z<source.z+source.depth-1;z++)
   for(let x=source.x+1;x<source.x+source.width-1;x++){
    const next={x,z};if(K(next)===K(bed.anchor))continue;
    if(current.some(f=>f!==bed&&K(f.anchor)===K(next)))continue;
    const revised=current.map(f=>f===bed?
     {...f,anchor:next,footprint:[next,{x:next.x+1,z:next.z}]}:f);
    if(!inner(revised.find(f=>f.fixtureIndex===bed.fixtureIndex).footprint[1]))continue;
    const report=inspectRoomAssembly({...source,level:room.level},door,
     {...orig,furniture:revised});
    trials++;
    if(report.issues.length<best.issues){
     best={issues:report.issues.length,proposal:{
      fixtureIndex:bed.fixtureIndex,from:{...bed.anchor},to:next,
      resultingIssues:[...report.issues],interactionClear:report.offlineOccupancyClear,
      anchorRelocationRequiresUserDesignReview:true}};
    }
    if(best.issues===0)break;
   }
  if(best.issues===0)break;
 }
 return {buildingId:design.candidateId,roomId:room.roomId,level:room.level,
  priorIssueCodes:[...room.issues],originalFixedAnchorStatus:'B113_UNRESOLVED',
  testedUnapprovedAnchorRelocations:trials,
  bestIssueCount:best.issues,proposal:best.proposal,
  remainingAction:best.issues===0?
   'OPTION_ONLY_SOURCE_ANCHOR_NOT_MOVED':'ROOM_FURNITURE_OR_DIMENSIONS_REQUIRE_REDRAFT',
  appliedToOriginal:false,physicalUsabilityCertified:false};
}
function conditionalAccess(design,caseB113,links){
 const perFloor=design.plan.floors.map(f=>gallerySet(design,caseB113.horizontalRoutes[f.level],f.level));
 const starts=design.plan.floors[0].exits.flatMap(e=>e.edge);
 const reached=perFloor.map(()=>new Set()),q=[];
 for(const p of starts){
  if(!perFloor[0].has(K(p)))continue;
  for(const k of reachable(p,perFloor[0]))if(!reached[0].has(k)){
   reached[0].add(k);
  }
 }
 if(reached[0].size)q.push(0);
 const crossLinks=links.filter(l=>l.selected?.hypotheticalInterfloorLink);
 let changed=true;
 // Each activated floor component is reached through a conditional (unverified)
 // vertical step. This gives an optimistic upper bound, not actual accessibility.
 while(changed){
  changed=false;
  for(const l of crossLinks){
   for(const [src,dst,srcLand,dstLand] of [
    [l.fromLevel,l.toLevel,l.selected.lowerLanding,l.selected.upperLanding],
    [l.toLevel,l.fromLevel,l.selected.upperLanding,l.selected.lowerLanding]]){
    if(!srcLand.some(p=>neighbors(p).some(n=>reached[src].has(K(n)))))continue;
    for(const p of dstLand)for(const n of neighbors(p)){
     if(!perFloor[dst].has(K(n)))continue;
     for(const k of reachable(n,perFloor[dst]))if(!reached[dst].has(k)){
      reached[dst].add(k);changed=true;
     }
    }
   }
  }
 }
 const allDoors=design.plan.floors.flatMap(f=>caseB113.rooms.filter(r=>r.level===f.level)
  .map(r=>({level:f.level,roomId:r.roomId,
   source:design.plan.floors[f.level].rooms.find(x=>x.id===r.roomId)?.conceptualDoorOpening?.outside})));
 const nominalRoomReach=allDoors.filter(d=>d.source&&reached[d.level].has(K(d.source))).length;
 return {groundEntrySeeds:starts.length,originalFloorLevels:perFloor.length,
  hypotheticalConnectedFloors:reached.filter(s=>s.size>0).length,
  hypotheticalGroundToRoomPaths:nominalRoomReach,totalRooms:allDoors.length,
  conditionalStairInterfaceLinks:crossLinks.length,
  assumption:'VERTICAL_EDGES_SIMULATED_ONLY_NO_ACTUAL_MINECRAFT_STAIR_ACCESS',
  allRoomPathsPhysicallyCertified:false};
}
export function analyzeB114Case(caseB113,design,b110,b111){
 if(caseB113.id!==design.candidateId||caseB113.id!==b110.id||
 caseB113.id!==b111.id||caseB113.horizontalRoutes.length!==design.plan.floors.length)
  throw Error('B114_PARENT_CASE_ID_MISMATCH');
 const links=caseB113.stairs.map(s=>candidateOptions(s,design,caseB113.horizontalRoutes));
 const furniture=caseB113.rooms.filter(r=>r.issues.length)
  .map(r=>furnitureRelocationAdvisory(r,design,b110,b111));
 const conditional=conditionalAccess(design,caseB113,links);
 const t={
  sourceStairLinks:links.length,
  b113StraightFootprintCandidates:links.filter(s=>s.priorEligibleFootprints>0).length,
  extendedFootprintCandidates:links.filter(s=>!s.priorEligibleFootprints&&s.selected!==null).length,
  stillWithoutStraightFootprint:links.filter(s=>s.selected===null).length,
  conditionalGalleryToGalleryInterfaces:links.filter(s=>s.selected?.hypotheticalInterfloorLink).length,
  interfacesNeedingGalleryChange:links.filter(s=>s.selected&&!s.selected.hypotheticalInterfloorLink).length,
  unverifiedBedroomRooms:furniture.length,
  bedroomRelocationOptions:furniture.filter(x=>x.bestIssueCount===0).length,
  bedroomsStillNeedRedesign:furniture.filter(x=>x.bestIssueCount!==0).length,
  proposedAdditionalCorridorCells:caseB113.horizontalRoutes.reduce((n,r)=>n+r.repair.addedCells.length,0),
  conceptualRooms:caseB113.rooms.length,
  hypotheticalGroundToRooms:conditional.hypotheticalGroundToRoomPaths,
  hypotheticalFloorsReached:conditional.hypotheticalConnectedFloors,
  certifiedStaircases:0,actualBuildCommands:0,worldContacts:0};
 return {id:caseB113.id,typology:caseB113.typology,levels:caseB113.levels,
  sourceB113Integrity:caseB113.source.b111Digest,stairs:links,interiorReview:furniture,
  conditionalRoutes:conditional,metrics:t,legacyGeometryRetained:true,
  proposalsApplied:false,minecraftVersionCompatibility:'UNVERIFIED',
  physicalWholeBuildingWalkabilityCertified:false};
}
