/**
 * R5: Source-provenanced, like-for-like OFFLINE comparison of saved B198B
 * captured model outputs. Never generate, repair, retry or construct a world.
 * Source facts, model identity assertions, and human reviews are separate.
 *
 * R5 is a benchmark instrument, NOT evidence that R4 beat the old Qwen.
 */
import {createHash} from 'node:crypto';
import {CREATION_CASES} from './b198b-benchmark-cases.mjs';
import {readModelProposal} from './b198-natural-language-design.mjs';
import {readR4PlannedProposal,reviewR4PlannedProposal}
 from './b198zr4-planned-source.mjs';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {evaluateB198WSource} from '../../scripts/b198w-quality-review.mjs';
import {scoreHumanRubric} from './b198b-architecture-quality.mjs';

export const SCHEMA='minecraftaibuilder-b198zr5-offline-model-comparison-v1';
const digest=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR5_'+s)};
const yes=(x,s)=>{if(!x)fail(s)};
const hashRx=/^[a-f0-9]{64}$/;
const idRx=/^[a-z][a-z0-9-]{2,47}$/;
const bounded=s=>typeof s==='string'&&s.length>0&&s.length<=60000&&
 Buffer.byteLength(s,'utf8')<=120000;
const only=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).every(k=>fields.includes(k));
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});

function receiptCheck(receipt,{mode,rawSha256,promptSha256}){
 if(receipt===null)return {status:'NO_CAPTURE_RECEIPT',modelId:null,
  provenance:'UNAUTHENTICATED'};
 yes(only(receipt,['schema','mode','rawSha256','promptSha256',
  'modelId','origin','modelRequestsClaimed'])&&
  receipt.schema==='minecraftaibuilder-b198zr5-receipt-v1',
  'RECEIPT_SCHEMA');
 yes(receipt.mode===mode&&hashRx.test(receipt.rawSha256)&&
  hashRx.test(receipt.promptSha256)&&
  typeof receipt.modelId==='string'&&receipt.modelId.length>1&&
  receipt.modelId.length<=140&&
  ['USER_SUPPLIED_REAL_MODEL_CLAIM','TEST_DOUBLE',
   'ASSISTANT_AUTHORED_REVISION'].includes(receipt.origin)&&
  Number.isSafeInteger(receipt.modelRequestsClaimed)&&
  receipt.modelRequestsClaimed>=0&&receipt.modelRequestsClaimed<=2,
  'RECEIPT_FIELDS');
 return {status:receipt.rawSha256===rawSha256&&
  receipt.promptSha256===promptSha256?'SOURCE_AND_PROMPT_DIGEST_MATCH':
  'RECEIPT_DIGEST_MISMATCH',
  modelId:receipt.modelId,provenance:receipt.origin,
  providerIdentityIndependentlyAuthenticated:false,
  modelRequestsClaimedUnverified:receipt.modelRequestsClaimed};
}
function humanReview(spec,review,compiled){
 if(review===null)return {status:'NO_HUMAN_REVIEW',scoreRatio:null};
 if(compiled===null)return {status:'HUMAN_SCORE_SOURCE_NOT_COMPILED',scoreRatio:null};
 yes(only(review,['caseId','sourceSha256','geometrySha256',
  'reviewerConfirmedHuman','rubric'])&&
  review.caseId===spec.id&&review.reviewerConfirmedHuman===true&&
  review.sourceSha256===compiled.sourceSha256&&
  review.geometrySha256===compiled.geometrySha256,
  'HUMAN_REVIEW_NOT_PINNED_OR_UNCONFIRMED');
 const rating=scoreHumanRubric(spec,review);
 return {status:'SELF_REPORTED_HUMAN_REVIEW_NOT_INDEPENDENTLY_AUTHENTICATED',
  scoreRatio:rating.humanSuppliedScoreRatio,
  criterionScores:rating.scoreBreakdown,independentReviewCertified:false};
}
function inspect({raw,mode,receipt,human,spec}){
 if(raw===null)return {mode,status:'NOT_PROVIDED',originalRawSha256:null,
  receipt:{status:'NO_CAPTURE'},humanReview:{status:'NO_HUMAN_REVIEW',scoreRatio:null}};
 yes(bounded(raw),'RAW_SIZE');
 const originalRawSha256=digest(raw);
 const provenance=receiptCheck(receipt,{
  mode,rawSha256:originalRawSha256,promptSha256:digest(spec.prompt)});
 let design=null,compiled=null,sourceError=null,declaredPlan=null,review=null;
 try{
  const parsed=mode==='BASELINE_3KEY'?
   readModelProposal(raw):readR4PlannedProposal(raw);
  design=parsed.design;
  compiled=compileDesign(design);
  yes(verifyCompiled(design,compiled),'STRICT_COMPILER_SHA');
  if(mode==='PLANNED_R4_4KEY'){
   try{
    const planned=reviewR4PlannedProposal(parsed,{caseId:'r5-'+spec.id});
    declaredPlan={status:planned.declaredPlanReview.status,
     reportedPlanIsNotIndependentEvidence:true};
   }catch(e){
    declaredPlan={status:'HOLD_DECLARED_SPATIAL_PLAN',
     reason:String(e.message).slice(0,180)};
   }
  }
 }catch(e){sourceError=String(e?.message??e).slice(0,180)}
 let sourceGoals=null,sourceMetrics=null;
 if(compiled!==null){
  try{
   const dossier=evaluateB198WSource({design,compiled,caseId:spec.id});
   sourceGoals=dossier.sourceOnlyGoals;
   sourceMetrics={voxels:compiled.primitives.length,
    elements:design.elements.length,
    bounds:{...design.bounds},
    twoWideSquares:dossier.sourceGeometry.twoWideSupportedStandingSquares,
    standingLevels:dossier.sourceGeometry.standingLevels,
    highRiskFindings:dossier.highRiskCount,
    materialVoxelCounts:dossier.sourceGeometry.materialVoxelCounts};
  }catch(e){sourceError='QUALITY_AUDIT_'+String(e.message).slice(0,160)}
 }
 const humanResult=humanReview(spec,human,compiled);
 const status=compiled===null?'HOLD_STRICT_SOURCE_INVALID':
  sourceError?'HOLD_INDEPENDENT_QUALITY_AUDIT':
  mode==='PLANNED_R4_4KEY'&&
   declaredPlan.status!=='FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS'?
    'HOLD_MODEL_DECLARED_SPATIAL_PLAN':
  sourceGoals.status!=='SOURCE_GOALS_PASS'?
   'HOLD_FROZEN_SOURCE_GOALS':'SOURCE_COMPILED_HUMAN_REVIEW_REQUIRED';
 return {mode,status,originalRawSha256,receipt:provenance,
  originalRawPreservedExternally:true,modeToken:'ORIGINAL_NOT_REPAIRED',
  sourceSha256:compiled?.sourceSha256??null,
  geometrySha256:compiled?.geometrySha256??null,sourceError,
  sourceGoals,sourceMetrics,declaredPlan,humanReview:humanResult,
  aestheticQualityAutomaticallyCertified:false,
  originalAuthorIndependentlyAuthenticated:false};
}

