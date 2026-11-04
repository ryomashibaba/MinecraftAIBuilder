#!/usr/bin/env python3
"""One reviewed MAB Qwen run -> EXPLICITLY approved public research Docker QA.

Never re-runs Ollama. Uses only private drafts with exact user-reported hashes.
PUBLIC is an irreversible Git upload, so a human must review the exact diffs
and type PUBLIC before Git push. No direct changes to main or project originals.
"""
from __future__ import annotations

import difflib
import json
import os
from pathlib import Path
import subprocess
import sys

from draft_real_project_local14b import exclusive_local_project_lock
from prepare_pinned_real_project import load_manifest
from promote_private_real_drafts_docker import (
    preflight_private_drafts, syntax_check_existing_mab_private_drafts,
)
from submit_public_research_qa import verified_private_payload, publish
from verify_public_research_qa import observe

PROJECT = "minecraftaibuilder"
MODEL = "qwen3:14b"
PINNED_SOURCE_COMMIT = "fe1682e15ffa063f4dc415b06c4d76a54737a06e"
# These are the two successful private draft digests supplied by the user.
EXPECTED_DRAFT_HASHES = (
    "03b73c926cb507b9fc0bed50c3a9b38cf5cada631b15a428b9e3f240fe8098cc",
    "5b8468783df8126d6e053bf7d37b4c9b74fd543bdd345d5898ac88fe022df6d6",
)
PUBLIC_APPROVAL = "PUBLIC"
OUTPUT_NAME = "SHAREABLE_EXISTING_QWEN_PUBLIC_QA_STATUS.json"


class Hold(RuntimeError):
    pass


def locate_exact_existing_drafts(base: Path) -> Path:
    """Select the newest receipt for this precise prior run, not other projects."""
    candidates = []
    if not base.is_dir() or base.is_symlink():
        raise Hold("PRIVATE_DRAFT_BASE_NOT_FOUND")
    for folder in base.glob(PROJECT + "-*"):
        if folder.is_symlink() or not folder.is_dir():
            continue
        receipt = folder / "SHAREABLE_DRAFT_RESULT.json"
        if receipt.is_symlink() or not receipt.is_file():
            continue
        try:
            data = json.loads(receipt.read_text(encoding="utf-8"))
            valid = [
                item for item in data.get("stages", [])
                if isinstance(item, dict)
                and item.get("result") == "PRIVATE_UNVERIFIED_DIFF"
            ]
            if (data.get("schema") == "real-project-qwen-local-private-draft-v1"
                    and data.get("status") == "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY"
                    and data.get("project") == PROJECT
                    and data.get("model_requested") == MODEL
                    and data.get("pinned_source_commit") == PINNED_SOURCE_COMMIT
                    and len(valid) == 2
                    and [x.get("stage") for x in valid] == [1, 2]
                    and tuple(x.get("candidate_sha256") for x in valid)
                    == EXPECTED_DRAFT_HASHES):
                candidates.append((receipt.stat().st_mtime_ns, str(folder), folder))
        except (OSError, ValueError, TypeError):
            continue
    if not candidates:
        raise Hold("EXACT_APPROVED_2_DRAFT_RECEIPTS_NOT_FOUND")
    return max(candidates)[2]


def review_diffs(payload: dict, printer=print) -> None:
    """Show exact contents locally before public release (not in shareable status)."""
    old = payload["source_before_sha256"]  # digest for provenance, not a source
    printer("SOURCE_PINNED_COMMIT=" + payload["source_commit"])
    printer("BASELINE_SHA256=" + old)
    source_file = load_manifest()["project_candidates"][PROJECT]["source_file"]
    # Difference is computed relative to the genuine pinned source, passed
    # by the caller. Do not publish or conceal generated text before approval.
    printer("PUBLIC_DESTINATION=ryomashibaba/MinecraftAIBuilder (existing research branch)")
    printer("PUBLIC_DATA=full stage1 and stage2 source snapshots, permanent history")
    printer("RESEARCH_SOURCE_FILE=" + source_file)


def show_actual_patch(before: str, first: str, second: str, printer=print) -> None:
    for stage, old, new in ((1, before, first), (2, first, second)):
        delta = "".join(difflib.unified_diff(
            old.splitlines(keepends=True), new.splitlines(keepends=True),
            fromfile="stage" + str(stage) + "-before",
            tofile="stage" + str(stage) + "-after",
            n=3))
        if not delta:
            raise Hold("CANDIDATE_STAGE_NO_CHANGE")
        printer("==== LOCAL_ONLY_PUBLICATION_REVIEW_STAGE_" + str(stage) + " ====")
        printer(delta)


def write_status(root: Path, report: dict) -> None:
    # Strict metadata allowlist. Never expose private code or local paths.
    payload = {k: report.get(k) for k in (
        "schema", "project", "model_reported_only", "status",
        "candidate_hashes", "authorized_publication", "public_git_pushes",
        "public_commit", "public_branch", "github_run_url", "github_run_id",
        "independent_qa_status", "reason", "model_calls", "paid_api_calls",
        "original_changed", "art_certified", "real_source_qa_verified",
    )}
    target = root / OUTPUT_NAME
    if target.is_symlink():
        raise Hold("SHAREABLE_STATUS_SYMLINK_REJECTED")
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                      encoding="utf-8")


