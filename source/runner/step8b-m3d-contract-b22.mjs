/**
 * B22 / M3-D: immutable frozen-source, non-executable layout negotiation.
 * Reports safe-looking alternative wall sides and explicitly UNAPPROVED local
 * aperture relief hypotheses. Never imports the live engine or outputs BuildPlan.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readB18PinnedInput} from './step8b-interior-geometry-b18.mjs';
import {loadB10Frozen,maskForFloor} from './step8b-interior-contract-b10.mjs';
import {buildB21Blockscale,validateB21Blockscale} from './step8b-blockscale-b21.mjs';

const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail = c => { const e=new Error(`B22_${c}`); e.code=`B22_${c}`; throw e; };
const ckey = p => `${p.x},${p.z}`;
const vkey = p => `${p.x},${p.y},${p.z}`;
const noPlan=()=>({status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
const readonly=(name)=>Object.freeze({name,execution:'NEVER',materialId:null,worldAnchor:null,constructionApproved:false});
const safeCell=(p,w,d)=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z)&&p.x>=0&&p.z>=0&&p.x<w&&p.z<d;
const hashFile=(root,rel)=>createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');

// Side adjustment is a review hypothesis only; it cannot write a panel into protected
// corridors/stairs/EV, outside the frozen engine footprint or onto a door void.
export function reviewAlternateWall(edge, panel, frame, doorVoids, protectedCells, mask) {
  const {width:w,depth:d}=frame;
  if(!edge?.nominal||edge.id!==panel?.id||panel.kind!=='REVIEW_ONE_CELL_PARTITION'||
     !Array.isArray(panel.localGridVolumes)||!Array.isArray(mask)&&!(mask instanceof Uint8Array)||mask.length!==w*d)
     fail('ALTERNATE_INPUT');
  const current=panel.selectedLocalCell;
  if(!safeCell(current,w,d))fail('ALTERNATE_CURRENT');
  const candidates=[edge.from,edge.to].filter(x=>safeCell(x,w,d)&&ckey(x)!==ckey(current));
  if(candidates.length!==1)return {eligible:false,reason:'NO_ALTERNATE'};
  const candidate=candidates[0];
  if(!mask[candidate.z*w+candidate.x])return {eligible:false,reason:'OUTSIDE_SOURCE_ENVELOPE'};
  if(protectedCells.has(ckey(candidate)))return {eligible:false,reason:'PROTECTED_RESERVATION'};
  if(panel.localGridVolumes.some(v=>doorVoids.has(vkey({...candidate,y:v.y}))))return {eligible:false,reason:'NEW_DOOR_OBSTRUCTION'};
  return {eligible:true,reviewAlternativeCell:{...candidate},reason:'CANDIDATE_ONLY'};
}

/** Compact non-executable partition/door/slab contract. Floor-level maps built once. */
export function evaluateB22Floor({floor,irFloor,mask}) {
  const w=irFloor.dimensions.width,d=irFloor.dimensions.depth;
  if(!floor||!irFloor||floor.id!==irFloor.id||!Array.isArray(floor.wallCandidates)||
      !Array.isArray(irFloor.wallBoundaries)||floor.wallCandidates.length!==irFloor.wallBoundaries.length||
      !Array.isArray(irFloor.roomDoorInterfaces)||mask.length!==w*d)fail('FLOOR_INPUT');
  const edges=new Map(irFloor.wallBoundaries.map(x=>[x.id,x]));
  const protectedCells=new Set([...irFloor.corridorReservation,...irFloor.stairReservation,...irFloor.elevatorReservation].map(ckey));
  const doors= floor.wallCandidates.filter(p=>p.doorPortId!==null);
  const doorVoids=new Map();
  for(const p of doors){
    if(p.doorVoidCells.length!==2||!edges.has(p.id))fail('DOOR_CONTRACT');
    for(const voxel of p.doorVoidCells){const k=vkey(voxel);(doorVoids.get(k)??doorVoids.set(k,[]).get(k)).push(p.doorPortId);}
  }
  const selected=new Map(),solids=new Map();
  function add(panel,cell){
    const v=panel.localGridVolumes.map(x=>({...cell,y:x.y}));
    selected.set(panel.id,{panel,cell,voxels:v});
    for(const p of v){const k=vkey(p);(solids.get(k)??solids.set(k,new Set()).get(k)).add(panel.id);}
  }
  function remove(id){
    const old=selected.get(id);if(!old)fail('UNKNOWN_PANEL');
    for(const p of old.voxels){const k=vkey(p),owners=solids.get(k);owners.delete(id);if(!owners.size)solids.delete(k);}
    selected.delete(id);
    return old;
  }
  for(const panel of floor.wallCandidates){
    if(!edges.has(panel.id)||panel.floorId!==floor.id||panel.alignment!=='INTEGER_SCHEMATIC_GRID_NOT_WORLD'||
       panel.physicallyValidated!==false||panel.engineMapped!==false||panel.commands.length||panel.blockIds.length||
       !safeCell(panel.selectedLocalCell,w,d))fail('UNSAFE_PANEL');
    add(panel,panel.selectedLocalCell);
  }
  const collision=()=>{
    const hits=[];
    for(const [v,ports] of doorVoids)if(solids.has(v))for(const id of solids.get(v))for(const port of ports)hits.push({voxel:v,doorPortId:port,blockerId:id});
    return hits;
  };
  const baseline=collision();
  const baselineDoors=new Set(baseline.map(x=>x.doorPortId));
  // Move walls whose alternate side does not violate the fixed footprint or reservations.
  // Process stable order, only accept strictly reducing the total collision count.
  const moves=[];
  const blockingIds=[...new Set(baseline.map(x=>x.blockerId))].sort();
  for(const id of blockingIds){
    const old=selected.get(id);if(!old||old.panel.doorPortId!==null)continue;
    const option=reviewAlternateWall(edges.get(id),old.panel,{width:w,depth:d},new Set(doorVoids.keys()),protectedCells,mask);
    if(!option.eligible)continue;
    const before=collision().length;
    remove(id);add(old.panel,option.reviewAlternativeCell);
    const after=collision().length;
    if(after<before){moves.push({panelId:id,from:{...old.cell},to:{...option.reviewAlternativeCell},avoidedVoxelHits:before-after,
      status:'UNAPPLIED_CANDIDATE_NO_STRUCTURAL_REVIEW'});}
    else {remove(id);add(old.panel,old.cell);}
  }
  const remaining=collision();
  const unresolvedDoors=new Set(remaining.map(x=>x.doorPortId));
  // Do not silently delete walls. Record each possible low-level aperture relief
  // as a review debt; no solids, voids or source room topology are modified.
  const relief=new Map();
  for(const hit of remaining){
    const k=hit.blockerId;
    if(!relief.has(k))relief.set(k,{panelId:k,blockedVoxels:[],affectedDoorPortIds:[],
      kind:'PROPOSED_JUNCTION_RELIEF_NOT_VERIFIED',mustRevalidatePartitionContinuity:true,
      mustRevalidateRoomAndCorridorClearance:true,applied:false});
    const rec=relief.get(k);rec.blockedVoxels.push(hit.voxel);if(!rec.affectedDoorPortIds.includes(hit.doorPortId))rec.affectedDoorPortIds.push(hit.doorPortId);
  }
  let reliefVoxelCount=0;
  for(const entry of relief.values()){
    const original=selected.get(entry.panelId);
    const removed=new Set(entry.blockedVoxels);
    if(!original||!original.voxels.every(v=>Number.isSafeInteger(v.x)&&Number.isSafeInteger(v.y)&&Number.isSafeInteger(v.z)))fail('BAD_RELIEF');
    if([...removed].some(v=>!original.voxels.some(o=>vkey(o)===v)))fail('RELIEF_OUTSIDE_PANEL');
    const remainder=original.voxels.filter(v=>!removed.has(vkey(v)));
    if(!remainder.length)fail('RELIEF_REMOVES_ENTIRE_WALL');
    entry.remainingWallVoxelCount=remainder.length;
    entry.reviewOnlyRemainingPanelVoxels=remainder;
    entry.wallJunctionIntegrity='NOT_VALIDATED';
    entry.blockedVoxels=[...removed].sort();
    reliefVoxelCount+=removed.size;
  }
  // Independent check: a completely hypothetical removal of every recorded
  // junction obstruction would eliminate only this *specific* voxel overlap.
  // All partition continuity and construction gates remain unresolved.
  const relieved=new Map([...solids].map(([k,v])=>[k,new Set(v)]));
  for(const entry of relief.values())for(const k of entry.blockedVoxels){
    if(!relieved.get(k)?.delete(entry.panelId))fail('RELIEF_NOT_MATCHED');
    if(!relieved.get(k).size)relieved.delete(k);
  }
  const hypotheticalResidual=[...doorVoids.keys()].filter(k=>relieved.has(k)).length;
  if(hypotheticalResidual!==0)fail('RELIEF_INCOMPLETE');
  return {id:floor.id,baselineDoorCollisionVoxelHits:baseline.length,baselineConflictedDoorPorts:baselineDoors.size,
    safeSideMoveCandidates:moves,remainingDoorCollisionVoxelHits:remaining.length,remainingConflictedDoorPorts:unresolvedDoors.size,
    conditionalJunctionReliefCandidates:[...relief.values()].sort((a,b)=>a.panelId.localeCompare(b.panelId)),
    proposedReliefVoxelCount:reliefVoxelCount,hypotheticalVoxelHitsIfAllReliefApplied:hypotheticalResidual,reliefApplied:false,planApproved:false,
    corridorConnectivityAfterRelief:'NOT_VERIFIED',wallContinuityAfterRelief:'NOT_VERIFIED',
    floorSlabEdits:'NOT_PERFORMED',physicallyVerified:false};
}

