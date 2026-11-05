"""Offline regression for the user-facing *real-project* Windows launchers.

The model runner and source preparer must use the same audited immutable
manifest as this research revision. No model, remote fetch or code execution
is needed for this check; it prevents accidentally reactivating older pins.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parent
MANIFEST = "REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json"
PILOT_PS1 = "RUN_QWEN14B_REAL_SOURCE_DRAFT_ONCE.ps1"
PREPARE_PS1 = "RUN_PREPARE_REAL_PROJECT_ONCE.ps1"
BOOTSTRAP_CMD = "RUN_FIRST_PRIVATE_REAL_MODEL_PILOT.cmd"


def git_blob_sha(path: Path) -> str:
    content = path.read_bytes()
    header = b"blob " + str(len(content)).encode("ascii") + b"\x00"
    return hashlib.sha1(header + content).hexdigest()


class WindowsRealSourceLauncherPins(unittest.TestCase):
    def test_both_launchers_pin_exact_current_manifest_bytes(self):
        manifest = json.loads((ROOT / MANIFEST).read_text(encoding="utf-8"))
        self.assertEqual(set(manifest["project_candidates"]),
                         {"minecraftaibuilder", "browser-ink-tps"})
        self.assertEqual(manifest["simultaneous_active_projects_max"], 1)
        self.assertIs(manifest["allow_paid_api"], False)
        self.assertIs(manifest["allow_main_write"], False)
        self.assertIs(manifest["allow_dockerless_untrusted_model_source_execution"], False)
        sha = git_blob_sha(ROOT / MANIFEST)
        pilot = (ROOT / PILOT_PS1).read_text(encoding="utf-8")
        prepare = (ROOT / PREPARE_PS1).read_text(encoding="utf-8")
        self.assertIn("GitBlob = '" + sha + "'", pilot)
        self.assertIn("SHA = '" + sha + "'", prepare)
        pilot_revision = re.search(r"\$revision = '([a-f0-9]{40})'", pilot)
        prepare_revision = re.search(r"\$rev = '([a-f0-9]{40})'", prepare)
        self.assertIsNotNone(pilot_revision)
        self.assertIsNotNone(prepare_revision)
        self.assertEqual(pilot_revision.group(1), prepare_revision.group(1))
        for lane in manifest["project_candidates"].values():
            self.assertRegex(lane["pinned_commit"], r"^[0-9a-f]{40}$")
            self.assertRegex(lane["source_blob_sha"], r"^[0-9a-f]{40}$")

    def test_all_pilot_download_blob_guards_match_current_audited_files(self):
        script = (ROOT / PILOT_PS1).read_text(encoding="utf-8")
        checks = re.findall(
            r"@\{ Name = '([^']+)'; GitBlob = '([a-f0-9]{40})' \}", script)
        expected = {
            "draft_real_project_local14b.py",
            "prepare_pinned_real_project.py",
            "local_qwen_no_docker_two_step.py",
            MANIFEST,
        }
        self.assertEqual({name for name, _ in checks}, expected)
        self.assertEqual(len(checks), len(expected))
        for name, actual_sha in checks:
            with self.subTest(file=name):
                if name == "draft_real_project_local14b.py":
                    # Old bootstrap downloads the IMMUTABLE 2026-11-04
                    # draft blob, not the updated full-session contract.
                    self.assertEqual(actual_sha,
                                     "f8539d764c15217f70d0c17c5b5629cc6e9dddeb")
                    self.assertIn("$revision = 'a23b0e5b23affa5aae43fa0e9e6a2a4ff650e5fc'", script)
                else:
                    self.assertEqual(actual_sha, git_blob_sha(ROOT / name))

    def test_original_v4h_real_14b_batch_bootstrap_is_sha_pinned(self):
        launch = (ROOT / "RUN_REAL_MAB_V4H_14B_ARCHITECTURE.ps1").read_text(
            encoding="utf-8")
        cmd = (ROOT / "RUN_REAL_MAB_V4H_14B_ARCHITECTURE.cmd").read_text(
            encoding="utf-8")
        downloads = re.findall(
            r"@\{ Name='([^']+)'; Blob='([a-f0-9]{40})' \}", launch)
        expected = {
            "real_mab_original_architecture_batch.py",
            "draft_real_project_local14b.py",
            "prepare_pinned_real_project.py",
            "local_qwen_no_docker_two_step.py",
            MANIFEST,
        }
        self.assertEqual({name for name, _ in downloads}, expected)
        for name, expected_blob in downloads:
            with self.subTest(name=name):
                if name == "draft_real_project_local14b.py":
                    self.assertEqual(expected_blob,
                                     "f8539d764c15217f70d0c17c5b5629cc6e9dddeb")
                    self.assertIn("$rev = '1294d4e71bb21845756ac90043b680b87a3d09a3'", launch)
                else:
                    self.assertEqual(expected_blob, git_blob_sha(ROOT / name))
        self.assertRegex(launch, r"\$rev = '[a-f0-9]{40}'")
        self.assertRegex(cmd, r"/[a-f0-9]{40}/tools/free-autonomy-solo/"
                         r"RUN_REAL_MAB_V4H_14B_ARCHITECTURE\.ps1")
        self.assertIn(git_blob_sha(ROOT / "RUN_REAL_MAB_V4H_14B_ARCHITECTURE.ps1"),
                      cmd)
        self.assertIn("--ci-self-test", cmd)
        self.assertIn("CiSelfTest", launch)
        self.assertNotIn("/main/tools/free-autonomy-solo/", cmd)

    def test_new_mab_full_session_one_click_is_sha_pinned_without_mutating_legacy(self):
        launch = (ROOT / "RUN_PRIVATE_MAB_SOURCE_SESSION.ps1").read_text(
            encoding="utf-8")
        cmd = (ROOT / "RUN_PRIVATE_MAB_SOURCE_SESSION.cmd").read_text(
            encoding="utf-8")
        self.assertIn(
            "$revision = '6410cc2aaef09d7895159c03abfdefb0ef4402d0'",
            launch)
        sources = re.findall(
            r"@\{ Name='([^']+)'; Blob='([a-f0-9]{40})' \}", launch)
        expected = {
            "run_mab_private_autonomy_once.py",
            "draft_real_project_local14b.py",
            "promote_private_real_drafts_docker.py",
            "private_verified_source_evidence.py",
            "prepare_pinned_real_project.py",
            "local_qwen_no_docker_two_step.py",
            "docker_sandbox.py",
            MANIFEST,
        }
        self.assertEqual({name for name, _ in sources}, expected)
        for name, blob in sources:
            with self.subTest(name=name):
                if name == "draft_real_project_local14b.py":
                    # This older launcher remains pinned to its historical code.
                    self.assertEqual(
                        blob, "f727db8d07a871969f9bb92f6278b53d57b614b7")
                elif name == "promote_private_real_drafts_docker.py":
                    self.assertEqual(
                        blob, "ce668f1e4901a701ec2a0b09812b74c7e7398a1e")
                else:
                    self.assertEqual(blob, git_blob_sha(ROOT / name))
        self.assertIn(
            "/5b265667c622ccfe3097bcd7346bd9a16e086872/"
            "tools/free-autonomy-solo/RUN_PRIVATE_MAB_SOURCE_SESSION.ps1",
            cmd)
        self.assertIn(git_blob_sha(ROOT / "RUN_PRIVATE_MAB_SOURCE_SESSION.ps1"),
                      cmd)
        self.assertIn("--ci-self-test", cmd)
        self.assertIn("CiSelfTest", launch)
        self.assertNotIn("/main/tools/free-autonomy-solo/", cmd)

    def test_cumulative_six_stage_source_launcher_uses_fixed_SHA_blobs(self):
        launch = (ROOT / "RUN_MAB_CUMULATIVE_6_STAGES.ps1").read_text(
            encoding="utf-8")
        self.assertIn(
            "$revision='74da31e87fdc53ea3fcfe8eacdbeafd75bab9ce1'",
            launch)
        self.assertIn("CiSelfTest", launch)
        checks = re.findall(
            r"@\{ Name='([^']+)'; Blob='([0-9a-f]{40})' \}", launch)
        expected = {
            "run_mab_private_continuous.py",
            "run_mab_private_autonomy_once.py",
            "draft_real_project_local14b.py",
            "promote_private_real_drafts_docker.py",
            "private_verified_source_evidence.py",
            "prepare_pinned_real_project.py",
            "local_qwen_no_docker_two_step.py",
            "docker_sandbox.py",
            MANIFEST,
        }
        self.assertEqual({name for name, _ in checks}, expected)
        self.assertEqual(len(checks), len(expected))
        for name, blob in checks:
            with self.subTest(file=name):
                self.assertEqual(blob, git_blob_sha(ROOT / name))
        self.assertNotIn("/main/tools/free-autonomy-solo/", launch)
        cmd = (ROOT / "RUN_MAB_CUMULATIVE_6_STAGES.cmd").read_text(
            encoding="utf-8")
        self.assertIn(
            "/a3c9a55ce1e5c48e24e57ea44cac8c9923b00ab7/"
            "tools/free-autonomy-solo/RUN_MAB_CUMULATIVE_6_STAGES.ps1", cmd)
        self.assertIn(
            git_blob_sha(ROOT / "RUN_MAB_CUMULATIVE_6_STAGES.ps1"), cmd)
        self.assertIn("--ci-self-test", cmd)
        self.assertNotIn("/main/tools/free-autonomy-solo/", cmd)
        resume = (ROOT / "RUN_MAB_RESUME_LAST_QA.cmd").read_text(
            encoding="utf-8")
        self.assertIn(
            "/a3c9a55ce1e5c48e24e57ea44cac8c9923b00ab7/"
            "tools/free-autonomy-solo/RUN_MAB_CUMULATIVE_6_STAGES.ps1", resume)
        self.assertIn(git_blob_sha(ROOT / "RUN_MAB_CUMULATIVE_6_STAGES.ps1"),
                      resume)
        self.assertIn("-ResumeLatest", resume)
        self.assertIn("ResumeLatest", launch)
        self.assertIn("--resume-latest", launch)
        self.assertIn("--ci-self-test", resume)
        self.assertNotIn("/main/tools/free-autonomy-solo/", resume)

    def test_double_click_bootstrap_pins_exact_current_pilot_source(self):
        text = (ROOT / BOOTSTRAP_CMD).read_text(encoding="utf-8")
        self.assertRegex(text, r"/[a-f0-9]{40}/tools/free-autonomy-solo/" + PILOT_PS1)
        self.assertIn(" -cne '", text)
        self.assertIn("-cne '" + git_blob_sha(ROOT / PILOT_PS1) + "'", text)
        self.assertIn("--ci-self-test", text)
        self.assertNotIn("/main/tools/free-autonomy-solo/", text)


if __name__ == "__main__":
    unittest.main()
