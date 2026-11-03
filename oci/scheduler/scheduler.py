#!/usr/bin/env python3
import os
import re
import signal
import subprocess
import sys
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import notify

# Runs the three daily jobs of the stack with a small loop: no cron and no crontab file. It sleeps
# until the next job is due, runs the job and plans the next day. Each job is a one-shot command, so
# a Kubernetes CronJob can call the same command.
# FMS_<JOB>_TIME is HH:MM in the container time zone (TZ).
# Each job runs only if its time is set.
JOBS = (
    ("FMS_REPORT_TIME", "fms-report"),
    ("FMS_BACKUP_TIME", "fms-backup"),
    ("FMS_LOGROTATE_TIME", "fms-logrotate"),
)
# Short sleeps follow a change of the system clock.
MAX_SLEEP = 60


def next_run(now: datetime, hour: int, minute: int) -> datetime:
    # fold=0 keeps a time that occurs twice (end of daylight saving time) at its first occurrence.
    candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0, fold=0)
    # Compare timestamps: two datetimes with the same tzinfo compare their wall clocks, not the instants.
    if candidate.timestamp() <= now.timestamp():
        candidate += timedelta(days=1)
    return candidate


# A job with no time (unset or empty variable) is off: it is not in this list.
jobs: list[tuple[str, int, int]] = []
errors: list[str] = []

try:
    tz = ZoneInfo(os.environ.get("TZ") or "UTC")
except (ZoneInfoNotFoundError, ValueError):
    tz = None
    errors.append(f"TZ must be a time zone name (for example America/Montreal), not '{os.environ.get('TZ')}'.")

for variable, command in JOBS:
    value = (os.environ.get(variable) or "").strip()
    if not value:
        print(f"{variable} is not set: {command} is off.", flush=True)
        continue
    match = re.fullmatch(r"([01]?\d|2[0-3]):([0-5]\d)", value)
    if match is None:
        errors.append(f"{variable} must be HH:MM (00:00 to 23:59), not '{value}'.")
        continue
    jobs.append((command, int(match[1]), int(match[2])))

# Every job is off on purpose: stop with exit code 0 (compose does not restart the service). No alert: nothing is wrong.
if not jobs and not errors:
    print("No job has a time (FMS_REPORT_TIME, FMS_BACKUP_TIME, FMS_LOGROTATE_TIME). Nothing to schedule: stopping.", flush=True)
    sys.exit(0)

if errors or tz is None:
    message = "\n".join(errors)
    print(message, file=sys.stderr, flush=True)
    notify.send_alert("Scheduler misconfigured", f"{message}\nThe scheduler did not start. Fix .env and run podman-compose up -d --force-recreate scheduler.")
    sys.exit(1)

# This script is process 1 of the container (the entrypoint execs it), and Python as process 1 ignores
# SIGTERM without a handler. A running job gets SIGTERM and the loop exits when it ends. With no job
# running, exit at once so that `podman-compose stop` does not wait for its timeout.
running: subprocess.Popen[bytes] | None = None
spawning = False
stopping = False


def stop(signum: int, frame: object) -> None:
    global stopping
    stopping = True
    if running is not None:
        if running.poll() is None:
            running.terminate()
    elif not spawning:
        sys.exit(0)


_ = signal.signal(signal.SIGTERM, stop)
_ = signal.signal(signal.SIGINT, stop)

due: dict[str, datetime] = {}
start = datetime.now(tz)
print(f"Schedule (TZ={tz.key}):", flush=True)
for command, hour, minute in jobs:
    due[command] = next_run(start, hour, minute)
    print(f"  {command} at {hour:02d}:{minute:02d}, next run {due[command].isoformat()}", flush=True)

while True:
    # Run the due jobs in time order. A job that starts late runs once, then on the next day.
    for command, hour, minute in sorted(jobs, key=lambda job: due[job[0]].timestamp()):
        if due[command].timestamp() > datetime.now(tz).timestamp():
            continue
        print(f"{command}: start", flush=True)
        # The job writes to the container log. It sends its own failure alert, so do not alert here.
        spawning = True
        try:
            running = subprocess.Popen([command, "now"])
        except OSError as error:
            # The job cannot send its alert if it does not start. Alert here, and keep the other jobs.
            spawning = False
            print(f"{command}: cannot start: {error}", file=sys.stderr, flush=True)
            notify.send_alert("Scheduler job did not start", f"{command} did not start: {error}\nThe image is probably broken. Rebuild the scheduler image.")
            if stopping:
                sys.exit(0)
            due[command] = next_run(datetime.now(tz), hour, minute)
            continue
        spawning = False
        if stopping:
            running.terminate()
        code = running.wait()
        running = None
        print(f"{command}: exit code {code}", flush=True)
        if stopping:
            sys.exit(0)
        due[command] = next_run(datetime.now(tz), hour, minute)

    wait = min(d.timestamp() for d in due.values()) - datetime.now(tz).timestamp()
    time.sleep(min(MAX_SLEEP, max(wait, 0)))
