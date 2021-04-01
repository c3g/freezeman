#!/bin/bash

# Activate virtual env
. ../env/bin/activate
# Activate the test DB as PG current DB
export PG_DATABASE=fms_test
# Start Backend
python3 ../backend/manage.py runserver