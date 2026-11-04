"""Small offline contract for one exact GitHub Actions result, not model QA."""
import unittest

from verify_public_research_qa import Hold, choose_exact_run, observe, run_url, verdict

SHA = "a" * 40
BRANCH = "research/dec-free-autonomy-solo-pilot-20261104"
PATH = ".github/workflows/dec-free-autonomy-public-source-handoff.yml@refs/heads/" + BRANCH


def run(*, sha=SHA, branch=BRANCH, event="push", path=PATH,
        ident=100, status="completed", conclusion="success"):
    return {"head_sha": sha, "head_branch": branch, "event": event,
            "path": path, "id": ident, "status": status, "conclusion": conclusion}


class ExactPublicSourceQAWorkflowTest(unittest.TestCase):
    def test_rejects_invalid_commit_without_network(self):
        for invalid in ("main", "A" * 40, "a" * 39, "a" * 40 + "/foo"):
            with self.assertRaises(Hold):
                run_url(invalid)

    def test_success_requires_exact_sha_branch_event_and_workflow(self):
        mismatches = [
            run(sha="b" * 40),
            run(branch="main"),
            run(event="workflow_dispatch"),
            run(path=".github/workflows/another.yml@refs/heads/" + BRANCH),
            run(path=None),
            run(ident=True),
        ]
        self.assertIsNone(choose_exact_run({"workflow_runs": mismatches}, SHA))
        selected = choose_exact_run({"workflow_runs": mismatches + [run()]}, SHA)
        self.assertEqual(selected["id"], 100)
        self.assertEqual(verdict(selected),
                         "EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY")

    def test_failed_or_running_never_passes(self):
        self.assertEqual(verdict(run(status="in_progress", conclusion=None)),
                         "WAITING_FOR_EXACT_HANDOFF_WORKFLOW")
        for conclusion in ("failure", "cancelled", "timed_out", None):
            self.assertTrue(verdict(run(conclusion=conclusion)).startswith("HOLD_"))

    def test_latest_run_same_sha_takes_precedence_over_old_success(self):
        payload = {"workflow_runs": [
            run(ident=100, conclusion="success"),
            run(ident=105, status="in_progress", conclusion=None),
        ]}
        self.assertEqual(choose_exact_run(payload, SHA)["id"], 105)
        self.assertEqual(verdict(choose_exact_run(payload, SHA)),
                         "WAITING_FOR_EXACT_HANDOFF_WORKFLOW")

    def test_no_matching_run_holds_at_zero_budget(self):
        result = observe(SHA, wait_seconds=0, fetcher=lambda url: {"workflow_runs": []})
        self.assertEqual(result["status"],
                         "HOLD_EXACT_GITHUB_SOURCE_QA_NOT_COMPLETED_WITHIN_BUDGET")
        self.assertEqual(result["git_pushes_by_verifier"], 0)
        self.assertFalse(result["model_identity_attested"])

    def test_exact_success_requires_no_art_or_model_certification(self):
        result = observe(SHA, wait_seconds=0,
                         fetcher=lambda url: {"workflow_runs": [run()]})
        self.assertEqual(result["github_run_id"], 100)
        self.assertEqual(result["status"], "EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY")
        self.assertFalse(result["source_artifact_contents_inspected"])
        self.assertFalse(result["real_project_feature_improvement_certified"])
        self.assertFalse(result["long_unattended_autonomy_certified"])

    def test_network_errors_hold_without_fabricating_success(self):
        def fail(url):
            raise OSError("offline")
        result = observe(SHA, wait_seconds=0, fetcher=fail)
        self.assertEqual(result["status"], "HOLD_GITHUB_WORKFLOW_READ_UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
