#!/usr/bin/env python
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta

# Daily prepare_report_data. Replaces a host cron entry or systemd timer, so the
# job works the same under podman-compose and Kubernetes (a CronJob can replace
# this service). FMS_REPORT_TIME is HH:MM in the container time zone (TZ).
report_time = os.environ.get("FMS_REPORT_TIME") or "02:00"


def next_run(hhmm: str) -> tuple[datetime, datetime]:
    hour, minute = map(int, hhmm.split(":"))
    now = datetime.now()
    run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if run <= now:
        run += timedelta(days=1)
    # astimezone() attaches the local zone, so the wait is right across a DST change.
    return now.astimezone(), run.astimezone()


while True:
    now, run = next_run(report_time)
    print(f"Next prepare_report_data run: {run:%Y-%m-%d %H:%M:%S %Z}", flush=True)
    time.sleep((run - now).total_seconds())
    if subprocess.run([sys.executable, "manage.py", "prepare_report_data"]).returncode != 0:
        print("prepare_report_data failed", file=sys.stderr, flush=True)
