"""Contract tests. Every subprocess is mocked; these are NOT Docker trials."""
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from docker_sandbox import DockerPolicy, SandboxHold, docker_argv, docker_exec, docker_preflight


class DockerSandboxTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        (self.repo / '.git').mkdir()
        self.policy = DockerPolicy()

    def test_agent_is_confined_to_disposable_worktree_and_readonly_git(self):
        policy = DockerPolicy(network='bridge')
        cmd = docker_argv(policy, self.repo, agent=True,
                          command=['opencode', 'run', '--auto', '--model', 'ollama/qwen3:14b', 'Make a patch'],
                          cidfile=self.root / 'cid')
        serialized = ' '.join(cmd)
        for expected in ('--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges',
                         '--network bridge', 'dst=/work/.git,readonly', '--user 1000:1000',
                         '--pids-limit 128', '--memory 6g', '--cpus 2', '--cidfile'):
            self.assertIn(expected, serialized)
        self.assertNotIn('/var/run/docker.sock', serialized)
        self.assertEqual(cmd[-3:], ['--model', 'ollama/qwen3:14b', 'Make a patch'])
        self.assertEqual(cmd[cmd.index('--entrypoint') + 1], 'opencode')
        self.assertIn('host.docker.internal:11434/v1', serialized)

    def test_qa_runs_only_allowlisted_exec_in_separate_image(self):
        cmd = docker_argv(self.policy, self.repo, agent=False,
                          command=['node', '--test', 'scripts/study.test.mjs'], cidfile=self.root / 'cid')
        self.assertIn('node:22-bookworm-slim', cmd)
        self.assertEqual(cmd[cmd.index('--entrypoint') + 1], 'node')
        with self.assertRaisesRegex(SandboxHold, 'QA_EXECUTABLE_NOT_ALLOWLISTED'):
            docker_argv(self.policy, self.repo, agent=False,
                        command=['bash', '-lc', 'rm -rf /'], cidfile=self.root / 'cid')

    def test_qa_network_is_never_bridge_even_when_agent_is_online(self):
        policy = DockerPolicy(network='bridge')
        qa = docker_argv(policy, self.repo, agent=False, command=['node', '--version'],
                         cidfile=self.root / 'qa.cid')
        agent = docker_argv(policy, self.repo, agent=True,
                            command=['opencode', 'run', '--auto', '--model', 'ollama/qwen3:14b', 'task'],
                            cidfile=self.root / 'agent.cid')
        self.assertEqual(qa[qa.index('--network') + 1], 'none')
        self.assertEqual(agent[agent.index('--network') + 1], 'bridge')

    def test_rejects_network_without_explicit_approval(self):
        with self.assertRaisesRegex(SandboxHold, 'NETWORK_REQUIRES_EXPLICIT_APPROVAL'):
            DockerPolicy.from_config({'docker': {'network': 'bridge'}})
        approved = DockerPolicy.from_config({'docker': {'network': 'bridge'}, 'network_access_approved': True})
        self.assertEqual(approved.network, 'bridge')

    def test_rejects_unpinned_or_unknown_image_and_excess_resources(self):
        for options in ({'agent_image': 'evil/image:latest'}, {'agent_image': 'ghcr.io/anomalyco/opencode:latest'},
                        {'memory': '128g'}, {'cpus': '64'}, {'pids': 2000}, {'network': 'host'}):
            with self.subTest(options=options):
                with self.assertRaises(SandboxHold):
                    DockerPolicy.from_config({'docker': options})

    def test_preflight_fails_closed_for_no_engine(self):
        with patch('docker_sandbox.subprocess.run', side_effect=FileNotFoundError):
            with self.assertRaisesRegex(SandboxHold, 'DOCKER_DAEMON_UNAVAILABLE'):
                docker_preflight(self.policy)

    def test_preflight_never_pulls_an_image(self):
        ok = subprocess.CompletedProcess(['docker'], 0, stdout='29.9.1\n', stderr='')
        with patch('docker_sandbox.subprocess.run', return_value=ok) as runner:
            result = docker_preflight(self.policy)
        self.assertFalse(result['container_execution_verified'])
        self.assertFalse(result['real_model_verified'])
        self.assertEqual(runner.call_count, 3)
        self.assertTrue(all('pull' not in c.args[0] for c in runner.call_args_list))

    def test_child_timeout_force_removes_container_id(self):
        cidfile = self.root / 'child.cid'
        cidfile.write_text('a' * 64)
        log = self.root / 'private.log'
        # docker_exec refuses a stale cidfile before execution, preventing unsafe reuse.
        with self.assertRaisesRegex(SandboxHold, 'STALE_CONTAINER_ID_FILE'):
            docker_exec(self.policy, self.repo, agent=True, command=['opencode', 'run', '--auto', '--model', 'opencode/glm-5.3-flash-free', 'x'],
                        cidfile=cidfile, timeout=1, log=log)
        cidfile.unlink()

        def fake_run(args, **kwargs):
            if args[0:2] == ['docker', 'run']:
                cidfile.write_text('a' * 64)
                raise subprocess.TimeoutExpired(args, 1, output=b'TIMEOUT')
            return subprocess.CompletedProcess(args, 0, '', '')

        with patch('docker_sandbox.subprocess.run', side_effect=fake_run) as runner:
            rc, tail = docker_exec(self.policy, self.repo, agent=True,
                                   command=['opencode', 'run', '--auto', '--model', 'opencode/glm-5.3-flash-free', 'x'],
                                   cidfile=cidfile, timeout=1, log=log)
        self.assertEqual(rc, 124)
        self.assertIn('TIMEOUT', tail)
        self.assertFalse(cidfile.exists())
        self.assertTrue(any(c.args[0][0:3] == ['docker', 'rm', '-f'] for c in runner.call_args_list))

    def test_public_provider_catalog_is_exact_non_inference_command(self):
        cmd = docker_argv(DockerPolicy(network='bridge'), self.repo, agent=True,
                          command=['opencode', 'models', 'opencode'],
                          cidfile=self.root / 'catalog.cid')
        self.assertEqual(cmd[cmd.index('--entrypoint') + 1], 'opencode')
        self.assertEqual(cmd[-2:], ['models', 'opencode'])
        self.assertEqual(cmd[cmd.index('--network') + 1], 'bridge')
        self.assertNotIn('OPENCODE_CONFIG_CONTENT=', ' '.join(cmd))
        self.assertIn('dst=/work/.git,readonly', ' '.join(cmd))
        for forbidden in (
            ['opencode', 'auth', 'login'],
            ['opencode', 'models', 'anthropic'],
            ['opencode', 'models', 'opencode', '--refresh'],
            ['sh', '-c', 'env'],
        ):
            with self.subTest(command=forbidden):
                with self.assertRaisesRegex(SandboxHold, 'AGENT_MUST_USE_OPENCODE'):
                    docker_argv(DockerPolicy(network='bridge'), self.repo,
                                agent=True, command=forbidden,
                                cidfile=self.root / 'no.cid')

    def test_open_code_free_model_catalog_exact_name(self):
        from free_model_real_once import visible_in_provider_catalog
        self.assertTrue(visible_in_provider_catalog(
            'opencode/deepseek-v4.1-flash-free\nopencode/glm-5.3-flash-free\n',
            'opencode/glm-5.3-flash-free'))
        self.assertFalse(visible_in_provider_catalog(
            'opencode/glm-5.3-flash-free-preview\n',
            'opencode/glm-5.3-flash-free'))
        self.assertFalse(visible_in_provider_catalog(
            'Model unavailable: opencode/glm-5.3-flash-free',
            'opencode/glm-5.3-flash-free'))
        self.assertTrue(visible_in_provider_catalog(
            'opencode/glm-5.3-flash-free    input_cost: 0',
            'opencode/glm-5.3-flash-free'))
        self.assertFalse(visible_in_provider_catalog('', 'opencode/a-free'))



if __name__ == '__main__':
    unittest.main()
