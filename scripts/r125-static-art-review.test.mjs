import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {renderB143StaticPNG,saveB143StaticReview}
 from './r125-static-art-review.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const original=fs.readFileSync(new URL(
 '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
 import.meta.url),'utf8');

test('saved genuine Qwen SOURCE renders deterministic no-browser PNGs without model calls',()=>{
 const reviewed=diagnoseR125ArchitecturePlanOriginal(original);
 assert.equal(reviewed.sourceVerified,true);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-static-qwen-'));
 try{
  const source=path.join(tmp,'B143_SOURCE_REVIEW_ONLY.json');
  const raw=JSON.stringify(reviewed.sourceDesign,null,2)+'\n';
  fs.writeFileSync(source,raw);
  const report=saveB143StaticReview({sourcePath:source,
   outDir:path.join(tmp,'first')});
  assert.equal(report.sourceSha256,reviewed.sourceSha256);
  assert.equal(report.geometrySha256,reviewed.geometrySha256);
  assert.equal(report.sourceDocumentFileSha256,hash(raw));
  assert.equal(report.humanArt,'NOT_REVIEWED');
  assert.equal(report.minecraftWalking,'NOT_TESTED');
  assert.equal(report.modelCalls,0);
  assert.equal(report.worldWrites,0);
  assert.equal(report.images.length,4);
  assert.deepEqual(report.contactSheet.order,[
   'EXTERIOR_FRONT_LEFT.png','EXTERIOR_FRONT_RIGHT.png',
   'EXTERIOR_REAR_RIGHT.png','GROUND_FLOOR_CUTAWAY.png']);
  assert.equal(report.contactSheet.sourceVoxels,report.occupiedVoxels);
  assert.equal(report.contactSheet.width,2416);
  assert.equal(report.contactSheet.height,1536);
  const contact=fs.readFileSync(path.join(tmp,'first','CONTACT_4_VIEWS.png'));
  assert.equal(contact.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(contact.readUInt32BE(16),2416);
  assert.equal(contact.readUInt32BE(20),1536);
  assert.equal(report.contactSheet.sha256,hash(contact));
  assert(report.images.every(x=>x.renderedFaces>50&&
   x.originalSourceCells===report.occupiedVoxels));
  assert.equal(report.images[3].hiddenAboveY,4);
  assert(report.images[3].renderedCells<report.occupiedVoxels);
  assert.equal(new Set(report.images.map(x=>x.sha256)).size,4);
  for(const pic of report.images){
   const bytes=fs.readFileSync(path.join(tmp,'first',pic.name));
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.equal(bytes.readUInt32BE(16),1200);
   assert.equal(bytes.readUInt32BE(20),760);
   assert.equal(pic.sha256,hash(bytes));
  }
  const independently=saveB143StaticReview({sourcePath:source,
   outDir:path.join(tmp,'second')});
  assert.deepEqual(independently,report);
  assert.equal(fs.readFileSync(source,'utf8'),raw,'original SOURCE not mutated');
  assert.throws(()=>saveB143StaticReview({sourcePath:source,
   outDir:path.join(tmp,'first')}),/OUTPUT_MUST_BE_NEW/);
 }finally{fs.rmSync(tmp,{force:true,recursive:true});}
});
test('renderer rejects invalid camera and bad B143 source before creating output',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-static-bad-'));
 try{
  const bad=path.join(tmp,'bad.json');
  fs.writeFileSync(bad,'{"not":"a building source"}');
  assert.throws(()=>saveB143StaticReview({
   sourcePath:bad,outDir:path.join(tmp,'images')}),/B143_/);
  assert.equal(fs.existsSync(path.join(tmp,'images')),false);
  assert.throws(()=>renderB143StaticPNG({primitives:[[1,1,1,4,0]]},
   {sx:0}),/INVALID_CAMERA/);
  assert.throws(()=>renderB143StaticPNG({primitives:[]}),/INVALID_SCENE/);
 }finally{fs.rmSync(tmp,{force:true,recursive:true});}
});
