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


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--encrypted", required=True, type=Path)
    ap.add_argument("--sha256", required=True)
    ap.add_argument("--certificate", required=True, type=Path)
    ap.add_argument("--private-key", required=True, type=Path)
    ap.add_argument("--base-repo", required=True, type=Path)
    ap.add_argument("--private-root", required=True, type=Path)
    a = ap.parse_args()
    try:
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