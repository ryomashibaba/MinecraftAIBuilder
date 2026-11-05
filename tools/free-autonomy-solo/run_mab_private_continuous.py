#!/usr/bin/env python3
"""Bounded continuous PRIVATE MinecraftAIBuilder source authoring, 3 cycles.

Up to six *cumulative* SOURCE revisions: each next local-model input is the
previous independent, network-none Docker QA-passed private Git HEAD. The
public original SHA is never changed, and generated code is never executed
by the Windows host. All later clones come from a fresh private Git commit.

This pilot is SOURCE-only. It is not a long unattended autonomy, Minecraft
walking, human ART or real gameplay certification.
"""
from __future__ import annotations

import argparse
from contextlib import nullcontext
import copy
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import uuid

from draft_real_project_local14b import (
    run as draft_source, local_model_installed, exclusive_local_project_lock)
from prepare_pinned_real_project import (
    load_manifest, verify_private_clone, source_blob_sha)
from promote_private_real_drafts_docker import (
    promote, require_docker_qa_image, run_git)
from run_mab_private_autonomy_once import (
    _verified_private_evidence, _receipt, PROJECT)
from private_verified_source_evidence import EvidenceHold

PASS = "MULTICYCLE_CUMULATIVE_SOURCE_QA_PRIVATE_ONLY_ART_HOLD"
SHA = re.compile(r"[a-f0-9]{40}\Z")


def _successor_from_qa(
    draft_dir: Path, audited: dict, manifest: dict, next_private_base: Path | None,
) -> tuple[dict, Path | None]:
    """Prove the two independent Git commits form a source-only chain.

    Clone exclusively from a PRIVATE QA clone at exactly the second accepted
    commit; repin the manifest in-memory. Never fetch a generated commit from
    GitHub or trust a model-provided branch or path.
    """
    lane = manifest["project_candidates"][PROJECT]
    qa_value = audited.get("qa_workspace_private")
    commits = audited.get("local_qa_commits")
    if (not isinstance(qa_value, str)
            or not isinstance(commits, list) or len(commits) != 2):
        raise EvidenceHold("SUCCESSOR_QA_EVIDENCE_MISSING")
    original = Path(qa_value)
    qa_repo = original.resolve(strict=True)
    if (original.is_symlink() or qa_repo.parent != draft_dir.resolve(strict=True)
            or not qa_repo.name.startswith("qa-clone-")
            or not (qa_repo / ".git").is_dir()):
        raise EvidenceHold("SUCCESSOR_QA_WORKSPACE_OUTSIDE_PRIVATE_ROOT")
    source = lane["source_file"]
    sha1, sha2 = commits[0].get("commit"), commits[1].get("commit")
    if (not isinstance(sha1, str) or not SHA.fullmatch(sha1)
            or not isinstance(sha2, str) or not SHA.fullmatch(sha2)):
        raise EvidenceHold("SUCCESSOR_COMMIT_IDS_INVALID")
    if (run_git(qa_repo, "status", "--porcelain=v1", "--untracked-files=all")
            or run_git(qa_repo, "rev-parse", "HEAD") != sha2
            or run_git(qa_repo, "rev-parse", "HEAD^") != sha1
            or run_git(qa_repo, "rev-parse", "HEAD^^") != lane["pinned_commit"]):
        raise EvidenceHold("SUCCESSOR_SOURCE_GIT_CHAIN_NOT_VERIFIED")
    if (run_git(qa_repo, "diff", "--name-only", lane["pinned_commit"], sha1) != source
            or run_git(qa_repo, "diff", "--name-only", sha1, sha2) != source):
        raise EvidenceHold("SUCCESSOR_CHANGED_PROTECTED_FILES")
    dest = qa_repo / source
    if dest.is_symlink() or not dest.is_file():
        raise EvidenceHold("SUCCESSOR_SOURCE_NOT_REGULAR_FILE")
    blob_sha = source_blob_sha(dest.read_bytes())
    if (run_git(qa_repo, "rev-parse", "HEAD:" + source) != blob_sha
            or not SHA.fullmatch(blob_sha)):
        raise EvidenceHold("SUCCESSOR_SOURCE_GIT_BLOB_DRIFT")
    # The preceding layer must be the original/previous QA baseline exactly.
    base_blob = run_git(
        qa_repo, "rev-parse", lane["pinned_commit"] + ":" + source)
    if base_blob != lane["source_blob_sha"]:
        raise EvidenceHold("SUCCESSOR_BASELINE_GIT_BLOB_CHANGED")
    next_manifest = copy.deepcopy(manifest)
    next_lane = next_manifest["project_candidates"][PROJECT]
    next_lane["pinned_commit"] = sha2
    next_lane["source_blob_sha"] = blob_sha
    # The final cycle must also prove committed source lineage; no new clone.
    if next_private_base is None:
        return next_manifest, None
    # This destination is PRIVATE and fresh. Do not create or overwrite repo
    # worktrees the user might already have in their project folders.
    workbase = next_private_base / "PrivateClones"
    workbase.mkdir(parents=True, exist_ok=True)
    root = workbase / ("n-" + uuid.uuid4().hex[:16])
    root.mkdir()
    fresh = root / "repo"
    run_git(
        qa_repo, "-c", "core.autocrlf=false",
        "-c", "core.hooksPath=" + str(root / "disabled-hooks"),
        "clone", "--no-local", "--quiet",
        "--branch", next_lane["research_branch_for_private_clone"],
        str(qa_repo), str(fresh), timeout=180)
    run_git(fresh, "remote", "set-url", "origin",
            "https://github.com/" + lane["repository"] + ".git")
    run_git(fresh, "config", "core.autocrlf", "false")
    verify_private_clone(fresh, next_lane)
    return next_manifest, fresh


