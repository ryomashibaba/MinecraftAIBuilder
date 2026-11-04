#!/usr/bin/env python3
"""Verify the exact GitHub Actions result after an EXPLICIT public source handoff.

Read-only, unauthenticated GitHub REST polling. No token, model, Git push,
new workflow, production edit, or artifact-content access is performed.
Success means only that the exact pinned workflow run succeeded, NOT that
the self-reported model was attested or a real product improved.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

REPO = "ryomashibaba/MinecraftAIBuilder"
BRANCH = "research/dec-free-autonomy-solo-pilot-20261104"
WORKFLOW = "dec-free-autonomy-public-source-handoff.yml"
HEX40 = re.compile(r"[0-9a-f]{40}\Z")
API_BASE = f"https://api.github.com/repos/{REPO}/actions/workflows/{WORKFLOW}/runs"


class Hold(RuntimeError):
    pass


def run_url(commit: str) -> str:
    if not isinstance(commit, str) or not HEX40.fullmatch(commit):
        raise Hold("INVALID_EXACT_HANDOFF_COMMIT")
    return API_BASE + "?" + urlencode({
        "branch": BRANCH, "event": "push", "head_sha": commit, "per_page": 20
    })


def choose_exact_run(payload: dict, commit: str) -> dict | None:
    """Never infer a PASS from another SHA, workflow, event or branch."""
    if not isinstance(payload, dict) or not isinstance(payload.get("workflow_runs"), list):
        raise Hold("GITHUB_WORKFLOW_RESPONSE_SCHEMA_HOLD")
    matches = []
    for item in payload["workflow_runs"]:
        if not isinstance(item, dict):
            continue
        if (item.get("head_sha") == commit and item.get("head_branch") == BRANCH
                and item.get("event") == "push"
                and isinstance(item.get("id"), int) and item["id"] > 0
                and item.get("path", "").split("@")[0] == ".github/workflows/" + WORKFLOW):
            matches.append(item)
    return max(matches, key=lambda run: run["id"]) if matches else None


def verdict(run: dict | None) -> str:
    if run is None:
        return "WAITING_FOR_EXACT_HANDOFF_WORKFLOW"
    if run.get("status") != "completed":
        return "WAITING_FOR_EXACT_HANDOFF_WORKFLOW"
    if run.get("conclusion") == "success":
        return "EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY"
    return "HOLD_EXACT_GITHUB_SOURCE_QA_WORKFLOW_" + str(run.get("conclusion", "UNKNOWN")).upper()


def fetch_public_json(url: str) -> dict:
    req = Request(url, headers={
        "User-Agent": "dec-free-autonomy-public-source-qa-readonly/1.0",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    with urlopen(req, timeout=15) as response:
        raw = response.read(1500001)
    if len(raw) > 1500000:
        raise Hold("GITHUB_WORKFLOW_RESPONSE_TOO_LARGE")
    try:
        obj = json.loads(raw)
    except (UnicodeDecodeError, ValueError) as exc:
        raise Hold("GITHUB_WORKFLOW_RESPONSE_INVALID_JSON") from exc
    if not isinstance(obj, dict):
        raise Hold("GITHUB_WORKFLOW_RESPONSE_NOT_OBJECT")
    return obj


def observe(commit: str, *, wait_seconds: int = 1800,
            poll_seconds: int = 40, fetcher=fetch_public_json,
            clock=time.monotonic, sleeper=time.sleep) -> dict:
    url = run_url(commit)
    if not isinstance(wait_seconds, int) or not 0 <= wait_seconds <= 2100:
        raise Hold("WAIT_BUDGET_OUTSIDE_ALLOWED_LIMIT")
    if not isinstance(poll_seconds, int) or not 30 <= poll_seconds <= 300:
        raise Hold("POLL_INTERVAL_OUTSIDE_ALLOWED_LIMIT")
    deadline = clock() + wait_seconds
    report = {
        "schema": "dec-exact-public-source-qa-workflow-status-v1",
        "handoff_commit": commit, "workflow": WORKFLOW,
        "research_branch": BRANCH, "status": "HOLD",
        "github_run_id": None, "github_run_url": None,
        "model_identity_attested": False, "source_artifact_contents_inspected": False,
        "real_project_feature_improvement_certified": False,
        "minecraft_art_or_real_game_certified": False,
        "long_unattended_autonomy_certified": False,
        "paid_api_calls": 0, "git_pushes_by_verifier": 0,
    }
    while True:
        try:
            selected = choose_exact_run(fetcher(url), commit)
        except (OSError, TimeoutError, ValueError, TypeError, Hold) as exc:
            report["status"] = "HOLD_GITHUB_WORKFLOW_READ_UNAVAILABLE"
            report["hold_category"] = type(exc).__name__
            break
        status = verdict(selected)
        if selected is not None:
            report["github_run_id"] = selected["id"]
            report["github_run_url"] = (
                f"https://github.com/{REPO}/actions/runs/{selected['id']}"
            )
        if status != "WAITING_FOR_EXACT_HANDOFF_WORKFLOW":
            report["status"] = status
            break
        remaining = deadline - clock()
        if remaining <= 0:
            report["status"] = "HOLD_EXACT_GITHUB_SOURCE_QA_NOT_COMPLETED_WITHIN_BUDGET"
            break
        sleeper(min(poll_seconds, remaining))
    return report


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--commit", required=True)
    ap.add_argument("--receipt-dir", type=Path, required=True)
    ap.add_argument("--wait-seconds", type=int, default=1800)
    args = ap.parse_args()
    try:
        report = observe(args.commit, wait_seconds=args.wait_seconds)
    except (Hold, OSError, ValueError) as exc:
        report = {"status": "HOLD", "hold_reason": str(exc)[:160],
                  "git_pushes_by_verifier": 0, "paid_api_calls": 0}
    try:
        dest = args.receipt_dir.expanduser().resolve(strict=True)
        if not dest.is_dir() or dest.is_symlink():
            raise Hold("PRIVATE_RECEIPT_DIRECTORY_INVALID")
        output = dest / "SHAREABLE_GITHUB_QA_STATUS.json"
        if output.is_symlink():
            raise Hold("PRIVATE_STATUS_SYMLINK_REJECTED")
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                          encoding="utf-8")
        report["private_qa_status_path"] = str(output)
    except (Hold, OSError, ValueError) as exc:
        report["status"] = "HOLD_LOCAL_STATUS_SAVE_FAILED"
        report["hold_reason"] = str(exc)[:160]
    print(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2))
    return 0 if report["status"] == "EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY" else 2


if __name__ == "__main__":
    sys.exit(main())
