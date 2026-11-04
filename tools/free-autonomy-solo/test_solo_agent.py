import contextlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from solo_agent import Hold, changed_files, check_paths, execute, validate, run_cmd, verify_repo, require_existing_remote_research_branch, single_agent_lock


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

    def test_one_local_agent_lock_blocks_second_process_across_projects(self):
        # Simulate MAB owning the local model and Browser Ink TPS attempting
        # to start in another OS process. Same lock regardless of project.
        child = """
from solo_agent import single_agent_lock, Hold
try:
    with single_agent_lock():
        print('SECOND_AGENT_WRONGLY_ACQUIRED_LOCK')
        raise SystemExit(17)
except Hold as exc:
    print(str(exc))
    raise SystemExit(0)
"""
        env = {**os.environ, **self.env, 'FREE_AUTONOMY_TEST_PROJECT': 'browser-ink-tps'}
        with patch.dict(os.environ, self.env):
            with single_agent_lock():
                r = subprocess.run([os.sys.executable, '-c', child], cwd=Path(__file__).parent,
                                   capture_output=True, text=True, timeout=20, env=env)
                self.assertEqual(r.returncode, 0, r.stderr)
                self.assertIn('ANOTHER_LOCAL_AGENT_OWNS_LOCK', r.stdout)
        # Owner release restores ability to start a *different* project.
        next_project = """
from solo_agent import single_agent_lock
with single_agent_lock():
    print('NEXT_PROJECT_OWNS_LOCK_AFTER_RELEASE')
"""
        r2 = subprocess.run([os.sys.executable, '-c', next_project],
                            cwd=Path(__file__).parent, capture_output=True,
                            text=True, timeout=20, env=env)
        self.assertEqual(r2.returncode, 0, r2.stderr)
        self.assertIn('NEXT_PROJECT_OWNS_LOCK_AFTER_RELEASE', r2.stdout)

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

    def test_explicit_free_cloud_fallback_after_clean_model_failure(self):
        # Fake CLI contract only, not a provider availability/quality test.
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nimport sys\n'
            'from pathlib import Path\n'
            'model=sys.argv[sys.argv.index("--model")+1]\n'
            'if model=="opencode/offline-free":\n'
            '    print("OFFLINE_MODEL_FIXTURE"); sys.exit(17)\n'
            'if model!="opencode/backup-free": sys.exit(19)\n'
            'Path("source/generated.txt").write_text("ok")\n'
            'print("MOCK_BACKUP_MODEL")\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, model='opencode/offline-free',
                   fallback_models=['opencode/backup-free'], per_task_attempts=2)
        with patch.dict(os.environ, self.env):
            result = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(result['status'], 'TASK_QUEUE_COMPLETED_SOURCE_ONLY')
        self.assertEqual(result['project'], 'minecraftaibuilder')
        self.assertEqual(result['cycles'], 2)
        self.assertEqual(result['outcomes'][0]['status'], 'AGENT_FAILED')
        self.assertEqual(result['outcomes'][0]['model'], 'opencode/offline-free')
        self.assertEqual(result['commits'][0]['model_requested'], 'opencode/backup-free')
        self.assertFalse(result['real_model_verified'])
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '')

    def test_fallback_refuses_partial_edit_after_failure(self):
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nimport sys\n'
            'from pathlib import Path\n'
            'Path("source/generated.txt").write_text("unverified")\n'
            'sys.exit(17)\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, model='opencode/offline-free',
                   fallback_models=['opencode/backup-free'], per_task_attempts=2)
        with patch.dict(os.environ, self.env):
            with self.assertRaisesRegex(Hold, 'AGENT_FAILED_LEFT_UNVERIFIED_WORKTREE'):
                execute(cfg, push=False, sandbox_attested=True)
        state = json.loads((self.root / 'state' / 'state.json').read_text())
        self.assertEqual(state['status'], 'HOLD')
        self.assertEqual(state['cycles'], 1)
        self.assertEqual(state['commits'], [])
        self.assertEqual(sh(self.repo, 'git', 'log', '-1', '--format=%s'), 'baseline')

    def test_unapproved_or_paid_fallbacks_are_rejected(self):
        cases = [
            ['openai/gpt-6.1-sol'],
            ['opencode/model-without-free-suffix'],
            ['opencode/backup-free', 'opencode/backup-free'],
            ['ollama/qwen3:14b', 'ollama/qwen3:14b'],
            'opencode/backup-free',
            ['opencode/backup-free'] * 4,
        ]
        for candidate in cases:
            with self.subTest(candidate=candidate):
                with self.assertRaisesRegex(Hold, 'FALLBACK_MODELS_MUST_BE_EXPLICIT'):
                    validate(dict(self.cfg, fallback_models=candidate))

    def test_dirty_resume_rejects_before_any_model_call(self):
        # Simulate a terminated model that left an unreviewed worktree edit
        # without changing the last supervisor-verified commit.
        with patch.dict(os.environ, self.env):
            first = execute(dict(self.cfg), push=False, sandbox_attested=True)
        self.assertEqual(first['status'], 'TASK_QUEUE_COMPLETED_SOURCE_ONLY')
        previous_sha = first['last_head']
        (self.repo / 'source' / 'interrupted.tmp').write_text('unverified candidate')
        with patch('solo_agent.run_in_docker',
                   side_effect=AssertionError('resume must not execute a model or QA')):
            with patch.dict(os.environ, self.env):
                with self.assertRaisesRegex(
                        Hold, 'UNVERIFIED_WORKTREE_ON_RESUME_REQUIRES_ISOLATED_REVIEW'):
                    execute(dict(self.cfg), push=False, sandbox_attested=True)
        state = json.loads((self.root / 'state' / 'state.json').read_text())
        self.assertEqual(state['status'], 'HOLD')
        self.assertEqual(state['hold_reason'],
                         'UNVERIFIED_WORKTREE_ON_RESUME_REQUIRES_ISOLATED_REVIEW')
        self.assertEqual(state['unverified_paths_count'], 1)
        self.assertEqual(state['last_head'], previous_sha)
        self.assertEqual(len(state['commits']), 1)
        self.assertTrue((self.repo / 'source' / 'interrupted.tmp').exists())
        # Cleaning this dedicated clone AFTER review allows ordinary resume.
        (self.repo / 'source' / 'interrupted.tmp').unlink()
        with patch.dict(os.environ, self.env):
            resumed = execute(dict(self.cfg), push=False, sandbox_attested=True)
        self.assertEqual(resumed['status'], 'TASK_QUEUE_COMPLETED_SOURCE_ONLY')
        self.assertEqual(len(resumed['commits']), 1)

    def test_dirty_resume_rejects_before_pending_research_push(self):
        with patch.dict(os.environ, self.env):
            first = execute(dict(self.cfg), push=False, sandbox_attested=True)
        self.assertEqual(len(first['commits']), 1)
        self.assertFalse(first['commits'][0]['pushed'])
        (self.repo / 'source' / 'unverified-leftover.txt').write_text('not QA verified')
        with patch('solo_agent.require_existing_remote_research_branch',
                   side_effect=AssertionError('remote must not be contacted')):
            with patch.dict(os.environ, self.env):
                with self.assertRaisesRegex(Hold, 'UNVERIFIED_WORKTREE_ON_RESUME'):
                    execute(dict(self.cfg), push=True, sandbox_attested=True)
        state = json.loads((self.root / 'state' / 'state.json').read_text())
        self.assertEqual(state['status'], 'HOLD')
        self.assertFalse(state['commits'][0]['pushed'])
        self.assertEqual(state['last_head'], first['last_head'])
        self.assertTrue((self.repo / 'source' / 'unverified-leftover.txt').exists())


    def test_free_cloud_noop_can_advance_to_explicit_clean_fallback(self):
        # A process may return exit 0 after only describing code, no edit.
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nimport sys\n'
            'from pathlib import Path\n'
            'model=sys.argv[sys.argv.index("--model")+1]\n'
            'if model=="opencode/first-free":\n'
            '    print("NO_PATCH"); sys.exit(0)\n'
            'if model!="opencode/second-free": sys.exit(19)\n'
            'Path("source/generated.txt").write_text("ok")\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, model='opencode/first-free',
                   fallback_models=['opencode/second-free'], per_task_attempts=2)
        with patch.dict(os.environ, self.env):
            result = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(result['status'], 'TASK_QUEUE_COMPLETED_SOURCE_ONLY')
        self.assertEqual(result['cycles'], 2)
        self.assertEqual(result['outcomes'][0]['status'], 'AGENT_NO_SOURCE_CHANGE')
        self.assertEqual(result['outcomes'][0]['model'], 'opencode/first-free')
        self.assertEqual(len(result['commits']), 1)
        self.assertEqual(result['commits'][0]['model_requested'], 'opencode/second-free')
        self.assertFalse(result['real_model_verified'])

    def test_noop_without_fallback_exhausts_budget_not_fake_success(self):
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nprint("EXPLANATION_ONLY")\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, per_task_attempts=2)
        with patch.dict(os.environ, self.env):
            result = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(result['status'], 'HOLD')
        self.assertEqual(result['cycles'], 2)
        self.assertEqual([x['status'] for x in result['outcomes']],
                         ['AGENT_NO_SOURCE_CHANGE', 'AGENT_NO_SOURCE_CHANGE'])
        self.assertEqual(result['commits'], [])
        self.assertEqual(sh(self.repo, 'git', 'log', '-1', '--format=%s'), 'baseline')

    def test_unavailable_free_provider_stops_without_wasting_retries(self):
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nimport sys\n'
            'print("Model unavailable: opencode/retired-free")\n'
            'sys.exit(1)\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, model='opencode/retired-free',
                   per_task_attempts=4, max_cycles=5)
        with patch.dict(os.environ, self.env):
            result = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(result['status'], 'HOLD')
        self.assertEqual(result['cycles'], 1)
        self.assertEqual(result['hold_reason'],
                         'NO_APPROVED_AVAILABLE_MODEL_IN_THIS_ENVIRONMENT')
        self.assertEqual(result['outcomes'][0]['status'], 'AGENT_MODEL_UNAVAILABLE')
        self.assertEqual(result['commits'], [])
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '')

    def test_all_explicit_free_providers_unavailable_try_each_once(self):
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nimport sys\n'
            'model=sys.argv[sys.argv.index("--model")+1]\n'
            'print("Model unavailable: " + model)\n'
            'sys.exit(1)\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, model='opencode/a-free',
                   fallback_models=['opencode/b-free'],
                   per_task_attempts=4, max_cycles=5)
        with patch.dict(os.environ, self.env):
            result = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(result['status'], 'HOLD')
        self.assertEqual(result['cycles'], 2)
        self.assertEqual([x['model'] for x in result['outcomes']],
                         ['opencode/a-free', 'opencode/b-free'])
        self.assertEqual(result['outcomes'][-1]['status'], 'AGENT_MODEL_UNAVAILABLE')
        self.assertEqual(result['commits'], [])


    def test_opt_in_quarantines_and_restores_exact_dirty_paths_before_resume(self):
        cfg = dict(self.cfg, quarantine_unverified_on_resume=True)
        with patch.dict(os.environ, self.env):
            first = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(first['status'], 'TASK_QUEUE_COMPLETED_SOURCE_ONLY')
        original_commit = first['last_head']
        tracked = self.repo / 'source' / 'generated.txt'
        tracked.write_text('interrupted tracked edit', encoding='utf-8')
        leftover = self.repo / 'source' / 'interrupted.tmp'
        leftover.write_bytes(b'interrupted untracked bytes')
        with patch('solo_agent.run_in_docker',
                   side_effect=AssertionError('completed task must not rerun a model/QA')):
            with patch.dict(os.environ, self.env):
                resumed = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(resumed['status'], 'TASK_QUEUE_COMPLETED_SOURCE_ONLY')
        self.assertEqual(resumed['last_head'], original_commit)
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '')
        self.assertEqual(tracked.read_text(), 'ok')
        self.assertFalse(leftover.exists())
        self.assertEqual(len(resumed['resume_quarantines']), 1)
        recovered = resumed['resume_quarantines'][0]
        self.assertEqual(recovered['status'], 'PRIVATE_BACKUP_VERIFIED_RESEARCH_CLONE_RESTORED')
        self.assertEqual(recovered['paths'], 2)
        manifest = Path(recovered['private_manifest'])
        self.assertTrue(manifest.is_file())
        data = json.loads(manifest.read_text(encoding='utf-8'))
        self.assertEqual(data['scope'], 'PRIVATE_UNVERIFIED_NOT_QA_PASSED')
        entries = {x['path']: x for x in data['items']}
        for name, expected in [('source/generated.txt', b'interrupted tracked edit'),
                               ('source/interrupted.tmp', b'interrupted untracked bytes')]:
            self.assertEqual((manifest.parent / entries[name]['backup']).read_bytes(),
                             expected)
        self.assertFalse(resumed['real_model_verified'])
        self.assertFalse(resumed['quality_certified'])

    def test_recovery_refuses_protected_path_and_preserves_everything(self):
        cfg = dict(self.cfg, quarantine_unverified_on_resume=True)
        with patch.dict(os.environ, self.env):
            first = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(len(first['commits']), 1)
        protected = self.repo / '.github'
        protected.mkdir()
        blocked = protected / 'policy.yml'
        blocked.write_text('unreviewed')
        with patch.dict(os.environ, self.env):
            with self.assertRaisesRegex(Hold, 'PATH_NOT_APPROVED'):
                execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(blocked.read_text(), 'unreviewed')
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '?? .github/')
        state = json.loads((self.root / 'state' / 'state.json').read_text())
        self.assertEqual(state['status'], 'HOLD')
        self.assertFalse(state.get('resume_quarantines'))

    def test_recovery_refuses_overbudget_file_and_does_not_delete_it(self):
        cfg = dict(self.cfg, quarantine_unverified_on_resume=True)
        with patch.dict(os.environ, self.env):
            execute(cfg, push=False, sandbox_attested=True)
        big = self.repo / 'source' / 'too-big.tmp'
        big.write_bytes(b'a' * 2_000_001)
        with patch.dict(os.environ, self.env):
            with self.assertRaisesRegex(Hold, 'RESUME_QUARANTINE_BYTES_BUDGET'):
                execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(big.stat().st_size, 2_000_001)
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '?? source/too-big.tmp')

    def test_recovery_opt_in_requires_explicit_boolean(self):
        with self.assertRaisesRegex(Hold, 'RESUME_QUARANTINE_OPT_IN_MUST_BE_BOOLEAN'):
            validate(dict(self.cfg, quarantine_unverified_on_resume='true'))

    def test_recovery_never_fixes_changed_git_head(self):
        cfg = dict(self.cfg, quarantine_unverified_on_resume=True)
        with patch.dict(os.environ, self.env):
            execute(cfg, push=False, sandbox_attested=True)
        (self.repo / 'source' / 'new.txt').write_text('unverified')
        sh(self.repo, 'git', 'add', 'source/new.txt')
        sh(self.repo, 'git', 'commit', '-m', 'untrusted outside supervisor')
        with patch.dict(os.environ, self.env):
            with self.assertRaisesRegex(Hold, 'GIT_HISTORY_CHANGED_OUTSIDE_SUPERVISOR'):
                execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual((self.repo / 'source' / 'new.txt').read_text(), 'unverified')


    def test_failed_agent_partial_edit_is_quarantined_and_retry_succeeds(self):
        # Real isolated Git fixture, fake model; first model writes and exits 17.
        counter = self.root / 'attempt-count'
        fake_code = (
            '#!/usr/bin/env python3\nimport sys\n'
            'from pathlib import Path\n'
            f'counter=Path({str(counter)!r})\n'
            'n=int(counter.read_text()) if counter.exists() else 0\n'
            'counter.write_text(str(n+1))\n'
            'target=Path("source/generated.txt")\n'
            'if n==0:\n'
            '    target.write_text("UNVERIFIED_PRIVATE_SENTINEL")\n'
            '    print("UNVERIFIED_PRIVATE_SENTINEL")\n'
            '    sys.exit(17)\n'
            'if "UNVERIFIED_PRIVATE_SENTINEL" in " ".join(sys.argv):\n'
            '    sys.exit(19)\n'
            'if target.exists():\n'
            '    sys.exit(21)\n'
            'target.write_text("ok")\n'
            'print("FAKE_RETRY_SUCCESS")\n'
        )
        (self.fake / 'opencode').write_text(fake_code, encoding='utf-8')
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, quarantine_unverified_on_agent_failure=True)
        with patch.dict(os.environ, self.env):
            result = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(result['status'], 'TASK_QUEUE_COMPLETED_SOURCE_ONLY')
        self.assertEqual(result['cycles'], 2)
        self.assertEqual(result['outcomes'][0]['status'],
                         'AGENT_FAILED_QUARANTINED_FOR_RETRY')
        self.assertEqual(result['outcomes'][1]['status'], 'SOURCE_CHECKS_PASSED')
        self.assertEqual(len(result['commits']), 1)
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '')
        self.assertEqual((self.repo / 'source' / 'generated.txt').read_text(), 'ok')
        record = result['failed_attempt_quarantines'][0]
        self.assertEqual(record['cycle'], 1)
        self.assertEqual(record['model_requested'], 'ollama/qwen3:14b')
        self.assertEqual(record['status'],
                         'PRIVATE_BACKUP_VERIFIED_RESEARCH_CLONE_RESTORED')
        manifest = Path(record['private_manifest'])
        data = json.loads(manifest.read_text(encoding='utf-8'))
        item = data['items'][0]
        self.assertEqual(item['path'], 'source/generated.txt')
        self.assertEqual((manifest.parent / item['backup']).read_bytes(),
                         b'UNVERIFIED_PRIVATE_SENTINEL')
        self.assertFalse(result['real_model_verified'])
        self.assertFalse(result['quality_certified'])

    def test_failure_quarantine_is_opt_in_and_default_fails_closed(self):
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nimport sys\n'
            'from pathlib import Path\n'
            'Path("source/generated.txt").write_text("failed edit")\n'
            'sys.exit(3)\n',
            encoding='utf-8')
        (self.fake / 'opencode').chmod(0o755)
        with patch.dict(os.environ, self.env):
            with self.assertRaisesRegex(Hold,
                                        'AGENT_FAILED_LEFT_UNVERIFIED_WORKTREE'):
                execute(dict(self.cfg), push=False, sandbox_attested=True)
        self.assertEqual((self.repo / 'source' / 'generated.txt').read_text(),
                         'failed edit')
        self.assertEqual(sh(self.repo, 'git', 'log', '-1', '--format=%s'),
                         'baseline')

    def test_failure_quarantine_refuses_protected_files_without_cleaning(self):
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nimport sys\n'
            'from pathlib import Path\n'
            'Path(".github").mkdir(exist_ok=True)\n'
            'Path(".github/runner.yml").write_text("unreviewed")\n'
            'sys.exit(4)\n',
            encoding='utf-8')
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, quarantine_unverified_on_agent_failure=True)
        with patch.dict(os.environ, self.env):
            with self.assertRaisesRegex(Hold, 'PATH_NOT_APPROVED'):
                execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual((self.repo / '.github' / 'runner.yml').read_text(),
                         'unreviewed')
        state = json.loads((self.root / 'state' / 'state.json').read_text())
        self.assertEqual(state['status'], 'HOLD')
        self.assertEqual(len(state['commits']), 0)

    def test_failure_quarantine_boolean_validation(self):
        with self.assertRaisesRegex(Hold,
                                    'RESUME_QUARANTINE_OPT_IN_MUST_BE_BOOLEAN'):
            validate(dict(self.cfg,
                          quarantine_unverified_on_agent_failure='yes'))



    def test_qa_failure_quarantine_restarts_from_clean_verified_base(self):
        counter = self.root / 'qa-model-count'
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\nimport sys\n'
            'from pathlib import Path\n'
            f'counter=Path({str(counter)!r})\n'
            'n=int(counter.read_text()) if counter.exists() else 0\n'
            'counter.write_text(str(n+1))\n'
            'source=Path("source/generated.txt")\n'
            'if n==0:\n'
            '    source.write_text("unverified-bad-code")\n'
            'else:\n'
            '    if source.exists(): sys.exit(33)\n'
            '    source.write_text("ok")\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, quarantine_unverified_on_qa_failure=True)
        with patch.dict(os.environ, self.env):
            state = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(state['status'], 'TASK_QUEUE_COMPLETED_SOURCE_ONLY')
        self.assertEqual(state['cycles'], 2)
        self.assertEqual(state['outcomes'][0]['status'],
                         'INDEPENDENT_QA_FAILED_QUARANTINED_FOR_RETRY')
        self.assertEqual(state['outcomes'][1]['status'], 'SOURCE_CHECKS_PASSED')
        self.assertEqual(len(state['commits']), 1)
        self.assertEqual(sh(self.repo, 'git', 'status', '--porcelain'), '')
        self.assertEqual((self.repo / 'source' / 'generated.txt').read_text(), 'ok')
        quarantines = state['qa_failure_quarantines']
        self.assertEqual(len(quarantines), 1)
        self.assertEqual(quarantines[0]['failed_checks'], 1)
        manifest = Path(quarantines[0]['private_manifest'])
        data = json.loads(manifest.read_text(encoding='utf-8'))
        self.assertEqual(data['scope'], 'PRIVATE_UNVERIFIED_NOT_QA_PASSED')
        self.assertEqual((manifest.parent / data['items'][0]['backup']).read_bytes(),
                         b'unverified-bad-code')
        self.assertFalse(state['real_model_verified'])
        self.assertFalse(state['quality_certified'])

    def test_qa_failure_default_preserves_draft_not_autodeleted(self):
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\n'
            'from pathlib import Path\n'
            'Path("source/generated.txt").write_text("bad")\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, max_cycles=1, per_task_attempts=1)
        with patch.dict(os.environ, self.env):
            state = execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual(state['status'], 'HOLD')
        self.assertEqual(state['outcomes'][0]['status'], 'INDEPENDENT_QA_FAILED')
        self.assertEqual((self.repo / 'source' / 'generated.txt').read_text(), 'bad')
        self.assertEqual(len(state['commits']), 0)
        self.assertNotIn('qa_failure_quarantines', state)

    def test_qa_failure_quarantine_rejects_test_mutation_without_deletion(self):
        def tampering_qa(policy, cwd, *, agent, command, cidfile, timeout, log):
            result = run_cmd(command, cwd, timeout, log)
            if not agent:
                (cwd / 'source' / 'generated.txt').write_text('QA_TAMPERED')
            return result
        (self.fake / 'opencode').write_text(
            '#!/usr/bin/env python3\n'
            'from pathlib import Path\n'
            'Path("source/generated.txt").write_text("bad")\n'
        )
        (self.fake / 'opencode').chmod(0o755)
        cfg = dict(self.cfg, quarantine_unverified_on_qa_failure=True)
        with patch('solo_agent.docker_exec', side_effect=tampering_qa):
            with patch.dict(os.environ, self.env):
                with self.assertRaisesRegex(
                        Hold, 'QA_FAILED_MUTATED_OR_EXPANDED_CANDIDATE'):
                    execute(cfg, push=False, sandbox_attested=True)
        self.assertEqual((self.repo / 'source' / 'generated.txt').read_text(),
                         'QA_TAMPERED')
        self.assertEqual(sh(self.repo, 'git', 'log', '-1', '--format=%s'),
                         'baseline')
        self.assertFalse((self.root / 'state' / 'quarantine').exists())

    def test_qa_failure_quarantine_boolean_validation(self):
        with self.assertRaisesRegex(Hold,
                                    'RESUME_QUARANTINE_OPT_IN_MUST_BE_BOOLEAN'):
            validate(dict(self.cfg,
                          quarantine_unverified_on_qa_failure=1))



if __name__ == '__main__':
    unittest.main()
