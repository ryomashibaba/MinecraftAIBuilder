/** B63: compare B62's UNAPPROVED route with B18's hypothetical 3D partition solids.
 * STATIC REVIEW ONLY. No actual wall thickness, room occupancy, clearances, or block state asserted.
 */
import {createHash} from 'node:crypto';
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const bad = why => {throw Error('B63_'+why);};
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const key = p => `${p.x},${p.z}`;
function checkReport(x,name){
 if(!x || typeof x!=='object'||Array.isArray(x) || typeof x.reportSha256!=='string')bad(name+'_TYPE');
 const {reportSha256,...body}=x;
 if(sha(body)!==reportSha256)bad(name+'_SHA');
 if(x.BuildPlan?.status!=='NOT_PREPARED'||x.BuildPlan.operations?.length!==0||x.BuildPlan.commandCount!==0)bad(name+'_OPERATIONS');
 if(x.executionAllowed===true||x.constructionApproved===true||x.safety?.executionAllowed===true||x.safety?.constructionApproved===true)bad(name+'_PERMISSION');
}
const validBounds=b => Array.isArray(b?.min)&&Array.isArray(b?.max)&&b.min.length===3&&b.max.length===3&&b.min.every((x,i)=>Number.isFinite(x)&&x>=0&&Number.isFinite(b.max[i])&&b.max[i]>x&&b.max[i]<1000);
const distAxis=(v,lo,hi) => Math.max(lo-v,0,v-hi);
const centerDist=(p,b)=>Math.hypot(distAxis(p.x+.5,b.min[0],b.max[0]),distAxis(p.z+.5,b.min[2],b.max[2]));
const boxesOverlap=(a,b)=>a.min[0]<b.max[0]&&a.max[0]>b.min[0]&&a.min[1]<b.max[1]&&a.max[1]>b.min[1]&&a.min[2]<b.max[2]&&a.max[2]>b.min[2];
const walker=(p,width)=>({min:[p.x+.5-width/2,0,p.z+.5-width/2],max:[p.x+.5+width/2,2,p.z+.5+width/2]});
function reservedBox(p){return {min:[p.x,0,p.z],max:[p.x+1,2,p.z+1]};}
const rounded=x=>Math.round(x*1e6)/1e6;
function modelSolids(partitions){
 const solids=[],seen=new Set();
 for(const p of partitions){
  if(typeof p.id!=='string'||seen.has(p.id)||p.modelOnly!==true||!Array.isArray(p.roomIds)||!Array.isArray(p.solids))bad('B18_PARTITION');
  seen.add(p.id);
  for(const s of p.solids){if(!validBounds(s.bounds)||typeof s.role!=='string')bad('B18_BOUNDS');solids.push({wallId:p.id,role:s.role,roomIds:p.roomIds,bounds:s.bounds});}
  if(p.opening){if(p.opening.physicalDoorImplemented!==false||!validBounds(p.opening.openingVolume))bad('DOOR_ASSUMPTION');}
 }
 return {solids,ids:seen};
}
function profile(cells, solids, reservations, width){
 const affected=[],shafts=[],stairs=[];
 for(const p of cells){
  const box=walker(p,width);
  const hits=solids.filter(s=>boxesOverlap(box,s.bounds)).map(s=>({wallId:s.wallId,role:s.role,roomIds:s.roomIds}));
  if(hits.length)affected.push({cell:p,hits});
  if(reservations.elevator.some(q=>boxesOverlap(box,reservedBox(q))))shafts.push(p);
  if(reservations.stair.some(q=>boxesOverlap(box,reservedBox(q))))stairs.push(p);
 }
 return {hypotheticalCenteredWidth:width,modelWallCollisions:affected,modelWallCollisionCellCount:affected.length,
  nominalElevatorOverlapCells:shafts,nominalStairOverlapCells:stairs,
  compatibleWithB18ModelWallsOnly:affected.length===0,
  realCorridorWidthVerified:false,realClearanceVerified:false};
}
export function compileB63(b62,b18,b17){
 for(const [d,n] of [[b62,'B62'],[b18,'B18'],[b17,'B17']])checkReport(d,n);
 if(b62.schema!=='minecraftaibuilder-b62-reservation-conflict-review-v1'||
 b18.schema!=='minecraftaibuilder-step8b-b18-m2-geometry-v1'||
 b17.schema!=='minecraftaibuilder-step8b-b17-interior-ir-v1'||
 b62.readiness!=='NOT_PREPARED'||b62.deployment!=='BLOCKED'||
 b62.gates?.length!==9||b62.gates.some(g=>g.status!=='BLOCKED')||
 b62.engineCalls!==0||b62.scans!==0||b62.worldContacts!==0||
 b18.engineIntegrated!==false||b18.interiorRuntimeValidated!==false||b18.physicalValidated!==false||
 b18.deploymentGate!=='BLOCKED'||b17.deploymentGate!=='BLOCKED'||b17.physicalValidated!==false||
 b18.safety?.notPrepared!==true||b17.safety?.notPrepared!==true||
 b18.worldCoordinates!==null||!same(b18.materialIds,[])||b62.productionFacadeParity!=='UNVERIFIED'||
 b62.alternatives?.length!==3||b62.alternatives.some(a=>a.approved!==false||a.emittable!==false))bad('SOURCE_SCOPE');
 const b=b18.buildings.find(x=>x.id===b62.building),e=b17.buildings.find(x=>x.id===b62.building);
 if(!b||!e||b.floors.length!==6||e.floors.length!==6||b62.level!==1)bad('BUILDING');
 const f=b.floors[0],f17=e.floors[0];
 if(f.floorId!==f17.id||f.partitions.length!==212||f.openings.length!==13||
 f.heightNominal!==4||f17.level!==1||f.physicalStatus!=='NOT_VERIFIED'||
 f.operations.length!==0||f.worldCoordinates!==null||f.materialIds.length!==0||
 b18.modelParameters.wallThickness!==0.125||b18.modelParameters.doorWidth!==0.8)bad('MODEL_SCOPE');
 const {solids,ids}=modelSolids(f.partitions);
 if(ids.size!==212||solids.length===0||!same([...ids].sort(),f17.wallBoundaries.map(x=>x.id).sort())||
 !same(f.openings.map(x=>x.id).sort(),f17.roomDoorInterfaces.map(x=>x.id).sort()))bad('WALL_DOOR_PARITY');
 if(f.openings.some(o=>o.physicalDoorImplemented!==false))bad('OPENING_STATE');
 const reservations={elevator:f17.elevatorReservation,stair:f17.stairReservation};
 if(reservations.elevator.length!==9||reservations.stair.length!==9)bad('RESERVATIONS');
 const alternatives=[];
 for(const a of b62.alternatives){
  if(!Array.isArray(a.newCorridorCells)||a.newCorridorCells.length!==a.minimumAddedCells||a.conceptualDoorsReachable!==78||a.physicalTraversalVerified!==false)bad('ALT_SCOPE');
  const profiles=[0.5,0.75,1,1.25].map(w=>profile(a.newCorridorCells,solids,reservations,w));
  const proximity=[];
  for(const p of a.newCorridorCells){
   const pairs=solids.map(s=>({wallId:s.wallId,role:s.role,roomIds:s.roomIds,distance:centerDist(p,s.bounds)})).sort((a,b)=>a.distance-b.distance||a.wallId.localeCompare(b.wallId));
   const uniqueWalls=new Map();for(const h of pairs)if(!uniqueWalls.has(h.wallId))uniqueWalls.set(h.wallId,h);
   const neighbors=[...uniqueWalls.values()].slice(0,4).map(q=>({...q,distance:rounded(q.distance)}));
   const nearRoomIds=[...new Set(pairs.filter(v=>v.distance<1.5).flatMap(v=>v.roomIds))].sort();
   proximity.push({cell:p,nearestModelWallIds:neighbors,
    nominalAdjacentRoomIds:nearRoomIds,nominalRoomOccupancyKnown:false,
    centerToModelWallDistance:rounded(pairs[0]?.distance??999)});
  }
  const originalW=a.nominalWallBoundaryCrossings;
  if(!Array.isArray(originalW)||!Array.isArray(a.reservationCollisions.elevator)||!Array.isArray(a.reservationCollisions.stair))bad('B62_TRACE');
  alternatives.push({id:a.id,cellCount:a.minimumAddedCells,
   nominalBoundaryCrossingsB62:originalW,wallModelProfiles:profiles,perCellReview:proximity,
   roomFootprintCellOwnerMapping:'ABSENT_IN_FROZEN_INPUTS',roomOccupancy:'UNKNOWN',
   physicalWallThicknessVerified:false,actualRoomLayoutVerified:false,
   realDoorBlockStatesVerified:false,realStairClearanceVerified:false,realElevatorClearanceVerified:false,
   actualPassageWidthVerified:false,emittable:false,approved:false});
 }
 const last=alternatives[2];
 if(!same(alternatives.map(x=>x.cellCount),[3,4,5])||
 !same(last.perCellReview.map(x=>key(x.cell)),['19,20','20,20','21,20','22,20','23,20'])||
 b62.alternatives[2].reservationCollisions.elevator.length||b62.alternatives[2].reservationCollisions.stair.length)bad('EXPECTED_LAYOUT');
 const body={schema:'minecraftaibuilder-b63-hypothetical-wall-width-review-v1',
  kind:'FROZEN_MODEL_ONLY_NO_PHYSICAL_VALIDATION',
  provenance:{b62Sha256:b62.reportSha256,b18Sha256:b18.reportSha256,b17Sha256:b17.reportSha256},
  scope:{building:b62.building,level:1,sourceWallPanels:212,sourceDoorVoids:13,
   hypotheticalWallThickness:0.125,hypotheticalPedestrianHeight:2,modelSpace:'LOCAL_NOMINAL_NOT_WORLD',
   sourceEngineRuntimeVerified:false,physicalMaterialsVerified:false},
  alternatives,
  findings:{fiveCellNominalReservationsAvoided:true,
   fiveCellNominalRoomOccupancyVerified:false,
   previousUnresolvedB42UpperDoors:60,
   fiveCellNearElevatorReservationCells:b62.alternatives[2].touchesElevatorReservationAtCellEdge.length,
   b43CorridorAndPartitionChangesUnapproved:true,
   liveEngineSourceAvailable:false},
  blockers:['ROOM_FOOTPRINT_CELL_OWNERS_MISSING','WALL_0_125_IS_HYPOTHETICAL_NOT_MINECRAFT_THICKNESS',
   'DOOR_STAIRS_AND_LIFT_PHYSICAL_CLEARANCES_UNVERIFIED',
   'B43_CHANGES_NOT_APPROVED','B42_UPPER_60_DOORS_NOT_PHYSICALLY_VALIDATED',
   'PRODUCTION_ENGINE_SOURCE_UNAVAILABLE'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',executionAllowed:false,constructionApproved:false,
  productionFacadeParity:'UNVERIFIED',physicalQuality:'UNKNOWN',worldContacts:0,scans:0,engineCalls:0,
  gates:b62.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:sha(body)};
}
export function verifyB63(report,...args){checkReport(report,'B63');if(!same(report,compileB63(...args))||report.gates.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||report.BuildPlan.operations.length)bad('REPLAY');return true;}
