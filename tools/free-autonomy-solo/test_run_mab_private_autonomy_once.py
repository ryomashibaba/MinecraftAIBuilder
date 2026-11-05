"""Orchestrator tests: mocked model/QA only, no real Ollama/Docker work."""
from __future__ import annotations

from contextlib import contextmanager
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from prepare_pinned_real_project import load_manifest
from run_mab_private_autonomy_once import (
    run_single_session, PASS, _verified_private_evidence,
)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class PrivateOneSessionAutonomyTests(unittest.TestCase):
    def setUp(self):
        hold = tempfile.TemporaryDirectory()
        self.addCleanup(hold.cleanup)
        self.root = Path(hold.name)
        self.config = load_manifest()
        self.events = []
        self.draft_root = None

    @contextmanager
    def one_project_lock(self):
        self.events.append("LOCK_START")
        try:
            yield
        finally:
            self.events.append("LOCK_END")

    def available(self):
        self.events.append("DOCKER_AVAILABLE")

    def installed(self, model):
        self.events.append("MODEL_TAGS_CHECKED")
        return model == "qwen3:14b"

    def draft(self, project, model, *, manifest, private_root, use_lock):
        self.assertEqual(self.events[0], "LOCK_START")
        self.assertIn("DOCKER_AVAILABLE", self.events)
        self.assertIn("MODEL_TAGS_CHECKED", self.events)
        self.assertFalse(use_lock)
        self.assertEqual(project, "minecraftaibuilder")
        self.assertEqual(model, "qwen3:14b")
        base = private_root / "PrivateClones" / "minecraftaibuilder-fixture"
        base.mkdir(parents=True)
        self.draft_root = base
        (base / "SHAREABLE_DRAFT_RESULT.json").write_text("{}", encoding="utf-8")
        self.events.append("TWO_MODEL_DRAFTS_CREATED_FAKE")
        return {"status": "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY",
                "private_receipt_path": str(base / "SHAREABLE_DRAFT_RESULT.json"),
                "model_calls_attempted": 2, "model_drafts": 2}

    def qa(self, directory, project, model, *, manifest, use_lock, partial=False,
           corrupt=False):
        self.assertFalse(use_lock)
        self.assertEqual(directory, self.draft_root)
        self.assertIn("TWO_MODEL_DRAFTS_CREATED_FAKE", self.events)
        self.events.append("INDEPENDENT_QA_FAKE")
        review = directory / "private-source-review-test"
        review.mkdir()
        rows, commits = [], []
        for stage in range(1, (2 if partial else 3)):
            original = "public-derived safe fixture " + str(stage)
            diff = "diff --git a/a b/a\n" + str(stage) + "\n"
            (review / f"STAGE_{stage}_PRIVATE_SOURCE.txt").write_text(
                original, encoding="utf-8")
            (review / f"STAGE_{stage}_PRIVATE_DIFF.patch").write_text(
                diff, encoding="utf-8")
            digest = sha(original)
            rows.append({"stage": stage, "commit": str(stage) * 40,
                         "parent": str(stage-1) * 40,
                         "candidate_sha256": digest,
                         "patch_sha256": sha(diff), "independent_qa_commands_passed": 1})
            commits.append({"stage": stage, "commit": str(stage) * 40,
                            "candidate_sha256": digest,
                            "qa_checks_passed": 1})
        if corrupt:
            (review / "STAGE_2_PRIVATE_SOURCE.txt").write_text(
                "tampered fixture", encoding="utf-8")
        obj = {
            "schema": "dec-private-source-review-after-real-qa-v1",
            "status": ("PARTIAL_REVIEW_ONLY_NOT_CERTIFIED"
                       if partial else "TWO_SOURCE_STAGES_REVIEW_ONLY_ART_HOLD"),
            "project_source_commit": manifest["project_candidates"][project]["pinned_commit"],
            "project_source_blob": manifest["project_candidates"][project]["source_blob_sha"],
            "source_file": manifest["project_candidates"][project]["source_file"],
            "human_approval": False, "real_gameplay_or_art_certified": False,
            "github_pushes": 0, "source_stages": rows,
        }
        (review / "REVIEW_ONLY_PRIVATE_MANIFEST.json").write_text(
            json.dumps(obj), encoding="utf-8")
        return {"status": ("HOLD" if partial else
                            "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS"),
                "completed_stages": len(rows),
                "private_source_review_stages": len(rows),
                "private_source_review_directory": str(review),
                "local_qa_commits": commits, "github_pushes": 0}

    def launch(self, **kwargs):
        arguments = dict(
            private_root=self.root, manifest=self.config,
            inspect_model=self.installed, preflight_docker=self.available,
            draft=self.draft, lock=self.one_project_lock,
        )
        arguments.update(kwargs)
        return run_single_session(**arguments)

    def test_two_verified_private_stages_complete_under_single_os_lock(self):
        summary, path = self.launch(qa=self.qa)
        self.assertEqual(summary["status"], PASS)
        self.assertEqual(summary["model_calls_attempted"], 2)
        self.assertEqual(summary["verified_qa_stages"], 2)
        self.assertEqual(summary["private_review_stages"], 2)
        self.assertEqual(len(summary["verified_review_source_sha256"]), 2)
        self.assertEqual(summary["github_pushes"], 0)
        self.assertFalse(summary["real_gameplay_certified"])
        self.assertFalse(summary["model_generated_source_run_on_host"])
        self.assertEqual(self.events[0], "LOCK_START")
        self.assertEqual(self.events[-1], "LOCK_END")
        self.assertEqual(self.events.count("LOCK_START"), 1)
        self.assertEqual(json.loads(path.read_text())["status"], PASS)
        self.assertNotIn(str(self.root), path.read_text())

    def test_second_stage_qa_failure_retains_private_first_stage(self):
        summary, path = self.launch(
            qa=lambda *args, **kwargs: self.qa(*args, **kwargs, partial=True))
        self.assertEqual(summary["status"], "HOLD_PARTIAL_SOURCE_QA_REVIEW_PRESERVED")
        self.assertEqual(summary["private_review_stages"], 1)
        self.assertEqual(self.events[-1], "LOCK_END")
        self.assertTrue((self.draft_root / "private-source-review-test" /
                         "STAGE_1_PRIVATE_DIFF.patch").is_file())
        self.assertFalse((self.draft_root / "private-source-review-test" /
                          "STAGE_2_PRIVATE_DIFF.patch").exists())
        self.assertNotIn(str(self.draft_root), path.read_text())

    def test_evidence_tamper_never_promotes_fake_success(self):
        summary, path = self.launch(
            qa=lambda *args, **kwargs: self.qa(*args, **kwargs, corrupt=True))
        self.assertEqual(summary["status"], "HOLD_INFRA_OR_EVIDENCE_INTEGRITY")
        self.assertEqual(summary["reason_code"],
                         "PRIVATE_REVIEW_RECORDED_HASH_OR_QA_MISMATCH")
        self.assertEqual(summary["verified_review_source_sha256"], [])
        self.assertEqual(json.loads(path.read_text())["status"],
                         "HOLD_INFRA_OR_EVIDENCE_INTEGRITY")

    def test_missing_docker_holds_before_model_tags_and_inference(self):
        def offline():
            raise RuntimeError("DOCKER_DAEMON_OFFLINE")
        summary, path = self.launch(
            preflight_docker=offline,
            qa=lambda *args, **kw: self.fail("QA without Docker"))
        self.assertEqual(summary["status"], "HOLD_EXISTING_OFFLINE_DOCKER_QA_UNAVAILABLE")
        self.assertEqual(summary["model_calls_attempted"], 0)
        self.assertEqual(self.events, ["LOCK_START", "LOCK_END"])
        self.assertTrue(path.is_file())

    def test_no_installed_model_never_clones_or_calls_draft(self):
        summary, _ = self.launch(model="nonexistent:0b",
                                 qa=lambda *args, **kw: self.fail("QA"))
        self.assertEqual(summary["status"], "HOLD_MODEL_NOT_INSTALLED_NO_DOWNLOAD")
        self.assertEqual(summary["model_calls_attempted"], 0)
        self.assertNotIn("TWO_MODEL_DRAFTS_CREATED_FAKE", self.events)
        self.assertEqual(self.events, [
            "LOCK_START", "DOCKER_AVAILABLE", "MODEL_TAGS_CHECKED", "LOCK_END"])

    def test_unapproved_model_string_refused_without_real_work(self):
        summary, _ = self.launch(model="../escape\\n",
                                 qa=lambda *args, **kw: self.fail("QA"))
        self.assertEqual(summary["status"], "HOLD_INFRA_OR_EVIDENCE_INTEGRITY")
        self.assertEqual(summary["reason_code"], "SOURCE_OR_PROJECT_POLICY_INVALID")
        self.assertEqual(self.events, [])


if __name__ == "__main__":
    unittest.main()