def run(base: Path, *, confirm=input, printer=print,
        publisher=publish, observer=observe) -> tuple[dict, Path]:
    root = locate_exact_existing_drafts(base)
    report = {
        "schema": "dec-existing-mab-private-to-public-source-qa-v1",
        "project": PROJECT, "model_reported_only": MODEL,
        "status": "HOLD", "candidate_hashes": list(EXPECTED_DRAFT_HASHES),
        "authorized_publication": False, "public_git_pushes": 0,
        "public_commit": None,
        "public_branch": "research/dec-free-autonomy-solo-pilot-20261104",
        "github_run_id": None, "github_run_url": None,
        "independent_qa_status": "NOT_RUN",
        "reason": None, "model_calls": 0, "paid_api_calls": 0,
        "original_changed": False,
        "art_certified": False, "real_source_qa_verified": False,
    }
    try:
        with exclusive_local_project_lock():
            manifest = load_manifest()
            static = preflight_private_drafts(
                root, PROJECT, MODEL, manifest=manifest, use_lock=False)
            if static["status"] != "STATIC_PRIVATE_DRAFTS_ADMISSIBLE_FOR_ISOLATED_QA_ONLY":
                raise Hold("STATIC_PREFLIGHT_" + static.get("reason", "HOLD"))
            syntax = syntax_check_existing_mab_private_drafts(
                root, PROJECT, MODEL, manifest=manifest, use_lock=False)
            if syntax["status"] != "PRIVATE_MAB_MODULE_SYNTAX_ONLY_PASS":
                raise Hold("MJS_SYNTAX_" + syntax.get("reason", "HOLD"))
            payload = verified_private_payload(root, PROJECT, MODEL, manifest=manifest)
            if payload.get("synthetic_fixture") is not False:
                raise Hold("SYNTHETIC_SOURCE_CANNOT_CLAIM_GENUINE_QWEN")
            if payload["stage1_sha256"] != EXPECTED_DRAFT_HASHES[0]:
                raise Hold("STAGE1_EXPECTED_HASH_MISMATCH")
            if payload["stage2_sha256"] != EXPECTED_DRAFT_HASHES[1]:
                raise Hold("STAGE2_EXPECTED_HASH_MISMATCH")
            source = (root / "repo" / manifest["project_candidates"][PROJECT]["source_file"]).read_text(encoding="utf-8")
            review_diffs(payload, printer=printer)
            show_actual_patch(source, payload["stage1_source"],
                              payload["stage2_source"], printer=printer)
            printer("WARNING: Entire original/public source plus both Qwen drafts become PUBLIC Git history.")
            printer("Nothing has been uploaded. Enter uppercase PUBLIC to authorize this one upload.")
            if confirm("Type PUBLIC to publish (anything else cancels): ").strip() != PUBLIC_APPROVAL:
                report["status"] = "PUBLICATION_DECLINED_NO_UPLOAD"
                return report, root
            report["authorized_publication"] = True
            submitted = publisher(payload, authorize=True)
            if (submitted.get("status") != "PUBLIC_RESEARCH_QA_SUBMITTED"
                    or submitted.get("git_branch") != report["public_branch"]
                    or submitted.get("git_remote") != "ryomashibaba/MinecraftAIBuilder"):
                raise Hold("PUBLIC_SUBMISSION_RESULT_IDENTITY_MISMATCH")
            report["public_git_pushes"] = 1
            report["public_commit"] = submitted["commit"]
            report["status"] = "PUBLIC_RESEARCH_QA_SUBMITTED_NOT_YET_VERIFIED"
            write_status(root, report)  # durable BEFORE optional long polling
            printer("PUBLIC_RESEARCH_SUBMISSION_COMMIT=" + report["public_commit"])
        observed = observer(report["public_commit"], wait_seconds=900)
        report["github_run_id"] = observed.get("github_run_id")
        report["github_run_url"] = observed.get("github_run_url")
        report["independent_qa_status"] = observed.get("status", "HOLD")
        report["status"] = observed.get("status", "HOLD")
        report["real_source_qa_verified"] = (
            report["status"] == "EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY")
    except (Hold, OSError, ValueError, KeyError, TypeError) as exc:
        report["status"] = "HOLD" if not report["public_git_pushes"] else "PUBLIC_SUBMITTED_QA_HOLD"
        report["reason"] = str(exc)[:150]
    finally:
        write_status(root, report)
    return report, root


def main() -> int:
    base = Path(os.environ.get("LOCALAPPDATA") or "") / (
        "FreeAutonomyPrivate/Local14BRealProjectDrafts/PrivateClones")
    report, root = run(base)
    output = root / OUTPUT_NAME
    print("SHAREABLE_PUBLIC_QA_STATUS_PATH=" + str(output))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if os.name == "nt":
        try:
            subprocess.Popen(["explorer.exe", "/select," + str(output)])
        except OSError:
            print("RESULT_EXPLORER_UNAVAILABLE_USE_PATH_ABOVE")
    return 0 if report["status"] == "EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY" else 2


if __name__ == "__main__":
    sys.exit(main())
