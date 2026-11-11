"""Windows process ownership for a future isolated local-model worker.

No model, network, Minecraft, existing-process attachment or arbitrary CLI run.
An importing supervisor may start its OWN executable inside a new unnamed job.
Windows assigns the job atomically at creation; closing the non-inherited job
handle kills that tree, including when the supervisor crashes. This is only
lifecycle containment, NOT resource clearance or permission to run a model.

References:
https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects
https://devblogs.microsoft.com/oldnewthing/20230209-00/?p=107812
"""
import ctypes as c
from ctypes import wintypes as w
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

if os.name == 'nt':
    k32 = c.WinDLL('kernel32', use_last_error=True)
    SIZE = c.c_size_t

    class BasicLimits(c.Structure):
        _fields_ = [('process_time', c.c_int64), ('job_time', c.c_int64),
                    ('flags', w.DWORD), ('min_ws', SIZE), ('max_ws', SIZE),
                    ('active_limit', w.DWORD), ('affinity', SIZE),
                    ('priority', w.DWORD), ('scheduling', w.DWORD)]

    class Limits(c.Structure):
        _fields_ = [('basic', BasicLimits), ('io', c.c_uint64 * 6),
                    ('process_memory', SIZE), ('job_memory', SIZE),
                    ('peak_process_memory', SIZE), ('peak_job_memory', SIZE)]

    class Startup(c.Structure):
        _fields_ = [('cb', w.DWORD), ('reserved', w.LPWSTR),
                    ('desktop', w.LPWSTR), ('title', w.LPWSTR),
                    ('x', w.DWORD), ('y', w.DWORD), ('width', w.DWORD),
                    ('height', w.DWORD), ('chars_x', w.DWORD),
                    ('chars_y', w.DWORD), ('fill', w.DWORD), ('flags', w.DWORD),
                    ('show', w.WORD), ('reserved_size', w.WORD),
                    ('reserved_bytes', c.c_void_p), ('stdin', w.HANDLE),
                    ('stdout', w.HANDLE), ('stderr', w.HANDLE)]

    class StartupEx(c.Structure):
        _fields_ = [('startup', Startup), ('attributes', c.c_void_p)]

    class ProcessInfo(c.Structure):
        _fields_ = [('process', w.HANDLE), ('thread', w.HANDLE),
                    ('pid', w.DWORD), ('tid', w.DWORD)]

    def signature(name, args, result):
        fn = getattr(k32, name)
        fn.argtypes, fn.restype = args, result
        return fn

    create_job = signature('CreateJobObjectW', [c.c_void_p, w.LPCWSTR], w.HANDLE)
    set_job = signature('SetInformationJobObject',
                        [w.HANDLE, c.c_int, c.c_void_p, w.DWORD], w.BOOL)
    close_handle = signature('CloseHandle', [w.HANDLE], w.BOOL)
    init_attrs = signature('InitializeProcThreadAttributeList',
                           [c.c_void_p, w.DWORD, w.DWORD, c.POINTER(SIZE)], w.BOOL)
    update_attrs = signature('UpdateProcThreadAttribute',
                             [c.c_void_p, w.DWORD, SIZE, c.c_void_p, SIZE,
                              c.c_void_p, c.c_void_p], w.BOOL)
    delete_attrs = signature('DeleteProcThreadAttributeList', [c.c_void_p], None)
    create_process = signature('CreateProcessW',
                               [w.LPCWSTR, w.LPWSTR, c.c_void_p, c.c_void_p,
                                w.BOOL, w.DWORD, c.c_void_p, w.LPCWSTR,
                                c.POINTER(StartupEx), c.POINTER(ProcessInfo)], w.BOOL)
    in_job = signature('IsProcessInJob',
                       [w.HANDLE, w.HANDLE, c.POINTER(w.BOOL)], w.BOOL)
    wait_process = signature('WaitForSingleObject', [w.HANDLE, w.DWORD], w.DWORD)
    open_process = signature('OpenProcess', [w.DWORD, w.BOOL, w.DWORD], w.HANDLE)


def checked(value):
    if not value:
        raise OSError('OWNED_PROCESS_WINDOWS_API_FAILED')
    return value


class OwnedProcessTree:
    """Own only a tree this object creates; never adopt a pre-existing PID."""
    def __init__(self):
        if os.name != 'nt':
            raise OSError('OWNED_PROCESS_WINDOWS_REQUIRED')
        self.job = checked(create_job(None, None))  # unnamed, non-inheritable
        self.process = None
        self.pid = None
        limits = Limits()
        limits.basic.flags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        try:
            checked(set_job(self.job, 9, c.byref(limits), c.sizeof(limits)))
        except BaseException:
            self.close()
            raise

    def start(self, executable, args):
        if not self.job or self.process is not None:
            raise ValueError('OWNED_PROCESS_NEW_TREE_REQUIRED')
        exe = Path(executable)
        if not exe.is_absolute() or not exe.is_file():
            raise ValueError('OWNED_PROCESS_ABSOLUTE_EXECUTABLE_REQUIRED')
        if not isinstance(args, list) or any(not isinstance(a, str) for a in args):
            raise ValueError('OWNED_PROCESS_ARGUMENT_LIST_REQUIRED')
        size = SIZE()
        init_attrs(None, 1, 0, c.byref(size))
        if not size.value or size.value > 65536:
            raise OSError('OWNED_PROCESS_ATTRIBUTE_SIZE_UNKNOWN')
        storage = c.create_string_buffer(size.value)
        checked(init_attrs(storage, 1, 0, c.byref(size)))
        info = ProcessInfo()
        try:
            # PROC_THREAD_ATTRIBUTE_JOB_LIST: input attribute number 13.
            jobs = (w.HANDLE * 1)(self.job)
            checked(update_attrs(storage, 0, 0x2000D, jobs, c.sizeof(jobs), None, None))
            startup = StartupEx()
            startup.startup.cb = c.sizeof(startup)
            startup.attributes = c.cast(storage, c.c_void_p)
            command = c.create_unicode_buffer(subprocess.list2cmdline([str(exe), *args]))
            # No shell, no inherited handles, no visible window. Job assignment
            # occurs before execution; there is no create-then-assign race.
            checked(create_process(str(exe), command, None, None, False,
                                   0x08000000 | 0x00080000, None, None,
                                   c.byref(startup), c.byref(info)))
            self.process, self.pid = info.process, int(info.pid)
            member = w.BOOL()
            checked(in_job(self.process, self.job, c.byref(member)))
            if not member.value:
                raise OSError('OWNED_PROCESS_JOB_MEMBERSHIP_UNVERIFIED')
            return self.pid
        except BaseException:
            self.close()
            raise
        finally:
            if info.thread:
                close_handle(info.thread)
            delete_attrs(storage)

    def close(self):
        job, self.job = getattr(self, 'job', None), None
        process, self.process = getattr(self, 'process', None), None
        if job:
            checked(close_handle(job))
        if process:
            try:
                if wait_process(process, 5000) != 0:
                    raise OSError('OWNED_PROCESS_STOP_NOT_CONFIRMED')
            finally:
                close_handle(process)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


