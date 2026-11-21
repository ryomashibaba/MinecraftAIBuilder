import test from 'node:test';
import assert from 'node:assert/strict';
import {readR137SavedRealQwenCapture,buildR137UserCaptureReplay}
 from './r137-user-capture-replay.mjs';
test('preserve three byte-for-byte original uploaded real Qwen14B raw answers',()=>{
 const s=readR137SavedRealQwenCapture();
 assert.equal(s.cases.length,3);
 assert.equal(JSON.parse(s.cases[0].raw).materials.roof,'sawtooth');
 assert.equal(JSON.parse(s.cases[0].raw).layout.spaces.length,4);
 assert.equal(JSON.parse(s.cases[1].raw).footprint.depth,20);
 assert.equal(JSON.parse(s.cases[2].raw).footprint.depth,20);
});
test('three saved real model programs generate original-preserving host-derived true 3D with bounded corrections',()=>{
 const r=buildR137UserCaptureReplay();
 assert.equal(r.records.length,3);
 assert.ok(r.records.every(x=>x.sourceRoutes==='SOURCE_ROUTES_REACH_ALL_ZONES'));
 assert.deepEqual(r.records.map(x=>x.equipmentCount),[8,8,8]);
 assert.ok(r.records.every(x=>x.assembledSourceVoxelCount>1500));
 assert.ok(r.records.every(x=>x.derivedFootprint.depth<=32));
 assert.ok(r.records.every(x=>x.hostRepairActions.length>=1));
 assert.ok(r.records.every(x=>x.assembledSourceVoxelCount>x.equipmentAddedVoxels));
 assert.equal(r.pages.filter(x=>x.file.endsWith('.html')).length,7);
 assert.equal(r.modelCallsDuringReplay,0);
 assert.equal(r.actualModelCallsInOriginalUserRun,3);
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
