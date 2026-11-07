/**
 * R190-AX regressions: one already-published, preserved R190-AA real-model
 * original + synthetic valid source. Original must NEVER be normalized.
 * No model/HTTP/Minecraft dependencies.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {diagnoseR190AXOriginal,buildR190AXFutureContract,
 writeR190AXStudy} from './r190ax-original-output-contract-study.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const original=path.join(ROOT,'evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt');
const sha=b=>createHash('sha256').update(b).digest('hex');
const EXPECTED='0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17';

test('AX preserved original R190-AA has independently identified grammar defects without repair',()=>{
 const raw=fs.readFileSync(original);
 assert.equal(raw.length,2581);
 assert.equal(sha(raw),EXPECTED);
 const a=diagnoseR190AXOriginal(raw);
 assert.equal(a.inputSha256,EXPECTED);
 assert.equal(a.inputBytes,2581);
 assert.equal(a.sourceStatus,'HOLD_NOT_COMPILABLE');
 assert.equal(a.geometryError,'B143_SCHEMA_OR_MODE');
 assert.equal(a.geometrySha256,null);
 assert.equal(a.voxelCount,null);
 assert.deepEqual(a.issues.map(x=>x.code),[
  'EXTRA_OUTPUT_METADATA','NONCANONICAL_B143_SCHEMA',
  'CUT_MATERIAL_KEY_PRESENT','UNSUPPORTED_STAIR_DIRECTION',
  'DECLARED_ENTRANCE_INSIDE_POSITIVE_BOX'
 ]);
 assert.deepEqual(a.issues[0].detail,['attempt','maxAttempts']);
 assert.deepEqual(a.issues[2].detail.elementIds,['light-well','north-window','south-window']);
 assert.deepEqual(a.issues[3].detail.elements,[{id:'staircase',axis:'y'}]);
 assert.deepEqual(a.issues[4].detail.containingSourceElementIds,['base','storage-floor']);
 assert.equal(a.issues[4].detail.caveat.includes('not final B143 voxel'),true);
 assert.equal(a.authorGeometryFixedByHost,false);
 assert.equal(a.originalModelAuthorship,'NOT_CRYPTOGRAPHICALLY_VERIFIED');
 assert.deepEqual(a.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(a.BuildPlan.operations,[]);
 assert.equal(a.modelCallsByAnalysis,0);assert.equal(a.worldWrites,0);
});

test('AX future prompt repairs LANGUAGE OF CONTRACT, never geometry nor response bytes',()=>{
 const before=fs.readFileSync(original);
 const a=diagnoseR190AXOriginal(before);
 const p=buildR190AXFutureContract(a);
 assert.equal(p.action,'FUTURE_RESEARCH_PROMPT_ONLY_NOT_SENT');
 assert.match(p.text,/minecraftaibuilder-b143-building-dsl-v1/);
 assert.match(p.text,/attempt|メタデータ/);
 assert.match(p.text,/material:null/);
 assert.match(p.text,/axis:"y"/);
 assert.match(p.text,/ホストが空間を補修/);
 assert.equal(p.diagnosis.copiedOldGeometry,false);
 assert.equal(p.diagnosis.hostFixesOldGeometry,false);
 assert.equal(p.diagnosis.untestedFutureProviderResponse,'NOT_RUN');
 assert.deepEqual(fs.readFileSync(original),before);
});

test('AX review creates local derived report only, never republishes the original',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ax-'));
 const out=path.join(root,'review');
 try{
  const before=fs.readFileSync(original);
  const x=writeR190AXStudy({originalPath:original,outDir:out,expectedSha256:EXPECTED});
  assert.equal(x.diagnosis.sourceStatus,'HOLD_NOT_COMPILABLE');
  const files=fs.readdirSync(out).sort();
  assert.deepEqual(files,['FUTURE_CONTRACT_MANIFEST.json',
   'FUTURE_UNSENT_RESPONSE_CONTRACT.txt','SOURCE_ONLY_DIAGNOSIS.json']);
  const diag=JSON.parse(fs.readFileSync(path.join(out,'SOURCE_ONLY_DIAGNOSIS.json'),'utf8'));
  assert.equal(diag.originalArchitectureBeauty,'NOT_CERTIFIED');
  assert(!files.some(f=>f.includes('ORIGINAL_RESPONSE')));
  assert.deepEqual(fs.readFileSync(original),before);
  assert.throws(()=>writeR190AXStudy({originalPath:original,outDir:out,
   expectedSha256:EXPECTED}),/R190AX_NEW_ABSOLUTE_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('AX fails SHA mismatch BEFORE output, and rejects symbolic original',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r190ax-sec-'));
 try{
  const out=path.join(tmp,'new');
  assert.throws(()=>writeR190AXStudy({originalPath:original,outDir:out,
   expectedSha256:'0'.repeat(64)}),/R190AX_PRESERVED_ORIGINAL_SHA_MISMATCH/);
  assert.equal(fs.existsSync(out),false);
  const link=path.join(tmp,'original-link');
  fs.symlinkSync(original,link);
  assert.throws(()=>writeR190AXStudy({originalPath:link,outDir:out,
   expectedSha256:EXPECTED}),/R190AX_UNSAFE_OR_INVALID_INPUT/);
  assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('AX valid independent author B143 reply can compile without a sky courtyard preset',()=>{
 const input={design:{
  schema:'minecraftaibuilder-b143-building-dsl-v1',id:'arcade-no-required-court',
  title:'An original independent pavilion with no mandatory courtyard',
  brief:'Open sided small gallery and canopy, free layout and true source geometry.',
  designOnly:true,bounds:{width:20,height:12,depth:20},
  elements:[
   {id:'ground',shape:'box',mode:'add',material:'stone',origin:[2,0,2],size:[16,2,16]},
   {id:'front-post',shape:'box',mode:'add',material:'metal',origin:[3,2,3],size:[2,8,2]},
   {id:'upper-canopy',shape:'box',mode:'add',material:'wood',origin:[2,10,2],size:[16,2,16]}
  ]},explanation:'An open pavilion without any required sky void.',
  assumptions:[],spatialPlan:{entrance:[10,2,8]}};
 const result=diagnoseR190AXOriginal(Buffer.from(JSON.stringify(input)));
 assert.equal(result.sourceStatus,'B143_COMPILED_SOURCE_ONLY_NOT_ARCHITECTURE_PASS');
 assert.equal(result.geometryError,null);
 assert(result.voxelCount>300);
 assert.equal(result.issues.length,0);
 assert.equal(result.originalArchitectureBeauty,'NOT_CERTIFIED');
});
