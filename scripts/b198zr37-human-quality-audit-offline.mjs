/**
 * R37: OFFLINE quality-review CLAIM ledger, downstream of R36 formal QA.
 * Creates no reviews itself: requires a separately supplied reviewer record.
 * Chained JSON hashes detect accidental edits, NOT adversarial rewrites.
 * Not an authenticated signature, trusted clock, durable log, human approval,
 * model permission, or Minecraft construction authorization.
 */
import {createHash} from 'node:crypto';
import {assessR36IndependentReview}
 from './b198zr36-independent-review-provenance-offline.mjs';

export const SCHEMA='minecraftaibuilder-b198zr37-quality-review-audit-v1';
export const ENTRY_SCHEMA='minecraftaibuilder-b198zr37-review-ledger-entry-v1';
export const AXES=Object.freeze([
 'ORIGINALITY','BRIEF_ALIGNMENT','SPATIAL_USABILITY','VISUAL_COHERENCE'
]);
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const sha64=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&
 keys.every(k=>Object.hasOwn(v,k));
const txt=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&
 v.length<=max&&!/[\u0000-\u001f<>]/.test(v);
const utc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s)&&
 !Number.isNaN(Date.parse(s))&&new Date(s).toISOString()===s.slice(0,-1)+'.000Z';
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const REVIEW_KEYS=['reviewId','reviewerAlias','reviewedAtUtc','r36ReviewEvidenceSha256',
 'candidateSha256','briefSha256','decision','dimensions','summary','evidenceRefs'];
