#!/bin/sh
# Runs once, when the data directory is first initialized.
set -eu

# template1: every database created later (e.g. pytest's test database) gets fzy too.
for db in template1 "$POSTGRES_DB"; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" \
    -c "CREATE EXTENSION IF NOT EXISTS fzy;"
done
