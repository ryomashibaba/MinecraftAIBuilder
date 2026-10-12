import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {auditWindowsB2} from '../runner/step8b-windows-b2.mjs';
const currentDir=path.dirname(fileURLToPath(import.meta.url));
const src=process.env.STEP8B_SOURCE_DIR??path.join(currentDir,'../../windows');
const sourceTest=fs.existsSync(path.join(src,'WINDOWS_SNAPSHOT_MANIFEST.json'))?test:test.skip;
const sample=n=>JSON.parse(fs.readFileSync(path.join(currentDir,`../samples/${n}/review.json`),'utf8'));
const digest=x=>createHash('sha256').update(x).digest('hex');
const rehash=o=>{delete o.reviewSha256;o.reviewSha256=digest(JSON.stringify(o));return o;};
// Any violation stays offline, NEVER invoke/import original engine to test.
sourceTest('Windows snapshot 249 records, 0 omitted, immutable review on office',()=>{
 const r=sample('office');const before=JSON.stringify(r);const result=auditWindowsB2(src,r);
 assert.equal(JSON.stringify(r),before);
 assert.equal(result.audit.filesVerified,249);
 assert.equal(result.status,'STATIC_SOURCE_REVIEW_COMPLETE_ADAPTER_NEEDED');
 assert.equal(result.compatibility,'ADAPTER_NEEDED');
 assert.equal(result.audit.packageVersionObserved,'0.1.0');
 assert.equal(result.sourceAlignment,'SNAPSHOT_CONTENT_VERIFIED_BUT_ACTIVE_RUNTIME_NOT_PROVEN');
 assert.equal(result.BuildPlan.commandCount,0);assert.deepEqual(result.BuildPlan.operations,[]);
 assert.equal(result.safety.executionAllowed,false);
});
sourceTest('three office shapes detect only asymmetric style geometry difference',()=>{
 const r=auditWindowsB2(src,sample('office'));
 assert.equal(r.candidates.length,3);
 assert.deepEqual(r.candidates.map(x=>x.sourcePredictedLocalGeometry),[
  'LOCAL_RECTANGLES_MATCH_SOURCE_PINNED_PREDICTION',
  'LOCAL_RECTANGLES_DIFFER_FROM_SOURCE_PINNED_PREDICTION',
  'LOCAL_RECTANGLES_MATCH_SOURCE_PINNED_PREDICTION']);
 assert.ok(r.candidates[1].issues.includes('GEOMETRY_ADAPTER_NEEDED'));
 assert.ok(r.candidates.every(x=>x.issues.includes('ORIENTATION_ROTATION_REQUIRED')));
});
sourceTest('hotel keeps concept source predicted geometry but not verified Minecraft coordinates',()=>{
 const r=auditWindowsB2(src,sample('hotel'));const x=r.candidates[0];
 assert.equal(x.sourcePredictedLocalGeometry,'LOCAL_RECTANGLES_MATCH_SOURCE_PINNED_PREDICTION');
 assert.ok(!x.issues.includes('ORIENTATION_ROTATION_REQUIRED'));
 assert.ok(x.issues.includes('WORLD_ANCHOR_UNVERIFIED'));
 assert.ok(x.issues.includes('EDUCATION_BLOCK_STATES_UNVERIFIED'));
});
sourceTest('apartment retains south rotation and no operation generation',()=>{
 const r=auditWindowsB2(src,sample('apartment'));const x=r.candidates[0];
 assert.ok(x.issues.includes('ORIENTATION_ROTATION_REQUIRED'));
 assert.equal(x.BuildPlan.status,'NOT_PREPARED');assert.equal(x.BuildPlan.operations.length,0);
});
sourceTest('forged approval with recomputed review hash is refused',()=>{
 const r=sample('hotel');r.safety.constructionApproved=true;
 assert.throws(()=>auditWindowsB2(src,rehash(r)),e=>e.code==='UNSAFE_SAFETY_STATE');
});
sourceTest('concept coordinate mismatch is rejected',()=>{
 const r=sample('hotel');r.candidates[0].detail.coordinateSystem.zSouth=false;
 assert.throws(()=>auditWindowsB2(src,rehash(r)),e=>e.code==='COORDINATE_CONTRACT_MISMATCH');
});
sourceTest('forged parameter is quarantined rather than tagged as aligned',()=>{
 const r=sample('hotel');r.candidates[0].concept.EngineCompatibility.parameters.seed=6;
 const c=r.candidates[0].concept;delete c.designSha256;c.designSha256=digest(JSON.stringify(c));
 const rr=auditWindowsB2(src,rehash(r));assert.ok(rr.candidates[0].issues.includes('PARAMETER_MAPPING_NEEDED'));
});
sourceTest('critical engine source tampering is blocked, no execution',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'step8b-drift-'));
 try{
  // Point to a temporary validated surrogate constructed with hardlinks except the critical source.
  const manifest=JSON.parse(fs.readFileSync(path.join(src,'WINDOWS_SNAPSHOT_MANIFEST.json'),'utf8').replace(/^\uFEFF/,''));
  for(const row of manifest.files){const dest=path.join(tmp,row.path),origin=path.join(src,row.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(origin,dest);}
  const critical='engine/src/general-building-planner.js';fs.appendFileSync(path.join(tmp,critical),'\n// altered');
  const row=manifest.files.find(x=>x.path===critical),buf=fs.readFileSync(path.join(tmp,critical));row.sha256=digest(buf);row.bytes=buf.length;
  manifest.includedBytes=manifest.files.reduce((sum,x)=>sum+x.bytes,0);
  fs.writeFileSync(path.join(tmp,'WINDOWS_SNAPSHOT_MANIFEST.json'),JSON.stringify(manifest));
  const result=auditWindowsB2(tmp,sample('hotel'));
  assert.equal(result.compatibility,'UNKNOWN');assert.ok(result.findings.some(x=>x.code==='ENGINE_SOURCE_DRIFT'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('tampered manifest/hash is rejected before any static comparison',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'step8b-bad-'));
 try{fs.writeFileSync(path.join(tmp,'WINDOWS_SNAPSHOT_MANIFEST.json'),'{}');
 assert.throws(()=>auditWindowsB2(tmp,sample('hotel')),e=>e.code==='INVALID_SOURCE_MANIFEST');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
sourceTest('BOM-aware Windows 5.1 manifest parses correctly',()=>{
 const source=fs.readFileSync(path.join(src,'WINDOWS_SNAPSHOT_MANIFEST.json'));
 assert.deepEqual([...source.slice(0,3)],[239,187,191]);
 assert.equal(auditWindowsB2(src,sample('hotel')).audit.filesVerified,249);
});
