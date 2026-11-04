#!/usr/bin/env python3
"""One actual Qwen3:4b public-source V4H author attempt, independently QAed.
Not a local Windows 14B run. Never logs or uploads raw model-authored JSON.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

MODEL = "qwen3:4b"
PROMPT = (
    "Design an original accessible public learning and space-science center "
    "for families and student rocket builders in Minecraft Education. "
    "Invent the entire architectural layout, meaningful public activities, "
    "covered reception, an open public garden, a connected exterior wing, "
    "a covered public atrium, and a real functional upper learning mezzanine "
    "with public service desk. Compose an expressive coherent building, "
    "not a preselected template. Follow all exact spatial and safety "
    "constraints in the provided system contract. Return one complete "
    "original JSON author decision, with no host repair."
)
AUTHOR = r"""
import {runV4DLocalAuthor} from './scripts/r125-v4d-local-architect.mjs';
const result=await runV4DLocalAuthor({
 model:'qwen3:4b',outDir:process.env.MAB_PRIVATE_OUT,
 prompt:process.env.MAB_PROMPT,authorMezzanine:true
},{timeoutMs:290000});
console.log(JSON.stringify({status:result.status,modelCalls:result.modelCalls,
 worldWrites:result.worldWrites,sourceRoutes:result.sourceRoutesStatus}));
"""
QA = r"""
import fs from 'node:fs';
import {compileMezzanineAuthorIntent}
 from './source/ai/r125-v4h-mezzanine-author-ir.mjs';
const a=JSON.parse(fs.readFileSync('/private/AUTHOR_INTENT_ORIGINAL.json','utf8'));
const r=compileMezzanineAuthorIntent(a);
const w=r.authoredMezzanineSourceWitness;
if(r.worldWrites!==0||r.worldContacts!==0||r.executionAllowed!==false||
   r.constructionApproved!==false||r.readiness!=='NOT_PREPARED'||
   r.gates.length!==9||r.gates.some(x=>x!=='BLOCKED')||
   r.BuildPlan.operations.length!==0||
   r.b143.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   w.connectedUpperProgram?.reachedFromEntrance!==true||
   w.connectedPublicService?.reachableFromEntrance!==true||
   w.physical2WideStairTreads!==a.mezzanine.rise+1)
  throw Error('SOURCE_OR_WORLD_GATE_REJECTED');
console.log(JSON.stringify({pass:true,geometrySha256:r.geometrySha256,
 voxels:r.b143.compiled.primitives.length}));
