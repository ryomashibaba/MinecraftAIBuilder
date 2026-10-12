/** B77: non-executable production-voxel arbitration for frozen nominal interiors.
 * Local coordinates only. Never export a build plan, emit operation, world coordinates,
 * or connect to Minecraft. A candidate is NOT a physically certified placement.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {createOfflinePlanner} from './b77-vm-inspector.mjs';
import {verifyCatalogShapes} from '../../b76/main/compile-b76.mjs';
import {validateOfficialEvidence} from '../../b75/main/compile-b75.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(here,'../../b74/main/runtime_evidence');
const officialDir=path.resolve(here,'../../b75/main/evidence');
const priorFile=path.resolve(here,'../../b76/main/B76_STAGING_REPORT.json');
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const fail=s=>{throw Error('B77_'+s)};
const pt=p=>`${p.x},${p.z}`;
const loc=(x,y,z)=>`${x},${y},${z}`;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function safety(report,version){
 if(report?.schema!==version||report.readiness!=='NOT_PREPARED'||report.constructionApproved!==false||report.executionAllowed!==false||report.worldContacts!==0||report.gates?.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||report.BuildPlan.worldCoordinates!==null)fail('FROZEN_SAFETY');
 const {reportSha256,...body}=report;
 if(hash(body)!==reportSha256)fail('FROZEN_DIGEST');
 return true;
}
export function validateOps(ops,width,depth){
 if(!Array.isArray(ops)||ops.length<30||ops.length>10000)fail('PRODUCTION_OPERATIONS');
 for(const o of ops){
  if(o?.type!=='fill'||typeof o.role!=='string'||typeof o.phase!=='string'||typeof o.block!=='string'||![o.from?.x,o.from?.y,o.from?.z,o.to?.x,o.to?.y,o.to?.z].every(Number.isSafeInteger))fail('BAD_OPERATION');
  if(o.from.x>o.to.x||o.from.y>o.to.y||o.from.z>o.to.z||o.from.x<0||o.from.z<0||o.to.x>=width||o.to.z>=depth||o.from.y< -1||o.to.y>60)fail('OUTSIDE_LOCAL_ENVELOPE');
 }
}
/** Evaluates FINAL production material after sequential fills. Air clears prior solids.
 * Only sample one building's 30 local occupied interior layers and future slab cut sites.
 */
