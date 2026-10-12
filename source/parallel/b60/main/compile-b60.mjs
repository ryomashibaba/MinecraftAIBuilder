/** B60 — compile audited local-only, NON-EXECUTABLE six-level circulation interface.
 * The model joins the frozen B43 proposed graph and the B59 historical gap audit;
 * it neither designs physical block state nor emits construction commands.
 */
import {createHash} from 'node:crypto';
const hash = body => createHash('sha256').update(JSON.stringify(body)).digest('hex');
const bad = reason => { throw new Error(`B60_${reason}`); };
const eq = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const key = (l,x,z) => `${l}/${x},${z}`;
function checkReport(r,label) {
 if(!r || typeof r!=='object'||Array.isArray(r)||typeof r.reportSha256!=='string')bad(`${label}_REPORT`);
 const {reportSha256,...body}=r;
 if(hash(body)!==reportSha256)bad(`${label}_HASH`);
}
function checkNoBuild(r,label) {
 if(r.BuildPlan?.status!=='NOT_PREPARED'||!Array.isArray(r.BuildPlan.operations)||r.BuildPlan.operations.length!==0) bad(`${label}_BUILD`);
 if(r.readiness!=='NOT_PREPARED'||r.deployment!=='BLOCKED')bad(`${label}_READINESS`);
}
function localPoint(p,width,depth) {
 return p && Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z)&&p.x>=0&&p.z>=0&&p.x<width&&p.z<depth;
}
function fourAdjacent(a,b) {return Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;}
function floorMask(level,width,depth,count) {
 const mask=new Set();
 if(!Array.isArray(level.floorRectangles))bad('FLOOR_RECTS');
 for(const r of level.floorRectangles){if(!Number.isSafeInteger(r.width)||!Number.isSafeInteger(r.depth)||r.width<1||r.depth<1||!localPoint({x:r.x,z:r.z},width,depth)||r.x+r.width>width||r.z+r.depth>depth)bad('RECT_BOUNDS');
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){let k=`${x},${z}`;if(mask.has(k))bad('RECT_OVERLAP');mask.add(k);}}
 if(mask.size!==count)bad('FLOOR_TOTAL');return mask;
}
const route = (parents, target) => {
 if(!parents.has(target))return null;
 const result=[];
 for(let k=target;k!==null;k=parents.get(k))result.push(k);
 return result.reverse();
};
const ensureSafe = (r) => r?.BuildPlan?.operations?.length===0 && r?.BuildPlan?.status==='NOT_PREPARED';
export function compileB60(b59,guard,vertical,b57,b42,b31) {
 for(const [r,label] of [[b59,'B59'],[vertical,'B43_VERTICAL'],[b57,'B57'],[b42,'B42'],[b31,'B31']]) checkReport(r,label);
 for(const [r,label] of [[b59,'B59'],[vertical,'B43_VERTICAL'],[b57,'B57'],[b42,'B42'],[b31,'B31']])checkNoBuild(r,label);
 if(guard?.schema!=='minecraftaibuilder-step8b-b43-guarded-layout-assembly-v1'||guard.status!=='NO_EXECUTION_NOT_READY'||
 !ensureSafe(guard)||guard.executionAllowed!==false||guard.constructionApproved!==false||guard.worldAnchor!==null||!eq(guard.materialIds,[])||
 b59.schema!=='minecraftaibuilder-b59-optimistic-circulation-gap-review-v1'||
 b59.totals.historicUnverified!==60||b59.totals.historicReportedReachable!==5||
 b59.provenance.b57ReportSha256!==b57.reportSha256||b59.provenance.b42ReportSha256!==b42.reportSha256||
 vertical.schema!=='minecraftaibuilder-step8b-b43-whole-building-circulation-v1'||
 b57.productionFacadeParity!=='UNVERIFIED'||b59.productionFacadeParity!=='UNVERIFIED'||
 b59.blockers?.M4Gates?.length!==9||b59.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
 guard.sixLevels?.length!==6||guard.fiveStairLinks?.length!==5||vertical.floors?.length!==6||
 vertical.totals?.conceptualAccessDoors!==77||guard.nominalGraphAccess?.reachableDoors!==77||
 vertical.totals?.doorReservations!==78||guard.nominalGraphAccess?.totalDoors!==78||
 guard.nominalGraphAccess?.assumesWallReplan!==true)bad('SOURCE_CONTRACT');
 const house=b57.buildings.find(x=>x.id==='apartment/candidate-01');
 const dHouse=b31.buildings.find(x=>x.id==='apartment/candidate-01');
 if(!house||!dHouse||house.levels?.length!==6||dHouse.floors?.length!==6)bad('HOUSE');
 const {width,depth}=house.site;
 const cells=new Set(),floorMasks=[],edges=new Map();const events=[],floorSummaries=[];
 let added=0,conflict=0,wallOwners=new Set(),totalDoorMappings=0;
 for(let i=0;i<6;i++){
  const level=i+1,g=guard.sixLevels[i],v=vertical.floors[i],doors=dHouse.floors[i].doors,p=house.preview.levels[i];
  if(g.level!==level||v.level!==level||doors.length!==13||g.candidateDoorInterfaces?.length!==13||
    dHouse.floors[i].level!==level||!eq(g.conceptualCorridorCells,v.reviewCorridorCells))bad('LEVEL_MAPPING');
  const floor=floorMask(p,width,depth,house.levels[i].floorCells);floorMasks.push(floor);
  let local=new Set();
  for(const pt of g.conceptualCorridorCells){if(!localPoint(pt,width,depth)||!floor.has(`${pt.x},${pt.z}`))bad('CORRIDOR_OUTSIDE_FLOOR');const k=key(level,pt.x,pt.z);if(cells.has(k))bad('DUP_CORRIDOR');cells.add(k);local.add(`${pt.x},${pt.z}`);}
  if(!local.size||!local.has('10,18')||!local.has('15,18'))bad('STAIR_ANCHORS');
  const proposed=g.addedCorridorCandidate||[],conflicts=g.proposedWallOwnerReplans||[];
  if(proposed.length!==(i===0?0:7)||conflicts.length!==(i===0?0:4))bad('PROPOSAL_COUNT');
  const conflictSet=new Set();
  for(const p of proposed){const k=`${p.x},${p.z}`;if(!local.has(k))bad('ADDED_CORRIDOR_INVALID');}
  for(const c of conflicts){const k=`${c.cell.x},${c.cell.z}`;
   if(!local.has(k)||!proposed.some(p=>p.x===c.cell.x&&p.z===c.cell.z)||conflictSet.has(k)||c.approved!==false||
    c.requestedDisposition!=='REPLAN_WALL_AND_ROOM_LAYOUT_NOT_REMOVE_AUTOMATICALLY'||!Array.isArray(c.wallCandidateIds)||!c.wallCandidateIds.length)bad('WALL_REPLAN');
   conflictSet.add(k);for(const owner of c.wallCandidateIds){if(typeof owner!=='string'||!owner.includes(`/L${level}/W`))bad('WALL_OWNER');wallOwners.add(owner);}
   events.push({level,kind:'PARTITION_REPLAN_CANDIDATE_ONLY',point:c.cell,wallOwnerIds:c.wallCandidateIds,approved:false,blockStates:null});
  }
  added+=proposed.length;conflict+=conflicts.length;
  const IDs=new Set(doors.map(d=>d.id)), interfaceIds=new Set();
  for(const p of g.candidateDoorInterfaces){const dr=doors.find(d=>d.id===p.id);
   if(!dr||interfaceIds.has(p.id)||!IDs.has(p.id)||p.nominal!==true||p.openingPhysicalVerified!==false||
    !localPoint(p.hallCell,width,depth)||!localPoint(p.doorCell,width,depth)||!floor.has(`${p.doorCell.x},${p.doorCell.z}`)||
    !fourAdjacent(p.doorCell,p.hallCell)||!local.has(`${p.hallCell.x},${p.hallCell.z}`)||
    dr.blockId!==null||dr.stateBinding!=='BLOCKED'||dr.emitAllowed!==false)bad('DOOR_INTERFACE');
   interfaceIds.add(p.id);totalDoorMappings++;
  }
  floorSummaries.push({level,canonicalFloorCells:floor.size,conceptCorridorCells:local.size,
   newCorridorProposalCells:proposed.length,partitionConflictCells:conflicts.length,doorInterfaces:doors.length,
   sourceLocalFloorModified:false,wallChangeAuthorized:false});
 }
 for(const k of cells){const [level_s,coords]=k.split('/'),level=Number(level_s),[x,z]=coords.split(',').map(Number);
  edges.set(k,[[x+1,z],[x-1,z],[x,z+1],[x,z-1]].map(([nx,nz])=>key(level,nx,nz)).filter(n=>cells.has(n)));}
 for(let i=0;i<5;i++){
  const s=guard.fiveStairLinks[i];if(s.fromFloor!==i+1||s.toFloor!==i+2||s.realBlockStates!==null||s.headroomVerified!==false||
     s.physicalConnectionVerified!==false||s.stairSupportVerified!==false||s.installationAuthorized!==false)bad('STAIR_PHYSICAL');
  const lower=key(s.fromFloor,s.lowerEntrance.x,s.lowerEntrance.z),upper=key(s.toFloor,s.upperLanding.x,s.upperLanding.z);
  if(!cells.has(lower)||!cells.has(upper))bad('STAIR_ENDPOINT');
  edges.get(lower).push(upper);edges.get(upper).push(lower);
  events.push({fromLevel:s.fromFloor,toLevel:s.toFloor,kind:'SYMBOLIC_STAIR_LINK_ONLY',lower:s.lowerEntrance,upper:s.upperLanding,
   verifiedPhysicalGeometry:false,actualBlockStates:null,approved:false});
 }
 const entrance=vertical.graph?.entrance;
 if(entrance?.floor!==1||entrance.x!==10||entrance.z!==18)bad('ENTRANCE_CONTRACT');
 const origin=key(1,entrance.x,entrance.z),parents=new Map([[origin,null]]),queue=[origin];
 for(let i=0;i<queue.length;i++)for(const n of edges.get(queue[i])||[])if(!parents.has(n)){parents.set(n,queue[i]);queue.push(n);}
 const doors=[];
 for(let i=0;i<6;i++)for(const di of guard.sixLevels[i].candidateDoorInterfaces){
   const k=key(i+1,di.hallCell.x,di.hallCell.z),path=route(parents,k);
   doors.push({id:di.id,level:i+1,sourceWallBoundary:di.boundaryId,roomId:di.roomId,
     conceptualDoorCell:di.doorCell,conceptualHallCell:di.hallCell,
     symbolicNetworkReachable:path!==null,localHallRoute:path,
     physicalPassageProven:false,doorMaterialId:null,hinge:null,facing:null,emitAllowed:false,
     proposedPartitionEditsApproved:false});
 }
 const reachableIds=doors.filter(d=>d.symbolicNetworkReachable).map(d=>d.id),unreachableIds=doors.filter(d=>!d.symbolicNetworkReachable).map(d=>d.id);
 if(doors.length!==78||reachableIds.length!==77||!eq(unreachableIds,['apartment/candidate-01/L1/D012'])||
 !eq(reachableIds,vertical.graph.reachableDoorIds)||!eq(unreachableIds,guard.nominalGraphAccess.unconnectedDoors)||
 added!==35||conflict!==20||totalDoorMappings!==78||
 !eq(b59.apartmentUpperLandingGap.map(x=>x.sourceReportedDoorsReachableFromLanding),[1,1,1,1,1])||
 !eq(b59.apartmentUpperLandingGap.map(x=>x.sourceConceptDoors),[13,13,13,13,13]))bad('REPLAY_DISAGREEMENT');
 const body={schema:'minecraftaibuilder-b60-guarded-circulation-interface-v1',kind:'OFFLINE_SYMBOLIC_LAYOUT_SPECIFICATION_NOT_AN_ENGINE_PLANNER',
  provenance:{b59Sha256:b59.reportSha256,b57Sha256:b57.reportSha256,b42Sha256:b42.reportSha256,
   b31Sha256:b31.reportSha256,b43VerticalSha256:vertical.reportSha256},
  comparison:{b42HistoricUpperDoorAccess:{reachable:5,unverified:60,model:'B42_UNMODIFIED_CORRIDOR_NETWORK'},
   b43GuardedSixFloor:{reachable:77,total:78,model:'GRAPH_ONLY_WITH_UNAPPROVED_WALL_REPLAN_AND_SYMBOLIC_STAIRS'},
   claimOfActualRepair:false,sameEvaluationModel:false},
  totals:{floors:6,sourceDoors:78,corridorCells:cells.size,reachableSymbolicDoors:reachableIds.length,
   unresolvedSymbolicDoors:unreachableIds.length,proposedCorridorCellAdditions:added,
   proposedPartitionConflictCells:conflict,partitionWallOwnerIds:wallOwners.size,stairLinks:5,
   realDoorStatesVerified:0,realStairStatesVerified:0,wallChangesAuthorized:0,minecraftCommands:0},
  floors:floorSummaries,doorInterfaces:doors,unresolvedDoorIds:unreachableIds,heldDesignActions:events,
  blockers:['B43_PARTITION_ROOM_REPLAN_UNAPPROVED','B43_DOOR_BLOCK_STATE_UNKNOWN','B43_STAIR_HEADROOM_SUPPORT_UNPROVEN',
   'B43_1F_D012_DISCONNECTED','B42_B57_FLOOR_SNAPSHOT_DIFFERENCE','PRODUCTION_ENGINE_ORIGINAL_MISSING'],
  evidenceBoundary:'2D_TOPOLOGY_CONCEPT_ONLY_NO_COLLISION_WIDTH_SUPPORT_STATES_OR_RUNTIME_PARITY',
  productionFacadeParity:'UNVERIFIED',physicalQuality:'UNKNOWN',readiness:'NOT_PREPARED',deployment:'BLOCKED',
  executionAllowed:false,constructionApproved:false,engineCalls:0,worldContacts:0,scans:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]},
  gates:b59.blockers.M4Gates.map(g=>({...g}))};
 return {...body,reportSha256:hash(body)};
}
export function verifyB60(report,...inputs){checkReport(report,'B60');
 if(report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||report.executionAllowed!==false||report.constructionApproved!==false||
 report.BuildPlan?.operations?.length!==0||report.gates?.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||
 report.engineCalls!==0||report.worldContacts!==0||report.scans!==0||report.totals.minecraftCommands!==0||
 !eq(report,compileB60(...inputs)))bad('REPORT_REPLAY');return true;}
