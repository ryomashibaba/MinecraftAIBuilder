"""Receiver contract: real synthetic Git baseline, mock Docker/transport, no network."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from prepare_pinned_real_project import load_manifest, source_blob_sha
from public_qa_handoff_protocol import Hold, make_payload
from receive_public_research_qa import handle


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], check=True,
                          capture_output=True, text=True, timeout=20).stdout.strip()


class ReceiverTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = Path(tmp.name)

    def fixture(self, project):
        root = self.tmp / project
        workspace = root / "repo"
        workspace.mkdir(parents=True)
        manifest = load_manifest()
        lane = manifest["project_candidates"][project]
        dest = workspace / lane["source_file"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        original = (
            "export const MEZZANINE_SCHEMA=1;\n"
            "export function compileMezzanineAuthorIntent(a){return a;}\n"
            "export function compileAuthoredPublicMezzanine(a){return a;}\n"
            if project == "minecraftaibuilder" else
            "export function sourceCoopEligible(a){return a;}\n"
            "export function b423UseRealSourceWorldReplay(a){return a;}\n"
            "export function sourceCoopNavigationUrl(a){return a;}\n"
        )
        dest.write_text(original, encoding="utf-8")
        git(workspace, "init", "-b", lane["research_branch_for_private_clone"])
        git(workspace, "config", "user.name", "Private CI")
        git(workspace, "config", "user.email", "ci@example.invalid")
        git(workspace, "config", "core.autocrlf", "false")
        git(workspace, "remote", "add", "origin",
            "https://github.com/" + lane["repository"] + ".git")
        git(workspace, "add", lane["source_file"])
        git(workspace, "commit", "-m", "test fixture")
        lane["pinned_commit"] = git(workspace, "rev-parse", "HEAD")
        lane["source_blob_sha"] = source_blob_sha(dest.read_bytes())
        a = original + "// reviewed public stage one\n"
        b = a + "// reviewed public stage two\n"
        payload = make_payload(project, "qwen3:14b", original, a, b,
                               synthetic=True, manifest=manifest)
        input_file = self.tmp / (project + ".json")
        input_file.write_text(json.dumps(payload), encoding="utf-8")
        return root, workspace, manifest, input_file, original

    def test_two_projects_can_be_received_without_model_claim(self):
        for project in ("minecraftaibuilder", "browser-ink-tps"):
            with self.subTest(project=project):
                root, workspace, manifest, source, original = self.fixture(project)
                admitted = {"status": "REAL_SOURCE_CLONE_PINNED_READONLY_READY",
                            "private_workspace_path": str(workspace)}
                mock_promote_result = {
                    "status": "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS",
                    "completed_stages": 2,
                    "local_qa_commits": [{"qa_checks_passed": 1},
                                         {"qa_checks_passed": 1}],
                }
                with patch("receive_public_research_qa.prepare", return_value=admitted), \
                     patch("receive_public_research_qa.promote",
                           return_value=mock_promote_result) as promote_mock:
                    result = handle(source, parent=self.tmp / ("tmp_" + project),
                                    manifest=manifest)
                self.assertEqual(result["status"],
                                 "TWO_STAGES_INDEPENDENT_DOCKER_SOURCE_QA_LOCAL_COMMITS")
                self.assertEqual(result["private_local_git_commits"], 2)
                self.assertFalse(result["model_identity_independently_verified"])
                self.assertFalse(result["project_improvement_certified"])
                self.assertFalse(result["user_windows_or_gpu_tested"])
                self.assertTrue(result["synthetic_fixture"])
                promote_mock.assert_called_once()
                self.assertEqual((workspace / manifest["project_candidates"][project]["source_file"]).read_text(), original)

    def test_receipt_forged_draft_refused_before_qa(self):
        root, workspace, manifest, path, original = self.fixture("minecraftaibuilder")
        payload = json.loads(path.read_text())
        payload["stage2_source"] = "malicious injected mismatch"
        path.write_text(json.dumps(payload))
        admission = {"status": "REAL_SOURCE_CLONE_PINNED_READONLY_READY",
                     "private_workspace_path": str(workspace)}
        with patch("receive_public_research_qa.prepare", return_value=admission), \
             patch("receive_public_research_qa.promote") as spy:
            with self.assertRaisesRegex(Hold, "SOURCE_HASH_CHAIN_MISMATCH"):
                handle(path, parent=self.tmp / "faked-hold", manifest=manifest)
            spy.assert_not_called()


if __name__ == "__main__":
    unittest.main()
