"""Real OpenCode 2 CLI parser smoke, no inference and no account credentials.

Only verifies that a versioned public image starts under our sandbox flags.
"""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

from docker_sandbox import DockerPolicy, SandboxHold, docker_exec


def probe():
    if not shutil.which("docker"):
        raise SandboxHold("DOCKER_NOT_INSTALLED")
    with tempfile.TemporaryDirectory(prefix="free-autonomy-opencode-") as tmp:
        base = Path(tmp)
        clone = base / "disposable"
        clone.mkdir()
        clone.chmod(0o777)
        (clone / ".git").mkdir()
        (clone / ".git").chmod(0o777)
        policy = DockerPolicy(network="none", agent_image="ghcr.io/anomalyco/opencode:2.0.0",
                              memory="2g", cpus="1", pids=64)
        # --help forces a CLI parser response; no prompt or provider request.
        rc, tail = docker_exec(
            policy, clone, agent=True,
            command=["opencode", "run", "--auto", "--model",
                     "opencode/glm-5.3-flash-free", "--help"],
            cidfile=base / "child.cid", timeout=70,
            log=base / "cli.private.log")
        if rc != 0 or not tail.strip():
            raise SandboxHold("OPENCODE_CLI_HELP_FAILED: " + tail[-350:])
        if (base / "child.cid").exists():
            raise SandboxHold("OPENCODE_CONTAINER_ID_NOT_CLEANED")
        # A separate, account-free and fixture-only public model-catalog
        # request. This is not an inference request or an entitlement proof.
        # The main CLI parsing result must remain separate from this signal.
        catalog_status = "HOLD_NOT_CHECKED"
        catalog_rc = None
        model_visible = False
        try:
            listed_policy = DockerPolicy(
                network="bridge", agent_image=policy.agent_image,
                memory="2g", cpus="1", pids=64)
            catalog_rc, _ = docker_exec(
                listed_policy, clone, agent=True,
                command=["opencode", "models", "opencode"],
                cidfile=base / "catalog.cid", timeout=45,
                log=base / "catalog.private.log")
            if catalog_rc == 0:
                from free_model_real_once import MODEL, visible_in_provider_catalog
                model_visible = visible_in_provider_catalog(
                    (base / "catalog.private.log").read_text(encoding="utf-8"), MODEL)
                catalog_status = ("VISIBLE_METADATA_ONLY" if model_visible
                                  else "MODEL_NOT_VISIBLE_WITHOUT_AUTH")
            else:
                catalog_status = "PROVIDER_CATALOG_EXIT_NONZERO"
        except (OSError, SandboxHold, ValueError):
            catalog_status = "PROVIDER_CATALOG_CHECK_FAILED"
        return {
            "schema": "free-autonomy-opencode2-real-cli-no-llm-v1",
            "status": "REAL_OPENCODE_CLI_START_ONLY",
            "image": policy.agent_image,
            "network": "none",
            "docker_process_return_code": rc,
            "help_response_seen": True,
            "signed_out_model_catalog_status": catalog_status,
            "signed_out_model_catalog_return_code": catalog_rc,
            "requested_free_model_listed_metadata_only": model_visible,
            "opencode_model_inference_calls": 0,
            "windows_verified": False,
            "long_autonomy_verified": False,
            "project_quality_verified": False,
        }


if __name__ == "__main__":
    try:
        print(json.dumps(probe(), sort_keys=True, indent=2))
    except (OSError, ValueError, SandboxHold, subprocess.SubprocessError) as exc:
        print(json.dumps({"status": "HOLD", "reason": str(exc)[-500:]}))
        raise SystemExit(2)
