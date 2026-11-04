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
