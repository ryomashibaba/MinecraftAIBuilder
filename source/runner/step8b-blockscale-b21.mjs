/**
 * B21 / M3-C: deterministic, schematic-local ONE-BLOCK-SCALE *review* geometry.
 * Absolutely not a BuildPlan: no block IDs, world coordinates, commands, network,
 * engine calls, or changes to frozen B20 / Legacy / Minecraft data.
 * No rounding of B18 floating geometry. This is a separately specified alternative.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readB18PinnedInput} from './step8b-interior-geometry-b18.mjs';
import {buildB20Staging,validateB20Staging} from './step8b-staging-contract-b20.mjs';
import {loadB10Frozen,maskForFloor} from './step8b-interior-contract-b10.mjs';
const fail=c=>{const e=new Error('B21_'+c);e.code='B21_'+c;throw e;};
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const cellKey=p=>`${p.x},${p.z}`;
const vKey=(x,y,z)=>`${x},${y},${z}`;
const inBounds=(p,w,d)=>Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p?.z)&&p.x>=0&&p.z>=0&&p.x<w&&p.z<d;
const validY=y=>Number.isSafeInteger(y)&&y>=0&&y<256;
const safePlan=()=>({status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});

/** Plan a review-only wall column on the room side of a nominal inter-cell wall. */
export function designB21Wall(edge,door,floor,sourceMask,avoidDoorCells=new Set()){
 const {width:w,depth:d}=floor?.dimensions??{},[bottom,top]=floor?.localYRange??[];
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(d)||!validY(bottom)||!validY(top)||top-bottom<4||
   !(Array.isArray(sourceMask)||sourceMask instanceof Uint8Array)||sourceMask.length!==w*d||
   !Array.isArray(floor.corridorReservation)||!Array.isArray(floor.stairReservation)||!Array.isArray(floor.elevatorReservation)||
   !edge?.nominal||(!inBounds(edge.from,w,d)&&!inBounds(edge.to,w,d))||
   Math.abs(edge.from.x-edge.to.x)+Math.abs(edge.from.z-edge.to.z)!==1||
   !['NOMINAL_WALL_BOUNDARY','NOMINAL_DOOR_INTERFACE'].includes(edge.kind))fail('INVALID_WALL');
 const protectedCells=new Set([...floor.corridorReservation,...floor.stairReservation,...floor.elevatorReservation].map(cellKey));
 const inside=p=>!!sourceMask[p.z*w+p.x];
 const open=edge.kind==='NOMINAL_DOOR_INTERFACE';
 if(open!==!!door||door&&(
   door.boundaryId!==edge.id||door.openingPhysicalVerified!==false||
   cellKey(door.doorCell)===cellKey(door.hallCell)||
   ![edge.from,edge.to].some(p=>cellKey(p)===cellKey(door.doorCell))||
   ![edge.from,edge.to].some(p=>cellKey(p)===cellKey(door.hallCell))||
   !protectedCells.has(cellKey(door.hallCell))||protectedCells.has(cellKey(door.doorCell))
 ))fail('UNTRUSTED_DOOR');
 const options=[edge.from,edge.to].filter(p=>inBounds(p,w,d)).map(p=>({p,score:(inside(p)?10:0)+(protectedCells.has(cellKey(p))?-20:0)+(avoidDoorCells.has(cellKey(p))?-9:0)}));
 options.sort((a,b)=>b.score-a.score||a.p.z-b.p.z||a.p.x-b.p.x);
 const chosen=open?door.doorCell:options[0].p;
 const reservationCollision=protectedCells.has(cellKey(chosen));
 const envelopeMismatch=!inside(chosen);
 // The floor slab (at bottom) is not touched; 1-block wide wall spans nominal
 // levels bottom+1 .. top-1. A door reserves TWO full-height block voids.
 const solids=[],voids=[];
 for(let y=bottom+1;y<top;y++){
  if(open&&(y===bottom+1||y===bottom+2))voids.push({x:chosen.x,y,z:chosen.z});
  else solids.push({x:chosen.x,y,z:chosen.z});
 }
 if(solids.length+voids.length!==top-bottom-1)fail('COLUMN_SIZE');
 return {id:edge.id,kind:open?'REVIEW_ONE_CELL_DOOR_APERTURE':'REVIEW_ONE_CELL_PARTITION',
  floorId:floor.id,selectedLocalCell:{x:chosen.x,z:chosen.z},
  optionCellCount:2,localGridVolumes:solids,doorVoidCells:voids,doorPortId:door?.id??null,
  risk:{reservationCollision,envelopeMismatch,otherPanelConflict:false},
  alignment:'INTEGER_SCHEMATIC_GRID_NOT_WORLD',doorMaterialAndHinge:'UNKNOWN',
  physicallyValidated:false,engineMapped:false,commands:[],blockIds:[]};
}

