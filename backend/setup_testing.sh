#!/bin/bash
set -euf
set -o pipefail

################
# 0. Variables #
################

export __dirname="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# NOTE:
# This assumes that `psql` has access without prompt to the `postgres` or
# PG_DATABASE database. Variables PG_DATABASE, PG_USER or PG_PASSWORD may
# need to be configured outside this script.

export PG_DATABASE=${PG_DATABASE:-postgres}

# Our test database name
export database_test=fms_test

# The command to run django with
export django_command=${1:-runserver}


#####################
# 1. Setup database #
#####################

# Drop it & recreate it
psql $PG_DATABASE -c "DROP DATABASE IF EXISTS $database_test"
psql $PG_DATABASE -c "CREATE DATABASE $database_test"

# Manually enable fzy as it's not in the migrations
psql $database_test -c 'CREATE EXTENSION fzy;'


##########################
# 2. Setup django server #
##########################

source "$__dirname/env/bin/activate"

# Set the DB name for django
export PG_DATABASE=$database_test

# Apply migrations, create superuser & run the server
echo "Applying migrations"
python "$__dirname/manage.py" migrate

echo "Creating superuser"
export DJANGO_SUPERUSER_USERNAME=user
export DJANGO_SUPERUSER_PASSWORD=secret
export DJANGO_SUPERUSER_EMAIL=user@example.com
python "$__dirname/manage.py" createsuperuser --noinput

# Make the test running optional so that we can launch the tests in a debugger.
# Invoking this script without the 'test' argument just sets up the test db
# without launching any tests.
if $1
then
    echo "Running server with database $PG_DATABASE"
    python "$__dirname/manage.py" $django_command
fi
