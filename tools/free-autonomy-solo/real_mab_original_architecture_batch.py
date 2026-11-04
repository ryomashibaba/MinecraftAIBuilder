#!/usr/bin/env python3
"""Genuine one-local-model V4H architectural authorship, safely batched.

ONE model POST per independent original building brief. No automatic repair,
re-prompt for the same candidate, model pull, Docker requirement, GitHub push,
host execution of model-written code, Minecraft write, or ART promotion.
Run the trusted V4H Node compiler from an exactly pinned private Git clone,
then independently recompile its private JSON in a separate Node process.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid

from draft_real_project_local14b import (
    exclusive_local_project_lock, local_model_installed,
)
from prepare_pinned_real_project import (
    load_manifest, prepare, verify_private_clone,
)

PROJECT = "minecraftaibuilder"
SCHEMA = "dec-real-14b-original-v4h-batch-v1"
BRIEFS = (
    ("space-science", "Invent a world-class public space science and rocket engineering learning centre. "
     "Make original choices for every room, circulation and material, with an accessible "
     "public garden, inhabited tall central hall, connected wing and upper public mezzanine. "
     "For EACH covered room author windowPriority as ALL FOUR DIFFERENT compass strings "
     "north,east,south,west in your own preferred order; for a sky room use null. "
     "Never use a generic template; preserve full building functionality and safety."),
    ("cultural-library", "Invent an original public library and community storytelling centre "
     "with a functional arrival room, distinct covered reading functions, a sky-open "
     "public space, original connected wing, tall gathering hall and useful upper level. "
     "For EACH covered room author windowPriority as ALL FOUR DIFFERENT compass strings "
     "north,east,south,west in your own preferred order; for a sky room use null. "
     "Choose your own architecture, do not borrow an existing spatial template."),
    ("craft-maker", "Invent an original public maker workshop and craft demonstration hub "
     "with unique functions for every area, a public outdoor courtyard, physically "
     "connected wing, double-height social hall and publicly accessible upper activity deck. "
     "For EACH covered room author windowPriority as ALL FOUR DIFFERENT compass strings "
     "north,east,south,west in your own preferred order; for a sky room use null. "
     "Choose all spatial and material decisions yourself, no copied host template."),
)
# The compass sentence restates the FIXED V4E/V4H source contract.
# It NEVER supplies a particular order, material, room position or repair.

AUTHOR_JS = r"""
import {runV4DLocalAuthor} from './scripts/r125-v4d-local-architect.mjs';
const result=await runV4DLocalAuthor({
 model:process.env.MAB_LOCAL_MODEL,
 outDir:process.env.MAB_PRIVATE_OUT,
 prompt:process.env.MAB_ARCHITECT_BRIEF,
 authorMezzanine:true
},{timeoutMs:290000});
console.log(JSON.stringify({
 status:result.status,modelCalls:result.modelCalls,
 worldWrites:result.worldWrites,sourceRoutes:result.sourceRoutesStatus
}));
"""

INDEPENDENT_JS = r"""
import fs from 'node:fs';
import {compileMezzanineAuthorIntent} from './source/ai/r125-v4h-mezzanine-author-ir.mjs';
const original=JSON.parse(fs.readFileSync(process.env.MAB_ORIGINAL_JSON,'utf8'));
const result=compileMezzanineAuthorIntent(original);
const w=result.authoredMezzanineSourceWitness;
if(result.b143.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   w.connectedUpperProgram?.reachedFromEntrance!==true||
   w.connectedPublicService?.reachableFromEntrance!==true||
   w.physical2WideStairTreads!==original.mezzanine.rise+1||
   result.worldContacts!==0||result.worldWrites!==0||
   result.readiness!=='NOT_PREPARED'||
   result.constructionApproved!==false||result.executionAllowed!==false||
   result.gates.length!==9||result.gates.some(g=>g!=='BLOCKED')||
   result.BuildPlan.operations.length!==0)
 throw Error('V4H_INDEPENDENT_SOURCE_OR_WORLD_GATES_HOLD');
