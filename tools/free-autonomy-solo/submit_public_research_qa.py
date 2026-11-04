#!/usr/bin/env python3
"""Explicitly publish two pinned public-source drafts to an EXISTING research branch.

Only after --publish-public-code is specified. Git credential manager handles
authentication outside this process; no tokens/passwords are accepted as args.
The uploaded file and its history are PUBLIC and permanently retrievable.
Never writes main, a protected project repo, an existing user clone or PR.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid

from draft_real_project_local14b import exclusive_local_project_lock
from prepare_pinned_real_project import load_manifest, verify_private_clone
from promote_private_real_drafts_docker import _read_receipt
from public_qa_handoff_protocol import Hold, make_payload, safe_submission_path

PILOT_REPO = "ryomashibaba/MinecraftAIBuilder"
PILOT_BRANCH = "research/dec-free-autonomy-solo-pilot-20261104"


def git(workspace: Path, *args: str, timeout=120) -> str:
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0",
           "GCM_INTERACTIVE": "Never"}
    try:
        r = subprocess.run(["git", "-C", str(workspace), *args],
                           capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=timeout, env=env,
                           stdin=subprocess.DEVNULL)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Hold("PUBLIC_GITHUB_GIT_UNAVAILABLE") from exc
    if r.returncode:
        raise Hold("PUBLIC_GITHUB_GIT_" + args[0].upper() + "_REJECTED")
    return r.stdout.rstrip("\r\n")


def verified_private_payload(root: Path, project: str, model: str,
                             manifest: dict | None = None) -> dict:
    manifest = load_manifest() if manifest is None else manifest
    if project not in ("minecraftaibuilder", "browser-ink-tps"):
        raise Hold("UNKNOWN_PROJECT")
    # Revalidate the initial model receipt; don't trust arbitrary model data.
    receipt, drafts = _read_receipt(root, project, model, manifest)
    lane = manifest["project_candidates"][project]
    private_repo = root / "repo"
    verify_private_clone(private_repo, lane)
    original = (private_repo / lane["source_file"]).read_text(encoding="utf-8")
    payload = make_payload(project, model, original, drafts[0], drafts[1],
                           synthetic=False, manifest=manifest)
    # The first-stage old source hash was recorded before the model response.
    good = [s for s in receipt["stages"]
            if isinstance(s, dict) and s.get("result") == "PRIVATE_UNVERIFIED_DIFF"]
    if (len(good) != 2 or good[0]["source_previous_sha256"] != payload["source_before_sha256"]
            or good[1]["source_previous_sha256"] != payload["stage1_sha256"]):
        raise Hold("PRIVATE_RECEIPT_CHAIN_NOT_APPROVED")
    return payload


def publish(payload: dict, *, authorize: bool, destination: Path | None = None) -> dict:
    if not authorize:
        raise Hold("PUBLIC_SOURCE_PUBLICATION_NEEDS_EXPLICIT_FLAG")
    if payload.get("privacy_ack") != "I_ACCEPT_PUBLIC_GIT_HISTORY_FOR_THESE_TWO_SOURCE_DRAFTS":
        raise Hold("PUBLIC_SOURCE_PRIVACY_ACK_MISSING")
    temp = destination or (Path(os.environ.get("LOCALAPPDATA") or tempfile.gettempdir())
                           / "FreeAutonomyPrivate" / "PublicQASubmission"
                           / uuid.uuid4().hex)
    temp.mkdir(parents=True, exist_ok=False)
    workspace = temp / "new-research-branch-clone"
    workspace.mkdir()
    rel = safe_submission_path(
        "tools/free-autonomy-solo/submissions/" + uuid.uuid4().hex + ".json")
    try:
        git(workspace, "init", "-q")
        git(workspace, "config", "core.autocrlf", "false")
        git(workspace, "remote", "add", "origin",
            "https://github.com/" + PILOT_REPO + ".git")
        git(workspace, "fetch", "--quiet", "--depth=1", "--no-tags", "origin",
            "refs/heads/" + PILOT_BRANCH, timeout=240)
        git(workspace, "switch", "-c", PILOT_BRANCH, "FETCH_HEAD")
        if git(workspace, "branch", "--show-current") != PILOT_BRANCH:
            raise Hold("RESEARCH_BRANCH_IDENTITY_MISMATCH")
        if git(workspace, "status", "--porcelain", "--untracked-files=all"):
            raise Hold("RESEARCH_BRANCH_NOT_CLEAN")
        target = workspace / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() or target.is_symlink():
            raise Hold("SUBMISSION_PATH_COLLISION")
        target.write_text(json.dumps(payload, ensure_ascii=False,
                                     sort_keys=True, separators=(",", ":")) + "\n",
                          encoding="utf-8")
        if target.stat().st_size > 42000:
            raise Hold("PUBLIC_SOURCE_SUBMISSION_EXCEEDS_SAFE_LIMIT")
        git(workspace, "add", "--", rel)
        changed = git(workspace, "diff", "--cached", "--name-only")
        if changed != rel:
            raise Hold("RESEARCH_UPLOAD_MORE_THAN_ONE_FILE")
        hookdir = temp / "empty-local-hooks"
        hookdir.mkdir()
        git(workspace, "-c", "core.hooksPath=" + str(hookdir),
            "-c", "user.name=Free Autonomy Local QA Submitter",
            "-c", "user.email=local-source-qa@example.invalid",
            "commit", "-m", "research(ci): submit one public two-stage pinned source QA request")
        # A fast-forward-only push to one PREEXISTING research branch.
        # No force, no main, no tag, no PR, no other remote.
        git(workspace, "push", "origin",
            "HEAD:refs/heads/" + PILOT_BRANCH, timeout=240)
        return {
            "status": "PUBLIC_RESEARCH_QA_SUBMITTED",
            "project": payload["project"],
            "git_remote": PILOT_REPO, "git_branch": PILOT_BRANCH,
            "submission_path": rel,
            "commit": git(workspace, "rev-parse", "HEAD"),
            "github_actions_expected_to_trigger": True,
            "github_actions_success_verified": False,
            "model_identity_verified": False,
            "real_project_improvement_verified": False,
            "public_source_irreversible": True,
            "project_original_modified": False,
        }
    except Hold:
        raise


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--receipt-dir", type=Path, required=True)
    ap.add_argument("--project", required=True,
                    choices=("minecraftaibuilder", "browser-ink-tps"))
    ap.add_argument("--model", default="qwen3:14b")
    ap.add_argument("--publish-public-code", action="store_true",
                    help="Explicitly allow public GitHub research source upload")
    args = ap.parse_args()
    result = {"status": "HOLD", "project": args.project,
              "github_pushes": 0}
    try:
        root = args.receipt_dir.expanduser().resolve(strict=True)
        with exclusive_local_project_lock():
            payload = verified_private_payload(root, args.project, args.model)
            if not args.publish_public_code:
                raise Hold("PUBLIC_SOURCE_PUBLICATION_NEEDS_EXPLICIT_FLAG")
            result = publish(payload, authorize=True)
    except (Hold, OSError, ValueError, KeyError, TypeError) as exc:
        result["hold_reason"] = str(exc)[:150]
    print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))
    return 0 if result["status"] == "PUBLIC_RESEARCH_QA_SUBMITTED" else 2


if __name__ == "__main__":
    sys.exit(main())
