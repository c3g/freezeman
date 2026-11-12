#!/usr/bin/env python3
# Update a QC/dev stack from a GitHub branch (DEPLOYMENT.md: "Automatic update (QC)").
# If origin/<branch> has a new commit: pull it, rebuild the images, delete the database, restore
# the dump, apply the migrations and recreate the stack. Never use it on production: it deletes the database.
#   autoupdate.py --branch qc --db-backup-filename <install-dir>/oci/backups/2026-10-21.pgsql.gz [--interval 600] [--force]
# Without --interval it checks once and exits (cron). With it, it checks every N seconds and never exits.
# Python 3.9 compatible: the Rocky 9 system python3 runs it.
import argparse
import fcntl
import json
import os
import subprocess
import sys
import time
import traceback
from datetime import datetime
from typing import Optional, cast

import hostenv


class Abort(Exception):
    pass


class Args(argparse.Namespace):
    # Same defaults as the parser in main(). The parser sets each attribute again.
    def __init__(self) -> None:
        super().__init__()
        self.branch: str = ""
        self.db_backup_filename: str = ""
        self.profile: list[str] = []
        self.interval: Optional[int] = None
        self.force: bool = False


def log(message: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}", flush=True)


def run(command: list[str]) -> None:
    log("$ " + " ".join(command))
    _ = subprocess.run(command, check=True)


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", REPO_ROOT, *args], check=True, capture_output=True, text=True).stdout.strip()


