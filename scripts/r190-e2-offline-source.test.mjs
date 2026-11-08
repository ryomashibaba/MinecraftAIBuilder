import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runE2SavedSource} from './r190-e2-offline-source.mjs';
import {e2SyntheticResearchFacility} from './r190-e2-synthetic-fixture.mjs';
const sha=t=>createHash('sha256').update(t).digest('hex');

test('E2 source-only handoff writes independently inspectable REAL B143 viewer and source evidence without claiming model provenance',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-source-study-pass-'));
 try{
  const original=JSON.stringify(e2SyntheticResearchFacility(),null,2)+'\n';
  const file=path.join(root,'model-author-caller.json');
  fs.writeFileSync(file,original);
  const result=runE2SavedSource({planFile:file,outRoot:root});
  assert.equal(result.status,'SOURCE_READY_ART_HOLD');
  assert.equal(result.sourceReady,true);
  assert.equal(result.modelRequests,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.makecodeExported,false);
  assert.equal(result.provenance,'CALLER_SUPPLIED_UNVERIFIED_NOT_MODEL_PROVEN');
  assert.equal(result.authorOriginalSha256,sha(original));
  assert.equal(fs.readFileSync(path.join(result.dir,'MODEL_OR_CALLER_SOURCE_ORIGINAL.txt'),'utf8'),original);
  assert.equal(fs.readFileSync(file,'utf8'),original);
  assert(fs.existsSync(path.join(result.dir,'index.html')));
  assert(fs.existsSync(path.join(result.dir,'B143_SCENE.json')));
  const audit=JSON.parse(fs.readFileSync(path.join(result.dir,'E2_SOURCE_AUDIT.json')));
  assert.equal(audit.spaces.length,2);
  assert.equal(audit.glazing.length,1);
  const html=fs.readFileSync(path.join(result.dir,'index.html'),'utf8');
  assert.match(html,/research-prototype-e2/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('E2 invalid source remains HOLD and immutable; no misleading B143 preview or MakeCode',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-source-study-hold-'));
 try{
  const invalid=e2SyntheticResearchFacility();
  invalid.sourceDesign.elements=invalid.sourceDesign.elements.filter(e=>e.id!=='window-glass');
  const original=JSON.stringify(invalid),file=path.join(root,'bad-design.json');
  fs.writeFileSync(file,original);
  const result=runE2SavedSource({planFile:file,outRoot:root});
  assert.equal(result.sourceReady,false);
  assert.equal(result.status,'SOURCE_HOLD');
  assert.match(result.reason,/E2_GLAZING_NOT_REAL_GLASS/);
  assert.equal(result.worldWrites,0);
  assert(!fs.existsSync(path.join(result.dir,'index.html')));
  assert(!fs.existsSync(path.join(result.dir,'B143_SCENE.json')));
  assert.equal(fs.readFileSync(file,'utf8'),original);
  assert.equal(fs.readFileSync(path.join(result.dir,'MODEL_OR_CALLER_SOURCE_ORIGINAL.txt'),'utf8'),original);
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.dir,'E2_SOURCE_REPORT.json'))).sourceReady,false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
