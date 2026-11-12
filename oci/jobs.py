#!/usr/bin/env python3
# Run one daily job of the stack in a fresh `jobs` container. Host cron calls it, one crontab line
# per job (DEPLOYMENT.md, "Daily jobs"):
#   jobs.py report
# Python 3.9 compatible: the Rocky 9 system python3 runs it.
import argparse
import subprocess
import sys
from datetime import datetime

import hostenv

# The job name of the crontab line -> the command in the `jobs` image.
JOBS = {
    "report": "fms-report",
}


def log(message: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run one daily job of the FreezeMan stack in a `jobs` container.")
    _ = parser.add_argument("job", choices=sorted(JOBS))
    # `choices` makes it one of the JOBS keys.
    job = str(parser.parse_args().job)

    hostenv.setup()
    # `run` refuses a service of a profile that is not active.
    command = ["podman-compose", "--profile", "jobs", "run", "--rm", "jobs", JOBS[job]]
    log(f"{job}: start")
    try:
        returncode = subprocess.run(command).returncode
    except OSError as error:
        print(f"FAILED: {job}: {' '.join(command)} did not start: {error}", file=sys.stderr, flush=True)
        return 1
    if returncode != 0:
        print(f"FAILED: {job}: exit code {returncode}", file=sys.stderr, flush=True)
    log(f"{job}: exit code {returncode}")
    return returncode


if __name__ == "__main__":
    sys.exit(main())
