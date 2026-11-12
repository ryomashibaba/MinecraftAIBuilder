#!/usr/bin/env python3
"""V3.1 research-only Windows stale-sample auto-stop proof.

One case only. No model/Ollama/Minecraft access, no real resource exhaustion,
no production thresholds, and NEVER Gate C clearance. The observed sensor is
real; the intentionally frozen heartbeat is synthetic. Only processes created
by this script may be stopped. Run from a clean, exact-head research checkout:

  py -3 scripts/research/r125-gatec-v3-1-stale-only.py --selftest \
    --expected-head <FULL_RESEARCH_COMMIT_SHA>

Or run --offline-tests on any OS. Do not repeat a failed Windows run.
"""
import argparse
import ctypes
from ctypes import wintypes
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

SCHEMA = 'MAB_GATEC_V3_1_GITHUB_STALE_ONLY'
BASE = Path(__file__).resolve().parents[2]
OWNER_FILE = BASE / 'scripts' / 'r125-windows-owned-process.py'
NO_WINDOW = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
MIB = 1048576
HEALTH_S = 5.0


def put(path, value):
    tmp = path.with_name(path.name + '.' + uuid.uuid4().hex + '.writing')
    try:
        tmp.write_text(json.dumps(value, separators=(',', ':')), encoding='utf-8')
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def get(path):
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
        return value if isinstance(value, dict) else None
    except (OSError, ValueError, UnicodeError):
        return None


def wait_for(fn, seconds):
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        got = fn()
        if got:
            return got
        time.sleep(.07)
    return None


