import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runE2QwenStudy,E2_QWEN_SYSTEM} from './r190-e2-qwen-study.mjs';
import {e2SyntheticResearchFacility} from './r190-e2-synthetic-fixture.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('E2 prompt explicitly distinguishes 2D pad arrays, 3D solids and 4D zones without inserting templates',()=>{
 const s=E2_QWEN_SYSTEM;
 for(const v of [
  'sourceDesign element origin is [x,y,z] (3 integers)',
  'programSpaces.zone is [x,z,width,depth] (4 integers)',
  'entrance.approachPad and entrance.arrivalPad are EACH [x,z] (exactly 2 integers)',
  'x+width<=bounds.width and z+depth<=bounds.depth',
  'wx+2<=x+width and wz+2<=z+depth',
  'they are NOT [x,y,z,w,d] cuboids',
  'a single-block-wide window is INVALID',
  'the host will neither infer nor repair it'
 ])assert(s.includes(v),'missing precise author contract: '+v);
 assert(s.includes('You are free to invent the architecture'));
 assert(s.includes('Return precisely ONE JSON object'));
});

test('One model-authored E2 source response is preserved and verified as genuine B143, ART stays HOLD',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-qwen-good-'));
 let called=0;
 try{
  const original=JSON.stringify(e2SyntheticResearchFacility());
  const result=await runE2QwenStudy({outRoot:root},{
   request:async({stage,onAttempt,onRaw,system,maxTokens,timeoutMs})=>{
    assert.equal(stage,'E2_ARCHITECTURE');
    assert.match(system,/author ALL solids/);
    assert.equal(maxTokens,5200);
    assert.equal(timeoutMs,360000);
    onAttempt();called++;
    onRaw(original,{finishReason:'stop'});
    return {raw:original};
   }});
  assert.equal(called,1);
  assert.equal(result.status,'SOURCE_READY_ART_HOLD');
  assert.equal(result.sourceReady,true);
  assert.equal(result.modelRequests,0);
  assert.equal(result.syntheticStageCalls,1);
  assert.equal(result.provenance,'TEST_DOUBLE_ONLY');
  assert.equal(result.modelAuthoredGeometry,'SYNTHETIC_FIXTURE_ONLY');
  assert.equal(result.modelOriginalSha256,sha(original));
  assert.equal(result.sourceVoxelCount>100,true);
  assert.equal(result.programSpaces,2);
  assert.equal(result.glazedOpenings,1);
  assert.equal(result.makecodeExported,false);
  assert.equal(result.worldWrites,0);
  assert.equal(result.humanArt,'NOT_REVIEWED');
  assert.equal(result.minecraftPlayerWalking,'NOT_TESTED');
  assert.equal(fs.readFileSync(path.join(result.dir,'QWEN_E2_ORIGINAL.txt'),'utf8'),original);
  assert(fs.existsSync(path.join(result.dir,result.sourceReportRelativePath)));
  assert(fs.existsSync(path.join(result.dir,result.viewerRelativePath)));
  assert.equal(fs.readdirSync(root).filter(x=>x.startsWith('E2-qwen-')).length,1);
  assert.equal(fs.existsSync(path.join(result.dir,'MAKECODE_EDUCATION.ts')),false);
  assert.doesNotMatch(E2_QWEN_SYSTEM,/model-authored-curved-roof/);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});
test('E2 saves one invalid authored original and source HOLD, no geometry substitutions',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-qwen-hold-'));
 let calls=0;
 try{
  const p=e2SyntheticResearchFacility();
  p.sourceDesign.elements=p.sourceDesign.elements.filter(e=>e.id!=='window-glass');
  const raw=JSON.stringify(p);
  const r=await runE2QwenStudy({outRoot:root},{
   request:async({onAttempt})=>{onAttempt();calls++;return {raw};}
  });
  assert.equal(calls,1);
  assert.equal(r.syntheticStageCalls,1);
  assert.equal(r.modelRequests,0);
  assert.equal(r.status,'SOURCE_HOLD');
  assert.equal(r.sourceReady,false);
  assert.match(r.reason,/E2_GLAZING_NOT_REAL_GLASS/);
  assert.equal(r.modelOriginalSha256,sha(raw));
  assert.equal(fs.readFileSync(path.join(r.dir,'QWEN_E2_ORIGINAL.txt'),'utf8'),raw);
  assert(fs.existsSync(path.join(r.dir,r.sourceReportRelativePath)));
  assert.equal(r.worldWrites,0);
  assert.equal(r.viewerRelativePath,undefined);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});
