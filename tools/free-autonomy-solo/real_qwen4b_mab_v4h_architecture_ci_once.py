#!/usr/bin/env python3
"""ONE genuine Qwen4B full V4H architectural author attempt, no repair/template.

Run trusted existing MAB author compiler on model JSON in an ephemeral public
CI clone; a separate network-none Docker QA independently compiles a passing
candidate. No model-generated code is executed. Original plans, Minecraft,
model-generated JSON and art files stay outside repository and public artifacts.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

from real_small_model_ci_once import MODEL, IMAGE, cmd, wait_ready
from prepare_pinned_real_project import load_manifest, prepare

PROJECT = "minecraftaibuilder"
PASS = "GENUINE_ONE_RESPONSE_V4H_B143_SOURCE_AND_ISOLATED_QA"
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

AUTHOR_SCRIPT = String.raw if False else r'''
import {runV4DLocalAuthor} from './scripts/r125-v4d-local-architect.mjs';
const response=await runV4DLocalAuthor({
 model:process.env.MAB_AUTHOR_MODEL,
 outDir:process.env.MAB_AUTHOR_PRIVATE_OUT,
 prompt:process.env.MAB_AUTHOR_PROMPT,
 authorMezzanine:true
},{timeoutMs:290000});
console.log(JSON.stringify({
 status:response.status,modelCalls:response.modelCalls,
 sourceRoutesStatus:response.sourceRoutesStatus,
 worldWrites:response.worldWrites,rawCaptured:response.rawCaptured
}));
'''
INDEPENDENT_QA = r'''
import {readFileSync} from 'node:fs';
import {compileMezzanineAuthorIntent} from './source/ai/r125-v4h-mezzanine-author-ir.mjs';
const raw=JSON.parse(readFileSync('/private/AUTHOR_INTENT_ORIGINAL.json','utf8'));
const r=compileMezzanineAuthorIntent(raw);
const w=r.authoredMezzanineSourceWitness;
if(r.b143.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   w.connectedUpperProgram?.reachedFromEntrance!==true||
   w.connectedPublicService?.reachableFromEntrance!==true||
   w.physical2WideStairTreads!==raw.mezzanine.rise+1||
   r.worldWrites!==0||r.worldContacts!==0||
   r.executionAllowed!==false||r.constructionApproved!==false||
   r.readiness!=='NOT_PREPARED'||r.BuildPlan.operations.length!==0||
   r.gates.length!==9||r.gates.some(g=>g!=='BLOCKED'))
  throw Error('V4H_TRUE_FUNCTION_OR_SAFETY_NOT_VERIFIED');
console.log(JSON.stringify({status:'INDEPENDENT_V4H_SOURCE_QA_PASS',
  routeStatus:r.b143.sourceRoutes.status,
  realB143Cells:r.b143.compiled.primitives.length,
  physicallyConnectedUpperPublic:true,worldWrites:r.worldWrites,
  constructionApproved:r.constructionApproved}));
'''


def run() -> dict:
    result = {
        "schema": "dec-real-local-qwen4b-v4h-original-architecture-v1",
        "project": PROJECT, "status": "HOLD", "requested_model": MODEL,
        "original_model_posts": 0, "model_response_captured": False,
        "independent_3d_source_qa": False, "world_writes": 0,
        "remote_pushes": 0, "private_generated_content_published": False,
        "user_windows_accessed": False, "human_art": "NOT_REVIEWED",
        "minecraft_walking": "NOT_TESTED", "long_autonomy_certified": False,
    }
    with tempfile.TemporaryDirectory(prefix="qwen-v4h-author-private-") as tmp:
        private = Path(tmp)
        os.environ["LOCALAPPDATA"] = str(private / "single-project-lock")
        (private / "single-project-lock").mkdir()
        container = "fa-qwen-v4h-" + str(os.getpid())
        try:
            manifest = load_manifest()
            result["pinned_head"] = manifest["project_candidates"][PROJECT]["pinned_commit"]
            admission = prepare(PROJECT, manifest, private / "one-project-clones")
            if admission["status"] != "REAL_SOURCE_CLONE_PINNED_READONLY_READY":
                result["status"] = "HOLD_PROTECTED_SOURCE_ADMISSION"
                return result
            workspace = Path(admission["private_workspace_path"])
            cmd(["docker", "run", "-d", "--name", container, "--rm",
                 "--cap-drop=ALL", "--security-opt=no-new-privileges",
                 "--pids-limit", "128", "--memory", "5g", "--cpus", "3",
                 "-p", "127.0.0.1:11434:11434", IMAGE], timeout=55)
            wait_ready()
            # Pull allowed ONLY on ephemeral GitHub CI, never on user's Windows.
            cmd(["docker", "exec", container, "ollama", "pull", MODEL], timeout=420)
            wait_ready()
            output = private / "authored-original-private"
            env = {**os.environ, "MAB_AUTHOR_MODEL": MODEL,
                   "MAB_AUTHOR_PRIVATE_OUT": str(output), "MAB_AUTHOR_PROMPT": PROMPT}
            p = subprocess.run(["node", "--input-type=module", "--eval",
                                AUTHOR_SCRIPT], cwd=workspace, env=env,
                               capture_output=True, text=True, timeout=320)
            report_path = output / "V4D_LOCAL_AUTHOR_REPORT.json"
            if not report_path.is_file():
                result["status"] = "HOLD_AUTHOR_REPORT_NOT_CREATED"
                result["node_exit_code"] = p.returncode
                return result
            author = json.loads(report_path.read_text(encoding="utf-8"))
            result["original_model_posts"] = author["modelCalls"]
            result["model_response_captured"] = author["rawCaptured"]
            result["author_status"] = author["status"]
            result["world_writes"] = author["worldWrites"]
            result["model_finish"] = author.get("modelFinishReason")
            if author["status"] != "SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED":
                message = str(author.get("reason") or "")
                # Raw model text, architectural names and even error lines
                # are never printed or uploaded to the public repository.
                match = re.match(r"^[A-Z][A-Z0-9_]{2,110}$", message)
                result["reason_code"] = message if match else "SOURCE_HOLD_UNCLASSIFIED"
                result["status"] = "HOLD_ONE_RESPONSE_AUTHOR_OR_SOURCE"
                return result
            if (author["modelCalls"] != 1 or not author["rawCaptured"] or
                    author["worldWrites"] != 0 or
                    author["sourceRoutesStatus"] != "SOURCE_ROUTES_REACH_ALL_ZONES"):
                result["status"] = "HOLD_AUTHOR_GATE_MISMATCH"
                return result
            result["generated_b143_voxels"] = author["actualB143VoxelCount"]
            result["authored_geometry_sha256"] = author["geometrySha256"]
            # Independent host-authored compiler pass inside readonly,
            # credential-free, network-none Docker. No world or Git writes.
            argv = [
                "docker", "run", "--rm", "--init", "--read-only",
                "--network", "none", "--cap-drop=ALL",
                "--security-opt", "no-new-privileges",
                "--pids-limit", "128", "--memory", "4g", "--cpus", "2",
                "--tmpfs", "/tmp:rw,nosuid,size=128m",
                "--workdir", "/work",
                "--mount", "type=bind,src=" + str(workspace) + ",dst=/work,readonly",
                "--mount", "type=bind,src=" + str(output) + ",dst=/private,readonly",
                "--entrypoint", "node", "node:24-bookworm-slim",
                "--input-type=module", "--eval", INDEPENDENT_QA
            ]
            checked = subprocess.run(argv, capture_output=True,
                                     text=True, timeout=200)
            if checked.returncode != 0:
                result["status"] = "HOLD_INDEPENDENT_DOCKER_B143_QA"
                return result
            verification = json.loads(checked.stdout.strip())
            if verification["status"] != "INDEPENDENT_V4H_SOURCE_QA_PASS":
                result["status"] = "HOLD_DOCKER_VERIFICATION_STATUS"
                return result
            result["independent_3d_source_qa"] = True
            result["status"] = PASS
        except Exception as exc:
            result["status"] = "HOLD_RUNTIME_OR_MODEL"
            result["exception_class"] = type(exc).__name__
        finally:
            subprocess.run(["docker", "rm", "-f", container],
                           capture_output=True, timeout=25, check=False)
    return result


if __name__ == "__main__":
    evidence = run()
    print(json.dumps(evidence, ensure_ascii=False, sort_keys=True, indent=2))
    ci = os.environ.get("RUNNER_TEMP")
    if ci:
        (Path(ci) / "v4h-qwen-original-author-sanitized.json").write_text(
            json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
    if evidence["status"] != PASS:
        raise SystemExit(2)
