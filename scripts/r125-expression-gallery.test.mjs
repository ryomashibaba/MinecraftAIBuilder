import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR125ExpressionComparison,saveR125ExpressionComparison}
 from './r125-expression-gallery.mjs';
test('same real Qwen plan baseline plus 3 source-distinct generative form demonstrators',()=>{
 const r=buildR125ExpressionComparison();
 assert.equal(r.report.scenes.length,4);
 assert.equal(r.report.scenes[0].voxels,2620);
 assert.equal(r.report.scenes[0].sourceSha256,
  '4ca2edf2eb066f2f0eecd7dfdc4a710a1e69bc7196c5f85c65483caaa0d9fbd1');
 assert.equal(r.report.scenes[0].geometrySha256,
  '0fc0db6814e105db62da272abb1235cce9d77d4950eab2a0e91d940283201a2e');
 assert.equal(r.report.scenes[0].provenance,'ACTUAL_QWEN14B_ORIGINAL_SEMANTIC_PLAN');
 assert.equal(r.report.scenes.every(s=>s.actualB143SourceVerified),true);
 assert.equal(r.report.scenes.every(s=>!s.newLLMInvocation),true);
 assert.equal(r.report.scenes.every(s=>s.worldWrites===0),true);
 assert.equal(new Set(r.report.scenes.map(s=>s.geometrySha256)).size,4);
 assert.equal(r.html.includes('__B143_GALLERY_JSON__'),false);
 assert.ok(r.html.includes('minecraftaibuilder-b143-gallery-v1'));
 assert.equal(r.report.constructionApproved,false);
 assert.deepEqual(r.report.gates,Array(9).fill('BLOCKED'));
});
test('offline gallery output is collision-safe, contains one interactive HTML',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r125-style-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const out=path.join(dir,'comparison');
 const report=saveR125ExpressionComparison(out);
 assert.equal(report.scenes.length,4);
 assert.equal(fs.existsSync(path.join(out,'index.html')),true);
 assert.equal(fs.existsSync(path.join(out,'ARCHITECTURE_PLANS.json')),true);
 const saved=JSON.parse(fs.readFileSync(path.join(out,'R125_EXPRESSION_COMPARISON.json'),'utf8'));
 assert.equal(saved.exactOriginalPlanSha256,
  '46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271');
 assert.throws(()=>saveR125ExpressionComparison(out),/OUTPUT_ALREADY_EXISTS/);
});
