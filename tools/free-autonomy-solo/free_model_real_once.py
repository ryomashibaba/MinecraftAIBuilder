"""One real, zero-extra-API-cost OpenCode FREE-model trial on a disposable CI fixture.

No user's repository content or credentials are shared with the provider. This is
a *single attempted request*, not a model quality/availability certification.
"""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from docker_sandbox import DockerPolicy, SandboxHold, docker_exec

MODEL = "opencode/glm-5.3-flash-free"


def sh(repo: Path, *args: str) -> str:
    r = subprocess.run(["git", *args], cwd=repo, text=True, capture_output=True,
                       timeout=30, check=True)
    return r.stdout.strip()


def trial() -> dict:
    with tempfile.TemporaryDirectory(prefix="free-autonomy-genuine-free-") as tmp:
        root = Path(tmp)
        repo = root / "disposable-public-fixture"
        repo.mkdir(mode=0o777)
        (repo / "calc.py").write_text(
            "def clamp(value, low, high):\n"
            "    \"\"\"Return value limited to the inclusive [low, high] interval.\"\"\"\n"
            "    return value  # Intentional failing implementation\n", encoding="utf-8")
        (repo / "test_contract.py").write_text(
            "import unittest\nfrom calc import clamp\n"
            "class Contract(unittest.TestCase):\n"
            "    def test_middle(self): self.assertEqual(clamp(5, 0, 10), 5)\n"
            "    def test_below(self): self.assertEqual(clamp(-5, 0, 10), 0)\n"
            "    def test_above(self): self.assertEqual(clamp(42, 0, 10), 10)\n"
            "    def test_same_limits(self): self.assertEqual(clamp(2, 2, 2), 2)\n"
            "    def test_bad_limits(self):\n"
            "        with self.assertRaises(ValueError): clamp(5, 10, 0)\n",
            encoding="utf-8")
        sh(repo, "init", "-b", "research/ephemeral-free-llm-proof")
        sh(repo, "config", "user.name", "Isolated CI Witness")
        sh(repo, "config", "user.email", "witness@example.invalid")
        sh(repo, "add", "calc.py", "test_contract.py")
        sh(repo, "commit", "-m", "Intentional failing public fixture")
        pre = sh(repo, "rev-parse", "HEAD")
        before = hashlib.sha256((repo / "test_contract.py").read_bytes()).hexdigest()
        # Only this throwaway fixture is writable; Git metadata is separately RO.
        repo.chmod(0o777)
        (repo / "calc.py").chmod(0o666)
        (repo / "test_contract.py").chmod(0o444)
        policy = DockerPolicy(network="bridge", memory="4g", cpus="2", pids=128)
        prompt = (
            "You are in a disposable, public, isolated test repository. "
            "Edit ONLY calc.py. Its clamp(value, low, high) function must clamp "
            "to inclusive bounds and raise ValueError if low > high. "
            "Do not edit tests, run Git commands, use any paid model, "
            "or read files outside this workspace. Finish after the edit."
        )
        rc, tail = docker_exec(
            policy, repo, agent=True,
            command=["opencode", "run", "--auto", "--model", MODEL, prompt],
            cidfile=root / "model.cid", timeout=240,
            log=root / "model.private.log")
        if rc != 0:
            raise SandboxHold("GENUINE_FREE_REQUEST_NOT_SUCCESSFUL; CLI_EXIT=" +
                              str(rc) + " tail=" + tail[-250:])
        if sh(repo, "rev-parse", "HEAD") != pre:
            raise SandboxHold("UNAUTHORIZED_GIT_HISTORY_MUTATION")
        changed = sh(repo, "status", "--porcelain", "--untracked-files=all")
        if changed.strip() != "M calc.py":
            raise SandboxHold("UNEXPECTED_AGENT_CHANGES: " + changed[:200])
        if hashlib.sha256((repo / "test_contract.py").read_bytes()).hexdigest() != before:
            raise SandboxHold("CONTRACT_TEST_WAS_TAMPERED")
        result = subprocess.run(
            ["python3", "-m", "unittest", "-v", "test_contract"],
            cwd=repo, capture_output=True, text=True, timeout=30)
        if result.returncode:
            raise SandboxHold("INDEPENDENT_CONTRACT_QA_FAILED: " + result.stderr[-450:])
        sh(repo, "add", "--", "calc.py")
        sh(repo, "commit", "-m", "source: one genuine free model candidate verified by CI")
        commit = sh(repo, "rev-parse", "HEAD")
        return {
            "schema": "dec-free-autonomy-real-free-model-once-v1",
            "status": "ONE_REAL_FREE_MODEL_SOURCE_QA_CANDIDATE",
            "requested_model": MODEL,
            "request_attempts": 1,
            "source_modified": True,
            "independent_tests_passed": 5,
            "local_ephemeral_commit": commit,
            "git_remote_pushes": 0,
            "user_repo_files_used": 0,
            "paid_api_credentials_provided": 0,
            "windows_verified": False,
            "long_unattended_operation_verified": False,
            "real_project_quality_verified": False,
            "provider_identity_cryptographically_verified": False,
        }


if __name__ == "__main__":
    try:
        print(json.dumps(trial(), indent=2, sort_keys=True))
    except (OSError, ValueError, SandboxHold, subprocess.SubprocessError) as exc:
        print(json.dumps({"status": "HOLD", "reason": str(exc)[-650:]}))
        raise SystemExit(2)
