#!/usr/bin/env python3
"""One locked local-Qwen MinecraftAIBuilder source session, REAL Docker QA.

This does NOT make, import, build or run generated source on Windows.
All candidate source execution is delegated to the existing network-none,
read-only, disposable Docker QA. Never GitHub push or Minecraft world write.
"""
from __future__ import annotations

import argparse
from contextlib import nullcontext
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import uuid

from draft_real_project_local14b import (
    run as draft_source, local_model_installed, exclusive_local_project_lock)
from promote_private_real_drafts_docker import (
    promote, require_docker_qa_image)
from prepare_pinned_real_project import load_manifest

PROJECT = "minecraftaibuilder"
PASS = "TWO_REVIEWABLE_PRIVATE_SOURCE_COMMITS_INDEPENDENT_DOCKER_QA_ART_HOLD"
CODE = re.compile(r"[A-Z][A-Z0-9_]{2,125}\Z")
HEX = re.compile(r"[a-f0-9]{64}\Z")


def _receipt(report: dict, path: Path) -> None:
    # Each transition is durable. Never write raw source, local paths or model
    # response to a SHAREABLE receipt; it is safe to attach to a Chat.
    part = path.with_suffix(".json.tmp")
    part.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")
    os.replace(part, path)


def _verified_private_evidence(result: dict, draft_dir: Path, lane: dict) -> list[dict]:
    """Inspect independently QAed Git/source/patch evidence for both stages.

    Manifest and files are private; only their verified hashes and counts
    may enter the shareable receipt.
    """
    review = Path(result["private_source_review_directory"])
    if (review.is_symlink() or
            review.parent.resolve() != draft_dir.resolve() or
            not review.is_dir()):
        raise ValueError("PRIVATE_REVIEW_DIRECTORY_INTEGRITY")
    mf = review / "REVIEW_ONLY_PRIVATE_MANIFEST.json"
    if mf.is_symlink() or not mf.is_file():
        raise ValueError("PRIVATE_REVIEW_MANIFEST_MISSING")
    obj = json.loads(mf.read_text(encoding="utf-8"))
    if (obj.get("schema") != "dec-private-source-review-after-real-qa-v1" or
            obj.get("status") != "TWO_SOURCE_STAGES_REVIEW_ONLY_ART_HOLD" or
            obj.get("project_source_commit") != lane["pinned_commit"] or
            obj.get("project_source_blob") != lane["source_blob_sha"] or
            obj.get("source_file") != lane["source_file"] or
            obj.get("human_approval") is not False or
            obj.get("real_gameplay_or_art_certified") is not False or
            obj.get("github_pushes") != 0):
        raise ValueError("PRIVATE_REVIEW_MANIFEST_NOT_AUTHORIZED")
    stages = obj.get("source_stages")
    committed = result.get("local_qa_commits")
    if (not isinstance(stages, list) or len(stages) != 2 or
            not isinstance(committed, list) or len(committed) != 2):
        raise ValueError("PRIVATE_REVIEW_COUNT_OR_STAGE_MISMATCH")
    inspected = []
    for stage in (1, 2):
        row, qa = stages[stage - 1], committed[stage - 1]
        src = review / ("STAGE_" + str(stage) + "_PRIVATE_SOURCE.txt")
        diff = review / ("STAGE_" + str(stage) + "_PRIVATE_DIFF.patch")
        if (src.is_symlink() or diff.is_symlink() or
                not src.is_file() or not diff.is_file()):
            raise ValueError("PRIVATE_REVIEW_SOURCE_OR_DIFF_MISSING")
        h1 = hashlib.sha256(src.read_bytes()).hexdigest()
        h2 = hashlib.sha256(diff.read_bytes()).hexdigest()
        if (row.get("stage") != stage or qa.get("stage") != stage or
                not HEX.fullmatch(str(h1)) or
                row.get("commit") != qa.get("commit") or
                row.get("candidate_sha256") != h1 or
                qa.get("candidate_sha256") != h1 or
                row.get("patch_sha256") != h2 or
                row.get("independent_qa_commands_passed") !=
                qa.get("qa_checks_passed") or
                type(qa.get("qa_checks_passed")) is not int or
                qa["qa_checks_passed"] < 1):
            raise ValueError("PRIVATE_REVIEW_RECORDED_HASH_OR_QA_MISMATCH")
        inspected.append({"stage": stage, "candidate_sha256": h1,
                          "patch_sha256": h2,
                          "independent_qa_commands_passed": qa["qa_checks_passed"]})
    return inspected


