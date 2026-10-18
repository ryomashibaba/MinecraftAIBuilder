/**
 * B198E: original ChatGPT-in-Chat-authored architecture evidence.
 * Four of twelve B198B prompts and four matching revisions. This does
 * NOT measure automated model adapter instruction-following or claim any
 * human aesthetic scores. Design geometry is real strict B143 source.
 */
import {createHash} from 'node:crypto';
import {getB198EChatAuthoredPilot} from './b198e-chat-authored-pilot.mjs';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {CREATION_CASES,REVISION_CASES,verifyBenchmark}
 from './b198b-benchmark-cases.mjs';
import {inspectSourceGeometry,evaluateSourceGoals,
 inspectProtectedVoxelFidelity,emptyHumanRubric}
 from './b198b-architecture-quality.mjs';
import {critiqueArchitecture} from './b198c-spatial-critic.mjs';
import {diffSourceDesigns} from './b198-natural-language-design.mjs';
export const SCHEMA='minecraftaibuilder-b198e-inchat-architectural-pilot-v1';
const digest=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const assert=(b,s)=>{if(!b)throw Error('B198E_'+s)};
const pos=(x,y,z)=>[x,y,z].join(',');
const SAMPLES={
 c01:[
  {id:'lib-central-void-y28',air:[42,28,35]},
  {id:'lib-central-void-y43',air:[42,43,35]},
  {id:'lib-observation-floor',solid:[42,57,35]},
  {id:'lib-left-readers-floor',solid:[20,19,30]},
  {id:'lib-right-readers-floor',solid:[63,19,30]}
 ],
 c03:[
  {id:'port-heavy-quay',solid:[25,7,20]},
  {id:'port-passenger-terrace',solid:[25,11,60]},
  {id:'port-control-high',solid:[84,46,50]},
  {id:'port-crane-high',solid:[70,57,23]}
 ],
 c05:[
  {id:'temple-approach',solid:[45,5,15]},
  {id:'temple-first-roof',solid:[45,31,50]},
  {id:'temple-second-roof',solid:[45,42,50]},
  {id:'temple-third-roof',solid:[45,56,50]}
 ],
 c08:[
  {id:'station-platform-a',solid:[45,16,12]},
  {id:'station-platform-b',solid:[45,16,28]},
  {id:'station-platform-c',solid:[45,16,44]},
  {id:'station-concourse',solid:[45,39,29]},
  {id:'station-top-suspended-canopy',solid:[45,62,16]}
 ]
};
const K=(p)=>p.slice(0,3).join(',');
function checkOriginalFloorIntegrity(original,revision){
 const oldSet=new Set(original.primitives.map(K));
 const newSet=new Set(revision.primitives.map(K));
 let original2wide=0,damaged2wide=0;
 for(const [x,y,z] of original.primitives){
  let clear=true;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   const k=(a,b,c)=>pos(a,b,c),a=x+dx,c=z+dz;
   if(!oldSet.has(k(a,y,c))||
      oldSet.has(k(a,y+1,c))||
      oldSet.has(k(a,y+2,c)))clear=false;
  }
  if(!clear)continue;
  original2wide++;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   const k=(a,b,c)=>pos(a,b,c),a=x+dx,c=z+dz;
   if(!newSet.has(k(a,y,c))||
     newSet.has(k(a,y+1,c))||
     newSet.has(k(a,y+2,c)))clear=false;
  }
  if(!clear)damaged2wide++;
 }
 return {originalSourceSupportedTwoWideSquares:original2wide,
  damagedByRevision:damaged2wide,
  allOriginalSourceClearancePreserved:damaged2wide===0,
  actualMinecraftWalkingNotTested:true};
}
export function inspectB198EChatPilot(){
 assert(verifyBenchmark(),'BENCHMARK_REPLACED');
 const authored=getB198EChatAuthoredPilot();
 assert(Object.keys(authored.created).length===4&&
  Object.keys(authored.revised).length===4,'FOUR_PLUS_FOUR_SCOPE');
 assert(authored.liveAPIResponsesObserved===0&&
  authored.paidAPITokensConsumed===0,'NO_PAYMENT_OR_REAL_ADAPTER');
 const creations=[],revisions=[],cById=new Map();
 for(const [id,design] of Object.entries(authored.created)){
  const spec=CREATION_CASES.find(x=>x.id===id);
  assert(spec,'UNKNOWN_CREATION_BENCHMARK_'+id);
  const scene=compileDesign(design),geometry=inspectSourceGeometry({
   design,compiled:scene});
  assert(verifyCompiled(design,scene),'NONDETERMINISTIC_SOURCE_'+id);
  const goals=evaluateSourceGoals(spec,geometry);
  const occupancy=new Set(scene.primitives.map(K));
  const landmarks=SAMPLES[id].map(s=>({
   id:s.id,coordinate:s.solid??s.air,
   expectedState:s.solid?'SOURCE_OCCUPIED':'SOURCE_AIR',
   actualSourceSatisfied:s.solid?
    occupancy.has(pos(...s.solid)):!occupancy.has(pos(...s.air))
  }));
  const review=critiqueArchitecture({design,compiled:scene});
  const output={
   caseId:id,genre:spec.genre,
   language:'ja',
   candidateProvenance:'AUTHORED_BY_CHATGPT_IN_CURRENT_CHAT_NOT_LIVE_PROVIDER_RUN',
   naturalLanguageRequest:spec.prompt,
   sourceDesign:design,sourceSha256:scene.sourceSha256,
   compiledGeometrySha256:scene.geometrySha256,
   exactSourceVoxels:scene.primitives.length,
   authoredPartCount:design.elements.length,
   sourceObjectiveGoals:goals,geometryAudit:geometry,
   spatialRiskFindings:review.findings,
   fixedCoordinateArchitecturalSamples:landmarks,
   fixedCoordinateSamplesPassed:landmarks.filter(s=>s.actualSourceSatisfied).length,
   humanSemanticRubric:emptyHumanRubric(spec),
   artisticQualityHumanReviewed:false,
   promptSemanticsIndependentlyVerified:false,
   MinecraftWalkingCertified:false,worldWrites:0
  };
  creations.push(output);cById.set(id,{design,scene});
 }
 for(const [id,design] of Object.entries(authored.revised)){
  const spec=REVISION_CASES.find(x=>x.id===id);
  assert(spec,'UNKNOWN_REVISION_BENCHMARK_'+id);
  const base=cById.get(spec.baseCaseId);
  assert(base,'BASE_NOT_GENERATED_'+id);
  const scene=compileDesign(design);
  assert(verifyCompiled(design,scene),'UNVERIFIED_REVISION_'+id);
  const delta=diffSourceDesigns(base.design,design);
  const protectedSourceElements=authored.protectedIds[id];
  const protectedVoxels=inspectProtectedVoxelFidelity({
   baseDesign:base.design,revisionDesign:design,
   protectedElementIds:protectedSourceElements});
  const originalFloors=checkOriginalFloorIntegrity(base.scene,scene);
  revisions.push({
   caseId:id,baseCaseId:spec.baseCaseId,prompt:spec.prompt,
   candidateProvenance:'AUTHORED_BY_CHATGPT_IN_CURRENT_CHAT_NOT_LIVE_PROVIDER_RUN',
   sourceDesign:design,sourceSha256:scene.sourceSha256,
   sourceGeometrySha256:scene.geometrySha256,
   exactVoxelChange:scene.primitives.length-base.scene.primitives.length,
   sourceChangeList:delta,
   protectedOriginalElementIds:protectedSourceElements,
   protectedVoxels,
   originalFloors,
   humanSemanticRubric:emptyHumanRubric(spec),
   promptSemanticsIndependentlyVerified:false,
   MinecraftWalkingCertified:false,worldWrites:0});
 }
 const failedGoals=creations.filter(c=>c.sourceObjectiveGoals.status!=='SOURCE_GOALS_PASS');
 const failedSourceSamples=creations.filter(c=>c.fixedCoordinateSamplesPassed!==
  c.fixedCoordinateArchitecturalSamples.length);
 const damaged=revisions.filter(c=>
  !c.protectedVoxels.exactProtectedVoxelPreservationPassed||
  !c.originalFloors.allOriginalSourceClearancePreserved);
 return {schema:SCHEMA,
  provenance:authored.provenance,
  scope:'4_OF_12_CREATIONS_PLUS_4_OF_4_EDITS',
  targetedCreationCases:Object.keys(authored.created),
  notRunCreationCases:authored.unattemptedCreationCases,
  targetedRevisionCases:Object.keys(authored.revised),
  generationMethod:'GPT6_IN_CHAT_MANUAL_SOURCE_AUTHORING_NOT_UNATTENDED_MODEL_API',
  modelProviderRequests:0,
  separatelyBilledAPITokensConsumed:0,
  originalRealWorldBuildingWrites:0,
  sourcesOnExistingMinecraftWorldChanged:false,
  objectiveSourcePassingCount:creations.length-failedGoals.length,
  objectiveSourceSampleFailures:failedSourceSamples.map(s=>s.caseId),
  revisionProtectionFailures:damaged.map(s=>s.caseId),
  actualHumanQualityRatingsProvided:0,
  actualProductionLLMInvocationResultsProvided:0,
  full12GenreBenchmarkCompleted:false,
  modelInstructionFollowingAccuracyCertified:false,
  independentlyHumanRatedAesthetics:false,
  actualMinecraftPlayerCirculationCertified:false,
  worldReadiness:'NOT_PREPARED',
  worldConstructionGates:Array(9).fill('BLOCKED'),
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,BuildPlan:{operations:[]},
  sourceReportSha256:digest({
   creation:creations.map(c=>c.sourceSha256),
   revision:revisions.map(c=>c.sourceSha256),
   method:authored.provenance
  }),
  creations,revisions};
}
