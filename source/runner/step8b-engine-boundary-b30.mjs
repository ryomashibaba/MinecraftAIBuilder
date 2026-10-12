/**
 * B30 read-only boundary adapter: freeze-pinned Assembly IR -> inert engine-facing
 * contract observations. Never imports or invokes the executable planner, never
 * writes a BuildPlan or selects materials/world positions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildAssemblyB29, validateAssemblyB29 } from './step8b-m4-assembly-contract-b29.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');
const hash = o => sha(JSON.stringify(o));
const fail = code => {const e = new Error('B30_' + code);e.code='B30_'+code;throw e;};
const B29_MANIFEST_SHA='065babbf86affbb40bd50531ae26fdc1379acf1197d2a8607feb4c8ac6a4fbe7';
const PLAN = () => ({status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
const BLOCKED = Object.freeze([
 'M4-01','M4-02','M4-03','M4-04','M4-05','M4-06','M4-07','M4-08','M4-09'
]);
const boundaryPatterns = Object.freeze({
 'engine/src/general-building-planner.js':[
  'fromComposition(composition, options = {})',
  'createComposition(input)',
  'plate(mask, base, "floor", "floor")',
  'validateBuildPlan({ type: "general_building"'
 ],
 'engine/src/safety.js':['validateBuildPlan('],
 'engine/src/build-anchor.js':['rotatePlanPoint(']
});
const exactOwn = (obj,k) => Object.prototype.hasOwnProperty.call(obj,k);
const requireSafeFile = (root,rel) => {
 if(typeof root!=='string'||!root || typeof rel!=='string'||rel.includes('..')||path.isAbsolute(rel))fail('PATH');
 const full=path.join(root,...rel.split('/'));
 const s=fs.lstatSync(full);
 if(!s.isFile()||s.isSymbolicLink())fail('UNSAFE_SOURCE');
 return fs.readFileSync(full);
};
/** Snapshot optional. When provided, check actual bytes before reading any contract clues. */
export function inspectB30Snapshot(snapshotRoot,root){
 if(!snapshotRoot||typeof snapshotRoot!=='string')fail('SNAPSHOT_ROOT');
 const facts=JSON.parse(requireSafeFile(root,'reports/B26_ENGINE_SOURCE_FACTS.json').toString('utf8'));
 if(facts.schema!=='minecraftaibuilder-b26-readonly-snapshot-facts-v1'||
    facts.sourceContracts?.engineRuntimeAttested!==false ||
    Object.keys(facts.sourceHashes||{}).length!==9)fail('SNAPSHOT_FACTS');
 const matched=[];
 for(const [relative,expected] of Object.entries(facts.sourceHashes)){
  let body;
  try {body=requireSafeFile(snapshotRoot,relative);}catch{fail('SNAPSHOT_MISSING_OR_UNSAFE');}
  if(sha(body)!==expected)fail('SNAPSHOT_CHANGED');
  for(const phrase of boundaryPatterns[relative]||[]){
   if(!body.toString('utf8').includes(phrase))fail('ENGINE_CONTRACT_CHANGED');
  }
  matched.push(relative);
 }
 return {status:'ARCHIVED_DISK_SOURCE_ONLY',matchedFileCount:matched.length,
  matchedPaths:matched,plannerInvoked:false,runtimeIdentityAttested:false,
  engineInternalBoundary:'createComposition -> fromComposition -> validateBuildPlan',
  floorEmitter:'plate(mask, base, "floor", "floor")',
  floorCutoutHook:'NOT_PRESENT_IN_INSPECTED_PLANNER',
  codeImported:false,constructionOperations:0};
}
function checkRawBaseline(root){
 const manifestBytes=requireSafeFile(root,'B29_FILE_SHA256.json');
 if(sha(manifestBytes)!==B29_MANIFEST_SHA)fail('PINNED_B29_MANIFEST_CHANGED');
 const manifest=JSON.parse(manifestBytes.toString('utf8'));
 if(manifest.fileCount!==526||Object.keys(manifest.files||{}).length!==526)fail('MANIFEST_SCHEMA');
 for(const rel of ['reports/B7_RECONCILED_REVIEW.json','reports/B17_INTERIOR_INTEGRATION_IR.json',
  'reports/B29_M3_M4_ASSEMBLY_IR.json','reports/B26_ENGINE_SOURCE_FACTS.json',
  'runner/step8b-m4-assembly-contract-b29.mjs']){
  if(sha(requireSafeFile(root,rel))!==manifest.files[rel])fail('FROZEN_INPUT_CHANGED');
 }
 const b7=JSON.parse(requireSafeFile(root,'reports/B7_RECONCILED_REVIEW.json').toString('utf8'));
 const b17=JSON.parse(requireSafeFile(root,'reports/B17_INTERIOR_INTEGRATION_IR.json').toString('utf8'));
 const b29=JSON.parse(requireSafeFile(root,'reports/B29_M3_M4_ASSEMBLY_IR.json').toString('utf8'));
 if(b7?.candidates?.length!==5||b17?.buildings?.length!==5||b7?.BuildPlan?.operations?.length!==0 ||
   b7?.deploymentGate!=='BLOCKED'||b17?.BuildPlan?.operations?.length!==0||
   b29?.BuildPlan?.operations?.length!==0||b29.deployment!=='BLOCKED')fail('BASELINE_UNSAFE');
 // Critically: recompute pinned assembly from the frozen root; do not trust a rehashed input.
 validateAssemblyB29(b29,root);
 return {b7,b17,b29};
}
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const inside=(p,rect,level)=>rect.start<=level&&level<rect.end&&
  p.x>=rect.x&&p.x<rect.x+rect.width&&p.z>=rect.z&&p.z<rect.z+rect.depth;
