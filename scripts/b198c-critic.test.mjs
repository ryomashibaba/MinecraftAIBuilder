import test from 'node:test';import assert from 'node:assert/strict';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {auditInteriorTopology,critiqueArchitecture}
 from '../source/ai/b198c-spatial-critic.mjs';
import {proposeGuardedArchitecturalRepair}
 from '../source/ai/b198c-guarded-repair.mjs';
import {fragmentedGallery,bridgedGallery,enclosedAtrium,candidate}
 from './b198c-fixtures.mjs';
const protectedIds=['west-original-platform','east-original-platform'];
test('REAL source graph joins formerly disconnected 2wide galleries after adding genuine bridge',()=>{
 const a=fragmentedGallery(),b=bridgedGallery();
 const x=auditInteriorTopology({design:a,compiled:compileDesign(a)});
 const y=auditInteriorTopology({design:b,compiled:compileDesign(b)});
 assert(x.sameLevelComponentCount>=2);
 assert(y.verifiedTwoWideStandingSquares>x.verifiedTwoWideStandingSquares);
 assert(y.largestSameLevelConnectedSquareCount>x.largestSameLevelConnectedSquareCount+30);
 assert(y.largestComponentShare>x.largestComponentShare);
 assert.equal(x.actualInGameCirculationCertified,false);
 assert.equal(y.caveatStepTransitionsAreNotCertified,true);
 assert(y.largestComponents[0].sameElevationHorizontalMovesAtLeast>0);
});
test('exact negative-space 3D flood finds enclosed air, then an actual opening releases it to exterior',()=>{
 const d=enclosedAtrium(),before=auditInteriorTopology({design:d});
 assert(before.enclosedAirComponentCount>=1);
 assert(before.largestEnclosedAirVolume>=1000);
 const e=structuredClone(d);
 e.elements.push({id:'cut-a-real-doorway',shape:'box',mode:'cut',
  origin:[5,9,12],size:[1,3,5]});
 const open=auditInteriorTopology({design:e});
 assert.equal(open.enclosedAirComponentCount,0);
 assert.equal(open.largestEnclosedAirVolume,0);
 assert.equal(open.architecturalSemanticsCertified,false);
 assert.equal(open.cavityGeometryCanBeUnusable,true);
});
test('critic raises precise disconnected-floor risk without judging human architectural beauty',()=>{
 const d=fragmentedGallery(),c=critiqueArchitecture({design:d});
 assert(c.findings.some(x=>x.id==='FRAGMENTED_PUBLIC_SOURCE_FLOORS'&&x.severity==='HIGH'));
 assert(c.findings.every(x=>x.deterministicSourceBased));
 assert.equal(c.buildStatus,'NOT_PREPARED');
 assert.equal(c.qualityHumanReview,'REQUIRED');
 const joined=critiqueArchitecture({design:bridgedGallery()});
 assert(joined.objectiveAudit.largestSameLevelConnectedSquareCount>
  c.objectiveAudit.largestSameLevelConnectedSquareCount);
});
test('model-authored bridge is accepted ONLY with actual improvement, preserved platforms & original open spans',async()=>{
 const base=fragmentedGallery(),frozen=structuredClone(base);
 const result=await proposeGuardedArchitecturalRepair({
  userGoal:'Connect the two separated galleries with a wide floating public bridge without changing either original plaza',
  generator:async()=>candidate(bridgedGallery()),
  baseDesign:base,expectedBaseSha256:compileDesign(base).sourceSha256,
  protectedElementIds:protectedIds,minimumLargestConnectedGain:20
 });
 assert.deepEqual(base,frozen);
 assert.equal(result.evidence.status,'VERIFIED_SOURCE_REPAIR_PROPOSAL_REVIEW_ONLY');
 assert(result.evidence.verifiedLargest2WideConnectedSquareGain>=20);
 assert.equal(result.evidence.sourceProtectedVoxelProof.exactProtectedVoxelPreservationPassed,true);
 assert.equal(result.evidence.inheritedFloorClearanceProof.damagedTwoWideOpenFootprints,0);
 assert.deepEqual(result.evidence.sourceRevisionDiff.added,['real-width-four-source-bridge']);
 assert.equal(result.evidence.actualMinecraftWalkingCertified,false);
 assert.equal(result.evidence.constructionApproved,false);
 assert.equal(result.evidence.worldWrites,0);
 assert.deepEqual(result.evidence.BuildPlan.operations,[]);
 assert.deepEqual(result.evidence.gates,Array(9).fill('BLOCKED'));
});
test('unimproved pseudo repair fails after bounded attempts; existing base remains pristine',async()=>{
 const base=fragmentedGallery(),before=JSON.stringify(base);
 await assert.rejects(()=>proposeGuardedArchitecturalRepair({
  userGoal:'Add real supported 2wide gallery connection; no cosmetic-only answer',
  generator:async()=>candidate({...base,
   elements:[...base.elements,{id:'fake-glow-decor',shape:'box',mode:'add',
    origin:[4,17,7],size:[4,1,4],material:'glow'}]}),
  baseDesign:base,expectedBaseSha256:compileDesign(base).sourceSha256,
  protectedElementIds:protectedIds,minimumLargestConnectedGain:20
 }),/B198A_CANDIDATE_REJECTED_AFTER_2_ATTEMPTS/);
 assert.equal(JSON.stringify(base),before);
});
test('malicious CUT through protected unchanged-ID deck is HOLD, despite apparent bridge quality',async()=>{
 const base=fragmentedGallery();
 const damaged=bridgedGallery();
 damaged.elements.push({id:'subtractive-underpass-cutter',shape:'box',
  mode:'cut',origin:[7,5,10],size:[4,1,4]});
 await assert.rejects(()=>proposeGuardedArchitecturalRepair({
  userGoal:'Connect the public decks while keeping every earlier floor slab intact',
  generator:async()=>candidate(damaged),
  baseDesign:base,expectedBaseSha256:compileDesign(base).sourceSha256,
  protectedElementIds:protectedIds,minimumLargestConnectedGain:5
 }),/B198A_CANDIDATE_REJECTED_AFTER_2_ATTEMPTS/);
});
test('even an apparently better alternative is HOLD if it closes earlier open floors',async()=>{
 const base=fragmentedGallery(),blocked=bridgedGallery();
 blocked.elements.push({id:'unwanted-overhang-across-floor',shape:'box',
  mode:'add',origin:[4,6,7],size:[6,1,12],material:'glass'});
 await assert.rejects(()=>proposeGuardedArchitecturalRepair({
  userGoal:'Build a new connecting bridge without reducing any existing free-standing space',
  generator:async()=>candidate(blocked),
  baseDesign:base,expectedBaseSha256:compileDesign(base).sourceSha256,
  protectedElementIds:protectedIds,minimumLargestConnectedGain:5
 }),/B198A_CANDIDATE_REJECTED_AFTER_2_ATTEMPTS/);
});
test('stale source revision and absent real adapter rejected BEFORE generated plan; no world access',async()=>{
 const base=fragmentedGallery();let called=0;
 await assert.rejects(()=>proposeGuardedArchitecturalRepair({
  userGoal:'Join all of the elevated galleries and preserve both original platforms',
  generator:async()=>{called++;return candidate(bridgedGallery())},
  baseDesign:base,expectedBaseSha256:'0'.repeat(64),
  protectedElementIds:protectedIds
 }),/B198C_STALE_MODEL_BEFORE_ANY_GENERATION/);
 assert.equal(called,0);
 await assert.rejects(()=>proposeGuardedArchitecturalRepair({
  userGoal:'Join original galleries safely with a real supported walkway',
  baseDesign:base,expectedBaseSha256:compileDesign(base).sourceSha256,
  protectedElementIds:protectedIds
 }),/B198C_GENUINE_MODEL_ADAPTER_REQUIRED/);
});
test('source critic rejects mismatched design vs compiled object instead of trusting a fake audit',()=>{
 const d=enclosedAtrium(),wrong=compileDesign(fragmentedGallery());
 assert.throws(()=>auditInteriorTopology({design:d,compiled:wrong}),
  /B198C_UNVERIFIED_SOURCE/);
});
