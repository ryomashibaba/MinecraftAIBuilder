import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {fixtureAmphitheater} from './b198a-fixtures.mjs';
import {evaluateB198WSource}
 from './b198w-quality-review.mjs';
import {createB198XRevisionBrief,renderB198XRevisionMarkdown}
 from '../source/ai/b198x-quality-revision-brief.mjs';
import {runB198XOfflineRevision,parseB198XArgs}
 from './b198x-offline-review-to-revision.mjs';

const fixture=()=>{
 const design=fixtureAmphitheater();
 const dossier=evaluateB198WSource({design,compiled:compileDesign(design)});
 const rated={
  schema:'minecraftaibuilder-b198w-human-source-rating-v1',
  caseId:'c01',sourceSha256:dossier.independentlyCompiled.sourceSha256,
  geometrySha256:dossier.independentlyCompiled.geometrySha256,
  reviewerConfirmedHuman:true,
  rubric:dossier.humanRubric.rubric.map((r,i)=>({
   criterionId:r.criterionId,
   score:[1,2,3,4][i],
   evidence:'実際に三方向で模型を確認し、改善したい配置と形の関係を具体的に記録 '+i
  }))
 };
 return {design,dossier,rated};
};
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198x-plan-'));

test('B143 validated frozen c01 four-item human feedback prioritizes real low scores, never invents model-built geometry',()=>{
 const {design,dossier,rated}=fixture();
 const protectedId=design.elements[0].id;
 const plan=createB198XRevisionBrief({design,dossier,review:rated,
  protectedElementIds:[protectedId],maxPriorities:2});
 assert.equal(plan.schema,'minecraftaibuilder-b198x-human-feedback-revision-brief-v1');
 assert.equal(plan.status,'REVIEWED_REVISION_BRIEF_READY_FOR_SEPARATE_AUTHORIZATION');
 assert.equal(plan.topHumanRevisionPriorities.length,2);
 assert.deepEqual(plan.topHumanRevisionPriorities.map(x=>x.humanRating),[1,2]);
 assert.deepEqual(plan.protectedOriginalAddElementIds,[protectedId]);
 assert.equal(plan.humanRatingRatio,0.625);
 assert.equal(plan.baseSourceSha256,dossier.independentlyCompiled.sourceSha256);
 assert(plan.originalFrozenJapaneseRequest.includes('公共図書館'));
 assert.equal(plan.humanRatingKind,'SELF_REPORTED_NOT_INDEPENDENTLY_VERIFIED');
 assert.equal(plan.candidateArchitectureGenerated,false);
 assert.equal(plan.modelCallsMade,0);
 assert.equal(plan.approvedModelCalls,0);
 assert.equal(plan.safety.worldWrites,0);
 assert.deepEqual(plan.safety.gates,Array(9).fill('BLOCKED'));
 const md=renderB198XRevisionMarkdown(plan);
 assert(md.includes(plan.baseSourceSha256));
 assert(md.includes(protectedId));
 assert(md.includes('モデル実行・Minecraftへの施工を許可しない'));
});
test('with no explicitly selected protected source elements, plan stays DRAFT and never autonomously calls model',()=>{
 const {design,dossier,rated}=fixture();
 const plan=createB198XRevisionBrief({design,dossier,review:rated});
 assert.equal(plan.status,'DRAFT_NEEDS_EXPLICIT_PROTECTED_PARTS');
 assert.deepEqual(plan.protectedOriginalAddElementIds,[]);
 assert.equal(plan.modelCallsMade,0);
 assert.equal(plan.safety.executionAllowed,false);
});
test('all criteria high and no source HIGH/MEDIUM risk cannot fabricate human deficiencies',()=>{
 const {design,dossier,rated}=fixture();
 rated.rubric.forEach(x=>x.score=4);
 const plan=createB198XRevisionBrief({design,dossier,review:rated,
  protectedElementIds:[design.elements[0].id]});
 if(plan.objectiveSourceRiskHints.length===0){
  assert.equal(plan.status,'NO_REVIEWED_DEFICIENCY_HUMAN_CHOICE_REQUIRED');
  assert.deepEqual(plan.topHumanRevisionPriorities,[]);
 }else{
  assert.equal(plan.topHumanRevisionPriorities.length,0);
  assert(plan.objectiveSourceRiskHints.length>0);
 }
});
test('stale source, invented dossier risks, fake notes or forged reviewer confirmation are rejected',()=>{
 const {design,dossier,rated}=fixture();
 const changed=structuredClone(design);changed.title+=' changed';
 assert.throws(()=>createB198XRevisionBrief({
  design:changed,dossier,review:rated}),/B198X_SOURCE_SHA_MISMATCH/);
 const fake=structuredClone(dossier);
 fake.sourceGeometry.occupiedVoxels=999999999;
 assert.throws(()=>createB198XRevisionBrief({
  design,dossier:fake,review:rated}),/B198X_SOURCE_DOSSIER_FIELD_MISMATCH_sourceGeometry/);
 const bad=structuredClone(rated);bad.sourceSha256='a'.repeat(64);
 assert.throws(()=>createB198XRevisionBrief({
  design,dossier,review:bad}),/B198W_SOURCE_SHA_MISMATCH/);
 const bot=structuredClone(rated);bot.reviewerConfirmedHuman=false;
 assert.throws(()=>createB198XRevisionBrief({
  design,dossier,review:bot}),/B198W_HUMAN_REVIEW_CONFIRMATION_REQUIRED/);
 const empty=structuredClone(rated);empty.rubric[0].evidence='short';
 assert.throws(()=>createB198XRevisionBrief({
  design,dossier,review:empty}),/B198B_BAD_HUMAN_EVIDENCE/);
});
test('protection IDs must exist, refer to real add elements, and have no duplicates',()=>{
 const {design,dossier,rated}=fixture();
 for(const ids of [['not-a-real-element'],[design.elements[0].id,design.elements[0].id],['a;malicious']]){
  assert.throws(()=>createB198XRevisionBrief({
   design,dossier,review:rated,protectedElementIds:ids
  }),/B198X_PROTECTED_IDS_/);
 }
 const cut=structuredClone(design);
 cut.elements.push({id:'subtract-courtyard',shape:'box',mode:'cut',
  origin:[17,6,14],size:[3,1,3]});
 const report=evaluateB198WSource({design:cut,compiled:compileDesign(cut)});
 const scoring=structuredClone(rated);
 scoring.sourceSha256=report.independentlyCompiled.sourceSha256;
 scoring.geometrySha256=report.independentlyCompiled.geometrySha256;
 assert.throws(()=>createB198XRevisionBrief({
  design:cut,dossier:report,review:scoring,protectedElementIds:['subtract-courtyard']
 }),/B198X_PROTECTED_IDS_MUST_REFERENCE_EXISTING_ADD_ELEMENTS/);
});
test('full offline user package preserves source and scored rating, SHA, and never overwrites an existing folder',()=>{
 const {design,dossier,rated}=fixture(),root=temp();
 const input=path.join(root,'unpacked-source'),out=path.join(root,'B198X-reviewed');
 try{
  fs.mkdirSync(input);
  fs.writeFileSync(path.join(input,'c01_source-design.json'),JSON.stringify(design));
  fs.writeFileSync(path.join(input,'c01_B198W_SOURCE_QUALITY_EVIDENCE.json'),
   JSON.stringify(dossier));
  const review=path.join(root,'B198W_HUMAN_REVIEW_c01.json');
  fs.writeFileSync(review,JSON.stringify(rated));
  const args=parseB198XArgs(['--folder',input,'--review',review,'--out',out,
   '--protect',design.elements[0].id]);
  const result=runB198XOfflineRevision(args);
  assert.equal(result.realModelRequestsMade,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.humanProtectionSelectionRequired,false);
  assert.equal(result.offlineBundleFileCount,5);
  const saved=JSON.parse(fs.readFileSync(
   path.join(out,'B198X_REVIEWED_REVISION_BRIEF.json'),'utf8'));
  assert.equal(saved.baseSourceSha256,dossier.independentlyCompiled.sourceSha256);
  assert.deepEqual(JSON.parse(fs.readFileSync(
   path.join(out,'B198X_ORIGINAL_B143_SOURCE.json'))),design);
  assert(fs.existsSync(path.join(out,'B198X_HUMAN_RATING_SOURCE.json')));
  assert(fs.readFileSync(path.join(out,'B198X_REVIEWED_REVISION_BRIEF.md'),'utf8')
   .includes('低評価'));
  assert.throws(()=>runB198XOfflineRevision(args),
   /B198X_OFFLINE_REFUSE_EXISTING_OUTPUT_OR_MISSING_PARENT/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('human reviewer picks immutable ADD element IDs in the SAME SHA-bound JSON; next plan imports them without CLI protection selection',()=>{
 const {design,dossier,rated}=fixture();
 const id=design.elements[1].id;
 rated.protectedElementIds=[id];
 const draft=createB198XRevisionBrief({design,dossier,review:rated});
 assert.equal(draft.status,'REVIEWED_REVISION_BRIEF_READY_FOR_SEPARATE_AUTHORIZATION');
 assert.deepEqual(draft.protectedOriginalAddElementIds,[id]);
 assert.equal(draft.humanSourceProtectionSelectedFromSameRatingJSON,true);
 assert.equal(draft.modelCallsMade,0);
 // Forged id in a manually edited rating file is rejected before planning.
 const invalid=structuredClone(rated);invalid.protectedElementIds=['made-up-id'];
 assert.throws(()=>createB198XRevisionBrief({
  design,dossier,review:invalid}),/B198W_PROTECTED_SELECTION_INVALID/);
 // Explicit override is safe, but must still match a real original ADD part.
 const override=createB198XRevisionBrief({
  design,dossier,review:rated,protectedElementIds:[design.elements[0].id]
 });
 assert.deepEqual(override.protectedOriginalAddElementIds,[design.elements[0].id]);
 assert.equal(override.humanSourceProtectionSelectedFromSameRatingJSON,false);
});
test('offline runner accepts original replay layout and refuses unknown/missing options',()=>{
 const a=parseB198XArgs(['--folder','/tmp/a','--review','/tmp/b',
  '--out','/tmp/c']);
 assert.equal(a.protectedElementIds,null);
 assert.equal(a.maxPriorities,2);
 assert.throws(()=>parseB198XArgs(['--folder','a','--review','b']),
  /B198X_OFFLINE_FOLDER_REVIEW_OUTPUT_REQUIRED/);
 assert.throws(()=>parseB198XArgs(['--folder','a','--review','b',
  '--out','c','--paid-api','yes']),/B198X_OFFLINE_UNKNOWN_OR_DUPLICATE_FLAG/);
 assert.throws(()=>parseB198XArgs(['--folder','a','--review','b',
  '--out','c','--max-priorities','50']),/B198X_OFFLINE_MAX_PRIORITY_1_TO_4/);
});
