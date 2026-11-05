"""Fail-closed Docker execution boundary for the single-project research pilot.

This is not proof of actual Windows/Docker isolation. Until genuine host trials pass,
all results must retain the OFFLINE/FIXTURE_ONLY or HOLD labels.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import re
import subprocess


class SandboxHold(RuntimeError):
    pass


# Known images only. Operators can pin them by immutable digest later.
# OpenCode 2 docs describe versioned ghcr.io/anomalyco/opencode tags.
IMAGE_PATTERN = re.compile(r"(?:ghcr\.io/anomalyco/opencode:[0-9]+\.[0-9]+\.[0-9]+|node:22-bookworm-slim)(?:@sha256:[0-9a-f]{64})?\Z")


@dataclass(frozen=True)
class DockerPolicy:
    agent_image: str = "ghcr.io/anomalyco/opencode:2.0.0"
    qa_image: str = "node:22-bookworm-slim"
    network: str = "none"  # Explicit bridge only for genuine online/local-model trial
    memory: str = "6g"
    cpus: str = "2"
    pids: int = 128

    @classmethod
    def from_config(cls, cfg: dict) -> "DockerPolicy":
        options = cfg.get("docker", {})
        if not isinstance(options, dict) or set(options) - {"agent_image", "qa_image", "network", "memory", "cpus", "pids"}:
            raise SandboxHold("BAD_DOCKER_OPTIONS")
        policy = cls(**options)
        if not isinstance(policy.agent_image, str) or not isinstance(policy.qa_image, str) or not IMAGE_PATTERN.fullmatch(policy.agent_image) or not IMAGE_PATTERN.fullmatch(policy.qa_image):
            raise SandboxHold("IMAGE_NOT_APPROVED_OR_NOT_PINNED")
        if not isinstance(policy.network, str) or policy.network not in {"none", "bridge"}:
            raise SandboxHold("NETWORK_NOT_APPROVED")
        if policy.network == "bridge" and cfg.get("network_access_approved") is not True:
            raise SandboxHold("NETWORK_REQUIRES_EXPLICIT_APPROVAL")
        if not isinstance(policy.memory, str) or not isinstance(policy.cpus, str) or policy.memory not in {"2g", "4g", "6g", "8g", "12g"} or policy.cpus not in {"1", "2", "3", "4"} or type(policy.pids) is not int or not (32 <= policy.pids <= 256):
            raise SandboxHold("RESOURCE_BUDGET_INVALID")
        return policy


def docker_argv(policy: DockerPolicy, workspace: Path, *, agent: bool, command: list[str], cidfile: Path) -> list[str]:
    """No Docker socket or host credentials; QA network is always disabled."""
    if not workspace.is_absolute() or not (workspace / ".git").is_dir():
        raise SandboxHold("DEDICATED_CLONE_REQUIRED")
    if not command or not all(isinstance(x, str) and x and '\0' not in x for x in command):
        raise SandboxHold("INVALID_CHILD_COMMAND")
    # Read-only provider-model catalog check: exact args only, no generated
    # code, model request, login action or credential transfer. All other
    # agent commands still require the existing explicit model run syntax.
    catalog_only = agent and command == ["opencode", "models", "opencode"]
    if agent:
        if not catalog_only and (command[0] != "opencode" or command[1:3] != ["run", "--auto"]):
            raise SandboxHold("AGENT_MUST_USE_OPENCODE_RUN_AUTO")
    elif command[0] not in {"node", "npm", "python3"}:
        raise SandboxHold("QA_EXECUTABLE_NOT_ALLOWLISTED")
    image = policy.agent_image if agent else policy.qa_image
    if agent and image.startswith("node:"):
        raise SandboxHold("AGENT_IMAGE_MUST_BE_OPENCODE")
    model = None
    if agent and not catalog_only:
        try:
            model = command[command.index("--model") + 1]
        except (ValueError, IndexError) as exc:
            raise SandboxHold("AGENT_MODEL_NOT_EXPLICIT") from exc
    config = None
    if model:
        config = {"model": model, "small_model": model}
        if model.startswith("ollama/"):
            if policy.network != "bridge":
                raise SandboxHold("OLLAMA_REQUIRES_APPROVED_BRIDGE_NETWORK")
            config["providers"] = {"ollama": {"settings": {"baseURL": "http://host.docker.internal:11434/v1"}}}
    base = ["docker", "run", "--rm", "--init", "--read-only", "--cap-drop=ALL",
            "--security-opt=no-new-privileges", "--pids-limit", str(policy.pids),
            "--memory", policy.memory, "--cpus", policy.cpus,
            "--network", (policy.network if agent else "none"), "--user", "1000:1000",
            "--tmpfs", "/tmp:rw,nosuid,noexec,size=256m",
            "--tmpfs", "/home/agent:rw,nosuid,size=512m",
            "--workdir", "/work", "--env", "HOME=/home/agent",
            "--env", "XDG_CONFIG_HOME=/home/agent/.config",
            "--env", "XDG_DATA_HOME=/home/agent/.local/share",
            "--env", "GIT_TERMINAL_PROMPT=0",
            "--cidfile", str(cidfile),
            "--mount", f"type=bind,src={workspace},dst=/work",
            # Protect Git metadata *inside* the writer's own container.
            "--mount", f"type=bind,src={workspace / '.git'},dst=/work/.git,readonly",
            ]
    if config is not None:
        base += ["--env", "OPENCODE_CONFIG_CONTENT=" + json.dumps(config, separators=(",", ":"))]
    base += ["--entrypoint", command[0], image, *command[1:]]
    return base


def docker_preflight(policy: DockerPolicy) -> dict:
    """Checks daemon and already-present images, never installs, pulls or bills."""
    try:
        version = subprocess.run(["docker", "version", "--format", "{{.Server.Version}}"],
                                 capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise SandboxHold("DOCKER_DAEMON_UNAVAILABLE") from exc
    if version.returncode or not version.stdout.strip():
        raise SandboxHold("DOCKER_DAEMON_UNAVAILABLE")
    for image in (policy.agent_image, policy.qa_image):
        try:
            result = subprocess.run(["docker", "image", "inspect", image],
                                    capture_output=True, text=True, timeout=15)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise SandboxHold("IMAGE_CHECK_FAILED") from exc
        if result.returncode:
            raise SandboxHold("IMAGE_NOT_PRESENT_LOCALLY: " + image)
    return {"docker_server": version.stdout.strip(), "images_present": True,
            "container_execution_verified": False, "real_model_verified": False}


def docker_exec(policy: DockerPolicy, workspace: Path, *, agent: bool,
                command: list[str], cidfile: Path, timeout: int, log: Path) -> tuple[int, str]:
    """Supervise docker CLI; force-remove container even if CLI times out.

    The cidfile is a private host-side path outside the clone. Never rely on
    killing the Docker client alone to stop a detached child container.
    """
    if cidfile.exists():
        raise SandboxHold("STALE_CONTAINER_ID_FILE")
    argv = docker_argv(policy, workspace, agent=agent, command=command, cidfile=cidfile)
    try:
        proc = subprocess.run(argv, capture_output=True, text=True, timeout=timeout,
                              encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL)
        rc = proc.returncode
        output = proc.stdout + "\n" + proc.stderr
    except subprocess.TimeoutExpired as exc:
        rc = 124
        def as_text(value):
            return value.decode("utf-8", errors="replace") if isinstance(value, bytes) else (value or "")
        output = as_text(exc.stdout) + "\n" + as_text(exc.stderr)
    except OSError as exc:
        raise SandboxHold("DOCKER_EXEC_UNAVAILABLE") from exc
    finally:
        if cidfile.is_file():
            container_id = cidfile.read_text(encoding="ascii", errors="replace").strip()
            if re.fullmatch(r"[0-9a-f]{12,64}", container_id):
                # --rm already clears normally; rm -f handles orphaned timeout.
                subprocess.run(["docker", "rm", "-f", container_id],
                               capture_output=True, timeout=25, check=False)
            cidfile.unlink(missing_ok=True)
    log.write_text(str(output)[-150000:], encoding="utf-8")
    return rc, str(output)[-3500:]
