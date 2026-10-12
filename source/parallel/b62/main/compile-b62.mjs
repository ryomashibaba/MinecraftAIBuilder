/** B62: reservation-aware local circulation review. NON-EXECUTABLE by design.
 * Source evidence: B14/B17 nominal shaft/stair footprints, B43 corridor, B57 floor,
 * B61 unapproved three-cell proposal. No material, Minecraft or world APIs.
 */
import {createHash} from 'node:crypto';
import {solveMinimumLocalConnection} from '../../b61/main/compile-b61.mjs';
const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const bad = s => { throw Error(`B62_${s}`); };
const key = p => `${p.x},${p.z}`;
const neighbors = p => [{x:p.x+1,z:p.z},{x:p.x-1,z:p.z},{x:p.x,z:p.z+1},{x:p.x,z:p.z-1}];
const same = (x,y) => JSON.stringify(x)===JSON.stringify(y);
function reportCheck(d,name){
 if(!d || typeof d!=='object' || Array.isArray(d) || typeof d.reportSha256!=='string')bad(`${name}_REPORT`);
 const {reportSha256,...body}=d;
 if(digest(body)!==reportSha256)bad(`${name}_DIGEST`);
 if(d.BuildPlan?.status!=='NOT_PREPARED'||!Array.isArray(d.BuildPlan.operations)||d.BuildPlan.operations.length!==0||(d.BuildPlan.worldCoordinates!==undefined&&d.BuildPlan.worldCoordinates!==null)||(d.BuildPlan.materialIds!==undefined&&!same(d.BuildPlan.materialIds,[]))||d.BuildPlan.commandCount!==0)bad(`${name}_UNSAFE`);
 if(d.executionAllowed===true || d.constructionApproved===true || d.safety?.executionAllowed===true || d.safety?.constructionApproved===true)bad(`${name}_PERMISSION`);
}
function pointSet(list, name, width, depth){
 if(!Array.isArray(list))bad(`${name}_TYPE`);
 const s=new Set();
 for(const p of list){if(!Number.isSafeInteger(p?.x)||!Number.isSafeInteger(p?.z)||p.x<0||p.z<0||p.x>=width||p.z>=depth||s.has(key(p)))bad(`${name}_INVALID`);s.add(key(p));}
 return s;
}
function makeFloor(building, level){
 const {width,depth}=building.site, floor=new Set();
 for(const r of level.floorRectangles){
  if(!Number.isSafeInteger(r.x)||!Number.isSafeInteger(r.z)||!Number.isSafeInteger(r.width)||!Number.isSafeInteger(r.depth)||r.x<0||r.z<0||r.width<1||r.depth<1||r.x+r.width>width||r.z+r.depth>depth)bad('FLOOR_RECT');
  for(let x=r.x;x<r.x+r.width;x++)for(let z=r.z;z<r.z+r.depth;z++){const k=`${x},${z}`;if(floor.has(k))bad('FLOOR_OVERLAP');floor.add(k);}
 }
 return floor;
}
function mainCorridor(corridor, seed){
 const found=new Set([key(seed)]),q=[seed];if(!corridor.has(key(seed)))bad('ENTRANCE_CORRIDOR');
 for(let i=0;i<q.length;i++)for(const n of neighbors(q[i]))if(corridor.has(key(n))&&!found.has(key(n))){found.add(key(n));q.push(n);}
 return found;
}
function reachDoors(guard, add){
 const nodes=new Set(),links=new Map(),idx=(i,p)=>`${i}/${key(p)}`;
 for(const l of guard.sixLevels)for(const p of l.conceptualCorridorCells)nodes.add(idx(l.level,p));
 for(const p of add)nodes.add(idx(1,p));
 for(const n of nodes){const [level,coords]=n.split('/'),[x,z]=coords.split(',').map(Number);links.set(n,neighbors({x,z}).map(p=>idx(level,p)).filter(p=>nodes.has(p)));}
 for(const s of guard.fiveStairLinks){if(s.installationAuthorized!==false||s.realBlockStates!==null||s.physicalConnectionVerified!==false)bad('STAIR_APPROVED');
  const a=idx(s.fromFloor,s.lowerEntrance),b=idx(s.toFloor,s.upperLanding);if(!nodes.has(a)||!nodes.has(b))bad('STAIR_ANCHOR');links.get(a).push(b);links.get(b).push(a);}
 const root=idx(1,{x:10,z:18});if(!nodes.has(root))bad('NO_ORIGIN');const seen=new Set([root]),q=[root];
 for(let i=0;i<q.length;i++)for(const n of links.get(q[i])||[])if(!seen.has(n)){seen.add(n);q.push(n);}
 const all=guard.sixLevels.flatMap(l=>l.candidateDoorInterfaces.map(d=>({id:d.id,k:idx(l.level,d.hallCell)})));
 return {connected:all.filter(d=>seen.has(d.k)).length,unconnected:all.filter(d=>!seen.has(d.k)).map(d=>d.id),total:all.length};
}
function boundaryTrace(walls,path){
 const crossings=[],nearby=new Set();
 for(let i=0;i<path.length;i++){
  const p=path[i],near=new Set([key(p),...neighbors(p).map(key)]);
  for(const w of walls){
   const a=key(w.from),b=key(w.to);
   if(a===key(p)||b===key(p)||near.has(a)||near.has(b))nearby.add(w.id);
   if(i>0 && ((a===key(path[i-1]) && b===key(p))||(b===key(path[i-1]) && a===key(p))))crossings.push(w.id);
  }
 }
 return {nominalBoundaryCrossings:[...new Set(crossings)].sort(),nearbyNominalBoundaryIds:[...nearby].sort()};
}
export function compileB62(b61,guard,b57,b14,b17){
 for(const [r,k] of [[b61,'B61'],[b57,'B57'],[b14,'B14'],[b17,'B17']])reportCheck(r,k);
 if(b61.schema!=='minecraftaibuilder-b61-local-connector-and-module-boundary-v1'||
 b14.schema!=='minecraftaibuilder-step8b-b14-module-input-contract-v1'||
 b17.schema!=='minecraftaibuilder-step8b-b17-interior-ir-v1'||
 guard?.schema!=='minecraftaibuilder-step8b-b43-guarded-layout-assembly-v1'||
 guard.BuildPlan?.status!=='NOT_PREPARED'||guard.BuildPlan.operations?.length!==0||
 guard.constructionApproved!==false||guard.executionAllowed!==false||
 b14.deploymentGate!=='BLOCKED'||b17.deploymentGate!=='BLOCKED'||
 b14.safety?.notPrepared!==true||b17.safety?.notPrepared!==true||
 b61.readiness!=='NOT_PREPARED'||b61.executionAllowed!==false||b61.constructionApproved!==false||
 b61.gates?.length!==9||b61.gates.some(g=>g.status!=='BLOCKED')||
 b61.topology?.sourceDoors!==78||b61.topology?.originalSymbolicallyConnected!==77||
 b61.topology?.candidateSymbolicallyConnected!==78||b61.topology?.historicB42UpperDoorsStillUnverified!==60||
 b61.gap?.minimumNewCorridorCells!==3||b61.gap?.physicalRouteApproved!==false||
 b61.provenance?.b57ReportSha256!==b57.reportSha256||
 b61.provenance?.b43GuardSchema!==guard.schema||
 b57.productionFacadeParity!=='UNVERIFIED'||b57.physicalQuality!=='UNKNOWN'||
 b61.engineCalls!==0||b61.worldContacts!==0||b61.scans!==0)bad('SOURCE_CONTRACT');
 const house=b57.buildings.find(b=>b.id==='apartment/candidate-01');
 const space=b17.buildings.find(b=>b.id==='apartment/candidate-01');
 const b14House=b14.candidates.find(b=>b.key==='apartment/candidate-01');
 if(!house||!space||!b14House||house.preview.levels.length!==6||space.floors.length!==6||b14House.levels.length!==6)bad('BUILDING');
 const {width,depth}=house.site, lvl=guard.sixLevels[0],level17=space.floors[0],level14=b14House.levels[0];
 if(!same(level17.dimensions,{width,depth})||!same(level14.dimensions,{width,depth})||
 level17.wallBoundaries.length!==212||level14.edgeContracts.length!==212)bad('SITE_OR_WALLS');
 const floor=makeFloor(house,house.preview.levels[0]);if(floor.size!==house.levels[0].floorCells)bad('FLOOR_COUNT');
 const corridor=pointSet(lvl.conceptualCorridorCells,'CORRIDOR',width,depth);
 const stair=pointSet(level17.stairReservation,'STAIR',width,depth);
 const elevator=pointSet(level17.elevatorReservation,'ELEVATOR',width,depth);
 if(stair.size!==9||elevator.size!==9||[...stair].some(x=>elevator.has(x)))bad('RESERVATION');
 const stair14=pointSet(level14.nominalStairReservation,'B14_STAIR',width,depth);
 const elevator14=pointSet(level14.nominalElevatorReservation,'B14_ELEVATOR',width,depth);
 if(!same([...stair].sort(),[...stair14].sort())||!same([...elevator].sort(),[...elevator14].sort()))bad('RESERVATION_EVIDENCE_DISAGREEMENT');
 const walls=level17.wallBoundaries;
 const wallEdges=walls.map(w=>{if(typeof w.id!=='string'||!['NOMINAL_WALL_BOUNDARY','NOMINAL_DOOR_INTERFACE'].includes(w.kind)||!Array.isArray(w.roomIds))bad('WALL_RECORD');return [key(w.from),key(w.to)].sort().join('|');});
 const b14Edges=level14.edgeContracts.map(w=>[key(w.a),key(w.b)].sort().join('|'));
 if(new Set(wallEdges).size!==212||!same([...wallEdges].sort(),[...b14Edges].sort()))bad('WALL_EVIDENCE_DISAGREEMENT');
 const root=mainCorridor(corridor,{x:10,z:18});
 const d012=lvl.candidateDoorInterfaces.find(x=>x.id===b61.gap.doorId);
 if(!d012||key(d012.hallCell)!=='17,18'||corridor.has('21,18')||!corridor.has(key(d012.hallCell)))bad('DOOR_SEED');
 const historic=b61.gap.newCorridorCells;
 if(!same(historic,[{x:21,z:18},{x:22,z:18},{x:23,z:18}]))bad('HISTORIC_ROUTE');
 const originalCollision=historic.filter(p=>elevator.has(key(p))).length;
 if(originalCollision!==3||historic.some(p=>stair.has(key(p))))bad('B61_SHAFT_CONFLICT_NOT_REPRODUCED');
 const scenarios=[
  {id:'B61_UNCONSTRAINED',omit:new Set(),title:'3-cell B61 concept (invalid against elevator reservation)'},
  {id:'AVOID_ELEVATOR',omit:elevator,title:'elevator-only constrained shortest candidate'},
  {id:'AVOID_ELEVATOR_AND_STAIR',omit:new Set([...elevator,...stair]),title:'both reservations excluded (review-only)'}
 ];
 const results=[];
 for(const s of scenarios){
  if([...s.omit].some(k=>corridor.has(k)||k===key(d012.hallCell)||root.has(k)))bad('EXCLUDED_ACTIVE_HALL');
  const allowed=new Set([...floor].filter(k=>!s.omit.has(k)));
  const solution=solveMinimumLocalConnection(allowed,corridor,root,d012.hallCell);
  const candidate=pointSet(solution.added,`${s.id}_ADDITIONS`,width,depth);
  if(solution.added.some(p=>!floor.has(key(p))||corridor.has(key(p)))||candidate.size!==solution.minimumAddedCells||solution.pathSteps!==solution.path.length-1)bad('SOLVE_INVALID');
  const collisions={elevator:solution.added.filter(p=>elevator.has(key(p))),stair:solution.added.filter(p=>stair.has(key(p)))};
  const graph=reachDoors(guard,solution.added);
  if(graph.total!==78||graph.connected!==78||graph.unconnected.length)bad('GRAPH');
  const trace=boundaryTrace(walls,solution.path);
  const adjacentToElevator=solution.added.filter(p=>neighbors(p).some(n=>elevator.has(key(n))));
  results.push({id:s.id,title:s.title,minimumAddedCells:solution.minimumAddedCells,pathSteps:solution.pathSteps,
   localPath:solution.path,newCorridorCells:solution.added,reservationCollisions:collisions,
   nominalWallBoundaryCrossings:trace.nominalBoundaryCrossings,
   nearbyNominalWallOwners:trace.nearbyNominalBoundaryIds,
   touchesElevatorReservationAtCellEdge:adjacentToElevator,
   conceptualDoorsReachable:graph.connected,physicalClearanceVerified:false,wallPhysicalCollisionVerified:false,
   roomOccupancyVerified:false,conceptualCorridorWidthVerified:false,physicalTraversalVerified:false,
   materialIds:[],emittable:false,approved:false});
 }
 if(!same(results.map(r=>r.minimumAddedCells),[3,4,5])||
 !same(results[0].reservationCollisions.elevator,historic)||
 results[1].reservationCollisions.stair.length!==3||
 results[2].reservationCollisions.stair.length!==0||results[2].reservationCollisions.elevator.length!==0||
 !same(results[2].newCorridorCells,[{x:19,z:20},{x:20,z:20},{x:21,z:20},{x:22,z:20},{x:23,z:20}]))bad('EXPECTED_REVIEW_RESULTS');
 const final=results[2];
 const body={schema:'minecraftaibuilder-b62-reservation-conflict-review-v1',kind:'READ_ONLY_HYPOTHETICAL_CIRCULATION_SPEC',
  provenance:{b61Sha256:b61.reportSha256,b57Sha256:b57.reportSha256,b14Sha256:b14.reportSha256,b17Sha256:b17.reportSha256,
   b43Schema:guard.schema},
  building:'apartment/candidate-01',level:1,unconnectedDoorId:b61.gap.doorId,
  sourceGeometry:{floorCells:floor.size,existingCorridorCells:corridor.size,stairReservationCells:stair.size,
   elevatorReservationCells:elevator.size,nominalWallInterfaces:walls.length,
   b14B17ReservationAgreement:true,b14B17WallBoundaryAgreement:true},
  alternatives:results,
  findings:{b61ThreeCellProposalCollidesWithElevatorReservation:3,
   fourCellAlternativeCollidesWithStairReservation:3,
   fiveCellAlternativeAvoidsBothReservations:true,
   fiveCellAlternativeVerifiedWallPhysicalClearance:false,
   fiveCellAlternativeVerifiedRoomOccupancy:false,
   fiveCellAlternativeAdjacentToElevatorCount:final.touchesElevatorReservationAtCellEdge.length,
   fiveCellAlternativeNominalWallBoundaryCrossings:final.nominalWallBoundaryCrossings.length,
   candidateNetworkDoorCount:78,previousB42UnverifiedUpperDoors:60,
   b43PriorCorridorExtensionUnapproved:35,b43PriorWallReplansUnapproved:20,
   noBuildingChangeAuthorized:true},
  assessment:'FIVE_CELL_GEOMETRIC_ALTERNATIVE_AVOIDS_NOMINAL_SHAFT_AND_STAIR_FOOTPRINTS_ONLY_NOT_PHYSICALLY_BUILDABLE',
  blockers:['B61_THREE_CELLS_COLLIDE_WITH_NOMINAL_ELEVATOR_FOOTPRINT',
    'B62_ALTERNATIVE_WALL_THICKNESS_UNKNOWN','B62_ALTERNATIVE_ROOM_OCCUPANCY_UNVERIFIED',
    'B62_ALTERNATIVE_WIDTH_AND_SHAFT_CLEARANCE_UNVERIFIED','B43_35_CORRIDOR_AND_20_PARTITION_PROPOSALS_UNAPPROVED',
    'B42_UPPER_60_DOORS_HISTORICALLY_UNVERIFIED','DOOR_STAIR_MATERIALS_AND_BLOCK_STATES_UNKNOWN',
    'PRODUCTION_ENGINE_SOURCE_UNAVAILABLE'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',executionAllowed:false,constructionApproved:false,
  productionFacadeParity:'UNVERIFIED',physicalQuality:'UNKNOWN',engineCalls:0,worldContacts:0,scans:0,
  gates:b61.gates.map(g=>({...g})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:digest(body)};
}
export function verifyB62(report,...args){reportCheck(report,'B62');
 if(!same(report,compileB62(...args))||report.gates.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||report.BuildPlan.operations.length!==0||report.findings.noBuildingChangeAuthorized!==true)bad('REPLAY');
 return true;
}
