import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR138SavedQwenBranchComparison,saveR138SavedQwenBranchComparison}
 from './r138-user-branch-comparison.mjs';
test('three saved real Qwen captures make genuine six-scene side-by-side strip vs branching 3D',()=>{
 const r=buildR138SavedQwenBranchComparison();
 assert.equal(r.records.length,3);
 assert.ok(r.records.every(x=>x.rooms.length===4));
 assert.ok(r.records.every(x=>x.equipmentCount===8));
 assert.ok(r.records.every(x=>x.sourceRouteStatus==='SOURCE_ROUTES_REACH_ALL_ZONES'));
 assert.ok(r.records.every(x=>x.geometrySHA.strip!==x.geometrySHA.branched));
 assert.equal(r.pages.filter(x=>x.file.endsWith('.html')).length,7);
 assert.equal(r.actualNewSourceGeometry,true);
 assert.equal(r.modelCallsDuringReplay,0);
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
test('gallery saved once with both genuine interactive B143 views and no world writes',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r138-qwen-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const out=path.join(root,'comparison'),r=saveR138SavedQwenBranchComparison(out);
 assert.equal(r.records.length,3);
 for(const f of r.pages)assert.ok(fs.existsSync(path.join(out,f.file)));
 assert.ok(fs.existsSync(path.join(out,'R138_SOURCE_COMPARISON_EVIDENCE.json')));
 assert.throws(()=>saveR138SavedQwenBranchComparison(out),/R138_NO_OVERWRITE/);
});
