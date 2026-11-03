#!/usr/bin/env python3
import os
import re
import sys

import notify

# Runs the three daily jobs of the stack with supercronic (a cron that runs as a normal user, keeps
# the container environment and writes to stdout). Each job is a one-shot command, so a Kubernetes
# CronJob can call the same command.
# FMS_<JOB>_TIME is HH:MM in the container time zone (TZ). supercronic reads TZ too.
# Each job runs only if its time is set.
CRONTAB = "/tmp/crontab"
JOBS = (
    ("FMS_REPORT_TIME", "fms-report"),
    ("FMS_BACKUP_TIME", "fms-backup"),
    ("FMS_LOGROTATE_TIME", "fms-logrotate"),
)

# A job with no time (unset or empty variable) is off: it gets no crontab line.
lines: list[str] = []
errors: list[str] = []
for variable, command in JOBS:
    value = (os.environ.get(variable) or "").strip()
    if not value:
        print(f"{variable} is not set: {command} is off.", flush=True)
        continue
    match = re.fullmatch(r"([01]?\d|2[0-3]):([0-5]\d)", value)
    if match is None:
        errors.append(f"{variable} must be HH:MM (00:00 to 23:59), not '{value}'.")
        continue
    lines.append(f"{int(match[2])} {int(match[1])} * * * {command} now")

# Every job is off on purpose: stop with exit code 0 (compose does not restart the service). No alert: nothing is wrong.
if not lines and not errors:
    print("No job has a time (FMS_REPORT_TIME, FMS_BACKUP_TIME, FMS_LOGROTATE_TIME). Nothing to schedule: stopping.", flush=True)
    sys.exit(0)

if errors:
    message = "\n".join(errors)
    print(message, file=sys.stderr, flush=True)
    notify.send_alert("Scheduler misconfigured", f"{message}\nThe scheduler did not start. Fix .env and run podman-compose up -d --force-recreate scheduler.")
    sys.exit(1)

with open(CRONTAB, "w") as out:
    _ = out.write("\n".join(lines) + "\n")
print("Schedule (TZ=" + os.environ.get("TZ", "UTC") + "):", flush=True)
for line in lines:
    print(f"  {line}", flush=True)

# supercronic becomes the main process of the container. -passthrough-logs prints the output of the
# jobs as it is, so scheduler.log looks like the logs of the old services.
os.execvp("supercronic", ["supercronic", "-passthrough-logs", CRONTAB])
