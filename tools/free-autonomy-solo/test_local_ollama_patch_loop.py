"""Real Git fixture + mocked Ollama/Docker. NEVER real LLM certification."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from local_ollama_patch_loop import (Hold, apply_exact_patch, execute,
                                     propose_once, validate_config, qa_image_preflight)


def git(root, *args):
    return subprocess.run(["git", *args], cwd=root, capture_output=True,
                          check=True, text=True).stdout.strip()


class LocalPatchLoopTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.home = Path(tmp.name)
        self.clone = self.home / "clone"
        self.clone.mkdir()
        git(self.clone, "init", "-b", "research/isolated-test")
        git(self.clone, "config", "user.name", "Fixture")
        git(self.clone, "config", "user.email", "fixture@example.invalid")
        git(self.clone, "remote", "add", "origin",
            "https://github.com/ryomashibaba/MinecraftAIBuilder.git")
        (self.clone / "source").mkdir()
        self.target = self.clone / "source" / "calc.mjs"
        self.target.write_text("export function clamp(value) { return value; }\n")
        git(self.clone, "add", ".")
        git(self.clone, "commit", "-m", "baseline")
        self.base = git(self.clone, "rev-parse", "HEAD")
        self.cfg = {
            "project": "minecraftaibuilder",
            "workspace": str(self.clone),
            "branch": "research/isolated-test",
            "model": "qwen3:14b",
            "sandbox_runtime": "docker",
            "docker": {"network": "none"},
            "state_dir": str(self.home / "PRIVATE"),
            "tasks": [
                {"path": "source/calc.mjs", "request": "Clamp negative inputs to zero"},
                {"path": "source/calc.mjs", "request": "Also clamp values above 10"}
            ],
            "checks": [["node", "--test", "source/calc.test.mjs"]],
            "allowed_prefixes": ["source"],
            "max_cycles": 4
        }
        self.proposals = [
            ({"find": "return value;", "replace": "return Math.max(0,value);"},
             {"model": "qwen3:14b", "done": True, "eval_count": 20}),
            ({"find": "return Math.max(0,value);",
              "replace": "return Math.min(10,Math.max(0,value));"},
             {"model": "qwen3:14b", "done": True, "eval_count": 25})
        ]
        self.env = {"LOCALAPPDATA": str(self.home / "LOCK")}
        
    def run_fake(self, *, qa=None, patches=None):
        with patch.dict(os.environ, self.env), \
             patch("local_ollama_patch_loop.qa_image_preflight"), \
             patch("local_ollama_patch_loop.propose_once",
                   side_effect=patches or self.proposals) as model, \
             patch("local_ollama_patch_loop.run_in_docker",
                   side_effect=qa or (lambda *a, **k: (0, "MOCK_QA_ONLY"))) as test:
            value = execute(dict(self.cfg))
        return value, model.call_count, test.call_count

    def test_two_meaningful_steps_commit_on_same_project(self):
        result, calls, tests = self.run_fake()
        self.assertEqual(result["status"], "SOURCE_ONLY_TASK_QUEUE_DONE")
        self.assertEqual((calls, tests), (2, 2))
        self.assertEqual(len(result["commits"]), 2)
        self.assertNotEqual(self.base, git(self.clone, "rev-parse", "HEAD"))
        self.assertIn("Math.min(10", self.target.read_text())
        self.assertEqual(git(self.clone, "status", "--porcelain"), "")
        self.assertFalse(result["real_model_verified"])
        self.assertFalse(result["art_certified"])
        self.assertFalse(result["minecraft_or_4v4_certified"])
        self.assertTrue((self.home / "PRIVATE" / "model_0001.private.json").is_file())
        self.assertTrue((self.home / "PRIVATE" / "model_0002.private.json").is_file())

    def test_resuming_completed_queue_does_not_regenerate(self):
        self.run_fake()
        result, calls, tests = self.run_fake(patches=[])
        self.assertEqual(len(result["commits"]), 2)
        self.assertEqual((calls, tests), (0, 0))

    def test_failed_qa_restores_file_before_next_attempt(self):
        n = 0
        def qa(*args, **kwargs):
            nonlocal n
            n += 1
            return (1, "synthetic failure") if n == 1 else (0, "ok")
        result, calls, tests = self.run_fake(qa=qa,
                                              patches=[self.proposals[0],
                                                       self.proposals[0],
                                                       self.proposals[1]])
        self.assertEqual(result["status"], "SOURCE_ONLY_TASK_QUEUE_DONE")
        self.assertEqual((calls, tests), (3, 3))
        self.assertEqual(len(result["commits"]), 2)
        self.assertEqual(result["cycles"], 3)

    def test_qa_source_mutation_is_held_without_commit(self):
        def rogue_qa(*args, **kwargs):
            (self.clone / "source" / "rogue.mjs").write_text("malicious")
            return 0, "MOCK_TEST_OK"
        with self.assertRaisesRegex(Hold, "QA_CHANGED_SOURCE_OR_OTHER_FILES"):
            self.run_fake(qa=rogue_qa)
        self.assertEqual(git(self.clone, "rev-parse", "HEAD"), self.base)
        st = json.loads((self.home / "PRIVATE" / "local_patch_state.json").read_text())
        self.assertEqual(st["status"], "HOLD")

    def test_refuses_non_research_branch(self):
        git(self.clone, "branch", "-m", "main")
        cfg = dict(self.cfg, branch="main")
        with self.assertRaisesRegex(Hold, "RESEARCH_BRANCH_REQUIRED"):
            with patch("local_ollama_patch_loop.qa_image_preflight"):
                execute(cfg)

    def test_refuses_network_on_direct_host_ollama(self):
        cfg = dict(self.cfg, docker={"network": "bridge"})
        with self.assertRaisesRegex(Hold, "DIRECT_LOCAL_MODEL_REQUIRES_QA_NETWORK_NONE"):
            validate_config(cfg)

    def test_refuses_unapproved_source_paths(self):
        cfg = dict(self.cfg, tasks=[{"path": "docs/continuity/DECISIONS_JA.md",
                                     "request": "Edit immutable decisions"}],
                   allowed_prefixes=["docs"])
        with patch("local_ollama_patch_loop.qa_image_preflight"), \
             patch.dict(os.environ, self.env):
            with self.assertRaisesRegex(Hold, "PATH_NOT_APPROVED"):
                execute(cfg)

    def test_patch_must_have_unique_find(self):
        dup = self.home / "code.mjs"
        dup.write_text("x\nx\n")
        with self.assertRaisesRegex(Hold, "MODEL_FIND_NOT_EXACTLY_UNIQUE"):
            apply_exact_patch(dup, {"find": "x", "replace": "y"}, dup.read_text())

    def test_patch_rejects_symlink(self):
        source = self.home / "real.mjs"
        source.write_text("x")
        link = self.home / "link.mjs"
        try:
            link.symlink_to(source)
        except OSError:
            self.skipTest("symlinks unavailable")
        with self.assertRaisesRegex(Hold, "SOURCE_MUST_BE_REGULAR_FILE"):
            apply_exact_patch(link, {"find": "x", "replace": "y"}, "x")

    def test_schema_real_api_shape_but_mocked_response(self):
        def fake_response(url, payload=None, timeout=0):
            if url.endswith("/api/tags"):
                return {"models": [{"name": "qwen3:14b"}]}
            self.assertEqual(payload["stream"], False)
            self.assertIsInstance(payload["format"], dict)
            self.assertEqual(payload["model"], "qwen3:14b")
            return {"model": "qwen3:14b", "done": True,
                    "message": {"content": '{"find":"old","replace":"new"}'},
                    "eval_count": 11}
        with patch("local_ollama_patch_loop.get_json", side_effect=fake_response):
            a, m = propose_once("qwen3:14b", "source/calc.mjs", "old", "Replace", "", timeout=8)
        self.assertEqual(a, {"find": "old", "replace": "new"})
        self.assertEqual(m["eval_count"], 11)

    def test_model_non_matching_identity_is_rejected(self):
        with patch("local_ollama_patch_loop.get_json",
                   side_effect=[{"models": [{"name": "qwen3:14b"}]},
                                {"model": "another", "done": True,
                                 "message": {"content": '{"find":"x","replace":"y"}'}}]):
            with self.assertRaisesRegex(Hold, "MODEL_RESPONSE_NOT_COMPLETE_OR_IDENTIFIED"):
                propose_once("qwen3:14b", "source/x.mjs", "x", "Improve", "")

    def test_no_local_model_autopull(self):
        with patch("local_ollama_patch_loop.get_json",
                   return_value={"models": [{"name": "unrelated:7b"}]}):
            with self.assertRaisesRegex(Hold, "MODEL_NOT_INSTALLED_NO_AUTO_PULL"):
                propose_once("qwen3:14b", "source/x.mjs", "x", "Improve", "")

if __name__ == "__main__":
    unittest.main()
