#!/usr/bin/env python3
# Update a QC/dev stack from a GitHub branch (DEPLOYMENT.md: "Automatic update (QC)").
# If origin/<branch> has a new commit: pull it, rebuild the images, delete the database, restore
# the dump, apply the migrations and recreate the stack. Never use it on production: it deletes the database.
#   autoupdate.py --branch qc --dump <install-dir>/oci/backups/2026-10-21.pgsql.gz [--interval 600] [--force]
# Without --interval it checks once and exits (cron). With it, it checks every N seconds and never exits.
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

PGDATA_VOLUME = "freezeman_pgdata"
DB_WAIT_SECONDS = 120

# pg_dumpall scripts restore into postgres: they create the roles and the database.
# pg_dump -Fc dumps restore into the existing POSTGRES_DB.
RESTORE_PSQL = 'psql -U "$POSTGRES_USER" -d postgres'
RESTORE_PG_RESTORE = 'pg_restore -U "$POSTGRES_USER" --no-owner --no-acl --verbose -d "$POSTGRES_DB"'

# Runs in a one-off backend container while only `db` runs. The dump does not have the newest migrations.
# manage.py is in the working directory of the image ($CONTAINER_FMS_ROOT/backend).
MIGRATE = 'python manage.py migrate --noinput && python manage.py createinitialrevisions'


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
        # Set by update_once() when the commit is known, for the failure log.
        self.commit: Optional[str] = None


def log(message: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}", flush=True)


def run(command: list[str]) -> None:
    log("$ " + " ".join(command))
    _ = subprocess.run(command, check=True)


def log_directory(env: Mapping[str, str]) -> str:
    # Only .env counts, not the shell: the script must see the same values as the stack.
    return env.get("HOST_LOG_DIR") or os.path.join(OCI_DIR, "logs")


def alert_failure(args: Args) -> None:
    body = f"autoupdate.py failed on branch {args.branch}.\n"
    if args.commit:
        body += f"Commit: {args.commit}\n"
    body += "The script does not retry this commit."
    print(f"FAILED: {body}", file=sys.stderr, flush=True)


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
        run(["podman-compose", "up", "-d", "db"])
        wait_for_database()
        restore_dump(args.dump, dump_command)
        log("Step: migrate")
        # A failed migration raises here: the stack stays down, only `db` runs, and the failure goes to the log.
        run(["podman-compose", *profiles, "run", "--rm", "--no-deps", "backend", "sh", "-c", MIGRATE])
        log("Step: recreate the stack")
        # The migrations ran in the step above.
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

        # Same rule as compose: FMS_ENV is required.
        if not env.get("FMS_ENV"):
            raise Abort("FMS_ENV is not set in .env.")
        if env["FMS_ENV"] == "PROD":
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
            return

        profiles = [part for name in args.profile for part in ("--profile", name)]
        log(f"Deploy {commit[:12]}")
        deploy(args, profiles, state_path, commit, dump_command)
        log(f"Done: {commit[:12]}")


def report_failure(args: Args, error: BaseException) -> None:
    if isinstance(error, (Abort, subprocess.CalledProcessError)):
        print(f"Update failed: {error}", file=sys.stderr, flush=True)
    else:
        traceback.print_exception(type(error), error, error.__traceback__)
    alert_failure(args)


def main() -> None:
    parser = argparse.ArgumentParser(description="Update a QC/dev stack from a GitHub branch. It deletes the database.")
    _ = parser.add_argument("--branch", required=True, help="branch of origin to follow")
    _ = parser.add_argument("--dump", required=True, help="absolute path of the dump to restore: .pgsql.gz, .pgsql (pg_dumpall) or .dump (pg_dump -Fc)")
    _ = parser.add_argument("--profile", action="append", default=[], help="compose profile for build and up (repeatable)")
    _ = parser.add_argument("--interval", type=int, help="check every N seconds and never exit (default: check once)")
    _ = parser.add_argument("--force", action="store_true", help="deploy even if the commit is the last deployed one")
    args = parser.parse_args(namespace=Args())

    while True:
        try:
            update_once(args)
        except Exception as error:
            report_failure(args, error)
            if args.interval is None:
                sys.exit(1)

        if args.interval is None:
            return

        # --force applies to the first check only, or each check would deploy again.
        args.force = False
        time.sleep(args.interval)


OCI_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(OCI_DIR)

if __name__ == "__main__":
    main()
