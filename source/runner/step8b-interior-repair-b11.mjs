// Step8B/B11: STATIC mask-only suggestions and schematic interference screening.
// Never issues build instructions, world coordinates, material IDs or production plans.
import {createHash} from 'node:crypto';
import {loadB10Frozen,buildB10Report,validateB10Report} from './step8b-interior-contract-b10.mjs';

export const B11_CANONICAL_REPORT_SHA='dcd10e80a332a5df394080191f0ef29434d1002e4953fd06eaa7f6e60829ac53';
const fail=(code)=>{const e=new Error(code);e.code=code;throw e;};
const digest=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
const xy=(i,w)=>({x:i%w,z:Math.floor(i/w)});
const nbr=(i,w,d)=>{const x=i%w,z=Math.floor(i/w);return [x>0?i-1:-1,x+1<w?i+1:-1,z>0?i-w:-1,z+1<d?i+w:-1].filter(n=>n>=0);};
const maskSet=(arr,w,d,code)=>{
 if(!Array.isArray(arr))fail('B11_BAD_'+code);
 const set=new Set();
 for(const p of arr){if(!Number.isSafeInteger(p?.x)||!Number.isSafeInteger(p?.z)||p.x<0||p.x>=w||p.z<0||p.z>=d)fail('B11_BAD_'+code);set.add(p.z*w+p.x);}
 return set;
};
const components=(set,w,d)=>{
 const remaining=new Set(set),items=[];
 while(remaining.size){const first=remaining.values().next().value,queue=[first],seen=new Set([first]);remaining.delete(first);
  for(let j=0;j<queue.length;j++)for(const v of nbr(queue[j],w,d))if(remaining.delete(v)){seen.add(v);queue.push(v);}
  items.push(seen);
 }
 return items;
};
const rectSet=(rooms,w,d)=>{
 if(!Array.isArray(rooms))fail('B11_BAD_ROOMS');const out=new Set();
 for(const r of rooms){if(![r.x,r.z,r.width,r.depth].every(Number.isSafeInteger)||r.width<=0||r.depth<=0||r.x<0||r.z<0||r.x+r.width>w||r.z+r.depth>d)fail('B11_BAD_ROOM_RECT');
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)out.add(z*w+x);
 }return out;
};
const sortedLocations=(set,w)=>[...set].sort((a,b)=>a-b).map(i=>xy(i,w));
const intersection=(a,b)=>new Set([...a].filter(x=>b.has(x)));
const difference=(a,b)=>new Set([...a].filter(x=>!b.has(x)));

