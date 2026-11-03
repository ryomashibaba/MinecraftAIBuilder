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

from docker_sandbox import DockerPolicy, SandboxHold, docker_exec, docker_preflight

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


@contextlib.contextmanager
def single_agent_lock():
    base = Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "FreeAutonomySolo"
    base.mkdir(parents=True, exist_ok=True)
    f = open(base / "one-local-project.lock", "a+b")
    try:
        f.seek(0)
        if not f.read(1):
            f.seek(0)
            f.write(b"0")
            f.flush()
        f.seek(0)
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
    if cfg.get("sandbox_runtime") != "docker":
        raise Hold("DOCKER_RUNTIME_REQUIRED_FOR_UNATTENDED_EXECUTION")
    try:
        DockerPolicy.from_config(cfg)
    except SandboxHold as ex:
        raise Hold(str(ex)) from ex
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


def execute(cfg: dict, *, push: bool, sandbox_attested: bool) -> dict:
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
        # A prior successful commit is not considered remotely saved until push succeeds.
        if push:
            for item in state["commits"]:
                if not item["pushed"]:
                    try:
                        verify_repo(cfg)
                        if git(p, "rev-parse", "HEAD") != state["last_head"]:
                            raise Hold("GIT_HISTORY_CHANGED_BEFORE_PUSH")
                        git(p, "push", "origin", f"HEAD:refs/heads/{cfg['branch']}")
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
            for attempt in range(cfg["per_task_attempts"]):
                if state["cycles"] >= cfg["max_cycles"] or time.monotonic() >= deadline:
                    break
                state["cycles"] += 1
                cycle = state["cycles"]
                write_atomic(state_path, state)
                prompt = (f"Work on exactly one meaningful development task in {cfg['project']} on a disposable research clone. "
                          "Do not commit, push, modify protected originals, use paid APIs, change model, or touch paths outside this repository. "
                          "Preserve established project strategy, quality gates and existing successes. "
                          "You may inspect and edit within approved project subfolders. Avoid destructive commands. "
                          f"Task: {task}\nRecent committed steps: {previous}\nFailure feedback from independent check: {feedback[-1800:]}" )
                try:
                    rc, tail = run_in_docker(cfg, ["opencode", "run", "--auto", "--model", cfg["model"], prompt],
                                       p, min(cfg["agent_timeout_seconds"], max(1, int(deadline - time.monotonic()))),
                                       state_dir / f"agent_{cycle:04}.private.log", agent=True)
                    if rc != 0:
                        feedback = f"AGENT_EXIT_{rc}: {tail}"
                        state["outcomes"].append({"cycle": cycle, "status": "AGENT_FAILED", "exit": rc})
                        write_atomic(state_path, state)
                        continue
                    verify_repo(cfg)  # Agent must not switch remote or research branch.
                    if git(p, "rev-parse", "HEAD") != state["last_head"]:
                        raise Hold("AGENT_MUTATED_GIT_HISTORY")
                    changed = changed_files(p)
                    check_paths(p, changed, cfg["allowed_prefixes"])
                    failing = []
                    for j, cmd in enumerate(cfg["checks"]):
                        rc, out = run_in_docker(cfg, cmd, p, cfg["check_timeout_seconds"],
                                          state_dir / f"qa_{cycle:04}_{j}.private.log", agent=False)
                        if rc:
                            failing.append(f"CHECK_{j}_EXIT_{rc}: {out}")
                    if failing:
                        feedback = "\n".join(failing)
                        state["outcomes"].append({"cycle": cycle, "status": "INDEPENDENT_QA_FAILED"})
                        write_atomic(state_path, state)
                        continue
                    verify_repo(cfg)  # Tests cannot silently redirect Git push.
                    if git(p, "rev-parse", "HEAD") != state["last_head"]:
                        raise Hold("QA_MUTATED_GIT_HISTORY")
                    # Commit only explicitly approved paths; refuse pre-staged surprises.
                    git(p, "reset", "--quiet")
                    git(p, "add", "--", *changed)
                    check_paths(p, changed_files(p), cfg["allowed_prefixes"])
                    git(p, "commit", "-m", f"research(free-autonomy): task {index + 1} verified source candidate")
                    sha = git(p, "rev-parse", "HEAD")
                    state["last_head"] = sha
                    state["commits"].append({"task": index + 1, "sha": sha, "qa": "SOURCE_ONLY", "pushed": False})
                    state["next_task"] += 1
                    state["outcomes"].append({"cycle": cycle, "status": "SOURCE_CHECKS_PASSED", "sha": sha})
                    write_atomic(state_path, state)
                    if push:
                        try:
                            verify_repo(cfg)
                            if git(p, "rev-parse", "HEAD") != state["last_head"]:
                                raise Hold("GIT_HISTORY_CHANGED_BEFORE_PUSH")
                            git(p, "push", "origin", f"HEAD:refs/heads/{cfg['branch']}")
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
                    state["hold_reason"] = str(ex)
                    write_atomic(state_path, state)
                    raise
            if not success:
                state["status"] = "HOLD"
                state["hold_reason"] = "RETRY_OR_TIME_BUDGET_EXHAUSTED_WITHOUT_VERIFIED_SOURCE_CHANGE"
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
    args = ap.parse_args()
    try:
        cfg = json.loads(args.config.read_text(encoding="utf-8"))
        state = execute(cfg, push=args.push, sandbox_attested=args.sandbox_attested)
        print(json.dumps({"status": state["status"], "cycles": state["cycles"], "commits": state["commits"]}, ensure_ascii=False))
        return 0 if state["status"] in {"TASK_QUEUE_COMPLETED_SOURCE_ONLY", "WINDOW_ENDED_SOURCE_ONLY"} else 2
    except (Hold, OSError, ValueError, KeyError) as ex:
        print(f"HOLD: {ex}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
