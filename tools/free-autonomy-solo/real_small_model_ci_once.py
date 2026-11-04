#!/usr/bin/env python3
"""One-off genuine Ollama/qwen3:1.7b CPU witness on isolated public CI fixture.

No GitHub credential, secret, private project content, paid API, GPU or push.
This is deliberately much smaller than the user's Qwen3:14b and is NOT
evidence of Windows GPU performance or full-project autonomous development.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

from local_ollama_real_probe import get_json
from local_ollama_patch_loop import execute

MODEL = "qwen3:1.7b"
IMAGE = "ollama/ollama:latest"


class ProbeHold(Exception):
    pass


def cmd(argv: list[str], *, cwd: Path | None = None, timeout: int = 30) -> str:
    p = subprocess.run(argv, cwd=cwd, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout)
    if p.returncode:
        raise ProbeHold("COMMAND_FAILED_" + "_".join(argv[:2]) + "_RC" + str(p.returncode)
                        + ": " + (p.stderr or p.stdout)[-320:])
    return p.stdout.strip()


def fixture(workspace: Path) -> None:
    workspace.mkdir()
    workspace.chmod(0o777)
    d = workspace / "source"
    d.mkdir()
    (d / "calc.mjs").write_text(
        "export function clamp(value, low, high) {\n"
        "  return value;\n"
        "}\n", encoding="utf-8")
    (d / "basic.test.mjs").write_text(
        "import {test} from 'node:test';\n"
        "import assert from 'node:assert/strict';\n"
        "import {clamp} from './calc.mjs';\n"
        "test('below',()=>assert.equal(clamp(-5,0,10),0));\n"
        "test('middle',()=>assert.equal(clamp(5,0,10),5));\n"
        "test('above',()=>assert.equal(clamp(99,0,10),10));\n", encoding="utf-8")
    (d / "bounds.test.mjs").write_text(
        "import {test} from 'node:test';\n"
        "import assert from 'node:assert/strict';\n"
        "import {clamp} from './calc.mjs';\n"
        "test('inverted',()=>assert.throws(()=>clamp(2,5,0),RangeError));\n"
        "test('valid',()=>assert.equal(clamp(12,1,10),10));\n", encoding="utf-8")
    cmd(["git", "init", "-b", "research/ci-real-small-qwen-fixture"], cwd=workspace)
    cmd(["git", "config", "user.email", "fixture@example.invalid"], cwd=workspace)
    cmd(["git", "config", "user.name", "Disposable CI Test"], cwd=workspace)
    # Recorded solely to satisfy an existing identity check in the test
    # supervisor. This synthetic repo is NOT a clone of project originals.
    cmd(["git", "remote", "add", "origin",
         "https://github.com/ryomashibaba/MinecraftAIBuilder.git"], cwd=workspace)
    cmd(["git", "add", "--", "source"], cwd=workspace)
    cmd(["git", "commit", "-m", "disposable baseline only"], cwd=workspace)


def wait_ready(deadline_seconds: int = 65) -> dict:
    until = time.monotonic() + deadline_seconds
    while time.monotonic() < until:
        try:
            response = get_json("http://127.0.0.1:11434/api/tags", timeout=3)
            if isinstance(response.get("models"), list):
                return response
        except Exception:
            pass
        time.sleep(2)
    raise ProbeHold("OLLAMA_LOCAL_HTTP_NOT_READY")


def real_chat_witness() -> dict:
    req = {
        "model": MODEL, "stream": False, "think": False,
        "options": {"num_predict": 80, "temperature": 0},
        "format": {"type": "object", "properties": {
            "marker": {"type": "string"}}, "required": ["marker"]},
        "messages": [{"role": "user", "content":
            "Reply with just a JSON object where marker is exactly READY. Nothing else."}]
    }
    result = get_json("http://127.0.0.1:11434/api/chat", req, timeout=140)
    if result.get("model") != MODEL or result.get("done") is not True:
        raise ProbeHold("REAL_MODEL_RESPONSE_IDENTITY_OR_DONE_MISMATCH")
    try:
        content = json.loads(result["message"]["content"])
    except (KeyError, TypeError, ValueError) as ex:
        raise ProbeHold("REAL_MODEL_RESPONSE_NOT_JSON") from ex
    if content != {"marker": "READY"}:
        raise ProbeHold("REAL_MODEL_RESPONSE_MARKER_MISMATCH")
    return {"requested": MODEL, "ollama_reported": result.get("model"),
            "done": result.get("done"), "eval_count": result.get("eval_count"),
            "total_duration_ns": result.get("total_duration"),
            "local_http_response_observed": True,
            "model_identity_independently_attested": False}


def run_probe() -> dict:
    report = {"schema": "dec-free-autonomy-small-local-real-v1",
              "status": "HOLD", "model_requested": MODEL,
              "model_scale": "1.7B_cpu_fixture_not_user_14B",
              "real_local_inference_observed": False,
              "local_git_commits_by_agent": 0, "qa_checks_certified": 0,
              "github_pushes": 0, "paid_api_credentials": False,
              "original_project_files_used": False,
              "windows_verified": False, "production_autonomy_certified": False}
    with tempfile.TemporaryDirectory(prefix="fa-real-small-model-") as tmp:
        base = Path(tmp)
        os.environ["LOCALAPPDATA"] = str(base / "lock")
        (base / "lock").mkdir()
        workspace = base / "synthetic-research-clone"
        name = "fa-qwen-ephemeral-" + str(os.getpid())
        try:
            # Ollama container has no host project mounts or project secrets.
            cmd(["docker", "run", "-d", "--name", name, "--rm",
                 "--cap-drop=ALL", "--security-opt=no-new-privileges",
                 "--pids-limit", "128", "--memory", "5g", "--cpus", "3",
                 "-p", "127.0.0.1:11434:11434", IMAGE], timeout=55)
            wait_ready()
            # Explicit model pull is *only* for the disposable standard public
            # CI runner; model is not pulled on the user's PC.
            cmd(["docker", "exec", name, "ollama", "pull", MODEL], timeout=390)
            tags = wait_ready()
            if MODEL not in {m.get("name") for m in tags["models"]}:
                raise ProbeHold("SMALL_LOCAL_MODEL_NOT_PRESENT")
            report["real_chat_witness"] = real_chat_witness()
            report["real_local_inference_observed"] = True
            fixture(workspace)
            cfg = {
                "project": "minecraftaibuilder",
                "workspace": str(workspace),
                "branch": "research/ci-real-small-qwen-fixture",
                "state_dir": str(base / "private-state"),
                "sandbox_runtime": "docker",
                "docker": {"network": "none", "memory": "2g", "cpus": "2",
                           "pids": 64, "qa_image": "node:22-bookworm-slim"},
                "model": MODEL,
                "allowed_prefixes": ["source"],
                "max_cycles": 6, "per_task_attempts": 3,
                "quarantine_unverified_on_qa_failure": True,
                "max_minutes": 11, "model_timeout_seconds": 155,
                "qa_timeout_seconds": 65,
                "checks": [["node", "--test", "source/basic.test.mjs"]],
                "tasks": [
                    {"path": "source/calc.mjs",
                     "request": "Fix this JS clamp function to clamp to both inclusive bounds while keeping the signature. Don't implement inverted-bound errors yet.",
                     "checks": [["node", "--test", "source/basic.test.mjs"]]},
                    {"path": "source/calc.mjs",
                     "request": "Keep the existing valid clamp return expression and all three normal cases. Add a separate early if statement before the return so inverted bounds throw RangeError. Do not put throw inside an expression or use logical operators to invoke throw. Only edit the guard needed for this error condition.",
                     "checks": [["node", "--test", "source/basic.test.mjs",
                                  "source/bounds.test.mjs"]]}
                ]
            }
            try:
                state = execute(cfg, push=False)
                report["status"] = state.get("status", "HOLD")
            except Exception as ex:
                report["status"] = "HOLD_SOURCE_QA"
                report["source_qa_error_type"] = type(ex).__name__
                report["source_qa_error_text"] = str(ex)[-180:]
            state_path = base / "private-state" / "local_patch_state.json"
            if state_path.is_file():
                state = json.loads(state_path.read_text(encoding="utf-8"))
                report["local_git_commits_by_agent"] = len(state.get("commits", []))
                report["local_commit_shas"] = [c.get("sha") for c in state.get("commits", [])]
                report["candidate_sha256_by_commit"] = [
                    c.get("source_sha256") for c in state.get("commits", [])]
                report["agent_cycles"] = state.get("cycles", 0)
                report["rejected_model_patches_without_write"] = sum(
                    1 for o in state.get("outcomes", [])
                    if o.get("status") == "REJECTED_MODEL_PATCH_NO_WRITE")
                report["final_source_status"] = state.get("status")
                report["qa_checks_certified"] = len(state.get("commits", []))
                report["local_model_calls_recorded"] = sum(
                    1 for p in (base / "private-state").glob("model_*.private.json"))
                logs = sorted((base / "private-state").glob("qa_*.private.log"))
                if state.get("status") not in ("SOURCE_ONLY_TASK_QUEUE_DONE",):
                    if logs:
                        # Public synthetic source fixture only; never user project data.
                        report["last_private_fixture_qa_tail"] = logs[-1].read_text(
                            encoding="utf-8", errors="replace")[-1800:]
            report["real_model_qa_e2e_pass"] = (
                report["local_git_commits_by_agent"] == 2
                and report["status"] == "SOURCE_ONLY_TASK_QUEUE_DONE")
        except Exception as ex:
            report["status"] = "HOLD_BEFORE_SOURCE_QA"
            report["infrastructure_error_type"] = type(ex).__name__
            report["infrastructure_error_text"] = str(ex)[-220:]
        finally:
            subprocess.run(["docker", "rm", "-f", name],
                           capture_output=True, timeout=25, check=False)
            # The ephemeral fixture/model private data is deleted on return.
    return report


if __name__ == "__main__":
    result = run_probe()
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    if not result.get("real_model_qa_e2e_pass", False):
        raise SystemExit(2)