// Pure static evaluator for one floor. No side effects and no modification to input objects.
export function screenB11Floor(floorContract,detailFloor,w,d){
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(d)||w<8||w>48||d<8||d>40||!floorContract||!detailFloor||
   !Number.isSafeInteger(floorContract.level)||floorContract.level!==detailFloor.level||
   typeof floorContract.masks?.source!=='string'||floorContract.masks.source.length!==w*d||/[^01]/.test(floorContract.masks.source))fail('B11_INVALID_FLOOR_MASK');
 const source=new Set();for(let i=0;i<w*d;i++)if(floorContract.masks.source[i]==='1')source.add(i);
 const corridor=maskSet(detailFloor.corridorCells,w,d,'CORRIDOR'),stair=maskSet(detailFloor.coreStairCells,w,d,'STAIR');
 const ev=maskSet(detailFloor.elevatorCells,w,d,'ELEVATOR'),room=rectSet(detailFloor.rooms,w,d);
 const hall=maskSet(detailFloor.rooms.map(r=>({x:r.door?.hallX,z:r.door?.hallZ})),w,d,'DOOR_HALL');
 const doors=maskSet(detailFloor.rooms.map(r=>({x:r.door?.x,z:r.door?.z})),w,d,'ROOM_DOOR');
 const unmodifiedCorridor=new Set(corridor),outside=difference(corridor,source),trimmed=difference(corridor,outside);
 const existingOverlap={corridorVsRoom:intersection(corridor,room).size,corridorVsStair:intersection(corridor,stair).size,
  corridorVsElevator:intersection(corridor,ev).size,stairVsElevator:intersection(stair,ev).size,
  stairVsRoom:intersection(stair,room).size,elevatorVsRoom:intersection(ev,room).size,
  roomDoorOutsideRoom:difference(doors,room).size,roomHallNotCorridor:difference(hall,corridor).size};
 const wrongDoorAdjacency=detailFloor.rooms.filter(r=>Math.abs(r.door.x-r.door.hallX)+Math.abs(r.door.z-r.door.hallZ)!==1).length;
 const outsideReservations={stair:difference(stair,source).size,elevator:difference(ev,source).size,rooms:difference(room,source).size,
   doors:difference(doors,source).size,hall:difference(hall,source).size};
 const baselineGraph=new Set([...corridor,...stair]),candidateGraph=new Set([...trimmed,...stair]);
 const before=components(baselineGraph,w,d),after=components(candidateGraph,w,d);
 const afterIndex=new Map();after.forEach((c,j)=>{for(const i of c)afterIndex.set(i,j)});
 // For each ORIGINAL connected component, retained graph nodes must remain mutually connected.
 const splitComponents=before.filter(c=>new Set([...c].filter(x=>candidateGraph.has(x)).map(x=>afterIndex.get(x))).size>1).length;
 const floorContractOutside=floorContract.categories?.corridor?.outsideSourceCells;
 if(floorContractOutside!==outside.size)fail('B11_B10_CORRIDOR_COUNT_MISMATCH');
 const collisionCount=Object.values(existingOverlap).reduce((a,b)=>a+b,0)-existingOverlap.roomHallNotCorridor;
 const protectedRemoved=intersection(outside,new Set([...stair,...ev,...room,...doors,...hall])).size;
 const trimSafeStatic=splitComponents===0&&protectedRemoved===0&&collisionCount===0&&wrongDoorAdjacency===0&&Object.values(outsideReservations).every(x=>x===0);
 const resolution=outside.size===0?'NO_CHANGE_NEEDED':trimSafeStatic?'TRIM_REVIEW_CANDIDATE':'MANUAL_REVIEW_REQUIRED';
 // Never say access/egress is proven. This is a local 2D screen only.
 return {level:floorContract.level,resolution,sourceArea:source.size,corridorBefore:corridor.size,corridorAfter:trimmed.size,
   removedLocalCells:sortedLocations(outside,w),addedLocalCells:[],
   originalConnectionComponents:before.length,trimmedConnectionComponents:after.length,
   splitOriginalComponents:splitComponents,existingOverlap,wrongDoorAdjacency,
   outsideReservations,protectedRemoved,
   schematicRoomHallMissingFromCorridor:existingOverlap.roomHallNotCorridor,
   recommendation:outside.size===0?'KEEP_UNCHANGED':trimSafeStatic?'TRIM_DANGLING_LOCAL_CORRIDOR_CELLS':'DO_NOT_PROPOSE_AUTOMATIC_REPAIR',
   proof:'STATIC_2D_SCHEMATIC_ONLY',sourceMask:floorContract.masks.source,
   originalCorridorCells:sortedLocations(unmodifiedCorridor,w),proposedCorridorCells:sortedLocations(trimmed,w),
   stairLocalCells:sortedLocations(stair,w),elevatorLocalCells:sortedLocations(ev,w)};
}