export function finalProductionIndex(ops,width,depth){
 validateOps(ops,width,depth);
 const final=new Map(),slabBase=new Map();
 for(const [idx,o] of ops.entries()){
  const lo=Math.max(0,o.from.y),hi=Math.min(30,o.to.y);
  if(lo>hi)continue;
  for(let y=lo;y<=hi;y++)for(let z=o.from.z;z<=o.to.z;z++)for(let x=o.from.x;x<=o.to.x;x++){
   const k=loc(x,y,z);
   final.set(k,{phase:o.phase,role:o.role,block:o.block,operationIndex:idx,occupied:o.role!=='air'&&o.block!=='air'});
   if(o.phase==='floor'&&o.role==='floor')slabBase.set(k,true);
  }
 }
 return {final,slabBase};
}
function get(idx,p,y){return idx.final.get(loc(p.x,y,p.z))??{phase:'none',role:'none',block:'air',occupied:false};}
export function inspectSite(idx,p,level,height=4){
 if(!p||![p.x,p.z,level].every(Number.isSafeInteger)||level<1||level>6||height<1||height>4)fail('BAD_SITE');
 const base=(level-1)*5, contacts=[];
 for(let y=base+1;y<=base+height;y++){
  const state=get(idx,p,y);
  if(state.occupied)contacts.push({y,phase:state.phase,role:state.role,operationIndex:state.operationIndex});
 }
 return {contacts:contacts.length,contactPhases:[...new Set(contacts.map(x=>x.phase))].sort(),sampleY:[base+1,base+height],finalSolidContacts:contacts};
}
export function classifyWall(w,section,mask,idx){
 if(w.emitAllowed!==false||!['X','Z'].includes(w.axis)||Math.abs(w.insideCell.x-w.adjacentCell.x)+Math.abs(w.insideCell.z-w.adjacentCell.z)!==1)fail('WALL_SHAPE');
 const valid=p=>p.x>=0&&p.z>=0&&p.z<mask.length&&p.x<mask[0].length&&mask[p.z][p.x]==='1';
 const ins=inspectSite(idx,w.insideCell,section.level);
 const adj=valid(w.adjacentCell)?inspectSite(idx,w.adjacentCell,section.level):null;
 const outside=!valid(w.adjacentCell);
 // Preserving protected corridors, stairs and the actual entrance path comes before geometry.
 const protectedNeighbor=['CONCEPT_CORRIDOR','NOMINAL_STAIR_RESERVATION','NOMINAL_ELEVATOR_RESERVATION'].includes(w.neighborClass);
 return {wallId:w.id,sectionId:section.id,neighborClass:w.neighborClass,isDoor:w.openingPortId!==null,
  localInsideCell:w.insideCell,localAdjacentCell:w.adjacentCell,
  inside:{productionFinalSolidContacts:ins.contacts,contactPhases:ins.contactPhases,productionClear:ins.contacts===0,roomWidthReductionUnresolved:true},
  adjacent:{insideProductionFloor:!outside,protectedReservation:protectedNeighbor,productionFinalSolidContacts:adj?.contacts??null,contactPhases:adj?.contactPhases??[],productionClear:!!adj&&adj.contacts===0},
  candidateSelection:'UNDECIDED',wallThickness:'NOT_RESOLVED',emitAllowed:false};
}
export function classifyDoor(d,w,mask,idx,nonDoorInsideSites){
 if(d.emitAllowed!==false||d.wallBoundaryId!==w.wallId||!d.footprintAndCorridorSupport||!same(d.localRoomCell,w.localInsideCell)||!same(d.localHallCell,w.localAdjacentCell))fail('DOOR_LINK');
 const ins=inspectSite(idx,d.localRoomCell,Number(d.sectionId.match(/\/L([1-6])$/)?.[1]),2);
 const hall=inspectSite(idx,d.localHallCell,Number(d.sectionId.match(/\/L([1-6])$/)?.[1]),2);
 const adjacentSolidNominalWall=nonDoorInsideSites.has(pt(d.localRoomCell));
 const hallIsReserved=true;
 return {portId:d.portId,wallBoundaryId:d.wallBoundaryId,sectionId:d.sectionId,
  localRoomSide:d.localRoomCell,localHallSide:d.localHallCell,nominalNormal:d.nominalNormal,
  roomSide:{productionFinalSolidContacts:ins.contacts,contactPhases:ins.contactPhases,otherNominalWallInSameCell:adjacentSolidNominalWall},
  hallSide:{productionFinalSolidContacts:hall.contacts,contactPhases:hall.contactPhases,protectedHallway:hallIsReserved},
  bestNonDestructiveCandidate:ins.contacts===0&&!adjacentSolidNominalWall?'ROOM_SIDE_REVIEW_ONLY':'NO_CONFLICT_FREE_ROOM_SIDE',
  hinge:'UNDECIDED',clearance:'NOT_VERIFIED',blockLocalPosition:'NOT_APPROVED',emitAllowed:false};
}
export function stairSlabAudit(s,lower,upper,idx){
 if(!s.footprintSupported||s.emitAllowed!==false||upper.level!==lower.level+1)fail('STAIR_LINK');
 const lo=new Set(lower.conceptReservations.stairs.map(pt));
 const hi=new Set(upper.conceptReservations.stairs.map(pt));
 const intersection=[...lo].filter(k=>hi.has(k));
 const targetY=(upper.level-1)*5;
 const slabCells=intersection.filter(key=>{
  const [x,z]=key.split(',').map(Number);return idx.slabBase.has(loc(x,targetY,z));
 });
 const classified=intersection.map(key=>{
  const [x,z]=key.split(',').map(Number);return get(idx,{x,z},targetY);
 });
 return {id:s.id,lowerSection:s.lowerSection,upperSection:s.upperSection,nominalIntersection:intersection.length,
  productionUpperFloorSlabCellsAtInterface:slabCells.length,
  finalOccupiedAtInterface:classified.filter(v=>v.occupied).length,
  potentialOpeningCellsNeeded:slabCells.length,actualOpeningsCut:0,
  riseBlocks:5,runPath:'UNSOLVED',headroom:'UNVERIFIED',structuralSupport:'UNVERIFIED',emitAllowed:false};
}
export function auditOne({job,b65,b66,building,b76doors,b76stairs,plan}){
 const {width,depth}=job.createBuildingPlanInputCandidate;
 if(plan.composition.orientation!=='north'||plan.composition.floorHeight!==5||plan.composition.floorCount!==6||plan.composition.massing!==building.massing||plan.composition.variationSeed!==building.seed)fail('COMPOSITION_CHANGED');
 const index=finalProductionIndex(plan.operations,width,depth);
 const rooms=b65.sections.filter(s=>s.id.startsWith(job.id+'/')).sort((a,b)=>a.level-b.level);
 const sectors=b66.sections.filter(s=>s.id.startsWith(job.id+'/')).sort((a,b)=>a.level-b.level);
 const outputWalls=[],outputDoors=[],outputStairs=[];
 for(let f=0;f<6;f++){
  const s=rooms[f],ref=sectors[f];if(!s||!ref||s.id!==ref.id||s.level!==f+1)fail('FROZEN_SECTIONS');
  const mask=ref.floorMaskRows.map(row=>Uint8Array.from([...row],Number));
  const walls=s.nominalWalls.map(w=>classifyWall(w,s,mask,index));outputWalls.push(...walls);
  const map=new Map(walls.map(w=>[w.wallId,w]));
  if(map.size!==walls.length)fail('DUP_WALLS');
  const nonDoorInside=new Set(walls.filter(w=>!w.isDoor).map(w=>pt(w.localInsideCell)));
  for(const port of s.openingPorts){const d=b76doors.find(x=>x.portId===port.id);if(!d)fail('DOOR_MISSING');outputDoors.push(classifyDoor(d,map.get(d.wallBoundaryId),mask,index,nonDoorInside));}
 }
 const sectorsById=new Map(sectors.map(s=>[s.id,s]));
 for(const stair of b76stairs){const low=sectorsById.get(stair.lowerSection),high=sectorsById.get(stair.upperSection);if(!low||!high)fail('STAIR_SECTIONS');outputStairs.push(stairSlabAudit(stair,low,high,index));}
 const count=(a,p)=>a.filter(p).length;
 return {id:job.id,massing:building.massing,seed:building.seed,officialPlannerCalls:1,
  productionOperationCount:plan.operations.length,productionOperationsSha256:hash(plan.operations),
  walls:outputWalls,doors:outputDoors,stairs:outputStairs,
  summary:{nominalWalls:outputWalls.length,facadeProximityWalls:count(outputWalls,w=>w.neighborClass==='OUTSIDE_REFERENCE_FLOOR'),
   roomSideWallSitesProductionClear:count(outputWalls,w=>w.inside.productionClear),
   roomSideWallSitesWithProductionSolids:count(outputWalls,w=>!w.inside.productionClear),
   eligibleUnassignedNeighborWallSites:count(outputWalls,w=>w.adjacent.insideProductionFloor&&!w.adjacent.protectedReservation&&w.adjacent.productionClear),
   doors:outputDoors.length,doorRoomSideClearOfProduction:count(outputDoors,d=>d.roomSide.productionFinalSolidContacts===0),
   doorsWithNoNominalWallInRoomSide:count(outputDoors,d=>!d.roomSide.otherNominalWallInSameCell),
   roomSideDoorsWithoutKnownLocalCollision:count(outputDoors,d=>d.bestNonDestructiveCandidate==='ROOM_SIDE_REVIEW_ONLY'),
   stairs:outputStairs.length,upperSlabCellsNeedingDesignCut:outputStairs.reduce((s,v)=>s+v.potentialOpeningCellsNeeded,0)}};
}
export async function runB77(){
 const b76=JSON.parse(fs.readFileSync(priorFile));safety(b76,'minecraftaibuilder-b76-production-footprint-and-interior-staging-v1');
 const {report:b72,b65,b66}=buildB72();
 const blocks=fs.readFileSync(path.join(officialDir,'Blocks.md'));verifyCatalogShapes(blocks);
 const evidence=JSON.parse(fs.readFileSync(path.join(officialDir,'B74_OFFLINE_PLANNER_REPORT.json')));validateOfficialEvidence(evidence,blocks);
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b77-pinned-production-'));
 const buildings=[];
 try{
  fs.cpSync(source,scratch,{recursive:true});fs.writeFileSync(path.join(scratch,'catalog/sources/Blocks.md'),blocks);
  const manifest=JSON.parse(fs.readFileSync(path.join(scratch,'B72_DEPENDENCY_MANIFEST.json')));
  const planner=await createOfflinePlanner(scratch,manifest);
  for(const job of b72.jobs){const reference=b76.buildings.find(x=>x.id===job.id);if(!reference||reference.floorMask.delta!==0)fail('B76_NOT_EXACT');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:reference.massing,seed:reference.seed});
   buildings.push(auditOne({job,b65,b66,building:reference,b76doors:b76.doors.filter(x=>x.sectionId.startsWith(job.id+'/')),b76stairs:b76.stairLinks.filter(x=>x.lowerSection.startsWith(job.id+'/')),plan}));
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const sums=buildings.map(x=>x.summary);
 const totals={buildings:buildings.length,productionPlannerReplays:buildings.reduce((v,x)=>v+x.officialPlannerCalls,0),sections:30,
  nominalWalls:sums.reduce((v,x)=>v+x.nominalWalls,0),facadeProximityWalls:sums.reduce((v,x)=>v+x.facadeProximityWalls,0),
  wallRoomSideProductionClear:sums.reduce((v,x)=>v+x.roomSideWallSitesProductionClear,0),wallRoomSideProductionSolid:sums.reduce((v,x)=>v+x.roomSideWallSitesWithProductionSolids,0),
  nominalDoors:sums.reduce((v,x)=>v+x.doors,0),doorRoomSideProductionClear:sums.reduce((v,x)=>v+x.doorRoomSideClearOfProduction,0),
  doorRoomSideWithoutNominalWall:sums.reduce((v,x)=>v+x.doorsWithNoNominalWallInRoomSide,0),
  doorRoomSideNeedsNoKnownLocalCollision:sums.reduce((v,x)=>v+x.roomSideDoorsWithoutKnownLocalCollision,0),
  stairLinks:sums.reduce((v,x)=>v+x.stairs,0),upperSlabCellsRequiringOpeningReview:sums.reduce((v,x)=>v+x.upperSlabCellsNeedingDesignCut,0),
  actualPhysicalDoorBlocks:0,actualPhysicalStairBlocks:0,actualWallBlocks:0,worldCommands:0};
 if(totals.buildings!==5||totals.sections!==30||totals.nominalWalls!==5704||totals.nominalDoors!==314||totals.stairLinks!==25||totals.facadeProximityWalls!==706)fail('SCOPE_DRIFT');
 const safeBuildings=buildings.map(b=>({...b,walls:b.walls.map(w=>({...w,inside:{productionFinalSolidContacts:w.inside.productionFinalSolidContacts,contactPhases:w.inside.contactPhases,productionClear:w.inside.productionClear,roomWidthReductionUnresolved:true}}))}));
 const body={schema:'minecraftaibuilder-b77-production-local-voxel-collision-review-v1',kind:'NON_EXECUTABLE_LOCAL_DESIGN_AUDIT',
  provenance:{b76Sha256:b76.reportSha256,b72Sha256:b72.reportSha256,officialEvidenceSha256:evidence.reportSha256,officialBlocksSha256:hash(blocks)},
  totals,buildings:safeBuildings,nonClaims:['PRODUCTION_OPERATIONS_INSPECTED_IN_READONLY_ISOLATED_VM_NOT_EXPORTED_AS_BUILDPLAN',
  'LOCAL_CANDIDATE_ROOM_CELL_OCCUPANCY_DOES_NOT_PROVE_ROOM_WIDTH_OR_EGRESS',
  'AIR_AND_WINDOW_REVEAL_RESOLVED_BY_LAST_WRITE_SEMANTICS_NOT_BY_FACADE_PROXIMITY',
  'LOCAL_DOOR_SITE_REQUIRES_GLOBAL_PARTITION_RESOLUTION_AND_HINGE_STATE',
  'UPPER_SLAB_OPENINGS_UNCUT_AND_STAIRS_HAVE_NO_RUN_RISE_OR_HEADROOM',
  'HOTEL_SLAB_PRESET_EXCEPTIONS_REMAIN_UNAPPROVED','B70_SOURCE_OUT_OF_MASK_CORRIDORS_18_HELD',
  'WORLD_ANCHOR_UNCALIBRATED_AND_NO_MINECRAFT_EMISSION'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,approval:'PROPOSED_ONLY',
  gates:b76.gates.map(g=>({...g,status:'BLOCKED'})),worldContacts:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=await runB77();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B77_VOXEL_CONFLICT_REPORT.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({totals:report.totals,perBuilding:report.buildings.map(x=>({id:x.id,...x.summary})),status:report.readiness},null,2));
}
