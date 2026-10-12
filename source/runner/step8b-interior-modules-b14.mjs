/**
 * @typedef {{x:number,z:number}} LocalXZ
 * @typedef {{kind:'NOMINAL_WALL_BOUNDARY'|'NOMINAL_DOOR_INTERFACE',a:LocalXZ,b:LocalXZ,level:number,yBase:number,roomIds:string[],materialId:null,wallThickness:null,openingClearance:null,physicalValidated:false}} ConceptEdge
 * B14 constructs ONLY schematic, local-coordinate records. It NEVER maps to Minecraft
 * blocks or command/execution plans, even if a review is marked preferred.
 */
import {createHash} from 'node:crypto';
import {buildB12Report,validateB12Report} from './step8b-spatial-contract-b12.mjs';
import {buildB13Report,validateB13Report} from './step8b-module-contract-b13.mjs';
import {loadB10Frozen} from './step8b-interior-contract-b10.mjs';
const fail = reason => {const e=Error('B14_'+reason);e.code='B14_'+reason;throw e;};
const digest = value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const asCell=(p,w,d)=>Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p?.z)&&p.x>=0&&p.z>=0&&p.x<w&&p.z<d;
const xy=p=>`${p.x},${p.z}`;
const edgeId=(a,b)=>[xy(a),xy(b)].sort().join('|');
function candidateRooms(frozen,building){
 const [program,id]=building.key.split('/');
 const c=frozen.reviews[program]?.candidates?.find(x=>x.id===id);
 if(!c||c.detail?.roomsAndCorridors?.floors?.length!==building.levels.length)fail('FROZEN_ROOM_PROVENANCE');
 return c.detail.roomsAndCorridors.floors;
}
/** Interior contract checks nominal room perimeter edges and reservation cell conflicts. */
export function inspectB14Floor(floor,detail,dimensions,height){
 const {width:w,depth:d}=dimensions;
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(d)||w<8||w>48||d<8||d>40||!Number.isSafeInteger(height)||height<3||height>8||
  !floor||!detail||detail.level!==floor.level||floor.sourceMask?.length!==w*d||/[^01]/.test(floor.sourceMask)||!Array.isArray(detail.rooms)||!Array.isArray(detail.corridorCells)||!Array.isArray(detail.coreStairCells)||!Array.isArray(detail.elevatorCells))fail('INPUT_INVALID');
 const source=cell=>asCell(cell,w,d)&&floor.sourceMask[cell.z*w+cell.x]==='1';
 const corridor=new Set(detail.corridorCells.map(xy)),stair=new Set(detail.coreStairCells.map(xy)),elevator=new Set(detail.elevatorCells.map(xy));
 const retained=new Set(floor.originalCorridorCells.map(xy));
 if(corridor.size!==retained.size||[...corridor].some(k=>!retained.has(k)))fail('CORRIDOR_CHANGED');
 for(const s of [detail.corridorCells,detail.coreStairCells,detail.elevatorCells])if(s.some(c=>!asCell(c,w,d)))fail('RESERVATION_OUT_OF_BOUNDS');
 const edgeMap=new Map(),roomOccupants=new Map(),issues=[];
 const roomPortLookup=new Map(floor.nominalDoorPortEdges.map(p=>[p.roomId,p]));
 for(const room of detail.rooms){
  if(typeof room.id!=='string'||!room.id||![room.x,room.z,room.width,room.depth].every(Number.isSafeInteger)||room.width<1||room.depth<1||room.x<0||room.z<0||room.x+room.width>w||room.z+room.depth>d||room.level!==floor.level)fail('ROOM_BOUNDS');
  const port=roomPortLookup.get(room.id);if(!port)fail('DOOR_PORT_MISSING');
  for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++){
   const k=`${x},${z}`;let owners=roomOccupants.get(k);if(!owners)roomOccupants.set(k,owners=[]);owners.push(room.id);
   if(!source({x,z}))issues.push({kind:'ROOM_CELL_OUTSIDE_SOURCE',cell:{x,z},room:room.id});
  }
  // Edges between occupied room boundary cells and adjacent NON-ROOM cells.
  for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++){
   for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
    const a={x,z},b={x:x+dx,z:z+dz};
    if(b.x>=room.x&&b.x<room.x+room.width&&b.z>=room.z&&b.z<room.z+room.depth)continue;
    const key=edgeId(a,b);let e=edgeMap.get(key);
    if(!e){e={kind:'NOMINAL_WALL_BOUNDARY',a,b,level:floor.level,yBase:floor.yMin,roomIds:[],materialId:null,wallThickness:null,openingClearance:null,physicalValidated:false};edgeMap.set(key,e);}
    if(!e.roomIds.includes(room.id))e.roomIds.push(room.id);
   }
  }
  if(!asCell(port.doorCell,w,d)||!asCell(port.hallCell,w,d)||Math.abs(port.doorCell.x-port.hallCell.x)+Math.abs(port.doorCell.z-port.hallCell.z)!==1)fail('DOOR_GEOMETRY');
  const key=edgeId(port.doorCell,port.hallCell),boundary=edgeMap.get(key);
  if(!boundary||!boundary.roomIds.includes(room.id)||port.nominalFloorY!==floor.yMin||port.doorY!==floor.yMin)fail('DOOR_NOT_ON_BOUNDARY');
  if(!Object.values(port.schematicChecks).every(x=>x===true))fail('DOOR_BASELINE_INVALID');
  boundary.kind='NOMINAL_DOOR_INTERFACE';
 }
 if(roomPortLookup.size!==detail.rooms.length||floor.doorInterfaces!==detail.rooms.length)fail('DOOR_COUNT');
 const edges=[...edgeMap.values()].map(e=>({...e,roomIds:e.roomIds.sort()})).sort((a,b)=>edgeId(a.a,a.b).localeCompare(edgeId(b.a,b.b)));
 const multipleRoomCells=[...roomOccupants].filter(([,owners])=>owners.length>1).length;
 const roomCorridorOverlap=[...roomOccupants.keys()].filter(k=>corridor.has(k)).length;
 const roomStairOverlap=[...roomOccupants.keys()].filter(k=>stair.has(k)).length;
 const roomElevatorOverlap=[...roomOccupants.keys()].filter(k=>elevator.has(k)).length;
 const stairElevatorOverlap=[...stair].filter(k=>elevator.has(k)).length;
 const doorInterfaceCount=edges.filter(x=>x.kind==='NOMINAL_DOOR_INTERFACE').length;
 const summary={nominalBoundaryEdges:edges.length,nominalDoorInterfaces:doorInterfaceCount,sharedOrDuplicateDoorInterfaces:detail.rooms.length-doorInterfaceCount,
  multipleRoomCells,roomCorridorOverlap,roomStairOverlap,roomElevatorOverlap,stairElevatorOverlap,roomCellsOutsideEngineFootprint:issues.length,nominalCorridorOutsideEngineFootprint:floor.sourceCorridorOutsideCells,
  materialSupportVerified:false,wallThicknessVerified:false,physicalDoorClearanceVerified:false,stairHeadroomVerified:false};
 return {level:floor.level,localYRange:[floor.yMin,floor.yMaxExclusive],dimensions:{width:w,depth:d},
  edgeContracts:edges,nominalStairReservation:detail.coreStairCells,nominalElevatorReservation:detail.elevatorCells,
  localCorridorReservation:detail.corridorCells,sourcePredictedMask:floor.sourceMask,summary,
  issues:issues.slice(0,100),issueTotal:issues.length,coordinateFrame:'SCHEMATIC_LOCAL_XZ_AND_NOMINAL_Y',
  wallBlockThickness:null,doorClearHeight:null,stairBlockType:null,materialIds:[],worldAnchor:null,
  physicallyBuildable:'UNKNOWN',application:'REVIEW_ONLY_NOT_APPLIED'};
}
export function buildB14Report(root){
 const b12=buildB12Report(root);validateB12Report(b12,root);
 const b13=buildB13Report(root);validateB13Report(b13,root);
 const frozen=loadB10Frozen(root);
 const candidates=b12.candidates.map(building=>{
  const details=candidateRooms(frozen,building);
  const levels=building.levels.map((floor,i)=>inspectB14Floor(floor,details[i],building.dimensions,building.floorHeight));
  const sum=key=>levels.reduce((n,x)=>n+x.summary[key],0);
  return {key:building.key,dimensions:building.dimensions,nominalFloorHeight:building.floorHeight,
   levels,vertical:{nominalAlignment:building.vertical.schematicAlignmentPass,stairHeadroomVerified:false,stairBlockAssemblyVerified:false,elevatorMechanismVerified:false},
   summary:{nominalBoundaryEdges:sum('nominalBoundaryEdges'),nominalDoorInterfaces:sum('nominalDoorInterfaces'),
    roomCellsOutsideEngineFootprint:sum('roomCellsOutsideEngineFootprint'),multipleRoomCells:sum('multipleRoomCells'),
    roomCorridorOverlap:sum('roomCorridorOverlap'),roomStairOverlap:sum('roomStairOverlap'),roomElevatorOverlap:sum('roomElevatorOverlap'),
    stairElevatorOverlap:sum('stairElevatorOverlap'),nominalCorridorOutsideEngineFootprint:sum('nominalCorridorOutsideEngineFootprint')},
   next:'INSPECT_UNRESOLVED_NOMINAL_GEOMETRY_ONLY',proposalApplied:false};
 });
 if(candidates.length!==5||candidates.reduce((n,c)=>n+c.levels.length,0)!==30||candidates.reduce((n,c)=>n+c.summary.nominalDoorInterfaces,0)!==314)fail('FROZEN_BASELINE_CHANGED');
 const total=k=>candidates.reduce((n,c)=>n+c.summary[k],0);
 const report={schema:'minecraftaibuilder-step8b-b14-module-input-contract-v1',status:'OFFLINE_SCHEMATIC_INPUT_ONLY',
  evidence:{b12ReportSha256:b12.reportSha256,b13ReportSha256:b13.reportSha256,sourcePinnedSha256:b13.evidence.pinnedSnapshotFiles,engineExecuted:false,sourceFrozen:true},
  units:{horizontal:'LOCAL_CONCEPT_CELLS',vertical:'NOMINAL_LOCAL_Y',oneNominalCellEqualsPhysicalBlock:'UNVERIFIED',orientationWorldMapping:null},
  candidates,
  totals:{buildings:5,levels:30,nominalDoorInterfaces:total('nominalDoorInterfaces'),nominalBoundaryEdges:total('nominalBoundaryEdges'),
   roomCellsOutsideEngineFootprint:total('roomCellsOutsideEngineFootprint'),multipleRoomCells:total('multipleRoomCells'),
   roomCorridorOverlap:total('roomCorridorOverlap'),roomStairOverlap:total('roomStairOverlap'),roomElevatorOverlap:total('roomElevatorOverlap'),
   stairElevatorOverlap:total('stairElevatorOverlap'),nominalCorridorOutsideEngineFootprint:total('nominalCorridorOutsideEngineFootprint'),verifiedPhysicalDoorOpenings:0,verifiedRealWalls:0,verifiedStairAssemblies:0},
  missingContracts:['WALL_THICKNESS_BLOCK_GEOMETRY','DOOR_WIDTH_HEIGHT_AND_HINGE','STAIR_TREAD_RISE_HEADROOM','INTERIOR_PASSABILITY','MATERIAL_ID_EDUCATION_SUPPORT','WORLD_ANCHOR','ENGINE_RUNTIME_IDENTITY','USER_APPROVAL'],
  reviewAlternatives:b13.office02ReviewAlternatives.map(x=>({id:x.id,conceptualMismatchCells:x.conceptualMismatchCells,nominalCorridorOutsideCells:x.nominalCorridorOutsideCells,applied:false,approved:false,operations:[]})),
  approval:'NOT_REQUESTED',deploymentGate:'BLOCKED',
  safety:{notPrepared:true,executionAllowed:false,constructionApproved:false,legacyModified:false,existingWorldModified:false,frozenEvidenceModified:false,bridgeContact:false,networkAccess:false},
  BuildPlan:{status:'NOT_PREPARED',commandCount:0,operations:[],worldCoordinates:null,materialIds:[]}};
 report.reportSha256=digest(report);return report;
}
export function validateB14Report(report,root){
 if(!report||report.schema!=='minecraftaibuilder-step8b-b14-module-input-contract-v1'||report.status!=='OFFLINE_SCHEMATIC_INPUT_ONLY'||report.deploymentGate!=='BLOCKED'||report.approval!=='NOT_REQUESTED'||
  report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.commandCount!==0||!Array.isArray(report.BuildPlan?.operations)||report.BuildPlan.operations.length||report.BuildPlan.worldCoordinates!==null||report.BuildPlan.materialIds?.length||
  report.safety?.notPrepared!==true||report.safety?.executionAllowed!==false||report.safety?.constructionApproved!==false||report.safety?.bridgeContact!==false||report.safety?.networkAccess!==false||
  report.evidence?.engineExecuted!==false||report.totals?.verifiedRealWalls!==0||report.totals?.verifiedPhysicalDoorOpenings!==0||report.totals?.verifiedStairAssemblies!==0||
  report.candidates?.some(c=>c.proposalApplied!==false||c.levels?.some(l=>l.worldAnchor!==null||l.materialIds?.length||l.physicallyBuildable!=='UNKNOWN'||l.application!=='REVIEW_ONLY_NOT_APPLIED'||l.edgeContracts?.some(e=>e.wallThickness!==null||e.materialId!==null||e.physicalValidated!==false)))||
  report.totals?.nominalCorridorOutsideEngineFootprint!==18||report.reviewAlternatives?.some(a=>a.applied||a.approved||a.operations?.length))fail('UNSAFE_REPORT');
 const {reportSha256,...content}=report;
 if(digest(content)!==reportSha256||digest(buildB14Report(root))!==digest(report))fail('ALTERED_OR_STALE_REPORT');
 return true;
}