const cellKey=p=>`${p.x},${p.z}`;
function safeExternalAssembly(assembly,root){
 if(assembly===null)return;
 if(typeof assembly!=='object'||!assembly||Array.isArray(assembly))fail('ASSEMBLY_INPUT');
 validateAssemblyB29(assembly,root);
}
function makeFloorReview(b,reference,floor,idx){
 if(floor.id!==reference.floors[idx].id||floor.level!==idx+1||
  floor.commands?.length!==0||floor.applied!==false||
  floor.partitionPanelIntents<0||floor.doorPorts.some(d=>d.ready!==false||d.blockId!==null||
   d.physicalFacing!==null||d.hinge!==null||d.worldTransform!==null))fail('FLOOR_UNSAFE');
 return {id:floor.id,level:idx+1,floorEmitterContract:'FULL_SOURCE_FOOTPRINT_PLATE',
  plannedPartitionPanels:floor.partitionPanelIntents,doorPorts:floor.doorPorts.length,
  allPhysicalDoorStatesUnverified:true,materialMapping:null,
  interiorPartitionEmitterWired:false,engineFloorMutationAllowed:false};
}
function reviewBuilding(b,ref,b7){
 const dims=ref.dimensions;
 const p=b7.candidates.find(c=>`${c.program}/${c.id}`===b.id);
 if(!p||!integer(dims.width,15,48)||!integer(dims.depth,12,40)||
  !integer(dims.floors,2,10)||dims.floors!==6||
  ref.floors.length!==6||b.floors.length!==6||b.stairs.length!==5||
  p.dimensions.width!==dims.width||p.dimensions.depth!==dims.depth||p.dimensions.floors!==dims.floors||
  !['north','east','south','west'].includes(p.orientation)||
  !Number.isSafeInteger(p.seed)||p.seed<0||
  !['hotel','office','apartment'].includes(p.program)||
  ref.floorHeightNominal!==(p.program==='hotel'?5:4))fail('CANDIDATE_LINK');
 const rects=p.sourcePredictedRectangles;
 if(!Array.isArray(rects)||rects.some(r=>![r.x,r.z,r.width,r.depth,r.start,r.end].every(Number.isSafeInteger)||
  r.width<=0||r.depth<=0||r.start<0||r.end>dims.floors||r.start>=r.end||
  r.x<0||r.z<0||r.x+r.width>dims.width||r.z+r.depth>dims.depth))fail('FOOTPRINT');
 const floors=b.floors.map((f,i)=>makeFloorReview(b,ref,f,i));
 const cuts=[];
 for(const stair of b.stairs){
  const target=b.floors.findIndex(f=>f.id===stair.toFloor);
  const source=b.floors.findIndex(f=>f.id===stair.fromFloor);
  if(source<0||target!==source+1||target>=b.floors.length||
   stair.cutoutStatus!=='CANDIDATE_NOT_CUT'||stair.commands?.length!==0||
   stair.cutoutCandidateCells.length!==2||new Set(stair.cutoutCandidateCells.map(cellKey)).size!==2||
   stair.engineFloorOperationOverride!==false||stair.worldCoordinates!==null)fail('STAIR_UNSAFE');
  const collisionCells=[];
  for(const c of stair.cutoutCandidateCells){
   if(!integer(c.x,0,dims.width-1)||!integer(c.z,0,dims.depth-1))fail('STAIR_BOUNDS');
   if(rects.some(r=>inside(c,r,target)))collisionCells.push({...c});
  }
  cuts.push({id:stair.id,upperFloorId:stair.toFloor,candidateCount:2,
   predictedFloorPlateOverlapCells:collisionCells,
   previewFloorCutoutRequired:collisionCells.length>0,
   floorPlateCutoutImplemented:false,materialState:null,
   support:'UNVERIFIED',headroom:'UNVERIFIED',
   permittedAction:'DIAGNOSTIC_ONLY_NO_FLOOR_MODIFICATION'});
 }
 return {id:b.id,plannerBoundary:{
   normalizedInputFieldObservations:{program:p.program,width:dims.width,depth:dims.depth,
    floors:dims.floors,floorHeight:ref.floorHeightNominal,style:p.style,massing:p.massing,
    seed:p.seed,orientation:p.orientation},
   isExecutablePlannerInput:false,notPassedToCreateComposition:true,
   incompatibleWithLiveMaterialPipeline:true},
  floors,stairFloorPlateDiagnostics:cuts,
  totals:{wallIntents:floors.reduce((s,f)=>s+f.plannedPartitionPanels,0),
   doorIntents:floors.reduce((s,f)=>s+f.doorPorts,0),
   stairLinks:cuts.length,predictedFloorPlateOverlaps:cuts.reduce((s,c)=>s+c.predictedFloorPlateOverlapCells.length,0)},
  engineCallCount:0,blocksGenerated:0,executed:false};
}
export function compileEngineBoundaryB30(assembly,b7,b17,{snapshotInspection=null}={}){
 if(assembly?.schema!=='minecraftaibuilder-b29-m3-m4-assembly-ir-v1'||
  assembly.deployment!=='BLOCKED'||assembly.readiness!=='NOT_PREPARED'||
  assembly.BuildPlan?.operations?.length!==0||assembly.BuildPlan?.materialIds?.length!==0||
  assembly.BuildPlan?.worldCoordinates!==null||assembly.safety?.constructionApproved!==false||
  assembly.unresolvedGates?.length!==9||assembly.unresolvedGates.some((g,i)=>g.id!==BLOCKED[i]||g.status!=='BLOCKED'))fail('ASSEMBLY_GATE');
 if(snapshotInspection!==null&&(snapshotInspection.status!=='ARCHIVED_DISK_SOURCE_ONLY'||
  snapshotInspection.matchedFileCount!==9||snapshotInspection.runtimeIdentityAttested!==false||
  snapshotInspection.constructionOperations!==0))fail('SOURCE_INSPECTION');
 if(assembly.buildings?.length!==5||b17.buildings?.length!==5||b7.candidates?.length!==5)fail('BUILDING_COUNT');
 const refs=new Map(b17.buildings.map(b=>[b.id,b]));
 if(refs.size!==5||new Set(assembly.buildings.map(b=>b.id)).size!==5)fail('BUILDING_IDS');
 const buildings=assembly.buildings.map(b=>{
  const ref=refs.get(b.id);if(!ref)return fail('MISSING_REFERENCE');
  return reviewBuilding(b,ref,b7);
 });
 const totals={buildings:5,floors:buildings.reduce((s,b)=>s+b.floors.length,0),
  wallPanelIntents:buildings.reduce((s,b)=>s+b.totals.wallIntents,0),
  doorPorts:buildings.reduce((s,b)=>s+b.totals.doorIntents,0),
  stairLinks:buildings.reduce((s,b)=>s+b.totals.stairLinks,0),
  slabCutoutCandidateCells:buildings.reduce((s,b)=>s+b.totals.predictedFloorPlateOverlaps,0),
  mappedMaterialRoles:0,verifiedPhysicalDoors:0,actualFloorCutouts:0,engineCalls:0,
  operationsEmitted:0};
 if(totals.floors!==30||totals.wallPanelIntents!==5704||totals.doorPorts!==314||
    totals.stairLinks!==25||totals.slabCutoutCandidateCells!==50||
    assembly.totals.sharedWallVoxelIntents!==3990)fail('COUNTS');
 const data={schema:'minecraftaibuilder-step8b-b30-engine-boundary-v1',
  kind:'INERT_ENGINE_BOUNDARY_OBSERVATION_NOT_A_BUILDPLAN',
  sourceEvidence:{b29AssemblySha256:assembly.reportSha256,
   b7FrozenReportSha256:b7.reportSha256,b17FrozenReportSha256:b17.reportSha256,
   snapshotInspection:snapshotInspection??{status:'NOT_RECHECKED_IN_THIS_RUN',runtimeIdentityAttested:false},
   engineRuntimeAttested:false,engineModuleImported:false,plannerInvoked:false},
  engineAPI:{compositionNormalization:'createComposition(input)',
   operationSynthesis:'GeneralBuildingPlanner.fromComposition(composition, options)',
   finalSafety:'validateBuildPlan(plan)',
   floorPlateEmitter:'plate(mask, base, "floor", "floor")',
   interiorEmitterWired:false,doorStatesResolved:false,stairSlabCutoutsImplemented:false,
   plannerCallAuthorized:false},
  buildings,totals,materialRoles:assembly.materialRoleContract.map(x=>({role:x.role,blockId:null,
    acceptedInLiveWorld:false,binding:'BLOCKED'})),
  office02:{originalMismatchCells:123,originalCorridorOutsideCells:18,
   alternativesCount:assembly.office02.alternatives.length,candidateApplied:false},
  blockerIds:[...BLOCKED],unresolvedCount:9,readiness:'NOT_PREPARED',deployment:'BLOCKED',
  safety:{constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,
   engineImported:false,engineCalled:false,projectFilesModified:false,legacyModified:false,
   archivedEvidenceModified:false,buildOperations:0},
  BuildPlan:PLAN(),physicalValidated:false};
 if(data.materialRoles.length!==5||data.office02.alternativesCount!==4||
    data.materialRoles.some(x=>x.blockId!==null))fail('MATERIAL_MAPPING');
 return {...data,reportSha256:hash(data)};
}
/** The root is immutable B29; a provided external assembly is verified byte-for-byte against B29. */
export function buildEngineBoundaryB30(root,{snapshotRoot=null,assembly=null}={}){
 if(typeof root!=='string'||!root)fail('ROOT');
 const frozen=checkRawBaseline(root);
 safeExternalAssembly(assembly,root);
 const fixed=buildAssemblyB29(root);
 if(hash(fixed)!==hash(frozen.b29))fail('B29_REGEN_DIFFERENCE');
 const inspection=snapshotRoot===null?null:inspectB30Snapshot(snapshotRoot,root);
 return compileEngineBoundaryB30(fixed,frozen.b7,frozen.b17,{snapshotInspection:inspection});
}
export function validateEngineBoundaryB30(report,root,opts={}){
 if(report?.schema!=='minecraftaibuilder-step8b-b30-engine-boundary-v1'||
  report?.deployment!=='BLOCKED'||report?.readiness!=='NOT_PREPARED'||
  report?.sourceEvidence?.engineRuntimeAttested!==false||
  report?.engineAPI?.plannerCallAuthorized!==false||
  report?.engineAPI?.interiorEmitterWired!==false||
  report?.BuildPlan?.status!=='NOT_PREPARED'||
  !Array.isArray(report.BuildPlan.operations)||report.BuildPlan.operations.length!==0||
  report.BuildPlan.commandCount!==0||report.BuildPlan.worldCoordinates!==null||
  report.BuildPlan.materialIds?.length!==0||report?.safety?.constructionApproved!==false||
  report.safety.engineCalled!==false||report.safety.buildOperations!==0||
  report.unresolvedCount!==9||report.blockerIds?.length!==9)fail('REPORT_GATE');
 const {reportSha256,...body}=report;
 if(hash(body)!==reportSha256)fail('REPORT_HASH');
 // Re-evaluate pinned inputs so recalculating the report hash cannot launder a modification.
 const regenerated=buildEngineBoundaryB30(root,opts);
 if(hash(report)!==hash(regenerated))fail('REPORT_MISMATCH');
 return true;
}
export function summarizeEngineBoundaryB30(r){
 if(r?.schema!=='minecraftaibuilder-step8b-b30-engine-boundary-v1')fail('SUMMARY_SCHEMA');
 return {schema:r.schema,kind:r.kind,sourceEvidence:r.sourceEvidence,engineAPI:r.engineAPI,
  totals:r.totals,materialRoles:r.materialRoles,office02:r.office02,
  blockerIds:r.blockerIds,unresolvedCount:r.unresolvedCount,readiness:r.readiness,
  deployment:r.deployment,BuildPlan:r.BuildPlan,safety:r.safety,reportSha256:r.reportSha256};
}
