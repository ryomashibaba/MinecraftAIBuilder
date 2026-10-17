import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {buildB171ImportUi} from './b171-build-import-ui.mjs';

test('offline 18-checkpoint import interface embeds source SHA and compiles standalone JavaScript',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b171-import-'));
 try{
  const r=buildB171ImportUi(dir);
  assert.equal(r.checkpointCount,18);
  assert.equal(r.worldWrites,0);
  assert.equal(r.authenticatedGameReadbacks,0);
  const html=fs.readFileSync(r.file,'utf8');
  assert(html.includes('north-tread-1'));
  assert(html.includes('south-upper-mezzanine'));
  assert(html.includes('B171_READBACK_ARCHIVE.json'));
  assert(html.includes('minecraftaibuilder-b171-readback-receipts-v1'));
  assert(!html.includes('fetch('));
  assert(!html.includes('new WebSocket('));
  assert(!html.includes('localStorage.'));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js,'Standalone script expected');
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.throws(()=>buildB171ImportUi(dir),/B171_UI_REFUSE_TO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
