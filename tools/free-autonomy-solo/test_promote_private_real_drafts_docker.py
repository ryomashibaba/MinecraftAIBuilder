"""Tests for bounded promotion: REAL disposable Git, mocked Docker QA only."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from prepare_pinned_real_project import load_manifest, source_blob_sha, verify_private_clone
from promote_private_real_drafts_docker import preflight_private_drafts, promote, qa_commands, _read_receipt, Hold

SOURCES = {
    "minecraftaibuilder": (
        "export const MEZZANINE_SCHEMA='test';\n"
        "export function compileMezzanineAuthorIntent(x) { return x; }\n"
        "export function compileAuthoredPublicMezzanine(x) { return x; }\n"
    ),
    "browser-ink-tps": (
        "export function sourceCoopEligible(x) { return x; }\n"
        "export function b423UseRealSourceWorldReplay(x) { return x; }\n"
        "export function sourceCoopNavigationUrl(x) { return x; }\n"
    ),
}


def g(root: Path, *args: str):
    return subprocess.run(["git", "-C", str(root), *args], check=True,
                          text=True, capture_output=True, timeout=25).stdout.strip()


def digest(s: str):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


class PinnedRealSourcePromotionTests(unittest.TestCase):
    def setUp(self):
        env = tempfile.TemporaryDirectory()
        self.addCleanup(env.cleanup)
        self.temp = Path(env.name)

    def fixture(self, project="minecraftaibuilder"):
        root = self.temp / project
        root.mkdir()
        workspace = root / "repo"
        workspace.mkdir()
        manifest = load_manifest()
        lane = manifest["project_candidates"][project]
        target = workspace / lane["source_file"]
        target.parent.mkdir(parents=True)
        initial = SOURCES[project]
        target.write_text(initial, encoding="utf-8")
        g(workspace, "init", "-b", lane["research_branch_for_private_clone"])
        g(workspace, "config", "user.name", "Private SOURCE Fixture")
        g(workspace, "config", "user.email", "fixture@example.invalid")
        g(workspace, "config", "core.autocrlf", "false")
        g(workspace, "remote", "add", "origin",
          "https://github.com/" + lane["repository"] + ".git")
        g(workspace, "add", lane["source_file"])
        g(workspace, "commit", "-m", "fixture source only")
        lane["pinned_commit"] = g(workspace, "rev-parse", "HEAD")
        lane["source_blob_sha"] = source_blob_sha(target.read_bytes())
        candidate1 = initial + "// private reviewed stage-one draft\n"
        candidate2 = candidate1 + "// private reviewed stage-two draft\n"
        draft_receipt = {
            "schema": "real-project-qwen-local-private-draft-v1",
            "status": "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY",
            "project": project, "model_requested": "qwen3:14b",
            "pinned_source_commit": lane["pinned_commit"],
            "pinned_source_blob": lane["source_blob_sha"],
            "git_commits": 0, "git_pushes": 0,
            "native_QA_executed": False, "model_drafts": 2,
            "stages": [
                {"stage": 1, "result": "PRIVATE_UNVERIFIED_DIFF",
                 "source_previous_sha256": digest(initial),
                 "candidate_sha256": digest(candidate1)},
                {"stage": 2, "result": "PRIVATE_UNVERIFIED_DIFF",
                 "source_previous_sha256": digest(candidate1),
                 "candidate_sha256": digest(candidate2)},
            ],
        }
        (root / "draft_1.private.txt").write_text(candidate1, encoding="utf-8")
        (root / "draft_2.private.txt").write_text(candidate2, encoding="utf-8")
        (root / "SHAREABLE_DRAFT_RESULT.json").write_text(
            json.dumps(draft_receipt), encoding="utf-8")
        return root, workspace, manifest, lane, initial

    def test_two_genuine_local_git_commits_only_after_qa_mock(self):
        for project in SOURCES:
            with self.subTest(project=project):
                root, work, manifest, lane, original = self.fixture(project)
                head = g(work, "rev-parse", "HEAD")
                calls = []
                def mock_docker(workspace, args, private_root, label, **kwargs):
                    calls.append((list(args), label))
                    return 0, "MOCK_QA_PASS_NOT_TRUE_DOCKER"
                with patch("promote_private_real_drafts_docker.require_docker_qa_image"), \
                     patch("promote_private_real_drafts_docker.docker_run", side_effect=mock_docker):
                    result = promote(root, project, "qwen3:14b", manifest=manifest,
                                     allow_public_npm_deps=True, use_lock=False)
                self.assertEqual(
                    result["status"],
                    "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS")
                self.assertEqual(result["completed_stages"], 2)
                self.assertEqual(len(result["local_qa_commits"]), 2)
                self.assertEqual(result["github_pushes"], 0)
                self.assertFalse(result["real_model_verified_here"])
                self.assertEqual(g(work, "rev-parse", "HEAD"), head)
                self.assertEqual(g(work, "status", "--porcelain"), "")
                self.assertEqual((work / lane["source_file"]).read_text(), original)
                qa_repo = Path(result["qa_workspace_private"])
                self.assertEqual(g(qa_repo, "rev-list", "--count", "HEAD"), "3")
                self.assertEqual(g(qa_repo, "status", "--porcelain"), "")
                self.assertEqual(verify_private_clone(work, lane)["head"], head)
                self.assertEqual(len(calls), 2 * len(qa_commands(project))
                                 + (1 if project == "browser-ink-tps" else 0))

    def test_qa_second_stage_failure_keeps_only_first_local_commit(self):
        root, work, manifest, lane, original = self.fixture()
        counter = [0]
        def fail_second(*args, **kwargs):
            counter[0] += 1
            return (1 if counter[0] == 2 else 0), "MOCK_FAILURE"
        with patch("promote_private_real_drafts_docker.require_docker_qa_image"), \
             patch("promote_private_real_drafts_docker.docker_run", side_effect=fail_second):
            result = promote(root, "minecraftaibuilder", "qwen3:14b",
                             manifest=manifest, use_lock=False)
        self.assertEqual(result["status"], "HOLD")
        self.assertEqual(result["completed_stages"], 1)
        self.assertEqual(len(result["local_qa_commits"]), 1)
        self.assertIn("INDEPENDENT_DOCKER_QA_STAGE2", result["hold_reason"])
        self.assertEqual((work / lane["source_file"]).read_text(), original)

    def test_tampered_second_stage_sha_refused_before_docker(self):
        root, work, manifest, lane, original = self.fixture()
        (root / "draft_2.private.txt").write_text("tampered", encoding="utf-8")
        with patch("promote_private_real_drafts_docker.require_docker_qa_image") as check:
            r = promote(root, "minecraftaibuilder", "qwen3:14b",
                        manifest=manifest, use_lock=False)
        self.assertEqual(r["status"], "HOLD")
        self.assertIn("PRIVATE_DRAFT_SHA_MISMATCH", r["hold_reason"])
        check.assert_not_called()
        self.assertEqual((work / lane["source_file"]).read_text(), original)

    def test_wrong_model_or_project_refused(self):
        root, work, manifest, lane, original = self.fixture()
        for project, model in (("minecraftaibuilder", "wrong:8b"),
                               ("browser-ink-tps", "qwen3:14b")):
            with self.subTest(project=project, model=model), \
                 patch("promote_private_real_drafts_docker.require_docker_qa_image") as check:
                r = promote(root, project, model, manifest=manifest, use_lock=False)
                self.assertEqual(r["status"], "HOLD")
                check.assert_not_called()

    def test_public_api_anchor_tampering_refused(self):
        root, work, manifest, lane, original = self.fixture()
        path = root / "draft_1.private.txt"
        changed = path.read_text().replace("compileMezzanineAuthorIntent", "REMOVED_PUBLIC_NAME")
        path.write_text(changed)
        receipt = root / "SHAREABLE_DRAFT_RESULT.json"
        obj = json.loads(receipt.read_text())
        obj["stages"][0]["candidate_sha256"] = digest(changed)
        draft2 = changed + "// private second stage\n"
        (root / "draft_2.private.txt").write_text(draft2)
        obj["stages"][1]["source_previous_sha256"] = digest(changed)
        obj["stages"][1]["candidate_sha256"] = digest(draft2)
        receipt.write_text(json.dumps(obj))
        with patch("promote_private_real_drafts_docker.require_docker_qa_image") as check:
            r = promote(root, "minecraftaibuilder", "qwen3:14b",
                        manifest=manifest, use_lock=False)
        self.assertEqual(r["status"], "HOLD")
        self.assertEqual(r["hold_reason"], "PROTECTED_PUBLIC_CONTRACT_ANCHOR_REMOVED")
        check.assert_not_called()

    def test_tps_needs_explicit_dependency_fetch_opt_in(self):
        root, work, manifest, lane, original = self.fixture("browser-ink-tps")
        with patch("promote_private_real_drafts_docker.require_docker_qa_image"):
            r = promote(root, "browser-ink-tps", "qwen3:14b",
                        manifest=manifest, use_lock=False)
        self.assertEqual(r["status"], "HOLD")
        self.assertEqual(r["hold_reason"], "TPS_PUBLIC_NPM_DEP_SETUP_NEEDS_OPT_IN")


    def test_static_preflight_accepts_two_chained_drafts_without_docker_or_qa(self):
        for project in SOURCES:
            with self.subTest(project=project):
                root, work, manifest, lane, original = self.fixture(project)
                before_head = g(work, "rev-parse", "HEAD")
                with patch("promote_private_real_drafts_docker.require_docker_qa_image") as docker, \\
                     patch("promote_private_real_drafts_docker.docker_run") as execute_qa:
                    result = preflight_private_drafts(
                        root, project, "qwen3:14b", manifest=manifest, use_lock=False)
                docker.assert_not_called()
                execute_qa.assert_not_called()
                self.assertEqual(
                    result["status"], "STATIC_PRIVATE_DRAFTS_ADMISSIBLE_FOR_ISOLATED_QA_ONLY")
                self.assertEqual(len(result["checked_stages"]), 2)
                self.assertFalse(result["native_qa_executed"])
                self.assertFalse(result["candidate_quality_certified"])
                self.assertFalse(result["generated_code_executed"])
                self.assertEqual(result["git_commits"], 0)
                self.assertEqual(result["github_pushes"], 0)
                self.assertEqual((work / lane["source_file"]).read_text(), original)
                self.assertEqual(g(work, "rev-parse", "HEAD"), before_head)
                self.assertEqual(g(work, "status", "--porcelain"), "")
                self.assertTrue((root / "SHAREABLE_STATIC_PREFLIGHT.json").is_file())

    def test_static_preflight_fails_closed_for_tampered_draft(self):
        root, work, manifest, lane, original = self.fixture()
        (root / "draft_2.private.txt").write_text("modified without receipt")
        with patch("promote_private_real_drafts_docker.require_docker_qa_image") as docker, \\
             patch("promote_private_real_drafts_docker.docker_run") as run:
            result = preflight_private_drafts(
                root, "minecraftaibuilder", "qwen3:14b",
                manifest=manifest, use_lock=False)
        self.assertEqual(result["status"], "HOLD")
        self.assertEqual(result["reason"], "PRIVATE_DRAFT_SHA_MISMATCH")
        self.assertEqual(result["checked_stages"], [])
        docker.assert_not_called()
        run.assert_not_called()
        self.assertEqual((work / lane["source_file"]).read_text(), original)

    def test_static_preflight_rejects_wrong_model_without_leaking_drafts(self):
        root, work, manifest, lane, original = self.fixture()
        with patch("promote_private_real_drafts_docker.docker_run") as run:
            result = preflight_private_drafts(
                root, "minecraftaibuilder", "fake:0b",
                manifest=manifest, use_lock=False)
        self.assertEqual(result["status"], "HOLD")
        self.assertEqual(result["reason"], "PRIVATE_DRAFT_RECEIPT_NOT_ADMISSIBLE")
        self.assertNotIn("draft_1.private", json.dumps(result))
        run.assert_not_called()

    def test_no_docker_fails_closed_without_commit(self):
        root, work, manifest, lane, original = self.fixture()
        with patch("promote_private_real_drafts_docker.require_docker_qa_image",
                   side_effect=Hold("QA_DOCKER_DAEMON_NOT_AVAILABLE")):
            r = promote(root, "minecraftaibuilder", "qwen3:14b",
                        manifest=manifest, use_lock=False)
        self.assertEqual(r["status"], "HOLD")
        self.assertEqual(r["local_qa_commits"], [])
        self.assertEqual((work / lane["source_file"]).read_text(), original)

    def test_qacommands_precisely_allowlisted(self):
        self.assertEqual(qa_commands("minecraftaibuilder"),
                         [["node", "--test", "scripts/r125-v4h-mezzanine.test.mjs"]])
        self.assertEqual(len(qa_commands("browser-ink-tps")), 3)
        with self.assertRaises(Hold):
            qa_commands("unknown")

if __name__ == "__main__":
    unittest.main()
