#!/usr/bin/env python3
# Update a QC/dev stack from a GitHub branch (DEPLOYMENT.md: "Automatic update (QC)").
# If origin/<branch> has a new commit: pull it, rebuild the images, delete the database, restore
# the dump and recreate the stack. Never use it on production: it deletes the database.
#   autoupdate.py --branch qc --dump /data/freezeman-oci/backups/2026-10-21.pgsql.gz [--interval 600] [--force] [--fast-restore]
# Without --interval it checks once and exits (cron). With it, it checks every N seconds and never exits.
# --fast-restore restores with compose.restore.yaml (slow disk, DEPLOYMENT.md: "Restore on a slow disk").
# Python 3.9 compatible: the Rocky 9 system python3 runs it.
import argparse
import fcntl
import gzip
import json
import os
import shutil
import subprocess
import sys
import time
import traceback
from collections.abc import Mapping
from datetime import datetime
from typing import Optional, cast

import hostenv
import notify

PGDATA_VOLUME = "freezeman_pgdata"
DB_WAIT_SECONDS = 120

# pg_dumpall scripts (the backup service) restore into postgres: they create the roles and the database.
# pg_dump -Fc dumps restore into the existing POSTGRES_DB.
RESTORE_PSQL = 'psql -U "$POSTGRES_USER" -d postgres'
RESTORE_PG_RESTORE = 'pg_restore -U "$POSTGRES_USER" --no-owner --no-acl --verbose -d "$POSTGRES_DB"'

# Relative to the working directory, like compose.yaml: hostenv.setup() changes it to OCI_DIR.
FAST_RESTORE_FILES = ["-f", "compose.yaml", "-f", "compose.restore.yaml"]


class Abort(Exception):
    pass


class Args(argparse.Namespace):
    # Same defaults as the parser in main(). The parser sets each attribute again.
    def __init__(self) -> None:
        super().__init__()
        self.branch: str = ""
        self.dump: str = ""
        self.profile: list[str] = []
        self.interval: Optional[int] = None
        self.force: bool = False
        self.fast_restore: bool = False
        # Set by update_once() when the commit is known, for the alert email.
        self.commit: Optional[str] = None


def log(message: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}", flush=True)


def run(command: list[str]) -> None:
    log("$ " + " ".join(command))
    returncode, tail = notify.run_tail(command)
    if returncode != 0:
        raise subprocess.CalledProcessError(returncode, command, output=tail)


def log_directory(env: Mapping[str, str]) -> str:
    return os.environ.get("FMS_LOG_DIR") or env.get("FMS_LOG_DIR") or os.path.join(OCI_DIR, "logs")


def clear_alert(log_dir: str) -> None:
    try:
        os.remove(os.path.join(log_dir, "autoupdate.alert"))
    except FileNotFoundError:
        pass


def alert_failure(args: Args, error: BaseException) -> None:
    """Send one email per distinct error. logs/autoupdate.alert holds the last error that was sent.

    Without it, a failed commit would send an email at each check (every --interval seconds or cron run).
    """
    if isinstance(error, (Abort, subprocess.CalledProcessError)):
        text = f"{type(error).__name__}: {error}"
    else:
        text = "".join(traceback.format_exception(type(error), error, error.__traceback__))
    try:
        settings = hostenv.settings()
        alert_path = os.path.join(log_directory(settings), "autoupdate.alert")
        try:
            with open(alert_path) as alert_file:
                if alert_file.read() == text:
                    return
        except OSError:
            pass
        body = f"autoupdate.py failed on branch {args.branch}.\n\nError: {text}\n"
        if args.commit:
            body += f"\nCommit: {args.commit}\n"
        output = getattr(error, "output", None)
        if output:
            body += f"\nLast output:\n{output}\n"
        body += "\nThe script does not retry this commit. See logs/autoupdate.log. No other email follows for the same error."
        notify.send_alert("autoupdate.py failed", body, settings)
        os.makedirs(os.path.dirname(alert_path), exist_ok=True)
        with open(alert_path, "w") as alert_file:
            _ = alert_file.write(text)
    except Exception as alert_error:
        print(f"Alert failed: {alert_error}", file=sys.stderr, flush=True)


def restore_command(dump: str) -> str:
    if dump.endswith((".pgsql.gz", ".pgsql")):
        return RESTORE_PSQL
    if dump.endswith(".dump"):
        return RESTORE_PG_RESTORE
    raise Abort(f"Unknown dump type: {dump} (use .pgsql.gz, .pgsql or .dump)")


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", REPO_ROOT, *args], check=True, capture_output=True, text=True).stdout.strip()


def read_state(path: str) -> dict[str, object]:
    try:
        with open(path) as state_file:
            return cast("dict[str, object]", json.load(state_file))
    except (OSError, ValueError):
        return {}


def write_state(path: str, commit: str, ok: bool) -> None:
    partial = path + ".partial"
    with open(partial, "w") as state_file:
        json.dump({"commit": commit, "ok": ok, "time": datetime.now().astimezone().isoformat(timespec="seconds")}, state_file)
    os.replace(partial, path)


def wait_for_database() -> None:
    check = 'pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    deadline = time.time() + DB_WAIT_SECONDS
    while time.time() < deadline:
        if subprocess.run(["podman-compose", "exec", "-T", "db", "sh", "-c", check], stdout=subprocess.DEVNULL, check=False).returncode == 0:
            return
        time.sleep(2)
    raise Abort(f"The database is not ready after {DB_WAIT_SECONDS} s")


