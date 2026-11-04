#!/usr/bin/env python3
import glob
import gzip
import os
import shutil
import subprocess
import sys
import time
import traceback
from datetime import date

import notify

# One pg_dumpall of the whole cluster to /backups/<YYYY-MM-DD>.pgsql.gz, then exit with the
# result. The `scheduler` service (oci/scheduler/scheduler.py) starts it every day at
# FMS_JOBS_TIME, after fms-report. In Kubernetes a CronJob can call it too.
#   fms-backup now    run one backup and exit (`now` is the only mode, the argument is optional)
# Restore: gunzip -c <date>.pgsql.gz | psql -U "$POSTGRES_USER" -d postgres
BACKUP_DIR = "/backups"
keep_days = int(os.environ.get("FMS_BACKUP_KEEP_DAYS") or "14")


def setting(*names: str, default: str = "") -> str:
    # First non-empty variable of the list. POSTGRES_* are the names of the db service, PG_* the
    # names of the backend services (the `scheduler` container only has PG_*).
    for name in names:
        if os.environ.get(name):
            return os.environ[name]
    if default:
        return default
    print(f"Set one of: {', '.join(names)}", file=sys.stderr)
    sys.exit(1)


# pg_isready and pg_dumpall read these.
os.environ["PGHOST"] = setting("PGHOST", "PG_HOST", default="db")
os.environ["PGPORT"] = setting("PGPORT", "PG_PORT", default="5432")
os.environ["PGUSER"] = setting("POSTGRES_USER", "PG_USER")
os.environ["PGPASSWORD"] = setting("POSTGRES_PASSWORD", "PG_PASSWORD")
os.environ["PGDATABASE"] = setting("POSTGRES_DB", "PG_DATABASE")


# Why the last run_backup() failed, for the alert email.
failure_reason = ""


def fail(reason: str) -> bool:
    global failure_reason
    failure_reason = reason
    print(reason, file=sys.stderr)
    return False


def wait_for_database() -> bool:
    for _ in range(60):
        if subprocess.run(["pg_isready", "-q"]).returncode == 0:
            return True
        time.sleep(1)
    return fail(f"Database {os.environ['PGHOST']} is not reachable")


def delete_old_backups() -> None:
    # Same rule as `find -mtime +(keep_days - 1)`: age in whole days is at least keep_days.
    limit = time.time() - keep_days * 86400

    def backup_files(pattern: str) -> list[str]:
        paths = glob.glob(os.path.join(BACKUP_DIR, pattern))
        return [p for p in paths if os.path.isfile(p) and not os.path.islink(p)]

    # Always keep the newest keep_days backups. If the job was off for some days, the age rule
    # alone deletes all of them except the new one.
    backups = sorted(backup_files("*.pgsql.gz"), key=os.path.getmtime, reverse=True)[keep_days:]
    partials = backup_files("*.pgsql.gz.partial*")
    for path in sorted(backups + partials):
        if os.path.getmtime(path) < limit:
            os.remove(path)
            print(f"Deleted old backup: {path}")


def run_backup() -> bool:
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


def run_and_alert() -> bool:
    global failure_reason
    failure_reason = ""
    try:
        ok = run_backup()
    except Exception:
        ok = fail(traceback.format_exc())
    if not ok:
        print("Backup failed", file=sys.stderr, flush=True)
        notify.send_alert("Backup failed", f"The daily pg_dumpall backup failed.\n\n{failure_reason}\nThe log is scheduler.log in FMS_LOG_DIR (podman-compose logs scheduler).")
    return ok


sys.exit(0 if run_and_alert() else 1)
