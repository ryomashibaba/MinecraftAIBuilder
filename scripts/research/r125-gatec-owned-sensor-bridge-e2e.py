#!/usr/bin/env python3
"""Research-only Windows sensor-HOLD callback -> owned listener Job stop.

Tests ONE integrated synthetic owned-listener scenario, not production.
V3.1's actual RAM/commit/GPU monitor -> JS checkResourceSafety (always HOLD)
-> authenticated test HOLD signal -> separate Python supervisor -> Job close.
No Qwen, Ollama, HTTP requests, real resource stress, or Minecraft writes.
"""
import argparse
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

ROOT = Path(__file__).resolve().parents[2]
OWNED = ROOT / 'scripts/r125-windows-owned-process.py'
LISTENER = ROOT / 'scripts/research/r125-gatec-owned-listener-proof.py'
MONITOR = ROOT / 'scripts/research/r125-gatec-v3-1-stale-only.py'
BRIDGE = ROOT / 'scripts/research/r125-gatec-resource-sample-bridge.mjs'
SCHEMA = 'MAB_GATEC_OWNED_SENSOR_CALLBACK_JOB_E2E_V1'
BRANCH = 'research/r125-v6-readonly-facade-diagnostic-20261111'
FLAGS = getattr(subprocess, 'CREATE_NO_WINDOW', 0)

# Test-only callback consumer. No mechanism here can certify model safety.
NODE_CALLBACK = r'''
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const env=process.env;
const {createGateCResearchProbe}=await import(pathToFileURL(env.MAB_E2E_BRIDGE).href);
const dir=env.MAB_E2E_DIR;
const nonce=env.MAB_E2E_NONCE;
const monitorPid=Number(env.MAB_E2E_MONITOR_PID);
const head=env.MAB_E2E_HEAD;
const probe=createGateCResearchProbe({directory:dir,expectedNonce:nonce,
  expectedMonitorPid:monitorPid,expectedHead:head});
let seen=0,lastSeq=0,reason='LIVE_SENSOR_NOT_OBSERVED';
const end=Date.now()+13000;
while(Date.now()<end&&seen<2){
  let current;
  try{current=JSON.parse(fs.readFileSync(dir+'/sample.json','utf8'));}
  catch{await new Promise(r=>setTimeout(r,150));continue;}
  if(current?.seq<=lastSeq){await new Promise(r=>setTimeout(r,150));continue;}
  const result=await probe({model:'qwen3:14b',headSha:head,
    phase:'DURING_INFERENCE'});
  if(result.status!=='HOLD'||result.resourceSafetyCertified!==false||
     result.reason!=='UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED'){
    reason='CALLBACK_'+String(result.reason||'UNKNOWN');break;
  }
  if(!Number.isSafeInteger(result.researchSampleSequence)||
     result.researchSampleSequence<current?.seq){
    reason='SAMPLE_RACE';break;
  }
  lastSeq=result.researchSampleSequence;
  seen++;
}
if(seen===2){
  const signal={nonce,monitorPid,headSha:head,sampleSeq:lastSeq,
    status:'HOLD',reason:'UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED'};
  const tmp=dir+'/hold.'+nonce+'.writing';
  fs.writeFileSync(tmp,JSON.stringify(signal),{flag:'wx'});
  fs.renameSync(tmp,dir+'/hold.json');
  reason='UNCALIBRATED_CALLBACK_HOLD_DELIVERED';
}
const safe={schema:'MAB_GATEC_NODE_CALLBACK_V1',
  status:seen===2?'PASS_NOT_GATE_CLEARANCE':'HOLD',
  reason,observedSamples:seen,resourceSafetyCertified:false,
  gateCP1:'HOLD',modelCalls:0,ollamaGetCalls:0,worldWrites:0};
fs.writeFileSync(dir+'/callback-result.json',JSON.stringify(safe));
process.exitCode=seen===2?0:2;
'''

def receipt(ok=False, reason='NOT_RUN'):
    return {'schema': SCHEMA,
      'status': 'RESEARCH_SENSOR_CALLBACK_JOB_AUTO_STOP_PASS_NOT_GATE_CLEARANCE'
          if ok else 'HOLD',
      'reason': reason,
      'realSensorCallbacksInSameTest': 2 if ok else 0,
      'callbackHoldTriggeredOwnedJobStop': ok,
      'ownedListenerAndDescendantStopped': ok,
      'unrelatedSiblingPreserved': ok,
      'productionMonitorIntegrated': False,
      'productionOwnershipAttested': False,
      'resourceSafetyCertified': False,
      'realQwenInferenceStopVerified': False,
      'inferenceMemoryPeakCalibrated': False,
      'productionThresholdCalibrated': False,
      'gateCP1': 'HOLD', 'modelCalls': 0,
      'ollamaGetCalls': 0, 'networkCallsExternal': 0,
      'worldWrites': 0, 'privateRawIncluded': False}

