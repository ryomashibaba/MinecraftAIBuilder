#!/usr/bin/env python3
"""Review the ALREADY SAVED current-V6 PRIVATE Qwen candidate, with 0 model calls.

Never upload candidate text. Inspect hashes/lineage first. With --qa-existing,
run genuine tests only in the existing network-none Docker QA image and commit
only to the isolated local research clone after independent QA. No model retries,
main modifications, GitHub push, Minecraft writes, or source execution on Windows.
"""
from __future__ import annotations

import argparse
from contextlib import nullcontext
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

from dec_current_v6_private import (
    SOURCE_COMMIT, SOURCE_BLOB, SOURCE_FILE, SOURCE_BRANCH, PRIVATE_BRANCH,
    QA, config, profile, current_source_commit,
)
from prepare_pinned_real_project import load_manifest, verify_private_clone, source_blob_sha
from local_ollama_patch_loop import qa_image_preflight, validate_config
from docker_sandbox import DockerPolicy
from solo_agent import (
    single_agent_lock, verify_repo, changed_files, run_in_docker, git,
)

FOLDER = re.compile(r"v6-[0-9a-f]{16}\Z")
CHILD = re.compile(r"minecraftaibuilder-[0-9a-f]{32}\Z")
SHA256 = re.compile(r"[a-f0-9]{64}\Z")
SAFE = re.compile(r"[A-Z][A-Z0-9_]{2,100}\Z")
CANDIDATE = "V6_UNVERIFIED_SOURCE_PRIVATE.txt"
RECEIPT = "V6_CURRENT_SHAREABLE.json"
CRITICAL = (
    "newSource.worldWrites!==0",
    "newSource.worldContacts!==0",
    "newSource.constructionApproved!==false",
    "newSource.executionAllowed!==false",
    "newSource.gates.length!==9",
    "newSource.gates.some(g=>g!=='BLOCKED')",
    "newSource.BuildPlan.operations.length!==0",
    "!w.allFunctionsReachable",
    "!w.entranceToNewPublicZone?.reachedFromEntrance",
    "!w.preservedRealUpperPublicZone?.reachedFromEntrance",
    "newSource.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'",
    "compileMezzanineAuthorIntent",
    "compileAuthoredCivicApproachArcade",
)
PASS = "PRIVATE_EXISTING_CANDIDATE_REAL_DOCKER_QA_COMMITTED_ART_HOLD"
INSPECTED = "PRIVATE_EXISTING_CANDIDATE_INTEGRITY_ONLY_NO_SOURCE_QA"
DOCKER_HOLD = "HOLD_DOCKER_NOT_READY_EXISTING_CANDIDATE_PRESERVED"


class ReviewHold(Exception):
    pass


def fail(code: str) -> None:
    raise ReviewHold(code)


def reason(exc: BaseException) -> str:
    s = str(exc)
    return s if SAFE.fullmatch(s) else type(exc).__name__.upper()


def regular(parent: Path, filename: str, limit: int) -> Path:
    candidate = parent / filename
    if candidate.is_symlink() or not candidate.is_file() or not (0 < candidate.stat().st_size <= limit):
        fail("PRIVATE_FILE_INVALID_OR_UNSAFE")
    if candidate.resolve(strict=True).parent != parent.resolve(strict=True):
        fail("PRIVATE_FILE_OUTSIDE_OWNED_FOLDER")
    return candidate


def choose_saved(base: Path) -> Path:
    """Use only newest session, never fall back to older draft on a bad receipt."""
    if base.is_symlink() or not base.is_dir():
        fail("PRIVATE_SAVED_V6_ROOT_NOT_FOUND")
    canonical = base.resolve(strict=True)
    eligible = []
    for child in base.iterdir():
        if not FOLDER.fullmatch(child.name):
            continue
        if child.is_symlink() or not child.is_dir() or child.resolve(strict=True).parent != canonical:
            fail("PRIVATE_SESSION_DIRECTORY_INVALID")
        receipt = child / RECEIPT
        if receipt.is_symlink():
            fail("PRIVATE_SHAREABLE_RECEIPT_SYMLINK")
        if receipt.is_file():
            eligible.append((receipt.stat().st_mtime_ns, child.name, child))
    if not eligible:
        fail("PRIVATE_SAVED_V6_DRAFT_NOT_FOUND")
    return max(eligible)[2]