"""
PASS = "ONE_GENUINE_QWEN4B_SOURCE_AND_INDEPENDENT_DOCKER_QA"
REASON = re.compile(r"[A-Z][A-Z0-9_]{2,120}\Z")


def cmd(argv, *, cwd=None, env=None, seconds=60):
    return subprocess.run(argv, cwd=cwd, env=env, capture_output=True,
                          text=True, encoding="utf-8", errors="replace",
                          stdin=subprocess.DEVNULL, timeout=seconds)


def trial():
    project = Path(__file__).resolve().parent.parent
    result = {
        "schema": "dec-genuine-v4h-after-author-window-contract-v1",
        "status": "HOLD", "source_pass": False,
        "model_label": MODEL, "model_calls": 0,
        "original_private_response_captured": False,
        "independent_docker_qa": False,
        "public_source_head": os.environ.get("GITHUB_SHA", "UNKNOWN"),
        "model_identity_cryptographically_verified": False,
        "private_original_published": False,
        "user_windows_accessed": False, "github_pushes": 0,
        "art": "NOT_REVIEWED", "minecraft_walking": "NOT_TESTED",
        "world_writes": 0, "paid_api_calls": 0,
    }
    with tempfile.TemporaryDirectory(prefix="v4h-real-one-response-") as folder:
        root = Path(folder)
        out = root / "model-original-private"
        container = "qwen4b-v4h-" + str(os.getpid())
        try:
            before = cmd(["git", "status", "--porcelain"], cwd=project)
            if before.returncode or before.stdout.strip():
                result["status"] = "HOLD_SOURCE_WORKTREE_NOT_CLEAN"
                return result
            start = cmd(["docker", "run", "-d", "--rm", "--name", container,
                         "--cap-drop=ALL", "--security-opt=no-new-privileges",
                         "--pids-limit", "128", "--memory", "5g", "--cpus", "3",
                         "-p", "127.0.0.1:11434:11434", "ollama/ollama:latest"])
            if start.returncode:
                result["status"] = "HOLD_OLLAMA_CONTAINER"
                return result
            pull = cmd(["docker", "exec", container, "ollama", "pull", MODEL],
                       seconds=420)
            if pull.returncode:
                result["status"] = "HOLD_EPHEMERAL_MODEL_PULL"
                return result
            env = {**os.environ, "MAB_PRIVATE_OUT": str(out),
                   "MAB_PROMPT": PROMPT, "NODE_OPTIONS": ""}
            call = cmd(["node", "--input-type=module", "--eval", AUTHOR],
                       cwd=project, env=env, seconds=345)
            path = out / "V4D_LOCAL_AUTHOR_REPORT.json"
            if not path.is_file():
                result["status"] = "HOLD_MODEL_RECEIPT_MISSING"
                return result
            receipt = json.loads(path.read_text(encoding="utf-8"))
            result["model_calls"] = receipt.get("modelCalls", 0)
            result["original_private_response_captured"] = bool(receipt.get("rawCaptured"))
            result["model_finish_reason"] = receipt.get("modelFinishReason")
            result["author_status"] = receipt.get("status")
            if receipt.get("status") != "SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED":
                reason = str(receipt.get("reason") or "")
                result["reason_code"] = (
                    reason if REASON.fullmatch(reason) else "PRIVATE_SOURCE_REASON")
                result["status"] = "HOLD_REAL_MODEL_ORIGINAL_SOURCE"
                return result
            if (call.returncode != 0 or receipt.get("modelCalls") != 1 or
                    not receipt.get("rawCaptured") or receipt.get("worldWrites") != 0):
                result["status"] = "HOLD_MODEL_RECEIPT_CONTRACT"
                return result
            qa = cmd([
                "docker", "run", "--rm", "--read-only", "--network", "none",
                "--cap-drop=ALL", "--security-opt=no-new-privileges",
                "--pids-limit", "128", "--memory", "4g", "--cpus", "2",
                "--tmpfs", "/tmp:rw,nosuid,size=128m",
                "-v", str(project) + ":/work:ro", "-v", str(out) + ":/private:ro",
                "-w", "/work", "--entrypoint", "node", "node:24-bookworm-slim",
                "--input-type=module", "--eval", QA], seconds=200)
            if qa.returncode:
                result["status"] = "HOLD_NETWORK_NONE_INDEPENDENT_B143_QA"
                return result
            verified = json.loads(qa.stdout.strip())
            if (verified.get("pass") is not True or
                    verified.get("geometrySha256") != receipt.get("geometrySha256") or
                    verified.get("voxels") != receipt.get("actualB143VoxelCount")):
                result["status"] = "HOLD_INDEPENDENT_B143_WITNESS_MISMATCH"
                return result
            result["source_pass"] = True
            result["independent_docker_qa"] = True
            result["voxel_count"] = verified["voxels"]
            result["status"] = PASS
        except (OSError, subprocess.TimeoutExpired, ValueError, KeyError) as exc:
            result["status"] = "HOLD_INFRASTRUCTURE_OR_TIMEOUT"
            result["error_class"] = type(exc).__name__
        finally:
            cmd(["docker", "rm", "-f", container], seconds=25)
            after = cmd(["git", "status", "--porcelain"], cwd=project)
            if after.returncode or after.stdout.strip():
                result["status"] = "HOLD_SOURCE_WORKTREE_MUTATED"
                result["source_pass"] = False
    return result


if __name__ == "__main__":
    report = trial()
    print(json.dumps(report, sort_keys=True, ensure_ascii=False, indent=2))
    if os.environ.get("RUNNER_TEMP"):
        (Path(os.environ["RUNNER_TEMP"]) / "v4h-qwen4b-after-contract.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8")
    if report["status"] != PASS:
        sys.exit(2)
