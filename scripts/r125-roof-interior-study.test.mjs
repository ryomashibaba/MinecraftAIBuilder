import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {studyR125RoofInterior,saveR125RoofInterior}
 from './r125-roof-interior-study.mjs';

test('same generic raised-roof compiler opens real interior air in three different programs',t=>{
 const s=studyR125RoofInterior();
 assert.deepEqual(s.report.cases.map(c=>c.slug),[
  'roof-house-synthetic','roof-store-synthetic','roof-lab-synthetic']);
 assert.equal(s.report.originalSavedModelUnchanged,true);
 assert.equal(s.report.modelCalls,0);
 assert.equal(s.report.worldWrites,0);
 assert.equal(s.report.constructionApproved,false);
 assert.deepEqual(s.report.gates,Array(9).fill('BLOCKED'));
 for(const c of s.report.cases){
  assert.equal(c.modelAuthorship,'SYNTHETIC_PROGRAM_NOT_NEW_MODEL_OUTPUT');
  assert.notEqual(c.originalPlanSha256,c.raisedPlanSha256);
  assert.notEqual(c.decorativeGeometrySha256,c.raisedGeometrySha256);
  assert.deepEqual(c.sourceFloorIssuesBefore,[]);
  assert.deepEqual(c.sourceFloorIssuesAfter,[]);
  assert.equal(c.roof.from,'VERIFIED_FINAL_B143_VOXELS');
  assert.equal(c.roof.roofProfile,'sawtooth');
  assert.equal(c.roof.flatRoofBaseRetained,false);
  assert(c.roof.skinStripCount>=18);
  assert(c.roof.newCeilingAirCells>0);
  assert(c.roof.highAirColumns>0);
  assert(c.roof.twoWideHighRoofPads>0);
  assert.equal(c.roof.unclosedEaveOrEndCells,0);
  assert.equal(c.roof.unclosedStepCells,0);
  assert.equal(c.art,'NOT_REVIEWED');
  assert.equal(c.minecraftWalking,'NOT_TESTED');
 }
 assert.equal(s.views.length,3);
 assert(s.views.every(v=>v.originalHtml.includes('minecraftaibuilder-b143-gallery-v1')&&
  v.raisedHtml.includes('minecraftaibuilder-b143-gallery-v1')));
 assert(s.indexHtml.includes('実歩行/美術/施工認定なし'));
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r125-roof-safety-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const out=path.join(temp,'study');
 const report=saveR125RoofInterior(out);
 assert.equal(report.cases.length,3);
 assert(fs.existsSync(path.join(out,'index.html')));
 assert(fs.existsSync(path.join(out,'roof-store-synthetic/raised/index.html')));
 assert(fs.existsSync(path.join(out,'ROOF_INTERIOR_SOURCE_REPORT.json')));
 assert.throws(()=>saveR125RoofInterior(out),/OUTPUT_ALREADY_EXISTS/);
});
