"""Genuine Docker smoke test on an ephemeral Linux CI runner.

No model, OpenCode, credentials, or user project data is used. This is not
Windows validation or a long-running AI-development certification.
"""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

from docker_sandbox import DockerPolicy, SandboxHold, docker_exec
from docker_sandbox_verified import docker_exec as docker_exec_verified


def run_probe():
    if shutil.which("docker") is None:
        raise SandboxHold("REAL_DOCKER_BINARY_UNAVAILABLE")
    server = subprocess.run(
        ["docker", "version", "--format", "{{.Server.Version}}"],
        capture_output=True, text=True, timeout=15, check=True).stdout.strip()
    policy = DockerPolicy(network="none", qa_image="node:22-bookworm-slim",
                          memory="2g", cpus="1", pids=64)
    with tempfile.TemporaryDirectory(prefix="free-autonomy-real-docker-") as tmp:
        base = Path(tmp)
        workspace = base / "disposable"
        workspace.mkdir()
        workspace.chmod(0o777)
        git_dir = workspace / ".git"
        git_dir.mkdir()
        git_dir.chmod(0o777)
        (workspace / "sentinel.txt").write_text("EPHEMERAL_ONLY")
        js = r"""
const fs = require('node:fs');
const assert = require('node:assert/strict');
function denied(path) {
  try { fs.writeFileSync(path, 'NO'); return false; }
  catch (err) { return ['EROFS','EACCES','EPERM'].includes(err.code); }
}
assert.equal(fs.readFileSync('/work/sentinel.txt','utf8'), 'EPHEMERAL_ONLY');
assert.equal(denied('/work/.git/unauthorized'), true);
assert.equal(denied('/etc/unapproved-file'), true);
assert.equal(fs.existsSync('/var/run/docker.sock'), false);
assert.deepEqual(fs.readdirSync('/sys/class/net').sort(), ['lo']);
fs.writeFileSync('/work/created.txt','REAL_DOCKER_SMOKE');
console.log('REAL_DOCKER_PROTECTIONS_PASS');
"""
        rc, tail = docker_exec(
            policy, workspace, agent=False, command=["node", "-e", js],
            cidfile=base / "probe.cid", timeout=60,
            log=base / "probe.private.log")
        if rc != 0 or "REAL_DOCKER_PROTECTIONS_PASS" not in tail:
            raise SandboxHold("REAL_CONTAINER_PROBE_FAILED: " + tail[-500:])
        if (workspace / "created.txt").read_text() != "REAL_DOCKER_SMOKE":
            raise SandboxHold("CONTAINER_WRITE_NOT_OBSERVED")
        if (git_dir / "unauthorized").exists():
            raise SandboxHold("GIT_METADATA_WAS_MODIFIED")
        rc, _ = docker_exec(
            policy, workspace, agent=False,
            command=["node", "-e", "setInterval(() => {}, 1000)"],
            cidfile=base / "timeout.cid", timeout=2,
            log=base / "timeout.private.log")
        if rc != 124 or (base / "timeout.cid").exists():
            raise SandboxHold("TIMED_OUT_CONTAINER_NOT_CLEANED")
        # Execute the December-only NEW cleanup boundary against real Linux
        # Docker on a disposable runner. Existing SHA-pinned Windows source
        # and prior 2-container smoke remain unchanged.
        verified_id = base / "verified.cid"
        verified_rc, verified_tail = docker_exec_verified(
            policy, workspace, agent=False,
            command=["node", "-e", "console.log('DEC_VERIFIED_OWNED_CLEANUP_REAL_DOCKER')"],
            cidfile=verified_id, timeout=60,
            log=base / "verified.private.log")
        if verified_rc != 0 or "DEC_VERIFIED_OWNED_CLEANUP_REAL_DOCKER" not in verified_tail:
            raise SandboxHold("DEC_VERIFIED_OWNED_CONTAINER_RUN_FAILED")
        if verified_id.exists():
            raise SandboxHold("DEC_VERIFIED_OWNED_CONTAINER_ID_NOT_RELEASED")
        return {
            "schema": "free-autonomy-docker-native-linux-smoke-v1",
            "status": "REAL_DOCKER_LINUX_SMOKE_ONLY",
            "docker_server": server,
            "container_invocations": 3,
            "dec_verified_owned_docker_cleanup_real_linux": True,
            "root_filesystem_read_only": True,
            "git_metadata_read_only": True,
            "container_workspace_write": True,
            "docker_socket_absent": True,
            "network_none": True,
            "timeout_observed_and_cidfile_removed": True,
            "opencode_invocations": 0,
            "real_llm_invocations": 0,
            "windows_verified": False,
            "autonomous_development_verified": False,
        }


if __name__ == "__main__":
    try:
        print(json.dumps(run_probe(), sort_keys=True, indent=2))
    except (OSError, ValueError, SandboxHold, subprocess.SubprocessError) as ex:
        print(json.dumps({"status": "HOLD", "reason": str(ex)[-700:]}))
        raise SystemExit(2)
