/** R190-Y all fake; NO actual model, provider, remote or Minecraft. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseR190YArgs,runR190YTrial} from './r190y-comparison-pilot.mjs';
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r190y-offline-'));
const sha='a'.repeat(64);
const fakeBaseline=directory=>()=>({directory,rawSha256:sha,model:'qwen3:14b'});
test('Y default is saved-source comparison ONLY, with no model runner call',async()=>{
 const root=temp();let calls=0;
 try{
  const from=path.join(root,'baseline');fs.mkdirSync(from);
  const result=await runR190YTrial([],{
   baseline:fakeBaseline(from),
   runS:()=>{calls++;throw Error('DO_NOT_RUN')},
   runW:()=>{calls++;throw Error('DO_NOT_RUN')},
   compare:opts=>{assert.deepEqual(opts,{from});
    return {status:'HOLD_SAVED_REAL_MODEL_RESULTS_MISSING'};}
  });
  assert.equal(calls,0);
  assert.equal(result.mode,'SAVED_ONLY');
  assert.equal(result.modelCalls,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.constructionApproved,false);
  assert.equal(result.gates.length,9);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('Y explicit opt-in reuses S/W and compares the two exact returned directories',async()=>{
 const root=temp(),calls=[];
 try{
  const from=path.join(root,'baseline');
  const s=path.join(root,'S'),w=path.join(root,'W');
  [from,s,w].forEach(x=>fs.mkdirSync(x));
  const out=await runR190YTrial(['--run-missing'],{
   baseline:fakeBaseline(from),
   runS:(args,options)=>{
    assert.deepEqual(args,['--from',from]);
    assert.equal(options.transport,'openai');
    calls.push('S');return {directory:s,status:'HOLD_SPATIAL_REVIEW',modelCalls:1};},
   runW:args=>{
    assert.deepEqual(args,['--from',from]);
    calls.push('W');return {directory:w,status:'B143_COMPARABLE_ART_HOLD',modelCalls:2};},
   compare:args=>{
    assert.deepEqual(args,{from,s,w});
    calls.push('X');return {status:'THREE_SAVED_B143_SOURCES_COMPARABLE_ART_HOLD',
     directory:path.join(root,'comparison'),report:'R190X_OFFLINE_COMPARE.json'};}
  });
  assert.deepEqual(calls,['S','W','X']);
  assert.equal(out.modelCallsReportedByCompletedRunners,3);
  assert.equal(out.modelCallUpperBound,3);
  assert.equal(out.quality,'NOT_CERTIFIED');
  assert.equal(out.worldContacts,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('Y no automatic retry and no W inference after a damaged S archive',async()=>{
 const root=temp();let wCalls=0,compareCalls=0;
 try{
  const from=path.join(root,'baseline');fs.mkdirSync(from);
  await assert.rejects(runR190YTrial(['--run-missing'],{
   baseline:fakeBaseline(from),runS:()=>{throw Error('R190S_PRIOR_EVIDENCE_TAMPERED')},
   runW:()=>{wCalls++;return {}},
   compare:()=>{compareCalls++;return {}}}),
   /R190Y_S_SOURCE_OR_PROVIDER_HOLD_/);
  assert.equal(wCalls,0);
  assert.equal(compareCalls,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('Y unsafe or malformed arguments never authorize inference',()=>{
 assert.deepEqual(parseR190YArgs([]),{from:null,runMissing:false});
 assert.deepEqual(parseR190YArgs(['--from','C:\\existing']),
  {from:'C:\\existing',runMissing:false});
 assert.throws(()=>parseR190YArgs(['--run-missing','--run-missing']),/R190Y_ARGUMENTS/);
 assert.throws(()=>parseR190YArgs(['--fresh']),/R190Y_ARGUMENTS/);
});
test('Y Windows launcher requires explicit C/G/N and canonical checkout',()=>{
 const cmd=fs.readFileSync(new URL('../RUN_R190Y_COMPARE_ALL.cmd',import.meta.url),'utf8');
 assert.match(cmd,/Projects\\MinecraftAIBuilder/);
 assert.match(cmd,/choice \/C CGN/);
 assert.match(cmd,/--run-missing/);
 assert.match(cmd,/r190y-comparison-pilot\.mjs/);
 assert.doesNotMatch(cmd,/git clone|git pull|git reset|ollama pull|npm install/i);
 // C must never inherit --run-missing from Windows command-line arguments.
 assert.match(cmd,/if not "%~1"=="" goto :arguments/);
 assert.match(cmd,/^node\.exe "%runner%"$/m);
 assert.match(cmd,/^node\.exe "%runner%" --run-missing$/m);
 assert.doesNotMatch(cmd,/node\.exe[^\r\n]*%\*/);
 assert.match(cmd,/:arguments\r?\necho HOLD:/);
});
