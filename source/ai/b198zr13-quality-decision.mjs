/**
 * B198Z-R13 quality decision ledger from SAVED original R6 evidence.
 * No network, model calls, Minecraft clients or world writes; no claim that
 * a voxel compiler can judge architecture, beauty or real avatar walking.
 * Reads four-key model raw unchanged and reuses the independent R4/R3/B198W
 * validators. Never silently repairs a model response or self-scores beauty.
 */
import {createHash} from 'node:crypto';
import {CREATION_CASES} from './b198b-benchmark-cases.mjs';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {reviewR4PlannedProposal} from './b198zr4-planned-source.mjs';
import {evaluateB198WSource} from '../../scripts/b198w-quality-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr13-quality-decision-v1';
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=s=>{throw Error('B198ZR13_'+s)};
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const compact=s=>typeof s==='string'?s.slice(0,100):'UNCLASSIFIED';
const codeFrom=e=>{const m=/\b(B143|B198[A-Z0-9_-]+)(?:_[A-Z0-9_]+)?/.exec(
 String(e?.message??e));return m?compact(m[0]):'INVALID_UNTRUSTED_SOURCE';};
const hold=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const rubric=spec=>spec.criteria.map(c=>({
 criterionId:c.id,question:c.description,
 status:'REQUIRES_HUMAN_VIEWING_AND_SEMANTIC_JUDGMENT',
 score:null,visualEvidenceReviewed:false
}));

/** Results are honest about both missing data and unverified provenance.
 * User-supplied receipt and run report are NOT signed model identity proofs.
 */
