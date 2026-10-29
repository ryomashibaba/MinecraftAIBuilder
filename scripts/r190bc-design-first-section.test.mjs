/** R190-BC: strictly offline synthetic cases, no real provider or world. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {buildR190BCDesignFirstPrompt,reviewR190BCOriginal,
 renderR190BCSectionSVG,writeR190BCOriginalReview}
 from './r190bc-design-first-section.mjs';

import * as CLI from './r190bc-offline-review.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const box=(id,origin,size,material='stone')=>({
 id,shape:'box',mode:'add',material,origin,size});
const example=()=>({
 design:{
  schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'r190bc-section-fixture',title:'SYNTHETIC section fixture, not model art',
  brief:'A two-zone test of physical floor and partially sheltered open areas.',
  bounds:{width:24,height:16,depth:20},designOnly:true,
  elements:[
   box('foundation',[1,0,1],[22,1,18]),
   box('western-canopy',[2,10,2],[10,1,14],'wood'),
   box('west-a',[2,1,2],[2,9,2]),
   box('west-b',[10,1,2],[2,9,2]),
   box('west-c',[2,1,14],[2,9,2]),
   box('west-d',[10,1,14],[2,9,2])
  ]
 },
 explanation:'This is a fully synthetic regression test, not evidence of model architecture.',
 assumptions:[],
 spatialPlan:{
  designIntent:'A sheltered gathering pad and an outdoor second pad illustrate a sectional proof.',
  massStrategy:'A west-side canopy sits above authored supports and an open east-side pad.',
  circulationStrategy:'Movement across the same ground slab uses the two clear pads.',
  entrance:[4,1,5],headroom:2,protectedVoids:[],
  destinations:[{id:'east-end',point:[17,1,7],maximumPathSteps:40}],
  functionalZones:[
   {id:'west-zone',origin:[4,1,4],size:[6,3,8],
    minimumReachablePositions:1,minimumReachablePercent:1},
   {id:'east-zone',origin:[14,1,4],size:[6,3,8],
    minimumReachablePositions:1,minimumReachablePercent:1}
  ]
 }
});
const raw=o=>Buffer.from(JSON.stringify(o));
test('BC prompt keeps unknown Japanese request verbatim, uses existing R4, no typology',()=>{
 const request='山間の小さな町に、機能する二層の公共図書館と階間動線を設計してください。';
 const result=buildR190BCDesignFirstPrompt(request);
 assert.equal(result.slice(0,request.length),request);
 assert.match(result,/design、explanation、assumptions、spatialPlan/);
 assert.match(result,/断面/);
 assert.match(result,/支持/);
 assert.match(result,/未成立/);
 assert.doesNotMatch(result,/shape:|origin:\[/);
 assert.throws(()=>buildR190BCDesignFirstPrompt('短文'),/R190BC_BRIEF/);
 assert.throws(()=>buildR190BCDesignFirstPrompt('有効な入力です。\u0001攻撃テキスト'),/R190BC_BRIEF/);
});
test('BC real B143 source section distinguishes sheltered and sky-open model regions',()=>{
 const input=raw(example()),digest=hash(input);
 const result=reviewR190BCOriginal(input,{expectedSha256:digest});
 assert.equal(result.status,'SOURCE_SECTION_PROXIES_AVAILABLE_ART_HOLD');
 assert.equal(result.originalSha256,digest);
 assert.equal(result.originalUnmodified,true);
 assert.equal(result.hostRepairedGeometry,false);
 assert.equal(result.modelCalls,0);
 assert.equal(result.worldContacts,0);
 assert.equal(result.worldWrites,0);
 assert.equal(result.art,'ART_HOLD');
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(result.BuildPlan.operations,[]);
 const [west,east]=result.zoneEvidence;
 assert(west.roofedPadCount>0);
 assert.equal(west.skyOpenPadCount,0);
 assert(east.skyOpenPadCount>0);
 assert.equal(east.roofedPadCount,0);
 assert(west.twoWidePadCount>0&&east.twoWidePadCount>0);
 assert.equal(result.sectionEvidence.fixedZ,5);
 assert(result.sectionEvidence.occupiedCellsAtSlice.length>0);
 assert.equal(result.sectionEvidence.isModelOriginalFinalB143,true);
 assert(renderR190BCSectionSVG(result).includes('<rect'));
 assert.equal(hash(input),digest);
});
test('BC model-declared zones without supported clear two-wide floors stay HOLD',()=>{
 const fake=example();
 fake.spatialPlan.functionalZones[1].origin=[14,5,4];
 const review=reviewR190BCOriginal(raw(fake));
 assert.equal(review.status,'HOLD_MODEL_DECLARED_ZONE_SECTION_UNUSABLE');
 assert.equal(review.zoneEvidence[1].twoWidePadCount,0);
 assert.equal(review.firstFailure,'MODEL_DECLARED_ZONE_LACKS_SUPPORTED_TWO_WIDE_SPACE');
 assert(review.sectionEvidence.occupiedCellsAtSlice.length>0);
});
test('BC solid-filled model-named area is never counted as a usable room',()=>{
 const fake=example();
 fake.design.elements.push(box('east-filler',[14,1,4],[6,6,8],'concrete'));
 const result=reviewR190BCOriginal(raw(fake));
 assert.equal(result.status,'HOLD_MODEL_DECLARED_ZONE_SECTION_UNUSABLE');
 assert.equal(result.zoneEvidence[1].sourceStatus,'HOLD_NO_CLEAR_SUPPORTED_TWO_WIDE_FOOTPRINT');
});
test('BC malformed saved original and SHA mismatch cannot be repaired into 3D',()=>{
 const invalid=Buffer.from('{"design":');
 const hold=reviewR190BCOriginal(invalid);
 assert.equal(hold.status,'HOLD_INVALID_ORIGINAL_R4_OR_B143');
 assert.equal(hold.sectionEvidence,null);
 assert.equal(hold.sourceSha256,null);
 assert.match(renderR190BCSectionSVG(hold),/HOLD/);
 assert.throws(()=>reviewR190BCOriginal(raw(example()),{
  expectedSha256:'0'.repeat(64)}),/R190BC_ORIGINAL_SHA_MISMATCH/);
 const unsupported=example();unsupported.design.elements.push({
  id:'magic-fake-geometry',shape:'skycastle',mode:'add',material:'stone'});
 const bad=reviewR190BCOriginal(raw(unsupported));
 assert.equal(bad.status,'HOLD_INVALID_ORIGINAL_R4_OR_B143');
 assert.equal(bad.geometrySha256,null);
});
test('BC fresh output, symlink denial, no changes to input, no model, safety',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r190bc-'));
 const file=path.join(tmp,'ORIGINAL.txt'),out=path.join(tmp,'report');
 const bytes=raw(example()),digest=hash(bytes);
 fs.writeFileSync(file,bytes);
 try{
  assert.throws(()=>writeR190BCOriginalReview({originalPath:file,outDir:out,
   expectedSha256:'0'.repeat(64)}),/R190BC_ORIGINAL_SHA_MISMATCH/);
  assert.equal(fs.existsSync(out),false);
  const result=writeR190BCOriginalReview({originalPath:file,outDir:out,
   expectedSha256:digest});
  assert.equal(result.status,'SOURCE_SECTION_PROXIES_AVAILABLE_ART_HOLD');
  assert.deepEqual(fs.readdirSync(out).sort(),
   ['R190BC_SECTION_AUDIT.json','R190BC_SOURCE_SECTION.svg']);
  assert.equal(hash(fs.readFileSync(file)),digest);
  assert.throws(()=>writeR190BCOriginalReview({originalPath:file,outDir:out,
   expectedSha256:digest}),/R190BC_FRESH_ABSOLUTE_PATHS/);
  const link=path.join(tmp,'original-symlink');fs.symlinkSync(file,link);
  assert.throws(()=>writeR190BCOriginalReview({originalPath:link,
   outDir:path.join(tmp,'later'),expectedSha256:digest}),/R190BC_UNSAFE_ORIGINAL/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});

test('BC offline-only CLI prepares hash-pinned model prompt without any inference',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190bc-prompt-'));
 const {parseR190BCArgs,runR190BCOfflineArgs}=CLI;
 const input=path.join(root,'brief.txt'),out=path.join(root,'new');
 const brief='岩場の小型観測施設を独自の空間構成と安全な支持床で設計してください。';
 fs.writeFileSync(input,brief);
 const sha=hash(fs.readFileSync(input));
 try{
  assert.equal(parseR190BCArgs(['--help']).help,true);
  assert.throws(()=>parseR190BCArgs(['--brief','a','--original','b','--out','c']),
   /R190BC_CLI_FLAGS/);
  assert.throws(()=>runR190BCOfflineArgs(['--brief',input,'--out',out,
   '--sha','0'.repeat(64)]),/R190BC_CLI_BRIEF_SHA_MISMATCH/);
  assert.equal(fs.existsSync(out),false);
  const receipt=runR190BCOfflineArgs(['--brief',input,'--sha',sha,'--out',out]);
  assert.equal(receipt.newModelRequests,0);
  assert.equal(receipt.worldWrites,0);
  assert.deepEqual(receipt.gates,Array(9).fill('BLOCKED'));
  assert.equal(fs.readFileSync(path.join(out,'ORIGINAL_BRIEF.txt'),'utf8'),brief);
  assert.match(fs.readFileSync(path.join(out,'DESIGN_FIRST_PROMPT.txt'),'utf8'),
   /主要な質量/);
  assert.throws(()=>runR190BCOfflineArgs(['--brief',input,'--sha',sha,'--out',out]),
   /R190BC_CLI_FRESH_ABSOLUTE_PATHS/);
  const link=path.join(root,'link.txt');fs.symlinkSync(input,link);
  assert.throws(()=>runR190BCOfflineArgs(['--brief',link,'--sha',sha,
   '--out',path.join(root,'new-link')]),/R190BC_CLI_UNSAFE_BRIEF/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('BC offline CLI original review never reinterprets corrupt R4 as geometry',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190bc-cli-review-'));
 const input=path.join(root,'original.txt'),out=path.join(root,'new');
 const bad='{"design":';
 fs.writeFileSync(input,bad);
 try{
  const review=CLI.runR190BCOfflineArgs([
   '--original',input,'--out',out,'--sha',hash(Buffer.from(bad))]);
  assert.equal(review.status,'HOLD_INVALID_ORIGINAL_R4_OR_B143');
  assert.equal(review.sectionEvidence,null);
  assert.equal(review.modelCalls,0);
  assert.deepEqual(fs.readdirSync(out).sort(),
   ['R190BC_SECTION_AUDIT.json','R190BC_SOURCE_SECTION.svg']);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
