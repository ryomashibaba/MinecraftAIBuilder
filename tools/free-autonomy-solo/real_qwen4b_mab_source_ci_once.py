#!/usr/bin/env python3
"""Genuine local Qwen4B edits pinned public MAB V4H source, then isolated Docker QA.
Two private draft stages; no generated code executed on host, no GitHub push.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import subprocess
import tempfile
from real_small_model_ci_once import MODEL, IMAGE, cmd, wait_ready, real_chat_witness
from draft_real_project_local14b import run as draft_source
from promote_private_real_drafts_docker import promote
from prepare_pinned_real_project import load_manifest

PROJECT = "minecraftaibuilder"
PASS = "GENUINE_QWEN4B_PINNED_MAB_TWO_STAGE_SOURCE_QA_ONLY"


def trial() -> dict:
    result = {
        "schema": "dec-genuine-qwen4b-mab-public-source-v1", "project": PROJECT,
        "model_requested": MODEL, "status": "HOLD", "model_calls": 0,
        "real_ollama_response": False, "private_drafts": 0,
        "independent_qa_stages": 0, "local_qa_git_commits": 0,
        "remote_pushes": 0, "paid_api_credentials": False,
        "user_windows_or_original_modified": False,
        "art_or_minecraft_certified": False,
        "long_autonomy_certified": False,
    }
    with tempfile.TemporaryDirectory(prefix="real-qwen-mab-public-") as folder:
        root = Path(folder)
        os.environ["LOCALAPPDATA"] = str(root / "lock")
        (root / "lock").mkdir()
        name = "fa-mab-qwen-" + str(os.getpid())
        try:
            manifest = load_manifest()
            result["pinned_commit"] = manifest["project_candidates"][PROJECT]["pinned_commit"]
            cmd(["docker", "run", "-d", "--name", name, "--rm",
                 "--cap-drop=ALL", "--security-opt=no-new-privileges",
                 "--pids-limit", "128", "--memory", "5g", "--cpus", "3",
                 "-p", "127.0.0.1:11434:11434", IMAGE], timeout=55)
            wait_ready()
            cmd(["docker", "exec", name, "ollama", "pull", MODEL], timeout=420)
            wait_ready()
            witness = real_chat_witness()
            result["real_ollama_response"] = witness["local_http_response_observed"]
            d = draft_source(PROJECT, MODEL, manifest=manifest,
                             private_root=root / "private-drafts")
            result["model_calls"] = d["model_calls_attempted"]
            result["private_drafts"] = d["model_drafts"]
            result["draft_status"] = d["status"]
            result["stage_outcomes"] = [
                {"stage": row.get("stage"), "result": row.get("result")}
                for row in d["stages"]]
            if d["status"] != "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY":
                result["status"] = "HOLD_DRAFT_SOURCE"
            else:
                private = Path(d["private_receipt_path"]).parent
                verified = promote(private, PROJECT, MODEL, manifest=manifest)
                result["qa_status"] = verified["status"]
                result["independent_qa_stages"] = verified["completed_stages"]
                result["local_qa_git_commits"] = len(verified["local_qa_commits"])
                result["checks_per_stage"] = [
                    item["qa_checks_passed"] for item in verified["local_qa_commits"]]
                result["status"] = (
                    PASS if verified["status"] ==
                    "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS"
                    and result["local_qa_git_commits"] == 2
                    else "HOLD_REAL_SOURCE_QA")
        except Exception as exc:
            # Only a bounded exception class, never raw model/source/QA output.
            result["status"] = "HOLD_INFRA"
            result["error_type"] = type(exc).__name__
        finally:
            subprocess.run(["docker", "rm", "-f", name],
                           capture_output=True, timeout=25, check=False)
    return result


if __name__ == "__main__":
    report = trial()
    print(json.dumps(report, sort_keys=True, ensure_ascii=False, indent=2))
    root = os.environ.get("RUNNER_TEMP")
    if root:
        (Path(root) / "qwen4b-real-mab-qa-sanitized.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if report["status"] != PASS:
        raise SystemExit(2)
