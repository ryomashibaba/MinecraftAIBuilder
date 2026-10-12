/** B61: an immutable, local-only preconstruction opening/corridor/stair interface.
 * No bridge, Minecraft, world coordinates, materials, or building operations.
 */
import {createHash} from 'node:crypto';
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail=c=>{throw Error(`B61_${c}`);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const xy=p=>`${p.x},${p.z}`;
const pos=s=>Object.fromEntries(s.split(',').map((v,i)=>[i?'z':'x',Number(v)]));
const neighbors=p=>[{x:p.x+1,z:p.z},{x:p.x-1,z:p.z},{x:p.x,z:p.z+1},{x:p.x,z:p.z-1}];
const point=(p,w,d)=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z)&&p.x>=0&&p.z>=0&&p.x<w&&p.z<d;
function checkedReport(r,label){
 if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.reportSha256!=='string')fail(`${label}_REPORT`);
 const {reportSha256,...rest}=r;
 if(sha(rest)!==reportSha256)fail(`${label}_HASH`);
 if(r.readiness!=='NOT_PREPARED'||r.deployment!=='BLOCKED'||r.BuildPlan?.status!=='NOT_PREPARED'||
 !Array.isArray(r.BuildPlan.operations)||r.BuildPlan.operations.length!==0||
 r.executionAllowed!==false||r.constructionApproved!==false)fail(`${label}_UNSAFE`);
}
function floorCells(rects,w,d,expected){
 if(!Array.isArray(rects))fail('FLOOR_RECTS');const set=new Set();
 for(const r of rects){if(!point(r,w,d)||!Number.isSafeInteger(r.width)||!Number.isSafeInteger(r.depth)||r.width<1||r.depth<1||r.x+r.width>w||r.z+r.depth>d)fail('FLOOR_BOUNDS');
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   const k=`${x},${z}`;if(set.has(k))fail('FLOOR_OVERLAP');set.add(k);
  }
 }
 if(set.size!==expected)fail('FLOOR_CELLS');return set;
}
function mainComponent(corridor,entrance){
 const root=xy(entrance);if(!corridor.has(root))fail('ENTRANCE_NOT_IN_HALL');
 const set=new Set([root]),q=[root];
 for(let i=0;i<q.length;i++)for(const n of neighbors(pos(q[i]))) {
  const k=xy(n);if(corridor.has(k)&&!set.has(k)){set.add(k);q.push(k);}
 }
 return set;
}
/** A deterministic minimum corridor-cell-addition path. Edges are purely local 2D geometry.
 * Lexicographic cost: fewest new cells -> fewest steps -> coordinate tie break.
 */
