/** R38 synthetic R37 reviewer claims only. No actual Qwen or Minecraft. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ENTRY_SCHEMA,AXES,verifyR37Ledger}
 from './b198zr37-human-quality-audit-offline.mjs';
import {SNAPSHOT_FILE,MANIFEST_FILE,buildR38Bundle,
 readR38Bundle,writeR38Bundle}
 from './b198zr38-audit-bundle-offline.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const CANDIDATE=sha('r38 fictional candidate, no model'),
 BRIEF=sha('r38 fictional user brief'),
 R36=sha('r38 fictional upstream R36 evidence'),
 ART=sha('r38 fictional screenshot digest');
const pins=()=>({candidateSha256:CANDIDATE,briefSha256:BRIEF,
 r36ReviewEvidenceSha256:R36});
function entry(reviewId='r38-synthetic-review',at='2026-10-20T09:00:00Z',
 sequence=1,previousDigest='0'.repeat(64)){
 const review={
  reviewId,reviewerAlias:'Synthetic unverified reviewer',
  reviewedAtUtc:at,r36ReviewEvidenceSha256:R36,
  candidateSha256:CANDIDATE,briefSha256:BRIEF,
  decision:'REVISE',
  dimensions:AXES.map((axis,i)=>({
   axis,verdict:i===2?'REVISION':'MEETS',
   rationale:'Synthetic claim only, to test that a reviewer field has a complete explanation.',
   evidenceDigests:[ART]
  })),
  summary:'This handcrafted synthetic review requires further revision; it is not human-authenticated.',
  evidenceRefs:[{kind:'RENDER',digest:ART,
   note:'Invented evidence checksum; there is no real screenshot present.'}]
 };
 const core={schema:ENTRY_SCHEMA,sequence,previousDigest,review};
 return {...core,digest:sha(JSON.stringify(core))};
}
function tmp(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'minecraft-r38-'));
 try{return fn(root)}finally{fs.rmSync(root,{force:true,recursive:true})}
}
const options=(root,entries=[entry()])=>({
 directory:path.join(root,'r38-new-bundle'),entries,pins:pins()
});
test('R38 exports a strictly new bundle and read-back verifies both SHA and R37 chain',()=>{
 tmp(root=>{
  const v=options(root);
  const result=writeR38Bundle(v);
  assert.equal(result.status,'BUNDLE_WRITTEN_AND_READBACK_CHECKED_NOT_AUTHENTICATED');
  assert.deepEqual(fs.readdirSync(v.directory).sort(),
   [MANIFEST_FILE,SNAPSHOT_FILE].sort());
  assert.equal(result.entries,1);
  assert.equal(result.modelCalls,0);
  assert.equal(result.worldContacts,0);
  assert.equal(result.worldWrites,0);
  const read=readR38Bundle({directory:v.directory,
   expectedManifestSha256:result.manifestSha256,expectedPins:pins()});
  assert.equal(read.status,'SUPPLIED_MANIFEST_PIN_MATCHED_NOT_AUTHENTICATED');
  assert.equal(read.tailDigest,v.entries[0].digest);
  assert.equal(read.humanArchitecturalQualityApproved,false);
  assert.equal(read.appendOnlyStorageVerified,false);
  assert.equal(read.externallyAnchored,false);
  assert.deepEqual(read.safety.BuildPlan.operations,[]);
 });
});
test('R38 no external anchor remains self-consistent, NOT authenticated',()=>{
 tmp(root=>{
  const v=options(root);writeR38Bundle(v);
  const r=readR38Bundle({directory:v.directory});
  assert.equal(r.status,'SELF_CONSISTENT_BUNDLE_UNANCHORED');
  assert.equal(r.reviewerIdentityAuthenticated,false);
  assert.equal(r.sourceQwenRawFileIncluded,false);
 });
});
test('R38 creates no overwrite, even an empty preexisting output directory',()=>{
 tmp(root=>{
  const v=options(root),a=writeR38Bundle(v);
  assert.throws(()=>writeR38Bundle(v),/R38_DESTINATION_ALREADY_EXISTS/);
  assert.equal(readR38Bundle({directory:v.directory}).manifestSha256,
   a.manifestSha256);
  const existing=path.join(root,'existing');fs.mkdirSync(existing);
  assert.throws(()=>writeR38Bundle({...v,directory:existing}),
   /R38_DESTINATION_ALREADY_EXISTS/);
  assert.deepEqual(fs.readdirSync(existing),[]);
 });
});
test('R38 corrupted snapshot bytes are rejected instead of repaired',()=>{
 tmp(root=>{
  const v=options(root);writeR38Bundle(v);
  fs.appendFileSync(path.join(v.directory,SNAPSHOT_FILE),'extra');
  assert.throws(()=>readR38Bundle({directory:v.directory}),
   /R38_INVALID_JSON_|R38_NON_CANONICAL_/);
 });
});
test('R38 corrupted manifest digest/entry count must fail closed',()=>{
 tmp(root=>{
  const v=options(root);writeR38Bundle(v);
  const p=path.join(v.directory,MANIFEST_FILE);
  const manifest=JSON.parse(fs.readFileSync(p,'utf8'));
  manifest.entries=99;
  fs.writeFileSync(p,JSON.stringify(manifest,null,2)+'\n');
  assert.throws(()=>readR38Bundle({directory:v.directory}),/R38_MANIFEST$/);
 });
});
test('R38 supplied external manifest hash mismatch is a HOLD',()=>{
 tmp(root=>{
  const v=options(root);writeR38Bundle(v);
  assert.throws(()=>readR38Bundle({
   directory:v.directory,expectedManifestSha256:'a'.repeat(64)
  }),/R38_MANIFEST_PIN_MISMATCH/);
 });
});
test('R38 supplied external candidate/brief/R36 pins mismatch is a HOLD',()=>{
 tmp(root=>{
  const v=options(root);writeR38Bundle(v);
  assert.throws(()=>readR38Bundle({
   directory:v.directory,
   expectedPins:{...pins(),candidateSha256:'0'.repeat(64)}
  }),/R38_SUPPLIED_PINS_MISMATCH/);
 });
});
test('R38 validates prior hash chain and refuses mutated reviewer record',()=>{
 const x=entry();x.review.summary='Tampered after digest, without recomputing record hash.';
 assert.equal(verifyR37Ledger([x]).valid,false);
 assert.throws(()=>buildR38Bundle({entries:[x],pins:pins()}),
  /R38_R37_LEDGER_/);
});
test('R38 refuses mixed candidate and R36 evidence even with coherent chain',()=>{
 const x=entry();x.review.candidateSha256=sha('other fictional model');
 const core={schema:x.schema,sequence:x.sequence,
  previousDigest:x.previousDigest,review:x.review};
 x.digest=sha(JSON.stringify(core));
 assert.equal(verifyR37Ledger([x]).valid,true);
 assert.throws(()=>buildR38Bundle({entries:[x],pins:pins()}),/R38_MIXED_PINS/);
});
test('R38 permits two append-like records with chronological R37 chain',()=>{
 tmp(root=>{
  const a=entry(),b=entry('r38-followup-review',
   '2026-10-20T10:00:00Z',2,a.digest);
  const v=options(root,[a,b]),out=writeR38Bundle(v);
  assert.equal(out.entries,2);
  assert.equal(out.tailDigest,b.digest);
  assert.equal(readR38Bundle({directory:v.directory}).entries,2);
 });
});
test('R38 rejects extra files and avoids opening any file specified by manifest',()=>{
 tmp(root=>{
  const v=options(root);writeR38Bundle(v);
  fs.writeFileSync(path.join(v.directory,'UNEXPECTED.txt'),'unsafe');
  assert.throws(()=>readR38Bundle({directory:v.directory}),/R38_UNEXPECTED_FILES/);
 });
});
test('R38 rejects symlinked snapshot rather than dereferencing it',()=>{
 tmp(root=>{
  const v=options(root);writeR38Bundle(v);
  const snapshot=path.join(v.directory,SNAPSHOT_FILE);
  const backed=path.join(root,'copied.json');
  fs.renameSync(snapshot,backed);
  try{fs.symlinkSync(backed,snapshot,'file')}
  catch(err){
   // Windows without symlink privilege may not support this test.
   assert(['EPERM','EACCES','ENOSYS'].includes(err.code));return;
  }
  assert.throws(()=>readR38Bundle({directory:v.directory}),
   /R38_UNSAFE_OR_OVERSIZE_/);
 });
});
test('R38 rejects incomplete bundle with missing manifest',()=>{
 tmp(root=>{
  const directory=path.join(root,'incomplete');fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory,SNAPSHOT_FILE),'{}\n');
  assert.throws(()=>readR38Bundle({directory}),/R38_UNEXPECTED_FILES/);
 });
});
test('R38 rejects empty review history, no phantom review is generated',()=>{
 assert.throws(()=>buildR38Bundle({entries:[],pins:pins()}),/R38_ENTRY_COUNT/);
});
test('R38 never enables inference, Minecraft or construction',()=>{
 const b=buildR38Bundle({entries:[entry()],pins:pins()});
 assert.equal(b.safety.readiness,'NOT_PREPARED');
 assert(b.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(b.safety.BuildPlan.operations,[]);
 assert.equal(b.safety.worldContacts,0);
 assert.equal(b.safety.worldWrites,0);
 assert.equal(b.safety.constructionApproved,false);
});

test('R38 explicit CLI pack/verify roundtrip requires user-supplied files and pins',()=>{
 tmp(root=>{
  const entryFile=path.join(root,'entries.json'),pinFile=path.join(root,'pins.json');
  const outputDir=path.join(root,'cli-output');
  fs.writeFileSync(entryFile,JSON.stringify([entry()]));
  fs.writeFileSync(pinFile,JSON.stringify(pins()));
  const cli=fileURLToPath(new URL('./b198zr38-audit-bundle-cli.mjs',
   import.meta.url));
  const packed=JSON.parse(execFileSync(process.execPath,[
   cli,'pack',entryFile,pinFile,outputDir
  ],{encoding:'utf8'}));
  assert.equal(packed.status,'BUNDLE_WRITTEN_AND_READBACK_CHECKED_NOT_AUTHENTICATED');
  const unpacked=JSON.parse(execFileSync(process.execPath,[
   cli,'verify',outputDir,packed.manifestSha256,pinFile
  ],{encoding:'utf8'}));
  assert.equal(unpacked.status,'SUPPLIED_MANIFEST_PIN_MATCHED_NOT_AUTHENTICATED');
  assert.equal(unpacked.entries,1);
 });
});
