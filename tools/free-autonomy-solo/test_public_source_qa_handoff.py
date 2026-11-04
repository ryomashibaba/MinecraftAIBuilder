"""Offline public GitHub handoff tests with genuine disposable Git, NO network/LLM."""
import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from public_qa_handoff_protocol import (
    Hold, make_payload, read_submission, safe_submission_path,
    validate_payload, sha, PRIVACY_ACK
)
from receive_public_research_qa import one_new_submission
from submit_public_research_qa import publish

MAB = ("export const MEZZANINE_SCHEMA = 1;\n"
       "export function compileMezzanineAuthorIntent(x){return x;}\n"
       "export function compileAuthoredPublicMezzanine(x){return x;}\n")
TPS = ("export function sourceCoopEligible(x){return x;}\n"
       "export function b423UseRealSourceWorldReplay(x){return x;}\n"
       "export function sourceCoopNavigationUrl(x){return x;}\n")


def git(root, *args):
    return subprocess.run(["git", "-C", str(root), *args], check=True,
                          text=True, capture_output=True, timeout=20).stdout.strip()


class PublicGitHandoffTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.temp = Path(tmp.name)

    def payload(self, project="minecraftaibuilder"):
        old = MAB if project == "minecraftaibuilder" else TPS
        a = old + "// stage one public-only test\n"
        b = a + "// stage two public-only test\n"
        return make_payload(project, "qwen3:14b", old, a, b, synthetic=True), old

    def test_equal_priority_accepted_with_one_project(self):
        for name in ("minecraftaibuilder", "browser-ink-tps"):
            with self.subTest(project=name):
                payload, old = self.payload(name)
                result = validate_payload(payload, old)
                self.assertEqual(result["project"], name)
                self.assertTrue(result["synthetic_fixture"])
                self.assertFalse("private_token" in result)

    def test_publication_ack_cannot_be_omitted(self):
        payload, old = self.payload()
        payload["privacy_ack"] = ""
        with self.assertRaisesRegex(Hold, "NOT_EXPLICITLY_APPROVED"):
            validate_payload(payload, old)

    def test_any_added_field_is_refused(self):
        payload, old = self.payload()
        payload["shell"] = "curl example.invalid"
        with self.assertRaisesRegex(Hold, "SCHEMA_FIELDS_INVALID"):
            validate_payload(payload, old)

    def test_forged_source_hash_and_pinned_commit_rejected(self):
        payload, old = self.payload()
        for change, reason in (
            ({"stage1_sha256": "a"*64}, "SOURCE_HASH_CHAIN_MISMATCH"),
            ({"source_commit": "0"*40}, "PINNED_COMMIT_MISMATCH"),
            ({"source_blob_sha": "0"*40}, "PINNED_BLOB_MISMATCH"),
        ):
            modified = {**payload, **change}
            with self.subTest(change=change), self.assertRaisesRegex(Hold, reason):
                validate_payload(modified, old)

    def test_no_oversized_source_or_secret_upload(self):
        original = MAB
        for addition in ("sk-" + "A"*32,
                         "-----BEGIN PRIVATE KEY-----",
                         "authorization: " + "x"*30):
            with self.subTest(addition=addition):
                a = original + "// " + addition + "\n"
                b = a + "// stage two\n"
                with self.assertRaises(Hold):
                    make_payload("minecraftaibuilder", "qwen3:14b", original, a,
                                 b, synthetic=False)
        a = original + "x"*16001
        with self.assertRaisesRegex(Hold, "DRAFT_SCOPE_NOT_APPROVED"):
            make_payload("minecraftaibuilder", "qwen3:14b", original, a,
                         a + "y", synthetic=False)

    def test_protected_public_contract_cannot_be_removed(self):
        old = TPS
        first = old.replace("sourceCoopEligible", "DELETED")
        with self.assertRaisesRegex(Hold, "SOURCE_PROTECTED_API_REMOVED"):
            make_payload("browser-ink-tps", "qwen3:14b", old, first,
                         first + "// stage two\n", synthetic=False)

    def test_submission_name_is_exact_uuid_hex_and_one_path(self):
        with self.assertRaises(Hold):
            safe_submission_path("../secrets.json")
        with self.assertRaises(Hold):
            safe_submission_path("tools/free-autonomy-solo/submissions/notes.json")
        path = safe_submission_path(
            "tools/free-autonomy-solo/submissions/" + "a"*32 + ".json")
        self.assertTrue(path.endswith(".json"))

    def test_public_source_payload_reader_rejects_oversized_and_symlink(self):
        p = self.temp / "receipt.json"
        p.write_bytes(b"x"*43000)
        with self.assertRaisesRegex(Hold, "FILE_INVALID"):
            read_submission(p)
        p.write_text('{"payload":"example"}')
        self.assertEqual(read_submission(p), {"payload": "example"})
        link = self.temp / "linked.json"
        try:
            link.symlink_to(p)
        except OSError:
            self.skipTest("Symlinks unavailable on this host")
        with self.assertRaisesRegex(Hold, "FILE_INVALID"):
            read_submission(link)

    def _git_repo(self):
        root = self.temp / "repo"
        root.mkdir(exist_ok=True)
        git(root, "init", "-b", "research/dec-free-autonomy-solo-pilot-20261104")
        git(root, "config", "user.name", "Test")
        git(root, "config", "user.email", "test@example.invalid")
        (root / "README.txt").write_text("baseline\n")
        git(root, "add", "README.txt")
        git(root, "commit", "-m", "baseline")
        return root

    def test_real_git_exactly_one_new_public_json(self):
        root = self._git_repo()
        before = git(root, "rev-parse", "HEAD")
        name = safe_submission_path(
            "tools/free-autonomy-solo/submissions/" + "f"*32 + ".json")
        file = root / name
        file.parent.mkdir(parents=True)
        file.write_text('{"synthetic_fixture":true}\n')
        git(root, "add", name)
        git(root, "commit", "-m", "one new request")
        after = git(root, "rev-parse", "HEAD")
        self.assertEqual(one_new_submission(root, before, after), name)
        with self.assertRaisesRegex(Hold, "CHECKOUT_HEAD_NOT_PUSH_SHA"):
            one_new_submission(root, before, before[::-1])

    def test_rejects_two_files_changed_in_same_push(self):
        root = self._git_repo()
        before = git(root, "rev-parse", "HEAD")
        sub = root / "tools" / "free-autonomy-solo" / "submissions" / ("a"*32 + ".json")
        sub.parent.mkdir(parents=True)
        sub.write_text("{}")
        (root / "README.txt").write_text("changed\n")
        git(root, "add", "-A")
        git(root, "commit", "-m", "unsafe files")
        after = git(root, "rev-parse", "HEAD")
        with self.assertRaisesRegex(Hold, "PUSH_MUST_ADD_EXACTLY_ONE_FILE"):
            one_new_submission(root, before, after)

    def test_rejects_existing_submission_modification(self):
        root = self._git_repo()
        rel = "tools/free-autonomy-solo/submissions/" + "b"*32 + ".json"
        p = root / rel
        p.parent.mkdir(parents=True)
        p.write_text("{}")
        git(root, "add", rel)
        git(root, "commit", "-m", "existing")
        before = git(root, "rev-parse", "HEAD")
        p.write_text('{"changed":true}')
        git(root, "add", rel)
        git(root, "commit", "-m", "modification")
        with self.assertRaisesRegex(Hold, "PUSH_MUST_ADD_EXACTLY_ONE_FILE"):
            one_new_submission(root, before, git(root, "rev-parse", "HEAD"))

    def test_no_publish_without_explicit_flag_or_network(self):
        payload, old = self.payload()
        with patch("submit_public_research_qa.git") as spy:
            with self.assertRaisesRegex(Hold, "NEEDS_EXPLICIT_FLAG"):
                publish(payload, authorize=False)
            spy.assert_not_called()

    def test_submission_status_not_model_attestation(self):
        payload, old = self.payload()
        self.assertTrue(payload["synthetic_fixture"])
        self.assertEqual(payload["model_reported_only"], "qwen3:14b")
        self.assertNotIn("verified_model", payload)
        self.assertEqual(payload["privacy_ack"], PRIVACY_ACK)


if __name__ == "__main__":
    unittest.main()