/** Each step occupies one grid cell below its top elevation, not a Minecraft stair block. */
export function designB21Stair(route,lower,upper,cutout){
 if(route?.kind!=='HYPOTHETICAL_STAIR_RISER_ROUTE'||route.physicalStatus!=='NOT_VERIFIED'||!route.routeFound||
  route.lowerFloor!==lower?.id||route.upperFloor!==upper?.id||
  !Array.isArray(lower?.localYRange)||!Array.isArray(upper?.localYRange)||
  lower.localYRange[1]!==upper.localYRange[0]||
  !Number.isSafeInteger(route.riserCount)||route.riserCount!==upper.localYRange[0]-lower.localYRange[0]||
  !Array.isArray(route.treads)||route.treads.length!==route.riserCount||
  cutout?.id!==route.id||cutout.cutoutActuallyApplied!==false||
  !Array.isArray(cutout.openingCandidates)||cutout.openingCandidates.length!==2)fail('INVALID_STAIR');
 const site=new Set(lower.stairReservation.map(cellKey));
 const upperSite=new Set(upper.stairReservation.map(cellKey));
 const cutset=new Set(cutout.openingCandidates.map(cellKey));
 const treads=[],headVolumes=[],seen=new Set();
 for(let i=0;i<route.treads.length;i++){
  const t=route.treads[i],p=t.cell,y=lower.localYRange[0]+i;
  if(!site.has(cellKey(p))||!upperSite.has(cellKey(p))||seen.has(cellKey(p))||
     t.topLocalY!==y+1||t.riser!==i+1||!validY(y))fail('STAIR_SITE_OR_RISE');
  seen.add(cellKey(p));
  treads.push({x:p.x,y,z:p.z});
  // Two unoccupied grid cells above the candidate block's upper face.
  headVolumes.push({x:p.x,y:y+1,z:p.z},{x:p.x,y:y+2,z:p.z});
 }
 const upperPlateY=upper.localYRange[0];
 const intersection=headVolumes.filter(v=>v.y===upperPlateY&&cutset.has(cellKey(v)));
 const uncut=headVolumes.filter(v=>v.y===upperPlateY&&!cutset.has(cellKey(v)));
 return {id:route.id,lowerFloor:lower.id,upperFloor:upper.id,candidateUnitStepCells:treads,
  nominalTwoBlockHeadspaceCells:headVolumes,candidateUpperFloorCutouts:cutout.openingCandidates,
  nominalUpperPlateIntersections:intersection.length,upperPlateUncutAtHead:uncut,
  topApproachCandidates:route.topApproachCandidates,lowerApproachCandidates:route.lowerApproachCandidates,
  supportsProven:false,structuralAnalysis:'NOT_RUN',headspacePhysicallyVerified:false,
  alternateStairBlockStatesValidated:false,approvedForConstruction:false,blocks:[],operations:[]};
}

function verifyBaseline(root){
 if(typeof root!=='string'||!root)fail('ROOT');
 const b20=JSON.parse(fs.readFileSync(path.join(root,'reports/B20_NONEXECUTABLE_STAGING.json'),'utf8'));
 validateB20Staging(b20,root);
 if(JSON.stringify(buildB20Staging(root))!==JSON.stringify(b20))fail('B20_REPORT_CHANGED');
 return b20;
}

