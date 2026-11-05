#!/usr/bin/env python3
"""Retain QA-passed model-authored source and exact Git diff privately.

The content is local review evidence, never permission to deploy or push it.
The caller must complete a trusted network-none independent Docker QA first.
"""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


class EvidenceHold(RuntimeError):
    pass


def _git(repo: Path, *args: str) -> str:
    p = subprocess.run(["git", "-C", str(repo), *args],
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace", stdin=subprocess.DEVNULL,
                       timeout=45, env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
    if p.returncode:
        raise EvidenceHold("EVIDENCE_GIT_INSPECTION_FAILED")
    return p.stdout.rstrip("\r\n")


def save_private_verified_stage(
    root: Path, workspace: Path, lane: dict, stage: int,
    body: str, commit: str, parent: str, checks: int,
    evidence_dir: Path,
) -> None:
    """Commit/source/patch verified from Git; store no more than 2 stages.

    Save stage 1 before stage 2 runs so that a later stage's HOLD does not
    destroy the earlier verified code. Only PUBLIC-source clones are handled,
    but generated text must still remain in private user-owned storage.
    """
    path = lane["source_file"]
    if not (stage in (1, 2) and type(checks) is int and checks > 0
            and isinstance(body, str) and
            re.fullmatch(r"[a-f0-9]{40}", commit) and
            re.fullmatch(r"[a-f0-9]{40}", parent) and
            re.fullmatch(
                r"(?:source/ai/[A-Za-z0-9_-]+\.mjs|src/app/[A-Za-z0-9_-]+\.ts)",
                path)):
        raise EvidenceHold("REVIEW_STAGE_INPUT_INVALID")
    if (root.is_symlink() or evidence_dir.is_symlink() or
            not evidence_dir.is_dir() or
            evidence_dir.parent.resolve() != root.resolve()):
        raise EvidenceHold("REVIEW_DESTINATION_UNTRUSTED")
    if (_git(workspace, "status", "--porcelain=v1", "--untracked-files=all")
            or _git(workspace, "rev-parse", "HEAD") != commit
            or _git(workspace, "rev-parse", commit + "^") != parent
            or _git(workspace, "diff", "--name-only", parent, commit) != path):
        raise EvidenceHold("REVIEW_GIT_CHANGE_SCOPE_OR_COMMIT_INVALID")
    if (_git(workspace, "hash-object", path) !=
            _git(workspace, "rev-parse", commit + ":" + path)):
        raise EvidenceHold("REVIEW_BLOB_NOT_COMMITTED")
    if (workspace / path).read_text(encoding="utf-8") != body:
        raise EvidenceHold("REVIEW_TEXT_NOT_COMMITTED")
    patch = _git(workspace, "diff", "--no-ext-diff", "--no-color",
                 parent, commit, "--", path)
    if not patch or len(patch.encode("utf-8")) > 100000:
        raise EvidenceHold("REVIEW_DIFF_EMPTY_OR_OVERSIZED")
    manifest_file = evidence_dir / "REVIEW_ONLY_PRIVATE_MANIFEST.json"
    data = (json.loads(manifest_file.read_text(encoding="utf-8"))
            if manifest_file.exists() else {
                "schema": "dec-private-source-review-after-real-qa-v1",
                "status": "PARTIAL_REVIEW_ONLY_NOT_CERTIFIED",
                "project_source_commit": lane["pinned_commit"],
                "project_source_blob": lane["source_blob_sha"],
                "source_file": path,
                "source_stages": [],
                "human_approval": False,
                "real_gameplay_or_art_certified": False,
                "github_pushes": 0,
            })
    stages = data.get("source_stages")
    if (not isinstance(stages, list) or len(stages) != stage - 1 or
            data.get("project_source_commit") != lane["pinned_commit"] or
            data.get("project_source_blob") != lane["source_blob_sha"] or
            data.get("source_file") != path):
        raise EvidenceHold("REVIEW_MANIFEST_INCONSISTENT")
    for name, text in (
        ("STAGE_" + str(stage) + "_PRIVATE_SOURCE.txt", body),
        ("STAGE_" + str(stage) + "_PRIVATE_DIFF.patch", patch + "\n"),
    ):
        dest = evidence_dir / name
        with dest.open("x", encoding="utf-8", newline="") as stream:
            stream.write(text)
        dest.chmod(0o600)
    data["source_stages"].append({
        "stage": stage, "commit": commit, "parent": parent,
        "candidate_sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
        "patch_sha256": hashlib.sha256((patch + "\n").encode("utf-8")).hexdigest(),
        "independent_qa_commands_passed": checks,
    })
    if stage == 2:
        data["status"] = "TWO_SOURCE_STAGES_REVIEW_ONLY_ART_HOLD"
    temp = evidence_dir / "REVIEW_ONLY_PRIVATE_MANIFEST.tmp"
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")
    os.replace(temp, manifest_file)
    manifest_file.chmod(0o600)
