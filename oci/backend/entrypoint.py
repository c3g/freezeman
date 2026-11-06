#!/usr/bin/env python
import os
import sys
import time

import psycopg2

BACKEND_DIR = "/src/backend"


# Read the variables as backend/fms/settings.py does (os.environ.get with a default), so the
# directories and the database check match what Django uses.
def make_directories() -> None:
    # Fresh volumes (and Kubernetes PVCs) start empty: create the directories
    # Django writes into before handing over to the actual command.
    # Relative paths belong to the backend directory, whatever the current directory is.
    for path in (
        "media/uploads/templates",
        "tmp",
        os.environ.get("FMS_RUN_INFO_PATH", "triggers/lims-run-info"),
        os.environ.get("FMS_VALIDATED_FILES_PATH", "triggers/lims-validation-info"),
        os.environ.get("FMS_RELEASED_FILES_PATH", "triggers/lims-release-info"),
        os.environ.get("FMS_AUTOMATIONS_WORK_PATH", "automations_work"),
    ):
        os.makedirs(os.path.join(BACKEND_DIR, path), exist_ok=True)


def wait_for_database() -> None:
    # Wait for PostgreSQL. compose's `depends_on: condition: service_started` orders only the
    # start of the db container, not its readiness, so this wait is necessary. It also covers
    # `podman-compose run --no-deps`, a db restart, and Kubernetes (no depends_on; keep this
    # unless an initContainer replaces it).
    host = os.environ.get("PG_HOST", "127.0.0.1")
    port = os.environ.get("PG_PORT", "5432")
    deadline = time.monotonic() + int(os.environ.get("FMS_DB_WAIT_SECONDS", "60"))
    while True:
        try:
            psycopg2.connect(
                dbname=os.environ.get("PG_DATABASE", "fms"),
                user=os.environ.get("PG_USER", "admin"),
                password=os.environ.get("PG_PASSWORD", "admin"),
                host=host,
                port=port,
                connect_timeout=3,
            ).close()
            return
        except psycopg2.Error:
            if time.monotonic() >= deadline:
                print(f"Database {host}:{port} is not reachable", file=sys.stderr)
                sys.exit(1)
            time.sleep(1)


def main() -> None:
    make_directories()
    wait_for_database()
    os.execvp(sys.argv[1], sys.argv[1:])


if __name__ == "__main__":
    main()
