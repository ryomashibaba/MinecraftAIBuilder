import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {compareR5SavedCaptures}
 from '../source/ai/b198zr5-model-comparison.mjs';
import {runR5Comparison}
 from './b198zr5-compare-captures.mjs';
import os from 'node:os';
import path from 'node:path';
const sha=v=>createHash('sha256').update(v).digest('hex');
const spec=CREATION_CASES.find(s=>s.id==='c01');
const R2=JSON.parse(fs.readFileSync(
 new URL('../evidence/b198zr2/assistant-revised-library-r2.json',import.meta.url),'utf8'));
const R3=JSON.parse(fs.readFileSync(
 new URL('../evidence/b198zr3/r2-functional-review-contract.json',import.meta.url),'utf8'));
const c=compileDesign(R2);
const baselineRaw=JSON.stringify({design:R2,
 explanation:'This is a CI test fixture adapted from ASSISTANT R2, NOT Qwen.',
 assumptions:['This is synthetic evidence.']});
const r4Raw=JSON.stringify({design:R2,
 explanation:'Still the SAME assistant-authored fixture, NOT a live model.',
 assumptions:['No real provider used.'],
 spatialPlan:{
  designIntent:'A public gallery connected across multiple occupied levels.',
  massStrategy:'A protective curved shell and five readable levels.',
  circulationStrategy:'A sequential switchback route with an open atrium.',
  entrance:R3.entrance,headroom:R3.headroom,
  protectedVoids:R3.protectedVoids,
  destinations:R3.destinations,
  functionalZones:R3.functionalZones
 }});
const receipt=(mode,raw,origin='TEST_DOUBLE')=>({
 schema:'minecraftaibuilder-b198zr5-receipt-v1',
 mode,rawSha256:sha(raw),promptSha256:sha(spec.prompt),
 modelId:'TEST_NOT_ACTUAL_QWEN',origin,modelRequestsClaimed:0});
const pairedReceipt=origin=>({
 baselineReceipt:receipt('BASELINE_3KEY',baselineRaw,origin),
 plannedReceipt:receipt('PLANNED_R4_4KEY',r4Raw,origin)});
