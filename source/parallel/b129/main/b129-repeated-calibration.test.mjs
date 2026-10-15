import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {emptyB128ReceiptBatch} from '../../b128/main/b128-readback-receipts.mjs';
import {createB129CalibrationPlan,validateB129CalibrationPlan,
 analyzeB129RepeatedCalibration,B129_REQUIRED_TRIALS} from './b129-repeated-calibration.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const digest=sha('SYNTHETIC_B127_SOURCE_NO_REAL_GAME');
const make=(faces=['EAST','NORTH','WEST','SOUTH'])=>{
 const b=emptyB128ReceiptBatch(digest);
 const vals={EAST:3,NORTH:0,WEST:2,SOUTH:1};
 for(const t of B129_REQUIRED_TRIALS.filter(t=>faces.includes(t.ascent))){
  const o={stateValue:vals[t.ascent],observedAscent:t.ascent,
   observedUpperHalfShape:'FORWARD_UPPER_HALF',readbackClaimed:true,
   evidenceSha256:sha('SYNTHETIC_'+t.trialId),
   traversalClaim:'NOT_TESTED'};
  b.receipts.push({
   receiptId:t.trialId,sourceB127Integrity:digest,
   edition:'Minecraft Education',version:'1.26.32.0',
   specimenScope:'ISOLATED_NON_PRODUCTION',
   observedAt:'2026-10-15T'+(t.round===1?'09':'10')+':'+
    String(faces.indexOf(t.ascent)).padStart(2,'0')+':00Z',
   observations:[o]});
 }
 return b;
};
const review=b=>analyzeB129RepeatedCalibration({
 sourceB127Integrity:digest,sourceShape:'FORWARD_UPPER_HALF',batch:b});
test('creates 8-slot read-only calibration protocol, without placement code or world coordinates',()=>{
 const p=createB129CalibrationPlan(digest,'FORWARD_UPPER_HALF');
 assert.equal(validateB129CalibrationPlan(p),true);
 assert.equal(p.requiredTrials.length,8);
 assert.equal(new Set(p.requiredTrials.map(t=>t.trialId)).size,8);
 assert.deepEqual(p.serverActions,[]);assert.deepEqual(p.gameCommands,[]);
 assert.equal(p.worldCoordinates,null);
 assert.equal(p.constructionAllowed,false);
});
test('empty real intake has 8 missing trials and all 24 unknown direction permutations',()=>{
 const a=review(emptyB128ReceiptBatch(digest));
 assert.equal(a.status,'MORE_ISOLATED_MANUAL_OBSERVATIONS_REQUIRED');
 assert.equal(a.missingTrials.length,8);
 assert.equal(a.claimConsistentDirectionPermutations,24);
 assert.equal(a.actualEducationBlockStateMappingCertified,false);
});
test('one claimed direction across two rounds remains unverified and leaves 6 candidates',()=>{
 const a=review(make(['NORTH']));
 assert.equal(a.humanClaimedTrials,2);
 assert.equal(a.missingTrials.length,6);
 assert.equal(a.claimConsistentDirectionPermutations,6);
 assert.equal(a.independentLabSessionAuthenticityVerified,false);
});
test('eight synthetically consistent observations only permit manual review, never certification',()=>{
 const a=review(make());
 assert.equal(a.humanClaimedTrials,8);
 assert.equal(a.missingTrials.length,0);
 assert.equal(a.claimConsistentDirectionPermutations,1);
 assert.equal(a.status,'READY_FOR_INDEPENDENT_MANUAL_EVIDENCE_REVIEW_NOT_CERTIFIED');
 assert.equal(a.selfReportedShapeAndDirectionChecklistComplete,true);
 assert.equal(a.actualEducationBlockStateMappingCertified,false);
 assert.equal(a.actualPhysicalStairTraversalCertified,false);
 assert.equal(a.executionAllowed,false);
 assert.equal(a.worldContacts,0);assert.deepEqual(a.operations,[]);
});
test('self-reported reverse tread shape triggers HOLD, not an authorized alternative',()=>{
 const b=make();b.receipts[0].observations[0].observedUpperHalfShape='REVERSE_UPPER_HALF';
 const a=review(b);assert.equal(a.status,'HOLD_REPORTED_SHAPE_DIFFERS_FROM_SOURCE');
 assert.equal(a.sourceProxyShapeMismatchReports.length,1);
});
test('UNOBSERVED actual shape is not accepted as full physical evidence',()=>{
 const b=make();b.receipts[7].observations[0].observedUpperHalfShape='UNOBSERVED';
 assert.equal(review(b).status,'HOLD_SHAPE_UNOBSERVED');
});
test('second-round timestamp must be separated by 60s and later than first',()=>{
 const b=make(),first=b.receipts.find(r=>r.receiptId==='LAB-R1-EAST'),
 second=b.receipts.find(r=>r.receiptId==='LAB-R2-EAST');
 second.observedAt=first.observedAt;
 assert.equal(review(b).status,'HOLD_REPEAT_TIME_OR_ORDER');
 assert.equal(review(b).repeatTimestampSpacingViolations[0].deltaSeconds,0);
});
test('trial ID and claimed ascent must agree, one observation per slot',()=>{
 const b=make();b.receipts[0].observations[0].observedAscent='NORTH';
 assert.throws(()=>review(b),/B129_WRONG_ROUND_OR_MULTI_OBSERVATION|B128_CONTRADICTORY_/);
 const c=make();c.receipts[0].observations.push({...c.receipts[0].observations[0],
  observedAscent:'NORTH',stateValue:0,evidenceSha256:sha('DIFFERENT')});
 assert.throws(()=>review(c),/B129_WRONG_ROUND_OR_MULTI_OBSERVATION/);
});
test('duplicate, unplanned, or excessive trial labels rejected and cannot bypass provenance',()=>{
 const b=make();b.receipts[0].receiptId='LAB-UNKNOWN-001';
 assert.throws(()=>review(b),/B129_WRONG_ROUND_OR_MULTI_OBSERVATION/);
 const c=make();c.receipts.push({...c.receipts[0],receiptId:'LAB-R3-EAST',
  observations:[{...c.receipts[0].observations[0],evidenceSha256:sha('extra')}]});
 assert.throws(()=>review(c),/B129_BAD_REPEAT_BATCH/);
});
test('contradictory readback value across rounds or wrong edition fails via B128',()=>{
 const b=make(),r2=b.receipts.find(r=>r.receiptId==='LAB-R2-EAST');
 r2.observations[0].stateValue=2;
 assert.throws(()=>review(b),/B128_CONTRADICTORY_/);
 const c=make();c.receipts[0].edition='Minecraft Bedrock';
 assert.throws(()=>review(c),/B128_BAD_RECEIPT_OR_VERSION_OR_SCOPE/);
});
test('claimed traversal cannot certify physical passes',()=>{
 const b=make();b.receipts[0].observations[0].traversalClaim='HUMAN_REPORTED_UNVERIFIED';
 const r=review(b);
 assert.equal(r.humanReportedTraversalClaims,1);
 assert.equal(r.actualPhysicalStairTraversalCertified,false);
 assert.equal(r.constructionAllowed,false);
});
test('protocol hash drift and invalid parent source are rejected',()=>{
 const p=createB129CalibrationPlan(digest,'FORWARD_UPPER_HALF');
 p.requiredTrials[0].ascent='OTHER';
 assert.equal(validateB129CalibrationPlan(p),false);
 assert.throws(()=>createB129CalibrationPlan('bad','FORWARD_UPPER_HALF'),/B129_BAD_OR_UNPINNED_SOURCE/);
});
