#!/usr/bin/env python3
"""Single-project, fail-closed OpenCode supervisor. Prototype, not an OS sandbox."""
from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import uuid

from docker_sandbox import DockerPolicy, SandboxHold, docker_preflight
from docker_sandbox_verified import docker_exec

PROJECTS = {
    "minecraftaibuilder": "ryomashibaba/MinecraftAIBuilder",
    "browser-ink-tps": "ryomashibaba/browser-ink-tps",
}
BLOCKED_PARTS = {".git", ".github", ".env", ".opencode", "node_modules", "START_HERE.md", "CURRENT_CANONICAL.md"}
BLOCKED_PREFIXES = ("docs/continuity/", "evidence/", "designs/")


class Hold(Exception):
    pass


def git(workspace: Path, *args: str, check: bool = True) -> str:
    p = subprocess.run(["git", *args], cwd=workspace, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=35,
                       env={**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"})
    if check and p.returncode:
        raise Hold(f"GIT_{args[0].upper()}_FAILED: {p.stderr[-1000:]}")
    return p.stdout.strip()


def verify_repo(cfg: dict) -> Path:
    p = Path(cfg["workspace"]).expanduser().resolve(strict=True)
    if not (p / ".git").is_dir():
        raise Hold("WORKSPACE_MUST_BE_DEDICATED_CLONE_NOT_WORKTREE")
    if Path(git(p, "rev-parse", "--show-toplevel")).resolve() != p:
        raise Hold("WORKSPACE_ROOT_MISMATCH")
    expected = PROJECTS[cfg["project"]]
    origin = git(p, "remote", "get-url", "origin")
    valid = {f"https://github.com/{expected}", f"https://github.com/{expected}.git",
             f"git@github.com:{expected}.git", f"git@github.com:{expected}"}
    if origin not in valid:
        raise Hold("ORIGIN_NOT_EXACT_ALLOWLIST")
    branch = git(p, "branch", "--show-current")
    if branch != cfg["branch"] or not branch.startswith("research/"):
        raise Hold("RESEARCH_BRANCH_REQUIRED")
    if re.fullmatch(r"research/[A-Za-z0-9][A-Za-z0-9._/-]*", branch) is None or ".." in branch:
        raise Hold("BAD_RESEARCH_REF")
    return p


def require_existing_remote_research_branch(cfg: dict, workspace: Path) -> str:
    """Read-only admission: no unattended push may CREATE a remote branch.

    The exact GitHub origin and local research/ branch are checked again here;
    lack of network/authentication or an absent remote branch fails closed.
    This is an approval boundary, not evidence of actual source quality.
    """
    verify_repo(cfg)
    ref = "refs/heads/" + cfg["branch"]
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"}
    try:
        result = subprocess.run(
            ["git", "ls-remote", "--exit-code", "--heads", "origin", ref],
            cwd=workspace, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=25, env=env,
        )
    except (OSError, subprocess.TimeoutExpired) as ex:
        raise Hold("REMOTE_RESEARCH_PREFLIGHT_UNAVAILABLE") from ex
    expected_suffix = "\t" + ref
    records = [line for line in result.stdout.splitlines() if line]
    if (result.returncode != 0 or len(records) != 1
            or not records[0].endswith(expected_suffix)
            or not re.fullmatch(r"[0-9a-f]{40}", records[0][:-len(expected_suffix)])):
        raise Hold("REMOTE_RESEARCH_BRANCH_NOT_PREEXISTING")
    return records[0][:-len(expected_suffix)]


def push_verified_research_commit(cfg: dict, workspace: Path, expected_head: str) -> str:
    """Publish an already-QA-verified HEAD only if the exact remote ref is unchanged.

    The explicit lease prevents a race with another developer; proving the
    remote SHA is a LOCAL ancestor of the candidate prevents a non-FF update.
    Nothing uses this on main or creates a new branch.
    """
    verify_repo(cfg)
    if git(workspace, "rev-parse", "HEAD") != expected_head:
        raise Hold("GIT_HISTORY_CHANGED_BEFORE_PUSH")
    if changed_files(workspace):
        raise Hold("UNVERIFIED_WORKTREE_BEFORE_PUSH")
    remote_sha = require_existing_remote_research_branch(cfg, workspace)
    # The remote object may not exist in a shallow/old clone. Refuse rather
    # than fetch/rebase/merge/update protected material automatically.
    ancestry = subprocess.run(
        ["git", "merge-base", "--is-ancestor", remote_sha, expected_head],
        cwd=workspace, capture_output=True, timeout=35, check=False,
        env={**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"},
    )
    if ancestry.returncode != 0:
        raise Hold("REMOTE_RESEARCH_TIP_NOT_LOCAL_ANCESTOR")
    verify_repo(cfg)
    if (git(workspace, "rev-parse", "HEAD") != expected_head
            or changed_files(workspace)):
        raise Hold("LOCAL_SOURCE_CHANGED_BEFORE_PUSH")
    ref = "refs/heads/" + cfg["branch"]
    # Lease is intentionally precise. A forced update is NEVER allowed unless
    # it is a proven fast-forward against the exact SHA observed above.
    # No branch creation or automatic git fetch/rebase/pull is permitted.
    git(workspace, "push", "--porcelain",
        f"--force-with-lease={ref}:{remote_sha}",
        "origin", f"{expected_head}:{ref}")
    return remote_sha


def changed_files(p: Path) -> list[str]:
    # Using porcelain -z makes filenames with whitespace and rename entries unambiguous.
    raw = subprocess.check_output(["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"], cwd=p)
    records = raw.split(b"\0")
    paths = []
    i = 0
    while i < len(records) and records[i]:
        entry = records[i].decode("utf-8", "surrogateescape")
        status = entry[:2]
        paths.append(entry[3:])
        if "R" in status or "C" in status:
            i += 1
            if i >= len(records) or not records[i]:
                raise Hold("BAD_GIT_RENAME_STATUS")
            paths.append(records[i].decode("utf-8", "surrogateescape"))
        i += 1
    return sorted(set(paths))


def check_paths(p: Path, paths: list[str], allowed: list[str]) -> None:
    if not paths:
        raise Hold("NO_SOURCE_CHANGE_FROM_AGENT")
    for name in paths:
        normalized = name.replace("\\", "/")
        parts = Path(normalized).parts
        if (name.startswith("/") or ".." in parts or any(part in BLOCKED_PARTS for part in parts)
                or any(normalized.startswith(x) for x in BLOCKED_PREFIXES)
                or not any(normalized.startswith(prefix.rstrip("/") + "/") for prefix in allowed)):
            raise Hold(f"PATH_NOT_APPROVED: {name}")
        target = p / name
        if target.is_symlink() or (target.exists() and not target.resolve().is_relative_to(p)):
            raise Hold(f"SYMLINK_OR_ESCAPE: {name}")


def snapshot_candidate(workspace: Path, paths: list[str]) -> dict[str, str]:
    """SHA256 of exact source bytes, recording deletions separately."""
    result = {}
    for name in paths:
        target = workspace / name
        if target.is_symlink():
            raise Hold("CANDIDATE_SYMLINK_REFUSED")
        if not target.exists():
            result[name] = "DELETED"
        elif target.is_file():
            result[name] = hashlib.sha256(target.read_bytes()).hexdigest()
        else:
            raise Hold("CANDIDATE_NOT_REGULAR_FILE")
    return result


def quarantine_and_restore_unverified(
    cfg: dict, workspace: Path, state_dir: Path, paths: list[str],
    expected_head: str, *, opt_in_key: str = "quarantine_unverified_on_resume",
) -> dict:
    """Explicit opt-in recovery of an UNVERIFIED disposable research clone.

    Back up EVERY changed regular file before restoring only those exact paths.
    No git clean, silent discard, cross-project model switch, or public upload.
    Never use this on a source checkout that is not an intentionally disposable
    and separately authorized research clone.
    """
    if opt_in_key not in ("quarantine_unverified_on_resume",
                          "quarantine_unverified_on_agent_failure",
                          "quarantine_unverified_on_qa_failure"):
        raise Hold("RESUME_QUARANTINE_UNKNOWN_AUTHORIZATION")
    if cfg.get(opt_in_key) is not True:
        raise Hold("RESUME_QUARANTINE_NOT_AUTHORIZED")
    if not paths or len(paths) > 20:
        raise Hold("RESUME_QUARANTINE_PATH_BUDGET")
    verify_repo(cfg)
    if git(workspace, "rev-parse", "HEAD") != expected_head:
        raise Hold("RESUME_QUARANTINE_HEAD_CHANGED_BEFORE_BACKUP")
    check_paths(workspace, paths, cfg["allowed_prefixes"])
    # Bound file sizes BEFORE hashing/reading any untrusted leftover. A failed
    # agent can leave a massive file; its size is not a reason to OOM on resume.
    size_hint = 0
    for name in paths:
        candidate = workspace / name
        for parent in candidate.parents:
            if parent == workspace:
                break
            if parent.is_symlink():
                raise Hold("RESUME_QUARANTINE_SYMLINK_PARENT")
        if candidate.is_symlink():
            raise Hold("RESUME_QUARANTINE_SYMLINK_REFUSED")
        if candidate.exists():
            if not candidate.is_file():
                raise Hold("RESUME_QUARANTINE_NONREGULAR_FILE")
            size_hint += candidate.stat().st_size
            if size_hint > 2_000_000:
                raise Hold("RESUME_QUARANTINE_BYTES_BUDGET")
    before = snapshot_candidate(workspace, paths)
    tracked_raw = subprocess.check_output(
        ["git", "ls-files", "--cached", "-z"], cwd=workspace, timeout=35)
    tracked = set(tracked_raw.decode("utf-8", "surrogateescape").split(chr(0)))
    total = 0
    payloads = []
    for name in paths:
        target = workspace / name
        for parent in target.parents:
            if parent == workspace:
                break
            if parent.is_symlink():
                raise Hold("RESUME_QUARANTINE_SYMLINK_PARENT")
        if target.exists():
            if not target.is_file():
                raise Hold("RESUME_QUARANTINE_NONREGULAR_FILE")
            payload = target.read_bytes()
            total += len(payload)
        else:
            payload = None  # A staged or unstaged deletion is still recorded.
        if total > 2_000_000:
            raise Hold("RESUME_QUARANTINE_BYTES_BUDGET")
        payloads.append((name, payload, name in tracked))
    # A stable pre-copy snapshot prevents saving a file from one version and
    # resetting a concurrently changed version without provenance.
    if snapshot_candidate(workspace, paths) != before:
        raise Hold("RESUME_QUARANTINE_SOURCE_CHANGED_DURING_READ")
    checkpoint = uuid.uuid4().hex
    backup_dir = state_dir / "quarantine" / checkpoint
    backup_dir.mkdir(parents=True, exist_ok=False)
    items = []
    for index, (name, payload, is_tracked) in enumerate(payloads):
        proof = before[name]
        filename = None
        if payload is not None:
            if hashlib.sha256(payload).hexdigest() != proof:
                raise Hold("RESUME_QUARANTINE_HASH_MISMATCH")
            filename = f"{index:03d}-{proof}.bin"
            dst = backup_dir / filename
            dst.write_bytes(payload)
            if hashlib.sha256(dst.read_bytes()).hexdigest() != proof:
                raise Hold("RESUME_QUARANTINE_BACKUP_VERIFY_FAILED")
        items.append({"path": name, "tracked": is_tracked,
                      "sha256_or_deleted": proof, "backup": filename})
    manifest = backup_dir / "manifest.private.json"
    write_atomic(manifest, {
        "schema": "dec-unverified-source-quarantine-v1",
        "scope": "PRIVATE_UNVERIFIED_NOT_QA_PASSED",
        "project": cfg["project"], "branch": cfg["branch"],
        "verified_head": git(workspace, "rev-parse", "HEAD"),
        "items": items,
    })
    # Fail closed: require the same source bytes, origin, research branch and
    # HEAD after the PRIVATE backup and immediately before any restoration.
    verify_repo(cfg)
    if git(workspace, "rev-parse", "HEAD") != expected_head:
        raise Hold("RESUME_QUARANTINE_HEAD_CHANGED_BEFORE_RESTORE")
    if snapshot_candidate(workspace, paths) != before:
        raise Hold("RESUME_QUARANTINE_SOURCE_CHANGED_BEFORE_RESTORE")
    tracked_paths = [name for name, _, is_tracked in payloads if is_tracked]
    if tracked_paths:
        git(workspace, "restore", "--source=HEAD", "--staged", "--worktree",
            "--", *tracked_paths)
    for name, _, is_tracked in payloads:
        if not is_tracked:
            target = workspace / name
            if target.is_symlink() or not target.is_file():
                raise Hold("RESUME_QUARANTINE_UNTRACKED_FILE_CHANGED")
            target.unlink()
    if (changed_files(workspace) or not manifest.is_file()
            or git(workspace, "rev-parse", "HEAD") != expected_head):
        raise Hold("RESUME_QUARANTINE_RESTORE_NOT_CLEAN")
    return {"checkpoint": checkpoint, "paths": len(paths),
            "private_manifest": str(manifest),
            "status": "PRIVATE_BACKUP_VERIFIED_RESEARCH_CLONE_RESTORED",
            "certification": "NO_MODEL_OR_QA_RUN_BY_RECOVERY"}


@contextlib.contextmanager
def single_agent_lock():
    base = Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "FreeAutonomySolo"
    base.mkdir(parents=True, exist_ok=True)
    try:
        f = open(base / "one-local-project.lock", "a+b")
    except OSError as ex:
        raise Hold("LOCAL_AGENT_LOCK_FILE_UNAVAILABLE") from ex
    try:
        # On Windows, reading or initializing a region already locked by
        # another process can itself raise PermissionError *before* calling
        # msvcrt.locking. Normalize this to a fail-closed ownership HOLD.
        try:
            f.seek(0)
            if not f.read(1):
                f.seek(0)
                f.write(b"0")
                f.flush()
            f.seek(0)
        except (PermissionError, BlockingIOError) as ex:
            raise Hold("ANOTHER_LOCAL_AGENT_OWNS_LOCK") from ex
        if os.name == "nt":
            import msvcrt
            try:
                msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError as ex:
                raise Hold("ANOTHER_LOCAL_AGENT_OWNS_LOCK") from ex
        else:
            import fcntl
            try:
                fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError as ex:
                raise Hold("ANOTHER_LOCAL_AGENT_OWNS_LOCK") from ex
        yield
    finally:
        f.close()  # OS releases on process death too.


def write_atomic(path: Path, obj: dict) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def run_cmd(argv: list[str], cwd: Path, timeout: int, log: Path) -> tuple[int, str]:
    """Kill spawned child group on deadline; preserve private logs outside Git."""
    kw = {"cwd": cwd, "stdout": subprocess.PIPE, "stderr": subprocess.STDOUT,
          "stdin": subprocess.DEVNULL, "text": True, "encoding": "utf-8", "errors": "replace"}
    if os.name == "nt":
        kw["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kw["start_new_session"] = True
    process = subprocess.Popen(argv, **kw)
    timed_out = False
    try:
        output, _ = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                           capture_output=True, timeout=20, check=False)
        else:
            import signal
            os.killpg(process.pid, signal.SIGKILL)
        output, _ = process.communicate(timeout=25)
    log.write_text(output[-150000:], encoding="utf-8")
    return (124 if timed_out else process.returncode), output[-3500:]


def validate(cfg: dict) -> None:
    required = {"project", "workspace", "branch", "model", "tasks", "checks", "allowed_prefixes", "state_dir"}
    if not required.issubset(cfg) or cfg["project"] not in PROJECTS:
        raise Hold("INVALID_CONFIG_OR_PROJECT")
    goal = cfg.get("continuous_goal")
    if goal is not None and (not isinstance(goal, str) or not goal.strip()):
        raise Hold("CONTINUOUS_GOAL_INVALID")
    if not isinstance(cfg["tasks"], list) or (not cfg["tasks"] and not goal) or not all(isinstance(t, str) and t.strip() for t in cfg["tasks"]):
        raise Hold("TASKS_OR_CONTINUOUS_GOAL_REQUIRED")
    if not isinstance(cfg["checks"], list) or not cfg["checks"] or not all(isinstance(c, list) and c and all(isinstance(a, str) and a for a in c) for c in cfg["checks"]):
        raise Hold("CHECKS_ARGV_LIST_REQUIRED")
    if not isinstance(cfg["allowed_prefixes"], list) or not cfg["allowed_prefixes"] or not all(re.fullmatch(r"[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*/?", x) for x in cfg["allowed_prefixes"]):
        raise Hold("BAD_ALLOWED_PREFIXES")
    model = cfg["model"]
    if not isinstance(model, str) or not (model.startswith("ollama/") or (model.startswith("opencode/") and model.endswith("-free"))):
        raise Hold("ONLY_EXPLICIT_LOCAL_OR_FREE_MODEL")
    # Only explicitly selected LOCAL or name-marked FREE models may be tried.
    # Never discover a provider's paid fallback or rotate projects.
    fallbacks = cfg.get("fallback_models", [])
    if (not isinstance(fallbacks, list) or len(fallbacks) > 3 or
            any(not isinstance(v, str) or not re.fullmatch(
                r"(?:ollama/[A-Za-z0-9_.:/-]{1,100}|opencode/[A-Za-z0-9_.-]{1,100}-free)", v
            ) for v in fallbacks) or len(set([model, *fallbacks])) != len(fallbacks) + 1):
        raise Hold("FALLBACK_MODELS_MUST_BE_EXPLICIT_LOCAL_OR_FREE_AND_DISTINCT")
    if cfg.get("sandbox_runtime") != "docker":
        raise Hold("DOCKER_RUNTIME_REQUIRED_FOR_UNATTENDED_EXECUTION")
    try:
        DockerPolicy.from_config(cfg)
    except SandboxHold as ex:
        raise Hold(str(ex)) from ex
    for opt_in in ("quarantine_unverified_on_resume",
                   "quarantine_unverified_on_agent_failure",
                   "quarantine_unverified_on_qa_failure"):
        if type(cfg.get(opt_in, False)) is not bool:
            raise Hold("RESUME_QUARANTINE_OPT_IN_MUST_BE_BOOLEAN")
    for key, default, limit in [("max_cycles", 12, 10000), ("per_task_attempts", 3, 10), ("agent_timeout_seconds", 1800, 86400), ("check_timeout_seconds", 600, 3600), ("max_minutes", 720, 10080)]:
        value = cfg.setdefault(key, default)
        if type(value) is not int or not (1 <= value <= limit):
            raise Hold(f"BAD_LIMIT_{key}")


def run_in_docker(cfg: dict, command: list[str], cwd: Path, timeout: int, log: Path, *, agent: bool) -> tuple[int, str]:
    try:
        policy = DockerPolicy.from_config(cfg)
        return docker_exec(policy, cwd, agent=agent, command=command,
                           cidfile=log.with_suffix(".container-id"), timeout=timeout, log=log)
    except SandboxHold as ex:
        raise Hold(str(ex)) from ex


def execute(cfg: dict, *, push: bool, sandbox_attested: bool,
            retry_unavailable_once: bool = False) -> dict:
    validate(cfg)
    if not sandbox_attested:
        raise Hold("DOCKER_RUNTIME_NOT_ACKNOWLEDGED")
    try:
        docker_preflight(DockerPolicy.from_config(cfg))
    except SandboxHold as ex:
        raise Hold(str(ex)) from ex
    p = verify_repo(cfg)
    state_dir = Path(cfg["state_dir"]).expanduser().resolve()
    if state_dir == p or p in state_dir.parents or state_dir in p.parents:
        raise Hold("STATE_MUST_BE_SEPARATE_FROM_WORKSPACE")
    state_dir.mkdir(parents=True, exist_ok=True)
    cfg_hash = hashlib.sha256(json.dumps({k: v for k, v in cfg.items() if k != "state_dir"}, sort_keys=True).encode()).hexdigest()
    state_path = state_dir / "state.json"
    if state_path.exists():
        state = json.loads(state_path.read_text(encoding="utf-8"))
        if state.get("config_sha256") != cfg_hash:
            raise Hold("RESUME_CONFIG_CHANGED")
    else:
        if changed_files(p):
            raise Hold("INITIAL_WORKSPACE_NOT_CLEAN")
        state = {"config_sha256": cfg_hash, "project": cfg["project"], "branch": cfg["branch"],
                 "next_task": 0, "cycles": 0, "commits": [], "outcomes": [], "status": "RUNNING",
                 "model_configured": cfg["model"], "real_model_verified": False, "quality_certified": False,
                 "last_head": git(p, "rev-parse", "HEAD")}
        write_atomic(state_path, state)
    if state.get("last_head") != git(p, "rev-parse", "HEAD"):
        raise Hold("GIT_HISTORY_CHANGED_OUTSIDE_SUPERVISOR")
    deadline = time.monotonic() + cfg["max_minutes"] * 60
    with single_agent_lock():
        # Never resume on a dirty disposable clone. A killed agent, failed QA,
        # or interrupted free-cloud fallback may have left UNVERIFIED edits.
        # Check BEFORE pushing an older verified commit or invoking any model.
        # Within a single running session, QA retries can still work on their
        # own candidate; this gate applies only on fresh execute()/resume.
        verify_repo(cfg)
        if git(p, "rev-parse", "HEAD") != state["last_head"]:
            state["status"] = "HOLD"
            state["hold_reason"] = "GIT_HISTORY_CHANGED_BEFORE_RESUME"
            write_atomic(state_path, state)
            raise Hold(state["hold_reason"])
        unverified_paths = changed_files(p)
        if unverified_paths:
            if cfg.get("quarantine_unverified_on_resume") is True:
                try:
                    recovery = quarantine_and_restore_unverified(
                        cfg, p, state_dir, unverified_paths, state["last_head"])
                    if git(p, "rev-parse", "HEAD") != state["last_head"]:
                        raise Hold("RESUME_QUARANTINE_HEAD_CHANGED")
                    state.setdefault("resume_quarantines", []).append(recovery)
                    write_atomic(state_path, state)
                except (Hold, OSError, subprocess.SubprocessError) as ex:
                    state["status"] = "HOLD"
                    state["hold_reason"] = "RESUME_QUARANTINE_HOLD: " + str(ex)
                    state["unverified_paths_count"] = len(unverified_paths)
                    write_atomic(state_path, state)
                    raise Hold(state["hold_reason"]) from ex
            else:
                state["status"] = "HOLD"
                state["hold_reason"] = "UNVERIFIED_WORKTREE_ON_RESUME_REQUIRES_ISOLATED_REVIEW"
                state["unverified_paths_count"] = len(unverified_paths)
                write_atomic(state_path, state)
                raise Hold(state["hold_reason"])
        # A free provider's reported unavailability is a persistent HOLD.
        # An identical automatic restart must not burn another model attempt.
        # Only an explicit one-run operator recheck after external availability
        # changed may retry; this is NOT proof the provider has recovered.
        if (state.get("status") == "HOLD" and
                state.get("hold_reason") == "NO_APPROVED_AVAILABLE_MODEL_IN_THIS_ENVIRONMENT"):
            if not retry_unavailable_once:
                raise Hold("MODEL_UNAVAILABLE_RETRY_REQUIRES_EXPLICIT_RECHECK")
            state["operator_requested_unavailable_retries"] = (
                state.get("operator_requested_unavailable_retries", 0) + 1)
            write_atomic(state_path, state)
        # A prior successful commit is not considered remotely saved until push succeeds.
        if push:
            for item in state["commits"]:
                if not item["pushed"]:
                    try:
                        verify_repo(cfg)
                        if git(p, "rev-parse", "HEAD") != state["last_head"]:
                            raise Hold("GIT_HISTORY_CHANGED_BEFORE_PUSH")
                        push_verified_research_commit(cfg, p, state["last_head"])
                    except Hold as ex:
                        state["status"] = "HOLD"
                        state["hold_reason"] = "UNPUSHED_RESEARCH_COMMIT: " + str(ex)
                        write_atomic(state_path, state)
                        raise
                    item["pushed"] = True
                    write_atomic(state_path, state)
        if state["status"] == "HOLD" and state.get("hold_reason", "").startswith(("PATH_NOT_APPROVED", "SYMLINK_OR_ESCAPE")):
            raise Hold("PREVIOUS_SAFETY_HOLD_NEEDS_ISOLATED_CLONE_REVIEW")
        state["status"] = "RUNNING"
        state.pop("hold_reason", None)
        write_atomic(state_path, state)
        while (state["next_task"] < len(cfg["tasks"]) or cfg.get("continuous_goal")) and state["cycles"] < cfg["max_cycles"] and time.monotonic() < deadline:
            index = state["next_task"]
            if index < len(cfg["tasks"]):
                task = cfg["tasks"][index]
            else:
                task = ("Advance the fixed long-running goal by choosing the NEXT DISTINCT meaningful development task. "
                        "Do not repeat prior commits or invent evidence. Goal: " + cfg["continuous_goal"])
            previous = ", ".join(x["sha"][:12] for x in state["commits"][-5:])
            feedback = ""
            success = False
            unavailable_exhausted = False
            approved_models = [cfg["model"], *cfg.get("fallback_models", [])]
            model_index = 0
            for attempt in range(cfg["per_task_attempts"]):
                if state["cycles"] >= cfg["max_cycles"] or time.monotonic() >= deadline:
                    break
                state["cycles"] += 1
                cycle = state["cycles"]
                selected_model = approved_models[model_index]
                write_atomic(state_path, state)
                prompt = (f"Work on exactly one meaningful development task in {cfg['project']} on a disposable research clone. "
                          "Do not commit, push, modify protected originals, use paid APIs, change model, or touch paths outside this repository. "
                          "Preserve established project strategy, quality gates and existing successes. "
                          "You may inspect and edit within approved project subfolders. Avoid destructive commands. "
                          f"Task: {task}\nRecent committed steps: {previous}\nFailure feedback from independent check: {feedback[-1800:]}" )
                try:
                    rc, tail = run_in_docker(cfg, ["opencode", "run", "--auto", "--model", selected_model, prompt],
                                       p, min(cfg["agent_timeout_seconds"], max(1, int(deadline - time.monotonic()))),
                                       state_dir / f"agent_{cycle:04}.private.log", agent=True)
                    if rc != 0:
                        # Switching models after ANY partial write could let a
                        # second provider silently repair or leak an unreviewed draft.
                        verify_repo(cfg)
                        if git(p, "rev-parse", "HEAD") != state["last_head"]:
                            raise Hold("AGENT_FAILED_MUTATED_GIT_HISTORY")
                        failed_paths = changed_files(p)
                        recovered_failure = False
                        if failed_paths:
                            if cfg.get("quarantine_unverified_on_agent_failure") is not True:
                                raise Hold("AGENT_FAILED_LEFT_UNVERIFIED_WORKTREE")
                            recovery = quarantine_and_restore_unverified(
                                cfg, p, state_dir, failed_paths,
                                state["last_head"],
                                opt_in_key="quarantine_unverified_on_agent_failure")
                            state.setdefault("failed_attempt_quarantines", []).append({
                                **recovery, "cycle": cycle,
                                "model_requested": selected_model})
                            write_atomic(state_path, state)
                            recovered_failure = True
                        # Do not send the failed candidate's source or raw CLI
                        # log to the next provider as fallback feedback.
                        # Full stdout/stderr remains PRIVATE on disk. Even a
                        # clean failure may print confidential context; never
                        # forward its raw tail to a different provider/model.
                        feedback = (f"AGENT_EXIT_{rc}: source privately quarantined"
                                    if recovered_failure else
                                    f"AGENT_EXIT_{rc}: no candidate retained")
                        state["outcomes"].append({
                            "cycle": cycle,
                            "status": ("AGENT_FAILED_QUARANTINED_FOR_RETRY"
                                       if recovered_failure else "AGENT_FAILED"),
                            "exit": rc, "model": selected_model})
                        if model_index < len(approved_models) - 1:
                            model_index += 1
                        elif "Model unavailable:" in tail:
                            # An unavailable model does not become available
                            # through identical retries in this isolated run.
                            unavailable_exhausted = True
                            state["outcomes"][-1]["status"] = "AGENT_MODEL_UNAVAILABLE"
                            write_atomic(state_path, state)
                            break
                        write_atomic(state_path, state)
                        continue
                    verify_repo(cfg)  # Agent must not switch remote or research branch.
                    if git(p, "rev-parse", "HEAD") != state["last_head"]:
                        raise Hold("AGENT_MUTATED_GIT_HISTORY")
                    changed = changed_files(p)
                    if not changed:
                        # A real free provider may exit 0 after only explaining
                        # a task, without producing a patch. Treat it as a
                        # failed candidate, never as a verified success.
                        feedback = "AGENT_EXITED_SUCCESS_WITHOUT_SOURCE_CHANGE"
                        state["outcomes"].append({"cycle": cycle,
                                                  "status": "AGENT_NO_SOURCE_CHANGE",
                                                  "model": selected_model})
                        if model_index < len(approved_models) - 1:
                            model_index += 1
                        write_atomic(state_path, state)
                        continue
                    check_paths(p, changed, cfg["allowed_prefixes"])
                    # Capture candidate bytes: QA may not rewrite the version we commit.
                    before_qa = snapshot_candidate(p, changed)
                    failing = []
                    for j, cmd in enumerate(cfg["checks"]):
                        rc, out = run_in_docker(cfg, cmd, p, cfg["check_timeout_seconds"],
                                          state_dir / f"qa_{cycle:04}_{j}.private.log", agent=False)
                        if rc:
                            failing.append(f"CHECK_{j}_EXIT_{rc}: {out}")
                    if failing:
                        # Existing contract: QA failures are retained in-place
                        # unless the user has explicitly enabled bounded private
                        # recovery for a disposable research clone.
                        if cfg.get("quarantine_unverified_on_qa_failure") is True:
                            verify_repo(cfg)
                            if git(p, "rev-parse", "HEAD") != state["last_head"]:
                                raise Hold("QA_FAILED_MUTATED_GIT_HISTORY")
                            qa_paths = changed_files(p)
                            check_paths(p, qa_paths, cfg["allowed_prefixes"])
                            if (qa_paths != changed or
                                    snapshot_candidate(p, qa_paths) != before_qa):
                                raise Hold("QA_FAILED_MUTATED_OR_EXPANDED_CANDIDATE")
                            recovery = quarantine_and_restore_unverified(
                                cfg, p, state_dir, qa_paths, state["last_head"],
                                opt_in_key="quarantine_unverified_on_qa_failure")
                            state.setdefault("qa_failure_quarantines", []).append({
                                **recovery, "cycle": cycle,
                                "model_requested": selected_model,
                                "failed_checks": len(failing)})
                            feedback = ("INDEPENDENT_QA_FAILED_AFTER_PRIVATE_BACKUP; "
                                        "candidate reverted to verified source; "
                                        f"failed check count {len(failing)}")
                            state["outcomes"].append({
                                "cycle": cycle,
                                "status": "INDEPENDENT_QA_FAILED_QUARANTINED_FOR_RETRY",
                                "model": selected_model,
                                "failed_checks": len(failing)})
                        else:
                            feedback = "\n".join(failing)
                            state["outcomes"].append({
                                "cycle": cycle, "status": "INDEPENDENT_QA_FAILED",
                                "model": selected_model})
                        write_atomic(state_path, state)
                        continue
                    verify_repo(cfg)  # Tests cannot silently redirect Git push.
                    if git(p, "rev-parse", "HEAD") != state["last_head"]:
                        raise Hold("QA_MUTATED_GIT_HISTORY")
                    after_qa = changed_files(p)
                    check_paths(p, after_qa, cfg["allowed_prefixes"])
                    if after_qa != changed or snapshot_candidate(p, after_qa) != before_qa:
                        raise Hold("QA_MUTATED_SOURCE_AFTER_CHECK")
                    # Commit only explicitly approved paths; refuse pre-staged surprises.
                    git(p, "reset", "--quiet")
                    git(p, "add", "--", *changed)
                    check_paths(p, changed_files(p), cfg["allowed_prefixes"])
                    git(p, "commit", "-m", f"research(free-autonomy): task {index + 1} verified source candidate")
                    sha = git(p, "rev-parse", "HEAD")
                    state["last_head"] = sha
                    state["commits"].append({"task": index + 1, "sha": sha, "qa": "SOURCE_ONLY",
                                             "model_requested": selected_model, "pushed": False})
                    state["next_task"] += 1
                    state["outcomes"].append({"cycle": cycle, "status": "SOURCE_CHECKS_PASSED", "sha": sha})
                    write_atomic(state_path, state)
                    if push:
                        try:
                            verify_repo(cfg)
                            if git(p, "rev-parse", "HEAD") != state["last_head"]:
                                raise Hold("GIT_HISTORY_CHANGED_BEFORE_PUSH")
                            push_verified_research_commit(cfg, p, state["last_head"])
                        except Hold as ex:
                            state["status"] = "HOLD"
                            state["hold_reason"] = "UNPUSHED_RESEARCH_COMMIT: " + str(ex)
                            write_atomic(state_path, state)
                            raise
                        state["commits"][-1]["pushed"] = True
                        write_atomic(state_path, state)
                    success = True
                    break
                except Hold as ex:
                    state["status"] = "HOLD"
                    # Preserve the stronger UNPUSHED marker set by the push
                    # guard, so resume tooling cannot mistake a local-only
                    # verified commit for a remotely saved result.
                    if not state.get("hold_reason", "").startswith("UNPUSHED_RESEARCH_COMMIT: "):
                        state["hold_reason"] = str(ex)
                    write_atomic(state_path, state)
                    raise
            if not success:
                state["status"] = "HOLD"
                state["hold_reason"] = (
                    "NO_APPROVED_AVAILABLE_MODEL_IN_THIS_ENVIRONMENT"
                    if unavailable_exhausted else
                    "RETRY_OR_TIME_BUDGET_EXHAUSTED_WITHOUT_VERIFIED_SOURCE_CHANGE")
                write_atomic(state_path, state)
                break
        if not cfg.get("continuous_goal") and state["next_task"] == len(cfg["tasks"]):
            state["status"] = "TASK_QUEUE_COMPLETED_SOURCE_ONLY"
        elif cfg.get("continuous_goal") and state["status"] == "RUNNING":
            state["status"] = "WINDOW_ENDED_SOURCE_ONLY"
        elif state["status"] == "RUNNING":
            state["status"] = "HOLD"
            state["hold_reason"] = "GLOBAL_CYCLE_OR_TIME_BUDGET_EXHAUSTED"
        write_atomic(state_path, state)
        return state


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--config", required=True, type=Path)
    ap.add_argument("--push", action="store_true", help="Push only exact research branch; opt-in")
    ap.add_argument("--sandbox-attested", action="store_true", help="Acknowledge Docker-only sandbox requirement; not proof of isolation")
    ap.add_argument("--retry-unavailable-once", action="store_true",
                    help="Explicitly recheck a previously unavailable provider once after external conditions change; not automatic")
    args = ap.parse_args()
    try:
        cfg = json.loads(args.config.read_text(encoding="utf-8"))
        state = execute(cfg, push=args.push, sandbox_attested=args.sandbox_attested,
                        retry_unavailable_once=args.retry_unavailable_once)
        print(json.dumps({"status": state["status"], "cycles": state["cycles"], "commits": state["commits"]}, ensure_ascii=False))
        return 0 if state["status"] in {"TASK_QUEUE_COMPLETED_SOURCE_ONLY", "WINDOW_ENDED_SOURCE_ONLY"} else 2
    except (Hold, OSError, ValueError, KeyError) as ex:
        print(f"HOLD: {ex}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
