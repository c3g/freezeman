#!/bin/sh

uwsgi --ini docker.uwsgi.ini &
nginx -g 'daemon off;'

