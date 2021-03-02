#!/bin/bash
set -euf
set -o pipefail

export PG_DATABASE=fms_test

echo "DROP DATABASE IF EXISTS $PG_DATABASE; CREATE DATABASE $PG_DATABASE" | psql postgres
python manage.py migrate

DJANGO_SUPERUSER_USERNAME=user DJANGO_SUPERUSER_PASSWORD=secret DJANGO_SUPERUSER_EMAIL=user@example.com python manage.py createsuperuser --noinput

python manage.py runserver
