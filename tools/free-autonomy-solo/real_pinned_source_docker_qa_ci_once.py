#!/usr/bin/env python3
"""ONE genuine Docker SOURCE-QA admission test per real project (NO LLM).

CI-only: create two intentionally trivial appended-comment drafts using public
pinned project sources, then run the *actual* promotion engine in Docker with
network-off QA; confirm two genuine isolated local Git commits. A comment-only
synthetic fixture is NOT evidence of a model fixing any useful bug, ART, or TPS.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile

from prepare_pinned_real_project import load_manifest, prepare, verify_private_clone
from promote_private_real_drafts_docker import promote, docker_run

MODEL = "ci-synthetic-comments-no-llm"


def sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def fixture(receipt_root: Path, project: str, manifest: dict):
    lane = manifest["project_candidates"][project]
    root = receipt_root
    source = (root / "repo" / lane["source_file"]).read_text(encoding="utf-8")
    if source.endswith("\n"):
        comment1 = "// CI private synthetic draft stage 1; no production change\n"
    else:
        comment1 = "\n// CI private synthetic draft stage 1; no production change\n"
    first = source + comment1
    second = first + "// CI private synthetic draft stage 2; no production change\n"
    (root / "draft_1.private.txt").write_text(first, encoding="utf-8")
    (root / "draft_2.private.txt").write_text(second, encoding="utf-8")
    receipt = {
        "schema": "real-project-qwen-local-private-draft-v1",
        "status": "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY",
        "project": project, "model_requested": MODEL,
        "pinned_source_commit": lane["pinned_commit"],
        "pinned_source_blob": lane["source_blob_sha"],
        "model_drafts": 2, "model_calls_attempted": 0,
        "git_commits": 0, "git_pushes": 0,
        "native_QA_executed": False,
        "stages": [
            {"stage": 1, "result": "PRIVATE_UNVERIFIED_DIFF",
             "source_previous_sha256": sha(source), "candidate_sha256": sha(first)},
            {"stage": 2, "result": "PRIVATE_UNVERIFIED_DIFF",
             "source_previous_sha256": sha(first), "candidate_sha256": sha(second)},
        ],
    }
    (root / "SHAREABLE_DRAFT_RESULT.json").write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", choices=["minecraftaibuilder", "browser-ink-tps"],
                    required=True)
    args = ap.parse_args()
    manifest = load_manifest()
    with tempfile.TemporaryDirectory(prefix="dec-real-source-qa-ci-") as base:
        base = Path(base)
        pre = prepare(args.project, manifest, base / "private-clones")
        if pre["status"] != "REAL_SOURCE_CLONE_PINNED_READONLY_READY":
            raise SystemExit("HOLD_INITIAL_PINNED_REAL_CLONE_" + pre.get("reason","UNKNOWN"))
        root = Path(pre["private_workspace_path"]).parent
        lane = manifest["project_candidates"][args.project]
        verify_private_clone(root / "repo", lane)
        # Execute a real adversarial write attempt in the exact readonly
        # SOURCE+network-none QA container. Must fail and leave no canary.
        canary = root / "repo" / ".docker-readonly-source-canary"
        rc, negative_output = docker_run(
            root / "repo",
            ["node", "-e",
             "require('fs').writeFileSync('/work/.docker-readonly-source-canary', 'BAD')"],
            root, "negative-readonly-qa", timeout=35)
        if rc == 0 or canary.exists():
            raise SystemExit("DOCKER_QA_READONLY_ISOLATION_BREAK")
        if not any(marker in negative_output for marker in (
                "EROFS", "EACCES", "read-only file system", "permission denied")):
            raise SystemExit("DOCKER_NEGATIVE_TEST_FAILED_FOR_UNKNOWN_REASON")
        fixture(root, args.project, manifest)
        result = promote(root, args.project, MODEL,
                         allow_public_npm_deps=args.project=="browser-ink-tps")
        # Private raw diffs never appear in public CI artifacts or summary.
        summary = {
            "schema": "dec-genuine-docker-qa-source-integration-v1",
            "project": args.project, "status": result["status"],
            "pinned_source_commit": lane["pinned_commit"],
            "real_pinned_public_project_source": True,
            "model_calls": 0, "model_is_fake": True,
            "synthetic_change": "comments_only",
            "sandbox_network_for_qa": result["sandbox_network_for_qa"],
            "real_docker_readonly_source_negative_test": True,
            "true_docker_qa_executed": result.get("completed_stages", 0) > 0,
            "actual_local_qa_commits": len(result["local_qa_commits"]),
            "completed_stages": result["completed_stages"],
            "checks_per_committed_stage": [
                x["qa_checks_passed"] for x in result["local_qa_commits"]],
            "github_pushes": result["github_pushes"],
            "paid_llm_api_calls": 0,
            "real_user_windows_qwen14b": False,
            "project_feature_improvement_proven": False,
            "minecraft_world_and_game_art_certified": False,
            "real_chromium_180s_4v4_certified": False,
            "long_autonomy_certified": False,
        }
        if result["status"] != "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS":
            summary["hold_reason"] = result.get("hold_reason", "UNSPECIFIED_HOLD")
            # Public pinned package dependency setup is BEFORE any candidate
            # source was put in sandbox; redact paths and show only npm error
            # categories for troubleshooting this synthetic CI job.
            public_npm = root / "trusted-deps.private.log"
            if public_npm.is_file():
                import re
                lines = public_npm.read_text(errors="replace").splitlines()
                diagnostics = []
                for line in lines:
                    if re.search(r"npm (error|ERR!)|EACCES|ENET|ENOENT|EUSAGE|Error response from daemon", line, re.I):
                        line = re.sub(r"/[^\s]+", "<PATH>", line)[:220]
                        diagnostics.append(line)
                summary["public_npm_error_lines"] = diagnostics[-12:]
        if result["status"] == "HOLD":
            # CI uses only public immutable source and synthetic comment edits,
            # so small diagnostics can be shared without user model payloads.
            import re
            for filename in ("qa-stage1-check0.private.log",
                             "qa-stage1-check1.private.log",
                             "qa-stage1-check2.private.log"):
                trace = root / filename
                if not trace.is_file():
                    continue
                diagnostic = []
                for line in trace.read_text(errors="replace").splitlines():
                    if re.search(r"Error|ERROR|EACCES|FAIL|failed|Readonly|Permission|\btest\b|\bpass\b|\bexit\b|ERR_", line):
                        line = re.sub(r"/[^\s]+", "<PATH>", line)[:190]
                        diagnostic.append(line)
                summary["public_fixture_" + filename.replace(".private.log", "_diagnostic")] = diagnostic[-10:]
        print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
        where = Path(os.environ.get("RUNNER_TEMP", str(base)))
        (where / ("dec-real-source-qa-" + args.project + ".json")).write_text(
            json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
        if summary["actual_local_qa_commits"] != 2 or summary["completed_stages"] != 2:
            raise SystemExit(2)


if __name__ == "__main__":
    main()
