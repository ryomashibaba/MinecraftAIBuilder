import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB129} from './b129-fleet-protocol.mjs';
import {validateB129CalibrationPlan} from './b129-repeated-calibration.mjs';
const r=JSON.parse(fs.readFileSync('b129-review-output/B129_Repeatability_Gate_Offline_Report.json','utf8'));
test('original 15 buildings 66 floors 102 stairs remain pinned to B127 B128',()=>{
 assert.equal(validateB129(r),true);
 assert.match(r.sourceB127Integrity,/^[a-f0-9]{64}$/);
 assert.match(r.sourceB128Integrity,/^[a-f0-9]{64}$/);
 assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.sourceStairs,102);
 assert.equal(r.totals.sourceFloors,66);
 assert.equal(r.totals.shortlistedDesignConcepts,1);
});
test('repeatability protocol is complete, eight unique slots and correct immutable parent',()=>{
 assert.equal(validateB129CalibrationPlan(r.plan),true);
 assert.equal(r.totals.requiredIsolatedHumanTrialSlots,8);
 assert.equal(r.plan.requiredTrials.filter(x=>x.round===1).length,4);
 assert.equal(r.plan.requiredTrials.filter(x=>x.round===2).length,4);
 assert.equal(new Set(r.plan.requiredTrials.map(x=>x.trialId)).size,8);
 assert.equal(r.plan.sourceB127Integrity,r.sourceB127Integrity);
});
test('do not forge Education game readbacks or reduce unverified direction guesses',()=>{
 assert.equal(r.totals.actualHumanReceiptsSupplied,0);
 assert.equal(r.totals.missingTrialSlots,8);
 assert.equal(r.totals.directionHypothesesNotContradictedByClaims,24);
 assert.equal(r.intake.status,'MORE_ISOLATED_MANUAL_OBSERVATIONS_REQUIRED');
 assert.equal(r.totals.certifiedRealEducationOrientationMappings,0);
 assert.equal(r.totals.certifiedActualStairTraversal,0);
 assert.equal(r.intake.evidenceImageContentIndependentlyReviewed,false);
});
test('human report intake, protocol, and full fleet never authorize world execution',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);
 assert.equal(r.totals.sourceBlocksChanged,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);
 assert(r.gates.every(g=>g.status==='BLOCKED'));
 assert.deepEqual(r.plan.gameCommands,[]);
 assert.deepEqual(r.plan.serverActions,[]);
 assert.equal(r.plan.worldCoordinates,null);
});
test('machine plan and Japanese observation worksheet retain explicit non-execution caveats',()=>{
 const plan=JSON.parse(fs.readFileSync('b129-review-output/B129_Isolated_Calibration_Protocol.json','utf8'));
 const template=JSON.parse(fs.readFileSync('b129-review-output/B129_Empty_Receipt_Batch.json','utf8'));
 const ja=fs.readFileSync('b129-review-output/B129_Manual_Calibration_Worksheet_JA.md','utf8');
 assert.equal(validateB129CalibrationPlan(plan),true);
 assert.deepEqual(template.receipts,[]);
 assert.equal(template.sourceB127Integrity,r.sourceB127Integrity);
 assert(ja.includes('LAB-R1-EAST'));
 assert(ja.includes('LAB-R2-SOUTH'));
 assert(ja.includes('NOT_PREPARED'));
 assert(ja.includes('実機未接続'));
});
test('tampered calibration packet or successful fake passage claim cannot pass integrity',()=>{
 const t=structuredClone(r);t.intake.actualEducationBlockStateMappingCertified=true;
 assert.equal(validateB129(t),false);
 const u=structuredClone(r);u.gates[0].status='PASS';
 assert.equal(validateB129(u),false);
});
