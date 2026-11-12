/**
 * Research-only, non-default checkResourceSafety adapter for the EXISTING
 * r125-gatec-v3-1-stale-only.py Windows monitor sample format.
 *
 * It consumes real Windows RAM/commit/GPU sensor samples from a separate
 * monitor process, but NEVER returns SAFE_FOR_ONE_REQUEST. There is no
 * production ownership attestation, Qwen memory-peak calibration, or safe
 * resource threshold here. Reading any JSON file is NOT an OS attestation.
 *
 * No model, network, world, process termination, or new service in this file.
 * --windows-live only launches a fresh, test-owned V3.1 monitor process,
 * not an Ollama server. Never clear Gate C P1 based on this adapter.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const THIS=fileURLToPath(import.meta.url);
const ROOT=path.resolve(path.dirname(THIS),'../..');
const V31=path.join(ROOT,'scripts/research/r125-gatec-v3-1-stale-only.py');
const BRANCH='research/r125-v6-readonly-facade-diagnostic-20261111';
const HEAD_RE=/^[a-f0-9]{40}$/;
const NONCE_RE=/^[a-f0-9]{32}$/;
const MAX_SAMPLE_AGE_MS=3000;
const MAX_FILE_BYTES=8192;
const keys=['ramFreeMiB','commitHeadroomMiB','gpuTotalMiB',
            'gpuFreeMiB','sampleMs'];

const int=x=>Number.isSafeInteger(x)&&x>=0;
const hold=(reason,extra={})=>({
  status:'HOLD',
  reason,
  resourceSafetyCertified:false,
  independentMonitorActive:false,
  ownedServiceInKillOnCloseJob:false,
  sharedServiceIdle:false,
  productionMonitorIntegrated:false,
  inferenceMemoryPeakCalibrated:false,
  ...extra
});
const decode=(directory,name)=>{
  const full=path.join(directory,name);
  const stat=fs.statSync(full);
  if(!stat.isFile()||stat.size<=0||stat.size>MAX_FILE_BYTES)
    throw Error('INVALID_LOCAL_SAMPLE_SIZE');
  const data=JSON.parse(fs.readFileSync(full,'utf8'));
  if(!data||typeof data!=='object'||Array.isArray(data))
    throw Error('INVALID_LOCAL_SAMPLE_JSON');
  return data;
};

/**
 * Does NOT attest a live PID or a production Job. The nonce and PID are
 * provided by the process that started the monitor; values from files alone
 * cannot constitute production authorization. False on any uncertainty.
 *
 * The returned function has V7's checkResourceSafety({model,headSha,phase})
 * signature, but intentionally can only cause the V7 preflight to HOLD.
 */
export function createGateCResearchProbe({
  directory,expectedNonce,expectedMonitorPid,expectedHead,
  now=()=>Date.now(),maxAgeMs=MAX_SAMPLE_AGE_MS
}={}){
  if(typeof directory!=='string'||!path.isAbsolute(directory)||
     !NONCE_RE.test(expectedNonce??'')||
     !Number.isSafeInteger(expectedMonitorPid)||expectedMonitorPid<=0||
     !HEAD_RE.test(expectedHead??'')||
     typeof now!=='function'||!int(maxAgeMs)||maxAgeMs>3000)
    throw Error('RESEARCH_PROBE_CONFIGURATION_INVALID');
  let last=null;
  let fault=null;
  return async function checkResourceSafety({headSha}={}){
    if(fault) return hold('LATCHED_'+fault);
    if(headSha!==expectedHead)
      return hold('HEAD_MISMATCH');
    let session,sample;
    try {
      session=decode(directory,'session.json');
      sample=decode(directory,'sample.json');
    }catch {
      fault='SAMPLE_UNAVAILABLE';
      return hold(fault);
    }
    if(session.nonce!==expectedNonce||
       session.monitorPid!==expectedMonitorPid||
       sample.nonce!==expectedNonce||sample.pid!==expectedMonitorPid){
      fault='MONITOR_IDENTITY_MISMATCH';
      return hold(fault);
    }
    if(sample.state!=='ALIVE'){
      fault='MONITOR_NOT_ALIVE';
      return hold(fault);
    }
    const d=sample.data;
    if(!d||typeof d!=='object'||Array.isArray(d)||
       !Number.isSafeInteger(sample.seq)||sample.seq<1||
       !keys.every(k=>int(d[k]))||
       d.gpuTotalMiB<=0||d.gpuFreeMiB>d.gpuTotalMiB){
      fault='SENSOR_SAMPLE_INVALID';
      return hold(fault);
    }
    const instant=now();
    if(!Number.isSafeInteger(instant)||instant<d.sampleMs||
       instant-d.sampleMs>maxAgeMs){
      fault='SAMPLE_STALE_OR_FUTURE';
      return hold(fault);
    }
    if(last&&(sample.seq<=last.seq||d.sampleMs<=last.time)){
      fault='SAMPLE_NOT_ADVANCING';
      return hold(fault);
    }
    last={seq:sample.seq,time:d.sampleMs};
    // Sanitized research observations only. Never accept an asserted SAFE,
    // Job PID, or threshold from the local sample as proof of authorization.
    return hold('UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED',{
      researchSensorSampleObserved:true,
      researchSampleSequence:sample.seq,
      measuredAtEpochMs:d.sampleMs,
      observedResourcesMiB:{
        ramFree:d.ramFreeMiB,
        commitHeadroom:d.commitHeadroomMiB,
        gpuFree:d.gpuFreeMiB,
        gpuTotal:d.gpuTotalMiB
      }
    });
  };
}
const write=(dir,name,value)=>
  fs.writeFileSync(path.join(dir,name),JSON.stringify(value));
