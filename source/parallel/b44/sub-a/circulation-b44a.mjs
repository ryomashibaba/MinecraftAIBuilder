/**
 * B44 Sub-A: six-level apartment circulation DESIGN STUDY ONLY.
 * Pure local-grid computations. No block IDs, world coordinates, commands or engine.
 * All two route families are hypothetical; model reachability != physical access.
 */
import { createHash } from 'node:crypto';

export const SCHEMA = 'minecraftaibuilder-b44-sub-a-circulation-v1';
const BUILDING = 'apartment/candidate-01';
const key = p => `${p.x},${p.z}`;
const pnt = k => {const [x,z] = k.split(',').map(Number); return {x,z};};
const sortCells = arr => arr.sort((a,b) => a.z-b.z || a.x-b.x);
const ord = a => [...a].sort();
const hash = o => createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail = code => {throw new Error(`B44A_${code}`);};
const goodCell = p => p && Number.isSafeInteger(p.x) && Number.isSafeInteger(p.z) && p.x>=0 && p.z>=0;
const nbr = p => [{x:p.x,z:p.z+1},{x:p.x+1,z:p.z},{x:p.x,z:p.z-1},{x:p.x-1,z:p.z}];
const set = a => new Set(a.map(key));
function assert(b, code) {if(!b) fail(code);}
function reportDigest(r) {const {reportSha256,...other}=r; return hash(other)===reportSha256;}
function selected(report) {return report.buildings?.find(x=>x.id===BUILDING);}
function walk(cells, start) {
 const visited=new Set(), q=[];
 if(!cells.has(key(start)))return visited;
 visited.add(key(start));q.push(start);
 for(let i=0;i<q.length;i++)for(const p of nbr(q[i])){const k=key(p);if(cells.has(k)&&!visited.has(k)){visited.add(k);q.push(p);}}
 return visited;
}
/** Record all nominal overlapping wall owners at the headroom study slice (floorY +1..3). */
function ownerMap(wallFloor, floorY) {
 const m=new Map();
 for(const w of wallFloor.wallCandidates){
  assert(['REVIEW_ONE_CELL_PARTITION','REVIEW_ONE_CELL_DOOR_APERTURE'].includes(w.kind) && w.floorId===wallFloor.id && Array.isArray(w.localGridVolumes),'WALL_SOURCE');
  for(const p of w.localGridVolumes){
   assert(goodCell(p) && Number.isSafeInteger(p.y),'WALL_VOXEL');
   if(p.y<=floorY||p.y>floorY+3)continue;
   const k=key(p);if(!m.has(k))m.set(k,new Set());m.get(k).add(w.id);
  }
 }
 return m;
}
function reservedStairCells(floor, level) {
 const excl=set([...floor.stairReservation,...floor.elevatorReservation]);
 // B43 safety fix: future straight stair entrance may not be reused as corridor.
 excl.add('11,18');
 return excl;
}
/** Fail closed on missing, changed or executable B43/B42 design inputs. */
export function validateInputs({b43,assembly,b42,interior,walls}) {
 assert(b43?.schema==='minecraftaibuilder-step8b-b43-whole-building-circulation-v1' && reportDigest(b43),'B43_DIGEST');
 assert(b42?.schema==='minecraftaibuilder-step8b-b42-stair-macro-module-v1' && reportDigest(b42),'B42_DIGEST');
 assert(assembly?.schema==='minecraftaibuilder-step8b-b43-guarded-layout-assembly-v1' && assembly.constructionApproved===false && assembly.executionAllowed===false,'ASSEMBLY');
 assert(b43.building===BUILDING && b42.building===BUILDING && b43.readiness==='NOT_PREPARED' && b42.readiness==='NOT_PREPARED' && b43.deployment==='BLOCKED' && b42.deployment==='BLOCKED','SOURCE_STATUS');
 for(const x of [b43,b42]) {
  assert(x.BuildPlan?.status==='NOT_PREPARED' && x.BuildPlan?.operations?.length===0 && x.BuildPlan?.materialIds?.length===0 && x.BuildPlan?.worldCoordinates===null,'SOURCE_OPERATIONS');
  assert(x.blockers?.length===9 && x.blockers.every(g=>g.status==='BLOCKED') && x.safety?.constructionApproved===false && x.safety?.worldAccess===false && x.safety?.bridgeContact===false,'M4_BLOCKERS');
 }
 assert(assembly.BuildPlan?.operations?.length===0 && assembly.BuildPlan.status==='NOT_PREPARED' && assembly.worldAnchor===null && assembly.materialIds?.length===0 && assembly.sixLevels?.length===6 && assembly.fiveStairLinks?.length===5 && assembly.nominalGraphAccess?.reachableDoors===77,'ASSEMBLY_OPERATIONS');
 assert(b43.floors?.length===6 && b43.junctions?.length===5 && b43.totals?.doorReservations===78 && b43.totals?.conceptualAccessDoors===77 && b43.graph?.unreachableDoorIds?.length===1 && b43.graph.unreachableDoorIds[0]===`${BUILDING}/L1/D012`,'B43_INTERFACE');
 const inB=selected(interior), waB=selected(walls);
 assert(interior?.schema==='minecraftaibuilder-step8b-b17-interior-ir-v1' && walls?.schema==='minecraftaibuilder-step8b-b21-blockscale-review-v1','INTERIOR_REPORT');
 assert(inB?.floors?.length===6 && waB?.floors?.length===6 && b42.transitions?.length===5,'FLOORS');
 for(let i=0;i<6;i++){
  const a=inB.floors[i],w=waB.floors[i],r=b43.floors[i];
  assert(a.level===i+1 && r.level===i+1 && a.id===`${BUILDING}/L${i+1}` && w.id===a.id && a.roomDoorInterfaces?.length===13 && r.doorInterfaces?.length===13,'FLOOR_ALIGN');
  assert(JSON.stringify(a.roomDoorInterfaces)===JSON.stringify(r.doorInterfaces),'DOOR_SOURCE_DRIFT');
  assert(a.corridorReservation.every(goodCell) && a.stairReservation.every(goodCell) && a.elevatorReservation.every(goodCell),'CELL_SOURCE');
  if(i>0){
   const j=b43.junctions[i-1],t=b42.transitions[i-1];
   assert(j.upperFloor===i+1 && j.transition===`L${i}_L${i+1}` && t.transition===j.transition,'LINK_ALIGN');
   assert(j.wallReplanRequests?.length===4 && j.alternatives?.localShort?.wallConflictCells?.length===4 && j.alternatives?.wallClearDetour?.wallConflictCells?.length===0,'JUNCTION_COUNTS');
   assert(t.floorMask?.candidateFloorRows?.length===a.dimensions.depth && t.floorMask.candidateFloorRows.every(row=>row.length===a.dimensions.width && /^[.#]+$/.test(row)),'FLOOR_ROWS');
  }
 }
 return {interior:inB,walls:waB};
}
function listDoorCellImpacts(route, floor){
 const cells=set(route),near=[];for(const d of floor.roomDoorInterfaces){
  const proximity=route.reduce((min,p)=>Math.min(min,Math.abs(p.x-d.hallCell.x)+Math.abs(p.z-d.hallCell.z),Math.abs(p.x-d.doorCell.x)+Math.abs(p.z-d.doorCell.z)),Infinity);
  if(proximity<=1)near.push({id:d.id,roomId:d.roomId,proximityCells:proximity,doorCellOverlapped:cells.has(key(d.doorCell)),hallCellOverlapped:cells.has(key(d.hallCell)),physicalDoorClearance:null});
 }return near;
}
function shapeRoute({route,sourceCorridor,floor,wallFloor,wallMap}) {
 assert(Array.isArray(route)&&route.length>1 && route.every(goodCell),'ROUTE');
 for(let i=1;i<route.length;i++)assert(Math.abs(route[i].x-route[i-1].x)+Math.abs(route[i].z-route[i-1].z)===1,'ROUTE_DISCONNECTED');
 const exclusive=reservedStairCells(floor,floor.level),corridor=sourceCorridor instanceof Set?sourceCorridor:set(sourceCorridor);
 assert(route.every(p=>!exclusive.has(key(p))),'STAIR_COLLISION');
 const doorCell=set(floor.roomDoorInterfaces.map(d=>d.doorCell));
 assert(route.every(p=>!doorCell.has(key(p))),'DOOR_CELL_COLLISION');
 const added=sortCells(route.filter(p=>!corridor.has(key(p))));
 const conflicts=sortCells(route.filter(p=>wallMap.has(key(p))));
 const impactedOwners=ord(new Set(conflicts.flatMap(p=>[...wallMap.get(key(p))])));
 const boundaries=new Map(floor.wallBoundaries.map(w=>[w.id,w]));
 const cells=conflicts.map(p=>{
  const owners=ord(wallMap.get(key(p)));
  const roomIds=ord(new Set(owners.flatMap(id=>boundaries.get(id)?.roomIds??[])));
  return {cell:p,wallOwnerIds:owners,roomIds,roomFootprintVerified:false,partitionRelocationApproved:false};
 });
 assert(impactedOwners.every(id=>boundaries.has(id) && wallFloor.wallCandidates.some(w=>w.id===id)),'WALL_OWNER_MISSING');
 return {route,steps:route.length-1,addedCorridorCells:added,addedCorridorCount:added.length,
  wallConflicts:cells,wallConflictCellCount:cells.length,impactedWallOwnerIds:impactedOwners,
  impactedNominalRoomIds:ord(new Set(cells.flatMap(c=>c.roomIds))),
  neighboringDoors:listDoorCellImpacts(route,floor),
  corridorWidth:{reservedCenterlineWidthCells:1,actualClearWidthCells:null,requiredWidthCells:null,physicalWidthVerified:false},
  roomImpact:{roomAreaBeforeCells:null,roomAreaAfterCells:null,areaDeltaCells:null,usableAreaVerified:false,sourceRoomVolumesAvailable:false},
  floorSupportVerified:false,doorStatesVerified:false,physicalPassageVerified:false,wallModificationApproved:false};
}
/** Dijkstra, deterministic and bounded; for L1, the B42 upper-level mask is a *proxy*, never certified as L1 footprint. */
export function findDoorLink({floor,wallFloor,rows,entrance,doorId,wallClear=false,maxSteps=95}) {
 assert(floor?.level===1 && wallFloor?.id===floor.id && Array.isArray(rows) && rows.length===floor.dimensions.depth && rows.every(row=>typeof row==='string' && row.length===floor.dimensions.width && /^[.#]+$/.test(row)),'L1_MASK');
 const dest=floor.roomDoorInterfaces.find(d=>d.id===doorId);assert(dest && goodCell(dest.hallCell),'D012_DOOR');
 const target=dest.hallCell,start=entrance;
 const source=set(floor.corridorReservation),m=ownerMap(wallFloor,floor.localYRange[0]),exclude=reservedStairCells(floor,1);
 const doorCells=set(floor.roomDoorInterfaces.map(d=>d.doorCell));
 const allowed=p=>p.x>=0&&p.x<floor.dimensions.width&&p.z>=0&&p.z<floor.dimensions.depth&&rows[p.z][p.x]==='#'&&!exclude.has(key(p))&&!doorCells.has(key(p))&&(!wallClear||!m.has(key(p)));
 assert(allowed(start)&&allowed(target),'L1_TERMINALS');
 const pending=[{p:start,cost:0,steps:0}],best=new Map([[key(start),0]]),pred=new Map([[key(start),null]]);
 while(pending.length){
  pending.sort((a,b)=>a.cost-b.cost||a.steps-b.steps||a.p.z-b.p.z||a.p.x-b.p.x);
  const item=pending.shift(),k=key(item.p);if(best.get(k)!==item.cost)continue;
  if(k===key(target))break;
  for(const p of nbr(item.p)){
   const nk=key(p);if(!allowed(p)||item.steps>=maxSteps)continue;
   const cost=item.cost+100+(!wallClear&&m.has(nk)?10:0)+(!source.has(nk)?1:0);
   if(cost<(best.get(nk)??Infinity)){best.set(nk,cost);pred.set(nk,k);pending.push({p,cost,steps:item.steps+1});}
  }
 }
 if(!pred.has(key(target)))return null;
 const route=[];for(let k=key(target);k!==null;k=pred.get(k))route.push(pnt(k));route.reverse();
 const result=shapeRoute({route,sourceCorridor:source,floor,wallFloor,wallMap:m});
 if(wallClear)assert(result.wallConflictCellCount===0,'NOT_WALL_CLEAR');
 return {...result,doorId,doorRoomId:dest.roomId,doorHallCell:dest.hallCell,
  maskSource:'B42_L2_CANDIDATE_FLOOR_ROWS_REUSED_ONLY_AS_L1_STUDY_PROXY',l1MaskMatchesSourceFloor:null,l1FloorPlateCertified:false,
  graphConnectionStatus:'UNAPPROVED_HYPOTHESIS'};
}
function ownersForUpper(j,floor,wallFloor,routeType){
 const raw=j.alternatives[routeType];assert(raw && Array.isArray(raw.route),'UPPER_ROUTE');
 const actual=shapeRoute({route:raw.route,sourceCorridor:set(floor.corridorReservation),floor,wallFloor,wallMap:ownerMap(wallFloor,floor.localYRange[0])});
 assert(actual.steps===raw.steps && actual.addedCorridorCount===raw.addedCorridorCells.length &&
  actual.wallConflictCellCount===raw.wallConflictCells.length &&
  JSON.stringify(actual.impactedWallOwnerIds)===JSON.stringify(raw.impactedWallCandidateIds),'B43_ROUTE_DRIFT');
 assert(actual.route[0].x===15 && actual.route[0].z===18 && actual.route.at(-1).x===10 && actual.route.at(-1).z===18,'UPPER_ENDPOINTS');
 return {...actual,level:floor.level,transition:j.transition,
  wallReplanRequests:j.wallReplanRequests.filter(req=>actual.wallConflicts.some(c=>key(c.cell)===key(req.cell))).map(req=>({cell:req.cell,owners:req.wallCandidateIds,approved:false})),
  roomReservationEvidence:'NOMINAL_BOUNDARY_ROOM_IDS_ONLY',physicalRoomExtent:null};
}
function graphReview(floors,activeRoutes){
 const overlay=floors.map((f,i)=>{
  const base=set(f.corridorReservation);if(i<5)base.delete('11,18');
  for(const cell of activeRoutes[i]?.route??[])base.add(key(cell));return base;
 });
 const q=[],seen=new Set();const push=(i,p)=>{const k=`${i+1}:${key(p)}`;if(overlay[i]?.has(key(p))&&!seen.has(k)){seen.add(k);q.push({i,p});}};
 push(0,{x:10,z:18});
 for(let n=0;n<q.length;n++){
  const {i,p}=q[n];for(const t of nbr(p))push(i,t);
  // These links are symbolic B43 links only, NOT evaluated Minecraft stair geometry.
  if(i<5&&key(p)==='10,18')push(i+1,{x:15,z:18});
  if(i>0&&key(p)==='15,18')push(i-1,{x:10,z:18});
 }
 const details=floors.flatMap((f,i)=>f.roomDoorInterfaces.map(d=>({
  id:d.id,level:i+1,roomId:d.roomId,hallCell:d.hallCell,
  nominalHallReachable:seen.has(`${i+1}:${key(d.hallCell)}`),
  openingPhysicalVerified:false,playerPassageVerified:false})));
 const reached=details.filter(d=>d.nominalHallReachable).map(d=>d.id).sort();
 const missed=details.filter(d=>!d.nominalHallReachable).map(d=>d.id).sort();
 return {entrance:{level:1,x:10,z:18},totalDoors:details.length,nominalReachableDoorIds:reached,
  nominalUnreachableDoorIds:missed,nominalReachableDoorCount:reached.length,
  doors:details,nominalStairLinks:5,stairPhysicalConnectivityVerified:false,playerPassageVerified:false,
  appliedToWorld:false};
}
/** Room/wall/door correspondence for each floor; no invented room volumes or dimensions. */
export function buildWallDoorRoomCorrespondence({b43,interior,walls}) {
 const inf=selected(interior),waf=selected(walls);
 assert(inf?.floors?.length===6 && waf?.floors?.length===6 && b43?.junctions?.length===5,'CORRESPONDENCE_INPUT');
 return b43.junctions.map((j,i)=>{
  const floor=inf.floors[i+1],wf=waf.floors[i+1],boundaries=new Map(floor.wallBoundaries.map(w=>[w.id,w]));
  const candidates=new Map(wf.wallCandidates.map(w=>[w.id,w]));
  const wm=ownerMap(wf,floor.localYRange[0]);
  const cells=j.wallReplanRequests.map(r=>{
   const owners=ord(wm.get(key(r.cell))??[]);
   assert(JSON.stringify(owners)===JSON.stringify(r.wallCandidateIds),'CORRESPONDENCE_DRIFT');
   const roomIds=ord(new Set(owners.flatMap(id=>boundaries.get(id)?.roomIds??[])));
   const neighborDoors=listDoorCellImpacts([r.cell],floor);
   return {cell:r.cell,wallOwnerIds:owners,roomIds,
    nominalWallTypes:owners.map(id=>({id,kind:boundaries.get(id)?.kind??null,wallCandidateKind:candidates.get(id)?.kind??null})),
    doorReservationsNearCell:neighborDoors,
    displacementTargetCell:null,replacementWallPlacementVerified:false,roomAreaAfterCells:null,
    physicalPassageWidthCells:null,roomFootprintsKnown:false};
  });
  return {level:i+2,transition:j.transition,wallConflictCellCount:cells.length,wallCandidateOwnerCount:ord(new Set(cells.flatMap(c=>c.wallOwnerIds))).length,
   candidateNewCorridorCells:j.alternatives.localShort.addedCorridorCells,cells,
   roomVolumeReservationsAvailable:false,wallRelocationApproved:false};
 });
}
/** Both macro schemes are hypotheses; all M4 gates stay BLOCKED even when nominal graph reaches 78. */
export function buildB44ASubA(inputs){
 const {b43,b42,assembly,interior,walls}=inputs;
 const {interior:fl,walls:wf}=validateInputs(inputs);
 const ownerTable=buildWallDoorRoomCorrespondence({b43,interior,walls});
 const d012=`${BUILDING}/L1/D012`;
 const compare=[['LOCAL_PARTITION_REPLAN','localShort'],['WALL_CLEAR_PERIMETER_REDISTRIBUTION','wallClearDetour']].map(([id,routeType])=>{
  const upper=b43.junctions.map((j,i)=>ownersForUpper(j,fl.floors[i+1],wf.floors[i+1],routeType));
  // A missing certified L1 floor mask is NOT silently promoted. This is a study proxy only.
  const l1=findDoorLink({floor:fl.floors[0],wallFloor:wf.floors[0],
   rows:b42.transitions[0].floorMask.candidateFloorRows,entrance:{x:10,z:18},doorId:d012,wallClear:routeType==='wallClearDetour'});
  const routes=[l1,...upper],completeness=routes.every(Boolean);
  const graph=graphReview(fl.floors,routes);
  const wallsHit=routes.reduce((n,r)=>n+(r?.wallConflictCellCount??0),0);
  const pathSteps=routes.reduce((n,r)=>n+(r?.steps??0),0);
  const added=routes.reduce((n,r)=>n+(r?.addedCorridorCount??0),0);
  const roomIds=ord(new Set(routes.flatMap(r=>r?.impactedNominalRoomIds??[])));
  const levelImpacts=routes.map((r,i)=>({level:i+1,routeAvailable:!!r,routeSteps:r?.steps??null,
   wallConflictCells:r?.wallConflictCellCount??null,affectedRooms:r?.impactedNominalRoomIds??[],
   neighboringDoors:r?.neighboringDoors??[],newCorridorCells:r?.addedCorridorCount??null,
   proposedCorridorWidthCells:r?.corridorWidth?.reservedCenterlineWidthCells??null,
   verifiedCorridorWidthCells:null,roomAreaAfterCells:null,structuralSupportVerified:false}));
  return {id,description:id==='LOCAL_PARTITION_REPLAN'?'B43 upper short route + bounded L1/D012 short link; relocation of overlapping partitions would be required':'Long wall-clear upper detour + wall-clear L1/D012 link; external perimeter and rooms not certified',
   upperFloorRouteType:routeType,l1DoorLink:l1,upperRoutes:upper,levelImpacts,
   metrics:{routesEvaluated:routes.filter(Boolean).length,totalRouteSteps:pathSteps,
    totalNewCorridorCells:added,totalWallConflictCells:wallsHit,
    uniqueNominalRoomIdsAffected:roomIds,
    nominalDoorReachability:`${graph.nominalReachableDoorCount}/${graph.totalDoors}`,
    nominalUnreachableDoorIds:graph.nominalUnreachableDoorIds,
    actualPassableDoorCount:null,actualClearCorridorWidthCells:null,actualRoomAreaDeltaCells:null,
    floorSupportVerified:false},
   graph,preliminaryGeometryComplete:completeness && graph.nominalReachableDoorCount===78,
   corridorWidthVerified:false,roomUsabilityVerified:false,wallRelocationApproved:false,
   l1FootprintVerified:false,doorStateVerified:false,stairStatesVerified:false,
   physicalAccessVerified:false,constructionApproved:false,
   disposition:'BLOCKED_RESEARCH_ONLY'};
 });
 const baseline=graphReview(fl.floors,[null,...b43.junctions.map(j=>j.alternatives.localShort)]);
 assert(baseline.nominalReachableDoorCount===77 && baseline.nominalUnreachableDoorIds.length===1 && baseline.nominalUnreachableDoorIds[0]===d012,'BASELINE_GRAPH_DRIFT');
 const report={schema:SCHEMA,building:BUILDING,mode:'LOCAL_GRID_OFFLINE_DESIGN_REVIEW_ONLY',
  evidence:{b43ReportSha256:b43.reportSha256,b42ReportSha256:b42.reportSha256,
   verifiedB43Readiness:'NOT_PREPARED',b43PhysicalPassageEvidence:false,
   l1FootprintMaskSource:'B42_TRANSITION_L1_L2_UPPER_FLOOR_PROXY_NOT_L1_PROVEN',
   sourceRoomVolumeReservations:false},
  baseline:{nominalB43GraphAccess:'77/78',unreachableD012Id:d012,nominalGraph:baseline,
   currentlyPhysicalAccessibleDoors:null},
  wallDoorRoomCorrespondence:ownerTable,
  variants:compare,
  assessment:{eligibleForAdoption:false,chosenVariant:null,
   reason:'Both alternatives rely on unapproved walls/rooms and assumed floor & stair models; graph results are projections only.',
   geometryOnlyPreference:compare[0].metrics.totalRouteSteps<compare[1].metrics.totalRouteSteps?'LOCAL_PARTITION_REPLAN_FOR_FURTHER_STUDY_ONLY':null,
   physicalWalkabilityVerified:false,l1D012PhysicalPassageVerified:false,
   verifiedDoorStates:0,verifiedRoomAreas:0,verifiedFloorSupports:0},
  safety:{readiness:'NOT_PREPARED',deployment:'BLOCKED',m4GateStatuses:Array(9).fill('BLOCKED'),
   buildOperations:0,engineCalls:0,constructionApproved:false,executionAllowed:false,
   bridgeContact:false,minecraftContact:false,worldAccess:false,legacyModified:false,frozenEvidenceModified:false,
   worldCoordinates:null,materialIds:[],BuildPlan:{status:'NOT_PREPARED',operations:[]}},
  unresolved:['L1 floor source mask not certified; B42 upper floor mask is a proxy only',
   'Room volume/area reservations, replacement partition walls and legal room widths have no source evidence',
   'Corridor physical width, floor support, head clearance and stair states remain unverified',
   'Door D012 physical interface and all door block states remain unverified',
   'Wall-clear perimeter detour may traverse nominal rooms or inaccessible external envelope',
   'M4 9 gates remain BLOCKED; no world or engine changes allowed']};
 return {...report,reportSha256:hash(report)};
}
export function verifyB44ASubA(report,inputs){
 assert(report?.schema===SCHEMA && report?.safety?.readiness==='NOT_PREPARED' && report.safety.deployment==='BLOCKED','REVIEW_STATUS');
 assert(report.safety.engineCalls===0 && report.safety.buildOperations===0 && report.safety.BuildPlan?.operations?.length===0 && report.safety.constructionApproved===false && report.safety.m4GateStatuses?.length===9 && report.safety.m4GateStatuses.every(x=>x==='BLOCKED'),'REVIEW_SAFETY');
 assert(reportDigest(report) && JSON.stringify(report)===JSON.stringify(buildB44ASubA(inputs)),'REVIEW_DIGEST');
 return true;
}
