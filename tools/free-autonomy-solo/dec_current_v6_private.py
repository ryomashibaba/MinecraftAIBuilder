#!/usr/bin/env python3
"""Opt-in current-V6 MinecraftAIBuilder PRIVATE Qwen source-patch session.

Reuses the existing Dec direct-Ollama supervisor and real network-none Docker
QA. No generated code is published or run on the Windows host. The older V4H
six-stage launcher and manifest remain untouched.
"""
from __future__ import annotations

import argparse
import copy
import difflib
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid

from prepare_pinned_real_project import load_manifest, prepare, Hold as CloneHold
from local_ollama_patch_loop import (execute, validate_config, qa_image_preflight, propose_once)
from docker_sandbox import DockerPolicy
from solo_agent import run_in_docker, verify_repo, changed_files

SOURCE_BRANCH = 'feature/b198zr1-protected-architectural-revision'
SOURCE_COMMIT = '6ecca415642122c2b352e778f5f9eb1fe9b5bc22'
SOURCE_FILE = 'source/ai/r125-v4j-civic-author-ir.mjs'
SOURCE_BLOB = 'bef9a273f7fa46affdda9a659687678272179028'
PRIVATE_BRANCH = 'research/dec-v6-current-private-20261105'
MODEL = 'qwen3:14b'
QA = [
    ['node', '--test', 'scripts/r125-v4j-civic-facade.test.mjs'],
    ['node', '--test', 'scripts/r125-v4j-structured-author-schema.test.mjs'],
]
TASKS = [
    {
        'path': SOURCE_FILE,
        'request': (
            'Improve original one-response V4J civic-author SOURCE validation for '
            'one real, clearly identified malformed-input or proof-invariant case. '
            'Preserve all valid original authored designs, true two-wide source routes, '
            'existing gates and source provenance. Reject invalid inputs; do not '
            'silently repair or fabricate successful architecture. No host style '
            'templates, extra model calls or Minecraft world writes.'
        ),
    },
]
SAFE_HOLD = re.compile(r'[A-Z][A-Z0-9_]{2,110}\Z')


def profile(base: dict) -> dict:
    """Overlay one audited current-source lane in memory, never alter old pins."""
    original = copy.deepcopy(base)
    if original.get('simultaneous_active_projects_max') != 1:
        raise ValueError('SINGLE_PROJECT_POLICY_CHANGED')
    for key in ('allow_paid_api', 'allow_main_write',
                'allow_existing_source_revision_overwrite',
                'allow_dockerless_untrusted_model_source_execution'):
        if original.get(key) is not False:
            raise ValueError('UNSAFE_PERMISSION_POLICY')
    lane = original['project_candidates']['minecraftaibuilder']
    if (lane.get('repository') != 'ryomashibaba/MinecraftAIBuilder'
            or original['project_candidates']['browser-ink-tps'].get('repository')
            != 'ryomashibaba/browser-ink-tps'):
        raise ValueError('PROJECT_IDENTITY_MISMATCH')
    lane.update({
        'source_branch_at_audit': SOURCE_BRANCH,
        'pinned_commit': SOURCE_COMMIT,
        'source_file': SOURCE_FILE,
        'source_blob_sha': SOURCE_BLOB,
        'research_branch_for_private_clone': PRIVATE_BRANCH,
        'native_qa_argv': copy.deepcopy(QA),
        'baseline_scope': 'V4J civic author SOURCE-only; model/ART/world unverified',
    })
    return original


def config(workspace: Path, state: Path) -> dict:
    return {
        'project': 'minecraftaibuilder',
        'workspace': str(workspace),
        'branch': PRIVATE_BRANCH,
        'model': MODEL,
        'state_dir': str(state),
        'sandbox_runtime': 'docker',
        'docker': {'network': 'none', 'memory': '6g', 'cpus': '2', 'pids': 128},
        'allowed_prefixes': ['source/ai'],
        'tasks': copy.deepcopy(TASKS),
        'checks': copy.deepcopy(QA),
        'max_cycles': 2,
        'max_minutes': 45,
        'per_task_attempts': 2,
        'model_timeout_seconds': 360,
        'qa_timeout_seconds': 300,
        'quarantine_unverified_on_qa_failure': True,
    }


