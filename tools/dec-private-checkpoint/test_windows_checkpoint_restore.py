#!/usr/bin/env python3
"""Windows runner: synthetic encrypted Git checkpoint -> real DPAPI wrapper -> actual recovery.

No model and no private user content. A fixed audited public source baseline is
fetched read-only, modified in a disposable local fixture, and then discarded.
No GitHub credentials, protected original writes, model calls or Docker involved.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import shutil
import tarfile
import tempfile

BASE_SHA = "19ef7fd0f3d08ab6c8cd350b44df9ab0eb69a963"
BASE_BLOB = "4cbcbb448737b314b6d5d4bfcdc367e9b1b45f52"
SOURCE = "source/ai/r125-v4h-mezzanine-author-ir.mjs"
CERT_SCOPE = "dec-qwen4b-private-encrypted-source-checkpoint-v1"
PUBLIC_GIT = "https://github.com/ryomashibaba/MinecraftAIBuilder.git"


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
    with tempfile.TemporaryDirectory(prefix="dec-windows-restore-e2e-") as directory:
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
        for i in (1, 2):
            # Keep the actual public source intact; only append a harmless
            # synthetic comment in an isolated local Git copy.
            amended = original + f"\n// DEC-SYNTHETIC-RESTORE-{i}\n".encode()
            source.write_bytes(amended)
            command("git", "add", SOURCE, cwd=work)
            command("git", "commit", "-q", "-m", f"synthetic fixture stage {i}", cwd=work)
            digests.append(digest(amended))
        final = command("git", "rev-parse", "HEAD", cwd=work)
        bundle = root / "source.bundle"
        command("git", "bundle", "create", str(bundle), "HEAD", "^" + BASE_SHA, cwd=work)
        command("git", "bundle", "verify", str(bundle), cwd=work)
        proof = {
            "schema": CERT_SCOPE,
            "scope": "RESEARCH_ONLY_SOURCE_QA_NOT_ADOPTED",
            "base_public_commit": BASE_SHA,
            "final_verified_head": final,
            "source_file": SOURCE,
            "accepted_cycles": [{"cycle": 1, "source_sha256": digests, "qa_commands": [1, 1]}],
            "bundle_sha256": digest(bundle.read_bytes()),
            "game_art_approved": False,
            "model_code_publication_authorized": False,
        }
        archive = root / "checkpoint.tar.gz"
        with tarfile.open(archive, "w:gz") as tf:
            for name, data in (("proof.json", json.dumps(proof).encode()),
                               ("qa-commits.bundle", bundle.read_bytes())):
                member = tarfile.TarInfo(name)
                member.size = len(data)
                member.mode = 0o600
                tf.addfile(member, io.BytesIO(data))
        encrypted = root / "encrypted-fixture.cms"
        command("openssl", "cms", "-encrypt", "-aes-256-gcm", "-binary",
                "-in", str(archive), "-outform", "DER", "-out", str(encrypted),
                "-recip", str(certificate))
        expected = digest(encrypted.read_bytes())
        private_root = appdata / "FreeAutonomyPrivate/DecCheckpointRestored"
        restore_name = "qa-restored-" + final[:12] + ".git"
        runner_args = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
                       "-File", str(wrapper), "-EncryptedCheckpoint", str(encrypted),
                       "-CiphertextSha256", expected, "-BaseRepository", str(base)]
        success = subprocess.run(runner_args, capture_output=True,
                                 text=True, encoding="utf-8", errors="replace", timeout=180)
        if success.returncode != 0 or \
                "DEC_WINDOWS_PRIVATE_CHECKPOINT_RESTORE_PASS_REVIEW_ONLY" not in success.stdout:
            raise RuntimeError("WINDOWS_RESTORE_WRAPPER_POSITIVE_FAILED")
        saved = private_root / restore_name
        if not (saved / "qa-proof.private.json").is_file() or \
                command("git", "--git-dir=" + str(saved), "rev-parse",
                        "refs/heads/qa-restored-review-only") != final:
            raise RuntimeError("WINDOWS_PRIVATE_GIT_RESTORE_INVALID")
        recipient = appdata / "FreeAutonomyPrivate/DecCheckpointRecipient"
        if list(recipient.glob("restore-*")) or list(recipient.rglob("temporary-private-key.pem")):
            raise RuntimeError("WINDOWS_PLAINTEXT_PRIVATE_KEY_RESIDUAL")
        print("WINDOWS_DPAPI_TO_RESTORER_SYNTHETIC_ROUNDTRIP_PASS")
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
        # This fixture has not run independent Docker QA; never certify it.
        assert not (saved / "qa-reverification.private.json").exists()
        print("SYNTHETIC_ONLY_NO_MODEL_NO_DOCKER_NO_GAME_ADOPTION")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())