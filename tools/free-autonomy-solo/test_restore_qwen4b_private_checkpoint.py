"""Isolated no-model, no-network tests of encrypted Git checkpoint restoration."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

from restore_qwen4b_private_checkpoint import (
    restore_checkpoint, CheckpointHold, _unpack_strict,
)
_sha = lambda x: hashlib.sha256(x).hexdigest()

SOURCE = "source/ai/fixture_ir.mjs"


def cmd(*argv, cwd=None):
    p = subprocess.run(argv, cwd=cwd, check=True, capture_output=True, timeout=45,
                       env={**os.environ, "GIT_CONFIG_NOSYSTEM": "1"})
    return p.stdout.strip().decode()


class RestoreCheckpoints(unittest.TestCase):
    def setUp(self):
        self.td = tempfile.TemporaryDirectory()
        self.addCleanup(self.td.cleanup)
        self.root = Path(self.td.name)
        self.baseline = self.root / "pinned-baseline"
        self.baseline.mkdir()
        cmd("git", "init", "-q", "-b", "research/study", cwd=self.baseline)
        cmd("git", "config", "user.name", "Test", cwd=self.baseline)
        cmd("git", "config", "user.email", "test@example.org", cwd=self.baseline)
        (self.baseline / SOURCE).parent.mkdir(parents=True)
        self.raw = "const x = 1;\n"
        (self.baseline / SOURCE).write_text(self.raw, encoding="utf-8")
        cmd("git", "add", ".", cwd=self.baseline)
        cmd("git", "commit", "-q", "-m", "base", cwd=self.baseline)
        self.base_sha = cmd("git", "rev-parse", "HEAD", cwd=self.baseline)
        self.blob_sha = cmd("git", "rev-parse", "HEAD:" + SOURCE, cwd=self.baseline)
        self.work = self.root / "work"
        cmd("git", "clone", "-q", str(self.baseline), str(self.work))
        cmd("git", "config", "user.name", "Test", cwd=self.work)
        cmd("git", "config", "user.email", "test@example.org", cwd=self.work)
        self.hashes=[]
        for j in range(2):
            contents=f"const x = {j+2};\n"
            (self.work / SOURCE).write_text(contents, encoding="utf-8")
            cmd("git", "add", SOURCE, cwd=self.work)
            cmd("git", "commit", "-q", "-m", "model fixture " + str(j), cwd=self.work)
            self.hashes.append(hashlib.sha256(contents.encode()).hexdigest())
        self.final_sha = cmd("git", "rev-parse", "HEAD", cwd=self.work)
        self.bundle = self.root/"src.bundle"
        cmd("git", "bundle", "create", str(self.bundle), "HEAD", "^"+self.base_sha, cwd=self.work)
        cmd("git", "bundle", "verify", str(self.bundle), cwd=self.work)
        self.proof = {
          "schema":"dec-qwen4b-private-encrypted-source-checkpoint-v1",
          "scope":"RESEARCH_ONLY_SOURCE_QA_NOT_ADOPTED",
          "base_public_commit": self.base_sha,
          "final_verified_head": self.final_sha,
          "source_file": SOURCE,
          "accepted_cycles":[{"cycle":1,"source_sha256":self.hashes,"qa_commands":[1,1]}],
          "bundle_sha256":_sha(self.bundle.read_bytes()),
          "game_art_approved": False,
          "model_code_publication_authorized":False,
        }
        self.cert=self.root/"cert.pem"
        self.key=self.root/"key.pem"
        cmd("openssl","req","-x509","-newkey","rsa:2048","-keyout",str(self.key),"-out",str(self.cert),"-nodes","-subj","/CN=FixtureOnly","-days","2")
        self.cms=self.root/"cipher.cms"
        self.archive=self.root/"src.tar.gz"
        self.make_archive(self.proof)
        self.encrypt()
        self.private_root=self.root/"private"
        self.private_root.mkdir()
        self.dest=self.private_root / ("qa-restored-" + self.final_sha[:12] + ".git")

    def make_archive(self, proof, bundle=None):
        entries={"proof.json":json.dumps(proof,sort_keys=True).encode(),
                 "qa-commits.bundle":self.bundle.read_bytes() if bundle is None else bundle}
        with tarfile.open(self.archive,"w:gz") as t:
            for name,data in entries.items():
                v=tarfile.TarInfo(name)
                v.size=len(data)
                t.addfile(v,io.BytesIO(data))

    def encrypt(self):
        cmd("openssl","cms","-encrypt","-aes-256-gcm","-binary","-in",str(self.archive),
            "-outform","DER","-out",str(self.cms),"-recip",str(self.cert))

    def restore(self,**kw):
        return restore_checkpoint(
            kw.get("cms",self.cms), kw.get("sha",_sha(self.cms.read_bytes())),
            self.cert,self.key, kw.get("baseline",self.baseline),
            self.private_root,
            pinned_base=self.base_sha,pinned_blob=self.blob_sha,
            pinned_source=SOURCE)

    def test_true_roundtrip(self):
        report=self.restore()
        self.assertEqual(report["final_commit"],self.final_sha)
        self.assertFalse(report["independent_qa_reexecuted"])
        self.assertEqual(report["private_bare_repo_name"], self.dest.name)
        self.assertNotIn(str(self.private_root), json.dumps(report))
        bare=self.dest
        self.assertTrue(bare.exists())
        self.assertEqual(cmd("git","--git-dir="+str(bare),"rev-parse",
                             "refs/heads/qa-restored-review-only"),self.final_sha)
        self.assertFalse((self.dest/SOURCE).exists())

    def test_two_cycles_four_stages(self):
        for j in range(2, 4):
            content = f"const x = {j+2};\n"
            (self.work / SOURCE).write_text(content, encoding="utf-8")
            cmd("git", "add", SOURCE, cwd=self.work)
            cmd("git", "commit", "-q", "-m", "model fixture " + str(j), cwd=self.work)
            self.hashes.append(hashlib.sha256(content.encode()).hexdigest())
        final_sha = cmd("git", "rev-parse", "HEAD", cwd=self.work)
        cmd("git", "bundle", "create", str(self.bundle), "HEAD", "^"+self.base_sha, cwd=self.work)
        self.proof["final_verified_head"] = final_sha
        self.proof["accepted_cycles"] = [
            {"cycle": 1, "source_sha256": self.hashes[:2], "qa_commands": [1, 1]},
            {"cycle": 2, "source_sha256": self.hashes[2:], "qa_commands": [1, 1]},
        ]
        self.proof["bundle_sha256"] = _sha(self.bundle.read_bytes())
        self.make_archive(self.proof)
        self.encrypt()
        self.dest = self.private_root / ("qa-restored-" + final_sha[:12] + ".git")
        result = self.restore()
        self.assertEqual(result["final_commit"], final_sha)
        self.assertEqual(result["verified_source_stages"], 4)

    def test_cannot_restore_into_baseline(self):
        self.private_root = self.baseline
        with self.assertRaises(CheckpointHold):
            self.restore()
        self.assertFalse(self.dest.exists())

    def test_decrypt_with_wrong_key(self):
        second = self.root / "wrong-private.pem"
        cmd("openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048",
            "-out", str(second))
        result = None
        with self.assertRaises(CheckpointHold):
            restore_checkpoint(self.cms, _sha(self.cms.read_bytes()),
                self.cert, second, self.baseline, self.private_root,
                pinned_base=self.base_sha, pinned_blob=self.blob_sha,
                pinned_source=SOURCE)
        self.assertFalse(self.dest.exists())

    def test_executable_source_mode_rejected(self):
        cmd("git", "update-index", "--chmod=+x", SOURCE, cwd=self.work)
        cmd("git", "commit", "-q", "--amend", "--no-edit", cwd=self.work)
        new_head = cmd("git", "rev-parse", "HEAD", cwd=self.work)
        cmd("git", "bundle", "create", str(self.bundle), "HEAD", "^"+self.base_sha, cwd=self.work)
        self.proof["final_verified_head"] = new_head
        self.proof["bundle_sha256"] = _sha(self.bundle.read_bytes())
        self.make_archive(self.proof)
        self.encrypt()
        with self.assertRaises(CheckpointHold):
            self.restore()
        self.assertFalse(self.private_root.joinpath("qa-restored-" + new_head[:12] + ".git").exists())

    def test_wrong_outer_sha(self):
        with self.assertRaises(CheckpointHold):self.restore(sha="0"*64)
        self.assertFalse(self.dest.exists())

    def test_modified_ciphertext(self):
        b=bytearray(self.cms.read_bytes()); b[-25]^=1;self.cms.write_bytes(b)
        with self.assertRaises(CheckpointHold):self.restore()
        self.assertFalse(self.dest.exists())

    def test_wrong_baseline(self):
        (self.baseline/SOURCE).write_text("bad",encoding="utf-8")
        with self.assertRaises(CheckpointHold):self.restore()
        self.assertFalse(self.dest.exists())

    def test_proof_stage_sha_forged(self):
        self.proof["accepted_cycles"][0]["source_sha256"][0]="0"*64
        self.make_archive(self.proof);self.encrypt()
        with self.assertRaises(CheckpointHold):self.restore()
        self.assertFalse(self.dest.exists())

    def test_bundle_hash_forged(self):
        self.proof["bundle_sha256"]="0"*64
        self.make_archive(self.proof);self.encrypt()
        with self.assertRaises(CheckpointHold):self.restore()
        self.assertFalse(self.dest.exists())

    def test_archive_member_traversal(self):
        buf=io.BytesIO()
        with tarfile.open(fileobj=buf,mode="w:gz") as t:
            payload=b"BAD"
            item=tarfile.TarInfo("../proof.json")
            item.size=len(payload);t.addfile(item,io.BytesIO(payload))
        evil = self.root / "evil.tar.gz"
        evil.write_bytes(buf.getvalue())
        with self.assertRaises(CheckpointHold):_unpack_strict(evil, self.root)

    def test_publication_flag_rejected(self):
        self.proof["model_code_publication_authorized"]=True
        self.make_archive(self.proof);self.encrypt()
        with self.assertRaises(CheckpointHold):self.restore()

    def test_destination_preexisting_rejected(self):
        self.dest.mkdir()
        with self.assertRaises(CheckpointHold):self.restore()

    def test_outside_source_file_rejected(self):
        self.proof["source_file"]="src/danger.mjs"
        self.make_archive(self.proof);self.encrypt()
        with self.assertRaises(CheckpointHold):self.restore()


if __name__=="__main__": unittest.main(verbosity=2)