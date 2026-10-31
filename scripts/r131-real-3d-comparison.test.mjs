import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR131SourceComparison,saveR131SourceComparison}
 from './r131-real-3d-comparison.mjs';
test('six genuine voxel scenes retain original Qwen SHA, assembled geometry increases real parts',()=>{
 const r=buildR131SourceComparison();
 assert.equal(r.records.length,6);
 const [shop,small,large,research,smallR,largeR]=r.records;
 assert.deepEqual(r.records.map(x=>x.mode),
  ['original','compact','assembled','original','compact','assembled']);
 assert.equal(shop.voxels,933);
 assert.equal(research.voxels,2936);
 assert.equal(shop.sourceSha256,'05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d');
 assert.equal(research.sourceSha256,'662a79ac44d9ed0cc9d9e49bbc644a25b2e8237a25d7832fa1f8be4e3c3f32c6');
 for(const [base,compact,assembled] of [[shop,small,large],[research,smallR,largeR]]){
  assert.ok(compact.addedVoxelCount>0);
  assert.ok(assembled.addedVoxelCount>compact.addedVoxelCount);
  assert.ok(assembled.physicalPartCount>compact.physicalPartCount);
  assert.equal(compact.featureCount,assembled.featureCount);
  assert.equal(assembled.originalSourceSha256,base.sourceSha256);
  assert.equal(assembled.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(assembled.humanArtApproval,false);
  assert.equal(assembled.worldWrites,0);
 }
 assert.ok(large.independentUnmetIds.includes('front-behind-entrance-on-z'));
 assert.ok(small.independentUnmetIds.includes('front-behind-entrance-on-z'));
 assert.equal(large.independentStatus,'HOLD_INDEPENDENT_FUNCTIONAL_REQUIREMENTS');
 assert.equal(largeR.independentStatus,
  'SOURCE_ONLY_REQUIREMENTS_MET_REAL_FUNCTION_UNVERIFIED');
 assert.equal(r.originalModelCalls,0);
 assert.equal(r.derivativeModelCalls,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(r.pages.length,7);
 assert.ok(r.pages[0].html.includes('iframe'));
 assert.ok(r.pages.every(x=>!x.html.includes('__B143_GALLERY_JSON__')));
});
test('writes a viewable local comparison with independent evidence; cannot overwrite',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r131-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const dest=path.join(root,'scenes'),r=saveR131SourceComparison(dest);
 assert.equal(r.records.length,6);
 for(const x of r.pages)assert.ok(fs.existsSync(path.join(dest,x.filename)));
 const saved=JSON.parse(fs.readFileSync(
  path.join(dest,'R131_COMPARISON_EVIDENCE.json'),'utf8'));
 assert.equal(saved.records.length,6);
 assert.equal(saved.worldWrites,0);
 assert.equal(saved.BuildPlan.operations.length,0);
 assert.ok(saved.records.some(x=>
  x.independentUnmetIds.includes('front-behind-entrance-on-z')));
 assert.throws(()=>saveR131SourceComparison(dest),/R131_COMPARE_EXISTS/);
});
