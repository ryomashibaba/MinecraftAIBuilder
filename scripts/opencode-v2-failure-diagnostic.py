#!/usr/bin/env python3
"""Classify a previously failed OpenCode V2 public-model trial; NEVER invoke a model.

Only examines the already-created public audit receipt and stdout; never prints raw
stdout/stderr, credential metadata, environment variables, configuration or logs.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "mab-opencode-v2-free-failure-diagnostic-v1"
EXPECTED_SOURCE = "mab-opencode-free-public-audit-v1"
REQUIRED_FLAGS = ("--standalone", "--archived", "--agent", "--model", "--file")
MAX_STDOUT_READ = 128_000

def classify_saved_stdout(text):
    low = text.lower()
    patterns = (
        ("PAYMENT_OR_BILLING", r"payment required|insufficient credits|billing|402\b"),
        ("RATE_LIMIT_OR_QUOTA", r"rate.?limit|quota|too many requests|429\b"),
        ("AUTH_OR_CREDENTIAL", r"unauthorized|authentication|invalid api.?key|missing api.?key|401\b"),
        ("ACCESS_FORBIDDEN", r"forbidden|permission denied|403\b"),
        ("MODEL_RESOLUTION", r"model unavailable|model not found|providermodelnotfound|unsupported model"),
        ("CONFIG_OR_POLICY", r"invalid config|configuration error|blocked by .*policy|policy denied"),
        ("INVALID_CLI_ARGUMENT", r"unknown (argument|option)|unexpected argument|unrecognized option"),
        ("NETWORK_OR_TLS", r"econnreset|enotfound|etimedout|connection refused|certificate verify|tls error"),
    )
    for category, expression in patterns:
        if re.search(expression, low):
            return category
    return "NO_CLASSIFIABLE_SAVED_STDOUT" if text.strip() else "SAVED_STDOUT_EMPTY"

def check_flag_help(output):
    return {flag: bool(re.search(r"(?<![-\w])" + re.escape(flag) + r"(?![\w-])", output))
            for flag in REQUIRED_FLAGS}

def run_read_only(argv, cwd):
    return subprocess.run(
        argv, cwd=cwd, shell=False, check=False, capture_output=True,
        text=True, encoding="utf-8", errors="replace", timeout=25,
    )

def main():
    p = argparse.ArgumentParser(description="Offline, zero-model audit of the last failed run")
    p.add_argument("--report", help="Previously generated FREE_PUBLIC_MODEL_AUDIT_RESULT.json")
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        assert classify_saved_stdout("") == "SAVED_STDOUT_EMPTY"
        assert classify_saved_stdout("Error 401 Unauthorized") == "AUTH_OR_CREDENTIAL"
        assert classify_saved_stdout("unknown option --archived") == "INVALID_CLI_ARGUMENT"
        assert classify_saved_stdout("429 rate limit") == "RATE_LIMIT_OR_QUOTA"
        assert all(check_flag_help("--standalone --archived --agent --model --file").values())
        assert not all(check_flag_help("--model --agent").values())
        print("OFFLINE_FAILURE_DIAGNOSTIC_SELF_TEST_PASS; MODEL_REQUESTS=0")
        return 0
    if not args.report:
        p.error("--report required")
    base = (Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir()))
            / "MinecraftAIBuilder" / "OpenCodeV2Pilot").resolve()
    report_path = Path(args.report).resolve()
    # The diagnostic must never read unrelated file paths.
    if report_path.name != "FREE_PUBLIC_MODEL_AUDIT_RESULT.json" or not report_path.is_relative_to(base):
        print('{"status":"HOLD","reason":"REPORT_OUTSIDE_ISOLATED_PILOT","model_requests":0}')
        return 2
    trial = report_path.parent
    src = json.loads(report_path.read_text(encoding="utf-8"))
    if (src.get("schema") != EXPECTED_SOURCE
            or src.get("model") != "opencode/glm-5.3-flash-free"
            or src.get("reason") != "FREE_MODEL_RUN_FAILED_OR_UNAVAILABLE"
            or src.get("model_run_invocations") != 1):
        print('{"status":"HOLD","reason":"NOT_EXPECTED_FAILED_AUDIT_RECEIPT","model_requests":0}')
        return 2
    result = {
        "schema": SCHEMA,
        "checked_utc": datetime.now(timezone.utc).isoformat(),
        "status": "DIAGNOSED_NO_MODEL_RETRY",
        "reason": "PRIOR_RUN_FAILURE_CAUSE_NOT_YET_PROVEN",
        "previous_run_invocations": 1,
        "new_model_invocations": 0,
        "previous_actual_http_requests": "UNKNOWN",
        "previous_stdout_class": "NOT_READ",
        "previous_stdout_chars_read": 0,
        "previous_cli_exit_code": "NOT_SAVED",
        "previous_stderr": "NOT_SAVED_BY_OLD_RUNNER",
        "v2_version": None,
        "cli_help_flags": {},
        "cli_help_available": False,
        "repo_writes": 0,
        "world_writes": 0,
        "policy_changed": False,
        "provider_auth_changed": False,
    }
    output = trial / "MODEL_RESPONSE_PRIVATE.txt"
    if output.is_file() and not output.is_symlink():
        with output.open("r", encoding="utf-8", errors="replace") as fp:
            raw = fp.read(MAX_STDOUT_READ)
        result["previous_stdout_class"] = classify_saved_stdout(raw)
        result["previous_stdout_chars_read"] = len(raw)
        # Hash only, never echo the source content or user paths.
        result["previous_stdout_sha256"] = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    elif output.is_file():
        result["previous_stdout_class"] = "STDOUT_SYMLINK_NOT_READ"
    else:
        result["previous_stdout_class"] = "SAVED_STDOUT_MISSING"
    cli = base / "cli" / "node_modules" / ".bin" / ("opencode.cmd" if os.name == "nt" else "opencode")
    if cli.is_file():
        try:
            v = run_read_only([str(cli), "--version"], trial)
            if v.returncode == 0:
                m = re.search(r"(?<![0-9])v?(\d+\.\d+\.\d+)", v.stdout)
                result["v2_version"] = m.group(1) if m else "UNRECOGNIZED"
            h = run_read_only([str(cli), "run", "--help"], trial)
            result["cli_help_available"] = h.returncode == 0
            if h.returncode == 0:
                result["cli_help_flags"] = check_flag_help(h.stdout + "\n" + h.stderr)
        except (subprocess.TimeoutExpired, OSError):
            result["reason"] = "LOCAL_CLI_HELP_NOT_AVAILABLE"
    else:
        result["reason"] = "V2_BINARY_MISSING"
    if result["previous_stdout_class"] not in (
        "SAVED_STDOUT_EMPTY", "NO_CLASSIFIABLE_SAVED_STDOUT",
        "SAVED_STDOUT_MISSING", "STDOUT_SYMLINK_NOT_READ",
    ):
        result["reason"] = "PRIOR_SAVED_STDOUT_MATCHED_ERROR_CATEGORY"
    elif result["cli_help_available"] and not all(result["cli_help_flags"].values()):
        result["reason"] = "CLI_FLAG_COMPATIBILITY_MISMATCH"
    elif result["cli_help_available"]:
        result["reason"] = "PRIOR_STDERR_NOT_SAVED_CANNOT_IDENTIFY_CAUSE"
    fd, fn = tempfile.mkstemp(prefix="FREE_PUBLIC_FAILURE_DIAGNOSTIC_", suffix=".json", dir=trial)
    os.close(fd)
    report_out = Path(fn)
    report_out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": result["status"],
        "reason": result["reason"],
        "previous_stdout_class": result["previous_stdout_class"],
        "cli_help_flags": result["cli_help_flags"],
        "report_file": str(report_out),
        "new_model_invocations": 0,
    }, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