export function buildB21Blockscale(root){
 const b20=verifyBaseline(root),ir=readB18PinnedInput(root),{b7}=loadB10Frozen(root);
 const byIR=new Map(ir.buildings.map(x=>[x.id,x]));
 const bySource=new Map(b7.candidates.map(x=>[`${x.program}/${x.id}`,x]));
 let walls=0,doors=0,steps=0,cutoutCells=0,reservationHits=0,facadeHits=0,doorInterferences=0,
     doorPortsWithCollision=0,collisionBlockerAlternateProtected=0,collisionBlockerAlternateOther=0,
     stairWallHits=0,uncutSlabs=0;
 const savedM2=JSON.parse(fs.readFileSync(path.join(root,'reports/B18_M2_LOCAL_GEOMETRY.json'),'utf8'));
 const byM2=new Map(savedM2.buildings.map(x=>[x.id,x]));
 const buildings=b20.projects.map(b=>{
  const bi=byIR.get(b.id),src=bySource.get(b.id);
  if(!bi||!src||b.cutouts.length!==bi.verticalInterfaces.length)fail('FROZEN_ID_OR_STAIR_COUNT');
  const floors=bi.floors.map(f=>{
   const mask=maskForFloor(src.sourcePredictedRectangles,bi.dimensions.width,bi.dimensions.depth,f.level-1);
   const doorsByBoundary=new Map(f.roomDoorInterfaces.map(x=>[x.boundaryId,x]));
   const avoidDoorCells=new Set(f.roomDoorInterfaces.map(x=>cellKey(x.doorCell)));
   const panels=f.wallBoundaries.map(edge=>designB21Wall(edge,doorsByBoundary.get(edge.id),f,mask,avoidDoorCells));
   const solids=new Map(),doorVoids=new Map();
   for(const panel of panels){
    walls++;doors+=panel.doorPortId?1:0;
    if(panel.risk.reservationCollision)reservationHits++;
    if(panel.risk.envelopeMismatch)facadeHits++;
    for(const v of panel.localGridVolumes){const k=vKey(v.x,v.y,v.z);if(!solids.has(k))solids.set(k,[]);solids.get(k).push(panel.id);}
    for(const v of panel.doorVoidCells){const k=vKey(v.x,v.y,v.z);if(!doorVoids.has(k))doorVoids.set(k,[]);doorVoids.get(k).push(panel.id);}
   }
   const collidedPorts=new Set(),wallById=new Map(f.wallBoundaries.map(w=>[w.id,w]));
   for(const [k,ids] of doorVoids){if(solids.has(k)){
      doorInterferences++;
      for(const panel of panels)if(ids.includes(panel.id)){panel.risk.otherPanelConflict=true;if(panel.doorPortId)collidedPorts.add(panel.doorPortId);}
   }}
   doorPortsWithCollision+=collidedPorts.size;
   const protectedCell=new Set([...f.corridorReservation,...f.stairReservation,...f.elevatorReservation].map(cellKey));
   for(const portId of collidedPorts){
    const p=panels.find(w=>w.doorPortId===portId),v=p.doorVoidCells[0];
    const blockerIds=solids.get(vKey(v.x,v.y,v.z))??[];
    for(const blockerId of blockerIds){
     const edge=wallById.get(blockerId),alternative=[edge.from,edge.to].find(x=>x.x!==v.x||x.z!==v.z);
     if(alternative&&protectedCell.has(cellKey(alternative)))collisionBlockerAlternateProtected++;
     else collisionBlockerAlternateOther++;
    }
   }
   return {id:f.id,nominalY:[...f.localYRange],wallCandidates:panels,
    observations:{uniqueSolidCells:solids.size,duplicateSolidAssignments:[...solids.values()].filter(ids=>ids.length>1).length,
     doorVoidCells:doorVoids.size,doorVoidBlockedByWall:[...doorVoids.keys()].filter(x=>solids.has(x)).length},
    designOnly:true,applied:false};
  });
  const byFloor=new Map(bi.floors.map(f=>[f.id,f]));
  const stairs=b.cutouts.map((cut,i)=>{
   const link=bi.verticalInterfaces[i];
   if(link.id!==cut.id)fail('STAIR_LINK_MISMATCH');
   // Use immutable B18 saved report as historical evidence; read only once.
   const stair=byM2.get(b.id)?.stairRoutes.find(x=>x.id===cut.id);
   if(!stair)fail('STAIR_MISSING');
   const result=designB21Stair(stair,byFloor.get(link.fromFloor),byFloor.get(link.toFloor),cut);
   steps+=result.candidateUnitStepCells.length;
   cutoutCells+=result.candidateUpperFloorCutouts.length;
   uncutSlabs+=result.upperPlateUncutAtHead.length;
   // Conservative collision: inspect every wall candidate on both adjacent floors.
   const floorWalls=floors.filter(f=>[link.fromFloor,link.toFloor].includes(f.id)).flatMap(f=>f.wallCandidates);
   const solids=new Set(floorWalls.flatMap(w=>w.localGridVolumes.map(v=>vKey(v.x,v.y,v.z))));
   const collisions=[...result.candidateUnitStepCells,...result.nominalTwoBlockHeadspaceCells].filter(v=>solids.has(vKey(v.x,v.y,v.z)));
   stairWallHits+=collisions.length;
   return {...result,partitionIntersections:collisions,stairClearanceState:collisions.length||result.upperPlateUncutAtHead.length?'REVIEW_CONFLICT':'MODEL_ONLY_NO_GRID_CONFLICT',
    physicallyValid:false};
  });
  return {id:b.id,nominalFloorHeight:bi.floorHeightNominal,dimensions:bi.dimensions,floors,stairs,
   coordinateFrame:'SCHEMATIC_LOCAL_ONE_BLOCK_GRID_NOT_WORLD',frozenLayoutModified:false};
 });
 const counts={buildings:buildings.length,floors:30,wallColumns:walls,doorOpenings:doors,stairInterfaces:b20.counts.stairInterfaces,
  stairUnitCells:steps,upperSlabCutoutReviewCells:cutoutCells,wallReservationHits:reservationHits,
  wallOutsidePredictedFootprint:facadeHits,doorVoidOccupiedByOtherWalls:doorInterferences,
  doorPortsWithGridCollision:doorPortsWithCollision,
  alternativeWallPositionIsProtected:collisionBlockerAlternateProtected,
  alternativeWallPositionIsOther:collisionBlockerAlternateOther,
  stairAndPartitionGridIntersections:stairWallHits,upperSlabHeadspaceNotCut:uncutSlabs};
 if(walls!==5704||doors!==314||steps!==105||cutoutCells!==50||buildings.length!==5)fail('BASELINE_COUNTS');
 const result={schema:'minecraftaibuilder-step8b-b21-blockscale-review-v1',purpose:'BLOCK_GRID_DESIGN_CANDIDATES_NO_EXECUTION',
  source:{b17PinnedSha256:ir.reportSha256,b20ReportSha256:b20.reportSha256,sourceEngine:'FROZEN_STATIC_SOURCE_ONLY'},
  algorithm:{wallPlacement:'PREFER_SOURCE_ENVELOPE_AND_NON_RESERVED_CELL',doorAperture:'ONE_WIDE_TWO_HIGH_MODEL_VOID',
   stairGeometry:'ONE_UNIT_CELL_PER_RISER; NOT_MINECRAFT_STAIR',floorAperture:'REVIEW_COPY_ONLY',
   conversionFromB18:'INDEPENDENT_REDESIGN_NO_LOSSY_ROUNDING'},
  buildings,counts,
  issues:{office02FootprintDifferenceCells:123,office02CorridorOutsideCells:18,office02FixApplied:false,
   materialsUnknown:true,worldAnchorUnknown:true,floorCutoutsNotApplied:true,structuralSupportNotVerified:true,
   candidateDoorPortsWithGridCollision:doorPortsWithCollision,
   doorHingesNotVerified:true,realRuntimeNotVerified:true},
  engineeringStatus:'REVIEW_CANDIDATES_ONLY',engineIntegrated:false,modelOnly:true,approval:'NOT_REQUESTED',
  deploymentGate:'BLOCKED',buildOperationsProduced:false,executableSchemaProduced:false,
  materials:{partitionBlockId:null,doorBlockId:null,stairBlockId:null,floorBlockId:null,states:null},
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,bridgeContact:false,worldAccess:false,
   legacyModified:false,frozenEvidenceModified:false,existingWorldModified:false},
  BuildPlan:safePlan()};
 result.reportSha256=sha(result);
 return result;
}

