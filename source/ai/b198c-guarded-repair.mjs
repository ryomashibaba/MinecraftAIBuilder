/**
 * B198C: a strictly source-evidenced, MODEL-DRIVEN controlled repair.
 * The model invents the fix. The local engine does NOT fabricate
 * geometry from defect keywords or silently apply an unsafe revision.
 * Inherited IDs, original source voxels and formerly open galleries are
 * rechecked after the proposal. Output is an OFFLINE CANDIDATE only.
 */
import {createHash} from 'node:crypto';
import {compileDesign,validateDesign} from './b143-building-dsl.mjs';
import {proposeArchitecture,readModelProposal} from './b198-natural-language-design.mjs';
import {inspectProtectedVoxelFidelity}
 from './b198b-architecture-quality.mjs';
import {auditInteriorTopology,critiqueArchitecture,SCHEMA}
 from './b198c-spatial-critic.mjs';
const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const assert=(ok,s)=>{if(!ok)throw Error('B198C_'+s)};
function protectedSourceSquares({baseCompiled,proposalCompiled}){
 const b=new Set(baseCompiled.primitives.map(p=>key(p[0],p[1],p[2])));
 const next=new Set(proposalCompiled.primitives.map(p=>key(p[0],p[1],p[2])));
 let preserved=0,blocked=0,checked=0;
 for(const [x,y,z] of baseCompiled.primitives){
  let oldClear=true;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   const a=x+dx,c=z+dz;
   if(!b.has(key(a,y,c))||b.has(key(a,y+1,c))||b.has(key(a,y+2,c))){
    oldClear=false;break;
   }
  }
  if(!oldClear)continue;
  checked++;
  let unchanged=true;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   const a=x+dx,c=z+dz;
   if(!next.has(key(a,y,c))||
     next.has(key(a,y+1,c))||next.has(key(a,y+2,c))){
    unchanged=false;break;
   }
  }
  if(unchanged)preserved++;else blocked++;
 }
 return {originalTwoWideOpenFootprints:checked,
  preservedTwoWideOpenFootprints:preserved,
  damagedTwoWideOpenFootprints:blocked,
  allOriginalLocalFloorSquaresPreserved:blocked===0,
  actualMinecraftWalkingStillNotCertified:true};
}
export async function proposeGuardedArchitecturalRepair({
 userGoal,generator,baseDesign,expectedBaseSha256,
 protectedElementIds,
 minimumLargestConnectedGain=2,
 maxSourceVoxelGrowth=30000,
 maxChangedElements=18
}={}){
 assert(typeof userGoal==='string'&&userGoal.length>=12&&
  userGoal.length<=3500,'INVALID_REPAIR_GOAL');
 assert(typeof generator==='function','GENUINE_MODEL_ADAPTER_REQUIRED');
 validateDesign(baseDesign);
 const base=compileDesign(baseDesign);
 assert(expectedBaseSha256===base.sourceSha256,
  'STALE_MODEL_BEFORE_ANY_GENERATION');
 assert(Array.isArray(protectedElementIds)&&
  protectedElementIds.length>=1&&
  new Set(protectedElementIds).size===protectedElementIds.length,
  'EXPLICIT_PROTECTED_PARTS_REQUIRED');
 assert(Number.isSafeInteger(minimumLargestConnectedGain)&&
  minimumLargestConnectedGain>=1&&minimumLargestConnectedGain<=20000,
  'INVALID_IMPROVEMENT_TARGET');
 assert(Number.isSafeInteger(maxSourceVoxelGrowth)&&
  maxSourceVoxelGrowth>=1&&maxSourceVoxelGrowth<=50000,
  'INVALID_SOURCE_GROWTH_BUDGET');
 const before=critiqueArchitecture({design:baseDesign,compiled:base});
 const initial=before.objectiveAudit;
 const goal=userGoal+'\n\nREQUIRED SOURCE-ONLY QUALITY CRITIQUE:\n'+
  JSON.stringify({highRiskFindings:before.findings,
   initialLargestSupported2WideConnectedFloor:initial.largestSameLevelConnectedSquareCount,
   targetedMinimumLargest2WideConnectedFloor:
    initial.largestSameLevelConnectedSquareCount+minimumLargestConnectedGain,
   sourceOnly:true,originalFloorSquaresMustRemainClear:true}).slice(0,2600)+
  '\nGenerate a REAL revised B143 design, retaining all protected named'+
  ' source components and real originally open 2wide floor footprints.'+
  ' Do not claim physical player walking, world writes or unverified AI semantic success.';
 let lastAssessment=null;
 const candidateGenerator=async request=>{
  const raw=await generator({...request,
   sourceCritique:before,
   sourceImprovementGoal:{
    metric:'largestSameLevelConnectedSquareCount',
    minimumGain:minimumLargestConnectedGain}});
  const candidate=readModelProposal(raw);
  const proposed=compileDesign(candidate.design);
  const audit=auditInteriorTopology({design:candidate.design,compiled:proposed});
  const fidelity=inspectProtectedVoxelFidelity({
   baseDesign,revisionDesign:candidate.design,protectedElementIds});
  const clearance=protectedSourceSquares({
   baseCompiled:base,proposalCompiled:proposed});
  lastAssessment={audit,fidelity,clearance};
  assert(fidelity.exactProtectedVoxelPreservationPassed,
   'REVISION_DAMAGES_PROTECTED_SOURCE_VOXELS');
  assert(clearance.allOriginalLocalFloorSquaresPreserved,
   'REVISION_BLOCKS_HISTORIC_OPEN_GALLERIES');
  assert(proposed.primitives.length-base.primitives.length<=maxSourceVoxelGrowth,
   'REPAIR_VOXEL_GROWTH_EXCEEDS_BUDGET');
  assert(audit.largestSameLevelConnectedSquareCount>=
   initial.largestSameLevelConnectedSquareCount+minimumLargestConnectedGain,
   'NO_VERIFIED_CONNECTED_FLOOR_IMPROVEMENT');
  return raw;
 };
 const produced=await proposeArchitecture({
  prompt:goal,generator:candidateGenerator,
  baseDesign,expectedBaseSha256,
  protectedElementIds,maxChangedElements,
  allowRemovals:false,maxAttempts:2});
 const after=critiqueArchitecture({design:produced.design,compiled:produced.compiled});
 const actualGain=after.objectiveAudit.largestSameLevelConnectedSquareCount-
  initial.largestSameLevelConnectedSquareCount;
 assert(actualGain>=minimumLargestConnectedGain,'POSTCOMPILATION_NO_SOURCE_IMPROVEMENT');
 const evidence={
  schema:SCHEMA,
  status:'VERIFIED_SOURCE_REPAIR_PROPOSAL_REVIEW_ONLY',
  inheritedSourceSha256:base.sourceSha256,
  revisedSourceSha256:produced.compiled.sourceSha256,
  sourceRevisionDiff:produced.review.revisionDiff,
  attempts:produced.review.attemptCount,
  requestedGain:minimumLargestConnectedGain,
  verifiedLargest2WideConnectedSquareGain:actualGain,
  before,after,
  sourceProtectedVoxelProof:lastAssessment.fidelity,
  inheritedFloorClearanceProof:lastAssessment.clearance,
  allVisualAndLanguageQualityHumanReviewStillRequired:true,
  actualMinecraftWalkingCertified:false,
  constructionApproved:false,
  readiness:'NOT_PREPARED',
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},
  evidenceSha256:H({initial:base.sourceSha256,final:produced.compiled.sourceSha256,
   gain:actualGain})
 };
 return {design:produced.design,compiled:produced.compiled,evidence};
}
