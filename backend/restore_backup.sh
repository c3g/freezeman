#!/bin/bash
set -euf
set -o pipefail

if [[ $# -ne 1 ]]; then
    echo "usage: restore_backup.sh [file]"
    exit 1
fi

################
# 0. Variables #
################

export __dirname="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# NOTE:
# This assumes that `psql` has access without prompt to the `postgres` or
# PG_DATABASE database. Variables PG_DATABASE, PG_USER or PG_PASSWORD may
# need to be configured outside this script.

export PG_DATABASE=${PG_DATABASE:-postgres}

# Our database name
export fms_database=fms

# pgsql backup file to restore
export backup_file=$1


#####################
# 1. Setup database #
#####################

# Drop it & recreate it
psql $PG_DATABASE -c "DROP DATABASE IF EXISTS $fms_database WITH (FORCE)"
psql $PG_DATABASE -c "CREATE DATABASE $fms_database"
psql -d $PG_DATABASE -f $backup_file

# Manually enable fzy as it's not in the migrations
psql $fms_database -c 'CREATE EXTENSION fzy;'


##########################
# 2. Setup django server #
##########################

source "$__dirname/env/bin/activate"

# Set the DB name for django
export PG_DATABASE=$fms_database

# Apply migrations
echo "Applying migrations"
python "$__dirname/manage.py" migrate
