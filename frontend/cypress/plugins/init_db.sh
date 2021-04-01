#!/bin/bash

# Activate virtual env
. ../env/bin/activate
# Activate the fms DB as PG current DB
export PG_DATABASE=fms
# Create fms_test DB
psql -d $PG_DATABASE -c 'CREATE DATABASE fms_test;' 
# Activate the test DB as PG current DB
export PG_DATABASE=fms_test
# Migrate the test DB to the latest version
python3 ../backend/manage.py migrate
# Install PG extensions
psql -d $PG_DATABASE -c 'CREATE EXTENSION fzy;'
# Create test user
export DJANGO_SUPERUSER_USERNAME=user
export DJANGO_SUPERUSER_PASSWORD=secret
export DJANGO_SUPERUSER_EMAIL=user@example.com
python3 ../backend/manage.py createsuperuser --noinput
# Deactivate virtual env
deactivate