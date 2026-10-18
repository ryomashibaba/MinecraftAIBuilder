import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {parseB198KArgs,runB198KCli} from './b198k-local-comparison.mjs';
import {runB198KPairedStudy}
 from '../source/ai/b198k-paired-study.mjs';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {createB198ILocalPlanner}
 from '../source/ai/b198i-local-planner.mjs';

const home=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198p-timeouts-'));
const example=['--model','qwen3.8:27b','--out','fresh-pilot'];
test('slow local inference is configurable 30–900s, default pilot gets 360s',()=>{
 const a=parseB198KArgs(example);
 assert.equal(a.timeoutSeconds,360);
 assert.equal(a.stopOnTimeout,false);
 assert.equal(parseB198KArgs([...example,'--timeout-seconds','900']).timeoutSeconds,900);
 assert.equal(parseB198KArgs([...example,'--stop-on-timeout']).stopOnTimeout,true);
 for(const num of ['0','29','901','1e3','NaN']){
  assert.throws(()=>parseB198KArgs([...example,'--timeout-seconds',num]),
   /B198K_CLI_INVALID_--timeout-seconds/);
 }
 assert.equal(typeof createB198GLocalModelAdapter({
  model:'qwen3.8:27b',timeoutMs:900000}),'function');
 assert.equal(typeof createB198ILocalPlanner({
  model:'qwen3.8:27b',timeoutMs:900000}),'function');
 assert.throws(()=>createB198GLocalModelAdapter({
  model:'qwen3.8:27b',timeoutMs:900001}),/B198G_LOCAL_TIMEOUT_BOUNDS/);
 assert.throws(()=>createB198ILocalPlanner({
  model:'qwen3.8:27b',timeoutMs:900001}),/B198I_LOCAL_TIMEOUT_RANGE/);
});
test('explicit abort-stop cancels second unnecessary local model step, records true abort evidence and retains paired manifest',async()=>{
 const parent=home(),dest=path.join(parent,'study');
 let modelCalls=0,plans=0;
 const observed=[];
 try{
  const manifest=await runB198KPairedStudy({
   generator:async()=>{modelCalls++;throw Error('This operation was aborted')},
   planner:async()=>{plans++;throw Error('Not to be called')},
   modelId:'test-qwen-27b',
   outDir:dest,creationCount:1,includeRevisions:false,
   directAttempts:1,directedAttempts:2,directedTopologyRounds:0,
   stopOnTimeout:true,onModelCall:x=>observed.push(x)
  });
  assert.equal(modelCalls,1);
  assert.equal(plans,0);
  assert.equal(manifest.stopOnTimeoutApplied,true);
  assert.equal(manifest.providerRequestCounts.direct,1);
  assert.equal(manifest.providerRequestCounts.directedPlanning,0);
  assert.equal(manifest.timing.calls.length,1);
  assert.equal(manifest.timing.calls[0].outcome,'ABORT_OR_TIMEOUT');
  assert.equal(manifest.timing.timeoutOrAbortCount,1);
  assert.equal(manifest.timing.calls[0].arm,'direct');
  assert.equal(manifest.timing.calls[0].phase,'creation');
  assert(Number.isFinite(manifest.timing.calls[0].durationMs));
  assert.deepEqual(observed.map(e=>e.event),['START','END']);
  const c=manifest.cases.find(c=>c.caseId==='c01');
  const records=[c.armARecord,c.armBRecord];
  assert(records.some(r=>r.status==='NOT_RUN_PRIOR_ARM_TIMEOUT'));
  assert(records.some(r=>r.status==='MODEL_OR_SOURCE_HOLD'));
  assert.equal(manifest.counts.directlyComparableWithBothSources,0);
  assert.equal(manifest.crossArmAutomaticWinner,null);
  assert.equal(manifest.safety.worldWrites,0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dest,
   'B198K_PAIRED_SOURCE_COMPARISON.json'),'utf8')),manifest);
 }finally{fs.rmSync(parent,{recursive:true,force:true})}
});
test('without stop-on-timeout, the original comparison still attempts both ways, with real timings and no fictitious model results',async()=>{
 const parent=home(),dest=path.join(parent,'compare');
 let invoked=0,planned=0;
 try{
  const out=await runB198KPairedStudy({
   generator:async()=>{invoked++;throw Error('This operation was aborted')},
   planner:async()=>{planned++;throw Error('This operation was aborted')},
   outDir:dest,modelId:'demo-abort',creationCount:1,includeRevisions:false,
   directAttempts:1,directedAttempts:1,directedTopologyRounds:0,
   stopOnTimeout:false
  });
  assert.equal(invoked,1);
  assert.equal(planned,1);
  assert.equal(out.timing.timeoutOrAbortCount,2);
  assert.equal(out.providerRequestCounts.directedPlanning,1);
  assert.equal(out.timing.calls.length,2);
  assert.equal(out.counts.directlyComparableWithBothSources,0);
  assert.equal(out.trueIndependentHumanPreferenceMeasured,false);
 }finally{fs.rmSync(parent,{recursive:true,force:true})}
});
