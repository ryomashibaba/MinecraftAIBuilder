/** B59 — offline concept-door access envelope and historical stair snapshot comparison.
 * NO real walls/doors/stairs, material IDs, world coordinates or construction output.
 */
import {createHash} from 'node:crypto';
const sha = o => createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail = s => {throw Error('B59_' + s);};
const safeInt = (n,hi) => Number.isSafeInteger(n)&&n>=0&&n<=hi;
const coord = (x,z,w,d) => safeInt(x,w-1)&&safeInt(z,d-1);
function ensureHash(r){if(!r||typeof r!=='object'||Array.isArray(r))fail('REPORT_OBJECT');let {reportSha256,...body}=r;if(sha(body)!==reportSha256)fail('SOURCE_HASH');}
function safety(r,name){
 if(r.readiness!=='NOT_PREPARED'||r.deployment!=='BLOCKED'||r.BuildPlan?.operations?.length!==0||
 r.BuildPlan?.status!=='NOT_PREPARED'||(r.BuildPlan.commandCount!==undefined&&r.BuildPlan.commandCount!==0))fail(name+'_BLOCK');
}
function raster(rects,w,d,expected){
 const mask=new Uint8Array(w*d);let n=0;
 if(!Array.isArray(rects))fail('RECTS');
 for(let r of rects){if(!r||![r.x,r.z,r.width,r.depth].every(v=>safeInt(v,64))||!r.width||!r.depth||r.x+r.width>w||r.z+r.depth>d)fail('RECT_RANGE');
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){let i=z*w+x;if(mask[i])fail('RECT_OVERLAP');mask[i]=1;n++;}}
 if(n!==expected)fail('RECT_COUNT');return mask;
}
function rowsMask(rows,w,d,count){
 if(!Array.isArray(rows)||rows.length!==d)fail('ROWS');const mask=new Uint8Array(w*d);let n=0;
 for(let z=0;z<d;z++){if(typeof rows[z]!=='string'||rows[z].length!==w||/[^.#]/.test(rows[z]))fail('ROW_DATA');
  for(let x=0;x<w;x++)if(rows[z][x]==='#'){mask[z*w+x]=1;n++;}}
 if(n!==count)fail('ROW_COUNT');return mask;
}
function routeGraph(mask,w,d,anchors){
 let queue=[],dist=new Int32Array(w*d).fill(-1),prev=new Int32Array(w*d).fill(-1);
 for(const a of anchors){if(!coord(a.x,a.z,w,d)||!mask[a.z*w+a.x])fail('ANCHOR_OUTSIDE');let k=a.z*w+a.x;
  if(dist[k]===-1){dist[k]=0;queue.push(k);}}
 for(let j=0;j<queue.length;j++){
  let k=queue[j],x=k%w,z=(k-x)/w;
  for(let [dx,dz] of [[0,-1],[-1,0],[1,0],[0,1]]){
   const nx=x+dx,nz=z+dz;if(!coord(nx,nz,w,d))continue;
   let kk=nz*w+nx;if(mask[kk]&&dist[kk]===-1){prev[kk]=k;dist[kk]=dist[k]+1;queue.push(kk);}
  }
 }
 return {dist,prev,reachable:queue.length};
}
function trace(g,x,z,w){
 let k=z*w+x,result=[];if(g.dist[k]===-1)return null;
 for(;k!==-1;k=g.prev[k])result.push({x:k%w,z:Math.floor(k/w)});
 result.reverse();return result;
}
function assertDoor(d,bid,level,w,depth){
 if(!d||typeof d.id!=='string'||!d.id.startsWith(`${bid}/L${level}/D`)||
 !d.localLower||!coord(d.localLower.x,d.localLower.z,w,depth)||
 d.actualFacing!==null||d.hinge!==null||d.blockId!==null||d.emitAllowed!==false||
 d.stateBinding!=='BLOCKED'||d.physicalJambAndOpening!=='UNVERIFIED')fail('DOOR_PHYSICAL_CONTRACT');
}
export function compileB59(b58,b57,b42,b31){
 [b58,b57,b42,b31].forEach(ensureHash);
 [b58,b57,b42,b31].forEach((r,i)=>safety(r,['B58','B57','B42','B31'][i]));
 if(b58.schema!=='minecraftaibuilder-b58-nominal-vertical-core-reconciliation-v1'||
 b57.schema!=='minecraftaibuilder-b57-offline-envelope-topology-v1'||
 b42.schema!=='minecraftaibuilder-step8b-b42-stair-macro-module-v1'||
 b31.schema!=='minecraftaibuilder-step8b-b31-inert-floor-door-contract-v1'||
 b58.provenance?.b57ReportSha256!==b57.reportSha256||b58.provenance?.b42ReportSha256!==b42.reportSha256||
 b57.productionFacadeParity!=='UNVERIFIED'||b58.productionFacadeParity!=='UNVERIFIED'||
 b42.safety?.executionAllowed!==false||b31.safety?.executionAllowed!==false||
 b31.physicalValidated!==false||b31.enginePlannerInput!==null||b31.constructionCommands?.length!==0||
 b31.safety?.worldAccess!==false||b31.BuildPlan?.worldCoordinates!==null||
 b42.BuildPlan?.worldCoordinates!==null||
 b31.totals?.doorsWithBlockId!==0||b31.totals?.operationsEmitted!==0||
 b42.interface?.outputCompatibleWithRuntimePlanner!==false||
 b58.blockers?.M4Gates?.length!==9||b58.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
 b58.engineCalls!==0||b58.scans!==0||b58.worldContacts!==0||b58.constructionApproved!==false||
 b31.blockers?.length!==9||b31.buildings?.length!==5||b57.buildings?.length!==5||
 b42.transitions?.length!==5||b58.legacyStairAudit?.transitions?.length!==5)fail('SOURCE_CONTRACT');
 let allDoorReports=[],apartmentLevels=[];let counts={levels:0,doors:0,doorPositionsOnFloor:0,doorPositionsOffFloor:0,nominalFloodReachable:0,nominalFloodUnreachable:0,
  apartmentUpperLevels:0,upperConceptDoors:0,upperNominalBareFloorReachable:0,upperNominalProxyReachable:0,
  historicReportedReachable:0,historicUnverified:0,canonicalRouteCellsMissingInB42:0,
  legacySnapshotDifferences:0};
 for(const b of b57.buildings){const bd=b31.buildings.find(i=>i.id===b.id);if(!bd||bd.floors.length!==6||b.preview.levels.length!==6||b.levels.length!==6)fail('BUILDING_MATCH');
  const w=b.site.width,d=b.site.depth;
  for(let l=0;l<6;l++){
   let f=bd.floors[l],p=b.preview.levels[l];if(f.level!==l+1||f.width!==w||f.depth!==d||f.originalFloorMaskCellCount!==b.levels[l].floorCells)fail('LEVEL_MATCH');
   const floor=raster(p.floorRectangles,w,d,b.levels[l].floorCells);
   const doors=f.doors;
   if(!Array.isArray(doors))fail('DOOR_ARRAY');let ids=new Set(),within=0;
   for(let dr of doors){assertDoor(dr,b.id,l+1,w,d);if(ids.has(dr.id))fail('DUP_DOOR');ids.add(dr.id);
    within+=floor[dr.localLower.z*w+dr.localLower.x]===1?1:0;
   }
   counts.levels++;counts.doors+=doors.length;counts.doorPositionsOnFloor+=within;counts.doorPositionsOffFloor+=doors.length-within;
   // This anchor proves only floor topological connectivity, not corridor or door passage.
   const start=doors.length?[{x:doors[0].localLower.x,z:doors[0].localLower.z}]:[];
   let graph=start.length&&floor[start[0].z*w+start[0].x]?routeGraph(floor,w,d,start):null;
   const reachable=graph?doors.filter(dr=>graph.dist[dr.localLower.z*w+dr.localLower.x]>=0).length:0;
   counts.nominalFloodReachable+=reachable;counts.nominalFloodUnreachable+=doors.length-reachable;
   allDoorReports.push({id:b.id,level:l+1,doors:doors.length,positionsOnCanonicalFloor:within,
    sourceDoorToDoorBareFloorConnections:reachable,realDoorOpeningsVerified:false,actualCorridorNetworkVerified:false});
   if(b.id!=='apartment/candidate-01'||l===0)continue;
   const t=b42.transitions[l-1];if(t.transition!==`L${l}_L${l+1}`||t.floorMask.width!==w||t.floorMask.depth!==d)fail('TRANSITION_MATCH');
   const historical=rowsMask(t.floorMask.candidateFloorRows,w,d,t.floorMask.candidateOccupiedCells);
   const a=t.corridor.upperLanding,connector=t.corridor.potentialUpperCorridorConnector;
   if(!connector||connector.adopted!==false||connector.roomReservationClearanceVerified!==false||
    !Array.isArray(connector.route)||connector.route.length<2||!coord(a.x,a.z,w,d))fail('CONNECTOR_STATUS');
   if(connector.route[0].x!==a.x||connector.route[0].z!==a.z)fail('CONNECTOR_START');
   const seenRoute=new Set();for(let j=0;j<connector.route.length;j++){
    let p=connector.route[j];if(!coord(p.x,p.z,w,d))fail('CONNECTOR_COORDS');
    const key=`${p.x},${p.z}`;if(seenRoute.has(key))fail('CONNECTOR_REPEAT');seenRoute.add(key);
    if(j&&Math.abs(p.x-connector.route[j-1].x)+Math.abs(p.z-connector.route[j-1].z)!==1)fail('CONNECTOR_DISJOINT');
   }
   const canonGraph=routeGraph(floor,w,d,connector.route);
   const proxyGraph=routeGraph(historical,w,d,connector.route);
   const optimisticRoutes=[];
   let optimistic=0,proxyReach=0,missingRouteCells=new Set();
   const sourceIds=new Set(t.corridor.upperLandingUnreachedDoorIDs);
   if(sourceIds.size!==12||t.corridor.upperLandingReachableDoors!==1||
      t.corridor.upperLandingUnreachedDoorIDs.length!==12||t.corridor.totalDoors!==doors.length||
    [...sourceIds].some(id=>!ids.has(id)))fail('HISTORIC_REACHABILITY');
   for(const dr of doors){let {x,z}=dr.localLower;const i=z*w+x;
    const path=trace(canonGraph,x,z,w),proxyPath=trace(proxyGraph,x,z,w);
    if(path){optimistic++;for(let pt of path)if(!historical[pt.z*w+pt.x])missingRouteCells.add(`${pt.x},${pt.z}`);}
    if(proxyPath)proxyReach++;
    optimisticRoutes.push({doorId:dr.id,canonicalBareFloorDistance:canonGraph.dist[i]>=0?canonGraph.dist[i]:null,
      b42ProxyBareFloorDistance:proxyGraph.dist[i]>=0?proxyGraph.dist[i]:null,
      nominalRouteToConnectorOnCanonical:path,
      routeCrossesHistoricMissingFloorCells:path?path.some(p=>!historical[p.z*w+p.x]):null,
      adopted:false,physicalCorridorAndDoorStatesVerified:false});
   }
   const missed=[];
   for(let k=0;k<w*d;k++)if(floor[k]&&!historical[k])missed.push({x:k%w,z:Math.floor(k/w)});
   const knownDiff=b58.legacyStairAudit.transitions[l-1];
   if(JSON.stringify(missed)!==JSON.stringify(knownDiff.cellsPresentInB57MissingFromB42)||knownDiff.cellsPresentInB42MissingFromB57.length)fail('SNAPSHOT_DIFF');
   counts.apartmentUpperLevels++;counts.upperConceptDoors+=doors.length;
   counts.upperNominalBareFloorReachable+=optimistic;counts.upperNominalProxyReachable+=proxyReach;
   counts.historicReportedReachable+=t.corridor.upperLandingReachableDoors;
   counts.historicUnverified+=t.corridor.upperLandingUnreachedDoorIDs.length;
   counts.legacySnapshotDifferences+=missed.length;
   counts.canonicalRouteCellsMissingInB42+=missingRouteCells.size;
   apartmentLevels.push({transition:t.transition,upperLevel:l+1,sourceConceptDoors:doors.length,
    sourceReportedDoorsReachableFromLanding:t.corridor.upperLandingReachableDoors,
    geometryOnlyDoorsReachableFromConnectorOnCanonical:optimistic,
    geometryOnlyDoorsReachableFromConnectorOnB42Proxy:proxyReach,
    historicMissingFloorCells:missed,selectedSourceConnector:connector.route,
    optimisticDoorRoutes:optimisticRoutes,
    flags:{geometryProofOnly:true,roomWallObstructionUnverified:true,doorOpeningsUnverified:true,
      structuralAndStairGeometryUnverified:true,notApproved:true}});
  }
 }
 if(counts.levels!==30||counts.doors!==314||apartmentLevels.length!==5||counts.historicReportedReachable!==5||counts.historicUnverified!==60)fail('CONSTANT_MISMATCH');
 const body={schema:'minecraftaibuilder-b59-optimistic-circulation-gap-review-v1',
  kind:'OFFLINE_2D_CONCEPT_DOOR_TO_HISTORICAL_STAIR_CONNECTOR_REVIEW_ONLY',
  provenance:{b58ReportSha256:b58.reportSha256,b57ReportSha256:b57.reportSha256,b42ReportSha256:b42.reportSha256,b31ReportSha256:b31.reportSha256},
  nominalDoorAudit:allDoorReports,apartmentUpperLandingGap:apartmentLevels,totals:counts,
  interpretation:{historicDoorReachability:'B42_CONCEPTUAL_CORRIDOR_1_OF_13_EACH_UPPER_LEVEL',
    optimisticReachability:'BARE_FLOOR_PATH_LOWER_BOUND_IGNORES_ROOM_WALLS_AND_ACTUAL_DOORS',
    comparisonMeaning:'NOT_EQUIVALENT_MODELS_DO_NOT_CLAIM_DOOR_ACCESS_REPAIRED',
    sourceSnapshotDiscrepancy:'TWO_CELLS_PER_UPPER_TRANSITION_NEVER_AUTOMERGED'},
  readiness:'NOT_PREPARED',deployment:'BLOCKED',executionAllowed:false,constructionApproved:false,
  productionFacadeParity:'UNVERIFIED',physicalQuality:'UNKNOWN',engineCalls:0,worldContacts:0,scans:0,minecraftCommands:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]},
  blockers:{M4Gates:b58.blockers.M4Gates.map(x=>({...x}))},
  notVerified:['REAL_CORRIDOR_REACHABILITY','ROOM_WALLS','DOOR_BLOCK_STATES','STAIRCASE_HEADROOM','CONSTRUCTION','FACADE_IMPLEMENTATION']};
 return {...body,reportSha256:sha(body)};
}
export function verifyB59(r,b58,b57,b42,b31){
 ensureHash(r);
 if(r.schema!=='minecraftaibuilder-b59-optimistic-circulation-gap-review-v1'||r.readiness!=='NOT_PREPARED'||r.deployment!=='BLOCKED'||
 r.executionAllowed!==false||r.constructionApproved!==false||r.productionFacadeParity!=='UNVERIFIED'||
 r.engineCalls!==0||r.worldContacts!==0||r.scans!==0||r.minecraftCommands!==0||
 r.BuildPlan?.operations?.length!==0||r.BuildPlan?.commandCount!==0||r.blockers?.M4Gates?.length!==9||
 r.blockers.M4Gates.some(g=>g.status!=='BLOCKED'))fail('RESULT_SAFETY');
 if(JSON.stringify(r)!==JSON.stringify(compileB59(b58,b57,b42,b31)))fail('REPLAY');
 return true;
}
