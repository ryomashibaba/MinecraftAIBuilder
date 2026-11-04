"""Offline contracts for deterministic non-LLM repair of two failed real Qwen edits.

No network, no model calls, no Docker, and NO GitHub push.
"""
from __future__ import annotations

from unittest.mock import patch
import shutil
import subprocess
import unittest

import reviewed_qwen_mab_repair_qa as audit

BASE = (
    "export const MEZZANINE_SCHEMA='test';\n"
    + audit.BASE_EXACT + "\n"
    + "export function compileMezzanineAuthorIntent(x) {\n"
    + audit.BASE_WITNESS + "\n"
    + " return x;\n}\n"
    + "export function compileAuthoredPublicMezzanine(x){ return x; }\n"
)


def staged_fixture():
    first = audit.one_replace(BASE, audit.BASE_EXACT, audit.QWEN_BROKEN_EXACT)
    second = audit.one_replace(first, audit.BASE_WITNESS, audit.QWEN_BROKEN_WITNESS)
    report = {
        "project": "minecraftaibuilder",
        "model_reported_only": "qwen3:14b",
        "synthetic_fixture": False,
        "source_commit": "f" * 40,
        "source_before_sha256": audit.sha(BASE),
        "stage1_source": first, "stage2_source": second,
        "stage1_sha256": audit.sha(first),
        "stage2_sha256": audit.sha(second),
    }
    return first, second, report


class ReviewedQwenRepairTests(unittest.TestCase):
    def checked(self, baseline=BASE, *, modify=None):
        first, second, report = staged_fixture()
        if modify is not None:
            modify(report)
        with patch.object(audit, "ORIGINAL_STAGE_HASHES",
                          (audit.sha(first), audit.sha(second))), \
             patch.object(audit, "PINNED_SOURCE", "f" * 40):
            return audit.repair_exact_known_failures(baseline, report)

    def test_exact_two_known_failures_repaired_without_model_or_git(self):
        stage1, stage2 = self.checked()
        self.assertNotEqual(stage1, BASE)
        self.assertNotEqual(stage2, stage1)
        self.assertIn("fields.every(field=>Object.prototype.hasOwnProperty", stage1)
        self.assertIn("MISSING_REAL_UPPER_LEVEL_SOURCE_WITNESS", stage2)
        self.assertNotIn("fields.sort().join", stage1)
        self.assertNotIn("physical2WideStairTreads>5", stage2)
        for anchor in ("MEZZANINE_SCHEMA", "compileMezzanineAuthorIntent",
                       "compileAuthoredPublicMezzanine"):
            self.assertIn(anchor, stage2)

    def test_unknown_model_or_tampered_second_stage_denied(self):
        for modified, reason in (
            (lambda d: d.update(model_reported_only="assistant"), "ORIGINAL_MODEL_REPORT_MISMATCH"),
            (lambda d: d.update(stage2_source="TAMPERED"), "ORIGINAL_QWEN_STAGE_2_SHA_MISMATCH"),
            (lambda d: d.update(source_commit="0"*40), "PINNED_SOURCE_COMMIT_MISMATCH"),
            (lambda d: d.update(synthetic_fixture=True), "PROJECT_OR_PROVENANCE_MISMATCH"),
        ):
            with self.subTest(reason=reason):
                with self.assertRaisesRegex(audit.Hold, reason):
                    self.checked(modify=modified)

    def test_unknown_baseline_and_extra_edits_denied(self):
        with self.assertRaisesRegex(audit.Hold, "BASELINE_TEXT_MISMATCH"):
            self.checked(BASE + "// extra")
        def add_unapproved_change(d):
            d["stage2_source"] += "// unauthorized"
            d["stage2_sha256"] = audit.sha(d["stage2_source"])
        with self.assertRaises(audit.Hold):
            self.checked(modify=add_unapproved_change)

    @unittest.skipUnless(shutil.which("node"), "Node.js parser required")
    def test_reviewed_repair_syntax_is_valid_but_not_run(self):
        first, second = self.checked()
        for candidate in (first, second):
            result = subprocess.run(["node", "--input-type=module", "--check"],
                                    input=candidate, text=True,
                                    capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 0, "syntax-only HOLD")


if __name__ == "__main__":
    unittest.main()
