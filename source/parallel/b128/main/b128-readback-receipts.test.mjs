import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {analyzeB128ReadbackReceipts,emptyB128ReceiptBatch} from './b128-readback-receipts.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const pinned=sha('B127_PINNED_TEST_ONLY');
const batch=()=>emptyB128ReceiptBatch(pinned);
const observation=(value,face,identity='first')=>({
 stateValue:value,observedAscent:face,observedUpperHalfShape:'FORWARD_UPPER_HALF',
 readbackClaimed:true,evidenceSha256:sha(identity),traversalClaim:'NOT_TESTED'});
const receipt=(observations,id='LAB-SYNTHETIC-01')=>({
 receiptId:id,sourceB127Integrity:pinned,edition:'Minecraft Education',
 version:'1.26.32.0',specimenScope:'ISOLATED_NON_PRODUCTION',
 observedAt:'2026-10-15T09:20:00Z',observations});
const analyze=b=>analyzeB128ReadbackReceipts({sourceB127Integrity:pinned,batch:b});
test('empty production intake keeps all 24 hypotheses without inventing readbacks',()=>{
 const r=analyze(batch());
 assert.equal(r.status,'NO_REAL_EDUCATION_CALIBRATION_RECEIPTS');
 assert.equal(r.directionHypothesesNotContradictedByClaims,24);
 assert.equal(r.reportedObservationCount,0);
 assert.equal(r.actualEducationBlockStateMappingCertified,false);
 assert.equal(r.physicalTraversalCertified,false);
 assert.deepEqual(r.operations,[]);
});
test('one self-reported orientation only filters 24 to six unverified hypotheses',()=>{
 const b=batch();b.receipts=[receipt([observation(2,'NORTH')])];
 const r=analyze(b);
 assert.equal(r.directionHypothesesNotContradictedByClaims,6);
 assert.equal(r.reportedStateToFacingClaims['2'],'NORTH');
 assert.equal(r.provenanceAuthenticityVerified,false);
 assert.equal(r.actualEducationBlockStateMappingCertified,false);
 assert.equal(r.worldContacts,0);
});
test('four unique self-reports can narrow to one candidate without certifying it',()=>{
 const b=batch();
 b.receipts=[receipt([
  observation(3,'EAST','a'),observation(0,'NORTH','b'),
  observation(2,'WEST','c'),observation(1,'SOUTH','d')])];
 const r=analyze(b);
 assert.equal(r.directionHypothesesNotContradictedByClaims,1);
 assert.equal(r.allFourDirectionsReported,true);
 assert.equal(r.actualEducationBlockStateMappingCertified,false);
 assert.equal(r.physicalTraversalCertified,false);
 assert.equal(r.constructionAllowed,false);
 assert.equal(r.worldCoordinates,null);
});
test('two compatible receipts from one version still remain unauthenticated',()=>{
 const b=batch();b.receipts=[
 receipt([observation(3,'EAST','a')],'LAB-REPORT-001'),
 receipt([observation(0,'NORTH','b')],'LAB-REPORT-002')];
 assert.equal(analyze(b).directionHypothesesNotContradictedByClaims,2);
});
test('conflicting state -> facing or facing -> state aborts without best-effort fallback',()=>{
 const b=batch();b.receipts=[receipt([
  observation(1,'NORTH','a'),observation(1,'SOUTH','b')])];
 assert.throws(()=>analyze(b),/B128_BAD_OR_DUPLICATED_OBSERVATION/);
 const c=batch();c.receipts=[receipt([
  observation(1,'NORTH','a'),observation(2,'NORTH','b')])];
 assert.throws(()=>analyze(c),/B128_BAD_OR_DUPLICATED_OBSERVATION/);
 const d=batch();d.receipts=[
 receipt([observation(1,'NORTH','a')],'LAB-RECEIPT-001'),
 receipt([observation(1,'EAST','b')],'LAB-RECEIPT-002')];
 assert.throws(()=>analyze(d),/B128_CONTRADICTORY_STATE_TO_FACING/);
 const e=batch();e.receipts=[
 receipt([observation(1,'NORTH','a')],'LAB-RECEIPT-001'),
 receipt([observation(2,'NORTH','b')],'LAB-RECEIPT-002')];
 assert.throws(()=>analyze(e),/B128_CONTRADICTORY_FACING_TO_STATE/);
});
test('wrong edition, mixed version, production scope and untrusted parent hashes fail closed',()=>{
 const a=batch();a.receipts=[receipt([observation(1,'EAST')])];
 a.receipts[0].edition='Minecraft Bedrock';
 assert.throws(()=>analyze(a),/B128_BAD_RECEIPT_OR_VERSION_OR_SCOPE/);
 const b=batch();b.receipts=[receipt([observation(1,'EAST')])];
 b.receipts[0].specimenScope='PRODUCTION_WORLD';
 assert.throws(()=>analyze(b),/B128_BAD_RECEIPT_OR_VERSION_OR_SCOPE/);
 const c=batch();c.receipts=[
 receipt([observation(1,'EAST','a')],'LAB-RECEIPT-001'),
 receipt([observation(2,'WEST','b')],'LAB-RECEIPT-002')];
 c.receipts[1].version='1.26.33.0';
 assert.throws(()=>analyze(c),/B128_MIXED_EDUCATION_VERSIONS/);
 const d=batch();d.sourceB127Integrity=sha('FORGED');
 assert.throws(()=>analyze(d),/B128_BAD_BATCH_OR_UNPINNED_SOURCE/);
});
test('no receipt may carry coordinates, commands, credentials or extra schema properties',()=>{
 const b=batch();b.receipts=[receipt([observation(1,'EAST')])];
 b.receipts[0].worldCoordinates={x:0,y:0,z:0};
 assert.throws(()=>analyze(b),/B128_BAD_RECEIPT_OR_VERSION_OR_SCOPE/);
 const c=batch();c.receipts=[receipt([observation(1,'EAST')])];
 c.receipts[0].observations[0].command='/setblock';
 assert.throws(()=>analyze(c),/B128_BAD_OR_DUPLICATED_OBSERVATION/);
 const d=batch();d.commandCount=20;
 assert.throws(()=>analyze(d),/B128_BAD_BATCH_OR_UNPINNED_SOURCE/);
});
test('duplicate evidence hashes, duplicated IDs and missing raw proof digests fail closed',()=>{
 const b=batch();b.receipts=[receipt([
  observation(1,'EAST','same'),observation(2,'NORTH','same')])];
 assert.throws(()=>analyze(b),/B128_BAD_OR_DUPLICATED_OBSERVATION/);
 const c=batch();c.receipts=[
 receipt([observation(1,'EAST','a')],'LAB-TEST-ONE'),
 receipt([observation(2,'NORTH','b')],'LAB-TEST-ONE')];
 assert.throws(()=>analyze(c),/B128_BAD_RECEIPT_OR_VERSION_OR_SCOPE/);
 const d=batch();d.receipts=[receipt([observation(1,'EAST')])];
 d.receipts[0].observations[0].evidenceSha256='missing';
 assert.throws(()=>analyze(d),/B128_BAD_OR_DUPLICATED_OBSERVATION/);
});
test('traversal claims cannot promote actual step pass or enable execution',()=>{
 const b=batch();const o=observation(1,'SOUTH');o.traversalClaim='HUMAN_REPORTED_UNVERIFIED';
 b.receipts=[receipt([o])];
 const r=analyze(b);
 assert.equal(r.reportedTraversalClaims,1);
 assert.equal(r.physicalTraversalCertified,false);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.commandCount,0);
 assert.equal(r.realWorldContactsByThisTool,0);
});
test('invalid timestamps, non-integer direction states and extra huge input are rejected',()=>{
 const a=batch();a.receipts=[receipt([observation(1,'EAST')])];a.receipts[0].observedAt='2026-02-30T09:00:00Z';
 assert.throws(()=>analyze(a),/B128_BAD_RECEIPT_OR_VERSION_OR_SCOPE/);
 const b=batch();b.receipts=[receipt([observation(4,'EAST')])];
 assert.throws(()=>analyze(b),/B128_BAD_OR_DUPLICATED_OBSERVATION/);
 const c=batch();c.receipts=Array.from({length:17},()=>receipt([observation(1,'EAST')]));
 assert.throws(()=>analyze(c),/B128_BAD_BATCH_OR_UNPINNED_SOURCE/);
});
