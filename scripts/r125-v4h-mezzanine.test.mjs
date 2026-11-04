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
