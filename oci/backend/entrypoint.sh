#!/bin/sh
set -eu

# Fresh volumes (and Kubernetes PVCs) start empty: create the directories
# Django writes into before handing over to the actual command.
mkdir -p \
  media/uploads/templates \
  tmp \
  "${FMS_RUN_INFO_PATH:-triggers/lims-run-info}" \
  "${FMS_VALIDATED_FILES_PATH:-triggers/lims-validation-info}" \
  "${FMS_RELEASED_FILES_PATH:-triggers/lims-release-info}" \
  "${FMS_AUTOMATIONS_WORK_PATH:-automations_work}"

# Wait for PostgreSQL. compose's `depends_on: condition: service_healthy` already
# orders startup, but not for `podman-compose run --no-deps`, a db restart, or
# Kubernetes (no depends_on; keep this unless an initContainer replaces it).
timeout="${FMS_DB_WAIT_SECONDS:-60}"
until python -c "
import os, psycopg2
psycopg2.connect(
    dbname=os.environ.get('PG_DATABASE', 'fms'),
    user=os.environ.get('PG_USER', 'admin'),
    password=os.environ.get('PG_PASSWORD', 'admin'),
    host=os.environ.get('PG_HOST', '127.0.0.1'),
    port=os.environ.get('PG_PORT', '5432'),
    connect_timeout=3,
).close()
" 2>/dev/null; do
  timeout=$((timeout - 1))
  if [ "$timeout" -le 0 ]; then
    echo "Database ${PG_HOST:-127.0.0.1}:${PG_PORT:-5432} is not reachable" >&2
    exit 1
  fi
  sleep 1
done

exec "$@"
