import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileAuthoredCivicApproachArcade}
 from './r125-v4j-civic-arcade.mjs';
import {syntheticFiveV4JArcadeAuthors,exportV4JCivicFacadeStudy}
 from './r125-v4j-civic-facade-study.mjs';

test('V4J all five independently authored exterior public arcades produce real visible B143 and 2-wide public destinations without damaging upper functional programme',()=>{
 const samples=syntheticFiveV4JArcadeAuthors(),frozen=structuredClone(samples);
 assert.deepEqual(samples.map(s=>s.genre),
  ['housing','shop','research','gallery','station']);
 for(const s of samples){
  const q=compileAuthoredCivicApproachArcade(s.wholeBuilding,s.arcade),w=q.sourceWitness;
  assert.notEqual(q.priorGeometrySha256,q.finalGeometrySha256);
  assert.equal(w.authorBayRoofline.length,3);
  assert.equal(w.trueDistinctExteriorRoofCells,s.arcade.width*s.arcade.depth);
  assert.equal(w.actualEightPhysicalSupportColumns,8);
  assert(w.actualSupportColumnCells>35);
  assert.equal(w.actualTwoWorkstationCells,4);
  assert.equal(w.losslessOriginalB143Packing.realCompiledVoxelsIdentical,true);
  assert.equal(w.losslessOriginalB143Packing.originalVoxelOnlySha256,
   w.losslessOriginalB143Packing.packedVoxelOnlySha256);
  assert.equal(w.losslessOriginalB143Packing.originalSourceASTNotModified,true);
  assert.equal(w.losslessOriginalB143Packing.sourceCoupledSHAChangesWhenRepresentationChanges,true);
  assert(w.losslessOriginalB143Packing.savedElements>=
   w.losslessOriginalB143Packing.newFeatureRequiredSavings);
  assert(q.b143Design.elements.length<=160);
  assert(w.actualConnectedRoofRiserCells>0);
  assert(w.realPublicFloorContinuity.supportedAirClearTwoWidePads>20);
  assert.equal(w.realPublicFloorContinuity.width,2);
  assert.equal(w.entranceToNewPublicZone.reachedFromEntrance,true);
  assert.equal(w.preservedRealUpperPublicZone.reachedFromEntrance,true);
  assert.equal(w.allFunctionsReachable,true);
  assert.equal(w.skylineAndForecourtAreOutsidePriorCanopy,true);
  assert(w.genuineVisibleFiveViewDelta.views
   .find(v=>v.face==='roof').depthChangedCells>=48);
  assert(w.genuineVisibleFiveViewDelta.views
   .find(v=>v.face==='north').depthChangedCells>=6);
  assert.equal(q.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(q.sourceRoutes.featureAccess.every(f=>f.reachableFromEntrance));
  assert.equal(q.realModel,'NOT_TESTED');
  assert.equal(q.humanArt,'NOT_REVIEWED');
  assert.equal(q.minecraftWalking,'NOT_TESTED');
  assert.equal(q.readiness,'NOT_PREPARED');
  assert.equal(q.constructionApproved,false);
  assert.equal(q.executionAllowed,false);
  assert.deepEqual(q.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(q.BuildPlan.operations,[]);
  assert.equal(q.worldWrites,0);assert.equal(q.worldContacts,0);
 }
 assert.deepEqual(samples,frozen);
});
test('V4J rejects impossible original design, stacked canopies, unsafe genres and invalid heights instead of repairing',()=>{
 const c=syntheticFiveV4JArcadeAuthors()[0];
 const mutate=f=>{const p=structuredClone(c.arcade);f(p);
  return ()=>compileAuthoredCivicApproachArcade(c.wholeBuilding,p);};
 assert.throws(mutate(a=>a.width=16),
  /R125_V4J_PUBLIC_ARCADE_AUTHOR_3_BAY_FUNCTIONAL_FACADE_CONTRACT/);
 assert.throws(mutate(a=>a.depth=5),
  /R125_V4J_PUBLIC_ARCADE_AUTHOR_OUTDOOR_ARCADE_NOT_DISTINCT_FROM_OLD_CANOPY/);
 assert.throws(mutate(a=>a.roofline=[8,8,8]),
  /R125_V4J_PUBLIC_ARCADE_AUTHOR_3_BAY_FUNCTIONAL_FACADE_CONTRACT/);
 assert.throws(mutate(a=>a.roofline=[15,12,8]),
  /R125_V4J_PUBLIC_ARCADE_AUTHOR_3_BAY_FUNCTIONAL_FACADE_CONTRACT/);
 assert.throws(mutate(a=>a.postMaterial='bedrock'),
  /R125_V4J_PUBLIC_ARCADE_AUTHOR_3_BAY_FUNCTIONAL_FACADE_CONTRACT/);
 assert.throws(mutate(a=>a.autoRepair=true),
  /R125_V4J_PUBLIC_ARCADE_AUTHOR_3_BAY_FUNCTIONAL_FACADE_CONTRACT/);
 const wrong=structuredClone(c.wholeBuilding);wrong.schema='illegal';
 assert.throws(()=>compileAuthoredCivicApproachArcade(wrong,c.arcade),
  /R125_V4J_PUBLIC_ARCADE_EXPLICIT_WHOLE_BUILDING_AUTHOR_REQUIRED/);
});
test('V4J source-only true five-view evidence exported to new isolated art-hold gallery',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4j-art-hold-'));
 const out=path.join(home,'evidence');
 try{
  const report=exportV4JCivicFacadeStudy(out);
  assert.equal(report.cases.length,5);
  assert.equal(report.modelRequests,0);
  assert.equal(report.worldWrites,0);
  assert.equal(report.compilerGenreSpecificStyling,false);
  assert.equal(report.previewStatus,'ART_HOLD_NOT_APPROVED');
  // The synthetic author sample itself has shared 24x24 + 22x22 core sizes.
  // Do not misattribute cross-genre visual similarity solely to the compiler.
  assert.equal(report.authorFootprintCoverage.comparedGenres,5);
  assert.equal(report.authorFootprintCoverage.distinctCoreDimensionPrograms,1);
  assert.equal(report.authorFootprintCoverage.primaryShellDimensionDiversity,
   'NOT_EXERCISED_BY_SYNTHETIC_FIXTURES');
  assert.equal(report.authorFootprintCoverage.compilerCapabilityOrArtLimitationFromFiveGenreSimilarity,
   'NOT_DETERMINABLE');
  assert(report.authorFootprintCoverage.coreFootprints.every(c=>
   c.covered.length===2&&c.covered[0].width===24&&
   c.covered[0].depth===24&&c.covered[1].width===22&&
   c.covered[1].depth===22));
  assert.equal(report.supportsArchitectureBeautyCertification,false);
  assert.equal(report.requiresRealHuman3DReview,true);
  assert.deepEqual(report.safety.gates,Array(9).fill('BLOCKED'));
  const json=JSON.parse(fs.readFileSync(path.join(out,
   'V4J_TRUE_FORECOURT_SOURCE_ART_HOLD.json'),'utf8'));
  assert.deepEqual(report,json);
  assert(fs.existsSync(path.join(out,'V4J_TRUE_PUBLIC_FORECOURT_3D.html')));
  for(const {genre,physicallyVisibleFunctionalFrontArcade:w} of report.cases){
   const before=fs.readFileSync(path.join(out,
    'V4J_'+genre+'_BEFORE_FIVE_VIEWS.svg'),'utf8');
   const after=fs.readFileSync(path.join(out,
    'V4J_'+genre+'_AFTER_FIVE_VIEWS.svg'),'utf8');
   const diff=fs.readFileSync(path.join(out,
    'V4J_'+genre+'_VISIBLE_FACADE_DELTA.svg'),'utf8');
   assert(before.includes('ACTUAL final B143 voxels'));
   assert(after.includes('ACTUAL final B143 voxels'));
   assert(diff.includes('ACTUAL B143 VISIBLE DELTA'));
   assert.notEqual(before,after);
   assert(w.genuineVisibleFiveViewDelta.views
    .find(v=>v.face==='roof').depthChangedCells>=48);
  }
  assert.throws(()=>exportV4JCivicFacadeStudy(out),
   /R125_V4J_FACADE_STUDY_FRESH_OUTSIDE_REPO_ONLY/);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});


test('V4J ONE original complete author JSON retains provenance and exact true B143 civic SOURCE',async()=>{
 const {CIVIC_ARCADE_SCHEMA,CIVIC_ARCADE_SYSTEM_PROMPT,compileCivicArcadeAuthorIntent}=
  await import('../source/ai/r125-v4j-civic-author-ir.mjs');
 const sample=syntheticFiveV4JArcadeAuthors()[0];
 const input={...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)};
 const frozen=JSON.stringify(input),compiled=compileCivicArcadeAuthorIntent(input);
 assert.equal(JSON.stringify(input),frozen);
 assert.equal(compiled.authorContract,CIVIC_ARCADE_SCHEMA);
 assert.equal(compiled.b143.geometrySha256,compiled.geometrySha256);
 assert.equal(compiled.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(compiled.authoredArcadeSourceWitness.allFunctionsReachable,true);
 assert(compiled.b143.program.some(p=>p.level===1));
 assert(compiled.b143.program.some(p=>p.zones.some(z=>z.id==='author-public-forecourt-arcade')));
 assert.deepEqual(compiled.gates,Array(9).fill('BLOCKED'));
 assert.equal(compiled.worldWrites,0);
 assert.equal(compiled.humanArt,'NOT_REVIEWED');
 assert(CIVIC_ARCADE_SYSTEM_PROMPT.includes(CIVIC_ARCADE_SCHEMA));
 const broken=structuredClone(input);
 broken.arcade.roofline=[8,8,8];
 assert.throws(()=>compileCivicArcadeAuthorIntent(broken),
  /R125_V4J_PUBLIC_ARCADE_AUTHOR_3_BAY_FUNCTIONAL_FACADE_CONTRACT/);
 const smuggled=structuredClone(input);smuggled.worldWrites=1;
 assert.throws(()=>compileCivicArcadeAuthorIntent(smuggled),
  /R125_V4J_CIVIC_AUTHOR_ONE_ORIGINAL_JSON/);
});

test('V4J opt-in LOCAL one response: one fake POST, exact PRIVATE original, independent 3D, zero world writes, safe receipt and zero-POST replay',async()=>{
 const {CIVIC_ARCADE_SCHEMA,compileCivicArcadeAuthorIntent}=
  await import('../source/ai/r125-v4j-civic-author-ir.mjs');
 const {parseV4DLocalAuthorArgs,runV4DLocalAuthor}=
  await import('./r125-v4d-local-architect.mjs');
 const {replayPrivateV4D}=await import('./r125-v4d-replay-private.mjs');
 const {diagnosePrivateV4DAuthor}=
  await import('./r125-v4d-author-source-diagnostics.mjs');
 const sample=syntheticFiveV4JArcadeAuthors()[1];
 const original={...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)};
 const raw=JSON.stringify(original),truth=compileCivicArcadeAuthorIntent(original);
 const diag=diagnosePrivateV4DAuthor(original,CIVIC_ARCADE_SCHEMA);
 assert.equal(diag.issues.length,0,JSON.stringify(diag.issues));
 const flags=parseV4DLocalAuthorArgs(['--model','qwen3:14b',
  '--out','civic-private-output','--authored-civic-arcade']);
 assert.equal(flags.authorArcade,true);
 assert.throws(()=>parseV4DLocalAuthorArgs(['--model','qwen3:14b',
  '--out','civic-private-output','--authored-civic-arcade','--authored-mezzanine']),
  /ONLY_ONE_AUTHOR_MODE/);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4j-one-model-'));
 const dest=path.join(root,'model-original');
 const calls=[];
 const fetcher=async(url,init)=>{
  calls.push({url,method:init?.method,body:init?.body});
  assert(url.startsWith('http://127.0.0.1:'));
  if(init?.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(init?.method==='POST')return {ok:true,status:200,
   text:async()=>JSON.stringify({model:'qwen3:14b',choices:[
    {finish_reason:'stop',message:{role:'assistant',content:raw}}]})};
  throw Error('UNEXPECTED_NETWORK');
 };
 try{
  const report=await runV4DLocalAuthor({model:'qwen3:14b',outDir:dest,
   authorArcade:true,
   prompt:'Invent a unique civic shop with a two level public interior and accessible forecourt.'},
   {fetcher,timeoutMs:15000});
  assert.equal(report.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',report.reason);
  assert.equal(report.authorContract,CIVIC_ARCADE_SCHEMA);
  assert.equal(report.geometrySha256,truth.b143.geometrySha256);
  assert.equal(report.sourceRoutesStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(report.modelCalls,1);
  assert.equal(calls.filter(c=>c.method==='POST').length,1);
  assert.equal(calls.filter(c=>c.method==='GET').length,1);
  const request=JSON.parse(calls.find(c=>c.method==='POST').body);
  assert(request.messages[0].content.includes(CIVIC_ARCADE_SCHEMA));
  assert.equal(request.max_tokens,4096);
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  for(const name of ['TRUE_B143_SOURCE.json','index.html',
   'AUTHORED_PUBLIC_ARCADE_SOURCE.json',
   'AUTHORED_FUNCTIONAL_UPPER_GALLERY_SOURCE.json',
   'BASELINE_TWO_LEVEL_GALLERY_3D_PRIVATE.html',
   'FINAL_PUBLIC_ARCADE_FIVE_VIEWS_PRIVATE.svg',
   'PRIVATE_B143_CIVIC_ARCADE_ART_HOLD_COMPARISON.json'])
   assert(fs.statSync(path.join(dest,name)).size>40,name);
  const comparison=JSON.parse(fs.readFileSync(path.join(dest,
   'PRIVATE_B143_CIVIC_ARCADE_ART_HOLD_COMPARISON.json'),'utf8'));
  assert.equal(comparison.finalGeometrySha256,truth.b143.geometrySha256);
  assert.equal(comparison.humanArchitecturalArt,'NOT_REVIEWED');
  assert.equal(comparison.extraModelRequests,0);
  const summary=fs.readFileSync(path.join(dest,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8');
  assert.equal(JSON.parse(summary).authorContract,CIVIC_ARCADE_SCHEMA);
  assert(!summary.includes(original.title));
  assert(!summary.includes(original.brief));
  assert(!summary.includes(root));
  const replay=replayPrivateV4D(dest,path.join(root,'replay'));
  assert.equal(replay.status,'HOLD_TEST_DOUBLE_REPLAY_ONLY');
  assert.equal(replay.geometrySHA256Replayed,truth.b143.geometrySha256);
  assert.equal(replay.additionalModelCalls,0);
  assert.equal(calls.filter(c=>c.method==='POST').length,1);
  assert.equal(report.worldWrites,0);
  assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('V4J invalid original stays PRIVATE HOLD with one fake model POST and no source promotion',async()=>{
 const {CIVIC_ARCADE_SCHEMA}=
  await import('../source/ai/r125-v4j-civic-author-ir.mjs');
 const {runV4DLocalAuthor}=await import('./r125-v4d-local-architect.mjs');
 const {diagnosePrivateV4DAuthor}=
  await import('./r125-v4d-author-source-diagnostics.mjs');
 const sample=syntheticFiveV4JArcadeAuthors()[2];
 const broken={...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)};
 broken.arcade.roofline=[8,8,8];
 const issue=diagnosePrivateV4DAuthor(broken,CIVIC_ARCADE_SCHEMA);
 assert(issue.issues.some(x=>x.code==='CIVIC_ARCADE_THREE_BAY_ROOFLINE_INVALID'));
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4j-hold-'));
 let posts=0;
 const fetcher=async(url,init)=>{
  if(init.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  posts++;
  return {ok:true,status:200,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',
    message:{content:JSON.stringify(broken)}}]})};
 };
 try{
  const dir=path.join(root,'candidate'),result=await runV4DLocalAuthor({
   model:'qwen3:14b',outDir:dir,authorArcade:true,
   prompt:'Create an entirely new connected public architecture.'},
   {fetcher,timeoutMs:15000});
  assert.equal(posts,1);
  assert.equal(result.modelCalls,1);
  assert.equal(result.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.equal(result.worldWrites,0);
  assert(!fs.existsSync(path.join(dir,'TRUE_B143_SOURCE.json')));
  assert(!fs.existsSync(path.join(dir,'index.html')));
  const status=JSON.parse(fs.readFileSync(path.join(dir,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8'));
  assert.equal(status.failureCategory,'PUBLIC_CIVIC_ARCADE_AUTHOR_OR_SOURCE_INVALID');
  assert.equal(status.sourceCandidateVerified,false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
