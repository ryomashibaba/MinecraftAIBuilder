#!/usr/bin/env python3
"""Windows-only dummy integration: owned Windows Job and separate monitor.

Zero model/Ollama/PRIVATE/Minecraft access. Not model or Gate C clearance.
Every process checked or terminated was created by this test.
"""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import uuid

SCHEMA='MAB_V10_WINDOWS_JOB_MONITOR_LINK_V2'
FLAGS=getattr(subprocess,'CREATE_NO_WINDOW',0)
SAFE={'OWNER_MODULE_UNAVAILABLE','WORKER_DESCENDANTS_NOT_OBSERVED',
      'OWNED_WORKER_NOT_RUNNING','MONITOR_NOT_OBSERVED',
      'MONITOR_NOT_ADVANCING','WORKER_NOT_ADVANCING',
      'MONITOR_FAULT_NOT_DETECTED','OWNED_TREE_NOT_STOPPED',
      'OUTSIDE_JOB_SIBLING_STOPPED',
      'V7_BRIDGE_NODE_UNAVAILABLE','V7_BRIDGE_OWNED_WORKER_MISSING',
      'V7_BRIDGE_POST_NOT_STARTED','V7_BRIDGE_STOP_NOT_DELIVERED',
      'V7_BRIDGE_STOP_IDENTITY_INVALID','V7_BRIDGE_MONITOR_TRIP_MISSING',
      'V7_BRIDGE_OWNED_TREE_NOT_STOPPED','V7_BRIDGE_SIBLING_STOPPED',
      'V7_BRIDGE_RUNNER_RESULT_UNVERIFIED','V7_BRIDGE_RUNNER_FAILED',
      'V7_BRIDGE_WORKER_STILL_ALIVE'}
def receipt(status='HOLD',reason='NOT_RUN',phase='INIT',trip=False,death=False,v7=False):
    passed=status=='WINDOWS_JOB_MONITOR_LINK_PASS_NOT_MODEL_CLEARANCE'
    return {'schema':SCHEMA,'status':status,'reason':reason,
            'failurePhase':phase if not passed else 'NONE',
            'injectedMonitorTripStopsOwnedTree':trip,
            'monitorDeathStopsOwnedTree':death,
            'injectedV7StopCallbackClosesOwnedJob':v7,
            'realWindowsJobCombinedWithSeparateMonitor':passed,
            'unrelatedSiblingPreserved':passed,
            'realResourceSensorVerifiedByThisTest':False,
            'realInferenceStopVerified':False,'inferenceMemoryPeakCalibrated':False,
            'gateCP1':'HOLD','modelCalls':0,'ollamaGetCalls':0,
            'networkCalls':0,'worldWrites':0,'privateRawIncluded':False}
def atomic_json(path,value):
    tmp=path.with_name(path.name+'.writing')
    tmp.write_text(json.dumps(value,separators=(',',':')),encoding='utf-8')
    # A Windows reader can transiently block rename; retry only the rename.
    for i in range(36):
        try:
            os.replace(tmp,path)
            return
        except PermissionError:
            if i==35: raise
            time.sleep(.015)
def read_json(path):
    try:
        v=json.loads(path.read_text(encoding='utf-8'))
        return v if isinstance(v,dict) else None
    except (OSError,ValueError):
        return None
def until(fn,seconds=8):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        v=fn()
        if v: return v
        time.sleep(.04)
    return None
def check(condition,reason):
    if not condition: raise RuntimeError(reason)
