"""Pure offline safety regression. NEVER called to certify real local inference."""
import unittest
from local_ollama_real_probe import Hold, independent_qa, safe_clamp_ast

VALID = """def clamp(value, low, high):
    if low > high:
        raise ValueError('invalid bounds')
    return min(high, max(low, value))
"""

class LocalOllamaProbeOfflineTests(unittest.TestCase):
    def test_fixture_success_is_only_synthetic(self):
        self.assertEqual(independent_qa(VALID), 8)

    def test_broken_clamp_fails_independent_qa(self):
        with self.assertRaisesRegex(Hold, "INDEPENDENT_QA"):
            independent_qa("def clamp(value, low, high):\n    return value\n")

    def test_import_and_os_call_blocked(self):
        for source in (
            "import os\n" + VALID,
            "def clamp(value, low, high):\n    return __import__('os')\n",
            "def clamp(value, low, high):\n    return value.__class__\n",
            "def clamp(value, low, high):\n    return open('/etc/passwd')\n",
            "def clamp(value, low, high):\n    while True: pass\n",
        ):
            with self.subTest(source=source):
                with self.assertRaises(Hold):
                    safe_clamp_ast(source)

    def test_wrong_signature_is_blocked(self):
        for source in ("def clamp(*args): return 1\n",
                       "def clamp(value, low, high, extra=0): return 1\n",
                       "def clamp(value, low, high): return 1\n\ndef other(): pass"):
            with self.subTest(source=source):
                with self.assertRaises(Hold):
                    safe_clamp_ast(source)


if __name__ == "__main__":
    unittest.main()
