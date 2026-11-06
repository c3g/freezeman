#!/usr/bin/env python3
import os
import re
import signal
import subprocess
import sys
import time
from datetime import datetime, timedelta
from graphlib import CycleError, TopologicalSorter
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Runs the daily jobs of the stack with a small loop: no cron and no crontab file. It sleeps until
# FMS_JOBS_TIME, runs the enabled jobs one after the other and plans the next day. Each job is a
# one-shot command, so a Kubernetes CronJob can call the same command.
# FMS_JOBS_TIME is HH:MM in the container time zone (TZ). If it is not set, no job runs.
# A job runs only if FMS_<JOB>_ENABLED is True (True or False, default False).
# The jobs run in dependency order. A failed job does not stop the next jobs: each job sends its
# own failure alert.
# name: (command, enable variable, jobs that run before it)
JOBS: dict[str, tuple[str, str, tuple[str, ...]]] = {
    "report": ("fms-report", "FMS_REPORT_ENABLED", ()),
    # The backup includes the report data of the day.
    "backup": ("fms-backup", "FMS_BACKUP_ENABLED", ("report",)),
    # Rotate after the other jobs wrote their logs.
    "logrotate": ("fms-logrotate", "FMS_LOGROTATE_ENABLED", ("report", "backup")),
}
# Short sleeps follow a change of the system clock.
MAX_SLEEP = 60


def next_run(now: datetime, hour: int, minute: int) -> datetime:
    # fold=0 keeps a time that occurs twice (end of daylight saving time) at its first occurrence.
    candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0, fold=0)
    # Compare timestamps: two datetimes with the same tzinfo compare their wall clocks, not the instants.
    if now.timestamp() >= candidate.timestamp():
        candidate += timedelta(days=1)
    return candidate


errors: list[str] = []

try:
    tz = ZoneInfo(os.environ.get("TZ") or "UTC")
except (ZoneInfoNotFoundError, ValueError):
    tz = None
    errors.append(f"TZ must be a time zone name (for example America/Montreal), not '{os.environ.get('TZ')}'.")

FMS_JOBS_TIME = (os.environ.get("FMS_JOBS_TIME") or "").strip()
hour = minute = 0
if FMS_JOBS_TIME:
    match = re.fullmatch(r"([01]?\d|2[0-3]):([0-5]\d)", FMS_JOBS_TIME)
    if match is None:
        errors.append(f"FMS_JOBS_TIME must be HH:MM (00:00 to 23:59), not '{FMS_JOBS_TIME}'.")
    else:
        hour, minute = int(match[1]), int(match[2])

enabled_jobs: set[str] = set()
for name, (command, variable, _after) in JOBS.items():
    value = (os.environ.get(variable) or "False").strip().lower()
    if value == "true":
        enabled_jobs.add(name)
    elif value == "false":
        print(f"{variable} is not True: {command} is off.", flush=True)
    else:
        errors.append(f"{variable} must be True or False, not '{os.environ.get(variable)}'.")

# Sort all jobs, then keep the enabled ones. A job that is off keeps its place in the chain, so the
# jobs before and after it stay in order.
job_order: list[str] = []
unknown = [f"{name} -> {dep}" for name, (_c, _v, after) in JOBS.items() for dep in after if dep not in JOBS]
if unknown:
    errors.append(f"Unknown job in the dependencies of scheduler.py: {', '.join(unknown)}.")
else:
    try:
        job_order = [name for name in TopologicalSorter({name: job[2] for name, job in JOBS.items()}).static_order() if name in enabled_jobs]
    except CycleError as error:
        # CycleError.args[1] is the list of jobs in the cycle.
        cycle: list[str] = error.args[1]
        errors.append(f"The job dependencies in scheduler.py have a cycle: {' -> '.join(cycle)}.")

if errors or tz is None:
    message = "\n".join(errors)
    print(f"FAILED: scheduler misconfigured.\n{message}\nThe scheduler did not start. Fix .env and run podman-compose up -d --force-recreate scheduler.", file=sys.stderr, flush=True)
    sys.exit(1)

# All jobs are off on purpose: stop with exit code 0 (compose does not restart the service). No alert: nothing is wrong.
if not FMS_JOBS_TIME or not job_order:
    reason = "FMS_JOBS_TIME is not set" if not FMS_JOBS_TIME else "no FMS_<JOB>_ENABLED is True"
    print(f"{reason}. Nothing to schedule: stopping.", flush=True)
    sys.exit(0)

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

next_run_time = next_run(datetime.now(tz), hour, minute)
print(f"Schedule (TZ={tz.key}): {hour:02d}:{minute:02d}, next run {next_run_time.isoformat()}", flush=True)
print(f"  jobs in order: {', '.join(JOBS[name][0] for name in job_order)}", flush=True)

while True:
    if datetime.now(tz).timestamp() >= next_run_time.timestamp():
        # A run that starts late runs once, then on the next day.
        for name in job_order:
            command = JOBS[name][0]
            print(f"{command}: start", flush=True)
            # The job writes to the container log. It sends its own failure alert, so do not alert here.
            spawning = True
            try:
                running = subprocess.Popen([command, "now"])
            except OSError as error:
                # The job cannot send its alert if it does not start. Alert here, and keep the other jobs.
                spawning = False
                print(f"FAILED: {command} did not start: {error}. The image is probably broken. Rebuild the scheduler image.", file=sys.stderr, flush=True)
                if stopping:
                    sys.exit(0)
                continue
            spawning = False
            if stopping:
                running.terminate()
            code = running.wait()
            running = None
            print(f"{command}: exit code {code}", flush=True)
            if stopping:
                sys.exit(0)
        next_run_time = next_run(datetime.now(tz), hour, minute)
        print(f"Next run {next_run_time.isoformat()}", flush=True)

    wait = next_run_time.timestamp() - datetime.now(tz).timestamp()
    time.sleep(min(MAX_SLEEP, max(wait, 0)))
