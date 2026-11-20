import test from 'node:test';
import assert from 'node:assert/strict';
import {runR125ArchitecturePlanOwned,verifyOwnedArchitectureSample}
 from './r125-local-architecture-plan-owned.mjs';
import {runR125LocalArchitecturePlan} from './r125-local-architecture-plan-run.mjs';

test('the unowned ArchitecturePlan runner cannot POST through the shared default transport',async()=>{
 await assert.rejects(runR125LocalArchitecturePlan({
  model:'qwen3:14b',prompt:'entry.shelterDepth: 3',outDir:'unused'
 }),/OWNED_WINDOWS_ONE_SHOT_REQUIRED/);
});

test('ArchitecturePlan stays POST-free and stops its owned service without calibrated Qwen clearance',async()=>{
 const calls=[];
 const controller={servicePid:5001,supervisorPid:5000,monitorPid:4999,
  monitorId:'a'.repeat(32),port:11435,killOnCloseJob:true,
  async checkResourceSafety(){calls.push('sample');return {
   status:'HOLD',reason:'UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED',
   resourceSafetyCertified:false,independentMonitorActive:true,
   monitorHeartbeatEpochMs:Date.now(),monitorSequence:7,
   ownedServicePort:11435,ownedServicePid:5001,
   ownedServiceInKillOnCloseJob:true,supervisorPid:5000,
   monitorPid:4999,monitorId:'a'.repeat(32),sharedServiceIdle:null,
   measuredAtEpochMs:Date.now()};},
  async stop(reason){calls.push(reason);return {
   ownerStopConfirmed:true,monitorStopConfirmed:true};}};
 let runnerCalls=0,fetchCalls=0;
 const result=await runR125ArchitecturePlanOwned({
  model:'qwen3:14b',prompt:'entry.shelterDepth: 3 の公開建築',
  outDir:'unused',repairOnce:false
 },{controller,runner:async()=>{runnerCalls++;},
  fetcher:async()=>{fetchCalls++;}});
 assert.equal(result.status,'HOLD');
 assert.equal(result.reason,'UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED');
 assert.equal(result.modelPostCount,0);
 assert.equal(result.ownedServiceStopConfirmed,true);
 assert.equal(result.monitorStopConfirmed,true);
 assert.deepEqual(result.BuildPlan,{operations:[]});
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.equal(runnerCalls,0);
 assert.equal(fetchCalls,0);
 assert.deepEqual(calls,['sample','UNCALIBRATED_PRE_POST_HOLD']);
});

test('a fresh independent sensor sample remains HOLD without model peak calibration',()=>{
 const now=2_000_000;
 const result=verifyOwnedArchitectureSample({
  session:{nonce:'b'.repeat(32),monitorPid:8002},
  sample:{nonce:'b'.repeat(32),pid:8002,seq:3,state:'ALIVE',data:{
   ramFreeMiB:9000,commitHeadroomMiB:20000,gpuTotalMiB:16303,
   gpuFreeMiB:15000,sampleMs:now}},
  owner:{port:11435,servicePid:8003,supervisorPid:8001,killOnCloseJob:true},
  headSha:'c'.repeat(40),previousSequence:2,now});
 assert.equal(result.independentMonitorActive,true);
 assert.equal(result.ownedServiceInKillOnCloseJob,true);
 assert.equal(result.status,'HOLD');
 assert.equal(result.resourceSafetyCertified,false);
 assert.equal(result.reason,'QWEN_PEAK_CALIBRATION_REQUIRED');
});
