"""Offline mock and real-Git regression for Qwen14B real-project draft proposals.

The model transport is synthetic in these tests; actual Qwen inference and
native project QA are NOT certified here. Nothing is pushed to GitHub.
"""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from draft_real_project_local14b import (
    ANCHORS, Hold, bounded_replacement, exclusive_local_project_lock,
    local_model_installed, run,
)
from prepare_pinned_real_project import load_manifest, source_blob_sha, verify_private_clone


MAB_SOURCE = """export const MEZZANINE_SCHEMA = 'v4h';
export function compileMezzanineAuthorIntent(value) {
  return value;
}
export function compileAuthoredPublicMezzanine(value) {
  return value;
}
"""
TPS_SOURCE = """export function sourceCoopEligible(value) {
  return value;
}
export function b423UseRealSourceWorldReplay(value) {
  return value;
}
export function sourceCoopNavigationUrl(value) {
  return value;
}
"""


def git(root, *args):
    return subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True,
        text=True, check=True, timeout=30).stdout.strip()


class RealSourceDraftTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = Path(tmp.name)

    def make_fixture(self, project):
        manifest = load_manifest()
        lane = manifest["project_candidates"][project]
        workspace = self.tmp / ("private-git-" + project)
        workspace.mkdir()
        source_path = workspace / lane["source_file"]
        source_path.parent.mkdir(parents=True)
        source_text = MAB_SOURCE if project == "minecraftaibuilder" else TPS_SOURCE
        source_path.write_text(source_text, encoding="utf-8")
        git(workspace, "init", "-b", lane["research_branch_for_private_clone"])
        git(workspace, "config", "core.autocrlf", "false")
        git(workspace, "config", "user.name", "Private Fixture")
        git(workspace, "config", "user.email", "private@example.invalid")
        git(workspace, "remote", "add", "origin",
            "https://github.com/" + lane["repository"] + ".git")
        git(workspace, "add", "--", lane["source_file"])
        git(workspace, "commit", "-m", "private fixture")
        lane["pinned_commit"] = git(workspace, "rev-parse", "HEAD")
        lane["source_blob_sha"] = source_blob_sha(source_path.read_bytes())
        return manifest, lane, workspace, source_text

    def fake_transport(self, project, *, invalid_stage1=False):
        self.count = 0
        def api(path, payload=None, timeout=0):
            if path == "/api/tags":
                return {"models": [{"name": "qwen3:14b"}]}
            self.assertEqual(path, "/api/chat")
            self.assertEqual(payload["model"], "qwen3:14b")
            self.assertFalse(payload["stream"])
            self.assertTrue(payload["format"]["required"])
            self.count += 1
            if invalid_stage1:
                result = {"find": "", "replace": "bad"}
            else:
                target = ("compileMezzanineAuthorIntent" if project == "minecraftaibuilder"
                          else "sourceCoopEligible") if self.count == 1 else (
                          "compileAuthoredPublicMezzanine" if project == "minecraftaibuilder"
                          else "b423UseRealSourceWorldReplay")
                old = "export function " + target + "(value) {\n  return value;\n}"
                new = "export function " + target + "(value) {\n  return value ?? false;\n}"
                result = {"find": old, "replace": new}
            return {"model": "qwen3:14b", "done": True, "eval_count": 21,
                    "message": {"content": json.dumps(result)}}
        return api

    def execute_fixture(self, project, *, invalid_stage1=False):
        manifest, lane, workspace, original = self.make_fixture(project)
        original_head = git(workspace, "rev-parse", "HEAD")
        admitted = {"status": "REAL_SOURCE_CLONE_PINNED_READONLY_READY",
                    "private_workspace_path": str(workspace)}
        transport = self.fake_transport(project, invalid_stage1=invalid_stage1)
        with patch("draft_real_project_local14b.prepare", return_value=admitted):
            result = run(project, "qwen3:14b", transport=transport,
                         private_root=self.tmp / "private", manifest=manifest)
        return result, manifest, lane, workspace, original, original_head

    def test_real_git_mab_two_source_drafts_without_running_generated_code(self):
        result, manifest, lane, workspace, original, head = self.execute_fixture(
            "minecraftaibuilder")
        self.assertEqual(result["status"], "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY")
        self.assertEqual((result["model_calls_attempted"], result["model_drafts"]), (2, 2))
        self.assertFalse(result["native_QA_executed"])
        self.assertEqual(result["git_commits"], 0)
        self.assertEqual(result["git_pushes"], 0)
        self.assertFalse(result["art_or_game_certified"])
        self.assertEqual((workspace / lane["source_file"]).read_text(), original)
        self.assertEqual(git(workspace, "rev-parse", "HEAD"), head)
        self.assertEqual(git(workspace, "status", "--porcelain"), "")
        self.assertEqual(verify_private_clone(workspace, lane)["head"], head)
        self.assertTrue(Path(result["private_receipt_path"]).is_file())
        self.assertTrue((workspace.parent / "draft_2.private.txt").is_file())
        self.assertIn("return value ?? false", (workspace.parent / "draft_2.private.txt").read_text())

    def test_real_git_tps_two_source_drafts_without_project_mutation(self):
        result, manifest, lane, workspace, original, head = self.execute_fixture(
            "browser-ink-tps")
        self.assertEqual(result["status"], "TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY")
        self.assertEqual(len([s for s in result["stages"] if s["result"].startswith("PRIVATE")]), 2)
        self.assertEqual((workspace / lane["source_file"]).read_text(), original)
        self.assertEqual(git(workspace, "rev-parse", "HEAD"), head)
        self.assertEqual(git(workspace, "status", "--porcelain"), "")

    def test_model_invalid_stage_one_holds_without_modifying_real_git(self):
        result, _, lane, workspace, original, head = self.execute_fixture(
            "minecraftaibuilder", invalid_stage1=True)
        self.assertEqual(result["status"], "HOLD")
        self.assertEqual(result["model_calls_attempted"], 2)
        self.assertEqual(result["model_drafts"], 0)
        self.assertEqual(git(workspace, "rev-parse", "HEAD"), head)
        self.assertEqual((workspace / lane["source_file"]).read_text(), original)
        self.assertEqual(git(workspace, "status", "--porcelain"), "")

    def test_protected_api_name_removal_is_rejected(self):
        for project in ("minecraftaibuilder", "browser-ink-tps"):
            original = MAB_SOURCE if project == "minecraftaibuilder" else TPS_SOURCE
            anchor = ANCHORS[project][0]
            with self.subTest(project=project):
                with self.assertRaisesRegex(Hold, "PROTECTED_PUBLIC_CONTRACT_ANCHOR_REMOVED"):
                    bounded_replacement(project, original, {
                        "find": anchor, "replace": "DELETED_PUBLIC_ANCHOR"})

    def test_bounded_patch_rejects_noops_and_ambiguous_finds(self):
        for proposal, reason in [
            ({"find": "value", "replace": "0"}, "PATCH_MATCH_MUST_BE_UNIQUE"),
            ({"find": "value", "replace": "value"}, "PATCH_NOOP_EMPTY_OR_OVERSIZED"),
            ({"find": "", "replace": "x"}, "PATCH_NOOP_EMPTY_OR_OVERSIZED"),
            ({"find": "a", "replace": "x" * 5001}, "PATCH_NOOP_EMPTY_OR_OVERSIZED"),
        ]:
            with self.subTest(reason=reason):
                with self.assertRaisesRegex(Hold, reason):
                    bounded_replacement("minecraftaibuilder", MAB_SOURCE, proposal)

    def test_unknown_model_is_never_downloaded(self):
        def api(path, payload=None, timeout=0):
            self.assertEqual(path, "/api/tags")
            return {"models": [{"name": "another:1b"}]}
        self.assertFalse(local_model_installed("qwen3:14b", transport=api))
        with self.assertRaisesRegex(Hold, "MODEL_NAME_REJECTED"):
            local_model_installed("https://example.invalid/a?b=x", transport=api)

    def test_lock_rejects_parallel_local_agents(self):
        with patch.dict("os.environ", {"LOCALAPPDATA": str(self.tmp)}):
            with exclusive_local_project_lock():
                with self.assertRaisesRegex(Hold, "ANOTHER_LOCAL_PROJECT_ALREADY_RUNNING"):
                    with exclusive_local_project_lock():
                        pass

if __name__ == "__main__":
    unittest.main()
