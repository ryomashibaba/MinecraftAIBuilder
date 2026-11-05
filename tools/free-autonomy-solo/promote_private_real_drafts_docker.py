#!/usr/bin/env python3
"""Promote TWO previously staged private SOURCE drafts only after true Docker QA.

This is a distinct execution gate, never called automatically by the draft
generator. It uses one selected project, an exact pinned dedicated clone, a
new disposable QA clone, a preexisting offline QA image, and NO model/paid API.
The candidate runs ONLY inside a network=none, read-only source Docker mount.
Two passing stages yield TWO local-only commits in the disposable clone.
This is SOURCE-only evidence, never ART, real Minecraft, or Chromium 4v4 proof.
"""
from __future__ import annotations

import argparse
from contextlib import nullcontext
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid

from docker_sandbox import DockerPolicy, SandboxHold
from private_verified_source_evidence import save_private_verified_stage, EvidenceHold
from prepare_pinned_real_project import load_manifest, verify_private_clone, Hold as CloneHold
from draft_real_project_local14b import exclusive_local_project_lock, ANCHORS

QA_IMAGE = "node:24-bookworm-slim"
QA_MEMORY = "4g"
QA_CPUS = "2"
QA_TIMEOUT = 240


class Hold(RuntimeError):
    pass


def sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def run_git(cwd: Path, *args: str, timeout: int = 150, env: dict | None = None) -> str:
    default_env = {**os.environ, "GIT_TERMINAL_PROMPT": "0",
                   "GCM_INTERACTIVE": "Never"}
    if env:
        default_env.update(env)
    try:
        r = subprocess.run(["git", "-C", str(cwd), *args], capture_output=True,
                           text=True, encoding="utf-8", errors="replace",
                           stdin=subprocess.DEVNULL, timeout=timeout, env=default_env)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Hold("GIT_UNAVAILABLE_OR_TIMED_OUT") from exc
    if r.returncode:
        raise Hold("GIT_" + args[0].upper() + "_FAILED")
    # Preserve porcelain's leading status column (" M path"). Plain strip()
    # silently deletes it and can invalidate a strict changed-path check.
    return r.stdout.rstrip("\r\n")


def require_docker_qa_image() -> None:
    # No background service installation or image pull from user PC.
    try:
        a = subprocess.run(["docker", "version", "--format", "{{.Server.Version}}"],
                           capture_output=True, text=True, timeout=18)
        b = subprocess.run(["docker", "image", "inspect", QA_IMAGE],
                           capture_output=True, text=True, timeout=18)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Hold("QA_DOCKER_DAEMON_NOT_AVAILABLE") from exc
    if a.returncode or not a.stdout.strip():
        raise Hold("QA_DOCKER_DAEMON_NOT_AVAILABLE")
    if b.returncode:
        raise Hold("QA_NODE_IMAGE_MISSING_NO_AUTOPULL")


def docker_run(workspace: Path, args: list[str], root: Path, label: str,
               *, network: str = "none", writable: bool = False,
               timeout: int = QA_TIMEOUT) -> tuple[int, str]:
    if network not in {"none", "bridge"} or (network == "bridge" and not writable):
        raise Hold("DOCKER_NETWORK_POLICY_REFUSED")
    if not args or args[0] not in {"node", "npm"}:
        raise Hold("DOCKER_COMMAND_REFUSED")
    cidfile = root / (label + ".containerid")
    if cidfile.exists():
        raise Hold("STALE_QA_CONTAINER_ID_FILE")
    # Containers have no host credentials/Docker socket. The whole source
    # is read-only for QA. Only explicitly requested dependency preflight may
    # use a writable private staging clone + public npm network.
    # Use the host user's numeric UID on Linux, so the disposable npm
    # staging clone remains writable without granting the container root.
    # Docker Desktop Windows mounts use Docker's remapped user as configured.
    user = (f"{os.getuid()}:{os.getgid()}"
            if hasattr(os, "getuid") and os.getuid() != 0 else "1000:1000")
    argv = ["docker", "run", "--rm", "--init", "--read-only",
            "--cap-drop=ALL", "--security-opt=no-new-privileges",
            "--pids-limit", "128", "--memory", QA_MEMORY,
            "--cpus", QA_CPUS, "--network", network,
            "--user", user,
            "--tmpfs", "/tmp:rw,nosuid,size=384m",
            "--tmpfs", "/home/agent:rw,nosuid,size=256m",
            "--workdir", "/work", "--env", "HOME=/home/agent",
            "--env", "NPM_CONFIG_CACHE=/tmp/npm-cache",
            "--env", "NPM_CONFIG_AUDIT=false",
            "--cidfile", str(cidfile),
            "--mount", "type=bind,src=" + str(workspace) +
            ",dst=/work" + ("" if writable else ",readonly")]
    argv += ["--entrypoint", args[0], QA_IMAGE, *args[1:]]
    try:
        proc = subprocess.run(argv, capture_output=True, text=True,
                              encoding="utf-8", errors="replace",
                              stdin=subprocess.DEVNULL, timeout=timeout)
        rc, output = proc.returncode, proc.stdout + "\n" + proc.stderr
    except subprocess.TimeoutExpired as exc:
        rc = 124
        output = "QA_DOCKER_TIMEOUT"
    except OSError as exc:
        raise Hold("QA_CONTAINER_UNAVAILABLE") from exc
    finally:
        if cidfile.is_file():
            cid = cidfile.read_text(encoding="ascii", errors="replace").strip()
            if re.fullmatch(r"[a-f0-9]{12,64}", cid):
                subprocess.run(["docker", "rm", "-f", cid],
                               capture_output=True, timeout=25, check=False)
            cidfile.unlink(missing_ok=True)
    (root / (label + ".private.log")).write_text(output[-50000:], encoding="utf-8")
    return rc, output[-1300:]


