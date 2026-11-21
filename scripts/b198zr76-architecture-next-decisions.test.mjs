import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {prepareR61Sections} from './b198zr61-final-voxel-section-review.mjs';
import {prepareR62FutureDesignGuidance} from './b198zr62-evidence-backed-revision-guidance.mjs';
import {synthesizeR76ReviewDecisions,writeR76ReviewPriorities}
 from './b198zr76-architecture-next-decisions.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const b143='B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS';
const compiled=p=>{
 const raw=JSON.stringify(p),g=compileDesign(p.design);
 const args={raw,expectedRawSha256:sha(raw),b143Status:b143,
  expectedGeometrySha256:g.geometrySha256,
  r61Evidence:prepareR61Sections({raw,expectedRawSha256:sha(raw),
   expectedGeometrySha256:g.geometrySha256})};
 return {...args,r62Evidence:prepareR62FutureDesignGuidance(args)};
};
const held=()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'outside-top',shape:'box',mode:'add',
  material:'stone',origin:[1,p.design.bounds.height,1],size:[2,1,2]});
 const raw=JSON.stringify(p),args={raw,expectedRawSha256:sha(raw),
  b143Status:'HOLD_B143_NOT_COMPILED'};
 return {...args,r62Evidence:prepareR62FutureDesignGuidance(args)};
};
test('R76 HOLD prioritizes real source compiler problem without creating future voxel claims',()=>{
 const x=synthesizeR76ReviewDecisions(held());
 assert.equal(x.status,'HOLD_NO_FINAL_VOXEL_ARCHITECTURE');
 assert.equal(x.currentDecisionPackage,'01_SOURCE_TRUTH');
 assert.equal(x.finalConceptualGeometrySha256,null);
 assert(x.reviewPackages[0].observedIssueKinds.includes('STRICT_B143_HOLD'));
 assert.equal(x.reviewPackages[1].observedIssueRecords,0);
 assert.equal(x.reviewPackages[2].observedIssueRecords,0);
 assert.equal(x.reviewPackages[3].observedIssueRecords,0);
 assert.equal(x.frozenHumanQualityCriteria.length,4);
 assert(x.frozenHumanQualityCriteria.every(y=>y.status==='NOT_REVIEWED'));
 assert.equal(x.nextQwenRunNeedsFreshExplicitOneTimeConsent,true);
 assert.equal(x.modelQualityImprovementDemonstrated,false);
 assert.deepEqual(x.geometryChanges,[]);
 assert(x.safety.gates.every(v=>v==='BLOCKED'));
 assert.deepEqual(x.safety.BuildPlan.operations,[]);
});
test('R76 compiled geometry uses four dependency-ordered human review packages, never numerical aesthetic grade',()=>{
 const x=synthesizeR76ReviewDecisions(compiled(r32Courtyard()));
 assert.equal(x.status,'COMPILABLE_MODEL_SOURCE_WITH_UNVERIFIED_ARCHITECTURE');
 assert.equal(x.currentDecisionPackage,'02_REAL_PUBLIC_USE');
 assert.equal(x.reviewPackages.length,4);
 assert.deepEqual(x.reviewPackages.map(p=>p.id),[
  '01_SOURCE_TRUTH','02_REAL_PUBLIC_USE','03_ARCHITECTURE_PRESERVATION',
  '04_PLAN_RECONCILIATION']);
 assert(x.reviewPackages.every(p=>p.autoApply===false));
 assert(x.reviewPackages.every(p=>p.visualQualityPass===false));
 assert.equal(x.classificationIsPlanningOrderNotQualitySeverity,true);
 assert.equal(x.modelDeclaredRoomsNeverEqualVerifiedPublicFunction,true);
 assert.equal(x.independentHumanQualityApproval,false);
 assert.equal(x.modelCalls,0);
});
test('R76 final voxel after compiling is NOT independently verified function',()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'late-fill',shape:'box',mode:'add',
  origin:[6,1,6],size:[4,4,4],material:'metal'});
 const x=synthesizeR76ReviewDecisions(compiled(p));
 assert.equal(x.sourceCompilerStatus,b143);
 assert(x.issueRecords>0);
 assert(x.reviewPackages.some(q=>q.observedIssueRecords>0));
 assert.equal(x.modelDeclaredRoomsNeverEqualVerifiedPublicFunction,true);
 assert(x.frozenHumanQualityCriteria.every(q=>q.cannotBePassedByVoxelOrModelMetric));
});
test('R76 refuses forged R62 claims or stale original and uses full report recomputation',()=>{
 const args=compiled(r32Courtyard());
 const altered=structuredClone(args.r62Evidence);
 altered.evidenceIssues.push({kind:'FAKE_SUCCESS',count:1});
 assert.throws(()=>synthesizeR76ReviewDecisions({...args,r62Evidence:altered}),
  /R62_COMPLETE_REPORT_RECOMPUTE_MISMATCH/);
 const dishonest=structuredClone(args.r62Evidence);
 dishonest.independentHumanCriteria[0].assessment='PASS';
 assert.throws(()=>synthesizeR76ReviewDecisions({...args,r62Evidence:dishonest}),
  /R62_COMPLETE_REPORT_RECOMPUTE_MISMATCH/);
 assert.throws(()=>synthesizeR76ReviewDecisions({...args,
  expectedRawSha256:'f'.repeat(64)}),/ORIGINAL_RAW_SHA_REQUIRED/);
 assert.throws(()=>synthesizeR76ReviewDecisions({...args,r62Evidence:null}),
  /R62_COMPLETE_REPORT_RECOMPUTE_MISMATCH/);
});
test('R76 does not fabricate compiled geometry when held source injects R61 data',()=>{
 const args=held(),r61=prepareR61Sections;
 assert.throws(()=>synthesizeR76ReviewDecisions({
  ...args,expectedGeometrySha256:'f'.repeat(64)}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
 assert.equal(typeof r61,'function');
});
test('R76 outputs only immutable source-bound offline HTML and JSON and refuses overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r76-next-priority-'));
 try{
  const x=writeR76ReviewPriorities({...held(),destination:dir});
  assert.equal(x.currentDecisionPackage,'01_SOURCE_TRUTH');
  assert.equal(x.modelCalls,0);
  const payload=JSON.parse(fs.readFileSync(path.join(dir,
   'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8'));
  assert.equal(payload.independentHumanQualityApproval,false);
  const html=fs.readFileSync(path.join(dir,
   'R76_ARCHITECTURE_NEXT_DECISIONS.html'),'utf8');
  assert(html.includes('B143')&&html.includes('Minecraft'));
  assert(html.includes('未審査'));
  assert.throws(()=>writeR76ReviewPriorities({...held(),destination:dir}),
   /NO_OVERWRITE_OF_EXISTING_REVIEW/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
