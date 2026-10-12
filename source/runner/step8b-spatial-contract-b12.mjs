// B12: read-only schematic door ports, vertical alignment and wall evidence.
// NO build plans, block IDs, world coords, actual wall construction or API calls.
import {createHash} from 'node:crypto';
import {buildB11FromFrozenRoot,validateB11Report} from './step8b-interior-repair-b11.mjs';
import {loadB10Frozen} from './step8b-interior-contract-b10.mjs';

const fail=(s)=>{const e=new Error('B12_'+s);e.code='B12_'+s;throw e;};
const hash=(v)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const pos=(p)=>`${p.x},${p.z}`;
const asSet=(a,w,d,label)=>{
 if(!Array.isArray(a))fail(label+'_INVALID');const s=new Set();
 for(const p of a){if(!Number.isSafeInteger(p?.x)||!Number.isSafeInteger(p?.z)||p.x<0||p.z<0||p.x>=w||p.z>=d)fail(label+'_OUT_OF_RANGE');s.add(pos(p));}
 return s;
};
const validMask=(s,w,d)=>typeof s==='string'&&s.length===w*d&&!/[^01]/.test(s);
const inside=(mask,w,p)=>mask[p.z*w+p.x]==='1';

export function inspectB12Floor(floorB10,floorB11,detail,w,d,height){
 if(!floorB10||!floorB11||!detail||![w,d,height].every(Number.isSafeInteger)||w<8||w>48||d<8||d>40||height<3||height>8||
   floorB10.level!==detail.level||floorB11.level!==detail.level||!validMask(floorB10.masks?.source,w,d)||
   !validMask(floorB10.masks?.concept,w,d)||floorB11.sourceMask!==floorB10.masks.source||!Array.isArray(detail.rooms))fail('FLOOR_INVALID');
 const corridor=asSet(detail.corridorCells,w,d,'CORRIDOR'), trimmed=asSet(floorB11.proposedCorridorCells,w,d,'TRIMMED_CORRIDOR');
 const stair=asSet(detail.coreStairCells,w,d,'STAIR'),elevator=asSet(detail.elevatorCells,w,d,'ELEVATOR');
 if(trimmed.size!==floorB11.corridorAfter||floorB11.corridorBefore!==corridor.size||[...trimmed].some(x=>!corridor.has(x)))fail('CORRIDOR_CONTRACT_MISMATCH');
 const rooms=[],edgeOwners=new Map(),invalid=[];
 for(const room of detail.rooms){
  if(typeof room.id!=='string'||![room.x,room.z,room.width,room.depth].every(Number.isSafeInteger)||room.width<1||room.depth<1||room.x<0||room.z<0||room.x+room.width>w||room.z+room.depth>d||room.level!==detail.level)fail('ROOM_INVALID');
  const p={x:room.door?.x,z:room.door?.z},h={x:room.door?.hallX,z:room.door?.hallZ};
  if(![p.x,p.z,h.x,h.z].every(Number.isSafeInteger)||p.x<0||p.z<0||p.x>=w||h.x<0||h.x>=w||p.z>=d||h.z<0||h.z>=d)fail('DOOR_INVALID');
  const roomDoorInside=p.x>=room.x&&p.x<room.x+room.width&&p.z>=room.z&&p.z<room.z+room.depth;
  const onBoundary=roomDoorInside&&(p.x===room.x||p.x===room.x+room.width-1||p.z===room.z||p.z===room.z+room.depth-1);
  const adjacent=Math.abs(p.x-h.x)+Math.abs(p.z-h.z)===1;
  const hallCorridor=corridor.has(pos(h)),hallRetained=trimmed.has(pos(h));
  const floorY= (detail.level-1)*height,correctNominalY=room.door.y===floorY;
  const nominalEdge=pos(p)+'>'+pos(h);
  edgeOwners.set(nominalEdge,(edgeOwners.get(nominalEdge)||0)+1);
  const checks={roomDoorInside,onBoundary,adjacent,hallCorridor,hallRetained,sourceRoom:inside(floorB10.masks.source,w,p),sourceHall:inside(floorB10.masks.source,w,h),correctNominalY};
  if(Object.values(checks).some(x=>x!==true))invalid.push({roomId:room.id,checks});
  rooms.push({roomId:room.id,doorCell:p,hallCell:h,nominalFloorY:floorY,doorY:room.door.y,schematicChecks:checks,
   wallThicknessEvidence:room.wallThicknessUnverified===true?'UNVERIFIED':'UNKNOWN',doorOpeningConstructed:false});
 }
 const duplicateNominalDoorEdges=[...edgeOwners.values()].filter(n=>n>1).length;
 if(duplicateNominalDoorEdges)invalid.push({kind:'SHARED_NOMINAL_DOOR_INTERFACE',count:duplicateNominalDoorEdges});
 const conceptToSourceChange=floorB10.conceptOnlyCells+floorB10.sourceOnlyCells;
 return {level:detail.level,yMin:(detail.level-1)*height,yMaxExclusive:detail.level*height,
  predictedFootprintCells:floorB10.sourceArea,conceptVsEngineChangedCells:conceptToSourceChange,
  sourceCorridorOutsideCells:floorB11.removedLocalCells.length,proposedCorridorOutsideCells:[...trimmed].filter(k=>{const [x,z]=k.split(',').map(Number);return !inside(floorB10.masks.source,w,{x,z})}).length,
  trimOnlyRemovedCells:floorB11.removedLocalCells,allRoomDoorsSchematicAligned:invalid.length===0,doorInterfaces:rooms.length,doorIssues:invalid,
  wallThicknessVerified:false,actualDoorOpeningVerified:false,fireEgressVerified:false,
  nominalDoorPortEdges:rooms,stairCells:detail.coreStairCells,elevatorCells:detail.elevatorCells,
  stairCellsInSource:[...stair].every(p=>{const [x,z]=p.split(',').map(Number);return inside(floorB10.masks.source,w,{x,z})}),
  elevatorCellsInSource:[...elevator].every(p=>{const [x,z]=p.split(',').map(Number);return inside(floorB10.masks.source,w,{x,z})}),
  sourceMask:floorB10.masks.source,conceptMask:floorB10.masks.concept,originalCorridorCells:detail.corridorCells,proof:'STATIC_LOCAL_XZ_PLUS_SCHEMATIC_Y_ONLY'};
}

