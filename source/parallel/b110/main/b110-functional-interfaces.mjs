/** B110 — READ-ONLY construction-feasibility bridge.
 * Authoritative geometry: B104 rooms/doors, B103 circulation, B105 envelope, core interfaces.
 * Bedrock API docs are reference candidates ONLY: Education edition 26.3/26.32 compatibility
 * has not been inspected in the installed game, so no material is construction-certified.
 * ZERO world contacts, commands, world coordinates, or executable placements.
 */
import {createHash} from 'node:crypto';
import {auditB105} from '../../b105/main/b105-building-volume.mjs';
import {auditB103} from '../../b103/main/b103-circulation-3d.mjs';

export const B110_REFERENCE=Object.freeze({
 docs:{
  blockList:'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/vanillalistingsreference/blocks?view=minecraft-bedrock-stable',
  stateList:'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/intrinsicblockstateslist?view=minecraft-bedrock-stable',
  educationVersion:'https://edusupport.minecraft.net/hc/en-us/articles/360047556451-Minecraft-Education-Change-Log'
 },
 targetEdition:'MINECRAFT_EDUCATION',
 requestedVersionFamily:'26.3',
 latestSpecificVersionConfirmedInLocalGame:false,
 evidenceBasis:'BEDROCK_STABLE_DOCUMENTATION_ONLY',
 readiness:'EDUCATION_TARGET_UNVERIFIED'
});
export const B110_BLOCK_CANDIDATES=Object.freeze({
 door:{id:'minecraft:spruce_door',states:['minecraft:cardinal_direction','door_hinge_bit','open_bit','upper_block_bit'],scope:'TWO_BLOCK_PAIR',verifiedEducation:false},
 stairs:{id:'minecraft:oak_stairs',states:['weirdo_direction','upside_down_bit','minecraft:corner'],scope:'RISING_FLIGHT',verifiedEducation:false},
 frame:{id:'minecraft:oak_planks',states:[],scope:'SOLID_FACADE',verifiedEducation:false},
 glass:{id:'minecraft:glass',states:[],scope:'EXTERIOR_GLAZING',verifiedEducation:false},
 bed:{id:'minecraft:bed',states:['direction','head_piece_bit','occupied_bit'],scope:'TWO_CELL_FURNITURE',verifiedEducation:false},
 shelf:{id:'minecraft:bookshelf',states:[],scope:'WALL_BACKED_STORAGE',verifiedEducation:false},
 desk:{id:'minecraft:oak_planks',states:[],scope:'DESK_ASSEMBLY_PROXY',verifiedEducation:false},
 seating:{id:'minecraft:oak_stairs',states:['weirdo_direction','upside_down_bit','minecraft:corner'],scope:'FURNITURE_ASSEMBLY_PROXY',verifiedEducation:false},
 generic:{id:'minecraft:barrel',states:['facing_direction','open_bit'],scope:'GENERAL_STORAGE',verifiedEducation:false}
});
const k=(x,y,z)=>x+','+y+','+z;
const xy=(x,z)=>x+','+z;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const safe=o=>o?.constructionApproved===false&&o.worldContacts===0&&
 o.worldCoordinates===null&&o.BuildPlan?.status==='NOT_PREPARED'&&
 Array.isArray(o.BuildPlan.operations)&&o.BuildPlan.operations.length===0&&
 o.BuildPlan.commandCount===0&&o.BuildPlan.worldCoordinates===null;
