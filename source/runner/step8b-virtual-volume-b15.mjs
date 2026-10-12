/**
 * B15: local, hypothetical space-claim review. Not voxel coordinates, not a BuildPlan.
 * Virtual thickness/height values are exploration inputs, NOT Minecraft evidence.
 */
import {createHash} from 'node:crypto';
import {buildB14Report,validateB14Report} from './step8b-interior-modules-b14.mjs';
import {buildB13Report,validateB13Report} from './step8b-module-contract-b13.mjs';
const fail=(reason)=>{const e=Error('B15_'+reason);e.code='B15_'+reason;throw e;};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const format=p=>p.x+','+p.z;
const VIRTUAL_SCENARIOS=Object.freeze([
 Object.freeze({id:'THIN_REVIEW',thickness:0.25,wallHeight:2,doorClearHeight:2,stairClearHeight:2}),
 Object.freeze({id:'MEDIUM_REVIEW',thickness:0.50,wallHeight:3,doorClearHeight:2,stairClearHeight:2}),
 Object.freeze({id:'THICK_REVIEW',thickness:1.00,wallHeight:3,doorClearHeight:2,stairClearHeight:3}),
]);
export const B15_SCENARIOS=VIRTUAL_SCENARIOS;
function validScenario(v){
 if(!v||!['thickness','wallHeight','doorClearHeight','stairClearHeight'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]))||
  !(v.thickness>0&&v.thickness<=1&&v.wallHeight>=2&&v.wallHeight<=4&&v.doorClearHeight>=1&&v.doorClearHeight<=v.wallHeight&&v.stairClearHeight>=2&&v.stairClearHeight<=4))fail('SCENARIO_INVALID');
}
function boundsForEdge(e,scenario,floor){
 if(!e||!['NOMINAL_WALL_BOUNDARY','NOMINAL_DOOR_INTERFACE'].includes(e.kind)||e.physicalValidated!==false||e.materialId!==null||e.wallThickness!==null||e.openingClearance!==null||
  !Number.isSafeInteger(e.level)||e.level!==floor.level||e.yBase!==floor.localYRange[0]||!e.a||!e.b||
  ![e.a.x,e.a.z,e.b.x,e.b.z].every(Number.isSafeInteger)||Math.abs(e.a.x-e.b.x)+Math.abs(e.a.z-e.b.z)!==1)fail('EDGE_UNSAFE');
 const half=scenario.thickness/2;
 if(e.a.x!==e.b.x){const cut=Math.max(e.a.x,e.b.x);return {x0:cut-half,x1:cut+half,z0:e.a.z,z1:e.a.z+1};}
 const cut=Math.max(e.a.z,e.b.z);return {x0:e.a.x,x1:e.a.x+1,z0:cut-half,z1:cut+half};
}
function intersects(box,cell){return box.x0<cell.x+1&&box.x1>cell.x&&box.z0<cell.z+1&&box.z1>cell.z;}
/** One floor, one *virtual* sizing scenario. Counts are review contacts, not unsafe collisions. */
export function inspectB15Floor(floor,scenario){
 validScenario(scenario);
 if(!floor||!Array.isArray(floor.edgeContracts)||!Array.isArray(floor.localCorridorReservation)||!Array.isArray(floor.nominalStairReservation)||!Array.isArray(floor.nominalElevatorReservation)||
  floor.coordinateFrame!=='SCHEMATIC_LOCAL_XZ_AND_NOMINAL_Y'||floor.worldAnchor!==null||floor.materialIds?.length||floor.application!=='REVIEW_ONLY_NOT_APPLIED'||
  floor.physicallyBuildable!=='UNKNOWN'||!Array.isArray(floor.localYRange)||!Number.isSafeInteger(floor.level))fail('FLOOR_UNSAFE');
 const {width:w,depth:d}=floor.dimensions||{};
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(d)||w<8||w>48||d<8||d>40||floor.sourcePredictedMask?.length!==w*d||floor.edgeContracts.length>2500)fail('DIMENSIONS');
 const inside=p=>Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p?.z)&&p.x>=0&&p.z>=0&&p.x<w&&p.z<d;
 const reservations=[['corridor',floor.localCorridorReservation],['stair',floor.nominalStairReservation],['elevator',floor.nominalElevatorReservation]];
 for(const [,cells] of reservations){if(cells.length>w*d||cells.some(p=>!inside(p))||new Set(cells.map(format)).size!==cells.length)fail('RESERVATION_INVALID');}
 const impacts={corridor:new Set(),stair:new Set(),elevator:new Set()}, boundaryContacts={corridor:0,stair:0,elevator:0},projectedContactArea={corridor:0,stair:0,elevator:0};
 let nominalWalls=0,nominalDoors=0,doorVirtualHeightGap=0,edgeOutside=0;
 const touchingDoors={corridor:0,stair:0,elevator:0};
 for(const [i,e] of floor.edgeContracts.entries()){
  const box=boundsForEdge(e,scenario,floor);
  if(box.x0<0||box.z0<0||box.x1>w||box.z1>d)edgeOutside++;
  if(e.kind==='NOMINAL_DOOR_INTERFACE'){
   nominalDoors++;
   // A candidate door opening is a VOID hypothesis, not installed door geometry.
   if(scenario.doorClearHeight<scenario.wallHeight)doorVirtualHeightGap++;
  } else nominalWalls++;
  for(const [name,cells] of reservations){
   let intersectsAny=false;
   for(const p of cells){if(intersects(box,p)){
     intersectsAny=true;
     if(e.kind==='NOMINAL_WALL_BOUNDARY'){impacts[name].add(format(p));const dx=Math.max(0,Math.min(box.x1,p.x+1)-Math.max(box.x0,p.x));const dz=Math.max(0,Math.min(box.z1,p.z+1)-Math.max(box.z0,p.z));projectedContactArea[name]+=dx*dz;}
   }}
   if(intersectsAny){boundaryContacts[name]++;if(e.kind==='NOMINAL_DOOR_INTERFACE')touchingDoors[name]++;}
  }
 }
 if(nominalWalls+nominalDoors!==floor.edgeContracts.length)fail('EDGE_COUNT');
 const issues=[];
 if(edgeOutside)issues.push('VIRTUAL_THICKNESS_CROSSES_LOCAL_BOUNDARY');
 if(scenario.doorClearHeight>floor.localYRange[1]-floor.localYRange[0])issues.push('VIRTUAL_DOOR_EXCEEDS_FLOOR_HEIGHT');
 if(scenario.stairClearHeight>floor.localYRange[1]-floor.localYRange[0])issues.push('VIRTUAL_STAIR_ENVELOPE_EXCEEDS_FLOOR_HEIGHT');
 // Even when no simulated interference occurs, real clearance remains UNKNOWN.
 return {level:floor.level,scenarioId:scenario.id,virtualOnly:true,coordinateFrame:'SCHEMATIC_LOCAL_XZ_AND_NOMINAL_Y',
  envelope:{thickness:scenario.thickness,wallHeight:scenario.wallHeight,doorClearHeight:scenario.doorClearHeight,stairClearHeight:scenario.stairClearHeight,units:'HYPOTHETICAL_NOMINAL_CELLS_NOT_BLOCKS'},
  counts:{nominalWalls,nominalDoors,edgeOutside,doorVirtualHeightGap,
    corridorContactCells:impacts.corridor.size,stairContactCells:impacts.stair.size,elevatorContactCells:impacts.elevator.size,
    boundaryContacts,touchingDoors,projectedContactArea:Object.fromEntries(Object.entries(projectedContactArea).map(([k,v])=>[k,Math.round(v*1000)/1000]))},
  issues,physicalResult:'UNKNOWN',materialIds:[],worldAnchor:null,actions:[],commandCount:0};
}
function summarizeScenario(floors,scenario){
 const counts={nominalWalls:0,nominalDoors:0,edgeOutside:0,doorVirtualHeightGap:0,corridorContactCells:0,stairContactCells:0,elevatorContactCells:0,projectedCorridorContactArea:0,projectedStairContactArea:0};
 const byBuilding=[];
 for(const b of floors){const levels=b.levels.map(l=>inspectB15Floor(l,scenario));
  const sum={};for(const key of Object.keys(counts))sum[key]=levels.reduce((n,l)=>n+(key==='projectedCorridorContactArea'?l.counts.projectedContactArea.corridor:key==='projectedStairContactArea'?l.counts.projectedContactArea.stair:l.counts[key]),0); for(const k of ['projectedCorridorContactArea','projectedStairContactArea'])sum[k]=Math.round(sum[k]*1000)/1000;
  for(const k of Object.keys(counts))counts[k]+=sum[k];
  byBuilding.push({key:b.key,nominalFloorHeight:b.nominalFloorHeight,levels,totals:sum});
 }
 for(const k of ['projectedCorridorContactArea','projectedStairContactArea'])counts[k]=Math.round(counts[k]*1000)/1000;return {id:scenario.id,virtualParameters:{...scenario,units:'HYPOTHETICAL_NOMINAL_UNITS'},totals:counts,buildings:byBuilding};
}
export function buildB15Report(root){
 const b14=buildB14Report(root);validateB14Report(b14,root);
 const b13=buildB13Report(root);validateB13Report(b13,root);
 const virtualScenarios=VIRTUAL_SCENARIOS.map(s=>summarizeScenario(b14.candidates,s));
 const sourceModules=b13.coverage ?? null;
 const report={schema:'minecraftaibuilder-step8b-b15-virtual-space-review-v1',status:'OFFLINE_HYPOTHETICAL_GEOMETRY_NOT_CONSTRUCTION',
  evidence:{b14ReportSha256:b14.reportSha256,b13ReportSha256:b13.reportSha256,sourcePinnedSha256:b14.evidence.sourcePinnedSha256,engineExecuted:false,sourceFrozen:true,originalB14InputEdges:b14.totals.nominalBoundaryEdges},
  baseline:{buildings:b14.totals.buildings,levels:b14.totals.levels,nominalBoundaries:b14.totals.nominalBoundaryEdges,nominalDoors:b14.totals.nominalDoorInterfaces,
   unresolvedOffice02FootprintCells:123,unresolvedOffice02CorridorCells:b14.totals.nominalCorridorOutsideEngineFootprint},
  virtualScenarios,
  interfaceContract:{sourceModulesInspected:sourceModules?true:false,reviewingPinnedFiles:Object.keys(b14.evidence.sourcePinnedSha256),
   nominalToPhysicalMapping:'UNVERIFIED',interiorWallBuildInterface:'NOT_VERIFIED_IN_SCOPED_PLANNER',individualRoomDoorBuildInterface:'NOT_VERIFIED_IN_SCOPED_PLANNER',
   staircaseBuildInterface:'NOT_VERIFIED_IN_SCOPED_PLANNER',elevatorTravelInterface:'NOT_VERIFIED_IN_SCOPED_PLANNER',
   knownGeneralPlannerScope:['floor','exterior wall','window','building entrance','roof'],
   proof:'SOURCE_INSPECTION_SCOPE_ONLY_NOT_RUNTIME_ASSERTION',
   required:['PHYSICAL_CELL_SCALE','WALL_BLOCK_THICKNESS','REAL_DOOR_OPENING_WIDTH_HEIGHT_DIRECTION','STAIR_TREAD_RISE_HEADROOM','STRUCTURAL_SUPPORT','MATERIAL_BLOCK_ID_AND_STATE','WORLD_TRANSFORM','ENGINE_RUNTIME_IDENTITY','USER_CONSTRUCTION_APPROVAL']},
  physicalVerified:{walls:0,doors:0,stairs:0,roomPassages:0},application:'REVIEW_ONLY_NOT_APPLIED',deploymentGate:'BLOCKED',approval:'NOT_REQUESTED',
  safety:{notPrepared:true,executionAllowed:false,constructionApproved:false,existingWorldModified:false,legacyModified:false,frozenEvidenceModified:false,bridgeContact:false,networkAccess:false},
  BuildPlan:{status:'NOT_PREPARED',commandCount:0,operations:[],worldCoordinates:null,materialIds:[]}};
 report.reportSha256=hash(report);return report;
}
export function validateB15Report(report,root){
 if(!report||report.schema!=='minecraftaibuilder-step8b-b15-virtual-space-review-v1'||report.status!=='OFFLINE_HYPOTHETICAL_GEOMETRY_NOT_CONSTRUCTION'||
  report.deploymentGate!=='BLOCKED'||report.approval!=='NOT_REQUESTED'||report.application!=='REVIEW_ONLY_NOT_APPLIED'||
  report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.commandCount!==0||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.worldCoordinates!==null||report.BuildPlan?.materialIds?.length!==0||
  report.safety?.notPrepared!==true||report.safety?.executionAllowed!==false||report.safety?.constructionApproved!==false||report.safety?.existingWorldModified!==false||report.safety?.legacyModified!==false||report.safety?.frozenEvidenceModified!==false||report.safety?.bridgeContact!==false||report.safety?.networkAccess!==false||
  report.baseline?.nominalBoundaries!==5704||report.baseline?.nominalDoors!==314||report.baseline?.unresolvedOffice02FootprintCells!==123||report.baseline?.unresolvedOffice02CorridorCells!==18||report.evidence?.engineExecuted!==false||
  JSON.stringify(report.physicalVerified)!==JSON.stringify({walls:0,doors:0,stairs:0,roomPassages:0})||
  !Array.isArray(report.virtualScenarios)||report.virtualScenarios.length!==3||report.virtualScenarios.some(s=>s.buildings?.length!==5||s.buildings.some(b=>b.levels?.length!==6||b.levels.some(l=>l.physicalResult!=='UNKNOWN'||l.worldAnchor!==null||l.materialIds?.length||l.actions?.length||l.commandCount!==0))))fail('UNSAFE_REPORT');
 const {reportSha256,...content}=report;
 if(hash(content)!==reportSha256||hash(buildB15Report(root))!==hash(report))fail('ALTERED_OR_STALE_REPORT');
 return true;
}