def run_cumulative(
    model: str = "qwen3:14b", *, cycles: int = 3,
    private_root: Path | None = None, manifest: dict | None = None,
    inspect_model=local_model_installed,
    preflight_docker=require_docker_qa_image,
    draft=draft_source, qa=promote,
    lock=exclusive_local_project_lock,
    successor=_successor_from_qa,
) -> tuple[dict, Path]:
    config = load_manifest() if manifest is None else copy.deepcopy(manifest)
    base = (private_root if private_root is not None else
            Path(os.environ.get("LOCALAPPDATA") or tempfile.gettempdir())
            / "FreeAutonomyPrivate" / "MC")
    base.mkdir(parents=True, exist_ok=True)
    root = base / ("m-" + uuid.uuid4().hex[:16])
    root.mkdir(mode=0o700)
    report_path = root / "SHAREABLE_MAB_CUMULATIVE_SOURCE_QA.json"
    lane = config["project_candidates"][PROJECT]
    summary = {
        "schema": "dec-mab-cumulative-private-source-qa-v1",
        "status": "RUNNING_UNCERTIFIED",
        "project": PROJECT, "model_requested": model,
        "requested_cycles": cycles, "completed_cycles": 0,
        "completed_qa_source_stages": 0, "model_calls_attempted": 0,
        "private_review_stages": 0, "accepted_cycles": [],
        "base_audited_public_source_commit": lane["pinned_commit"],
        "base_audited_public_source_blob": lane["source_blob_sha"],
        "github_pushes": 0, "original_source_modified": False,
        "model_generated_code_executed_on_windows": False,
        "paid_api_calls": 0, "minecraft_world_writes": 0,
        "art": "NOT_REVIEWED", "minecraft_walking": "NOT_TESTED",
        "true_overnight_autonomy_certified": False,
        "qa_container_network": "none",
    }
    _receipt(summary, report_path)
    try:
        if (type(cycles) is not int or not 1 <= cycles <= 3 or
                not isinstance(model, str) or
                not re.fullmatch(r"[A-Za-z0-9_.:/-]{1,100}", model) or
                config.get("simultaneous_active_projects_max") != 1 or
                config.get("allow_paid_api") is not False or
                config.get("allow_main_write") is not False or
                config.get("allow_dockerless_untrusted_model_source_execution") is not False):
            raise EvidenceHold("MULTICYCLE_POLICY_OR_BUDGET_INVALID")
        prepared: Path | None = None
        with lock():
            # Never burn real model tokens before required QA sandbox exists.
            try:
                preflight_docker()
            except Exception:
                summary["status"] = "HOLD_OFFLINE_DOCKER_NOT_READY_NO_MODEL_CALL"
                return summary, report_path
            if not inspect_model(model):
                summary["status"] = "HOLD_LOCAL_MODEL_NOT_INSTALLED_NO_PULL"
                return summary, report_path
            for n in range(1, cycles + 1):
                cycle_root = root / ("c" + str(n))
                summary["status"] = "MODEL_SOURCE_CYCLE_RUNNING_UNCERTIFIED"
                summary["active_cycle"] = n
                _receipt(summary, report_path)
                call_kwargs = {
                    "manifest": config, "private_root": cycle_root,
                    "use_lock": False,
                }
                if prepared is not None:
                    call_kwargs["prepared_workspace"] = prepared
                draft_result = draft(PROJECT, model, **call_kwargs)
                calls = draft_result.get("model_calls_attempted", 0)
                if type(calls) is not int or not 0 <= calls <= 4:
                    raise EvidenceHold("MULTICYCLE_MODEL_ATTEMPT_BUDGET_INVALID")
                summary["model_calls_attempted"] += calls
                if draft_result.get("status") != "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY":
                    summary["status"] = "HOLD_CYCLE_MODEL_DRAFT_FAILED_PRIOR_QA_PRESERVED"
                    return summary, report_path
                private_receipt = draft_result.get("private_receipt_path")
                if not isinstance(private_receipt, str):
                    raise EvidenceHold("MULTICYCLE_PRIVATE_RECEIPT_MISSING")
                stage_dir = Path(private_receipt).resolve(strict=True).parent
                if (stage_dir.parent.resolve() !=
                        (cycle_root / "PrivateClones").resolve() or
                        stage_dir.is_symlink()):
                    raise EvidenceHold("MULTICYCLE_PRIVATE_DRAFT_PATH_ESCAPE")
                summary["status"] = "DOCKER_QA_CYCLE_RUNNING_UNCERTIFIED"
                _receipt(summary, report_path)
                verified = qa(stage_dir, PROJECT, model, manifest=config,
                              use_lock=False)
                succeeded = verified.get("completed_stages", 0)
                reviewed = verified.get("private_source_review_stages", 0)
                if (type(succeeded) is not int or type(reviewed) is not int or
                        not 0 <= reviewed <= succeeded <= 2):
                    raise EvidenceHold("MULTICYCLE_QA_STAGE_COUNTS_INVALID")
                summary["completed_qa_source_stages"] += succeeded
                summary["private_review_stages"] += reviewed
                if (verified.get("status") !=
                        "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS" or
                        succeeded != 2 or reviewed != 2 or
                        verified.get("github_pushes") != 0):
                    summary["status"] = "HOLD_PARTIAL_QA_REVIEW_PRESERVED"
                    return summary, report_path
                safe = _verified_private_evidence(
                    verified, stage_dir, config["project_candidates"][PROJECT])
                # No later cycle may use an unverified or unsigned code result.
                if len(safe) != 2:
                    raise EvidenceHold("MULTICYCLE_EVIDENCE_STAGE_COUNT")
                # Every cycle, including final, must show a genuine two-commit
                # private Git chain before its state becomes accepted.
                next_base = (
                    root / ("c" + str(n + 1))
                    if n < cycles else None
                )
                next_config, next_prepared = successor(
                    stage_dir, verified, config, next_base)
                summary["accepted_cycles"].append({
                    "cycle": n,
                    "source_sha256": [x["candidate_sha256"] for x in safe],
                    "qa_commands": [x["independent_qa_commands_passed"] for x in safe],
                })
                summary["completed_cycles"] = n
                _receipt(summary, report_path)
                config, prepared = next_config, next_prepared
            summary["status"] = PASS
    except Exception as exc:
        code = str(exc)
        summary["status"] = "HOLD_CUMULATIVE_SOURCE_OR_GIT_INTEGRITY"
        summary["reason_code"] = (
            code if re.fullmatch(r"[A-Z][A-Z0-9_]{2,130}", code)
            else type(exc).__name__.upper())
    finally:
        _receipt(summary, report_path)
    return summary, report_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="qwen3:14b")
    parser.add_argument("--cycles", type=int, default=3, choices=(1, 2, 3))
    args = parser.parse_args()
    summary, path = run_cumulative(args.model, cycles=args.cycles)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("PRIVATE_SHAREABLE_RESULT_PATH=" + str(path))
    return 0 if summary["status"] == PASS else 2


if __name__ == "__main__":
    sys.exit(main())
