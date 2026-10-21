import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {attachR52FailedSourceStoryboard}
 from './b198zr52-postcapture-auto-storyboard.mjs';

const digest=s=>createHash('sha256').update(s).digest('hex');
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r52-prezip-'));
const make=(root,{bad=true,rawInvalid=false,wrongSha=false,audit=false}={})=>{
 const dir=path.join(root,'R48_synthetic-receipt-folder');
 fs.mkdirSync(dir);
 let raw;
 if(rawInvalid)raw='{"design":';
 else {
  const p=r32Courtyard();
  if(bad)p.design.elements.push({id:'roofOutOfBounds',
   mode:'add',shape:'box',material:'glow',
   origin:[0,p.design.bounds.height,0],size:[4,1,4]});
  raw=JSON.stringify(p);
 }
 const rawSha=digest(raw);
 fs.writeFileSync(path.join(dir,'R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),raw);
 const chain=wrongSha?'0'.repeat(64):rawSha;
 fs.writeFileSync(path.join(dir,'R48_CAPTURE_RESULT.json'),
  JSON.stringify({originalSaved:true,originalRawSha256:chain}));
 fs.writeFileSync(path.join(dir,'R48_FINAL_EVIDENCE_MANIFEST.json'),
  JSON.stringify({originalRawCaptured:true,rawSha256:chain}));
 if(audit)fs.writeFileSync(path.join(dir,'R48_WINDOWS_ORIGINAL_SHA_AUDIT.json'),
  JSON.stringify({originalRawSha256:chain,
   status:'SAVED_RAW_SHA_CHAIN_MATCHED_MODEL_QUALITY_UNVERIFIED'}));
 return {dir,raw,sha:rawSha};
};
test('R52 auto-attaches evidence after FAILED B143, preserves raw and all past audit bytes',()=>{
 const root=temporary();
 try{
  const fixture=make(root,{audit:true}),before=fs.readdirSync(fixture.dir)
   .map(n=>[n,fs.readFileSync(path.join(fixture.dir,n),'utf8')]);
  const r=attachR52FailedSourceStoryboard({evidenceDir:fixture.dir});
  assert.equal(r.status,'ADDED_UNCOMPILED_SOURCE_DIAGNOSTIC_BEFORE_ZIP');
  assert.equal(r.archiveFilesAdded,4);
  assert.equal(r.originalRawSha256,fixture.sha);
  assert.equal(r.b143Reason,'B143_OUTSIDE_LOCAL_BOUNDS');
  assert.equal(r.modelCalls,0);
  assert.equal(r.worldWrites,0);
  assert.equal(r.receipt.futureRunnerMustArchiveFolderAfterThisHook,true);
  assert.equal(r.receipt.humanAestheticQualityCertified,false);
  assert(r.safety.gates.every(x=>x==='BLOCKED'));
  assert.deepEqual(r.safety.BuildPlan.operations,[]);
  for(const [name,data] of before)
   assert.equal(fs.readFileSync(path.join(fixture.dir,name),'utf8'),data);
  for(const relative of r.receipt.derivedFiles){
   assert(fs.existsSync(path.join(fixture.dir,relative)),relative);
  }
  const manifest=JSON.parse(fs.readFileSync(
   path.join(fixture.dir,'R52_FAILED_SOURCE_DIAGNOSTIC',
    'R51_SCHEMATIC_PROVENANCE.json'),'utf8'));
  assert.equal(manifest.originalRawSha256,fixture.sha);
  assert.equal(manifest.B143FinalVoxelEvidenceProvided,false);
  assert.equal(manifest.failedElementEnvelopesCount,1);
  const preview=fs.readFileSync(path.join(fixture.dir,
   'R52_FAILED_SOURCE_DIAGNOSTIC','R51_UNCOMPILED_SPATIAL_STORYBOARD.html'),'utf8');
  assert(preview.includes('roofOutOfBounds'));
  assert.throws(()=>attachR52FailedSourceStoryboard({evidenceDir:fixture.dir}),
   /NEVER_OVERWRITE_EXISTING_R52_DERIVATIVE/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R52 schema-pass source does NOT produce misleading envelope view instead of official R7',()=>{
 const root=temporary();
 try{
  const fixture=make(root,{bad:false});
  const r=attachR52FailedSourceStoryboard({evidenceDir:fixture.dir});
  assert.equal(r.status,'SKIP_STRICT_B143_COMPILED_USE_R7_FULL_VOXEL_VIEWER');
  assert.equal(r.archiveFilesAdded,0);
  assert.deepEqual(fs.readdirSync(fixture.dir).sort(),[
   'R48_CAPTURE_RESULT.json','R48_FINAL_EVIDENCE_MANIFEST.json',
   'R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt']);
  assert.equal(fs.readFileSync(path.join(fixture.dir,
   'R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),fixture.raw);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R52 mismatch of a frozen SHA rejects with NO derived file writes',()=>{
 const root=temporary();
 try{
  const fixture=make(root,{wrongSha:true,audit:true});
  assert.throws(()=>attachR52FailedSourceStoryboard({evidenceDir:fixture.dir}),
   /ORIGINAL_SHA_CHAIN_MISMATCH_OR_NOT_CAPTURED/);
  assert.equal(fs.readdirSync(fixture.dir).length,4);
  assert.equal(fs.readFileSync(path.join(fixture.dir,
   'R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),fixture.raw);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R52 Windows audit mismatch rejects before new attachments',()=>{
 const root=temporary();
 try{
  const fixture=make(root,{audit:true});
  fs.writeFileSync(path.join(fixture.dir,'R48_WINDOWS_ORIGINAL_SHA_AUDIT.json'),
   JSON.stringify({originalRawSha256:'bad'}));
  assert.throws(()=>attachR52FailedSourceStoryboard({evidenceDir:fixture.dir}),
   /WINDOWS_ORIGINAL_AUDIT_SHA_MISMATCH/);
  assert.equal(fs.readdirSync(fixture.dir).length,4);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R52 unreadable, empty or ambiguous originals fail closed; no Qwen fallback',()=>{
 const root=temporary();
 try{
  const fixture=make(root);
  fs.writeFileSync(path.join(fixture.dir,'R46_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'another');
  assert.throws(()=>attachR52FailedSourceStoryboard({evidenceDir:fixture.dir}),
   /EXACTLY_ONE_IMMUTABLE_RAW_REQUIRED/);
  assert.equal(fs.readdirSync(fixture.dir).length,4);
  assert.throws(()=>attachR52FailedSourceStoryboard({evidenceDir:'relative-dir'}),
   /ABSOLUTE_EVIDENCE_DIRECTORY_REQUIRED/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R52 receives malformed model output only if original chain is valid; refuses repairs',()=>{
 const root=temporary();
 try{
  const fixture=make(root,{rawInvalid:true});
  const r=attachR52FailedSourceStoryboard({evidenceDir:fixture.dir});
  assert.equal(r.status,'ADDED_UNCOMPILED_SOURCE_DIAGNOSTIC_BEFORE_ZIP');
  assert.equal(r.b143Reason,'INVALID_JSON_OR_B143_SOURCE');
  const html=fs.readFileSync(path.join(fixture.dir,'R52_FAILED_SOURCE_DIAGNOSTIC',
   'R51_UNCOMPILED_SPATIAL_STORYBOARD.html'),'utf8');
  assert(html.includes('HOLD_MALFORMED_JSON'));
  assert.equal(fs.readFileSync(path.join(fixture.dir,
   'R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),fixture.raw);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R52 CLI requires existing audited capture and appends zero-model view before ZIP',()=>{
 const root=temporary();
 try{
  const fixture=make(root),rawPath=path.join(fixture.dir,
   'R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
  const r=spawnSync(process.execPath,[
   'scripts/b198zr52-postcapture-auto-storyboard.mjs',
   '--evidence-dir',fixture.dir
  ],{encoding:'utf8',timeout:15000});
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/R52_PRE_ZIP_DIAGNOSTIC/);
  assert.match(r.stdout,/archiveFilesAdded/);
  assert.equal(fs.readFileSync(rawPath,'utf8'),fixture.raw);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R52 Windows current Compress-Archive includes four auto-generated files',()=>{
 if(process.platform!=='win32')return;
 const root=temporary();
 try{
  const fixture=make(root,{audit:true});
  attachR52FailedSourceStoryboard({evidenceDir:fixture.dir});
  const zip=path.join(root,'future-one-click-result.zip');
  const extracted=path.join(root,'unpacked');
  const script=[
   'Compress-Archive -LiteralPath $env:R52_TEST_SOURCE',
   '-DestinationPath $env:R52_TEST_ZIP -CompressionLevel Optimal -ErrorAction Stop;',
   'Expand-Archive -LiteralPath $env:R52_TEST_ZIP',
   '-DestinationPath $env:R52_TEST_EXTRACT -ErrorAction Stop'
  ].join(' ');
  const r=spawnSync('powershell.exe',['-NoProfile','-Command',script],{
   env:{...process.env,R52_TEST_SOURCE:fixture.dir,
    R52_TEST_ZIP:zip,R52_TEST_EXTRACT:extracted},
   encoding:'utf8',timeout:120000
  });
  assert.equal(r.status,0,r.stderr);
  const unpacked=path.join(extracted,path.basename(fixture.dir));
  assert(fs.existsSync(path.join(unpacked,
   'R52_OPEN_FAILED_SOURCE_DIAGRAM.html')));
  assert(fs.existsSync(path.join(unpacked,'R52_FAILED_SOURCE_DIAGNOSTIC',
   'R51_UNCOMPILED_SPATIAL_STORYBOARD.html')));
  assert.equal(fs.readFileSync(path.join(unpacked,
   'R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),fixture.raw);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
