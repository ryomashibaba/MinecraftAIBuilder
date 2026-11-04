"""Offline strict single-project admission tests. No paid models or GitHub writes."""
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

from prepare_pinned_real_project import (Hold, REPOSITORIES, load_manifest,
                                         source_blob_sha, verify_private_clone)


def git(workspace: Path, *argv: str) -> str:
    out = subprocess.run(["git", "-C", str(workspace), *argv], capture_output=True,
                         text=True, check=True, timeout=20)
    return out.stdout.strip()


class RealProjectSourceAdmissionTests(unittest.TestCase):
    def test_equal_priority_both_known_and_no_unsafe_permissions(self):
        data = load_manifest()
        self.assertEqual(set(data["project_candidates"]), set(REPOSITORIES))
        self.assertEqual(data["simultaneous_active_projects_max"], 1)
        self.assertFalse(data["allow_paid_api"])
        self.assertFalse(data["allow_main_write"])
        self.assertFalse(data["allow_dockerless_untrusted_model_source_execution"])

    def test_manifest_mutations_fail_closed(self):
        cases = []
        src = load_manifest()
        x = copy.deepcopy(src)
        x["project_candidates"]["browser-ink-tps"]["repository"] = "someone/unknown"
        cases.append(x)
        x = copy.deepcopy(src)
        x["project_candidates"]["minecraftaibuilder"]["pinned_commit"] = "main"
        cases.append(x)
        x = copy.deepcopy(src)
        x["project_candidates"]["browser-ink-tps"]["source_file"] = "../../.ssh/id_rsa"
        cases.append(x)
        x = copy.deepcopy(src)
        x["simultaneous_active_projects_max"] = 2
        cases.append(x)
        x = copy.deepcopy(src)
        x["allow_paid_api"] = True
        cases.append(x)
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "manifest.json"
            for case in cases:
                with self.subTest(case=case):
                    path.write_text(json.dumps(case), encoding="utf-8")
                    with self.assertRaises(Hold):
                        load_manifest(path)

    def test_git_blob_sha_matches_git_algorithm(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "sample.mjs"
            path.write_bytes(b"export const ok=true;\n")
            out = subprocess.check_output(["git", "hash-object", str(path)],
                                          text=True).strip()
        self.assertEqual(source_blob_sha(b"export const ok=true;\n"), out)

    def mock_repo(self, base: Path):
        root = base / "private-repo"
        root.mkdir()
        git(root, "init", "-b", "research/private-test")
        git(root, "config", "user.name", "Private CI Fixture")
        git(root, "config", "user.email", "fixture@example.invalid")
        git(root, "remote", "add", "origin",
            "https://github.com/ryomashibaba/MinecraftAIBuilder.git")
        (root / "source" / "ai").mkdir(parents=True)
        text = b"export const stable = 1;\n"
        (root / "source" / "ai" / "sample.mjs").write_bytes(text)
        git(root, "add", "--", "source")
        git(root, "commit", "-m", "mock baseline")
        lane = {
            "repository": "ryomashibaba/MinecraftAIBuilder",
            "pinned_commit": git(root, "rev-parse", "HEAD"),
            "research_branch_for_private_clone": "research/private-test",
            "source_file": "source/ai/sample.mjs",
            "source_blob_sha": source_blob_sha(text),
        }
        return root, lane

    def test_real_git_fixture_is_verified_without_mutation(self):
        with tempfile.TemporaryDirectory() as td:
            root, lane = self.mock_repo(Path(td))
            before = git(root, "rev-parse", "HEAD")
            result = verify_private_clone(root, lane)
            self.assertEqual(result["status"], "REAL_SOURCE_CLONE_PINNED_READONLY_READY")
            self.assertEqual(result["model_calls"], 0)
            self.assertEqual(result["git_remote_pushes"], 0)
            self.assertEqual(before, git(root, "rev-parse", "HEAD"))
            self.assertEqual(git(root, "status", "--porcelain"), "")

    def test_local_dirty_or_changed_branch_or_wrong_source_block(self):
        with tempfile.TemporaryDirectory() as td:
            root, lane = self.mock_repo(Path(td))
            file = root / lane["source_file"]
            file.write_bytes(b"export const stable = 2;\n")
            with self.assertRaisesRegex(Hold, "CLONE_DIRTY"):
                verify_private_clone(root, lane)
            git(root, "restore", "--", lane["source_file"])
            git(root, "branch", "-m", "main")
            with self.assertRaisesRegex(Hold, "RESEARCH_BRANCH_CHANGED"):
                verify_private_clone(root, lane)

    def test_canonical_blob_hash_filters_cross_platform_crlf(self):
        # A Git blob is LF-normalized by source .gitattributes on Windows;
        # the literal raw file SHA must not be used for the admission gate.
        with tempfile.TemporaryDirectory() as td:
            root, lane = self.mock_repo(Path(td))
            attrs = root / ".gitattributes"
            attrs.write_text("* text=auto\n", encoding="utf-8")
            git(root, "add", ".gitattributes")
            git(root, "commit", "-m", "enable normalized text attributes")
            target = root / lane["source_file"]
            lf = target.read_bytes()
            target.write_bytes(lf.replace(b"\n", b"\r\n"))
            self.assertNotEqual(source_blob_sha(target.read_bytes()),
                                lane["source_blob_sha"])
            actual = git(root, "hash-object", "--path",
                         lane["source_file"], lane["source_file"])
            self.assertEqual(actual, lane["source_blob_sha"])

    def test_wrong_remote_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            root, lane = self.mock_repo(Path(td))
            git(root, "remote", "set-url", "origin", "https://github.com/not-user/project.git")
            with self.assertRaisesRegex(Hold, "REMOTE_ORIGIN_NOT_EXPECTED"):
                verify_private_clone(root, lane)


if __name__ == "__main__":
    unittest.main()