const sample=(nonce,pid,seq,ms,patch={})=>({
  nonce,pid,seq,state:'ALIVE',
  data:{ramFreeMiB:10000,commitHeadroomMiB:20000,
    gpuFreeMiB:14000,gpuTotalMiB:16303,sampleMs:ms,...patch}
});

async function offline(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-gatec-probe-'));
  const nonce='a'.repeat(32), pid=321, head='b'.repeat(40);
  const now=()=>2_000_000;
  const create=()=>createGateCResearchProbe({
    directory:temp,expectedNonce:nonce,expectedMonitorPid:pid,
    expectedHead:head,now});
  const call=probe=>probe({headSha:head,model:'qwen3:14b',
    phase:'DURING_INFERENCE'});
  let checks=0;
  const check=(v,reason)=>{
    assert.equal(v.status,'HOLD');assert.equal(v.reason,reason);
    assert.equal(v.resourceSafetyCertified,false);
    assert.equal(v.independentMonitorActive,false);
    checks++;
  };
  try{
    write(temp,'session.json',{nonce,monitorPid:pid});
    write(temp,'sample.json',sample(nonce,pid,1,1_999_900));
    let probe=create();
    check(await call(probe),'UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED');
    write(temp,'sample.json',sample(nonce,pid,2,1_999_950));
    check(await call(probe),'UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED');
    const old=await call(probe);
    check(old,'SAMPLE_NOT_ADVANCING');
    write(temp,'sample.json',sample(nonce,pid,3,1_999_980));
    check(await call(probe),'LATCHED_SAMPLE_NOT_ADVANCING');
    probe=create();
    check(await probe({headSha:'c'.repeat(40)}),'HEAD_MISMATCH');
    probe=create();
    write(temp,'sample.json',sample(nonce,pid,1,1_994_000));
    check(await call(probe),'SAMPLE_STALE_OR_FUTURE');
    write(temp,'sample.json',sample(nonce,pid,1,2_000_001));
    check(await call(create()),'SAMPLE_STALE_OR_FUTURE');
    write(temp,'sample.json',sample('d'.repeat(32),pid,1,1_999_900));
    check(await call(create()),'MONITOR_IDENTITY_MISMATCH');
    write(temp,'sample.json',sample(nonce,pid+1,1,1_999_900));
    check(await call(create()),'MONITOR_IDENTITY_MISMATCH');
    write(temp,'sample.json',{...sample(nonce,pid,1,1_999_900),
      state:'FAULT'});
    check(await call(create()),'MONITOR_NOT_ALIVE');
    write(temp,'sample.json',sample(nonce,pid,1,1_999_900,
      {ramFreeMiB:-1}));
    check(await call(create()),'SENSOR_SAMPLE_INVALID');
    write(temp,'sample.json',{...sample(nonce,pid,1,1_999_900),
      status:'SAFE_FOR_ONE_REQUEST',ownedServiceInKillOnCloseJob:true});
    check(await call(create()),'UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED');
    fs.writeFileSync(path.join(temp,'sample.json'),'{corrupt');
    check(await call(create()),'SAMPLE_UNAVAILABLE');
    fs.unlinkSync(path.join(temp,'sample.json'));
    check(await call(create()),'SAMPLE_UNAVAILABLE');
    assert.throws(()=>createGateCResearchProbe({
      directory:'relative',expectedNonce:nonce,
      expectedMonitorPid:pid,expectedHead:head}),
      /RESEARCH_PROBE_CONFIGURATION_INVALID/);
    checks++;
    assert.equal(requireDirectPythonExe('C:\\Python313\\python.exe'),
      'C:\\Python313\\python.exe');checks++;
    assert.equal(requireDirectPythonExe('C:\\Python313\\python3.13.exe'),
      'C:\\Python313\\python3.13.exe');checks++;
    for(const invalid of ['py.exe','py','python.exe',
      '.\\python.exe','\\\\host\\share\\python.exe',
      'C:\\Windows\\py.exe','C:\\Python\\python.exe --flag']){
      assert.throws(()=>requireDirectPythonExe(invalid),
        /DIRECT_PYTHON_PATH_REQUIRED/);checks++;
    }
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
  return {schema:'MAB_GATEC_RESOURCE_BRIDGE_RESEARCH_V1',
    status:'PASS_OFFLINE_NOT_WINDOWS',checks,
    v7CheckResourceSafetyCallable:true,
    researchLiveSensorIntegrationVerified:false,
    productionMonitorIntegrated:false,gateCP1:'HOLD',
    modelCalls:0,ollamaGetCalls:0,worldWrites:0};
}
const pause=t=>new Promise(r=>setTimeout(r,t));

/** A launcher such as py.exe owns a different PID from the Python child.
 * PID-based monitoring must start the *interpreter itself*, never a wrapper.
 * Reject indirect commands, network paths, aliases, and unknown executables.
 */
export function requireDirectPythonExe(candidate){
  if(typeof candidate!=='string'||candidate.trim()!==candidate||
     /[\r\n\0]/.test(candidate))
    throw Error('DIRECT_PYTHON_PATH_REQUIRED');
  const value=path.win32.normalize(candidate);
  if(!/^[a-zA-Z]:\\/.test(value)||
     !/^python(?:3(?:[0-9.]*)?)?\.exe$/i.test(path.win32.basename(value)))
    throw Error('DIRECT_PYTHON_PATH_REQUIRED');
  return value;
}
function resolveDirectPythonExe(){
  const opts={encoding:'utf8',timeout:12000,windowsHide:true};
  const indicated=process.env.MAB_PYTHON_EXE ||
    execFileSync('py.exe',['-3','-c','import sys;print(sys.executable)'],opts).trim();
  const python=requireDirectPythonExe(indicated);
  if(!fs.statSync(python).isFile())throw Error('DIRECT_PYTHON_NOT_FILE');
  const observed=execFileSync(python,
    ['-c','import sys;print(sys.executable)'],opts).trim();
  if(requireDirectPythonExe(observed).toLowerCase()!==python.toLowerCase())
    throw Error('DIRECT_PYTHON_IDENTITY_MISMATCH');
  return python;
}
async function windowsLive(expectedHead){
  if(process.platform!=='win32'||!HEAD_RE.test(expectedHead??'')){
    return {status:'HOLD',reason:'WINDOWS_AND_PINNED_HEAD_REQUIRED',gateCP1:'HOLD'};
  }
  try{
    const opts={encoding:'utf8',timeout:10000,windowsHide:true};
    const sha=execFileSync('git.exe',['-C',ROOT,'rev-parse','HEAD'],opts).trim();
    const b=execFileSync('git.exe',['-C',ROOT,'branch','--show-current'],opts).trim();
    const dirty=execFileSync('git.exe',['-C',ROOT,'status',
      '--porcelain=v1','--untracked-files=normal'],opts);
    if(sha!==expectedHead||b!==BRANCH||dirty!=='')
      return {status:'HOLD',reason:'PINNED_CLEAN_RESEARCH_HEAD_REQUIRED',gateCP1:'HOLD'};
  }catch{
    return {status:'HOLD',reason:'GIT_PIN_UNVERIFIED',gateCP1:'HOLD'};
  }
  let python;
  try{python=resolveDirectPythonExe();}
  catch{return {status:'HOLD',reason:'DIRECT_PYTHON_IDENTITY_UNVERIFIED',
    gateCP1:'HOLD',modelCalls:0,ollamaGetCalls:0,worldWrites:0};}
  // Resolve before creating temp artifacts: fail closed without leftovers.
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-gatec-bridge-live-'));
  const nonce=randomBytes(16).toString('hex');
  let mon=null,code='LIVE_SAMPLE_UNVERIFIED',seen=0,spawnError=false;
  try{
    write(temp,'session.json',{nonce});
    mon=spawn(python,[V31,'--role','monitor',
       '--folder',temp,'--nonce',nonce],
      {env:{...process.env,MAB_V31_PROBE_NONCE:nonce},
       windowsHide:true,stdio:'ignore'});
    mon.on('error',()=>{spawnError=true;});
    if(!Number.isSafeInteger(mon.pid)||mon.pid<=0)
      return {status:'HOLD',reason:'MONITOR_PROCESS_UNAVAILABLE',gateCP1:'HOLD'};
    write(temp,'session.json',{nonce,monitorPid:mon.pid});
    const probe=createGateCResearchProbe({
      directory:temp,expectedNonce:nonce,expectedMonitorPid:mon.pid,
      expectedHead});
    let previous=0;
    const deadline=Date.now()+15000;
    while(Date.now()<deadline&&seen<2){
      if(spawnError||mon.exitCode!==null||mon.signalCode!==null) {
        code='MONITOR_EARLY_EXIT';break;
      }
      let entry;
      try{entry=decode(temp,'sample.json');}catch{await pause(180);continue;}
      if(entry.seq<=previous){await pause(180);continue;}
      previous=entry.seq;
      if(entry.nonce===nonce&&entry.pid!==mon.pid){
        code='MONITOR_PROCESS_PID_DISAGREEMENT';break;
      }
      const value=await probe({headSha:expectedHead,model:'qwen3:14b',
        phase:'DURING_INFERENCE'});
      if(value.reason!=='UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED'){
        code='RESOURCE_PROBE_'+value.reason;break;
      }
      seen++;
    }
    if(seen===2)code='TWO_REAL_SENSOR_SAMPLES_DELIVERED_BUT_UNCALIBRATED';
    return {schema:'MAB_GATEC_RESOURCE_BRIDGE_RESEARCH_V1',
      status:seen===2?'RESEARCH_SENSOR_CALLBACK_PASS_NOT_MODEL_CLEARANCE':'HOLD',
      reason:code,observedSamples:seen,
      v7ResourceCallbackInvoked:seen>0,
      productionOwnershipAttested:false,
      resourceSafetyCertified:false,
      productionMonitorIntegrated:false,
      inferenceMemoryPeakCalibrated:false,
      gateCP1:'HOLD',modelCalls:0,ollamaGetCalls:0,
      worldWrites:0};
  }finally{
    if(mon&&Number.isSafeInteger(mon.pid)&&
       mon.exitCode===null&&mon.signalCode===null){
      const exited=new Promise(resolve=>mon.once('exit',resolve));
      mon.kill();
      await Promise.race([exited,pause(5000)]);
    }
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===THIS;
if(invoked){
  const args=process.argv.slice(2);
  try{
    const out=args.length===1&&args[0]==='--offline-tests'?
      await offline():
      args.length===2&&args[0]==='--windows-live'?
      await windowsLive(args[1]):{
        status:'HOLD',reason:'EXPLICIT_RESEARCH_TEST_MODE_REQUIRED',gateCP1:'HOLD'};
    console.log(JSON.stringify(out));
    if(!String(out.status).startsWith('PASS_')&&
       out.status!=='RESEARCH_SENSOR_CALLBACK_PASS_NOT_MODEL_CLEARANCE')
      process.exitCode=2;
  }catch{
    console.log(JSON.stringify({status:'HOLD',reason:'RESEARCH_TEST_EXCEPTION',
      gateCP1:'HOLD',modelCalls:0,ollamaGetCalls:0,worldWrites:0}));
    process.exitCode=2;
  }
}