def current_source_commit(fetch=subprocess.run) -> bool:
    """Never label an old pin as current; no clones or model calls on drift."""
    try:
        cp = fetch(
            ['git', 'ls-remote', '--heads',
             'https://github.com/ryomashibaba/MinecraftAIBuilder.git',
             'refs/heads/' + SOURCE_BRANCH],
            capture_output=True, text=True, timeout=25, check=False,
            env={**os.environ, 'GIT_TERMINAL_PROMPT': '0',
                 'GCM_INTERACTIVE': 'Never'},
        )
        return (cp.returncode == 0 and cp.stdout.strip()
                == SOURCE_COMMIT + '\trefs/heads/' + SOURCE_BRANCH)
    except (OSError, subprocess.TimeoutExpired):
        return False


def safe_reason(exc: BaseException) -> str:
    value = str(exc)
    return value if SAFE_HOLD.fullmatch(value) else type(exc).__name__.upper()


def run_once(base: Path, *, real: bool, draft_only: bool = False,
             platform_name: str = os.name) -> tuple[dict, Path | None]:
    result = {
        'schema': 'dec-v6-current-private-source-pilot-v1',
        'status': 'CHECKED_NO_INFERENCE',
        'audited_commit': SOURCE_COMMIT,
        'audited_blob': SOURCE_BLOB,
        'project': 'minecraftaibuilder',
        'old_v4h_path_changed': False,
        'original_project_changed': False,
        'public_model_source_pushes': 0,
        'paid_api_calls': 0,
        'world_writes': 0,
        'art_certified': False,
        'real_windows_qa_certified': False,
        'qa_network': 'none',
        'local_model_requests_by_this_wrapper': 0,
        'private_verified_commits': 0,
        'private_drafts_not_qa_verified': 0,
    }
    manifest = profile(load_manifest())
    cfg = config(base / 'unused-private-clone', base / 'unused-private-state')
    validate_config(cfg)
    if not real:
        return result, None
    if platform_name != 'nt':
        result['status'] = 'HOLD_WINDOWS_ONLY_NO_MODEL_CALL'
        return result, None
    # With full QA, Docker must already be present BEFORE any model call.
    # Draft-only explicitly allows a textual proposal WITHOUT execution.
    if not draft_only:
        try:
            qa_image_preflight(DockerPolicy.from_config(cfg))
        except Exception:
            result['status'] = 'HOLD_DOCKER_QA_UNAVAILABLE_NO_MODEL_CALL'
            return result, None
    if not current_source_commit():
        result['status'] = 'HOLD_CURRENT_SOURCE_MOVED_OR_OFFLINE_NO_MODEL_CALL'
        return result, None
    base.mkdir(parents=True, exist_ok=True)
    private_root = base / ('v6-' + uuid.uuid4().hex[:16])
    private_root.mkdir(mode=0o700)
    receipt = private_root / 'V6_CURRENT_SHAREABLE.json'
    try:
        admitted = prepare('minecraftaibuilder', manifest, private_root / 'private-clones')
        if admitted.get('status') != 'REAL_SOURCE_CLONE_PINNED_READONLY_READY':
            result['status'] = 'HOLD_PINNED_SOURCE_CLONE_NO_MODEL_CALL'
            return result, receipt
        workspace = Path(admitted['private_workspace_path'])
        cfg = config(workspace, private_root / 'private-state')
        validate_config(cfg)
        verify_repo(cfg)
        Path(cfg['state_dir']).mkdir(parents=True, exist_ok=False)
        if draft_only:
            target = workspace / SOURCE_FILE
            original = target.read_text(encoding='utf-8')
            proposal, metrics = propose_once(
                MODEL, SOURCE_FILE, original, TASKS[0]['request'], '',
                timeout=240)
            result['local_model_requests_by_this_wrapper'] = 1
            if (not isinstance(proposal, dict) or set(proposal) != {'find', 'replace'}
                    or not all(isinstance(x, str) and x for x in proposal.values())
                    or proposal['find'] == proposal['replace']
                    or original.count(proposal['find']) != 1):
                result['status'] = 'HOLD_MODEL_DRAFT_INVALID_NO_EXECUTION'
                return result, receipt
            candidate = original.replace(proposal['find'], proposal['replace'], 1)
            if len(candidate.encode('utf-8')) > 16000:
                result['status'] = 'HOLD_MODEL_DRAFT_OVERSIZED_NO_EXECUTION'
                return result, receipt
            if changed_files(workspace):
                result['status'] = 'HOLD_PRIVATE_CLONE_CHANGED_NO_EXECUTION'
                return result, receipt
            candidate_file = private_root / 'V6_UNVERIFIED_SOURCE_PRIVATE.txt'
            candidate_file.write_text(candidate, encoding='utf-8')
            diff_file = private_root / 'V6_UNVERIFIED_DIFF_PRIVATE.patch'
            diff_file.write_text(''.join(difflib.unified_diff(
                original.splitlines(keepends=True),
                candidate.splitlines(keepends=True),
                fromfile='V6 original pinned source',
                tofile='V6 PRIVATE unverified proposal')), encoding='utf-8')
            result['private_drafts_not_qa_verified'] = 1
            result['candidate_sha256'] = hashlib.sha256(
                candidate.encode('utf-8')).hexdigest()
            result['status'] = 'PRIVATE_ONE_MODEL_PATCH_DRAFT_NO_QA_ART_HOLD'
            return result, receipt
        for i, command in enumerate(QA):
            rc, _out = run_in_docker(cfg, command, workspace, 300,
                Path(cfg['state_dir']) / ('preflight_' + str(i) + '.private.log'),
                agent=False)
            if rc:
                result['status'] = 'HOLD_SOURCE_BASELINE_QA_NO_MODEL_CALL'
                return result, receipt
        # The existing direct-Ollama loop owns lock/QA/source checks/recovery.
        # Never --push; accepted Git commits remain in this PRIVATE clone.
        state = execute(cfg, push=False)
        result['local_model_requests_by_this_wrapper'] = state.get('cycles', 0)
        result['private_verified_commits'] = len(state.get('commits', []))
        result['real_windows_qa_certified'] = False  # no remote attestation
        result['status'] = (
            'PRIVATE_SOURCE_QA_PASSED_ART_HOLD'
            if state.get('status') == 'SOURCE_ONLY_TASK_QUEUE_DONE'
            else 'HOLD_PRIVATE_SOURCE_OR_QA'
        )
        return result, receipt
    except Exception as exc:
        result['status'] = 'HOLD_PRIVATE_V6_NO_PUBLICATION'
        result['reason_code'] = safe_reason(exc)
        return result, receipt
    finally:
        # This allowlist has no raw source, model prompt, private log or path.
        temporary = receipt.with_suffix('.tmp')
        temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n',
                             encoding='utf-8')
        os.replace(temporary, receipt)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    choice = ap.add_mutually_exclusive_group()
    choice.add_argument('--run', action='store_true',
                    help='Opt-in local Qwen with independently isolated Docker QA')
    choice.add_argument('--draft-only', action='store_true',
                    help='Opt-in one PRIVATE local Qwen text proposal, no source execution')
    ns = ap.parse_args()
    appdata = os.environ.get('LOCALAPPDATA')
    if (ns.run or ns.draft_only) and not appdata:
        print('HOLD_LOCALAPPDATA_REQUIRED_NO_MODEL_CALL')
        return 2
    base = Path(appdata or '.') / 'FreeAutonomyPrivate' / 'DecV6Current'
    status, report_path = run_once(
        base, real=ns.run or ns.draft_only, draft_only=ns.draft_only)
    print(json.dumps(status, ensure_ascii=False, indent=2))
    if report_path:
        print('PRIVATE_SHAREABLE_RESULT_PATH=' + str(report_path))
    return 0 if status['status'] in ('CHECKED_NO_INFERENCE',
                                   'PRIVATE_SOURCE_QA_PASSED_ART_HOLD',
                                   'PRIVATE_ONE_MODEL_PATCH_DRAFT_NO_QA_ART_HOLD') else 2


if __name__ == '__main__':
    sys.exit(main())