def write(folder, name, value):
    tmp = folder / (name + '.' + uuid.uuid4().hex + '.writing')
    try:
        tmp.write_text(json.dumps(value, separators=(',', ':')),
                       encoding='utf8')
        os.replace(tmp, folder / name)
    finally:
        tmp.unlink(missing_ok=True)

def read(folder, name):
    try:
        value = json.loads((folder / name).read_text(encoding='utf8'))
        return value if isinstance(value, dict) else None
    except (OSError, ValueError, UnicodeError):
        return None

def until(fn, seconds):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        found = fn()
        if found:
            return found
        time.sleep(.07)
    return None

def import_py(name, source):
    if not source.is_file():
        raise RuntimeError('REQUIRED_RESEARCH_FILE_MISSING')
    spec = importlib.util.spec_from_file_location(name, source)
    if spec is None or spec.loader is None:
        raise RuntimeError('REQUIRED_MODULE_UNAVAILABLE')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def authorized(folder, nonce):
    session = read(folder, 'session.json')
    if not session or session.get('nonce') != nonce or \
            os.environ.get('MAB_E2E_NONCE') != nonce:
        raise RuntimeError('TEST_NONCE_UNVERIFIED')
    return session

def supervisor(folder, nonce):
    owner = import_py('mab_e2e_owner', OWNED)
    job = None
    handle = None
    closed = False
    reason = 'SUPERVISOR_TIMEOUT'
    listener_pid = None
    try:
        session = authorized(folder, nonce)
        monitor_pid = session.get('monitorPid')
        if type(monitor_pid) is not int or monitor_pid <= 0:
            raise RuntimeError('MONITOR_IDENTITY_UNVERIFIED')
        handle = owner.checked(owner.open_process(0x00100000, False,
                                                   monitor_pid))
        job = owner.OwnedProcessTree()
        listener_pid = job.start(str(Path(sys.executable).resolve()),
            [str(LISTENER), '--role', 'listener', '--folder', str(folder),
             '--nonce', nonce])
        write(folder, 'supervisor.json', {'nonce': nonce,
              'monitorPid': monitor_pid, 'ownedListenerPid': listener_pid})
        seq = 0
        last_change = time.monotonic()
        end = last_change + 29.0
        while time.monotonic() < end:
            sample = read(folder, 'sample.json')
            if sample:
                if sample.get('nonce') != nonce or \
                   sample.get('pid') != monitor_pid or \
                   sample.get('state') != 'ALIVE' or \
                   type(sample.get('seq')) is not int:
                    reason = 'MONITOR_SAMPLE_IDENTITY_OR_STATE_HOLD'
                    break
                if sample['seq'] < seq:
                    reason = 'MONITOR_SAMPLE_ROLLBACK_HOLD'
                    break
                if sample['seq'] > seq:
                    seq = sample['seq']
                    last_change = time.monotonic()
            signal = read(folder, 'hold.json')
            if signal:
                if signal.get('nonce') == nonce and \
                   signal.get('monitorPid') == monitor_pid and \
                   signal.get('headSha') == session.get('headSha') and \
                   signal.get('status') == 'HOLD' and \
                   signal.get('reason') == \
                       'UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED' and \
                   type(signal.get('sampleSeq')) is int and \
                   signal['sampleSeq'] >= 2 and seq >= signal['sampleSeq']:
                    reason = 'RESOURCE_CALLBACK_HOLD_REACHED_OWNED_SUPERVISOR'
                else:
                    reason = 'CALLBACK_SIGNAL_INVALID'
                break
            if owner.wait_process(handle, 0) != 258:
                reason = 'MONITOR_PROCESS_EXITED_HOLD'
                break
            if time.monotonic() - last_change > 4.0:
                reason = 'MONITOR_SAMPLE_STALE_HOLD'
                break
            time.sleep(.08)
    except (OSError, RuntimeError, ValueError):
        reason = 'SUPERVISOR_SETUP_HOLD'
    finally:
        if job:
            try:
                job.close()  # SUPERVISOR owns and closes this Job.
                closed = True
            except (OSError, RuntimeError):
                reason = 'OWNED_JOB_CLOSE_UNVERIFIED'
        if handle:
            owner.close_handle(handle)
        write(folder, 'supervisor-result.json', {'nonce': nonce,
              'reason': reason, 'closedBySupervisor': closed,
              'ownedListenerPid': listener_pid})

