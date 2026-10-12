// B5.1-B5.4: Bounded static-only planner contract, entrance-feasibility,
// material cutover review and runtime triage. No production imports or plan generation.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditSourceDirectory} from './step8b-compatibility.mjs';
import {predictLocalRectangles,orientedRectangles,footprintSummary} from './step8b-geometry-b3.mjs';
import {evaluateEvidenceDelta} from './step8b-evidence-b43.mjs';
import {evaluateBuildReadiness} from './step8b-readiness-b5.mjs';
const sum=v=>createHash('sha256').update(v).digest('hex');
const jsonsha=v=>sum(JSON.stringify(v));
const fail=(code)=>{const error=new Error(code);error.code=code;throw error;};
const hex=/^[a-f\d]{64}$/;
const plan=()=>({status:'NOT_PREPARED',operations:[],commandCount:0});
const safe=()=>({constructionApproved:false,executionAllowed:false,notPrepared:true,noWorldMutation:true,noBridge:true,noScan:true,noPackGeneration:true});
const pin=Object.freeze({
 'engine/src/general-building-planner.js':'23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8',
 'engine/src/building-grammar.js':'71c0e2bda3e7a044285d681b38d9d4373e3c0aa417808a2f54c652d05ff47d1a',
 'engine/src/build-anchor.js':'23bea262e90012fc6bfdd9f1407e1f7cb514f87862ad1c60b0431792f8ef056f'
});
const contracts=Object.freeze({
 'engine/src/general-building-planner.js':[
  /const masses = massings\.get\(c\.massing\)\(c\)/,
  /const masks = Array\.from\(\{ length: c\.floorCount \}, \(_, f\) => footprint\(masses, f, w, d\)\)/,
  /edges\(masks\[0\]\)\.filter\(\(e\) => e\.axis === "x" && e\.sign === -1 && e\.end - e\.start >= entranceWidth\+1\)/,
  /if \(!front\) throw new Error\('Composition has no usable entrance surface'\)/,
  /rotatePlanPoint\(point, c\.orientation, w, d\)/,
  /const result = validateBuildPlan\(/,
  /materialPipelineMode\(options\)/],
 'engine/src/building-grammar.js':[
  /programs\.register\("hotel".*floorHeight: 5/,
  /programs\.register\("office".*floorHeight: 4/,
  /programs\.register\("apartment".*floorHeight: 4/,
  /variation: \{ wing:/,
  /heightDrop: 1 \+ variationSeed % Math\.max\(1, floorCount - 1\)/],
 'engine/src/build-anchor.js':[/export function rotatePlanPoint\(/,/export function rotateLocal\(/,/export function createBuildAnchor\(/]
});
export function requireSnapshotPin(snapshotDir){
 const audit=auditSourceDirectory(snapshotDir);
 if(audit.sourceFilesVerified!==249||audit.status!=='SOURCE_INVENTORY_CHECKED_MAPPING_UNKNOWN'||
    audit.sourceManifestSha256!=='34ef239cd1d6e59c7d36fb070bd305e7572d944dee949c0648312ec94090534c')fail('B6_SOURCE_INVENTORY_DRIFT');
 const observed=[];
 for(const [name,expected] of Object.entries(pin)){
  const raw=fs.readFileSync(path.join(snapshotDir,name));
  if(sum(raw)!==expected)fail('B6_PINNED_SOURCE_DRIFT');
  const src=raw.toString('utf8');
  if(!contracts[name].every(rx=>rx.test(src)))fail('B6_STATIC_SOURCE_CONTRACT_NOT_FOUND');
  observed.push({path:name,sha256:expected,contractCount:contracts[name].length});
 }
 const production=fs.readFileSync(path.join(snapshotDir,'engine/src/material-production-binding.js'),'utf8');
 const required=[
  /options\.materialPipeline === undefined \? 'legacy' : options\.materialPipeline/,
  /\['legacy', 'phase6c'\]/,
  /evaluateMaterialShadow\(legacyPlan, options\)/,
  /a\.verification\?\.status !== 'verified'/,
  /targetRuntimeAvailability !== 'available'/,
  /commandPlacementAvailability !== 'available'/,
  /planGeometryIdentity\(plan\) !== planGeometryIdentity\(legacyPlan\)/,
  /liveBuildAuthorized:false/];
 if(!required.every(rx=>rx.test(production)))fail('B6_MATERIAL_SOURCE_CONTRACT_NOT_FOUND');
 const world=fs.readFileSync(path.join(snapshotDir,'engine/src/build-anchor.js'),'utf8');
 if(!/case "north": return \{ x, y, z: -z \}/.test(world)||
    !/case "east": return \{ x: z, y, z: x \}/.test(world)||
    !/case "north": return \{ x, y, z \}/.test(world))fail('B6_COORDINATE_CONTRACT_UNKNOWN');
 return {status:'PINNED_STATIC_SOURCE_CONTRACT',inventoryFiles:audit.sourceFilesVerified,manifestSha256:audit.sourceManifestSha256,
  verifiedSources:observed,materialSourceSha256:sum(production),
  signals:{plannerUsesDynamicMasses:true,footprintsPerFloor:true,entranceRequiresExposedNorthLocalRun:true,
   orientationPlanRotationNotWorldBinding:true,defaultMaterialPipeline:'legacy',phase6cExplicitOptIn:true,
   productionBindingNeedsExactVerifiedBlockStates:true},
  limit:'Exact source text and formula comparison only. Production planner, Minecraft and Bridge not invoked.'};
}
function assertReport(report){
 const digest=report?.reportSha256;
 if(!hex.test(digest||''))fail('B6_REPORT_HASH_MISSING');
 const raw={...report};delete raw.reportSha256;
 if(jsonsha(raw)!==digest||report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan.commandCount!==0||report.BuildPlan.operations.length!==0||report.deploymentGate!=='BLOCKED')fail('B6_REPORT_UNSAFE_OR_MODIFIED');
}
function presentAt(rects,x,z,f=0){return rects.some(r=>r.start<=f&&f<r.end&&x>=r.x&&x<r.x+r.width&&z>=r.z&&z<r.z+r.depth);}
/** Static port of the source's ground-level exposed-front-run decision only. */
export function evaluateEntrance(rects,width,depth,program){
 if(!['hotel','apartment','office'].includes(program))fail('B6_PROGRAM_UNRECOGNIZED');
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(depth)||width<15||width>48||depth<12||depth>40||
  !Array.isArray(rects)||rects.length===0||rects.length>16)fail('B6_ENTRANCE_INPUT_INVALID');
 for(const r of rects)if(![r.x,r.z,r.width,r.depth,r.start,r.end].every(Number.isSafeInteger)||
  r.width<3||r.depth<3||r.x<0||r.z<0||r.x+r.width>width||r.z+r.depth>depth||r.start<0||r.end<=r.start)fail('B6_INVALID_MASS');
 const entranceWidth=program==='hotel'?5:program==='apartment'?2:4;
 const requiredRun=entranceWidth+2; // source condition: e.end - e.start >= entranceWidth + 1
 const runs=[];
 for(let z=0;z<depth;z++)for(let x=0;x<width;x++){
  const yes=presentAt(rects,x,z)&&!presentAt(rects,x,z-1);
  if(!yes)continue;
  const start=x;
  while(x+1<width&&presentAt(rects,x+1,z)&&!presentAt(rects,x+1,z-1))x++;
  runs.push({frontZ:z,runStart:start,runEnd:x,length:x-start+1});
 }
 const available=runs.filter(r=>r.length>=requiredRun).sort((a,b)=>a.frontZ-b.frontZ||b.length-a.length);
 return {program,requiredRunCells:requiredRun,entranceWidth,frontRunCount:runs.length,
  maximumFrontRunCells:Math.max(0,...runs.map(r=>r.length)),qualifyingRunCount:available.length,
  predictedStatus:available.length?'FRONT_RUN_FOUND_STATIC_ONLY':'PREDICTED_PLANNER_ENTRANCE_REJECTION',
  exposure:{frontEdge:'unoriented local -Z',worldDirection:'UNBOUND'},
  caveat:'Static footprint predicate only; modules, entrance carve-out and complete plan not generated.'};
}
/** B5.6: candidate-level preview alternatives only; original concept must remain immutable. */
export function suggestEntranceAlternatives({width,depth,floors=6,orientation='north',seed,style,massing},styleSources){
 if(massing!=='U_shape'||typeof style!=='string'||!styleSources||typeof styleSources!=='object')fail('B6_ALTERNATIVE_INPUT_INVALID');
 if(!Object.hasOwn(styleSources,style))fail('B6_STYLE_MISSING');
 const params={width,depth,floors,orientation,seed,style,massing};
 const calc=q=>{
  const predicted=predictLocalRectangles(q,styleSources[q.style]);
  return evaluateEntrance(predicted.rectangles,q.width,q.depth,'hotel').predictedStatus==='FRONT_RUN_FOUND_STATIC_ONLY';
 };
 if(calc(params))return {status:'ALREADY_STATICALLY_FEASIBLE',suggestions:[],originalDesignModified:false};
 const proposed=[];
 for(let w=width+1;w<=48;w++){
  if(calc({...params,width:w})){
   proposed.push({change:'SITE_WIDTH_PREVIEW_ONLY',value:w,delta:w-width,requiresUserDesignDecision:true});break;
  }
 }
 for(const other of ['modern','urban_japanese','traditional']){
  if(other!==style&&styleSources[other]&&calc({...params,style:other})){
   proposed.push({change:'STYLE_PREVIEW_ONLY',value:other,requiresUserDesignDecision:true});break;
  }
 }
 for(const other of ['stepped','tower_on_podium','asymmetric_block']){
  if(calc({...params,massing:other})){
   proposed.push({change:'MASSING_PREVIEW_ONLY',value:other,requiresUserDesignDecision:true});break;
  }
 }
 return {status:proposed.length?'STATIC_PREVIEW_ALTERNATIVES_AVAILABLE':'NO_ALTERNATIVE_PREDICTED',suggestions:proposed,
  originalDesignModified:false,warning:'Options are non-executable preview-only candidates, not an approved building plan.'};
}
function orientationCheck(rects,width,depth,floors,face){
 const oriented=orientedRectangles(rects,face,width,depth);
 const ow=['east','west'].includes(face)?depth:width,od=['east','west'].includes(face)?width:depth;
 const original=footprintSummary(rects,width,depth,floors).areaByFloor;
 const rotated=footprintSummary(oriented,ow,od,floors).areaByFloor;
 if(JSON.stringify(original)!==JSON.stringify(rotated))fail('B6_ROTATION_NOT_AREA_PRESERVING');
 return {orientedLocalEnvelope:{width:ow,depth:od},areaPreserved:true,worldRotationAttested:false};
}
export function checkCrossMatrix(snapshotDir,geometryReport){
 assertReport(geometryReport);
 if(geometryReport.crossMatrix.length!==288)fail('B6_BAD_CROSS_MATRIX');
 const styles=new Map();
 const cases=[];
 let valid=0,blocked=0;
 for(const row of geometryReport.crossMatrix){
  const {massing,orientation,seed,style}=row;
  if(!['modern','urban_japanese','traditional'].includes(style))fail('B6_STYLE_NOT_PINNED');
  if(!styles.has(style))styles.set(style,JSON.parse(fs.readFileSync(path.join(snapshotDir,'styles',style+'.json'),'utf8').replace(/^\uFEFF/,'')));
  const param={width:24,depth:20,floors:6,massing,orientation,seed,style};
  const predicted=predictLocalRectangles(param,styles.get(style));
  const orient=orientedRectangles(predicted.rectangles,orientation,24,20);
  const digest=sum(JSON.stringify({v:predicted.rectangles,rotated:orient}));
  const areas=footprintSummary(predicted.rectangles,24,20,6).areaByFloor;
  if(row.geometryDigest!==digest||JSON.stringify(row.variation)!==JSON.stringify(predicted.variation)||
   JSON.stringify(row.areaByFloor)!==JSON.stringify(areas)||row.rectangles!==predicted.rectangles.length)
   fail('B6_CROSS_MATRIX_SOURCE_MISMATCH');
  const entrance=evaluateEntrance(predicted.rectangles,24,20,'hotel');
  const orientResult=orientationCheck(predicted.rectangles,24,20,6,orientation);
  if(entrance.predictedStatus==='PREDICTED_PLANNER_ENTRANCE_REJECTION')blocked++;else valid++;
  cases.push({massing,orientation,seed,style,entrance:entrance.predictedStatus,maximumFrontRunCells:entrance.maximumFrontRunCells,
   requiredRunCells:entrance.requiredRunCells,orientationAreaPreserved:orientResult.areaPreserved});
 }
 const bounds=[[15,12],[15,20],[16,16],[24,20],[48,12],[48,40]];
 const additional=[];
 const hotelAllowed=new Set(['stepped','U_shape','tower_on_podium','asymmetric_block']);
 for(const [width,depth] of bounds){
  for(const row of geometryReport.crossMatrix){
   const params={width,depth,floors:6,massing:row.massing,orientation:row.orientation,seed:row.seed,style:row.style};
   const variation=predictLocalRectangles(params,styles.get(row.style));
   orientationCheck(variation.rectangles,width,depth,6,row.orientation);
   const entrance=evaluateEntrance(variation.rectangles,width,depth,'hotel');
   additional.push({width,depth,massing:row.massing,orientation:row.orientation,seed:row.seed,style:row.style,
    hotelProgramAllowedMassing:hotelAllowed.has(row.massing),
    status:entrance.predictedStatus,requiredRunCells:entrance.requiredRunCells,maxFrontRunCells:entrance.maximumFrontRunCells});
  }
 }
 const rejectBoundary=additional.filter(x=>x.status==='PREDICTED_PLANNER_ENTRANCE_REJECTION');
 const alternates=Object.fromEntries(styles);
 const previewAlternatives=rejectBoundary.filter(x=>hotelAllowed.has(x.massing)).slice(0,4).map(x=>({
  original:{width:x.width,depth:x.depth,seed:x.seed,style:x.style,massing:x.massing},
  ...suggestEntranceAlternatives({width:x.width,depth:x.depth,seed:x.seed,style:x.style,massing:x.massing},alternates)}));
 const rejectHotel=rejectBoundary.filter(x=>x.hotelProgramAllowedMassing);
 return {casesVerified:cases.length,hotelEntranceValidCases:valid,hotelEntranceRejectedCases:blocked,
  boundary:{casesVerified:additional.length,dimensions:bounds.map(([width,depth])=>({width,depth})),
   hotelEntranceRejectedAllMassings:rejectBoundary.length,hotelEntranceRejectedAllowedHotelMassings:rejectHotel.length,
   hotelAllowedMassingCases:additional.filter(x=>x.hotelProgramAllowedMassing).length,
   previewAlternatives,
   examples:rejectHotel.slice(0,15),
   distribution:Object.fromEntries([...new Set(additional.map(c=>c.massing))].map(m=>[m,{
    tested:additional.filter(c=>c.massing===m).length,
    rejected:rejectBoundary.filter(c=>c.massing===m).length,
    hotelRegistered:hotelAllowed.has(m)}]))},
  warningScope:'All 288 source-pinned shape/style/seed/orientation cases evaluated against HOTEL entrance threshold, regardless of usual program selection',
  sampleRejected:cases.filter(x=>x.entrance==='PREDICTED_PLANNER_ENTRANCE_REJECTION').slice(0,12),
  byMassing:Object.fromEntries([...new Set(cases.map(c=>c.massing))].map(m=>[m,{tested:cases.filter(c=>c.massing===m).length,
   staticHotelEntranceRejects:cases.filter(c=>c.massing===m&&c.entrance==='PREDICTED_PLANNER_ENTRANCE_REJECTION').length}]))};
}
function candidatePreflight(g){
 assertReport(g);
 const p=g.candidates.map(c=>{
  if(c.BuildPlan?.status!=='NOT_PREPARED'||c.worldAnchor!==null||c.worldCoordinates!==null||
    c.materialBlockIds.length!==0||c.blockStates.length!==0)fail('B6_UNSAFE_CANDIDATE');
  const e=evaluateEntrance(c.sourcePredictedUnorientedRectangles,c.dimensions.width,c.dimensions.depth,c.program);
  const orientation=orientationCheck(c.sourcePredictedUnorientedRectangles,c.dimensions.width,c.dimensions.depth,c.dimensions.floors,c.orientation);
  return {id:c.id,program:c.program,massing:c.massing,orientation:c.orientation,seed:c.seed,
   conceptualFootprintMatch:c.comparison.match,conceptVsSourceRemovedCellsTotal:c.comparison.noLongerOccupiedCellsByFloor.reduce((a,b)=>a+b,0),
   entrance:e,orientation,hasVerifiedInteriorOrExit:false,diagnosticOnly:true};
 });
 return p;
}
export function triageCapturedRuntime(baseline,latest){
 if(baseline?.schema!=='minecraftaibuilder-step8b-b4-probe-v1'||latest?.schema!=='minecraftaibuilder-step8b-b42-readonly-probe-v1'||
  latest.processDiscovery?.status!=='OK'||latest.processDiscovery?.listenerQueryStatus!=='OK'||
  !Array.isArray(latest.processDiscovery.records)||latest.processDiscovery.truncated!==false||
  latest.safety?.notPrepared!==true||latest.safety?.executionAllowed!==false||
  latest.safety?.constructionApproved!==false||latest.safety?.worldAccess!==false||latest.safety?.bridgeContact!==false)
  fail('B6_INVALID_RUNTIME_EVIDENCE');
 const prev=baseline.processDiscovery.nodeProcessCount,next=latest.processDiscovery.nodeProcessCount;
 if(!Number.isInteger(prev)||prev<0||!Number.isInteger(next)||next<0)fail('B6_INVALID_PROCESS_COUNTS');
 return {lastNodeCount:next,previousNodeCount:prev,delta:next-prev,
  status:next===0?'NO_NODE_PROCESS_OBSERVED_AT_CAPTURE':'NODE_PRESENT_IDENTITY_UNPROVEN',
  interpretation:next===0?'Not observed at capture; startup mode and cause unknown. Do not classify as broken.':'Process observation is not proof of loaded code.',
  listenerQuery:'QUERY_SUCCEEDED_NOT_PROOF_OF_ACTIVE_LISTENER',
  runtimeIdentity:'NOT_PROVEN',runtimeBehavior:'UNTESTED',restartRequested:false,noAPIContact:true};
}
export function evaluateB6({snapshotDir,geometryReports,apiAudit,oldCapture,newCapture}){
 const source=requireSnapshotPin(snapshotDir);
 if(!geometryReports||Object.keys(geometryReports).sort().join(',')!=='apartment,hotel,office')fail('B6_INCOMPLETE_PROGRAMS');
 const delta=evaluateEvidenceDelta(snapshotDir,oldCapture,newCapture);
 const readiness=evaluateBuildReadiness(geometryReports,apiAudit,delta);
 if(readiness.BuildPlan.status!=='NOT_PREPARED'||readiness.gates.length!==8||readiness.gates.some(g=>g.state!=='BLOCKED'&&g.state!=='EVIDENCED_DISK_ONLY'))fail('B6_READINESS_UNSAFE');
 const candidates=['hotel','apartment','office'].flatMap(k=>candidatePreflight(geometryReports[k]));
 const matrix=checkCrossMatrix(snapshotDir,geometryReports.office);
 const triage=triageCapturedRuntime(oldCapture,newCapture);
 const risk=[];
 for(const c of candidates){
  if(!c.conceptualFootprintMatch)risk.push({code:'PREVIEW_FOOTPRINT_DRIFT',program:c.program,candidate:c.id,severity:'REVIEW_REQUIRED'});
  if(c.entrance.predictedStatus==='PREDICTED_PLANNER_ENTRANCE_REJECTION')risk.push({code:'ENTRANCE_RUN_TOO_SHORT',program:c.program,candidate:c.id,severity:'STATIC_PREDICTED_REJECTION'});
 }
 if(matrix.boundary.hotelEntranceRejectedAllowedHotelMassings)risk.push({code:'MASSING_ENTRANCE_COMPATIBILITY_HOLES',severity:'REVIEW_REQUIRED',failedStaticCases:matrix.boundary.hotelEntranceRejectedAllowedHotelMassings});
 const result={schema:'minecraftaibuilder-step8b-b6-accelerated-static-preflight-v1',status:'STATIC_QA_ONLY_NOT_PREPARED',
  checkpoints:['B5.1 Source-pinned planning contract','B5.2 exposed entrance geometry','B5.3 material cutover proof limits','B5.4 runtime evidence triage','B5.5 fail-closed safety and QA','B5.6 preview-only entrance alternatives'],
  source,plannerContract:{realPlannerInvoked:false,layoutOrVoxelPlanGenerated:false,fullyExecutable:false,
   localFrontSelection:'front side is exposed -Z local edge prior to rotation; source filters runLen >= doorWidth + 2',
   staticFrontRunDetection:'INDEPENDENT_FOOTPRINT_PREDICATE_MIRROR'},
  matrix,candidates,risks:risk,
  materialCutover:{default:'legacy',alternate:'phase6c',alternateOnlyWhenExplicitlyConfigured:true,
   materialIdsAttested:false,blockStatesAttested:false,versionSkewResolved:false,
   runtimeMaterialCompatibility:'UNKNOWN',cutover:'BLOCKED',materialBlockIds:[],blockStates:[]},
  coordinates:{conceptX:'east',conceptZ:'south',previewOrientation:'rotatePlanPoint LOCAL ONLY',
   worldNorthZ:'negative',worldTransform:'UNBOUND',anchor:null,worldCoordinates:null},
  runtime:triage,buildReadiness:{gates:readiness.gates,allConstructionGatesRemainClosed:true},
  safety:{...safe(),worldIdentityProven:false},BuildPlan:plan(),deploymentGate:'BLOCKED',
  next:'Offline review/preview corrections only. No new Windows action required until a justified read-only runtime attestation is possible.'};
 result.reportSha256=jsonsha(result);
 return result;
}
