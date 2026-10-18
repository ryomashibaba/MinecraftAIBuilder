import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {prepareCapturedModelSource,extendOnlyUndersizedB143Bounds}
 from '../source/ai/b198u-bounds-only-repair.mjs';
import {readModelProposal}
 from '../source/ai/b198-natural-language-design.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {runB198SSingleSource}
 from './b198s-single-source-probe.mjs';
import {runB198UOfflineReplay,parseB198UReplayArgs}
 from './b198u-offline-replay.mjs';

const MODEL='B198U_FAKE_MODEL_NOT_LLM';
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198u-save-'));
const source=()=>({
 schema:'minecraftaibuilder-b143-building-dsl-v1',
 id:'b198u-original-coastal-library',
 title:'大きな吹き抜けを持つ未来図書館',
 brief:'湾岸図書館。左右の公開書架、中央の吹き抜け、透明な展望ラウンジを含む。',
 bounds:{width:37,height:33,depth:30},designOnly:true,
 elements:[
  {id:'ground-floor',shape:'box',mode:'add',material:'stone',
   origin:[3,3,3],size:[34,1,30]},
  {id:'east-wing',shape:'box',mode:'add',material:'wood',
   origin:[24,12,2],size:[12,1,27]},
  {id:'west-wing',shape:'box',mode:'add',material:'wood',
   origin:[3,12,2],size:[10,1,27]},
  {id:'top-glass-lounge',shape:'ellipsoid',mode:'add',
   material:'glass',center:[18,27,17],radii:[17,7,16],shell:2},
  {id:'central-atrium',shape:'box',mode:'cut',
   origin:[15,4,9],size:[8,25,18]}
 ]
});
const body=d=>JSON.stringify({design:d,
 explanation:'Model-authored original test double, not true model reasoning.',
 assumptions:[]});