export function analyzeR13SavedCapture({
 raw,caseId='c01',receipt=null,runResult=null
}={}){
 if(typeof raw!=='string'||raw.length<1||raw.length>60000||
  Buffer.byteLength(raw)>120000)fail('ORIGINAL_RAW_SIZE');
 const spec=CREATION_CASES.find(c=>c.id===caseId);
 if(!spec)fail('UNKNOWN_FROZEN_CASE');
 if(receipt!==null&&!isObject(receipt))fail('RECEIPT_TYPE');
 if(runResult!==null&&!isObject(runResult))fail('R6_RESULT_TYPE');
 const rawSha256=hash(raw),promptSha256=hash(spec.prompt);
 const discrepancies=[];
 const matchingReceipt=receipt!==null&&
  receipt.schema==='minecraftaibuilder-b198zr5-receipt-v1'&&
  receipt.mode==='PLANNED_R4_4KEY'&&
  receipt.rawSha256===rawSha256&&
  receipt.promptSha256===promptSha256;
 if(receipt!==null&&!matchingReceipt)discrepancies.push('CAPTURE_RECEIPT_HASH_OR_SCHEMA_MISMATCH');
 if(runResult!==null){
  if(runResult.originalRawSha256!==rawSha256)
   discrepancies.push('RUN_RESULT_ORIGINAL_RAW_SHA_MISMATCH');
  if(runResult.request?.promptSha256!==promptSha256)
   discrepancies.push('FROZEN_PROMPT_SHA_MISMATCH');
  if(runResult.r11CompletionAudit?.rawSha256!==undefined&&
    runResult.r11CompletionAudit.rawSha256!==rawSha256)
   discrepancies.push('R11_RAW_AUDIT_SHA_MISMATCH');
  if(matchingReceipt&&typeof runResult.request?.modelRequested==='string'&&
   runResult.request.modelRequested!==receipt.modelId)
   discrepancies.push('R6_MODEL_ID_AND_RECEIPT_DISAGREE');
 }
 let parsed=null,parsedAsJson=false,fourKeys=false;
 let declaredPlanStatus='NOT_EVALUATED';
 let geometryStatus='NOT_EVALUATED';
 let sourceQuality=null,sourceError=null,declaredReason=null,compiled=null;
 try{
  parsed=JSON.parse(raw);
  parsedAsJson=true;
  fourKeys=isObject(parsed)&&Object.keys(parsed).length===4&&
   ['design','spatialPlan','explanation','assumptions'].every(
    k=>Object.hasOwn(parsed,k));
 }catch{sourceError='INVALID_OR_TRUNCATED_JSON'}
 if(parsedAsJson){
  if(!fourKeys)sourceError='EXPECTED_EXACT_FOUR_KEYS';
  if(isObject(parsed?.design)){
   // Salvage *only* model-authored, strictly compilable geometry from a
   // malformed outer envelope. Do not call this a valid R4 response.
   try{
    compiled=compileDesign(parsed.design);
    if(!verifyCompiled(parsed.design,compiled))
     fail('INDEPENDENT_B143_GEOMETRY_SHA');
    geometryStatus='B143_SOURCE_ONLY_GEOMETRY_VERIFIED';
    try{
     const q=evaluateB198WSource({
      design:parsed.design,compiled,caseId});
     sourceQuality={
      sourceGoalsStatus:q.sourceOnlyGoals.status,
      humanReviewStatus:q.reviewStatus,
      highRiskCount:q.highRiskCount,
      sourceGeometry:q.sourceGeometry,
      sourceCriticFindings:q.sourceCriticFindings,
      semanticMeaningAutomaticallyCertified:false
     };
    }catch(e){
     sourceQuality={status:'HOLD_SOURCE_QUALITY_AUDIT',
      reason:codeFrom(e)};
    }
   }catch(e){
    geometryStatus='HOLD_B143_GEOMETRY';
    sourceError=sourceError??codeFrom(e);
   }
  }else{geometryStatus='HOLD_NO_SOURCE_DESIGN'}
 }
 if(fourKeys&&geometryStatus==='B143_SOURCE_ONLY_GEOMETRY_VERIFIED'){
  try{
   const r=reviewR4PlannedProposal(raw,{caseId:'r13-'+caseId});
   declaredPlanStatus=r.declaredPlanReview.status;
  }catch(e){
   declaredReason=codeFrom(e);
   declaredPlanStatus='HOLD_DECLARED_FUNCTIONAL_CLAIM';
  }
 }
 let status;
 if(discrepancies.length)status='HOLD_EVIDENCE_PROVENANCE_CONFLICT';
 else if(!parsedAsJson)status='HOLD_ORIGINAL_JSON_TRUNCATED_OR_INVALID';
 else if(!fourKeys)status='HOLD_FOUR_KEY_SOURCE_CONTRACT';
 else if(geometryStatus!=='B143_SOURCE_ONLY_GEOMETRY_VERIFIED')
  status='HOLD_INVALID_SOURCE_GEOMETRY';
 else if(declaredPlanStatus!=='FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS')
  status='HOLD_DECLARED_FUNCTIONAL_CLAIM';
 else if(sourceQuality?.sourceGoalsStatus!=='SOURCE_GOALS_PASS')
  status='HOLD_FROZEN_SOURCE_GEOMETRY_GOALS';
 else if(!matchingReceipt||receipt.origin!=='USER_SUPPLIED_REAL_MODEL_CLAIM')
  status='HOLD_CAPTURE_PROVENANCE_NOT_SUBSTANTIATED';
 else status='WAITING_FOR_INDEPENDENT_HUMAN_ARCHITECTURE_REVIEW';
 // No acceptance state includes approved construction or inferred model
 // quality; even a clean source still requires independent manual review.
 const trace=Array.isArray(runResult?.nativeTrace)?
  runResult.nativeTrace.slice(-1)[0]:null;
 const t=trace&&Number.isSafeInteger(trace.generatedTokens)?
  trace.generatedTokens:null;
 const max=Number.isSafeInteger(runResult?.request?.budget?.sourceTokens)?
  runResult.request.budget.sourceTokens:null;
 const noRawModifications=true;
 return {
  schema:SCHEMA,caseId,status,rawSha256,rawUtf8Bytes:Buffer.byteLength(raw),
  frozenPromptSha256:promptSha256,
  frozenRequest:spec.prompt,
  evidenceProvenance:{
   receiptPresent:receipt!==null,
   receiptMatchesRawAndPrompt:receipt===null?null:matchingReceipt,
   requestResultPresent:runResult!==null,
   modelIdClaimed:matchingReceipt&&typeof receipt.modelId==='string'?
    receipt.modelId:null,
   modelIdentityIndependentlyVerified:false,
   discrepancies
  },
  source:{
   parsedAsJson,completeExactlyFourKeys:fourKeys,
   geometryStatus,sourceSha256:compiled?.sourceSha256??null,
   geometrySha256:compiled?.geometrySha256??null,
   compiledVoxels:compiled?.primitives?.length??null,
   modelAuthoredElementCount:Array.isArray(parsed?.design?.elements)?
    parsed.design.elements.length:null,
   savedOriginalNotRepaired:noRawModifications,
   sourceError
  },
  declaredFunctionality:{
   status:declaredPlanStatus,issue:declaredReason,
   modelDeclaredIsNotIndependentHumanCertification:true,
   actualMinecraftWalkingProven:false
  },
  machineAuditedGeometry:sourceQuality,
  nativeTelemetryClaim:{
   outputTokens:t,outputTokenLimit:max,
   outputLimitReached:t===null||max===null?null:t>=max,
   serverDoneReason:typeof trace?.doneReason==='string'?
    trace.doneReason:null,
   serverComplete:typeof trace?.complete==='boolean'?trace.complete:null,
   modelCallsPerformedByThisAudit:0
  },
  frozenHumanReview:rubric(spec),
  mustReviewBeforeAcceptance:[
   '要求に合った明確な建築用途と独創的なシルエット',
   '建物の内部が実際に利用可能な空間であること',
   '中央吹抜け・最上階ラウンジなど各ケースの主要な要求',
   '床・階段・入口・頭上空間が現実のMinecraft物理でも使えること'
  ],
  rendererDoesNotCertifyBeauty:true,
  reviewerHasNotScoredAnything:true,
  sourceOnly:true,
  safety:hold()
 };
}
