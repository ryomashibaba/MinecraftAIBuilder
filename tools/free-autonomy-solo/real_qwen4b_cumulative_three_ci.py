#!/usr/bin/env python3
"""Genuine Qwen3:4b three-cycle MAB source QA on disposable public CI.

The existing real model -> source drafts -> network-none Docker QA -> PRIVATE
Git successor chain runs with cycles=3. No user Windows 14B or public source
publication. This is SOURCE-only, not Minecraft, ART or production approval.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import subprocess
import tempfile
from real_small_model_ci_once import MODEL, IMAGE, cmd, wait_ready
from run_mab_private_continuous import PASS, run_cumulative

FULL = "GENUINE_QWEN4B_THREE_CUMULATIVE_SOURCE_CYCLES_ONLY"


def run() -> dict:
    report = {
        "schema": "dec-real-qwen4b-three-cycles-v1",
        "status": "HOLD", "model_requested": MODEL,
        "requested_cycles": 3, "completed_cycles": 0,
        "model_calls_attempted": 0, "qa_source_stages": 0,
        "verified_private_review_stages": 0,
        "accepted_cycle_sha256": [],
        "real_ollama_started": False,
        "real_isolated_source_qa": False,
        "private_git_ancestry_verified": False,
        "model_identity_cryptographically_verified": False,
        "real_user_windows_14b": False,
        "original_and_main_changed": False,
        "remote_git_pushes": 0, "model_source_uploaded": False,
        "world_writes": 0, "paid_api_calls": 0,
        "art_or_gameplay_pass": False,
        "long_overnight_autonomy_proven": False,
    }
    with tempfile.TemporaryDirectory(prefix="qwen4b-mab-three-cycles-") as d:
        base = Path(d)
        os.environ["LOCALAPPDATA"] = str(base / "lock")
        (base / "lock").mkdir()
        name = "qwen4b-mab-three-" + str(os.getpid())
        try:
            cmd(["docker", "run", "-d", "--rm", "--name", name,
                 "--cap-drop=ALL", "--security-opt=no-new-privileges",
                 "--pids-limit", "128", "--memory", "5g", "--cpus", "3",
                 "-p", "127.0.0.1:11434:11434", IMAGE], timeout=55)
            wait_ready()
            cmd(["docker", "exec", name, "ollama", "pull", MODEL],
                timeout=450)
            wait_ready()
            report["real_ollama_started"] = True
            result, _receipt = run_cumulative(
                model=MODEL, cycles=3, private_root=base / "private")
            report["source_status"] = result.get("status")
            report["pinned_source_head"] = result.get(
                "base_audited_public_source_commit")
            report["model_calls_attempted"] = result.get(
                "model_calls_attempted", 0)
            report["completed_cycles"] = result.get("completed_cycles", 0)
            report["qa_source_stages"] = result.get("completed_qa_source_stages", 0)
            report["verified_private_review_stages"] = result.get(
                "private_review_stages", 0)
            report["accepted_cycle_sha256"] = [
                {"cycle": e.get("cycle"), "source_sha256": e.get("source_sha256"),
                 "qa_command_counts": e.get("qa_commands")}
                for e in result.get("accepted_cycles", [])
            ]
            if result.get("reason_code"):
                report["reason_code"] = result["reason_code"]
            # The failure code is from the trusted local proposal validator.
            # Never upload the model reply, generated code, private Git
            # worktree or arbitrary raw diagnostic from the model.
            if result.get("draft_hold_reason_code"):
                report["draft_hold_reason_code"] = result["draft_hold_reason_code"]
            if result.get("qa_hold_reason_code"):
                report["qa_hold_reason_code"] = result["qa_hold_reason_code"]
            if isinstance(result.get("draft_rejection_reason_codes"), list):
                report["draft_rejection_reason_codes"] = result[
                    "draft_rejection_reason_codes"][:8]
            if (result.get("status") == PASS and
                    report["completed_cycles"] == 3 and
                    report["qa_source_stages"] == 6 and
                    report["verified_private_review_stages"] == 6 and
                    len(report["accepted_cycle_sha256"]) == 3 and
                    report["model_calls_attempted"] >= 6 and
                    result.get("github_pushes") == 0):
                report["status"] = FULL
                report["real_isolated_source_qa"] = True
                report["private_git_ancestry_verified"] = True
            else:
                report["status"] = "HOLD_PARTIAL_GENUINE_SOURCE_CUMULATION"
        except Exception as exc:
            report["status"] = "HOLD_REAL_MODEL_OR_CI_INFRASTRUCTURE"
            report["error_type"] = type(exc).__name__
        finally:
            subprocess.run(["docker", "rm", "-f", name],
                           capture_output=True, timeout=25, check=False)
    return report


if __name__ == "__main__":
    result = run()
    print(json.dumps(result, sort_keys=True, indent=2, ensure_ascii=False))
    temp = os.environ.get("RUNNER_TEMP")
    if temp:
        (Path(temp) / "qwen4b-three-cycles-safe.json").write_text(
            json.dumps(result, sort_keys=True, indent=2) + "\n",
            encoding="utf-8")
    raise SystemExit(0 if result["status"] == FULL else 2)
