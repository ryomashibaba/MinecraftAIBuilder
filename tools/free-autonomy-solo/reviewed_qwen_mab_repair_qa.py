#!/usr/bin/env python3
"""One-time, GitHub-only real QA of explicitly assistant-repaired PUBLIC Qwen drafts.

The original 2026-11-04 genuine-Qwen source snapshots remain unchanged in
PUBLIC Git history. They FAILED real independent Docker QA at stage 1.
This fixes two specific evidenced defects in a separate, clearly labeled
assistant-reviewed CANDIDATE. It is NOT another Qwen inference, not a model
quality certification, and not an edit of main/user originals.

Everything is restricted to a disposable GitHub runner. No public Git push of
the repaired candidate; source is submitted to the existing Docker QA receiver
in a temporary local JSON, and only a sanitized result can be uploaded.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile

from prepare_pinned_real_project import load_manifest, prepare, verify_private_clone
from public_qa_handoff_protocol import make_payload
from receive_public_research_qa import handle

PROJECT = "minecraftaibuilder"
SUBMISSION = (
    "tools/free-autonomy-solo/submissions/"
    "5efd3971fb604a60af955cfc16a08891.json"
)
SUBMISSION_SHA256 = "884abf02df2e4c8cf85b1aaf1406dcbd13af1cef95484aa856030cb65308571f"
PINNED_SOURCE = "fe1682e15ffa063f4dc415b06c4d76a54737a06e"
ORIGINAL_STAGE_HASHES = (
    "03b73c926cb507b9fc0bed50c3a9b38cf5cada631b15a428b9e3f240fe8098cc",
    "5b8468783df8126d6e053bf7d37b4c9b74fd543bdd345d5898ac88fe022df6d6",
)
REPAIR_PROVENANCE = "ASSISTANT_REVIEWED_REPAIR_FROM_FAILED_QWEN_NOT_QWEN_INFERENCE"
RESULT_NAME = "dec-reviewed-qwen-mab-repair-qa-result.json"

BASE_EXACT = (
    "const exact=(v,fields)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&\n"
    " Object.keys(v).sort().join('|')===fields.slice().sort().join('|');"
)
QWEN_BROKEN_EXACT = (
    "const exact=(v,fields)=>!!v&&typeof v==='object'&&!Array.isArray(v)&& "
    "Object.keys(v).sort().join('|')===fields.sort().join('|');\n"
    " Object.keys(v).sort().join('|')===fields.slice().sort().join('|');"
)
REVIEWED_EXACT = (
    "const exact=(v,fields)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&\n"
    " Object.keys(v).length===fields.length&&\n"
    " fields.every(field=>Object.prototype.hasOwnProperty.call(v,field));"
)
BASE_WITNESS = " const w=upper.sourceWitness;"
QWEN_BROKEN_WITNESS = (
    " const w=upper.sourceWitness; "
    "if(!w.physical2WideStairTreads||w.physical2WideStairTreads<1||"
    "w.physical2WideStairTreads>5) fail('INVALID_STAIR_TREAD_COUNT');"
)
REVIEWED_WITNESS = (
    " const w=upper.sourceWitness;\n"
    " if(!w||typeof w!=='object'||Array.isArray(w))\n"
    "  fail('MISSING_REAL_UPPER_LEVEL_SOURCE_WITNESS');"
)

class Hold(RuntimeError):
    pass


def sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def one_replace(text: str, old: str, new: str) -> str:
    if text.count(old) != 1 or old == new:
        raise Hold("UNEXPECTED_SOURCE_OR_EDIT_SCOPE")
    return text.replace(old, new, 1)


def repair_exact_known_failures(baseline: str, public: dict) -> tuple[str, str]:
    """Fail closed unless TWO exact Qwen edits match the immutable public input."""
    if not isinstance(baseline, str) or not isinstance(public, dict):
        raise Hold("INPUT_TYPE_INVALID")
    if public.get("project") != PROJECT or public.get("synthetic_fixture") is not False:
        raise Hold("PROJECT_OR_PROVENANCE_MISMATCH")
    if public.get("model_reported_only") != "qwen3:14b":
        raise Hold("ORIGINAL_MODEL_REPORT_MISMATCH")
    if public.get("source_commit") != PINNED_SOURCE:
        raise Hold("PINNED_SOURCE_COMMIT_MISMATCH")
    if sha(baseline) != public.get("source_before_sha256"):
        raise Hold("BASELINE_TEXT_MISMATCH")
    for n, expected in enumerate(ORIGINAL_STAGE_HASHES, 1):
        if sha(public.get(f"stage{n}_source", "")) != expected:
            raise Hold("ORIGINAL_QWEN_STAGE_" + str(n) + "_SHA_MISMATCH")
        if public.get(f"stage{n}_sha256") != expected:
            raise Hold("PUBLIC_PROVENANCE_HASH_MISMATCH")
    if baseline.count(BASE_EXACT) != 1 or baseline.count(BASE_WITNESS) != 1:
        raise Hold("BASELINE_EXPECTED_EDIT_LOCATION_NOT_UNIQUE")
    # Verify Qwen's *entire* submitted sources, not only a convenient substring.
    if one_replace(baseline, BASE_EXACT, QWEN_BROKEN_EXACT) != public["stage1_source"]:
        raise Hold("STAGE1_QWEN_DIFF_NOT_THE_REVIEWED_FAILURE")
    if one_replace(public["stage1_source"], BASE_WITNESS,
                   QWEN_BROKEN_WITNESS) != public["stage2_source"]:
        raise Hold("STAGE2_QWEN_DIFF_NOT_THE_REVIEWED_FAILURE")
    # Correct the same narrowly-scoped validation locations; do not suppress tests.
    # Equality guard uses own-key presence without mutating the expected field list.
    first = one_replace(baseline, BASE_EXACT, REVIEWED_EXACT)
    # This condition only checks witness existence/type, NOT an impossible stair
    # count bound; the original exact rise+1 and blocked-world guards remain.
    second = one_replace(first, BASE_WITNESS, REVIEWED_WITNESS)
    if first == baseline or second == first:
        raise Hold("REPAIRED_STAGE_NOOP")
    return first, second


def run(repo_root: Path) -> dict:
    report = {
        "schema": "dec-public-qwen-two-defects-reviewed-repair-qa-v1",
        "status": "HOLD",
        "original_public_submission_commit": "741932d8f0e41efdc5c1fd99bd99ea690cb64720",
        "original_submission_path": SUBMISSION,
        "original_qwen_stage1_sha256": ORIGINAL_STAGE_HASHES[0],
        "original_qwen_stage2_sha256": ORIGINAL_STAGE_HASHES[1],
        "original_qwen_source_qa": "FAILED_STAGE1",
        "repair_provenance": REPAIR_PROVENANCE,
        "model_calls": 0,
        "paid_api_calls": 0,
        "github_pushes": 0,
        "main_or_original_changed": False,
        "user_windows_executed": False,
        "local_user_setup_required": False,
        "art_or_minecraft_education_certified": False,
        "repair_published_to_research_branch": False,
        "private_qa_commits": 0,
        "qa_checks_per_accepted_stage": [],
    }
    try:
        target = repo_root / SUBMISSION
        if target.is_symlink() or not target.is_file():
            raise Hold("PINNED_PUBLIC_SUBMISSION_NOT_FOUND")
        source_bytes = target.read_bytes()
        if hashlib.sha256(source_bytes).hexdigest() != SUBMISSION_SHA256:
            raise Hold("PINNED_PUBLIC_SUBMISSION_CONTENT_MISMATCH")
        public = json.loads(source_bytes.decode("utf-8"))
        manifest = load_manifest()
        lane = manifest["project_candidates"][PROJECT]
        if lane["pinned_commit"] != PINNED_SOURCE:
            raise Hold("PROJECT_PIN_CHANGED")
        with tempfile.TemporaryDirectory(prefix="dec-reviewed-mab-public-") as d:
            root = Path(d)
            admitted = prepare(PROJECT, manifest, root / "preflight-only")
            if admitted.get("status") != "REAL_SOURCE_CLONE_PINNED_READONLY_READY":
                raise Hold("PINNED_BASELINE_READ_ONLY_CLONE_HOLD")
            original_repo = Path(admitted["private_workspace_path"])
            verify_private_clone(original_repo, lane)
            original = (original_repo / lane["source_file"]).read_text(encoding="utf-8")
            first, second = repair_exact_known_failures(original, public)
            report["reviewed_stage1_sha256"] = sha(first)
            report["reviewed_stage2_sha256"] = sha(second)
            candidate = make_payload(
                PROJECT, "assistant-reviewed-repair", original, first, second,
                synthetic=False, manifest=manifest)
            # This temporary JSON stays inside the runner; NO GitHub publication.
            candidate_path = root / "assistant-reviewed-candidate.private.json"
            candidate_path.write_text(json.dumps(candidate), encoding="utf-8")
            qa = handle(candidate_path, manifest=manifest, parent=root / "qa")
            report["status"] = qa["status"]
            report["independent_docker_qa_run"] = True
            report["private_qa_commits"] = qa.get("private_local_git_commits", 0)
            report["qa_checks_per_accepted_stage"] = qa.get(
                "qa_checks_per_accepted_stage", [])
            report["docker_network"] = qa.get("docker_qa_network", "unknown")
            if qa["status"] == "HOLD":
                report["reason"] = qa.get("hold_reason", "QA_HOLD")[:130]
    except (Hold, OSError, ValueError, KeyError, TypeError) as exc:
        report["status"] = "HOLD"
        report["reason"] = str(exc)[:130]
    # Exclude raw model source, diffs, absolute paths, executable code or secrets.
    return report


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    report = run(root)
    print(json.dumps(report, indent=2, sort_keys=True))
    out = Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir())) / RESULT_NAME
    out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n",
                   encoding="utf-8")
    return 0 if report["status"] == "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS" else 2


if __name__ == "__main__":
    sys.exit(main())
