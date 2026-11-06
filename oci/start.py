#!/usr/bin/env python3
# Start the stack. Run it from cron: `@reboot <install-dir>/oci/start.py` (DEPLOYMENT.md).
# Python 3.9 compatible: the Rocky 9 system python3 runs it.
# Log a failure if `podman-compose up -d` fails or if a container is in a wrong state after CHECK_DELAY.
import json
import subprocess
import sys
import time
import traceback
from typing import TypedDict, cast

import hostenv

CHECK_DELAY = 60
PROJECT = "freezeman"
# Services that may be stopped: they must not exit with an error.
# `scheduler` exits with 0 when no job has a time (all jobs off on purpose), and nothing restarts it.
# The other services must run.
ONE_SHOT = ("scheduler",)


# The fields of `podman ps --format json` that failed_containers() reads.
class Container(TypedDict, total=False):
    Labels: dict[str, str]
    State: str
    ExitCode: int


def failed_containers() -> list[str]:
    output = subprocess.run(
        ["podman", "ps", "-a", "--filter", f"label=com.docker.compose.project={PROJECT}", "--format", "json"],
        check=True, capture_output=True, text=True,
    ).stdout
    failed: list[str] = []
    containers = cast("list[Container]", json.loads(output or "[]"))
    for container in containers:
        labels = container.get("Labels") or {}
        service = labels.get("com.docker.compose.service", "?")
        state = container.get("State", "?")
        exit_code = container.get("ExitCode", 0)
        if service in ONE_SHOT:
            if exit_code != 0:
                failed.append(f"{service}: state {state}, exit code {exit_code}")
        elif state != "running":
            failed.append(f"{service}: state {state}, exit code {exit_code}")
    return failed


def main() -> int:
    try:
        hostenv.setup()
        returncode = subprocess.run(["podman-compose", "up", "-d"]).returncode
        if returncode != 0:
            print(f"FAILED: `podman-compose up -d` exited with code {returncode}.", file=sys.stderr, flush=True)
            return returncode
        time.sleep(CHECK_DELAY)
        failed = failed_containers()
        if failed:
            print(f"FAILED: after {CHECK_DELAY} s these containers are not in the expected state:\n" + "\n".join(failed), file=sys.stderr, flush=True)
            return 1
    except Exception:
        print(f"FAILED: start.py\n{traceback.format_exc()}", file=sys.stderr, flush=True)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
