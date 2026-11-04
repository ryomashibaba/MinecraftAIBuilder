"""One-command Windows Qwen/Gemma *two-stage* real local coding proof.

It only downloads previously audited pinned public source, creates a disposable
Git fixture under LOCALAPPDATA, and uses existing local Ollama + Docker Node QA.
No project originals, model downloads, paid API keys, Work, or GitHub pushes.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request
import uuid

SOURCE_REVISION = "125615388cadd8a2e0be85b46bde701e2dc4ed50"
SOURCE_BLOBS = {"solo_agent.py":"58277f689c05950f550827cb89c7c76cafab8ee5","docker_sandbox.py":"e68c8e2c4f356d2741105aee6ff5660abdb7a294","local_ollama_real_probe.py":"a793ae298d5ecf35330c01d336266eea313b6132","local_ollama_patch_loop.py":"0d2e3e3738bdcfa272658bf8f1302ea1fc9c08e1"}
OWNER_REPO = "ryomashibaba/MinecraftAIBuilder"
QA_IMAGE = "node:22-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da"


class Hold(Exception):
    pass


def run(*args: str, cwd: Path | None = None) -> str:
    result = subprocess.run(list(args), cwd=cwd, text=True, capture_output=True,
                            timeout=60)
    if result.returncode:
        raise Hold("COMMAND_FAILED: " + args[0] + " " + result.stderr[-180:])
    return result.stdout.strip()


def pinned_download(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=False)
    for name, blob in SOURCE_BLOBS.items():
        url = (f"https://raw.githubusercontent.com/{OWNER_REPO}/"
               f"{SOURCE_REVISION}/tools/free-autonomy-solo/{name}")
        with urllib.request.urlopen(url, timeout=30) as response:
            raw = response.read(120001)
        if len(raw) > 120000:
            raise Hold("SOURCE_SIZE_LIMIT")
        actual = hashlib.sha1(
            b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
        if actual != blob:
            raise Hold("SOURCE_GIT_BLOB_INTEGRITY_MISMATCH: " + name)
        (dest / name).write_bytes(raw)


def ensure_qa_image(*, allow_public_pull: bool) -> None:
    try:
        server = subprocess.run(["docker", "version", "--format", "{{.Server.Version}}"],
                                capture_output=True, text=True, timeout=20)
        mode = subprocess.run(["docker", "info", "--format", "{{.OSType}}"],
                              capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.TimeoutExpired) as ex:
        raise Hold("DOCKER_ENGINE_UNAVAILABLE") from ex
    if server.returncode or not server.stdout.strip() or mode.returncode or mode.stdout.strip() != "linux":
        raise Hold("DOCKER_LINUX_ENGINE_REQUIRED")
    found = subprocess.run(["docker", "image", "inspect", QA_IMAGE],
                           capture_output=True, timeout=20)
    if found.returncode and allow_public_pull:
        try:
            pulled = subprocess.run(["docker", "pull", QA_IMAGE], capture_output=True,
                                    text=True, timeout=600)
        except (OSError, subprocess.TimeoutExpired) as ex:
            raise Hold("PUBLIC_QA_IMAGE_DOWNLOAD_FAILED") from ex
        if pulled.returncode:
            raise Hold("PUBLIC_QA_IMAGE_DOWNLOAD_FAILED")
        found = subprocess.run(["docker", "image", "inspect", QA_IMAGE],
                               capture_output=True, timeout=20)
    if found.returncode:
        raise Hold("PINNED_QA_IMAGE_NOT_CACHED_NO_AUTO_PULL")


def create_fixture(path: Path) -> None:
    path.mkdir()
    src = path / "source"
    src.mkdir()
    (src / "calc.mjs").write_text(
        "export function clamp(value, low, high) {\n"
        "  return value;\n"
        "}\n", encoding="utf-8")
    (src / "basic.test.mjs").write_text(
        "import {test} from 'node:test';\n"
        "import assert from 'node:assert/strict';\n"
        "import {clamp} from './calc.mjs';\n"
        "test('below',()=>assert.equal(clamp(-5,0,10),0));\n"
        "test('middle',()=>assert.equal(clamp(5,0,10),5));\n"
        "test('above',()=>assert.equal(clamp(99,0,10),10));\n", encoding="utf-8")
    (src / "bounds.test.mjs").write_text(
        "import {test} from 'node:test';\n"
        "import assert from 'node:assert/strict';\n"
        "import {clamp} from './calc.mjs';\n"
        "test('inverted',()=>assert.throws(()=>clamp(2,5,0),RangeError));\n"
        "test('basic',()=>assert.equal(clamp(12,1,10),10));\n", encoding="utf-8")
    run("git", "init", "-b", "research/disposable-qwen-proof", cwd=path)
    run("git", "config", "user.name", "Private Local Fixture", cwd=path)
    run("git", "config", "user.email", "local-fixture@example.invalid", cwd=path)
    # This is an identification value for the shared research supervisor,
    # not a clone and NEVER used to push anything.
    run("git", "remote", "add", "origin",
        "https://github.com/ryomashibaba/MinecraftAIBuilder.git", cwd=path)
    run("git", "add", "source", cwd=path)
    run("git", "commit", "-m", "disposable local test fixture", cwd=path)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--model", default="qwen3:14b")
    ap.add_argument("--allow-public-qa-image-pull", action="store_true")
    args = ap.parse_args()
    if os.name != "nt" or not os.environ.get("LOCALAPPDATA"):
        raise Hold("WINDOWS_LOCALAPPDATA_REQUIRED")
    root = (Path(os.environ["LOCALAPPDATA"]) / "FreeAutonomyPrivate" /
            "LocalPatchFixture" / uuid.uuid4().hex)
    root.mkdir(parents=True)
    private_code = root / "tools"
    output = root / "RECEIPT.json"
    status = {"schema": "local-patch-two-step-real-model-v1",
              "status": "HOLD", "model_requested": args.model,
              "github_pushes": 0, "user_project_files_touched": False,
              "source_revision": SOURCE_REVISION, "model_identity_certified": False,
              "project_quality_certified": False, "long_autonomy_certified": False}
    try:
        pinned_download(private_code)
        ensure_qa_image(allow_public_pull=args.allow_public_qa_image_pull)
        fixture = root / "disposable-fixture"
        create_fixture(fixture)
        config = {
            "project": "minecraftaibuilder",
            "workspace": str(fixture),
            "branch": "research/disposable-qwen-proof",
            "model": args.model,
            "state_dir": str(root / "private-state"),
            "sandbox_runtime": "docker",
            "docker": {"network": "none", "qa_image": QA_IMAGE,
                       "memory": "2g", "cpus": "2", "pids": 64},
            "tasks": [
                {"path": "source/calc.mjs",
                 "request": "Implement correct inclusive numeric clamp to low and high, without changing public API.",
                 "checks": [["node", "--test", "source/basic.test.mjs"]]},
                {"path": "source/calc.mjs",
                 "request": "Additionally reject inverted bounds when low > high by throwing RangeError. Keep prior valid behavior.",
                 "checks": [["node", "--test", "source/basic.test.mjs", "source/bounds.test.mjs"]]}
            ],
            "checks": [["node", "--test", "source/basic.test.mjs"]],
            "allowed_prefixes": ["source"],
            "max_cycles": 5, "per_task_attempts": 2,
            "model_timeout_seconds": 360, "qa_timeout_seconds": 90,
            "max_minutes": 45
        }
        config_path = root / "private-config.json"
        config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")
        cmd = subprocess.run([sys.executable,
                              str(private_code / "local_ollama_patch_loop.py"),
                              "--config", str(config_path)],
                             cwd=private_code, capture_output=True, text=True, timeout=3000)
        # Preserve stderr locally only, never publish raw prompts/responses.
        (root / "execution.private.log").write_text(
            (cmd.stdout + "\n" + cmd.stderr)[-10000:], encoding="utf-8")
        state_file = root / "private-state" / "local_patch_state.json"
        if state_file.exists():
            state = json.loads(state_file.read_text(encoding="utf-8"))
            status["local_commits"] = len(state.get("commits", []))
            status["attempt_cycles"] = state.get("cycles")
            status["step_status"] = state.get("status")
        status["status"] = (
            "TWO_STEP_LOCAL_SOURCE_QA_PROOF_ONLY"
            if cmd.returncode == 0 and status.get("local_commits") == 2
            else "HOLD"
        )
    except Exception as exc:
        status["status"] = "HOLD"
        status["failure_code"] = type(exc).__name__
    finally:
        output.write_text(json.dumps(status, ensure_ascii=False, indent=2),
                          encoding="utf-8")
        print(json.dumps(status, ensure_ascii=False, indent=2))
        print("PRIVATE_RESULT_PATH=" + str(output))
    return 0 if status["status"] == "TWO_STEP_LOCAL_SOURCE_QA_PROOF_ONLY" else 2


if __name__ == "__main__":
    raise SystemExit(main())
