"""Offline bootstrap security checks: no inference or network requests."""
import hashlib
import io
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import RUN_LOCAL_QWEN_TWO_STEP as runner


class FakeDownload(io.BytesIO):
    pass


class BootstrapTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def test_git_blob_integrity_pinned(self):
        body = b"print('safe')\n"
        h = hashlib.sha1(b"blob " + str(len(body)).encode() + b"\0" + body).hexdigest()
        with patch.object(runner, "SOURCE_BLOBS", {"single.py": h}), \
             patch("RUN_LOCAL_QWEN_TWO_STEP.urllib.request.urlopen",
                   return_value=FakeDownload(body)) as fetch:
            runner.pinned_download(self.root / "tools")
        self.assertEqual((self.root / "tools" / "single.py").read_bytes(), body)
        self.assertIn(runner.SOURCE_REVISION, fetch.call_args.args[0])

    def test_source_tampering_blocks_execution(self):
        with patch.object(runner, "SOURCE_BLOBS", {"single.py": "0" * 40}), \
             patch("RUN_LOCAL_QWEN_TWO_STEP.urllib.request.urlopen",
                   return_value=FakeDownload(b"bad")):
            with self.assertRaisesRegex(runner.Hold, "INTEGRITY_MISMATCH"):
                runner.pinned_download(self.root / "tools")

    def test_disposable_fixture_has_two_independent_qa_steps(self):
        runner.create_fixture(self.root / "trial")
        a = self.root / "trial"
        self.assertTrue((a / "source" / "basic.test.mjs").is_file())
        self.assertTrue((a / "source" / "bounds.test.mjs").is_file())
        names = subprocess.check_output(
            ["git", "branch", "--show-current"], cwd=a, text=True).strip()
        self.assertEqual(names, "research/disposable-qwen-proof")
        self.assertIn("return value;", (a / "source" / "calc.mjs").read_text())

if __name__ == "__main__":
    unittest.main()