/** Null is an explicit MISSING capture (not a fabricated empty candidate).
 * Human score comparisons are descriptive, never a model-better certification.
 */
export function compareR5SavedCaptures({
 caseId='c01',baselineRaw=null,plannedRaw=null,
 baselineReceipt=null,plannedReceipt=null,
 baselineHuman=null,plannedHuman=null
}={}){
 yes(idRx.test(caseId),'CASE_ID');
 const spec=CREATION_CASES.find(s=>s.id===caseId);
 yes(!!spec,'FROZEN_CREATION_CASE_REQUIRED');
 const baseline=inspect({raw:baselineRaw,mode:'BASELINE_3KEY',
  receipt:baselineReceipt,human:baselineHuman,spec});
 const planned=inspect({raw:plannedRaw,mode:'PLANNED_R4_4KEY',
  receipt:plannedReceipt,human:plannedHuman,spec});
 const complete=baselineRaw!==null&&plannedRaw!==null;
 // Explicitly prohibit assistant-authored examples and test fixtures
 // from becoming a comparison of two real model samples.
 const eligible=complete&&
  [baseline,planned].every(x=>x.receipt.status==='SOURCE_AND_PROMPT_DIGEST_MATCH'&&
   x.receipt.provenance==='USER_SUPPLIED_REAL_MODEL_CLAIM');
 const bothRated=eligible&&[baseline,planned].every(x=>
  x.humanReview.status==='SELF_REPORTED_HUMAN_REVIEW_NOT_INDEPENDENTLY_AUTHENTICATED');
 const difference=bothRated&&[baseline,planned].every(x=>
  x.status==='SOURCE_COMPILED_HUMAN_REVIEW_REQUIRED')?
  Number((planned.humanReview.scoreRatio-baseline.humanReview.scoreRatio).toFixed(4)):null;
 const status=!complete?'HOLD_MISSING_SAVED_MODEL_PAIR':
  !eligible?'HOLD_NOT_COMPARABLE_MODEL_PROVENANCE':
  [baseline,planned].some(x=>x.status!=='SOURCE_COMPILED_HUMAN_REVIEW_REQUIRED')?
   'HOLD_SOURCE_OR_DECLARED_SPATIAL_PLAN':
  !bothRated?'HOLD_PAIRED_HUMAN_REVIEW_MISSING':
  'PAIRED_SELF_REPORTED_HUMAN_SCORES_AVAILABLE_NOT_MODEL_CERTIFICATION';
 return {schema:SCHEMA,caseId,frozenBenchmark:'b198b-architecture-benchmark-v1',
  frozenPromptSha256:digest(spec.prompt),
  frozenCriteria:spec.criteria.map(x=>({criterionId:x.id,
   description:x.description})),
  baseline,planned,
  status,modelPairEligibleByUnverifiedReceipts:eligible,
  humanScoreDifferenceR4MinusBaseline:difference,
  humanScoreSignificanceNotEstablished:true,
  singleCaseCannotProveGeneralization:true,
  noOriginalityOrAestheticWinnerAutomaticallyDeclared:true,
  requiresIndependentHumanVisualAndSemanticReview:true,
  providerIdentityIndependentlyAuthenticated:false,
  modelCallsMade:0,worldWrites:0,sourceOnly:true,safety:safety()};
}
