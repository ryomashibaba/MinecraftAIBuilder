import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {prepareR61Sections} from './b198zr61-final-voxel-section-review.mjs';
import {prepareR62FutureDesignGuidance}
 from './b198zr62-evidence-backed-revision-guidance.mjs';
import {synthesizeR76ReviewDecisions}
 from './b198zr76-architecture-next-decisions.mjs';
import {prepareR77FutureArchitecturalBrief,writeR77FutureArchitecturalBrief}
 from './b198zr77-cohesive-architecture-revision-brief.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const c01=CREATION_CASES.find(x=>x.id==='c01');
const prep=p=>{
 const raw=JSON.stringify(p),c=compileDesign(p.design);
 const options={raw,expectedRawSha256:sha(raw),
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  expectedGeometrySha256:c.geometrySha256,
  r61Evidence:prepareR61Sections({raw,expectedRawSha256:sha(raw),
   expectedGeometrySha256:c.geometrySha256})};
 const r62Evidence=prepareR62FutureDesignGuidance(options);
 return {...options,r62Evidence,
  r76Evidence:synthesizeR76ReviewDecisions({...options,r62Evidence})};
};
const held=()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'out',shape:'box',mode:'add',
  material:'stone',origin:[0,p.design.bounds.height,0],size:[2,1,2]});
 const raw=JSON.stringify(p),options={
  raw,expectedRawSha256:sha(raw),b143Status:'HOLD_B143_NOT_COMPILED'};
 const r62Evidence=prepareR62FutureDesignGuidance(options);
 return {...options,r62Evidence,r76Evidence:synthesizeR76ReviewDecisions({
  ...options,r62Evidence})};
};
test('R77 HOLD refuses to pretend the original has valid final geometry',()=>{
 const x=prepareR77FutureArchitecturalBrief(held());
 assert.equal(x.status,'ARCHITECTURE_FIRST_BRIEF_B143_SOURCE_HOLD');
 assert.equal(x.reviewDependencies[0].dependencyStatus,
  'INDEPENDENT_HUMAN_REVIEW_REQUIRED');
 assert(x.reviewDependencies.slice(1).every(q=>
  q.dependencyStatus==='BLOCKED_BY_B143_HOLD'));
 assert.equal(x.noModelCallAuthorized,true);
 assert.equal(x.executedDesign,null);
 assert.equal(x.modelCalls,0);
 assert.equal(x.worldWrites,0);
 assert(x.safety.gates.every(g=>g==='BLOCKED'));
});
test('R77 compiled origin keeps all four frozen visual quality requirements unpassed',()=>{
 const x=prepareR77FutureArchitecturalBrief(prep(r32Courtyard()));
 assert.equal(x.status,
  'ARCHITECTURE_FIRST_BRIEF_FINAL_VOXEL_QUALITY_UNVERIFIED');
 assert.equal(x.independentCriteria.length,4);
 assert.deepEqual(x.independentCriteria.map(q=>q.id),
  c01.criteria.map(q=>q.id));
 assert(x.independentCriteria.every(q=>
  q.visualOrFunctionalHumanEvidence==='NOT_REVIEWED'&&
  q.modelSelfReportCannotCertify&&q.thresholdCannotCertify));
 assert.equal(x.frozenOriginalPrompt,c01.prompt);
 assert.equal(x.orderedDesignActions.length,4);
 assert.equal(x.conceptHypothesis.designNarrative.length,6);
 assert(x.futureOnlyUnexecutedModelInput.includes('左右'));
 assert(x.futureOnlyUnexecutedModelInput.includes('星空'));
 assert(x.futureOnlyUnexecutedModelInput.includes('B143'));
 assert(x.futureOnlyUnexecutedModelInput.includes('SEPARATELY CONSENTED'));
 assert.deepEqual(x.executedDesign,null);
 assert.equal(x.authoringStatus,
  'HUMAN_AUTHORED_FUTURE_BRIEF_NOT_REAL_MODEL_IMPROVEMENT');
});
test('R77 answers reading wings, real interior void, high lounge and integrated envelope without rigid shape bans',()=>{
 const x=prepareR77FutureArchitecturalBrief(prep(r32Courtyard()));
 const all=x.conceptHypothesis.designNarrative.map(t=>t.mustResolve).join('\n');
 assert(all.includes('左右'));
 assert(all.includes('書架'));
 assert(all.includes('吹'));
 assert(all.includes('ラウンジ'));
 assert(all.includes('入口'));
 assert(all.includes('外観'));
 assert(x.conceptHypothesis.variationFreedom.includes('禁止しない'));
 assert.equal(x.noAutomaticScoringOrModelSelection,true);
 assert.equal(x.humanVisualReview,'NOT_REVIEWED');
});
test('R77 rejects falsified R76, fake independent quality PASS and wrong source',()=>{
 const opt=prep(r32Courtyard()),bad=structuredClone(opt.r76Evidence);
 bad.reviewPackages[0].visualQualityPass=true;
 assert.throws(()=>prepareR77FutureArchitecturalBrief({
  ...opt,r76Evidence:bad}),/R76_EVIDENCE_RECOMPUTE_MISMATCH/);
 const bad2=structuredClone(opt.r76Evidence);
 bad2.frozenHumanQualityCriteria[0].status='PASS';
 assert.throws(()=>prepareR77FutureArchitecturalBrief({
  ...opt,r76Evidence:bad2}),/R76_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR77FutureArchitecturalBrief({
  ...opt,expectedRawSha256:'f'.repeat(64)}),/FROZEN_C01_RAW_REQUIRED/);
});
test('R77 rejects B143 hold with forged final voxel evidence',()=>{
 const opt=held();
 assert.throws(()=>prepareR77FutureArchitecturalBrief({
  ...opt,expectedGeometrySha256:'f'.repeat(64)}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});
test('R77 creates human-authored unexecuted brief only and does not overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r77-brief-'));
 const args=held();
 try{
  const r=writeR77FutureArchitecturalBrief({...args,destination:dir});
  assert.equal(r.modelCalls,0);
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8'));
  const html=fs.readFileSync(path.join(dir,
   'R77_COHESIVE_LIBRARY_DESIGN_BRIEF.html'),'utf8');
  const prompt=fs.readFileSync(path.join(dir,
   'R77_FUTURE_ONLY_MODEL_BRIEF_UNEXECUTED.txt'),'utf8');
  assert.equal(json.humanVisualReview,'NOT_REVIEWED');
  assert(html.includes('書架')&&html.includes('星空')&&html.includes('Minecraft'));
  assert(prompt.includes(c01.prompt));
  assert(prompt.includes('DO NOT EXECUTE'));
  assert.throws(()=>writeR77FutureArchitecturalBrief({...args,destination:dir}),
   /NEVER_OVERWRITE_ORIGINAL_REVIEW/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
