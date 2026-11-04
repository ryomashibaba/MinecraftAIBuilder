#!/usr/bin/env python3
"""Read EXACTLY ONE newly committed public research submission and Docker-QA it.

GitHub Actions checkouts use contents:read, persist-credentials:false and no
model/API credentials. Reject any commits that changed anything besides one
new file under the fixed submissions/ directory; reject source/ref drift.
Reconstruct PRIVATE internal trial receipt from the public request, then run
the genuine existing Docker promotion engine with remote pushes disabled.
Never emit raw submitted source/diff or private Docker logs to Actions output.
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
import tempfile
import uuid

from prepare_pinned_real_project import load_manifest, prepare, verify_private_clone
from promote_private_real_drafts_docker import promote
from public_qa_handoff_protocol import (
    Hold, read_submission, safe_submission_path, sha, validate_payload
)

SHA = re.compile(r"[a-f0-9]{40}\Z")


def git_read(cwd: Path, *args: str, timeout=50) -> bytes:
    try:
        p = subprocess.run(["git", "-C", str(cwd), *args], capture_output=True,
                           stdin=subprocess.DEVNULL, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Hold("PUBLIC_QA_GIT_QUERY_FAILED") from exc
    if p.returncode:
        raise Hold("PUBLIC_QA_GIT_QUERY_FAILED")
    return p.stdout


def one_new_submission(cwd: Path, before: str, after: str) -> str:
    if (not isinstance(before, str) or not isinstance(after, str)
            or not SHA.fullmatch(before) or not SHA.fullmatch(after)
            or before == "0"*40 or before == after):
        raise Hold("UNSAFE_PUSH_REVISION_RANGE")
    head = git_read(cwd, "rev-parse", "HEAD").decode().strip()
    if head != after:
        raise Hold("CHECKOUT_HEAD_NOT_PUSH_SHA")
    count = git_read(cwd, "rev-list", "--count", before + ".." + after).decode().strip()
    if count != "1":
        raise Hold("REQUIRE_EXACTLY_ONE_SUBMISSION_COMMIT")
    git_read(cwd, "merge-base", "--is-ancestor", before, after)
    changes = git_read(cwd, "diff", "--name-status", "-z",
                       "--no-renames", before, after)
    # For -z Git uses b'A\0<path>\0'.
    parts = changes.split(b"\x00")
    if len(parts) != 3 or parts[0] != b"A" or parts[-1] != b"":
        raise Hold("PUSH_MUST_ADD_EXACTLY_ONE_FILE")
    try:
        rel = safe_submission_path(parts[1].decode("utf-8"))
    except UnicodeDecodeError as exc:
        raise Hold("SUBMISSION_FILENAME_NOT_UTF8") from exc
    # Reject symlink or submodule instead of treating it as a JSON data file.
    tree = git_read(cwd, "ls-tree", "HEAD", "--", rel).decode("utf-8", "replace")
    if not tree.startswith("100644 blob "):
        raise Hold("SUBMISSION_NOT_REGULAR_GIT_BLOB")
    return rel


def write_private_stage_receipt(root: Path, request: dict) -> None:
    # Only derived from a validated public source payload; no claim that a
    # GitHub runner observed actual Qwen inference.
    data = {
        "schema": "real-project-qwen-local-private-draft-v1",
        "status": "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY",
        "project": request["project"],
        "model_requested": request["model_reported_only"],
        "pinned_source_commit": request["source_commit"],
        "pinned_source_blob": request["source_blob_sha"],
        "model_drafts": 2, "model_calls_attempted": 0,
        "git_commits": 0, "git_pushes": 0,
        "native_QA_executed": False,
        "stages": [
            {"stage": 1, "result": "PRIVATE_UNVERIFIED_DIFF",
             "source_previous_sha256": request["source_before_sha256"],
             "candidate_sha256": request["stage1_sha256"]},
            {"stage": 2, "result": "PRIVATE_UNVERIFIED_DIFF",
             "source_previous_sha256": request["stage1_sha256"],
             "candidate_sha256": request["stage2_sha256"]},
        ],
    }
    for stage in (1, 2):
        (root / f"draft_{stage}.private.txt").write_text(
            request[f"stage{stage}_source"], encoding="utf-8")
    (root / "SHAREABLE_DRAFT_RESULT.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def handle(submission: Path, *, manifest: dict | None = None,
           parent: Path | None = None) -> dict:
    manifest = load_manifest() if manifest is None else manifest
    request = read_submission(submission)
    project = request.get("project")
    if project not in ("minecraftaibuilder", "browser-ink-tps"):
        raise Hold("UNKNOWN_PROJECT")
    base = parent or Path(tempfile.mkdtemp(prefix="public-source-qa-ci-"))
    base.mkdir(parents=True, exist_ok=True)
    admission = prepare(project, manifest, base / "private-clones")
    if admission.get("status") != "REAL_SOURCE_CLONE_PINNED_READONLY_READY":
        raise Hold("GITHUB_SOURCE_PIN_ADMISSION_HOLD")
    root = Path(admission["private_workspace_path"]).parent
    lane = manifest["project_candidates"][project]
    verify_private_clone(root / "repo", lane)
    original = (root / "repo" / lane["source_file"]).read_text(encoding="utf-8")
    details = validate_payload(request, original, manifest=manifest)
    write_private_stage_receipt(root, request)
    result = promote(root, project, request["model_reported_only"],
                     allow_public_npm_deps=(project == "browser-ink-tps"))
    return {
        "schema": "dec-public-source-qa-real-docker-result-v1",
        "status": result["status"],
        "project": project, "pinned_head": lane["pinned_commit"],
        "source_file": lane["source_file"],
        "public_payload_sha256": hashlib.sha256(
            submission.read_bytes()).hexdigest(),
        "synthetic_fixture": request["synthetic_fixture"],
        "model_reported_only": request["model_reported_only"],
        "model_identity_independently_verified": False,
        "runner_model_calls": 0,
        "docker_qa_network": "none",
        "docker_qa_real": result.get("completed_stages", 0) > 0,
        "qa_checks_per_accepted_stage": [
            v["qa_checks_passed"] for v in result.get("local_qa_commits", [])
        ],
        "private_local_git_commits": len(result.get("local_qa_commits", [])),
        "private_qa_completed_stages": result.get("completed_stages", 0),
        "github_remote_pushes_from_runner": 0,
        "main_or_original_changed": False,
        "user_windows_or_gpu_tested": False,
        "real_minecraft_education_certified": False,
        "browser_ink_full_180sec_4v4_certified": False,
        "art_certified": False,
        "project_improvement_certified": False,
        "long_unattended_autonomy_certified": False,
        **({"hold_reason": result.get("hold_reason", "UNKNOWN_HOLD")}
           if result["status"] == "HOLD" else {}),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", type=Path, default=Path.cwd())
    ap.add_argument("--before", required=True)
    ap.add_argument("--after", required=True)
    args = ap.parse_args()
    summary = {
        "schema": "dec-public-source-qa-real-docker-result-v1",
        "status": "HOLD", "private_local_git_commits": 0,
        "model_identity_independently_verified": False,
        "github_remote_pushes_from_runner": 0,
    }
    try:
        root = args.repo_root.resolve(strict=True)
        rel = one_new_submission(root, args.before, args.after)
        summary = handle(root / rel)
    except (Hold, OSError, ValueError, KeyError, TypeError) as exc:
        summary["hold_reason"] = str(exc)[:150]
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
    tmp = Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir()))
    (tmp / "dec-public-source-qa-result.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if summary["status"] == "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS" else 2


if __name__ == "__main__":
    sys.exit(main())
