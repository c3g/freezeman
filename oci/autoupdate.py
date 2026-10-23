#!/usr/bin/env python3
# Update a QC/dev stack from a GitHub branch (README.md: "Automatic update (QC)").
# If origin/<branch> has a new commit: pull it, rebuild the images, delete the database, restore
# the dump and recreate the stack. Never use it on production: it deletes the database.
#   autoupdate.py --branch qc --dump /data/dumps/prod.pgsql.gz [--profile web] [--interval 600] [--force]
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
from datetime import datetime

import hostenv

PGDATA_VOLUME = "freezeman_pgdata"
DB_WAIT_SECONDS = 120

# pg_dumpall scripts (the backup service) restore into postgres: they create the roles and the database.
# pg_dump -Fc dumps restore into the existing POSTGRES_DB.
RESTORE_PSQL = 'psql -U "$POSTGRES_USER" -d postgres'
RESTORE_PG_RESTORE = 'pg_restore -U "$POSTGRES_USER" --no-owner --no-acl -d "$POSTGRES_DB"'


class Abort(Exception):
    pass


def log(message):
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}", flush=True)


def run(command, **kwargs):
    log("$ " + " ".join(command))
    return subprocess.run(command, check=True, **kwargs)


def read_env(path):
    values = {}
    if not os.path.isfile(path):
        return values
    with open(path) as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            values[key.strip()] = value
    return values


def restore_command(dump):
    if dump.endswith((".pgsql.gz", ".pgsql")):
        return RESTORE_PSQL
    if dump.endswith(".dump"):
        return RESTORE_PG_RESTORE
    raise Abort(f"Unknown dump type: {dump} (use .pgsql.gz, .pgsql or .dump)")


def git(*args):
    return subprocess.run(["git", "-C", REPO_ROOT, *args], check=True, capture_output=True, text=True).stdout.strip()


def read_state(path):
    try:
        with open(path) as state_file:
            return json.load(state_file)
    except (OSError, ValueError):
        return {}


def write_state(path, commit, ok):
    partial = path + ".partial"
    with open(partial, "w") as state_file:
        json.dump({"commit": commit, "ok": ok, "time": datetime.now().astimezone().isoformat(timespec="seconds")}, state_file)
    os.replace(partial, path)


def wait_for_database():
    check = 'pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    deadline = time.time() + DB_WAIT_SECONDS
    while time.time() < deadline:
        if subprocess.run(["podman-compose", "exec", "-T", "db", "sh", "-c", check], stdout=subprocess.DEVNULL, check=False).returncode == 0:
            return
        time.sleep(2)
    raise Abort(f"The database is not ready after {DB_WAIT_SECONDS} s")


def restore_dump(dump, command):
    log(f"Restore {dump}")
    # No ON_ERROR_STOP: the "already exists" messages of the README are harmless.
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


def deploy(args, profiles, state_path, commit, dump_command):
    git("merge", "--ff-only", f"origin/{args.branch}")
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
        log("Step: recreate the stack")
        # migrate applies the migrations that the dump does not have. assets copies the new frontend.
        run(["podman-compose", *profiles, "up", "-d", "--force-recreate"])
    except BaseException:
        # Do not retry the same commit in a loop: a new commit or --force starts the next try.
        write_state(state_path, commit, False)
        raise
    write_state(state_path, commit, True)


def update_once(args):
    hostenv.setup()
    env = read_env(os.path.join(OCI_DIR, ".env"))
    log_dir = os.environ.get("FMS_LOG_DIR") or env.get("FMS_LOG_DIR") or os.path.join(OCI_DIR, "logs")
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
        if read_state(state_path).get("commit") == commit and not args.force:
            log(f"No new commit ({commit[:12]})")
            return

        profiles = [part for name in args.profile for part in ("--profile", name)]
        log(f"Deploy {commit[:12]}")
        deploy(args, profiles, state_path, commit, dump_command)
        log(f"Done: {commit[:12]}")


def main():
    parser = argparse.ArgumentParser(description="Update a QC/dev stack from a GitHub branch. It deletes the database.")
    parser.add_argument("--branch", required=True, help="branch of origin to follow")
    parser.add_argument("--dump", required=True, help="dump to restore: .pgsql.gz, .pgsql (pg_dumpall) or .dump (pg_dump -Fc)")
    parser.add_argument("--profile", action="append", default=[], help="compose profile for build and up (repeatable)")
    parser.add_argument("--interval", type=int, help="check every N seconds and never exit (default: check once)")
    parser.add_argument("--force", action="store_true", help="deploy even if the commit is the last deployed one")
    args = parser.parse_args()
    args.dump = os.path.abspath(args.dump)

    if args.interval is None:
        try:
            update_once(args)
        except (Abort, subprocess.CalledProcessError) as error:
            print(f"Update failed: {error}", file=sys.stderr, flush=True)
            sys.exit(1)
        return
    while True:
        try:
            update_once(args)
        except (Abort, subprocess.CalledProcessError) as error:
            print(f"Update failed: {error}", file=sys.stderr, flush=True)
        # --force applies to the first check only, or each check would deploy again.
        args.force = False
        time.sleep(args.interval)


OCI_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(OCI_DIR)

if __name__ == "__main__":
    main()
