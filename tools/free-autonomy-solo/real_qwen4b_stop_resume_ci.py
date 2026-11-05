#!/usr/bin/env python3
"""Real Qwen4B controlled stop after two cycles, then verified private QA resume.

The stop alone is simulated; all authored code and Docker QA are genuine.
Source and private path remain on ephemeral CI. No GitHub push/world writes.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import subprocess
import tempfile

from real_small_model_ci_once import MODEL, IMAGE, cmd, wait_ready
from draft_real_project_local14b import run as real_draft
from run_mab_private_continuous import run_cumulative, PASS

STOP = "CONTROLLED_CI_INTERRUPTION_NO_MODEL_POST"
FULL = "REAL_QWEN4B_STOP_RESUME_SIX_QA_SOURCE_STAGES_ONLY"


def experiment():
    out = {
        "schema": "dec-qwen4b-real-stop-resume-v1",
        "status": "HOLD",
        "model_requested": MODEL,
        "controlled_interruption_no_model_post": True,
        "completed_cycles_before_stop": 0,
        "completed_cycles_after_resume": 0,
        "verified_source_stages_before_stop": 0,
        "verified_source_stages_after_resume": 0,
        "model_calls_before_stop": 0,
        "model_calls_after_resume": 0,
        "previous_four_stages_reused": False,
        "real_third_cycle_qa_verified": False,
        "user_windows_qwen14b_tested": False,
        "art_or_gameplay_tested": False,
        "minecraft_world_writes": 0,
        "github_pushes": 0,
        "paid_api_calls": 0,
        "raw_model_source_uploaded": False,
    }
    with tempfile.TemporaryDirectory(prefix="qwen4b-real-resume-") as td:
        root = Path(td)
        os.environ["LOCALAPPDATA"] = str(root / "lock")
        (root / "lock").mkdir()
        container = "dec-qwen4b-resume-" + str(os.getpid())
        calls = 0
        def planned_stop(project, model, **kwargs):
            nonlocal calls
            if calls >= 2:
                return {
                    "status": "HOLD", "hold_reason": STOP,
                    "model_calls_attempted": 0,
                }
            calls += 1
            return real_draft(project, model, **kwargs)

        try:
            cmd(["docker", "run", "-d", "--rm", "--name", container,
                 "--cap-drop=ALL", "--security-opt=no-new-privileges",
                 "--pids-limit", "128", "--memory", "5g", "--cpus", "3",
                 "-p", "127.0.0.1:11434:11434", IMAGE], timeout=55)
            wait_ready()
            cmd(["docker", "exec", container, "ollama", "pull", MODEL], timeout=450)
            wait_ready()
            private = root / "private"
            first, _p1 = run_cumulative(
                model=MODEL, cycles=3, private_root=private, draft=planned_stop)
            out["first_run_status"] = first.get("status")
            out["completed_cycles_before_stop"] = first.get("completed_cycles", 0)
            out["verified_source_stages_before_stop"] = first.get(
                "completed_qa_source_stages", 0)
            out["model_calls_before_stop"] = first.get("model_calls_attempted", 0)
            if first.get("draft_hold_reason_code"):
                out["first_hold_reason_code"] = first["draft_hold_reason_code"]
            if not (
                first.get("status") == "HOLD_CYCLE_MODEL_DRAFT_FAILED_PRIOR_QA_PRESERVED"
                and first.get("draft_hold_reason_code") == STOP
                and calls == 2 and first.get("completed_cycles") == 2
                and first.get("completed_qa_source_stages") == 4
                and first.get("private_review_stages") == 4
                and first.get("model_calls_attempted", 0) >= 4
                and first.get("github_pushes") == 0
            ):
                out["status"] = "HOLD_FIRST_TWO_REAL_CYCLES_NOT_CONFIRMED"
                return out
            second, _p2 = run_cumulative(
                model=MODEL, cycles=3, private_root=private, resume_latest=True)
            out["second_run_status"] = second.get("status")
            out["completed_cycles_after_resume"] = second.get("completed_cycles", 0)
            out["verified_source_stages_after_resume"] = second.get(
                "completed_qa_source_stages", 0)
            out["model_calls_after_resume"] = second.get("model_calls_attempted", 0)
            for key in ("reason_code", "draft_hold_reason_code",
                        "qa_hold_reason_code"):
                if second.get(key):
                    out[key] = second[key]
            reused = (
                second.get("resumed_prior_verified_cycles") == 2
                and second.get("resumed_without_redoing_prior_model_calls") is True
                and second.get("accepted_cycles", [])[:2] ==
                    first.get("accepted_cycles", [])
                and second.get("completed_qa_source_stages", 0) >= 4
                and second.get("model_calls_attempted", 0) >=
                    first.get("model_calls_attempted", 0)
            )
            out["previous_four_stages_reused"] = reused
            if not reused:
                out["status"] = "HOLD_GENUINE_PRIVATE_RESUME_CHAIN_NOT_VERIFIED"
            elif (second.get("status") == PASS
                  and second.get("completed_cycles") == 3
                  and second.get("completed_qa_source_stages") == 6
                  and second.get("private_review_stages") == 6
                  and second.get("github_pushes") == 0):
                out["status"] = FULL
                out["real_third_cycle_qa_verified"] = True
            else:
                out["status"] = "HOLD_RESUME_VERIFIED_THIRD_MODEL_CYCLE_NOT_PASSED"
        except Exception as exc:
            out["status"] = "HOLD_REAL_MODEL_OR_CI_INFRASTRUCTURE"
            out["exception_class"] = type(exc).__name__
        finally:
            subprocess.run(["docker", "rm", "-f", container],
                           capture_output=True, timeout=25, check=False)
    return out


def main():
    r = experiment()
    print(json.dumps(r, sort_keys=True, ensure_ascii=False, indent=2))
    if os.environ.get("RUNNER_TEMP"):
        (Path(os.environ["RUNNER_TEMP"]) /
         "real-qwen4b-stopped-resume-sanitized.json").write_text(
            json.dumps(r, sort_keys=True, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8")
    return 0 if r["status"] == FULL else 2


if __name__ == "__main__":
    raise SystemExit(main())
