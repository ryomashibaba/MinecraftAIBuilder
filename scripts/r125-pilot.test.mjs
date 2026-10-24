import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {R125_CASES,parseR125PilotArgs,preflightR125Ollama,runR125Pilot} from './r125-pilot.mjs';

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
   assert.equal(args.timeoutMs,300000);
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