export function inspectB12Vertical(levels,stair,height){
 if(!Array.isArray(levels)||levels.length<2||!stair||![height].every(Number.isSafeInteger)||height<3||height>8||!Array.isArray(stair.flights)||stair.flights.length!==levels.length-1)fail('VERTICAL_INVALID');
 const same=(a,b)=>JSON.stringify([...a].map(pos).sort())===JSON.stringify([...b].map(pos).sort());
 const levelsOrdered=levels.every((l,i)=>l.level===i+1&&l.yMin===i*height&&l.yMaxExclusive===(i+1)*height);
 const staircaseXZAligned=levels.slice(1).every(l=>same(l.stairCells,levels[0].stairCells));
 const elevatorXZAligned=levels.slice(1).every(l=>same(l.elevatorCells,levels[0].elevatorCells));
 const nominalFlightYAligned=stair.flights.every((f,i)=>f.fromFloor===i+1&&f.toFloor===i+2&&f.fromY===i*height&&f.toY===(i+1)*height);
 const reservationsWithinSource=levels.every(l=>l.stairCellsInSource&&l.elevatorCellsInSource);
 return {floors:levels.length,floorHeight:height,buildingNominalTopY:levels.length*height,levelsOrdered,staircaseXZAligned,elevatorXZAligned,nominalFlightYAligned,
  reservationsWithinSource,schematicAlignmentPass:levelsOrdered&&staircaseXZAligned&&elevatorXZAligned&&nominalFlightYAligned&&reservationsWithinSource,
  installedStairBlocksVerified:false,physicalHeadroomVerified:false,elevatorTravelVerified:false,verticalConnectionUsableVerified:false,
  proof:'SCHEMATIC_VERTICAL_RESERVATIONS_ONLY'};
}

export function compareB12Alternatives(b10,c11){
 if(!b10||!c11||b10.key!==c11.key||b10.levels.length!==c11.levels.length)fail('ALTERNATIVES_INPUT');
 const geometricDiff=b10.summary.conceptOnlyCells+b10.summary.sourceOnlyCells;
 const removed=c11.summary.nonAppliedRemovals;
 const common={buildingKey:b10.key,sourcePredictedFootprintRetained:true,codeExecutionPossible:false,materialIDsVerified:false,physicalFeasibility:'UNVERIFIED',application:'NOT_APPLIED'};
 const options=[{...common,id:'KEEP_ORIGINAL',sourceMismatchCells:geometricDiff,interiorOutsideSourceCells:removed,conceptCorridorRemoved:0,engineFormulaChangesNeeded:false,
     note:removed?'元案を保持。はみ出す廊下端は未解決のまま。':'元案を保持。今回の2D照合で廊下のはみ出しはなし。'}];
 if(removed>0)options.push({...common,id:'LOCAL_CORRIDOR_TRIM',sourceMismatchCells:geometricDiff,interiorOutsideSourceCells:0,conceptCorridorRemoved:removed,engineFormulaChangesNeeded:false,
     note:`廊下端${removed}セルの2D案のみ。予測エンジンとの建物外形${geometricDiff}セル差分は解決しない。`});
 if(geometricDiff>0)options.push({...common,id:'CONCEPT_ENVELOPE_REFERENCE',sourcePredictedFootprintRetained:false,sourceMismatchCells:geometricDiff,interiorOutsideSourceCells:0,conceptCorridorRemoved:0,engineFormulaChangesNeeded:true,
  note:'概念輪郭の表示だけを参照。予測エンジンを変更する必要があり、実装・安全性未検証。'});
 return options;
}

