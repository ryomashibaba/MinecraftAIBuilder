#!/usr/bin/env python3
# OpenCode V2 read-only preflight. No LLM calls, provider login, installation, or writes to existing projects.
import argparse
import json
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

REPOSITORY = "https://github.com/ryomashibaba/MinecraftAIBuilder.git"
BRANCH = "research/opencode-v2-readonly-pilot-20261103"
BASE_RESEARCH_SHA = "20f703239b6ecbe43a1d057ff7b9b644fc19ce56"
REQUIRED = (
    "AGENTS.md",
    "START_HERE.md",
    "docs/AI_PROJECT_CHARTER_JA.md",
    "docs/PROJECT_STRATEGY_V2_JA.md",
    "docs/R125_THIN_VERTICAL_SLICE_PLAN_JA.md",
    "docs/R125_V4D_LOCAL_REAL_AUTHOR_BRIDGE_20261103_JA.md",
)

def safe_policy():
    """OpenCode 2 format; all providers blocked, tools read-only. Not an OS sandbox."""
    return {
        "$schema": "https://opencode.ai/config.json",
        "update": "disable",
        "permissions": [
            {"action": "*", "resource": "*", "effect": "deny"},
            {"action": "read", "resource": "*", "effect": "allow"},
            {"action": "glob", "resource": "*", "effect": "allow"},
            {"action": "grep", "resource": "*", "effect": "allow"},
            {"action": "read", "resource": "*.env*", "effect": "deny"},
            {"action": "external_directory", "resource": "*", "effect": "deny"},
        ],
        "policies": [
            {"action": "provider.use", "resource": "*", "effect": "deny"},
            {"action": "tool.use", "resource": "*", "effect": "deny"},
            {"action": "tool.use", "resource": "read:*", "effect": "allow"},
            {"action": "tool.use", "resource": "glob:*", "effect": "allow"},
            {"action": "tool.use", "resource": "grep:*", "effect": "allow"},
            {"action": "tool.use", "resource": "read:*.env*", "effect": "deny"},
            {"action": "tool.use", "resource": "external_directory:*", "effect": "deny"},
            {"action": "plugin.use", "resource": "*", "effect": "deny"},
            {"action": "mcp.use", "resource": "*", "effect": "deny"},
            {"action": "skill.use", "resource": "*", "effect": "deny"},
            {"action": "integration.connect", "resource": "*", "effect": "deny"},
        ],
    }

def call(argv, cwd=None, timeout=30):
    result = subprocess.run(argv, cwd=cwd, text=True, capture_output=True,
                            timeout=timeout, check=False, shell=False)
    if result.returncode != 0:
        raise RuntimeError("COMMAND_EXIT_NONZERO")
    return result.stdout.strip()

def validate_policy(p):
    rules = p["policies"]
    assert rules[0] == {"action": "provider.use", "resource": "*", "effect": "deny"}
    assert not any(x["action"] == "provider.use" and x["effect"] == "allow" for x in rules)
    assert any(x == {"action": "tool.use", "resource": "*", "effect": "deny"} for x in rules)
    assert any(x == {"action": "tool.use", "resource": "external_directory:*", "effect": "deny"} for x in rules)
    assert any(x == {"action": "external_directory", "resource": "*", "effect": "deny"} for x in p["permissions"])
    assert not any(x["action"] == "provider.use" and x["resource"] not in ("*", "opencode") for x in rules)
    return True

def parse_supported_v2(raw):
    """Return sanitized semver and safety status; no execution or provider access."""
    match = re.search(r"(?<![0-9])v?(\d+)\.(\d+)\.(\d+)", raw)
    if not match:
        return None, "OPENCODE_VERSION_UNRECOGNIZED"
    numeric = tuple(int(match.group(i)) for i in (1, 2, 3))
    semver = ".".join(str(x) for x in numeric)
    if numeric[0] != 2:
        return semver, "OPENCODE_V2_REQUIRED"
    if numeric < (2, 2, 3):
        return semver, "OPENCODE_V2_2_3_REQUIRED"
    return semver, None

def find_cli(base):
    """Prefer the dedicated side-by-side V2 CLI over legacy V1 on PATH."""
    local = base / "cli" / "node_modules" / ".bin" / ("opencode.cmd" if os.name == "nt" else "opencode")
    if local.is_file():
        return str(local), "PILOT_LOCAL"
    candidate = shutil.which("opencode")
    return candidate, "PATH" if candidate else "NOT_FOUND"