def _trusted_dependency_setup(workspace: Path, root: Path) -> None:
    # This occurs BEFORE model-generated candidate source is placed in clone.
    # It is explicit opt-in, and runs only inside disposable Docker, not host.
    # No lifecycle scripts, no lockfile, no project private credentials.
    rc, output = docker_run(
        workspace, ["npm", "install", "--ignore-scripts", "--no-save",
                    "--package-lock=false", "--no-audit", "--no-fund"],
        root, "trusted-deps", network="bridge", writable=True, timeout=420)
    if rc:
        # Only public, pre-model dependency setup has run at this point.
        # Expose no private source nor arbitrary raw stderr in the receipt.
        problem = ("EACCES" if "EACCES" in output else
                   "ENET" if "ENET" in output else
                   "ENOENT" if "ENOENT" in output else
                   "EUSAGE" if "EUSAGE" in output else
                   "UNKNOWN")
        raise Hold("TPS_DEPENDENCY_SANDBOX_INSTALL_FAILED_RC" + str(rc) +
                   "_" + problem)


def qa_commands(project: str) -> list[list[str]]:
    if project == "minecraftaibuilder":
        return [["node", "--test", "scripts/r125-v4h-mezzanine.test.mjs"]]
    if project == "browser-ink-tps":
        return [
            ["node", "node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"],
            ["node", "node_modules/vitest/vitest.mjs", "run",
             "--configLoader", "runner",
             "src/app/B193SourceCoopMode.test.ts"],
            ["node", "node_modules/vite/bin/vite.js", "build",
             "--configLoader", "runner",
             "--outDir", "/tmp/qa-tps-dist"],
        ]
    raise Hold("UNSUPPORTED_PROJECT")


def _read_receipt(root: Path, project: str, model: str, manifest: dict) -> tuple[dict, list[str]]:
    receipt_path = root / "SHAREABLE_DRAFT_RESULT.json"
    if not receipt_path.is_file() or receipt_path.is_symlink():
        raise Hold("PRIVATE_DRAFT_RECEIPT_MISSING")
    data = json.loads(receipt_path.read_text(encoding="utf-8"))
    lane = manifest["project_candidates"][project]
    if (data.get("schema") != "real-project-qwen-local-private-draft-v1"
            or data.get("status") != "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY"
            or data.get("project") != project or data.get("model_requested") != model
            or data.get("pinned_source_commit") != lane["pinned_commit"]
            or data.get("pinned_source_blob") != lane["source_blob_sha"]
            or data.get("git_commits") != 0 or data.get("git_pushes") != 0
            or data.get("native_QA_executed") is not False
            or data.get("model_drafts") != 2
            or not isinstance(data.get("stages"), list)):
        raise Hold("PRIVATE_DRAFT_RECEIPT_NOT_ADMISSIBLE")
    good = [x for x in data["stages"]
            if isinstance(x, dict) and x.get("result") == "PRIVATE_UNVERIFIED_DIFF"]
    if len(good) != 2 or [g.get("stage") for g in good] != [1, 2]:
        raise Hold("PRIVATE_DRAFT_STAGES_NOT_EXACTLY_TWO")
    out = []
    for i, item in enumerate(good, 1):
        file = root / f"draft_{i}.private.txt"
        if file.is_symlink() or not file.is_file() or file.stat().st_size > 16000:
            raise Hold("PRIVATE_DRAFT_FILE_INVALID")
        body = file.read_text(encoding="utf-8")
        if not body or sha256(body) != item["candidate_sha256"]:
            raise Hold("PRIVATE_DRAFT_SHA_MISMATCH")
        out.append(body)
    return data, out