def _worker(folder):
    child = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(120)'],
                             creationflags=subprocess.CREATE_NO_WINDOW)
    # The independent test observer opens handles BEFORE triggering stop, so
    # PID reuse cannot masquerade as termination of the original descendants.
    (folder / 'pids.json').write_text(json.dumps([os.getpid(), child.pid]))
    sequence = 0
    while True:
        sequence += 1
        (folder / 'beat.json').write_text(json.dumps({'sequence': sequence}))
        time.sleep(0.1)


def _owner(folder):
    with OwnedProcessTree() as tree:
        tree.start(str(Path(sys.executable).resolve()),
                   [str(Path(__file__).resolve()), '--worker', str(folder)])
        while not (folder / 'close.flag').exists():
            time.sleep(0.05)


def _await_file(file):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        try:
            return json.loads(file.read_text())
        except (FileNotFoundError, json.JSONDecodeError):
            time.sleep(0.05)
    raise RuntimeError('OWNED_PROCESS_PROBE_TIMED_OUT')


def selftest():
    if os.name != 'nt':
        raise OSError('OWNED_PROCESS_WINDOWS_REQUIRED')
    cases = []
    for crash in (False, True):
        folder = Path(tempfile.mkdtemp(prefix='mab-owned-stop-')).resolve()
        owner, sentinel, handles = None, None, []
        try:
            # A sibling outside this job must survive both stop mechanisms.
            # It is also owned by this test; no user's process is a test target.
            sentinel = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(120)'],
                                        creationflags=subprocess.CREATE_NO_WINDOW)
            owner = subprocess.Popen([sys.executable, str(Path(__file__).resolve()),
                                      '--owner', str(folder)],
                                     creationflags=subprocess.CREATE_NO_WINDOW)
            pids = _await_file(folder / 'pids.json')
            for pid in pids:
                handles.append(checked(open_process(0x00100000, False, pid)))
            first = _await_file(folder / 'beat.json')['sequence']
            time.sleep(0.25)
            second = _await_file(folder / 'beat.json')['sequence']
            if second <= first or any(wait_process(h, 0) != 258 for h in handles):
                raise RuntimeError('OWNED_PROCESS_LIVE_WORKER_NOT_PROVEN')
            if crash:
                owner.kill()  # only this probe's own supervisor
            else:
                (folder / 'close.flag').touch(exist_ok=False)
            owner.wait(timeout=8)
            if any(wait_process(h, 5000) != 0 for h in handles):
                raise RuntimeError('OWNED_PROCESS_DESCENDANTS_STILL_RUNNING')
            if sentinel.poll() is not None:
                raise RuntimeError('OWNED_PROCESS_UNRELATED_SIBLING_STOPPED')
            cases.append({'trigger': 'SUPERVISOR_TERMINATED' if crash else 'JOB_CLOSED',
                          'liveHeartbeatAdvanced': True, 'ownedDescendantsStopped': 2,
                          'outsideJobSiblingPreserved': True})
        finally:
            if owner and owner.poll() is None:
                owner.kill()
                owner.wait(timeout=8)
            if sentinel and sentinel.poll() is None:
                sentinel.kill()
                sentinel.wait(timeout=8)
            for handle in handles:
                close_handle(handle)
            # Nonrecursive cleanup of only this probe's known temporary files.
            for name in ('pids.json', 'beat.json', 'close.flag'):
                (folder / name).unlink(missing_ok=True)
            folder.rmdir()
    return {'status': 'OWNED_PROCESS_LIFECYCLE_PROVEN_NOT_MODEL_CLEARANCE',
            'cases': cases, 'modelCalls': 0, 'networkCalls': 0, 'worldWrites': 0,
            'resourceSafetyCertified': False, 'constructionApproved': False}


if __name__ == '__main__':
    try:
        if sys.argv[1:] == ['--selftest']:
            print(json.dumps(selftest()))
        elif len(sys.argv) == 3 and sys.argv[1] in ('--owner', '--worker'):
            (_owner if sys.argv[1] == '--owner' else _worker)(Path(sys.argv[2]).resolve())
        else:
            raise ValueError('OWNED_PROCESS_SELFTEST_ONLY')
    except Exception:
        print(json.dumps({'status': 'HOLD_OWNED_PROCESS_UNPROVEN',
                          'modelCalls': 0, 'networkCalls': 0, 'worldWrites': 0}))
        sys.exit(2)