export function buildB11Report(b10,originalReviews){
 validateB10Report(b10);
 if(!originalReviews||Object.keys(originalReviews).sort().join(',')!=='apartment,hotel,office')fail('B11_MISSING_REVIEWS');
 const candidates=[];
 for(const old of b10.frozenBuildings){
  const rev=originalReviews[old.program];const candidate=rev?.candidates?.find(x=>x.id===old.key.split('/')[1]);
  if(!candidate||candidate.detail?.BuildPlan?.status!=='NOT_PREPARED'||candidate.detail.BuildPlan.operations?.length!==0||candidate.detail.BuildPlan.commandCount!==0)fail('B11_UNSAFE_REVIEW');
  const floors=candidate.detail.roomsAndCorridors?.floors;
  if(!Array.isArray(floors)||floors.length!==old.levels.length)fail('B11_FLOORS_MISMATCH');
  const {width,depth}=old.dimensions;
  const checks=old.levels.map((f,i)=>screenB11Floor(f,floors[i],width,depth));
  const removed=checks.reduce((n,f)=>n+f.removedLocalCells.length,0);
  candidates.push({key:old.key,dimensions:old.dimensions,massing:old.massing,orientation:old.orientation,
    status:checks.some(f=>f.resolution==='MANUAL_REVIEW_REQUIRED')?'MANUAL_REVIEW_REQUIRED':removed?'NON_APPLIED_TRIM_PROPOSAL':'NO_REPAIR_NEEDED',
    summary:{outOfEnvelopeCorridorCells:removed,nonAppliedRemovals:removed,
      proposedAdditions:0,componentSplits:checks.reduce((s,f)=>s+f.splitOriginalComponents,0),
      roomHallGaps:checks.reduce((s,f)=>s+f.schematicRoomHallMissingFromCorridor,0),
      reportedSchematicOverlaps:checks.reduce((s,f)=>s+f.existingOverlap.corridorVsRoom+f.existingOverlap.corridorVsStair+f.existingOverlap.corridorVsElevator,0)},
    levels:checks,proposal:{id:'B11_TRIM_REVIEW_ONLY',application:'NOT_APPLIED',editableReviewOnly:true,
      roomStairElevatorReservationChanged:false,retainsConceptOriginal:true,localCoordinatesOnly:true},
    BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}});
 }
 if(candidates.length!==5||candidates.reduce((n,c)=>n+c.summary.outOfEnvelopeCorridorCells,0)!==18)fail('B11_FROZEN_OUTSIDE_TOTAL_CHANGED');
 const office=candidates.find(c=>c.key==='office/candidate-02');
 if(!office||office.summary.outOfEnvelopeCorridorCells!==18||office.levels.length!==6)fail('B11_FROZEN_OFFICE_CHANGED');
 const report={schema:'minecraftaibuilder-step8b-b11-local-review-v1',status:'STATIC_REVIEW_ONLY',
  provenance:{b10ReportSha256:b10.reportSha256,b10ImmutableSha256:b10.sourceEvidence.immutableSha256,
     snapshotManifestSha256:b10.sourceEvidence.snapshotManifestSha256},
  candidates,findings:{reviewedBuildings:candidates.length,reviewedFloors:candidates.reduce((n,c)=>n+c.levels.length,0),
     proposedRemovedCorridorCells:candidates.reduce((n,c)=>n+c.summary.nonAppliedRemovals,0),
     corridorChangeAutoApplied:false,proposalRequiresReview:true,
     disconnectedHallwayCells:candidates.reduce((n,c)=>n+c.summary.roomHallGaps,0),
     actualInteriorModulesKnown:false,actualRoutingProven:false},
  remainingHolds:['RUNNING_ENGINE_ID_UNPROVEN','MATERIAL_IDS_UNVERIFIED','WORLD_ANCHOR_UNVERIFIED','ACTUAL_MODULE_INTERFERENCE_UNVERIFIED','WALKABILITY_UNVERIFIED','HUMAN_DESIGN_REVIEW_REQUIRED','CONSTRUCTION_NOT_APPROVED'],
  staticContract:{local2DOnly:true,stairSafetyProven:false,doorWalkabilityProven:false,changesApplied:false,
    engineCodeExecuted:false,worldAccess:false,bridgeAccess:false,materialIds:[],worldCoordinates:null},
  deploymentGate:'BLOCKED',BuildPlan:{status:'NOT_PREPARED',commandCount:0,operations:[]},
  safety:{constructionApproved:false,executionAllowed:false,autoApplied:false,existingWorldModified:false,legacyModified:false,frozenEvidenceModified:false}};
 report.reportSha256=digest(report);return report;
}
export function validateB11Report(report,b10){
 validateB10Report(b10);
 if(!report||report.schema!=='minecraftaibuilder-step8b-b11-local-review-v1')fail('B11_REPORT_INVALID');
 const {reportSha256,...payload}=report;
 if(reportSha256!==digest(payload)||reportSha256!==B11_CANONICAL_REPORT_SHA||report.deploymentGate!=='BLOCKED'||report.BuildPlan?.status!=='NOT_PREPARED'||
    report.BuildPlan?.operations?.length!==0||report.BuildPlan.commandCount!==0||report.safety?.constructionApproved!==false||
    report.safety?.executionAllowed!==false||report.safety?.autoApplied!==false||report.staticContract?.changesApplied!==false||
    report.staticContract.engineCodeExecuted!==false||report.staticContract.worldAccess!==false||report.staticContract.bridgeAccess!==false||
    report.staticContract.worldCoordinates!==null||report.staticContract.materialIds?.length!==0||
    report.provenance?.b10ReportSha256!==b10.reportSha256||report.findings?.proposedRemovedCorridorCells!==18||
    report.findings?.corridorChangeAutoApplied!==false||report.findings?.proposalRequiresReview!==true||
    report.candidates?.length!==5||report.remainingHolds?.length!==7||
    report.candidates.some(c=>c.BuildPlan?.operations?.length!==0||c.BuildPlan?.status!=='NOT_PREPARED'||
      c.proposal?.application!=='NOT_APPLIED'||c.proposal?.roomStairElevatorReservationChanged!==false))fail('B11_REPORT_UNSAFE');
 return true;
}
export function buildB11FromFrozenRoot(root){const frozen=loadB10Frozen(root);const b10=buildB10Report(frozen);
 return {b10,report:buildB11Report(b10,frozen.reviews)};
}
