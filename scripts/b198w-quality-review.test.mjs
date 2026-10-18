import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {fixtureAmphitheater} from './b198a-fixtures.mjs';
import {runB198UOfflineReplay} from './b198u-offline-replay.mjs';
import {evaluateB198WSource,renderB198WReviewHtml,
 writeB198WReviewBundle,validateB198WHumanReview,SCHEMA}
 from './b198w-quality-review.mjs';

const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198w-review-'));
const design=()=>fixtureAmphitheater();
const rated=(d,score=3)=>({
 schema:'minecraftaibuilder-b198w-human-source-rating-v1',
 caseId:d.caseId,
 sourceSha256:d.independentlyCompiled.sourceSha256,
 geometrySha256:d.independentlyCompiled.geometrySha256,
 reviewerConfirmedHuman:true,
 rubric:d.humanRubric.rubric.map((r,i)=>({
  criterionId:r.criterionId,score,
  evidence:'3D画面を正面・俯瞰・側面から確認し、評価項目'+(i+1)+'の状態を記録した。'
 }))
});
test('one real B143 source yields geometry facts + frozen Japanese c01 human intent with NO automatic semantic PASS',()=>{
 const d=design(),compiled=compileDesign(d);
 const report=evaluateB198WSource({design:d,compiled});
 assert.equal(report.schema,SCHEMA);
 assert.equal(report.caseId,'c01');
 assert(report.frozenJapaneseRequest.includes('未来型の公共図書館'));
 assert(report.frozenJapaneseRequest.includes('吹き抜け'));
 assert.equal(report.sourceGeometry.occupiedVoxels,compiled.primitives.length);
 assert(report.sourceGeometry.actualHeightSpan>0);
 assert(report.sourceGeometry.twoWideSupportedStandingSquares>=0);
 assert(report.sourceGeometry.usedMaterialFamilies>=1);
 assert.equal(report.independentlyCompiled.sourceSha256,compiled.sourceSha256);
 assert.equal(report.sourceOnlyGoals.sourceOnlyNotSemantic,true);
 assert.equal(report.humanRubric.status,'UNREVIEWED');
 assert.equal(report.humanRubric.rubric.length,4);
 assert(report.humanRubric.rubric.every(x=>x.score===null));
 assert.equal(report.semanticsCertified,false);
 assert.equal(report.aestheticsCertified,false);
 assert.equal(report.validCentralAtriumMeaningCertified,false);
 assert.equal(report.upperStarLoungeMeaningCertified,false);
 assert.equal(report.actualMinecraftPlayerWalkingCertified,false);
 assert.equal(report.modelCallsMade,0);
 assert.equal(report.networkCallsMade,0);
 assert.equal(report.safety.worldWrites,0);
 assert.deepEqual(report.safety.gates,Array(9).fill('BLOCKED'));
});
test('source hash mismatch or wrong frozen case cannot fake a valid review dossier',()=>{
 const d=design(),c=compileDesign(d);
 const changed=structuredClone(d);changed.title='Changed architecture title';
 assert.throws(()=>evaluateB198WSource({design:changed,compiled:c}),
  /B198W_B143_INDEPENDENT_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>evaluateB198WSource({design:d,compiled:c,caseId:'unknown'}),
  /B198W_FROZEN_CREATION_CASE_REQUIRED/);
});
test('offline review board renders entirely self-contained and binds human checklist to source SHA without network',()=>{
 const d=design(),report=evaluateB198WSource({design:d,compiled:compileDesign(d)});
 const html=renderB198WReviewHtml(report,'c01_index.html');
 assert(html.startsWith('<!doctype html>'));
 assert(html.includes('iframe title="独立コンパイルしたMinecraft建築の3Dソース"'));
 assert(html.includes('sandbox="allow-scripts"'));
 assert(html.includes('src="c01_index.html"'));
 assert(html.includes(report.independentlyCompiled.sourceSha256));
 assert(html.includes('B198W_HUMAN_REVIEW_'));
 assert(html.includes('reviewerConfirmedHuman:true'));
 assert(html.includes('15文字以上'));
 assert(html.includes('Blob('));
 assert(!html.includes('__B198W_SOURCE_REVIEW_DATA_JSON__'));
 assert(!html.includes('__B198W_LOCAL_VIEWER_NAME__'));
 assert(!html.includes('fetch('));
 assert(!html.includes('https://'));
 assert.throws(()=>renderB198WReviewHtml(report,'../../api/run.js'),
  /B198W_UNSAFE_RELATIVE_VIEWER/);
});
test('human reviewer must provide all original criteria and concrete notes; score remains self-reported',()=>{
 const report=evaluateB198WSource({
  design:design(),compiled:compileDesign(design())
 });
 const candidate=rated(report);
 const result=validateB198WHumanReview({dossier:report,submission:candidate});
 assert.equal(result.scoreBreakdown.length,4);
 assert.equal(result.humanSuppliedScoreRatio,0.75);
 assert.equal(result.selfReportedHumanNotIndependentlyVerified,true);
 assert.equal(result.automaticallyApprovedArchitecture,false);
 assert.equal(result.worldWrites,0);
 assert.equal(result.constructionApproved,false);
 const wrong=structuredClone(candidate);wrong.sourceSha256='0'.repeat(64);
 assert.throws(()=>validateB198WHumanReview({dossier:report,submission:wrong}),
  /B198W_SOURCE_SHA_MISMATCH/);
 const fake=structuredClone(candidate);fake.reviewerConfirmedHuman=false;
 assert.throws(()=>validateB198WHumanReview({dossier:report,submission:fake}),
  /B198W_HUMAN_REVIEW_CONFIRMATION_REQUIRED/);
 const noText=structuredClone(candidate);noText.rubric[1].evidence='short';
 assert.throws(()=>validateB198WHumanReview({dossier:report,submission:noText}),
  /B198B_BAD_HUMAN_EVIDENCE/);
});
test('bundle writes exactly two new review artifacts and refuses overriding prior evidence',()=>{
 const d=design(),c=compileDesign(d),dir=temp();
 try{
  fs.writeFileSync(path.join(dir,'c01_index.html'),'<html>existing source preview</html>');
  const result=writeB198WReviewBundle({
   design:d,compiled:c,destination:dir,viewerName:'c01_index.html'
  });
  assert.equal(result.modelCallsMade,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.semanticQualityCertified,false);
  const data=JSON.parse(fs.readFileSync(path.join(dir,'B198W_SOURCE_QUALITY_EVIDENCE.json'),'utf8'));
  assert.equal(data.independentlyCompiled.sourceSha256,c.sourceSha256);
  assert(fs.readFileSync(path.join(dir,'B198W_REVIEW_BOARD.html'),'utf8').includes('c01_index.html'));
  assert.throws(()=>writeB198WReviewBundle({
   design:d,compiled:c,destination:dir,viewerName:'c01_index.html'
  }),/B198W_REFUSE_OVERWRITE_REVIEW/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('B198U offline replay creates 3D + B198W reviewer with ZERO new model calls and human-review pending',()=>{
 const d=design(),dir=temp();
 try{
  const rawFile=path.join(dir,'original.txt');
  fs.writeFileSync(rawFile,JSON.stringify({
   design:d,explanation:'Existing model proposal kept for offline B143 review.',
   assumptions:[]
  }));
  const result=runB198UOfflineReplay({
   sourceFile:rawFile,outDir:path.join(dir,'review')
  });
  assert.equal(result.status,'OFFLINE_COMPILED_HUMAN_REVIEW_REQUIRED');
  assert.equal(result.modelCallsMade,0);
  assert.equal(result.humanRubricScore,'UNREVIEWED');
  assert.equal(result.qualityReviewBundle.status,
   'WAITING_FOR_HUMAN_VISUAL_AND_SEMANTIC_REVIEW');
  assert.equal(result.qualityReviewBundle.modelCallsMade,0);
  const a=JSON.parse(fs.readFileSync(
   path.join(dir,'review','B198W_SOURCE_QUALITY_EVIDENCE.json'),'utf8'));
  assert.equal(a.independentlyCompiled.sourceSha256,result.compiledSource.sourceSha256);
  assert.equal(a.safety.worldWrites,0);
  const page=fs.readFileSync(
   path.join(dir,'review','B198W_REVIEW_BOARD.html'),'utf8');
  assert(page.includes('src="c01_index.html"'));
  assert(fs.existsSync(path.join(dir,'review','c01_index.html')));
  assert.equal(result.safety.worldWrites,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
