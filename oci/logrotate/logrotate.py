#!/usr/bin/env python3
import os
import string
import sys

import notify

# One logrotate run of /logs/*.log (FMS_LOG_DIR), then exit with the result. The `scheduler` service
# (oci/scheduler/scheduler.py) starts it every day at FMS_JOBS_TIME, after the other jobs.
# Kubernetes needs no such job: the cluster rotates the container logs.
# The frequency directive (FMS_LOGROTATE_FREQUENCY) decides whether a file rotates on a given day.
#   fms-logrotate now    run once and exit (`now` is the only mode, the argument is optional)
TEMPLATE = "/etc/fms-logrotate/logrotate.conf.template"
CONFIG = "/etc/fms-logrotate/logrotate.conf"
# In the log directory, so the rotation period stays correct after `down` and `--force-recreate`.
# The name does not end in .log, so logrotate does not rotate it.
STATE = "/logs/logrotate.state"
keep = os.environ.get("FMS_LOGROTATE_KEEP") or "8"
frequency = os.environ.get("FMS_LOGROTATE_FREQUENCY") or "weekly"

# The script runs once a day, so a period shorter than a day has no effect. logrotate only
# warns about an unknown directive and then rotates at each run, so check the value here.
# Fall back to weekly instead of exiting, so the logs still rotate.
if frequency not in ("daily", "weekly", "monthly", "yearly"):
    message = f"FMS_LOGROTATE_FREQUENCY must be daily, weekly, monthly or yearly, not '{frequency}'."
    print(f"{message} Using weekly.", file=sys.stderr, flush=True)
    notify.send_alert("Log rotation misconfigured", f"{message}\nThe service rotates weekly until you fix .env and run podman-compose up -d --force-recreate scheduler.")
    frequency = "weekly"

with open(TEMPLATE) as template:
    config = string.Template(template.read()).substitute(FMS_LOGROTATE_FREQUENCY=frequency, FMS_LOGROTATE_KEEP=keep)
with open(CONFIG, "w") as out:
    _ = out.write(config)


def run_and_alert() -> bool:
    returncode, tail = notify.run_tail(["logrotate", "-s", STATE, CONFIG])
    if returncode != 0:
        print("logrotate failed", file=sys.stderr, flush=True)
        notify.send_alert(
            "Log rotation failed",
            f"logrotate exited with code {returncode}.\n\nLast output:\n{tail}\n"
            + "The log is scheduler.log in FMS_LOG_DIR (podman-compose logs scheduler).",
        )
        return False
    print("logrotate finished", flush=True)
    return True


sys.exit(0 if run_and_alert() else 1)
