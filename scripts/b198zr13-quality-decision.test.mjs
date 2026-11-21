/** B198Z-R13 quality audit tests. Entirely OFFLINE; no Qwen/OLlama,
 * no Minecraft, no architectural beauty certified from synthetic sources.
 * A historical ASSISTANT-authored R2 fixture is never a real Qwen result.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {analyzeR13SavedCapture,SCHEMA}
 from '../source/ai/b198zr13-quality-decision.mjs';
import {renderR13QualityReport,writeR13Report}
 from './b198zr13-review-saved-capture.mjs';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const spec=CREATION_CASES.find(x=>x.id==='c01');
const load=(p)=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const fixture=()=>{
 const c=load('../evidence/b198zr3/r2-functional-review-contract.json');
 return {
  design:load('../evidence/b198zr2/assistant-revised-library-r2.json'),
  spatialPlan:{
   designIntent:'A wide open public library with an original curved skyline.',
   massStrategy:'Floors, central atrium, lateral shelves, transparent upper lounge.',
   circulationStrategy:'Multi-level connected path around a central open void.',
   entrance:c.entrance,headroom:c.headroom,
   protectedVoids:c.protectedVoids,destinations:c.destinations,
   functionalZones:c.functionalZones
  },
  explanation:'Programmatically synthesized R13 test; NOT authored by the Qwen model.',
  assumptions:['Quality must be judged by a human']
 };
};
const receipt=(raw,origin='TEST_DOUBLE')=>({
 schema:'minecraftaibuilder-b198zr5-receipt-v1',
 mode:'PLANNED_R4_4KEY',
 rawSha256:sha(raw),promptSha256:sha(spec.prompt),
 modelId:'R13_FAKE_FIXTURE_NOT_QWEN',
 origin,modelRequestsClaimed:0
});
const result=(raw)=>({
 request:{promptSha256:sha(spec.prompt),
  modelRequested:'R13_FAKE_FIXTURE_NOT_QWEN',
  budget:{sourceTokens:3072}},
 originalRawSha256:sha(raw),
 nativeTrace:[{outcome:'MODEL_INCOMPLETE',complete:false,doneReason:'length',
  generatedTokens:3072}]
});
test('R13 detects R6-like truncated real-format raw without any fabricated geometry or review PASS',()=>{
 const raw=JSON.stringify(fixture()).slice(0,-15);
 const x=analyzeR13SavedCapture({raw,receipt:receipt(raw),runResult:result(raw)});
 assert.equal(x.schema,SCHEMA);
 assert.equal(x.status,'HOLD_ORIGINAL_JSON_TRUNCATED_OR_INVALID');
 assert.equal(x.source.parsedAsJson,false);
 assert.equal(x.source.geometryStatus,'NOT_EVALUATED');
 assert.equal(x.source.compiledVoxels,null);
 assert.equal(x.rawSha256,sha(raw));
 assert.equal(x.nativeTelemetryClaim.outputTokens,3072);
 assert.equal(x.nativeTelemetryClaim.outputLimitReached,true);
 assert.equal(x.nativeTelemetryClaim.serverDoneReason,'length');
 assert.equal(x.frozenHumanReview.length,4);
 assert(x.frozenHumanReview.every(c=>c.score===null));
 assert.equal(x.source.savedOriginalNotRepaired,true);
 assert.equal(x.safety.readiness,'NOT_PREPARED');
 assert.equal(x.safety.worldWrites,0);
 assert.deepEqual(x.safety.gates,Array(9).fill('BLOCKED'));
});
test('R13 can validate genuine conceptual geometry in historical ASSISTANT-authored fixture, but never call it a real Qwen candidate',()=>{
 const raw=JSON.stringify(fixture());
 const x=analyzeR13SavedCapture({raw,receipt:receipt(raw)});
 assert.equal(x.source.parsedAsJson,true);
 assert.equal(x.source.completeExactlyFourKeys,true);
 assert.equal(x.source.geometryStatus,'B143_SOURCE_ONLY_GEOMETRY_VERIFIED');
 assert.equal(x.source.compiledVoxels,15312);
 assert.equal(x.source.sourceSha256,
  '7e5b1885a398d5e98f1298915947bc66eae56d4ccf4b413274da780a3778c218');
 assert.equal(x.declaredFunctionality.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(x.machineAuditedGeometry.sourceGoalsStatus,'SOURCE_GOALS_PASS');
 assert.equal(x.status,'HOLD_CAPTURE_PROVENANCE_NOT_SUBSTANTIATED');
 assert.equal(x.evidenceProvenance.modelIdentityIndependentlyVerified,false);
 assert(x.frozenHumanReview.every(c=>c.status==='REQUIRES_HUMAN_VIEWING_AND_SEMANTIC_JUDGMENT'));
 assert.equal(x.safety.constructionApproved,false);
});
test('R13 unauthenticated claimed model cannot receive architectural auto-approval even when machine facts pass',()=>{
 const raw=JSON.stringify(fixture());
 const x=analyzeR13SavedCapture({raw,receipt:receipt(raw,'USER_SUPPLIED_REAL_MODEL_CLAIM')});
 assert.equal(x.status,'WAITING_FOR_INDEPENDENT_HUMAN_ARCHITECTURE_REVIEW');
 assert.equal(x.evidenceProvenance.modelIdentityIndependentlyVerified,false);
 assert.equal(x.reviewerHasNotScoredAnything,true);
 assert.equal(x.rendererDoesNotCertifyBeauty,true);
 assert.equal(x.safety.gates.filter(t=>t==='BLOCKED').length,9);
});
test('R13 prevents tampered saved source/receipt, frozen prompt, R11 SHA and model ID mismatches',()=>{
 const raw=JSON.stringify(fixture()),good=receipt(raw);
 const cases=[
  {receipt:{...good,rawSha256:sha('forged')}},
  {receipt:{...good,promptSha256:sha('changed task')}},
  {receipt:good,runResult:{...result(raw),originalRawSha256:sha('changed source')}},
  {receipt:good,runResult:{...result(raw),
   request:{...result(raw).request,promptSha256:sha('changed task')}}},
  {receipt:good,runResult:{...result(raw),
   r11CompletionAudit:{rawSha256:sha('wrong')}}},
  {receipt:good,runResult:{...result(raw),
   request:{...result(raw).request,modelRequested:'FORGED_MODEL'}}}
 ];
 for(const opts of cases){
  const x=analyzeR13SavedCapture({raw,...opts});
  assert.equal(x.status,'HOLD_EVIDENCE_PROVENANCE_CONFLICT');
  assert(x.evidenceProvenance.discrepancies.length>0);
  assert.equal(x.safety.worldWrites,0);
 }
});
test('R13 keeps a compilable shape viewable without accepting malformed spatial plan',()=>{
 const f=fixture();
 f.spatialPlan.entrance=[999,999,999];
 const raw=JSON.stringify(f);
 const x=analyzeR13SavedCapture({raw,receipt:receipt(raw)});
 assert.equal(x.source.geometryStatus,'B143_SOURCE_ONLY_GEOMETRY_VERIFIED');
 assert.equal(x.source.compiledVoxels,15312);
 assert.equal(x.declaredFunctionality.status,'HOLD_DECLARED_FUNCTIONAL_CLAIM');
 assert.equal(x.status,'HOLD_DECLARED_FUNCTIONAL_CLAIM');
 assert.equal(x.declaredFunctionality.actualMinecraftWalkingProven,false);
});
test('R13 rejects malformed four-key envelope even if geometry can compile; no automatic repair',()=>{
 const f=fixture();
 delete f.spatialPlan;
 const raw=JSON.stringify(f),x=analyzeR13SavedCapture({raw,receipt:receipt(raw)});
 assert.equal(x.status,'HOLD_FOUR_KEY_SOURCE_CONTRACT');
 assert.equal(x.source.geometryStatus,'B143_SOURCE_ONLY_GEOMETRY_VERIFIED');
 assert.equal(x.source.savedOriginalNotRepaired,true);
});
test('R13 HTML is offline, cannot turn missing human review into automatic score or execute scripts',()=>{
 const raw=JSON.stringify(fixture());
 const x=analyzeR13SavedCapture({raw,receipt:receipt(raw)});
 const html=renderR13QualityReport(x);
 assert(html.includes('R13 建築品質'));
 assert(html.includes('未審査'));
 assert(html.includes(sha(raw)));
 assert(!html.includes('<script'));
 assert(!html.includes('fetch('));
 assert(!html.includes('http://'));
 assert(!html.includes('https://'));
 assert.equal(x.frozenHumanReview.length,spec.criteria.length);
});
test('R13 CLI writes a new two-file dossier, never mutates or overwrites source R6 folder',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r13-audit-')),
  src=path.join(tmp,'evidence'),out=path.join(tmp,'r13-new');
 fs.mkdirSync(src);
 const raw=JSON.stringify(fixture()).slice(0,-13);
 const files={
  'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt':raw,
  'R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json':JSON.stringify(receipt(raw)),
  'R6_SINGLE_CAPTURE_RESULT.json':JSON.stringify(result(raw))
 };
 for(const [name,value] of Object.entries(files))
  fs.writeFileSync(path.join(src,name),value);
 try{
  const run=writeR13Report({evidenceDir:src,outDir:out});
  assert.equal(run.status,'HOLD_ORIGINAL_JSON_TRUNCATED_OR_INVALID');
  assert.equal(run.modelCalls,0);
  assert.equal(run.worldWrites,0);
  assert.deepEqual(run.outputFiles,[
   'R13_OFFLINE_QUALITY_DECISION.json',
   'R13_OFFLINE_QUALITY_OVERVIEW.html']);
  assert.equal(fs.readdirSync(out).length,2);
  assert.equal(fs.readdirSync(src).length,3);
  for(const [name,value] of Object.entries(files))
   assert.equal(fs.readFileSync(path.join(src,name),'utf8'),value);
  const report=JSON.parse(fs.readFileSync(path.join(out,run.outputFiles[0])));
  assert.equal(report.rawSha256,sha(raw));
  assert.throws(()=>writeR13Report({evidenceDir:src,outDir:out}),
   /B198ZR13_CLI_OUTPUT_MUST_BE_NEW/);
  assert.throws(()=>writeR13Report({evidenceDir:src,outDir:path.join(src,'nested')}),
   /B198ZR13_CLI_OUTPUT_MUST_BE_SEPARATE/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