def admitted(root: Path) -> tuple[dict, Path, str]:
    report_file = regular(root, RECEIPT, 12_000)
    data = json.loads(report_file.read_text(encoding="utf-8"))
    expected = {
        "schema": "dec-v6-current-private-source-pilot-v1",
        "status": "PRIVATE_ONE_MODEL_PATCH_DRAFT_NO_QA_ART_HOLD",
        "audited_commit": SOURCE_COMMIT,
        "audited_blob": SOURCE_BLOB,
        "project": "minecraftaibuilder",
        "old_v4h_path_changed": False,
        "original_project_changed": False,
        "public_model_source_pushes": 0,
        "paid_api_calls": 0,
        "world_writes": 0,
        "art_certified": False,
        "real_windows_qa_certified": False,
        "qa_network": "none",
        "local_model_requests_by_this_wrapper": 1,
        "private_verified_commits": 0,
        "private_drafts_not_qa_verified": 1,
    }
    if not isinstance(data, dict) or any(data.get(k) != value for k, value in expected.items()):
        fail("PRIVATE_SAVED_V6_RECEIPT_POLICY_OR_BASELINE_MISMATCH")
    expected_sha = data.get("candidate_sha256")
    if not isinstance(expected_sha, str) or not SHA256.fullmatch(expected_sha):
        fail("PRIVATE_SAVED_V6_RECEIPT_DIGEST_INVALID")
    candidate_file = regular(root, CANDIDATE, 16_000)
    raw = candidate_file.read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected_sha or b"\x00" in raw:
        fail("PRIVATE_SAVED_V6_CANDIDATE_SHA_MISMATCH")
    candidate = raw.decode("utf-8")
    parent = root / "private-clones"
    if parent.is_symlink() or not parent.is_dir() or parent.resolve(strict=True).parent != root.resolve(strict=True):
        fail("PRIVATE_CLONE_PARENT_INVALID")
    clones = [x for x in parent.iterdir() if CHILD.fullmatch(x.name)]
    if len(clones) != 1 or clones[0].is_symlink() or not clones[0].is_dir():
        fail("PRIVATE_CLONE_NOT_UNIQUE")
    workspace = clones[0] / "repo"
    if workspace.is_symlink() or not workspace.is_dir() or workspace.resolve(strict=True).parent != clones[0].resolve(strict=True):
        fail("PRIVATE_CLONE_WORKSPACE_ESCAPE")
    manifest = profile(load_manifest())
    lane = manifest["project_candidates"]["minecraftaibuilder"]
    verify_private_clone(workspace, lane)
    cfg = config(workspace, root / "qa-existing-private-logs")
    validate_config(cfg)
    verify_repo(cfg)
    if changed_files(workspace):
        fail("PRIVATE_CLONE_ALREADY_CHANGED")
    original = (workspace / SOURCE_FILE).read_text(encoding="utf-8")
    if source_blob_sha(original.encode("utf-8")) != SOURCE_BLOB:
        fail("PRIVATE_CLONE_SOURCE_DIGEST_MISMATCH")
    if original == candidate:
        fail("PRIVATE_MODEL_CANDIDATE_IDENTICAL_TO_ORIGINAL")
    if any(candidate.count(anchor) < original.count(anchor) for anchor in CRITICAL):
        fail("PRIVATE_MODEL_CANDIDATE_REMOVED_SOURCE_SAFETY_PROOF")
    if candidate.count("import ") < original.count("import "):
        fail("PRIVATE_MODEL_CANDIDATE_REMOVED_IMPORT")
    if len(raw) > 16_000:
        fail("PRIVATE_MODEL_CANDIDATE_OVER_BUDGET")
    return cfg, workspace, expected_sha