export function buildB12Report(root){
 const {b10,report:b11}=buildB11FromFrozenRoot(root);validateB11Report(b11,b10);
 const reviews=loadB10Frozen(root).reviews;
 const candidates=b10.frozenBuildings.map((b)=>{
  const original=reviews[b.program].candidates.find(c=>`${b.program}/${c.id}`===b.key);
  const prior=b11.candidates.find(c=>c.key===b.key);
  if(!original||!prior||original.detail.stair.headroomVerified!==false||original.architecture.circulation.internalWallsAssumedAbsent!==true)fail('FROZEN_EVIDENCE');
  const levels=b.levels.map((floor,i)=>inspectB12Floor(floor,prior.levels[i],original.detail.roomsAndCorridors.floors[i],b.dimensions.width,b.dimensions.depth,b.floorHeight));
  const vertical=inspectB12Vertical(levels,original.detail.stair,b.floorHeight);
  const alternatives=compareB12Alternatives(b,prior);
  return {key:b.key,dimensions:b.dimensions,floorHeight:b.floorHeight,levels,vertical,
   summary:{doorInterfaces:levels.reduce((n,f)=>n+f.doorInterfaces,0),doorIssueCount:levels.reduce((n,f)=>n+f.doorIssues.length,0),
    sourceMismatchCells:levels.reduce((n,f)=>n+f.conceptVsEngineChangedCells,0),localCorridorTrimCells:levels.reduce((n,f)=>n+f.trimOnlyRemovedCells.length,0),
    schematicYAndXZAligned:vertical.schematicAlignmentPass&&levels.every(f=>f.allRoomDoorsSchematicAligned),physicalWallsVerified:false},
   alternatives,proposalStatus:'REVIEW_ONLY_NOT_APPLIED',BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}};
 });
 if(candidates.length!==5||candidates.reduce((n,c)=>n+c.summary.localCorridorTrimCells,0)!==18||candidates.reduce((n,c)=>n+c.summary.sourceMismatchCells,0)!==123)fail('FROZEN_BASELINE_DIVERGED');
 const report={schema:'minecraftaibuilder-step8b-b12-spatial-contract-v1',status:'STATIC_SCHEMATIC_ONLY',
  evidence:{b10ReportSha256:b10.reportSha256,b11ReportSha256:b11.reportSha256,originalSourceSha256:b10.sourceEvidence.immutableSha256,
    staticWindowsSnapshotManifestSha256:b10.sourceEvidence.snapshotManifestSha256},
  candidates,findings:{buildings:5,floors:30,doorInterfaces:candidates.reduce((n,c)=>n+c.summary.doorInterfaces,0),
     nominalDoorIssues:candidates.reduce((n,c)=>n+c.summary.doorIssueCount,0),
     nominalAlignedCandidates:candidates.filter(c=>c.summary.schematicYAndXZAligned).length,
     knownWallThicknessModules:0,doorBlocksPlaced:0,sourceMismatchCells:123,nonAppliedTrimCells:18,
     reviewAlternativesForOffice02:3,physicalInteriorSafetyProven:false},
  unsafeUnknowns:['ACTUAL_WALL_THICKNESS','ACTUAL_DOOR_OPENINGS','STAIR_HEADROOM_AND_BLOCKS','ACTUAL_MODULE_COLLISIONS','ACCESSIBILITY_AND_FIRE_EGRESS','MATERIAL_IDS','WORLD_ANCHOR','RUNNING_ENGINE_IDENTITY'],
  staticContract:{localCoordinatesOnly:true,conceptWallThicknessUnknown:true,doorPortAdjacencyIsNotInstalledDoor:true,
    verticalReservationsAreNotPassableStairs:true,automaticProposalApplication:false,actualEngineExecution:false,apiCalls:false,
    materialIds:[],worldCoordinates:null},
  deploymentGate:'BLOCKED',BuildPlan:{status:'NOT_PREPARED',commandCount:0,operations:[]},
  safety:{constructionApproved:false,executionAllowed:false,legacyModified:false,existingWorldModified:false,frozenEvidenceModified:false}};
 report.reportSha256=hash(report);return report;
}
export function validateB12Report(report,root){
 if(!report||report.schema!=='minecraftaibuilder-step8b-b12-spatial-contract-v1'||report.deploymentGate!=='BLOCKED'||
  report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.commandCount!==0||!Array.isArray(report.BuildPlan.operations)||report.BuildPlan.operations.length||
  report.safety?.executionAllowed!==false||report.safety?.constructionApproved!==false||report.staticContract?.automaticProposalApplication!==false||
  report.staticContract?.actualEngineExecution!==false||report.staticContract?.apiCalls!==false||report.staticContract?.worldCoordinates!==null||
  report.staticContract?.materialIds?.length||report.findings?.physicalInteriorSafetyProven!==false||
  report.candidates?.some(c=>c.proposalStatus!=='REVIEW_ONLY_NOT_APPLIED'||c.BuildPlan?.status!=='NOT_PREPARED'||c.BuildPlan.operations.length))fail('UNSAFE_REPORT');
 const {reportSha256,...rest}=report;
 if(hash(rest)!==reportSha256||hash(buildB12Report(root))!==hash(report))fail('ALTERED_REPORT');
 return true;
}
