#!/usr/bin/env python3
import os
import re
import string
import subprocess
import sys

# One logrotate run of /logs/*.log (HOST_LOG_DIR), then exit with the result. Host cron starts it
# every day through oci/jobs.py, after the other jobs.
# The size directive (FMS_LOGROTATE_SIZE) decides whether a file rotates at a run.
TEMPLATE = "/etc/fms-logrotate/logrotate.conf.template"
CONFIG = "/etc/fms-logrotate/logrotate.conf"
# In the log directory, so logrotate keeps its record of the last rotations after `down` and
# `--force-recreate`. The name does not end in .log, so logrotate does not rotate it.
STATE = "/logs/logrotate.state"
DEFAULT_SIZE = "100M"
# `or` (rather than `.get(name, default)`) covers an empty string, for example `podman run -e VAR=` without compose.
keep = os.environ.get("FMS_LOGROTATE_KEEP") or "8"
size = os.environ.get("FMS_LOGROTATE_SIZE") or DEFAULT_SIZE

# A bad size makes logrotate reject the whole config, so no log rotates. Check the value here and
# fall back to the default instead of exiting, so the logs still rotate.
if not re.fullmatch(r"[1-9][0-9]*[kMG]?", size):
    message = f"FMS_LOGROTATE_SIZE must be a number with an optional k, M or G suffix, not '{size}'."
    print(f"FAILED: {message} Using {DEFAULT_SIZE} until you fix .env.", file=sys.stderr, flush=True)
    size = DEFAULT_SIZE

with open(TEMPLATE) as template:
    config = string.Template(template.read()).substitute(FMS_LOGROTATE_SIZE=size, FMS_LOGROTATE_KEEP=keep)
with open(CONFIG, "w") as out:
    _ = out.write(config)


def main() -> int:
    returncode = subprocess.run(["logrotate", "-s", STATE, CONFIG]).returncode
    if returncode != 0:
        print(f"FAILED: logrotate exited with code {returncode}.", file=sys.stderr, flush=True)
        return returncode
    print("logrotate finished", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
