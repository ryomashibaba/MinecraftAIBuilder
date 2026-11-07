#!/usr/bin/env python3
"""Windows runner: synthetic encrypted Git checkpoint -> real DPAPI wrapper -> actual recovery.

No model and no private user content. A fixed audited public source baseline is
fetched read-only, modified in a disposable local fixture, and then discarded.
No GitHub credentials, protected original writes, model calls or Docker involved.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile

BASE_SHA = "19ef7fd0f3d08ab6c8cd350b44df9ab0eb69a963"
BASE_BLOB = "4cbcbb448737b314b6d5d4bfcdc367e9b1b45f52"
SOURCE = "source/ai/r125-v4h-mezzanine-author-ir.mjs"
PUBLIC_GIT = "https://github.com/ryomashibaba/MinecraftAIBuilder.git"

# Reuse the real checkpoint sealer without invoking its model or Docker entrypoints.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "free-autonomy-solo"))
from real_qwen4b_two_cumulative_ci import _verified_private_checkpoint


def command(*args: str, cwd: Path | None = None, timeout: int = 120) -> str:
    p = subprocess.run(args, cwd=cwd, check=False, capture_output=True,
                       encoding="utf-8", errors="replace", timeout=timeout)
    if p.returncode:
        raise RuntimeError("SYNTHETIC_FIXTURE_COMMAND_FAILED")
    return p.stdout.strip()


def digest(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def main() -> int:
    if os.name != "nt":
        raise RuntimeError("WINDOWS_ONLY_FIXTURE")
    appdata = Path(os.environ["LOCALAPPDATA"])
    # The CI Windows image may ship OpenSSL inside Git but not on the user's PATH.
    openssl = shutil.which("openssl.exe")
    if not openssl:
        for path in (
            Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Git/usr/bin/openssl.exe",
            Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Git/mingw64/bin/openssl.exe",
        ):
            if path.is_file():
                openssl = str(path)
                os.environ["PATH"] = str(path.parent) + os.pathsep + os.environ["PATH"]
                break
    if not openssl:
        raise RuntimeError("SYNTHETIC_OPENSSL_NOT_AVAILABLE")
    certificate = appdata / "FreeAutonomyPrivate/DecCheckpointRecipient/recipient-public.pem"
    wrapper = Path(__file__).resolve().parent / "restore_windows_checkpoint.ps1"
    if not certificate.is_file() or not wrapper.is_file():
        raise RuntimeError("SETUP_OR_WRAPPER_MISSING")
    with tempfile.TemporaryDirectory(prefix="d-") as directory:
        root = Path(directory)
        base = root / "public-audited-base"
        base.mkdir()
        command("git", "init", "-q", cwd=base)
        # The pinned commit is public. Fetch only that one commit; never write
        # to the checkout or the protected project branch.
        command("git", "fetch", "--no-tags", "--depth=1", PUBLIC_GIT, BASE_SHA,
                cwd=base, timeout=180)
        command("git", "checkout", "-q", "--detach", BASE_SHA, cwd=base)
        if command("git", "rev-parse", "HEAD", cwd=base) != BASE_SHA or \
                command("git", "rev-parse", "HEAD:" + SOURCE, cwd=base) != BASE_BLOB:
            raise RuntimeError("SYNTHETIC_BASE_MISMATCH")
        if command("git", "status", "--porcelain=v1", cwd=base):
            raise RuntimeError("SYNTHETIC_BASE_NOT_CLEAN")
        work = root / "modified-private-fixture"
        command("git", "clone", "-q", "--no-local", str(base), str(work))
        command("git", "config", "user.name", "Disposable Fixture", cwd=work)
        command("git", "config", "user.email", "fixture@example.invalid", cwd=work)
        source = work / SOURCE
        original = source.read_bytes()
        digests: list[str] = []
        commits: list[str] = []
        for i in (1, 2, 3, 4):
            # Keep the actual public source intact; only append a harmless
            # synthetic comment in an isolated local Git copy.
            amended = original + f"\n// DEC-SYNTHETIC-RESTORE-{i}\n".encode()
            source.write_bytes(amended)
            command("git", "add", SOURCE, cwd=work)
            command("git", "commit", "-q", "-m", f"synthetic fixture stage {i}", cwd=work)
            digests.append(digest(amended))
            commits.append(command("git", "rev-parse", "HEAD", cwd=work))
        final = commits[-1]
        # Fixture-only receipts exercise the real sealer without claiming Docker QA.
        synthetic_private = root / "p"
        synthetic_private.mkdir()
        session = synthetic_private / ("m-" + "a" * 16)
        stage = session / "c2" / "PrivateClones" / "minecraftaibuilder-s"
        stage.mkdir(parents=True)
        qa_clone = stage / "qa-clone-s"
        command("git", "clone", "-q", "--no-local", str(work), str(qa_clone))
        review = stage / "private-review"
        review.mkdir()
        second_base = commits[1]
        second_blob = command("git", "rev-parse", second_base + ":" + SOURCE, cwd=qa_clone)
        (review / "REVIEW_ONLY_PRIVATE_MANIFEST.json").write_text(json.dumps({
            "schema": "dec-private-source-review-after-real-qa-v1",
            "status": "TWO_SOURCE_STAGES_REVIEW_ONLY_ART_HOLD",
            "human_approval": False, "github_pushes": 0,
            "source_file": SOURCE,
            "project_source_commit": second_base,
            "project_source_blob": second_blob,
        }), encoding="utf-8")
        (stage / "SHAREABLE_PROMOTION_RESULT.json").write_text(json.dumps({
            "qa_workspace_private": str(qa_clone),
            "private_source_review_directory": str(review),
            "status": "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS",
            "completed_stages": 2, "private_source_review_stages": 2,
            "github_pushes": 0,
            "source_commit": second_base, "source_blob": second_blob,
            "local_qa_commits": [{"commit": commits[2]}, {"commit": commits[3]}],
        }), encoding="utf-8")
        accepted = [
            {"cycle": 1, "source_sha256": digests[:2], "qa_commands": [1, 1]},
            {"cycle": 2, "source_sha256": digests[2:], "qa_commands": [1, 1]},
        ]
        summary = {
            "completed_cycles": 2, "accepted_cycles": accepted,
            "base_audited_public_source_commit": BASE_SHA,
            "completed_qa_source_stages": 4, "private_review_stages": 4,
            "github_pushes": 0, "original_source_modified": False,
        }
        report = session / "SHAREABLE_MAB_CUMULATIVE_SOURCE_QA.json"
        report.write_text(json.dumps(summary), encoding="utf-8")
        encrypted = root / "encrypted-fixture.cms"
        expected = _verified_private_checkpoint(
            synthetic_private, report, summary,
            certificate.read_text(encoding="utf-8"), encrypted)
        if digest(encrypted.read_bytes()) != expected:
            raise RuntimeError("SYNTHETIC_PRODUCTION_SEALER_SHA_MISMATCH")
        private_root = appdata / "FreeAutonomyPrivate/DecCheckpointRestored"
        restore_name = "qa-restored-" + final[:12] + ".git"
        runner_args = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
                       "-File", str(wrapper), "-EncryptedCheckpoint", str(encrypted),
                       "-CiphertextSha256", expected, "-BaseRepository", str(base)]
        success = subprocess.run(runner_args, capture_output=True,
                                 text=True, encoding="utf-8", errors="replace", timeout=180)
        if success.returncode != 0 or \
                "DEC_WINDOWS_PRIVATE_CHECKPOINT_RESTORE_PASS_REVIEW_ONLY" not in success.stdout or \
                "VERIFIED_SOURCE_STAGES=4" not in success.stdout:
            # Only sanitized machine-readable reason codes leave the fixture.
            approved = ("DEC_WINDOWS_RESTORE_REJECT_CODE=",
                        "DEC_WINDOWS_RESTORE_HOLD_STAGE=",
                        "DEC_WINDOWS_RESTORE_HOLD_CODE=",
                        "DEC_WINDOWS_RESTORE_EXCEPTION_TYPE=",
                        "DEC_WINDOWS_PRIVATE_CHECKPOINT_RESTORE_HOLD")
            for line in success.stdout.splitlines():
                if (line.startswith(approved) and len(line) < 170 and
                        all(c.isupper() or c.isdigit() or c in "_=" for c in line)):
                    print("SANITIZED_" + line)
            raise RuntimeError("WINDOWS_RESTORE_WRAPPER_POSITIVE_FAILED")
        saved = private_root / restore_name
        if not (saved / "qa-proof.private.json").is_file() or \
                command("git", "--git-dir=" + str(saved), "rev-parse",
                        "refs/heads/qa-restored-review-only") != final:
            raise RuntimeError("WINDOWS_PRIVATE_GIT_RESTORE_INVALID")
        recipient = appdata / "FreeAutonomyPrivate/DecCheckpointRecipient"
        if list(recipient.glob("restore-*")) or list(recipient.rglob("temporary-private-key.pem")):
            raise RuntimeError("WINDOWS_PLAINTEXT_PRIVATE_KEY_RESIDUAL")
        restored_proof = json.loads((saved / "qa-proof.private.json").read_text(encoding="utf-8"))
        if len(restored_proof["accepted_cycles"]) != 2:
            raise RuntimeError("WINDOWS_RESTORED_CYCLE_PROOF_INVALID")
        print("WINDOWS_PRODUCTION_SEALER_DPAPI_FOUR_STAGE_ROUNDTRIP_PASS")
        # Repeated restores must fail closed, never overwrite a previous Git proof.
        negative = subprocess.run(runner_args, capture_output=True,
                                  text=True, encoding="utf-8", errors="replace", timeout=180)
        if negative.returncode == 0 or \
                "DEC_WINDOWS_PRIVATE_CHECKPOINT_RESTORE_HOLD" not in negative.stdout:
            raise RuntimeError("WINDOWS_DUPLICATE_RESTORE_DID_NOT_HOLD")
        if list(recipient.glob("restore-*")) or list(recipient.rglob("temporary-private-key.pem")):
            raise RuntimeError("WINDOWS_RESTORE_TEMP_KEY_LEFT_BEHIND")
        print("WINDOWS_DPAPI_TO_RESTORER_DUPLICATE_HOLD_PASS")
        # A bad ciphertext SHA must be rejected BEFORE unlocking DPAPI.
        bad_args = runner_args.copy()
        bad_args[bad_args.index("-CiphertextSha256") + 1] = "0" * 64
        bad = subprocess.run(bad_args, capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=180)
        if bad.returncode == 0 or \
                "DEC_WINDOWS_PRIVATE_CHECKPOINT_RESTORE_HOLD" not in bad.stdout:
            raise RuntimeError("WINDOWS_CIPHERTEXT_SHA_MISMATCH_NOT_REFUSED")
        if list(recipient.glob("restore-*")):
            raise RuntimeError("WINDOWS_BAD_SHA_CREATED_TEMP_KEY")
        print("WINDOWS_DPAPI_TO_RESTORER_SHA_HOLD_PASS")
        # Real producer must reject tampered synthetic source proof before encryption.
        forged = json.loads(json.dumps(summary))
        forged["accepted_cycles"][0]["source_sha256"][0] = "0" * 64
        report.write_text(json.dumps(forged), encoding="utf-8")
        rejected = root / "rejected-forged-fixture.cms"
        try:
            _verified_private_checkpoint(
                synthetic_private, report, forged,
                certificate.read_text(encoding="utf-8"), rejected)
        except (ValueError, OSError, subprocess.SubprocessError):
            if rejected.exists():
                raise RuntimeError("SYNTHETIC_FORGED_CHECKPOINT_EXISTS")
        else:
            raise RuntimeError("SYNTHETIC_FORGED_SOURCE_HASH_ACCEPTED")
        print("WINDOWS_PRODUCTION_SEALER_FORGED_HASH_REJECTED_PASS")
        # This fixture has not run independent Docker QA; never certify it.
        assert not (saved / "qa-reverification.private.json").exists()
        print("SYNTHETIC_ONLY_NO_MODEL_NO_DOCKER_NO_GAME_ADOPTION")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())