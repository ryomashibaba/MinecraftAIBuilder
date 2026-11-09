#!/usr/bin/env python3
"""Genuine Qwen3:4b TWO consecutive cumulative SOURCE cycles, disposable CI.

Every next model sees the previous independently Docker-QA-passed source
commit, not a fresh original. NO Windows user 14B, generated-code publication,
GitHub push, main/PR/Pages/world writes, paid API or ART/gameplay certification.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile
import uuid

from real_small_model_ci_once import MODEL, IMAGE, cmd, wait_ready
from run_mab_private_continuous import PASS, run_cumulative

EXPECTED_CYCLES = 2
EXPECTED_QA_STAGES = 4
SUCCESS = "GENUINE_QWEN4B_TWO_CUMULATIVE_CYCLES_PRIVATE_SOURCE_QA_ONLY"

# Only these audited, host-authored rejection codes may leave PRIVATE QA.
# A code-shaped model string is NOT evidence that publication is safe.
DRAFT_REJECTION_EXPORT_ALLOWLIST = frozenset({
    "MODEL_PATCH_NOT_JSON",
    "PATCH_FIELDS_NOT_STRINGS",
    "PATCH_HAS_NO_MEANINGFUL_CHANGE_OR_TOO_LARGE",
    "PATCH_KEYS_INVALID",
    "PATCH_MAB_ADDITIVE_GUARD_ONLY",
    "PATCH_MAB_DUPLICATE_ADDITIVE_GUARD",
    "PATCH_MAB_FIXED_STAIR_TREAD_LIMIT_FORBIDDEN",
    "PATCH_MAB_GUARD_SIDE_EFFECT_FORBIDDEN",
    "PATCH_MATCH_MUST_BE_UNIQUE",
    "PATCH_NOOP_EMPTY_OR_OVERSIZED",
    "PATCH_NO_UNIQUE_TRUSTED_EDIT_SLOT",
    "PATCH_PROJECT_UNKNOWN",
    "PATCH_SLOT_INVALID",
    "PATCH_SLOT_KEYS_INVALID",
    "PATCH_SOURCE_CYCLE_OUTSIDE_BUDGET",
    "PROTECTED_PUBLIC_CONTRACT_ANCHOR_REMOVED",
})


_OWNER_LABEL = "jp.december2026.qwen4b.owner"


def _owned_container_cleanup_verified(
    container: str, owner_token: str, started_container_id: str | None
) -> bool:
    """Delete only the exact run-created container, fail closed on ID drift.

    Unverified docker-run results never grant deletion authority. Confirm both
    the immutable startup ID and unpredictable label via daemon inspection.
    """
    if (re.fullmatch(r"[0-9a-f]{32}", owner_token) is None or
            container != "dec-qwen4b-two-cycles-" + owner_token or
            (started_container_id is not None and
             (not isinstance(started_container_id, str) or
              re.fullmatch(r"[0-9a-f]{64}", started_container_id) is None))):
        return False
    try:
        # If docker run failed or returned an unverifiable ID, do NOT remove
        # a same-name object, even if its label is identical to our token.
        if started_container_id is not None:
            check = subprocess.run(
                ["docker", "inspect", "--format",
                 '{{.Id}}|{{index .Config.Labels "' + _OWNER_LABEL + '"}}',
                 container], capture_output=True, text=True, timeout=25,
                check=False)
            if check.returncode == 0:
                fields = check.stdout.strip().split("|", 1)
                if (len(fields) != 2 or
                        fields[0] != started_container_id or
                        fields[1] != owner_token):
                    return False
                # Delete ONLY the exact immutable ID returned by docker run.
                removal = subprocess.run(
                    ["docker", "rm", "-f", started_container_id],
                    capture_output=True, text=True, timeout=25, check=False)
                if removal.returncode != 0:
                    return False
        # A same-name absence is NOT sufficient: Docker allows renaming a
        # still-running owner container. Check full immutable IDs AND names.
        probe = subprocess.run(
            ["docker", "container", "ls", "--all", "--no-trunc",
             "--format", "{{.ID}}|{{.Names}}"],
            capture_output=True, text=True, timeout=25, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return False
    if probe.returncode != 0:
        return False
    for line in probe.stdout.splitlines():
        parts = line.split("|", 1)
        if len(parts) != 2 or re.fullmatch(r"[0-9a-f]{64}", parts[0]) is None:
            return False  # Never certify success from malformed daemon output.
        if parts[1] == container or parts[0] == started_container_id:
            return False
    return True



_CHECKPOINT_APPROVAL = "APPROVE_ENCRYPTED_QA_CHECKPOINT_ONLY"
_CHECKPOINT_FILENAME = "dec-qwen4b-private-qa.cms"


def _checkpoint_cert_or_none() -> str | None:
    """No default publication. Approval and recipient certificate are both required."""
    approval = os.environ.get("DEC_QWEN4B_ENCRYPTED_CHECKPOINT_APPROVED", "")
    cert = os.environ.get("DEC_QWEN4B_RECIPIENT_CERT_PEM", "")
    if not approval:
        # Never consume genuine model cycles if QA-passed source would vanish
        # when this disposable runner shuts down.
        raise ValueError("PRIVATE_CHECKPOINT_CONSENT_MISSING_NO_MODEL_CALL")
    if approval != _CHECKPOINT_APPROVAL or not cert.startswith(
            "-----BEGIN CERTIFICATE-----\n"):
        raise ValueError("PRIVATE_CHECKPOINT_APPROVAL_OR_RECIPIENT_MISSING")
    if len(cert.encode()) > 16_384:
        raise ValueError("PRIVATE_CHECKPOINT_CERT_TOO_LARGE")
    return cert


def _git_probe(repo: Path, *args: str, binary: bool = False) -> str | bytes:
    p = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, timeout=45,
        stdin=subprocess.DEVNULL, check=False)
    if p.returncode:
        raise ValueError("PRIVATE_CHECKPOINT_GIT_AUDIT_FAILED")
    return p.stdout if binary else p.stdout.decode("utf-8").strip()


def _verified_private_checkpoint(
    private_base: Path, report_path: Path, summary: dict,
    recipient_certificate: str, output_path: Path,
) -> str:
    """Encrypted Git bundle of ONLY independently QA-approved model commits.

    No raw source or private path leaves the runner. Caller must first attest
    that its owned inference container has exited and is absent.
    """
    private_base = private_base.resolve(strict=True)
    root = report_path.parent.resolve(strict=True)
    if (private_base.is_symlink() or report_path.is_symlink() or
            not re.fullmatch(r"m-[a-f0-9]{16}", root.name) or
            root.parent != private_base or
            report_path.name != "SHAREABLE_MAB_CUMULATIVE_SOURCE_QA.json"):
        raise ValueError("PRIVATE_CHECKPOINT_REPORT_ORIGIN_INVALID")
    original_report = json.loads(report_path.read_text(encoding="utf-8"))
    if original_report != summary:
        raise ValueError("PRIVATE_CHECKPOINT_STATUS_CHANGED")
    count = summary.get("completed_cycles")
    accepted = summary.get("accepted_cycles")
    base_sha = summary.get("base_audited_public_source_commit")
    if (type(count) is not int or not 1 <= count <= 2 or
            not isinstance(accepted, list) or len(accepted) != count or
            type(summary.get("completed_qa_source_stages")) is not int or
            summary["completed_qa_source_stages"] != count * 2 or
            summary.get("private_review_stages") != count * 2 or
            summary.get("github_pushes") != 0 or
            summary.get("original_source_modified") is not False or
            not isinstance(base_sha, str) or
            re.fullmatch(r"[0-9a-f]{40}", base_sha) is None):
        raise ValueError("PRIVATE_CHECKPOINT_NOT_QA_APPROVED")
    for n, item in enumerate(accepted, 1):
        if (not isinstance(item, dict) or item.get("cycle") != n or
                not isinstance(item.get("source_sha256"), list) or
                len(item["source_sha256"]) != 2 or
                any(not isinstance(v, str) or
                    re.fullmatch(r"[a-f0-9]{64}", v) is None
                    for v in item["source_sha256"])):
            raise ValueError("PRIVATE_CHECKPOINT_CYCLE_RECEIPT_INVALID")
    last = root / f"c{count}" / "PrivateClones"
    if last.is_symlink() or not last.is_dir():
        raise ValueError("PRIVATE_CHECKPOINT_QA_PARENT_MISSING")
    candidates = [q.parent for q in last.glob("minecraftaibuilder-*/SHAREABLE_PROMOTION_RESULT.json")]
    if len(candidates) != 1:
        raise ValueError("PRIVATE_CHECKPOINT_QA_AMBIGUOUS")
    stage = candidates[0]
    receipt = stage / "SHAREABLE_PROMOTION_RESULT.json"
    if (stage.is_symlink() or receipt.is_symlink() or
            stage.resolve(strict=True).parent != last.resolve(strict=True)):
        raise ValueError("PRIVATE_CHECKPOINT_QA_PATH_ESCAPE")
    qa = json.loads(receipt.read_text(encoding="utf-8"))
    repo = stage / Path(str(qa.get("qa_workspace_private", ""))).name
    if (not isinstance(qa.get("qa_workspace_private"), str) or
            Path(qa["qa_workspace_private"]).resolve(strict=True) != repo.resolve(strict=True) or
            not repo.name.startswith("qa-clone-") or repo.is_symlink() or
            not (repo / ".git").is_dir() or
            qa.get("status") != "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS" or
            qa.get("completed_stages") != 2 or
            qa.get("private_source_review_stages") != 2 or
            qa.get("github_pushes") != 0):
        raise ValueError("PRIVATE_CHECKPOINT_QA_RECEIPT_INVALID")
    review_dir = Path(str(qa.get("private_source_review_directory", "")))
    if (review_dir.is_symlink() or review_dir.parent.resolve(strict=True) != stage.resolve(strict=True)):
        raise ValueError("PRIVATE_CHECKPOINT_PRIVATE_REVIEW_PATH_INVALID")
    manifest = json.loads((review_dir / "REVIEW_ONLY_PRIVATE_MANIFEST.json").read_text(encoding="utf-8"))
    source_file = manifest.get("source_file")
    if (manifest.get("schema") != "dec-private-source-review-after-real-qa-v1" or
            manifest.get("status") != "TWO_SOURCE_STAGES_REVIEW_ONLY_ART_HOLD" or
            manifest.get("human_approval") is not False or
            manifest.get("github_pushes") != 0 or
            not isinstance(source_file, str) or
            re.fullmatch(r"source/ai/[A-Za-z0-9_-]+\.mjs", source_file) is None or
            _git_probe(repo, "status", "--porcelain=v1", "--untracked-files=all") or
            _git_probe(repo, "rev-parse", "HEAD") !=
            qa["local_qa_commits"][1]["commit"]):
        raise ValueError("PRIVATE_CHECKPOINT_SOURCE_INTEGRITY_INVALID")
    commit_list = _git_probe(repo, "rev-list", "--first-parent", "--reverse", f"{base_sha}..HEAD").splitlines()
    if len(commit_list) != 2 * count:
        raise ValueError("PRIVATE_CHECKPOINT_COMMIT_COUNT_INVALID")
    previous = base_sha
    for i, commit in enumerate(commit_list):
        if (_git_probe(repo, "rev-parse", commit + "^") != previous or
                _git_probe(repo, "diff", "--name-only", previous, commit) != source_file):
            raise ValueError("PRIVATE_CHECKPOINT_ANCESTRY_OR_SCOPE_INVALID")
        row = accepted[i // 2]
        expected = row["source_sha256"][i % 2]
        if hashlib.sha256(_git_probe(repo, "show", f"{commit}:{source_file}", binary=True)).hexdigest() != expected:
            raise ValueError("PRIVATE_CHECKPOINT_GENERATED_BYTES_MISMATCH")
        previous = commit
    final_sha = previous
    qa_commits = qa["local_qa_commits"]
    if ([x.get("commit") for x in qa_commits] != commit_list[-2:] or
            manifest.get("project_source_commit") != qa.get("source_commit") or
            manifest.get("project_source_blob") != qa.get("source_blob")):
        raise ValueError("PRIVATE_CHECKPOINT_LAST_QA_CHAIN_MISMATCH")
    if hashlib.sha256((repo / source_file).read_bytes()).hexdigest() != accepted[-1]["source_sha256"][1]:
        raise ValueError("PRIVATE_CHECKPOINT_WORKTREE_BYTES_MISMATCH")
    if output_path.exists() or output_path.is_symlink():
        raise ValueError("PRIVATE_CHECKPOINT_OUTPUT_ALREADY_EXISTS")
    with tempfile.TemporaryDirectory(prefix="qa-seal-") as scratch:
        work = Path(scratch)
        cert_file, bundle, archive, encrypted = [work / x for x in
            ("recipient.pem", "qa-commits.bundle", "checkpoint.tar.gz", "encrypted.cms")]
        cert_file.write_text(recipient_certificate, encoding="utf-8")
        cert_file.chmod(0o600)
        result = subprocess.run(["openssl", "x509", "-in", str(cert_file),
            "-checkend", "0", "-noout"], capture_output=True, timeout=20)
        if result.returncode:
            raise ValueError("PRIVATE_CHECKPOINT_RECIPIENT_CERT_INVALID")
        _git_probe(repo, "bundle", "create", str(bundle), "HEAD", "^" + base_sha)
        _git_probe(repo, "bundle", "verify", str(bundle))
        if bundle.stat().st_size > 16_000_000:
            raise ValueError("PRIVATE_CHECKPOINT_BUNDLE_TOO_LARGE")
        proof = {
            "schema": "dec-qwen4b-private-encrypted-source-checkpoint-v1",
            "scope": "RESEARCH_ONLY_SOURCE_QA_NOT_ADOPTED",
            "base_public_commit": base_sha,
            "final_verified_head": final_sha,
            "source_file": source_file,
            "accepted_cycles": accepted,
            "bundle_sha256": hashlib.sha256(bundle.read_bytes()).hexdigest(),
            "game_art_approved": False,
            "model_code_publication_authorized": False,
        }
        payload = json.dumps(proof, sort_keys=True).encode("utf-8")
        with tarfile.open(archive, "w:gz") as tf:
            for name, data in (("proof.json", payload),
                               ("qa-commits.bundle", bundle.read_bytes())):
                info = tarfile.TarInfo(name)
                info.size = len(data)
                info.mode = 0o600
                tf.addfile(info, io.BytesIO(data))
        if archive.stat().st_size > 16_500_000:
            raise ValueError("PRIVATE_CHECKPOINT_ARCHIVE_TOO_LARGE")
        cmd = ["openssl", "cms", "-encrypt", "-aes-256-gcm", "-binary",
               "-in", str(archive), "-outform", "DER", "-out", str(encrypted),
               "-recip", str(cert_file)]
        p = subprocess.run(cmd, capture_output=True, timeout=40)
        if p.returncode or not encrypted.is_file() or encrypted.stat().st_size == 0:
            raise ValueError("PRIVATE_CHECKPOINT_ENCRYPTION_FAILED")
        # Only the encrypted bytes are eligible to cross the PRIVATE boundary.
        p = subprocess.run(["openssl", "cms", "-cmsout", "-inform", "DER",
                            "-in", str(encrypted), "-out", os.devnull],
                           capture_output=True, timeout=20)
        if p.returncode:
            raise ValueError("PRIVATE_CHECKPOINT_CMS_STRUCTURE_INVALID")
        output_path.write_bytes(encrypted.read_bytes())
        output_path.chmod(0o600)
    return hashlib.sha256(output_path.read_bytes()).hexdigest()

def experiment() -> dict:
    result = {
        "schema": "dec-real-qwen4b-two-cumulative-source-qa-v1",
        "status": "HOLD",
        "model_requested": MODEL,
        "genuine_ollama_started": False,
        "requested_cycles": EXPECTED_CYCLES,
        "completed_cycles": 0,
        "model_calls_attempted": 0,
        "qa_source_stages_verified": 0,
        "private_review_stages": 0,
        "cross_cycle_git_head_verified": False,
        "isolated_docker_qa_passed": False,
        "user_windows_accessed": False,
        "real_qwen14b_executed": False,
        "source_art_certified": False,
        "minecraft_world_writes": 0,
        "remote_git_pushes": 0,
        "paid_api_calls": 0,
        "raw_model_source_uploaded": False,
        "container_cleanup_verified": False,
        "encrypted_checkpoint_prepared": False,
    }
    try:
        recipient_cert = _checkpoint_cert_or_none()
    except ValueError:
        result["status"] = "HOLD_PRIVATE_CHECKPOINT_OPT_IN_MISSING_NO_MODEL_CALL"
        return result
    with tempfile.TemporaryDirectory(prefix="dec-qwen4b-two-cycle-") as ephemeral:
        root = Path(ephemeral)
        os.environ["LOCALAPPDATA"] = str(root / "lock")
        (root / "lock").mkdir()
        owner_token = uuid.uuid4().hex
        container = "dec-qwen4b-two-cycles-" + owner_token
        status, receipt = None, None
        started_container_id = None
        try:
            observed_id = cmd(["docker", "run", "-d", "--rm", "--name", container,
                 "--label", _OWNER_LABEL + "=" + owner_token,
                 "--cap-drop=ALL", "--security-opt=no-new-privileges",
                 "--pids-limit", "128", "--memory", "5g", "--cpus", "3",
                 "-p", "127.0.0.1:11434:11434", IMAGE], timeout=55)
            if (not isinstance(observed_id, str) or
                    re.fullmatch(r"[0-9a-f]{64}", observed_id) is None):
                raise ValueError("OWNED_DOCKER_START_ID_NOT_VALID")
            started_container_id = observed_id
            wait_ready()
            cmd(["docker", "exec", container, "ollama", "pull", MODEL],
                timeout=450)
            wait_ready()
            result["genuine_ollama_started"] = True
            status, receipt = run_cumulative(
                model=MODEL, cycles=EXPECTED_CYCLES,
                private_root=root / "source-private")
            # Source stays on ephemeral disk; only hashes and counters.
            result["model_calls_attempted"] = status.get("model_calls_attempted", 0)
            result["completed_cycles"] = status.get("completed_cycles", 0)
            result["qa_source_stages_verified"] = status.get(
                "completed_qa_source_stages", 0)
            result["private_review_stages"] = status.get("private_review_stages", 0)
            result["source_status"] = status.get("status", "UNKNOWN")
            result["source_commit_audited"] = status.get(
                "base_audited_public_source_commit")
            if status.get("qa_hold_reason_code"):
                result["qa_hold_reason_code"] = status["qa_hold_reason_code"]
            if status.get("draft_hold_reason_code"):
                result["draft_hold_reason_code"] = status["draft_hold_reason_code"]
            # Export codes only, never private model text, paths or patches.
            rejected = status.get("draft_rejection_reason_codes")
            if isinstance(rejected, list):
                safe_codes = sorted({
                    code for code in rejected[:8]
                    if isinstance(code, str)
                    and code in DRAFT_REJECTION_EXPORT_ALLOWLIST
                    and code != "PRIVATE_DIAGNOSTIC_NOT_SHAREABLE"
                })
                if safe_codes:
                    result["draft_rejection_reason_codes"] = safe_codes
            if status.get("reason_code"):
                result["reason_code"] = status["reason_code"]
            accepted = status.get("accepted_cycles", [])
            if (status.get("status") == PASS
                    and result["completed_cycles"] == EXPECTED_CYCLES
                    and result["qa_source_stages_verified"] == EXPECTED_QA_STAGES
                    and result["private_review_stages"] == EXPECTED_QA_STAGES
                    and result["model_calls_attempted"] >= EXPECTED_QA_STAGES
                    and isinstance(accepted, list)
                    and len(accepted) == EXPECTED_CYCLES
                    and len({v for cycle in accepted
                             for v in cycle.get("source_sha256", [])})
                        == EXPECTED_QA_STAGES
                    and status.get("github_pushes") == 0
                    and status.get("original_source_modified") is False):
                result["status"] = SUCCESS
                result["cross_cycle_git_head_verified"] = True
                result["isolated_docker_qa_passed"] = True
            else:
                result["status"] = "HOLD_GENUINE_TWO_CYCLE_SOURCE"
        except Exception as exc:
            result["status"] = "HOLD_OLLAMA_OR_CI_INFRASTRUCTURE"
            result["exception_type"] = type(exc).__name__
        finally:
            result["container_cleanup_verified"] = _owned_container_cleanup_verified(
                container, owner_token, started_container_id)
            if not result["container_cleanup_verified"]:
                # Successful SOURCE QA is not a completed safe owned run.
                result["status"] = "HOLD_OWNED_CONTAINER_CLEANUP_UNVERIFIED"
        # Raw model source never leaves PRIVATE. Ciphertext export needs
        # explicit opt-in and a trusted recipient certificate.
        if (recipient_cert and result["container_cleanup_verified"] and
                status is not None and receipt is not None and
                status.get("completed_cycles", 0) > 0):
            try:
                destination = os.environ.get("RUNNER_TEMP")
                if not destination or Path(destination).is_symlink():
                    raise ValueError("PRIVATE_CHECKPOINT_DESTINATION_UNTRUSTED")
                checkpoint = Path(destination) / _CHECKPOINT_FILENAME
                result["encrypted_checkpoint_sha256"] = _verified_private_checkpoint(
                    root / "source-private", Path(receipt), status,
                    recipient_cert, checkpoint)
                result["encrypted_checkpoint_prepared"] = True
            except (OSError, ValueError, TypeError, KeyError,
                    subprocess.SubprocessError):
                result["checkpoint_hold_reason"] = "PRIVATE_CHECKPOINT_NOT_PROVEN"
                result["status"] = "HOLD_PRIVATE_CHECKPOINT_NOT_SAVED"
        if (recipient_cert and result["status"] == SUCCESS and
                not result["encrypted_checkpoint_prepared"]):
            result["status"] = "HOLD_PRIVATE_CHECKPOINT_NOT_SAVED"
    return result


def main() -> int:
    outcome = experiment()
    print(json.dumps(outcome, sort_keys=True, indent=2, ensure_ascii=False))
    out = os.environ.get("RUNNER_TEMP")
    if out:
        (Path(out) / "dec-qwen4b-two-cycles-source-sanitized.json").write_text(
            json.dumps(outcome, sort_keys=True, indent=2) + "\n",
            encoding="utf-8")
    return 0 if outcome["status"] == SUCCESS else 2


if __name__ == "__main__":
    raise SystemExit(main())
