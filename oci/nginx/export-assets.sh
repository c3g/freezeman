#!/bin/sh
set -eu

# Copy the built frontend and the Django static files out of the web image into
# bind mounts that the host nginx serves (compose.yaml, service "assets").
# The target is emptied first, so files of a previous release do not stay.
for pair in /usr/share/nginx/html:/out/dist /usr/share/nginx/static:/out/static; do
  src="${pair%%:*}"
  dst="${pair##*:}"
  find "$dst" -mindepth 1 -delete
  cp -R "$src"/. "$dst"/
  echo "$dst: $(find "$dst" -type f | wc -l) files"
done
