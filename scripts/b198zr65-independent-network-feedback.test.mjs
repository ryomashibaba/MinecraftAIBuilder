import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {analyzeR64UnclaimedFloorConnectivity}
 from './b198zr64-unclaimed-floor-connectivity.mjs';
import {bridgeR65IndependentSpatialEvidence}
 from './b198zr65-independent-network-feedback.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
function built(p){
 const raw=JSON.stringify(p),c=compileDesign(p.design);
 const options={raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:c.geometrySha256};
 const evidence=analyzeR64UnclaimedFloorConnectivity(options);
 return {options,evidence};
}
test('R65 independently rechecks R64; no flags never means architecture PASS',()=>{
 const p=built(r32Courtyard());
 const result=bridgeR65IndependentSpatialEvidence({
  ...p.options,r64Evidence:p.evidence});
 assert.equal(result.originalR64RecomputedAndCompared,true);
 assert.equal(result.modelDeclaredSpatialPlanIgnored,true);
 assert.equal(result.allIssueFreeIsNotQualityPass,true);
 assert.equal(result.independentHumanDesignReview,'NOT_REVIEWED');
 assert.deepEqual(result.proposedGeometryChanges,[]);
 assert.equal(result.automaticModelRequest,false);
 assert.equal(result.freshModelConsentRequired,true);
 assert(result.safety.gates.every(v=>v==='BLOCKED'));
 assert.deepEqual(result.safety.BuildPlan.operations,[]);
 assert.equal(result.worldWrites,0);
});
test('R65 does not depend on the model choosing easy self-declared regions',()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'isolated-deck',shape:'box',mode:'add',
  material:'wood',origin:[2,8,2],size:[5,1,5]});
 p.spatialPlan.entrance=[9,9,9];
 p.spatialPlan.destinations=[];
 p.spatialPlan.functionalZones=[];
 const b=built(p);
 const result=bridgeR65IndependentSpatialEvidence({
  ...b.options,r64Evidence:b.evidence});
 assert(result.issues.some(x=>x.kind==='NO_LOW_LEVEL_CANDIDATE_IN_SOME_COMPONENTS'));
 assert(result.issues.every(x=>x.independentHumanReviewRequired===true));
 assert(result.issues.every(x=>x.automaticReject===false));
 assert(result.issues.every(x=>x.basis==='R64_ALL_FINAL_CONCEPT_VOXELS_WITHOUT_MODEL_SPATIALPLAN'));
 assert.equal(result.deliberateSeparatedBuildingsMustNotBeAutomaticallyJoined,true);
});
test('R65 finds a truly solid interior without fabricating rooms or specific stairs',()=>{
 const p=r32Courtyard();
 p.design.elements=[{id:'solid-full-block',shape:'box',mode:'add',
  material:'stone',origin:[0,0,0],size:[16,12,16]}];
 const b=built(p);
 assert.equal(b.evidence.metrics.supportedTwoHighStandingPositions,0);
 const result=bridgeR65IndependentSpatialEvidence({
  ...b.options,r64Evidence:b.evidence});
 assert(result.issues.some(x=>x.kind==='NO_SUPPORTED_STANDING_POSITIONS'));
 assert.equal(result.largeDesignMustNotBeShrunkToSatisfyMetrics,true);
 assert.deepEqual(result.proposedGeometryChanges,[]);
});
test('R65 rejects forged network numbers even when SHA and schema remain unchanged',()=>{
 const b=built(r32Courtyard());
 const forged=structuredClone(b.evidence);
 forged.metrics.supportedTwoHighStandingPositions+=1000;
 assert.throws(()=>bridgeR65IndependentSpatialEvidence({
  ...b.options,r64Evidence:forged}),/R64_NUMERICAL_EVIDENCE_TAMPER_OR_STALE/);
 const forgedConcerns=structuredClone(b.evidence);
 forgedConcerns.possibleSpatialConcerns=[{kind:'NO_SAME_LEVEL_2X2_CLEAR_STANDING_PAD'}];
 assert.throws(()=>bridgeR65IndependentSpatialEvidence({
  ...b.options,r64Evidence:forgedConcerns}),/R64_NUMERICAL_EVIDENCE_TAMPER_OR_STALE/);
});
test('R65 rejects stale original, missing R64 and wrong final geometry provenance',()=>{
 const b=built(r32Courtyard());
 assert.throws(()=>bridgeR65IndependentSpatialEvidence({
  ...b.options,expectedRawSha256:'f'.repeat(64),r64Evidence:b.evidence}),
 /IMMUTABLE_SOURCE_REQUIRED/);
 assert.throws(()=>bridgeR65IndependentSpatialEvidence({
  ...b.options,r64Evidence:null}),/R64_ORIGINAL_PROVENANCE_MISMATCH/);
 assert.throws(()=>bridgeR65IndependentSpatialEvidence({
  ...b.options,expectedGeometrySha256:'e'.repeat(64),r64Evidence:b.evidence}),
 /R64_ORIGINAL_PROVENANCE_MISMATCH/);
});
