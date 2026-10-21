#!/bin/sh
set -eu

# Daily pg_dumpall of the whole cluster to /backups/<YYYY-MM-DD>.pgsql.gz.
# Replaces a host cron entry, so the job works the same under podman-compose
# and Kubernetes (a CronJob can replace this service).
#   fms-backup        run every day at FMS_BACKUP_TIME (HH:MM in TZ)
#   fms-backup now    run one backup and exit
# Restore: gunzip -c <date>.pgsql.gz | psql -U "$POSTGRES_USER" -d postgres
backup_dir=/backups
backup_time="${FMS_BACKUP_TIME:-01:00}"
keep_days="${FMS_BACKUP_KEEP_DAYS:-14}"

export PGHOST="${PGHOST:-db}"
export PGUSER="$POSTGRES_USER"
export PGPASSWORD="$POSTGRES_PASSWORD"
export PGDATABASE="$POSTGRES_DB"

run_backup() {
  timeout=60
  until pg_isready -q; do
    timeout=$((timeout - 1))
    if [ "$timeout" -le 0 ]; then
      echo "Database ${PGHOST} is not reachable" >&2
      return 1
    fi
    sleep 1
  done

  target="${backup_dir}/$(date +%F).pgsql.gz"
  partial="${target}.partial"
  status="${partial}.status"

  # POSIX sh has no pipefail: record the exit status of pg_dumpall separately.
  { pg_dumpall || echo $? > "$status"; } | gzip > "$partial"
  if [ -e "$status" ]; then
    echo "pg_dumpall failed with status $(cat "$status")" >&2
    rm -f "$partial" "$status"
    return 1
  fi
  mv "$partial" "$target"
  echo "Backup written: $target ($(du -h "$target" | cut -f1))"

  if [ "$keep_days" -gt 0 ]; then
    find "$backup_dir" -maxdepth 1 -type f \
      \( -name '*.pgsql.gz' -o -name '*.pgsql.gz.partial*' \) \
      -mtime "+$((keep_days - 1))" -print -delete | sed 's/^/Deleted old backup: /'
  fi
}

if [ "${1:-}" = "now" ]; then
  run_backup
  exit $?
fi

while true; do
  now=$(date +%s)
  next=$(date -d "today ${backup_time}" +%s)
  if [ "$next" -le "$now" ]; then
    next=$(date -d "tomorrow ${backup_time}" +%s)
  fi
  echo "Next backup: $(date -d "@${next}" '+%F %T %Z')"
  sleep $((next - now))
  if ! run_backup; then
    echo "Backup failed" >&2
  fi
done