const score=(v)=>({
 caseId:'c01',sourceSha256:c.sourceSha256,
 geometrySha256:c.geometrySha256,reviewerConfirmedHuman:true,
 rubric:spec.criteria.map(x=>({criterionId:x.id,score:v,
  evidence:'Synthetic review example for testing; not a real human evaluation.'}))
});
test('original baseline B143 HOLD is visible, missing R4 is never called superior',()=>{
 const invalid=JSON.stringify({design:{schema:R2.schema,designOnly:true,
  id:'invalid-first-real-candidate',title:'Impossible bounds',
  brief:'Synthetic example of negative outside-bounds candidate',
  bounds:{width:48,height:40,depth:48},
  elements:[
   {id:'floor',shape:'box',mode:'add',material:'stone',
    origin:[0,0,0],size:[48,2,48]},
   {id:'sea-entry',shape:'beam',mode:'add',material:'stone',
    start:[24,0,48],end:[24,0,60],thickness:2}
  ]},
  explanation:'Out-of-bounds source to exercise negative case',
  assumptions:[]});
 const report=compareR5SavedCaptures({caseId:'c01',baselineRaw:invalid});
 assert.equal(report.status,'HOLD_MISSING_SAVED_MODEL_PAIR');
 assert.equal(report.baseline.status,'HOLD_STRICT_SOURCE_INVALID');
 assert.match(report.baseline.sourceError,/B143_OUTSIDE_LOCAL_BOUNDS/);
 assert.equal(report.planned.status,'NOT_PROVIDED');
 assert.equal(report.humanScoreDifferenceR4MinusBaseline,null);
 assert.equal(report.safety.worldWrites,0);
});
test('ASSISTANT R2 or test-double fixtures NEVER qualify as genuine R4 vs baseline trial',()=>{
 const result=compareR5SavedCaptures({
  baselineRaw,plannedRaw:r4Raw,
  ...pairedReceipt('ASSISTANT_AUTHORED_REVISION'),
  baselineHuman:score(1),plannedHuman:score(4)});
 assert.equal(result.baseline.status,'SOURCE_COMPILED_HUMAN_REVIEW_REQUIRED');
 assert.equal(result.planned.status,'SOURCE_COMPILED_HUMAN_REVIEW_REQUIRED');
 assert.equal(result.planned.declaredPlan.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(result.status,'HOLD_NOT_COMPARABLE_MODEL_PROVENANCE');
 assert.equal(result.humanScoreDifferenceR4MinusBaseline,null);
 assert.equal(result.noOriginalityOrAestheticWinnerAutomaticallyDeclared,true);
});
test('even user-claimed real captures are not compared until matching independent human observations exist',()=>{
 const result=compareR5SavedCaptures({
  baselineRaw,plannedRaw:r4Raw,
  ...pairedReceipt('USER_SUPPLIED_REAL_MODEL_CLAIM')});
 assert.equal(result.status,'HOLD_PAIRED_HUMAN_REVIEW_MISSING');
 assert.equal(result.modelPairEligibleByUnverifiedReceipts,true);
 assert.equal(result.providerIdentityIndependentlyAuthenticated,false);
 assert.equal(result.humanScoreDifferenceR4MinusBaseline,null);
 assert.equal(result.frozenCriteria.length,4);
});
test('paired human score difference is descriptive only: same exact geometry cannot prove R4 improvement',()=>{
 const result=compareR5SavedCaptures({
  baselineRaw,plannedRaw:r4Raw,
  ...pairedReceipt('USER_SUPPLIED_REAL_MODEL_CLAIM'),
  baselineHuman:score(1),plannedHuman:score(4)});
 assert.equal(result.status,'PAIRED_SELF_REPORTED_HUMAN_SCORES_AVAILABLE_NOT_MODEL_CERTIFICATION');
 assert.equal(result.humanScoreDifferenceR4MinusBaseline,0.75);
 assert.equal(result.baseline.sourceSha256,result.planned.sourceSha256);
 assert.equal(result.noOriginalityOrAestheticWinnerAutomaticallyDeclared,true);
 assert.equal(result.humanScoreSignificanceNotEstablished,true);
 assert.equal(result.singleCaseCannotProveGeneralization,true);
});
test('mismatched prompt/raw receipts and unapproved score changes fail closed',()=>{
 const bad=pairedReceipt('USER_SUPPLIED_REAL_MODEL_CLAIM');
 bad.plannedReceipt.promptSha256='0'.repeat(64);
 const result=compareR5SavedCaptures({baselineRaw,plannedRaw:r4Raw,...bad,
  baselineHuman:score(1),plannedHuman:score(4)});
 assert.equal(result.status,'HOLD_NOT_COMPARABLE_MODEL_PROVENANCE');
 assert.equal(result.planned.receipt.status,'RECEIPT_DIGEST_MISMATCH');
 const tampered=score(4);tampered.sourceSha256='f'.repeat(64);
 assert.throws(()=>compareR5SavedCaptures({baselineRaw,
  baselineHuman:tampered}),/HUMAN_REVIEW_NOT_PINNED_OR_UNCONFIRMED/);
});
test('compilable R4 with failed declared spatial intent is still a quality HOLD',()=>{
 const payload=JSON.parse(r4Raw);
 payload.spatialPlan.protectedVoids.push({id:'impossible-all-ground',
  origin:[0,0,0],size:[48,1,48],maxOccupiedCells:0});
 const raw=JSON.stringify(payload);
 const result=compareR5SavedCaptures({baselineRaw,plannedRaw:raw,
  baselineReceipt:receipt('BASELINE_3KEY',baselineRaw,'USER_SUPPLIED_REAL_MODEL_CLAIM'),
  plannedReceipt:receipt('PLANNED_R4_4KEY',raw,'USER_SUPPLIED_REAL_MODEL_CLAIM'),
  baselineHuman:score(2),plannedHuman:score(4)});
 assert.equal(result.planned.status,'HOLD_MODEL_DECLARED_SPATIAL_PLAN');
 assert.equal(result.status,'HOLD_SOURCE_OR_DECLARED_SPATIAL_PLAN');
 assert.equal(result.humanScoreDifferenceR4MinusBaseline,null); // HOLD suppresses score comparison
 assert.equal(result.noOriginalityOrAestheticWinnerAutomaticallyDeclared,true);
});
test('CLI creates one non-overwriting HOLD report without making missing R4',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'b198zr5-'));
 try{
  const baseline=path.join(folder,'baseline-original.txt'),out=path.join(folder,'report.json');
  fs.writeFileSync(baseline,baselineRaw);
  const report=runR5Comparison({baselinePath:baseline,out});
  assert.equal(report.status,'HOLD_MISSING_SAVED_MODEL_PAIR');
  assert.equal(report.baseline.originalRawSha256,sha(baselineRaw));
  assert.equal(JSON.parse(fs.readFileSync(out,'utf8')).status,report.status);
  assert.throws(()=>runR5Comparison({baselinePath:baseline,out}),/REFUSE_OVERWRITE/);
 }finally{fs.rmSync(folder,{recursive:true,force:true})}
});
