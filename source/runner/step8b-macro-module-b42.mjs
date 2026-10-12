/**
 * B42: inert macro stair module assembled from immutable B41 design inputs.
 * No Engine/Bridge import, block IDs, Minecraft state values, BuildPlan operations, or world coordinates.
 * The planner boundary is intentionally non-executable and fail closed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildB41,validateB41} from './step8b-stair-shape-integration-b41.mjs';
import {decomposeFloorMaskB33} from './step8b-emitter-fixture-b33.mjs';

const sha = b=>createHash('sha256').update(b).digest('hex');
const h=x=>sha(JSON.stringify(x));
const err=s=>{throw Object.assign(Error(`B42_${s}`),{code:`B42_${s}`});};
const pins=Object.freeze({
 'B41_FILE_SHA256.json':'e60d53ddf636e9ac88b182e78c524ab54420c6e54c1f9f3b8b7f06eaabf5b3fd',
 'reports/B41_STAIR_REDESIGN_AUDIT.json':'d5b57c9cd19cc5f294c6129815de3da54435e61d332b9abe0dc7715da8189e46',
 'reports/B17_INTERIOR_INTEGRATION_IR.json':'e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d',
 'reports/B21_BLOCKSCALE_REVIEW.json':'2d7b1e3d71f252331dfe35e600411acc3354c43702e5b3db9fd9a5e0533932bc',
 'reports/B31_FLOOR_DOOR_OVERLAY.json':'6d233d5ad09b8138650f65d46e0cf2d2ab143577d3862696b562a3857545c430',
 'dev/general-building-planner.B32_GUARDED_DEV_COPY.txt':'cec1710da165369d1a34230a620df02a950b74904eb7e07254ae2a75513a35f8',
});
const key=p=>`${p.x},${p.z}`;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
const integer=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
function checked(root,rel){
 if(typeof root!=='string'||!root||!Object.hasOwn(pins,rel))err('PATH');
 const full=path.join(root,rel);let st;try{st=fs.lstatSync(full);}catch{err('MISSING_SOURCE');}
 if(!st.isFile()||st.isSymbolicLink()||sha(fs.readFileSync(full))!==pins[rel])err('PIN_TAMPERED');
 return fs.readFileSync(full,'utf8');
}
function walk(reservation,start){
 if(!integer(start)||!Array.isArray(reservation)||reservation.some(p=>!integer(p)))err('CORRIDOR');
 const present=new Set(reservation.map(key));if(!present.has(key(start)))return new Set();
 const seen=new Set([key(start)]),queue=[start];
 for(let i=0;i<queue.length;i++)for(const [dx,dz] of directions){
  const p={x:queue[i].x+dx,z:queue[i].z+dz},k=key(p);
  if(present.has(k)&&!seen.has(k)){seen.add(k);queue.push(p);}
 }
 return seen;
}
function doorReach(floor,seen){return floor.roomDoorInterfaces.filter(d=>seen.has(key(d.hallCell))).length;}
function unitDiff(before,after){
 if(before.length!==after.length||before.some((row,z)=>row.length!==after[z].length))err('FLOOR_SIZE');
 const changes=[];
 for(let z=0;z<before.length;z++)for(let x=0;x<before[z].length;x++)if(before[z][x]!==after[z][x])changes.push({x,z,was:before[z][x],now:after[z][x]});
 return changes;
}
function occupancy(rows){return rows.map(r=>[...r].map(c=>c==='#'));}
function sourceMask(floor){
 if(floor.localFrame!=='LOCAL_XZ_INTEGER_FOOTPRINT_NOT_WORLD'||floor.physicalFloorCut!==false||
  floor.floorPlateEmitterInputModified!==false||floor.width!==28||floor.depth!==22||
  !Array.isArray(floor.overlayRows)||floor.overlayRows.length!==floor.depth||
  floor.overlayRows.some(r=>typeof r!=='string'||r.length!==floor.width||!/^[.#o]+$/.test(r)))err('FLOOR_SOURCE');
 return floor.overlayRows;
}
/** Pure candidate boundary: never call or modify the engine. */
export function compileMacroFloorB42(originalRows,restore,open){
 if(!Array.isArray(originalRows)||!originalRows.length||originalRows.some(r=>typeof r!=='string'||r.length!==originalRows[0].length||!/^[.#o]+$/.test(r)))err('INVALID_MASK');
 if(!Array.isArray(restore)||!Array.isArray(open)||restore.length!==1||open.length!==1)err('PATCH_SHAPE');
 const restored=restore[0],cut=open[0],w=originalRows[0].length,hgt=originalRows.length;
 if(!integer(restored)||!integer(cut)||[restored,cut].some(p=>p.x<0||p.z<0||p.x>=w||p.z>=hgt)||key(restored)===key(cut)||
 originalRows[restored.z][restored.x]!=='o'||originalRows[cut.z][cut.x]!=='#')err('PATCH_PRECONDITION');
 const previous=originalRows.map(r=>r.replace(/o/g,'.'));
 const after=[...previous];
 const change=(p,c)=>{after[p.z]=after[p.z].slice(0,p.x)+c+after[p.z].slice(p.x+1);};
 change(restored,'#');change(cut,'.');
 const originalOccupied=occupancy(originalRows).map((row,z)=>row.reduce((n,x)=>n+(x?1:0),0)).reduce((a,b)=>a+b,0);
 const before=originalRows.map(r=>r.replace(/o/g,'.').replace(/#/g,'#'));
 const beforeMask=occupancy(before),afterMask=occupancy(after);
 const oldD=decomposeFloorMaskB33(beforeMask),newD=decomposeFloorMaskB33(afterMask);
 if(!oldD.coverageExact||!newD.coverageExact||oldD.cells!==newD.cells||oldD.cells!==originalOccupied||
 unitDiff(before,after).length!==2)err('FLOOR_CONSERVATION');
 return {sourceFloorDigest:sha(originalRows.join('|')),beforeFloorDigest:sha(before.join('|')),
  candidateFloorDigest:sha(after.join('|')),width:w,depth:hgt,
  sourceOccupiedCells:oldD.cells,candidateOccupiedCells:newD.cells,
  beforeRectangles:oldD.rectangleCount,candidateRectangles:newD.rectangleCount,
  candidateFloorRows:after,exactRectangleCoverage:true,
  changedCells:unitDiff(before,after),
  immutableFoundationEnvelope:true,immutableRoofEnvelope:true,immutableExteriorEnvelope:true,
  structuralSupportVerified:false};
}
/** Find the shortest *geometric* connector across an existing floor grid.
 * This is NOT a valid corridor: traversed room/wall reservations are merely flagged.
 */
export function inspectUpperConnectorB42(floor,wall,originalRows,start,goal){
 if(!integer(start)||!integer(goal)||!Array.isArray(originalRows))err('CONNECTOR_INPUT');
 const corridor=new Set(floor.corridorReservation.map(key));
 const exclusion=new Set([...floor.stairReservation,...floor.elevatorReservation].map(key));
 const y0=floor.localYRange[0];
 const walls=new Set(wall.wallCandidates.flatMap(w=>w.localGridVolumes)
   .filter(p=>p.y>=y0&&p.y<=y0+2).map(key));
 const width=originalRows[0].length,depth=originalRows.length;
 const allowed=p=>integer(p)&&p.x>=0&&p.z>=0&&p.x<width&&p.z<depth&&
   originalRows[p.z][p.x]==='#'&&!exclusion.has(key(p));
 if(!allowed(start)||!allowed(goal))err('CONNECTOR_TERMINAL');
 const q=[start],pred=new Map([[key(start),null]]),byKey=new Map([[key(start),start]]);
 for(let i=0;i<q.length&&!pred.has(key(goal));i++){
  for(const [dx,dz] of directions){
   const n={x:q[i].x+dx,z:q[i].z+dz},k=key(n);
   if(!pred.has(k)&&allowed(n)){pred.set(k,key(q[i]));byKey.set(k,n);q.push(n);}
  }
 }
 if(!pred.has(key(goal)))return {exists:false,adopted:false};
 const backwards=[];let k=key(goal);while(k!==null){backwards.push(byKey.get(k));k=pred.get(k);}
 const route=backwards.reverse(),newCells=route.filter(p=>!corridor.has(key(p))),
  wallOverlaps=route.filter(p=>walls.has(key(p)));
 return {exists:true,route,newCorridorCandidateCells:newCells,conceptualWallOverlayCells:wallOverlaps,
  reviewedRouteLength:route.length-1,roomReservationClearanceVerified:false,
  physicalWallPassageVerified:false,realCorridorWidthVerified:false,adopted:false,
  status:'SHORT_GEOMETRIC_CONNECTOR_WITH_UNVERIFIED_ROOM_WALL_CONFLICTS'};
}

/** Assemble 5 full local staircase transitions, with no actions or state bindings. */
export function buildB42(root){
 const b41=JSON.parse(checked(root,'reports/B41_STAIR_REDESIGN_AUDIT.json'));
 validateB41(b41,root);
 const regenerated=buildB41(root);
 if(JSON.stringify(regenerated)!==JSON.stringify(b41)||b41.expandedStraightRun.length!==5)err('B41_REPORT');
 const manifest=JSON.parse(checked(root,'B41_FILE_SHA256.json'));
 if(manifest.schema!=='minecraftaibuilder-step8b-b41-manifest-v1'||manifest.fileCount!==667)err('MANIFEST');
 const dev=checked(root,'dev/general-building-planner.B32_GUARDED_DEV_COPY.txt');
 if(!dev.includes('B32_NOT_EXECUTABLE_DEV_COPY_NO_CONSTRUCTION_AUTHORIZATION')||
 !dev.includes('B32_SELECTOR_UNBOUND')||!dev.includes('plate(b32FloorMaskSelector(mask, f), base, "floor", "floor");'))err('DEV_GUARD');
 const ir=JSON.parse(checked(root,'reports/B17_INTERIOR_INTEGRATION_IR.json'));
 const blocks=JSON.parse(checked(root,'reports/B21_BLOCKSCALE_REVIEW.json'));
 const floors=JSON.parse(checked(root,'reports/B31_FLOOR_DOOR_OVERLAY.json'));
 const get=o=>o.buildings?.find(b=>b.id==='apartment/candidate-01');
 const room=get(ir),wall=get(blocks),floor=get(floors);
 if([room,wall,floor].some(b=>!b||b.floors?.length!==6))err('BASE_BUILDING');
 const transitions=[];
 for(let i=0;i<5;i++){
  const alt=b41.expandedStraightRun[i];const lower=room.floors[i],upper=room.floors[i+1];
  const upperPlate=floor.floors[i+1],rows=sourceMask(upperPlate),lowerWalls=wall.floors[i];
  const upperWalls=wall.floors[i+1];
  if(alt.fromLevel!==i+1||alt.toLevel!==i+2||lower.level!==i+1||upper.level!==i+2||
     alt.straightTreads?.length!==4||upper.localYRange[0]-lower.localYRange[0]!==4)err('LEVELS');
  const patch=compileMacroFloorB42(rows,alt.proposedUpperFloorChanges.restore,alt.proposedUpperFloorChanges.open);
  if(patch.sourceOccupiedCells!==398||patch.candidateOccupiedCells!==398||
     patch.beforeRectangles!==6||patch.candidateRectangles!==7)err('MASK_DRIFT');
  const tread=alt.straightTreads;
  if(tread.some((p,j)=>p.x!==11+j||p.z!==18||p.y!==lower.localYRange[0]+j))err('RISERS');
  const corridor=lower.corridorReservation;
  if(!corridor.some(p=>key(p)==='11,18')||!corridor.some(p=>key(p)==='10,18')||
     !upper.corridorReservation.some(p=>key(p)==='15,18'))err('TERMINALS');
  const before=walk(corridor,{x:10,z:18});
  const after=walk(corridor.filter(p=>key(p)!=='11,18'),{x:10,z:18});
  const upperLanding=walk(upper.corridorReservation,{x:15,z:18});
  const baseline=doorReach(lower,before),revised=doorReach(lower,after),upperReach=doorReach(upper,upperLanding);
  if(baseline!==alt.baselineDoorReachableCount||revised!==alt.alternateDoorReachableCount||
     baseline!==12||revised!==12||lower.roomDoorInterfaces.length!==13||upperReach>upper.roomDoorInterfaces.length)err('DOOR_REACHABILITY');
  const wallKeys=new Set([lowerWalls,upperWalls].flatMap(x=>x.wallCandidates.flatMap(w=>w.localGridVolumes))
    .map(p=>`${p.x},${p.y},${p.z}`));
  const symbolicHead=tread.flatMap(p=>[p,{...p,y:p.y+1},{...p,y:p.y+2}]);
  const conceptualWallClashes=symbolicHead.filter(p=>wallKeys.has(`${p.x},${p.y},${p.z}`));
  if(conceptualWallClashes.length!==0||alt.nominalConceptWallClashes!==0||
     alt.nominalFloorHeadspaceClashes!==0||alt.upperDoorEvReservationClashes!==0)err('CONCEPTUAL_CLASH');
  const lowerDoor=lower.roomDoorInterfaces;
  const unreached=lowerDoor.filter(d=>!after.has(key(d.hallCell))).map(d=>d.id);
  const upperUnreached=upper.roomDoorInterfaces.filter(d=>!upperLanding.has(key(d.hallCell))).map(d=>d.id);
  const potentialConnector=inspectUpperConnectorB42(upper,upperWalls,rows,{x:15,z:18},{x:10,z:18});
  transitions.push({transition:`L${i+1}_L${i+2}`,localYFrom:lower.localYRange[0],localYTo:upper.localYRange[0],
   spatialFrame:'LOCAL_XZ_Y_NOT_WORLD',
   corridor:{reclassifyAsStair:[{x:11,z:18}],lead:{x:10,z:18},upperLanding:{x:15,z:18},
    baselineReachableCells:before.size,reviewReachableCells:after.size,baselineReachableDoors:baseline,
    reviewReachableDoors:revised,totalDoors:13,unreachedDoorIDs:unreached,
    upperLandingReachableDoors:upperReach,upperLandingUnreachedDoorIDs:upperUnreached,
    potentialUpperCorridorConnector:potentialConnector},
   floorMask:patch,
   stair:{riserLocalCells:tread,nominalRiserCount:4,symbolicSupportCells:tread.map(p=>({x:p.x,y:p.y-1,z:p.z})),
    supportExistenceVerified:false,headroomPhysicalVerified:false,
    actualStairBlockState:null,actualFacingState:null,actualHalfState:null,collisionVerified:false},
   wall:{symbolicRiserAndHeadspaceClashes:0,installedJunctionVerified:false},
   dependencyGates:['FLOOR_CUTOUT_NOT_IN_ENGINE','CORRIDOR_RETAG_NOT_IN_ENGINE','REAL_STAIR_STATE_UNKNOWN',
    'TREAD_SUPPORT_UNPROVEN','PHYSICAL_HEADROOM_UNPROVEN','DOOR_PATH_NOT_FULLY_CONNECTED','UPPER_LANDING_DISCONNECTED_FROM_MAIN_HALL'],
   effect:'DESIGN_REVIEW_ONLY_NOT_APPLIED',verifiedLive:false});
 }
 if(transitions.length!==5||transitions.some(t=>t.corridor.reviewReachableDoors!==12||
 t.corridor.upperLandingReachableDoors!==1||!t.corridor.potentialUpperCorridorConnector.exists))err('TOTALS');
 const report={schema:'minecraftaibuilder-step8b-b42-stair-macro-module-v1',
  purpose:'ONE_PASS_INERT_COMPOSITE_FLOOR_CORRIDOR_STAIR_CONTRACT',
  provenance:{frozenB41ManifestSha256:pins['B41_FILE_SHA256.json'],
   b41ReportSha256:pins['reports/B41_STAIR_REDESIGN_AUDIT.json'],
   inheritedInputsPinned:true,plannerDevCopyGuarded:true,engineInvoked:false,bridgeContact:false,worldAccess:false},
  building:'apartment/candidate-01',
  interface:{name:'stairMacroCandidate',mode:'NO_EXECUTION',coordinateFrame:'LOCAL_ONLY',
   consumes:['B17_DESIGN_IR','B21_SYMBOLIC_WALL_GRID','B31_FLOOR_OVERLAY','B41_STRAIGHT_REDESIGN'],
   produces:['REVIEW_FLOOR_MASK','REVIEW_CORRIDOR_RETAG','REVIEW_STAIR_VOLUME','MISSING_CAPABILITY_GATES'],
   outputCompatibleWithRuntimePlanner:false,requiresExplicitFutureImplementation:true},
  transitions,unresolved:['Real Education v26.3 stair block direction/half states and player collision shape',
   'Stair support beneath every symbolic tread, floor beam/support and landing edge load path',
   'Corridor narrowing/reclassification and its interaction with wall/door adjacency',
   'Upper landing only reaches 1/13 doors; connector candidate crosses unverified walls/rooms',
   'One pre-existing conceptually disconnected door per lower floor and upper-floor access',
   'Engine floor seam remains throwing-only, and no wall/door/stair emitter has been integrated',
   'Materials, world anchors, runtime identity, and safe construction authorization'],
  totals:{buildings:1,transitions:5,symbolicRisers:20,reviewFloorRestorations:5,reviewFloorOpenings:5,
   corridorCellsRetagged:5,baselineDoorReachable:60,reviewDoorReachable:60,upperLandingDoorReachable:5,
   potentialUpperConnectorNewCorridorCells:transitions.reduce((n,t)=>n+t.corridor.potentialUpperCorridorConnector.newCorridorCandidateCells.length,0),
   potentialUpperConnectorWallOverlayCells:transitions.reduce((n,t)=>n+t.corridor.potentialUpperCorridorConnector.conceptualWallOverlayCells.length,0),
   floorCellsBefore:1990,floorCellsAfter:1990,physicalSupportVerified:0,physicalPassageVerified:0,
   certifiedStairStateBindings:0,engineCalls:0,buildOperations:0},
  blockers:Array.from({length:9},(_,i)=>({id:`M4-${String(i+1).padStart(2,'0')}`,status:'BLOCKED'})),
  readiness:'NOT_PREPARED',deployment:'BLOCKED',approvedVariant:null,
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,worldAccess:false,
   bridgeContact:false,legacyModified:false,frozenEvidenceModified:false,projectFilesModified:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],materialIds:[],worldCoordinates:null}};
 return {...report,reportSha256:h(report)};
}
export function validateB42(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b42-stair-macro-module-v1'||
 report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||report.approvedVariant!==null||
 report.safety?.notPrepared!==true||report.safety?.constructionApproved!==false||
 report.safety?.executionAllowed!==false||report.safety?.worldAccess!==false||
 report.safety?.bridgeContact!==false||report.BuildPlan?.status!=='NOT_PREPARED'||
 !Array.isArray(report.BuildPlan?.operations)||report.BuildPlan.operations.length!==0||
 !Array.isArray(report.BuildPlan?.materialIds)||report.BuildPlan.materialIds.length!==0||
 report.BuildPlan.worldCoordinates!==null||report.blockers?.length!==9||
 report.blockers.some(b=>b.status!=='BLOCKED')||report.totals?.buildOperations!==0||
 report.totals?.engineCalls!==0||report.transitions?.length!==5||
 report.transitions.some(t=>t.effect!=='DESIGN_REVIEW_ONLY_NOT_APPLIED'||
  t.verifiedLive!==false||t.stair?.actualStairBlockState!==null||t.stair?.collisionVerified!==false)||
 report.interface?.outputCompatibleWithRuntimePlanner!==false)err('SAFETY');
 const {reportSha256,...data}=report;
 if(h(data)!==reportSha256||JSON.stringify(buildB42(root))!==JSON.stringify(report))err('TAMPERED');
 return true;
}
