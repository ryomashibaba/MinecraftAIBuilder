/** R190-AP contrasts new macro volume design, not new unapproved model capability. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {r190APSourceProgram,writeR190APMassingComparison} from './r190ap-macro-contrast.mjs';
import {compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
test('AP articulated three-wing author intent maintains open sky and true walking',()=>{
 const names=['00-open-court-plain','01-three-wing-articulated','02-articulated-shifted'];
 const plans=names.map(r190APSourceProgram);
 const built=plans.map(compileR190SemanticPlan);
 for(const b of built){
  assert(verifyCompiled(b.design,b.compiled));
  assert.equal(b.audit.outdoorCourtCount,1);
  assert(b.audit.verifiedOpenSkyColumns>=100);
  assert(b.audit.allProgramSpacesReachable);
  assert.equal(b.audit.witnesses.length,4);
  assert.equal(b.worldContacts,0);assert.equal(b.worldWrites,0);
  assert.equal(b.art,'ART_HOLD');
  assert.equal(b.readiness,'NOT_PREPARED');
  assert.deepEqual(b.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(b.BuildPlan.operations,[]);
 }
 assert.equal(new Set(built.map(b=>b.compiled.geometrySha256)).size,3);
 assert.equal(built[0].audit.facetedEnvelope,null);
 assert.equal(built[0].audit.roofForm,null);
 for(const b of built.slice(1)){
  assert.equal(b.audit.facetedEnvelope.spaceId,'public-hall');
  assert.equal(b.audit.roofForm.profile,'sawtooth');
 }
 assert.deepEqual(plans[0].spaces.map(s=>s.purpose),plans[2].spaces.map(s=>s.purpose));
 assert.deepEqual(plans[0].spaces.map(s=>[s.width,s.depth,s.height]),plans[2].spaces.map(s=>[s.width,s.depth,s.height]));
 assert.deepEqual(plans[0].materials,plans[2].materials);
});
test('AP three true B143 galleries and matched elevation fingerprint receipt',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r190ap-')),out=path.join(temp,'new');
 try{
  assert.deepEqual(writeR190APMassingComparison(out),
   {count:3,distinctB143:3,modelCalls:0,worldWrites:0,art:'ART_HOLD'});
  const report=JSON.parse(fs.readFileSync(path.join(out,'SUMMARY.json'),'utf8'));
  assert.equal(report.schema,'minecraftaibuilder-r190ap-macro-study-v1');
  assert.equal(report.studyDesign,'SAME_FOUR_SPACES_SAME_PROGRAM_AND_MATERIALS');
  assert.equal(report.scenes.length,3);
  assert.equal(report.viewChanges.silhouetteChangeIsNotBeautyProof,true);
  assert(report.viewChanges.plainToArticulated.length>0);
  assert(report.viewChanges.articulatedToAuthorShifted.length>0);
  assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
  for(const s of report.scenes){
   assert(fs.readFileSync(path.join(out,s.name+'-TRUE-B143.html'),'utf8').includes('R190-AP SYNTHETIC'));
   for(const face of ['front','rear','west','east','roof'])
    assert(fs.readFileSync(path.join(out,s.name+'-'+face+'.svg'),'utf8').includes('<svg'));
   assert.equal(Object.keys(s.elevationSha256).length,5);
  }
  assert.throws(()=>writeR190APMassingComparison(out),/NEW_ABSOLUTE_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