def sensor():
    if os.name != 'nt':
        raise RuntimeError('WINDOWS_REQUIRED')

    class Memory(ctypes.Structure):
        _fields_ = [('length', wintypes.DWORD), ('load', wintypes.DWORD),
                    ('total', ctypes.c_ulonglong), ('free', ctypes.c_ulonglong),
                    ('page_total', ctypes.c_ulonglong),
                    ('page_free', ctypes.c_ulonglong),
                    ('virtual_total', ctypes.c_ulonglong),
                    ('virtual_free', ctypes.c_ulonglong),
                    ('virtual_extended', ctypes.c_ulonglong)]
    memory = Memory()
    memory.length = ctypes.sizeof(memory)
    api = ctypes.WinDLL('kernel32', use_last_error=True).GlobalMemoryStatusEx
    api.argtypes = [ctypes.POINTER(Memory)]
    api.restype = wintypes.BOOL
    if not api(ctypes.byref(memory)):
        raise RuntimeError('RAM_API_FAILED')
    exe = shutil.which('nvidia-smi.exe') or shutil.which('nvidia-smi')
    if not exe:
        raise RuntimeError('GPU_TOOL_MISSING')
    gpu = subprocess.run(
        [exe, '--query-gpu=memory.total,memory.free,memory.used',
         '--format=csv,noheader,nounits'],
        capture_output=True, encoding='utf-8', errors='replace',
        timeout=5, check=False, creationflags=NO_WINDOW)
    lines = [s.strip() for s in gpu.stdout.splitlines() if s.strip()]
    if gpu.returncode != 0 or len(lines) != 1:
        raise RuntimeError('GPU_SAMPLE_UNKNOWN')
    pieces = [x.strip() for x in lines[0].split(',')]
    if len(pieces) != 3 or not all(x.isdecimal() for x in pieces):
        raise RuntimeError('GPU_SAMPLE_INVALID')
    total, free, used = map(int, pieces)
    if not (0 < memory.free <= memory.total and
            0 < memory.page_free <= memory.page_total and
            0 < total < 1048576 and 0 <= free <= total and
            0 <= used <= total and free + used <= total):
        raise RuntimeError('SENSOR_VALUES_INVALID')
    return {'ramFreeMiB': memory.free // MIB,
            'commitHeadroomMiB': memory.page_free // MIB,
            'gpuTotalMiB': total, 'gpuFreeMiB': free,
            'sampleMs': time.time_ns() // 1000000}


def authenticated(folder, nonce):
    s = get(folder / 'session.json')
    if (not s or s.get('nonce') != nonce or
            os.environ.get('MAB_V31_PROBE_NONCE') != nonce):
        raise RuntimeError('CHILD_NOT_AUTHORIZED')


def worker(folder, nonce):
    authenticated(folder, nonce)
    memory = bytearray(32 * MIB)
    for i in range(0, len(memory), 4096):
        memory[i] = 1
    child = subprocess.Popen(
        [sys.executable, __file__, '--role', 'descendant',
         '--folder', str(folder), '--nonce', nonce],
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL, creationflags=NO_WINDOW)
    put(folder / 'worker.json', {'workerPid': os.getpid(), 'childPid': child.pid})
    while True:
        time.sleep(.10)


def monitor(folder, nonce):
    authenticated(folder, nonce)
    seq = 0
    while True:
        if (folder / 'freeze.flag').exists():
            # Intentionally stop publishing, but leave monitor process alive.
            time.sleep(.12)
            continue
        try:
            values = sensor()
            seq += 1
            put(folder / 'sample.json',
                {'nonce': nonce, 'pid': os.getpid(), 'seq': seq,
                 'state': 'ALIVE', 'data': values})
        except (OSError, RuntimeError, ValueError,
                subprocess.SubprocessError):
            put(folder / 'sample.json',
                {'nonce': nonce, 'pid': os.getpid(), 'seq': seq + 1,
                 'state': 'FAULT', 'reason': 'SENSOR_UNAVAILABLE'})
            return
        time.sleep(.25)


def valid_new(v, previous, nonce, pid):
    if not isinstance(v, dict) or v.get('nonce') != nonce or \
            v.get('pid') != pid or v.get('state') != 'ALIVE':
        return False
    data = v.get('data')
    if not isinstance(data, dict):
        return False
    n = v.get('seq')
    if type(n) is not int or n < 1 or \
            (previous and n <= previous['seq']):
        return False
    for key in ('ramFreeMiB', 'commitHeadroomMiB',
                'gpuTotalMiB', 'gpuFreeMiB', 'sampleMs'):
        if type(data.get(key)) is not int or data[key] < 0:
            return False
    now_ms = time.time_ns() // 1000000
    if not (0 <= now_ms - data['sampleMs'] <= 5000) or \
            (previous and data['sampleMs'] <= previous['data']['sampleMs']):
        return False
    if data['gpuTotalMiB'] <= 0 or \
            data['gpuFreeMiB'] > data['gpuTotalMiB']:
        return False
    return True


def classify(current, previous, elapsed):
    if previous is not None and current == previous:
        return 'STALE' if elapsed > HEALTH_S else 'UNCHANGED'
    return 'NEW'


def owner_module():
    if OWNER_FILE.name != 'r125-windows-owned-process.py' or \
            not OWNER_FILE.is_file():
        raise RuntimeError('OWNER_SOURCE_MISSING')
    spec = importlib.util.spec_from_file_location('mab_v31_owner', OWNER_FILE)
    if not spec or not spec.loader:
        raise RuntimeError('OWNER_IMPORT_FAILED')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def supervisor(folder, nonce):
    authenticated(folder, nonce)
    owner = owner_module()
    job = None
    monitor_handle = None
    reason = 'SUPERVISOR_TIMEOUT'
    closed = False
    advanced = False
    pid = None
    try:
        session = get(folder / 'session.json')
        pid = session.get('monitorPid')
        if type(pid) is not int or pid <= 0:
            raise RuntimeError('MONITOR_PID_UNKNOWN')
        monitor_handle = owner.checked(
            owner.open_process(0x00100000, False, pid))
        job = owner.OwnedProcessTree()
        worker_pid = job.start(
            str(Path(sys.executable).resolve()),
            [__file__, '--role', 'worker', '--folder',
             str(folder), '--nonce', nonce])
        prev = None
        last_change = time.monotonic()
        until = last_change + 23.0
        while time.monotonic() < until:
            now = time.monotonic()
            value = get(folder / 'sample.json')
            if value is not None:
                state = classify(value, prev, now - last_change)
                if state == 'STALE':
                    reason = 'MONITOR_SAMPLE_STALE'
                    break
                if state == 'NEW':
                    if not valid_new(value, prev, nonce, pid):
                        reason = 'MONITOR_SAMPLE_INVALID'
                        break
                    if prev:
                        advanced = True
                    prev = value
                    last_change = now
                    if advanced and not (folder / 'ready.json').exists():
                        put(folder / 'ready.json',
                            {'nonce': nonce, 'workerPid': worker_pid,
                             'monitorPid': pid, 'sensorAdvanced': True})
            if owner.wait_process(monitor_handle, 0) != 258:
                reason = 'MONITOR_EXIT'
                break
            if now - last_change > HEALTH_S:
                reason = 'MONITOR_SAMPLE_STALE' if advanced else 'STARTUP_STALE'
                break
            time.sleep(.08)
    except (OSError, RuntimeError, ValueError):
        reason = 'SUPERVISOR_SETUP_HOLD'
    finally:
        if job is not None:
            try:
                job.close()  # Crucial: owning SUPERVISOR, not test driver.
                closed = True
            except (OSError, RuntimeError):
                reason = 'SUPERVISOR_STOP_UNVERIFIED'
        if monitor_handle:
            owner.close_handle(monitor_handle)
        put(folder / 'result.json',
            {'reason': reason, 'closedBySupervisor': closed,
             'sensorAdvanced': advanced})


def sibling(folder, nonce):
    authenticated(folder, nonce)
    time.sleep(65)


def receipt(status='HOLD', phase='NOT_RUN'):
    passed = status == 'WINDOWS_STALE_SAMPLE_PASS_NOT_MODEL_CLEARANCE'
    return {'schema': SCHEMA, 'status': status, 'phase': phase,
            'scope': 'STALE_SAMPLE_ONLY',
            'realSensorFreshnessObserved': passed,
            'staleSampleAutomaticallyStopsOwnedJob': passed,
            'unrelatedSiblingPreserved': passed,
            'realQwenInferenceStopVerified': False,
            'inferenceMemoryPeakCalibrated': False,
            'productionMonitorIntegrated': False, 'gateCP1': 'HOLD',
            'modelCalls': 0, 'ollamaGetCalls': 0,
            'networkCallsByScript': 0, 'worldWrites': 0,
            'privateRawIncluded': False}


def test_windows():
    owner = owner_module()
    root = Path(tempfile.mkdtemp(prefix='mab-v31-stale-'))
    nonce = uuid.uuid4().hex
    env = dict(os.environ, MAB_V31_PROBE_NONCE=nonce)
    put(root / 'session.json', {'nonce': nonce})
    jobs = []
    handles = []
    phase = 'SETUP'
    try:
        def spawn(role):
            cmd = [sys.executable, __file__, '--role', role,
                   '--folder', str(root), '--nonce', nonce]
            p = subprocess.Popen(
                cmd, env=env, stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                creationflags=NO_WINDOW)
            jobs.append(p)
            return p
        external = spawn('sibling')
        monitor_proc = spawn('monitor')
        put(root / 'session.json',
            {'nonce': nonce, 'monitorPid': monitor_proc.pid})
        driver = spawn('supervisor')
        phase = 'SENSOR_READY'
        ready = wait_for(lambda: get(root / 'ready.json'), 12)
        if not ready or ready.get('nonce') != nonce or \
                ready.get('monitorPid') != monitor_proc.pid or \
                ready.get('sensorAdvanced') is not True:
            return receipt(phase=phase)
        phase = 'PIN_JOB_WORKERS'
        pair = wait_for(lambda: get(root / 'worker.json'), 3)
        if not pair or pair.get('workerPid') != ready.get('workerPid') or \
                any(type(pair.get(k)) is not int for k in
                    ('workerPid', 'childPid')):
            return receipt(phase=phase)
        for pid in (pair['workerPid'], pair['childPid']):
            handles.append(owner.checked(
                owner.open_process(0x00100000, False, pid)))
        if any(owner.wait_process(h, 0) != 258 for h in handles) or \
                external.poll() is not None:
            return receipt(phase='PRETRIP_PROCESS_NOT_READY')
        phase = 'FREEZE_MONITOR_HEARTBEAT'
        (root / 'freeze.flag').touch(exist_ok=False)
        result = wait_for(lambda: get(root / 'result.json'), 28)
        if not result:
            return receipt(phase='SUPERVISOR_RESULT_NOT_OBSERVED')
        if result.get('reason') != 'MONITOR_SAMPLE_STALE' or \
                result.get('closedBySupervisor') is not True or \
                result.get('sensorAdvanced') is not True:
            safe_reason = result.get('reason')
            known = ('MONITOR_SAMPLE_INVALID', 'MONITOR_SAMPLE_STALE',
                     'MONITOR_EXIT', 'STARTUP_STALE', 'SUPERVISOR_SETUP_HOLD',
                     'SUPERVISOR_STOP_UNVERIFIED', 'SUPERVISOR_TIMEOUT')
            return receipt(phase='SUPERVISOR_REASON_' +
                           (safe_reason if safe_reason in known else 'UNKNOWN'))
        phase = 'VERIFY_STOP'
        if any(owner.wait_process(h, 5000) != 0 for h in handles):
            return receipt(phase='OWNED_TREE_SURVIVED')
        if external.poll() is not None:
            return receipt(phase='UNRELATED_SIBLING_STOPPED')
        driver.wait(timeout=5)
        if driver.returncode != 0:
            return receipt(phase='SUPERVISOR_EXIT_UNVERIFIED')
        return receipt('WINDOWS_STALE_SAMPLE_PASS_NOT_MODEL_CLEARANCE',
                       'AUTO_STOP_AND_SIBLING_VERIFIED')
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError):
        return receipt(phase=phase)
    finally:
        for p in reversed(jobs):
            if p.poll() is None:
                p.terminate()  # Only test-owned Popen objects.
                try:
                    p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    p.kill()
                    p.wait(timeout=5)
        for h in handles:
            owner.close_handle(h)
        shutil.rmtree(root, ignore_errors=True)


