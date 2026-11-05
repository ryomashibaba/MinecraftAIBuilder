#!/usr/bin/env python3
"""December-2026 public GitHub status audit. Read-only, standard library only.

No local/private source is read. No GitHub writes, model calls, Docker, shell,
subprocess, paid APIs, authentication, workflow dispatch, or OS changes.
The public CI result must NEVER be promoted to a real-model/S1-S4 result.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

BASE = "https://api.github.com"
DEC_REPO = "ryomashibaba/MinecraftAIBuilder"
DEC_BRANCH = "research/dec-free-autonomy-solo-pilot-20261104"
CI_NAME = "Dec free-autonomy single-project pilot (fake QA + real Docker smoke)"
PRIORITIES = (
    ("MinecraftAIBuilder", "ryomashibaba/MinecraftAIBuilder", "feature/b198zr1-protected-architectural-revision"),
    ("Browser Ink TPS", "ryomashibaba/browser-ink-tps", "research/t21-b471-ready-20261105"),
)


def get_json(path: str) -> object:
    req = Request(BASE + path, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "december-2026-readonly-ci-audit",
    })
    with urlopen(req, timeout=12) as stream:
        return json.load(stream)


def repo_head(repo: str, branch: str) -> str:
    data = get_json(f"/repos/{repo}/commits?" + urlencode({"sha": branch, "per_page": 1}))
    if not isinstance(data, list) or not data or not isinstance(data[0].get("sha"), str):
        raise ValueError("GitHub HEAD response unavailable")
    return data[0]["sha"]


def classify_ci(head: str, runs: list, jobs: list) -> dict:
    """Do not consider a run belonging to another HEAD or workflow as success."""
    matching = [r for r in runs if r.get("name") == CI_NAME and r.get("head_sha") == head]
    if not matching:
        return {"state": "UNVERIFIED", "reason": "NO_EXACT_HEAD_CI", "run_id": None}
    run = max(matching, key=lambda r: (r.get("created_at") or "", int(r.get("id") or 0)))
    run_id = run.get("id")
    if run.get("status") != "completed" or run.get("conclusion") != "success":
        return {"state": "HOLD", "reason": "CI_NOT_COMPLETED_SUCCESS", "run_id": run_id}
    if not jobs:
        return {"state": "UNVERIFIED", "reason": "MISSING_JOB_EVIDENCE", "run_id": run_id}
    actual = [x for x in jobs if x.get("conclusion") == "success"]
    skipped = [x for x in jobs if x.get("conclusion") == "skipped"]
    bad = [x for x in jobs if x.get("conclusion") not in ("success", "skipped")]
    if not actual or bad:
        return {"state": "HOLD", "reason": "NON_SUCCESS_JOB", "run_id": run_id}
    return {"state": "VERIFIED_LIMITED_CI", "reason": "OFFLINE_MOCK_AND_DOCKER_SMOKE_ONLY",
            "run_id": run_id, "jobs_success": len(actual), "jobs_skipped": len(skipped),
            "real_model_verified": False, "source_qa_verified": False,
            "strata_s2_s4_verified": False}


def public_snapshot() -> dict:
    head = repo_head(DEC_REPO, DEC_BRANCH)
    runs_data = get_json(f"/repos/{DEC_REPO}/actions/runs?" + urlencode({"branch": DEC_BRANCH, "per_page": 30}))
    runs = runs_data.get("workflow_runs", []) if isinstance(runs_data, dict) else []
    ci_heads = [r for r in runs if r.get("name") == CI_NAME and r.get("head_sha") == head]
    ci_run = max(ci_heads, key=lambda r: (r.get("created_at") or "", int(r.get("id") or 0))) if ci_heads else None
    jobs = []
    if ci_run:
        job_data = get_json(f"/repos/{DEC_REPO}/actions/runs/{int(ci_run['id'])}/jobs?per_page=100")
        jobs = job_data.get("jobs", []) if isinstance(job_data, dict) else []
    other = [{"name": r.get("name"), "conclusion": r.get("conclusion"), "run_id": r.get("id")}
             for r in runs if r.get("head_sha") == head and r.get("name") != CI_NAME]
    projects = []
    for label, repo, branch in PRIORITIES:
        try:
            projects.append({"name": label, "head": repo_head(repo, branch), "branch": branch,
                             "result": "HEAD_ONLY; no app QA or ART inference"})
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError) as exc:
            projects.append({"name": label, "head": None, "branch": branch,
                             "result": f"UNVERIFIED ({type(exc).__name__})"})
    return {"schema": "december-2026-github-readonly-audit-v1", "scope": "DECEMBER_2026",
            "observed_utc": datetime.now(timezone.utc).isoformat(),
            "december_repo": DEC_REPO, "december_branch": DEC_BRANCH,
            "december_head": head, "december_ci": classify_ci(head, runs, jobs),
            "other_workflows_same_head": other, "projects_equal_priority": projects,
            "local_windows_status": "NOT_CHECKED_BY_THIS_TOOL",
            "private_qwen_status": "NOT_CHECKED_BY_THIS_TOOL",
            "strata_s1_s4": "NOT_CHECKED_BY_THIS_TOOL",
            "changes_performed": False, "cost_incurred_by_tool": 0}


def markdown(s: dict) -> str:
    ci = s["december_ci"]
    lines = ["# 2026年12月対策｜公開GitHub読取専用監査", "",
             f"- 観測UTC: {s['observed_utc']}",
             f"- 範囲: `{s['scope']}`（個別作品コードへの移動は禁止）",
             f"- 研究HEAD: `{s['december_head']}`",
             f"- 専用CI: **{ci['state']}** / `{ci['reason']}` / run `{ci.get('run_id')}`",
             "- **CI PASSは真正モデル生成・PRIVATE SOURCE QA・Strata S1〜S4・作品ARTのPASSではない。**",
             "", "## 別ワークフロー（同一HEAD）"]
    lines.extend(f"- {x['name']}: {x['conclusion']} (run {x['run_id']})" for x in s['other_workflows_same_head'])
    lines += ["", "## 最重要2作品（同格、HEADのみの参照）"]
    lines.extend(f"- {p['name']}: `{p['head'] or 'UNKNOWN'}` / `{p['branch']}` / {p['result']}"
                 for p in s["projects_equal_priority"])
    lines += ["", "## 対象外の真正ゲート", "- Windows Strata: このツールからは確認不可（別の実機証拠が必要）",
              "- PRIVATE Qwen: このツールからは確認不可（候補のSHAと独立QAは別証拠）",
              "- S1小推論をS2実コード生成やS4長時間運転に昇格しない",
              "- 本ツールは読取のみ。Work・推論・Docker起動・GitHub変更・課金は実行しない。"]
    return "\n".join(lines) + "\n"


def selftest() -> None:
    head = "a" * 40
    correct = {"id": 1, "name": CI_NAME, "head_sha": head, "created_at": "2026-11-05T00:00:00Z",
               "status": "completed", "conclusion": "success"}
    yes = {"name": "native-docker-smoke-no-llm", "conclusion": "success"}
    skip = {"name": "genuine-free-model-once-ephemeral", "conclusion": "skipped"}
    assert classify_ci(head, [correct], [yes, skip])["state"] == "VERIFIED_LIMITED_CI"
    assert classify_ci("b" * 40, [correct], [yes])["state"] == "UNVERIFIED"
    assert classify_ci(head, [correct], [])["state"] == "UNVERIFIED"
    assert classify_ci(head, [correct], [{"conclusion": "failure"}])["state"] == "HOLD"
    assert classify_ci(head, [{**correct, "conclusion": "failure"}], [yes])["state"] == "HOLD"
    assert classify_ci(head, [{**correct, "name": "Other workflow"}], [yes])["state"] == "UNVERIFIED"


def main() -> int:
    ap = argparse.ArgumentParser(description="GitHub公開情報のみ確認。ローカル/PRIVATEの合格を推定しない")
    ap.add_argument("--selftest", action="store_true", help="ネット通信なしの分類検証")
    ap.add_argument("--json", action="store_true", help="MarkdownではなくJSONを標準出力")
    args = ap.parse_args()
    if args.selftest:
        selftest()
        print("PASS: 6 offline CI classification checks; zero network/model calls")
        return 0
    try:
        s = public_snapshot()
    except (HTTPError, URLError, TimeoutError, ValueError, KeyError, TypeError) as exc:
        print(f"HOLD: live public GitHub verification unavailable ({type(exc).__name__}); "
              "no cached result promoted", file=sys.stderr)
        return 2
    print(json.dumps(s, ensure_ascii=False, indent=2) if args.json else markdown(s), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
