import test from 'node:test';import assert from 'node:assert/strict';
import {createReviewAssignments,scoreVisualSubmission,summarizeB198FReview}
 from '../source/ai/b198f-evidence-review.mjs';
const get=()=>createReviewAssignments();
test('eight real B198E source designs/revisions pinned to exact 3D scene provenance and language intent',()=>{
 const cases=get();assert.equal(cases.length,8);
 assert.deepEqual(cases.map(x=>x.caseId),
  ['c01','c03','c05','c08','r01','r02','r03','r04']);
 assert(cases.every(x=>x.sourceSha256.length===64&&x.geometrySha256.length===64));
 assert(cases.every(x=>x.requiredCriteria.length>=3&&x.humanAssessment==='UNREVIEWED'));
 assert(cases.every(x=>x.worldWrites===0&&x.MinecraftWalkabilityCertified===false));
 assert(cases.filter(x=>x.kind==='revision').every(x=>
  x.sourceFacts.protectedElementProof.exactProtectedVoxelPreservationPassed));
});
test('independent manual criterion rating has mandatory source/scene pin and specific written evidence',()=>{
 const a=get()[0];
 const submission={caseId:a.caseId,sourceSha256:a.sourceSha256,
  geometrySha256:a.geometrySha256,reviewSceneId:a.reviewSceneId,
  reviewerLabel:'Test-only example reviewer',
  reviewerAttestation:'I reviewed the actual source-rendered 3D scene',
  criteria:a.requiredCriteria.map(x=>({criterionId:x.criterionId,score:3,
   visualSceneReference:a.reviewSceneId,
   notes:'The observed source scene has prominent side wings and a separate upper viewing room, but the interior library usage needs verification.'}))};
 const scored=scoreVisualSubmission(a,submission);
 assert.equal(scored.scoreRatio,0.75);
 assert.equal(scored.qualityDecision,'HUMAN_SUBMITTED_RUBRIC_MIXED');
 assert.equal(scored.ratingIsSelfReportedNotIndependentlyVerified,true);
 assert.equal(scored.modelAutomaticLanguageComplianceNotCertified,true);
 for(const altered of [
  {...submission,sourceSha256:'0'.repeat(64)},
  {...submission,reviewSceneId:'b198e-preview-before-c03'},
  {...submission,reviewerAttestation:'I am an AI model'},
  {...submission,criteria:submission.criteria.slice(1)},
  {...submission,criteria:submission.criteria.map(x=>({...x,notes:'nice'}))},
  {...submission,criteria:submission.criteria.map(x=>({...x,score:5}))},
  {...submission,criteria:submission.criteria.map(x=>({...x,visualSceneReference:'other'}))}
 ])assert.throws(()=>scoreVisualSubmission(a,altered));
});
test('unscored complete benchmark is still HOLD and cannot be promoted to success from source voxel results',()=>{
 const a=get(),s=summarizeB198FReview(a);
 assert.equal(s.completedCriterionEvidenceReviews,0);
 assert.equal(s.humanUnreviewedCount,8);
 assert.equal(s.qualityCertificationGranted,false);
 assert.equal(s.liveAPIPromptInterpretationMeasured,false);
 assert.equal(s.benchmark12CreationCasesFullyReviewed,false);
 assert.deepEqual(s.gates,Array(9).fill('BLOCKED'));
});
