"""December solo-agent Docker ownership mock tests; NEVER a real Docker run."""
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from docker_sandbox import DockerPolicy, SandboxHold
from docker_sandbox_verified import confirm_owned_docker_removed, docker_exec

CID = "a" * 64


class VerifiedDockerLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.cidfile = self.root / "owned.cid"
        self.workspace = self.root / "workspace"
        (self.workspace / ".git").mkdir(parents=True)
        self.log = self.root / "private.log"

    @staticmethod
    def outcome(args, rc, stderr=""):
        return subprocess.CompletedProcess(args, rc, "", stderr)

    def test_only_explicit_not_found_permits_cidfile_removal(self):
        cases = [
            ("successful_removal", 0, 1, "Error: No such object: " + CID, None),
            ("auto_removed", 1, 1, "Error: No such container: " + CID, None),
            ("still_present", 1, 0, "", "OWNED_DOCKER_CONTAINER_STILL_PRESENT"),
            ("daemon_unreachable", 0, 1, "Cannot connect to the Docker daemon", "OWNED_DOCKER_INSPECT_UNAVAILABLE"),
            ("ambiguous_error", 1, 1, "server error", "OWNED_DOCKER_INSPECT_UNAVAILABLE"),
        ]
        for label, rm_rc, inspect_rc, message, failure in cases:
            with self.subTest(label=label):
                self.cidfile.write_text(CID)
                def fake(args, **kwargs):
                    if args[:2] == ["docker", "rm"]:
                        return self.outcome(args, rm_rc)
                    return self.outcome(args, inspect_rc, message)
                with patch("docker_sandbox_verified.subprocess.run", side_effect=fake), \
                     patch("docker_sandbox_verified.time.sleep"):
                    if failure:
                        with self.assertRaisesRegex(SandboxHold, failure):
                            confirm_owned_docker_removed(self.cidfile)
                        self.assertTrue(self.cidfile.exists())
                    else:
                        confirm_owned_docker_removed(self.cidfile)
                        self.assertFalse(self.cidfile.exists())

    def test_invalid_id_never_targets_any_container(self):
        self.cidfile.write_text("malformed")
        with patch("docker_sandbox_verified.subprocess.run") as mocked:
            with self.assertRaisesRegex(SandboxHold, "OWNED_DOCKER_ID_INVALID"):
                confirm_owned_docker_removed(self.cidfile)
            mocked.assert_not_called()
        self.assertTrue(self.cidfile.exists())

    def test_clean_success_requires_owned_id_and_verified_disappearance(self):
        def fake(args, **kwargs):
            if args[:2] == ["docker", "run"]:
                self.cidfile.write_text(CID)
                return subprocess.CompletedProcess(args, 0, "DONE", "")
            if args[:2] == ["docker", "rm"]:
                return self.outcome(args, 0)
            return self.outcome(args, 1, "Error: No such object: " + CID)
        with patch("docker_sandbox_verified.subprocess.run", side_effect=fake) as runner:
            rc, tail = docker_exec(
                DockerPolicy(), self.workspace, agent=False,
                command=["node", "--version"], cidfile=self.cidfile,
                timeout=5, log=self.log,
            )
        self.assertEqual(rc, 0)
        self.assertIn("DONE", tail)
        self.assertTrue(self.log.exists())
        self.assertFalse(self.cidfile.exists())
        self.assertTrue(any(call.args[0][:3] == ["docker", "container", "inspect"] for call in runner.call_args_list))

    def test_owned_agent_and_qa_never_pull_images_implicitly(self):
        scenarios = [
            (False, ["node", "--version"]),
            (True, ["opencode", "run", "--auto", "--model",
                    "ollama/qwen3:14b", "write an isolated candidate"]),
        ]
        for agent, command in scenarios:
            with self.subTest(agent=agent):
                runs = []
                def fake(args, **kwargs):
                    if args[:2] == ["docker", "run"]:
                        runs.append(args)
                        self.cidfile.write_text(CID)
                        return self.outcome(args, 0)
                    if args[:2] == ["docker", "rm"]:
                        return self.outcome(args, 0)
                    return self.outcome(args, 1, "Error: No such object: " + CID)
                with patch("docker_sandbox_verified.subprocess.run", side_effect=fake):
                    rc, _ = docker_exec(
                        (DockerPolicy(network="bridge") if agent else DockerPolicy()),
                        self.workspace, agent=agent,
                        command=command, cidfile=self.cidfile,
                        timeout=5, log=self.log,
                    )
                self.assertEqual(rc, 0)
                self.assertEqual(len(runs), 1)
                self.assertEqual(runs[0][2], "--pull=never")
                self.assertFalse(self.cidfile.exists())

    def test_timeout_removes_only_exact_owned_container(self):
        def fake(args, **kwargs):
            if args[:2] == ["docker", "run"]:
                self.cidfile.write_text(CID)
                raise subprocess.TimeoutExpired(args, 5, output=b"TIMED_OUT")
            if args[:2] == ["docker", "rm"]:
                self.assertEqual(args[-1], CID)
                return self.outcome(args, 0)
            return self.outcome(args, 1, "Error: No such object: " + CID)
        with patch("docker_sandbox_verified.subprocess.run", side_effect=fake):
            rc, tail = docker_exec(
                DockerPolicy(), self.workspace, agent=False,
                command=["node", "--version"], cidfile=self.cidfile,
                timeout=5, log=self.log,
            )
        self.assertEqual(rc, 124)
        self.assertIn("TIMED_OUT", tail)
        self.assertFalse(self.cidfile.exists())

    def test_no_owned_id_blocks_success_and_model_fallback(self):
        with patch("docker_sandbox_verified.subprocess.run",
                   return_value=subprocess.CompletedProcess(["docker"], 0, "", "")) as runner:
            with self.assertRaisesRegex(SandboxHold, "OWNED_DOCKER_ID_UNAVAILABLE"):
                docker_exec(DockerPolicy(), self.workspace, agent=False,
                            command=["node", "--version"], cidfile=self.cidfile,
                            timeout=5, log=self.log)
            self.assertEqual(runner.call_count, 1)

    def test_failed_cleanup_retains_id_for_isolated_review(self):
        def fake(args, **kwargs):
            if args[:2] == ["docker", "run"]:
                self.cidfile.write_text(CID)
                return self.outcome(args, 0)
            if args[:2] == ["docker", "rm"]:
                return self.outcome(args, 1, "daemon error")
            return self.outcome(args, 1, "daemon error")
        with patch("docker_sandbox_verified.subprocess.run", side_effect=fake):
            with self.assertRaisesRegex(SandboxHold, "OWNED_DOCKER_INSPECT_UNAVAILABLE"):
                docker_exec(DockerPolicy(), self.workspace, agent=False,
                            command=["node", "--version"], cidfile=self.cidfile,
                            timeout=5, log=self.log)
        self.assertEqual(self.cidfile.read_text(), CID)


if __name__ == "__main__":
    unittest.main()
