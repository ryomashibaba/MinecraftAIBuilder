import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB128} from './b128-fleet-intake-review.mjs';
const r=JSON.parse(fs.readFileSync('b128-review-output/B128_Offline_Readback_Intake_Review.json','utf8'));
test('15 buildings 66 floors and 102 stairs remain B127 digest pinned',()=>{
 assert.equal(validateB128(r),true);
 assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.originalFloors,66);
 assert.equal(r.totals.originalStairs,102);
 assert.match(r.sourceB127Integrity,/^[0-9a-f]{64}$/);
 assert.match(r.sourceB126Integrity,/^[0-9a-f]{64}$/);
});
test('production report never invents an actual Education receipt',()=>{
 assert.equal(r.totals.humanSuppliedReceiptCount,0);
 assert.equal(r.totals.humanReportedOrientationObservations,0);
 assert.equal(r.receiptReview.status,'NO_REAL_EDUCATION_CALIBRATION_RECEIPTS');
 assert.equal(r.totals.consistentButUnverifiedStatePermutations,24);
 assert.equal(r.receiptReview.remainingHypothesisValuesByDirection.length,24);
 assert.equal(r.receiptReview.reportedEducationVersion,null);
});
test('receipts cannot enable construction, certification or game connections',()=>{
 assert.equal(r.totals.certifiedActualEducationOrientationMappings,0);
 assert.equal(r.totals.certifiedRealPlayerTraversal,0);
 assert.equal(r.receiptReview.provenanceAuthenticityVerified,false);
 assert.equal(r.receiptReview.actualEducationBlockStateMappingCertified,false);
 assert.equal(r.receiptReview.physicalTraversalCertified,false);
 assert.equal(r.receiptReview.sourcedImageDigestPixelsInspected,undefined);
 assert.equal(r.receiptReview.suppliedImageDigestPixelsInspected,false);
 assert.equal(r.receiptReview.worldContacts,0);
 assert.deepEqual(r.receiptReview.operations,[]);
 assert.equal(r.receiptReview.constructionAllowed,false);
});
test('inherited 9 gates remain BLOCKED with immutable BuildPlan',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.executionAllowed,false);
 assert.equal(r.constructionApproved,false);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);
 assert.equal(r.gates.length,9);
 assert(r.gates.every(x=>x.status==='BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert(r.cases.every(x=>x.sourceBuildingUnmodified));
});
test('receipt template and hypothesis output are non-executable and truthful',()=>{
 const csv=fs.readFileSync('b128-review-output/B128_Unverified_Orientation_Hypotheses.csv','utf8');
 const md=fs.readFileSync('b128-review-output/B128_Readback_Intake_Review_JA.md','utf8');
 const template=JSON.parse(fs.readFileSync('b128-review-output/B128_Empty_Receipt_Template.json','utf8'));
 assert.equal(csv.trim().split('\n').length,25);
 assert(md.includes('実Minecraft Educationで認証済みの方向対応|0'));
 assert(md.includes('NOT_PREPARED'));
 assert.deepEqual(template.receipts,[]);
 assert.equal(template.sourceB127Integrity,r.sourceB127Integrity);
 assert(!('worldCoordinates'in template));
 assert(!('commands'in template));
});
test('tampering with a report cannot pass its integrity hash or safety validation',()=>{
 const bad=structuredClone(r);
 bad.totals.certifiedActualEducationOrientationMappings=4;
 assert.equal(validateB128(bad),false);
 const bad2=structuredClone(r);
 bad2.gates[0].status='PASS';
 assert.equal(validateB128(bad2),false);
});
