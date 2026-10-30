#!/usr/bin/env python3
import os
import signal
import sys
import time
from datetime import datetime

import notify

# Monthly reminder email to update the base images ("Keep the base images up to date" in oci/README.md).
# Kubernetes: use a CronJob that runs `fms-remind now`.
#   fms-remind        send the reminder on day FMS_REMIND_DAY of each month at FMS_REMIND_TIME (HH:MM in TZ).
#                     Only if FMS_ENV is PROD. Other hosts (QC, DEV) idle.
#   fms-remind now    send it once and exit
# In the log directory, so a month is not sent twice after `down` and `--force-recreate`.
# The name does not end in .log, so logrotate does not rotate it.
STATE = "/logs/remind.state"
BODY = """Update the base images of the FreezeMan stack (python, node, nginx, postgres, Debian, Alpine).
The Containerfiles use floating tags, and this host keeps the images it pulled first.

Steps (in oci/, as the user that runs the stack, QC first and then prod):

1. podman-compose build --pull --no-cache
2. podman-compose up -d
3. Check the containers and the web page.

Details: "Keep the base images up to date" in oci/README.md."""


def read_settings() -> tuple[int, int, int]:
    # Fall back to the defaults instead of exiting: an exit makes `restart: always` loop and repeat the alert.
    day, hour, minute = 1, 9, 0
    try:
        day = int(os.environ.get("FMS_REMIND_DAY") or day)
        hour, minute = map(int, (os.environ.get("FMS_REMIND_TIME") or "09:00").split(":"))
        # Day 29 to 31 does not exist in each month.
        if not (1 <= day <= 28 and 0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError
    except ValueError:
        print("FMS_REMIND_DAY must be 1 to 28 and FMS_REMIND_TIME must be HH:MM. Using day 1 at 09:00.", file=sys.stderr, flush=True)
        day, hour, minute = 1, 9, 0
    return day, hour, minute


def last_sent() -> str:
    try:
        with open(STATE) as state:
            return state.read().strip()
    except OSError:
        return ""


def write_state(month: str) -> None:
    with open(STATE, "w") as state:
        _ = state.write(month)


def send() -> None:
    notify.send_alert("Monthly reminder: update the base images", BODY)


if len(sys.argv) > 1 and sys.argv[1] == "now":
    send()
    sys.exit(0)

if (os.environ.get("FMS_ENV") or "").strip().upper() != "PROD":
    # Idle instead of exit: `restart: always` would loop, and start.py reports a stopped container as failed.
    print("FMS_ENV is not PROD: no reminder email on this host.", flush=True)
    signal.pause()

day, hour, minute = read_settings()
if not last_sent():
    # First start: the images are fresh, so wait for the next month.
    write_state(f"{datetime.now():%Y-%m}")

while True:
    now = datetime.now()
    month = f"{now:%Y-%m}"
    this_run = datetime(now.year, now.month, day, hour, minute)
    if now >= this_run and last_sent() != month:
        send()
        write_state(month)
        now = datetime.now()
    if last_sent() != month and now < this_run:
        run = this_run
    else:
        run = datetime(now.year + (now.month == 12), now.month % 12 + 1, day, hour, minute)
    print(f"Next reminder: {run:%Y-%m-%d %H:%M}", flush=True)
    # astimezone() attaches the local zone, so the wait is right across a DST change.
    time.sleep((run.astimezone() - now.astimezone()).total_seconds())
