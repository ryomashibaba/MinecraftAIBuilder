#!/usr/bin/env python3
"""Safely PREPARE (not run) one pinned real project for a local-LLM pilot.

A new private Git clone is made at an exact audited commit. No user original,
main, remote research ref, GitHub PR, Minecraft world, live game, Ollama model,
Docker configuration, paid API or Windows scheduled task is modified.

This is NOT an autonomous model runner; it only closes the dangerous jump from
a tiny synthetic fixture to real source checkout, using a single-project gate.
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

MANIFEST = Path(__file__).with_name("REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json")
REPOSITORIES = {
    "minecraftaibuilder": "ryomashibaba/MinecraftAIBuilder",
    "browser-ink-tps": "ryomashibaba/browser-ink-tps",
}
SAFE_REF = re.compile(r"research/[A-Za-z0-9][A-Za-z0-9._/-]*\Z")
SHA40 = re.compile(r"[a-f0-9]{40}\Z")
SOURCE = re.compile(r"(?:source/ai/[A-Za-z0-9_-]+\.mjs|src/app/[A-Za-z0-9_-]+\.ts)\Z")


class Hold(RuntimeError):
    pass


def load_manifest(filename: Path = MANIFEST) -> dict:
    data = json.loads(filename.read_text(encoding="utf-8"))
    if data.get("schema") != "dec-real-project-single-session-pinned-source-v1":
        raise Hold("MANIFEST_SCHEMA_UNEXPECTED")
    if set(data.get("project_candidates", {})) != set(REPOSITORIES):
        raise Hold("TWO_PROTECTED_PROJECT_IDENTITIES_REQUIRED")
    if data.get("simultaneous_active_projects_max") != 1:
        raise Hold("LOCAL_MODEL_MUST_OWN_ONE_PROJECT")
    for key in ("allow_paid_api", "allow_main_write",
                "allow_existing_source_revision_overwrite",
                "allow_dockerless_untrusted_model_source_execution"):
        if data.get(key) is not False:
            raise Hold("FORBIDDEN_MANIFEST_PERMISSION_" + key)
    for name, expected in REPOSITORIES.items():
        p = data["project_candidates"][name]
        if p.get("repository") != expected:
            raise Hold("PROJECT_ORIGIN_MISMATCH")
        if not all(isinstance(p.get(k), str) and SHA40.fullmatch(p[k])
                   for k in ("pinned_commit", "source_blob_sha")):
            raise Hold("INVALID_SOURCE_HASH_PIN")
        if not isinstance(p.get("source_file"), str) or not SOURCE.fullmatch(p["source_file"]):
            raise Hold("INVALID_SOURCE_PATH")
        branch = p.get("research_branch_for_private_clone", "")
        if not isinstance(branch, str) or not SAFE_REF.fullmatch(branch) or ".." in branch:
            raise Hold("INVALID_RESEARCH_BRANCH")
        qa = p.get("native_qa_argv")
        if not isinstance(qa, list) or not qa or any(
                not isinstance(x, list) or not x or x[0] not in {"node", "npm", "npx"}
                or any(not isinstance(a, str) or not a or "\x00" in a for a in x)
                for x in qa):
            raise Hold("NATIVE_QA_METADATA_INVALID")
    return data


def run_git(cwd: Path, args: list[str], *, timeout: int = 120) -> str:
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"}
    try:
        r = subprocess.run(["git", "-C", str(cwd), *args], capture_output=True,
                           text=True, errors="replace", timeout=timeout, env=env,
                           stdin=subprocess.DEVNULL)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Hold("GIT_OPERATION_UNAVAILABLE") from exc
    if r.returncode:
        raise Hold("GIT_FAILED_" + args[0].upper() + "_RC" + str(r.returncode))
    return r.stdout.strip()


def source_blob_sha(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\x00" + raw).hexdigest()


def verify_private_clone(workspace: Path, lane: dict) -> dict:
    if not workspace.is_dir() or not (workspace / ".git").is_dir():
        raise Hold("PRIVATE_DEDICATED_CLONE_REQUIRED")
    if Path(run_git(workspace, ["rev-parse", "--show-toplevel"])).resolve() != workspace.resolve():
        raise Hold("CLONE_ROOT_MISMATCH")
    if run_git(workspace, ["rev-parse", "HEAD"]) != lane["pinned_commit"]:
        raise Hold("PINNED_HEAD_CHANGED")
    branch = run_git(workspace, ["branch", "--show-current"])
    if branch != lane["research_branch_for_private_clone"]:
        raise Hold("RESEARCH_BRANCH_CHANGED")
    origin = run_git(workspace, ["remote", "get-url", "origin"])
    if origin != "https://github.com/" + lane["repository"] + ".git":
        raise Hold("REMOTE_ORIGIN_NOT_EXPECTED")
    if run_git(workspace, ["status", "--porcelain=v1", "--untracked-files=all"]):
        raise Hold("CLONE_DIRTY_BEFORE_MODEL")
    target = workspace / lane["source_file"]
    if target.is_symlink() or not target.is_file() or not target.resolve().is_relative_to(workspace.resolve()):
        raise Hold("SOURCE_PATH_MISSING_OR_ESCAPE")
    actual = source_blob_sha(target.read_bytes())
    if actual != lane["source_blob_sha"]:
        raise Hold("SOURCE_BLOB_PIN_MISMATCH")
    return {
        "status": "REAL_SOURCE_CLONE_PINNED_READONLY_READY",
        "repo": lane["repository"],
        "source_file": lane["source_file"],
        "source_blob_sha": actual,
        "head": lane["pinned_commit"],
        "research_branch": branch,
        "model_calls": 0,
        "git_remote_pushes": 0,
        "qa_executions": 0,
        "art_certified": False,
        "full_game_certified": False,
        "isolated_model_execution_certified": False,
    }


def prepare(project: str, manifest: dict, private_base: Path) -> dict:
    if project not in REPOSITORIES:
        raise Hold("PROJECT_ID_UNKNOWN")
    lane = manifest["project_candidates"][project]
    # Never clone into a project worktree or the caller's current folder.
    private_base.mkdir(parents=True, exist_ok=True)
    root = private_base / (project + "-" + uuid.uuid4().hex)
    root.mkdir()
    workspace = root / "repo"
    workspace.mkdir()
    result_path = root / "SHAREABLE_PREPARE_RECEIPT.json"
    report: dict = {
        "schema": "real-project-pinned-clone-prepare-v1",
        "project_selected": project,
        "status": "HOLD",
        "paid_api_calls": 0, "model_calls": 0,
        "remote_pushes": 0, "project_original_changed": False,
        "independent_qa_executed": False, "art_or_game_quality_certified": False,
    }
    try:
        run_git(workspace, ["init", "-q"])
        run_git(workspace, ["config", "core.autocrlf", "false"])
        run_git(workspace, ["remote", "add", "origin",
                            "https://github.com/" + lane["repository"] + ".git"])
        # Exact immutable commit, no checkout of mutable latest branch.
        run_git(workspace, ["fetch", "--quiet", "--no-tags", "--depth=1",
                            "--filter=blob:none", "origin", lane["pinned_commit"]],
                timeout=480)
        run_git(workspace, ["switch", "-c", lane["research_branch_for_private_clone"],
                            "--no-track", "FETCH_HEAD"], timeout=240)
        result = verify_private_clone(workspace, lane)
        report.update(result)
    except Hold as exc:
        report["status"] = "HOLD"
        report["reason"] = str(exc)[:150]
    finally:
        result_path.write_text(json.dumps(report, indent=2, ensure_ascii=False),
                               encoding="utf-8")
        report["private_receipt_path"] = str(result_path)
        report["private_workspace_path"] = str(workspace)
    return report


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", required=True, choices=sorted(REPOSITORIES))
    args = ap.parse_args()
    try:
        manifest = load_manifest()
        parent = Path(os.environ.get("LOCALAPPDATA") or tempfile.gettempdir())
        result = prepare(args.project, manifest,
                         parent / "FreeAutonomyPrivate" / "PinnedRealSources")
    except (Hold, OSError, ValueError, KeyError) as exc:
        result = {"status": "HOLD", "reason": str(exc)[:150],
                  "project_selected": args.project}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("status") == "REAL_SOURCE_CLONE_PINNED_READONLY_READY" else 2


if __name__ == "__main__":
    sys.exit(main())
