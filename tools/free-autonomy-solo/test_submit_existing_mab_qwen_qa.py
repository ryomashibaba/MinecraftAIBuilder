"""Offline genuine Git tests. Model output and GitHub publish are mocked."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch

from prepare_pinned_real_project import load_manifest, source_blob_sha
import submit_existing_mab_qwen_qa as bridge


SOURCE = (
    "export const MEZZANINE_SCHEMA='test';\n"
    "export function compileMezzanineAuthorIntent(x){return x;}\n"
    "export function compileAuthoredPublicMezzanine(x){return x;}\n"
)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def git(root: Path, *args: str) -> str:
    p = subprocess.run(["git", "-C", str(root), *args],
                       check=True, capture_output=True, text=True, timeout=30)
    return p.stdout.strip()


@unittest.skipUnless(shutil.which("node") and shutil.which("git"),
                     "Requires only installed Node parser and Git (no Docker)")
class ExistingPrivateQwenPublicQATests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.base = Path(self.directory.name) / "PrivateClones"
        self.root = self.base / "minecraftaibuilder-fixture"
        self.root.mkdir(parents=True)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.manifest = load_manifest()
        self.lane = self.manifest["project_candidates"]["minecraftaibuilder"]
        self.target = self.repo / self.lane["source_file"]
        self.target.parent.mkdir(parents=True)
        self.target.write_text(SOURCE, encoding="utf-8")
        git(self.repo, "init", "-b", self.lane["research_branch_for_private_clone"])
        git(self.repo, "config", "user.name", "Disposable Fixture")
        git(self.repo, "config", "user.email", "fixture@example.invalid")
        git(self.repo, "config", "core.autocrlf", "false")
        git(self.repo, "remote", "add", "origin",
            "https://github.com/ryomashibaba/MinecraftAIBuilder.git")
        git(self.repo, "add", self.lane["source_file"])
        git(self.repo, "commit", "-m", "fixture baseline")
        self.lane["pinned_commit"] = git(self.repo, "rev-parse", "HEAD")
        self.lane["source_blob_sha"] = source_blob_sha(self.target.read_bytes())
        self.stage1 = SOURCE + "// static-stage-1\n"
        self.stage2 = self.stage1 + "// static-stage-2\n"
        self.hashes = (sha(self.stage1), sha(self.stage2))
        (self.root / "draft_1.private.txt").write_text(
            self.stage1, encoding="utf-8")
        (self.root / "draft_2.private.txt").write_text(
            self.stage2, encoding="utf-8")
        receipt = {
            "schema": "real-project-qwen-local-private-draft-v1",
            "status": "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY",
            "project": "minecraftaibuilder", "model_requested": "qwen3:14b",
            "pinned_source_commit": self.lane["pinned_commit"],
            "pinned_source_blob": self.lane["source_blob_sha"],
            "native_QA_executed": False,
            "model_calls_attempted": 2, "model_drafts": 2,
            "git_commits": 0, "git_pushes": 0,
            "stages": [
                {"stage": 1, "result": "PRIVATE_UNVERIFIED_DIFF",
                 "source_previous_sha256": sha(SOURCE),
                 "candidate_sha256": self.hashes[0]},
                {"stage": 2, "result": "PRIVATE_UNVERIFIED_DIFF",
                 "source_previous_sha256": self.hashes[0],
                 "candidate_sha256": self.hashes[1]},
            ],
        }
        (self.root / "SHAREABLE_DRAFT_RESULT.json").write_text(
            json.dumps(receipt), encoding="utf-8")
        self.old_head = git(self.repo, "rev-parse", "HEAD")

    def common_patches(self):
        return (
            patch.object(bridge, "EXPECTED_DRAFT_HASHES", self.hashes),
            patch.object(bridge, "PINNED_SOURCE_COMMIT",
                         self.lane["pinned_commit"]),
            patch.object(bridge, "load_manifest", return_value=self.manifest),
        )

    def confirm_original_unmodified(self):
        self.assertEqual(self.old_head, git(self.repo, "rev-parse", "HEAD"))
        self.assertEqual(git(self.repo, "status", "--porcelain"), "")
        self.assertEqual(self.target.read_text(encoding="utf-8"), SOURCE)

    def test_decline_explicit_publication_never_pushes(self):
        printer = []
        publisher, observer = Mock(), Mock()
        p0, p1, p2 = self.common_patches()
        with p0, p1, p2:
            result, root = bridge.run(
                self.base, confirm=lambda _: "NO", printer=printer.append,
                publisher=publisher, observer=observer)
        self.assertEqual(root, self.root)
        self.assertEqual(result["status"], "PUBLICATION_DECLINED_NO_UPLOAD")
        self.assertEqual(result["public_git_pushes"], 0)
        self.assertFalse(result["authorized_publication"])
        publisher.assert_not_called()
        observer.assert_not_called()
        self.assertTrue(any("PUBLICATION_REVIEW_STAGE_1" in x for x in printer))
        saved = json.loads((self.root / bridge.OUTPUT_NAME).read_text())
        self.assertNotIn("static-stage", json.dumps(saved))
        self.assertEqual(saved["model_calls"], 0)
        self.confirm_original_unmodified()

    def test_exact_public_confirmation_uses_existing_drafts_once(self):
        publisher = Mock(return_value={
            "status": "PUBLIC_RESEARCH_QA_SUBMITTED",
            "git_remote": "ryomashibaba/MinecraftAIBuilder",
            "git_branch": "research/dec-free-autonomy-solo-pilot-20261104",
            "commit": "a"*40,
        })
        observer = Mock(return_value={
            "status": "EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY",
            "github_run_id": 12345,
            "github_run_url": "https://github.com/example/actions/runs/12345",
        })
        p0, p1, p2 = self.common_patches()
        with p0, p1, p2:
            result, root = bridge.run(
                self.base, confirm=lambda _: "PUBLIC", printer=lambda _: None,
                publisher=publisher, observer=observer)
        self.assertEqual(result["status"], "EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY")
        self.assertTrue(result["authorized_publication"])
        self.assertEqual(result["public_git_pushes"], 1)
        self.assertEqual(result["public_commit"], "a"*40)
        self.assertEqual(result["model_calls"], 0)
        self.assertTrue(result["real_source_qa_verified"])
        publisher.assert_called_once()
        self.assertEqual(publisher.call_args.kwargs, {"authorize": True})
        payload = publisher.call_args.args[0]
        self.assertEqual(payload["stage1_source"], self.stage1)
        self.assertEqual(payload["stage2_source"], self.stage2)
        self.assertEqual(payload["synthetic_fixture"], False)
        observer.assert_called_once_with("a"*40, wait_seconds=900)
        self.confirm_original_unmodified()

    def test_tampered_model_draft_holds_before_prompt_or_publication(self):
        (self.root / "draft_2.private.txt").write_text(
            "untrusted new content", encoding="utf-8")
        publisher, observer, prompt = Mock(), Mock(), Mock()
        p0, p1, p2 = self.common_patches()
        with p0, p1, p2:
            result, root = bridge.run(
                self.base, confirm=prompt, printer=lambda _: None,
                publisher=publisher, observer=observer)
        self.assertEqual(result["status"], "HOLD")
        self.assertIn("PRIVATE_DRAFT_SHA_MISMATCH", result["reason"])
        self.assertEqual(result["public_git_pushes"], 0)
        publisher.assert_not_called()
        observer.assert_not_called()
        prompt.assert_not_called()
        self.confirm_original_unmodified()

    def test_wrong_user_reported_hash_rejects_without_git(self):
        p0, p1, p2 = self.common_patches()
        with p0, p1, p2, patch.object(
                bridge, "EXPECTED_DRAFT_HASHES", ("0"*64, self.hashes[1])):
            with self.assertRaisesRegex(bridge.Hold, "EXACT_APPROVED"):
                bridge.locate_exact_existing_drafts(self.base)
        self.confirm_original_unmodified()

    def test_remote_qa_error_preserves_public_submission_and_does_not_claim_pass(self):
        publisher = Mock(return_value={
            "status": "PUBLIC_RESEARCH_QA_SUBMITTED",
            "git_remote": "ryomashibaba/MinecraftAIBuilder",
            "git_branch": "research/dec-free-autonomy-solo-pilot-20261104",
            "commit": "b"*40,
        })
        observer = Mock(side_effect=OSError("offline network"))
        p0, p1, p2 = self.common_patches()
        with p0, p1, p2:
            result, root = bridge.run(
                self.base, confirm=lambda _: "PUBLIC", printer=lambda _: None,
                publisher=publisher, observer=observer)
        self.assertEqual(result["status"], "PUBLIC_SUBMITTED_QA_HOLD")
        self.assertEqual(result["public_git_pushes"], 1)
        self.assertEqual(result["public_commit"], "b"*40)
        self.assertFalse(result["real_source_qa_verified"])
        self.assertEqual(json.loads((root / bridge.OUTPUT_NAME).read_text())[
            "public_commit"], "b"*40)
        self.confirm_original_unmodified()


if __name__ == "__main__":
    unittest.main()