export function buildB22M3D(root){
 if(typeof root!=='string'||!root)fail('ROOT');
 const sourceB21=path.join(root,'reports/B21_BLOCKSCALE_REVIEW.json');
 const b21=JSON.parse(fs.readFileSync(sourceB21,'utf8'));
 if(!validateB21Blockscale(b21,root))fail('B21_FAILED');
 const ir=readB18PinnedInput(root),{b7}=loadB10Frozen(root);
 const byIR=new Map(ir.buildings.map(b=>[b.id,b]));
 const src=new Map(b7.candidates.map(b=>[`${b.program}/${b.id}`,b]));
 let origHits=0,origDoors=0,afterHits=0,afterDoors=0,moveCount=0,reliefCount=0,reliefVoxels=0,slabCells=0;
 const buildings=b21.buildings.map(b=>{
   const original=byIR.get(b.id),pred=src.get(b.id);
   if(!original||!pred||b.floors.length!==original.floors.length)fail('PINNED_BUILDING');
   const floors=b.floors.map((f,i)=>{
     const frozen=original.floors[i];
     const mask=maskForFloor(pred.sourcePredictedRectangles,b.dimensions.width,b.dimensions.depth,i);
     const res=evaluateB22Floor({floor:f,irFloor:frozen,mask});
     origHits+=res.baselineDoorCollisionVoxelHits;origDoors+=res.baselineConflictedDoorPorts;
     afterHits+=res.remainingDoorCollisionVoxelHits;afterDoors+=res.remainingConflictedDoorPorts;
     moveCount+=res.safeSideMoveCandidates.length;reliefCount+=res.conditionalJunctionReliefCandidates.length;reliefVoxels+=res.proposedReliefVoxelCount;
     return res;
   });
   const stairApertures=b.stairs.map(s=>{
      if(s.physicallyValid!==false||s.approvedForConstruction!==false||s.operations.length||s.blocks.length||s.candidateUpperFloorCutouts.length!==2)fail('UNSAFE_STAIR');
      slabCells+=s.candidateUpperFloorCutouts.length;
      return {id:s.id,lowerFloor:s.lowerFloor,upperFloor:s.upperFloor,
        candidateUpperFloorCutouts:s.candidateUpperFloorCutouts,
        slabStatus:'SOURCE_FLOOR_PLATE_NOT_CUT',support:'UNKNOWN',headroom:'NOT_PHYSICALLY_ATTESTED',
        executable:false,applied:false};
   });
   return {id:b.id,floors,stairApertures};
 });
 if(origHits!==236||origDoors!==118||slabCells!==50)fail('BASELINE_CHANGED');
 const counts={buildings:5,floors:30,doorPorts:314,wallPanels:5704,
   originalCollisionVoxelHits:origHits,originalConflictedDoorPorts:origDoors,
   candidateSideMoves:moveCount,remainingCollisionVoxelHits:afterHits,
   remainingConflictedDoorPorts:afterDoors,conditionalReliefWallPanels:reliefCount,conditionalReliefVoxelCount:reliefVoxels,
   stairFloorOpeningCandidates:slabCells,physicalRepairs:0,executedOperations:0};
 const result={schema:'minecraftaibuilder-step8b-b22-m3d-readonly-v1',purpose:'FROZEN_TO_PLANNER_SIMULATION_NOT_BUILDPLAN',
   evidence:{b21FrozenSha256:hashFile(root,'reports/B21_BLOCKSCALE_REVIEW.json'),b17PinnedSha256:ir.reportSha256,
     sourcePlannerContract:'STATIC_ENGINE_SOURCE_PINNED_IN_B19_ONLY_NOT_RUNTIME'},
   contract:{input:'FROZEN_LOCAL_INTEGER_WALLS_DOORS_STAIRS',
     exteriorMask:readonly('SOURCE_PREDICTED_FOOTPRINT'),floorPlate:readonly('SOURCE_PLATE_MASK'),
     interiorPartition:readonly('BLOCK_GRID_SIDE_CANDIDATES'),doorAperture:readonly('TWO_UNIT_OPENING'),
     stairAperture:readonly('UPPER_SLAB_CUTOUT_CANDIDATE'),
     worldCoordinateBinding:'UNRESOLVED',materialStateBinding:'UNRESOLVED',runtimeIdentity:'UNPROVEN',
     realEngineInvocation:false},
   buildings,counts,tradeoff:{safeSideMoves:'REVIEW_ONLY_NOT_APPLIED',
     conditionalWallVoids:'REQUIRE_PARTITION_CONTINUITY_ROOM_AND_CORRIDOR_CLEARANCE_ENGINEERING',
     residualDoorConflicts:'BLOCKING',
     conditionalVoxelClearanceIfApproved:'ZERO_ONLY_FOR_DOOR_WALL_OVERLAP__NOT_PHYSICALLY_VERIFIED',
     junctionContinuity:'NOT_VERIFIED', geometryAndPlannerCoupling:'NOT_COMPLETE'},
   approval:'NOT_REQUESTED',deploymentGate:'BLOCKED',engineeringStatus:'NOT_READY_FOR_CONSTRUCTION',
   safety:{notPrepared:true,executionAllowed:false,constructionApproved:false,worldAccess:false,
     bridgeContact:false,legacyModified:false,frozenEvidenceModified:false,existingWorldModified:false},
   executableSchemaProduced:false,BuildPlan:noPlan()};
 result.reportSha256=digest(result);
 return result;
}
export function validateB22M3D(report,root){
  if(report?.schema!=='minecraftaibuilder-step8b-b22-m3d-readonly-v1'||
   report.deploymentGate!=='BLOCKED'||report.engineeringStatus!=='NOT_READY_FOR_CONSTRUCTION'||
   report.approval!=='NOT_REQUESTED'||report.executableSchemaProduced!==false||
   report.safety?.notPrepared!==true||report.safety?.executionAllowed!==false||
   report.safety?.constructionApproved!==false||report.safety?.worldAccess!==false||
   report.safety?.bridgeContact!==false||report.safety?.legacyModified!==false||
   report.safety?.frozenEvidenceModified!==false||report.safety?.existingWorldModified!==false||
   report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||
   report.BuildPlan?.commandCount!==0||report.BuildPlan?.worldCoordinates!==null||
   report.BuildPlan?.materialIds?.length!==0||report.contract?.realEngineInvocation!==false||
   !Array.isArray(report.buildings)||report.buildings.length!==5||
   report.buildings.some(b=>b.floors.some(f=>f.reliefApplied!==false||f.planApproved!==false||
      f.safeSideMoveCandidates.some(x=>x.status!=='UNAPPLIED_CANDIDATE_NO_STRUCTURAL_REVIEW')||
      f.conditionalJunctionReliefCandidates.some(x=>x.applied!==false))))fail('UNSAFE');
  const {reportSha256,...unsigned}=report;if(digest(unsigned)!==reportSha256)fail('DIGEST');
  if(digest(report)!==digest(buildB22M3D(root)))fail('REPLAY');
  return true;
}
export function summarizeB22(report){
 return {schema:report.schema,evidence:report.evidence,counts:report.counts,tradeoff:report.tradeoff,
   engineeringStatus:report.engineeringStatus,deploymentGate:report.deploymentGate,
   safety:report.safety,BuildPlan:report.BuildPlan};
}
