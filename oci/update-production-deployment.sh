#!/usr/bin/env bash
# Update the production stack to the checked-out release (DEPLOYMENT.md: "Update to a new release").
# Run it manually in oci/ after `git fetch && git checkout vX.Y.Z`:
#   ./update-production-deployment.sh
# It prints each command before it runs. If a step fails, fix the error, then run the remaining
# steps of this file manually.
set -euo pipefail

# Same environment as hostenv.py. Rootless podman keeps its state in XDG_RUNTIME_DIR, and
# podman-compose can be in ~/.local/bin.
export PATH="$HOME/.local/bin:$PATH"
# podman-compose reads .env and the relative paths of compose.yaml from the current directory.
cd "$(dirname "$(readlink -f "$0")")"

fail() {
    echo "update-production-deployment.sh: $*" >&2
    exit 1
}

[ -n "${XDG_RUNTIME_DIR:-}" ] || fail "XDG_RUNTIME_DIR is not set. See DEPLOYMENT.md."
[ -d "$XDG_RUNTIME_DIR" ] || fail "XDG_RUNTIME_DIR is $XDG_RUNTIME_DIR, but this directory does not exist."

set -x

# Checks: the same rules as compose and autoupdate.py.
[ -f .env ] || fail ".env not found in $PWD. See DEPLOYMENT.md."
grep -q '^FMS_ENV=.' .env || fail "FMS_ENV is not set in .env."
[ -z "$(git status --porcelain --untracked-files=no)" ] || fail "The checkout has local changes."

# The image tag is the release version. The checked-out commit must have the tag v<VERSION>.
version=$(tr -d '[:space:]' < ../VERSION)
[ -n "$version" ] || fail "../VERSION is empty."
tags=$(git tag --points-at HEAD)
grep -qxF "v$version" <<< "$tags" || fail "VERSION is $version, but HEAD has the tags: ${tags:-no tag}. Check out v$version."

git submodule update --init --recursive

# Back up all databases (and the roles) while db runs. POSTGRES_USER expands in the container.
mkdir -p backups
# shellcheck disable=SC2016
podman-compose exec -T db sh -c 'pg_dumpall -U "$POSTGRES_USER"' | gzip > "backups/$(date +%F_%H%M%S)-before-$version.pgsql.gz"

# Build with the new tag before .env changes: if the build fails, .env keeps the old tag, so
# freezeman.py still finds the images at boot. The shell value overrides .env.
FMS_IMAGE_TAG="$version" podman-compose build

# Set the new tag in .env, so freezeman.py and manual podman-compose commands use the new images.
if grep -q '^FMS_IMAGE_TAG=' .env; then
    sed -i "s/^FMS_IMAGE_TAG=.*/FMS_IMAGE_TAG=$version/" .env
else
    echo "FMS_IMAGE_TAG=$version" >> .env
fi

# Stop the services that use the database, so no request meets a schema that does not match the code.
podman-compose stop web backend

# Migrate in a one-off container of the new backend image, while db runs.
podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'

# Replace all containers with new ones from the new images and .env.
podman-compose up -d --force-recreate
