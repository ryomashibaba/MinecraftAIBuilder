import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {compileDesign,verifyCompiled,MAX_CELLS}
 from '../source/ai/b143-building-dsl.mjs';
import {getB198EChatAuthoredPilot,PROVENANCE}
 from '../source/ai/b198e-chat-authored-pilot.mjs';
import {inspectB198EChatPilot}
 from '../source/ai/b198e-source-evidence.mjs';
import {CREATION_CASES,REVISION_CASES}
 from '../source/ai/b198b-benchmark-cases.mjs';
import {proposeArchitecture} from '../source/ai/b198-natural-language-design.mjs';
import {buildB198EPreview} from './b198e-build-review.mjs';
const p=getB198EChatAuthoredPilot();
test('4 genuinely independent new prompt-specific Chat-authored B143 architectures, not older fixed fixtures',()=>{
 assert.equal(PROVENANCE,'GPT6_CHAT_AUTHORED_ON_2026_10_18_NOT_OPENAI_API');
 assert.deepEqual(Object.keys(p.created),['c01','c03','c05','c08']);
 const hashes=new Set(),families=new Set();
 for(const [id,d] of Object.entries(p.created)){
  const c=compileDesign(d);assert(verifyCompiled(d,c));
  assert(c.primitives.length>10000&&c.primitives.length<MAX_CELLS);
  assert(d.elements.length>=20&&d.elements.length<=160);
  assert(CREATION_CASES.some(x=>x.id===id));
  hashes.add(c.geometrySha256);
  families.add(d.elements.filter(x=>x.mode==='add').map(x=>x.shape).sort().join(','));
 }
 assert.equal(hashes.size,4);assert(families.size>=2);
 assert.equal(p.unattemptedCreationCases.length,8);
 assert(!Object.keys(p.created).includes('c02'));
});
test('4 authored buildings have real 3D evidence samples and pass generic source geometry goals',()=>{
 const result=inspectB198EChatPilot();
 assert.equal(result.objectiveSourcePassingCount,4);
 assert.deepEqual(result.objectiveSourceSampleFailures,[]);
 assert.equal(result.creations.length,4);
 for(const c of result.creations){
  assert.equal(c.sourceObjectiveGoals.status,'SOURCE_GOALS_PASS');
  assert.equal(c.fixedCoordinateArchitecturalSamples.length,c.fixedCoordinateSamplesPassed);
  assert(c.geometryAudit.source2WideSupportedFootprintSquares>100);
  assert(c.geometryAudit.usedMaterialFamilyCount>=2);
  assert.equal(c.humanSemanticRubric.status,'UNREVIEWED');
  assert.equal(c.promptSemanticsIndependentlyVerified,false);
  assert.equal(c.MinecraftWalkingCertified,false);
  assert.equal(c.worldWrites,0);
 }
});
test('4 nuanced Japanese follow-up revisions preserve all named materials and all originally clear source floor/headroom',()=>{
 const result=inspectB198EChatPilot();
 assert.deepEqual(result.revisionProtectionFailures,[]);
 for(const rev of result.revisions){
  assert.equal(rev.protectedVoxels.exactProtectedVoxelPreservationPassed,true);
  assert.equal(rev.originalFloors.damagedByRevision,0);
  assert(rev.originalFloors.originalSourceSupportedTwoWideSquares>100);
  assert(rev.exactVoxelChange>0);
  assert(rev.sourceChangeList.totalTouched>0);
  assert(rev.sourceChangeList.totalTouched<=18);
  assert.deepEqual(rev.sourceChangeList.removed,[]);
  assert.equal(rev.humanSemanticRubric.status,'UNREVIEWED');
  assert(REVISION_CASES.some(x=>x.id===rev.caseId&&
   x.baseCaseId===rev.baseCaseId));
 }
});
test('source authored in this chat passes REAL B198A generation/revision adapter validator, without charging API',async()=>{
 for(const [id,d] of Object.entries(p.created)){
  const prompt=CREATION_CASES.find(x=>x.id===id).prompt;
  const res=await proposeArchitecture({prompt,generator:async()=>({
   design:d,explanation:'GPT-6 in-chat source geometry authoring, third-party quality unreviewed.',
   assumptions:['Source only','No real-world execution']
  }),maxAttempts:1});
  assert.equal(res.review.sourceSha256,compileDesign(d).sourceSha256);
  assert.equal(res.review.semanticComplianceNotAutomaticallyCertified,true);
  assert.equal(res.review.safety.worldWrites,0);
 }
 for(const [id,d] of Object.entries(p.revised)){
  const c=REVISION_CASES.find(x=>x.id===id),old=p.created[c.baseCaseId];
  const res=await proposeArchitecture({
   prompt:c.prompt,baseDesign:old,
   expectedBaseSha256:compileDesign(old).sourceSha256,
   protectedElementIds:p.protectedIds[id],maxChangedElements:18,
   maxAttempts:1,
   generator:async()=>({design:d,explanation:'Hand-authored model response in current chat, not a live LLM API request.',
    assumptions:['Review needed','Minecraft forbidden']})
  });
  assert.equal(res.review.action,'revision');
  assert.equal(res.review.safety.constructionApproved,false);
 }
});
test('source-truth and permission boundary explicitly mark 8 genres unattempted, 0 actual API runs, 0 human scores',()=>{
 const q=inspectB198EChatPilot();
 assert.equal(q.full12GenreBenchmarkCompleted,false);
 assert.equal(q.actualProductionLLMInvocationResultsProvided,0);
 assert.equal(q.actualHumanQualityRatingsProvided,0);
 assert.equal(q.modelInstructionFollowingAccuracyCertified,false);
 assert.equal(q.independentlyHumanRatedAesthetics,false);
 assert.equal(q.actualMinecraftPlayerCirculationCertified,false);
 assert.equal(q.separatelyBilledAPITokensConsumed,0);
 assert.deepEqual(q.worldConstructionGates,Array(9).fill('BLOCKED'));
 assert.equal(q.worldReadiness,'NOT_PREPARED');
 assert.equal(q.worldWrites,0);
 assert.deepEqual(q.BuildPlan.operations,[]);
});
test('source-accurate standalone eight-scene gallery and exported ORIGINAL source IDs cannot counterfeit production success',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b198e-test-'));
 const out=path.join(dir,'generated');
 try{
  const built=buildB198EPreview({dir:out});
  assert.equal(built.summary.actual3DScenes,8);
  assert.equal(built.summary.sourceTargetsPassed,4);
  const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
  assert(html.includes('b198e-source-provenance'));
  assert(html.includes('日本語'));
  assert(html.includes('未認証'));
  assert(html.includes('APIへの'));
  assert(!html.includes('new WebSocket('));
  for(const id of [...Object.keys(p.created),...Object.keys(p.revised)]){
   const d=JSON.parse(fs.readFileSync(path.join(out,'SOURCE_'+id.toUpperCase()+'.json')));
   assert.equal(d.id,(p.created[id]??p.revised[id]).id);
  }
  const m=JSON.parse(fs.readFileSync(path.join(out,'B198E_GALLERY_MANIFEST.json')));
  assert.equal(m.viewerSceneCount,8);
  assert.equal(m.notRunCreationCases.length,8);
  assert.equal(m.actualModelAPIResponses,0);
  assert.equal(m.worldWrites,0);
  assert.throws(()=>buildB198EPreview({dir:out}),/B198E_REFUSE_EXISTING_OUTPUT/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
