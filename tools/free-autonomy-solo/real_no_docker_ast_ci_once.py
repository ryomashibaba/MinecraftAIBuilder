"""One-off real local Qwen3:1.7b two-stage no-Docker-on-user-PC witness.

CI runs a temporary Ollama Docker server on GitHub's Linux runner solely to
provide localhost inference. The actual candidate testing is a bounded Python
AST interpreter; it NEVER runs or imports model-generated code. Not evidence
of Windows/Qwen14B/TPS/MAB project coding or unattended deployment.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

from local_qwen_no_docker_two_step import local_api, run_trial


def command(args, timeout=40):
    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if r.returncode:
        raise RuntimeError("DOCKER_STEP_FAILED_" + "_".join(args[:2]))
    return r.stdout.strip()


def wait_ready():
    deadline = time.monotonic() + 70
    while time.monotonic() < deadline:
        try:
            obj = local_api("/api/tags", timeout=3)
            if isinstance(obj.get("models"), list):
                return obj
        except Exception:
            pass
        time.sleep(2)
    raise RuntimeError("OLLAMA_LOCALHOST_NOT_READY")


def main():
    model = "qwen3:1.7b"
    name = "free-autonomy-ast-only-" + str(os.getpid())
    receipt = {
        "schema": "free-autonomy-ast-real-ci-once-v1",
        "model_requested": model,
        "status": "HOLD",
        "user_windows_verified": False,
        "user_model_14b_verified": False,
        "paid_api_keys_used": False,
        "user_project_files_used": False,
        "model_generated_code_executed": False,
        "github_pushes": 0,
        "overnight_autonomy_verified": False,
    }
    with tempfile.TemporaryDirectory(prefix="real-ast-qwen-") as temp:
        try:
            command(["docker", "run", "-d", "--rm", "--name", name,
                     "--cap-drop=ALL", "--security-opt=no-new-privileges",
                     "--pids-limit", "128", "--memory", "5g", "--cpus", "3",
                     "-p", "127.0.0.1:11434:11434", "ollama/ollama:latest"], timeout=60)
            wait_ready()
            command(["docker", "exec", name, "ollama", "pull", model], timeout=420)
            tags = wait_ready()
            if model not in {x.get("name") for x in tags.get("models", [])}:
                raise RuntimeError("MODEL_NOT_PRESENT_AFTER_EXPLICIT_PULL")
            result = run_trial(model, Path(temp) / "private-fixture")
            receipt["local_ollama_endpoint_responded"] = True
            receipt["model_calls_attempted"] = result["model_calls_attempted"]
            receipt["stages_verified"] = result["independent_qa_completed_stages"]
            receipt["stage_results"] = result["stage_results"]
            receipt["status"] = result["status"]
            if "hold_reason" in result:
                receipt["hold_reason"] = result["hold_reason"]
        except (RuntimeError, OSError, ValueError, subprocess.TimeoutExpired) as ex:
            receipt["status"] = "HOLD"
            receipt["environment_failure_type"] = type(ex).__name__
        finally:
            subprocess.run(["docker", "rm", "-f", name], capture_output=True,
                           timeout=25, check=False)
    print(json.dumps(receipt, ensure_ascii=False, indent=2))
    return 0 if receipt["status"] == "TWO_STAGE_REAL_LOCAL_AST_QA_ONLY" else 2


if __name__ == "__main__":
    raise SystemExit(main())