export function solveMinimumLocalConnection(floor,corridor,main,start){
 if(!floor.has(xy(start))||!corridor.has(xy(start))||!main.size)fail('SEED_NOT_ON_FLOOR');
 const q=[{key:xy(start),add:0,steps:0,route:[xy(start)]}],best=new Map();
 let examined=0;
 while(q.length){
  q.sort((a,b)=>a.add-b.add||a.steps-b.steps||a.route.join('|').localeCompare(b.route.join('|')));
  const curr=q.shift(),prior=best.get(curr.key);
  if(prior&&(prior.add<curr.add||(prior.add===curr.add&&prior.steps<=curr.steps)))continue;
  best.set(curr.key,{add:curr.add,steps:curr.steps});examined++;
  if(main.has(curr.key)){
   const added=curr.route.filter(k=>!corridor.has(k)).map(pos);
   return {path:curr.route.map(pos),added,minimumAddedCells:curr.add,pathSteps:curr.steps,examined};
  }
  for(const n of neighbors(pos(curr.key))){const k=xy(n);if(!floor.has(k)||curr.route.includes(k))continue;
   const add=curr.add+(corridor.has(k)?0:1),steps=curr.steps+1,prev=best.get(k);
   if(!prev||(add<prev.add||(add===prev.add&&steps<prev.steps)))q.push({key:k,add,steps,route:[...curr.route,k]});
  }
 }
 fail('NO_FLOOR_CONNECTION');
}
function graphReachable(guard,extra){
 const nodes=new Set(),edges=new Map(),allDoors=[];
 const index=(level,p)=>`${level}/${xy(p)}`;
 for(const level of guard.sixLevels){
  for(const p of level.conceptualCorridorCells){const k=index(level.level,p);if(nodes.has(k))fail('DUP_HALL');nodes.add(k);}
  for(const di of level.candidateDoorInterfaces)allDoors.push({id:di.id,level:level.level,hall:di.hallCell});
 }
 for(const p of extra)nodes.add(index(1,p));
 for(const k of nodes){const [floor,s]=k.split('/');edges.set(k,neighbors(pos(s)).map(p=>`${floor}/${xy(p)}`).filter(x=>nodes.has(x)));}
 for(const stair of guard.fiveStairLinks){const a=index(stair.fromFloor,stair.lowerEntrance),b=index(stair.toFloor,stair.upperLanding);
  if(!nodes.has(a)||!nodes.has(b)||stair.installationAuthorized!==false||stair.realBlockStates!==null)fail('STAIR_NOT_SAFE');
  edges.get(a).push(b);edges.get(b).push(a);
 }
 const seed='1/10,18',seen=new Set([seed]),q=[seed];
 if(!nodes.has(seed))fail('NO_NETWORK_ENTRANCE');
 for(let i=0;i<q.length;i++)for(const to of edges.get(q[i])||[])if(!seen.has(to)){seen.add(to);q.push(to);}
 return {reachable:allDoors.filter(d=>seen.has(index(d.level,d.hall))).map(d=>d.id),
  unreachable:allDoors.filter(d=>!seen.has(index(d.level,d.hall))).map(d=>d.id),nodes:nodes.size};
}
export function compileB61(b60,guard,b57){
 checkedReport(b60,'B60');checkedReport(b57,'B57');
 if(b60.schema!=='minecraftaibuilder-b60-guarded-circulation-interface-v1'||
    guard?.schema!=='minecraftaibuilder-step8b-b43-guarded-layout-assembly-v1'||
    guard.status!=='NO_EXECUTION_NOT_READY'||guard.constructionApproved!==false||guard.executionAllowed!==false||
    guard.BuildPlan?.status!=='NOT_PREPARED'||guard.BuildPlan.operations?.length!==0||
    guard.sixLevels?.length!==6||guard.fiveStairLinks?.length!==5||
    b60.gates?.length!==9||b60.gates.some(g=>g.status!=='BLOCKED')||
    b60.totals?.sourceDoors!==78||b60.totals.reachableSymbolicDoors!==77||
    b60.totals.unresolvedSymbolicDoors!==1||b60.comparison?.b42HistoricUpperDoorAccess?.unverified!==60||
    b60.provenance?.b57Sha256!==b57.reportSha256||
    !same(b60.unresolvedDoorIds,['apartment/candidate-01/L1/D012'])||
    b60.BuildPlan?.worldCoordinates!==null||!same(b60.BuildPlan.materialIds,[])||
    b57.productionFacadeParity!=='UNVERIFIED'||b57.physicalQuality!=='UNKNOWN'||
    b57.engineCalls!==0||b57.scans!==0||b57.worldContacts!==0)fail('BASELINE');
 const building=b57.buildings.find(b=>b.id==='apartment/candidate-01');
 if(!building||building.preview.levels.length!==6||building.site.floors!==6)fail('BUILDING');
 const floor=floorCells(building.preview.levels[0].floorRectangles,building.site.width,building.site.depth,building.levels[0].floorCells);
 const level=guard.sixLevels[0],corridor=new Set();
 for(const p of level.conceptualCorridorCells){if(!point(p,building.site.width,building.site.depth)||!floor.has(xy(p))||corridor.has(xy(p)))fail('HALL_INPUT');corridor.add(xy(p));}
 const entrance={x:10,z:18},main=mainComponent(corridor,entrance);
 const di=level.candidateDoorInterfaces.find(x=>x.id===b60.unresolvedDoorIds[0]);
 if(!di||!point(di.hallCell,building.site.width,building.site.depth)||!corridor.has(xy(di.hallCell))||main.has(xy(di.hallCell))||
    !point(di.doorCell,building.site.width,building.site.depth)||Math.abs(di.hallCell.x-di.doorCell.x)+Math.abs(di.hallCell.z-di.doorCell.z)!==1||
    di.openingPhysicalVerified!==false)fail('D012_CONTRACT');
 const solve=solveMinimumLocalConnection(floor,corridor,main,di.hallCell);
 if(solve.minimumAddedCells!==3||solve.added.length!==3||solve.added.some(p=>!floor.has(xy(p))||corridor.has(xy(p))))fail('B61_EXPECTED_GAP');
 const before=graphReachable(guard,[]),after=graphReachable(guard,solve.added);
 if(before.reachable.length!==77||!same(before.unreachable,b60.unresolvedDoorIds)||after.reachable.length!==78||after.unreachable.length!==0)fail('GRAPH_REPLAY');
 const proposals=solve.added.map((p,i)=>({id:`B61/L1/HALL_EXT_${String(i+1).padStart(2,'0')}`,level:1,localCell:p,
  floorCellPresent:true,existingCorridor:false,requiresRoomPartitionReview:true,wallOwnersIdentified:false,
  physicalWidthVerified:false,openingBlockStates:null,approved:false,emittable:false}));
 const doors=b60.doorInterfaces.map(di=>({id:di.id,level:di.level,openingCell:di.conceptualDoorCell,hallCell:di.conceptualHallCell,
  openingPhysicalVerified:false,doorBlock:null,facing:null,hinge:null,approved:false,emittable:false}));
 const stairs=guard.fiveStairLinks.map(s=>({fromLevel:s.fromFloor,toLevel:s.toFloor,
  lower:s.lowerEntrance,upper:s.upperLanding,headroomVerified:false,supportVerified:false,blockStates:null,approved:false,emittable:false}));
 const body={schema:'minecraftaibuilder-b61-local-connector-and-module-boundary-v1',kind:'NON_EXECUTABLE_OFFLINE_DESIGN_CONTRACT',
  provenance:{b60ReportSha256:b60.reportSha256,b57ReportSha256:b57.reportSha256,
   b43GuardSchema:guard.schema},
  gap:{doorId:di.id,level:1,mainCorridorCellsBefore:main.size,totalCorridorCellsBefore:corridor.size,
   candidateLocalPath:solve.path,minimumNewCorridorCells:solve.minimumAddedCells,newCorridorCells:solve.added,
   pathSteps:solve.pathSteps,solver:'DIJKSTRA_LEX_MIN_ADDED_THEN_STEPS_LOCAL_GRID',
   physicalRouteApproved:false,wallCollisionChecked:false,roomOccupancyChecked:false},
  topology:{sourceDoors:78,originalSymbolicallyConnected:before.reachable.length,
   candidateSymbolicallyConnected:after.reachable.length,remainingSymbolicGaps:after.unreachable.length,
   historicB42UpperDoorsStillUnverified:60,originalB42FloorMismatchPerUpperLevel:2,
   originalB42FloorMismatchComparisons:5,repairApplied:false},
  moduleInterfaces:{doorReservations:doors,stairReservations:stairs,unapprovedCorridorExtension:proposals,
   earlierUnapprovedCorridorCells:35,earlierWallConflictCells:20,
   allMaterialsUnknown:true,allDoorBlockStatesUnknown:true,allStairClearancesUnknown:true,
   noPhysicalEmittersIdentified:true},
  blockers:['PRODUCTION_ENGINE_SOURCE_MISSING','B43_WALL_AND_ROOM_REPLAN_UNAPPROVED',
   'B61_NEW_CORRIDOR_ROOM_OCCUPANCY_UNKNOWN','B61_NEW_CORRIDOR_WALL_COLLISIONS_UNKNOWN',
   'DOOR_BLOCK_STATES_UNVERIFIED','STAIR_SUPPORT_HEADROOM_UNVERIFIED',
   'B42_B57_FLOOR_SNAPSHOT_DIFFERENCE','PHYSICAL_PATHS_NOT_TESTED'],
  assessment:'78_OF_78_ONLY_IN_HYPOTHETICAL_GRAPH_AFTER_3_LOCAL_CELLS_NOT_WALKABLE_OR_BUILDABLE',
  readiness:'NOT_PREPARED',deployment:'BLOCKED',executionAllowed:false,constructionApproved:false,
  productionFacadeParity:'UNVERIFIED',physicalQuality:'UNKNOWN',engineCalls:0,worldContacts:0,scans:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]},
  gates:b60.gates.map(g=>({...g}))};
 return {...body,reportSha256:sha(body)};
}
export function verifyB61(report,b60,guard,b57){
 checkedReport(report,'B61');
 if(!same(report,compileB61(b60,guard,b57))||report.gates.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||
 report.BuildPlan.operations.length!==0||report.executionAllowed!==false||report.worldContacts!==0||report.scans!==0)fail('REPLAY');
 return true;
}
