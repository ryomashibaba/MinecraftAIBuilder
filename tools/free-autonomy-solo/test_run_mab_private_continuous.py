"""Real private Git 2/4/6-commit chain tests with MOCKED model and Docker.

Never makes a real Ollama call, starts Docker, or publishes model source.
"""
from __future__ import annotations

from contextlib import contextmanager
import copy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from prepare_pinned_real_project import (
    load_manifest, source_blob_sha, verify_private_clone)
from promote_private_real_drafts_docker import promote
from run_mab_private_continuous import run_cumulative, PASS


def git(where: Path, *args: str) -> str:
    r = subprocess.run(["git", "-C", str(where), *args], check=True,
                       capture_output=True, text=True, timeout=35)
    return r.stdout.strip()


def hashtext(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class CumulativePrivateGitChainTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.manifest = copy.deepcopy(load_manifest())
        self.lane = self.manifest["project_candidates"]["minecraftaibuilder"]
        self.seed = self.root / "owned-fixture-source"
        self.seed.mkdir()
        source = self.seed / self.lane["source_file"]
        source.parent.mkdir(parents=True)
        source.write_text(
            "export const MEZZANINE_SCHEMA='fixture';\n"
            "export function compileMezzanineAuthorIntent(x) { return x; }\n"
            "export function compileAuthoredPublicMezzanine(x) { return x; }\n",
            encoding="utf-8")
        git(self.seed, "init", "-b", self.lane["research_branch_for_private_clone"])
        git(self.seed, "config", "user.name", "Source Fixture")
        git(self.seed, "config", "user.email", "source@example.invalid")
        git(self.seed, "config", "core.autocrlf", "false")
        git(self.seed, "remote", "add", "origin",
            "https://github.com/" + self.lane["repository"] + ".git")
        git(self.seed, "add", self.lane["source_file"])
        git(self.seed, "commit", "-m", "preexisting protected fixture")
        self.lane["pinned_commit"] = git(self.seed, "rev-parse", "HEAD")
        self.lane["source_blob_sha"] = source_blob_sha(source.read_bytes())
        self.calls = []
        self.generation_count = 0
        self.qa_count = 0
        self.fail_qa_on_check = None
        self.corrupt_git_receipt = False

    @contextmanager
    def lock(self):
        self.calls.append("LOCK_ACQUIRED")
        try:
            yield
        finally:
            self.calls.append("LOCK_RELEASED")

    def model_present(self, model):
        self.calls.append("MODEL_CHECK")
        return model == "qwen3:14b"

    def preflight(self):
        self.calls.append("QA_READY")

    def fake_draft(self, project, model, *, manifest, private_root,
                   use_lock, prepared_workspace=None):
        self.assertFalse(use_lock)
        self.assertEqual(project, "minecraftaibuilder")
        self.assertEqual(model, "qwen3:14b")
        lane = manifest["project_candidates"][project]
        if prepared_workspace is None:
            p = private_root / "PrivateClones" / "minecraftaibuilder-first" / "repo"
            p.parent.mkdir(parents=True)
            shutil.copytree(self.seed, p)
        else:
            p = Path(prepared_workspace)
            self.assertTrue(p.is_relative_to(private_root.resolve()))
        verify_private_clone(p, lane)
        original = (p / lane["source_file"]).read_text(encoding="utf-8")
        self.generation_count += 1
        one = original + f"// model proposed cumulative cycle {self.generation_count} first\n"
        two = one + f"// model proposed cumulative cycle {self.generation_count} second\n"
        d = p.parent
        for i, text in ((1, one), (2, two)):
            (d / f"draft_{i}.private.txt").write_text(text, encoding="utf-8")
        receipt = {
            "schema": "real-project-qwen-local-private-draft-v1",
            "status": "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY",
            "project": project, "model_requested": model,
            "pinned_source_commit": lane["pinned_commit"],
            "pinned_source_blob": lane["source_blob_sha"],
            "git_commits": 0, "git_pushes": 0, "native_QA_executed": False,
            "model_drafts": 2,
            "stages": [
                {"stage": 1, "result": "PRIVATE_UNVERIFIED_DIFF",
                 "source_previous_sha256": hashtext(original),
                 "candidate_sha256": hashtext(one)},
                {"stage": 2, "result": "PRIVATE_UNVERIFIED_DIFF",
                 "source_previous_sha256": hashtext(one),
                 "candidate_sha256": hashtext(two)},
            ],
        }
        rec = d / "SHAREABLE_DRAFT_RESULT.json"
        rec.write_text(json.dumps(receipt), encoding="utf-8")
        self.calls.append("MODEL_TWO_DRAFTS_FAKE")
        return {"status": "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY",
                "model_calls_attempted": 2, "model_drafts": 2,
                "private_receipt_path": str(rec)}

    def qa_command(self, *_a, **_k):
        self.qa_count += 1
        if self.qa_count == self.fail_qa_on_check:
            return 1, "FAKE_ISOLATED_QA_HOLD"
        return 0, "FAKE_ISOLATED_QA_PASS"

    def fake_qa(self, private_dir, project, model, *, manifest, use_lock):
        self.assertFalse(use_lock)
        with patch("promote_private_real_drafts_docker.require_docker_qa_image"), \
             patch("promote_private_real_drafts_docker.docker_run",
                   side_effect=self.qa_command):
            result = promote(private_dir, project, model,
                             manifest=manifest, use_lock=False)
        if result["status"] == "HOLD":
            print("MOCK_WINDOWS_GIT_QA_HOLD_REASON=" +
                  str(result.get("hold_reason", "UNSPECIFIED")), flush=True)
        if self.corrupt_git_receipt and result["status"] == (
                "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS"):
            result["local_qa_commits"][-1]["commit"] = "f" * 40
            # Keep evidence manifest unchanged, so promotion must hold.
        self.calls.append("TWO_QA_STAGES_FAKE")
        return result

    def run_it(self, cycles=3, **kwargs):
        call = dict(
            cycles=cycles, private_root=self.root / "model-session",
            manifest=self.manifest, inspect_model=self.model_present,
            preflight_docker=self.preflight,
            draft=self.fake_draft, qa=self.fake_qa, lock=self.lock)
        call.update(kwargs)
        return run_cumulative(**call)

    def test_six_cumulative_source_revisions_in_one_locked_session(self):
        report, path = self.run_it(cycles=3)
        self.assertEqual(report["status"], PASS, report.get("reason_code"))
        self.assertEqual(report["completed_cycles"], 3)
        self.assertEqual(report["completed_qa_source_stages"], 6)
        self.assertEqual(report["private_review_stages"], 6)
        self.assertEqual(report["model_calls_attempted"], 6)
        self.assertEqual(self.generation_count, 3)
        self.assertEqual(self.qa_count, 6)
        self.assertEqual(self.calls.count("LOCK_ACQUIRED"), 1)
        self.assertEqual(self.calls[-1], "LOCK_RELEASED")
        self.assertEqual(len(report["accepted_cycles"]), 3)
        hashes = [h for cycle in report["accepted_cycles"]
                  for h in cycle["source_sha256"]]
        self.assertEqual(len(hashes), len(set(hashes)))
        self.assertEqual(
            report["base_audited_public_source_commit"], self.lane["pinned_commit"])
        self.assertEqual(git(self.seed, "rev-parse", "HEAD"),
                         self.lane["pinned_commit"])
        self.assertEqual(git(self.seed, "status", "--porcelain"), "")
        self.assertEqual(json.loads(path.read_text())["status"], PASS)
        self.assertNotIn(str(self.root), path.read_text())
        self.assertNotIn("model proposed cumulative", path.read_text())

    def test_cycle_two_second_stage_qa_failure_preserves_cycle_one(self):
        self.fail_qa_on_check = 4
        report, path = self.run_it(cycles=3)
        self.assertEqual(report["status"], "HOLD_PARTIAL_QA_REVIEW_PRESERVED", report.get("reason_code"))
        self.assertEqual(report["completed_cycles"], 1)
        self.assertEqual(report["completed_qa_source_stages"], 3)
        self.assertEqual(report["private_review_stages"], 3)
        self.assertEqual(self.qa_count, 4)
        self.assertEqual(len(report["accepted_cycles"]), 1)
        self.assertEqual(self.calls[-1], "LOCK_RELEASED")
        self.assertEqual(json.loads(path.read_text())["status"],
                         "HOLD_PARTIAL_QA_REVIEW_PRESERVED")

    def test_corrupt_git_head_cannot_advance_to_subsequent_model_cycle(self):
        self.corrupt_git_receipt = True
        report, _ = self.run_it(cycles=3)
        self.assertEqual(report["status"], "HOLD_CUMULATIVE_SOURCE_OR_GIT_INTEGRITY")
        self.assertEqual(self.generation_count, 1)
        self.assertEqual(report["completed_cycles"], 0)
        self.assertEqual(self.calls[-1], "LOCK_RELEASED")

    def test_docker_missing_never_calls_model(self):
        def missing():
            raise RuntimeError("NO_DOCKER")
        report, path = self.run_it(preflight_docker=missing)
        self.assertEqual(report["status"], "HOLD_OFFLINE_DOCKER_NOT_READY_NO_MODEL_CALL")
        self.assertEqual(self.generation_count, 0)
        self.assertEqual(report["model_calls_attempted"], 0)
        self.assertTrue(path.is_file())
        self.assertEqual(self.calls, ["LOCK_ACQUIRED", "LOCK_RELEASED"])

    def test_invalid_cycle_budget_does_not_start_local_model(self):
        for cycles in (0, 4, True):
            self.calls.clear()
            report, _ = self.run_it(cycles=cycles)
            self.assertEqual(report["status"], "HOLD_CUMULATIVE_SOURCE_OR_GIT_INTEGRITY")
            self.assertEqual(report["model_calls_attempted"], 0)
            self.assertEqual(self.calls, [])


if __name__ == "__main__":
    unittest.main()