export function validateB21Blockscale(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b21-blockscale-review-v1'||report.deploymentGate!=='BLOCKED'||
  report.engineeringStatus!=='REVIEW_CANDIDATES_ONLY'||report.engineIntegrated!==false||
  report.modelOnly!==true||report.buildOperationsProduced!==false||report.executableSchemaProduced!==false||
  report.approval!=='NOT_REQUESTED'||report.BuildPlan?.status!=='NOT_PREPARED'||
  report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||
  report.BuildPlan?.worldCoordinates!==null||report.BuildPlan?.materialIds?.length!==0||
  report.safety?.notPrepared!==true||report.safety?.constructionApproved!==false||
  report.safety?.executionAllowed!==false||report.safety?.bridgeContact!==false||
  report.safety?.worldAccess!==false||report.safety?.legacyModified!==false||
  report.safety?.frozenEvidenceModified!==false||report.safety?.existingWorldModified!==false||
  !report.materials||Object.values(report.materials).some(x=>x!==null)||
  report.buildings?.length!==5||report.buildings.some(b=>b.frozenLayoutModified!==false||
    b.floors.some(f=>f.applied!==false||f.wallCandidates.some(w=>w.commands.length||w.blockIds.length||w.physicallyValidated!==false))||
    b.stairs.some(s=>s.operations.length||s.blocks.length||s.physicallyValid!==false)))fail('UNSAFE_REPORT');
 const {reportSha256,...payload}=report;
 if(sha(payload)!==reportSha256)fail('DIGEST');
 if(sha(buildB21Blockscale(root))!==sha(report))fail('REPLAY_MISMATCH');
 return true;
}

export function summarizeB21(report){return {schema:report.schema,counts:report.counts,issues:report.issues,
 engineeringStatus:report.engineeringStatus,engineIntegrated:report.engineIntegrated,
 deploymentGate:report.deploymentGate,BuildPlan:report.BuildPlan};}
