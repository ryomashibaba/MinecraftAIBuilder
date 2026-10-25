import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR172Autoreview,saveR172Autoreview}
 from './r172-ci-autoreview.mjs';

test('R172 unattended 3-use synthetic designs actually compile and preserve blocked world gates',()=>{
 const result=buildR172Autoreview();
 assert.equal(result.status,'SYNTHETIC_B143_SOURCE_QA_PASS_ART_HOLD');
 assert.equal(result.NOT_REAL_MODEL_EVIDENCE,true);
 assert.equal(result.cases.length,3);
 assert.equal(result.realModelCalls,0);
 assert.equal(result.worldWrites,0);
 for(const c of result.cases){
  assert.equal(c.source.r170FourRoomVolumeEvidence.roomSections.length,4);
  assert.equal(c.audit.sourceRouteStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(c.audit.rooms,4);
  assert.equal(c.audit.realLocalInference,false);
  assert.equal(c.audit.humanArtReview,'ART_HOLD');
  assert.equal(c.audit.worldWrites,0);
  assert.deepEqual(c.source.BuildPlan.operations,[]);
  assert.deepEqual(c.source.gates,Array(9).fill('BLOCKED'));
  assert.equal(c.source.constructionApproved,false);
 }
});

test('R172 single CI operation produces three interactive previews + 15 true voxel SVGs and never overwrites',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r172-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const out=path.join(root,'new');
 const result=saveR172Autoreview(out);
 assert.equal(result.cases.length,3);
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,'R172_CI_QA.json'))).NOT_REAL_MODEL_EVIDENCE,true);
 assert.ok(fs.readFileSync(path.join(out,'index.html'),'utf8').includes('静的な合成入力のみ'));
 for(const id of ['home','shop','laboratory']){
  assert.ok(fs.existsSync(path.join(out,id+'.html')));
  for(const view of ['front','rear','west','east','roof']){
   const svg=fs.readFileSync(path.join(out,id+'-'+view+'.svg'),'utf8');
   assert.ok(svg.startsWith('<svg'),id+' '+view);
  }
 }
 assert.throws(()=>saveR172Autoreview(out),/R172_AUTOMATED_QA_NEW_OUTPUT_DIR_REQUIRED/);
});