const ENVELOPE_KEYS=['schema','sequence','previousDigest','review','digest'];
const decisions=['ACCEPTABLE_CONCEPT','REVISE','REJECT','UNDECIDED'];
const verdicts=['MEETS','REVISION','UNASSESSED'];
const evidenceKinds=['BRIEF','RENDER','DESIGN','NOTES','OTHER'];
function validReview(v){
 if(!exact(v,REVIEW_KEYS)||
  typeof v.reviewId!=='string'||!/^[a-z][a-z0-9-]{2,47}$/.test(v.reviewId)||
  !txt(v.reviewerAlias,3,80)||!utc(v.reviewedAtUtc)||
  !sha64(v.r36ReviewEvidenceSha256)||!sha64(v.candidateSha256)||
  !sha64(v.briefSha256)||!decisions.includes(v.decision)||
  !txt(v.summary,40,1000)||
  !Array.isArray(v.evidenceRefs)||v.evidenceRefs.length<1||
  v.evidenceRefs.length>12||!Array.isArray(v.dimensions)||
  v.dimensions.length!==AXES.length)return false;
 const uniqueEvidence=new Set();
 for(const e of v.evidenceRefs){
  if(!exact(e,['kind','digest','note'])||!evidenceKinds.includes(e.kind)||
   !sha64(e.digest)||!txt(e.note,20,400)||
   uniqueEvidence.has(e.digest))return false;
  uniqueEvidence.add(e.digest);
 }
 const seenAxes=new Set();
 for(const d of v.dimensions){
  if(!exact(d,['axis','verdict','rationale','evidenceDigests'])||
   !AXES.includes(d.axis)||seenAxes.has(d.axis)||
   !verdicts.includes(d.verdict)||!txt(d.rationale,30,600)||
   !Array.isArray(d.evidenceDigests)||d.evidenceDigests.length<1||
   d.evidenceDigests.length>12||
   new Set(d.evidenceDigests).size!==d.evidenceDigests.length||
   d.evidenceDigests.some(x=>!uniqueEvidence.has(x)))return false;
  seenAxes.add(d.axis);
 }
 if(seenAxes.size!==AXES.length)return false;
 const allMeet=v.dimensions.every(d=>d.verdict==='MEETS');
 const hasConcern=v.dimensions.some(d=>d.verdict==='REVISION');
 if(v.decision==='ACCEPTABLE_CONCEPT'&&!allMeet)return false;
 if(['REVISE','REJECT'].includes(v.decision)&&!hasConcern)return false;
 return true;
}
/** Validates the self-contained hash chain only; never certifies storage. */
export function verifyR37Ledger(entries=[]){
 if(!Array.isArray(entries)||entries.length>24)
  return {valid:false,reason:'LOG_SIZE'};
 let prior='0'.repeat(64),lastTime=null;
 const ids=new Set();
 for(let i=0;i<entries.length;i++){
  const e=entries[i];
  if(!exact(e,ENVELOPE_KEYS)||e.schema!==ENTRY_SCHEMA||
   e.sequence!==i+1||e.previousDigest!==prior||
   !validReview(e.review)||ids.has(e.review.reviewId))
   return {valid:false,reason:'LOG_FIELDS_OR_CHAIN',at:i};
  if(lastTime!==null&&e.review.reviewedAtUtc<lastTime)
   return {valid:false,reason:'LOG_TIME_ORDER',at:i};
  const core={schema:e.schema,sequence:e.sequence,
   previousDigest:e.previousDigest,review:e.review};
  if(e.digest!==sha(JSON.stringify(core)))
   return {valid:false,reason:'LOG_DIGEST_MISMATCH',at:i};
  prior=e.digest;lastTime=e.review.reviewedAtUtc;
  ids.add(e.review.reviewId);
 }
 return {valid:true,tailDigest:prior,lastClaimedTime:lastTime,reviewIds:[...ids]};
}
export function assessR37HumanQualityAudit({
 candidateRaw=null,expectedSha256=null,independentContract=null,
 reviewerEvidence=null,expectedGitCommit=null,expectedBriefSha256=null,
 evidenceKind='USER_SUPPLIED_UNVERIFIED',reviewRecord=null,priorEntries=[]
}={}){
 const r36=assessR36IndependentReview({candidateRaw,expectedSha256,
  independentContract,reviewerEvidence,expectedGitCommit,
  expectedBriefSha256,evidenceKind});
 const base={
  schema:SCHEMA,r36Status:r36.status,
  geometryReviewStatus:r36.r35Status,
  reviewerEvidenceAuthorshipAuthenticated:false,
  qualityReviewerIdentityAuthenticated:false,
  qualityReviewEvidenceExternallyVerified:false,
  qualityReviewTimestampExternallyVerified:false,
  humanArchitecturalQualityApproved:false,
  originalR25Status:'HOLD',
  actualQwenPerformanceImprovement:'NOT_ESTABLISHED',
  qualityRecordIsClaimOnly:true,
  ledgerIsExternallyAnchored:false,
  appendOnlyStorageVerified:false,
  recordAutoGenerated:false,
  constructionApproved:false,modelCalls:0,worldContacts:0,
  worldWrites:0,safety:safety()
 };
 if(r36.status!=='REVIEWER_EVIDENCE_CONSISTENCY_PASS_AUTHORSHIP_UNVERIFIED')
  return {...base,status:'HOLD_R36_NOT_ELIGIBLE'};
 const verified=verifyR37Ledger(priorEntries);
 if(!verified.valid)return {...base,status:'HOLD_LEDGER_INTEGRITY',
  ledgerReason:verified.reason};
 if(priorEntries.some(x=>x.review.candidateSha256!==r36.candidateSha256||
  x.review.briefSha256!==r36.declaredBriefSha256||
  x.review.r36ReviewEvidenceSha256!==r36.reviewEvidenceJsonSha256))
  return {...base,status:'HOLD_LEDGER_MIXED_SOURCE'};
 if(!validReview(reviewRecord))
  return {...base,status:'HOLD_QUALITY_REVIEW_FIELDS'};
 if(reviewRecord.candidateSha256!==r36.candidateSha256||
  reviewRecord.briefSha256!==r36.declaredBriefSha256||
  reviewRecord.r36ReviewEvidenceSha256!==r36.reviewEvidenceJsonSha256)
  return {...base,status:'HOLD_QUALITY_REVIEW_PINS'};
 if(reviewRecord.reviewedAtUtc<r36.declaredReviewedAtUtc||
  (verified.lastClaimedTime&&reviewRecord.reviewedAtUtc<verified.lastClaimedTime))
  return {...base,status:'HOLD_QUALITY_REVIEW_TIME_ORDER'};
 if(verified.reviewIds.includes(reviewRecord.reviewId))
  return {...base,status:'HOLD_DUPLICATE_REVIEW_ID'};
 const record=structuredClone(reviewRecord);
 const entryCore={schema:ENTRY_SCHEMA,sequence:priorEntries.length+1,
  previousDigest:verified.tailDigest,review:record};
 const entry={...entryCore,digest:sha(JSON.stringify(entryCore))};
 const humanClaim=record.decision;
 return {...base,
  status:humanClaim==='ACCEPTABLE_CONCEPT'?
   'QUALITY_ACCEPTABILITY_CLAIM_RECORDED_NOT_CERTIFIED':
   'QUALITY_HOLD_CLAIM_RECORDED',
  claimedQualityDecision:humanClaim,
  claimedDimensions:record.dimensions.map(d=>({axis:d.axis,verdict:d.verdict})),
  reviewId:record.reviewId,
  recordSha256:entry.digest,
  newEntry:entry,
  ledgerTailDigest:entry.digest,
  ledgerEntryCount:entry.sequence,
  qualitySourceSHA:r36.candidateSha256,
  sourceR36ReviewEvidenceSha256:r36.reviewEvidenceJsonSha256
 };
}
