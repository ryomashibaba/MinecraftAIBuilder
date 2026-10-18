/**
 * B198F — prompt/geometry/visual-evidence quality gate for the real B198E
 * authored designs. This module NEVER awards human semantic points itself.
 * Human ratings are external submissions backed by per-criterion notes,
 * a verified exact source hash and a visual scene reference.
 */
import {createHash} from 'node:crypto';
import {CREATION_CASES,REVISION_CASES} from './b198b-benchmark-cases.mjs';
import {getB198EChatAuthoredPilot} from './b198e-chat-authored-pilot.mjs';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {inspectSourceGeometry,inspectProtectedVoxelFidelity}
 from './b198b-architecture-quality.mjs';
const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=s=>{throw Error('B198F_'+s)};
const yes=(x,s)=>{if(!x)fail(s)};
export const SCHEMA='minecraftaibuilder-b198f-criterion-evidence-v1';
const suite=[...CREATION_CASES,...REVISION_CASES];
export function createReviewAssignments(){
 const src=getB198EChatAuthoredPilot(),out=[];
 const map={...src.created,...src.revised};
 for(const id of [...Object.keys(src.created),...Object.keys(src.revised)]){
  const spec=suite.find(c=>c.id===id);
  const design=map[id],compiled=compileDesign(design);
  yes(verifyCompiled(design,compiled),'PROVENANCE_'+id);
  let voxelProof=null;
  if(spec.kind==='revision'){
   const before=src.created[spec.baseCaseId];
   voxelProof=inspectProtectedVoxelFidelity({
    baseDesign:before,revisionDesign:design,
    protectedElementIds:src.protectedIds[id]});
  }
  const observed=inspectSourceGeometry({design,compiled});
  out.push({
   schema:SCHEMA,caseId:id,kind:spec.kind,
   parentCaseId:spec.baseCaseId??null,
   sourceSha256:compiled.sourceSha256,
   geometrySha256:compiled.geometrySha256,
   architecturalRequest:spec.prompt,
   reviewSceneId:spec.kind==='creation'?
    'b198e-preview-before-'+id:'b198e-preview-after-'+id,
   requiredCriteria:spec.criteria.map(q=>({
    criterionId:q.id,description:q.description,
    score:null,notes:null,visualSceneReference:null
   })),
   sourceFacts:{
    occupiedCells:compiled.primitives.length,
    authoredElements:design.elements.length,
    supported2WideSquares:observed.source2WideSupportedFootprintSquares,
    usedMaterialCount:observed.usedMaterialFamilyCount,
    sourceSpan:observed.sourceBoundingSize,
    protectedElementProof:voxelProof
   },
   humanAssessment:'UNREVIEWED',
   independenceStatus:'NO_INDEPENDENT_HUMAN_REVIEW_YET',
   MinecraftWalkabilityCertified:false,
   worldWrites:0
  });
 }
 return out;
}
export function scoreVisualSubmission(assignment,submission){
 yes(assignment?.schema===SCHEMA,'UNKNOWN_ASSIGNMENT');
 yes(submission&&typeof submission==='object'&&
  !Array.isArray(submission),'INVALID_SUBMISSION');
 yes(submission.caseId===assignment.caseId,'WRONG_CASE');
 yes(submission.sourceSha256===assignment.sourceSha256,
  'STALE_SOURCE_HASH');
 yes(submission.geometrySha256===assignment.geometrySha256,
  'STALE_GEOMETRY_HASH');
 yes(submission.reviewSceneId===assignment.reviewSceneId,
  'WRONG_SCENE');
 yes(submission.reviewerAttestation===
  'I reviewed the actual source-rendered 3D scene',
  'REVIEWER_ATTESTATION_REQUIRED');
 yes(typeof submission.reviewerLabel==='string'&&
  submission.reviewerLabel.trim().length>=3&&
  submission.reviewerLabel.length<=90,'REVIEWER_LABEL');
 const entries=submission.criteria;
 yes(Array.isArray(entries)&&
  entries.length===assignment.requiredCriteria.length,
  'CRITERIA_MISSING');
 const seen=new Set(),scores=[];
 for(const q of assignment.requiredCriteria){
  const item=entries.find(x=>x?.criterionId===q.criterionId);
  yes(item&&!seen.has(q.criterionId),'DUPLICATE_OR_MISSING_CRITERION');
  seen.add(q.criterionId);
  yes(Number.isInteger(item.score)&&item.score>=0&&item.score<=4,
   'INVALID_QUALITY_SCORE_'+q.criterionId);
  yes(typeof item.notes==='string'&&
   item.notes.trim().length>=25&&item.notes.length<=1600,
   'VISIBLE_EVIDENCE_REQUIRED_'+q.criterionId);
  yes(item.visualSceneReference===assignment.reviewSceneId,
   'SCENE_EVIDENCE_NOT_PINNED_'+q.criterionId);
  scores.push(item.score);
 }
 yes(entries.every(x=>seen.has(x.criterionId)),'EXTRA_RUBRIC_CRITERIA');
 const score=scores.reduce((a,b)=>a+b,0)/(scores.length*4);
 return {schema:SCHEMA,caseId:assignment.caseId,
  sourceSha256:assignment.sourceSha256,
  geometrySha256:assignment.geometrySha256,
  scoreRatio:Math.round(score*10000)/10000,
  reviewerSuppliedEvidence:true,
  ratingIsSelfReportedNotIndependentlyVerified:true,
  criteriaCount:scores.length,
  notesDigest:H(entries.map(x=>x.notes)),
  qualityDecision:score>=0.8?'HUMAN_SUBMITTED_RUBRIC_HIGH':
   score>=0.5?'HUMAN_SUBMITTED_RUBRIC_MIXED':'HUMAN_SUBMITTED_RUBRIC_LOW',
  structuralSafetyNotInferred:true,
  modelAutomaticLanguageComplianceNotCertified:true,
  worldWrites:0};
}
export function summarizeB198FReview(assignments,approvedSubmissions=[]){
 yes(assignments.length===8,'PILOT_SCOPE_IS_8');
 const scored=new Map();
 for(const entry of approvedSubmissions){
  yes(!scored.has(entry.caseId),'DUPLICATE_REVIEW');
  const a=assignments.find(x=>x.caseId===entry.caseId);
  yes(a,'EXTRA_REVIEW_ID');
  scored.set(entry.caseId,scoreVisualSubmission(a,entry));
 }
 return {
  schema:SCHEMA,
  assignedCases:assignments.map(a=>a.caseId),
  completedCriterionEvidenceReviews:scored.size,
  humanUnreviewedCount:assignments.length-scored.size,
  ratings:[...scored.values()],
  benchmark12CreationCasesFullyReviewed:false,
  liveAPIPromptInterpretationMeasured:false,
  qualityCertificationGranted:false,
  worldReadiness:'NOT_PREPARED',
  worldWrites:0,gates:Array(9).fill('BLOCKED')
 };
}
