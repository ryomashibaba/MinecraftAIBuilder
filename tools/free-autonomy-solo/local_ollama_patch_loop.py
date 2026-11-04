#!/usr/bin/env python3
"""LOCAL Ollama structured-edit agent for exactly one protected research clone.

Direct localhost inference, never model-generated shell commands. Node QA is run
through the existing Docker sandbox. No claim of real-model performance is made
by mocked CI tests. This is a research pilot, not a certified unattended agent.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

from docker_sandbox import DockerPolicy, SandboxHold
from local_ollama_real_probe import get_json
from solo_agent import (Hold, check_paths, changed_files, git, run_in_docker,
                        single_agent_lock, snapshot_candidate, verify_repo, write_atomic)

BASE = "http://127.0.0.1:11434"
PATCH_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "find": {"type": "string", "minLength": 1, "maxLength": 8000},
        "replace": {"type": "string", "maxLength": 8000}
    },
    "required": ["find", "replace"]
}
TARGET_PATTERN = re.compile(r"[A-Za-z0-9_-]+(?:/[A-Za-z0-9_.-]+)+\.(?:js|mjs|ts|tsx|json|py)\Z")


def validate_config(cfg: dict) -> None:
    required = {"project", "workspace", "branch", "model", "state_dir",
                "tasks", "checks", "allowed_prefixes", "sandbox_runtime"}
    if not isinstance(cfg, dict) or not required.issubset(cfg):
        raise Hold("PATCH_PILOT_CONFIG_INCOMPLETE")
    if cfg["sandbox_runtime"] != "docker":
        raise Hold("QA_REQUIRES_DOCKER")
    if not isinstance(cfg["model"], str) or not re.fullmatch(r"[A-Za-z0-9_.:-]{1,90}", cfg["model"]):
        raise Hold("MODEL_NAME_INVALID")
    if (not isinstance(cfg["tasks"], list) or not cfg["tasks"] or len(cfg["tasks"]) > 100
            or any(not isinstance(t, dict) or not {"path", "request"}.issubset(t) or set(t) - {"path", "request", "checks"}
                   or not isinstance(t["request"], str) or not t["request"].strip()
                   or len(t["request"]) > 1500
                   or not isinstance(t["path"], str) or not TARGET_PATTERN.fullmatch(t["path"])
                   or ("checks" in t and (not isinstance(t["checks"], list) or not t["checks"]
                       or any(not isinstance(c, list) or not c or not all(isinstance(a, str) and a for a in c)
                              or c[0] not in {"node", "npm"} for c in t["checks"])))
                   for t in cfg["tasks"])):
        raise Hold("TASKS_REQUIRE_EXPLICIT_EXISTING_SOURCE_PATH")
    if (not isinstance(cfg["allowed_prefixes"], list) or not cfg["allowed_prefixes"]
            or not all(isinstance(s, str) and re.fullmatch(r"[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*/?", s)
                       for s in cfg["allowed_prefixes"])):
        raise Hold("ALLOWED_PREFIXES_INVALID")
    if (not isinstance(cfg["checks"], list) or not cfg["checks"]
            or any(not isinstance(c, list) or not c or not all(isinstance(a, str) and a for a in c)
                   or c[0] not in {"node", "npm"} for c in cfg["checks"])):
        raise Hold("INDEPENDENT_NODE_QA_REQUIRED")
    for key, default, ceiling in (("max_cycles", 12, 100), ("max_minutes", 720, 10080),
                                  ("per_task_attempts", 2, 3), ("model_timeout_seconds", 240, 1800),
                                  ("qa_timeout_seconds", 300, 1800)):
        value = cfg.setdefault(key, default)
        if type(value) is not int or not (1 <= value <= ceiling):
            raise Hold("INVALID_SAFETY_BUDGET_" + key)
    if not isinstance(cfg.get("docker", {}), dict):
        raise Hold("DOCKER_OPTIONS_MUST_BE_OBJECT")
    if cfg.get("docker", {}).get("network", "none") != "none":
        raise Hold("DIRECT_LOCAL_MODEL_REQUIRES_QA_NETWORK_NONE")
    DockerPolicy.from_config(cfg)


def qa_image_preflight(policy: DockerPolicy) -> None:
    """Direct host Ollama only needs a locally cached QA image, not OpenCode."""
    try:
        engine = subprocess.run(["docker", "version", "--format", "{{.Server.Version}}"],
                                capture_output=True, text=True, timeout=15)
        image = subprocess.run(["docker", "image", "inspect", policy.qa_image],
                               capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.TimeoutExpired) as ex:
        raise Hold("QA_DOCKER_DAEMON_UNAVAILABLE") from ex
    if engine.returncode or not engine.stdout.strip():
        raise Hold("QA_DOCKER_DAEMON_UNAVAILABLE")
    if image.returncode:
        raise Hold("QA_IMAGE_MISSING_NO_AUTO_PULL")


def propose_once(model: str, file_path: str, source: str, goal: str,
                 feedback: str, timeout: int = 240) -> tuple[dict, dict]:
    installed = get_json(BASE + "/api/tags")
    if model not in {x.get("name") for x in installed.get("models", []) if isinstance(x, dict)}:
        raise Hold("MODEL_NOT_INSTALLED_NO_AUTO_PULL")
    prompt = (
        "You are editing exactly one existing source file in a disposable isolated research clone. "
        "Return JSON with exactly two strings: find and replace. "
        "find must appear in source exactly once and CANNOT be empty. "
        "Copy a short exact original substring into find (for example a return line), "
        "then author actual corrected source for replace. "
        "Both strings must be nonempty, different, and be valid within this file. "
        "Do NOT use shell commands, introduce external calls, touch other files, or change tests. "
        "Maintain the preexisting code and user project quality constraints. "
        f"\nFile: {file_path}\nTask: {goal}\nIndependent QA feedback: {feedback[:1200]}\n"
        f"Existing complete source:\n{source}"
    )
    req = {"model": model, "stream": False, "format": PATCH_SCHEMA,
           "think": False,
           "options": {"temperature": 0, "num_predict": 1100},
           "messages": [{"role": "user", "content": prompt}]}
    response = get_json(BASE + "/api/chat", req, timeout=timeout)
    if response.get("done") is not True or response.get("model") != model:
        raise Hold("MODEL_RESPONSE_NOT_COMPLETE_OR_IDENTIFIED")
    try:
        result = json.loads(response["message"]["content"])
    except (ValueError, KeyError, TypeError) as e:
        raise Hold("MODEL_PATCH_NOT_VALID_JSON") from e
    if not isinstance(result, dict) or set(result) != {"find", "replace"}:
        raise Hold("MODEL_PATCH_KEYS_INVALID")
    if not isinstance(result["find"], str) or not isinstance(result["replace"], str):
        raise Hold("MODEL_PATCH_TYPES_INVALID")
    if len(result["find"]) > 8000 or len(result["replace"]) > 8000:
        raise Hold("MODEL_PATCH_FIELDS_TOO_LARGE")
    if not result["find"]:
        raise Hold("MODEL_PATCH_FIND_EMPTY")
    if not result["replace"]:
        raise Hold("MODEL_PATCH_REPLACEMENT_EMPTY")
    if result["find"] == result["replace"]:
        raise Hold("MODEL_PATCH_NOOP_IDENTICAL")
    metrics = {k: response.get(k) for k in ("model", "done", "eval_count",
                                           "prompt_eval_count", "total_duration")}
    return result, metrics


def apply_exact_patch(target: Path, proposal: dict, original: str) -> str:
    if target.is_symlink() or not target.is_file():
        raise Hold("SOURCE_MUST_BE_REGULAR_FILE")
    if target.read_text(encoding="utf-8") != original:
        raise Hold("SOURCE_CHANGED_DURING_MODEL_RESPONSE")
    if original.count(proposal["find"]) != 1:
        raise Hold("MODEL_FIND_NOT_EXACTLY_UNIQUE")
    modified = original.replace(proposal["find"], proposal["replace"], 1)
    if modified == original or len(modified.encode("utf-8")) > 16000:
        raise Hold("MODEL_PATCH_NOT_MEANINGFUL_OR_TOO_LARGE")
    target.write_text(modified, encoding="utf-8", newline="")
    return hashlib.sha256(modified.encode("utf-8")).hexdigest()


def ensure_remote_research_branch(cfg: dict, workspace: Path) -> None:
    """Prevent push from quietly creating a new, unapproved remote branch."""
    verify_repo(cfg)
    ref = "refs/heads/" + cfg["branch"]
    try:
        r = subprocess.run(["git", "ls-remote", "--heads", "origin", ref],
                           cwd=workspace, capture_output=True, text=True, timeout=20,
                           env={**os.environ, "GIT_TERMINAL_PROMPT": "0",
                                "GCM_INTERACTIVE": "Never"})
    except (OSError, subprocess.TimeoutExpired) as ex:
        raise Hold("REMOTE_BRANCH_VERIFICATION_UNAVAILABLE") from ex
    if r.returncode != 0 or not r.stdout.strip().endswith("\t" + ref):
        raise Hold("REMOTE_APPROVED_RESEARCH_BRANCH_NOT_FOUND")


def execute(cfg: dict, *, push: bool = False) -> dict:
    validate_config(cfg)
    workspace = verify_repo(cfg)
    state_dir = Path(cfg["state_dir"]).expanduser().resolve()
    if state_dir == workspace or workspace in state_dir.parents or state_dir in workspace.parents:
        raise Hold("STATE_DIR_MUST_BE_OUTSIDE_REPOSITORY")
    policy = DockerPolicy.from_config(cfg)
    qa_image_preflight(policy)  # Only QA runtime is needed; no OpenCode image.
    if changed_files(workspace):
        raise Hold("DIRTY_WORKSPACE_REFUSED")
    state_dir.mkdir(parents=True, exist_ok=True)
    cfg_hash = hashlib.sha256(json.dumps(
        {k: v for k, v in cfg.items() if k != "state_dir"}, sort_keys=True).encode()).hexdigest()
    state_path = state_dir / "local_patch_state.json"
    if state_path.exists():
        state = json.loads(state_path.read_text(encoding="utf-8"))
        if state.get("config_sha256") != cfg_hash:
            raise Hold("RESUME_CONFIG_MISMATCH")
        if state.get("last_head") != git(workspace, "rev-parse", "HEAD"):
            raise Hold("RESUME_GIT_HISTORY_MISMATCH")
    else:
        state = {"schema": "local-ollama-patch-pilot-v1", "config_sha256": cfg_hash,
                 "project": cfg["project"], "branch": cfg["branch"], "next_task": 0,
                 "cycles": 0, "last_head": git(workspace, "rev-parse", "HEAD"),
                 "commits": [], "status": "RUNNING",
                 "real_model_verified": False, "art_certified": False,
                 "minecraft_or_4v4_certified": False}
        write_atomic(state_path, state)
    start = time.monotonic()
    with single_agent_lock():
        if push:
            for entry in state["commits"]:
                if not entry["pushed"]:
                    verify_repo(cfg)
                    ensure_remote_research_branch(cfg, workspace)
                    git(workspace, "push", "origin", "HEAD:refs/heads/" + cfg["branch"])
                    entry["pushed"] = True
                    write_atomic(state_path, state)
        while state["next_task"] < len(cfg["tasks"]):
            if state["cycles"] >= cfg["max_cycles"] or time.monotonic() - start >= 60 * cfg["max_minutes"]:
                state["status"] = "HOLD_BUDGET_REACHED"
                break
            t = cfg["tasks"][state["next_task"]]
            check_paths(workspace, [t["path"]], cfg["allowed_prefixes"])
            target = workspace / t["path"]
            if not target.is_file() or target.is_symlink() or target.stat().st_size > 12000:
                state["status"] = "HOLD_TARGET_FILE_INVALID_OR_TOO_BIG"
                break
            original = target.read_text(encoding="utf-8")
            feedback = ""
            success = False
            for attempt in range(cfg["per_task_attempts"]):
                if state["cycles"] >= cfg["max_cycles"] or time.monotonic() - start >= cfg["max_minutes"] * 60:
                    break
                state["cycles"] += 1
                cycle = state["cycles"]
                write_atomic(state_path, state)
                try:
                    proposal, metrics = propose_once(cfg["model"], t["path"], original,
                                                      t["request"], feedback,
                                                      timeout=cfg["model_timeout_seconds"])
                    private_witness = {
                        "requested_model": cfg["model"], "model_reported": metrics.get("model"),
                        "source_before_sha256": hashlib.sha256(original.encode("utf-8")).hexdigest(),
                        "proposal_sha256": hashlib.sha256(
                            json.dumps(proposal, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest(),
                        "response_metrics": metrics, "local_http_attempt": True,
                        "project": cfg["project"], "task_index": state["next_task"],
                        "real_model_identity_independently_verified": False
                    }
                    write_atomic(state_dir / f"model_{cycle:04}.private.json", private_witness)
                    digest = apply_exact_patch(target, proposal, original)
                    changed = changed_files(workspace)
                    if changed != [t["path"]]:
                        raise Hold("PATCH_MODIFIED_UNEXPECTED_PATHS")
                    before_qa = snapshot_candidate(workspace, changed)
                    failures = []
                    for i, argv in enumerate(t.get("checks", cfg["checks"])):
                        rc, output = run_in_docker(cfg, argv, workspace,
                                                  cfg["qa_timeout_seconds"],
                                                  state_dir / f"qa_{cycle:04}_{i}.private.log",
                                                  agent=False)
                        if rc:
                            failures.append(f"CHECK_{i}_RC{rc}: {output[-450:]}")
                    verify_repo(cfg)
                    if git(workspace, "rev-parse", "HEAD") != state["last_head"]:
                        raise Hold("QA_CHANGED_GIT_HISTORY")
                    if changed_files(workspace) != changed or snapshot_candidate(workspace, changed) != before_qa:
                        raise Hold("QA_CHANGED_SOURCE_OR_OTHER_FILES")
                    if failures:
                        feedback = "; ".join(failures)[-1000:]
                        git(workspace, "restore", "--worktree", "--", t["path"])
                        state["last_failure"] = "INDEPENDENT_QA_FAILED"
                        write_atomic(state_path, state)
                        continue
                    git(workspace, "add", "--", t["path"])
                    git(workspace, "commit", "-m",
                        f"research(local-patch): verified bounded task {state['next_task'] + 1}")
                    sha = git(workspace, "rev-parse", "HEAD")
                    state["last_head"] = sha
                    state["next_task"] += 1
                    state["commits"].append({
                        "sha": sha, "task": state["next_task"], "source_sha256": digest,
                        "independent_qa": "SOURCE_ONLY", "pushed": False,
                        "reported_model": metrics.get("model"),
                        "reported_eval_count": metrics.get("eval_count"),
                        "local_ollama_response_observed": True})
                    write_atomic(state_path, state)
                    if push:
                        verify_repo(cfg)
                        ensure_remote_research_branch(cfg, workspace)
                        git(workspace, "push", "origin", "HEAD:refs/heads/" + cfg["branch"])
                        state["commits"][-1]["pushed"] = True
                        write_atomic(state_path, state)
                    success = True
                    break
                except (Hold, SandboxHold, ValueError, OSError, KeyError) as exc:
                    state["status"] = "HOLD"
                    state["hold_reason"] = type(exc).__name__ + ": " + str(exc)[:150]
                    write_atomic(state_path, state)
                    raise
            if not success:
                state["status"] = "HOLD_NOT_VERIFIED"
                write_atomic(state_path, state)
                break
        else:
            state["status"] = "SOURCE_ONLY_TASK_QUEUE_DONE"
        write_atomic(state_path, state)
    return state


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--config", type=Path, required=True)
    ap.add_argument("--push", action="store_true")
    a = ap.parse_args()
    try:
        result = execute(json.loads(a.config.read_text(encoding="utf-8")), push=a.push)
        print(json.dumps({"status": result["status"], "cycles": result["cycles"],
                          "commit_count": len(result["commits"]),
                          "real_model_verified": result["real_model_verified"]},
                         ensure_ascii=False))
        return 0 if result["status"] == "SOURCE_ONLY_TASK_QUEUE_DONE" else 2
    except (Hold, SandboxHold, ValueError, OSError, KeyError) as ex:
        print("HOLD: " + str(ex)[:200], file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