def _check_one_contiguous_revision(before: str, after: str) -> None:
    # Draft generator only accepts ONE unique textual replacement. This
    # conservative check prevents replacing the entire code and tests.
    import difflib
    matcher = difflib.SequenceMatcher(None, before, after, autojunk=False)
    edits = [(a1, a2, b1, b2) for op, a1, a2, b1, b2 in matcher.get_opcodes()
             if op != "equal"]
    if not edits or len(edits) > 15:
        raise Hold("DRAFT_SCOPE_NOT_BOUNDED")
    changed_old = sum(a2-a1 for a1,a2,_,_ in edits)
    changed_new = sum(b2-b1 for _,_,b1,b2 in edits)
    if changed_old > 3500 or changed_new > 5000:
        raise Hold("DRAFT_CHANGED_TOO_MUCH")


def _copy_for_qa(original: Path, dest: Path, lane: dict) -> None:
    run_git(original, "clone", "--no-local", "--quiet", "--branch",
            lane["research_branch_for_private_clone"], str(original),
            str(dest), timeout=250)
    run_git(dest, "remote", "set-url", "origin",
            "https://github.com/" + lane["repository"] + ".git")
    run_git(dest, "config", "core.autocrlf", "false")
    if run_git(dest, "rev-parse", "HEAD") != lane["pinned_commit"]:
        raise Hold("QA_CLONE_HEAD_MISMATCH")
    verify_private_clone(dest, lane)


def _commit_local(workspace: Path, project: str, lane: dict, stage: int) -> str:
    # Explicitly suppress Git hooks (including hooks from untrusted source).
    run_git(workspace, "add", "--", lane["source_file"])
    hook_dir = workspace.parent / "empty-git-hooks"
    hook_dir.mkdir(exist_ok=True)
    run_git(workspace,
            "-c", "core.hooksPath=" + str(hook_dir),
            "-c", "user.name=Free Autonomy Research Fixture",
            "-c", "user.email=private-research@example.invalid",
            "commit", "-m", f"research(private-source-qa): {project} gated stage {stage}")
    return run_git(workspace, "rev-parse", "HEAD")



