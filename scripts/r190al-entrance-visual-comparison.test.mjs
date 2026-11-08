/** Fail-closed visual evidence path and original output protection. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeR190ALEntranceGallery} from './r190al-entrance-visual-comparison.mjs';

test('R190-AL actual-B143 4-face views, 5 elevations each and SHA receipts',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190al-entry-'));
 const out=path.join(root,'unapproved');
 try{
  const result=writeR190ALEntranceGallery(out);
  assert.equal(result.count,4);
  assert.deepEqual(result.faces,['south','north','west','east']);
  const s=JSON.parse(fs.readFileSync(path.join(out,'SUMMARY.json'),'utf8'));
  assert.equal(s.modelCalls,0);assert.equal(s.worldContacts,0);
  assert.equal(s.worldWrites,0);assert.equal(s.art,'ART_HOLD');
  assert.equal(s.officialArtAdoptions,0);
  assert.deepEqual(s.gates,Array(9).fill('BLOCKED'));
  assert.equal(s.models.length,4);
  assert.equal(new Set(s.models.map(x=>x.realB143GeometrySha256)).size,4);
  for(const x of s.models){
   assert.equal(x.fullyReachableFromSelectedEntrance,true);
   assert.equal(x.entranceActualTwoWide,true);
   assert(x.trueB143VoxelCount>1000);
   assert(fs.readFileSync(path.join(out,x.face+'-REAL-B143.html'),'utf8').includes('R190-AL SYNTHETIC'));
   for(const side of ['front','rear','west','east','roof'])
    assert(fs.readFileSync(path.join(out,x.face+'-'+side+'.svg'),'utf8').includes('<svg'));
  }
  assert.throws(()=>writeR190ALEntranceGallery(out),/NEW_ABSOLUTE_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
