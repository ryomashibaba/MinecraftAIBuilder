/** B44 Main: in-memory non-executing portfolio integration across SubA, SubB and SubC.
 * Does NOT produce BuildPlan commands or connect to any game/runtime.
 * Inputs must be fully verified before projection to SubC's strict IR contract.
 */
import {createHash} from 'node:crypto';
import {verifyB44ASubA} from '../sub-a/circulation-b44a.mjs';
import {validateStructureB44} from '../sub-b/structure-b44.mjs';
import {reviewCandidateIR} from '../sub-c/preflight.mjs';

const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail = reason => {throw Error('B44_MAIN_'+reason)};
const inactivePlan = () => ({status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
const EXPECTED_B44C_GATES = Array.from({length:9},(_,i)=>`M4-0${i+1}`);
const isSafetyOff = report => report?.constructionApproved===false && report?.executionAllowed===false && report?.readiness==='NOT_PREPARED' && report?.deployment==='BLOCKED';

function bridgeEnvelope(role, source, overview){
 const envelope = {schema:`minecraftaibuilder-b44-main-${role}-safe-review-v1`,status:'REVIEW_ONLY',
  role,sourceSchema:source.schema,sourceReportSha256:source.reportSha256,
  provenance:'SUBMITTED_VERIFIED_IR_REVIEW_ONLY',reviewMetrics:overview,
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  safety:{constructionApproved:false,executionAllowed:false,engineCalls:0,buildOperations:0,
   runtimeIdentity:'NOT_PROVEN',worldCoordinates:null,materialIds:[]},BuildPlan:inactivePlan()};
 const accepted=reviewCandidateIR(envelope,role);
 if(accepted.acceptedForOfflineReview!==true || accepted.readiness!=='NOT_PREPARED' || accepted.deployment!=='BLOCKED') fail('C_REJECTED_BRIDGE');
 return {envelope,review:accepted};
}

export function compileB44Main({a,aInputs,b,c}){
 if(!a || !aInputs || !b || !c)fail('MISSING_SOURCE');
 if(verifyB44ASubA(a,aInputs)!==true)fail('A_NOT_VERIFIED');
 if(validateStructureB44(b)!==true)fail('B_NOT_VERIFIED');
 if(a.safety.m4GateStatuses.length!==9 || a.safety.m4GateStatuses.some(x=>x!=='BLOCKED') ||
    a.safety.executionAllowed!==false || a.safety.constructionApproved!==false || a.safety.engineCalls!==0 || a.safety.buildOperations!==0) fail('A_SAFETY');
 if(!isSafetyOff(b) || b.safety.engineCalled!==false || b.totals.engineCalls!==0 || b.totals.buildOperations!==0)fail('B_SAFETY');
 if(!isSafetyOff(c) || c.engineCalls!==0 || c.buildOperations!==0 || c.blockedGateCount!==9 ||
    !Array.isArray(c.gates) || c.gates.length!==9 || c.gates.some((g,i)=>g.id!==EXPECTED_B44C_GATES[i]||g.status!=='BLOCKED'||g.physicalVerified!==false))fail('C_GATES');
 if(c.BuildPlan?.operations?.length!==0 || c.constructionApproved!==false || c.executionAllowed!==false)fail('C_EXECUTABLE');
 if(b.totals.buildings!==5 || b.totals.floors!==30 || b.totals.nominalDoorPorts!==314 ||
    b.totals.nominalStairLinks!==25 || b.totals.b17VsB29DoorHintDivergences!==118)fail('PORTFOLIO_SOURCE');
 if(a.building!=='apartment/candidate-01'||a.variants.length!==2 ||
    a.variants.some(v=>v.metrics.nominalDoorReachability!=='78/78' || v.actualPassableDoorCount!==undefined && v.actualPassableDoorCount!==null || v.constructionApproved!==false))fail('CIRCULATION_SOURCE');
 const variants = a.variants.map(v=>({variantId:v.id, routeSteps:v.metrics.totalRouteSteps,
  newCorridorCandidateCells:v.metrics.totalNewCorridorCells, wallCollisionCandidateCells:v.metrics.totalWallConflictCells,
  conditionalGraphDoorReachability:v.metrics.nominalDoorReachability, physicalWalkability:'UNKNOWN',designAdopted:false}));
 const portfolio=b.buildings.map(building=>({buildingId:building.id,levelCount:building.floors.length,
  sourceFloorCells:building.floors.reduce((n,f)=>n+f.footprint.originalCells,0),
  hypotheticalCutoutCells:building.floors.reduce((n,f)=>n+f.footprint.cutoutCandidates.length,0),
  nominalDoorPorts:building.floors.reduce((n,f)=>n+f.openings.nominalRoomDoorPorts,0),
  nominalStairInterfaces:building.stairLinks.length,
  physicalStructureVerified:false,facadeMaterial:'UNKNOWN',roofMaterial:'UNKNOWN',
  circulationCoverage:building.id===a.building?'HYPOTHETICAL_SIX_LEVEL_REVIEW':'NOT_YET_EVALUATED_BY_SUB_A'}));
 const aggregate={buildings:portfolio.length,floors:portfolio.reduce((n,x)=>n+x.levelCount,0),
  sourceFloorCells:portfolio.reduce((n,x)=>n+x.sourceFloorCells,0),
  hypotheticalCutoutCells:portfolio.reduce((n,x)=>n+x.hypotheticalCutoutCells,0),
  nominalDoorPorts:portfolio.reduce((n,x)=>n+x.nominalDoorPorts,0),
  nominalStairInterfaces:portfolio.reduce((n,x)=>n+x.nominalStairInterfaces,0),
  knownCrossGenerationDoorHintsRequiringReview:118};
 if(aggregate.sourceFloorCells!==12778 || aggregate.hypotheticalCutoutCells!==50 ||
   aggregate.nominalDoorPorts!==314 || aggregate.nominalStairInterfaces!==25 ||
   aggregate.buildings!==5 || aggregate.floors!==30)fail('AGGREGATE_MISMATCH');
 const A=bridgeEnvelope('sub-a',a,{nominalBuilding:a.building,reviewedFloors:6,
  variants:variants.map(v=>({id:v.variantId,conditionalGraphReachability:v.conditionalGraphDoorReachability,
    candidateWallConflicts:v.wallCollisionCandidateCells})),physicalWalkability:'UNKNOWN'});
 const B=bridgeEnvelope('sub-b',b,{buildings:aggregate.buildings,floors:aggregate.floors,
  originalFootprintCells:aggregate.sourceFloorCells,proposedCutoutCells:aggregate.hypotheticalCutoutCells,
  legacyDoorTopologyDivergences:aggregate.knownCrossGenerationDoorHintsRequiringReview,physicalStructure:'UNKNOWN'});
 const data={schema:'minecraftaibuilder-b44-main-parallel-review-v1',kind:'MERGED_NONEXECUTING_OFFLINE_PORTFOLIO',
  provenance:{subA:{schema:a.schema,digest:a.reportSha256},subB:{schema:b.schema,digest:b.reportSha256},
   subC:{schema:c.schema,digest:c.reportSha256}},
  portfolio,aggregate,apartmentCirculation:{building:a.building,variants,
   originalB43ConditionalGraphAccess:'77/78',nowUnderHypotheticalReplan:'78/78',
   physicalPassableDoors:null,levelOneFootprintProven:false,unapprovedWallChanges:true},
  crossChecks:{aPassedOriginReview:true,bPassedOriginReview:true,cGatesBlocked:9,
   normalizedInputA:A.review,normalizedInputB:B.review,rawIRRequiresReviewEnvelope:true,
   mainHasRunRealMinecraftTests:false},
  outstanding:[
   'Cross-version door candidate divergence: 118 of 314; no door block authoring',
   'SubA 78/78 applies only if unapproved virtual wall and corridor revisions succeed',
   'SubA L1 used an L2-derived candidate floor mask proxy: foundation and support remain unknown',
   'SubB 5 buildings / 30 floors describe symbolic geometry, not generated Minecraft blocks',
   'Ordinary doors, stair/slab exact states, collision/headroom/support and runtime identity unknown',
   'Facade colors, materials, roof styles and outer windows not implemented or certified',
   'C reviewer required explicit projection for A and B raw IR; no raw direct review success claimed',
   'All nine M4 construction readiness gates remain BLOCKED'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  engineCalls:0,buildOperations:0,BuildPlan:inactivePlan()};
 return {...data,reportSha256:hash(data)};
}

export function verifyB44Main(result,inputs){
 if(result?.schema!=='minecraftaibuilder-b44-main-parallel-review-v1'||!isSafetyOff(result)||
  result.engineCalls!==0||result.buildOperations!==0||result.BuildPlan?.operations?.length!==0||
  !Array.isArray(result.portfolio)||result.portfolio.length!==5||result.crossChecks?.cGatesBlocked!==9)fail('OUTPUT_NOT_SAFE');
 const {reportSha256,...body}=result;
 if(hash(body)!==reportSha256)fail('OUTPUT_TAMPER');
 if(JSON.stringify(compileB44Main(inputs))!==JSON.stringify(result))fail('SOURCE_REPLAY_MISMATCH');
 return true;
}
