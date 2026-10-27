#!/usr/bin/env python3
# Start the stack. Run it from cron: `@reboot /data/freezeman/oci/start.py` (README.md).
# Python 3.9 compatible: the Rocky 9 system python3 runs it.
# Send an alert email if `podman-compose up -d` fails or if a container is in a wrong state after CHECK_DELAY.
import json
import subprocess
import sys
import time
import traceback
from typing import TypedDict, cast

import hostenv
import notify

CHECK_DELAY = 60
PROJECT = "freezeman"
# One-shot services: they must exit with 0. The other services must run.
ONE_SHOT = ("migrate", "assets")


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
    settings: dict[str, str] = {}
    try:
        hostenv.setup()
        settings = hostenv.settings()
        returncode, tail = notify.run_tail(["podman-compose", "up", "-d"])
        if returncode != 0:
            notify.send_alert("start.py failed", f"`podman-compose up -d` exited with code {returncode}.\n\nLast output:\n{tail}", settings)
            return returncode
        time.sleep(CHECK_DELAY)
        failed = failed_containers()
        if failed:
            notify.send_alert("start.py: containers failed", f"After {CHECK_DELAY} s these containers are not in the expected state:\n\n" + "\n".join(failed), settings)
            return 1
    except Exception:
        print(traceback.format_exc(), file=sys.stderr, flush=True)
        notify.send_alert("start.py failed", traceback.format_exc(), settings)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