console.log(JSON.stringify({
 status:'SOURCE_ONLY_INDEPENDENT_PASS',
 geometrySha256:result.geometrySha256,
 voxelCount:result.b143.compiled.primitives.length,
 upperAccessible:true,worldWrites:0,constructionApproved:false
}));
"""

REASON_CODE = re.compile(r"[A-Z][A-Z0-9_]{2,130}\Z")


def _node(workspace: Path, code: str, env: dict, timeout: int) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["node", "--input-type=module", "--eval", code],
        cwd=workspace, env=env, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        encoding="utf-8", errors="replace", timeout=timeout,
    )


def _identity_health(workspace: Path, lane: dict) -> None:
    verify_private_clone(workspace, lane)


def run_batch(model: str, cases: int) -> tuple[dict, Path]:
    if not re.fullmatch(r"[A-Za-z0-9_.:/-]{1,100}", model):
        raise ValueError("MODEL_NAME_INVALID")
    if not (1 <= cases <= len(BRIEFS)):
        raise ValueError("CASE_COUNT_OUTSIDE_1_TO_3")
    base = Path(os.environ.get("LOCALAPPDATA") or "").expanduser()
    if not os.environ.get("LOCALAPPDATA") or not base.is_dir():
        raise RuntimeError("LOCALAPPDATA_REQUIRED")
    dest = base / "FreeAutonomyPrivate" / "RealOriginalV4H14B" / uuid.uuid4().hex
    dest.mkdir(parents=True, exist_ok=False)
    summary = {
        "schema": SCHEMA, "project": PROJECT, "selected_model_label": model,
        "status": "HOLD", "independent_original_briefs": cases,
        "generated_buildings_source_passed": 0, "model_posts_observed": 0,
        "private_original_responses_uploaded": False,
        "protected_project_files_modified": False,
        "generated_code_executed": False, "github_pushes": 0,
        "paid_api_calls": 0, "model_downloads": 0,
        "art_status": "NOT_REVIEWED", "minecraft_walking": "NOT_TESTED",
        "world_writes": 0, "long_autonomous_coding_certified": False,
        "results": [],
    }
    output_path = dest / "SHAREABLE_V4H_REAL_14B_BATCH.json"
    try:
        with exclusive_local_project_lock():
            if not local_model_installed(model):
                raise RuntimeError("MODEL_NOT_INSTALLED_NO_AUTOPULL")
            manifest = load_manifest()
            lane = manifest["project_candidates"][PROJECT]
            summary["immutable_source_commit"] = lane["pinned_commit"]
            adm = prepare(PROJECT, manifest, dest / "private-clones")
            if adm.get("status") != "REAL_SOURCE_CLONE_PINNED_READONLY_READY":
                raise RuntimeError("IMMUTABLE_SOURCE_CLONE_ADMISSION_HOLD")
            workspace = Path(adm["private_workspace_path"])
            _identity_health(workspace, lane)
            for slug, brief in BRIEFS[:cases]:
                case = {
                    "brief_id": slug, "status": "HOLD",
                    "model_posts": 0, "raw_response_captured": False,
                    "independent_source_pass": False,
                    "world_writes": 0, "art_status": "NOT_REVIEWED",
                }
                summary["results"].append(case)
                out = dest / ("private-original-" + slug)
                try:
                    env = {**os.environ,
                           "MAB_LOCAL_MODEL": model,
                           "MAB_PRIVATE_OUT": str(out),
                           "MAB_ARCHITECT_BRIEF": brief,
                           "NODE_OPTIONS": ""}
                    author = _node(workspace, AUTHOR_JS, env, 320)
                    data_path = out / "V4D_LOCAL_AUTHOR_REPORT.json"
                    if not data_path.is_file():
                        case["status"] = "HOLD_AUTHOR_PROCESS_OR_REPORT"
                        case["node_exit_code"] = author.returncode
                        continue
                    report = json.loads(data_path.read_text(encoding="utf-8"))
                    case["model_posts"] = int(report.get("modelCalls") or 0)
                    summary["model_posts_observed"] += case["model_posts"]
                    case["raw_response_captured"] = report.get("rawCaptured") is True
                    if (author.returncode != 0 or
                            report.get("status") != "SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED"):
                        reason = str(report.get("reason") or "")
                        case["status"] = "HOLD_MODEL_OR_SOURCE"
                        case["reason_code"] = (
                            reason if REASON_CODE.fullmatch(reason)
                            else "PRIVATE_REASON_NOT_SHAREABLE")
                        continue
                    if (case["model_posts"] != 1 or not case["raw_response_captured"] or
                            report.get("worldWrites") != 0 or
                            report.get("sourceRoutesStatus") != "SOURCE_ROUTES_REACH_ALL_ZONES"):
                        case["status"] = "HOLD_MODEL_AND_WORLD_CONTRACT"
                        continue
                    input_file = out / "AUTHOR_INTENT_ORIGINAL.json"
                    if not input_file.is_file() or input_file.is_symlink():
                        case["status"] = "HOLD_PRIVATE_AUTHOR_JSON_MISSING"
                        continue
                    _identity_health(workspace, lane)
                    checked = _node(workspace, INDEPENDENT_JS,
                                    {**os.environ, "MAB_ORIGINAL_JSON": str(input_file),
                                     "NODE_OPTIONS": ""}, 120)
                    if checked.returncode:
                        case["status"] = "HOLD_INDEPENDENT_V4H_SOURCE"
                        continue
                    independent = json.loads(checked.stdout.strip())
                    if (independent.get("status") != "SOURCE_ONLY_INDEPENDENT_PASS" or
                            independent.get("geometrySha256") !=
                            report.get("geometrySha256") or
                            independent.get("voxelCount") !=
                            report.get("actualB143VoxelCount")):
                        case["status"] = "HOLD_INDEPENDENT_GEOMETRY_MISMATCH"
                        continue
                    case["status"] = "SOURCE_ONLY_PRIVATE_ART_HOLD"
                    case["independent_source_pass"] = True
                    case["source_voxel_count"] = independent["voxelCount"]
                    case["geometry_sha256"] = independent["geometrySha256"]
                    case["response_sha256"] = hashlib.sha256(
                        (out / "MODEL_RESPONSE_ORIGINAL.txt").read_bytes()).hexdigest()
                    summary["generated_buildings_source_passed"] += 1
                except (OSError, ValueError, KeyError, TypeError, subprocess.TimeoutExpired) as exc:
                    case["status"] = "HOLD_PROCESS_OR_SOURCE_EXCEPTION"
                    case["exception_type"] = type(exc).__name__
                finally:
                    _identity_health(workspace, lane)
            summary["status"] = ("SOURCE_ONLY_PRIVATE_ART_HOLD" if
                                 summary["generated_buildings_source_passed"] else
                                 "HOLD_NO_ORIGINAL_SOURCE_ACCEPTED")
    except (RuntimeError, OSError, ValueError, KeyError, subprocess.TimeoutExpired) as exc:
        summary["status"] = "HOLD_INFRASTRUCTURE_OR_MODEL"
        message = str(exc)
        summary["reason_code"] = (
            message if REASON_CODE.fullmatch(message) else type(exc).__name__)
    finally:
        output_path.write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8")
    return summary, output_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="qwen3:14b")
    parser.add_argument("--cases", type=int, default=3, choices=(1, 2, 3))
    parser.add_argument("--ci-self-test", action="store_true")
    args = parser.parse_args()
    if args.ci_self_test:
        assert len({x[0] for x in BRIEFS}) == len(BRIEFS) == 3
        assert all("windowPriority" in x[1] for x in BRIEFS)
        assert "runV4DLocalAuthor" in AUTHOR_JS
        assert "--eval" in _node.__code__.co_consts
        print("V4H_BATCH_STATIC_SELF_TEST_ONLY_NO_MODEL_OR_NETWORK")
        return 0
    result, report_path = run_batch(args.model, args.cases)
    print(json.dumps({
        "schema": result["schema"], "status": result["status"],
        "model_posts_observed": result["model_posts_observed"],
        "generated_buildings_source_passed": result["generated_buildings_source_passed"],
        "independent_original_briefs": result["independent_original_briefs"],
        "world_writes": result["world_writes"],
    }, ensure_ascii=False))
    print("PRIVATE_SHAREABLE_RESULT_PATH=" + str(report_path))
    return 0 if result["status"] == "SOURCE_ONLY_PRIVATE_ART_HOLD" else 2


if __name__ == "__main__":
    sys.exit(main())
