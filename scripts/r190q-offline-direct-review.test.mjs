import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {reviewSavedR190QDirect} from './r190q-offline-direct-review.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {SCHEMA as R3} from '../source/ai/b198zr3-functional-review-contract.mjs';
const fixture=()=>{
 const design={schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'r190q-synthetic-platform',title:'SYNTHETIC route contract fixture',
  brief:'A bare supported test platform, NOT a model-designed building',
  designOnly:true,bounds:{width:24,height:16,depth:24},
  elements:[{id:'floor',shape:'box',mode:'add',material:'stone',
   origin:[2,1,2],size:[18,1,18]}]};
 const spatialPlan={designIntent:'Artificial test layout, not a proposal',
  massStrategy:'One flat test slab with no meaningful architecture',
  circulationStrategy:'Simple source-only horizontal movement on the slab',
  entrance:[4,2,4],headroom:2,protectedVoids:[],
  destinations:[{id:'model-goal',point:[11,2,11],maximumPathSteps:30}],
  functionalZones:[{id:'model-zone',origin:[4,2,4],size:[8,1,8],
   minimumReachablePositions:50,minimumReachablePercent:70}]};
 const contract={schema:R3,caseId:'outside-review-synthetic-only',
  authorship:'INDEPENDENT_REVIEW_DRAFT',
  sourceSha256:compileDesign(design).sourceSha256,
  entrance:[4,2,4],headroom:2,protectedVoids:[],
  destinations:[{id:'independent-goal',point:[12,2,12],maximumPathSteps:50}],
  functionalZones:[{id:'independent-zone',origin:[4,2,4],size:[9,1,9],
   minimumReachablePositions:60,minimumReachablePercent:70}]};
 return {raw:JSON.stringify({design,explanation:'Synthetic test only',assumptions:[],spatialPlan}),contract};
};
function runTest(change=()=>{}){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'r190q-'));
 const {raw,contract}=fixture();change(contract);
 const rawFile=path.join(home,'original.txt'),contractFile=path.join(home,'review.json');
 fs.writeFileSync(rawFile,raw);fs.writeFileSync(contractFile,JSON.stringify(contract));
 const before=fs.readFileSync(rawFile);
 const result=reviewSavedR190QDirect({rawFile,contractFile,out:path.join(home,'result')});
 assert.deepEqual(fs.readFileSync(rawFile),before);
 assert.equal(result.actualLocalModelCalls,0);
 assert.equal(result.constructionApproved,false);
 assert.equal(result.executionAllowed,false);
 assert.equal(result.worldWrites,0);
 assert.equal(result.worldContacts,0);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.ok(fs.existsSync(path.join(home,'result','R190Q_OFFLINE_INDEPENDENT_REVIEW.json')));
 assert.throws(()=>reviewSavedR190QDirect({rawFile,contractFile,
  out:path.join(home,'result')}),/R190Q_REFUSE_EXISTING_OUTPUT/);
 fs.rmSync(home,{recursive:true,force:true});
 return result;
}
test('independent external contract passes separately; no model replay',()=>{
 const r=runTest();
 assert.equal(r.status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
 assert.equal(r.independentReview.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(r.humanArtReview,'ART_HOLD');
 assert.equal(r.independentNaturalLanguageCoverageCertified,false);
});
test('independent unreachable destination cannot be self-certified',()=>{
 const r=runTest(c=>{c.destinations[0].point=[23,2,23]});
 assert.equal(r.status,'HOLD_SPATIAL_PLAN_OR_INDEPENDENT_CONTRACT');
 assert.equal(r.originalModelDeclaredReview.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(r.independentReview.status,'HOLD_FUNCTIONAL_CONTRACT_FAILURE');
});
test('wrong pinned source SHA fails closed without altering original',()=>{
 const r=runTest(c=>{c.sourceSha256='0'.repeat(64)});
 assert.equal(r.status,'HOLD_ORIGINAL_OR_INDEPENDENT_REVIEW_INVALID');
 assert.match(r.failureReason,/SOURCE_SHA_STALE/);
});
test('model-owned contract masquerading as independent one is blocked',()=>{
 const r=runTest(c=>{c.authorship='MODEL_DECLARED_UNVERIFIED'});
 assert.equal(r.status,'HOLD_ORIGINAL_OR_INDEPENDENT_REVIEW_INVALID');
 assert.match(r.failureReason,/INDEPENDENT_CONTRACT_REQUIRED/);
});
