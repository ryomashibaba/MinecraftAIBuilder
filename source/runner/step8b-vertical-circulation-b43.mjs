/**
 * B43: Whole-apartment conceptual circulation re-design, NON-EXECUTABLE.
 * Models wall-ownership conflicts, a short junction vs. a long wall-clear detour,
 * all six levels and five nominal stair transitions. No world access or BuildPlan operations.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildB42,validateB42} from './step8b-macro-module-b42.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=o=>sha(JSON.stringify(o));
const fail=code=>{throw Object.assign(new Error(`B43_${code}`),{code:`B43_${code}`});};
const PINS=Object.freeze({
 'B42_FILE_SHA256.json':'06b277b94df0cdf36a352e66bb903541406ace38352c5301388fb53a62a79b76',
 'reports/B42_MACRO_STAIR_MODULE.json':'3a2a13a2676b67099260531778272a149766ee24c10e6b67bd37061cbdf1637e',
 'reports/B17_INTERIOR_INTEGRATION_IR.json':'e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d',
 'reports/B21_BLOCKSCALE_REVIEW.json':'2d7b1e3d71f252331dfe35e600411acc3354c43702e5b3db9fd9a5e0533932bc',
});
const valid=p=>p!==null&&typeof p==='object'&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const key=p=>`${p.x},${p.z}`;
const coords=k=>{const [x,z]=k.split(',').map(Number);return {x,z};};
const dirs=[[0,1],[1,0],[0,-1],[-1,0]];
const neighbors=p=>dirs.map(([dx,dz])=>({x:p.x+dx,z:p.z+dz}));
const unique=pts=>new Set(pts.map(key));
function pinned(root,rel){
 if(!Object.hasOwn(PINS,rel)||typeof root!=='string'||!root)fail('SOURCE_PATH');
 const file=path.join(root,rel);let st;
 try{st=fs.lstatSync(file);}catch{fail('MISSING_SOURCE');}
 if(!st.isFile()||st.isSymbolicLink())fail('SOURCE_TYPE');
 const buf=fs.readFileSync(file);if(sha(buf)!==PINS[rel])fail('FROZEN_INPUT_CHANGED');
 return JSON.parse(buf.toString('utf8'));
}
function walk(corr,start){
 const corridor=corr instanceof Set?corr:unique(corr);
 if(!valid(start))fail('TERMINAL');
 const q=[start],seen=new Set();if(!corridor.has(key(start)))return seen;
 seen.add(key(start));
 for(let i=0;i<q.length;i++)for(const p of neighbors(q[i])){
  const k=key(p);if(corridor.has(k)&&!seen.has(k)){seen.add(k);q.push(p);}
 }
 return seen;
}
function wallsOnLevel(level,y){
 const map=new Map();
 for(const candidate of level.wallCandidates){
  if(typeof candidate.id!=='string'||!Array.isArray(candidate.localGridVolumes))fail('WALL_SOURCE');
  for(const cell of candidate.localGridVolumes){
   if(!Number.isSafeInteger(cell.y)||!valid(cell))fail('WALL_VOXEL');
   if(cell.y<=y||cell.y>y+3)continue;
   const k=key(cell);if(!map.has(k))map.set(k,new Set());map.get(k).add(candidate.id);
  }
 }
 return map;
}
function dijkstraRoute({rows,sourceCorridor,exclude,wallMap,start,goal,wallClear=false,maxSteps=100}){
 const width=rows[0]?.length,depth=rows.length;
 if(!rows.length||rows.some(r=>typeof r!=='string'||r.length!==width||!/^[.#]+$/.test(r))||
  !valid(start)||!valid(goal)||!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>200)fail('ROUTE_INPUT');
 const isAllowed=p=>p.x>=0&&p.z>=0&&p.x<width&&p.z<depth&&rows[p.z][p.x]==='#'&&
  !exclude.has(key(p))&&(!wallClear||!wallMap.has(key(p)));
 if(!isAllowed(start)||!isAllowed(goal))fail('ROUTE_TERMINALS');
 // Optimize path length first, then nominal wall conflicts, then corridor additions.
 // This prevents choosing an unnecessarily destructive wall junction among equal-length paths.
 const pending=[{p:start,cost:0,steps:0}],score=new Map([[key(start),0]]),pred=new Map([[key(start),null]]);
 while(pending.length){
  pending.sort((a,b)=>a.cost-b.cost||a.steps-b.steps||a.p.z-b.p.z||a.p.x-b.p.x);
  const item=pending.shift(), k=key(item.p);
  if(item.cost!==score.get(k))continue;
  if(k===key(goal))break;
  for(const p of neighbors(item.p)){
   if(!isAllowed(p)||item.steps+1>maxSteps)continue;
   const nk=key(p),nextCost=item.cost+100+(!wallClear&&wallMap.has(nk)?10:0)+(!sourceCorridor.has(nk)?1:0);
   if(nextCost< (score.get(nk)??Infinity)){
    score.set(nk,nextCost);pred.set(nk,k);pending.push({p,cost:nextCost,steps:item.steps+1});
   }
  }
 }
 if(!pred.has(key(goal)))return null;
 const route=[];for(let k=key(goal);k!==null;k=pred.get(k))route.push(coords(k));route.reverse();
 if(route.length-1>maxSteps)return null;
 if(route.some(p=>exclude.has(key(p))))fail('ROUTE_RESERVED');
 const additions=route.filter(p=>!sourceCorridor.has(key(p)));
 const overlapping=route.filter(p=>wallMap.has(key(p)));
 const impactedWallIds=[...new Set(overlapping.flatMap(p=>[...wallMap.get(key(p))]))].sort();
 const joined=new Set([...sourceCorridor,...route.map(key)]);
 return {route,steps:route.length-1,addedCorridorCells:additions,
  wallConflictCells:overlapping,impactedWallCandidateIds:impactedWallIds,
  connectedComponentsAfterOverlay:walk(joined,start).size,
  graphOnly:true,wallWorkApproved:false,roomReplanApproved:false,physicalWidthVerified:false};
}
/** Deterministic, bounded, source-checked geometric connectivity alternatives. */
export function solveUpperJunctionB43(floor,wallFloor,rows,origin,goal,{shortLimit=20,longLimit=95}={}){
 if(!floor||!wallFloor||!Array.isArray(floor.corridorReservation)||
  !Array.isArray(floor.roomDoorInterfaces)||!Array.isArray(floor.stairReservation)||
  !Array.isArray(floor.elevatorReservation)||!Array.isArray(floor.localYRange)||
  !Number.isSafeInteger(floor.localYRange[0]))fail('LAYOUT');
 const corridor=unique(floor.corridorReservation),walls=wallsOnLevel(wallFloor,floor.localYRange[0]);
 const excluded=unique([...floor.stairReservation,...floor.elevatorReservation]);
 // Reserve the straight-run entrance (11,18) across the study, even on the top floor.
 // Without this, a route can pass through a cell retagged as a stair on L2-L5.
 excluded.add('11,18');
 // Explicit future stair volume and upper floor openings are already excluded by rows and source reservations.
 const args={rows,sourceCorridor:corridor,exclude:excluded,wallMap:walls,start:origin,goal};
 const local=dijkstraRoute({...args,maxSteps:shortLimit});
 const wallClear=dijkstraRoute({...args,wallClear:true,maxSteps:longLimit});
 if(!local)fail('NO_LOCAL_JUNCTION');
 const doorAt=new Set(floor.roomDoorInterfaces.map(d=>key(d.doorCell)));
 for(const candidate of [local,wallClear].filter(Boolean)){
  if(candidate.addedCorridorCells.some(p=>doorAt.has(key(p))))fail('DOOR_RESERVATION_CONFLICT');
  const combined=new Set([...corridor,...candidate.route.map(key)]);
  const reached=walk(combined,origin);
  candidate.reachableDoorIDs=floor.roomDoorInterfaces.filter(d=>reached.has(key(d.hallCell))).map(d=>d.id).sort();
  candidate.unreachedDoorIDs=floor.roomDoorInterfaces.filter(d=>!reached.has(key(d.hallCell))).map(d=>d.id).sort();
  candidate.doorCount=floor.roomDoorInterfaces.length;
  candidate.nominalDoorReachabilityOnly=true;
  candidate.wallClearanceVerified=candidate.wallConflictCells.length===0;
  candidate.roomInteriorsVerified=false; // B17 IR has no certified room-volume/circulation clearance.
  candidate.supportVerified=false;
 }
 return {localShort:local,wallClearDetour:wallClear,
  recommendation:'LOCAL_JUNCTION_AS_REPLAN_STUDY_ONLY',
  reason:'The wall-clear alternative is a long detour; the short route crosses symbolic partition reservations.',
  geometryAdopted:false,engineReady:false};
}
function graphAcrossLevels(floors,transitions){
 const floorSets=floors.map(f=>new Set(f.reviewCorridorCells.map(key)));
 const visited=new Set(),queue=[];
 const push=(level,p)=>{
  const k=`${level}:${key(p)}`;if(!floorSets[level].has(key(p))||visited.has(k))return;
  visited.add(k);queue.push({level,p});
 };
 push(0,{x:10,z:18});
 for(let i=0;i<queue.length;i++){
  const {level,p}=queue[i];for(const next of neighbors(p))push(level,next);
  if(level<5&&key(p)==='10,18')push(level+1,{x:15,z:18});
  if(level>0&&key(p)==='15,18')push(level-1,{x:10,z:18});
 }
 return {visited,
  reachedDoorIds:floors.flatMap((f,level)=>f.roomDoorInterfaces
   .filter(d=>visited.has(`${level}:${key(d.hallCell)}`)).map(d=>d.id)),
  allDoorIds:floors.flatMap(f=>f.roomDoorInterfaces.map(d=>d.id))};
}
/** Recompute every reviewed fact from the immutable B42 and upstream IR. */
export function buildB43(root){
 const manifest=pinned(root,'B42_FILE_SHA256.json');
 if(manifest.schema!=='minecraftaibuilder-step8b-b42-manifest-v1'||manifest.fileCount!==678)fail('MANIFEST');
 const b42=pinned(root,'reports/B42_MACRO_STAIR_MODULE.json');
 if(!validateB42(b42,root)||JSON.stringify(buildB42(root))!==JSON.stringify(b42))fail('B42_REPORT');
 const ir=pinned(root,'reports/B17_INTERIOR_INTEGRATION_IR.json');
 const block=pinned(root,'reports/B21_BLOCKSCALE_REVIEW.json');
 const selected=x=>x.buildings.find(b=>b.id==='apartment/candidate-01');
 const layout=selected(ir),walls=selected(block);
 if(!layout||!walls||layout.floors?.length!==6||walls.floors?.length!==6||b42.transitions?.length!==5)fail('FLOORS');
 const floors=[];const junctions=[];
 for(let i=0;i<6;i++){
  const f=layout.floors[i],w=walls.floors[i],t=i>0?b42.transitions[i-1]:null;
  if(f.level!==i+1||f.id!==w.id||f.roomDoorInterfaces?.length!==13)fail('LEVEL_ALIGN');
  const base=unique(f.corridorReservation),retag=i<5?'11,18':null;
  if(retag&&!base.has(retag))fail('MISSING_RETAG_CELL');
  const reviewed=new Set(base);if(retag)reviewed.delete(retag);
  let candidate=null;
  if(i>0){
   if(t.transition!==`L${i}_L${i+1}`||t.corridor.upperLandingReachableDoors!==1||
    !t.floorMask.exactRectangleCoverage||t.floorMask.sourceOccupiedCells!==398||
    t.floorMask.candidateOccupiedCells!==398)fail('B42_INTERFACE');
   candidate=solveUpperJunctionB43(f,w,t.floorMask.candidateFloorRows,{x:15,z:18},{x:10,z:18});
   if(!candidate.wallClearDetour||candidate.localShort.steps>20||
    candidate.wallClearDetour.steps>95||candidate.localShort.doorCount!==13||
    candidate.localShort.reachableDoorIDs.length!==13||candidate.localShort.wallConflictCells.length===0)fail('CONNECTOR_MODEL');
   for(const p of candidate.localShort.addedCorridorCells)reviewed.add(key(p));
   junctions.push({upperFloor:i+1,transition:t.transition,
    alternatives:candidate,unverifiedWallOwners:candidate.localShort.impactedWallCandidateIds,
    wallReplanRequests:candidate.localShort.wallConflictCells.map(p=>({
     cell:p,wallCandidateIds:[...wallsOnLevel(w,f.localYRange[0]).get(key(p))].sort(),
     requestedDisposition:'REPLAN_WALL_AND_ROOM_LAYOUT_NOT_REMOVE_AUTOMATICALLY',
     approved:false})),
    doorRelocationApproved:false,roomClearanceCertified:false});
  }
  floors.push({level:i+1,originalCorridorCells:f.corridorReservation.length,
   reviewCorridorCells:[...reviewed].map(coords).sort((a,b)=>a.z-b.z||a.x-b.x),
   lowerStairEntranceRetag:retag?coords(retag):null,
   upperLandingConnectorCells:i>0?candidate.localShort.addedCorridorCells:[],
   conceptualDoorCount:13,roomDoorInterfaces:f.roomDoorInterfaces,
   floorPlateSourceVerified:i===0?false:true,physicalLayoutReviewed:false});
 }
 const network=graphAcrossLevels(floors,b42.transitions);
 const reachable=new Set(network.reachedDoorIds),all=new Set(network.allDoorIds);
 if(all.size!==78||junctions.length!==5||reachable.size!==77||
  [...all].filter(x=>!reachable.has(x)).join('')!=='apartment/candidate-01/L1/D012'||
  junctions.some(j=>j.alternatives.localShort.steps!==9||j.alternatives.localShort.wallConflictCells.length!==4||
   j.alternatives.localShort.addedCorridorCells.length!==7||j.alternatives.wallClearDetour.steps!==83||
   j.alternatives.wallClearDetour.wallConflictCells.length!==0))fail('NETWORK');
 const tallies={sixFloors:6,levelTransitions:5,doorReservations:all.size,
  conceptualAccessDoors:reachable.size,unreachableDoorIds:[...all].filter(x=>!reachable.has(x)),
  localJunctionNewCorridorCells:junctions.reduce((n,j)=>n+j.alternatives.localShort.addedCorridorCells.length,0),
  localJunctionWallConflictCells:junctions.reduce((n,j)=>n+j.alternatives.localShort.wallConflictCells.length,0),
  localJunctionWallCandidateOwners:junctions.reduce((n,j)=>n+j.unverifiedWallOwners.length,0),
  localJunctionTotalRouteSteps:junctions.reduce((n,j)=>n+j.alternatives.localShort.steps,0),
  wallClearDetourSteps:junctions.reduce((n,j)=>n+j.alternatives.wallClearDetour.steps,0),
  approvedWallReplans:0,verifiedPhysicalDoorRoutes:0,verifiedSupports:0,
  certifiedStateMappings:0,engineCalls:0,buildOperations:0};
 const report={schema:'minecraftaibuilder-step8b-b43-whole-building-circulation-v1',
  purpose:'SIX_LEVEL_INERT_CORRIDOR_WALL_LAYOUT_REDESIGN',
  provenance:{frozenB42ManifestSha256:PINS['B42_FILE_SHA256.json'],b42ReportSha256:PINS['reports/B42_MACRO_STAIR_MODULE.json'],
   designInputsPinned:true,engineInvoked:false,bridgeContact:false,worldAccess:false},
  building:'apartment/candidate-01',
  interface:{mode:'REVIEW_ONLY_NOT_ENGINE_COMPATIBLE',coordinateFrame:'LOCAL_ONLY',
   outputs:['SIX_LEVEL_NOMINAL_ACCESS_GRAPH','FIVE_WALL_REPLAN_CANDIDATES','CORRIDOR_DELTA','FLOOR_MASK_REFERENCE'],
   floorReference:'B42.floorMask.candidateFloorRows',readiness:'NOT_PREPARED',
   runnable:false,canEmitBlocks:false,canInstallWalls:false,canChangeDoors:false},
  junctions,
  floors:floors.map(({roomDoorInterfaces, ...rest})=>({...rest,doorInterfaces:roomDoorInterfaces})),
  graph:{entrance:{floor:1,x:10,z:18},nominalInterFloorLinks:b42.transitions.map((t,i)=>({
   fromFloor:i+1,toFloor:i+2,lower:{x:10,z:18},upper:{x:15,z:18},
   realStairTransitionVerified:false})),
   reachableDoorIds:[...reachable].sort(),unreachableDoorIds:tallies.unreachableDoorIds,
   physicalWalkabilityVerified:false,
   caveat:'Graph assumes all reviewed wall re-plans; no physical doorway, support, collision, room clearance or block states verified.'},
  totals:tallies,
  unresolved:['Proposed short connector passes through nominal partition owner cells and possibly room interiors',
   'Wall relocations, replacement walls, room geometry and door compatibility not designed or approved',
   'A full-perimeter wall-clear detour is geometrically connected but not a practical approved circulation scheme',
   'Existing level-1 door isolation persists in conceptual graph',
   'Stair collision, landing headroom, floor supports, actual block state and runtime code are not verified',
   'No engine-bound build operations permitted; M4 gates all blocked'],
  blockers:b42.blockers.map(x=>({...x})),readiness:'NOT_PREPARED',deployment:'BLOCKED',approvedVariant:null,
  safety:{constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,
   legacyModified:false,frozenEvidenceModified:false,projectFilesModified:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],materialIds:[],worldCoordinates:null}};
 return {...report,reportSha256:hash(report)};
}
export function validateB43(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b43-whole-building-circulation-v1'||
  report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||report.approvedVariant!==null||
  report.safety?.constructionApproved!==false||report.safety?.executionAllowed!==false||
  report.safety?.worldAccess!==false||report.safety?.bridgeContact!==false||
  report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan.worldCoordinates!==null||
  !Array.isArray(report.BuildPlan.operations)||report.BuildPlan.operations.length!==0||
  !Array.isArray(report.BuildPlan.materialIds)||report.BuildPlan.materialIds.length!==0||
  report.blockers?.length!==9||report.blockers.some(b=>b.status!=='BLOCKED')||
  report.interface?.canEmitBlocks!==false||report.interface?.runnable!==false||
  report.junctions?.length!==5||report.graph?.physicalWalkabilityVerified!==false||
  report.totals?.engineCalls!==0||report.totals?.buildOperations!==0||
  report.totals?.approvedWallReplans!==0||report.totals?.verifiedSupports!==0)fail('SAFETY');
 const {reportSha256,...data}=report;
 if(hash(data)!==reportSha256||JSON.stringify(buildB43(root))!==JSON.stringify(report))fail('REPORT_TAMPERED');
 return true;
}
/**
 * Atomic design-IR assembly to hand to a FUTURE guarded planner adapter.
 * Its shape intentionally does not implement runtime BuildPlan or emit block operations.
 * A candidate wall re-plan is not evidence that a room remains usable.
 */
