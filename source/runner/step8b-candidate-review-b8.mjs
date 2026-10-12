// Step 8B/B8: NON-EXECUTABLE STATIC DESIGN CANDIDATE EXPLORATION.
// Only import earlier source-pinned, pure-preview oracles. No real engine, Bridge, BuildPlan generation, world anchor or materials.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {requireSnapshotPin,evaluateEntrance} from './step8b-static-planner-b6.mjs';
import {predictLocalRectangles,orientedRectangles,footprintSummary} from './step8b-geometry-b3.mjs';

const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{const e=new Error(x);e.code=x;throw e;};
export const BASELINE_B7_SHA256='4be87b0acfc3641f26a9b71ff329c2386f9e2c8e3461f4d8d70633faf31dcbe8';
const programs={hotel:['stepped','U_shape','tower_on_podium','asymmetric_block'],apartment:['L_shape','slab','twin_bar','courtyard'],office:['slab','tower_on_podium','asymmetric_block','stepped']};
const styles=['modern','urban_japanese','traditional'];
const faces=['north','east','south','west'];
const seeds=[0,1,5];
const plan=()=>({status:'NOT_PREPARED',operations:[],commandCount:0});
const safety=()=>({constructionApproved:false,executionAllowed:false,approvedByUser:false,notPrepared:true,noWorldMutation:true,noBridge:true,noScan:true,autoApplied:false});
const round=x=>Math.round(x*1000)/1000;
function requireB7(report){
 if(!report||report.schema!=='minecraftaibuilder-step8b-b7-review-reconciliation-v1'||report.reportSha256!==BASELINE_B7_SHA256||
  sha(Object.fromEntries(Object.entries(report).filter(([k])=>k!=='reportSha256')))!==report.reportSha256||
  report.deploymentGate!=='BLOCKED'||report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||
  report.BuildPlan?.commandCount!==0||report.safety?.executionAllowed!==false||report.safety?.constructionApproved!==false||
  report.candidates?.length!==5||report.entranceMatrix?.rejected!==36||report.entranceMatrix?.autoAppliedCount!==0||
  report.visualReconciliation?.officeDriftCells!==123||report.visualReconciliation?.conceptOriginalsPreserved!==true||
  report.referenceLimits?.realPlannerInvoked!==false)fail('B8_FROZEN_B7_PIN_OR_SAFETY_FAILED');
}
function catalogCandidate(params,styleObject){
 const {program,width,depth,floors,massing,style,seed,orientation}=params;
 if(!Object.hasOwn(programs,program)||!programs[program].includes(massing)||!styles.includes(style)||!faces.includes(orientation)||!seeds.includes(seed)||
  !Number.isSafeInteger(width)||width<15||width>48||!Number.isSafeInteger(depth)||depth<12||depth>40||
  !Number.isSafeInteger(floors)||floors<2||floors>10)fail('B8_CANDIDATE_PARAMETERS_BLOCKED');
 const {rectangles}=predictLocalRectangles(params,styleObject);
 const exposed=evaluateEntrance(rectangles,width,depth,program);
 const footprint=footprintSummary(rectangles,width,depth,floors);
 const rotated=orientedRectangles(rectangles,orientation,width,depth);
 const ow=faces.indexOf(orientation)%2?depth:width,od=faces.indexOf(orientation)%2?width:depth;
 const rot=footprintSummary(rotated,ow,od,floors);
 if(rot.areaByFloor.some((v,i)=>v!==footprint.areaByFloor[i]))fail('B8_ORIENTATION_AREA_MISMATCH');
 const perFloor=footprint.areaByFloor;
 const available=width*depth*floors;
 const occupancy=round(footprint.totalCells/available);
 const retention=round(Math.min(...perFloor)/Math.max(...perFloor));
 const variety=round((Math.max(...perFloor)-Math.min(...perFloor))/(width*depth));
 // Transparent, fixed, intentionally non-architectural sorting heuristic.
 const rubric={occupancyPoints:Math.round(occupancy*60),retentionPoints:Math.round(retention*25),tierVariationPoints:Math.round(Math.min(1,variety*2)*15)};
 const score=Object.values(rubric).reduce((a,b)=>a+b,0);
 const blocked=exposed.predictedStatus==='PREDICTED_PLANNER_ENTRANCE_REJECTION';
 return {id:`${program}-${massing}-${style}-s${seed}-${orientation}`,origin:'NEW_REVIEW_ONLY',program,
  massing,style,seed,orientation,dimensions:{width,depth,floors},
  sourcePredictedRectangles:rectangles,areaByFloor:perFloor,occupiedCells:footprint.totalCells,
  occupancyRatio:occupancy,floorRetentionRatio:retention,tierVariationRatio:variety,
  score,scoreRubric:rubric,entrance:{predictedStatus:exposed.predictedStatus,requiredRunCells:exposed.requiredRunCells,maximumFrontRunCells:exposed.maximumFrontRunCells},
  screening:blocked?'STATIC_ENTRANCE_RISK':'STATIC_ENTRANCE_RUN_FOUND_OTHER_GATES_BLOCKED',
  warnings:blocked?['Predicted front-run shortage; candidate must not pass preliminary entrance review.']:[],
  originalConceptAffected:false,autoApplied:false,worldAnchor:null,worldCoordinates:null,materials:[],
  BuildPlan:plan()};
}
export function makeB8Catalog({b7Report,snapshotDir}){
 requireB7(b7Report);
 const pin=requireSnapshotPin(snapshotDir);
 if(pin.manifestSha256!==b7Report.sourceManifestSha256)fail('B8_SOURCE_BASELINE_MISMATCH');
 const styleMap=Object.fromEntries(styles.map(s=>[s,JSON.parse(fs.readFileSync(path.join(snapshotDir,'styles',s+'.json'),'utf8').replace(/^\uFEFF/,''))]));
 // Site templates are copied from the frozen B7 samples; never invented or inferred as actual available land.
 const dims=Object.fromEntries(['hotel','apartment','office'].map(p=>{
  const source=b7Report.candidates.find(c=>c.program===p);
  if(!source)fail('B8_MISSING_FROZEN_PROGRAM');
  return [p,{...source.dimensions}];
 }));
 const proposals=[];
 for(const program of Object.keys(programs))for(const massing of programs[program])for(const style of styles)
  for(const seed of seeds)for(const orientation of faces){
   proposals.push(catalogCandidate({program,...dims[program],massing,style,seed,orientation},styleMap[style]));
  }
 if(proposals.length!==432||new Set(proposals.map(x=>x.id)).size!==432)fail('B8_PROPOSAL_COUNT_DUPLICATE');
 const rejected=proposals.filter(x=>x.screening==='STATIC_ENTRANCE_RISK');
 const statuses={BLOCKED_CONSTRUCTION_GATES:b7Report.blockingGates.length,
  rejectedEntranceCandidates:rejected.length,
  sourceAndConceptDriftLegacyOfficeCells:b7Report.visualReconciliation.officeDriftCells,
  originalCandidateCount:b7Report.candidates.length};
 const result={schema:'minecraftaibuilder-step8b-b8-review-catalog-v1',status:'STATIC_REVIEW_ONLY_NOT_PREPARED',
  baseB7ReportSha256:b7Report.reportSha256,sourceManifestSha256:pin.manifestSha256,
  reviewCatalog:{programs:Object.keys(programs),programMassings:programs,styles,orientations:faces,seeds,siteTemplates:dims},
  scoringDisclaimer:'Heuristic sorting only: occupancy*60 + min/max floor retention*25 + bounded tier variation*15. Not design quality, structural safety or construction readiness.',
  proposals,legacyCandidates:b7Report.candidates.map(c=>({id:`legacy-${c.program}-${c.id}`,program:c.program,massing:c.massing,orientation:c.orientation,style:c.style,
   seed:c.seed,dimensions:c.dimensions,sourcePredictedRectangles:c.sourcePredictedRectangles,
   areaByFloor:c.local.layers.map(v=>v.sourceArea),sourceVsConceptDifferenceCells:c.local.changedCells,
   screening:c.entrance.predictedStatus==='PREDICTED_PLANNER_ENTRANCE_REJECTION'?'STATIC_ENTRANCE_RISK':'STATIC_ENTRANCE_RUN_FOUND_OTHER_GATES_BLOCKED',
   originalConceptAffected:false,autoApplied:false,BuildPlan:plan()})),
  boundaryFailures:b7Report.entranceMatrix.problematicCases.map(x=>({width:x.width,depth:x.depth,seed:x.seed,orientation:x.orientation,style:x.style,
   requiredRun:x.requiredRun,frontRun:x.frontRun,alternatives:x.alternatives.options.map(o=>({kind:o.kind,value:o.value,changeCost:o.changeCost,
     previewParameters:o.previewParameters,requiresExplicitDesignReview:true}))})),
  statuses,referenceLimits:{staticSourceMirrorOnly:true,realPlannerInvoked:false,liveEngineAttested:false,worldKnown:false,
    materialKnown:false,occupancyNotBuildability:true,designScoresAreHeuristic:true},
  selectionPolicy:{maximumCompared:3,exportReviewOnly:true,autoApply:false,noPersistence:true,constructionApprovalNotRepresentable:true},
  blockingGates:b7Report.blockingGates,coordinates:{worldAnchor:null,worldCoordinates:null},materialBlockIds:[],blockStates:[],
  deploymentGate:'BLOCKED',BuildPlan:plan(),safety:safety(),
  stages:['B8.1 frozen provenance and source pin','B8.2 deterministic multi-program candidate bank',
   'B8.3 bounded entrance/geometry scoring','B8.4 filter, compare and per-floor preview UI',
   'B8.5 local review note export with approvals hard-false','B8.6 negative-case QA and checkpoint']};
 result.reportSha256=sha(result);
 return result;
}
export function validateB8Catalog(report){
 if(!report||report.schema!=='minecraftaibuilder-step8b-b8-review-catalog-v1'||report.reportSha256!==sha(Object.fromEntries(Object.entries(report).filter(([k])=>k!=='reportSha256')))||
  report.baseB7ReportSha256!==BASELINE_B7_SHA256||report.deploymentGate!=='BLOCKED'||report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||
  report.safety?.constructionApproved!==false||report.safety?.executionAllowed!==false||report.safety?.autoApplied!==false||
  report.selectionPolicy?.constructionApprovalNotRepresentable!==true||report.referenceLimits?.realPlannerInvoked!==false||
  report.proposals?.length!==432||report.legacyCandidates?.length!==5||report.boundaryFailures?.length!==36||
  report.statuses?.sourceAndConceptDriftLegacyOfficeCells!==123||report.coordinates?.worldAnchor!==null||report.materialBlockIds?.length!==0||report.blockStates?.length!==0||
  report.proposals.some(p=>p.BuildPlan?.status!=='NOT_PREPARED'||p.BuildPlan?.operations?.length!==0||p.BuildPlan?.commandCount!==0||p.autoApplied!==false||
   p.worldAnchor!==null||p.worldCoordinates!==null||p.materials?.length!==0))fail('B8_CATALOG_UNSAFE_OR_TAMPERED');
 return true;
}