def main():
    parser = argparse.ArgumentParser(description="OpenCode V2 model-free, read-only, isolated preflight")
    parser.add_argument("--self-test", action="store_true",
                        help="validate policy without any network access or workspace writes")
    args = parser.parse_args()
    validate_policy(safe_policy())
    if args.self_test:
        assert parse_supported_v2("1.14.0") == ("1.14.0", "OPENCODE_V2_REQUIRED")
        assert parse_supported_v2("2.2.2") == ("2.2.2", "OPENCODE_V2_2_3_REQUIRED")
        assert parse_supported_v2("opencode v2.2.5") == ("2.2.5", None)
        assert parse_supported_v2("nonsense") == (None, "OPENCODE_VERSION_UNRECOGNIZED")
        assert find_cli(Path("__not_a_real_pilot_folder_"))[1] in ("PATH", "NOT_FOUND")
        print("POLICY_STATIC_SELF_TEST_PASS; REAL_OPENCODE_NOT_EXECUTED")
        return 0

    base = Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir())) / "MinecraftAIBuilder" / "OpenCodeV2Pilot"
    base.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="trial_", dir=base))
    report = {
        "schema": "mab-opencode-v2-readonly-preflight-v1",
        "checked_utc": datetime.now(timezone.utc).isoformat(),
        "status": "HOLD",
        "reason": "NOT_STARTED",
        "base_research_sha": BASE_RESEARCH_SHA,
        "trial_branch": BRANCH,
        "trial_head": None,
        "opencode_version": None,
        "opencode_source": "UNDETERMINED",
        "isolated_clone": False,
        "opencode_v2_static_policy_written": False,
        "model_requests": 0,
        "model_quality": "NOT_TESTED",
        "zero_cost_verified": False,
        "source_pass": "NOT_TESTED",
        "art_pass": "NOT_TESTED",
        "world_writes": 0,
        "existing_project_git_commands": 0,
        "notes": "No auth/login/model call; this is not an OS-level sandbox or quality benchmark.",
    }

    try:
        if shutil.which("git") is None:
            raise RuntimeError("GIT_NOT_FOUND")
        cli, cli_source = find_cli(base)
        report["opencode_source"] = cli_source
        if cli is None:
            raise RuntimeError("OPENCODE_NOT_INSTALLED")
        version = call([cli, "--version"], timeout=15)
        parsed, reason = parse_supported_v2(version)
        report["opencode_version"] = parsed
        if reason:
            raise RuntimeError(reason)

        source = work / "public_snapshot"
        call(["git", "-c", "credential.interactive=never", "clone", "--depth", "1",
              "--single-branch", "--branch", BRANCH, REPOSITORY, str(source)], timeout=150)
        current = call(["git", "rev-parse", "HEAD"], cwd=source)
        actual_branch = call(["git", "branch", "--show-current"], cwd=source)
        if actual_branch != BRANCH or not re.fullmatch(r"[0-9a-f]{40}", current):
            raise RuntimeError("BRANCH_OR_HEAD_MISMATCH")
        if any(not (source / name).is_file() for name in REQUIRED):
            raise RuntimeError("CANONICAL_SOURCE_MISSING")
        contract = (source / "AGENTS.md").read_text(encoding="utf-8")
        if "NOT_PREPARED" not in contract or "WorldWrites0" not in contract or "Draft PR #128" not in contract:
            raise RuntimeError("SAFETY_CONTRACT_INCOMPLETE")
        report["trial_head"] = current
        report["isolated_clone"] = True

        # Only this disposable public clone is modified. Nothing runs the agent yet.
        config = source / "opencode.json"
        if config.exists():
            raise RuntimeError("PROJECT_OPENCODE_CONFIG_EXISTS")
        config.write_text(json.dumps(safe_policy(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        validate_policy(json.loads(config.read_text(encoding="utf-8")))
        report["opencode_v2_static_policy_written"] = True
        report["status"] = "READY_READONLY_NO_MODEL_INFERENCE"
        report["reason"] = "AWAIT_ACCOUNT_MODEL_PRICE_AND_LIMIT_VERIFICATION"
    except subprocess.TimeoutExpired:
        report["reason"] = "PREFLIGHT_COMMAND_TIMEOUT"
    except RuntimeError as exc:
        # Fixed codes only; do not publish raw OS exceptions, paths, or credentials.
        allowed = {
            "GIT_NOT_FOUND", "OPENCODE_NOT_INSTALLED", "COMMAND_EXIT_NONZERO",
            "OPENCODE_V2_REQUIRED", "OPENCODE_VERSION_UNRECOGNIZED",
            "OPENCODE_V2_2_3_REQUIRED", "BRANCH_OR_HEAD_MISMATCH",
            "CANONICAL_SOURCE_MISSING", "SAFETY_CONTRACT_INCOMPLETE",
            "PROJECT_OPENCODE_CONFIG_EXISTS"
        }
        report["reason"] = str(exc) if str(exc) in allowed else "PREFLIGHT_UNCLASSIFIED_HOLD"
    except Exception:
        report["reason"] = "PREFLIGHT_UNCLASSIFIED_HOLD"
    finally:
        receipt = work / "MAB_OPENCODE_PREFLIGHT_RESULT.json"
        receipt.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"status": report["status"], "reason": report["reason"],
                          "report_file": str(receipt), "model_requests": 0}, ensure_ascii=False))
    return 0 if report["status"] == "READY_READONLY_NO_MODEL_INFERENCE" else 2

if __name__ == "__main__":
    raise SystemExit(main())
