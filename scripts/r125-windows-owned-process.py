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
import threading
import queue
import re
import time

OWNED_OLLAMA_CONTEXT_LENGTH = 16384


def owned_ollama_environment(context_length=OWNED_OLLAMA_CONTEXT_LENGTH):
    """Return per-child Ollama settings for the isolated listener only."""
    if type(context_length) is not int or context_length != OWNED_OLLAMA_CONTEXT_LENGTH:
        raise ValueError('OWNED_OLLAMA_CONTEXT_LENGTH_REQUIRED')
    env = {'OLLAMA_HOST': '127.0.0.1:11435',
           'OLLAMA_CONTEXT_LENGTH': str(context_length),
           'OLLAMA_NUM_PARALLEL': '1',
           'OLLAMA_MAX_LOADED_MODELS': '1',
           'OLLAMA_KEEP_ALIVE': '0',
           'OLLAMA_NO_CLOUD': '1',
           'OLLAMA_FLASH_ATTENTION': '0',
           'OLLAMA_KV_CACHE_TYPE': 'f16',
           'OLLAMA_GPU_OVERHEAD': '0',
           'OLLAMA_SCHED_SPREAD': '0',
           'OLLAMA_MAX_QUEUE': '1'}
    # Keep only the installed model store location from inherited Ollama
    # settings. All memory/runtime knobs are cleared for the owned child.
    models = os.environ.get('OLLAMA_MODELS')
    if models:
        env['OLLAMA_MODELS'] = models
    return env


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


def parse_listener_pids(output, port=11435):
    if not isinstance(output, str) or not isinstance(port, int):
        raise ValueError('OWNED_LISTENER_OUTPUT_INVALID')
    found = set()
    for line in output.splitlines():
        fields = line.split()
        if len(fields) < 5 or fields[0].upper() != 'TCP' or \
                fields[3].upper() != 'LISTENING':
            continue
        local = fields[1]
        if local.rsplit(':', 1)[-1] != str(port):
            continue
        if not fields[4].isdigit() or int(fields[4]) <= 0:
            raise ValueError('OWNED_LISTENER_PID_INVALID')
        found.add(int(fields[4]))
    return sorted(found)


