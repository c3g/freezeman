#!/bin/sh
set -eu

# Daily prepare_report_data. Replaces a host cron entry or systemd timer, so the
# job works the same under podman-compose and Kubernetes (a CronJob can replace
# this service). FMS_REPORT_TIME is HH:MM in the container time zone (TZ).
report_time="${FMS_REPORT_TIME:-02:00}"

while true; do
  now=$(date +%s)
  next=$(date -d "today ${report_time}" +%s)
  if [ "$next" -le "$now" ]; then
    next=$(date -d "tomorrow ${report_time}" +%s)
  fi
  echo "Next prepare_report_data run: $(date -d "@${next}" '+%F %T %Z')"
  sleep $((next - now))
  if ! python manage.py prepare_report_data; then
    echo "prepare_report_data failed" >&2
  fi
done
