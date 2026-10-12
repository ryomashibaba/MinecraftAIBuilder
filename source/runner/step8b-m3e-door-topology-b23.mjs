/**
 * B23 / M3-E — proposed room-door relocation, never a BuildPlan.
 * Frozen B17/B21/B22 are read-only; candidate changes live in a separate delta.
 * A relocated nominal doorway closes its old wall boundary and opens a new
 * same-room corridor boundary; the two low voxels are only simulated locally.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readB18PinnedInput} from './step8b-interior-geometry-b18.mjs';
import {loadB10Frozen,maskForFloor} from './step8b-interior-contract-b10.mjs';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const shaBytes=v=>createHash('sha256').update(v).digest('hex');
const fail=c=>{const e=Error('B23_'+c);e.code='B23_'+c;throw e;};
const xy=p=>`${p.x},${p.z}`;
const vk=(p,y)=>`${p.x},${y},${p.z}`;
const same=(a,b)=>a?.x===b?.x&&a?.z===b?.z;
const adj=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
const noPlan=()=>({status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
function pinnedJson(root,rel){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B22_FILE_SHA256.json'),'utf8'));
 const expected=manifest.files?.[rel];
 if(!expected)fail('MISSING_PIN');
 const bytes=fs.readFileSync(path.join(root,rel));
 if(shaBytes(bytes)!==expected)fail('SOURCE_CHANGED');
 const value=JSON.parse(bytes);if(!value||typeof value!=='object')fail('INVALID_JSON');
 const {reportSha256,...payload}=value;
 if(reportSha256!==sha(payload))fail('UPSTREAM_DIGEST');
 return {value,bytesSha256:expected};
}
function add(m,k,id){if(!m.has(k))m.set(k,new Set());m.get(k).add(id);}
function drop(m,k,id){const s=m.get(k);if(!s?.delete(id))fail('MISSING_OCCUPANCY');if(!s.size)m.delete(k);}
function reachability(f){
 const walk=new Set([...f.corridorReservation,...f.stairReservation].map(xy));
 const stack=f.stairReservation.map(xy),visited=new Set();
 for(const s of stack)if(!walk.has(s))fail('STAIR_OFF_WALKWAY');
 while(stack.length){const cur=stack.pop();if(visited.has(cur))continue;visited.add(cur);
  const [x,z]=cur.split(',').map(Number);
  for(const n of [`${x+1},${z}`,`${x-1},${z}`,`${x},${z+1}`,`${x},${z-1}`])if(walk.has(n)&&!visited.has(n))stack.push(n);
 }
 return visited;
}
/**
 * Builds a local candidate delta. Never edits floor/panels/ports or produces blocks.
 * Mask is the pinned *source predicted* footprint for this exact floor.
 */