def _port_listener_pids(port=11435):
    result = subprocess.run(['netstat.exe', '-ano', '-p', 'tcp'],
                            capture_output=True, text=True, timeout=5,
                            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if result.returncode != 0:
        raise OSError('OWNED_LISTENER_IDENTITY_UNAVAILABLE')
    return parse_listener_pids(result.stdout, port)


class OwnedProviderDiagnostics:
    """Drain only this job's output; retain fixed categories, never raw text."""
    patterns = (
        ('MEMORY_ALLOCATION', r'out of memory|not enough memory|failed to allocate|cuda_error_out_of_memory'),
        ('GPU_RUNTIME', r'(?:cuda|cublas|gpu|vulkan|rocm).*(?:error|failed|unavailable|not found)|(?:error|failed).*\b(?:cuda|cublas|gpu|vulkan|rocm)\b'),
        ('MODEL_RUNNER_EXIT', r'runner.*(?:terminated|exited|crashed|died|stopped|failed to start)|exit status|process terminated|panic:|fatal error'),
        ('MODEL_FILE_OR_FORMAT', r'(?:model|manifest|blob|gguf).*(?:not found|no such file|invalid|corrupt|failed to open)'),
        ('REQUEST_OR_CONTEXT', r'context length.*(?:exceed|invalid|too (?:long|large))|context window.*(?:exceed|invalid)|token limit.*(?:exceed|invalid)|(?:invalid|unsupported).*(?:request|response.format|json schema)'),
        ('MODEL_LOAD', r'(?:failed to load|error loading|unable to load).*model|model.*(?:failed to load|loading failed)'),
        ('PROVIDER_TIMEOUT', r'(?:runner|request|inference|context deadline).*(?:timed out|timeout|deadline exceeded)|context deadline exceeded'),
    )

    def __init__(self):
        self.found = set()
        self.chunks = 0
        self.complete = False
        self.thread = None

    def consume(self, fd):
        # Bounded line fragments; keep draining to avoid pipe backpressure.
        try:
            with os.fdopen(fd, 'rb') as stream:
                while True:
                    raw = stream.readline(4096)
                    if not raw:
                        self.complete = True
                        break
                    self.chunks = min(self.chunks + 1, 1000000)
                    line = raw.decode('utf-8', errors='replace')
                    for name, pattern in self.patterns:
                        if re.search(pattern, line, re.IGNORECASE):
                            self.found.add(name)
        except OSError:
            pass

    def start(self, fd):
        self.thread = threading.Thread(target=self.consume, args=(fd,), daemon=True)
        self.thread.start()

    def summary(self):
        if self.thread:
            self.thread.join(timeout=2)
        return {'classes': sorted(name for name, _ in self.patterns if name in self.found),
                'chunks': self.chunks, 'complete': self.complete}


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

    def start(self, executable, args, env=None, clear_env_prefixes=(), diagnostics=None):
        if not self.job or self.process is not None:
            raise ValueError('OWNED_PROCESS_NEW_TREE_REQUIRED')
        exe = Path(executable)
        if not exe.is_absolute() or not exe.is_file():
            raise ValueError('OWNED_PROCESS_ABSOLUTE_EXECUTABLE_REQUIRED')
        if not isinstance(args, list) or any(not isinstance(a, str) for a in args):
            raise ValueError('OWNED_PROCESS_ARGUMENT_LIST_REQUIRED')
        attr_count = 2 if diagnostics is not None else 1
        size = SIZE()
        init_attrs(None, attr_count, 0, c.byref(size))
        if not size.value or size.value > 65536:
            raise OSError('OWNED_PROCESS_ATTRIBUTE_SIZE_UNKNOWN')
        storage = c.create_string_buffer(size.value)
        checked(init_attrs(storage, attr_count, 0, c.byref(size)))
        info = ProcessInfo()
        read_fd = write_fd = null_fd = None
        try:
            # PROC_THREAD_ATTRIBUTE_JOB_LIST: input attribute number 13.
            jobs = (w.HANDLE * 1)(self.job)
            checked(update_attrs(storage, 0, 0x2000D, jobs, c.sizeof(jobs), None, None))
            startup = StartupEx()
            startup.startup.cb = c.sizeof(startup)
            startup.attributes = c.cast(storage, c.c_void_p)
            command = c.create_unicode_buffer(subprocess.list2cmdline([str(exe), *args]))
            # No shell or visible window. Job assignment remains atomic.
            # Only the diagnostic pipe and NUL input may be inherited; the
            # non-inheritable job handle and controller pipes are excluded.
            if diagnostics is not None:
                import msvcrt
                read_fd, write_fd = os.pipe()
                null_fd = os.open(os.devnull, os.O_RDONLY | os.O_BINARY)
                os.set_inheritable(write_fd, True)
                os.set_inheritable(null_fd, True)
                write_handle = msvcrt.get_osfhandle(write_fd)
                null_handle = msvcrt.get_osfhandle(null_fd)
                handles = (w.HANDLE * 2)(write_handle, null_handle)
                checked(update_attrs(storage, 0, 0x20002, handles, c.sizeof(handles), None, None))
                startup.startup.flags |= 0x100  # STARTF_USESTDHANDLES
                startup.startup.stdin = null_handle
                startup.startup.stdout = startup.startup.stderr = write_handle
                diagnostics.start(read_fd)
                read_fd = None  # reader thread owns it
            environment = None
            flags = 0x08000000 | 0x00080000
            if env is not None:
                if not isinstance(env, dict) or any(
                    not isinstance(k, str) or not isinstance(v, str) or
                    not k or '=' in k or any(ch in k+v for ch in '\0\r\n')
                    for k, v in env.items()):
                    raise ValueError('OWNED_PROCESS_ENVIRONMENT_INVALID')
                if not isinstance(clear_env_prefixes, (tuple, list)) or any(
                        not isinstance(prefix, str) or not prefix or '=' in prefix
                        for prefix in clear_env_prefixes):
                    raise ValueError('OWNED_PROCESS_ENVIRONMENT_FILTER_INVALID')
                merged = os.environ.copy()
                for name in list(merged):
                    if any(name.upper().startswith(prefix.upper())
                           for prefix in clear_env_prefixes):
                        del merged[name]
                merged.update(env)
                block = '\0'.join(f'{k}={v}' for k, v in sorted(
                    merged.items(), key=lambda item: item[0].upper())) + '\0\0'
                environment = c.create_unicode_buffer(block)
                flags |= 0x00000400  # CREATE_UNICODE_ENVIRONMENT
            checked(create_process(str(exe), command, None, None, diagnostics is not None,
                                   flags, c.cast(environment, c.c_void_p)
                                   if environment is not None else None, None,
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
            for fd in (read_fd, write_fd, null_fd):
                if fd is not None:
                    os.close(fd)

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
    (folder / 'environment.json').write_text(json.dumps({
        'owned': os.environ.get('MAB_OWNED_TEST_VALUE'),
        'ollamaHost': os.environ.get('OLLAMA_HOST'),
        'ollamaContext': os.environ.get('OLLAMA_CONTEXT_LENGTH'),
        'ollamaParallel': os.environ.get('OLLAMA_NUM_PARALLEL'),
        'ollamaMaxModels': os.environ.get('OLLAMA_MAX_LOADED_MODELS'),
        'ollamaKeepAlive': os.environ.get('OLLAMA_KEEP_ALIVE'),
        'ollamaCloud': os.environ.get('OLLAMA_NO_CLOUD'),
        'ollamaFlash': os.environ.get('OLLAMA_FLASH_ATTENTION'),
        'ollamaGpuOverhead': os.environ.get('OLLAMA_GPU_OVERHEAD'),
        'ollamaSpread': os.environ.get('OLLAMA_SCHED_SPREAD'),
        'ollamaMaxQueue': os.environ.get('OLLAMA_MAX_QUEUE'),
        'ollamaKvCache': os.environ.get('OLLAMA_KV_CACHE_TYPE'),
        'ollamaSentinel': os.environ.get('OLLAMA_RUNTIME_SENTINEL'),
        'llamaFitTarget': os.environ.get('LLAMA_ARG_FIT_TARGET')}))
    sequence = 0
    while True:
        sequence += 1
        (folder / 'beat.json').write_text(json.dumps({'sequence': sequence}))
        time.sleep(0.1)


def _owner(folder):
    with OwnedProcessTree() as tree:
        tree.start(str(Path(sys.executable).resolve()),
                   [str(Path(__file__).resolve()), '--worker', str(folder)],
                   env={**owned_ollama_environment(),
                        'MAB_OWNED_TEST_VALUE': 'job-owned'},
                   clear_env_prefixes=('OLLAMA_', 'LLAMA_ARG_'))
        while not (folder / 'close.flag').exists():
            time.sleep(0.05)


def _ollama_supervisor(executable, sample_folder, nonce, monitor_pid):
    """Own only a fresh Ollama server bound to the dedicated 11435 endpoint.

    The server is assigned to a new kill-on-close Job at process creation.
    stdin accepts exactly one STOP command. The shared 11434 daemon is never
    discovered, adopted, or terminated by this supervisor.
    """
    if os.name != 'nt':
        raise OSError('OWNED_OLLAMA_WINDOWS_REQUIRED')
    folder = Path(sample_folder).resolve(strict=True)
    if len(nonce) != 32 or any(ch not in '0123456789abcdef' for ch in nonce) or \
            not monitor_pid.isdigit() or int(monitor_pid) <= 0:
        raise ValueError('OWNED_OLLAMA_MONITOR_BINDING_REQUIRED')
    context_length = OWNED_OLLAMA_CONTEXT_LENGTH
    monitor_pid = int(monitor_pid)
    exe = Path(executable)
    if not exe.is_absolute() or exe.name.lower() != 'ollama.exe' or not exe.is_file():
        raise ValueError('OWNED_OLLAMA_EXE_REQUIRED')
    import socket
    probe = socket.socket()
    try:
        probe.bind(('127.0.0.1', 11435))
    except OSError as exc:
        raise OSError('OWNED_OLLAMA_PORT_11435_NOT_FREE') from exc
    finally:
        probe.close()
    monitor_handle = checked(open_process(0x00100000, False, monitor_pid))

    commands = queue.Queue()
    def read_commands():
        for line in sys.stdin:
            commands.put(line.rstrip('\r\n'))
        commands.put(None)  # Parent/controller closed its pipe: fail closed.
    threading.Thread(target=read_commands, daemon=True).start()
    tree = OwnedProcessTree()
    diagnostics = OwnedProviderDiagnostics()
    stop_reason = 'REQUESTED_STOP'
    last_seq = 0
    last_sample_ms = 0
    try:
        pid = tree.start(str(exe), ['serve'],
                         env=owned_ollama_environment(context_length),
                         clear_env_prefixes=('OLLAMA_', 'LLAMA_ARG_'),
                         diagnostics=diagnostics)
        listen_deadline = time.monotonic() + 15
        while time.monotonic() < listen_deadline:
            if wait_process(tree.process, 0) != 258:
                raise OSError('OWNED_OLLAMA_EXITED_BEFORE_LISTEN')
            listeners = _port_listener_pids(11435)
            if listeners == [pid]:
                break
            if listeners:
                raise OSError('OWNED_OLLAMA_PORT_PID_MISMATCH')
            time.sleep(0.1)
        else:
            raise OSError('OWNED_OLLAMA_LISTENER_NOT_READY')
        print(json.dumps({'status': 'OWNED_OLLAMA_STARTED', 'pid': pid,
                          'port': 11435, 'killOnCloseJob': True,
                          'listenerPid': pid,'monitorPid': monitor_pid,
                          'configuredContextLength': context_length,
                          'configuredParallelRequests': 1,
                          'configuredMaxLoadedModels': 1,
                          'configuredKeepAliveSeconds': 0,
                          'cloudDisabled': True,
                          'configuredFlashAttention': False,
                          'configuredKvCacheType': 'f16',
                          'configuredGpuOverheadBytes': 0,
                          'configuredScheduleSpread': False,
                          'configuredMaxQueue': 1}), flush=True)
        while True:
            if _port_listener_pids(11435) != [pid]:
                stop_reason = 'OWNED_PORT_IDENTITY_MISMATCH'
                break
            if wait_process(monitor_handle, 0) != 258:
                stop_reason = 'INDEPENDENT_MONITOR_EXITED'
                break
            try:
                session = json.loads((folder / 'session.json').read_text())
                sample = json.loads((folder / 'sample.json').read_text())
                data = sample.get('data')
                valid = (session.get('nonce') == nonce and
                    session.get('monitorPid') == monitor_pid and
                    sample.get('nonce') == nonce and sample.get('pid') == monitor_pid and
                    sample.get('state') == 'ALIVE' and
                    type(sample.get('seq')) is int and sample['seq'] > 0 and
                    isinstance(data, dict) and
                    all(type(data.get(k)) is int and data[k] >= 0 for k in
                        ('ramFreeMiB', 'commitHeadroomMiB', 'gpuTotalMiB',
                         'gpuFreeMiB', 'sampleMs')) and
                    data['gpuTotalMiB'] > 0 and data['gpuFreeMiB'] <= data['gpuTotalMiB'] and
                    0 <= int(time.time() * 1000) - data['sampleMs'] <= 3000)
                if not valid:
                    raise ValueError('SENSOR_SAMPLE_INVALID_OR_STALE')
                if sample['seq'] > last_seq:
                    if data['sampleMs'] <= last_sample_ms:
                        raise ValueError('SENSOR_HEARTBEAT_NOT_ADVANCING')
                    last_seq, last_sample_ms = sample['seq'], data['sampleMs']
                elif sample['seq'] < last_seq:
                    raise ValueError('SENSOR_SEQUENCE_ROLLBACK')
            except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
                stop_reason = 'SENSOR_' + str(exc)
                break
            try:
                command = commands.get(timeout=0.1)
            except queue.Empty:
                if wait_process(tree.process, 0) != 258:
                    raise OSError('OWNED_OLLAMA_EXITED_UNEXPECTEDLY')
                continue
            if command is None:
                stop_reason = 'CONTROLLER_DISCONNECTED'
                break
            if command != 'STOP':
                stop_reason = 'COMMAND_REJECTED'
                break
            break
    finally:
        tree.close()
        close_handle(monitor_handle)
    print(json.dumps({'status': 'OWNED_OLLAMA_STOPPED', 'pid': pid,
                      'port': 11435, 'jobClosed': True,
                      'stopReason': stop_reason,
                      'providerDiagnostics': diagnostics.summary()}), flush=True)


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
    diagnostics = OwnedProviderDiagnostics()
    with OwnedProcessTree() as diagnostic_tree:
        diagnostic_tree.start(str(Path(sys.executable).resolve()),
                              ['-c', 'import sys; print("CUDA out of memory SECRET_PRIVATE_PATH", file=sys.stderr); print("context deadline exceeded", file=sys.stdout)'],
                              diagnostics=diagnostics)
        if wait_process(diagnostic_tree.process, 5000) != 0:
            raise RuntimeError('OWNED_DIAGNOSTIC_CHILD_NOT_EXITED')
    summary = diagnostics.summary()
    if summary['classes'] != ['MEMORY_ALLOCATION', 'PROVIDER_TIMEOUT'] or not summary['complete'] or summary['chunks'] < 2 or 'SECRET_PRIVATE_PATH' in json.dumps(summary):
        raise RuntimeError('OWNED_DIAGNOSTIC_PIPE_OR_PRIVACY_FAILED')
    inherited = os.environ.get('OLLAMA_CONTEXT_LENGTH')
    owned_env = owned_ollama_environment()
    if owned_env.get('OLLAMA_HOST') != '127.0.0.1:11435' or \
            owned_env.get('OLLAMA_CONTEXT_LENGTH') != '16384' or \
            owned_env.get('OLLAMA_NUM_PARALLEL') != '1' or \
            owned_env.get('OLLAMA_MAX_LOADED_MODELS') != '1' or \
            owned_env.get('OLLAMA_KEEP_ALIVE') != '0' or \
            owned_env.get('OLLAMA_NO_CLOUD') != '1' or \
            owned_env.get('OLLAMA_FLASH_ATTENTION') != '0' or \
            owned_env.get('OLLAMA_KV_CACHE_TYPE') != 'f16' or \
            owned_env.get('OLLAMA_GPU_OVERHEAD') != '0' or \
            owned_env.get('OLLAMA_SCHED_SPREAD') != '0' or \
            owned_env.get('OLLAMA_MAX_QUEUE') != '1' or \
            os.environ.get('OLLAMA_CONTEXT_LENGTH') != inherited:
        raise RuntimeError('OWNED_OLLAMA_CONTEXT_ENVIRONMENT_SCOPE_FAILED')
    try:
        owned_ollama_environment(2048)
    except ValueError:
        cases.append({'context': '16384', 'childOnly': True,
                      'mismatchRejected': True})
    else:
        raise RuntimeError('OWNED_OLLAMA_CONTEXT_MISMATCH_ACCEPTED')
    if parse_listener_pids(' TCP 127.0.0.1:11435 0.0.0.0:0 LISTENING 1234\n') != [1234] or \
            parse_listener_pids(' TCP 127.0.0.1:11436 0.0.0.0:0 LISTENING 1234\n'):
        raise RuntimeError('OWNED_LISTENER_PID_PARSER_FAILED')
    for crash in (False, True):
        folder = Path(tempfile.mkdtemp(prefix='mab-owned-stop-')).resolve()
        owner, sentinel, handles = None, None, []
        try:
            # A sibling outside this job must survive both stop mechanisms.
            # It is also owned by this test; no user's process is a test target.
            sentinel = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(120)'],
                                        creationflags=subprocess.CREATE_NO_WINDOW)
            prior_ollama_sentinel = os.environ.get('OLLAMA_RUNTIME_SENTINEL')
            prior_llama_target = os.environ.get('LLAMA_ARG_FIT_TARGET')
            os.environ['OLLAMA_RUNTIME_SENTINEL'] = 'must-not-leak'
            os.environ['LLAMA_ARG_FIT_TARGET'] = '99999'
            try:
                owner = subprocess.Popen([sys.executable, str(Path(__file__).resolve()),
                                          '--owner', str(folder)],
                                         creationflags=subprocess.CREATE_NO_WINDOW)
            finally:
                if prior_ollama_sentinel is None:
                    os.environ.pop('OLLAMA_RUNTIME_SENTINEL', None)
                else:
                    os.environ['OLLAMA_RUNTIME_SENTINEL'] = prior_ollama_sentinel
                if prior_llama_target is None:
                    os.environ.pop('LLAMA_ARG_FIT_TARGET', None)
                else:
                    os.environ['LLAMA_ARG_FIT_TARGET'] = prior_llama_target
            pids = _await_file(folder / 'pids.json')
            child_env = _await_file(folder / 'environment.json')
            if child_env.get('owned') != 'job-owned' or \
                    child_env.get('ollamaHost') != '127.0.0.1:11435' or \
                    child_env.get('ollamaContext') != '16384' or \
                    child_env.get('ollamaParallel') != '1' or \
                    child_env.get('ollamaMaxModels') != '1' or \
                    child_env.get('ollamaKeepAlive') != '0' or \
                    child_env.get('ollamaCloud') != '1' or \
                    child_env.get('ollamaFlash') != '0' or \
                    child_env.get('ollamaGpuOverhead') != '0' or \
                    child_env.get('ollamaSpread') != '0' or \
                    child_env.get('ollamaMaxQueue') != '1' or \
                    child_env.get('ollamaKvCache') != 'f16' or \
                    child_env.get('ollamaSentinel') is not None or \
                    child_env.get('llamaFitTarget') is not None:
                raise RuntimeError('OWNED_PROCESS_ENVIRONMENT_NOT_INHERITED')
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
            for name in ('pids.json', 'environment.json', 'beat.json', 'close.flag'):
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
        elif len(sys.argv) == 6 and sys.argv[1] == '--serve-ollama':
            _ollama_supervisor(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
        else:
            raise ValueError('OWNED_PROCESS_SELFTEST_ONLY')
    except Exception:
        print(json.dumps({'status': 'HOLD_OWNED_PROCESS_UNPROVEN',
                          'modelCalls': 0, 'networkCalls': 0, 'worldWrites': 0}))
        sys.exit(2)
