"""One real local Ollama coding probe, independent of OpenCode. No project writes.

Run manually on Windows with installed Ollama. The response is never interpreted
as shell commands. Only a minimal AST-safe Python function is executed for QA.
Offline tests of this module are not real model evidence.
"""
from __future__ import annotations
import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import tempfile
import urllib.error
import urllib.request
import uuid

BASE = "http://127.0.0.1:11434"
SAFE_NODES = (ast.Module, ast.FunctionDef, ast.arguments, ast.arg,
              ast.Expr, ast.Constant, ast.Name, ast.Load, ast.Return,
              ast.If, ast.Raise, ast.Compare, ast.Call, ast.Lt, ast.LtE,
              ast.Gt, ast.GtE, ast.Eq, ast.NotEq, ast.UnaryOp, ast.USub,
              ast.BoolOp, ast.And, ast.Or, ast.BinOp, ast.Add, ast.Sub)
SAFE_NAMES = {"value", "low", "high", "min", "max", "ValueError"}


class Hold(RuntimeError):
    pass


def safe_clamp_ast(source: str) -> ast.Module:
    if not isinstance(source, str) or len(source) > 4000:
        raise Hold("INVALID_MODEL_SOURCE_LENGTH")
    try:
        tree = ast.parse(source)
    except SyntaxError as ex:
        raise Hold("INVALID_PYTHON_SOURCE") from ex
    if len(tree.body) != 1 or not isinstance(tree.body[0], ast.FunctionDef):
        raise Hold("ONLY_ONE_FUNCTION_ALLOWED")
    fn = tree.body[0]
    args = fn.args
    if (fn.name != "clamp" or [a.arg for a in args.args] != ["value", "low", "high"]
            or args.posonlyargs or args.kwonlyargs or args.vararg or args.kwarg
            or args.defaults or args.kw_defaults or fn.decorator_list):
        raise Hold("UNEXPECTED_FUNCTION_SIGNATURE")
    for node in ast.walk(tree):
        if not isinstance(node, SAFE_NODES):
            raise Hold("UNSAFE_AST_NODE_" + type(node).__name__)
        if isinstance(node, ast.Name) and node.id not in SAFE_NAMES:
            raise Hold("UNSAFE_NAME_" + node.id)
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in {"min", "max", "ValueError"} or node.keywords:
                raise Hold("UNSAFE_CALL")
    return tree


def independent_qa(source: str) -> int:
    tree = safe_clamp_ast(source)
    scope = {"__builtins__": {"min": min, "max": max, "ValueError": ValueError}}
    exec(compile(tree, "<bounded-fixture-only>", "exec"), scope)
    fn = scope["clamp"]
    examples = [(4, 0, 10, 4), (-3, 0, 10, 0), (24, 0, 10, 10),
                (2, 2, 2, 2), (-20, -10, -5, -10), (100, 10, 20, 20)]
    for value, low, high, expected in examples:
        if fn(value, low, high) != expected:
            raise Hold("INDEPENDENT_QA_MISMATCH")
    for triple in [(1, 5, 0), (0, 0, -1)]:
        try:
            fn(*triple)
        except ValueError:
            continue
        raise Hold("INDEPENDENT_QA_MISSING_VALUEERROR")
    return len(examples) + 2


def get_json(url: str, payload: dict | None = None, timeout: int = 8) -> dict:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data,
                                     headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read(60001)
    if len(raw) > 60000:
        raise Hold("LOCAL_OLLAMA_RESPONSE_TOO_LARGE")
    return json.loads(raw)


def run_once(model: str) -> dict:
    if not model or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._:-" for c in model):
        raise Hold("INVALID_LOCAL_MODEL_IDENTIFIER")
    tags = get_json(BASE + "/api/tags")
    installed = {m["name"] for m in tags.get("models", []) if isinstance(m, dict) and "name" in m}
    if model not in installed:
        raise Hold("MODEL_NOT_ALREADY_INSTALLED_NO_AUTO_PULL")
    request = {
        "model": model, "stream": False, "format": "json",
        "options": {"temperature": 0, "num_predict": 300},
        "messages": [{"role": "user", "content":
          "Return ONLY a JSON object with key code whose string value is a standalone Python "
          "function clamp(value, low, high) which returns an inclusive clamp and raises "
          "ValueError when low > high. No imports, modules, decorators, or other functions."}]
    }
    private_base = Path(os.environ.get("LOCALAPPDATA") or tempfile.gettempdir())
    private_dir = private_base / "FreeAutonomyPrivate" / "RealOllamaOneShot" / uuid.uuid4().hex
    private_dir.mkdir(parents=True, exist_ok=False)
    (private_dir / "request_scope.json").write_text(
        json.dumps({"model": model, "prompt": "public clamp fixture only", "requests": 1}, indent=2),
        encoding="utf-8")
    result = get_json(BASE + "/api/chat", request, timeout=240)
    (private_dir / "private_raw_response.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    if not result.get("done") or result.get("model") != model:
        raise Hold("LOCAL_MODEL_COMPLETION_NOT_ATTESTED")
    content = result.get("message", {}).get("content", "")
    try:
        obj = json.loads(content)
        source = obj["code"]
    except (ValueError, KeyError, TypeError) as ex:
        raise Hold("MODEL_DID_NOT_RETURN_EXPECTED_JSON_CODE") from ex
    qa = independent_qa(source)
    (private_dir / "candidate.py").write_text(source, encoding="utf-8")
    receipt = {
        "schema": "free-autonomy-local-ollama-real-response-v1",
        "status": "ONE_LOCAL_MODEL_CODE_FIXTURE_QA_ONLY",
        "model_requested": model,
        "model_reported": result.get("model"),
        "done_reported": result.get("done"),
        "source_sha256": hashlib.sha256(source.encode("utf-8")).hexdigest(),
        "independent_tests_passed": qa,
        "eval_count_reported": result.get("eval_count"),
        "response_done_reason": result.get("done_reason"),
        "model_calls_attempted": 1,
        "project_writes": 0,
        "github_pushes": 0,
        "long_autonomy_verified": False,
        "art_or_game_quality_verified": False,
    }
    (private_dir / "SHAREABLE_RECEIPT.json").write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    return receipt


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--model", default="qwen3:14b")
    args = ap.parse_args()
    try:
        print(json.dumps(run_once(args.model), ensure_ascii=False, indent=2))
    except (Hold, OSError, ValueError, KeyError, urllib.error.URLError) as ex:
        print(json.dumps({"status": "HOLD", "reason": str(ex)[:180]}, ensure_ascii=False))
        raise SystemExit(2)


if __name__ == "__main__":
    main()
