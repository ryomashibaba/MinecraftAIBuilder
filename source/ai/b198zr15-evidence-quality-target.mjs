/**
 * B198Z-R15: source-pinned independent comparison of two saved R13 reports
 * and optional *human-supplied* B198W reviewer JSON. NO AI scoring,
 * inferred provider identity, local model connection, world reads/writes,
 * installation, or automatic permission to construct.
 */
import {createHash} from 'node:crypto';
import {CREATION_CASES} from './b198b-benchmark-cases.mjs';
import {scoreHumanRubric} from './b198b-architecture-quality.mjs';

export const SCHEMA='minecraftaibuilder-b198zr15-next-real-evidence-quality-target-v1';
const SPEC=CREATION_CASES.find(c=>c.id==='c01');
const hash=s=>createHash('sha256').update(s).digest('hex');
const yes=(ok,msg)=>{if(!ok)throw Error('B198ZR15_'+msg)};
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const shaRx=/^[a-f0-9]{64}$/;
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const checks=()=>SPEC.criteria.map(c=>({id:c.id,description:c.description,
 category:'FROZEN_B198B_C01',source:'B198W_HUMAN_REVIEW_ONLY',
 score:null,verifiableByGeometryAlone:false}));
function validateLedger(r,label){
 yes(isObj(r)&&r.schema==='minecraftaibuilder-b198zr13-quality-decision-v1',
  label+'_R13_SCHEMA');
 yes(r.caseId==='c01'&&r.frozenPromptSha256===hash(SPEC.prompt),
  label+'_FROZEN_CASE_PROMPT');
 yes(shaRx.test(r.rawSha256),'INVALID_'+label+'_RAW_SHA');
 yes(isObj(r.source)&&isObj(r.declaredFunctionality)&&
  isObj(r.evidenceProvenance),'INVALID_'+label+'_FIELDS');
 yes(Array.isArray(r.frozenHumanReview)&&
  r.frozenHumanReview.length===SPEC.criteria.length&&
  r.frozenHumanReview.every((x,i)=>x.criterionId===SPEC.criteria[i].id),
  label+'_RUBRIC_STRUCTURE');
 yes(r.safety?.readiness==='NOT_PREPARED'&&
  r.safety?.constructionApproved===false&&
  Array.isArray(r.safety?.gates)&&r.safety.gates.length===9&&
  r.safety.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.safety?.BuildPlan?.operations)&&
  r.safety.BuildPlan.operations.length===0,
  label+'_UNSAFE_OR_UNVERIFIED_LEDGER');
}
function machineStage(report){
 if(report.evidenceProvenance.discrepancies?.length)
  return 'HOLD_ORIGINAL_EVIDENCE_CONFLICT';
 if(report.source.completeExactlyFourKeys!==true)
  return 'HOLD_INCOMPLETE_OR_MALFORMED_JSON';
 if(report.source.geometryStatus!=='B143_SOURCE_ONLY_GEOMETRY_VERIFIED'||
    !shaRx.test(report.source.sourceSha256)||
    !shaRx.test(report.source.geometrySha256))
  return 'HOLD_B143_GEOMETRY_UNVERIFIED';
 if(report.declaredFunctionality.status!=='FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS')
  return 'HOLD_ABSTRACT_FLOOR_AND_CIRCULATION';
 if(report.machineAuditedGeometry?.sourceGoalsStatus!=='SOURCE_GOALS_PASS')
  return 'HOLD_FROZEN_SOURCE_GOALS';
 // R13's "waiting" state is conditional on valid self-reported original
 // receipt; this still does NOT independently authenticate model identity.
 if(report.status!=='WAITING_FOR_INDEPENDENT_HUMAN_ARCHITECTURE_REVIEW'||
    report.evidenceProvenance.receiptMatchesRawAndPrompt!==true||
    typeof report.evidenceProvenance.modelIdClaimed!=='string'||
    !report.evidenceProvenance.modelIdClaimed.trim())
  return 'HOLD_REAL_MODEL_ORIGIN_NOT_SUBSTANTIATED';
 return 'MACHINE_READINESS_FOR_HUMAN_JUDGMENT';
}
function humanReview(r,report){
 if(r===null)return {status:'UNREVIEWED',ratio:null,scores:null,
  reviewerConfirmedHuman:false,selfReportedNotIndependentlyVerified:true,
  unmetCriteria:[]};
 yes(isObj(r)&&r.schema==='minecraftaibuilder-b198w-human-source-rating-v1'&&
  r.caseId==='c01'&&r.reviewerConfirmedHuman===true,
  'HUMAN_RUBRIC_SCHEMA_OR_CONFIRMATION');
 yes(shaRx.test(r.sourceSha256)&&shaRx.test(r.geometrySha256)&&
  r.sourceSha256===report.source.sourceSha256&&
  r.geometrySha256===report.source.geometrySha256,
  'HUMAN_RUBRIC_SOURCE_GEOMETRY_SHA_MISMATCH');
 const s=scoreHumanRubric(SPEC,r);
 const scored=s.scoreBreakdown.map((score,i)=>({
  criterionId:SPEC.criteria[i].id,description:SPEC.criteria[i].description,
  score,reviewerEvidence:r.rubric[i].evidence,scoreSource:'HUMAN_SELF_REPORT'
 }));
 const min=Math.min(...s.scoreBreakdown),major=s.scoreBreakdown.filter(v=>v===4).length;
 // User-quality gate for future preconstruction REVIEW only:
 // each c01 intent >=3, at least TWO strongly fulfilled (=4), clear
 // statement for each criterion. Does NOT certify "beautiful" by AI.
 const targetMet=min>=3&&major>=2;
 return {
  status:targetMet?'SELF_REPORTED_QUALITY_TARGET_MET':
   'SELF_REPORTED_QUALITY_TARGET_NOT_MET',
  ratio:s.humanSuppliedScoreRatio,scores:scored,
  minimumCriterionScore:min,stronglySatisfiedCriteria:major,
  targetMinimumScore:3,targetStrongFourScoreCount:2,
  reviewerConfirmedHuman:true,selfReportedNotIndependentlyVerified:true,
  unmetCriteria:scored.filter(c=>c.score<3).map(c=>c.criterionId),
  targetMet,independentReviewCertified:false
 };
}
/**
 * Each stage is a conditional observation. A "better" result means only
 * complete, stricter evidence, NOT independently verified beauty/gameplay.
 * This API NEVER returns APPROVED_TO_BUILD or quality SUCCESS.
 */