def restore_dump(dump: str, command: str) -> None:
    log(f"Restore {dump}")
    # No ON_ERROR_STOP: the "already exists" messages of DEPLOYMENT.md are harmless.
    with subprocess.Popen(["podman-compose", "exec", "-T", "db", "sh", "-c", command], stdin=subprocess.PIPE) as restore:
        assert restore.stdin is not None
        try:
            with (gzip.open(dump, "rb") if dump.endswith(".gz") else open(dump, "rb")) as source:
                shutil.copyfileobj(source, restore.stdin)
        except BrokenPipeError:
            pass  # The restore command exited early. Its exit code tells why.
        except BaseException:
            restore.kill()
            raise
        finally:
            try:
                restore.stdin.close()
            except BrokenPipeError:
                pass
        status = restore.wait()
    log(f"Restore exit code: {status}")


def deploy(args: Args, profiles: list[str], state_path: str, commit: str, dump_command: str) -> None:
    _ = git("merge", "--ff-only", f"origin/{args.branch}")
    run(["git", "-C", REPO_ROOT, "submodule", "update", "--init", "--recursive"])
    try:
        log("Step: build")
        # Build before `down`: a failed build leaves the old stack running.
        run(["podman-compose", *profiles, "build"])
        log("Step: reset the database")
        run(["podman-compose", *profiles, "down"])
        if subprocess.run(["podman", "volume", "exists", PGDATA_VOLUME], check=False).returncode == 0:
            run(["podman", "volume", "rm", PGDATA_VOLUME])
        # Safe only because the volume is new: a crash during the restore loses nothing, the next run deletes it.
        run(["podman-compose", *(FAST_RESTORE_FILES if args.fast_restore else []), "up", "-d", "db"])
        wait_for_database()
        restore_dump(args.dump, dump_command)
        if args.fast_restore:
            log("Step: restart the database with the normal settings")
            run(["podman-compose", "up", "-d", "--force-recreate", "db"])
            # The fast server did not flush its files.
            run(["sync"])
        log("Step: recreate the stack")
        # migrate applies the migrations that the dump does not have.
        run(["podman-compose", *profiles, "up", "-d", "--force-recreate"])
    except BaseException:
        # Do not retry the same commit in a loop: a new commit or --force starts the next try.
        write_state(state_path, commit, False)
        raise
    write_state(state_path, commit, True)


def update_once(args: Args) -> None:
    args.commit = None
    hostenv.setup()
    env = hostenv.read_env(os.path.join(OCI_DIR, ".env"))
    log_dir = log_directory(env)
    os.makedirs(log_dir, exist_ok=True)
    state_path = os.path.join(log_dir, "autoupdate.state")

    with open(os.path.join(log_dir, "autoupdate.lock"), "w") as lock_file:
        try:
            fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            log("Another run holds the lock. Exit.")
            return

        if (os.environ.get("FMS_ENV") or env.get("FMS_ENV")) == "PROD":
            raise Abort("FMS_ENV is PROD. This job deletes the database.")
        if not os.path.isabs(args.dump):
            raise Abort(f"--dump must be an absolute path: {args.dump}")
        dump_command = restore_command(args.dump)
        if not os.path.isfile(args.dump):
            raise Abort(f"Dump not found: {args.dump}")

        current = git("rev-parse", "--abbrev-ref", "HEAD")
        if current != args.branch:
            raise Abort(f"The checkout is on {current}, not on {args.branch}")
        if git("status", "--porcelain", "--untracked-files=no"):
            raise Abort("The checkout has local changes")

        log(f"Check origin/{args.branch}")
        run(["git", "-C", REPO_ROOT, "fetch", "origin", f"+refs/heads/{args.branch}:refs/remotes/origin/{args.branch}"])
        commit = git("rev-parse", f"origin/{args.branch}")
        args.commit = commit
        if read_state(state_path).get("commit") == commit and not args.force:
            log(f"No new commit ({commit[:12]})")
            clear_alert(log_dir)
            return

        profiles = [part for name in args.profile for part in ("--profile", name)]
        log(f"Deploy {commit[:12]}")
        deploy(args, profiles, state_path, commit, dump_command)
        log(f"Done: {commit[:12]}")
        clear_alert(log_dir)


def report_failure(args: Args, error: BaseException) -> None:
    if isinstance(error, (Abort, subprocess.CalledProcessError)):
        print(f"Update failed: {error}", file=sys.stderr, flush=True)
    else:
        traceback.print_exception(type(error), error, error.__traceback__)
    alert_failure(args, error)


def main() -> None:
    parser = argparse.ArgumentParser(description="Update a QC/dev stack from a GitHub branch. It deletes the database.")
    _ = parser.add_argument("--branch", required=True, help="branch of origin to follow")
    _ = parser.add_argument("--dump", required=True, help="absolute path of the dump to restore: .pgsql.gz, .pgsql (pg_dumpall) or .dump (pg_dump -Fc)")
    _ = parser.add_argument("--profile", action="append", default=[], help="compose profile for build and up (repeatable)")
    _ = parser.add_argument("--interval", type=int, help="check every N seconds and never exit (default: check once)")
    _ = parser.add_argument("--force", action="store_true", help="deploy even if the commit is the last deployed one")
    _ = parser.add_argument("--fast-restore", action="store_true", help="restore with compose.restore.yaml (fsync off). For a slow disk only")
    args = parser.parse_args(namespace=Args())

    if args.interval is None:
        try:
            update_once(args)
        except Exception as error:
            report_failure(args, error)
            sys.exit(1)
        return
    while True:
        try:
            update_once(args)
        except Exception as error:
            report_failure(args, error)
        # --force applies to the first check only, or each check would deploy again.
        args.force = False
        time.sleep(args.interval)


OCI_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(OCI_DIR)

if __name__ == "__main__":
    main()