def worker(folder):
    child=subprocess.Popen([sys.executable,'-c','import time;time.sleep(85)'],
                           creationflags=FLAGS)
    atomic_json(folder/'worker-pids.json',{'pids':[os.getpid(),child.pid]})
    n=0
    while True:
        n+=1
        atomic_json(folder/'worker.json',{'seq':n,'timeMs':time.time_ns()//1000000})
        time.sleep(.10)
def monitor(folder,nonce):
    n=0
    while True:
        n+=1
        fault=(folder/'fault.flag').exists()
        atomic_json(folder/'monitor.json',
                    {'pid':os.getpid(),'nonce':nonce,'seq':n,
                     'timeMs':time.time_ns()//1000000,
                     'state':'FAULT' if fault else 'ALIVE'})
        if fault: return
        time.sleep(.13)
def owner_module():
    p=Path(__file__).resolve().with_name('r125-windows-owned-process.py')
    check(p.is_file(),'OWNER_MODULE_UNAVAILABLE')
    spec=importlib.util.spec_from_file_location('mab_owned_windows_job',str(p))
    check(spec is not None and spec.loader is not None,'OWNER_MODULE_UNAVAILABLE')
    m=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    check(hasattr(m,'OwnedProcessTree'),'OWNER_MODULE_UNAVAILABLE')
    return m
def test_mode(mod,root,mode,stage):
    folder=root/mode
    folder.mkdir()
    job=mon=sibling=None
    handles=[]
    stage[0]=mode+':START'
    try:
        sibling=subprocess.Popen([sys.executable,'-c','import time;time.sleep(85)'],
                                 creationflags=FLAGS)
        stage[0]=mode+':JOB_START'
        job=mod.OwnedProcessTree()
        job.start(str(Path(sys.executable).resolve()),
                  [str(Path(__file__).resolve()),'--worker',str(folder)])
        stage[0]=mode+':MONITOR_START'
        nonce=uuid.uuid4().hex
        mon=subprocess.Popen([str(Path(sys.executable).resolve()),
                              str(Path(__file__).resolve()),'--monitor',
                              str(folder),nonce],
                             stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL,creationflags=FLAGS)
        stage[0]=mode+':WORKER_OBSERVE'
        w=until(lambda:read_json(folder/'worker-pids.json'))
        check(w and isinstance(w.get('pids'),list) and len(w['pids'])==2,
              'WORKER_DESCENDANTS_NOT_OBSERVED')
        stage[0]=mode+':HANDLE_PIN'
        for pid in w['pids']:
            handles.append(mod.checked(mod.open_process(0x00100000,False,int(pid))))
        check(all(mod.wait_process(h,0)==258 for h in handles),
              'OWNED_WORKER_NOT_RUNNING')
        stage[0]=mode+':MONITOR_OBSERVE'
        def current():
            d=read_json(folder/'monitor.json')
            return d if d and d.get('nonce')==nonce and d.get('pid')==mon.pid and d.get('state')=='ALIVE' else None
        first=until(current)
        check(first,'MONITOR_NOT_OBSERVED')
        stage[0]=mode+':MONITOR_ADVANCE'
        check(until(lambda:(lambda d:d if d and d.get('seq',0)>first.get('seq',0)
                     and d.get('timeMs',0)>first.get('timeMs',0) else None)(current())),
              'MONITOR_NOT_ADVANCING')
        stage[0]=mode+':WORKER_ADVANCE'
        first_worker=until(lambda:read_json(folder/'worker.json'))
        check(first_worker,'WORKER_NOT_ADVANCING')
        check(until(lambda:(lambda d:d if d and d.get('seq',0)>first_worker.get('seq',0)
                     else None)(read_json(folder/'worker.json'))),
              'WORKER_NOT_ADVANCING')
        stage[0]=mode+':FAULT_INJECTION'
        if mode=='injected-trip':
            (folder/'fault.flag').touch(exist_ok=False)
        else:
            mon.kill()
            mon.wait(timeout=5)
        stage[0]=mode+':FAULT_DETECTION'
        def fault_seen():
            d=read_json(folder/'monitor.json')
            if mode=='monitor-death':
                # This case deliberately terminated the separate monitor.
                return mon.poll() is not None
            # A simple process crash is NOT proof that the injected fault was
            # delivered: require an authenticated FAULT report in this case.
            return bool(d and d.get('nonce')==nonce and
                        d.get('pid')==mon.pid and d.get('state')=='FAULT')
        check(until(fault_seen,6),'MONITOR_FAULT_NOT_DETECTED')
        stage[0]=mode+':OWNED_STOP'
        job.close()
        job=None
        check(all(mod.wait_process(h,5000)==0 for h in handles),
              'OWNED_TREE_NOT_STOPPED')
        stage[0]=mode+':SIBLING_PRESERVATION'
        check(sibling.poll() is None,'OUTSIDE_JOB_SIBLING_STOPPED')
        return True
    finally:
        if job is not None: job.close()
        if mon is not None and mon.poll() is None:
            mon.terminate()
            mon.wait(timeout=5)
        if sibling is not None and sibling.poll() is None:
            sibling.terminate()
            sibling.wait(timeout=5)
        for h in handles: mod.close_handle(h)

# Research-only integrated contract. A REAL Windows Job contains a dummy
# Python worker. The production V7 JavaScript runner sees only injected
# CI/transport/resource values. No native model, Ollama, HTTP or world writes.
# Proves a V7 stopOwnedService request can reach the Python-owned Job; does
# NOT prove ownership of a genuine Ollama service or independent OS watchdog.
V7_BRIDGE_JS = r'''
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const env=process.env, folder=env.MAB_V10_BRIDGE_FOLDER;
const nonce=env.MAB_V10_BRIDGE_NONCE;
const sha=env.MAB_V10_BRIDGE_HEAD;
const workerPid=Number(env.MAB_V10_BRIDGE_WORKER_PID);
const {runV7PrivateOnce}=await import(pathToFileURL(env.MAB_V10_V7_RUNNER).href);
const atomic=(name,value)=>fs.writeFileSync(path.join(folder,name),
  JSON.stringify(value),{flag:'wx'});
const response=data=>({ok:true,text:async()=>JSON.stringify(data)});
const checks=['R125 V4D Local Author Bridge — INJECTED TEST ONLY',
  'Education-first offline QA'];
const ciFetcher=async()=>({ok:true,json:async()=>({total_count:2,
  workflow_runs:checks.map((name,i)=>({name,id:i+1,head_sha:sha,
    status:'completed',conclusion:'success',event:'push',
    path:i===0?'.github/workflows/r125-v4d-local-author-bridge.yml':
      '.github/workflows/qa.yml'}))})});
let posts=0,stopCalls=0;
const resources=async({phase}={})=>{
  let m;
  try{m=JSON.parse(fs.readFileSync(path.join(folder,'monitor.json'),'utf8'));}
  catch{return {status:'HOLD_MONITOR_READ_FAILED'};}
  if(m.pid!==Number(env.MAB_V10_BRIDGE_MONITOR_PID)||
     m.nonce!==nonce||m.state!=='ALIVE')
    return {status:'HOLD_MONITOR_TRIPPED',measuredAtEpochMs:Date.now()};
  return {status:'SAFE_FOR_ONE_REQUEST',measuredAtEpochMs:Date.now(),
    ownedServicePort:11435,ownedServicePid:workerPid,
    ownedServiceInKillOnCloseJob:true,sharedServiceIdle:true};
};
const modelFetcher=async(_url,req)=>{
  if(req.method==='GET')return response({models:[{name:'qwen3:14b'}]});
  if(req.method!=='POST')throw Error('UNEXPECTED_SYNTHETIC_TRANSPORT');
  posts++;
  atomic('v7-post-ready.json',{nonce,posts});
  return new Promise((resolve,reject)=>{
    const rejectOnAbort=()=>reject(Error('TEST_ABORT'));
    if(req.signal.aborted)rejectOnAbort();
    else req.signal.addEventListener('abort',rejectOnAbort,{once:true});
  });
};
const stopOwnedService=async({headSha,reason,expectedPort,expectedPid})=>{
  stopCalls++;
  if(stopCalls!==1||headSha!==sha||reason!=='RESOURCE_MONITOR_HOLD'||
     expectedPort!==11435||expectedPid!==workerPid)return {accepted:false};
  atomic('v7-stop.json',{nonce,headSha,reason,expectedPort,expectedPid});
  return {accepted:true};
};
let status='HOLD_BRIDGE_NOT_STARTED',stopRequest=false,accepted=false,
  aborted=false,worldWrites=-1,attempts=-1;
try{
  const result=await runV7PrivateOnce({model:'qwen3:14b',headSha:sha,
    authorMode:'civic-v6',ownedServiceOrigin:'http://127.0.0.1:11435',
    outDir:path.join(folder,'injected-private'),checkResourceSafety:resources,
    stopOwnedService},{ciFetcher,headReader:()=>sha,modelFetcher,timeoutMs:10000});
  status=result.status;
  stopRequest=result.ownedStopRequestDispatched;
  accepted=result.ownedStopRequestAcceptedByCallback;
  aborted=result.clientAbortSignaled;
  worldWrites=result.worldWrites;attempts=result.modelGenerationAttempts;
}catch{
  status='HOLD_BRIDGE_RUNNER_EXCEPTION';
}
atomic('v7-result.json',{nonce,status,stopRequest,accepted,aborted,
  worldWrites,attempts,posts,stopCalls,nativeModelCalls:0,
  networkCalls:0,ollamaCalls:0});
process.exitCode=(status==='HOLD_MONITOR_INTERRUPTED'&&
  stopRequest===true&&accepted===true&&aborted===true&&
  worldWrites===0&&attempts===1&&posts===1&&stopCalls===1)?0:2;
'''

def v7_callback_mode(mod, root, stage):
    folder=root/'v7-injected-stop-bridge'
    folder.mkdir()
    job=mon=sibling=node_proc=None
    handles=[]
    nonce=uuid.uuid4().hex
    sha='a'*40  # TEST-ONLY CI identity; NEVER claims actual-head clearance.
    try:
        stage[0]='V7_BRIDGE:OWNED_START'
        sibling=subprocess.Popen([sys.executable,'-c',
                                  'import time;time.sleep(85)'],
                                 creationflags=FLAGS)
        job=mod.OwnedProcessTree()
        job.start(str(Path(sys.executable).resolve()),
                  [str(Path(__file__).resolve()),'--worker',str(folder)])
        w=until(lambda:read_json(folder/'worker-pids.json'))
        check(w and isinstance(w.get('pids'),list) and len(w['pids'])==2,
              'V7_BRIDGE_OWNED_WORKER_MISSING')
        for pid in w['pids']:
            handles.append(mod.checked(mod.open_process(0x00100000,False,int(pid))))
        check(all(mod.wait_process(h,0)==258 for h in handles),
              'V7_BRIDGE_WORKER_STILL_ALIVE')
        stage[0]='V7_BRIDGE:INDEPENDENT_MONITOR'
        mon=subprocess.Popen([str(Path(sys.executable).resolve()),
                              str(Path(__file__).resolve()),'--monitor',
                              str(folder),nonce],
                             stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL,creationflags=FLAGS)
        check(until(lambda:(lambda d:d if d and d.get('nonce')==nonce
              and d.get('pid')==mon.pid and d.get('state')=='ALIVE'
              else None)(read_json(folder/'monitor.json'))),
              'MONITOR_NOT_OBSERVED')
        stage[0]='V7_BRIDGE:START_INJECTED_NODE'
        node=shutil.which('node.exe')
        check(node is not None, 'V7_BRIDGE_NODE_UNAVAILABLE')
        env=dict(os.environ,MAB_V10_BRIDGE_FOLDER=str(folder),
                 MAB_V10_BRIDGE_NONCE=nonce,MAB_V10_BRIDGE_HEAD=sha,
                 MAB_V10_BRIDGE_WORKER_PID=str(w['pids'][0]),
                 MAB_V10_BRIDGE_MONITOR_PID=str(mon.pid),
                 MAB_V10_V7_RUNNER=str(Path(__file__).resolve().with_name(
                                      'r125-v7-private-once.mjs')))
        node_proc=subprocess.Popen([node,'--input-type=module','--eval',
                                    V7_BRIDGE_JS],env=env,
                                   stdin=subprocess.DEVNULL,
                                   stdout=subprocess.DEVNULL,
                                   stderr=subprocess.DEVNULL,creationflags=FLAGS)
        stage[0]='V7_BRIDGE:WAIT_SYNTHETIC_POST'
        ready=until(lambda:read_json(folder/'v7-post-ready.json'),8)
        check(ready and ready.get('nonce')==nonce and ready.get('posts')==1,
              'V7_BRIDGE_POST_NOT_STARTED')
        stage[0]='V7_BRIDGE:TRIGGER_MONITOR_FAULT'
        (folder/'fault.flag').touch(exist_ok=False)
        check(until(lambda:(lambda d:d if d and d.get('nonce')==nonce and
              d.get('pid')==mon.pid and d.get('state')=='FAULT' else None)(
              read_json(folder/'monitor.json')),5),
              'V7_BRIDGE_MONITOR_TRIP_MISSING')
        stage[0]='V7_BRIDGE:OWNED_STOP_REQUEST'
        signal=until(lambda:read_json(folder/'v7-stop.json'),7)
        check(signal is not None, 'V7_BRIDGE_STOP_NOT_DELIVERED')
        check(signal=={'nonce':nonce,'headSha':sha,
              'reason':'RESOURCE_MONITOR_HOLD','expectedPort':11435,
              'expectedPid':w['pids'][0]},
              'V7_BRIDGE_STOP_IDENTITY_INVALID')
        stage[0]='V7_BRIDGE:CLOSE_OWNED_JOB'
        job.close()
        job=None
        check(all(mod.wait_process(h,5000)==0 for h in handles),
              'V7_BRIDGE_OWNED_TREE_NOT_STOPPED')
        check(sibling.poll() is None, 'V7_BRIDGE_SIBLING_STOPPED')
        stage[0]='V7_BRIDGE:VERIFY_RUNNER_RECEIPT'
        r=until(lambda:read_json(folder/'v7-result.json'),5)
        check(r is not None, 'V7_BRIDGE_RUNNER_RESULT_UNVERIFIED')
        check(node_proc.wait(timeout=5)==0 and
              r.get('nonce')==nonce and
              r.get('status')=='HOLD_MONITOR_INTERRUPTED' and
              r.get('stopRequest') is True and
              r.get('accepted') is True and
              r.get('aborted') is True and
              r.get('worldWrites')==0 and r.get('attempts')==1 and
              r.get('posts')==1 and r.get('stopCalls')==1 and
              r.get('nativeModelCalls')==0 and
              r.get('networkCalls')==0 and r.get('ollamaCalls')==0,
              'V7_BRIDGE_RUNNER_FAILED')
        return True
    finally:
        if job is not None: job.close()
        for p in (node_proc,mon,sibling):
            if p is not None and p.poll() is None:
                p.terminate()
                try:p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    p.kill();p.wait(timeout=5)
        for h in handles:mod.close_handle(h)

def main():
    if len(sys.argv)==3 and sys.argv[1]=='--worker':
        worker(Path(sys.argv[2])); return 0
    if len(sys.argv)==4 and sys.argv[1]=='--monitor' and len(sys.argv[3])==32:
        monitor(Path(sys.argv[2]),sys.argv[3]); return 0
    if sys.argv[1:]!=['--selftest']:
        print(json.dumps(receipt(reason='SELFTEST_ONLY'))); return 2
    if os.name!='nt':
        print(json.dumps(receipt(reason='WINDOWS_REQUIRED'))); return 2
    stage=['OWNER_IMPORT']
    trip=death=v7=False
    root=Path(tempfile.mkdtemp(prefix='mab-v10-job-monitor-'))
    try:
        mod=owner_module()
        trip=test_mode(mod,root,'injected-trip',stage)
        death=test_mode(mod,root,'monitor-death',stage)
        v7=v7_callback_mode(mod,root,stage)
        print(json.dumps(receipt('WINDOWS_JOB_MONITOR_LINK_PASS_NOT_MODEL_CLEARANCE',
                                 'DUMMY_INTEGRATION_ONLY','DONE',trip,death,v7)))
        return 0
    except Exception as e:
        reason=str(e) if isinstance(e,RuntimeError) and str(e) in SAFE else 'WINDOWS_TEST_EXCEPTION'
        print(json.dumps(receipt('HOLD',reason,stage[0],trip,death,v7)))
        return 2
    finally:
        shutil.rmtree(root,ignore_errors=True)
if __name__=='__main__':
    raise SystemExit(main())
