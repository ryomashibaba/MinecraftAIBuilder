/**
 * R34 offline evidence comparison. Never runs Qwen, Minecraft or network.
 * The historical R25 baseline is user-reported; raw original is NOT available
 * in this module and cannot be re-verified. No candidate means no new result.
 * A supplied response is NOT authenticated as actual model output.
 */
import {createHash} from 'node:crypto';
import {reviewR4PlannedProposal} from '../source/ai/b198zr4-planned-source.mjs';
import {R25_ORIGINAL_SHA256} from './b198zr33-future-trial-readiness-offline.mjs';

export const SCHEMA='minecraftaibuilder-b198zr34-evidence-comparison-v1';
export const R34_R25_BASELINE=Object.freeze({
 source:'USER_REPORTED_WINDOWS_R25_R27_NOT_RELOADED',
 originalSha256:R25_ORIGINAL_SHA256,
 originalRawBytesAvailableHere:false,
 originalElements:36,
 originalStrictB143Status:'FAIL_CUT_MATERIAL',
 invalidCutMaterialCount:5,
 originalFormalGeometryStatus:'NOT_PASSED',
 originalIndependentR3Status:'NOT_PASSED',
 historicalWhatIf:Object.freeze({
  source:'R27_IN_MEMORY_REMOVAL_OF_FIVE_CUT_MATERIAL_FIELDS_ONLY',
  isOriginal:false,notOriginalModelOutput:true,
  strictB143CompiledAfterMutation:true,
  conceptualFinalVoxelCount:53832,
  standablePositions:256,connectedComponents:6,largestComponent:100,
  entrance:[23,0,44],entranceStandable:false,
  readingWest:{occupied:1200,total:1200,standable:0},
  readingEast:{occupied:1200,total:1200,standable:0},
  lounge:{occupied:144,total:144,standable:0},
  independentR3Status:'HOLD'
 }),
 architecturalQuality:'NOT_INDEPENDENTLY_ASSESSED',
 modelQualityImprovementEstablished:false
});
export const R34_AXES=Object.freeze([
 {id:'RAW_PROVENANCE',rule:'Retain exact UTF-8 raw response and SHA256; claimed origin is not authenticated by a text hash.'},
 {id:'STRICT_B143',rule:'Four-key R4 JSON, legal B143 ADD/CUT and successful unmodified compile; never auto-repair.'},
 {id:'FINAL_VOXEL',rule:'Only count final ordered ADD/CUT voxels, not descriptive massing or a mutated what-if.'},
 {id:'MODEL_DECLARED_R3',rule:'Reported plan constraints are self-declared and cannot substitute for independent contract.'},
 {id:'INDEPENDENT_R3',rule:'Separately authored and SHA-pinned entrance, headroom, zones and destinations are required for independent PASS.'},
 {id:'ARCHITECTURAL_QUALITY',rule:'Separate human review of originality, brief alignment and usability; no synthetic geometry score.'},
 {id:'COMPARABILITY',rule:'Do not compare numeric metrics with different denominators, or treat synthetic fixtures as Qwen improvement.'}
]);
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
function errorCode(e){
 const message=String(e?.message||e);
 const match=message.match(/^(B198ZR4_[A-Z0-9_]+|B198_[A-Z0-9_]+|B143_[A-Z0-9_]+|B198ZR3_[A-Z0-9_]+)/);
 return match?.[1]||'STRICT_REVIEW_REJECTED';
}
/**
 * Candidate is user-provided text or a synthetic fixture only; no model-origin
 * verification. expectedSha256 must be a caller-supplied 64-digit digest.
 * Returns only evidence and status, NEVER the raw text or parsed building.
 */
export function compareR34Evidence({candidateRaw=null,expectedSha256=null,
 evidenceKind='USER_SUPPLIED_UNVERIFIED'}={}){
 if(!['USER_SUPPLIED_UNVERIFIED','SYNTHETIC_TEST_FIXTURE'].includes(evidenceKind))
  throw Error('R34_EVIDENCE_KIND');
 const result={
  schema:SCHEMA,
  historicalBaseline:R34_R25_BASELINE,
  comparisonAxes:R34_AXES,
  candidateEvidenceKind:evidenceKind,
  candidateModelOriginAuthenticated:false,
  candidateRawResponseRetainedByThisTool:false,
  candidateOriginalBytesVerified:false,
  independentContractProvided:false,
  candidateHumanQualityReviewPerformed:false,
  architecturalQualityComparison:'NOT_ASSESSED',
  numericImprovementClaim:'NOT_ESTABLISHED',
  actualQwenPerformanceComparison:'NOT_ESTABLISHED',
  originalR25Status:'HOLD',
  futureQwenTrialAuthorized:false,
  futureQwenTrialExecuted:false,
  modelCalls:0,worldContacts:0,worldWrites:0,
  safety:safety()
 };
 if(candidateRaw===null)return {...result,
  status:'NO_CANDIDATE_EVIDENCE',candidateSha256:null,
  candidateStrictB143:'NOT_EVALUATED',
  candidateDeclaredR3:'NOT_EVALUATED',
  candidateIndependentR3:'NOT_EVALUATED'};
 if(typeof candidateRaw!=='string'||candidateRaw.length===0||
    Buffer.byteLength(candidateRaw,'utf8')>60000)
  return {...result,status:'HOLD_CANDIDATE_RAW_SIZE_OR_TYPE',
   candidateStrictB143:'NOT_EVALUATED',candidateDeclaredR3:'NOT_EVALUATED',
   candidateIndependentR3:'NOT_EVALUATED'};
 const candidateSha256=sha(candidateRaw);
 if(typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256)||
    candidateSha256!==expectedSha256)
  return {...result,status:'HOLD_CANDIDATE_RAW_SHA_MISMATCH',
   candidateSha256,candidateStrictB143:'NOT_EVALUATED',
   candidateDeclaredR3:'NOT_EVALUATED',candidateIndependentR3:'NOT_EVALUATED'};
 try{
  const review=reviewR4PlannedProposal(candidateRaw);
  const formal=review.status==='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS';
  const declared=review.declaredPlanReview;
  return {...result,
   status:formal?'CANDIDATE_FORMAL_DECLARED_PASS_NOT_INDEPENDENT':
    'HOLD_CANDIDATE_DECLARED_SPATIAL',
   candidateSha256,candidateOriginalBytesVerified:true,
   candidateStrictB143:'PASS_UNMODIFIED',
   candidateFinalVoxelCount:review.compiled.primitives.length,
   candidateCompiledSourceSha256:review.compiled.sourceSha256,
   candidateDeclaredR3:declared.status,
   candidateIndependentR3:'NOT_EVALUATED_NO_INDEPENDENT_CONTRACT',
   candidateReachablePositions:declared.results.abstractReachablePositions,
   candidateDeclaredDestinationCount:declared.results.destinations.length,
   candidateDeclaredFunctionalZoneCount:declared.results.functionalZones.length,
   candidatePlanProvenance:review.planProvenance
  };
 }catch(e){
  return {...result,status:'HOLD_CANDIDATE_STRICT_REVIEW',
   candidateSha256,candidateOriginalBytesVerified:true,
   candidateStrictB143:'FAIL_OR_NOT_REACHED',
   candidateDeclaredR3:'NOT_EVALUATED',
   candidateIndependentR3:'NOT_EVALUATED',
   rejectionCode:errorCode(e)};
 }
}
