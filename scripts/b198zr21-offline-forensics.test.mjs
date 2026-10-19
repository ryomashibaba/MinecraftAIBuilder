import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectR21SavedOriginal,SCHEMA}
 from '../source/ai/b198zr21-offline-forensics.mjs';
import {writeR21SavedOriginalForensics}
 from './b198zr21-analyze-saved-original.mjs';
import {R21_FUTURE_GUIDE,R21_FUTURE_GUIDE_SHA256,
 FROZEN_R11_PROVENANCE_SHA256,R21_REAL_MODEL_CALLS_AUTHORIZED_BY_MODULE}
 from '../source/ai/b198zr21-future-architecture-guide.mjs';
import {R11_COMPACT_GUIDE,R11_GUIDE_SHA256}
 from '../source/ai/b198zr11-compact-r4-output.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const missingIds=['stairs','pillar-1','pillar-2','pillar-3','pillar-4'];
const fixture={
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',id:'fixture-not-real-model',
 title:'Fixture only',brief:'Fabricated geometry used solely for offline QA',
 bounds:{width:64,height:32,depth:64},designOnly:true,elements:[
  {id:'base',shape:'box',mode:'add',origin:[0,0,0],size:[64,2,64],material:'concrete'},
  {id:'core',shape:'box',mode:'add',origin:[24,2,24],size:[16,30,16],material:'glass'},
  {id:'core-cut',shape:'box',mode:'cut',origin:[26,4,26],size:[12,26,12]},
  {id:'stairs',shape:'staircase',mode:'add',origin:[20,2,30],
   axis:'z',direction:1,width:4,steps:15,treadDepth:2},
  {id:'landing',shape:'box',mode:'add',origin:[20,32,30],
   size:[4,2,4],material:'concrete'},
  {id:'shelf-w',shape:'box',mode:'add',origin:[4,6,20],
   size:[16,2,24],material:'wood'},
  {id:'lounge',shape:'box',mode:'add',origin:[24,28,24],
   size:[16,2,16],material:'glass'},
  ...[1,2,3,4].map((v,i)=>({id:'pillar-'+v,shape:'cylinder',
   mode:'add',origin:[[24,39,24,39][i],2,[24,24,39,39][i]],
   axis:'y',radius:1,length:28}))
 ]},
 spatialPlan:{designIntent:'Fixture only',massStrategy:'Not a model output',
 circulationStrategy:'Not a functional plan',entrance:[32,0,62],
 headroom:3,protectedVoids:[{id:'atrium',origin:[26,4,26],
 size:[12,26,12],maxOccupiedCells:0}],
 destinations:[{id:'lounge',point:[32,28,32],maximumPathSteps:50}],
 functionalZones:[{id:'reading',origin:[4,6,20],size:[16,2,24],
 minimumReachablePositions:10,minimumReachablePercent:80}]},
 explanation:'Mock only',assumptions:[]
};
const raw=JSON.stringify(fixture),sha=hash(raw);
test('R21 detects exactly five missing ADD materials, not valid wood, and bad landing bounds',()=>{
 const r=inspectR21SavedOriginal(raw,{expectedRawSha256:sha,
  requestPrompt:'曲線的な未来型公共図書館'});
 assert.equal(r.schema,SCHEMA);
 assert.equal(r.exactFourKeyJsonParseable,true);
 assert.equal(r.staticCriticalCount,6);
 assert.deepEqual(r.criticalSourceFindings
  .filter(v=>v.code==='ADD_MATERIAL_MISSING_OR_INVALID')
  .map(v=>v.elementId),missingIds);
 assert(!r.criticalSourceFindings.some(v=>v.elementId==='shelf-w'));
 const overflow=r.criticalSourceFindings
  .find(v=>v.code==='SOURCE_ENVELOPE_OUTSIDE_BOUNDS');
 assert.equal(overflow.elementId,'landing');
 assert.deepEqual(overflow.axes,[1]);
 assert.deepEqual(overflow.maximum,[23,33,33]);
 const voidIssue=r.advisoryArchitecturalFindings
  .find(v=>v.code==='LATE_BOX_ADD_OVERLAPS_DECLARED_VOID');
 assert.equal(voidIssue.elementId,'lounge');
 assert.equal(voidIssue.intersectingBoundingBoxCells,288);
 assert.equal(voidIssue.finalOccupiedVoxelCountVerified,false);
 assert(r.advisoryArchitecturalFindings.some(
  v=>v.code==='ENTRANCE_BOTTOM_BOUNDARY_NO_LOCAL_SUPPORT'));
 assert(r.advisoryArchitecturalFindings.some(
  v=>v.code==='CURVED_SILHOUETTE_NOT_DEMONSTRATED_BY_MACRO_FORMS'));
 assert.equal(r.modelCallsByThisAnalysis,0);
 assert.equal(r.safety.worldWrites,0);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.equal(r.safety.gates.length,9);
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R21 refuses mismatched saved original digest, preserves raw, never fixes JSON',()=>{
 assert.throws(()=>inspectR21SavedOriginal(raw,{
  expectedRawSha256:'0'.repeat(64)}),/SAVED_ORIGINAL_HASH_MISMATCH/);
 const broken=raw.slice(0,-1);
 const r=inspectR21SavedOriginal(broken);
 assert.equal(r.exactFourKeyJsonParseable,false);
 assert(r.criticalSourceFindings.some(v=>v.code==='FOUR_KEY_ENVELOPE_INVALID'));
 assert.equal(r.rawSha256,hash(broken));
});
test('R21 local report writer creates only new derived JSON; cannot overwrite',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r21-source-only-'));
 try{
  const rawFile=path.join(tmp,'original.txt'),reqFile=path.join(tmp,'request.json'),
   outFile=path.join(tmp,'report.json');
  fs.writeFileSync(rawFile,raw);
  fs.writeFileSync(reqFile,JSON.stringify({originalPrompt:'曲線的な未来型公共図書館'}));
  const r=writeR21SavedOriginalForensics({
   rawPath:rawFile,requestPath:reqFile,expectedRawSha256:sha,outPath:outFile});
  assert.equal(r.staticCriticalCount,6);
  assert.equal(JSON.parse(fs.readFileSync(outFile,'utf8')).rawSha256,sha);
  assert.equal(fs.readFileSync(rawFile,'utf8'),raw);
  assert.throws(()=>writeR21SavedOriginalForensics({
   rawPath:rawFile,outPath:outFile}),/OUTPUT_MUST_BE_NEW/);
  assert.equal(fs.readdirSync(tmp).length,3);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
test('R21 advisory guide never edits pinned R11 or enables inference',()=>{
 assert.equal(R11_GUIDE_SHA256,
  'b4b26d71d28377e341c856823358871d4ab1395aa841c1a29adaf671079ee075');
 assert.equal(FROZEN_R11_PROVENANCE_SHA256,R11_GUIDE_SHA256);
 assert(R21_FUTURE_GUIDE.startsWith(R11_COMPACT_GUIDE));
 assert.equal(hash(R21_FUTURE_GUIDE),R21_FUTURE_GUIDE_SHA256);
 assert(R21_FUTURE_GUIDE.includes('including staircase, cylinder'));
 assert(R21_FUTURE_GUIDE.includes('protectedVoid'));
 assert.equal(R21_REAL_MODEL_CALLS_AUTHORIZED_BY_MODULE,0);
});
