"""Offline-only tests for no-Docker 2-stage local model witness.

These use canned JSON model replies and NEVER establish real-model evidence.
"""
import json
from pathlib import Path
import tempfile
import unittest

from local_qwen_no_docker_two_step import (Hold, SCHEMA, independent_qa,
                                           interpret, local_api, parse_bounded_code,
                                           run_trial)

STAGE1 = """def clamp(value, low, high):
    return min(max(value, low), high)
"""
STAGE2 = """def clamp(value, low, high):
    if low > high:
        raise ValueError("bad bounds")
    return min(max(value, low), high)
"""


class NoDockerTwoStageTests(unittest.TestCase):
    def test_stage_one_and_stage_two_qa(self):
        self.assertEqual(independent_qa(STAGE1, second_stage=False), 6)
        self.assertEqual(independent_qa(STAGE2, second_stage=True), 8)
        with self.assertRaisesRegex(Hold, "EXPECTED_VALUEERROR"):
            independent_qa(STAGE1, second_stage=True)

    def test_no_model_code_is_ever_exec_or_eval(self):
        for candidate in (
            "import os\n" + STAGE2,
            "def clamp(value, low, high):\n    open('unsafe')\n    return value",
            "def clamp(value, low, high):\n    while True: pass",
            "def clamp(value, low, high):\n    def helper(): return 4\n    return helper()",
            "def clamp(value, low, high):\n    return value.__class__",
            "def clamp(value, low, high):\n    return __import__('os')",
            "def clamp(value, low, high):\n    return [x for x in range(10)]",
        ):
            with self.subTest(candidate=candidate):
                with self.assertRaises(Hold):
                    parse_bounded_code(candidate)

    def test_nested_or_default_signatures_refused(self):
        for candidate in (
            "def clamp(value,low,high=3):\n    return value",
            "def clamp(*args):\n    return 2",
            "def clamp(value,low,high)->int:\n    return value",
            "def clamp(value,low,high):\n    def helper(): return 4\n    return value",
        ):
            with self.subTest(candidate=candidate):
                with self.assertRaises(Hold):
                    parse_bounded_code(candidate)

    def test_interpreter_does_not_mutate_host_environment(self):
        f = parse_bounded_code(STAGE2)
        self.assertEqual(interpret(f, -3, 0, 10), 0)
        self.assertEqual(interpret(f, 12, 0, 10), 10)
        with self.assertRaises(ValueError):
            interpret(f, 5, 9, 0)

    def test_full_two_stage_source_qa_with_mock_model(self):
        calls = []
        def fixture_api(path, payload=None, timeout=0):
            calls.append((path, payload))
            if path == "/api/tags":
                return {"models": [{"name": "qwen3:14b"}]}
            self.assertEqual(payload["model"], "qwen3:14b")
            self.assertEqual(payload["stream"], False)
            self.assertEqual(payload["format"], SCHEMA)
            src = STAGE1 if len([x for x in calls if x[0] == "/api/chat"]) == 1 else STAGE2
            return {"model": "qwen3:14b", "done": True, "eval_count": 80,
                    "message": {"content": json.dumps({"code": src})}}
        with tempfile.TemporaryDirectory() as root:
            base = Path(root) / "receipt"
            r = run_trial("qwen3:14b", base, transport=fixture_api)
            self.assertEqual(r["status"], "TWO_STAGE_REAL_LOCAL_AST_QA_ONLY")
            self.assertEqual(r["independent_qa_completed_stages"], 2)
            self.assertEqual(r["model_calls_attempted"], 2)
            self.assertEqual([x["checks"] for x in r["stage_results"]], [6, 8])
            self.assertEqual((base / "stage2_candidate.py").read_text(), STAGE2)
            self.assertTrue((base / "SHAREABLE_RESULT.json").exists())
            self.assertFalse(any("raw_response" in x.name for x in base.iterdir()))

    def test_retry_one_unsafe_output_then_success(self):
        count = 0
        def api(path, payload=None, timeout=0):
            nonlocal count
            if path == "/api/tags":
                return {"models": [{"name": "qwen3:14b"}]}
            count += 1
            value = "import os\n" + STAGE1 if count == 1 else (STAGE1 if count == 2 else STAGE2)
            return {"model": "qwen3:14b", "done": True,
                    "message": {"content": json.dumps({"code": value})}}
        with tempfile.TemporaryDirectory() as temp:
            r = run_trial("qwen3:14b", Path(temp) / "receipt", transport=api)
        self.assertEqual(r["status"], "TWO_STAGE_REAL_LOCAL_AST_QA_ONLY")
        self.assertEqual(r["model_calls_attempted"], 3)
        self.assertEqual(r["stage_results"][0]["status"], "REJECTED_NO_SOURCE_EXECUTION")

    def test_fails_closed_if_second_stage_invalid_twice(self):
        num = 0
        def api(path, payload=None, timeout=0):
            nonlocal num
            if path == "/api/tags":
                return {"models": [{"name": "qwen3:14b"}]}
            num += 1
            value = STAGE1
            return {"model": "qwen3:14b", "done": True,
                    "message": {"content": json.dumps({"code": value})}}
        with tempfile.TemporaryDirectory() as temp:
            r = run_trial("qwen3:14b", Path(temp) / "trial", transport=api)
        self.assertEqual(r["status"], "HOLD")
        self.assertEqual(r["independent_qa_completed_stages"], 1)
        self.assertEqual(r["model_calls_attempted"], 3)
        self.assertEqual(r["git_commits"], 0)
        self.assertEqual(r["github_pushes"], 0)

    def test_refuses_missing_local_model_without_auto_pull(self):
        def api(path, payload=None, timeout=0):
            return {"models": [{"name": "another:8b"}]}
        with tempfile.TemporaryDirectory() as temp:
            r = run_trial("qwen3:14b", Path(temp) / "trial", transport=api)
        self.assertEqual(r["status"], "HOLD")
        self.assertEqual(r["hold_reason"], "MODEL_NOT_INSTALLED_NO_PULL")
        self.assertEqual(r["model_calls_attempted"], 0)

    def test_only_fixed_loopback_endpoints(self):
        with self.assertRaisesRegex(Hold, "ONLY_LOCAL"):
            local_api("/api/generate")

    def test_invalid_name_rejected_before_request(self):
        with tempfile.TemporaryDirectory() as temp:
            r = run_trial("http://attacker.test/not-a-model", Path(temp) / "trial")
        self.assertEqual(r["status"], "HOLD")
        self.assertEqual(r["model_calls_attempted"], 0)


if __name__ == "__main__":
    unittest.main()