export function evaluateR15Comparison({baseline,candidate,human=null}={}){
 validateLedger(baseline,'BASELINE');
 validateLedger(candidate,'CANDIDATE');
 yes(human===null||isObj(human),'HUMAN_REVIEW_INVALID_TYPE');
 const baselineStage=machineStage(baseline);
 const candidateStage=machineStage(candidate);
 const sameRaw=baseline.rawSha256===candidate.rawSha256;
 const candidateReady=candidateStage==='MACHINE_READINESS_FOR_HUMAN_JUDGMENT';
 // No human review is evaluated if model-authored source isn't valid enough:
 // this prevents bogus positive scores from laundering truncated model data.
 const reviewed=candidateReady&&!sameRaw?humanReview(human,candidate):
  humanReview(null,candidate);
 const risk=candidate.machineAuditedGeometry?.highRiskCount;
 const highRisk=Number.isSafeInteger(risk)&&risk>0;
 let decision,criticalNextStep;
 if(sameRaw){
  decision='HOLD_SAME_RAW_NOT_NEW_GENERATION';
  criticalNextStep='新しい原本が存在しない。旧結果の再監査をモデル改善と数えない。';
 }else if(!candidateReady){
  decision='HOLD_CANDIDATE_SOURCE_OR_PROVENANCE';
  criticalNextStep='原本の完全性・B143形状・独立R3動線・出力原本の出所を先に確認する。';
 }else if(human===null){
  decision='HUMAN_VISUAL_REVIEW_REQUIRED';
  criticalNextStep='3DとB198W評価票で凍結した4項目を0～4点で採点し、根拠を保存する。';
 }else if(reviewed.status==='SELF_REPORTED_QUALITY_TARGET_NOT_MET'){
  decision='REVISE_ARCHITECTURE_HUMAN_TARGET_NOT_MET';
  criticalNextStep='点数が低い建築要件を改善する。JSON完成だけを成功と扱わない。';
 }else if(highRisk){
  decision='HOLD_HIGH_RISK_GEOMETRY_FINDINGS';
  criticalNextStep='高リスク形状の根拠を3DとR3原本で確認する。人間の高得点でも自動承認しない。';
 }else{
  decision='OFFLINE_HUMAN_REVIEW_TARGET_MET_WORLD_UNVERIFIED';
  criticalNextStep='独創性と機能のオフライン評価目標は自己申告で満たす。実Minecraft歩行・建築・施工は未承認。';
 }
 const sourceProgress=
  baseline.source.completeExactlyFourKeys!==true&&
  candidate.source.completeExactlyFourKeys===true&& !sameRaw;
 return {
  schema:SCHEMA,caseId:'c01',decision,
  baseline:{rawSha256:baseline.rawSha256,status:baseline.status,
   machineStage:baselineStage,rawJsonComplete:baseline.source.completeExactlyFourKeys,
   compiledVoxels:baseline.source.compiledVoxels,
   modelIdClaimed:baseline.evidenceProvenance.modelIdClaimed??null,
   independentlyAuthenticated:false},
  candidate:{rawSha256:candidate.rawSha256,status:candidate.status,
   machineStage:candidateStage,rawJsonComplete:candidate.source.completeExactlyFourKeys,
   compiledVoxels:candidate.source.compiledVoxels,
   modelIdClaimed:candidate.evidenceProvenance.modelIdClaimed??null,
   independentlyAuthenticated:false},
  comparableFrozenPrompt:baseline.frozenPromptSha256===candidate.frozenPromptSha256,
  sameRaw,
  recoveredCompleteFourKeyOutputComparedWithBaseline:sourceProgress,
  jsonCompletionIsNotArchitecturalImprovementProof:true,
  frozenCriteria:checks(),
  humanReview:reviewed,
  machineQualitySignals:{
   sourceGoalsStatus:candidate.machineAuditedGeometry?.sourceGoalsStatus??null,
   highRiskFindings:Number.isSafeInteger(risk)?risk:null,
   highRiskRequireReview:highRisk,
   supportedCirculationCertifiedInConceptVoxels:
    candidate.declaredFunctionality.status==='FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS',
   actualMinecraftWalkingValidated:false
  },
  explicitQualityTarget:{
   minimumPerHumanCriterion:3,numberOfRequiredScore4:2,
   requiresCompleteFourKeyJson:true,requiresB143AndR3AndFrozenSourceGoals:true,
   requiresReviewOfHighRiskFindings:true,
   humanJudgmentUnverifiedUntilSubmitted:true,
   modelAuthorIndependentlyAuthenticated:false,
   actualGameWorldConstructionPermission:false
  },
  criticalNextStep,
  modelCallsInitiatedByComparison:0,
  aestheticQualityAutomaticallyScored:false,
  sourceOriginalsNeverModified:true,
  safety:safety()
 };
}