def spawn_test(role, folder, nonce, env):
    return subprocess.Popen([sys.executable, str(Path(__file__).resolve()),
         '--role', role, '--folder', str(folder), '--nonce', nonce],
         env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
         stderr=subprocess.DEVNULL, creationflags=FLAGS)

def test_windows(head):
    owner = import_py('mab_e2e_owner', OWNED)
    listener = import_py('mab_e2e_listener', LISTENER)
    if listener.port_owners():
        return receipt(reason='PORT_11435_ALREADY_IN_USE')
    node = shutil.which('node.exe')
    if not node:
        return receipt(reason='NODE_RUNTIME_UNAVAILABLE')
    folder = Path(tempfile.mkdtemp(prefix='mab-gatec-e2e-'))
    nonce = uuid.uuid4().hex
    env = dict(os.environ, MAB_E2E_NONCE=nonce,
        MAB_V31_PROBE_NONCE=nonce, MAB_OWNED_LISTENER_NONCE=nonce,
        MAB_E2E_DIR=str(folder), MAB_E2E_BRIDGE=str(BRIDGE),
        MAB_E2E_HEAD=head)
    write(folder, 'session.json', {'nonce': nonce, 'headSha': head})
    monitor = sibling = driver = callback = None
    handles = []
    phase = 'START'
    try:
        # Real Windows resource monitor, launched with direct Python.
        monitor = subprocess.Popen([sys.executable, str(MONITOR), '--role',
            'monitor', '--folder', str(folder), '--nonce', nonce], env=env,
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL, creationflags=FLAGS)
        write(folder, 'session.json', {'nonce': nonce, 'headSha': head,
              'monitorPid': monitor.pid})
        sibling = subprocess.Popen([sys.executable, str(LISTENER), '--role',
            'descendant', '--folder', str(folder), '--nonce', nonce], env=env,
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL, creationflags=FLAGS)
        driver = spawn_test('supervisor', folder, nonce, env)
        phase = 'OBSERVE_JOB_OWNER'
        def observed():
            a = read(folder, 'supervisor.json')
            b = read(folder, 'listener.json')
            c = read(folder, 'sample.json')
            if not all((a, b, c)):
                return None
            if a.get('nonce') != nonce or b.get('nonce') != nonce or \
               c.get('nonce') != nonce or \
               a.get('monitorPid') != monitor.pid or \
               a.get('ownedListenerPid') != b.get('pid') or \
               c.get('pid') != monitor.pid or c.get('state') != 'ALIVE':
                return None
            return a, b, c
        observed_parts = until(observed, 12)
        if not observed_parts:
            return receipt(reason=phase)
        _, b, _ = observed_parts
        phase = 'PIN_OWNED_HANDLES'
        for pid in (b['pid'], b['childPid']):
            if type(pid) is not int or pid <= 0:
                return receipt(reason='OWNED_PID_UNKNOWN')
            handles.append(owner.checked(
                owner.open_process(0x00100000, False, pid)))
        if any(owner.wait_process(h, 0) != 258 for h in handles) or \
                sibling.poll() is not None:
            return receipt(reason='OWNED_PROCESS_OR_SIBLING_UNAVAILABLE')
        phase = 'VERIFY_PORT_IDENTITY'
        if listener.port_owners() != [b['pid']]:
            return receipt(reason='OWNED_LISTENER_PID_MISMATCH')
        # No HTTP traffic; Node reads monitor output on the local filesystem.
        env['MAB_E2E_MONITOR_PID'] = str(monitor.pid)
        callback = subprocess.Popen([node, '--input-type=module', '--eval',
             NODE_CALLBACK], env=env, stdin=subprocess.DEVNULL,
             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
             creationflags=FLAGS)
        phase = 'WAIT_FOR_UNCALIBRATED_HOLD_CALLBACK'
        result = until(lambda: read(folder, 'callback-result.json'), 19)
        if not result or result.get('status') != \
                'PASS_NOT_GATE_CLEARANCE' or \
                result.get('observedSamples') != 2:
            return receipt(reason='REAL_RESOURCE_CALLBACK_NOT_ATTESTED')
        phase = 'WAIT_FOR_SUPERVISOR_AUTO_STOP'
        stopped = until(lambda: read(folder, 'supervisor-result.json'), 14)
        if not stopped or stopped.get('nonce') != nonce or \
           stopped.get('reason') != \
              'RESOURCE_CALLBACK_HOLD_REACHED_OWNED_SUPERVISOR' or \
           stopped.get('closedBySupervisor') is not True or \
           stopped.get('ownedListenerPid') != b['pid']:
            return receipt(reason='HOLD_CAUSED_JOB_STOP_UNVERIFIED')
        phase = 'VERIFY_STOP_AND_ISOLATION'
        if any(owner.wait_process(h, 5000) != 0 for h in handles):
            return receipt(reason='OWNED_TREE_NOT_STOPPED')
        if listener.port_owners():
            return receipt(reason='LISTENER_STILL_PRESENT_OR_PORT_CONFLICT')
        if sibling.poll() is not None:
            return receipt(reason='UNRELATED_SIBLING_NOT_PRESERVED')
        if callback.wait(timeout=5) != 0 or driver.wait(timeout=5) != 0:
            return receipt(reason='SUPERVISOR_OR_CALLBACK_EXIT_NOT_CONFIRMED')
        return receipt(True, 'REAL_SENSOR_HOLD_AUTOMATICALLY_CLOSED_OWNED_JOB')
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError):
        return receipt(reason='TEST_EXCEPTION_' + phase)
    finally:
        for p in (callback, driver, monitor, sibling):
            if p and p.poll() is None:
                p.terminate()  # ONLY test-owned processes.
                try:
                    p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    p.kill()
                    p.wait(timeout=5)
        for h in handles:
            owner.close_handle(h)
        shutil.rmtree(folder, ignore_errors=True)

