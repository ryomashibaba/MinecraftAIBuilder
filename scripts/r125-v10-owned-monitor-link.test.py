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
      'OUTSIDE_JOB_SIBLING_STOPPED'}
def receipt(status='HOLD',reason='NOT_RUN',phase='INIT',trip=False,death=False):
    passed=status=='WINDOWS_JOB_MONITOR_LINK_PASS_NOT_MODEL_CLEARANCE'
    return {'schema':SCHEMA,'status':status,'reason':reason,
            'failurePhase':phase if not passed else 'NONE',
            'injectedMonitorTripStopsOwnedTree':trip,
            'monitorDeathStopsOwnedTree':death,
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
            if mon.poll() is not None: return True
            if not d or d.get('nonce')!=nonce or d.get('pid')!=mon.pid:
                return False   # A transient Windows file read is not failure evidence.
            if d.get('state')=='FAULT': return True
            ms=d.get('timeMs')
            if not isinstance(ms,int): return False
            age=time.time_ns()//1000000-ms
            return age>1800 or age<0
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
    trip=death=False
    root=Path(tempfile.mkdtemp(prefix='mab-v10-job-monitor-'))
    try:
        mod=owner_module()
        trip=test_mode(mod,root,'injected-trip',stage)
        death=test_mode(mod,root,'monitor-death',stage)
        print(json.dumps(receipt('WINDOWS_JOB_MONITOR_LINK_PASS_NOT_MODEL_CLEARANCE',
                                 'DUMMY_INTEGRATION_ONLY','DONE',trip,death)))
        return 0
    except Exception as e:
        reason=str(e) if isinstance(e,RuntimeError) and str(e) in SAFE else 'WINDOWS_TEST_EXCEPTION'
        print(json.dumps(receipt('HOLD',reason,stage[0],trip,death)))
        return 2
    finally:
        shutil.rmtree(root,ignore_errors=True)
if __name__=='__main__':
    raise SystemExit(main())
