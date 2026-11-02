/**
 * R125 private evidence review: 0 model calls, 0 world contacts/writes, 0 file
 * modifications. Recompile MODEL_RESPONSE_ORIGINAL.txt, then verify every
 * saved B143 source/voxel/QA receipt against the actual original model JSON.
 * A matching replay does NOT independently attest a provider or human art.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan,auditArchitecturePlanCirculation,
 assessR125ProgramGeometry} from '../source/ai/r125-architecture-plan.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {inspectRoofAir} from './r125-roof-interior-study.mjs';

const digest=s=>createHash('sha256').update(s,'utf8').digest('hex');
const hold=s=>{throw Error('R125_PRIVATE_REVIEW_'+s);};
const same=(a,b,name)=>{if(!isDeepStrictEqual(a,b))hold('MISMATCH_'+name);};
function read(dir,name,maxBytes=16000000){
 const location=path.join(dir,name);
 const stat=fs.lstatSync(location);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>maxBytes)
  hold('UNSAFE_OR_MISSING_'+name);
 return fs.readFileSync(location,'utf8');
}
const json=(dir,name)=>JSON.parse(read(dir,name));
export function reviewSavedR125(studyDir){
 if(typeof studyDir!=='string'||!path.isAbsolute(studyDir))hold('ABSOLUTE_STUDY_REQUIRED');
 const dir=fs.realpathSync(studyDir);
 if(!fs.statSync(dir).isDirectory())hold('NOT_A_DIRECTORY');
 const report=json(dir,'R125_SEMANTIC_REPORT.json');
 const raw=read(dir,'MODEL_RESPONSE_ORIGINAL.txt',15000);
 const plan=JSON.parse(raw);
 if(report.schema!=='r125-real-semantic-pilot-v1'||
    !['SOURCE_AND_3D_READY_HUMAN_REVIEW_REQUIRED','HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE'].includes(report.status)||
    report.modelCalls!==1||report.originalRawCaptured!==true||
    report.providerFinishReason!=='stop'||report.world?.readiness!=='NOT_PREPARED'||
    report.world?.worldWrites!==0||report.world?.worldContacts!==0||
    report.world?.constructionApproved!==false||
    report.world?.executionAllowed!==false||
    report.world?.BuildPlan?.operations?.length!==0||
    report.world?.gates?.length!==9||
    report.world.gates.some(g=>g!=='BLOCKED')||
    report.testInjectionPresent!==(report.status==='HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE'))
  hold('REPORTED_SOURCE_OR_SAFETY_RECEIPT');

 same(json(dir,'ARCHITECTURE_PLAN.json'),plan,'SAVED_PLAN_VS_RAW');
 const product=compileArchitecturePlan(plan);
 same(json(dir,'B143_SOURCE.json'),product.design,'B143_SOURCE');
 same(json(dir,'B143_SCENE.json'),product.compiled,'B143_SCENE');
 if(report.planSha256!==product.planSha256||
    report.sourceSha256!==product.sourceSha256||
    report.geometrySha256!==product.geometrySha256||
    report.sourceVoxelCount!==product.compiled.primitives.length)
  hold('R125_HASHES_OR_VOXEL_COUNT');
 const critique=critiqueArchitecture({design:product.design,compiled:product.compiled});
 const circulation=auditArchitecturePlanCirculation(product);
 const floors=assessR125ProgramGeometry(product,critique);
 same(json(dir,'B198C_GEOMETRY_CRITIQUE.json'),critique,'B198C_CRITIQUE');
 same(json(dir,'R125_SOURCE_CIRCULATION_AUDIT.json'),circulation,'CIRCULATION');
 same(json(dir,'R125_PROGRAM_FLOOR_RISK.json'),floors,'PROGRAM_FLOOR_RISK');
 same(json(dir,'ZONE_PROGRAM.json'),product.program,'PROGRAM_ZONES');
 if(report.sourceHighRiskFindings!==critique.highRiskCount||
    report.sourceCirculationStatus!==circulation.status||
    report.sourceCirculationFindings!==circulation.failures.length||
    report.programFloorStatus!==floors.status||
    report.programFloorIssues!==floors.programFloorIssues.length||
    report.nonProgramExteriorAdvisories!==floors.exteriorSurfaceAdvisories.length)
  hold('SUMMARY_MISMATCH');
 if(circulation.status!=='SOURCE_CLEARANCE_PROBES_PASS'||
    floors.programFloorIssues.length!==0)
  hold('REPLAY_FUNCTION_NOT_READY');

 let roof=null;
 if(plan.expression?.roofVolume==='raised'){
  const decorative=structuredClone(plan);
  delete decorative.expression.roofVolume;
  const hostCounterfactual=compileArchitecturePlan(decorative);
  const result=inspectRoofAir(hostCounterfactual,product);
  roof={
   ...result,modelPlanSha256:product.planSha256,
   actualModelPlanGeometrySha256:product.geometrySha256,
   hostCounterfactualDecorativeGeometrySha256:hostCounterfactual.geometrySha256,
   actualAuthorship:'MODEL_CHOSE_ROOF_INTENT_HOST_BUILT_GEOMETRY',
   comparisonAuthorship:'HOST_ONLY_NOT_SECOND_MODEL_OUTPUT',
   humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
   constructionApproved:false,worldWrites:0
  };
  same(json(dir,'R125_MODEL_ROOF_INTERIOR_SOURCE_EVIDENCE.json'),roof,
   'SAVED_ROOF_SOURCE_EVIDENCE');
  same(report.roofInteriorSourceEvidence,roof,'REPORTED_ROOF_SOURCE_EVIDENCE');
  if(result.flatRoofBaseRetained||result.newCeilingAirCells<=0||
     result.highAirColumns<=0||result.twoWideHighRoofPads<=0||
     result.verticallyConnectedTwoWideRoofPads<=0||
     result.unclosedEaveOrEndCells!==0||result.unclosedStepCells!==0)
   hold('ROOF_INTERNAL_GEOMETRY');
 }else if(report.roofInteriorSourceEvidence!==null)hold('UNEXPECTED_ROOF_EVIDENCE');
 if(report.roofRequest?.usableInteriorRequired&&!roof)
  hold('REQUESTED_REAL_ROOF_MISSING');
 if(report.roofRequest?.profile &&
    report.roofRequest.profile!==plan.expression?.roofProfile)
  hold('REQUESTED_PROFILE_NOT_MODEL_AUTHORED');
 const selected=plan.expression?{
  profile:plan.expression.roofProfile??null,
  axis:plan.expression.roofAxis??null,
  volume:plan.expression.roofVolume??'DECORATIVE_FLAT_CAP'
 }:null;
 same(report.modelSelectedRoof,selected,'MODEL_SELECTED_ROOF');
 const exterior=floors.exteriorSurfaceAdvisories;
 const unresolved=exterior.filter(x=>x.classification!=='ROOF_ONLY_NONPROGRAM_SURFACE');
 const output={
  schema:'r125-saved-private-source-review-v1',
  status:report.testInjectionPresent?'SOURCE_REPLAY_MATCHED_TEST_DOUBLE_ONLY':
   unresolved.length?'SOURCE_REPLAY_MATCHED_EXTERIOR_HOLD':
   'SOURCE_REPLAY_MATCHED_ART_AND_WORLD_PENDING',
  originalRawSha256:digest(raw),
  declaredModel:report.model,
  provenance:report.testInjectionPresent?'TEST_DOUBLE_NOT_REAL_INFERENCE':
   'LOCAL_MODEL_RUN_REPORTED_NOT_INDEPENDENTLY_ATTESTED',
  originalBytes:Buffer.byteLength(raw,'utf8'),
  savedSourceAndSceneMatchFreshCompilation:true,
  planSha256:product.planSha256,sourceSha256:product.sourceSha256,
  geometrySha256:product.geometrySha256,
  finalVoxelCount:product.compiled.primitives.length,
  programFloorIssues:floors.programFloorIssues,
  entranceAndCirculationSourceStatus:circulation.status,
  highFindings:critique.findings.filter(f=>f.severity==='HIGH'),
  exteriorAdvisories:exterior,
  unresolvedExteriorAdvisories:unresolved.length,
  roofActualSourceMetrics:roof?{
   profile:roof.roofProfile,axis:roof.roofAxis,
   newCeilingAirCells:roof.newCeilingAirCells,
   verticallyConnectedTwoWideRoofPads:roof.verticallyConnectedTwoWideRoofPads,
   unclosedEaveOrEndCells:roof.unclosedEaveOrEndCells,
   unclosedStepCells:roof.unclosedStepCells
  }:null,
  humanArt:'NOT_REVIEWED',realMinecraftWalking:'NOT_TESTED',
  semanticMatch:'NOT_REVIEWED',worldConstruction:'NOT_PREPARED',
  noFilesModified:true,modelCallsByReview:0,worldContacts:0,worldWrites:0
 };
 return output;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--study')
   hold('USAGE_node_scripts/r125-saved-semantic-review.mjs_--study_ABSOLUTE_FOLDER');
  console.log(JSON.stringify(reviewSavedR125(process.argv[3]),null,2));
 }catch(e){
  console.error('R125_SAVED_REVIEW_HOLD',String(e?.message??e));
  process.exitCode=2;
 }
}