def offline_tests():
    r = receipt()
    assert r['status'] == 'HOLD'
    assert r['gateCP1'] == 'HOLD'
    assert not r['callbackHoldTriggeredOwnedJobStop']
    assert not r['productionMonitorIntegrated']
    assert 'UNCALIBRATED_AND_JOB_BINDING_UNVERIFIED' in NODE_CALLBACK
    assert 'createGateCResearchProbe' in NODE_CALLBACK
    assert 'fs.writeFileSync' in NODE_CALLBACK
    assert 'MAB_E2E_NONCE' in NODE_CALLBACK
    assert 'MAB_E2E_MONITOR_PID' in NODE_CALLBACK
    assert '/hold.json' in NODE_CALLBACK
    print(json.dumps({'schema': SCHEMA,
        'status': 'PASS_OFFLINE_NOT_WINDOWS',
        'offlineAssertions': 10, 'gateCP1': 'HOLD',
        'modelCalls': 0, 'ollamaGetCalls': 0, 'worldWrites': 0}))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--offline-tests', action='store_true')
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--expected-head')
    ap.add_argument('--role', choices=['supervisor'])
    ap.add_argument('--folder')
    ap.add_argument('--nonce')
    args = ap.parse_args()
    if args.offline_tests:
        offline_tests()
        return 0
    if args.role:
        if os.name != 'nt' or not args.folder or not args.nonce:
            return 2
        supervisor(Path(args.folder).resolve(strict=True), args.nonce)
        return 0
    if not args.selftest or os.name != 'nt' or not args.expected_head or \
            len(args.expected_head) != 40:
        print(json.dumps(receipt(reason='PINNED_WINDOWS_SELFTEST_REQUIRED')))
        return 2
    try:
        opts = dict(text=True, timeout=10)
        head = subprocess.check_output(['git', '-C', str(ROOT),
            'rev-parse', 'HEAD'], **opts).strip()
        branch_name = subprocess.check_output(['git', '-C', str(ROOT),
            'branch', '--show-current'], **opts).strip()
        dirty = subprocess.check_output(['git', '-C', str(ROOT),
            'status', '--porcelain=v1', '--untracked-files=normal'], **opts)
        if head != args.expected_head or branch_name != BRANCH or dirty:
            raise RuntimeError('PINNED_BRANCH_AND_CLEAN_HEAD_REQUIRED')
        result = test_windows(head)
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError):
        result = receipt(reason='GIT_PIN_OR_TEST_UNVERIFIED')
    print(json.dumps(result, separators=(',', ':')))
    return 0 if result['status'] == \
        'RESEARCH_SENSOR_CALLBACK_JOB_AUTO_STOP_PASS_NOT_GATE_CLEARANCE' else 2

if __name__ == '__main__':
    raise SystemExit(main())