export function proposeB23Floor({irFloor,gridFloor,b22Floor,mask}){
 const {width:w,depth:d}=irFloor?.dimensions??{};
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(d)||w<8||d<8||
  irFloor.id!==gridFloor?.id||irFloor.id!==b22Floor?.id||
  !Array.isArray(irFloor.wallBoundaries)||!Array.isArray(irFloor.roomDoorInterfaces)||
  !Array.isArray(irFloor.corridorReservation)||!Array.isArray(irFloor.stairReservation)||
  !Array.isArray(irFloor.elevatorReservation)||!Array.isArray(irFloor.localYRange)||
  !Array.isArray(gridFloor.wallCandidates)||mask?.length!==w*d)fail('BAD_FLOOR');
 const edge=new Map(irFloor.wallBoundaries.map(x=>[x.id,x]));
 const panels=new Map(gridFloor.wallCandidates.map(x=>[x.id,x]));
 if(panels.size!==edge.size||edge.size!==irFloor.wallBoundaries.length)fail('PANEL_COUNT');
 const ports=new Map(irFloor.roomDoorInterfaces.map(x=>[x.id,x]));
 const protectedCells=new Set([...irFloor.corridorReservation,...irFloor.stairReservation,...irFloor.elevatorReservation].map(xy));
 const walkable=reachability(irFloor);
 const footprint=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z)&&p.x>=0&&p.z>=0&&p.x<w&&p.z<d&&mask[p.z*w+p.x]===1;
 const solid=new Map(),voids=new Map();
 const heights=irFloor.localYRange;
 const low=[heights[0]+1,heights[0]+2];
 for(const p of gridFloor.wallCandidates){
  if(!edge.has(p.id)||p.alignment!=='INTEGER_SCHEMATIC_GRID_NOT_WORLD'||
   p.physicallyValidated!==false||p.engineMapped!==false||p.commands?.length!==0||p.blockIds?.length!==0||
   !Array.isArray(p.localGridVolumes)||!Array.isArray(p.doorVoidCells)||!footprint(p.selectedLocalCell))fail('UNSAFE_PANEL');
  for(const v of p.localGridVolumes)if(low.includes(v.y))add(solid,vk(v,v.y),p.id);
  for(const v of p.doorVoidCells){if(!low.includes(v.y))fail('NONSTANDARD_DOOR');add(voids,vk(v,v.y),p.doorPortId);}
 }
 const hits=()=>{
  const result=[];
  for(const [k,doorIds] of voids)for(const id of doorIds)for(const owner of solid.get(k)??[])
   result.push({voxel:k,portId:id,panelId:owner});
  return result;
 };
 const baseline=hits();
 if(baseline.length!==b22Floor.baselineDoorCollisionVoxelHits||
    new Set(baseline.map(x=>x.portId)).size!==b22Floor.baselineConflictedDoorPorts)fail('BASELINE_MISMATCH');
 const reservedDoorTargets=new Set(),delta=[];
 const trace=[];
 // On each selected port: close old aperture, open new same-room hall-facing aperture.
 function mutate(original,target,doorId,reverse=false){
  const a=panels.get(original),b=panels.get(target);
  for(const y of low){const ka=vk(a.selectedLocalCell,y),kb=vk(b.selectedLocalCell,y);
   if(!reverse){drop(voids,ka,doorId);add(solid,ka,original);drop(solid,kb,target);add(voids,kb,doorId);}
   else{drop(solid,ka,original);add(voids,ka,doorId);drop(voids,kb,doorId);add(solid,kb,target);}
  }
 }
 const order=irFloor.roomDoorInterfaces.slice().sort((a,b)=>a.id.localeCompare(b.id));
 for(const port of order){
  const oldId=port.boundaryId,old=panels.get(oldId),base= edge.get(oldId);
  if(!old||!base||base.kind!=='NOMINAL_DOOR_INTERFACE'||old.doorPortId!==port.id||
    old.doorVoidCells.length!==2||!low.every(y=>old.doorVoidCells.some(v=>v.y===y))||
    !base.roomIds.includes(port.roomId)||!same(old.selectedLocalCell,port.doorCell)||
    !adj(port.doorCell,port.hallCell))fail('PORT_MAPPING');
  const before=hits(),ownHits=before.filter(x=>x.portId===port.id);
  if(!ownHits.length)continue;
  const options=[];
  for(const boundary of irFloor.wallBoundaries){
   if(boundary.kind!=='NOMINAL_WALL_BOUNDARY'||boundary.roomIds.length!==1||boundary.roomIds[0]!==port.roomId||
       reservedDoorTargets.has(boundary.id)||boundary.id===oldId)continue;
   const e1=boundary.from,e2=boundary.to;
   if(!adj(e1,e2))continue;
   let hall,room;
   if(protectedCells.has(xy(e1))&&!protectedCells.has(xy(e2))){hall=e1;room=e2;}
   else if(protectedCells.has(xy(e2))&&!protectedCells.has(xy(e1))){hall=e2;room=e1;}
   else continue;
   const panel=panels.get(boundary.id);
   if(!panel||panel.doorPortId!==null||!same(panel.selectedLocalCell,room)||
      !footprint(room)||!footprint(hall)||!walkable.has(xy(hall))||same(room,old.selectedLocalCell)||
      !low.every(y=>panel.localGridVolumes.some(v=>v.y===y&&same(v,room))))continue;
   if(low.some(y=>[...solid.get(vk(room,y))??[]].some(id=>id!==boundary.id)||
        (solid.get(vk(hall,y))?.size??0)>0||
        (voids.get(vk(room,y))?.size??0)>0||
        [...(voids.get(vk(old.selectedLocalCell,y))??[])].some(id=>id!==port.id)))continue;
   // Existing room identity & reachable corridor graph stay fixed. We do not
   // invent a new partition or relocate stair/corridor geometry.
   mutate(oldId,boundary.id,port.id);
   const after=hits();
   const ownAfter=after.filter(x=>x.portId===port.id).length;
   const introducesNew=after.some(x=>!before.some(q=>q.voxel===x.voxel&&q.portId===x.portId&&q.panelId===x.panelId));
   mutate(oldId,boundary.id,port.id,true);
   if(ownAfter!==0||introducesNew||after.length>=before.length)continue;
   const displacement=Math.abs(room.x-port.doorCell.x)+Math.abs(room.z-port.doorCell.z);
   options.push({targetBoundaryId:boundary.id,newDoorCell:{...room},newHallCell:{...hall},
      distance:displacement,reducedVoxelHits:before.length-after.length});
  }
  options.sort((a,b)=>a.distance-b.distance||b.reducedVoxelHits-a.reducedVoxelHits||a.targetBoundaryId.localeCompare(b.targetBoundaryId));
  const winner=options[0];
  if(winner){mutate(oldId,winner.targetBoundaryId,port.id);reservedDoorTargets.add(winner.targetBoundaryId);
   delta.push({portId:port.id,roomId:port.roomId,oldBoundaryId:oldId,newBoundaryId:winner.targetBoundaryId,
    oldDoorCell:{...port.doorCell},oldHallCell:{...port.hallCell},newDoorCell:winner.newDoorCell,newHallCell:winner.newHallCell,
    offsetCells:winner.distance,openingHeightCells:2,oldOpeningBecomesNominalPartition:true,
    newOpeningBecomesNominalDoor:true,applied:false,physicalValidation:'UNKNOWN'});
   trace.push({portId:port.id,candidatesConsidered:options.length,reducedVoxelHits:winner.reducedVoxelHits});
  }
 }
 const after=hits();
 const remaining=new Set(after.map(x=>x.portId));
 if(delta.some(x=>remaining.has(x.portId))||after.length>baseline.length||delta.length>ports.size)fail('REGRESSION');
 // A new portal retains same room identity; its hall endpoint belongs to the
 // original unmodified stair-connected 2D walkway, but physical access is UNKNOWN.
 return {id:irFloor.id,initialConflictedPorts:new Set(baseline.map(x=>x.portId)).size,
   initialOverlapVoxelHits:baseline.length,candidateRelocatedDoors:delta.length,
   remainingConflictedPorts:remaining.size,remainingOverlapVoxelHits:after.length,
   unchangedDoorCount:ports.size-delta.length,
   relocations:delta,searchEvidence:trace,
   corridorCellsEdited:0,stairCellsEdited:0,roomOwnershipEdited:0,
   conceptualWalkabilityRetained:true,physicalDoorClearance:'NOT_PROVEN',
   wallContinuity:'NOT_PHYSICALLY_PROVEN',materialAndWorldMapping:'NOT_AVAILABLE',
   applied:false,buildOperations:[]};
}
export function buildB23M3E(root){
 if(typeof root!=='string'||!root||!path.isAbsolute(root))fail('ROOT');
 const ir=readB18PinnedInput(root);
 const {value:b21,bytesSha256:b21Hash}=pinnedJson(root,'reports/B21_BLOCKSCALE_REVIEW.json');
 const {value:b22,bytesSha256:b22Hash}=pinnedJson(root,'reports/B22_M3D_READONLY_REPORT.json');
 if(b21.counts?.doorOpenings!==314||b21.counts?.wallColumns!==5704||b22.counts?.originalConflictedDoorPorts!==118||
    b22.counts?.originalCollisionVoxelHits!==236||b22.deploymentGate!=='BLOCKED'||
    b21.deploymentGate!=='BLOCKED'||b22.BuildPlan?.commandCount!==0||b21.BuildPlan?.commandCount!==0)fail('SOURCE_GATE');
 const {b7}=loadB10Frozen(root);
 const src=new Map(b7.candidates.map(x=>[`${x.program}/${x.id}`,x]));
 const irBy=new Map(ir.buildings.map(x=>[x.id,x]));
 const b22By=new Map(b22.buildings.map(x=>[x.id,x]));
 const totals={buildings:0,floors:0,doors:0,baselineConflictedPorts:0,baselineOverlapVoxelHits:0,
  candidateRelocations:0,remainingConflictedPorts:0,remainingOverlapVoxelHits:0,executedOperations:0,physicalRepairs:0};
 const buildings=b21.buildings.map(b=>{
  const source=src.get(b.id),original=irBy.get(b.id),audit=b22By.get(b.id);
  if(!source||!original||!audit||original.floors.length!==b.floors.length||audit.floors.length!==b.floors.length)fail('BUILDING_PROVENANCE');
  totals.buildings++;
  const floors=b.floors.map((f,i)=>{
   const fr=original.floors[i],mask=maskForFloor(source.sourcePredictedRectangles,b.dimensions.width,b.dimensions.depth,i);
   const x=proposeB23Floor({irFloor:fr,gridFloor:f,b22Floor:audit.floors[i],mask});
   totals.floors++;totals.doors+=fr.roomDoorInterfaces.length;
   totals.baselineConflictedPorts+=x.initialConflictedPorts;totals.baselineOverlapVoxelHits+=x.initialOverlapVoxelHits;
   totals.candidateRelocations+=x.candidateRelocatedDoors;totals.remainingConflictedPorts+=x.remainingConflictedPorts;
   totals.remainingOverlapVoxelHits+=x.remainingOverlapVoxelHits;
   return x;
  });
  return {id:b.id,floors};
 });
 if(totals.buildings!==5||totals.floors!==30||totals.doors!==314||totals.baselineConflictedPorts!==118||totals.baselineOverlapVoxelHits!==236)fail('COUNT_CHANGED');
 const report={schema:'minecraftaibuilder-step8b-b23-m3e-relocation-review-v1',
  purpose:'CANDIDATE_ONLY_ROOM_DOOR_TOPOLOGY_NOT_EXECUTABLE',
  evidence:{b17PinnedDigest:ir.reportSha256,b21SourceSha256:b21Hash,b22SourceSha256:b22Hash,geometry:'FROZEN_SOURCE_PREDICTED_MASK'},
  strategy:'RELOCATE_DOOR_ON_SAME_ROOM_PERIMETER_CLOSING_OLD_APERTURE',
  buildings,counts:totals,
  interpretation:{gridOverlap:'MODELED_ONLY',roomToHallAccess:'NOMINAL_2D_CONNECTED_TO_STAIR_RESERVATION',
   partitionSupport:'UNVERIFIED',roomPrivacy:'UNVERIFIED',clearanceBeyondTwoNominalCells:'UNVERIFIED',
   floorStairCutouts:'UNAPPLIED',office02ExteriorAndCorridorMismatch:'UNRESOLVED',
   realEnginePlannerIntegration:'NOT_PERFORMED',worldAnchor:'UNKNOWN',materials:'UNKNOWN'},
  candidateApplied:false,approvedRepairs:0,engineeringStatus:'REVIEW_ONLY_ENGINEERING_NOT_COMPLETE',
  deploymentGate:'BLOCKED',safety:{notPrepared:true,executionAllowed:false,constructionApproved:false,
   bridgeContact:false,worldAccess:false,existingBuildsModified:false,legacyModified:false,frozenEvidenceModified:false},
  BuildPlan:noPlan()};
 report.reportSha256=sha(report);return report;
}
export function validateB23M3E(value,root){
 if(value?.schema!=='minecraftaibuilder-step8b-b23-m3e-relocation-review-v1'||
   value.purpose!=='CANDIDATE_ONLY_ROOM_DOOR_TOPOLOGY_NOT_EXECUTABLE'||value.deploymentGate!=='BLOCKED'||
   value.candidateApplied!==false||value.approvedRepairs!==0||value.counts?.executedOperations!==0||
   value.counts?.physicalRepairs!==0||value.BuildPlan?.status!=='NOT_PREPARED'||
   value.BuildPlan?.operations?.length!==0||value.BuildPlan?.commandCount!==0||
   value.BuildPlan?.worldCoordinates!==null||value.BuildPlan?.materialIds?.length!==0||
   value.safety?.notPrepared!==true||
   ['executionAllowed','constructionApproved','bridgeContact','worldAccess','existingBuildsModified','legacyModified','frozenEvidenceModified'].some(k=>value.safety?.[k]!==false)||
   !Array.isArray(value.buildings)||value.buildings.some(b=>b.floors?.some(f=>f.applied!==false||f.buildOperations?.length!==0||
       f.relocations.some(x=>x.applied!==false||x.physicalValidation!=='UNKNOWN'))))fail('UNSAFE_REPORT');
 const {reportSha256,...payload}=value;
 if(reportSha256!==sha(payload))fail('DIGEST');
 if(sha(value)!==sha(buildB23M3E(root)))fail('REPLAY');
 return true;
}
export function summarizeB23(x){return {schema:x.schema,counts:x.counts,interpretation:x.interpretation,
 engineeringStatus:x.engineeringStatus,deploymentGate:x.deploymentGate,BuildPlan:x.BuildPlan};}
