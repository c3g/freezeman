#!/usr/bin/env python3
import os
import string
import sys
import time
from datetime import datetime, timedelta

import notify

# Daily logrotate of /logs/*.log (FMS_LOG_DIR). Replaces a host cron entry, so the job works the
# same under podman-compose. Kubernetes needs no such job: the cluster rotates the container logs.
# The frequency directive (FMS_LOGROTATE_FREQUENCY) decides whether a file rotates on a given day.
#   fms-logrotate        run every day at FMS_LOGROTATE_TIME (HH:MM in TZ)
#   fms-logrotate now    run once and exit
TEMPLATE = "/etc/fms-logrotate/logrotate.conf.template"
CONFIG = "/etc/fms-logrotate/logrotate.conf"
# In the log directory, so the rotation period stays correct after `down` and `--force-recreate`.
# The name does not end in .log, so logrotate does not rotate it.
STATE = "/logs/logrotate.state"
rotate_time = os.environ.get("FMS_LOGROTATE_TIME") or "03:00"
keep = os.environ.get("FMS_LOGROTATE_KEEP") or "8"
frequency = os.environ.get("FMS_LOGROTATE_FREQUENCY") or "weekly"

# The script runs once a day, so a period shorter than a day has no effect. logrotate only
# warns about an unknown directive and then rotates at each run, so check the value here.
# Fall back to weekly instead of exiting: an exit makes `restart: always` loop and repeat the alert.
if frequency not in ("daily", "weekly", "monthly", "yearly"):
    message = f"FMS_LOGROTATE_FREQUENCY must be daily, weekly, monthly or yearly, not '{frequency}'."
    print(f"{message} Using weekly.", file=sys.stderr, flush=True)
    notify.send_alert("Log rotation misconfigured", f"{message}\nThe service rotates weekly until you fix .env and run podman-compose up -d --force-recreate logrotate.")
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
            + "The log is logrotate.log in FMS_LOG_DIR (podman-compose logs logrotate).",
        )
        return False
    print("logrotate finished", flush=True)
    return True


def next_run(hhmm: str) -> tuple[datetime, datetime]:
    hour, minute = map(int, hhmm.split(":"))
    now = datetime.now()
    run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if run <= now:
        run += timedelta(days=1)
    # astimezone() attaches the local zone, so the wait is right across a DST change.
    return now.astimezone(), run.astimezone()


if len(sys.argv) > 1 and sys.argv[1] == "now":
    sys.exit(0 if run_and_alert() else 1)

while True:
    now, run = next_run(rotate_time)
    print(f"Next logrotate run: {run:%Y-%m-%d %H:%M:%S %Z}", flush=True)
    time.sleep((run - now).total_seconds())
    _ = run_and_alert()
