/** B79: read-only official production Planner replay and prospective one-cell door slot arbitration.
 * This is NOT a placement adapter. Does not export operations or world coordinate mappings.
 * Detects the B77 numeric floor-mask-vs-string comparison fault without editing its frozen source.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex,inspectSite} from '../../b77/main/compile-b77.mjs';
import {chooseCoreAndPaths} from '../../b78/main/compile-b78.mjs';
import {validateOfficialEvidence} from '../../b75/main/compile-b75.mjs';
import {verifyCatalogShapes} from '../../b76/main/compile-b76.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const get=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
export const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const error=x=>{throw new Error('B79_'+x)};
export const key=p=>`${p.x},${p.z}`;
const equals=(a,b)=>key(a)===key(b);
export function maskHasFloor(rows,p){return Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p?.z)&&p.z>=0&&p.z<rows.length&&p.x>=0&&p.x<rows[0]?.length&& (rows[p.z][p.x]===1||rows[p.z][p.x]==='1');}
export function safe(report,schema){if(report?.schema!==schema||report.readiness!=='NOT_PREPARED'||report.constructionApproved!==false||report.executionAllowed!==false||report.worldContacts!==0||report.gates?.length!==9||report.gates.some(x=>x.status!=='BLOCKED')||report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||report.BuildPlan?.worldCoordinates!==null)error('UNSAFE_INPUT');const {reportSha256,...body}=report;if(hash(body)!==reportSha256)error('ALTERED_INPUT');}
const schema={b65:'minecraftaibuilder-b65-interior-assembly-intents-v1',b66:'minecraftaibuilder-b66-local-3d-nominal-assembly-v1',b77:'minecraftaibuilder-b77-production-local-voxel-collision-review-v1',b78:'minecraftaibuilder-b78-global-grid-arbitration-v1',b76:'minecraftaibuilder-b76-production-footprint-and-interior-staging-v1'};
const contains=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const step={north:{x:0,z:-1},south:{x:0,z:1},east:{x:1,z:0},west:{x:-1,z:0}};
const dirs=(a,b)=>({x:a.x+b.x,z:a.z+b.z});
/** Diagnostic-only: validate candidate door slot across both room and corridor, without assigning Bedrock states. */
export function inspectProposedPort({edge,port,room,shape,stage,idx,source,baselineDoors}){
 const local=edge.insideCell,hall=edge.adjacentCell;
 if(edge.roomId!==room.id||edge.neighborClass!=='CONCEPT_CORRIDOR'||!contains(room,local)||!['X','Z'].includes(edge.axis))error('BAD_CANDIDATE_EDGE');
 if(hall.x-local.x!==port.normal.dx||hall.z-local.z!==port.normal.dz)error('NORMAL_MISMATCH');
 const corridor=new Set(shape.conceptReservations.corridors.map(key));
 const vertical=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const doorSites=new Set(baselineDoors.filter(x=>x.id!==port.id).map(x=>key(x.roomCell)));
 const originalEdge=source.nominalWalls.find(w=>w.id===port.wallBoundaryId);
 if(!originalEdge||originalEdge.roomId!==room.id)error('INVALID_ORIGINAL_PORT');
 const stageCells=new Map(stage.stagedCells.map(c=>[c.site,c]));
 const neighborOwners=new Set(source.nominalWalls.filter(w=>key(w.insideCell)===key(local)).map(w=>w.roomId));
 const local2=inspectSite(idx,local,shape.level,2),hall2=inspectSite(idx,hall,shape.level,2);
 const roomFloor=maskHasFloor(shape.floorMaskRows,local),hallFloor=maskHasFloor(shape.floorMaskRows,hall);
 const corridorReserved=corridor.has(key(hall)),verticalOverlap=vertical.has(key(local))||vertical.has(key(hall));
 const crossOwned=neighborOwners.size!==1||!neighborOwners.has(room.id)|| (stageCells.has(key(local))&&stageCells.get(key(local)).owner!==room.id);
 const coincidentDoor=doorSites.has(key(local));
 const blockers=[];
 if(!roomFloor||!hallFloor)blockers.push('OUTSIDE_NOMINAL_FLOOR');
 if(!corridorReserved)blockers.push('NO_NAMED_CORRIDOR');
 if(verticalOverlap)blockers.push('VERTICAL_RESERVATION');
 if(crossOwned)blockers.push('SHARED_WALL_SITE');
 if(coincidentDoor)blockers.push('OTHER_ORIGINAL_DOOR');
 if(local2.contacts)blockers.push('ROOM_SIDE_PRODUCTION_BLOCK');
 if(hall2.contacts)blockers.push('HALL_SIDE_PRODUCTION_BLOCK');
 // A one-block wall needs adjacent room-side cells for its framing; neither is ever auto-placed.
 const normal=port.normal;const sides=[{x:normal.dz,z:-normal.dx},{x:-normal.dz,z:normal.dx}];
 const flank=sides.map((v,i)=>{const p=dirs(local,v);const wall=source.nominalWalls.find(w=>w.roomId===room.id&&!w.openingPortId&&equals(w.insideCell,p)&&w.adjacentCell.x-w.insideCell.x===normal.dx&&w.adjacentCell.z-w.insideCell.z===normal.dz);
  return {side:i===0?'left':'right',roomCell:p,alignedNominalPartition:!!wall,productionTwoHighClear:maskHasFloor(shape.floorMaskRows,p)&&inspectSite(idx,p,shape.level,2).contacts===0,otherOriginalDoor:doorSites.has(key(p)),sourceWallId:wall?.id??null};});
 const jamb=flank.filter(f=>f.alignedNominalPartition&&f.productionTwoHighClear&&!f.otherOriginalDoor);
 if(!jamb.length)blockers.push('NO_UNOBSTRUCTED_JAMB_CANDIDATE');
 // Conservative connectivity: don't overwrite any B78 existing proposed partitions except the candidate's same-owner site.
 const blocked=new Set();for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++){
  const p={x,z},k=key(p);if(!maskHasFloor(shape.floorMaskRows,p)||vertical.has(k)||corridor.has(k)||inspectSite(idx,p,shape.level,2).contacts|| (stageCells.has(k)&&k!==key(local)))blocked.add(k);
 }
 const core=blocked.has(key(local))||local2.contacts?null:chooseCoreAndPaths(room,[local],blocked);
 if(!core)blockers.push('NO_FREE_2X2_AND_CONNECTED_APPROACH');
 const alternative=key(local)!==key(originalEdge.insideCell);
 return {sourceWallId:edge.id,roomCell:local,hallCell:hall,normal:port.normal,
  originalPortMoved:alternative,originalOpeningRequiresSeparateReview:alternative,
  roomSideFinalSolidContacts2High:local2.contacts,hallSideFinalSolidContacts2High:hall2.contacts,
  floorAndCorridorSupported:roomFloor&&hallFloor&&corridorReserved,
  nominalOneCellWallFraming:flank,unobstructedJambCandidateCount:jamb.length,
  preservedNominalCore:core?.core??[],preservedNominalRoute:core?.paths?.[0]??[],
  disqualifications:blockers,
  geometryStatus:blockers.length?'HOLD_GEOMETRY_OR_PRODUCTION':'REVIEWABLE_GEOMETRY_NOT_VERIFIED_BEDROCK_DOOR',
  hinge:'UNDECIDED',bedrockFacing:'UNVERIFIED',physicalWallThickness:'1_BLOCK_PROPOSAL_ONLY',
  worldCoordinates:null,material:null,emitAllowed:false};
}
export function chooseDoorVariants(section,source,shape,idx){
 if(section.id!==source.id||section.id!==shape.id)error('SECTION_MISMATCH');
 const byRoom=new Map(shape.conceptRooms.map(r=>[r.id,r]));
 const baseline=source.openingPorts;
 const rooms=[],doors=[];
 for(const port of baseline){const room=byRoom.get(port.roomId);if(!room)error('MISSING_ROOM');
  const original=source.nominalWalls.find(w=>w.id===port.wallBoundaryId);
  if(!original||!original.openingPortId||original.openingPortId!==port.id)error('PORT_LINK');
  const alternatives=source.nominalWalls.filter(w=>w.roomId===room.id&&w.neighborClass==='CONCEPT_CORRIDOR'&&!w.openingPortId&&w.adjacentCell.x-w.insideCell.x===port.normal.dx&&w.adjacentCell.z-w.insideCell.z===port.normal.dz);
  const list=[original,...alternatives].map(w=>inspectProposedPort({edge:w,port,room,shape,stage:section,idx,source,baselineDoors:baseline}));
  const approved=list.filter(v=>v.disqualifications.length===0).sort((a,b)=> Number(a.originalPortMoved)-Number(b.originalPortMoved) || Math.abs(a.roomCell.x-port.roomCell.x)+Math.abs(a.roomCell.z-port.roomCell.z)-Math.abs(b.roomCell.x-port.roomCell.x)-Math.abs(b.roomCell.z-port.roomCell.z) || b.unobstructedJambCandidateCount-a.unobstructedJambCandidateCount||a.sourceWallId.localeCompare(b.sourceWallId));
  const chosen=approved[0]??null;
  const previous=section.rooms.find(r=>r.roomId===room.id);
  if(!previous)error('B78_ROOM_MISSING');
  rooms.push({roomId:room.id,wasHeldByB78:!previous.nominalRouteAndCorePossible,
   reviewableLocalGeometry:!!chosen,nominalDoorMoveProposed:chosen?.originalPortMoved??false,
   geometricOptionCount:approved.length,allCandidateCount:list.length,
   status:chosen?'REVIEW_REQUIRED_NOT_READY':'HOLD_NO_SAFE_DOOR_AND_PATH_GEOMETRY'});
  doors.push({portId:port.id,roomId:room.id,sectionId:section.id,
   baselineLocation:{roomCell:port.roomCell,hallCell:port.hallCell},
   selectedForReview:chosen,originalSiteAudit:list[0],candidatesRejected:list.filter(x=>x.disqualifications.length).map(v=>({sourceWallId:v.sourceWallId,disqualifications:v.disqualifications})),
   actualDoorBlocksEmitted:0,emitAllowed:false});
 }
 return {id:section.id,rooms,doors};
}
export async function compileB79(){
 const a={b65:get('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json'),b66:get('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json'),b77:get('parallel/b77/main/B77_VOXEL_CONFLICT_REPORT.json'),b78:get('parallel/b78/main/B78_GLOBAL_GRID_REPORT.json'),b76:get('parallel/b76/main/B76_STAGING_REPORT.json')};
 for(const [k,v]of Object.entries(a))safe(v,schema[k]);
 if(a.b78.provenance.b65ReportSha256!==a.b65.reportSha256||a.b78.provenance.b66ReportSha256!==a.b66.reportSha256||a.b78.provenance.b77ReportSha256!==a.b77.reportSha256||a.b78.totals.roomsHeld!==68)error('PROVENANCE');
 const {report:b72}=buildB72();
 const officialDir=path.join(root,'parallel/b75/main/evidence');const official=fs.readFileSync(path.join(officialDir,'Blocks.md'));
 verifyCatalogShapes(official);validateOfficialEvidence(JSON.parse(fs.readFileSync(path.join(officialDir,'B74_OFFLINE_PLANNER_REPORT.json'))),official);
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b79-pinned-offline-'));
 const sections=[],runs=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});fs.copyFileSync(path.join(officialDir,'Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,get('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs){const reference=a.b76.buildings.find(b=>b.id===job.id);const frozen=a.b77.buildings.find(b=>b.id===job.id);
   if(!reference||!frozen||reference.floorMask.delta!==0)error('REFERENCE');
   const input=job.createBuildingPlanInputCandidate;const plan=planner.makePlan({...input,massing:reference.massing,seed:reference.seed});
   if(hash(plan.operations)!==frozen.productionOperationsSha256)error('PRODUCTION_REPLAY_CHANGED');
   const idx=finalProductionIndex(plan.operations,input.width,input.depth);runs.push({building:job.id,productionOperationsSha256:frozen.productionOperationsSha256,operationsReplayed:plan.operations.length});
   for(const s of a.b78.sections.filter(s=>s.id.startsWith(job.id+'/'))){const source=a.b65.sections.find(x=>x.id===s.id),shape=a.b66.sections.find(x=>x.id===s.id);if(!source||!shape)error('MISSING_SOURCE_SECTION');
    sections.push(chooseDoorVariants(s,source,shape,idx));
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const totals={buildings:runs.length,sections:sections.length,rooms:sections.reduce((n,s)=>n+s.rooms.length,0),doors:sections.reduce((n,s)=>n+s.doors.length,0),
  heldByB78:sections.reduce((n,s)=>n+s.rooms.filter(r=>r.wasHeldByB78).length,0),
  heldWithNewReviewableGeometry:sections.reduce((n,s)=>n+s.rooms.filter(r=>r.wasHeldByB78&&r.reviewableLocalGeometry).length,0),
  heldStillBlocked:sections.reduce((n,s)=>n+s.rooms.filter(r=>r.wasHeldByB78&&!r.reviewableLocalGeometry).length,0),
  reviewableLocalGeometryTotal:sections.reduce((n,s)=>n+s.rooms.filter(r=>r.reviewableLocalGeometry).length,0),
  proposedDoorMoves:sections.reduce((n,s)=>n+s.rooms.filter(r=>r.nominalDoorMoveProposed).length,0),
  corridorMaskMismatchDetected:true,physicalWallsEmitted:0,physicalDoorsEmitted:0,physicalStairsEmitted:0,worldCommands:0};
 if(totals.buildings!==5||totals.sections!==30||totals.rooms!==314||totals.doors!==314||totals.heldByB78!==68||totals.heldStillBlocked+totals.heldWithNewReviewableGeometry!==68)error('TOTALS');
 const body={schema:'minecraftaibuilder-b79-readonly-door-jamb-and-corridor-resolution-v1',kind:'NON_EXECUTABLE_DOOR_SLOT_GEOMETRY_REVIEW',
  provenance:{b65:a.b65.reportSha256,b66:a.b66.reportSha256,b76:a.b76.reportSha256,b77:a.b77.reportSha256,b78:a.b78.reportSha256,officialBlocksSha256:hash(official)},
  replay:runs,totals,sections,knownDefects:[
   {source:'B77 classifyWall',issue:'Uint8Array floor cells are numeric 1 while code tests strict equality to string 1; all adjacent insideProductionFloor indicators are invalid',fix:'B79 independently tests actual frozen string masks and resamples production final blocks in read-only VM',frozenSourceModified:false},
   {source:'B70',issue:'18 outside-mask nominal corridor reservations remain unaltered',frozenSourceModified:false}],
  limitations:['THIS_IS_A_LOCAL_READONLY_PREVIEW_NOT_A_PHYSICAL_DOOR_ASSEMBLY','B78_EXISTING_WALL_CANDIDATES_ARE_NOT_ACTUALLY_REPLACED_OR_REMOVED','MOVING_DOOR_REQUIRES_CLOSING_OLD_OPENING_AND_FRAME_REDESIGN','NO_BEDROCK_HINGE_OR_SWING_VERIFIED','REAL_CORRIDOR_WIDTH_FULL_WALKABILITY_SUPPORT_AND_HEADROOM_UNVERIFIED','WORLD_ORIGIN_NOT_CALIBRATED','HOTEL_SLAB_EXTERIOR_UNAPPROVED','25_STAIR_LINKS_AND_240_SLAB_SITES_NOT_CUT'],
  approval:'PROPOSED_ONLY',readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,worldContacts:0,
  gates:a.b78.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=await compileB79();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B79_DOOR_SLOT_REVIEW.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.totals,null,2));
}