test('Truncated local E2 model answer is preserved before the attempt HOLDs, with no hidden retry',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-qwen-truncated-'));
 const partial='{"schema":"minecraftaibuilder-e2-authored-architecture-v1","sourceDesign":';
 let calls=0;
 try{
  const r=await runE2QwenStudy({outRoot:root},{
   request:async({onAttempt,onRaw})=>{
    onAttempt();calls++;
    onRaw(partial,{finishReason:'length'});
    throw Error('E1_TWO_STAGE_TRUNCATED');
   }});
  assert.equal(calls,1);
  assert.equal(r.status,'SOURCE_HOLD');
  assert.equal(r.rawModelOriginalPresent,true);
  assert.equal(r.modelOriginalSha256,sha(partial));
  assert.equal(r.modelFinishReason,'length');
  assert.match(r.reason,/TRUNCATED/);
  assert.equal(fs.readFileSync(path.join(r.dir,'QWEN_E2_ORIGINAL.txt'),'utf8'),partial);
  assert.equal(r.sourceReportRelativePath,null);
  assert.equal(r.automaticRetries,0);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});
test('Model setup failure cannot be reported as a successful real model call',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-qwen-no-request-'));
 try{
  const r=await runE2QwenStudy({outRoot:root},{
   request:async()=>{throw Error('E1_TWO_STAGE_LOCAL_MODEL_NOT_LISTED');}
  });
  assert.equal(r.modelRequests,0);
  assert.equal(r.syntheticStageCalls,0);
  assert.equal(r.sourceReady,false);
  assert.equal(r.rawModelOriginalPresent,false);
  assert.equal(r.worldWrites,0);
  assert.match(r.reason,/NOT_LISTED/);
  assert(!fs.existsSync(path.join(r.dir,'QWEN_E2_ORIGINAL.txt')));
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});

test('Single E2 handoff reproduces original and SHA without model calls or Minecraft writes',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-chat-handoff-'));
 try{
  const original=JSON.stringify(e2SyntheticResearchFacility());
  const r=await runE2QwenStudy({outRoot:root},{
   request:async({onAttempt,onRaw})=>{onAttempt();onRaw(original,{finishReason:'stop'});return {raw:original};}
  });
  const h=JSON.parse(fs.readFileSync(path.join(r.dir,'E2_CHAT_HANDOFF.json'),'utf8'));
  assert.equal(h.schema,'minecraftaibuilder-e2-chat-handoff-v1');
  assert.equal(h.originalModelText,original);
  assert.equal(h.originalModelSha256,sha(original));
  assert.equal(h.originalVerified,true);
  assert.equal(h.originalStillSavedSeparately,true);
  assert.equal(h.report.status,'SOURCE_READY_ART_HOLD');
  assert.equal(h.report.modelRequests,0);
  assert.equal(h.noNewModelCallsForHandoff,true);
  assert.equal(h.noMinecraftIO,true);
  assert.equal(fs.readFileSync(path.join(r.dir,'QWEN_E2_ORIGINAL.txt'),'utf8'),original);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('Malformed model reply remains exact and independently diagnosed in handoff',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-chat-partial-'));
 const raw='{"schema":"minecraftaibuilder-e2-authored-architecture-v1","sourceDesign":';
 let count=0;
 try{
  const r=await runE2QwenStudy({outRoot:root},{
   request:async({onAttempt,onRaw})=>{onAttempt();count++;onRaw(raw,{finishReason:'stop'});return {raw};}
  });
  const h=JSON.parse(fs.readFileSync(path.join(r.dir,'E2_CHAT_HANDOFF.json'),'utf8'));
  assert.equal(count,1);
  assert.equal(h.originalModelText,raw);
  assert.equal(h.originalVerified,true);
  assert.equal(h.report.status,'SOURCE_HOLD');
  assert(h.report.validationIssues.some(x=>x.code==='JSON_PARSE_HOLD'));
  assert.equal(h.report.automaticRetries,0);
  assert.equal(h.report.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('Preflight failure creates handoff without inventing model text',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-chat-no-model-'));
 try{
  const r=await runE2QwenStudy({outRoot:root},{
   request:async()=>{throw Error('E1_TWO_STAGE_LOCAL_MODEL_NOT_LISTED');}
  });
  const h=JSON.parse(fs.readFileSync(path.join(r.dir,'E2_CHAT_HANDOFF.json'),'utf8'));
  assert.equal(h.originalPresent,false);
  assert.equal(h.originalModelText,null);
  assert.equal(h.originalVerified,false);
  assert.equal(h.report.modelRequests,0);
  assert.equal(h.report.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
