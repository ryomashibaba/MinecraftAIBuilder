#!/usr/bin/env python3
"""Real Qwen/Gemma 2-step code-generation witness WITHOUT Docker, Git, or shell.

Uses only an already-installed localhost Ollama model. Treats model code as
untrusted Python AST DATA: it is NEVER exec/eval/imported or run by Python.
An independent limited AST interpreter checks a public clamp fixture.
No project contents, GitHub push, paid API, or installed-model changes.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

BASE = "http://127.0.0.1:11434"
MODEL_RE = re.compile(r"[a-zA-Z0-9_.:/-]{1,100}\Z")
SCHEMA = {
    "type": "object",
    "properties": {"code": {"type": "string"}},
    "required": ["code"],
    "additionalProperties": False,
}
ALLOWED = (ast.Module, ast.FunctionDef, ast.arguments, ast.arg, ast.If, ast.Return,
           ast.Raise, ast.Expr, ast.Constant, ast.Name, ast.Load, ast.Call,
           ast.Compare, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Eq, ast.NotEq,
           ast.BoolOp, ast.And, ast.Or, ast.UnaryOp, ast.USub, ast.BinOp,
           ast.Add, ast.Sub, ast.IfExp, ast.Pass)
VARS = {"value", "low", "high"}
FUNCTIONS = {"min", "max", "ValueError"}


class Hold(RuntimeError):
    pass


def local_api(endpoint: str, payload: dict | None = None, timeout: int = 8) -> dict:
    if endpoint not in {"/api/tags", "/api/chat"}:
        raise Hold("ONLY_LOCAL_OLLAMA_ENDPOINTS_ALLOWED")
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(BASE + endpoint, data=data,
                                 headers={"Content-Type": "application/json"})
    # Avoid ambient HTTP proxy settings: localhost-only means localhost-only.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(req, timeout=timeout) as r:
            raw = r.read(65537)
    except (OSError, urllib.error.URLError) as exc:
        raise Hold("LOCAL_OLLAMA_HTTP_UNAVAILABLE") from exc
    if len(raw) > 65536:
        raise Hold("OLLAMA_RESPONSE_TOO_LARGE")
    try:
        result = json.loads(raw)
    except (UnicodeDecodeError, ValueError) as exc:
        raise Hold("OLLAMA_RESPONSE_NOT_JSON") from exc
    if not isinstance(result, dict):
        raise Hold("OLLAMA_RESPONSE_NOT_OBJECT")
    return result


def parse_bounded_code(code: str) -> ast.FunctionDef:
    if not isinstance(code, str) or len(code.encode("utf-8")) > 5000:
        raise Hold("SOURCE_SIZE_INVALID")
    try:
        parsed = ast.parse(code)
    except SyntaxError as exc:
        raise Hold("SOURCE_SYNTAX_INVALID") from exc
    if len(parsed.body) != 1 or not isinstance(parsed.body[0], ast.FunctionDef):
        raise Hold("EXPECTED_ONE_FUNCTION")
    fn = parsed.body[0]
    a = fn.args
    if (fn.name != "clamp" or [x.arg for x in a.args] != ["value", "low", "high"]
            or a.posonlyargs or a.kwonlyargs or a.vararg or a.kwarg or a.defaults
            or a.kw_defaults or fn.decorator_list or fn.returns
            or any(x.annotation is not None for x in a.args)
            or len(list(ast.walk(parsed))) > 85):
        raise Hold("UNSUPPORTED_FUNCTION_SIGNATURE_OR_COMPLEXITY")
    for node in ast.walk(parsed):
        if not isinstance(node, ALLOWED):
            raise Hold("UNSAFE_AST_NODE_" + type(node).__name__)
        if isinstance(node, ast.FunctionDef) and node is not fn:
            raise Hold("NESTED_FUNCTION_FORBIDDEN")
        if isinstance(node, ast.Name) and node.id not in VARS | FUNCTIONS:
            raise Hold("UNSAFE_NAME")
        if isinstance(node, ast.Call):
            if (not isinstance(node.func, ast.Name)
                    or node.func.id not in FUNCTIONS or node.keywords
                    or len(node.args) > 3):
                raise Hold("UNSAFE_CALL")
        if isinstance(node, ast.Constant):
            if (not isinstance(node.value, (int, float, str, bool))
                    or isinstance(node.value, (float, int)) and abs(node.value) > 1e8
                    or isinstance(node.value, str) and len(node.value) > 120):
                raise Hold("UNSAFE_CONSTANT")
    return fn


def evaluate(node: ast.AST, env: dict):
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        if node.id in env:
            return env[node.id]
        raise Hold("UNSUPPORTED_NAME_EVALUATION")
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return -evaluate(node.operand, env)
    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub)):
        a, b = evaluate(node.left, env), evaluate(node.right, env)
        return a + b if isinstance(node.op, ast.Add) else a - b
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
        arguments = [evaluate(x, env) for x in node.args]
        if node.func.id == "min":
            return min(*arguments)
        if node.func.id == "max":
            return max(*arguments)
        if node.func.id == "ValueError":
            return ValueError(*arguments)
    if isinstance(node, ast.Compare):
        left = evaluate(node.left, env)
        for op, rhs in zip(node.ops, node.comparators):
            right = evaluate(rhs, env)
            ok = (left < right if isinstance(op, ast.Lt) else
                  left <= right if isinstance(op, ast.LtE) else
                  left > right if isinstance(op, ast.Gt) else
                  left >= right if isinstance(op, ast.GtE) else
                  left == right if isinstance(op, ast.Eq) else
                  left != right)
            if not ok:
                return False
            left = right
        return True
    if isinstance(node, ast.BoolOp):
        if isinstance(node.op, ast.And):
            return all(evaluate(x, env) for x in node.values)
        return any(evaluate(x, env) for x in node.values)
    if isinstance(node, ast.IfExp):
        return evaluate(node.body if evaluate(node.test, env) else node.orelse, env)
    raise Hold("UNSUPPORTED_EXPRESSION")


def interpret(fn: ast.FunctionDef, value: int, low: int, high: int):
    env = {"value": value, "low": low, "high": high}
    def block(statements):
        for statement in statements:
            if isinstance(statement, ast.If):
                done, v = block(statement.body if evaluate(statement.test, env)
                                else statement.orelse)
                if done:
                    return True, v
            elif isinstance(statement, ast.Return):
                return True, evaluate(statement.value, env) if statement.value else None
            elif isinstance(statement, ast.Raise):
                if not isinstance(statement.exc, ast.Call):
                    raise Hold("UNSUPPORTED_RAISE")
                error = evaluate(statement.exc, env)
                if not isinstance(error, ValueError):
                    raise Hold("ONLY_VALUEERROR_ALLOWED")
                raise error
            elif isinstance(statement, ast.Expr):
                # Only literal docstrings are permitted as standalone Expr.
                if not (isinstance(statement.value, ast.Constant)
                        and isinstance(statement.value.value, str)):
                    raise Hold("EXECUTABLE_STATEMENT_FORBIDDEN")
            elif not isinstance(statement, ast.Pass):
                raise Hold("UNSUPPORTED_STATEMENT")
        return False, None
    return block(fn.body)[1]


NORMAL = [(4, 0, 10, 4), (-5, 0, 10, 0), (25, 0, 10, 10),
          (-20, -10, -5, -10), (10, 10, 10, 10), (13, 10, 20, 13)]


def independent_qa(code: str, *, second_stage: bool) -> int:
    fn = parse_bounded_code(code)
    try:
        for value, low, high, expected in NORMAL:
            if interpret(fn, value, low, high) != expected:
                raise Hold("INDEPENDENT_QA_CLAMP_MISMATCH")
        if second_stage:
            for value, low, high in ((1, 5, 0), (3, 1, -2)):
                try:
                    interpret(fn, value, low, high)
                except ValueError:
                    continue
                raise Hold("INDEPENDENT_QA_EXPECTED_VALUEERROR")
    except (TypeError, OverflowError, RecursionError, ZeroDivisionError) as exc:
        raise Hold("INDEPENDENT_QA_EVALUATION_ERROR") from exc
    return len(NORMAL) + (2 if second_stage else 0)


def propose(model: str, previous: str, stage: int, feedback: str,
            *, transport=local_api, timeout: int = 360) -> tuple[str, dict]:
    goal = ("Implement inclusive clamp in pure Python, using min and max, "
            "preserving the signature def clamp(value, low, high)."
            if stage == 1 else
            "Improve the preceding function to raise ValueError if low > high; "
            "preserve all existing correct clamping behavior.")
    request = {
        "model": model, "stream": False, "think": False,
        "format": SCHEMA,
        "options": {"temperature": 0.1, "num_predict": 500},
        "messages": [{"role": "user", "content":
            "This is a public, disposable training fixture. Return JSON with "
            "one string field code. It must contain ONLY one Python function "
            "def clamp(value, low, high) with no imports, annotations, loops, "
            "assignments, nested functions, external calls, or decorators. "
            "Allowed expression calls are min(), max(), ValueError(). "
            "Do not execute or propose shell commands. "
            f"\nStage: {stage}. Goal: {goal}\n"
            f"Previous candidate:\n{previous}\n"
            f"Prior independent QA rejection: {feedback[:180]}\n"}]}
    r = transport("/api/chat", request, timeout=timeout)
    if r.get("done") is not True or r.get("model") != model:
        raise Hold("LOCAL_MODEL_COMPLETION_NOT_ATTESTED")
    try:
        parsed = json.loads(r["message"]["content"])
    except (KeyError, TypeError, ValueError) as exc:
        raise Hold("MODEL_RETURNED_INVALID_JSON") from exc
    if not isinstance(parsed, dict) or set(parsed) != {"code"}:
        raise Hold("MODEL_SCHEMA_INVALID")
    code = parsed["code"]
    if not isinstance(code, str):
        raise Hold("MODEL_CODE_NOT_STRING")
    metrics = {k: r.get(k) for k in ("model", "done", "eval_count", "total_duration")}
    return code, metrics


def run_trial(model: str, root: Path, *, transport=local_api) -> dict:
    if not isinstance(model, str) or not MODEL_RE.fullmatch(model):
        raise Hold("MODEL_NAME_INVALID")
    root.mkdir(parents=True, exist_ok=False)
    receipt = {
        "schema": "free-autonomy-no-docker-two-stage-real-local-v1",
        "status": "HOLD", "model_requested": model, "model_calls_attempted": 0,
        "independent_qa_completed_stages": 0, "source_files_changed": 0,
        "project_files_modified": False, "git_commits": 0, "github_pushes": 0,
        "docker_used": False, "paid_api_used": False,
        "model_identity_independently_attested": False,
        "long_autonomy_certified": False, "art_or_game_quality_certified": False,
        "stage_results": [],
    }
    try:
        listing = transport("/api/tags", timeout=8)
        models = {x.get("name") for x in listing.get("models", [])
                  if isinstance(x, dict)}
        if model not in models:
            raise Hold("MODEL_NOT_INSTALLED_NO_PULL")
        previous = ("def clamp(value, low, high):\n"
                    "    return value  # intentionally incomplete\n")
        for stage in (1, 2):
            feedback = ""
            success = False
            for attempt in (1, 2):
                receipt["model_calls_attempted"] += 1
                try:
                    code, metrics = propose(model, previous, stage, feedback,
                                            transport=transport)
                    if code == previous:
                        raise Hold("MODEL_NO_CHANGE")
                    checks = independent_qa(code, second_stage=stage == 2)
                    sha = hashlib.sha256(code.encode("utf-8")).hexdigest()
                    (root / f"stage{stage}_candidate.py").write_text(code, encoding="utf-8")
                    receipt["stage_results"].append({
                        "stage": stage, "status": "AST_QA_PASS",
                        "checks": checks, "candidate_sha256": sha,
                        "reported_model": metrics["model"],
                        "reported_eval_count": metrics["eval_count"]})
                    receipt["independent_qa_completed_stages"] = stage
                    previous = code
                    success = True
                    break
                except Hold as exc:
                    feedback = str(exc)
                    receipt["stage_results"].append({
                        "stage": stage, "attempt": attempt,
                        "status": "REJECTED_NO_SOURCE_EXECUTION",
                        "code": feedback[:110]})
            if not success:
                raise Hold("STAGE_" + str(stage) + "_NOT_VERIFIED")
        receipt["status"] = "TWO_STAGE_REAL_LOCAL_AST_QA_ONLY"
    except (Hold, OSError, TypeError, KeyError, ValueError) as exc:
        receipt["status"] = "HOLD"
        receipt["hold_reason"] = str(exc)[:130]
    finally:
        (root / "SHAREABLE_RESULT.json").write_text(
            json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="qwen3:14b")
    args = parser.parse_args()
    base = Path(os.environ.get("LOCALAPPDATA") or tempfile.gettempdir())
    folder = base / "FreeAutonomyPrivate" / "NoDockerTwoStep" / uuid.uuid4().hex
    report = run_trial(args.model, folder)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("PRIVATE_RESULT_PATH=" + str(folder / "SHAREABLE_RESULT.json"))
    return 0 if report["status"] == "TWO_STAGE_REAL_LOCAL_AST_QA_ONLY" else 2


if __name__ == "__main__":
    sys.exit(main())