def preflight_private_drafts(
    root: Path, project: str, model: str, *,
    manifest: dict | None = None, use_lock: bool = True,
) -> dict:
    """Read-only source/draft admission. Never executes candidate code or Docker.

    Do not mistake a static admissibility result for JavaScript correctness,
    real independent QA, model quality, or safe publication.
    """
    manifest = load_manifest() if manifest is None else manifest
    if project not in {"minecraftaibuilder", "browser-ink-tps"}:
        raise Hold("PROJECT_NOT_APPROVED")
    root = root.expanduser().resolve(strict=True)
    lane = manifest["project_candidates"][project]
    report = {
        "schema": "real-project-private-static-preflight-v1",
        "status": "HOLD", "project": project,
        "model_reported_only": model,
        "source_commit": lane["pinned_commit"],
        "checked_stages": [],
        "generated_code_executed": False, "docker_executed": False,
        "native_qa_executed": False, "git_commits": 0,
        "github_pushes": 0, "paid_api_calls": 0,
        "project_original_changed": False,
        "candidate_quality_certified": False,
        "art_or_real_game_certified": False,
        "long_unattended_autonomy_certified": False,
    }
    lock = exclusive_local_project_lock() if use_lock else nullcontext()
    try:
        with lock:
            original = root / "repo"
            verify_private_clone(original, lane)
            data, drafts = _read_receipt(root, project, model, manifest)
            before = (original / lane["source_file"]).read_text(encoding="utf-8")
            accepted = [s for s in data["stages"]
                        if isinstance(s, dict) and
                        s.get("result") == "PRIVATE_UNVERIFIED_DIFF"]
            if sha256(before) != accepted[0]["source_previous_sha256"]:
                raise Hold("ORIGINAL_TEXT_SHA_MISMATCH")
            if sha256(drafts[0]) != accepted[1]["source_previous_sha256"]:
                raise Hold("DRAFT_CHAIN_BROKEN")
            prev = before
            for n, candidate in enumerate(drafts, 1):
                _check_one_contiguous_revision(prev, candidate)
                for contract_name in ANCHORS[project]:
                    if prev.count(contract_name) and (
                        candidate.count(contract_name) < prev.count(contract_name)
                    ):
                        raise Hold("PROTECTED_PUBLIC_CONTRACT_ANCHOR_REMOVED")
                report["checked_stages"].append({
                    "stage": n,
                    "candidate_sha256": sha256(candidate),
                    "receipt_hash_matched": True,
                    "revision_bounded": True,
                    "protected_contract_anchors_retained": True,
                })
                prev = candidate
            verify_private_clone(original, lane)
            report["status"] = "STATIC_PRIVATE_DRAFTS_ADMISSIBLE_FOR_ISOLATED_QA_ONLY"
    except (CloneHold, Hold, SandboxHold, OSError, ValueError, KeyError, TypeError) as exc:
        report["status"] = "HOLD"
        report["reason"] = str(exc)[:160]
    finally:
        # Metadata only. No source, prompt, patch, credentials, private paths.
        (root / "SHAREABLE_STATIC_PREFLIGHT.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report



def syntax_check_existing_mab_private_drafts(
    root: Path, project: str, model: str, *,
    manifest: dict | None = None, use_lock: bool = True,
) -> dict:
    """Parse existing generated MAB .mjs WITHOUT executing the source.

    The only subprocess is Node's native `--check` syntax parser, with the
    model text provided via stdin. No import resolution, tests, Docker, model
    calls, public upload, project write, or local Git commit are performed.
    This is not a native SOURCE QA result or quality certification.
    """
    if project != "minecraftaibuilder":
        raise Hold("JS_MODULE_SYNTAX_ONLY_MAB_SUPPORTED")
    manifest = load_manifest() if manifest is None else manifest
    root = root.expanduser().resolve(strict=True)
    lane = manifest["project_candidates"][project]
    report = {
        "schema": "real-project-private-mjs-syntax-v1",
        "status": "HOLD", "project": project, "model_reported_only": model,
        "source_commit": lane["pinned_commit"],
        "stages": [], "baseline_module_syntax_passed": False,
        "source_code_executed": False, "node_parse_only": True,
        "node_modules_loaded": False, "native_qa_executed": False,
        "docker_executed": False, "model_calls": 0,
        "git_commits": 0, "github_pushes": 0, "paid_api_calls": 0,
        "project_original_changed": False,
        "source_behavior_certified": False,
        "art_or_real_game_certified": False,
        "long_unattended_autonomy_certified": False,
    }
    lock = exclusive_local_project_lock() if use_lock else nullcontext()
    try:
        with lock:
            static = preflight_private_drafts(
                root, project, model, manifest=manifest, use_lock=False)
            if static["status"] != "STATIC_PRIVATE_DRAFTS_ADMISSIBLE_FOR_ISOLATED_QA_ONLY":
                raise Hold("STATIC_PREFLIGHT_" + static.get("reason", "HOLD"))
            node = shutil.which("node")
            if not node:
                raise Hold("NODE_NOT_INSTALLED_NO_AUTO_INSTALL")
            original = root / "repo"
            verify_private_clone(original, lane)
            _, drafts = _read_receipt(root, project, model, manifest)
            baseline = (original / lane["source_file"]).read_text(encoding="utf-8")
            # Reject host-side Node startup flags that might enable injected
            # modules or a preload. No model draft paths are CLI arguments.
            env = {k: v for k, v in os.environ.items()
                   if k not in {"NODE_OPTIONS", "NODE_PATH", "NODE_REPL_HISTORY"}}
            for stage, content in ((0, baseline), (1, drafts[0]), (2, drafts[1])):
                try:
                    check = subprocess.run(
                        [node, "--input-type=module", "--check"],
                        input=content, text=True, encoding="utf-8",
                        capture_output=True, timeout=30,
                        cwd=str(original), env=env)
                except (OSError, subprocess.TimeoutExpired) as exc:
                    raise Hold("NODE_SYNTAX_PARSER_UNAVAILABLE") from exc
                if check.returncode != 0:
                    # Never return stdout/stderr: Node syntax errors can
                    # include verbatim PRIVATE model-generated source lines.
                    raise Hold("MJS_SYNTAX_REJECTED_STAGE_" + str(stage))
                if stage == 0:
                    report["baseline_module_syntax_passed"] = True
                else:
                    report["stages"].append({
                        "stage": stage, "candidate_sha256": sha256(content),
                        "module_syntax_parsed": True,
                        "module_code_executed": False,
                    })
            verify_private_clone(original, lane)
            report["status"] = "PRIVATE_MAB_MODULE_SYNTAX_ONLY_PASS"
    except (CloneHold, Hold, SandboxHold, OSError, ValueError, KeyError, TypeError) as exc:
        report["status"] = "HOLD"
        report["reason"] = str(exc)[:160]
    finally:
        (root / "SHAREABLE_MJS_SYNTAX_RESULT.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def promote(root: Path, project: str, model: str,
            *, allow_public_npm_deps: bool = False,
            manifest: dict | None = None, use_lock: bool = True) -> dict:
    manifest = load_manifest() if manifest is None else manifest
    if project not in {"minecraftaibuilder", "browser-ink-tps"}:
        raise Hold("PROJECT_NOT_APPROVED")
    lane = manifest["project_candidates"][project]
    root = root.expanduser().resolve(strict=True)
    # Private receipt directory, never model-generated source files as commands.
    receipt_file = root / "SHAREABLE_PROMOTION_RESULT.json"
    report = {
        "schema": "real-project-docker-source-promotion-v1",
        "project": project, "status": "HOLD", "model_reported_only": model,
        "model_calls": 0, "completed_stages": 0, "local_qa_commits": [],
        "github_pushes": 0, "user_original_modified": False,
        "sandbox_network_for_qa": "none", "real_model_verified_here": False,
        "art_or_real_game_certified": False,
        "long_unattended_autonomy_certified": False,
        "qa_image": QA_IMAGE,
        "npm_transitive_versions_locked": False if project=="browser-ink-tps" else None,
    }
    lock = exclusive_local_project_lock() if use_lock else nullcontext()
    try:
        with lock:
            candidate_receipt, drafts = _read_receipt(root, project, model, manifest)
            original = root / "repo"
            verify_private_clone(original, lane)
            source_file = original / lane["source_file"]
            before = source_file.read_text(encoding="utf-8")
            first = [s for s in candidate_receipt["stages"]
                     if isinstance(s, dict) and s.get("result") == "PRIVATE_UNVERIFIED_DIFF"][0]
            second = [s for s in candidate_receipt["stages"]
                      if isinstance(s, dict) and s.get("result") == "PRIVATE_UNVERIFIED_DIFF"][1]
            if sha256(before) != first["source_previous_sha256"]:
                raise Hold("ORIGINAL_TEXT_SHA_MISMATCH")
            if sha256(drafts[0]) != second["source_previous_sha256"]:
                raise Hold("DRAFT_CHAIN_BROKEN")
            for previous, following in ((before, drafts[0]), (drafts[0], drafts[1])):
                _check_one_contiguous_revision(previous, following)
                for contract_name in ANCHORS[project]:
                    if previous.count(contract_name) and (
                            following.count(contract_name) < previous.count(contract_name)):
                        raise Hold("PROTECTED_PUBLIC_CONTRACT_ANCHOR_REMOVED")
            require_docker_qa_image()
            if project == "browser-ink-tps" and not allow_public_npm_deps:
                raise Hold("TPS_PUBLIC_NPM_DEP_SETUP_NEEDS_OPT_IN")
            scratch = root / ("qa-clone-" + uuid.uuid4().hex)
            _copy_for_qa(original, scratch, lane)
            report["qa_workspace_private"] = str(scratch)
            report["source_commit"] = lane["pinned_commit"]
            report["source_blob"] = lane["source_blob_sha"]
            if project == "browser-ink-tps":
                _trusted_dependency_setup(scratch, root)
                # installation is allowed to write only ignored node_modules.
                verify_private_clone(scratch, lane)
            # Preserve QA-passed source in local PRIVATE review evidence,
            # not in a public GitHub artifact or temporary CI log.
            review_dir = root / ("private-source-review-" + uuid.uuid4().hex)
            review_dir.mkdir(mode=0o700)
            report["private_source_review_directory"] = str(review_dir)
            report["private_source_review_stages"] = 0
            current = before
            for stage, body in enumerate(drafts, 1):
                verify_private_clone(original, lane)
                if run_git(scratch, "status", "--porcelain=v1", "--untracked-files=all"):
                    raise Hold("QA_CLONE_DIRTY_BEFORE_STAGE")
                if source_file.is_symlink():
                    raise Hold("ORIGINAL_SOURCE_SYMLINK")
                dest = scratch / lane["source_file"]
                dest.write_text(body, encoding="utf-8", newline="")
                if run_git(scratch, "diff", "--name-only") != lane["source_file"]:
                    raise Hold("QA_SOURCE_CHANGE_OUTSIDE_ALLOWLIST")
                if run_git(scratch, "diff", "--check", timeout=30):
                    raise Hold("QA_PATCH_WHITESPACE_INVALID")
                before_qa = hashlib.sha256(dest.read_bytes()).hexdigest()
                commands = qa_commands(project)
                for index, argv in enumerate(commands):
                    rc, output = docker_run(scratch, argv, root,
                                            f"qa-stage{stage}-check{index}")
                    if rc:
                        raise Hold(f"INDEPENDENT_DOCKER_QA_STAGE{stage}_CHECK{index}_RC{rc}")
                    if hashlib.sha256(dest.read_bytes()).hexdigest() != before_qa:
                        raise Hold("QA_CHANGED_SOURCE")
                    if run_git(scratch, "status", "--porcelain=v1",
                               "--untracked-files=all") != " M " + lane["source_file"]:
                        raise Hold("QA_CHANGED_PROTECTED_WORKTREE")
                sha = _commit_local(scratch, project, lane, stage)
                if run_git(scratch, "status", "--porcelain=v1", "--untracked-files=all"):
                    raise Hold("LOCAL_COMMIT_LEFT_DIRTY_WORKTREE")
                report["local_qa_commits"].append({
                    "stage": stage, "commit": sha, "candidate_sha256": sha256(body),
                    "qa_checks_passed": len(commands), "source_only": True})
                report["completed_stages"] = stage
                save_private_verified_stage(
                    root, scratch, lane, stage, body, sha,
                    lane["pinned_commit"] if stage == 1 else
                    report["local_qa_commits"][0]["commit"],
                    len(commands), review_dir,
                )
                report["private_source_review_stages"] = stage
                current = body
            verify_private_clone(original, lane)
            report["status"] = "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS"
    except (CloneHold, Hold, SandboxHold, EvidenceHold, OSError, ValueError, KeyError, TypeError) as exc:
        report["status"] = "HOLD"
        report["hold_reason"] = str(exc)[:160]
    finally:
        receipt_file.write_text(json.dumps(report, ensure_ascii=False, indent=2),
                                encoding="utf-8")
        report["private_receipt_path"] = str(receipt_file)
    return report


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--receipt-dir", type=Path, required=True)
    ap.add_argument("--project", required=True,
                    choices=("minecraftaibuilder", "browser-ink-tps"))
    ap.add_argument("--model", default="qwen3:14b")
    ap.add_argument("--allow-public-npm-deps", action="store_true")
    ap.add_argument("--static-only", action="store_true",
                    help="Read-only preflight of private drafts; never run generated code or Docker")
    ap.add_argument("--mjs-syntax-only", action="store_true",
                    help="Use Node syntax parser on existing private MAB drafts; no generated code execution")
    args = ap.parse_args()
    if args.static_only and args.mjs_syntax_only:
        raise SystemExit("CHOOSE_EXACTLY_ONE_READ_ONLY_MODE")
    if args.static_only:
        result = preflight_private_drafts(args.receipt_dir, args.project, args.model)
        expected = "STATIC_PRIVATE_DRAFTS_ADMISSIBLE_FOR_ISOLATED_QA_ONLY"
    elif args.mjs_syntax_only:
        result = syntax_check_existing_mab_private_drafts(
            args.receipt_dir, args.project, args.model)
        expected = "PRIVATE_MAB_MODULE_SYNTAX_ONLY_PASS"
    else:
        result = promote(args.receipt_dir, args.project, args.model,
                         allow_public_npm_deps=args.allow_public_npm_deps)
        expected = "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS"
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == expected else 2


if __name__ == "__main__":
    sys.exit(main())