const roomInside=(r,x,z)=>x>=r.x&&x<r.x+r.width&&z>=r.z&&z<r.z+r.depth;
const sideVector={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]};
const innerVector={N:[0,1],S:[0,-1],E:[-1,0],W:[1,0]};
const ring=[{x:0,z:0},{x:1,z:0},{x:2,z:0},{x:2,z:1},{x:2,z:2},{x:1,z:2}];
function fail(t){throw Error('B110_'+t);}
export function inspectBlockCandidate(role){
 if(!Object.hasOwn(B110_BLOCK_CANDIDATES,role))return {role,status:'UNKNOWN_BLOCK_ROLE',failClosed:true,executable:false};
 const c=B110_BLOCK_CANDIDATES[role];
 return {role,referenceBlockId:c.id,referenceStateNames:[...c.states],
  referenceStatus:'BEDROCK_DOCUMENTED',education26_3Status:'UNVERIFIED_LOCAL_BUILD',
  orientationValuesVerified:false,placementOrderVerified:false,
  physicallyUsableVerified:false,executable:false};
}
function checkParents(d,v){
 if(d?.schema!=='minecraftaibuilder-b104-co-design-v1'||
 v?.schema!=='minecraftaibuilder-b105-building-volume-ir-v1'||
 !d.readonlyDesign||!v.readonlyArchitecturalIR||!safe(d)||!safe(v)||
 d.candidateId!==v.candidateId||!d.result?.conceptualSafe||
 v.typology!==d.plan?.typology||v.levels!==d.plan.floors.length)fail('UNSAFE_PARENT');
 const audit=auditB105(v,d.plan),threeD=auditB103(d.plan);
 if(audit.issueCount||audit.envelopeConflicts||audit.roofCoverageGaps||
 audit.portalVoidGaps||audit.furniturePathViolations||audit.stairInterfaceGaps||
 threeD.solidAirCollisions||threeD.doorway2HighViolations||
 threeD.spiralProxyClearanceViolations)fail('PARENT_SPATIAL_AUDIT');
}
const fixtureRoles={
 SHELF_OR_READING_PROXY:'shelf',
 SLEEP_OR_STORAGE_PROXY:'bed',
 DESK_OR_MEETING_PROXY:'desk',
 SEATING_PROXY:'seating',
 GENERAL_ROOM_FIXTURE_PROXY:'generic'
};
export function deriveB110Interfaces(design,volume){
 checkParents(design,volume);
 const vox=new Map(volume.voxels.map(p=>[k(p.x,p.y,p.z),p]));
 if(vox.size!==volume.voxels.length)fail('DUPLICATE_VOLUME_COORDINATES');
 const doors=[],exits=[],stairs=[],fixtures=[],issues=[];
 const pushIssue=(code,ref)=>issues.push({code,ref});
 for(const f of design.plan.floors){
  const base=f.level*5;
  const gallery=new Set(f.gallery.map(p=>xy(p.x,p.z)));
  const floorR=volume.interior.filter(r=>r.level===f.level);
  for(const room of f.rooms){
   const entry=room.conceptualDoorOpening;
   const iv=innerVector[entry?.side];
   if(!iv||!entry.outside)fail('MISSING_ROOM_ENTRY');
   const inside={x:entry.x+iv[0],z:entry.z+iv[1]};
   const a=[{x:entry.x,z:entry.z},entry.outside,inside];
   const twoHigh=a.every(p=>[base+1,base+2].every(y=>{
    const v=vox.get(k(p.x,y,p.z));
    return !v||v.kind==='EXTERIOR_PORTAL_VOID_PROXY';
   }));
   const route=f.roomRoutes.find(x=>x.roomId===room.id);
   const connected=!!route?.connected&&gallery.has(xy(entry.outside.x,entry.outside.z))&&
    roomInside(room,inside.x,inside.z)&&twoHigh;
   if(!connected)pushIssue('ROOM_DOORWAY_CLEARANCE_OR_ROUTE',f.level+':'+room.id);
   doors.push({roomId:room.id,level:f.level,side:entry.side,
    localLower:{x:entry.x,y:base+1,z:entry.z},
    localUpper:{x:entry.x,y:base+2,z:entry.z},
    interiorCell:inside,externalGalleryCell:entry.outside,
    clearTwoHigh:twoHigh,conceptualRouteConnected:connected,
    blockCandidate:'door',hinge:'UNASSIGNED',openState:'UNASSIGNED',
    realBlockPlacementValidated:false,actualUsabilityCertified:false});
   const furnished=floorR.find(x=>x.roomId===room.id);
   if(!furnished||furnished.fixtures.length<1||!furnished.entry||
    furnished.walkableInteriorCells<3)
    fail('MISSING_VALID_PARENT_FIXTURE');
   const role=fixtureRoles[furnished.fixtureKind];
   if(!role)fail('UNKNOWN_FURNITURE_KIND');
   const used=new Set(furnished.fixtures.map(p=>xy(p.x,p.z)));
   for(const pos of furnished.fixtures){
    const possiblePair=[[1,0],[-1,0],[0,1],[0,-1]]
     .map(([dx,dz])=>({x:pos.x+dx,z:pos.z+dz}))
     .find(p=>p.x>room.x&&p.x<room.x+room.width-1&&
      p.z>room.z&&p.z<room.z+room.depth-1&&
      xy(p.x,p.z)!==xy(inside.x,inside.z)&&!used.has(xy(p.x,p.z)));
    const multipiece=role==='bed';
    fixtures.push({roomId:room.id,level:f.level,role,sourceKind:furnished.fixtureKind,
     localAnchor:{x:pos.x,y:base+1,z:pos.z},
     candidateSecondaryCell:multipiece?possiblePair??null:null,
     twoCellCandidateFits:multipiece?!!possiblePair:null,
     sourceCellPreserved:true,roomAccessibleBeforePlacement:true,
     hypotheticalFurnitureVolumeOnly:true,physicalPlacementValidated:false});
    if(multipiece&&!possiblePair)pushIssue('TWO_CELL_BED_FIT_UNVERIFIED',f.level+':'+room.id);
   }
  }
  for(const [ei,e]of f.exits.entries()){
   const vec=sideVector[e.side];
   if(!vec||e.edge.length!==2)fail('BAD_EXIT_PARENT');
   const cells=e.edge.map(p=>({x:p.x+vec[0],z:p.z+vec[1]}));
   const voids=cells.every(p=>[base+1,base+2].every(y=>
    vox.get(k(p.x,y,p.z))?.kind==='EXTERIOR_PORTAL_VOID_PROXY'));
   const galleryLinked=e.edge.every(p=>gallery.has(xy(p.x,p.z)));
   if(!voids||!galleryLinked)pushIssue('EXIT_PORTAL_SOURCE_MISMATCH',f.level+':'+ei);
   exits.push({level:f.level,index:ei,side:e.side,
    openingCells:cells,insideGallery:e.edge,
    localYRange:[base+1,base+2],twoWideGalleryLinked:galleryLinked,
    originalAirCellsPresent:voids,candidateRole:'door',
    actualExitInstalled:false,actualEgressCertified:false});
  }
 }
 for(const link of volume.verticalLinks){
  const core=design.plan.cores[link.coreIndex];
  if(!core||link.to!==link.from+1)fail('INVALID_VERTICAL_PARENT');
  const steps=ring.map((p,i)=>({
   x:core.x+p.x,y:link.from*5+1+i,z:core.z+p.z,
   tentativeBlockRole:'stairs',riseIndex:i,
   headroomAirSample:[{x:core.x+p.x,y:link.from*5+2+i,z:core.z+p.z},
    {x:core.x+p.x,y:link.from*5+3+i,z:core.z+p.z}]
  }));
  const interiorCoreOnly=steps.every(s=>s.x>=core.x&&s.x<core.x+3&&
   s.z>=core.z&&s.z<core.z+3);
  const noEnvelopeConflict=steps.every(s=>[s,...s.headroomAirSample]
   .every(p=>!vox.has(k(p.x,p.y,p.z))));
  const lower=volume.junctions.find(j=>j.level===link.from&&j.coreIndex===link.coreIndex);
  const upper=volume.junctions.find(j=>j.level===link.to&&j.coreIndex===link.coreIndex);
  const junctionsPresent=!!lower&&!!upper;
  if(!interiorCoreOnly||!noEnvelopeConflict||!junctionsPresent)
   pushIssue('STAIR_PROXY_HEADROOM_OR_JUNCTION',link.coreIndex+':'+link.from);
  stairs.push({coreIndex:link.coreIndex,fromLevel:link.from,toLevel:link.to,
   steps,stairCoreFootprint:{...core},junctionsPresent,
   nominalSixTreads:true,unobstructedByB105Envelope:noEnvelopeConflict,
   connectsExistingB105Landings:junctionsPresent,
   realStairRiserAndTreadGeometryValidated:false,
   traversableInMinecraft:false,physicalEgressCertified:false,
   blockCandidate:'stairs'});
 }
 const metrics={conceptRooms:doors.length,conceptualDoors:doors.length,
  nominalConnectedDoorways:doors.filter(d=>d.conceptualRouteConnected).length,
  twoHighDoorClearances:doors.filter(d=>d.clearTwoHigh).length,
  exteriorOpeningCandidates:exits.length,
  twoWideExitPairsWithAir:exits.filter(e=>e.originalAirCellsPresent&&e.twoWideGalleryLinked).length,
  stairLinks:stairs.length,stairTreadProxies:stairs.reduce((n,s)=>n+s.steps.length,0),
  stairLinksWithNoEnvelopeConflict:stairs.filter(s=>s.unobstructedByB105Envelope).length,
  fixtureAnchors:fixtures.length,bedWithSecondCellCandidate:fixtures.filter(f=>f.role==='bed'&&f.twoCellCandidateFits).length,
  bedNeedsLayoutReview:fixtures.filter(f=>f.role==='bed'&&!f.twoCellCandidateFits).length,
  geometryIssues:issues.length,realDoorsCertified:0,realStairsCertified:0,
  physicalFinishedRooms:0,verifiedEducationBlockStates:0,actualWorldOperations:0};
 const b={schema:'minecraftaibuilder-b110-functional-interface-concepts-v1',
  id:volume.candidateId,typology:volume.typology,levels:volume.levels,
  parentDesign:'B104_READ_ONLY',parentVolume:'B105_READ_ONLY',
  doors,exits,stairs,fixtures,issues,metrics,
  materialEvidence:B110_REFERENCE,worldContacts:0,
  worldCoordinates:null,constructionApproved:false,executionAllowed:false,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...b,digest:hash(b)};
}
export function auditB110Model(b){
 if(b?.schema!=='minecraftaibuilder-b110-functional-interface-concepts-v1'||
 !safe(b)||b.executionAllowed!==false||b.materialEvidence?.readiness!=='EDUCATION_TARGET_UNVERIFIED'||
 b.materialEvidence.latestSpecificVersionConfirmedInLocalGame!==false||
 b.digest?.length!==64)return false;
 const {digest,...rest}=b;
 if(digest!==hash(rest)||!Array.isArray(b.doors)||!Array.isArray(b.fixtures)||
 !Array.isArray(b.stairs)||!Array.isArray(b.exits))return false;
 const m=b.metrics;
 return b.doors.length===m.conceptRooms&&b.doors.length===m.conceptualDoors&&
 b.exits.length===m.exteriorOpeningCandidates&&b.stairs.length===m.stairLinks&&
 b.fixtures.length===m.fixtureAnchors&&m.stairTreadProxies===b.stairs.length*6&&
 m.nominalConnectedDoorways===b.doors.filter(d=>d.conceptualRouteConnected).length&&
 m.twoHighDoorClearances===b.doors.filter(d=>d.clearTwoHigh).length&&
 m.stairLinksWithNoEnvelopeConflict===b.stairs.filter(s=>s.unobstructedByB105Envelope).length&&
 m.twoWideExitPairsWithAir===b.exits.filter(e=>e.originalAirCellsPresent&&e.twoWideGalleryLinked).length&&
 m.bedNeedsLayoutReview===b.fixtures.filter(f=>f.role==='bed'&&!f.twoCellCandidateFits).length&&
 m.bedWithSecondCellCandidate===b.fixtures.filter(f=>f.role==='bed'&&f.twoCellCandidateFits).length&&
 m.geometryIssues===b.issues.length&&m.realDoorsCertified===0&&m.realStairsCertified===0&&
 m.physicalFinishedRooms===0&&m.verifiedEducationBlockStates===0&&
 m.actualWorldOperations===0&&
 b.doors.every(d=>d.actualUsabilityCertified===false&&d.realBlockPlacementValidated===false)&&
 b.stairs.every(s=>s.traversableInMinecraft===false&&
 s.physicalEgressCertified===false&&s.realStairRiserAndTreadGeometryValidated===false)&&
 b.fixtures.every(f=>f.physicalPlacementValidated===false)&&
 b.exits.every(e=>e.actualEgressCertified===false);
}
