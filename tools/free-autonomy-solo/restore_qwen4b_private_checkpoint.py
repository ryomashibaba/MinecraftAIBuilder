#!/usr/bin/env python3
"""Offline, fail-closed restoration of an explicitly authorized Qwen4B CMS Git checkpoint.

No model calls, network access, checkout, public source publication, or automatic
resumption. Decrypt only into a fresh owner-controlled PRIVATE directory and
retain the verified Git history as a bare repository for a later independent QA.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile

# Trusted baseline fixed in the existing Dec 2026 research manifest.
PINNED_BASE = "19ef7fd0f3d08ab6c8cd350b44df9ab0eb69a963"
PINNED_BLOB = "4cbcbb448737b314b6d5d4bfcdc367e9b1b45f52"
PINNED_SOURCE = "source/ai/r125-v4h-mezzanine-author-ir.mjs"
SCHEMA = "dec-qwen4b-private-encrypted-source-checkpoint-v1"
SHA40 = re.compile(r"[0-9a-f]{40}\Z")
SHA64 = re.compile(r"[0-9a-f]{64}\Z")
CIPHER_MAX = 20_000_000
ARCHIVE_MAX = 18_000_000
BUNDLE_MAX = 16_000_000
PROOF_MAX = 32_768
SOURCE_MAX = 2_000_000


class CheckpointHold(Exception):
    pass


def _command(argv: list[str], *, timeout: int = 35, binary: bool = True) -> bytes:
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env.update({"GIT_TERMINAL_PROMPT": "0", "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_CONFIG_GLOBAL": os.devnull})
    try:
        run = subprocess.run(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, env=env, timeout=timeout,
                             check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise CheckpointHold("CHECKPOINT_COMMAND_UNAVAILABLE_OR_TIMEOUT") from exc
    if run.returncode != 0:
        raise CheckpointHold("CHECKPOINT_COMMAND_FAILED")
    return run.stdout


def _git(repo: Path, *args: str) -> bytes:
    return _command(["git", "-C", str(repo), *args])


def _git_text(repo: Path, *args: str) -> str:
    try:
        return _git(repo, *args).decode("ascii").strip()
    except UnicodeError as exc:
        raise CheckpointHold("CHECKPOINT_GIT_NONASCII_METADATA") from exc


def _private_regular(path: Path) -> Path:
    if path.is_symlink() or not path.is_file():
        raise CheckpointHold("CHECKPOINT_INPUT_NOT_REGULAR_FILE")
    return path.resolve(strict=True)


def _unpack_strict(archive: Path, directory: Path) -> tuple[bytes, Path]:
    payload: dict[str, bytes] = {}
    limits = {"proof.json": PROOF_MAX, "qa-commits.bundle": BUNDLE_MAX}
    try:
        with tarfile.open(archive, mode="r|gz") as tf:
            for item in tf:
                if (item.name not in limits or item.name in payload or
                        not item.isfile() or item.pax_headers or
                        item.size < 1 or item.size > limits[item.name]):
                    raise CheckpointHold("CHECKPOINT_TAR_MEMBER_REFUSED")
                fh = tf.extractfile(item)
                if fh is None:
                    raise CheckpointHold("CHECKPOINT_TAR_MEMBER_MISSING")
                b = fh.read(item.size + 1)
                if len(b) != item.size:
                    raise CheckpointHold("CHECKPOINT_TAR_MEMBER_SIZE_MISMATCH")
                payload[item.name] = b
    except (tarfile.TarError, EOFError, OSError) as exc:
        raise CheckpointHold("CHECKPOINT_TAR_INVALID") from exc
    if set(payload) != set(limits):
        raise CheckpointHold("CHECKPOINT_TAR_MEMBER_SET_INVALID")
    bundle = directory / "qa-commits.bundle"
    bundle.write_bytes(payload["qa-commits.bundle"])
    bundle.chmod(0o600)
    return payload["proof.json"], bundle


def _proof_strict(proof_bytes: bytes, pinned_base: str, pinned_source: str) -> dict:
    try:
        proof = json.loads(proof_bytes)
    except (UnicodeError, ValueError) as exc:
        raise CheckpointHold("CHECKPOINT_PROOF_JSON_INVALID") from exc
    if not isinstance(proof, dict):
        raise CheckpointHold("CHECKPOINT_PROOF_NOT_OBJECT")
    keys = {"schema", "scope", "base_public_commit", "final_verified_head",
            "source_file", "accepted_cycles", "bundle_sha256", "game_art_approved",
            "model_code_publication_authorized"}
    if (set(proof) != keys or proof.get("schema") != SCHEMA or
            proof.get("scope") != "RESEARCH_ONLY_SOURCE_QA_NOT_ADOPTED" or
            proof.get("base_public_commit") != pinned_base or
            proof.get("source_file") != pinned_source or
            proof.get("game_art_approved") is not False or
            proof.get("model_code_publication_authorized") is not False or
            not isinstance(proof.get("final_verified_head"), str) or
            not SHA40.fullmatch(proof["final_verified_head"]) or
            not isinstance(proof.get("bundle_sha256"), str) or
            not SHA64.fullmatch(proof["bundle_sha256"])):
        raise CheckpointHold("CHECKPOINT_PROOF_CONTRACT_INVALID")
    accepted = proof.get("accepted_cycles")
    if not isinstance(accepted, list) or len(accepted) not in (1, 2):
        raise CheckpointHold("CHECKPOINT_CYCLE_COUNT_INVALID")
    for i, item in enumerate(accepted, 1):
        if (not isinstance(item, dict) or set(item) != {"cycle", "source_sha256", "qa_commands"} or
                type(item.get("cycle")) is not int or item["cycle"] != i or
                not isinstance(item.get("source_sha256"), list) or
                len(item["source_sha256"]) != 2 or
                any(not isinstance(s, str) or not SHA64.fullmatch(s)
                    for s in item["source_sha256"]) or
                not isinstance(item.get("qa_commands"), list) or
                len(item["qa_commands"]) != 2 or
                any(type(v) is not int or not 1 <= v <= 20 for v in item["qa_commands"])):
            raise CheckpointHold("CHECKPOINT_CYCLE_PROOF_INVALID")
    return proof


def restore_checkpoint(
    encrypted: Path, expected_sha256: str, certificate: Path, private_key: Path,
    base_repo: Path, private_root: Path, *,
    pinned_base: str = PINNED_BASE, pinned_source: str = PINNED_SOURCE,
    pinned_blob: str = PINNED_BLOB,
) -> dict:
    """Restore proof to a new PRIVATE bare Git repo, never checkout source or run it.

    Override pinned values only for local synthetic tests; CLI exposes no override.
    """
    if (not SHA64.fullmatch(expected_sha256) or
            not SHA40.fullmatch(pinned_base) or not SHA40.fullmatch(pinned_blob) or
            not re.fullmatch(r"source/ai/[A-Za-z0-9_-]+\.mjs", pinned_source)):
        raise CheckpointHold("CHECKPOINT_TRUSTED_INPUT_INVALID")
    encrypted = _private_regular(encrypted)
    certificate = _private_regular(certificate)
    private_key = _private_regular(private_key)
    if (encrypted.stat().st_size > CIPHER_MAX or certificate.stat().st_size > 16384 or
            private_key.stat().st_size > 16384):
        raise CheckpointHold("CHECKPOINT_INPUT_SIZE_EXCEEDED")
    if hashlib.sha256(encrypted.read_bytes()).hexdigest() != expected_sha256:
        raise CheckpointHold("CHECKPOINT_CIPHERTEXT_SHA_MISMATCH")
    if (base_repo.is_symlink() or not base_repo.is_dir() or
            private_root.is_symlink() or not private_root.is_dir()):
        raise CheckpointHold("CHECKPOINT_BASE_OR_PRIVATE_ROOT_INVALID")
    base_repo = base_repo.resolve(strict=True)
    private_root = private_root.resolve(strict=True)
    if (base_repo == private_root or base_repo in private_root.parents or
            private_root in base_repo.parents):
        raise CheckpointHold("CHECKPOINT_PRIVATE_DESTINATION_NOT_ISOLATED")
    if _git_text(base_repo, "rev-parse", "HEAD") != pinned_base:
        raise CheckpointHold("CHECKPOINT_PUBLIC_BASE_HEAD_MISMATCH")
    if _git_text(base_repo, "rev-parse", f"{pinned_base}:{pinned_source}") != pinned_blob:
        raise CheckpointHold("CHECKPOINT_PUBLIC_BASE_BLOB_MISMATCH")
    if _git_text(base_repo, "status", "--porcelain=v1", "--untracked-files=all"):
        raise CheckpointHold("CHECKPOINT_PUBLIC_BASE_NOT_CLEAN")
    with tempfile.TemporaryDirectory(prefix=".qwen4b-qa-restore-", dir=private_root) as temp:
        stage = Path(temp)
        archive = stage / "checkpoint.tar.gz"
        _command(["openssl", "cms", "-decrypt", "-binary", "-inform", "DER",
                  "-in", str(encrypted), "-recip", str(certificate),
                  "-inkey", str(private_key), "-out", str(archive)], timeout=50)
        if not archive.is_file() or not 0 < archive.stat().st_size <= ARCHIVE_MAX:
            raise CheckpointHold("CHECKPOINT_DECRYPTED_ARCHIVE_SIZE_INVALID")
        proof_raw, bundle = _unpack_strict(archive, stage)
        proof = _proof_strict(proof_raw, pinned_base, pinned_source)
        if hashlib.sha256(bundle.read_bytes()).hexdigest() != proof["bundle_sha256"]:
            raise CheckpointHold("CHECKPOINT_GIT_BUNDLE_SHA_MISMATCH")
        bare = stage / "restored.git"
        _command(["git", "init", "--bare", "--quiet", str(bare)])
        _git(bare, "fetch", "--no-tags", "--quiet", str(base_repo), pinned_base)
        if _git_text(bare, "rev-parse", "FETCH_HEAD") != pinned_base:
            raise CheckpointHold("CHECKPOINT_IMPORTED_BASE_MISMATCH")
        _git(bare, "bundle", "verify", str(bundle))
        bundle_heads = _git_text(bare, "bundle", "list-heads", str(bundle)).splitlines()
        final = proof["final_verified_head"]
        if bundle_heads != [f"{final} HEAD"]:
            raise CheckpointHold("CHECKPOINT_BUNDLE_REF_INVALID")
        _git(bare, "fetch", "--no-tags", "--quiet", str(bundle), "HEAD")
        if _git_text(bare, "rev-parse", "FETCH_HEAD") != final:
            raise CheckpointHold("CHECKPOINT_RESTORED_HEAD_MISMATCH")
        lineage = _git_text(bare, "rev-list", "--reverse", f"{pinned_base}..{final}").splitlines()
        accepted = proof["accepted_cycles"]
        if len(lineage) != len(accepted) * 2 or lineage[-1] != final:
            raise CheckpointHold("CHECKPOINT_GIT_LINEAGE_COUNT_INVALID")
        previous = pinned_base
        for i, commit in enumerate(lineage):
            parents = _git_text(bare, "rev-list", "--parents", "-n", "1", commit).split()
            if parents != [commit, previous]:
                raise CheckpointHold("CHECKPOINT_GIT_NONLINEAR_OR_MERGE")
            paths = _git_text(bare, "diff-tree", "--no-commit-id", "--name-only", "-r",
                              previous, commit).splitlines()
            if paths != [pinned_source]:
                raise CheckpointHold("CHECKPOINT_GIT_SOURCE_SCOPE_INVALID")
            # Reject changed file modes, including executable source or symlink.
            mode_line = _git_text(bare, "ls-tree", commit, "--", pinned_source)
            if (not mode_line.startswith("100644 blob ") or
                    not mode_line.endswith("\t" + pinned_source)):
                raise CheckpointHold("CHECKPOINT_GIT_SOURCE_MODE_INVALID")
            count = _git_text(bare, "cat-file", "-s", f"{commit}:{pinned_source}")
            if not count.isdecimal() or int(count) > SOURCE_MAX:
                raise CheckpointHold("CHECKPOINT_GIT_SOURCE_SIZE_EXCEEDED")
            source = _git(bare, "show", f"{commit}:{pinned_source}")
            if hashlib.sha256(source).hexdigest() != accepted[i // 2]["source_sha256"][i % 2]:
                raise CheckpointHold("CHECKPOINT_GIT_STAGE_SOURCE_SHA_MISMATCH")
            previous = commit
        _git(bare, "update-ref", "refs/heads/qa-restored-review-only", final)
        if _git_text(bare, "rev-parse", "refs/heads/qa-restored-review-only") != final:
            raise CheckpointHold("CHECKPOINT_FINAL_REF_NOT_SAVED")
        destination = private_root / f"qa-restored-{final[:12]}.git"
        if destination.exists() or destination.is_symlink():
            raise CheckpointHold("CHECKPOINT_PRIVATE_RESTORE_ALREADY_EXISTS")
        # Keep the authenticated, strictly validated stage-SHA proof PRIVATE
        # beside the bare Git objects for later independent SOURCE re-QA.
        private_proof = bare / "qa-proof.private.json"
        with private_proof.open("x", encoding="utf-8") as fh:
            json.dump(proof, fh, ensure_ascii=False, sort_keys=True)
            fh.write("\n")
        private_proof.chmod(0o600)
        if _proof_strict(private_proof.read_bytes(), pinned_base, pinned_source) != proof:
            raise CheckpointHold("CHECKPOINT_PRIVATE_PROOF_READBACK_FAILED")
        # No checkout, no untrusted source execution, and no public Git write.
        os.rename(bare, destination)
        return {
            "status": "PRIVATE_QA_GIT_HISTORY_RESTORED_REVIEW_ONLY",
            "verified_source_stages": len(lineage),
            "base_commit": pinned_base,
            "final_commit": final,
            "ciphertext_sha256": expected_sha256,
            "raw_source_executed": False,
            "independent_qa_reexecuted": False,
            "automated_model_resume": False,
            "public_git_pushes": 0,
            "model_requests": 0,
            "original_project_modified": False,
            "art_or_gameplay_certified": False,
            # Never print an owner-private absolute path in shareable stdout.
            "private_bare_repo_name": destination.name,
        }



def _docker_container_inventory() -> tuple[str, ...]:
    """Require a live daemon-backed result, not a missing Docker CLI/daemon."""
    try:
        p = subprocess.run(
            ["docker", "container", "ls", "--all", "--quiet", "--no-trunc"],
            stdin=subprocess.DEVNULL, capture_output=True, text=True,
            timeout=25, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise CheckpointHold("CHECKPOINT_REQA_DOCKER_INVENTORY_UNAVAILABLE") from exc
    if p.returncode:
        raise CheckpointHold("CHECKPOINT_REQA_DOCKER_INVENTORY_FAILED")
    return tuple(sorted(p.stdout.splitlines()))


def _reqa_git_porcelain(repo: Path) -> str:
    # Preserve the leading status column; _git_text(...).strip() cannot.
    return _git(repo, "status", "--porcelain=v1", "--untracked-files=all").decode(
        "utf-8").rstrip("\r\n")


def recheck_restored_source_docker(
    restored_bare: Path, base_repo: Path, private_root: Path, *,
    pinned_base: str = PINNED_BASE,
    pinned_source: str = PINNED_SOURCE,
    pinned_blob: str = PINNED_BLOB,
    preflight=None,
    run_qa=None,
    inventory=None,
) -> dict:
    """Re-run QA on every restored stage in disposable network-none Docker.

    The Git base checkout is trusted/pinned. Generated source is never executed
    by the host, staged into production, or published. There is no model call.
    Injected QA/preflight/inventory callbacks exist for offline tests only;
    CLI exposes no callback or baseline override.
    """
    if not (SHA40.fullmatch(pinned_base) and SHA40.fullmatch(pinned_blob) and
            re.fullmatch(r"source/ai/[A-Za-z0-9_-]+\.mjs", pinned_source)):
        raise CheckpointHold("CHECKPOINT_REQA_PINNED_INPUT_INVALID")
    if (restored_bare.is_symlink() or not restored_bare.is_dir() or
            private_root.is_symlink() or not private_root.is_dir() or
            base_repo.is_symlink() or not base_repo.is_dir()):
        raise CheckpointHold("CHECKPOINT_REQA_INPUT_DIRECTORY_INVALID")
    restored_bare = restored_bare.resolve(strict=True)
    base_repo = base_repo.resolve(strict=True)
    private_root = private_root.resolve(strict=True)
    if (restored_bare.parent != private_root or
            not re.fullmatch(r"qa-restored-[0-9a-f]{12}\.git", restored_bare.name) or
            base_repo == private_root or base_repo in private_root.parents or
            private_root in base_repo.parents):
        raise CheckpointHold("CHECKPOINT_REQA_PRIVATE_LOCATION_INVALID")
    if (_git_text(restored_bare, "rev-parse", "--is-bare-repository") != "true" or
            _git_text(base_repo, "rev-parse", "HEAD") != pinned_base or
            _git_text(base_repo, "rev-parse", f"{pinned_base}:{pinned_source}") != pinned_blob or
            _git_text(base_repo, "status", "--porcelain=v1", "--untracked-files=all")):
        raise CheckpointHold("CHECKPOINT_REQA_TRUSTED_BASE_INVALID")
    proof_file = restored_bare / "qa-proof.private.json"
    if proof_file.is_symlink() or not proof_file.is_file() or proof_file.stat().st_size > PROOF_MAX:
        raise CheckpointHold("CHECKPOINT_REQA_PROOF_MISSING")
    proof = _proof_strict(proof_file.read_bytes(), pinned_base, pinned_source)
    if ((restored_bare / "qa-reverification.private.json").exists() or
            (restored_bare / "qa-reverification.private.json").is_symlink()):
        raise CheckpointHold("CHECKPOINT_REQA_ALREADY_RECORDED")
    final = proof["final_verified_head"]
    if (restored_bare.name != f"qa-restored-{final[:12]}.git" or
            _git_text(restored_bare, "rev-parse", "refs/heads/qa-restored-review-only") != final):
        raise CheckpointHold("CHECKPOINT_REQA_FINAL_REF_CHANGED")
    lineage = _git_text(restored_bare, "rev-list", "--reverse", f"{pinned_base}..{final}").splitlines()
    stages = len(proof["accepted_cycles"]) * 2
    if len(lineage) != stages or lineage[-1] != final:
        raise CheckpointHold("CHECKPOINT_REQA_GIT_COUNT_CHANGED")
    previous = pinned_base
    for i, commit in enumerate(lineage):
        if (_git_text(restored_bare, "rev-list", "--parents", "-n", "1", commit).split() !=
                [commit, previous] or
                _git_text(restored_bare, "diff-tree", "--no-commit-id", "--name-only",
                          "-r", previous, commit).splitlines() != [pinned_source] or
                not _git_text(restored_bare, "ls-tree", commit, "--", pinned_source).startswith(
                    "100644 blob ")):
            raise CheckpointHold("CHECKPOINT_REQA_STAGE_GIT_SCOPE_INVALID")
        candidate = _git(restored_bare, "show", f"{commit}:{pinned_source}")
        if (len(candidate) > SOURCE_MAX or
                hashlib.sha256(candidate).hexdigest() !=
                proof["accepted_cycles"][i // 2]["source_sha256"][i % 2]):
            raise CheckpointHold("CHECKPOINT_REQA_STAGE_BYTES_INVALID")
        previous = commit
    if any(q.get("qa_commands") != [1, 1] for q in proof["accepted_cycles"]):
        raise CheckpointHold("CHECKPOINT_REQA_COMMAND_COUNT_UNEXPECTED")
    # An injected hook is a fixture, NEVER genuine independent Docker proof.
    # In particular fixture success must not generate qa-reverification.private.json.
    fixture_mode = any(hook is not None for hook in (preflight, run_qa, inventory))
    # Docker preflight comes *after* proof/Git checks and before staging source.
    from promote_private_real_drafts_docker import (
        require_docker_qa_image, docker_run)
    if preflight is None:
        preflight = require_docker_qa_image
    if run_qa is None:
        run_qa = docker_run
    if inventory is None:
        inventory = _docker_container_inventory
    try:
        preflight()
    except Exception as exc:
        raise CheckpointHold("CHECKPOINT_REQA_DOCKER_NOT_READY") from exc
    with tempfile.TemporaryDirectory(prefix=".dec-reqa-", dir=private_root) as temp:
        scratch = Path(temp)
        template = scratch / "empty-template"
        template.mkdir()
        workspace = scratch / "trusted-qa-base"
        _command(["git", "-c", "core.hooksPath=" + os.devnull,
                  "clone", "--no-local", "--no-checkout", "--quiet",
                  "--template", str(template), "--", str(base_repo), str(workspace)], timeout=120)
        _command(["git", "-C", str(workspace),
                  "-c", "core.hooksPath=" + os.devnull,
                  "-c", "core.autocrlf=false",
                  "checkout", "--detach", "--quiet", pinned_base], timeout=120)
        source = workspace / pinned_source
        if (source.is_symlink() or not source.is_file() or
                _git_text(workspace, "rev-parse", "HEAD") != pinned_base or
                _reqa_git_porcelain(workspace)):
            raise CheckpointHold("CHECKPOINT_REQA_TRUSTED_CLONE_INVALID")
        if hashlib.sha256(source.read_bytes()).hexdigest() != hashlib.sha256(
                _git(base_repo, "show", f"{pinned_base}:{pinned_source}")).hexdigest():
            raise CheckpointHold("CHECKPOINT_REQA_BASE_WORKTREE_MISMATCH")
        proof_stages = []
        for i, commit in enumerate(lineage):
            source_bytes = _git(restored_bare, "show", f"{commit}:{pinned_source}")
            expected = proof["accepted_cycles"][i // 2]["source_sha256"][i % 2]
            source.write_bytes(source_bytes)
            if (hashlib.sha256(source.read_bytes()).hexdigest() != expected or
                    _reqa_git_porcelain(workspace) != " M " + pinned_source):
                raise CheckpointHold("CHECKPOINT_REQA_STAGING_SCOPE_INVALID")
            before_containers = inventory()
            try:
                rc, _private_output = run_qa(
                    workspace, ["node", "--test", "scripts/r125-v4h-mezzanine.test.mjs"],
                    scratch, f"reqa-stage{i+1}", network="none", writable=False)
            except Exception as exc:
                raise CheckpointHold("CHECKPOINT_REQA_DOCKER_COMMAND_FAILED") from exc
            after_containers = inventory()
            if before_containers != after_containers:
                raise CheckpointHold("CHECKPOINT_REQA_CONTAINER_INVENTORY_CHANGED")
            if (rc != 0 or hashlib.sha256(source.read_bytes()).hexdigest() != expected or
                    _reqa_git_porcelain(workspace) != " M " + pinned_source or
                    _git_text(base_repo, "rev-parse", "HEAD") != pinned_base):
                raise CheckpointHold("CHECKPOINT_REQA_SOURCE_QA_NOT_PASSED")
            proof_stages.append({"commit": commit, "source_sha256": expected,
                                 "independent_docker_qa_checks": 1})
        result = {
            "status": ("OFFLINE_FIXTURE_REQA_SIMULATED_NOT_REAL_DOCKER"
                       if fixture_mode else
                       "RESTORED_REAL_DOCKER_SOURCE_REQA_ONLY_ART_HOLD"),
            "base_commit": pinned_base, "final_commit": final,
            "qa_stages_reexecuted": 0 if fixture_mode else stages,
            "fixture_stages_simulated": stages if fixture_mode else 0,
            "independent_docker_qa_verified": not fixture_mode,
            "network": "none", "model_requests": 0,
            "container_inventory_unchanged": True,
            "source_executed_on_host": False,
            "source_published": False,
            "original_project_modified": False,
            "art_or_gameplay_certified": False,
        }
        if fixture_mode:
            # No trusted receipt is written by injected fake QA callbacks.
            return result
        receipt = restored_bare / "qa-reverification.private.json"
        if receipt.exists() or receipt.is_symlink():
            raise CheckpointHold("CHECKPOINT_REQA_ALREADY_RECORDED")
        with receipt.open("x", encoding="utf-8") as stream:
            json.dump({"result": result, "verified_stages": proof_stages}, stream,
                      ensure_ascii=False, sort_keys=True)
            stream.write("\n")
        receipt.chmod(0o600)
        return result

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--recheck-restored-docker", type=Path, default=None,
                    help="Recheck a prior PRIVATE restored bare Git repo in isolated Docker")
    ap.add_argument("--encrypted", type=Path)
    ap.add_argument("--sha256")
    ap.add_argument("--certificate", type=Path)
    ap.add_argument("--private-key", type=Path)
    ap.add_argument("--base-repo", required=True, type=Path)
    ap.add_argument("--private-root", required=True, type=Path)
    a = ap.parse_args()
    try:
        if a.recheck_restored_docker is not None:
            if any(v is not None for v in (a.encrypted, a.sha256,
                                           a.certificate, a.private_key)):
                raise CheckpointHold("CHECKPOINT_REQA_MODE_ARGUMENTS_MIXED")
            result = recheck_restored_source_docker(
                a.recheck_restored_docker, a.base_repo, a.private_root)
        else:
            if any(v is None for v in (a.encrypted, a.sha256,
                                       a.certificate, a.private_key)):
                raise CheckpointHold("CHECKPOINT_RESTORE_REQUIRED_ARGUMENT_MISSING")
            result = restore_checkpoint(a.encrypted, a.sha256, a.certificate,
                                        a.private_key, a.base_repo, a.private_root)
        print(json.dumps(result, sort_keys=True, ensure_ascii=False))
        return 0
    except (CheckpointHold, OSError, ValueError, TypeError) as exc:
        # Never print crypto stderr, source bytes, keys, or private file paths.
        reason = str(exc) if isinstance(exc, CheckpointHold) else "CHECKPOINT_INTERNAL_HOLD"
        print(json.dumps({"status": "HOLD", "reason": reason,
                          "model_requests": 0, "public_git_pushes": 0}, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())