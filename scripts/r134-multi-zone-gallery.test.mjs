import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR134MultiZoneGallery,saveR134MultiZoneGallery}
 from './r134-multi-zone-gallery.mjs';
test('genuine physically different new 3D spaces and HTML reviewers for three unknown uses',()=>{
 const r=buildR134MultiZoneGallery();
 assert.equal(r.records.length,3);
 assert.deepEqual(r.records.map(x=>x.zones.length),[4,3,3]);
 assert.equal(new Set(r.records.map(x=>x.geometrySha256)).size,3);
 assert.ok(r.records.every(x=>x.voxels>500));
 assert.ok(r.records.every(x=>x.sourceRoutes==='SOURCE_ROUTES_REACH_ALL_ZONES'));
 assert.ok(r.pages.every(x=>!x.html.includes('__B143_GALLERY_JSON__')));
 assert.equal(r.pages.length,4);
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
test('safe offline gallery save preserves exact source evidence and refuses overwrite',t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r134-gallery-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const out=path.join(base,'review'),r=saveR134MultiZoneGallery(out);
 assert.equal(r.records.length,3);
 for(const p of r.pages)assert.ok(fs.existsSync(path.join(out,p.file)));
 assert.ok(fs.existsSync(path.join(out,'R134_GALLERY_EVIDENCE.json')));
 assert.throws(()=>saveR134MultiZoneGallery(out),/R134_GALLERY_NO_OVERWRITE/);
});
