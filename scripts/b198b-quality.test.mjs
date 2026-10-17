import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {CREATION_CASES,REVISION_CASES,verifyBenchmark}
 from '../source/ai/b198b-benchmark-cases.mjs';
import {inspectSourceGeometry,inspectProtectedVoxelFidelity,
 evaluateSourceGoals,emptyHumanRubric,scoreHumanRubric,summarizeQualityResults}
 from '../source/ai/b198b-architecture-quality.mjs';
import {runB198Benchmark} from './b198b-quality-benchmark.mjs';
import {fixtureAmphitheater,fixtureLighthouse,candidate}
 from './b198a-fixtures.mjs';
const testModel=(request)=>{
 if(request.mode==='revision'){
  const design=structuredClone(request.previousDesign);
  design.elements.push({id:'b198b-illumination-crown',shape:'box',mode:'add',
   origin:[18,28,39],size:[15,1,3],material:'glow'});
  return candidate(design);
 }
 return candidate(request.prompt.includes('nothing-matches-the-fixture')?
  fixtureLighthouse():fixtureAmphitheater());
};
test('fixed 12 independent Japanese architectural genres plus 4 goal-specific revisions, zero keyword router',()=>{
 assert(verifyBenchmark());
 assert.equal(CREATION_CASES.length,12);
 assert.equal(REVISION_CASES.length,4);
 assert.equal(new Set(CREATION_CASES.map(x=>x.genre)).size,12);
 assert(CREATION_CASES.every(c=>c.criteria.every(x=>x.requiresHumanVisualAndSemanticJudgment)));
 assert(REVISION_CASES.every(r=>CREATION_CASES.some(x=>x.id===r.baseCaseId)));
});
test('exact compiled original 3D source facts, floor/head clearance and no false player walking',()=>{
 const design=fixtureAmphitheater(),compiled=compileDesign(design);
 const a=inspectSourceGeometry({design,compiled});
 assert.equal(a.schema,'minecraftaibuilder-b198b-quality-audit-v1');
 assert.equal(a.genuineOccupiedVoxels,compiled.primitives.length);
 assert(a.distinctPrimitiveFamilies>=3);
 assert(a.usedMaterialFamilyCount>=3);
 assert(a.source2WideSupportedFootprintSquares>0);
 assert(a.largestHorizontalSourceOnly2WideRun>2);
 assert.equal(a.playerWalkingCertified,false);
 assert.equal(a.realStructuralLoadCertified,false);
 assert.equal(a.aestheticQualityCertified,false);
 const goals=evaluateSourceGoals(CREATION_CASES[0],a);
 assert.deepEqual(Object.keys(goals.checks).sort(),[
  'minimumHeightSpan','minimumMaterialFamilies',
  'minimumOccupiedVoxels','minimumPrimitiveFamilies']);
 assert.equal(goals.sourceOnlyNotSemantic,true);
});
test('unchanged protected element ID cannot conceal voxel deletion by newly appended cut operation',()=>{
 const before=fixtureAmphitheater(),after=structuredClone(before);
 after.elements.push({id:'hidden-floor-cut',shape:'box',mode:'cut',
  origin:[14,3,16],size:[6,1,6]});
 const a=inspectProtectedVoxelFidelity({
  baseDesign:before,revisionDesign:after,
  protectedElementIds:['main-limestone-court']});
 assert(a.protectedReferenceCells>50);
 assert(a.lostSourceVoxels>0);
 assert.equal(a.exactProtectedVoxelPreservationPassed,false);
 assert.equal(a.inheritedWalkabilityNotCertified,true);
 const untouched=inspectProtectedVoxelFidelity({
  baseDesign:before,revisionDesign:before,
  protectedElementIds:['main-limestone-court']});
 assert.equal(untouched.lostSourceVoxels,0);
 assert.equal(untouched.exactProtectedVoxelPreservationPassed,true);
});
test('semantic criteria stay UNREVIEWED regardless of impressive voxel metrics',()=>{
 const spec=CREATION_CASES[0],blank=emptyHumanRubric(spec);
 assert.equal(blank.status,'UNREVIEWED');
 assert(blank.rubric.every(r=>r.score===null&&r.evidence===null));
 assert.throws(()=>scoreHumanRubric(spec,blank),/B198B_BAD_HUMAN_EVIDENCE/);
 const rated={...blank,rubric:blank.rubric.map((r,i)=>({
  ...r,score:4-i%2,
  evidence:'Human reviewer observed the original 3D model and noted specific architectural details #'+i}))};
 const score=scoreHumanRubric(spec,rated);
 assert(score.humanSuppliedScoreRatio>0.8);
 assert.match(score.verificationStatus,/NOT_INDEPENDENTLY_VERIFIED/);
});
test('partial benchmark counts NOT_RUN and never falsely declares all-quality PASS',()=>{
 const summary=summarizeQualityResults([
  {caseId:'c01',attempted:true,sourceGoals:{status:'SOURCE_GOALS_PASS'},humanRating:null},
  {caseId:'c02',attempted:true,error:'INVALID_SOURCE',sourceGoals:null,humanRating:null}
 ],['c01','c02','c03']);
 assert.equal(summary.attemptedCaseCount,2);
 assert.equal(summary.sourceGoalsPassedCount,1);
 assert.equal(summary.statusByCase.c03,'NOT_RUN');
 assert.equal(summary.humanReviewedCount,0);
 assert.equal(summary.unreviewedCaseCount,3);
 assert.equal(summary.allQualityGatesPassed,false);
 assert.equal(summary.realProviderSemanticComplianceClaimed,false);
});
test('two concept fixtures, one real edit and actual standalone 3D pages; all semantic checks held',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b198b-quality-'));
 try{
  const out=path.join(tmp,'results');
  let calls=0;
  const model=async request=>{
   calls++;
   if(request.mode==='revision')return testModel(request);
   return candidate(calls===1?fixtureAmphitheater():fixtureLighthouse());
  };
  const report=await runB198Benchmark({
   provider:model,provenance:'INJECTED_TEST_DOUBLE',
   outDir:out,maxCreationCases:2,includeRevisions:true,attemptsPerCase:1});
  assert.equal(report.metrics.expectedCaseCount,3);
  assert.equal(report.metrics.attemptedCaseCount,3);
  assert.equal(report.metrics.humanReviewedCount,0);
  assert.equal(report.allHumanSemanticCriteriaRated,false);
  assert.equal(report.liveModelQualityTestProven,false);
  assert.equal(report.safety.worldWrites,0);
  assert.equal(report.safety.readiness,'NOT_PREPARED');
  const names=fs.readdirSync(out);
  assert(names.includes('B198B_RESULTS.json'));
  assert(fs.existsSync(path.join(out,'c01','source-design.json')));
  assert(fs.existsSync(path.join(out,'c02','index.html')));
  assert(fs.existsSync(path.join(out,'r01','source-audit.json')));
  const html=fs.readFileSync(path.join(out,'c01','index.html'),'utf8');
  assert(html.includes('B198B TEST FIXTURE'));
  assert(html.includes('minecraftaibuilder-b143-gallery-v1'));
  assert(!html.includes('fetch('));
  const revision=JSON.parse(fs.readFileSync(path.join(out,'r01','source-audit.json')));
  assert.equal(revision.fidelity.exactProtectedVoxelPreservationPassed,true);
  assert.equal(revision.sourceReviewStatus,'SOURCE_REVISION_FIDELITY_PASS');
  await assert.rejects(()=>runB198Benchmark({provider:model,
   outDir:out}),/B198B_NEVER_OVERWRITE_EXISTING_QA/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
test('malformed model is explicit HOLD, no misleading 3D proof artifact or passing source',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b198b-fail-'));
 try{
  const report=await runB198Benchmark({provider:async()=>({
    design:{...fixtureLighthouse(),constructionApproved:true},
    explanation:'invalid',assumptions:[]}),
   outDir:path.join(tmp,'no-safe-model'),maxCreationCases:1});
  assert.equal(report.metrics.sourceGoalsPassedCount,0);
  assert.equal(report.metrics.attemptedCaseCount,1);
  assert.equal(report.metrics.statusByCase.c01,'MODEL_OR_SOURCE_HOLD');
  assert(!fs.existsSync(path.join(tmp,'no-safe-model','c01','index.html')));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