async function local(handler){
 const server=http.createServer(handler);
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 return {port:server.address().port,
  close:()=>new Promise(done=>server.close(done))};
}
async function received(req){let s='';for await(const x of req)s+=String(x);return JSON.parse(s)}
function reply(res,design){
 res.writeHead(200,{'Content-Type':'application/json'});
 res.end(JSON.stringify({model:MODEL,done:true,done_reason:'stop',
  message:{content:body(design)},total_duration:1800000000,
  load_duration:200000000,prompt_eval_count:185,
  prompt_eval_duration:250000000,eval_count:140,
  eval_duration:1350000000}));
}
test('correct ONLY underestimated B143 bounds, never geometry/material/element order',()=>{
 const original=source(),raw=body(original);
 assert.throws(()=>readModelProposal(raw),/B143_OUTSIDE_LOCAL_BOUNDS/);
 const prepared=prepareCapturedModelSource(raw);
 assert.equal(prepared.modelCallsMade,0);
 assert.equal(prepared.metadataRepair.applied,false);
 assert.equal(prepared.boundsRepair.applied,true);
 assert.equal(prepared.boundsRepair.status,'DECLARED_BOUNDS_ONLY_EXTENDED');
 const fixed=readModelProposal(prepared.content).design;
 assert.deepEqual(fixed.elements,original.elements);
 assert.deepEqual(fixed.bounds,{width:37,height:35,depth:34});
 assert.equal(prepared.boundsRepair.untouchedElementsSha256.length,64);
 assert.equal(prepared.boundsRepair.geometryEditsMade,0);
 assert.equal(prepared.boundsRepair.modelAuthoredPositionDataUnmodified,true);
 const compiled=compileDesign(fixed);
 assert(verifyCompiled(fixed,compiled));
 assert(compiled.primitives.length>500);
});
test('valid bounds are byte-exact stable and raw SHA identical',()=>{
 const original=source();
 original.bounds={width:40,height:40,depth:40};
 const raw=body(original);
 const fixed=prepareCapturedModelSource(raw);
 assert.equal(fixed.content,raw);
 assert.equal(fixed.boundsRepair.applied,false);
 assert.equal(fixed.boundsRepair.status,'ALREADY_CONTAINS_SHAPE_DOMAINS');
 assert.equal(fixed.rawModelResponseSha256,fixed.finalCandidateSha256);
});
test('cannot repair negative domains, oversize axes, volume or malicious shape fields',()=>{
 const negative=source();
 negative.elements[3]={...negative.elements[3],
  center:[3,27,17],radii:[17,7,16]};
 let r=extendOnlyUndersizedB143Bounds(body(negative));
 assert.equal(r.provenance.applied,false);
 assert.equal(r.provenance.status,'NEGATIVE_ELEMENT_DOMAIN_CANNOT_EXTEND_BOUNDS');
 assert.equal(r.content,body(negative));
 const oversize=source();
 oversize.elements[0]={...oversize.elements[0],
  origin:[127,3,3],size:[5,1,15]};
 r=extendOnlyUndersizedB143Bounds(body(oversize));
 assert.equal(r.provenance.status,'EXPANSION_OVER_B143_LIMIT_HOLD');
 assert.deepEqual(JSON.parse(r.content).design.elements,oversize.elements);
 const large=source();
 large.bounds={width:128,height:96,depth:128};
 large.elements[3].center=[115,70,115];
 large.elements[3].radii=[20,7,20];
 r=extendOnlyUndersizedB143Bounds(body(large));
 assert.equal(r.provenance.applied,false);
 assert.equal(r.provenance.status,'EXPANSION_OVER_B143_LIMIT_HOLD');
 const bad=source();
 bad.elements[0].shape='teleport-to-world';
 r=extendOnlyUndersizedB143Bounds(body(bad));
 assert.equal(r.provenance.status,'UNSUPPORTED_OR_MALFORMED_MODEL_SHAPE_HOLD');
 assert.equal(r.content,body(bad));
 const untrusted=extendOnlyUndersizedB143Bounds('{"hello":42}');
 assert.equal(untrusted.provenance.status,'INVALID_SOURCE_SHAPE_HOLD');
});
test('one actual mock HTTP request saves original INVALID proposal, repairs bounds, independently compiles and builds offline HTML',async()=>{
 let calls=0;
 const original=source();
 const srv=await local(async(req,res)=>{
  calls++;const b=await received(req);
  assert.equal(b.model,MODEL);
  assert.equal(b.think,false);
  reply(res,original);
 });
 const parent=tmp();
 try{
  const {summary}=await runB198SSingleSource({
   model:MODEL,port:srv.port,outDir:path.join(parent,'source-study'),
   timeoutSeconds:60
  });
  assert.equal(calls,1);
  assert.equal(summary.status,'SOURCE_COMPILED_AFTER_BOUNDS_ONLY_REPAIR_HUMAN_REVIEW_REQUIRED');
  assert.equal(summary.originalModelBoundsOnlyRepair.applied,true);
  assert.equal(summary.originalModelBoundsOnlyRepair.geometryElementsUnchanged,true);
  assert.equal(summary.originalModelMetadataOnlyRepair.applied,false);
  assert.equal(summary.savedModelSource.originalUnmodifiedResponseStored,true);
  assert.equal(summary.savedModelSource.candidateAfterSafeRepairStored,true);
  assert.equal(summary.savedModelSource.repairTraceStored,true);
  assert.equal(summary.safety.worldWrites,0);
  assert.equal(summary.modelCalls.length,1);
  const raw=fs.readFileSync(path.join(parent,'B198U_ORIGINAL_MODEL_RESPONSE.txt'),'utf8');
  assert.equal(raw,body(original));
  const after=fs.readFileSync(path.join(parent,'B198U_CORRECTED_CANDIDATE.txt'),'utf8');
  const design=readModelProposal(after).design;
  assert.deepEqual(design.elements,original.elements);
  const compiled=compileDesign(design);
  assert(verifyCompiled(design,compiled));
  assert.equal(summary.independentlyCompiled.sourceSha256,compiled.sourceSha256);
  const trace=JSON.parse(fs.readFileSync(
   path.join(parent,'B198U_SOURCE_REPAIR_TRACE.json')));
  assert.equal(trace.boundsRepair.applied,true);
  assert(fs.existsSync(path.join(parent,'source-study/c01/index.html')));
  // Re-analysis against SAME original requires zero further HTTP model calls.
  const replay=runB198UOfflineReplay({
   sourceFile:path.join(parent,'B198U_ORIGINAL_MODEL_RESPONSE.txt'),
   outDir:path.join(parent,'second-pass-offline')
  });
  assert.equal(replay.modelCallsMade,0);
  assert.equal(calls,1);
  assert.equal(replay.status,'OFFLINE_COMPILED_HUMAN_REVIEW_REQUIRED');
  assert.equal(replay.compiledSource.sourceSha256,summary.independentlyCompiled.sourceSha256);
  assert(fs.existsSync(path.join(parent,'second-pass-offline/c01_index.html')));
  assert.equal(replay.safety.worldWrites,0);
 }finally{await srv.close();fs.rmSync(parent,{recursive:true,force:true})}
});
test('bad model geometry is STILL a HOLD but RAW response stays available for future offline repairs',async()=>{
 let calls=0;const bad=source();
 bad.elements[0]={...bad.elements[0],shape:'invented-minecraft-teleport'};
 const srv=await local(async(req,res)=>{calls++;await received(req);reply(res,bad)});
 const parent=tmp();
 try{
  const {summary}=await runB198SSingleSource({
   model:MODEL,port:srv.port,outDir:path.join(parent,'source-study'),
   timeoutSeconds:60
  });
  assert.equal(calls,1);
  assert.equal(summary.status,'HOLD_NO_COMPILED_SOURCE');
  assert.equal(summary.independentlyCompiled,null);
  assert.equal(summary.savedModelSource.originalUnmodifiedResponseStored,true);
  assert.equal(fs.readFileSync(path.join(parent,'B198U_ORIGINAL_MODEL_RESPONSE.txt'),'utf8'),body(bad));
  assert.equal(summary.safety.worldWrites,0);
  const replay=runB198UOfflineReplay({
   sourceFile:path.join(parent,'B198U_ORIGINAL_MODEL_RESPONSE.txt'),
   outDir:path.join(parent,'offline-review')
  });
  assert.equal(replay.status,'HOLD_OFFLINE_VALIDATION');
  assert.equal(replay.modelCallsMade,0);
  assert.equal(calls,1);
 }finally{await srv.close();fs.rmSync(parent,{recursive:true,force:true})}
});
test('offline replay does not need model flag, localhost or a remote provider',()=>{
 const parsed=parseB198UReplayArgs(['--source','previous.txt','--out','new-out']);
 assert.equal(parsed.sourceFile,'previous.txt');
 assert.equal(parsed.outDir,'new-out');
 assert.throws(()=>parseB198UReplayArgs(['--model','fake']),
  /B198U_REPLAY_INVALID_FLAG/);
 assert.throws(()=>parseB198UReplayArgs(['--source','x']),
  /B198U_REPLAY_SOURCE_AND_OUTPUT_REQUIRED/);
});
