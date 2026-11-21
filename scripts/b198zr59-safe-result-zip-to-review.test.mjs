import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {inspectR59Archive,reviewR59AlreadySavedZip}
 from './b198zr59-safe-result-zip-to-review.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r59-zip-review-'));
const crcTable=Array.from({length:256},(_,i)=>{
 let n=i;for(let j=0;j<8;j++)n=n&1?0xedb88320^(n>>>1):n>>>1;
 return n>>>0;
});
function crc32(bytes){
 let c=0xffffffff;
 for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);
 return (c^0xffffffff)>>>0;
}
const u16=(b,o,v)=>b.writeUInt16LE(v,o);
const u32=(b,o,v)=>b.writeUInt32LE(v>>>0,o);
function zip(items,{deflate=false}={}){
 const local=[],central=[];
 let offset=0,cdLen=0;
 for(const [name,content] of items){
  const b=Buffer.from(content),p=Buffer.from(name,'utf8');
  const c=deflate?deflateRawSync(b):b,method=deflate?8:0;
  const h=Buffer.alloc(30),dir=Buffer.alloc(46);
  u32(h,0,0x04034b50);u16(h,4,20);u16(h,8,method);
  u32(h,14,crc32(b));u32(h,18,c.length);u32(h,22,b.length);
  u16(h,26,p.length);
  local.push(h,p,c);
  u32(dir,0,0x02014b50);u16(dir,4,20);u16(dir,6,20);
  u16(dir,10,method);u32(dir,16,crc32(b));
  u32(dir,20,c.length);u32(dir,24,b.length);
  u16(dir,28,p.length);u32(dir,42,offset);
  central.push(dir,p);cdLen+=dir.length+p.length;
  offset+=h.length+p.length+c.length;
 }
 const end=Buffer.alloc(22);
 u32(end,0,0x06054b50);u16(end,8,items.length);u16(end,10,items.length);
 u32(end,12,cdLen);u32(end,16,offset);
 return Buffer.concat([...local,...central,end]);
}
function evidence(tag='R54'){
 const d=r32Courtyard();
 d.design.elements.push({id:'R59-out-of-bounds',
  mode:'add',shape:'box',material:'metal',
  origin:[0,d.design.bounds.height,0],size:[2,1,2]});
 const raw=JSON.stringify(d),sourceSha=sha(raw);
 const c01=CREATION_CASES.find(x=>x.id==='c01');
 const root=tag+'_780917eb-b6cd-4b6c-ab61-69f923d4b672';
 const files={
  [tag+'_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt']:raw,
  [tag+'_CAPTURE_RESULT.json']:JSON.stringify({
   originalSaved:true,originalRawSha256:sourceSha}),
  [tag+'_FINAL_EVIDENCE_MANIFEST.json']:JSON.stringify({
   originalRawCaptured:true,rawSha256:sourceSha,oneTimeLock:'CONSUMED',
   c01PromptSha256:sha(c01.prompt),model:'qwen3.8:27b',
   r47NativeSchemaSha256:'5'.repeat(64),
   r50ArchitectureGuideSha256:'6'.repeat(64)
  }),
  [tag+'_FROZEN_REQUEST.json']:JSON.stringify({
   caseId:'c01',originalPrompt:c01.prompt,originalPromptSha256:sha(c01.prompt),
   guideSha256:'6'.repeat(64)}),
  [tag+'_WINDOWS_ORIGINAL_SHA_AUDIT.json']:JSON.stringify({
   originalRawSha256:sourceSha,
   status:'SAVED_RAW_SHA_CHAIN_MATCHED_MODEL_QUALITY_UNVERIFIED'
  })
 };
 return {raw,sha:sourceSha,root,
  entries:Object.entries(files).map(([name,c])=>[root+'/'+name,c])};
}
test('R59 one ZIP, no manual extraction, frozen c01 human review held',()=>{
 const dir=tmp();
 try{
  const source=evidence();
  const file=path.join(dir,'r54.zip');
  const bytes=zip([...source.entries,
   [source.root+'/R52_FAILED_SOURCE_DIAGNOSTIC/R51_UNCOMPILED_SPATIAL_STORYBOARD.html',
    '<h1>Not final voxels</h1>']],{deflate:true});
  fs.writeFileSync(file,bytes);
  const scanned=inspectR59Archive(file,{tag:'R54'});
  assert.equal(scanned.archiveSHA256,sha(bytes));
  assert.equal(scanned.selectedFiles.length,5);
  const result=reviewR59AlreadySavedZip({
   r54Zip:file,destination:path.join(dir,'review')});
  assert.equal(result.status,'R54_EVIDENCE_ONLY_R48_RAW_REQUIRED');
  assert.equal(result.files,3);
  assert.equal(result.modelCalls,0);
  const report=JSON.parse(fs.readFileSync(path.join(dir,'review',
   'R58_C01_FAIR_REVIEW_REPORT.json'),'utf8'));
  assert.equal(report.candidate.rawSha256,source.sha);
  assert.equal(report.candidate.b143.status,'HOLD_B143_NOT_COMPILED');
  assert.equal(report.candidate.humanQualityAssessed,false);
  assert.equal(report.frozenIndependentHumanCriteria.length,4);
  const receipt=JSON.parse(fs.readFileSync(path.join(dir,'review',
   'R59_ZIP_REVIEW_RECEIPT.json'),'utf8'));
  assert.equal(receipt.r54ZipSHA256,sha(bytes));
  assert.equal(receipt.r48ZipSHA256,null);
  assert(receipt.gates.every(x=>x==='BLOCKED'));
  assert.deepEqual(fs.readFileSync(file),bytes);
  assert.throws(()=>reviewR59AlreadySavedZip({
   r54Zip:file,destination:path.join(dir,'review')}),
   /NEW_ABSOLUTE_OUTPUT_DIRECTORY_REQUIRED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('R59 cannot silently substitute another synthetic R48 historical original',()=>{
 const dir=tmp();
 try{
  const a=evidence('R48'),b=evidence('R54');
  const p=path.join(dir,'old.zip'),q=path.join(dir,'new.zip');
  fs.writeFileSync(p,zip(a.entries));
  fs.writeFileSync(q,zip(b.entries,{deflate:true}));
  const output=path.join(dir,'results');
  assert.throws(()=>reviewR59AlreadySavedZip({
   r48Zip:p,r54Zip:q,destination:output}),
   /R48_REPORTED_HISTORICAL_ORIGINAL_SHA_MISMATCH/);
  assert.equal(fs.existsSync(output),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('R59 rejects all ZIP traversal, duplicate path, archive corruption, and unsupported encryption',()=>{
 const dir=tmp();
 try{
  const a=evidence();
  for(const [type,entries] of [
   ['traversal',[...a.entries,['../escape.txt','unsafe']]],
   ['duplicate',[...a.entries,a.entries[0]]],
   ['backslash',[...a.entries,['dir\\danger.txt','unsafe']]],
   ['absolute',[...a.entries,['C:/unsafe.txt','unsafe']]]
  ]){
   const p=path.join(dir,type+'.zip');fs.writeFileSync(p,zip(entries));
   assert.throws(()=>inspectR59Archive(p,{tag:'R54'}),
    /B198ZR59_(UNSAFE_ZIP_MEMBER_PATH|ZIP_DUPLICATE_MEMBER)/,type);
  }
  const p=path.join(dir,'corrupt.zip');
  const z=zip(a.entries);
  z[35]^=0x1;fs.writeFileSync(p,z);
  assert.throws(()=>inspectR59Archive(p,{tag:'R54'}),/B198ZR59_/);
  const encrypted=zip(a.entries);encrypted.writeUInt16LE(1,encrypted.readUInt32LE(encrypted.length-6)+8);
  const e=path.join(dir,'encrypted.zip');fs.writeFileSync(e,encrypted);
  assert.throws(()=>inspectR59Archive(e,{tag:'R54'}),/B198ZR59_ZIP_UNSUPPORTED_ENTRY/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('R59 rejects incomplete ZIP evidence, keeps original and never writes a review',()=>{
 const dir=tmp();
 try{
  const a=evidence();
  const p=path.join(dir,'partial.zip'),out=path.join(dir,'review');
  fs.writeFileSync(p,zip(a.entries.filter(([n])=>!n.endsWith('FROZEN_REQUEST.json'))));
  assert.throws(()=>reviewR59AlreadySavedZip({r54Zip:p,destination:out}),
   /ZIP_REQUIRED_CAPTURE_MISSING_OR_AMBIGUOUS/);
  assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('R59 supports an actual Windows Compress-Archive result ZIP',()=>{
 if(process.platform!=='win32')return;
 const dir=tmp();
 try{
  const a=evidence(),capture=path.join(dir,a.root),archive=path.join(dir,'r54.zip');
  fs.mkdirSync(capture);
  for(const [name,content]of a.entries)
   fs.writeFileSync(path.join(capture,path.basename(name)),content);
  const p=spawnSync('powershell.exe',['-NoProfile','-Command',
   'Compress-Archive -LiteralPath $env:R59_CAPTURE -DestinationPath $env:R59_ARCHIVE -ErrorAction Stop'],{
   env:{...process.env,R59_CAPTURE:capture,R59_ARCHIVE:archive},
   encoding:'utf8',timeout:120000
  });
  assert.equal(p.status,0,p.stdout+'\n'+p.stderr);
  const inspected=inspectR59Archive(archive,{tag:'R54'});
  assert.equal(inspected.selectedFiles.length,5);
  const report=reviewR59AlreadySavedZip({
   r54Zip:archive,destination:path.join(dir,'review')});
  assert.equal(report.files,3);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
