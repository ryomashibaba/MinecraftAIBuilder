import contextlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from solo_agent import Hold, changed_files, check_paths, execute, validate, run_cmd, verify_repo, require_existing_remote_research_branch


def sh(root, *args):
    return subprocess.run(list(args), cwd=root, check=True, capture_output=True, text=True).stdout.strip()


class SoloAgentTests(unittest.TestCase):
    def setUp(self):
        # Exactly the same fake CLI exercises the supervisor's state logic;
        # Docker process execution is intentionally mocked and NOT certified.
        patcher = patch('solo_agent.docker_preflight', return_value={'container_execution_verified': False})
        patcher.start()
        self.addCleanup(patcher.stop)
        runner = patch('solo_agent.docker_exec', side_effect=lambda policy, cwd, *, agent, command, cidfile, timeout, log: run_cmd(command, cwd, timeout, log))
        runner.start()
        self.addCleanup(runner.stop)
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.repo = self.root / 'clone'
        self.repo.mkdir()
        sh(self.repo, 'git', 'init', '-b', 'research/free-autonomy-pilot')
        sh(self.repo, 'git', 'config', 'user.email', 'free-autonomy-test@example.invalid')
        sh(self.repo, 'git', 'config', 'user.name', 'Free Autonomy Test')
        sh(self.repo, 'git', 'remote', 'add', 'origin', 'https://github.com/ryomashibaba/MinecraftAIBuilder.git')
        (self.repo / 'source').mkdir()
        (self.repo / 'source' / 'baseline.txt').write_text('untouched')
        sh(self.repo, 'git', 'add', 'source/baseline.txt')
        sh(self.repo, 'git', 'commit', '-m', 'baseline')
        self.fake = self.root / 'fake-bin'
        self.fake.mkdir()
        fake_script = self.fake / 'opencode'
        fake_script.write_text('#!/usr/bin/env python3\nfrom pathlib import Path\nPath("source/generated.txt").write_text("ok")\nprint("MOCK_ONLY")\n')
        fake_script.chmod(0o755)
        self.env = {'PATH': str(self.fake) + os.pathsep + os.environ['PATH'], 'LOCALAPPDATA': str(self.root / 'lock-root')}
        self.cfg = {
            'project': 'minecraftaibuilder', 'workspace': str(self.repo),
            'branch': 'research/free-autonomy-pilot', 'model': 'ollama/qwen3:14b',
            'tasks': ['Create a tiny source file'], 'checks': [[os.sys.executable, '-c',
              "from pathlib import Path; assert Path('source/generated.txt').read_text() == 'ok'"]],
            'allowed_prefixes': ['source'], 'state_dir': str(self.root / 'state'),
            'max_cycles': 3, 'per_task_attempts': 2, 'sandbox_runtime': 'docker',
        }

    def test_prototype_commits_verified_fake_only(self):
        with patch.dict(os.environ, self.env):
            result = execute(dict(self.cfg), push=False, sandbox_attested=True)
        self.assertEqual(result['status'], 'TASK_QUEUE_COMPLETED_SOURCE_ONLY')
        self.assertEqual(len(result['commits']), 1)
        self.assertEqual(result['real_model_verified'], False)
        self.assertEqual(result['quality_certified'], False)
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '')
        self.assertEqual(sh(self.repo, 'git', 'log', '-1', '--format=%s'),
                         'research(free-autonomy): task 1 verified source candidate')

    def test_both_equal_priority_projects_have_exact_git_origin_admission(self):
        # One shared supervisor, two equally protected public source repositories.
        accepted = [
            ('minecraftaibuilder', 'https://github.com/ryomashibaba/MinecraftAIBuilder.git'),
            ('browser-ink-tps', 'https://github.com/ryomashibaba/browser-ink-tps.git'),
        ]
        for project, url in accepted:
            with self.subTest(project=project):
                sh(self.repo, 'git', 'remote', 'set-url', 'origin', url)
                cfg = dict(self.cfg, project=project)
                self.assertEqual(verify_repo(cfg), self.repo.resolve())
                if project == 'browser-ink-tps':
                    with self.assertRaisesRegex(Hold, 'ORIGIN_NOT_EXACT_ALLOWLIST'):
                        verify_repo(dict(cfg, project='minecraftaibuilder'))

    def test_unattended_push_refuses_absent_remote_branch_and_preserves_local_commit(self):
        real_run = subprocess.run
        calls = {'ls_remote': 0, 'push': 0}
        def offline_git(argv, **kwargs):
            if argv[:2] == ['git', 'ls-remote']:
                calls['ls_remote'] += 1
                return subprocess.CompletedProcess(argv, 2, stdout='', stderr='')
            if argv[:2] == ['git', 'push']:
                calls['push'] += 1
                raise AssertionError('network push must never be attempted')
            return real_run(argv, **kwargs)
        with patch('solo_agent.subprocess.run', side_effect=offline_git):
            with patch.dict(os.environ, self.env):
                with self.assertRaisesRegex(Hold, 'REMOTE_RESEARCH_BRANCH_NOT_PREEXISTING'):
                    execute(dict(self.cfg), push=True, sandbox_attested=True)
        self.assertGreaterEqual(calls['ls_remote'], 1)
        self.assertEqual(calls['push'], 0)
        state = json.loads((self.root / 'state' / 'state.json').read_text())
        self.assertEqual(state['status'], 'HOLD')
        self.assertIn('UNPUSHED_RESEARCH_COMMIT', state['hold_reason'])
        self.assertEqual(len(state['commits']), 1)
        self.assertFalse(state['commits'][0]['pushed'])
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '')

    def test_existing_remote_branch_exact_ref_gate_for_both_projects(self):
        real_run = subprocess.run
        for project, url in [
            ('minecraftaibuilder', 'https://github.com/ryomashibaba/MinecraftAIBuilder.git'),
            ('browser-ink-tps', 'https://github.com/ryomashibaba/browser-ink-tps.git'),
        ]:
            sh(self.repo, 'git', 'remote', 'set-url', 'origin', url)
            cfg = dict(self.cfg, project=project)
            ref = 'refs/heads/' + cfg['branch']
            def fake_remote(argv, **kwargs):
                if argv[:2] == ['git', 'ls-remote']:
                    return subprocess.CompletedProcess(argv, 0,
                        stdout='a' * 40 + '\t' + ref + '\n', stderr='')
                return real_run(argv, **kwargs)
            with self.subTest(project=project):
                with patch('solo_agent.subprocess.run', side_effect=fake_remote):
                    result = require_existing_remote_research_branch(cfg, self.repo)
                self.assertEqual(result, 'a' * 40)

    def test_remote_ref_mismatch_rejected_even_when_ls_remote_succeeds(self):
        real_run = subprocess.run
        def fake_remote(argv, **kwargs):
            if argv[:2] == ['git', 'ls-remote']:
                return subprocess.CompletedProcess(argv, 0,
                    stdout='a' * 40 + '\trefs/heads/research/another-branch\n',
                    stderr='')
            return real_run(argv, **kwargs)
        with patch('solo_agent.subprocess.run', side_effect=fake_remote):
            with self.assertRaisesRegex(Hold, 'REMOTE_RESEARCH_BRANCH_NOT_PREEXISTING'):
                require_existing_remote_research_branch(self.cfg, self.repo)

    def test_no_sandbox_is_hold(self):
        with self.assertRaisesRegex(Hold, 'DOCKER_RUNTIME_NOT_ACKNOWLEDGED'):
            execute(dict(self.cfg), push=False, sandbox_attested=False)
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '')

    def test_wrong_origin_is_hold(self):
        sh(self.repo, 'git', 'remote', 'set-url', 'origin', 'https://github.com/other/repo.git')
        with self.assertRaisesRegex(Hold, 'ORIGIN_NOT_EXACT_ALLOWLIST'):
            execute(dict(self.cfg), push=False, sandbox_attested=True)

    def test_main_branch_disallowed(self):
        sh(self.repo, 'git', 'branch', '-m', 'main')
        cfg = dict(self.cfg, branch='main')
        with self.assertRaisesRegex(Hold, 'RESEARCH_BRANCH_REQUIRED'):
            execute(cfg, push=False, sandbox_attested=True)

    def test_frozen_and_external_paths_disallowed(self):
        with self.assertRaisesRegex(Hold, 'PATH_NOT_APPROVED'):
            check_paths(self.repo, ['.github/workflows/new.yml'], ['source'])
        with self.assertRaisesRegex(Hold, 'PATH_NOT_APPROVED'):
            check_paths(self.repo, ['docs/continuity/DECISIONS_JA.md'], ['docs'])
        with self.assertRaisesRegex(Hold, 'PATH_NOT_APPROVED'):
            check_paths(self.repo, ['source/../secret.txt'], ['source'])

    def test_agent_redirecting_origin_is_rejected_before_commit(self):
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nimport subprocess\n'
            'from pathlib import Path\n'
            'subprocess.run(["git", "remote", "set-url", "origin", "https://github.com/other/repo.git"], check=True)\n'
            'Path("source/generated.txt").write_text("ok")\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        with patch.dict(os.environ, self.env):
            with self.assertRaisesRegex(Hold, 'ORIGIN_NOT_EXACT_ALLOWLIST'):
                execute(dict(self.cfg), push=False, sandbox_attested=True)
        self.assertEqual(sh(self.repo, 'git', 'log', '-1', '--format=%s'), 'baseline')

    def test_agent_commit_is_not_accepted_as_supervisor_commit(self):
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nimport subprocess\n'
            'from pathlib import Path\n'
            'Path("source/generated.txt").write_text("ok")\n'
            'subprocess.run(["git", "add", "source/generated.txt"], check=True)\n'
            'subprocess.run(["git", "commit", "-m", "unsupervised"], check=True, stdout=subprocess.DEVNULL)\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        with patch.dict(os.environ, self.env):
            with self.assertRaisesRegex(Hold, 'AGENT_MUTATED_GIT_HISTORY'):
                execute(dict(self.cfg), push=False, sandbox_attested=True)
        self.assertEqual(sh(self.repo, 'git', 'log', '-1', '--format=%s'), 'unsupervised')
        state = json.loads((self.root / 'state' / 'state.json').read_text())
        self.assertEqual(state['status'], 'HOLD')
        self.assertEqual(state['commits'], [])

    def test_paid_or_implicit_model_disallowed(self):
        for model in ['openai/gpt-6.1-sol', 'opencode/glm-5.3', '', 'opencode/mimo-v2.6-flash']:
            with self.assertRaisesRegex(Hold, 'ONLY_EXPLICIT_LOCAL_OR_FREE_MODEL'):
                validate(dict(self.cfg, model=model))

    def test_dirty_initial_source_blocks(self):
        (self.repo / 'source' / 'baseline.txt').write_text('dirty')
        with self.assertRaisesRegex(Hold, 'INITIAL_WORKSPACE_NOT_CLEAN'):
            execute(dict(self.cfg), push=False, sandbox_attested=True)

    def test_continuous_goal_advances_three_distinct_steps(self):
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nfrom pathlib import Path\n'
            'f=Path("source/generated.txt")\n'
            'f.write_text((f.read_text() if f.exists() else "") + "step\\n")\n'
            'print("MOCK_ONLY")\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, continuous_goal='Continue fixed project scope', max_cycles=3,
                   checks=[[os.sys.executable, '-c',
                            "from pathlib import Path; assert Path('source/generated.txt').is_file()"]])
        with patch.dict(os.environ, self.env):
            result = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(result['status'], 'WINDOW_ENDED_SOURCE_ONLY')
        self.assertEqual(len(result['commits']), 3)
        self.assertEqual(result['cycles'], 3)
        self.assertEqual(result['real_model_verified'], False)
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '')

    def test_qa_must_not_modify_candidate_after_tests(self):
        def corrupting_exec(policy, cwd, *, agent, command, cidfile, timeout, log):
            if agent:
                return run_cmd(command, cwd, timeout, log)
            result = run_cmd(command, cwd, timeout, log)
            (cwd / 'source' / 'generated.txt').write_text('modified after test')
            return result
        with patch('solo_agent.docker_exec', side_effect=corrupting_exec):
            with patch.dict(os.environ, self.env):
                with self.assertRaisesRegex(Hold, 'QA_MUTATED_SOURCE_AFTER_CHECK'):
                    execute(dict(self.cfg), push=False, sandbox_attested=True)
        self.assertEqual(sh(self.repo, 'git', 'log', '-1', '--format=%s'), 'baseline')

    def test_resume_does_not_repeat_committed_task(self):
        with patch.dict(os.environ, self.env):
            result = execute(dict(self.cfg), push=False, sandbox_attested=True)
            again = execute(dict(self.cfg), push=False, sandbox_attested=True)
        self.assertEqual(result['commits'], again['commits'])
        self.assertEqual(len(again['commits']), 1)


if __name__ == '__main__':
    unittest.main()
