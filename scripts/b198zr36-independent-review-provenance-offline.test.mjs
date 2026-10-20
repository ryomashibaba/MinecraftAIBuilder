/** R36 CI contains only synthetic hand-authored fixtures, no Qwen/world. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {SCHEMA as R3_SCHEMA} from '../source/ai/b198zr3-functional-review-contract.mjs';
import {r32Bridge}
 from './b198zr32-synthetic-geometry-fixtures.mjs';
import {SCHEMA,assessR36IndependentReview}
 from './b198zr36-independent-review-provenance-offline.mjs';
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const COMMIT='a'.repeat(40),BRIEF=sha('fictional-review-brief-fixture');
function make(){
 const p=r32Bridge(),raw=JSON.stringify(p);
 const independentContract={schema:R3_SCHEMA,
  caseId:'r36-review-fixture',authorship:'TEST_FIXTURE',
  sourceSha256:compileDesign(p.design).sourceSha256,
  entrance:[2,1,4],headroom:2,
  protectedVoids:[{id:'air-above-bridge',origin:[8,1,4],
   size:[5,2,1],maxOccupiedCells:0}],
  destinations:[{id:'independent-target',point:[15,1,14],
   maximumPathSteps:38}],
  functionalZones:[{id:'independent-east-floor',origin:[13,1,12],
   size:[4,1,4],minimumReachablePositions:16,
   minimumReachablePercent:100}]
 };
 const rationales=(items,why)=>items.map(x=>({
  id:x.id,rationale:why
 }));
 const reviewerEvidence={
  schema:SCHEMA,reviewId:'r36-bridge-fixture',
  reviewerAlias:'Fixture reviewer',
  reviewedAtUtc:'2026-10-20T08:00:00Z',
  gitCommit:COMMIT,briefSha256:BRIEF,
  candidateRawSha256:sha(raw),
  independentContractSha256:sha(JSON.stringify(independentContract)),
  independenceClaim:true,modelSpatialPlanViewed:false,
  copiedFromModel:false,
  rationale:{
   briefGrounding:'The external brief asks for a connected bridge between two open platforms.',
   entrance:'The independent reviewer selected an actual supported standable platform coordinate.',
   protectedVoids:rationales(independentContract.protectedVoids,
    'The chosen open-air segment must not be blocked by late-added solids.'),
   destinations:rationales(independentContract.destinations,
    'The alternative far-platform target tests travel to a usable end point.'),
   functionalZones:rationales(independentContract.functionalZones,
    'The independently selected east platform footprint must remain usable.')
  }
 };
 return {candidateRaw:raw,expectedSha256:sha(raw),independentContract,
  reviewerEvidence,expectedGitCommit:COMMIT,expectedBriefSha256:BRIEF,
  evidenceKind:'SYNTHETIC_TEST_FIXTURE'};
}
test('R36 independent synthetic review passes consistency, not human authorship',()=>{
 const r=assessR36IndependentReview(make());
 assert.equal(r.status,'REVIEWER_EVIDENCE_CONSISTENCY_PASS_AUTHORSHIP_UNVERIFIED');
 assert.equal(r.r35Status,'INDEPENDENT_FORMAL_PASS_PROVENANCE_UNVERIFIED');
 assert.equal(r.modelSpatialPlanCopiedDetected,false);
 assert.equal(r.reviewerEvidenceHashPinsMatchSuppliedValues,true);
 assert.equal(r.reviewEvidenceJsonSha256,sha(JSON.stringify(make().reviewerEvidence)));
 assert.equal(r.independentAuthorshipAuthenticated,false);
 assert.equal(r.reviewerIdentityAuthenticated,false);
 assert.equal(r.reviewerTimestampExternallyVerified,false);
 assert.equal(r.gitCommitExternallyVerified,false);
 assert.equal(r.rawOriginalFileVerified,false);
 assert.equal(r.actualQwenPerformanceImprovement,'NOT_ESTABLISHED');
});
test('R36 absent review packet remains HOLD despite R35 geometry PASS',()=>{
 const x=make();delete x.reviewerEvidence;
 const r=assessR36IndependentReview(x);
 assert.equal(r.status,'HOLD_REVIEW_EVIDENCE_FIELDS');
});
test('R36 completely copied model spatialPlan is HOLD, even if IDs differ',()=>{
 const x=make();
 const source=JSON.parse(x.candidateRaw).spatialPlan;
 x.independentContract.entrance=source.entrance;
 x.independentContract.headroom=source.headroom;
 x.independentContract.protectedVoids=source.protectedVoids.map((v,i)=>({
  ...v,id:'other-void-'+i
 }));
 x.independentContract.destinations=source.destinations.map((v,i)=>({
  ...v,id:'other-destination-'+i
 }));
 x.independentContract.functionalZones=source.functionalZones.map((v,i)=>({
  ...v,id:'other-zone-'+i
 }));
 x.reviewerEvidence.independentContractSha256=sha(JSON.stringify(x.independentContract));
 x.reviewerEvidence.rationale.protectedVoids[0].id='other-void-0';
 x.reviewerEvidence.rationale.destinations[0].id='other-destination-0';
 x.reviewerEvidence.rationale.functionalZones[0].id='other-zone-0';
 const r=assessR36IndependentReview(x);
 assert.equal(r.status,'HOLD_MODEL_PLAN_GEOMETRY_DUPLICATED');
 assert.equal(r.modelSpatialPlanCopiedDetected,true);
});
test('R36 changing only IDs and threshold cannot disguise a copied geometry',()=>{
 const x=make();
 const source=JSON.parse(x.candidateRaw).spatialPlan;
 x.independentContract.destinations=[{id:'my-destination',
  point:source.destinations[0].point,maximumPathSteps:37}];
 x.independentContract.functionalZones=[{id:'my-zone',
  origin:source.functionalZones[0].origin,
  size:source.functionalZones[0].size,
  minimumReachablePositions:15,minimumReachablePercent:90}];
 x.reviewerEvidence.independentContractSha256=sha(JSON.stringify(x.independentContract));
 x.reviewerEvidence.rationale.destinations[0].id='my-destination';
 x.reviewerEvidence.rationale.functionalZones[0].id='my-zone';
 const r=assessR36IndependentReview(x);
 assert.equal(r.status,'HOLD_MODEL_PLAN_GEOMETRY_DUPLICATED');
});
test('R36 contract edit without repinning evidence is HOLD',()=>{
 const x=make();x.independentContract.destinations[0].maximumPathSteps=37;
 assert.equal(assessR36IndependentReview(x).status,
  'HOLD_REVIEW_EVIDENCE_HASH_OR_COMMIT_MISMATCH');
});
test('R36 wrong expected Git commit or brief pin is HOLD',()=>{
 const x=make();x.expectedGitCommit='b'.repeat(40);
 assert.equal(assessR36IndependentReview(x).status,
  'HOLD_REVIEW_EVIDENCE_HASH_OR_COMMIT_MISMATCH');
 const y=make();y.expectedBriefSha256='0'.repeat(64);
 assert.equal(assessR36IndependentReview(y).status,
  'HOLD_REVIEW_EVIDENCE_HASH_OR_COMMIT_MISMATCH');
});
test('R36 reviewer cannot claim independence while viewing model plan',()=>{
 const x=make();x.reviewerEvidence.modelSpatialPlanViewed=true;
 assert.equal(assessR36IndependentReview(x).status,
  'HOLD_REVIEWER_INDEPENDENCE_NOT_CLAIMED');
});
test('R36 rationale omission for a destination is HOLD',()=>{
 const x=make();x.reviewerEvidence.rationale.destinations=[];
 assert.equal(assessR36IndependentReview(x).status,
  'HOLD_REVIEW_RATIONALE_INCOMPLETE');
});
test('R36 invalid/noncanonical UTC timestamp is HOLD',()=>{
 const x=make();x.reviewerEvidence.reviewedAtUtc='2026-02-30T08:00:00Z';
 assert.equal(assessR36IndependentReview(x).status,
  'HOLD_REVIEW_EVIDENCE_FIELDS');
});
test('R36 malformed candidate SHA blocks review and any inference',()=>{
 const x=make();x.expectedSha256='f'.repeat(64);
 const r=assessR36IndependentReview(x);
 assert.equal(r.status,'HOLD_R35_NOT_ELIGIBLE');
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldWrites,0);
});
test('R36 formal review never approves a world or real Qwen achievement',()=>{
 const r=assessR36IndependentReview(make());
 assert.equal(r.constructionApproved,false);
 assert.equal(r.humanArchitecturalQualityApproved,false);
 assert.equal(r.contractAutoGenerated,false);
 assert.equal(r.contractAutoRepaired,false);
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert(r.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
