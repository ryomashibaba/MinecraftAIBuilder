"""Fail-closed owned-container lifecycle for the December solo agent only.

The legacy SHA-pinned Windows source/QA launchers continue using the original
docker_sandbox.py. This module does not alter their immutable source contract.
Offline tests are not evidence of a real Windows Docker or model run.
"""
from __future__ import annotations

from pathlib import Path
import re
import subprocess
import time

from docker_sandbox import DockerPolicy, SandboxHold, docker_argv


def confirm_owned_docker_removed(cidfile: Path) -> None:
    """Never discard an ownership receipt until Docker proves the ID is absent."""
    if not cidfile.is_file():
        raise SandboxHold("OWNED_DOCKER_ID_UNAVAILABLE")
    try:
        container_id = cidfile.read_text(encoding="ascii").strip()
    except (OSError, UnicodeError) as exc:
        raise SandboxHold("OWNED_DOCKER_ID_UNREADABLE") from exc
    if not re.fullmatch(r"[0-9a-f]{64}", container_id):
        raise SandboxHold("OWNED_DOCKER_ID_INVALID")
    try:
        # Only the exact ID written by this docker run is targeted.
        # --rm may have already removed it; rm's return code is insufficient.
        subprocess.run(["docker", "rm", "-f", container_id],
                       capture_output=True, timeout=25, check=False)
        for attempt in range(3):
            check = subprocess.run(
                ["docker", "container", "inspect", container_id],
                capture_output=True, text=True, encoding="utf-8",
                errors="replace", timeout=15, check=False,
            )
            if check.returncode != 0:
                message = check.stdout + "\n" + check.stderr
                if re.search(
                    r"(?im)^\s*(?:Error(?: response from daemon)?:\s*)?No such (?:object|container):",
                    message,
                ):
                    cidfile.unlink()
                    return
                raise SandboxHold("OWNED_DOCKER_INSPECT_UNAVAILABLE")
            if attempt < 2:
                time.sleep(0.2)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise SandboxHold("OWNED_DOCKER_CLEANUP_UNAVAILABLE") from exc
    raise SandboxHold("OWNED_DOCKER_CONTAINER_STILL_PRESENT")


def docker_exec(policy: DockerPolicy, workspace: Path, *, agent: bool,
                command: list[str], cidfile: Path, timeout: int,
                log: Path) -> tuple[int, str]:
    """A new solo-agent boundary, not an override of legacy pinned runners."""
    if cidfile.exists():
        raise SandboxHold("STALE_CONTAINER_ID_FILE")
    argv = docker_argv(policy, workspace, agent=agent,
                       command=command, cidfile=cidfile)
    # This wrapper must never implicitly download images between preflight and run.
    # Keep the legacy SHA-pinned docker_sandbox.py unchanged.
    argv.insert(2, '--pull=never')
    cli_completed_or_timed_out = False
    try:
        proc = subprocess.run(
            argv, capture_output=True, text=True, timeout=timeout,
            encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL,
        )
        rc = proc.returncode
        output = proc.stdout + "\n" + proc.stderr
        cli_completed_or_timed_out = True
    except subprocess.TimeoutExpired as exc:
        rc = 124
        def as_text(value):
            return (value.decode("utf-8", errors="replace")
                    if isinstance(value, bytes) else (value or ""))
        output = as_text(exc.stdout) + "\n" + as_text(exc.stderr)
        cli_completed_or_timed_out = True
    except OSError as exc:
        raise SandboxHold("DOCKER_EXEC_UNAVAILABLE") from exc
    finally:
        if cidfile.is_file():
            # Even a zero-exit agent cannot advance if its container remains.
            confirm_owned_docker_removed(cidfile)
        elif cli_completed_or_timed_out:
            # No ownership proof; do not search/kill containers by name.
            raise SandboxHold("OWNED_DOCKER_ID_UNAVAILABLE")
    log.write_text(str(output)[-150000:], encoding="utf-8")
    return rc, str(output)[-3500:]
