"""Offline fixture-only checks for the genuine Qwen14B original V4H batch.
No real Ollama, project clone, model inference, world contact or code execution.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import real_mab_original_architecture_batch as batch


class PrivateOriginalArchitectureBatchTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.home = Path(tmp.name)
        self.env = patch.dict(os.environ, {"LOCALAPPDATA": str(self.home)})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.lane = {"pinned_commit": "a" * 40}
        self.manifest = {"project_candidates": {
            "minecraftaibuilder": self.lane,
        }}

    def fake_prepare(self, project, manifest, folder):
        workspace = folder / "repo"
        workspace.mkdir(parents=True)
        return {"status": "REAL_SOURCE_CLONE_PINNED_READONLY_READY",
                "private_workspace_path": str(workspace)}

    def test_three_independent_briefs_one_model_post_each_never_repair(self):
        author_calls = []
        qa_calls = []

        def fake_node(workspace, code, env, timeout):
            if code == batch.AUTHOR_JS:
                out = Path(env["MAB_PRIVATE_OUT"])
                out.mkdir()
                slug = out.name.removeprefix("private-original-")
                author_calls.append(slug)
                rejected = slug == "cultural-library"
                report = {
                    "modelCalls": 1, "rawCaptured": True, "worldWrites": 0,
                    "sourceRoutesStatus": "NOT_TESTED" if rejected else
                                          "SOURCE_ROUTES_REACH_ALL_ZONES",
                    "status": "HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR" if rejected
                              else "SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED",
                    "reason": "R125_V4E_RANKED_COVERED_REQUIRES_AUTHORED_FOUR_SIDE_RANKING_0"
                              if rejected else None,
                    "geometrySha256": "b" * 63 + slug[-1],
                    "actualB143VoxelCount": 42,
                }
                (out / "V4D_LOCAL_AUTHOR_REPORT.json").write_text(
                    json.dumps(report), encoding="utf-8")
                if not rejected:
                    (out / "FINAL_TWO_LEVEL_PUBLIC_GALLERY_FIVE_VIEWS_PRIVATE.svg").write_text(
                        "<svg>" + ("geometry" * 100) + "</svg>", encoding="utf-8")
                    (out / "AUTHOR_INTENT_ORIGINAL.json").write_text(
                        '{"dummy":"private-model-output"}', encoding="utf-8")
                    (out / "MODEL_RESPONSE_ORIGINAL.txt").write_text(
                        "PRIVATE MODEL RESPONSE - NEVER UPLOAD", encoding="utf-8")
                return subprocess.CompletedProcess(["node"], 0, "{}", "")
            if code == batch.INDEPENDENT_JS:
                self.assertTrue(Path(env["MAB_ORIGINAL_JSON"]).is_file())
                qa_calls.append(Path(env["MAB_ORIGINAL_JSON"]).parent.name)
                return subprocess.CompletedProcess(["node"], 0, json.dumps({
                    "status": "SOURCE_ONLY_INDEPENDENT_PASS",
                    "geometrySha256": "b" * 63 + Path(
                        env["MAB_ORIGINAL_JSON"]).parent.name[-1],
                    "voxelCount": 42,
                }), "")
            raise AssertionError("UNEXPECTED_CODE_EXECUTION")

        with patch.object(batch, "local_model_installed", return_value=True), \
             patch.object(batch, "load_manifest", return_value=self.manifest), \
             patch.object(batch, "prepare", side_effect=self.fake_prepare), \
             patch.object(batch, "verify_private_clone"), \
             patch.object(batch, "_node", side_effect=fake_node):
            result, saved = batch.run_batch("qwen3:14b", 3)

        self.assertEqual(result["status"], "HOLD_PARTIAL_ARCHITECTURE_SOURCE_ACCEPTANCE")
        self.assertFalse(result["whole_batch_verified"])
        self.assertEqual(author_calls,
                         ["space-science", "cultural-library", "craft-maker"])
        self.assertEqual(len(qa_calls), 2)
        self.assertEqual(result["model_posts_observed"], 3)
        self.assertEqual(result["generated_buildings_source_passed"], 2)
        self.assertEqual(result["results"][1]["status"], "HOLD_MODEL_OR_SOURCE")
        self.assertIn("R125_V4E_RANKED", result["results"][1]["reason_code"])
        self.assertNotIn("PRIVATE MODEL RESPONSE", saved.read_text(encoding="utf-8"))
        self.assertTrue(result["private_original_responses_uploaded"] is False)
        self.assertEqual(result["github_pushes"], 0)
        self.assertEqual(result["world_writes"], 0)
        self.assertTrue(saved.is_file())
        gallery = saved.parent / "V4H_PRIVATE_SOURCE_COMPARE.html"
        self.assertTrue(gallery.is_file())
        self.assertIn("space-science", gallery.read_text(encoding="utf-8"))
        self.assertIn("cultural-library", gallery.read_text(encoding="utf-8"))
        self.assertIn("ART: NOT_REVIEWED", gallery.read_text(encoding="utf-8"))

    def test_all_source_pass_requires_every_brief_and_unique_geometry(self):
        summary = {
            "independent_original_briefs": 3,
            "generated_buildings_source_passed": 3,
            "results": [
                {"status": "SOURCE_ONLY_PRIVATE_ART_HOLD",
                 "independent_source_pass": True,
                 "geometry_sha256": str(i) * 64}
                for i in (1, 2, 3)
            ],
        }
        batch._finish_status(summary)
        self.assertEqual(summary["status"],
                         "ALL_ORIGINAL_ARCHITECTURES_SOURCE_ONLY_ART_HOLD")
        self.assertTrue(summary["whole_batch_verified"])
        self.assertEqual(summary["distinct_accepted_geometry_count"], 3)
        summary["results"][2]["geometry_sha256"] = "1" * 64
        batch._finish_status(summary)
        self.assertFalse(summary["whole_batch_verified"])
        self.assertEqual(summary["status"],
                         "HOLD_DUPLICATE_GEOMETRY_ACROSS_ORIGINAL_BRIEFS")

    def test_private_review_escapes_reason_values_and_has_no_script(self):
        with tempfile.TemporaryDirectory() as temp:
            report = {
                "independent_original_briefs": 1,
                "status": "HOLD_NO_ORIGINAL_SOURCE_ACCEPTED",
                "results": [{"brief_id": "space-science",
                             "status": "HOLD",
                             "reason_code": "<script>alert(1)</script>"}],
            }
            path = batch._private_review_html(report, Path(temp))
            html_text = path.read_text(encoding="utf-8")
            self.assertIn("&lt;script&gt;", html_text)
            self.assertNotIn("<script>", html_text)
            self.assertIn("default-src 'none'", html_text)
            self.assertIn("no art preview", html_text)

    def test_no_installed_local_model_holds_before_any_project_clone(self):
        with patch.object(batch, "local_model_installed", return_value=False), \
             patch.object(batch, "prepare") as prepare:
            result, saved = batch.run_batch("qwen3:14b", 1)
        self.assertEqual(result["status"], "HOLD_INFRASTRUCTURE_OR_MODEL")
        self.assertEqual(result["model_posts_observed"], 0)
        self.assertEqual(result["reason_code"], "MODEL_NOT_INSTALLED_NO_AUTOPULL")
        prepare.assert_not_called()
        self.assertTrue(saved.exists())

    def test_rejects_model_name_and_case_count_before_using_ollama(self):
        with self.assertRaises(ValueError):
            batch.run_batch("qwen3:14b; something else", 1)
        with self.assertRaises(ValueError):
            batch.run_batch("qwen3:14b", 4)

    def test_architecture_prompts_are_distinct_without_fixed_design_answers(self):
        self.assertEqual(len({x[0] for x in batch.BRIEFS}), 3)
        self.assertEqual(len({x[1] for x in batch.BRIEFS}), 3)
        self.assertTrue(all("windowPriority" in x[1] for x in batch.BRIEFS))
        self.assertNotIn("qwen3:4b", batch.AUTHOR_JS)
        self.assertIn("authorMezzanine:true", batch.AUTHOR_JS)
        self.assertIn("compileMezzanineAuthorIntent", batch.INDEPENDENT_JS)
        self.assertNotIn("eval(", batch.INDEPENDENT_JS)
        self.assertNotIn("exec(", batch.INDEPENDENT_JS)


if __name__ == "__main__":
    unittest.main()
