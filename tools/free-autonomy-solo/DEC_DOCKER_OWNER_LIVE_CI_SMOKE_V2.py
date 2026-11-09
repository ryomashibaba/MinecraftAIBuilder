#!/usr/bin/env python3
"""Opt-in, real-Docker smoke test of V3 container ownership, CI-only.

NO model, secrets, project sources, project write, or GitHub push.
Default invocation never touches Docker. --execute requires ALL gate flags and
only a separately authorized one-shot push on a GitHub-hosted Linux runner.
No privilege is inferred from presence of GitHub credentials.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import types
import uuid

BASE = Path(__file__).resolve().parent
TARGET = BASE / "real_qwen4b_two_cumulative_ci.py"
TARGET_SHA256 = "961bcec0fc9e0546268a5bcea0917f47cd5b8bafced53062d9d4b7a6617f0cb2"
IMAGE = "alpine:3.21"
REPO = "ryomashibaba/MinecraftAIBuilder"


def gates() -> list[str]:
    expected = {
        "GITHUB_ACTIONS": "true",
        "RUNNER_ENVIRONMENT": "github-hosted",
        "RUNNER_OS": "Linux",
        "GITHUB_EVENT_NAME": "push",
        "GITHUB_REF": "refs/heads/research/dec-owner-v3-live-ci-20261109",
        "GITHUB_RUN_ATTEMPT": "1",
        "GITHUB_REPOSITORY": REPO,
        "DEC_DOCKER_OWNER_SMOKE_APPROVED": "YES",
    }
    return [key for key, value in expected.items() if os.environ.get(key) != value]


def run(argv: list[str], *, timeout: int = 35, ok: bool = True) -> str:
    proc = subprocess.run(argv, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout,
                          check=False, stdin=subprocess.DEVNULL)
    if ok and proc.returncode:
        # Do not emit docker daemon stderr, which may contain sensitive host data.
        raise RuntimeError("DOCKER_COMMAND_FAILED_" + argv[1].upper())
    return proc.stdout.strip()


def load_target():
    if not TARGET.is_file() or hashlib.sha256(TARGET.read_bytes()).hexdigest() != TARGET_SHA256:
        raise RuntimeError("PATCHED_SOURCE_HASH_MISMATCH")
    # Genuine project driver imports are explicitly stubbed; no Ollama/model.
    x = types.ModuleType("real_small_model_ci_once")
    x.MODEL = "qwen3:4b"; x.IMAGE = "ollama/ollama:latest"
    x.cmd = lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("MODEL_FORBIDDEN"))
    x.wait_ready = x.cmd
    y = types.ModuleType("run_mab_private_continuous")
    y.PASS = "DO_NOT_RUN"; y.run_cumulative = x.cmd
    sys.modules[x.__name__] = x; sys.modules[y.__name__] = y
    spec = importlib.util.spec_from_file_location("dec_v3_only_owner", TARGET)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


def owned(name: str, token: str, ident: str):
    """Issue exactly one disposable Docker run in the scoped test namespace."""
    result = run([
        "docker", "run", "-d", "--rm", "--name", name,
        "--label", "jp.december2026.qwen4b.owner=" + token,
        "--cap-drop=ALL", "--security-opt=no-new-privileges",
        "--pids-limit", "16", "--memory", "128m", "--cpus", "0.2",
        "--network", "none", IMAGE, "sleep", "120"], timeout=95)
    if not re.fullmatch(r"[0-9a-f]{64}", result):
        raise RuntimeError("DOCKER_CREATED_ID_INVALID")
    return result


def still_present(ident: str) -> bool:
    lines = run(["docker", "container", "ls", "--all", "--no-trunc",
                 "--format", "{{.ID}}|{{.Names}}"])
    parsed = [line.split("|", 1)[0] for line in lines.splitlines()]
    if any(not re.fullmatch(r"[0-9a-f]{64}", x) for x in parsed):
        raise RuntimeError("DOCKER_LIST_FORMAT_INVALID")
    return ident in parsed


def emergency_clean_proven(ident: str, token: str):
    """Clean ONLY our immutable ID, with positive exact-label confirmation."""
    if not re.fullmatch(r"[0-9a-f]{64}", ident):
        raise RuntimeError("CLEANUP_BAD_ID")
    inspect = run(["docker", "inspect", "--format",
                   '{{.Id}}|{{index .Config.Labels "jp.december2026.qwen4b.owner"}}',
                   ident], ok=False)
    if inspect != ident + "|" + token:
        raise RuntimeError("CLEANUP_OWNERSHIP_UNKNOWN")
    run(["docker", "rm", "-f", ident])
    if still_present(ident):
        raise RuntimeError("CLEANUP_OWNED_ID_REMAINS")


def live_cases():
    mod = load_target()
    run(["docker", "info", "--format", "{{.ServerVersion}}"])
    statuses = []
    for mode in ("owned", "wrong_id", "missing_start_id", "renamed_owner"):
        token = uuid.uuid4().hex
        name = "dec-qwen4b-two-cycles-" + token
        cid = ""; ren = ""
        try:
            cid = owned(name, token, mode)
            if mode == "owned":
                if not mod._owned_container_cleanup_verified(name, token, cid):
                    raise RuntimeError("OWNED_CLEANUP_FAILED")
                if still_present(cid):
                    raise RuntimeError("OWNED_ID_STILL_PRESENT")
            elif mode == "wrong_id":
                bogus = ("a" if cid[0] != "a" else "b") * 64
                if mod._owned_container_cleanup_verified(name, token, bogus):
                    raise RuntimeError("FOREIGN_START_ID_ACCEPTED")
                if not still_present(cid):
                    raise RuntimeError("WRONG_ID_CAUSED_REMOVAL")
                if not mod._owned_container_cleanup_verified(name, token, cid):
                    raise RuntimeError("OWNER_CLEANUP_AFTER_DRIFT_FAILED")
            elif mode == "missing_start_id":
                if mod._owned_container_cleanup_verified(name, token, None):
                    raise RuntimeError("MISSING_ID_WAS_ACCEPTED")
                if not still_present(cid):
                    raise RuntimeError("NO_ID_CAUSED_REMOVAL")
                if not mod._owned_container_cleanup_verified(name, token, cid):
                    raise RuntimeError("OWNER_CLEANUP_AFTER_MISSING_FAILED")
            else:
                ren = "dec-smoke-renamed-" + token
                run(["docker", "rename", cid, ren])
                if mod._owned_container_cleanup_verified(name, token, cid):
                    raise RuntimeError("RENAMED_CONTAINER_FALSE_PASS")
                if not still_present(cid):
                    raise RuntimeError("RENAMED_ID_DISAPPEARED")
            statuses.append({"case": mode, "status": "PASS"})
        finally:
            if cid and still_present(cid):
                emergency_clean_proven(cid, token)
    return statuses


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--execute", action="store_true",
                   help="Perform real Docker tests only on approved, one-shot, push-triggered GitHub-hosted CI")
    args = a.parse_args()
    if not args.execute:
        print(json.dumps({"status": "READY_NOT_EXECUTED",
                          "reason": "EXPLICIT_CI_EXECUTION_REQUIRED", "docker_runs": 0},
                         ensure_ascii=False))
        return 0
    missing = gates()
    if missing:
        print(json.dumps({"status": "HOLD_EXECUTION_GATE",
                          "missing_or_mismatched": missing, "docker_runs": 0},
                         ensure_ascii=False))
        return 3
    try:
        cases = live_cases()
        print(json.dumps({"status": "PASS_ISOLATED_DOCKER_OWNER_SMOKE_ONLY",
                          "cases": cases, "docker_runs": len(cases),
                          "model_requests": 0, "project_writes": 0,
                          "overall_autonomy_certified": False}, ensure_ascii=False))
        return 0
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print(json.dumps({"status": "HOLD_LIVE_SMOKE",
                          "reason_type": type(exc).__name__,
                          "reason_code": str(exc)[:128],
                          "overall_autonomy_certified": False}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
