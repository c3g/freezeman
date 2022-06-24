#!/bin/sh

echo "Waiting for PostgreSQL..."

while ! nc -z $PG_HOST $PG_PORT; do
    sleep 1
done

echo "PostgreSQL started"

set -e

python manage.py makemigrations
python manage.py migrate

exec "$@"
