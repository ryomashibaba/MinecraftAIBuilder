import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileHeightAuthorIntent} from '../source/ai/r125-v4g-height-author-ir.mjs';
import {compileAuthoredPublicMezzanine}
 from '../source/ai/r125-v4h-authored-mezzanine.mjs';
import {syntheticFiveAuthorMezzanineCases,exportV4HTrueMezzanineStudy}
 from './r125-v4h-mezzanine-source-study.mjs';
test('V4H Windows launcher refuses unmonitored real Qwen before clone or PRIVATE directories',()=>{
 const powershell=fs.readFileSync(new URL('./r125-v4h-real-qwen-trial.ps1',import.meta.url),'utf8');
 const checkOnly=powershell.indexOf('if ($CheckOnly) {');
 const gate=powershell.indexOf('$fakeOnlyCI = $false');
 const pinned=powershell.indexOf("if ($ExpectedCommit -cnotmatch");
 const directory=powershell.indexOf("$sourceRoot = Join-Path $base 'IsolatedV4H'");
 const clone=powershell.indexOf('clone --quiet --depth 1 --single-branch');
 assert(checkOnly>=0&&checkOnly<gate);
 assert(gate>=0&&gate<pinned&&gate<directory&&gate<clone);
 assert.match(powershell,/if \(-not \$fakeOnlyCI\) \{\s*throw 'V4H_REAL_POST_REQUIRES_MONITORED_GATEC_PATH'/);
 assert(powershell.includes('GITHUB_CI_ONLY_FAKE_OLLAMA_READY'));
 assert(powershell.includes("GITHUB_REF_NAME -ceq 'research/r125-entry-nearest-safe-source-20261109'"));
 assert(powershell.includes('$head -cne $ExpectedCommit'));
});

test('V4H FIVE independent author mezzanines really reach 2-wide upper functional service with 3D stairs',()=>{
 const samples=syntheticFiveAuthorMezzanineCases(),frozen=structuredClone(samples);
 assert.deepEqual(samples.map(s=>s.genre),['housing','shop','research','gallery','station']);
 for(const s of samples){
  const before=compileHeightAuthorIntent(s.heightAuthor);
  const after=compileAuthoredPublicMezzanine(s.heightAuthor,s.mezzanine);
  const w=after.sourceWitness;
  assert.equal(after.originalGeometrySha256,before.b143.geometrySha256);
  assert.notEqual(after.finalGeometrySha256,before.b143.geometrySha256);
  assert.equal(w.physical2WideStairTreads,s.mezzanine.rise+1);
  assert.equal(w.physicallySupportedUpperFloorCells,s.mezzanine.deckWidth*3);
  assert.equal(w.connectedUpperProgram.reachedFromEntrance,true);
  assert.equal(w.connectedPublicService.reachableFromEntrance,true);
  assert.equal(w.connectedUpperProgram.standingFloorY,s.mezzanine.rise+2);
  assert(w.connectedPublicService.sourceGraphMoves>0);
  assert(w.addedAboveGroundB143Cells>30);
  assert.equal(w.physicalGlazingPreserved.verifiedPanelGlassCells,36);
  assert.equal(after.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(after.worldContacts,0);
  assert.equal(after.worldWrites,0);
  assert.equal(after.readiness,'NOT_PREPARED');
  assert.equal(after.constructionApproved,false);
  assert.equal(after.executionAllowed,false);
  assert.deepEqual(after.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(after.BuildPlan.operations,[]);
  assert.equal(after.humanArt,'NOT_REVIEWED');
  assert.equal(after.realModel,'NOT_TESTED');
  assert.equal(after.minecraftWalking,'NOT_TESTED');
  assert(['west','east'].includes(w.authorChosenStairLane));
  const badLane={...s.mezzanine,stairLane:'center'};
  assert.throws(()=>compileAuthoredPublicMezzanine(s.heightAuthor,badLane),
   /R125_V4H_MEZZANINE_EXPLICIT_AUTHOR_MEZZANINE_GRAMMAR/);
  const bad={...s.mezzanine,rise:12};
  assert.throws(()=>compileAuthoredPublicMezzanine(s.heightAuthor,bad),
   /R125_V4H_MEZZANINE_EXPLICIT_AUTHOR_MEZZANINE_GRAMMAR/);
 }
 assert.deepEqual(samples,frozen);
});
test('V4H export preserves authentic BEFORE and AFTER staircase voxel cutaways, never promotes ART',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4h-source-'));
 const out=path.join(root,'actual');
 try{
  const report=exportV4HTrueMezzanineStudy(out);
  assert.equal(report.cases.length,5);
  assert.equal(report.provenance,'SYNTHETIC_EXPLICIT_FIVE_HUMAN_AUTHORS_NOT_LLM');
  assert.equal(report.realModelRuns,0);
  assert.equal(report.worldWrites,0);
  assert.equal(report.humanArt,'NOT_REVIEWED');
  assert.deepEqual(report.safety.gates,Array(9).fill('BLOCKED'));
  assert(fs.existsSync(path.join(out,'mezzanine-3d.html')));
  for(const sample of report.cases){
   assert(sample.trueB143MezzanineWitness.connectedUpperProgram.reachedFromEntrance);
   assert(sample.trueB143MezzanineWitness.connectedPublicService.reachableFromEntrance);
   const a=fs.readFileSync(path.join(out,'STAIR_SECTION_AFTER_'+sample.genre+'.svg'),'utf8');
   const b=fs.readFileSync(path.join(out,'STAIR_SECTION_BEFORE_'+sample.genre+'.svg'),'utf8');
   assert(a.includes('ACTUAL B143 INTERIOR STAIR SECTION'));
   assert(b.includes('ACTUAL B143 INTERIOR STAIR SECTION'));
   assert.notEqual(a,b);
   assert(fs.existsSync(path.join(out,'MEZZANINE_FIVE_VIEWS_'+sample.genre+'.svg')));
  }
  assert.throws(()=>exportV4HTrueMezzanineStudy(out),/NEW_OUTSIDE_REPOSITORY/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('V4H ONE original response compiles true elevated public architecture for five synthetic authors and rejects corrupt stair contracts',async()=>{
 const {MEZZANINE_SCHEMA,MEZZANINE_SYSTEM_PROMPT,compileMezzanineAuthorIntent}
  =await import('../source/ai/r125-v4h-mezzanine-author-ir.mjs');
 const {diagnosePrivateV4DAuthor}
  =await import('./r125-v4d-author-source-diagnostics.mjs');
 const cases=syntheticFiveAuthorMezzanineCases();
 for(const v of cases){
  const author={...structuredClone(v.heightAuthor),schema:MEZZANINE_SCHEMA,
   mezzanine:structuredClone(v.mezzanine)},immutable=structuredClone(author);
  const result=compileMezzanineAuthorIntent(author),w=result.authoredMezzanineSourceWitness;
  assert.deepEqual(author,immutable);
  assert.equal(result.authorContract,MEZZANINE_SCHEMA);
  assert.equal(w.physical2WideStairTreads,v.mezzanine.rise+1);
  assert.equal(w.physicallySupportedUpperFloorCells,3*v.mezzanine.deckWidth);
  assert.equal(w.physicalSupportingColumns,4);
  assert.equal(w.connectedUpperProgram.reachedFromEntrance,true);
  assert.equal(w.connectedPublicService.reachableFromEntrance,true);
  assert(result.b143.program.some(p=>p.level===1&&p.standingFloorY===v.mezzanine.rise+2));
  assert.equal(result.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(result.b143.sourceProof.physicallyConnectedUpperPublicEquipment,true);
  assert.equal(result.realModel,'NOT_TESTED');
  assert.equal(result.humanArt,'NOT_REVIEWED');
  assert.equal(result.worldWrites,0);assert.equal(result.worldContacts,0);
  assert.equal(result.constructionApproved,false);
  assert.equal(result.executionAllowed,false);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(result.BuildPlan.operations,[]);
  assert.equal(diagnosePrivateV4DAuthor(author,MEZZANINE_SCHEMA).issues.length,0);
  const bad=structuredClone(author);bad.mezzanine.stairLane='middle';
  assert.throws(()=>compileMezzanineAuthorIntent(bad),
   /R125_V4H_MEZZANINE_EXPLICIT_AUTHOR_MEZZANINE_GRAMMAR/);
  assert(diagnosePrivateV4DAuthor(bad,MEZZANINE_SCHEMA).issues.some(i=>
   i.code==='PUBLIC_MEZZANINE_SIDE_OR_STAIR_LANE'));
  const extra=structuredClone(author);extra.mezzanine.ignoredHiddenHostRepair=true;
  assert.throws(()=>compileMezzanineAuthorIntent(extra),
   /R125_V4H_MEZZANINE_AUTHOR_ONE_COMPLETE_JSON_AND_EXPLICIT_FUNCTIONAL_LEVEL/);
 }
 assert(MEZZANINE_SYSTEM_PROMPT.includes('No world writes')||
  MEZZANINE_SYSTEM_PROMPT.includes('No world'));
});

test('V4H FAKE one-response local model POST once, creates PRIVATE original + identical-plane before/after cut sections, no-call offline SHA replay',async()=>{
 const {MEZZANINE_SCHEMA}=await import('../source/ai/r125-v4h-mezzanine-author-ir.mjs');
 const {parseV4DLocalAuthorArgs,runV4DLocalAuthor}
  =await import('./r125-v4d-local-architect.mjs');
 const {replayPrivateV4D}=await import('./r125-v4d-replay-private.mjs');
 const sample=syntheticFiveAuthorMezzanineCases()[0];
 const author={...structuredClone(sample.heightAuthor),schema:MEZZANINE_SCHEMA,
  mezzanine:structuredClone(sample.mezzanine)};
 const original=JSON.stringify(author),calls=[];
 const fetcher=async(url,opt)=>{
  calls.push(opt?.method);
  if(opt?.method==='GET')
   return {ok:true,status:200,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(opt?.method==='POST'){
   const payload=JSON.parse(opt.body);
   assert.equal(payload.max_tokens,4096);
   assert.equal(payload.messages.length,2);
   assert.equal(payload.response_format.type,'json_object');
   assert.equal(payload.messages[0].content.includes('mezzanine'),true);
   return {ok:true,status:200,text:async()=>JSON.stringify({
    model:'qwen3:14b',choices:[{finish_reason:'stop',message:{content:original}}]})};
  }
  throw Error('UNEXPECTED_FAKE_ORIGIN');
 };
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4h-fake-private-'));
 const out=path.join(root,'attempt'),replay=path.join(root,'replay');
 try{
  const opt=parseV4DLocalAuthorArgs(['--authored-mezzanine',
   '--model','qwen3:14b','--out',out,
   '--prompt','Design an architecturally expressive original full public multi-level complex.']);
  assert.equal(opt.authorMezzanine,true);
  assert.throws(()=>parseV4DLocalAuthorArgs(['--authored-mezzanine','--authored-atrium',
   '--model','qwen3:14b','--out',out]),/ONLY_ONE_AUTHOR_MODE/);
  const result=await runV4DLocalAuthor(opt,{fetcher,timeoutMs:15000});
  assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',result.reason);
  assert.equal(result.modelCalls,1);
  assert.equal(result.authorContract,MEZZANINE_SCHEMA);
  assert.equal(result.sourceRoutesStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(result.worldWrites,0);
  assert.equal(calls.filter(c=>c==='POST').length,1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'AUTHOR_INTENT_ORIGINAL.json'),'utf8')),author);
  assert.equal(fs.readFileSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
  const evidence=JSON.parse(fs.readFileSync(
   path.join(out,'PRIVATE_B143_MEZZANINE_ART_HOLD_COMPARISON.json'),'utf8'));
  assert.equal(evidence.mezzanineSourceWitness.connectedUpperProgram.reachedFromEntrance,true);
  assert.equal(evidence.mezzanineSourceWitness.connectedPublicService.reachableFromEntrance,true);
  assert.equal(evidence.extraModelRequests,0);
  assert.equal(evidence.provenance,'INJECTED_TEST_DOUBLE_NOT_REAL_MODEL');
  assert.equal(evidence.humanArchitecturalArt,'NOT_REVIEWED');
  for(const name of [
   'AUTHORED_FUNCTIONAL_UPPER_GALLERY_SOURCE.json',
   'BASELINE_TALL_HALL_3D_PRIVATE.html',
   'BASELINE_TALL_HALL_FIVE_VIEWS_PRIVATE.svg',
   'FINAL_TWO_LEVEL_PUBLIC_GALLERY_FIVE_VIEWS_PRIVATE.svg',
   'PRIVATE_B143_MEZZANINE_EXTERIOR_VISIBILITY_DELTA.svg',
   'PRIVATE_B143_MEZZANINE_INTERIOR_BEFORE.svg',
   'PRIVATE_B143_MEZZANINE_INTERIOR_AFTER.svg'
  ])assert(fs.existsSync(path.join(out,name)),name);
  const before=fs.readFileSync(path.join(out,'PRIVATE_B143_MEZZANINE_INTERIOR_BEFORE.svg'),'utf8');
  const after=fs.readFileSync(path.join(out,'PRIVATE_B143_MEZZANINE_INTERIOR_AFTER.svg'),'utf8');
  assert(before.includes('ACTUAL B143 INTERIOR STAIR SECTION'));
  assert(after.includes('ACTUAL B143 INTERIOR STAIR SECTION'));
  assert.notEqual(before,after);
  const safe=JSON.parse(fs.readFileSync(path.join(out,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8'));
  assert.equal(safe.authorContract,MEZZANINE_SCHEMA);
  assert.equal(safe.sourceCandidateVerified,true);
  assert.equal(safe.explicitlyInjectedTestResponse,true);
  assert.equal(safe.rawModelTextIncluded,false);
  assert.equal(safe.modelIdentityCryptographicallyVerified,false);
  const previousCalls=calls.length;
  const replayed=replayPrivateV4D(out,replay);
  assert.equal(calls.length,previousCalls);
  assert.equal(replayed.status,'HOLD_TEST_DOUBLE_REPLAY_ONLY');
  assert.equal(replayed.originalCompilerHashesMatch,true);
  assert.equal(replayed.additionalModelCalls,0);
  assert.equal(replayed.worldWrites,0);
  assert(!fs.existsSync(path.join(replay,'MODEL_RESPONSE_ORIGINAL.txt')));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
