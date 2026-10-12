/** B76: production-backed footprint closure + real catalog-shaped (non-emitting) interior staging.
 * NO world coordinates, placement commands, execution approval or changes to frozen sources.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {preflightProductionPlan} from '../../b72/main/compile-b72.mjs';
import {createOfflinePlanner} from '../../b74/main/b74-vm-runner.mjs';
import {massingFromPinnedRules,compareMasks,auditInterior,validateOfficialEvidence,masksForMasses} from '../../b75/main/compile-b75.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(here,'../../b74/main/runtime_evidence');
const evidence=path.resolve(here,'../../b75/main/evidence');
const priorReport=path.resolve(here,'../../b75/main/B75_RECONCILIATION_REPORT.json');
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const reject=x=>{throw new Error('B76_'+x)};
const idAt=p=>`${p.x},${p.z}`;
const directions={'0,-1':'north','1,0':'east','0,1':'south','-1,0':'west'};
const BLOCKS={door:'minecraft:spruce_door',stair:'minecraft:stone_brick_stairs'};
export const VALID_CANDIDATE_STATE_KEYS=Object.freeze({
 'minecraft:spruce_door':['door_hinge_bit','minecraft:cardinal_direction','open_bit','upper_block_bit'],
 'minecraft:stone_brick_stairs':['minecraft:corner','upside_down_bit','weirdo_direction']
});
export function verifyCatalogShapes(blockList){
 const text=String(blockList);
 for(const [id,keys] of Object.entries(VALID_CANDIDATE_STATE_KEYS)){
  const match=text.match(new RegExp('^\\| '+id.replace(':','\\:')+' \\|([^|]*)\\|','m'));
  if(!match||JSON.stringify(match[1].split(',').map(x=>x.trim()).filter(Boolean))!==JSON.stringify(keys))reject('BLOCK_CATALOG_CHANGED_'+id);
 }
 return true;
}
function safety(r){
 if(r?.readiness!=='NOT_PREPARED'||r.executionAllowed!==false||r.constructionApproved!==false||r.gates?.length!==9||r.gates.some(x=>x.status!=='BLOCKED')||r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan.operations?.length!==0||r.BuildPlan.commandCount!==0||r.worldContacts!==0&&r.worldContacts!==undefined)reject('SAFETY_SOURCE');
}
export function stageDoor(port,mask,conceptReservations,level){
 if(!port||!Number.isSafeInteger(level)||level<1||level>6)reject('PORT_SHAPE');
 const {roomCell:a,hallCell:b,normal:n}=port;
 if(!a||!b||![a.x,a.z,b.x,b.z,n?.dx,n?.dz].every(Number.isSafeInteger)||Math.abs(a.x-b.x)+Math.abs(a.z-b.z)!==1||b.x-a.x!==n.dx||b.z-a.z!==n.dz)reject('PORT_NORMAL');
 const face=directions[`${n.dx},${n.dz}`];if(!face)reject('PORT_FACE');
 const inside=p=>p.z>=0&&p.z<mask.length&&p.x>=0&&p.x<mask[0].length&&mask[p.z][p.x]===1;
 const hallSet=new Set(conceptReservations.corridors.map(idAt));
 const support=inside(a)&&inside(b)&&hallSet.has(idAt(b));
 const base=(level-1)*5;
 return {portId:port.id,sectionId:port.id.slice(0,port.id.lastIndexOf('/')),wallBoundaryId:port.wallBoundaryId,
  localRoomCell:a,localHallCell:b,nominalNormal:face,footprintAndCorridorSupport:support,
  blockStateTemplate:{id:BLOCKS.door,lower:{'minecraft:cardinal_direction':face,open_bit:false,upper_block_bit:false},upper:{'minecraft:cardinal_direction':face,open_bit:false,upper_block_bit:true}},
  baseY:base+1,hinge:'UNDECIDED',doorBlockPosition:'UNDECIDED_WALL_PLANE_ON_HALF_CELL_BOUNDARY',
  actualFacadeObstruction:'NOT_CHECKED',clearance:'NOT_CHECKED',verifiedForPlacement:false,emitAllowed:false};
}
export function stageStair(link,lower,upper,loMask,hiMask){
 if(!link||!lower||!upper||link.lowerSection!==lower.id||link.upperSection!==upper.id||upper.level!==lower.level+1||link.emitAllowed!==false)reject('VERTICAL_LINK');
 const valid=(p,mask)=>Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z)&&p.z>=0&&p.z<mask.length&&p.x>=0&&p.x<mask[0].length&&mask[p.z][p.x]===1;
 const aa=lower.conceptReservations.stairs,bb=upper.conceptReservations.stairs;
 const lo=new Set(aa.map(idAt)),hi=new Set(bb.map(idAt));
 const overlap=[...lo].filter(k=>hi.has(k)).length;
 return {id:link.id,lowerSection:lower.id,upperSection:upper.id,
  footprintSupported:aa.every(p=>valid(p,loMask))&&bb.every(p=>valid(p,hiMask)),
  verticalXZOverlapCells:overlap,nominalLowerStairReservationCells:lo.size,nominalUpperStairReservationCells:hi.size,
  candidateMaterialId:BLOCKS.stair,candidateStateKeys:VALID_CANDIDATE_STATE_KEYS[BLOCKS.stair],
  stairDirection:'UNDECIDED',runAndRise:'UNDECIDED',support:'NOT_CHECKED',headroom:'NOT_CHECKED',
  upperFloorOpening:'NOT_CUT',realPassage:'NOT_CHECKED',verifiedForPlacement:false,emitAllowed:false};
}
export function reconcileB76({b75,b72,b65,b66,b70,official}){
 safety(b75);safety(b72);safety(b65);safety(b66);safety(b70);
 if(hash(Object.fromEntries(Object.entries(b75).filter(([k])=>k!=='reportSha256')))!==b75.reportSha256||b75.schema!=='minecraftaibuilder-b75-production-footprint-reconciliation-v1')reject('B75_REPORT_INTEGRITY');
 if(!official||official.catalogVerified!==true||official.hotelPlannerActuallyCalled!==true||official.hotelFootprintComparison?.delta!==0||official.hotelMassing!=='slab')reject('HOTEL_PRODUCTION_EVIDENCE');
 const list=[],doors=[],stairs=[];
 const lookup=new Map(b66.sections.map(s=>[s.id,s]));
 const s65=new Map(b65.sections.map(s=>[s.id,s]));
 let outsideCorridors=0,exteriorTouches=0;
 for(const job of b72.jobs){
  const old=b75.results.find(x=>x.id===job.id);if(!old||old.candidate.verifiedByActualPlanner!==true)reject('BASELINE_PRODUCTION_MISSING');
  const isHotel=job.id==='hotel/candidate-01';
  const massing=isHotel?'slab':old.candidate.massing,seed=isHotel?0:old.candidate.seed;
  const {width,depth}=job.createBuildingPlanInputCandidate;
  const masses=massingFromPinnedRules(massing,width,depth,seed);
  const ss=b66.sections.filter(s=>s.id.startsWith(job.id+'/'));
  const ss65=b65.sections.filter(s=>s.id.startsWith(job.id+'/'));
  const cmp=compareMasks(ss,masses),interior=auditInterior(ss65,ss,masses);
  if(cmp.delta||interior.totals.roomCellsOutside||interior.totals.doorPortsUnsupported||interior.totals.stairCellsOutside||interior.totals.elevatorCellsOutside)reject('MISMATCH_OR_INTERIOR_SUPPORT_'+job.id);
  if(!isHotel&&(massing!==old.candidate.massing||seed!==old.candidate.seed||JSON.stringify(cmp)!==JSON.stringify(old.candidate.comparison)))reject('FROZEN_PRIOR_CANDIDATE_DRIFT');
  const masks=masksForMasses(masses,width,depth);
  for(let f=0;f<6;f++){
   const section=ss[f],intent=s65.get(section.id);if(!intent||section.level!==f+1||intent.openingPorts.length!==section.virtualDoorVoids.length)reject('SECTION_LINKAGE');
   const perFloorDoors=[];
   for(const p of intent.openingPorts){
    const stage=stageDoor(p,masks[f],section.conceptReservations,section.level);
    if(!stage.footprintAndCorridorSupport)reject('DOOR_UNSUPPORTED_'+p.id);
    perFloorDoors.push(stage);doors.push(stage);
   }
  }
  outsideCorridors+=interior.totals.corridorCellsOutside;
  exteriorTouches+=interior.totals.nominalWallEdgesTouchingProductionExterior;
  list.push({id:job.id,program:job.id.split('/')[0],massing,seed,source:isHotel?'B76_REPLAYED_ACTUAL_OFFLINE_PLANNER':'B75_PINNED_PRODUCTION_VERIFIED_CANDIDATE',
   programPresetListed:!isHotel,requiresExplicitCrossProgramDesignReview:isHotel,
   floorMask:cmp,interior:interior.totals,physicalBuildingApproved:false});
 }
 const maskOfSection=new Map();for(const item of list){const j=b72.jobs.find(j=>j.id===item.id),masks=masksForMasses(massingFromPinnedRules(item.massing,j.createBuildingPlanInputCandidate.width,j.createBuildingPlanInputCandidate.depth,item.seed),j.createBuildingPlanInputCandidate.width,j.createBuildingPlanInputCandidate.depth);
  for(let i=0;i<6;i++)maskOfSection.set(`${item.id}/L${i+1}`,masks[i]);}
 for(const link of b65.nominalVerticalLinks){const lo=lookup.get(link.lowerSection),hi=lookup.get(link.upperSection);if(!lo||!hi)reject('UNRESOLVED_STAIR_LINK');stairs.push(stageStair(link,lo,hi,maskOfSection.get(lo.id),maskOfSection.get(hi.id)));}
 if(list.length!==5||doors.length!==314||stairs.length!==25||outsideCorridors!==18)reject('SUMMARY_SCOPE');
 const counts={buildings:5,sections:30,productionBackedExactFloorMasks:list.filter(x=>!x.floorMask.delta).length,
  totalMismatchedFloorCells:0,nominalDoorPorts:doors.length,doorPortsWithFootprintAndHallwaySupport:doors.filter(x=>x.footprintAndCorridorSupport).length,
  candidateDoorStateTemplates:doors.length,realDoorBlocks:0,stairLinks:stairs.length,stairLinksWithNominalFootprintSupport:stairs.filter(x=>x.footprintSupported).length,
  realStairBlocks:0,sourceOutOfMaskCorridorReservationsHeld:outsideCorridors,
  nominalWallBoundariesPotentiallyTouchingFacade:exteriorTouches,
  physicalFacadeCollisionsVerified:0,physicalDoorClearancesVerified:0,physicalStairPassagesVerified:0,
  worldCommands:0};
 return {buildings:list,doors,stairLinks:stairs,counts};
}
export async function runB76({production=true}={}){
 if(!production)reject('NO_UNVERIFIED_RELEASE');
 const blocks=fs.readFileSync(path.join(evidence,'Blocks.md'));
 const b74=JSON.parse(fs.readFileSync(path.join(evidence,'B74_OFFLINE_PLANNER_REPORT.json'),'utf8'));
 validateOfficialEvidence(b74,blocks);verifyCatalogShapes(blocks);
 const b75=JSON.parse(fs.readFileSync(priorReport,'utf8'));
 const {report:b72,b65,b66,b70}=buildB72();
 const hotel=b72.jobs.find(j=>j.id==='hotel/candidate-01');if(!hotel)reject('HOTEL_JOB_MISSING');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b76-pinned-planner-'));
 let snapshot;
 try{
  fs.cpSync(source,scratch,{recursive:true});fs.writeFileSync(path.join(scratch,'catalog/sources/Blocks.md'),blocks);
  const manifest=JSON.parse(fs.readFileSync(path.join(scratch,'B72_DEPENDENCY_MANIFEST.json')));
  const planner=await createOfflinePlanner(scratch,manifest);
  snapshot=planner.makePlan({...hotel.createBuildingPlanInputCandidate,massing:'slab',seed:0});
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const checked=preflightProductionPlan(snapshot,hotel,b66);
 if(checked.missingNominalCells||checked.extraProductionCells||checked.matchedCells!==3120||snapshot.composition.program!=='hotel'||snapshot.composition.massing!=='slab')reject('ACTUAL_HOTEL_PLANNER_PARITY');
 const official={catalogVerified:true,hotelPlannerActuallyCalled:true,hotelFootprintComparison:{delta:checked.missingNominalCells+checked.extraProductionCells,matched:checked.matchedCells},hotelMassing:'slab',productionPlannerOperationsInspectedNotExported:snapshot.counts.operations};
 const {buildings,doors,stairLinks,counts}=reconcileB76({b75,b72,b65,b66,b70,official});
 const body={schema:'minecraftaibuilder-b76-production-footprint-and-interior-staging-v1',
  kind:'READ_ONLY_DESIGN_REVIEW_NON_EXECUTABLE',
  provenance:{b75ReportSha256:b75.reportSha256,b72ReportSha256:b72.reportSha256,b65ReportSha256:b65.reportSha256,b66ReportSha256:b66.reportSha256,b70ReportSha256:b70.reportSha256,b74OfficialEvidenceSha256:b74.reportSha256,officialBlocksSha256:hash(blocks)},
  officialOfflineReplay:official,counts,buildings,doors,stairLinks,
  importantConstraints:['HOTEL_SLAB_SUPPORTED_BY_GLOBAL_REGISTRY_BUT_NOT_IN_HOTEL_PROGRAM_PRESET_REQUIRES_DESIGN_APPROVAL',
  'SOURCE_OFF_MASK_CORRIDORS_18_HELD','NOMINAL_2X_SUBCELL_WALL_PLANE_IS_NOT_A_MINECRAFT_BLOCK_GRID',
  'DOOR_HINGE_SIDE_AND_REAL_OPEN_CLEARANCE_UNKNOWN','STAIR_RUN_RISE_SUPPORT_HEADROOM_AND_UPPER_SLAB_OPENING_UNKNOWN',
  'FACADE_CANDIDATE_OVERLAPS_UNVERIFIED','B42_UPPER_DOORS_60_HELD','WORLD_ANCHOR_AND_ORIENTATION_UNCALIBRATED'],
  approval:'PROPOSED_ONLY',readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:b75.gates.map(g=>({...g,status:'BLOCKED'})),worldContacts:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=await runB76();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B76_STAGING_REPORT.json'),JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify({counts:out.counts,hotel:out.buildings.find(x=>x.id.startsWith('hotel')),status:out.readiness}));
}
