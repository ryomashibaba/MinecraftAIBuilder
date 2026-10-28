import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectR44PinnedPaths} from './r44-pinned-path-audit.mjs';
test('R44 historical blob hashes prove 32 plus 7 plus 10 with one R44 replacement equals 46',()=>{
 const x=inspectR44PinnedPaths();
 assert.equal(x.r16Count,32);assert.equal(x.r24Count,37);
 assert.equal(x.r44OverlayCount,10);assert.equal(x.r44RequiredCount,46);
 assert.deepEqual(x.replacedByR44,['source/ai/b198s-native-ollama-source.mjs']);
 assert.equal(x.rootCauseOfWindows47,'NOT_PROVEN');
 assert.equal(x.modelCalls,0);assert.equal(x.worldWrites,0);
});
test('diagnostic detects missing and extra paths but never rewrites them',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r44-path-check-'));
 try{
  fs.writeFileSync(path.join(dir,'intruder.txt'),'fake');
  const before=fs.readFileSync(path.join(dir,'intruder.txt'));
  const x=inspectR44PinnedPaths({installedBaseDir:dir});
  assert.equal(x.status,'HOLD_R24_PATH_MISMATCH');
  assert.equal(x.missing.length,37);
  assert.deepEqual(x.unexpected,['intruder.txt']);
  assert.deepEqual(fs.readFileSync(path.join(dir,'intruder.txt')),before);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('tampered snapshot must fail before any inference or installation',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r44-snapshot-'));
 try{
  for(const n of ['tools/r16-mini/INSTALL_R16_MINI.ps1',
   'tools/r24-future/INSTALL_R24_OFFLINE_ONLY.ps1',
   'tools/r44-approved/INSTALL_R44_SOURCE_ONLY.ps1']){
   fs.mkdirSync(path.join(dir,path.dirname(n)),{recursive:true});
   fs.writeFileSync(path.join(dir,n),'tampered');
  }
  assert.throws(()=>inspectR44PinnedPaths({sourceRoot:dir}),/HISTORICAL_BLOB_MISMATCH/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
