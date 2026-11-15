import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR125SavedThreeGenreBaseline,saveR125SavedThreeGenreBaseline}
 from './r125-saved-three-genre-baseline.mjs';

test('three user-supplied original Qwen14B genres replay EXACT pinned real B143 voxels',()=>{
 const {report,html}=buildR125SavedThreeGenreBaseline();
 assert.equal(report.schema,'r125-saved-qwen-3genre-baseline-v1');
 assert.deepEqual(report.scenes.map(s=>s.genre),['housing','retail','research']);
 assert.deepEqual(report.scenes.map(s=>s.voxels),[2620,933,2936]);
 assert.deepEqual(report.scenes.map(s=>s.roomCount),[4,2,4]);
 assert.deepEqual(report.scenes.map(s=>s.modelChosenEquipment),[0,0,0]);
 assert.deepEqual(report.scenes.map(s=>s.builtEquipment),[0,0,0]);
 assert.ok(report.scenes.every(s=>s.newLLMInvocation===false));
 assert.ok(report.scenes.every(s=>s.sourceCirculation==='SOURCE_CLEARANCE_PROBES_PASS'));
 assert.ok(report.scenes.every(s=>s.worldWrites===0&&s.humanArt==='NOT_REVIEWED'));
 assert.equal(report.scenes[1].warning.includes('LEFT/RIGHT'),true);
 assert.equal(report.scenes[2].highRiskCount,1);
 assert.equal(report.art,'NOT_REVIEWED');
 assert.equal(report.minecraft,'NOT_TESTED');
 assert.equal(report.newModelCalls,0);
 assert.equal(report.worldWrites,0);
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.ok(html.includes('minecraftaibuilder-b143-gallery-v1'));
 assert.ok(html.includes('保存済み実Qwen14B・3用途の形状比較'));
 assert.ok(html.includes('id="qwen-three-review"'));
 assert.ok(html.includes('id="building"'));
 assert.ok(html.includes('id="mobileCut"'));
 assert.ok(html.includes('当時のQwen指定設備'));
 assert.ok(!html.includes('__B143_GALLERY_JSON__'));
 assert.ok(!html.includes('fetch('));
});
test('saved 3-genre visual baseline writes only independent new read-only files',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-qwen-3genre-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const destination=path.join(root,'review');
 const report=saveR125SavedThreeGenreBaseline(destination);
 assert.equal(report.scenes.length,3);
 const index=fs.readFileSync(path.join(destination,'index.html'),'utf8');
 const saved=JSON.parse(fs.readFileSync(
  path.join(destination,'SAVED_3GENRE_BASELINE.json'),'utf8'));
 assert.ok(index.length>10000);
 assert.equal(saved.scenes.length,3);
 assert.equal(saved.scenes[0].planSha256,
  '46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271');
 assert.equal(saved.scenes[1].sourceSha256,
  '05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d');
 assert.equal(saved.scenes[2].geometrySha256,
  'c855de91535e632b2a97dc28a93d8a8cb92d5720d26f8df6f8379b2dc8c284af');
 assert.throws(()=>saveR125SavedThreeGenreBaseline(destination),
  /OUTPUT_MUST_BE_NEW/);
});