def offline_tests():
    base = {'nonce': 'a' * 32, 'pid': 11, 'seq': 1, 'state': 'ALIVE',
            'data': {'ramFreeMiB': 5000, 'commitHeadroomMiB': 10000,
                     'gpuTotalMiB': 16303, 'gpuFreeMiB': 15998,
                     'sampleMs': time.time_ns() // 1000000 - 100}}
    assert valid_new(base, None, base['nonce'], 11)
    assert classify(base, base, 4.9) == 'UNCHANGED'
    assert classify(base, base, 5.1) == 'STALE'
    mutated = {**base, 'state': 'FAULT'}
    assert classify(mutated, base, .5) == 'NEW'
    assert not valid_new(mutated, base, base['nonce'], 11)
    newer = {**base, 'seq': 2,
             'data': {**base['data'], 'sampleMs': base['data']['sampleMs'] + 1}}
    assert valid_new(newer, base, base['nonce'], 11)
    assert receipt()['gateCP1'] == 'HOLD'
    print(json.dumps({'offlineAssertions': 7,
                      'status': 'PASS_OFFLINE_NOT_WINDOWS'}))


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--offline-tests', action='store_true')
    p.add_argument('--selftest', action='store_true')
    p.add_argument('--expected-head')
    p.add_argument('--role', choices=('worker', 'descendant',
                                      'monitor', 'supervisor', 'sibling'))
    p.add_argument('--folder')
    p.add_argument('--nonce')
    a = p.parse_args()
    if a.offline_tests:
        offline_tests()
        return 0
    if a.role:
        if os.name != 'nt' or not a.folder or not a.nonce:
            return 2
        folder = Path(a.folder).resolve(strict=True)
        authenticated(folder, a.nonce)
        if a.role == 'worker':
            worker(folder, a.nonce)
        elif a.role == 'descendant' or a.role == 'sibling':
            sibling(folder, a.nonce)
        elif a.role == 'monitor':
            monitor(folder, a.nonce)
        else:
            supervisor(folder, a.nonce)
        return 0
    if not a.selftest or os.name != 'nt' or \
            not a.expected_head or len(a.expected_head) != 40:
        print(json.dumps(receipt(phase='WINDOWS_PINNED_SELFTEST_REQUIRED')))
        return 2
    try:
        head = subprocess.check_output(
            ['git', '-C', str(BASE), 'rev-parse', 'HEAD'],
            text=True, timeout=10).strip()
        dirty = subprocess.check_output(
            ['git', '-C', str(BASE), 'status', '--porcelain=v1',
             '--untracked-files=normal'],
            text=True, timeout=10)
        if head != a.expected_head or dirty:
            raise RuntimeError('PINNED_CLEAN_HEAD_MISMATCH')
        result = test_windows()
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError):
        result = receipt(phase='PINNED_CHECK_OR_EXECUTION_UNVERIFIED')
    print(json.dumps(result, separators=(',', ':')))
    return 0 if result['status'] == \
        'WINDOWS_STALE_SAMPLE_PASS_NOT_MODEL_CLEARANCE' else 2


if __name__ == '__main__':
    raise SystemExit(main())
