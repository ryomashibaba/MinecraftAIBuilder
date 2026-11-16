import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR125FormReviewGallery,saveR125FormReviewGallery}
 from './r125-form-review-gallery.mjs';

test('archived genuine Qwen SHA and provenance survive independent true B143 form comparison',()=>{
 const {html,report}=buildR125FormReviewGallery();
 assert.equal(report.scenes.length,7);
 assert.deepEqual(report.scenes.slice(0,3).map(s=>s.kind),
  Array(3).fill('ARCHIVED_GENUINE_QWEN_PLAN'));
 assert.deepEqual(report.scenes.slice(3).map(s=>s.kind),
  Array(4).fill('CONTROLLED_SYNTHETIC_FORM_STUDY'));
 assert.equal(report.scenes.every(s=>s.worldWrites===0),true);
 assert.equal(report.originalThreeQwenUnchanged,true);
 assert.equal(report.newLocalModelCalls,0);
 assert.equal(report.experimentalDifference.sameProgramAndMaterials,true);
 assert(report.experimentalDifference.removedSolidCells>0);
 assert(report.experimentalDifference.addedSolidCells>0);
 assert.equal(report.scenes[4].frontCourtyard.groundCells,30);
 assert.equal(report.scenes[4].frontCourtyard.twoWideReachable,
  'SOURCE_2_WIDE_PAVED_COURT_REACHABLE');
 assert.equal(report.scenes[5].rearCourtyard.groundCells,108);
 assert.equal(report.scenes[5].rearCourtyard.twoWideReachable,
  'SOURCE_2_WIDE_PAVED_COURT_REACHABLE');
 assert.equal(report.scenes[5].rearCourtyard.alignment,'center');
 assert(report.uShapedDifference.removedSolidCells>0);
 assert(report.uShapedDifference.addedSolidCells>0);
 assert.equal(report.uShapedDifference.sameProgramAndMaterials,true);
 assert.equal(report.scenes[6].rearCourtyard.groundCells,108);
 assert.equal(report.scenes[6].rearCourtyard.twoWideReachable,
  'SOURCE_2_WIDE_PAVED_COURT_REACHABLE');
 // B198C sees differently raised ROOF skin strips as disconnected standing
 // elevations, but independent PROGRAM standing floors and SOURCE routes pass.
 // Retain this reviewer-facing HIGH advisory, never mask the critic output.
 assert.deepEqual(report.scenes[6].highRiskFindings,
  ['FRAGMENTED_PUBLIC_SOURCE_FLOORS']);
 assert.equal(report.scenes[6].programFloorIssues.length,0);
 assert.equal(report.uRoofDifference.sameProgramAndMaterials,true);
 assert(report.uRoofDifference.removedSolidCells>0);
 assert(report.uRoofDifference.addedSolidCells>0);
 assert.equal(report.scenes.slice(3).every(x=>
  x.sourceRoutes==='SOURCE_ROUTES_REACH_ALL_ZONES'),true);
 assert.equal(report.art,'NOT_REVIEWED');
 assert.equal(report.minecraft,'NOT_TESTED');
 assert.equal(report.gates.every(x=>x==='BLOCKED'),true);
 assert(html.includes('真正Qwen保存3棟'));
 assert(html.includes('合成研究'));
 assert(html.includes('R125'));
 assert(!html.includes('__B143_GALLERY_JSON__'));
});
test('gallery writes offline-only and refuses overwriting an output directory',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r125-form-review-'));
 try{
  const out=path.join(tmp,'comparison');
  const result=saveR125FormReviewGallery(out);
  assert.equal(result.scenes.length,7);
  const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
  const report=JSON.parse(fs.readFileSync(path.join(out,'FORM_REVIEW.json'),'utf8'));
  assert(html.includes('真正Qwen保存3棟'));
  assert.equal(report.worldWrites,0);
  assert.throws(()=>saveR125FormReviewGallery(out),/OUTPUT_MUST_BE_NEW/);
 }finally{fs.rmSync(tmp,{force:true,recursive:true});}
});
