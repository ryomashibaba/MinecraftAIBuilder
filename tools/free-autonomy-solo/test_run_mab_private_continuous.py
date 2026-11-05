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
        if use_lock:
            raise ValueError("TEST_PRIVATE_DRAFT_REACQUIRED_LOCK")
        if project != "minecraftaibuilder":
            raise ValueError("TEST_UNEXPECTED_PROJECT_LANE")
        if model != "qwen3:14b":
            raise ValueError("TEST_UNEXPECTED_MODEL_LANE")
        lane = manifest["project_candidates"][project]
        if prepared_workspace is None:
            p = private_root / "PrivateClones" / "minecraftaibuilder-first" / "repo"
            p.parent.mkdir(parents=True)
            shutil.copytree(self.seed, p)
        else:
            p = Path(prepared_workspace)
            if not p.resolve(strict=True).is_relative_to(private_root.resolve(strict=True)):
                raise ValueError("TEST_PREPARED_WORKSPACE_OUTSIDE_CYCLE")
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
        if use_lock:
            raise ValueError("TEST_PRIVATE_QA_REACQUIRED_LOCK")
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
        self.assertEqual(report.get("qa_hold_reason_code"),
                         "INDEPENDENT_DOCKER_QA_STAGE2_CHECK0_RC1")
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

    def test_untrusted_qa_failure_diagnostics_do_not_leak_to_shareable_receipt(self):
        def privacy_bad_qa(private_dir, project, model, *, manifest, use_lock):
            return {"status": "HOLD", "completed_stages": 0,
                    "private_source_review_stages": 0,
                    "hold_reason": "SECRET_USER_PATH C:\\private\\token"}
        report, receipt = self.run_it(cycles=1, qa=privacy_bad_qa)
        self.assertEqual(report["status"], "HOLD_PARTIAL_QA_REVIEW_PRESERVED")
        self.assertEqual(report["qa_hold_reason_code"],
                         "PRIVATE_DIAGNOSTIC_NOT_SHAREABLE")
        self.assertNotIn("SECRET_USER_PATH", receipt.read_text(encoding="utf-8"))

    def test_known_draft_failure_code_is_preserved_without_qa(self):
        def unaccepted(*args, **kwargs):
            return {"status": "HOLD", "model_calls_attempted": 1,
                    "hold_reason": "STAGE_1_DRAFT_NOT_ACCEPTED"}
        report, _ = self.run_it(cycles=1, draft=unaccepted)
        self.assertEqual(report["draft_hold_reason_code"],
                         "STAGE_1_DRAFT_NOT_ACCEPTED")
        self.assertEqual(report["model_calls_attempted"], 1)
        self.assertEqual(report["completed_qa_source_stages"], 0)
        self.assertEqual(self.calls[-1], "LOCK_RELEASED")


    def stop_after_two_qa_cycles(self):
        def stop_third_cycle(project, model, **kwargs):
            if self.generation_count >= 2:
                self.calls.append("THIRD_CYCLE_MODEL_HOLD_FAKE")
                return {"status": "HOLD", "model_calls_attempted": 2,
                        "hold_reason": "STAGE_1_DRAFT_NOT_ACCEPTED"}
            return self.fake_draft(project, model, **kwargs)
        report, receipt = self.run_it(cycles=3, draft=stop_third_cycle)
        self.assertEqual(report["completed_cycles"], 2)
        self.assertEqual(report["completed_qa_source_stages"], 4)
        self.assertEqual(report["private_review_stages"], 4)
        self.assertEqual(report["status"],
                         "HOLD_CYCLE_MODEL_DRAFT_FAILED_PRIOR_QA_PRESERVED")
        self.assertEqual(self.generation_count, 2)
        self.assertEqual(self.calls[-1], "LOCK_RELEASED")
        return report, receipt

    def test_resume_only_third_cycle_with_four_real_git_qa_commits_preserved(self):
        first, receipt = self.stop_after_two_qa_cycles()
        earlier_contents = receipt.read_bytes()
        self.calls.clear()
        resumed, next_receipt = self.run_it(
            cycles=3, resume_latest=True, draft=self.fake_draft)
        self.assertEqual(resumed["status"], PASS, resumed.get("reason_code"))
        self.assertEqual(resumed["completed_cycles"], 3)
        self.assertEqual(resumed["completed_qa_source_stages"], 6)
        self.assertEqual(resumed["private_review_stages"], 6)
        self.assertEqual(resumed["resumed_prior_verified_cycles"], 2)
        self.assertTrue(resumed["resumed_without_redoing_prior_model_calls"])
        self.assertEqual(resumed["model_calls_attempted"],
                         first["model_calls_attempted"] + 2)
        self.assertEqual(self.generation_count, 3)
        self.assertEqual(self.qa_count, 6)
        self.assertEqual(len(resumed["accepted_cycles"]), 3)
        self.assertEqual(resumed["accepted_cycles"][:2], first["accepted_cycles"])
        self.assertEqual(receipt.read_bytes(), earlier_contents)
        self.assertEqual(self.calls.count("LOCK_ACQUIRED"), 1)
        self.assertEqual(self.calls[-1], "LOCK_RELEASED")
        self.assertEqual(json.loads(next_receipt.read_text())["status"], PASS)
        self.assertNotIn(str(self.root), next_receipt.read_text())

    def test_resume_tampered_previous_private_source_refused_without_generation(self):
        _prior, receipt = self.stop_after_two_qa_cycles()
        review = list((receipt.parent / "c2" / "PrivateClones").glob(
            "*/private-source-review-*/STAGE_2_PRIVATE_SOURCE.txt"))
        self.assertEqual(len(review), 1)
        review[0].write_text("tampered source outside Git review", encoding="utf-8")
        self.calls.clear()
        summary, result = self.run_it(
            cycles=3, resume_latest=True, draft=self.fake_draft)
        self.assertEqual(summary["status"],
                         "HOLD_CUMULATIVE_SOURCE_OR_GIT_INTEGRITY")
        self.assertEqual(summary["reason_code"],
                         "PRIVATE_REVIEW_RECORDED_HASH_OR_QA_MISMATCH")
        self.assertEqual(self.generation_count, 2)
        self.assertEqual(self.calls[-1], "LOCK_RELEASED")
        self.assertEqual(summary["completed_cycles"], 0)
        self.assertNotIn("tampered source", result.read_text())

    def test_resume_missing_prior_private_qa_never_generates(self):
        summary, receipt = self.run_it(
            cycles=3, resume_latest=True, draft=self.fake_draft)
        self.assertEqual(summary["status"],
                         "HOLD_CUMULATIVE_SOURCE_OR_GIT_INTEGRITY")
        self.assertEqual(summary["reason_code"],
                         "NO_STOPPED_PRIVATE_QA_SESSION_ELIGIBLE")
        self.assertEqual(self.generation_count, 0)
        self.assertTrue(receipt.exists())
        self.assertEqual(self.calls[-1], "LOCK_RELEASED")

    def test_resume_changed_prior_accepted_hashes_is_rejected(self):
        _old, receipt = self.stop_after_two_qa_cycles()
        entry = json.loads(receipt.read_text())
        entry["accepted_cycles"][0]["source_sha256"][0] = "0" * 64
        receipt.write_text(json.dumps(entry), encoding="utf-8")
        summary, _ = self.run_it(cycles=3, resume_latest=True,
                                 draft=self.fake_draft)
        self.assertEqual(summary["status"],
                         "HOLD_CUMULATIVE_SOURCE_OR_GIT_INTEGRITY")
        self.assertEqual(summary["reason_code"],
                         "RESUME_QA_HASHES_NOT_MATCHING_SESSION")
        self.assertEqual(self.generation_count, 2)

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
