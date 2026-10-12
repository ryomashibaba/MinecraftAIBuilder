// Step 8B/B7: SOURCE-PINNED NON-EXECUTABLE REVIEW PROJECTION ONLY.
// Never import the real planner/Bridge, never choose a world anchor/material, never create BuildPlans.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {requireSnapshotPin,evaluateEntrance} from './step8b-static-planner-b6.mjs';
import {predictLocalRectangles,orientedRectangles,footprintSummary} from './step8b-geometry-b3.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>sha(JSON.stringify(x));
const deny=code=>{const e=new Error(code);e.code=code;throw e;};
const programMassings=Object.freeze({hotel:['stepped','U_shape','tower_on_podium','asymmetric_block'],apartment:['L_shape','slab','twin_bar','courtyard'],office:['slab','tower_on_podium','asymmetric_block','stepped']});
const styleNames=Object.freeze(['modern','urban_japanese','traditional']);
const directions=Object.freeze(['north','east','south','west']);
const B6_BASELINE_SHA='90774b3a0db9e2253be9f8cce3a8e5d3081352e78eb38bd71c5adb0acc613b87';
const B3_BASELINE_SHA=Object.freeze({hotel:'e8c5983a7089ed180c8c30981cf661129947e3e1dfe94f67c3b8393168ce794c',apartment:'7429de5caa540b02363873d21e18600047897e3ed82894819d55e74c1cd0de30',office:'3907e3844d77887ff969ac78a1799d8d34562906772289f5f41d8671906ee8a9'});
const plan=()=>({status:'NOT_PREPARED',operations:[],commandCount:0});
const safety=()=>({constructionApproved:false,executionAllowed:false,noWorldMutation:true,noBridge:true,noScan:true,notPrepared:true,approvedByUser:false});
function frozenEvidence(report,schema,tag){
 if(!report||report.schema!==schema||report.deploymentGate!=='BLOCKED'||report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.commandCount!==0||!Array.isArray(report.BuildPlan?.operations)||report.BuildPlan.operations.length!==0||report.safety?.constructionApproved!==false||report.safety?.executionAllowed!==false)deny('B7_'+tag+'_UNSAFE');
 const {reportSha256,...plain}=report;
 if(reportSha256!==digest(plain))deny('B7_'+tag+'_TAMPERED');
}
function grid(rectangles,w,d,floors){
 // A tiny bounded local preview grid, not voxel/minecraft fill operations.
 const f=footprintSummary(rectangles,w,d,floors);
 return f.cellsByFloor;
}
function composite(concept,source,w,d,n){
 const a=grid(concept,w,d,n),b=grid(source,w,d,n);
 let changed=0;
 const layers=a.map((floor,i)=>{
  const sourceFloor=b[i], rows=[];let removed=0,added=0,both=0;
  for(let z=0;z<d;z++){
   let row='';for(let x=0;x<w;x++){
    const k=z*w+x, ac=floor.has(k),bc=sourceFloor.has(k);
    row+=ac&&bc?'B':ac?'C':bc?'S':'.';
    if(ac&&bc)both++;else if(ac)removed++;else if(bc)added++;
   }rows.push(row);
  }
  changed+=removed+added;
  return {level:i+1,width:w,depth:d,rows,commonCells:both,conceptOnlyCells:removed,sourceOnlyCells:added,
   conceptArea:floor.size,sourceArea:sourceFloor.size};
 });
 return {layers,changedCells:changed,layerEncoding:'.=empty B=both C=concept-only S=source-only'};
}
export function projectCandidate(candidate){
 const c=candidate,site=c?.dimensions;
 if(!site||!programMassings[c.program]||!['slab','L_shape','U_shape','courtyard','tower_on_podium','stepped','twin_bar','asymmetric_block'].includes(c.massing)||!directions.includes(c.orientation)||
  !Number.isSafeInteger(site.width)||!Number.isSafeInteger(site.depth)||!Number.isSafeInteger(site.floors)||
  site.width<15||site.width>48||site.depth<12||site.depth>40||site.floors<2||site.floors>10||
  c.BuildPlan?.status!=='NOT_PREPARED'||c.BuildPlan?.commandCount!==0||c.BuildPlan?.operations?.length!==0||
  c.worldAnchor!==null||c.worldCoordinates!==null||c.materialBlockIds?.length!==0||c.blockStates?.length!==0)
  deny('B7_CANDIDATE_INVALID_OR_UNSAFE');
 const a=c.conceptOriginalLocalRectangles,b=c.sourcePredictedUnorientedRectangles;
 const local=composite(a,b,site.width,site.depth,site.floors);
 const ar=orientedRectangles(a,c.orientation,site.width,site.depth),br=orientedRectangles(b,c.orientation,site.width,site.depth);
 const rw=['east','west'].includes(c.orientation)?site.depth:site.width;
 const rd=['east','west'].includes(c.orientation)?site.width:site.depth;
 const rotated=composite(ar,br,rw,rd,site.floors);
 if(local.changedCells!==rotated.changedCells||
  local.layers.some((r,i)=>r.conceptArea!==rotated.layers[i].conceptArea||r.sourceArea!==rotated.layers[i].sourceArea)||
  JSON.stringify(local.layers.map(r=>r.conceptOnlyCells))!==JSON.stringify(c.comparison.noLongerOccupiedCellsByFloor)||
  JSON.stringify(local.layers.map(r=>r.sourceOnlyCells))!==JSON.stringify(c.comparison.newlyOccupiedCellsByFloor)||
  c.comparison.match!==(local.changedCells===0))deny('B7_ROTATION_OR_BASELINE_DELTA_DISAGREEMENT');
 const entrance=evaluateEntrance(b,site.width,site.depth,c.program);
 const reviewDisposition=local.changedCells?'SOURCE_PINNED_REVIEW_PROJECTION_DIFFERS_FROM_LEGACY_CONCEPT':'STATIC_SOURCE_AND_CONCEPT_ALIGNED';
 const massingDetail=c.massing==='asymmetric_block'?{conceptInferredWingCells:site.depth-a[0].depth,sourceStyleWingCells:site.depth-b[0].depth,
  explanation:'Source-pinned style proportion affects wing calculation. These are static geometry parameters, not actual built dimensions.'}:null;
 return {id:c.id,program:c.program,massing:c.massing,style:c.style,seed:c.seed,orientation:c.orientation,
  dimensions:site,reviewDisposition,massingDetail,sourceAsPrimaryReviewLayer:true,originalConceptPreserved:true,
  massingSelectionMode:programMassings[c.program].includes(c.massing)?'PROGRAM_DEFAULT_REGISTERED':'EXPLICIT_ENGINE_REGISTERED_ONLY',
  conceptRectangles:a,sourcePredictedRectangles:b,local,orientedLocal:rotated,
  entrance:{predictedStatus:entrance.predictedStatus,requiredRunCells:entrance.requiredRunCells,maximumFrontRunCells:entrance.maximumFrontRunCells},
  sourcePredictedTotalCells:local.layers.reduce((s,x)=>s+x.sourceArea,0),
  conceptTotalCells:local.layers.reduce((s,x)=>s+x.conceptArea,0),
  worldAnchor:null,worldCoordinates:null,materials:[],BuildPlan:plan(),safety:safety()};
}
const candidateKey=c=>[c.width,c.depth,c.floors,c.massing,c.orientation,c.seed,c.style].join(':');
const stableOption=o=>[o.editCount,o.changeCost,o.kind,o.value].join(':');
/** Select and explain feasible local shapes only. Never authorizes a style/seed/site change. */
export function suggestB7EntranceOptions(input,styles){
 const {width,depth,floors=6,massing,style,orientation='north',seed}=input||{};
 if(massing!=='U_shape'||![style].every(s=>styleNames.includes(s))||!directions.includes(orientation)||
  !Number.isSafeInteger(seed)||seed<0||seed>2147483645||
  !Number.isSafeInteger(floors)||floors<2||floors>10||
  !Number.isSafeInteger(width)||width<15||width>48||!Number.isSafeInteger(depth)||depth<12||depth>40||
  !styles||styleNames.some(n=>!styles[n]))deny('B7_ALTERNATIVE_INPUT_INVALID');
 const p={width,depth,floors,massing,style,orientation,seed};
 const feasible=q=>{
  if(!programMassings.hotel.includes(q.massing))return false;
  try{const r=predictLocalRectangles(q,styles[q.style]);return evaluateEntrance(r.rectangles,q.width,q.depth,'hotel').qualifyingRunCount>0;}catch{return false;}
 };
 if(feasible(p))return {state:'ENTRANCE_RUN_STATICALLY_FEASIBLE',options:[],originalUnchanged:true,autoApplied:false};
 const options=[];
 const offer=(q,kind,value,cost)=>{if(feasible(q))options.push({kind,value,editCount:1,changeCost:cost,previewParameters:q,
  sourcePreviewOnly:true,requiresExplicitDesignReview:true,otherGatesBlocked:true,previewKey:candidateKey(q)});};
 // Keep design intent where possible: first seed-only, then style, then modest width, then shape.
 for(const ss of [seed-1,seed+1,seed+2])if(ss>=0&&ss<=2147483647)offer({...p,seed:ss},'SEED_PREVIEW_ONLY',ss,1+Math.abs(ss-seed));
 for(const st of styleNames)if(st!==style)offer({...p,style:st},'STYLE_PREVIEW_ONLY',st,20);
 for(let w=width+1;w<=Math.min(48,width+12);w++)if(feasible({...p,width:w})){
  offer({...p,width:w},'SITE_WIDTH_PREVIEW_ONLY',w,50+w-width);break;
 }
 for(const m of programMassings.hotel)if(m!==massing)offer({...p,massing:m},'MASSING_PREVIEW_ONLY',m,100);
 // Deduplicate by resulting parameter tuple; rank is an advisory only, not executable approval.
 const unique=[...new Map(options.map(o=>[o.previewKey,o])).values()].sort((a,b)=>a.changeCost-b.changeCost||stableOption(a).localeCompare(stableOption(b)));
 return {state:unique.length?'STATIC_PREVIEW_ALTERNATIVES_FOR_REVIEW':'NO_STATICALLY_FEASIBLE_ALTERNATIVE_FOUND',
  options:unique.slice(0,8),optionsFound:unique.length,originalUnchanged:true,autoApplied:false,
  caveat:'Only a source-mirrored front-run precheck. No actual planner execution, doors, structure, site, materials, or user authorization.'};
}
export function buildB7Review({snapshotDir,b3Reports,b6Report}){
 const pin=requireSnapshotPin(snapshotDir);
 frozenEvidence(b6Report,'minecraftaibuilder-step8b-b6-accelerated-static-preflight-v1','B6');
 if(b6Report.reportSha256!==B6_BASELINE_SHA)deny('B7_B6_FROZEN_BASELINE_CHANGED');
 if(b6Report.source.manifestSha256!==pin.manifestSha256||b6Report.source.inventoryFiles!==249||
  b6Report.matrix?.casesVerified!==288||b6Report.matrix?.boundary?.casesVerified!==1728||
  b6Report.buildReadiness?.gates?.length!==8||b6Report.buildReadiness.gates.some(g=>g.state==='READY')||
  !b6Report.buildReadiness.allConstructionGatesRemainClosed)deny('B7_B6_CONTRACT_DISAGREEMENT');
 const programs=['hotel','apartment','office'];
 if(!b3Reports||Object.keys(b3Reports).sort().join(',')!==programs.slice().sort().join(','))deny('B7_INCOMPLETE_REPORTS');
 for(const k of programs){
  const r=b3Reports[k];
  frozenEvidence(r,'minecraftaibuilder-step8b-b3-geometry-preview-v1','B3');
  if(r.reportSha256!==B3_BASELINE_SHA[k])deny('B7_B3_FROZEN_BASELINE_CHANGED');
  if(r.sourceManifestSha256!==pin.manifestSha256||r.sourceFilesVerified!==249)deny('B7_SOURCE_BASELINE_MISMATCH');
 }
 const sourceCandidates=programs.flatMap(k=>b3Reports[k].candidates);
 if(sourceCandidates.length!==5||sourceCandidates.some(c=>!b6Report.candidates.some(d=>d.id===c.id&&d.program===c.program)))deny('B7_CANDIDATE_SET_MISMATCH');
 const candidates=sourceCandidates.map(projectCandidate);
 const styles=Object.fromEntries(styleNames.map(n=>[n,JSON.parse(fs.readFileSync(path.join(snapshotDir,'styles',n+'.json'),'utf8').replace(/^\uFEFF/,''))]));
 const checked=[];
 const sizes=[[15,12],[15,20],[16,16],[24,20],[48,12],[48,40]];
 for(const [width,depth] of sizes)for(const orientation of directions)for(const seed of [0,1,5])for(const style of styleNames){
  const p={width,depth,floors:6,massing:'U_shape',orientation,seed,style};
  const generated=predictLocalRectangles(p,styles[style]);
  const entry=evaluateEntrance(generated.rectangles,width,depth,'hotel');
  if(entry.predictedStatus==='PREDICTED_PLANNER_ENTRANCE_REJECTION'){
   checked.push({...p,frontRun:entry.maximumFrontRunCells,requiredRun:entry.requiredRunCells,
    alternatives:suggestB7EntranceOptions(p,styles)});
  }
 }
 if(checked.length!==b6Report.matrix.boundary.hotelEntranceRejectedAllowedHotelMassings)deny('B7_ENTRANCE_MATRIX_CHANGED');
 const unresolved=b6Report.buildReadiness.gates.filter(g=>g.state!=='EVIDENCED_DISK_ONLY');
 const result={schema:'minecraftaibuilder-step8b-b7-review-reconciliation-v1',status:'NON_EXECUTABLE_PREVIEW_RECONCILED',
  baseB6ReportSha256:b6Report.reportSha256,sourceManifestSha256:pin.manifestSha256,
  intendedWorkflow:'Review source-mirrored local geometry as primary; keep frozen conceptual geometry as comparison; never apply candidates.',
  referenceLimits:{sourceOnly:true,realPlannerInvoked:false,liveEngineAttested:false,worldKnown:false,materialKnown:false,doorsOrStructureVerified:false},
  checkpointStages:['B7.1 frozen baseline verification','B7.2 concept/source dual-floor projection','B7.3 four-direction footprint conservation','B7.4 hotel U-shape entrance screening','B7.5 ranked review-only alternatives','B7.6 fail-closed review dashboard and QA'],
  candidates,entranceMatrix:{scannedHotelUShapeConditions:6*4*3*3,rejected:checked.length,problematicCases:checked,
   correctedDesignCount:0,autoAppliedCount:0},
  visualReconciliation:{sourcePrimaryCount:candidates.length,conceptOriginalsPreserved:true,officeDriftCells:candidates.find(x=>x.id==='candidate-02')?.local.changedCells},
  blockingGates:unresolved.map(x=>({gate:x.gate,state:x.state})),
  coordinates:{worldAnchor:null,worldCoordinates:null,localProjectionOnly:true},materialBlockIds:[],blockStates:[],
  deploymentGate:'BLOCKED',BuildPlan:plan(),safety:safety(),
  next:'Design-only review and planner-independent tests. Never prepare/execute world changes without explicit approval and all missing safety evidence.'};
 result.reportSha256=digest(result);
 return result;
}
