#!/bin/bash
set -euf
set -o pipefail

################
# 0. Variables #
################

# NOTE:
# This assumes that `psql` has access without prompt to the `postgres` or
# PG_DATABASE database. Variables PG_DATABASE, PG_USER or PG_PASSWORD may
# need to be configured outside this script.

export PG_DATABASE=${PG_DATABASE:-postgres}

# Our test database name
export database_test=fms_test


#####################
# 1. Setup database #
#####################

# Drop it & recreate it
psql $PG_DATABASE -c "DROP DATABASE IF EXISTS $database_test WITH (FORCE)"
psql $PG_DATABASE -c "CREATE DATABASE $database_test"

# Manually enable fzy as it's not in the migrations
psql $database_test -c 'CREATE EXTENSION fzy;'


##########################
# 2. Setup django server #
##########################

# Set the DB name for django, after creating it in case PG_DATABASE needs to be
export PG_DATABASE=$database_test

# Apply migrations, create superuser & run the server
echo "Applying migrations"
python manage.py migrate

echo "Creating superuser"
export DJANGO_SUPERUSER_USERNAME=user
export DJANGO_SUPERUSER_PASSWORD=secret
export DJANGO_SUPERUSER_EMAIL=user@example.com
python manage.py createsuperuser --noinput

echo "Running server with database $PG_DATABASE"
python manage.py runserver
