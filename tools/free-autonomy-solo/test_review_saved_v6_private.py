"""Real temporary Git private-clone regression with MOCKED Docker, no model/API."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import review_saved_v6_private as m


def git(where: Path, *args: str) -> str:
    run = subprocess.run(["git", *args], cwd=where,
                         capture_output=True, text=True, check=True, timeout=20)
    return run.stdout.strip()


class SavedCandidateTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.home = Path(temp.name)
        self.base = self.home / "FreeAutonomyPrivate" / "DecV6Current"
        self.base.mkdir(parents=True)
        self.root = self.base / ("v6-" + "a"*16)
        self.root.mkdir()
        self.cloneroot = self.root / "private-clones" / ("minecraftaibuilder-" + "c"*32)
        self.repo = self.cloneroot / "repo"
        self.repo.mkdir(parents=True)
        git(self.repo, "init", "-b", m.PRIVATE_BRANCH)
        git(self.repo, "config", "user.name", "Source Fixture")
        git(self.repo, "config", "user.email", "source@example.invalid")
        git(self.repo, "config", "core.autocrlf", "false")
        git(self.repo, "remote", "add", "origin", "https://github.com/ryomashibaba/MinecraftAIBuilder.git")
        self.file = self.repo / m.SOURCE_FILE
        self.file.parent.mkdir(parents=True)
        # Test fixture does not claim to be the actual public author module.
        self.before = "export const sample='original';\n"
        self.after = "export const sample='reviewed';\n"
        self.file.write_text(self.before)
        git(self.repo, "add", m.SOURCE_FILE)
        git(self.repo, "commit", "-m", "sample immutable source")
        self.commit = git(self.repo, "rev-parse", "HEAD")
        self.blob = git(self.repo, "rev-parse", "HEAD:"+m.SOURCE_FILE)
        self.candidate = self.root / m.CANDIDATE
        self.candidate.write_text(self.after)
        receipt = {
            "schema": "dec-v6-current-private-source-pilot-v1",
            "status": "PRIVATE_ONE_MODEL_PATCH_DRAFT_NO_QA_ART_HOLD",
            "audited_commit": self.commit, "audited_blob": self.blob,
            "project": "minecraftaibuilder", "old_v4h_path_changed": False,
            "original_project_changed": False, "public_model_source_pushes": 0,
            "paid_api_calls": 0, "world_writes": 0, "art_certified": False,
            "real_windows_qa_certified": False, "qa_network": "none",
            "local_model_requests_by_this_wrapper": 1,
            "private_verified_commits": 0,
            "private_drafts_not_qa_verified": 1,
            "candidate_sha256": hashlib.sha256(self.after.encode()).hexdigest(),
        }
        self.shareable = self.root / m.RECEIPT
        self.shareable.write_text(json.dumps(receipt))
        self.pins = patch.multiple(m, SOURCE_COMMIT=self.commit, SOURCE_BLOB=self.blob)
        self.pins.start()
        self.addCleanup(self.pins.stop)
        a=patch.object(m, "verify_private_clone", return_value={"status":"FIXTURE"})
        a.start()
        self.addCleanup(a.stop)
        b=patch.object(m, "current_source_commit", return_value=True)
        b.start()
        self.addCleanup(b.stop)

    def test_inspection_only_preserves_original_and_no_docker(self):
        with patch.object(m, "run_in_docker", side_effect=AssertionError("NO_DOCKER")):
            result, p = m.run_existing(self.base, qa=False, platform_name="nt")
        self.assertEqual(result["status"], m.INSPECTED)
        self.assertEqual(result["model_calls"], 0)
        self.assertEqual(result["independent_docker_qa_checks_passed"], 0)
        self.assertEqual(self.file.read_text(), self.before)
        self.assertEqual(json.loads(p.read_text()), result)
        self.assertNotIn(str(self.home), p.read_text())

    def test_digest_mismatch_holds_without_source_write(self):
        self.candidate.write_text(self.after + "//tamper\n")
        result, _ = m.run_existing(self.base, qa=False, platform_name="nt")
        self.assertEqual(result["status"], "HOLD_PRIVATE_EXISTING_CANDIDATE_NO_PUBLICATION")
        self.assertEqual(result["reason_code"], "PRIVATE_SAVED_V6_CANDIDATE_SHA_MISMATCH")
        self.assertEqual(self.file.read_text(), self.before)

    def test_docker_missing_prevents_qa_or_changes(self):
        def absent(_policy):
            raise RuntimeError("NO_DOCKER")
        result, p = m.run_existing(self.base, qa=True, platform_name="nt",
                                   gate=absent)
        self.assertEqual(result["status"], m.DOCKER_HOLD)
        self.assertEqual(result["model_calls"], 0)
        self.assertEqual(self.file.read_text(), self.before)
        self.assertEqual(json.loads(p.read_text()), result)

    def test_qa_good_uses_four_checks_and_private_git_commit(self):
        commands = []
        def fake_docker(cfg, command, workspace, timeout, logfile, *, agent):
            commands.append((tuple(command),agent))
            self.assertEqual(cfg["docker"]["network"], "none")
            self.assertFalse(agent)
            return (0, "MOCK_DOCKER_QA_OK")
        result, p = m.run_existing(self.base, qa=True, platform_name="nt",
                                   gate=lambda _p: None, docker=fake_docker)
        self.assertEqual(result["status"], m.PASS, result.get("reason_code"))
        self.assertEqual(result["local_private_commits"], 1)
        self.assertEqual(result["independent_docker_qa_checks_passed"], 2)
        self.assertEqual(result["public_model_source_pushes"], 0)
        self.assertEqual(result["model_calls"], 0)
        self.assertEqual(len(commands), 4)
        self.assertEqual(self.file.read_text(), self.after)
        self.assertEqual(git(self.repo, "rev-parse", "HEAD^"), self.commit)
        self.assertEqual(json.loads(p.read_text()), result)
        self.assertFalse(result["art_certified"])

    def test_qa_failure_retains_original_candidate_and_no_commit(self):
        invocations = 0
        def fake_docker(*args, **kwargs):
            nonlocal invocations
            invocations += 1
            return (0 if invocations <= 2 else 1, "MOCK_CANDIDATE_QA_FAILED")
        result, _ = m.run_existing(self.base, qa=True, platform_name="nt",
                                   gate=lambda _p: None, docker=fake_docker)
        self.assertEqual(result["status"], "HOLD_PRIVATE_EXISTING_CANDIDATE_NO_PUBLICATION")
        self.assertEqual(result["reason_code"], "PRIVATE_MODEL_SOURCE_FAILED_INDEPENDENT_DOCKER_QA")
        self.assertEqual(git(self.repo, "rev-parse", "HEAD"), self.commit)
        self.assertEqual(self.file.read_text(), self.after)
        self.assertEqual(self.candidate.read_text(), self.after)
        self.assertEqual(result["local_private_commits"], 0)

    def test_critical_guard_removed_blocks_promotion(self):
        self.file.write_text("newSource.worldWrites!==0;\nconst old=1;\n")
        git(self.repo, "add", m.SOURCE_FILE)
        git(self.repo, "commit", "-m", "fixture guard")
        actual_commit=git(self.repo,"rev-parse","HEAD")
        actual_blob=git(self.repo,"rev-parse","HEAD:"+m.SOURCE_FILE)
        self.shareable.write_text(json.dumps({
            **json.loads(self.shareable.read_text()),
            "audited_commit":actual_commit, "audited_blob":actual_blob,
        }))
        with patch.multiple(m,SOURCE_COMMIT=actual_commit,SOURCE_BLOB=actual_blob):
            result, _=m.run_existing(self.base,qa=False,platform_name="nt")
        self.assertEqual(result["status"], "HOLD_PRIVATE_EXISTING_CANDIDATE_NO_PUBLICATION")
        self.assertEqual(result["reason_code"], "PRIVATE_MODEL_CANDIDATE_REMOVED_SOURCE_SAFETY_PROOF")

    def test_duplicate_receipt_stops_not_reruns(self):
        # QA receipt is created only after a genuine QA attempt, not a
        # missing-Docker preflight. No model or real Docker is invoked.
        _, p = m.run_existing(self.base, qa=True, platform_name="nt",
                               gate=lambda _policy: None,
                               docker=lambda *a, **kw: (1, "MOCK_BASELINE_FAILURE"))
        self.assertTrue(p.is_file())
        calls = []
        def no_call(*args, **kwargs):
            calls.append(1)
            raise AssertionError("SHOULD_NOT_REPEAT")
        result, _ = m.run_existing(self.base, qa=True, platform_name="nt",
                                   gate=no_call, docker=no_call)
        self.assertEqual(result["reason_code"], "PRIVATE_REVIEW_RECEIPT_ALREADY_EXISTS_NO_REPEAT")
        self.assertEqual(calls, [])

    def test_extra_clone_prevents_picking_wrong_candidate(self):
        (self.root/"private-clones"/("minecraftaibuilder-"+"d"*32)).mkdir()
        result,_=m.run_existing(self.base,qa=False,platform_name="nt")
        self.assertEqual(result["reason_code"],"PRIVATE_CLONE_NOT_UNIQUE")


    def test_windows_crlf_draft_matches_original_lf_digest_without_rewriting_saved(self):
        windows_bytes = self.after.replace("\n", "\r\n").encode("utf-8")
        self.candidate.write_bytes(windows_bytes)
        report, out = m.run_existing(self.base, qa=False, platform_name="nt")
        self.assertEqual(report["status"], m.INSPECTED)
        self.assertEqual(report["candidate_verified_sha256"],
                         hashlib.sha256(self.after.encode()).hexdigest())
        self.assertEqual(self.candidate.read_bytes(), windows_bytes)
        self.assertEqual(self.file.read_text(), self.before)
        self.assertEqual(json.loads(out.read_text()), report)

    def test_windows_crlf_legacy_sha_receipt_recovery_only_once(self):
        historical = {
            "schema": "dec-v6-existing-candidate-private-qa-v1",
            "status": "HOLD_PRIVATE_EXISTING_CANDIDATE_NO_PUBLICATION",
            "project": "minecraftaibuilder",
            "candidate_verified_sha256": None,
            "baseline_commit": self.commit,
            "original_project_changed": False, "public_model_source_pushes": 0,
            "model_calls": 0, "paid_api_calls": 0, "world_writes": 0,
            "independent_docker_qa_checks_passed": 0, "local_private_commits": 0,
            "source_qa_passed": False, "art_certified": False,
            "minecraft_walking_certified": False,
            "reason_code": "PRIVATE_SAVED_V6_CANDIDATE_SHA_MISMATCH",
        }
        historical_file = self.root / "V6_EXISTING_SOURCE_QA_SHAREABLE.json"
        historical_file.write_text(json.dumps(historical))
        prior_bytes = historical_file.read_bytes()
        windows_bytes = self.after.replace("\n", "\r\n").encode("utf-8")
        self.candidate.write_bytes(windows_bytes)
        calls=[]
        def fake_docker(cfg, command, workspace, timeout, log, *, agent):
            calls.append(command)
            return 0, "MOCK_ONLY"
        report, output = m.run_existing(self.base, qa=True, platform_name="nt",
            gate=lambda policy: None, docker=fake_docker)
        self.assertEqual(report["status"], m.PASS, report.get("reason_code"))
        self.assertEqual(report["model_calls"], 0)
        self.assertEqual(report["independent_docker_qa_checks_passed"], 2)
        self.assertEqual(report["local_private_commits"], 1)
        self.assertEqual(len(calls), 4)
        self.assertEqual(self.candidate.read_bytes(), windows_bytes)
        self.assertEqual(historical_file.read_bytes(), prior_bytes)
        self.assertEqual(output.name, "V6_EXISTING_SOURCE_QA_CRLF_RECOVERY_SHAREABLE.json")
        report2, _ = m.run_existing(self.base, qa=True, platform_name="nt",
            gate=lambda policy: self.fail("no second docker"),
            docker=lambda *a,**k: self.fail("no second QA"))
        self.assertEqual(report2["reason_code"], "PRIVATE_REVIEW_RECEIPT_ALREADY_EXISTS_NO_REPEAT")

    def test_crlf_candidate_tamper_is_rejected(self):
        self.candidate.write_bytes(self.after.replace("\n", "\r\n").encode()
                                   + b"// changed after SHA\r\n")
        result, _ = m.run_existing(self.base, qa=False, platform_name="nt")
        self.assertEqual(result["reason_code"], "PRIVATE_SAVED_V6_CANDIDATE_SHA_MISMATCH")
        self.assertEqual(self.file.read_text(), self.before)

    def test_mixed_and_bare_carriage_returns_are_not_silently_normalized(self):
        candidate = self.after.encode()
        expected_sha = hashlib.sha256(candidate).hexdigest()
        for bad in (candidate.replace(b"\n", b"\r"), candidate + b"\r\n",
                    candidate.replace(b"\n", b"\r\r\n")):
            with self.subTest(raw=bad):
                with self.assertRaises(m.ReviewHold):
                    m.verified_candidate_bytes(bad, expected_sha)

    def test_other_historical_hold_cannot_recover_as_crlf(self):
        previous = self.root / "V6_EXISTING_SOURCE_QA_SHAREABLE.json"
        previous.write_text(json.dumps({
            "schema": "dec-v6-existing-candidate-private-qa-v1",
            "status": "HOLD_PRIVATE_EXISTING_CANDIDATE_NO_PUBLICATION",
            "reason_code": "PRIVATE_MODEL_SOURCE_FAILED_INDEPENDENT_DOCKER_QA"
        }))
        result, _ = m.run_existing(self.base, qa=True, platform_name="nt",
            gate=lambda policy: self.fail("unexpected Docker"))
        self.assertEqual(result["reason_code"], "PRIVATE_REVIEW_RECEIPT_ALREADY_EXISTS_NO_REPEAT")


if __name__ == "__main__":
    unittest.main()
