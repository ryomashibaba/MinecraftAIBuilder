import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {syntheticFiveAuthorMezzanineCases}
 from './r125-v4h-mezzanine-source-study.mjs';
import {compileHeightAuthorIntent}
 from '../source/ai/r125-v4g-height-author-ir.mjs';
import {compileAuthoredPublicMezzanine}
 from '../source/ai/r125-v4h-authored-mezzanine.mjs';
import {
 assessV4IActualB143ArtEvidence,exportV4IArchitecturalEvidence
} from './r125-v4i-architectural-art-audit.mjs';

const cases=()=>syntheticFiveAuthorMezzanineCases().map(c=>({
 genre:c.genre,before:compileHeightAuthorIntent(c.heightAuthor),
 after:compileAuthoredPublicMezzanine(c.heightAuthor,c.mezzanine)
}));
test('V4I measures true five-view geometry diversity, does NOT invent aesthetic PASS thresholds',()=>{
 const input=cases();
 const {report,svg}=assessV4IActualB143ArtEvidence(input);
 assert.equal(report.schema,'r125-v4i-independent-architectural-visibility-triage-v1');
 assert.equal(report.provenance,'REAL_B143_VOXELS_OF_EXPLICIT_SYNTHETIC_AUTHORS_NOT_A_LOCAL_MODEL');
 assert.equal(report.cases.length,5);
 assert.equal(report.pairwise.length,10);
 assert.equal(report.previewStatus,'ART_HOLD_NO_HUMAN_ART_APPROVAL');
 assert.equal(report.visualMetricPassThresholds,'UNDEFINED_DO_NOT_INVENT');
 assert.equal(report.modelRuns,0);
 assert.equal(report.worldWrites,0);
 assert.equal(report.canAutomateHumanArtJudgment,false);
 assert.equal(report.technicalSourceIsNotArchitecturalArt,true);
 assert.deepEqual(report.safety.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(report.safety.BuildPlan.operations,[]);
 assert.equal(report.safety.constructionApproved,false);
 for(const c of report.cases){
  assert.equal(c.sourceOnly,true);
  assert.equal(c.architecturalArt,'NOT_REVIEWED');
  assert.equal(c.independentFiveViewChange.length,5);
  assert.deepEqual(c.independentFiveViewChange.map(x=>x.face),
   ['roof','north','south','west','east']);
  assert(c.independentFiveViewChange.every(x=>x.changedCells>=0&&
   x.silhouetteChangedCells>=0&&x.materialChangedCells>=0&&
   x.depthChangedCells>=0));
  assert(c.actualB143VoxelCount>=5000);
  assert(c.internalDifferentVoxels>0);
  assert(c.noExteriorArtImprovementClaim);
  assert(c.fiveViewMaterialExposure.mostExposedFraction>0&&
   c.fiveViewMaterialExposure.mostExposedFraction<=1);
  assert(c.projectionPixels.roof>100);
 }
 for(const p of report.pairwise){
  assert(p.meanFiveViewSimilarity>=0&&p.meanFiveViewSimilarity<=1);
  assert(Object.keys(p.perFaceSilhouetteSimilarity).length===5);
  assert(Object.values(p.perFaceSilhouetteSimilarity).every(x=>x>=0&&x<=1));
 }
 assert(svg.startsWith('<svg'));
 assert(svg.includes('NOT ART PASS'));
 assert(svg.includes('housing'));
 assert(svg.includes('station'));
 assert(!svg.includes('ART PASS —'));
});
test('V4I rejects fabricated multi-level paths, world writes, corrupted primitives, duplicate genres',()=>{
 const input=cases();
 const untouched=assessV4IActualB143ArtEvidence(input).report;
 assert.equal(untouched.worldWrites,0);
 const fake=structuredClone(input);
 fake[0].after.worldWrites=1;
 assert.throws(()=>assessV4IActualB143ArtEvidence(fake),
  /R125_V4I_ART_SCREENING_UNVERIFIED_SOURCE_OR_MINECRAFT_SAFETY/);
 const fakeRoute=structuredClone(input);
 fakeRoute[2].after.sourceWitness.connectedPublicService.reachableFromEntrance=false;
 assert.throws(()=>assessV4IActualB143ArtEvidence(fakeRoute),
  /R125_V4I_ART_SCREENING_UNVERIFIED_SOURCE_OR_MINECRAFT_SAFETY/);
 const duplicate=structuredClone(input);
 duplicate[1].genre=duplicate[0].genre;
 assert.throws(()=>assessV4IActualB143ArtEvidence(duplicate),
  /R125_V4I_ART_SCREENING_FIVE_DISTINCT_SYNTHETIC_GENRES_REQUIRED/);
 const corrupted=structuredClone(input);
 corrupted[3].after.b143Compiled.primitives.push(
  [...corrupted[3].after.b143Compiled.primitives[0]]);
 assert.throws(()=>assessV4IActualB143ArtEvidence(corrupted),
  /R125_V4I_ART_SCREENING_DUPLICATE_B143_CELL/);
});
test('V4I exports real B143 five-view and material/silhouette score evidence to fresh outside repo artifact only',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4i-observable-art-'));
 const dir=path.join(parent,'one-art-audit');
 try{
  const report=exportV4IArchitecturalEvidence(dir);
  assert.equal(report.cases.length,5);
  assert.equal(report.pairwise.length,10);
  assert.equal(report.modelRuns,0);
  assert.equal(report.worldWrites,0);
  assert.equal(report.previewStatus,'ART_HOLD_NO_HUMAN_ART_APPROVAL');
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'V4I_ART_HOLD_VISIBLE_GEOMETRY_AND_DIVERSITY.json'),'utf8'));
  assert.deepEqual(json,report);
  const matrix=fs.readFileSync(path.join(dir,'V4I_ACTUAL_B143_DIVERSITY_MATRIX.svg'),'utf8');
  assert(matrix.includes('Relative silhouette similarity'));
  for(const genre of ['housing','shop','research','gallery','station']){
   const visual=fs.readFileSync(path.join(dir,'V4I_'+genre+'_TRUE_FIVE_VIEWS.svg'),'utf8');
   assert(visual.includes('ACTUAL final B143 voxels'));
   const change=fs.readFileSync(path.join(dir,'V4I_'+genre+'_EXTERIOR_DELTA.svg'),'utf8');
   assert(change.includes('ACTUAL B143 VISIBLE DELTA'));
  }
  assert.throws(()=>exportV4IArchitecturalEvidence(dir),
   /R125_V4I_ART_SCREENING_NEW_ISOLATED_OUTSIDE_REPO_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
