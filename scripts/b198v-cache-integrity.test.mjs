import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {sealOfflineEngine,verifyOfflineEngine,SCHEMA}
 from './b198v-cache-integrity.mjs';

const fixture=()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b198v-cache-test-'));
 const engine=path.join(dir,'engine');
 fs.mkdirSync(engine);
 const names=[
  'tools/B198M_RUN_LOCAL.ps1',
  'scripts/b198u-offline-replay.mjs',
  'scripts/b198v-cache-integrity.mjs',
  'source/ai/b143-building-dsl.mjs',
  'source/ai/b143-viewer-template.html',
  'scripts/b198s-single-source-probe.mjs',
  ...Array.from({length:20},(_,i)=>'docs/synthetic-'+i+'.txt')
 ];
 for(const name of names){
  const file=path.join(engine,name);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,'OFFLINE TEST FIXTURE FILE: '+name+'\n');
 }
 return {dir,engine,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
};
test('exact cache SHA256 seal makes repeated offline validation deterministic with zero model calls',()=>{
 const f=fixture();
 try{
  const sealed=sealOfflineEngine(f.engine);
  assert.equal(sealed.fileCount,26);
  assert.match(sealed.treeSha256,/^[a-f0-9]{64}$/);
  assert.equal(fs.existsSync(sealed.sealFile),true);
  const metadata=JSON.parse(fs.readFileSync(sealed.sealFile,'utf8'));
  assert.equal(metadata.schema,SCHEMA);
  assert.equal(metadata.files.length,26);
  const checked=verifyOfflineEngine(f.engine);
  assert.equal(checked.treeSha256,sealed.treeSha256);
  assert.equal(checked.status,'B198V_OFFLINE_CACHE_VERIFIED');
  assert.equal(checked.LLMRequests,0);
  assert.equal(checked.networkAccesses,0);
  assert.equal(checked.worldWrites,0);
  assert.throws(()=>sealOfflineEngine(f.engine),/B198V_CACHE_REFUSE_OVERWRITE_SEAL/);
 }finally{f.cleanup()}
});
test('any cached code mutation is a HARD HOLD, never silently run stale replay engine',()=>{
 const f=fixture();
 try{
  sealOfflineEngine(f.engine);
  const target=path.join(f.engine,'scripts/b198u-offline-replay.mjs');
  const original=fs.readFileSync(target,'utf8');
  fs.appendFileSync(target,'// unauthorized edit\n');
  assert.throws(()=>verifyOfflineEngine(f.engine),/B198V_CACHE_FILE_HASH_OR_INVENTORY_CHANGED/);
  fs.writeFileSync(target,original);
  assert.equal(verifyOfflineEngine(f.engine).status,'B198V_OFFLINE_CACHE_VERIFIED');
  const unexpected=path.join(f.engine,'scripts/model-writer.mjs');
  fs.writeFileSync(unexpected,'modelDownload();');
  assert.throws(()=>verifyOfflineEngine(f.engine),/B198V_CACHE_FILE_HASH_OR_INVENTORY_CHANGED/);
  fs.unlinkSync(unexpected);
  assert.equal(verifyOfflineEngine(f.engine).status,'B198V_OFFLINE_CACHE_VERIFIED');
 }finally{f.cleanup()}
});
test('deleting original required files prevents sealing, refuses partial model source kits',()=>{
 const f=fixture();
 try{
  fs.unlinkSync(path.join(f.engine,'source/ai/b143-viewer-template.html'));
  assert.throws(()=>sealOfflineEngine(f.engine),/B198V_CACHE_REQUIRED_SOURCE_MISSING/);
  assert(!fs.existsSync(path.join(f.dir,'B198V_OFFLINE_ENGINE_SEAL.json')));
 }finally{f.cleanup()}
});
test('symlinked code injection is refused by the offline integrity verifier',()=>{
 if(process.platform==='win32')return;
 const f=fixture();
 try{
  const source=path.join(f.engine,'scripts/b198u-offline-replay.mjs');
  const link=path.join(f.engine,'scripts/b198v-shortcut.mjs');
  fs.symlinkSync(source,link);
  assert.throws(()=>sealOfflineEngine(f.engine),/B198V_CACHE_SYMLINK_REFUSED/);
 }finally{f.cleanup()}
});