def run_existing(base: Path, *, qa: bool, platform_name: str = os.name,
                 lock=single_agent_lock, gate=qa_image_preflight,
                 docker=run_in_docker) -> tuple[dict, Path | None]:
    status = {
        "schema": "dec-v6-existing-candidate-private-qa-v1",
        "status": "RUNNING_NOT_CERTIFIED",
        "project": "minecraftaibuilder",
        "candidate_verified_sha256": None,
        "baseline_commit": SOURCE_COMMIT,
        "original_project_changed": False,
        "public_model_source_pushes": 0,
        "model_calls": 0,
        "paid_api_calls": 0,
        "world_writes": 0,
        "independent_docker_qa_checks_passed": 0,
        "local_private_commits": 0,
        "source_qa_passed": False,
        "art_certified": False,
        "minecraft_walking_certified": False,
    }
    if platform_name != "nt":
        status["status"] = "HOLD_WINDOWS_ONLY_NO_MODEL"
        return status, None
    receipt = None
    try:
        with lock():
            root = choose_saved(base)
            receipt = root / (
                "V6_EXISTING_SOURCE_QA_SHAREABLE.json" if qa
                else "V6_EXISTING_SOURCE_INSPECTION_SHAREABLE.json"
            )
            if receipt.exists() or receipt.is_symlink():
                fail("PRIVATE_REVIEW_RECEIPT_ALREADY_EXISTS_NO_REPEAT")
            cfg, workspace, digest = admitted(root)
            status["candidate_verified_sha256"] = digest
            if not qa:
                status["status"] = INSPECTED
                return status, receipt
            try:
                gate(DockerPolicy.from_config(cfg))
            except Exception:
                # Missing Docker must not consume the one-shot QA receipt.
                # A later attempt may QA the SAME saved candidate without re-inference.
                status["status"] = DOCKER_HOLD
                receipt = root / "V6_EXISTING_SOURCE_INSPECTION_SHAREABLE.json"
                if receipt.exists() or receipt.is_symlink():
                    receipt = None
                return status, receipt
            if not current_source_commit():
                fail("PUBLIC_V6_SOURCE_HEAD_MOVED_NO_QA")
            state = Path(cfg["state_dir"])
            state.mkdir(mode=0o700, parents=False, exist_ok=False)
            # Baseline first; reject a broken environment BEFORE applying candidate.
            for i, command in enumerate(QA):
                rc, _ = docker(cfg, command, workspace, 300,
                               state / f"baseline_{i}.private.log", agent=False)
                if rc:
                    fail("PRIVATE_SOURCE_BASELINE_DOCKER_QA_FAILED")
                if changed_files(workspace) or git(workspace, "rev-parse", "HEAD") != SOURCE_COMMIT:
                    fail("PRIVATE_BASELINE_QA_CHANGED_CLONE")
            if not current_source_commit():
                fail("PUBLIC_V6_SOURCE_MOVED_DURING_QA")
            source = workspace / SOURCE_FILE
            raw = regular(root, CANDIDATE, 16_000).read_bytes()
            if hashlib.sha256(raw).hexdigest() != digest:
                fail("PRIVATE_CANDIDATE_CHANGED_BEFORE_QA")
            source.write_bytes(raw)  # disposable PRIVATE clone ONLY
            if changed_files(workspace) != [SOURCE_FILE]:
                fail("PRIVATE_CANDIDATE_CHANGED_UNEXPECTED_PATHS")
            for i, command in enumerate(QA):
                rc, _ = docker(cfg, command, workspace, 300,
                               state / f"candidate_{i}.private.log", agent=False)
                verify_repo(cfg)
                if (changed_files(workspace) != [SOURCE_FILE] or
                        source.is_symlink() or hashlib.sha256(source.read_bytes()).hexdigest() != digest or
                        git(workspace, "rev-parse", "HEAD") != SOURCE_COMMIT):
                    fail("PRIVATE_DOCKER_QA_MODIFIED_CANDIDATE_OR_OTHER_FILES")
                if rc:
                    fail("PRIVATE_MODEL_SOURCE_FAILED_INDEPENDENT_DOCKER_QA")
                status["independent_docker_qa_checks_passed"] += 1
            if not current_source_commit():
                fail("PUBLIC_V6_SOURCE_MOVED_BEFORE_COMMIT")
            hooks = root / "disabled-git-hooks"  # nonexistent directory, no hooks
            git(workspace, "add", "--", SOURCE_FILE)
            git(workspace, "-c", "user.name=Dec Private QA",
                "-c", "user.email=dec-private@localhost.invalid",
                "-c", f"core.hooksPath={hooks}",
                "commit", "-m", "research(dec): privately QA verified existing V6 candidate")
            new_head = git(workspace, "rev-parse", "HEAD")
            if (git(workspace, "rev-parse", "HEAD^") != SOURCE_COMMIT
                    or git(workspace, "show", "--format=", "--name-only", "HEAD") != SOURCE_FILE
                    or git(workspace, "rev-parse", "HEAD:"+SOURCE_FILE) != source_blob_sha(raw)
                    or changed_files(workspace)):
                fail("PRIVATE_VERIFIED_LOCAL_COMMIT_CHAIN_INVALID")
            status["local_private_commits"] = 1
            status["source_qa_passed"] = True
            status["status"] = PASS
            return status, receipt
    except Exception as exc:
        status["status"] = "HOLD_PRIVATE_EXISTING_CANDIDATE_NO_PUBLICATION"
        status["reason_code"] = reason(exc)
        return status, receipt
    finally:
        if receipt is not None and not receipt.exists() and not receipt.is_symlink():
            # A shareable report is never a carrier for private source/logs/paths.
            # Repeated launches must not overwrite the original signed-off receipt.
            with receipt.open("x", encoding="utf-8") as out:
                json.dump(status, out, ensure_ascii=False, indent=2)
                out.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--qa-existing", action="store_true",
                        help="Use cached candidate; genuine independent Docker QA, no model")
    opts = parser.parse_args()
    base = Path(os.environ.get("LOCALAPPDATA") or "") / "FreeAutonomyPrivate" / "DecV6Current"
    result, filename = run_existing(base, qa=opts.qa_existing)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if filename is not None:
        print("PRIVATE_SHAREABLE_RESULT_PATH=" + str(filename))
    return 0 if result["status"] in (PASS, INSPECTED) else 2


if __name__ == "__main__":
    sys.exit(main())
