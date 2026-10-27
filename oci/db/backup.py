#!/usr/bin/env python3
import glob
import gzip
import os
import shutil
import subprocess
import sys
import time
import traceback
from datetime import date, datetime, timedelta

import notify

# Daily pg_dumpall of the whole cluster to /backups/<YYYY-MM-DD>.pgsql.gz.
# Replaces a host cron entry, so the job works the same under podman-compose
# and Kubernetes (a CronJob can replace this service).
#   fms-backup        run every day at FMS_BACKUP_TIME (HH:MM in TZ)
#   fms-backup now    run one backup and exit
# Restore: gunzip -c <date>.pgsql.gz | psql -U "$POSTGRES_USER" -d postgres
BACKUP_DIR = "/backups"
backup_time = os.environ.get("FMS_BACKUP_TIME") or "01:00"
keep_days = int(os.environ.get("FMS_BACKUP_KEEP_DAYS") or "14")

# pg_isready and pg_dumpall read these.
os.environ["PGHOST"] = os.environ.get("PGHOST") or "db"
os.environ["PGUSER"] = os.environ["POSTGRES_USER"]
os.environ["PGPASSWORD"] = os.environ["POSTGRES_PASSWORD"]
os.environ["PGDATABASE"] = os.environ["POSTGRES_DB"]


# Why the last run_backup() failed, for the alert email.
failure_reason = ""


def fail(reason):
    global failure_reason
    failure_reason = reason
    print(reason, file=sys.stderr)
    return False


def wait_for_database():
    for _ in range(60):
        if subprocess.run(["pg_isready", "-q"]).returncode == 0:
            return True
        time.sleep(1)
    return fail(f"Database {os.environ['PGHOST']} is not reachable")


def delete_old_backups():
    # Same rule as `find -mtime +(keep_days - 1)`: age in whole days is at least keep_days.
    limit = time.time() - keep_days * 86400
    patterns = ("*.pgsql.gz", "*.pgsql.gz.partial*")
    for pattern in patterns:
        for path in sorted(glob.glob(os.path.join(BACKUP_DIR, pattern))):
            if os.path.isfile(path) and not os.path.islink(path) and os.path.getmtime(path) < limit:
                os.remove(path)
                print(f"Deleted old backup: {path}")


def run_backup():
    if not wait_for_database():
        return False

    target = os.path.join(BACKUP_DIR, f"{date.today():%Y-%m-%d}.pgsql.gz")
    partial = target + ".partial"

    # Check the exit status of pg_dumpall itself, not only the one of the compression.
    with subprocess.Popen(["pg_dumpall"], stdout=subprocess.PIPE) as dump:
        assert dump.stdout is not None
        try:
            with gzip.open(partial, "wb") as out:
                shutil.copyfileobj(dump.stdout, out)
        except BaseException:
            dump.kill()
            os.remove(partial)
            raise
        status = dump.wait()
    if status != 0:
        os.remove(partial)
        return fail(f"pg_dumpall failed with status {status}")
    os.replace(partial, target)
    size = subprocess.run(["du", "-h", target], capture_output=True, text=True, check=True).stdout.split()[0]
    print(f"Backup written: {target} ({size})")

    if keep_days > 0:
        delete_old_backups()
    return True


def run_and_alert():
    global failure_reason
    failure_reason = ""
    try:
        ok = run_backup()
    except Exception:
        ok = fail(traceback.format_exc())
    if not ok:
        print("Backup failed", file=sys.stderr, flush=True)
        notify.send_alert("Backup failed", f"The daily pg_dumpall backup failed.\n\n{failure_reason}\nThe log is backup.log in FMS_LOG_DIR (podman-compose logs backup).")
    return ok


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
    now, run = next_run(backup_time)
    print(f"Next backup: {run:%Y-%m-%d %H:%M:%S %Z}", flush=True)
    time.sleep((run - now).total_seconds())
    run_and_alert()
