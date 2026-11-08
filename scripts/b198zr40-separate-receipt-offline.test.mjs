/** R40 synthetic-only offline receipt tests; no Qwen or Minecraft. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {AXES,ENTRY_SCHEMA} from './b198zr37-human-quality-audit-offline.mjs';
import {writeR38Bundle,readR38Bundle,MANIFEST_FILE,SNAPSHOT_FILE}
 from './b198zr38-audit-bundle-offline.mjs';
import {saveR40Receipt,prepareR40Receipt,verifyR40Receipt,SCHEMA}
 from './b198zr40-separate-receipt-offline.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const C=sha('synthetic candidate not Qwen'),B=sha('synthetic user brief'),
 R=sha('synthetic R36 evidence'),E=sha('synthetic reference only');
const pins=()=>({candidateSha256:C,briefSha256:B,r36ReviewEvidenceSha256:R});
function entry(){
 const review={
  reviewId:'r40-mock-review',reviewerAlias:'Mock quality reviewer',
  reviewedAtUtc:'2026-10-20T09:00:00Z',r36ReviewEvidenceSha256:R,
  candidateSha256:C,briefSha256:B,
  decision:'REVISE',
  dimensions:AXES.map((axis,i)=>({
   axis,verdict:i===1?'REVISION':'MEETS',
   rationale:'Only a synthetic hand-authored test claim; there is no authenticated reviewer.',
   evidenceDigests:[E]
  })),
  summary:'Fictional design should be revised. This is a synthetic reviewer claim, not human-verified.',
  evidenceRefs:[{kind:'NOTES',digest:E,
   note:'Fictional independent notes, no actual file content attached.'}]
 };
 const core={schema:ENTRY_SCHEMA,sequence:1,previousDigest:'0'.repeat(64),review};
 return {...core,digest:sha(JSON.stringify(core))};
}
function tmp(callback){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'minecraft-r40-'));
 try{return callback(root)}finally{fs.rmSync(root,{recursive:true,force:true})}
}
function fixture(root){
 const directory=path.join(root,'r38-bundle');
 const receiptPath=path.join(root,'R40_MANIFEST_RECEIPT.json');
 const report=writeR38Bundle({directory,entries:[entry()],pins:pins()});
 return {directory,receiptPath,report};
}
const cli=fileURLToPath(new URL('./b198zr40-separate-receipt-cli.mjs',import.meta.url));

test('R40 creates a receipt outside the immutable R38 bundle',()=>{
 tmp(root=>{
  const x=fixture(root),before=fs.readdirSync(x.directory).sort();
  const receipt=saveR40Receipt({...x,expectedPins:pins()});
  assert.equal(receipt.status,'SEPARATE_RECEIPT_SAVED_NOT_AUTHENTICATED');
  assert.equal(receipt.safety.readiness,'NOT_PREPARED');
  assert.equal(receipt.receiptAuthenticated,false);
  assert.equal(receipt.manifestSha256,x.report.manifestSha256);
  assert.deepEqual(fs.readdirSync(x.directory).sort(),before);
  const r=verifyR40Receipt({...x,expectedPins:pins()});
  assert.equal(r.status,'SEPARATE_RECEIPT_MATCH_NOT_AUTHENTICATED');
  assert.equal(r.diagnosticCode,'MATCH_WITH_CALLER_SUPPLIED_SOURCE_PINS');
  assert.equal(r.externalAnchorAuthenticated,false);
  assert.equal(r.humanReviewerAuthenticated,false);
  assert.equal(r.modelCalls,0);
  assert.equal(r.worldWrites,0);
  assert(r.safety.gates.every(v=>v==='BLOCKED'));
 });
});
test('R40 without external source pins is clearly not authenticated',()=>{
 tmp(root=>{
  const x=fixture(root);saveR40Receipt(x);
  const r=verifyR40Receipt(x);
  assert.equal(r.status,'SEPARATE_RECEIPT_MATCH_NOT_AUTHENTICATED');
  assert.equal(r.diagnosticCode,'MATCH_WITHOUT_EXTERNAL_SOURCE_PINS');
  assert.equal(r.suppliedSourcePinsAuthenticityVerified,false);
  assert.equal(r.originalSourceFilesAuthenticated,false);
 });
});
test('R40 rejects a receipt inside the R38 bundle (including equal root)',()=>{
 tmp(root=>{
  const x=fixture(root);
  assert.throws(()=>saveR40Receipt({...x,
   receiptPath:path.join(x.directory,'receipt.json')}),
   /R40_RECEIPT_INSIDE_BUNDLE/);
  assert.throws(()=>saveR40Receipt({...x,receiptPath:x.directory}),
   /R40_RECEIPT_INSIDE_BUNDLE/);
  assert.deepEqual(fs.readdirSync(x.directory).sort(),
   [MANIFEST_FILE,SNAPSHOT_FILE].sort());
 });
});
test('R40 never overwrites a previous receipt or another existing file',()=>{
 tmp(root=>{
  const x=fixture(root),first=saveR40Receipt(x);
  const original=fs.readFileSync(x.receiptPath);
  assert.throws(()=>saveR40Receipt(x),/EEXIST/);
  assert.equal(fs.readFileSync(x.receiptPath).toString(),original.toString());
  assert.equal(verifyR40Receipt(x).receiptSha256,first.receiptSha256);
 });
});
test('R40 rejects previously stored receipt mutation without fixing it',()=>{
 tmp(root=>{
  const x=fixture(root);saveR40Receipt(x);
  const edited=JSON.parse(fs.readFileSync(x.receiptPath,'utf8'));
  edited.manifestSha256='a'.repeat(64);
  fs.writeFileSync(x.receiptPath,JSON.stringify(edited,null,2)+'\n');
  const r=verifyR40Receipt(x);
  assert.equal(r.status,'HOLD_SEPARATE_RECEIPT_MISMATCH');
  assert.equal(r.diagnosticCode,'R38_CONTENT_DIFFERS_FROM_RECEIPT');
  assert.equal(JSON.parse(fs.readFileSync(x.receiptPath)).manifestSha256,
   'a'.repeat(64));
 });
});
test('R40 catches a fully self-consistent R38 rewrite against the old receipt',()=>{
 tmp(root=>{
  const x=fixture(root);saveR40Receipt(x);
  const sp=path.join(x.directory,SNAPSHOT_FILE);
  const mp=path.join(x.directory,MANIFEST_FILE);
  const v=JSON.parse(fs.readFileSync(sp,'utf8'));
  v.entries[0].review.summary='Fully rewritten synthetic claim, now with valid new hashes.';
  const e=v.entries[0];
  e.digest=sha(JSON.stringify({
   schema:e.schema,sequence:e.sequence,previousDigest:e.previousDigest,review:e.review
  }));
  v.tailDigest=e.digest;
  const bytes=Buffer.from(JSON.stringify(v,null,2)+'\n');
  fs.writeFileSync(sp,bytes);
  const manifest=JSON.parse(fs.readFileSync(mp,'utf8'));
  manifest.snapshotBytes=bytes.length;
  manifest.snapshotSha256=sha(bytes);
  manifest.tailDigest=e.digest;
  fs.writeFileSync(mp,JSON.stringify(manifest,null,2)+'\n');
  // Every internal R38 hash is newly consistent; without the separate
  // original receipt, a replay would appear to pass R38 verification.
  assert.equal(readR38Bundle({directory:x.directory}).status,
   'SELF_CONSISTENT_BUNDLE_UNANCHORED');
  const verified=verifyR40Receipt(x);
  assert.equal(verified.status,'HOLD_SEPARATE_RECEIPT_MISMATCH');
  assert.equal(verified.diagnosticCode,'R38_CONTENT_DIFFERS_FROM_RECEIPT');
 });
});
test('R40 detects externally supplied source pins that differ from receipt',()=>{
 tmp(root=>{
  const x=fixture(root);saveR40Receipt(x);
  const r=verifyR40Receipt({...x,expectedPins:{
   ...pins(),briefSha256:'0'.repeat(64)
  }});
  assert.equal(r.status,'HOLD_SEPARATE_RECEIPT_VERIFICATION');
  assert.equal(r.diagnosticCode,'R38_SUPPLIED_PINS_MISMATCH');
 });
});
test('R40 refuses a corrupted R38 manifest at receipt creation time',()=>{
 tmp(root=>{
  const x=fixture(root);
  fs.appendFileSync(path.join(x.directory,MANIFEST_FILE),'garbage');
  assert.throws(()=>prepareR40Receipt(x),/R38_INVALID_JSON_/);
  assert.equal(fs.existsSync(x.receiptPath),false);
 });
});
test('R40 validates canonical receipt JSON and rejects extra privileged fields',()=>{
 tmp(root=>{
  const x=fixture(root);saveR40Receipt(x);
  const data=JSON.parse(fs.readFileSync(x.receiptPath,'utf8'));
  data.constructionApproved=true;
  fs.writeFileSync(x.receiptPath,JSON.stringify(data,null,2)+'\n');
  const v=verifyR40Receipt(x);
  assert.equal(v.status,'HOLD_SEPARATE_RECEIPT_VERIFICATION');
  assert.equal(v.diagnosticCode,'R40_RECEIPT_SCHEMA');
 });
});
test('R40 treats missing receipt as a non-mutating failure',()=>{
 tmp(root=>{
  const x=fixture(root),before=fs.readdirSync(x.directory).sort();
  const r=verifyR40Receipt(x);
  assert.equal(r.status,'HOLD_SEPARATE_RECEIPT_VERIFICATION');
  assert.equal(r.diagnosticCode,'FILESYSTEM_OR_UNRECOGNIZED_ERROR');
  assert.equal(fs.existsSync(x.receiptPath),false);
  assert.deepEqual(fs.readdirSync(x.directory).sort(),before);
 });
});
test('R40 refuses a symbolic link as the receipt itself',()=>{
 tmp(root=>{
  const x=fixture(root),real=path.join(root,'real.json');
  fs.writeFileSync(real,'{}\n');
  try{fs.symlinkSync(real,x.receiptPath,'file')}
  catch(e){assert(['EPERM','EACCES','ENOSYS'].includes(e.code));return}
  const r=verifyR40Receipt(x);
  assert.equal(r.status,'HOLD_SEPARATE_RECEIPT_VERIFICATION');
  assert.equal(r.diagnosticCode,'R40_RECEIPT_FILE_UNSAFE');
 });
});
test('R40 refuses receipt storage under a symlinked parent directory',()=>{
 tmp(root=>{
  const x=fixture(root),actual=path.join(root,'real');
  fs.mkdirSync(actual);
  const alias=path.join(root,'alias');
  try{fs.symlinkSync(actual,alias,'dir')}
  catch(e){assert(['EPERM','EACCES','ENOSYS'].includes(e.code));return}
  assert.throws(()=>saveR40Receipt({...x,
   receiptPath:path.join(alias,'r40.json')}),/R40_DIRECTORY_UNSAFE/);
 });
});
test('R40 explicit CLI save/verify roundtrip succeeds without changes',()=>{
 tmp(root=>{
  const x=fixture(root);
  const pinFile=path.join(root,'pins.json');
  fs.writeFileSync(pinFile,JSON.stringify(pins()));
  const created=JSON.parse(execFileSync(process.execPath,
   [cli,'save',x.directory,x.receiptPath,pinFile],{encoding:'utf8'}));
  assert.equal(created.status,'SEPARATE_RECEIPT_SAVED_NOT_AUTHENTICATED');
  const checked=JSON.parse(execFileSync(process.execPath,
   [cli,'verify',x.directory,x.receiptPath,pinFile],{encoding:'utf8'}));
  assert.equal(checked.status,'SEPARATE_RECEIPT_MATCH_NOT_AUTHENTICATED');
  assert.equal(checked.receiptSha256,created.receiptSha256);
 });
});
test('R40 CLI returns non-zero on missing receipt but never creates one',()=>{
 tmp(root=>{
  const x=fixture(root);
  const proc=spawnSync(process.execPath,
   [cli,'verify',x.directory,x.receiptPath],{encoding:'utf8'});
  assert.equal(proc.status,1);
  assert.equal(JSON.parse(proc.stdout).status,
   'HOLD_SEPARATE_RECEIPT_VERIFICATION');
  assert.equal(fs.existsSync(x.receiptPath),false);
 });
});
test('R40 no inference permission, no world, no quality certification',()=>{
 tmp(root=>{
  const x=fixture(root);
  const report=saveR40Receipt(x);
  const read=verifyR40Receipt(x);
  assert.equal(report.safety.readiness,'NOT_PREPARED');
  assert.equal(read.modelCalls,0);
  assert.equal(read.worldContacts,0);
  assert.equal(read.worldWrites,0);
  assert.equal(read.minecraftConstructionApproved,false);
  assert.equal(read.modelImprovementCertified,false);
  assert.equal(read.safety.BuildPlan.operations.length,0);
  assert.equal(read.safety.gates.length,9);
  assert(read.safety.gates.every(s=>s==='BLOCKED'));
  assert.equal(read.schema,SCHEMA);
 });
});