def run_single_session(
    model: str = "qwen3:14b", *, private_root: Path | None = None,
    manifest: dict | None = None,
    inspect_model=local_model_installed,
    preflight_docker=require_docker_qa_image,
    draft=draft_source, qa=promote,
    lock=exclusive_local_project_lock,
) -> tuple[dict, Path]:
    config = load_manifest() if manifest is None else manifest
    lane = config["project_candidates"][PROJECT]
    base = (private_root if private_root is not None else
            Path(os.environ.get("LOCALAPPDATA") or tempfile.gettempdir())
            / "FreeAutonomyPrivate" / "DecPrivateMABSourceSessions")
    base.mkdir(parents=True, exist_ok=True)
    run_dir = base / ("mab-source-" + uuid.uuid4().hex)
    run_dir.mkdir(mode=0o700)
    receipt = run_dir / "SHAREABLE_MAB_LOCAL_SOURCE_AUTONOMY.json"
    summary = {
        "schema": "dec-mab-locked-real-local-source-qa-v1",
        "status": "RUNNING_NOT_CERTIFIED",
        "project": PROJECT, "model_requested": model,
        "source_commit": lane["pinned_commit"],
        "source_blob": lane["source_blob_sha"],
        "model_calls_attempted": 0, "drafts_created": 0,
        "verified_qa_stages": 0, "private_review_stages": 0,
        "verified_review_source_sha256": [],
        "original_source_modified": False,
        "github_pushes": 0, "paid_api_calls": 0,
        "model_identity_cryptographically_verified": False,
        "real_gameplay_certified": False, "human_art": "NOT_REVIEWED",
        "minecraft_world_writes": 0,
        "docker_network_during_model_code_qa": "none",
        "model_generated_source_run_on_host": False,
        "long_autonomy_certified": False,
    }
    _receipt(summary, receipt)
    try:
        if (not re.fullmatch(r"[A-Za-z0-9_.:/-]{1,100}", model)
                or config.get("simultaneous_active_projects_max") != 1
                or config.get("allow_main_write") is not False
                or config.get("allow_paid_api") is not False):
            raise ValueError("SOURCE_OR_PROJECT_POLICY_INVALID")
        # Hold one actual OS lock ACROSS inference + QA + all private writes.
        with lock():
            # DO NOT consume scarce local model compute if required sandbox is
            # missing. No auto-install, image pull or Docker daemon mutation.
            try:
                preflight_docker()
            except Exception:
                summary["status"] = "HOLD_EXISTING_OFFLINE_DOCKER_QA_UNAVAILABLE"
                return summary, receipt
            if not inspect_model(model):
                summary["status"] = "HOLD_MODEL_NOT_INSTALLED_NO_DOWNLOAD"
                return summary, receipt
            summary["status"] = "DRAFTING_UNCERTIFIED_PRIVATE"
            _receipt(summary, receipt)
            drafts = draft(PROJECT, model, manifest=config,
                           private_root=run_dir / "PrivateDrafts",
                           use_lock=False)
            summary["model_calls_attempted"] = drafts.get("model_calls_attempted", 0)
            summary["drafts_created"] = drafts.get("model_drafts", 0)
            if drafts.get("status") != "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY":
                summary["status"] = "HOLD_MODEL_DRAFTS_NOT_ACCEPTED"
                return summary, receipt
            raw_path = drafts.get("private_receipt_path")
            if not isinstance(raw_path, str):
                raise ValueError("DRAFT_PRIVATE_RECEIPT_MISSING")
            draft_dir = Path(raw_path).resolve().parent
            if (not draft_dir.is_relative_to((run_dir / "PrivateDrafts").resolve())
                    or draft_dir == (run_dir / "PrivateDrafts").resolve()):
                raise ValueError("DRAFT_PRIVATE_DIRECTORY_ESCAPE")
            summary["status"] = "QA_RUNNING_UNCERTIFIED_PRIVATE"
            _receipt(summary, receipt)
            audited = qa(draft_dir, PROJECT, model, manifest=config,
                         use_lock=False)
            summary["verified_qa_stages"] = audited.get("completed_stages", 0)
            summary["private_review_stages"] = audited.get("private_source_review_stages", 0)
            if (audited.get("status") !=
                    "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS" or
                    summary["verified_qa_stages"] != 2 or
                    summary["private_review_stages"] != 2 or
                    audited.get("github_pushes") != 0):
                summary["status"] = (
                    "HOLD_PARTIAL_SOURCE_QA_REVIEW_PRESERVED"
                    if summary["private_review_stages"] else
                    "HOLD_SOURCE_QA_NO_PROMOTION")
                return summary, receipt
            source = _verified_private_evidence(audited, draft_dir, lane)
            summary["verified_review_source_sha256"] = source
            summary["status"] = PASS
    except Exception as exc:
        text = str(exc)
        summary["status"] = "HOLD_INFRA_OR_EVIDENCE_INTEGRITY"
        summary["reason_code"] = (
            text if CODE.fullmatch(text) else type(exc).__name__.upper())
    finally:
        _receipt(summary, receipt)
    return summary, receipt


def main() -> int:
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--model", default="qwen3:14b")
    a = cli.parse_args()
    status, report = run_single_session(a.model)
    print(json.dumps(status, ensure_ascii=False, indent=2))
    print("PRIVATE_SHAREABLE_RESULT_PATH=" + str(report))
    return 0 if status["status"] == PASS else 2


if __name__ == "__main__":
    sys.exit(main())
