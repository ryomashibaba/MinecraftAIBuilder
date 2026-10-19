/** R15 regressions: mock source/manual data and historical ASSISTANT
 * revised R2 architecture only; no REAL Qwen output is generated here.
 * The old Qwen truncation is represented by an incomplete deterministic
 * original-like string. Never claim synthetic candidate is model-produced.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {analyzeR13SavedCapture}
 from '../source/ai/b198zr13-quality-decision.mjs';
import {evaluateR15Comparison,SCHEMA}
 from '../source/ai/b198zr15-evidence-quality-target.mjs';
import {renderR15ComparisonHtml,writeR15Comparison}
 from './b198zr15-compare-saved-reviews.mjs';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex');
const spec=CREATION_CASES.find(x=>x.id==='c01');
const originalModelLikeRaw='{"design":{"schema":"incomplete_model_mock","elements":[';
const baseline=analyzeR13SavedCapture({raw:originalModelLikeRaw,caseId:'c01'});
const load=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const contract=load('../evidence/b198zr3/r2-functional-review-contract.json');
const design=load('../evidence/b198zr2/assistant-revised-library-r2.json');
const candidateFakeRaw=JSON.stringify({
 design,
 spatialPlan:{
  designIntent:'A wide and usable library with a huge public central atrium.',
  massStrategy:'Floating curved exterior shells, actual floors and glass lounge.',
  circulationStrategy:'Connect reading rooms, long aisles and open atrium landings.',
  entrance:contract.entrance,headroom:contract.headroom,
  protectedVoids:contract.protectedVoids,
  destinations:contract.destinations,
  functionalZones:contract.functionalZones
 },
 explanation:'SYNTHETIC assistant revised R2 fixture. NOT a Qwen sample.',
 assumptions:['No Minecraft world was visited','Human 3D review is required']
});
const fakeReceipt={
 schema:'minecraftaibuilder-b198zr5-receipt-v1',
 mode:'PLANNED_R4_4KEY',rawSha256:sha(candidateFakeRaw),
 promptSha256:sha(spec.prompt),modelId:'R15_MOCK_NOT_QWEN',
 origin:'USER_SUPPLIED_REAL_MODEL_CLAIM',modelRequestsClaimed:0
};
const candidateFixture=analyzeR13SavedCapture({
 raw:candidateFakeRaw,caseId:'c01',receipt:fakeReceipt
});
const cloned=()=>structuredClone(candidateFixture);
const rating=(report,scores=[4,4,3,3])=>({
 schema:'minecraftaibuilder-b198w-human-source-rating-v1',
 caseId:'c01',sourceSha256:report.source.sourceSha256,
 geometrySha256:report.source.geometrySha256,
 reviewerConfirmedHuman:true,
 rubric:spec.criteria.map((criterion,i)=>({
  criterionId:criterion.id,score:scores[i],
  evidence:'SYNTHETIC MANUAL SCORE ONLY; HUMAN DID NOT VIEW THIS 3D. Test '+(i+1)
 })),
 sourceOnly:true,worldWrites:0,constructionApproved:false
});
test('R15 real R13 audit integration fixture identifies incomplete old and valid assistant-authored dummy correctly',()=>{
 assert.equal(baseline.status,'HOLD_ORIGINAL_JSON_TRUNCATED_OR_INVALID');
 assert.equal(candidateFixture.source.geometryStatus,'B143_SOURCE_ONLY_GEOMETRY_VERIFIED');
 assert.equal(candidateFixture.source.compiledVoxels,15312);
 assert.equal(candidateFixture.status,'WAITING_FOR_INDEPENDENT_HUMAN_ARCHITECTURE_REVIEW');
 assert.equal(candidateFixture.evidenceProvenance.modelIdentityIndependentlyVerified,false);
});
test('R15 new complete 4-key candidate proves only format recovery, NEVER architectural progress or real-world quality',()=>{
 const d=evaluateR15Comparison({baseline,candidate:candidateFixture});
 assert.equal(d.schema,SCHEMA);
 assert.equal(d.recoveredCompleteFourKeyOutputComparedWithBaseline,true);
 assert.equal(d.decision,'HUMAN_VISUAL_REVIEW_REQUIRED');
 assert.equal(d.jsonCompletionIsNotArchitecturalImprovementProof,true);
 assert(d.humanReview.scores===null);
 assert.equal(d.modelCallsInitiatedByComparison,0);
 assert.equal(d.machineQualitySignals.actualMinecraftWalkingValidated,false);
 assert.equal(d.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(d.safety.BuildPlan.operations,[]);
 assert.equal(d.safety.gates.filter(v=>v==='BLOCKED').length,9);
});
test('R15 human 4,4,3,3 reaches only SELF-REPORTED quality TARGET, never world approval',()=>{
 const c=cloned();c.machineAuditedGeometry.highRiskCount=0;
 const d=evaluateR15Comparison({baseline,candidate:c,human:rating(c,[4,4,3,3])});
 assert.equal(d.decision,'OFFLINE_HUMAN_REVIEW_TARGET_MET_WORLD_UNVERIFIED');
 assert.equal(d.humanReview.status,'SELF_REPORTED_QUALITY_TARGET_MET');
 assert.equal(d.humanReview.targetMet,true);
 assert.equal(d.humanReview.independentReviewCertified,false);
 assert.equal(d.candidate.independentlyAuthenticated,false);
 assert.equal(d.aestheticQualityAutomaticallyScored,false);
 assert.equal(d.safety.constructionApproved,false);
});
test('R15 incomplete human evidence, unconfirmed review and wrong source geometry SHA are rejected',()=>{
 const c=cloned();
 for(const bad of [
  {...rating(c),reviewerConfirmedHuman:false},
  {...rating(c),sourceSha256:sha('wrong source')},
  {...rating(c),geometrySha256:sha('wrong geometry')},
  {...rating(c),rubric:rating(c).rubric.map((r,i)=>i===2?
   {...r,evidence:'few'}:r)},
  {...rating(c),rubric:rating(c).rubric.map((r,i)=>i===2?
   {...r,score:5}:r)}
 ]){
  assert.throws(()=>evaluateR15Comparison({baseline,candidate:c,human:bad}),
   /B198ZR15_|BAD_HUMAN_EVIDENCE/);
 }
});
test('R15 refuses plausible but mediocre 3/3/3/3 or a failing core requirement',()=>{
 const c=cloned();
 for(const scores of [[3,3,3,3],[4,4,2,4]]){
  const d=evaluateR15Comparison({baseline,candidate:c,
   human:rating(c,scores)});
  assert.equal(d.decision,'REVISE_ARCHITECTURE_HUMAN_TARGET_NOT_MET');
  assert.equal(d.humanReview.targetMet,false);
 }
});
test('R15 high-risk geometry remains HOLD even after favorable human rating',()=>{
 const c=cloned();c.machineAuditedGeometry.highRiskCount=2;
 const d=evaluateR15Comparison({baseline,candidate:c,human:rating(c)});
 assert.equal(d.decision,'HOLD_HIGH_RISK_GEOMETRY_FINDINGS');
 assert.equal(d.machineQualitySignals.highRiskRequireReview,true);
});
test('R15 handles missing declared plan, model claim or correct frozen prompt with explicit HOLD',()=>{
 for(const mut of [
  c=>{c.declaredFunctionality.status='HOLD_DECLARED_FUNCTIONAL_CLAIM'},
  c=>{c.source.completeExactlyFourKeys=false},
  c=>{c.source.geometryStatus='HOLD_B143_GEOMETRY'},
  c=>{c.machineAuditedGeometry.sourceGoalsStatus='SOURCE_GOALS_FAIL'},
  c=>{c.evidenceProvenance.receiptMatchesRawAndPrompt=false},
  c=>{c.status='HOLD_CAPTURE_PROVENANCE_NOT_SUBSTANTIATED'},
  c=>{c.evidenceProvenance.discrepancies=['RAW_SHA_MISMATCH']}
 ]){
  const c=cloned();mut(c);
  const d=evaluateR15Comparison({baseline,candidate:c,human:rating(c)});
  assert.equal(d.decision,'HOLD_CANDIDATE_SOURCE_OR_PROVENANCE');
  assert.equal(d.humanReview.status,'UNREVIEWED');
  assert.equal(d.safety.worldWrites,0);
 }
 const c=cloned();c.frozenPromptSha256=sha('incorrect benchmark');
 assert.throws(()=>evaluateR15Comparison({baseline,candidate:c}),/FROZEN_CASE_PROMPT/);
});
test('R15 never counts re-auditing the identical original as fresh model improvement',()=>{
 const same=structuredClone(baseline);
 const d=evaluateR15Comparison({baseline,candidate:same});
 assert.equal(d.decision,'HOLD_SAME_RAW_NOT_NEW_GENERATION');
 assert.equal(d.recoveredCompleteFourKeyOutputComparedWithBaseline,false);
});
test('R15 static report escapes human HTML and never uses browser network/script handlers',()=>{
 const c=cloned();c.machineAuditedGeometry.highRiskCount=0;
 const h=rating(c);h.rubric[0].evidence='<script>alert(1)</script> deliberately test escaping';
 const r=evaluateR15Comparison({baseline,candidate:c,human:h});
 const html=renderR15ComparisonHtml(r);
 assert(html.includes('&lt;script&gt;'));
 assert(!html.includes('<script'));
 assert(!html.includes('fetch('));
 assert(!html.includes('http://')&&!html.includes('https://'));
 assert(html.includes(spec.criteria[0].description));
 assert(html.includes('未検証'));
});
test('R15 CLI writes new JSON and HTML without changing saved R13 reports or existing output',()=>{
 const t=fs.mkdtempSync(path.join(os.tmpdir(),'r15-qa-'));
 const oldFile=path.join(t,'old.json'),newFile=path.join(t,'candidate.json'),
  review=path.join(t,'human.json'),out=path.join(t,'result');
 const oldText=JSON.stringify(baseline),newText=JSON.stringify(candidateFixture),
  humanText=JSON.stringify(rating(candidateFixture,[4,4,3,3]));
 try{
  for(const [p,s] of [[oldFile,oldText],[newFile,newText],[review,humanText]])
   fs.writeFileSync(p,s);
  const r=writeR15Comparison({
   baselinePath:oldFile,candidatePath:newFile,humanPath:review,outDir:out});
  assert.equal(r.modelCalls,0);
  assert.equal(r.minecraftWrites,0);
  assert.equal(fs.readdirSync(out).length,2);
  const json=JSON.parse(fs.readFileSync(path.join(out,'R15_OFFLINE_COMPARE.json')));
  assert(json.decision.startsWith('HOLD_')||
   json.decision==='OFFLINE_HUMAN_REVIEW_TARGET_MET_WORLD_UNVERIFIED');
  assert.equal(json.safety.readiness,'NOT_PREPARED');
  const html=fs.readFileSync(path.join(out,'R15_OFFLINE_COMPARE.html'),'utf8');
  assert(html.includes('次回Qwen結果は改善したか'));
  assert.equal(fs.readFileSync(oldFile,'utf8'),oldText);
  assert.equal(fs.readFileSync(newFile,'utf8'),newText);
  assert.equal(fs.readFileSync(review,'utf8'),humanText);
  assert.throws(()=>writeR15Comparison({
   baselinePath:oldFile,candidatePath:newFile,outDir:out}),/OUTPUT_MUST_BE_NEW/);
 }finally{fs.rmSync(t,{recursive:true,force:true})}
});
