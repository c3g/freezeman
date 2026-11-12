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
from pathlib import Path

# One pg_dumpall of the whole cluster to /backups/<YYYY-MM-DD>.pgsql.gz, then exit with the
# result. Host cron starts it every day through oci/jobs.py,
# after fms-report.
# Restore: gunzip -c <date>.pgsql.gz | psql -U "$POSTGRES_USER" -d postgres
BACKUP_DIR = "/backups"
# `or` (rather than `.get(name, default)`) covers an empty string, for example `podman run -e VAR=` without compose.
keep_days = int(os.environ.get("FMS_BACKUP_KEEP_DAYS") or "14")


def setting(*names: str, default: str = "") -> str:
    # First non-empty variable of the list. POSTGRES_* are the names of the db service, PG_* the
    # names of the backend services (the `jobs` container only has PG_*).
    for name in names:
        if os.environ.get(name):
            return os.environ[name]
    if default:
        return default
    print(f"FAILED: the daily pg_dumpall backup failed: set one of: {', '.join(names)}", file=sys.stderr, flush=True)
    sys.exit(1)


# pg_isready and pg_dumpall read these.
os.environ["PGHOST"] = setting("PGHOST", "PG_HOST", default="db")
os.environ["PGPORT"] = setting("PGPORT", "PG_PORT", default="5432")
os.environ["PGUSER"] = setting("POSTGRES_USER", "PG_USER")
os.environ["PGPASSWORD"] = setting("POSTGRES_PASSWORD", "PG_PASSWORD")
os.environ["PGDATABASE"] = setting("POSTGRES_DB", "PG_DATABASE")


def wait_for_database() -> bool:
    for _ in range(60):
        if subprocess.run(["pg_isready", "-q"]).returncode == 0:
            return True
        time.sleep(1)
    print(f"FAILED: the daily pg_dumpall backup failed: database {os.environ['PGHOST']} is not reachable",
          file=sys.stderr, flush=True)
    return False


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

    # Stream the dump into gzip, so the uncompressed dump never goes to disk. Write to the partial
    # name and rename only after success, so a restore never finds a truncated backup.
    try:
        with subprocess.Popen(["pg_dumpall"], stdout=subprocess.PIPE) as dump, gzip.open(partial, "wb") as out:
            assert dump.stdout is not None
            shutil.copyfileobj(dump.stdout, out)
        # Popen does not raise on a non-zero exit status.
        if dump.returncode != 0:
            raise subprocess.CalledProcessError(dump.returncode, "pg_dumpall")
        os.replace(partial, target)
    except BaseException:
        Path(partial).unlink(missing_ok=True)
        raise
    size = subprocess.run(["du", "-h", target], capture_output=True, text=True, check=True).stdout.split()[0]
    print(f"Backup written: {target} ({size})")

    if keep_days > 0:
        delete_old_backups()
    return True


def main() -> int:
    try:
        return 0 if run_backup() else 1
    except Exception as error:
        # The cause goes on the FAILED: line: `grep -A3 "FAILED:"` cuts the traceback before its last line.
        print(f"FAILED: the daily pg_dumpall backup failed: {type(error).__name__}: {error}\n{traceback.format_exc()}",
              file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
