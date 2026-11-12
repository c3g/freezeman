#!/usr/bin/env python
import os
import sys
import time

import psycopg2


def make_directories() -> None:
    # Create the directories that Django writes into but does not create itself. The trigger
    # and automations folders need nothing here: each one is a mount target, so it exists.
    for path in (
        # TEMPLATE_UPLOAD_PATH. Django does not create it, and each template submission fails
        # without it. The default media folder of the checkout has it (git tracks
        # backend/media/uploads/templates/.keep). Another FMS_MEDIA_DIR may not: a new or empty
        # folder, or a classic media folder with no upload yet.
        "/workspace/freezeman/backend/media/uploads/templates",
        # TEMP_ROOT. The backend-prod image creates this directory. The "dev" image does not:
        # it mounts the repository at /workspace/freezeman, and git does not track backend/tmp.
        "/workspace/freezeman/backend/tmp",
    ):
        os.makedirs(path, exist_ok=True)


# Read the variables as backend/fms/settings.py does (os.environ.get with a default), so the
# database check matches what Django uses.
def wait_for_database() -> None:
    # Wait for PostgreSQL. compose's `depends_on: condition: service_started` orders only the
    # start of the db container, not its readiness, so this wait is necessary. It also covers
    # `podman-compose run --no-deps` and a db restart.
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