def write_state(path: str, commit: str, ok: bool) -> None:
    partial = path + ".partial"
    with open(partial, "w") as state_file:
        json.dump({"commit": commit, "ok": ok, "time": datetime.now().astimezone().isoformat(timespec="seconds")}, state_file)
    os.replace(partial, path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Update a QC/dev stack from a GitHub branch. It deletes the database.")
    _ = parser.add_argument("--branch", required=True, help="branch of origin to follow")
    _ = parser.add_argument("--db-backup-filename", required=True, help="absolute path of the dump to restore: .pgsql.gz, .pgsql (pg_dumpall) or .dump (pg_dump -Fc)")
    _ = parser.add_argument("--profile", action="append", default=[], help="compose profile for build and up (repeatable)")
    _ = parser.add_argument("--interval", type=int, help="check every N seconds and never exit (default: check once)")
    _ = parser.add_argument("--force", action="store_true", help="deploy even if the commit is the last deployed one")
    args = parser.parse_args(namespace=Args())
    backup = args.db_backup_filename

    first = True
    while True:
        if not first:
            if args.interval is None:
                return
            # --force applies to the first check only, or each check would deploy again.
            args.force = False
            time.sleep(args.interval)
        first = False

        # Set when the commit is known, for the failure log.
        commit: Optional[str] = None
        try:
            hostenv.setup()
            env = hostenv.read_env(os.path.join(OCI_DIR, ".env"))
            # Only .env counts, not the shell: the script must see the same values as the stack.
            log_dir = env.get("HOST_LOG_DIR") or os.path.join(OCI_DIR, "logs")
            os.makedirs(log_dir, exist_ok=True)
            state_path = os.path.join(log_dir, "autoupdate.state")

            with open(os.path.join(log_dir, "autoupdate.lock"), "w") as lock_file:
                try:
                    fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    log("Another run holds the lock. Exit.")
                    continue

                # Same rule as compose: FMS_ENV is required.
                if not env.get("FMS_ENV"):
                    raise Abort("FMS_ENV is not set in .env.")
                if env["FMS_ENV"] == "PROD":
                    raise Abort("FMS_ENV is PROD. This job deletes the database.")
                if not os.path.isabs(backup):
                    raise Abort(f"--db-backup-filename must be an absolute path: {backup}")
                # pg_dumpall scripts restore into postgres: they create the roles and the database.
                # pg_dump -Fc dumps restore into the existing POSTGRES_DB.
                if backup.endswith((".pgsql.gz", ".pgsql")):
                    dump_command = 'psql -U "$POSTGRES_USER" -d postgres'
                elif backup.endswith(".dump"):
                    dump_command = 'pg_restore -U "$POSTGRES_USER" --no-owner --no-acl --verbose -d "$POSTGRES_DB"'
                else:
                    raise Abort(f"Unknown dump type: {backup} (use .pgsql.gz, .pgsql or .dump)")
                if not os.path.isfile(backup):
                    raise Abort(f"Dump not found: {backup}")

                current = git("rev-parse", "--abbrev-ref", "HEAD")
                if current != args.branch:
                    raise Abort(f"The checkout is on {current}, not on {args.branch}")
                if git("status", "--porcelain", "--untracked-files=no"):
                    raise Abort("The checkout has local changes")

                log(f"Check origin/{args.branch}")
                run(["git", "-C", REPO_ROOT, "fetch", "origin", f"+refs/heads/{args.branch}:refs/remotes/origin/{args.branch}"])
                commit = git("rev-parse", f"origin/{args.branch}")
                try:
                    with open(state_path) as state_file:
                        last_commit = cast("dict[str, object]", json.load(state_file)).get("commit")
                except (OSError, ValueError):
                    last_commit = None
                if last_commit == commit and not args.force:
                    log(f"No new commit ({commit[:12]})")
                    continue

                profiles = [part for name in args.profile for part in ("--profile", name)]
                log(f"Deploy {commit[:12]}")
                _ = git("merge", "--ff-only", f"origin/{args.branch}")
                run(["git", "-C", REPO_ROOT, "submodule", "update", "--init", "--recursive"])
                try:
                    log("Step: build")
                    # Build before `down`: a failed build leaves the old stack running.
                    run(["podman-compose", *profiles, "build"])
                    log("Step: reset the database")
                    run(["podman-compose", *profiles, "down"])
                    if subprocess.run(["podman", "volume", "exists", "freezeman_pgdata"], check=False).returncode == 0:
                        run(["podman", "volume", "rm", "freezeman_pgdata"])
                    run(["podman-compose", "up", "-d", "db"])

                    check = 'pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
                    deadline = time.time() + 120
                    while subprocess.run(["podman-compose", "exec", "-T", "db", "sh", "-c", check], stdout=subprocess.DEVNULL, check=False).returncode != 0:
                        if time.time() >= deadline:
                            raise Abort("The database is not ready after 120 s")
                        time.sleep(2)

                    log(f"Restore {backup}")
                    reader = ["gzip", "-dc", backup] if backup.endswith(".gz") else ["cat", backup]
                    # No ON_ERROR_STOP: the "already exists" messages of DEPLOYMENT.md are harmless.
                    with subprocess.Popen(reader, stdout=subprocess.PIPE) as source:
                        status = subprocess.run(["podman-compose", "exec", "-T", "db", "sh", "-c", dump_command], stdin=source.stdout, check=False).returncode
                    log(f"Restore exit code: {status}")
                    if source.returncode != 0:
                        raise Abort(f"Cannot read {backup} (exit code {source.returncode})")

                    log("Step: migrate")
                    # Runs in a one-off backend container while only `db` runs. The dump does not have the newest migrations.
                    # manage.py is in the working directory of the image ($CONTAINER_FMS_ROOT/backend).
                    # A failed migration raises here: the stack stays down, only `db` runs, and the failure goes to the log.
                    migrate = "python manage.py migrate --noinput && python manage.py createinitialrevisions"
                    run(["podman-compose", *profiles, "run", "--rm", "--no-deps", "backend", "sh", "-c", migrate])
                    log("Step: recreate the stack")
                    # The migrations ran in the step above.
                    run(["podman-compose", *profiles, "up", "-d", "--force-recreate"])
                except BaseException:
                    # Do not retry the same commit in a loop: a new commit or --force starts the next try.
                    write_state(state_path, commit, False)
                    raise
                write_state(state_path, commit, True)
                log(f"Done: {commit[:12]}")
        except Exception as error:
            if isinstance(error, (Abort, subprocess.CalledProcessError)):
                print(f"Update failed: {error}", file=sys.stderr, flush=True)
            else:
                traceback.print_exception(type(error), error, error.__traceback__)
            body = f"autoupdate.py failed on branch {args.branch}.\n"
            if commit:
                body += f"Commit: {commit}\n"
            body += "The script does not retry this commit."
            print(f"FAILED: {body}", file=sys.stderr, flush=True)
            if args.interval is None:
                sys.exit(1)


OCI_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(OCI_DIR)

if __name__ == "__main__":
    main()
