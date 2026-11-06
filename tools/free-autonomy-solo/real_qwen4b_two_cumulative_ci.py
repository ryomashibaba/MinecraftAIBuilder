#!/usr/bin/env python3
"""Genuine Qwen3:4b TWO consecutive cumulative SOURCE cycles, disposable CI.

Every next model sees the previous independently Docker-QA-passed source
commit, not a fresh original. NO Windows user 14B, generated-code publication,
GitHub push, main/PR/Pages/world writes, paid API or ART/gameplay certification.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import tempfile

from real_small_model_ci_once import MODEL, IMAGE, cmd, wait_ready
from run_mab_private_continuous import PASS, run_cumulative

EXPECTED_CYCLES = 2
EXPECTED_QA_STAGES = 4
SUCCESS = "GENUINE_QWEN4B_TWO_CUMULATIVE_CYCLES_PRIVATE_SOURCE_QA_ONLY"


def _owned_container_cleanup_verified(container: str) -> bool:
    """Fail closed unless Docker confirms the named container is absent."""
    try:
        subprocess.run(
            ["docker", "rm", "-f", container], capture_output=True,
            timeout=25, check=False)
        # Docker's exact error wording varies by version/context. A successful
        # daemon-backed ALL-container list (not stderr text) proves absence.
        probe = subprocess.run(
            ["docker", "container", "ls", "--all", "--format", "{{.Names}}"],
            capture_output=True, text=True, timeout=25, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return False
    if probe.returncode != 0:
        return False
    # Include stopped/removing containers. Require an exact name match.
    return container not in probe.stdout.splitlines()


def experiment() -> dict:
    result = {
        "schema": "dec-real-qwen4b-two-cumulative-source-qa-v1",
        "status": "HOLD",
        "model_requested": MODEL,
        "genuine_ollama_started": False,
        "requested_cycles": EXPECTED_CYCLES,
        "completed_cycles": 0,
        "model_calls_attempted": 0,
        "qa_source_stages_verified": 0,
        "private_review_stages": 0,
        "cross_cycle_git_head_verified": False,
        "isolated_docker_qa_passed": False,
        "user_windows_accessed": False,
        "real_qwen14b_executed": False,
        "source_art_certified": False,
        "minecraft_world_writes": 0,
        "remote_git_pushes": 0,
        "paid_api_calls": 0,
        "raw_model_source_uploaded": False,
        "container_cleanup_verified": False,
    }
    with tempfile.TemporaryDirectory(prefix="dec-qwen4b-two-cycle-") as ephemeral:
        root = Path(ephemeral)
        os.environ["LOCALAPPDATA"] = str(root / "lock")
        (root / "lock").mkdir()
        container = "dec-qwen4b-two-cycles-" + str(os.getpid())
        try:
            cmd(["docker", "run", "-d", "--rm", "--name", container,
                 "--cap-drop=ALL", "--security-opt=no-new-privileges",
                 "--pids-limit", "128", "--memory", "5g", "--cpus", "3",
                 "-p", "127.0.0.1:11434:11434", IMAGE], timeout=55)
            wait_ready()
            cmd(["docker", "exec", container, "ollama", "pull", MODEL],
                timeout=450)
            wait_ready()
            result["genuine_ollama_started"] = True
            status, receipt = run_cumulative(
                model=MODEL, cycles=EXPECTED_CYCLES,
                private_root=root / "source-private")
            # Source stays on ephemeral disk; only hashes and counters.
            result["model_calls_attempted"] = status.get("model_calls_attempted", 0)
            result["completed_cycles"] = status.get("completed_cycles", 0)
            result["qa_source_stages_verified"] = status.get(
                "completed_qa_source_stages", 0)
            result["private_review_stages"] = status.get("private_review_stages", 0)
            result["source_status"] = status.get("status", "UNKNOWN")
            result["source_commit_audited"] = status.get(
                "base_audited_public_source_commit")
            if status.get("qa_hold_reason_code"):
                result["qa_hold_reason_code"] = status["qa_hold_reason_code"]
            if status.get("draft_hold_reason_code"):
                result["draft_hold_reason_code"] = status["draft_hold_reason_code"]
            if status.get("reason_code"):
                result["reason_code"] = status["reason_code"]
            accepted = status.get("accepted_cycles", [])
            if (status.get("status") == PASS
                    and result["completed_cycles"] == EXPECTED_CYCLES
                    and result["qa_source_stages_verified"] == EXPECTED_QA_STAGES
                    and result["private_review_stages"] == EXPECTED_QA_STAGES
                    and result["model_calls_attempted"] >= EXPECTED_QA_STAGES
                    and isinstance(accepted, list)
                    and len(accepted) == EXPECTED_CYCLES
                    and len({v for cycle in accepted
                             for v in cycle.get("source_sha256", [])})
                        == EXPECTED_QA_STAGES
                    and status.get("github_pushes") == 0
                    and status.get("original_source_modified") is False):
                result["status"] = SUCCESS
                result["cross_cycle_git_head_verified"] = True
                result["isolated_docker_qa_passed"] = True
            else:
                result["status"] = "HOLD_GENUINE_TWO_CYCLE_SOURCE"
        except Exception as exc:
            result["status"] = "HOLD_OLLAMA_OR_CI_INFRASTRUCTURE"
            result["exception_type"] = type(exc).__name__
        finally:
            result["container_cleanup_verified"] = _owned_container_cleanup_verified(
                container)
            if not result["container_cleanup_verified"]:
                # Successful SOURCE QA is not a completed safe owned run.
                result["status"] = "HOLD_OWNED_CONTAINER_CLEANUP_UNVERIFIED"
    return result


def main() -> int:
    outcome = experiment()
    print(json.dumps(outcome, sort_keys=True, indent=2, ensure_ascii=False))
    out = os.environ.get("RUNNER_TEMP")
    if out:
        (Path(out) / "dec-qwen4b-two-cycles-source-sanitized.json").write_text(
            json.dumps(outcome, sort_keys=True, indent=2) + "\n",
            encoding="utf-8")
    return 0 if outcome["status"] == SUCCESS else 2


if __name__ == "__main__":
    raise SystemExit(main())
