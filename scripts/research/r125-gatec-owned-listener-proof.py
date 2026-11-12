#!/usr/bin/env python3
"""Windows-only owned 11435 listener and automatic monitor-stop proof.

RESEARCH ONLY: fresh synthetic loopback listener, no model/Ollama/HTTP,
no resource exhaustion, no world access. Does NOT clear Gate C P1.
Only owned test processes are stopped, not unrelated listeners.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import uuid

SCHEMA='MAB_GATEC_OWNED_LISTENER_PROOF_V1'
ROOT=Path(__file__).resolve().parents[2]
OWNER=ROOT/'scripts'/'r125-windows-owned-process.py'
PORT=11435
WIN=os.name=='nt'
FLAGS=getattr(subprocess,'CREATE_NO_WINDOW',0)

def receipt(ok=False,reason='NOT_RUN',diagnostic=None):
    base={'schema':SCHEMA,
      'status':'WINDOWS_OWNED_LISTENER_AUTO_STOP_PASS_NOT_GATE_CLEARANCE' if ok else 'HOLD',
      'reason':reason,
      'ownedListenerPidVerified':ok,'listenerInKillOnCloseJobVerified':ok,
      'independentMonitorTripAutomaticallyStopsListener':ok,
      'ownedDescendantStopped':ok,'unrelatedSiblingPreserved':ok,
      'productionMonitorIntegrated':False,'realQwenStopVerified':False,
      'inferenceMemoryPeakCalibrated':False,'productionThresholdCalibrated':False,
      'gateCP1':'HOLD','modelCalls':0,'ollamaGetCalls':0,
      'networkCallsExternal':0,'worldWrites':0,'privateRawIncluded':False}
    if diagnostic is not None:
        base['ownerMismatchDiagnostic']=diagnostic
    return base

def put(p,v):
    tmp=p.with_name(p.name+'.'+uuid.uuid4().hex+'.writing')
    try:
        tmp.write_text(json.dumps(v,separators=(',',':')),encoding='utf8')
        os.replace(tmp,p)
    finally: tmp.unlink(missing_ok=True)

def read(p):
    try:
        v=json.loads(p.read_text(encoding='utf8'))
        return v if isinstance(v,dict) else None
    except (OSError,ValueError,UnicodeError): return None

def until(f,seconds):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        v=f()
        if v: return v
        time.sleep(.07)
    return None

def owner_module():
    if not WIN or not OWNER.is_file(): raise RuntimeError('OWNER_UNKNOWN')
    spec=importlib.util.spec_from_file_location('mab_owned_windows_job',OWNER)
    if not spec or not spec.loader: raise RuntimeError('OWNER_IMPORT_UNKNOWN')
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def parse_pids(output):
    lines=output.splitlines()
    if any(not line.strip().isdigit() for line in lines):
        raise RuntimeError('PORT_PID_OUTPUT_UNKNOWN')
    pids=[int(s.strip()) for s in lines]
    if len(pids)!=len(set(pids)): raise RuntimeError('PORT_PID_DUPLICATE')
    return pids

def port_owners():
    if not WIN: raise RuntimeError('WINDOWS_REQUIRED')
    exe=shutil.which('powershell.exe')
    if not exe: raise RuntimeError('POWERSHELL_UNKNOWN')
    script=("$ErrorActionPreference='Stop';"
        "$x=@(Get-NetTCPConnection -LocalPort 11435 -State Listen "
        "-ErrorAction SilentlyContinue);"
        "$x | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique")
    r=subprocess.run([exe,'-NoProfile','-NonInteractive','-Command',script],
       capture_output=True,text=True,errors='replace',
       timeout=12,creationflags=FLAGS,check=False)
    if r.returncode or r.stderr.strip(): raise RuntimeError('PORT_OWNER_QUERY_UNKNOWN')
    return parse_pids(r.stdout)

def authorize(folder,nonce):
    v=read(folder/'session.json')
    if not v or v.get('nonce')!=nonce or \
       os.environ.get('MAB_OWNED_LISTENER_NONCE')!=nonce:
        raise RuntimeError('NONCE_NOT_VERIFIED')

def listener(folder,nonce):
    authorize(folder,nonce)
    child=subprocess.Popen([sys.executable,__file__,'--role','descendant',
       '--folder',str(folder),'--nonce',nonce],
       stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,
       stderr=subprocess.DEVNULL,creationflags=FLAGS)
    with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as server:
        if hasattr(socket,'SO_EXCLUSIVEADDRUSE'):
            server.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
        server.bind(('127.0.0.1',PORT))
        server.listen(3)
        server.settimeout(.3)
        put(folder/'listener.json',{'nonce':nonce,
            'pid':os.getpid(),'childPid':child.pid})
        end=time.monotonic()+60
        while time.monotonic()<end:
            try:
                connected,_=server.accept()
                connected.close() # No HTTP or data exchanged.
            except socket.timeout: pass

def monitor(folder,nonce):
    authorize(folder,nonce)
    end=time.monotonic()+55
    seq=0
    while time.monotonic()<end:
        seq+=1
        trip=(folder/'inject-fault.flag').exists()
        put(folder/'monitor.json',{'nonce':nonce,'pid':os.getpid(),
            'seq':seq,'state':'FAULT' if trip else 'ALIVE'})
        if trip: return
        time.sleep(.16)

def supervisor(folder,nonce):
    authorize(folder,nonce)
    mod=owner_module()
    job=None
    mon_handle=None
    listener_pid=None
    reason='SUPERVISOR_TIMEOUT'
    closed=False
    try:
        a=read(folder/'session.json')
        mon_pid=a.get('monitorPid')
        if type(mon_pid) is not int or mon_pid<=0: raise RuntimeError('MONITOR_PID_BAD')
        mon_handle=mod.checked(mod.open_process(0x00100000,False,mon_pid))
        job=mod.OwnedProcessTree()
        listener_pid=job.start(str(Path(sys.executable).resolve()),
           [__file__,'--role','listener','--folder',str(folder),'--nonce',nonce])
        put(folder/'supervisor.json',{'nonce':nonce,
            'monitorPid':mon_pid,'ownedListenerPid':listener_pid})
        last=time.monotonic()
        end=last+48
        seq=0
        while time.monotonic()<end:
            m=read(folder/'monitor.json')
            if m and m.get('nonce')==nonce and m.get('pid')==mon_pid:
                if m.get('state')=='FAULT':
                    reason='MONITOR_FAULT_RECEIVED'
                    break
                if m.get('state')!='ALIVE' or \
                   type(m.get('seq')) is not int or m['seq']<seq:
                    reason='MONITOR_INVALID'
                    break
                if m['seq']>seq:
                    seq=m['seq']
                    last=time.monotonic()
            if mod.wait_process(mon_handle,0)!=258:
                reason='MONITOR_TERMINATED'
                break
            if time.monotonic()-last>3:
                reason='MONITOR_STALE'
                break
            time.sleep(.055)
    except (OSError,RuntimeError,ValueError):
        reason='SUPERVISOR_SETUP_UNKNOWN'
    finally:
        if job:
            try:
                job.close() # SUPERVISOR closes its job, never test driver.
                closed=True
            except (OSError,RuntimeError): reason='JOB_CLOSE_UNVERIFIED'
        if mon_handle: mod.close_handle(mon_handle)
        put(folder/'result.json',{'nonce':nonce,
           'reason':reason,'closedBySupervisor':closed,
           'ownedListenerPid':listener_pid})

def descendant(folder,nonce):
    authorize(folder,nonce)
    time.sleep(70)

def classify_owner_mismatch(observed,expected):
    """No raw PID, path, identity, or private process data leaves this test."""
    if observed==[expected]: return 'OWNER_STABLE'
    if not observed: return 'LISTENER_NOT_OBSERVED'
    if expected in observed: return 'UNEXPECTED_ADDITIONAL_LISTENER'
    return 'DIFFERENT_LISTENER_OWNER'

def safe_owner_mismatch(observed,expected,handles,supervisor_proc,folder,mod):
    classification=classify_owner_mismatch(observed,expected)
    # Hold even when an OS query may have been transient.
    owned=bool(handles and mod.wait_process(handles[0],0)==258)
    supervisor_alive=supervisor_proc is not None and supervisor_proc.poll() is None
    result=read(folder/'result.json')
    allowed={'SUPERVISOR_TIMEOUT','MONITOR_FAULT_RECEIVED',
             'MONITOR_TERMINATED','MONITOR_STALE','MONITOR_INVALID',
             'SUPERVISOR_SETUP_UNKNOWN','JOB_CLOSE_UNVERIFIED'}
    reason=result.get('reason') if isinstance(result,dict) else None
    return {'category':classification,
            'ownedListenerAliveAtMismatch':owned,
            'supervisorAliveAtMismatch':supervisor_alive,
            'supervisorStopReason':reason if reason in allowed else 'NOT_AVAILABLE'}

def windows_test():
    mod=owner_module()
    if port_owners(): return receipt(reason='PORT_11435_ALREADY_IN_USE')
    folder=Path(tempfile.mkdtemp(prefix='mab-gatec-owned-listener-'))
    nonce=uuid.uuid4().hex
    env=dict(os.environ,MAB_OWNED_LISTENER_NONCE=nonce)
    put(folder/'session.json',{'nonce':nonce})
    monitor_proc=sibling=supervisor_proc=None
    handles=[]
    stage='START'
    try:
        def spawn(role):
            return subprocess.Popen([sys.executable,__file__,'--role',role,
               '--folder',str(folder),'--nonce',nonce],env=env,
               stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,
               stderr=subprocess.DEVNULL,creationflags=FLAGS)
        sibling=spawn('descendant')
        monitor_proc=spawn('monitor')
        put(folder/'session.json',{'nonce':nonce,'monitorPid':monitor_proc.pid})
        supervisor_proc=spawn('supervisor')
        stage='READ_OWNED_LISTENER'
        def seen():
            a=read(folder/'supervisor.json')
            b=read(folder/'listener.json')
            c=read(folder/'monitor.json')
            if not a or not b or not c: return None
            if a.get('nonce')!=nonce or b.get('nonce')!=nonce or \
               c.get('nonce')!=nonce or c.get('state')!='ALIVE' or \
               c.get('pid')!=monitor_proc.pid or \
               a.get('ownedListenerPid')!=b.get('pid'):
                return None
            return a,b,c
        found=until(seen,9)
        if not found: return receipt(reason=stage)
        a,b,c=found
        stage='PIN_OWNED_PROCESS_HANDLES'
        for pid in (b['pid'],b['childPid']):
            if type(pid) is not int or pid<=0:
                return receipt(reason='OWNED_PID_INVALID')
            handles.append(mod.checked(mod.open_process(0x00100000,False,pid)))
        if any(mod.wait_process(h,0)!=258 for h in handles):
            return receipt(reason='OWNED_PROCESSES_NOT_RUNNING')
        if sibling.poll() is not None: return receipt(reason='SIBLING_NOT_RUNNING')
        stage='VERIFY_PORT_OWNERSHIP'
        first=port_owners()
        if first!=[b['pid']]:
            return receipt(reason='LISTENER_OWNER_MISMATCH',
              diagnostic=safe_owner_mismatch(first,b['pid'],handles,
                supervisor_proc,folder,mod))
        time.sleep(.15)
        second=port_owners()
        if second!=[b['pid']]:
            return receipt(reason='LISTENER_OWNER_UNSTABLE',
              diagnostic=safe_owner_mismatch(second,b['pid'],handles,
                supervisor_proc,folder,mod))
        stage='VERIFY_INDEPENDENT_MONITOR_HEARTBEAT'
        prev=c['seq']
        advanced=until(lambda:(lambda v:v if v and v.get('nonce')==nonce
          and v.get('pid')==monitor_proc.pid and v.get('state')=='ALIVE'
          and type(v.get('seq')) is int and v['seq']>prev else None)
          (read(folder/'monitor.json')),3)
        if not advanced: return receipt(reason='MONITOR_NOT_ADVANCING')
        stage='INJECT_MONITOR_FAULT'
        (folder/'inject-fault.flag').touch(exist_ok=False)
        result=until(lambda:read(folder/'result.json'),14)
        if not result or result.get('nonce')!=nonce or \
           result.get('reason')!='MONITOR_FAULT_RECEIVED' or \
           result.get('closedBySupervisor') is not True or \
           result.get('ownedListenerPid')!=b['pid']:
            return receipt(reason='SUPERVISOR_AUTO_STOP_UNVERIFIED')
        stage='VERIFY_OWNED_TREE_TERMINATED'
        if any(mod.wait_process(h,5000)!=0 for h in handles):
            return receipt(reason='OWNED_TREE_STILL_RUNNING')
        if port_owners(): return receipt(reason='PORT_LISTENER_REMAINS')
        if sibling.poll() is not None: return receipt(reason='UNRELATED_SIBLING_STOPPED')
        supervisor_proc.wait(timeout=5)
        if supervisor_proc.returncode!=0:
            return receipt(reason='SUPERVISOR_EXIT_UNVERIFIED')
        return receipt(True,'OWNED_PORT_JOB_AND_MONITOR_STOP_VERIFIED')
    except (OSError,RuntimeError,ValueError,subprocess.SubprocessError):
        return receipt(reason='WINDOWS_PROBE_EXCEPTION_'+stage)
    finally:
        for p in (supervisor_proc,monitor_proc,sibling):
            if p and p.poll() is None:
                p.terminate()
                try: p.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    p.kill()
                    p.wait(timeout=4)
        for h in handles: mod.close_handle(h)
        shutil.rmtree(folder,ignore_errors=True)

def offline_tests():
    assert parse_pids('')==[]
    assert parse_pids('123\n')==[123]
    assert parse_pids('456\n789\n')==[456,789]
    for s in ('abc','12\n12\n','12\nxyz'):
        try: parse_pids(s)
        except RuntimeError: pass
        else: raise AssertionError('INVALID_PID_LIST_ACCEPTED')
    assert receipt()['gateCP1']=='HOLD'
    assert receipt()['ownedListenerPidVerified'] is False
    assert classify_owner_mismatch([123],123)=='OWNER_STABLE'
    assert classify_owner_mismatch([],123)=='LISTENER_NOT_OBSERVED'
    assert classify_owner_mismatch([123,456],123)=='UNEXPECTED_ADDITIONAL_LISTENER'
    assert classify_owner_mismatch([456],123)=='DIFFERENT_LISTENER_OWNER'
    print(json.dumps({'offlineAssertions':12,'status':'PASS_OFFLINE_NOT_WINDOWS'}))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--offline-tests',action='store_true')
    ap.add_argument('--selftest',action='store_true')
    ap.add_argument('--expected-head')
    ap.add_argument('--role',choices=('listener','monitor','supervisor','descendant'))
    ap.add_argument('--folder')
    ap.add_argument('--nonce')
    args=ap.parse_args()
    if args.offline_tests:
        offline_tests(); return 0
    if args.role:
        if not WIN or not args.folder or not args.nonce: return 2
        folder=Path(args.folder).resolve(strict=True)
        if args.role=='listener': listener(folder,args.nonce)
        elif args.role=='monitor': monitor(folder,args.nonce)
        elif args.role=='supervisor': supervisor(folder,args.nonce)
        else: descendant(folder,args.nonce)
        return 0
    if not args.selftest or not WIN or not args.expected_head or \
       len(args.expected_head)!=40:
        print(json.dumps(receipt(reason='WINDOWS_PINNED_SELFTEST_REQUIRED')))
        return 2
    try:
        head=subprocess.check_output(['git','-C',str(ROOT),'rev-parse','HEAD'],
            text=True,timeout=10).strip()
        dirty=subprocess.check_output(['git','-C',str(ROOT),'status','--porcelain=v1',
            '--untracked-files=normal'],text=True,timeout=10)
        if head!=args.expected_head or dirty: raise RuntimeError('UNCLEAN_HEAD')
        result=windows_test()
    except (OSError,RuntimeError,ValueError,subprocess.SubprocessError):
        result=receipt(reason='PINNED_HEAD_OR_EXECUTION_UNKNOWN')
    print(json.dumps(result,separators=(',',':')))
    return 0 if result['status']== \
      'WINDOWS_OWNED_LISTENER_AUTO_STOP_PASS_NOT_GATE_CLEARANCE' else 2

if __name__=='__main__':
    raise SystemExit(main())
