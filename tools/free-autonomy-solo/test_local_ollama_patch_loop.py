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

    def test_model_noop_is_retried_without_workspace_write(self):
        noop = ({"find": "return Math.max(0,value);",
                 "replace": "return Math.max(0,value);"},
                {"model": "qwen3:14b", "done": True})
        result, calls, qa = self.run_fake(
            patches=[self.proposals[0], noop, self.proposals[1]])
        self.assertEqual((result["status"], calls, qa),
                         ("SOURCE_ONLY_TASK_QUEUE_DONE", 3, 2))
        self.assertEqual(len(result["commits"]), 2)
        self.assertEqual(result["outcomes"][0]["status"], "REJECTED_MODEL_PATCH_NO_WRITE")

    def test_repeated_model_noop_holds_cleanly(self):
        noop = ({"find": "return value;", "replace": "return value;"},
                {"model": "qwen3:14b", "done": True})
        cfg = dict(self.cfg, tasks=[self.cfg["tasks"][0]],
                   max_cycles=2, per_task_attempts=2)
        with patch.dict(os.environ, self.env), \
             patch("local_ollama_patch_loop.qa_image_preflight"), \
             patch("local_ollama_patch_loop.propose_once", side_effect=[noop, noop]), \
             patch("local_ollama_patch_loop.run_in_docker") as qa:
            result = execute(cfg)
        self.assertEqual(result["status"], "HOLD_NOT_VERIFIED")
        self.assertEqual(len(result["commits"]), 0)
        self.assertEqual(git(self.clone, "status", "--porcelain"), "")
        self.assertEqual(git(self.clone, "rev-parse", "HEAD"), self.base)
        qa.assert_not_called()

    def test_security_critical_source_change_not_retried(self):
        cfg = dict(self.cfg, tasks=[self.cfg["tasks"][0]])
        with patch.dict(os.environ, self.env), \
             patch("local_ollama_patch_loop.qa_image_preflight"), \
             patch("local_ollama_patch_loop.propose_once",
                   side_effect=Hold("SOURCE_CHANGED_DURING_MODEL_RESPONSE")) as model:
            with self.assertRaisesRegex(Hold, "SOURCE_CHANGED_DURING_MODEL_RESPONSE"):
                execute(cfg)
        self.assertEqual(model.call_count, 1)
        self.assertEqual(git(self.clone, "rev-parse", "HEAD"), self.base)

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
        cfg = dict(self.cfg, tasks=[{"path": "docs/continuity/DECISIONS_JA.json",
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

    def test_independent_qa_can_change_between_consecutive_tasks(self):
        cfg = dict(self.cfg)
        cfg["tasks"] = [
            dict(self.cfg["tasks"][0], checks=[["node", "--test", "first.test.mjs"]]),
            dict(self.cfg["tasks"][1], checks=[["node", "--test", "second.test.mjs"]])
        ]
        commands = []
        def qa(_cfg, command, *args, **kwargs):
            commands.append(command)
            return 0, "MOCK_QA_ONLY"
        with patch.dict(os.environ, self.env), \
             patch("local_ollama_patch_loop.qa_image_preflight"), \
             patch("local_ollama_patch_loop.propose_once",
                   side_effect=self.proposals), \
             patch("local_ollama_patch_loop.run_in_docker", side_effect=qa):
            result = execute(cfg)
        self.assertEqual(result["status"], "SOURCE_ONLY_TASK_QUEUE_DONE")
        self.assertEqual(commands, [["node", "--test", "first.test.mjs"],
                                    ["node", "--test", "second.test.mjs"]])

    def test_push_refuses_branch_not_present_on_remote(self):
        from local_ollama_patch_loop import ensure_remote_research_branch
        real_run = subprocess.run
        def fake_only_remote(argv, **kw):
            if argv[:2] == ["git", "ls-remote"]:
                return subprocess.CompletedProcess(argv, 0, stdout="", stderr="")
            return real_run(argv, **kw)
        with patch("local_ollama_patch_loop.subprocess.run", side_effect=fake_only_remote):
            with self.assertRaisesRegex(Hold, "REMOTE_RESEARCH_BRANCH_NOT_PREEXISTING"):
                ensure_remote_research_branch(self.cfg, self.clone)

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

    def test_real_failure_shapes_have_distinct_safe_diagnostics(self):
        cases = [
            ({'find': '', 'replace': 'return 0;'}, 'MODEL_PATCH_FIND_EMPTY'),
            ({'find': 'return value;', 'replace': ''}, 'MODEL_PATCH_REPLACEMENT_EMPTY'),
            ({'find': 'x', 'replace': 'x'}, 'MODEL_PATCH_NOOP_IDENTICAL'),
            ({'bad': 'x'}, 'MODEL_PATCH_KEYS_INVALID'),
        ]
        for proposal, reason in cases:
            with self.subTest(reason=reason):
                with patch("local_ollama_patch_loop.get_json", side_effect=[
                    {'models': [{'name': 'qwen3:14b'}]},
                    {'model': 'qwen3:14b', 'done': True,
                     'message': {'content': json.dumps(proposal)}}]):
                    with self.assertRaisesRegex(Hold, reason):
                        propose_once('qwen3:14b', 'source/calc.mjs', 'return value;', 'Fix', '')

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


    def make_local_remote(self):
        """Actual disposable bare Git repo; no network and no GitHub push."""
        remote = self.home / "local-only.git"
        git(self.clone, "init", "--bare", str(remote))
        git(self.clone, "remote", "set-url", "origin", str(remote))
        git(self.clone, "push", "origin",
            "HEAD:refs/heads/research/isolated-test")
        return remote

    def test_real_ollama_path_pushes_two_verified_local_commits_with_lease(self):
        remote = self.make_local_remote()
        cfg = dict(self.cfg)
        with patch.dict(os.environ, self.env), \
             patch("local_ollama_patch_loop.qa_image_preflight"), \
             patch("local_ollama_patch_loop.verify_repo", return_value=self.clone.resolve()), \
             patch("solo_agent.verify_repo", return_value=self.clone.resolve()), \
             patch("local_ollama_patch_loop.propose_once", side_effect=self.proposals), \
             patch("local_ollama_patch_loop.run_in_docker", return_value=(0, "MOCK_SOURCE_QA")):
            outcome = execute(cfg, push=True)
        self.assertEqual(outcome["status"], "SOURCE_ONLY_TASK_QUEUE_DONE")
        self.assertEqual(len(outcome["commits"]), 2)
        self.assertTrue(all(c["pushed"] for c in outcome["commits"]))
        self.assertEqual(git(remote, "rev-parse", "refs/heads/research/isolated-test"),
                         outcome["last_head"])
        self.assertEqual(git(self.clone, "status", "--porcelain"), "")
        self.assertFalse(outcome["real_model_verified"])
        self.assertFalse(outcome["art_certified"])

    def test_direct_ollama_path_remote_diverged_keeps_local_verified_commit(self):
        remote = self.make_local_remote()
        other = self.home / "other-clone"
        git(self.clone, "clone", "--branch", self.cfg["branch"], str(remote), str(other))
        git(other, "config", "user.name", "External Fixture")
        git(other, "config", "user.email", "fixture@example.invalid")
        (other / "source" / "external.txt").write_text("other branch advance")
        git(other, "add", "source/external.txt")
        git(other, "commit", "-m", "external branch advance")
        git(other, "push", "origin", "HEAD:refs/heads/research/isolated-test")
        remote_tip = git(remote, "rev-parse", "refs/heads/research/isolated-test")
        cfg = dict(self.cfg, tasks=self.cfg["tasks"][:1])
        with patch.dict(os.environ, self.env), \
             patch("local_ollama_patch_loop.qa_image_preflight"), \
             patch("local_ollama_patch_loop.verify_repo", return_value=self.clone.resolve()), \
             patch("solo_agent.verify_repo", return_value=self.clone.resolve()), \
             patch("local_ollama_patch_loop.propose_once", side_effect=self.proposals[:1]), \
             patch("local_ollama_patch_loop.run_in_docker", return_value=(0, "MOCK_SOURCE_QA")):
            with self.assertRaisesRegex(
                    Hold, "REMOTE_RESEARCH_TIP_NOT_LOCAL_ANCESTOR"):
                execute(cfg, push=True)
        private = json.loads(
            (self.home / "PRIVATE" / "local_patch_state.json").read_text())
        self.assertEqual(private["status"], "HOLD")
        self.assertIn("UNPUSHED_RESEARCH_COMMIT:", private["hold_reason"])
        self.assertEqual(len(private["commits"]), 1)
        self.assertFalse(private["commits"][0]["pushed"])
        self.assertEqual(private["last_head"], git(self.clone, "rev-parse", "HEAD"))
        self.assertEqual(git(remote, "rev-parse",
                             "refs/heads/research/isolated-test"), remote_tip)
        self.assertEqual(git(self.clone, "status", "--porcelain"), "")

    def test_direct_ollama_resume_pending_rejects_remote_divergence_without_model_call(self):
        remote = self.make_local_remote()
        cfg = dict(self.cfg, tasks=self.cfg["tasks"][:1])
        with patch.dict(os.environ, self.env), \
             patch("local_ollama_patch_loop.qa_image_preflight"), \
             patch("local_ollama_patch_loop.verify_repo", return_value=self.clone.resolve()), \
             patch("solo_agent.verify_repo", return_value=self.clone.resolve()), \
             patch("local_ollama_patch_loop.propose_once", side_effect=self.proposals[:1]), \
             patch("local_ollama_patch_loop.run_in_docker", return_value=(0, "MOCK_SOURCE_QA")):
            first = execute(cfg, push=False)
        self.assertEqual(first["status"], "SOURCE_ONLY_TASK_QUEUE_DONE")
        other = self.home / "other-later-clone"
        git(self.clone, "clone", "--branch", self.cfg["branch"], str(remote), str(other))
        git(other, "config", "user.name", "External Fixture")
        git(other, "config", "user.email", "fixture@example.invalid")
        (other / "source" / "external.txt").write_text("independent")
        git(other, "add", "source/external.txt")
        git(other, "commit", "-m", "external update")
        git(other, "push", "origin", "HEAD:refs/heads/research/isolated-test")
        remote_tip = git(remote, "rev-parse", "refs/heads/research/isolated-test")
        with patch.dict(os.environ, self.env), \
             patch("local_ollama_patch_loop.qa_image_preflight"), \
             patch("local_ollama_patch_loop.verify_repo", return_value=self.clone.resolve()), \
             patch("solo_agent.verify_repo", return_value=self.clone.resolve()), \
             patch("local_ollama_patch_loop.propose_once",
                   side_effect=AssertionError("model must not be rerun")):
            with self.assertRaisesRegex(Hold,
                                        "REMOTE_RESEARCH_TIP_NOT_LOCAL_ANCESTOR"):
                execute(cfg, push=True)
        private = json.loads(
            (self.home / "PRIVATE" / "local_patch_state.json").read_text())
        self.assertEqual(private["status"], "HOLD")
        self.assertEqual(len(private["commits"]), 1)
        self.assertFalse(private["commits"][0]["pushed"])
        self.assertEqual(git(remote, "rev-parse",
                             "refs/heads/research/isolated-test"), remote_tip)


if __name__ == "__main__":
    unittest.main()
