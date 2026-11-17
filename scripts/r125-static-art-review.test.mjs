import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {renderB143StaticPNG,saveB143StaticReview,saveB143ABReview}
 from './r125-static-art-review.mjs';
import {saveSavedFloorReview} from './r125-v11-saved-floor-review.mjs';
import {saveR125FinishAB} from './r125-v11-finish-art-ab.mjs';

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

test('same-brief old/new produces physical voxel diffs and 8 true B143 snapshots, with no model',()=>{
 const reviewed=diagnoseR125ArchitecturePlanOriginal(original);
 assert.equal(reviewed.sourceVerified,true);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-ab-source-test-'));
 try{
  const before=path.join(tmp,'before.json'),after=path.join(tmp,'after.json');
  const oldPlan=reviewed.sourceDesign;
  const changed=structuredClone(oldPlan);
  // Same physical SOURCE, different document metadata: SOURCE/geometry SHA
  // may change, but this must NOT be called architectural improvement.
  changed.title=oldPlan.title+' revision for test';
  fs.writeFileSync(before,JSON.stringify(oldPlan));
  fs.writeFileSync(after,JSON.stringify(changed));
  const zero=saveB143ABReview({beforeSourcePath:before,
   afterSourcePath:after,outDir:path.join(tmp,'unchanged')});
  assert.equal(zero.finalVoxelDifference.sameActualGeometryAndMaterial,true);
  assert.equal(zero.finalVoxelDifference.added,0);
  assert.equal(zero.finalVoxelDifference.removed,0);
  assert.equal(zero.finalVoxelDifference.changedMaterial,0);
  assert.notEqual(zero.before.geometrySha256,zero.after.geometrySha256);
  assert.equal(zero.modelCalls,0);
  assert.equal(zero.worldWrites,0);
  assert.equal(zero.artOutcome,'HUMAN_REVIEW_REQUIRED');
  assert.deepEqual(zero.preview.columnOrder,['OLD','NEW']);
  assert.equal(zero.preview.rowOrder.length,4);
  assert.equal(zero.preview.physicalScale,
   'EACH_DESIGN_AUTO_FIT_NOT_SAME_PIXEL_PER_BLOCK');
  const preview=fs.readFileSync(path.join(tmp,'unchanged',
   'AB_OLD_LEFT_NEW_RIGHT.png'));
  assert.equal(preview.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(preview.readUInt32BE(16),2416);
  assert.equal(preview.readUInt32BE(20),3088);
  assert.equal(hash(preview),zero.preview.sha256);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tmp,'unchanged',
   'AB_REPORT.json'),'utf8')),zero);
  assert.throws(()=>saveB143ABReview({beforeSourcePath:before,
   afterSourcePath:after,outDir:path.join(tmp,'unchanged')}),/AB_OUTPUT_MUST_BE_NEW/);
  // Changing a material really DOES change the final actual voxels.
  changed.elements=structuredClone(oldPlan.elements);
  const target=changed.elements.find(x=>x.mode==='add'&&x.material==='stone')??
   changed.elements.find(x=>x.mode==='add'&&x.material==='concrete');
  assert(target,'a true add element to recolor');
  target.material=target.material==='stone'?'wood':'stone';
  fs.writeFileSync(after,JSON.stringify(changed));
  const diff=saveB143ABReview({beforeSourcePath:before,
   afterSourcePath:after,outDir:path.join(tmp,'changed')});
  assert.equal(diff.finalVoxelDifference.sameActualGeometryAndMaterial,false);
  assert(diff.finalVoxelDifference.changedMaterial>0||
   diff.finalVoxelDifference.added>0||diff.finalVoxelDifference.removed>0);
  assert.equal(diff.modelCalls,0);
  assert.equal(diff.worldWrites,0);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('saved authentic Qwen floor views are source-exact and never alter the author',()=>{
 const reviewed=diagnoseR125ArchitecturePlanOriginal(original);
 assert.equal(reviewed.sourceVerified,true);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-floor-qwen-'));
 try{
  const raw=path.join(tmp,'MODEL_RESPONSE_ORIGINAL.txt'),
   src=path.join(tmp,'B143_SOURCE_REVIEW_ONLY.json'),
   diag=path.join(tmp,'SOURCE_DIAGNOSIS.json');
  const {sourceDesign,...diagnosis}=reviewed;
  fs.writeFileSync(raw,original);
  fs.writeFileSync(src,JSON.stringify(sourceDesign));
  fs.writeFileSync(diag,JSON.stringify(diagnosis));
  const args={rawPath:raw,sourcePath:src,diagnosisPath:diag,
   outDir:path.join(tmp,'floor-view')};
  const result=saveSavedFloorReview(args);
  assert.equal(result.levels,1);
  assert.equal(result.originalSha256,hash(original));
  assert.equal(result.sourceSha256,reviewed.sourceSha256);
  assert.deepEqual(result.views.map(v=>v.floor),[1,1,1,1]);
  assert.equal(result.contact.width,2416);
  assert.equal(result.contact.height,1536);
  assert.equal(result.modelCalls,0);assert.equal(result.worldWrites,0);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  const png=fs.readFileSync(path.join(args.outDir,result.contact.name));
  assert.equal(hash(png),result.contact.sha256);
  assert.equal(fs.readFileSync(raw,'utf8'),original);
  assert.throws(()=>saveSavedFloorReview(args),/OUTPUT_MUST_BE_NEW/);
  fs.writeFileSync(diag,JSON.stringify({...diagnosis,originalSha256:'0'.repeat(64)}));
  assert.throws(()=>saveSavedFloorReview({...args,outDir:path.join(tmp,'bad')}),
   /AUTHOR_OR_DIAGNOSIS_MISMATCH/);
  assert.equal(fs.existsSync(path.join(tmp,'bad')),false);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('two-floor source review exposes genuinely separated upper floor voxels',()=>{
 const p={schema:'minecraftaibuilder-r125-architecture-plan-v1',
  id:'two-floor-review-test',title:'Shared two floor hall',
  brief:'Public visitor rooms upstairs and downstairs',
  footprint:{width:26,depth:26},
  levels:[
   {splitAxis:'z',splitPercent:50,spaces:[
    {id:'entry-hall',purpose:'Public reception hall',access:'public'},
    {id:'ground-work',purpose:'Shared workshop room',access:'shared'}]},
   {splitAxis:'x',splitPercent:50,spaces:[
    {id:'upper-gallery',purpose:'Shared activity gallery',access:'shared'},
    {id:'upper-studio',purpose:'Public study room',access:'public'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},entryZone:'first',
  expression:{setbackSide:'none',setbackDepth:0,roofProfile:'ridge',
   roofAxis:'x',roofVolume:'raised',facadeLanguage:'plain'}};
 const rawData=JSON.stringify(p),reviewed=diagnoseR125ArchitecturePlanOriginal(rawData);
 assert.equal(reviewed.sourceVerified,true,JSON.stringify({
  status:reviewed.status,reason:reviewed.compilerReason,issues:reviewed.sourceRouteIssues}));
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-two-floors-'));
 try{
  const raw=path.join(tmp,'raw.txt'),src=path.join(tmp,'src.json'),
   diag=path.join(tmp,'diag.json');
  fs.writeFileSync(raw,rawData);
  const {sourceDesign,...diagnosis}=reviewed;
  fs.writeFileSync(src,JSON.stringify(sourceDesign));
  fs.writeFileSync(diag,JSON.stringify(diagnosis));
  const result=saveSavedFloorReview({rawPath:raw,sourcePath:src,
   diagnosisPath:diag,outDir:path.join(tmp,'floors')});
  assert.equal(result.levels,2);
  assert.deepEqual(result.views.map(v=>v.floor),[1,1,2,2]);
  assert.equal(result.contact.rowOrder[1],'SECOND_FLOOR');
  assert(result.views.every(v=>v.renderedCells>25));
  assert.equal(result.sourceSha256,reviewed.sourceSha256);
  assert.equal(result.worldWrites,0);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('one saved authored concept becomes SOURCE-checked activity and roof ART A/B without model',()=>{
 const plan={schema:'minecraftaibuilder-r125-architecture-plan-v1',
  id:'saved-workspace-ab',title:'An independently authored workspace',
  brief:'A practical community studio with two separate activities',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'z',splitPercent:50,spaces:[
   {id:'public-studio',purpose:'Shared making and display room',
    fixtures:['desk'],access:'shared'},
   {id:'staff-store',purpose:'Staff records and inventory',
    fixtures:['storage'],access:'staff'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'metal'},entryZone:'first',
  expression:{setbackSide:'none',setbackDepth:0,roofProfile:'ridge',
   roofAxis:'x',roofVolume:'raised',facadeLanguage:'plain'}};
 const raw=JSON.stringify(plan);
 const originalDiagnosis=diagnoseR125ArchitecturePlanOriginal(raw);
 assert.equal(originalDiagnosis.sourceVerified,true,
  JSON.stringify({status:originalDiagnosis.status,reason:originalDiagnosis.compilerReason}));
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-finish-ab-'));
 try{
  const rawFile=path.join(tmp,'original.txt'),
   sourceFile=path.join(tmp,'source.json'),out=path.join(tmp,'out');
  fs.writeFileSync(rawFile,raw);
  fs.writeFileSync(sourceFile,JSON.stringify(originalDiagnosis.sourceDesign));
  const r=saveR125FinishAB({rawPath:rawFile,sourcePath:sourceFile,outDir:out});
  assert.equal(r.originalSha256,hash(raw));
  assert.equal(r.baselineSourceSha256,originalDiagnosis.sourceSha256);
  assert.equal(r.policy.roofMassing,'steep-ridge-review');
  assert.equal(r.policy.fixtureArt,'activity-inlays');
  assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
  assert.deepEqual(r.nineWorldGates,Array(9).fill('BLOCKED'));
  assert.equal(r.art,'HUMAN_REVIEW_REQUIRED_NOT_ACCEPTED');
  assert(r.changedVoxels.added+r.changedVoxels.removed+
   r.changedVoxels.changedMaterial>0);
  assert.equal(fs.readFileSync(rawFile,'utf8'),raw);
  assert.equal(hash(fs.readFileSync(path.join(out,r.photo))),r.photoSha256);
  assert.throws(()=>saveR125FinishAB({rawPath:rawFile,
   sourcePath:sourceFile,outDir:out}),/NEW_OUTPUT_DIRECTORY_REQUIRED/);
  fs.writeFileSync(sourceFile,'{"unverified":"source"}');
  assert.throws(()=>saveR125FinishAB({rawPath:rawFile,
   sourcePath:sourceFile,outDir:path.join(tmp,'bad')}),
   /B143_|BASELINE_B143_ORIGINAL_MISMATCH/);
  assert.equal(fs.existsSync(path.join(tmp,'bad')),false);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
