import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {R125_CASES,parseR125PilotArgs,preflightR125Ollama,runR125Pilot,
 classifyR125Cases} from './r125-pilot.mjs';

const root=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r125-local-pilot-'));
const tags=(names)=>async (url,options)=>{
 assert.equal(url,'http://127.0.0.1:11434/api/tags');
 assert.equal(options.method,'GET');
 return {ok:true,text:async()=>JSON.stringify({models:names.map(name=>({name}))})};
};
test('three original non-library prompts have distinct functional demands',()=>{
 assert.equal(R125_CASES.length,3);
 assert.equal(new Set(R125_CASES.map(x=>x.id)).size,3);
 assert.ok(R125_CASES.every(x=>x.prompt.length>50));
 assert.ok(R125_CASES.every(x=>!x.prompt.includes('図書館')));
});
test('local exact-model preflight performs only one read-only GET',async()=>{
 let calls=0;
 const res=await preflightR125Ollama({model:'qwen3.8:27b',
  fetcher:async (...args)=>{calls++;return tags(['qwen3.8:27b','gemma4:26b'])(...args);}});
 assert.equal(calls,1);
 assert.equal(res.status,'LOCAL_MODEL_LISTED');
 assert.equal(res.inferencePerformed,false);
 assert.equal(res.modelLoaded,false);
 assert.equal(res.worldWrites,0);
});
test('missing exact requested model blocks ALL generation, retains report',async t=>{
 const base=root();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 let attempts=0;
 const report=await runR125Pilot({model:'qwen3.8:27b',outDir:path.join(base,'pilot'),caseCount:3},{
  fetcher:tags(['gemma4:26b']),
  runSingle:async()=>{attempts++;throw Error('MUST_NOT_CALL');}
 });
 assert.equal(report.status,'HOLD_MODEL_NOT_INSTALLED');
 assert.equal(attempts,0);
 assert.equal(report.modelGenerationCalls,0);
 assert.equal(report.worldWrites,0);
 const saved=JSON.parse(fs.readFileSync(path.join(base,'pilot','R125_PILOT_REPORT.json'),'utf8'));
 assert.deepEqual(saved.caseResults,[]);
});
test('mocked runner classifies provenance as test double, never real Qwen success',async t=>{
 const base=root();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 let calls=0;
 const report=await runR125Pilot({model:'qwen3.8:27b',outDir:path.join(base,'pilot')},{
  fetcher:tags(['qwen3.8:27b']),
  runSingle:async args=>{
   calls++;assert.ok(args.prompt.includes('二階建て'));
   return {provider:'INJECTED_TEST_DOUBLE',modelId:args.model,
    modelCallCount:1,status:'SOURCE_CANDIDATE_HUMAN_REVIEW_REQUIRED',
    sourceReview:'B143_COMPILED_VERIFIED',sourceSha256:'a'.repeat(64),
    geometrySha256:'b'.repeat(64),occupiedVoxels:110,highRiskSourceFindings:0};
  }
 });
 assert.equal(calls,1);
 assert.equal(report.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(report.caseResults[0].modelAuthorship,'DECLARED_PROVIDER_ONLY');
 assert.equal(report.worldWrites,0);
});
test('three distinct live-labelled receipts remain uncategorized aesthetics/world',async t=>{
 const base=root();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const prompts=[];
 const report=await runR125Pilot({model:'gemma4:26b',outDir:path.join(base,'pilot'),caseCount:3},{
  fetcher:tags(['gemma4:26b']),
  runSingle:async args=>{
   prompts.push(args.prompt);
   assert.equal(args.timeoutMs,180000);
   assert.equal(args.reasoningEffort,'none');
   assert.equal(args.maxOutputTokens,4096);
   return {provider:'EXPLICIT_LOCAL_LOOPBACK',modelId:args.model,
    modelCallCount:1,status:'HOLD_SOURCE_GEOMETRY',sourceReview:'B143_COMPILED_VERIFIED',
    sourceSha256:'c'.repeat(64),geometrySha256:'d'.repeat(64),
    occupiedVoxels:250,highRiskSourceFindings:2};
  }
 });
 assert.equal(prompts.length,3);
 assert.equal(new Set(prompts).size,3);
 assert.equal(report.caseResults.length,3);
 assert.equal(report.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(report.testInjectionPresent,true);
 assert.equal(report.modelGenerationCalls,3);
 assert.ok(report.caseResults.every(x=>x.humanAesthetics==='NOT_REVIEWED'));
 assert.ok(report.caseResults.every(x=>x.minecraftWorld==='NOT_TESTED'));
});
test('invalid endpoint & output collisions are rejected before I/O',async t=>{
 assert.throws(()=>parseR125PilotArgs(['--model','qwen3.8:27b','--out','test',
  '--endpoint','https://api.example.com/v1/chat/completions']),
 /LOCAL_LOOPBACK_ENDPOINT_ONLY/);
 assert.throws(()=>parseR125PilotArgs(['--model','qwen3.8:27b','--out','test',
  '--cases','4']),/ONLY_ONE_OR_THREE_CASES/);
 const base=root();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 let calls=0;
 await assert.rejects(()=>runR125Pilot({model:'qwen3.8:27b',outDir:base},{
  fetcher:async()=>{calls++;return tags([])();}}),/OUTPUT_ALREADY_EXISTS/);
 assert.equal(calls,0);
});
test('malformed /api/tags response remains HOLD, no model request',async t=>{
 const base=root();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 let calls=0;
 const report=await runR125Pilot({model:'qwen3.8:27b',outDir:path.join(base,'pilot')},{
  fetcher:async()=>({ok:true,text:async()=>'{invalid'}),
  runSingle:async()=>{calls++;return null;}
 });
 assert.equal(report.status,'HOLD_PREFLIGHT');
 assert.equal(calls,0);
});


test('real local provider label does not turn failed source compilation into a ready report',async t=>{
 const base=root();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const f=path.join(base,'real-provider-failed');
 // Preflight is injected, so provenance remains test-only, but the receipt
 // must still be diagnosed independently of the later test-provider HOLD.
 const fakeCase={provider:'EXPLICIT_LOCAL_LOOPBACK',modelId:'qwen3:14b',
  modelCallCount:1,status:'HOLD_GENERATION_OR_REVIEW',
  reason:'B198A_CANDIDATE_REJECTED_AFTER_1_ATTEMPTS_INVALID_FORMAT',
  elapsedMs:11127,originalRawCaptured:true};
 const report=await runR125Pilot({model:'qwen3:14b',outDir:f},{
  fetcher:tags(['qwen3:14b']),runSingle:async()=>fakeCase
 });
 assert.equal(report.caseResults[0].status,'HOLD_GENERATION_OR_REVIEW');
 assert.equal(report.caseResults[0].reason,fakeCase.reason);
 assert.equal(report.caseResults[0].elapsedMs,11127);
 assert.equal(report.caseResults[0].originalRawCaptured,true);
 assert.equal(report.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 // Production equivalent without test injection must not be promoted, either.
 const sourceReview=report.caseResults[0].sourceReview;
 assert.equal(sourceReview,'HOLD');
});

test('human-review-ready is never inferred from a malformed or geometry-HOLD result',async t=>{
 const base=root();t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const valid={provider:'EXPLICIT_LOCAL_LOOPBACK',modelId:'qwen3:14b',
  modelCallCount:1,status:'SOURCE_CANDIDATE_HUMAN_REVIEW_REQUIRED',
  sourceReview:'B143_COMPILED_VERIFIED',sourceSha256:'a'.repeat(64),
  geometrySha256:'b'.repeat(64)};
 // Injection always forces provenance HOLD, even when the source fields are
 // otherwise well-formed. We verify the classifier also via its pure helper.
 assert.equal(classifyR125Cases([{
  status:'HOLD_GENERATION_OR_REVIEW',sourceReview:'HOLD',
  sourceSha256:null,geometrySha256:null
 }],1,false),'HOLD_GENERATION_OR_REVIEW');
 assert.equal(classifyR125Cases([{
  ...valid,status:'HOLD_SOURCE_GEOMETRY'
 }],1,false),'HOLD_SOURCE_GEOMETRY');
 assert.equal(classifyR125Cases([valid],1,false),
  'COMPARISON_SOURCE_RESULTS_READY_REVIEW_REQUIRED');
 assert.equal(classifyR125Cases([valid],3,false),'HOLD_INCOMPLETE');
 assert.equal(classifyR125Cases([valid],1,true),
  'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
});
