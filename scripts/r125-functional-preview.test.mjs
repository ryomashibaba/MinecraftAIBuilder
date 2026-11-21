import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR125FunctionalPreview,saveR125FunctionalPreview}
 from './r125-functional-preview.mjs';
test('real 14B source remains original, derived 3D contains actual new features',()=>{
 const r=buildR125FunctionalPreview();
 assert.equal(r.records.length,4);
 assert.deepEqual(r.records.map(x=>x.voxels).filter((_,i)=>i%2===0),[933,2936]);
 assert.equal(r.records[0].sourceSha256,
  '05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d');
 assert.equal(r.records[2].sourceSha256,
  '662a79ac44d9ed0cc9d9e49bbc644a25b2e8237a25d7832fa1f8be4e3c3f32c6');
 assert.ok(r.records[1].voxels>933);
 assert.ok(r.records[3].voxels>2936);
 assert.equal(r.records[2].sourceRoutes,'HOLD_ORIGINAL_ENTRANCE_BLOCKED');
 assert.equal(r.records[3].sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.records[3].entranceRelocated,true);
 assert.equal(r.modelCalls,0);
 assert.equal(r.minecraftWrites,0);
 assert.equal(r.constructionApproved,false);
 assert.equal(r.pages.length,5);
 assert.ok(r.pages.every(x=>!x.html.includes('__B143_GALLERY_JSON__')));
});
test('save source-pinned four-view offline gallery without overwriting evidence',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r125-func-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const out=path.join(tmp,'new-folder');
 const r=saveR125FunctionalPreview(out);
 assert.equal(r.records.length,4);
 assert.ok(fs.existsSync(path.join(out,'index.html')));
 assert.ok(fs.existsSync(path.join(out,'shop-original.html')));
 assert.ok(fs.existsSync(path.join(out,'research-feature-derivative.html')));
 const saved=JSON.parse(fs.readFileSync(path.join(out,'R125_FUNCTIONAL_REVIEW.json'),'utf8'));
 assert.equal(saved.modelCalls,0);
 assert.equal(saved.pages.length,5);
 assert.throws(()=>saveR125FunctionalPreview(out),/OUTPUT_ALREADY_EXISTS/);
});