export function compileReviewAssemblyB43(b42,b43){
 if(b42?.schema!=='minecraftaibuilder-step8b-b42-stair-macro-module-v1'||
  b43?.schema!=='minecraftaibuilder-step8b-b43-whole-building-circulation-v1'||
  b42.readiness!=='NOT_PREPARED'||b43.readiness!=='NOT_PREPARED'||
  b42.BuildPlan?.operations?.length!==0||b43.BuildPlan?.operations?.length!==0||
  b43.junctions?.length!==5||b43.floors?.length!==6||
  b43.totals?.conceptualAccessDoors!==77||b43.totals?.approvedWallReplans!==0||
  !Array.isArray(b43.blockers)||b43.blockers.some(g=>g.status!=='BLOCKED')||
  b43.junctions.some(j=>j.alternatives?.localShort?.wallWorkApproved!==false||
   j.alternatives?.localShort?.roomReplanApproved!==false||j.wallReplanRequests.some(x=>x.approved!==false)))fail('ASSEMBLY_BLOCKED');
 const levels=b43.floors.map((f,i)=>{
  const link=i>0?b42.transitions[i-1]:null;
  const local=b43.junctions[i-1]?.alternatives.localShort;
  return {level:i+1,coordinateFrame:'LOCAL_XZ_NOT_WORLD',
   conceptualCorridorCells:f.reviewCorridorCells,
   removedCorridorForStair:f.lowerStairEntranceRetag?[f.lowerStairEntranceRetag]:[],
   addedCorridorCandidate:local?.addedCorridorCells??[],
   proposedWallOwnerReplans:i>0?b43.junctions[i-1].wallReplanRequests:[],
   proposedFloorRows:link?.floorMask.candidateFloorRows??null,
   proposedFloorDigest:link?.floorMask.candidateFloorDigest??null,
   unchangedFoundationRoofFacade:true,
   candidateDoorInterfaces:f.doorInterfaces,
   wallAndRoomClearance:'NOT_VERIFIED',floorSupport:'NOT_VERIFIED',
   notInstallationInstructions:true};
 });
 const links=b42.transitions.map((t,i)=>({
  fromFloor:i+1,toFloor:i+2,lowerEntrance:{x:10,z:18},upperLanding:{x:15,z:18},
  symbolicRisers:t.stair.riserLocalCells,realBlockStates:null,
  headroomVerified:false,physicalConnectionVerified:false,stairSupportVerified:false,
  installationAuthorized:false}));
 return {schema:'minecraftaibuilder-step8b-b43-guarded-layout-assembly-v1',
  name:'B43_CONCEPTUAL_BUILDING_ACCESS_IR',status:'NO_EXECUTION_NOT_READY',
  sixLevels:levels,fiveStairLinks:links,
  nominalGraphAccess:{reachableDoors:b43.totals.conceptualAccessDoors,totalDoors:b43.totals.doorReservations,
   unconnectedDoors:b43.totals.unreachableDoorIds,assumesWallReplan:true},
  capabilityGates:['PARTITION_REPLAN_NEEDS_ROOM_LAYOUT','DOORS_NEED_EVIDENCE','FLOOR_SUPPORT_UNVERIFIED',
   'STAIR_COLLISION_UNVERIFIED','REAL_BLOCK_STATES_UNKNOWN','RUNTIME_PLANNER_NOT_WIRED'],
  futureEngineAdapterRequired:true,worldAnchor:null,materialIds:[],BuildPlan:{status:'NOT_PREPARED',operations:[]},
  constructionApproved:false,executionAllowed:false};
}
export function buildB43ReviewAssembly(root){
 const b42=pinned(root,'reports/B42_MACRO_STAIR_MODULE.json');
 const b43=buildB43(root);
 return compileReviewAssemblyB43(b42,b43);
}
