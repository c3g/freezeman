#!/bin/sh
set -eu

# Start the stack. Run it from cron: `@reboot /data/freezeman/oci/start.sh` (README.md).

# Rootless podman keeps its state in XDG_RUNTIME_DIR. Cron does not set it, so use the same rule
# as ~/.bash_profile: all shells of the user then see the same containers.
if [ -z "${XDG_RUNTIME_DIR:-}" ]; then
  runtime_dir="/run/user/$(id -u)"
  # At boot, cron can start before logind creates the directory. Wait only if the user has linger:
  # logind then creates the directory without a login.
  if [ -e "/var/lib/systemd/linger/$(id -un)" ]; then
    wait=60
    while [ ! -d "$runtime_dir" ] && [ "$wait" -gt 0 ]; do
      wait=$((wait - 1))
      sleep 1
    done
  fi
  if [ -d "$runtime_dir" ]; then
    export XDG_RUNTIME_DIR="$runtime_dir"
  fi
fi

# Cron has a short PATH. podman-compose can be in ~/.local/bin.
PATH="$HOME/.local/bin:$PATH"

# podman-compose reads .env and the relative paths of compose.yaml from the current directory.
# compose.yaml builds the default log path from PWD, so export it.
cd "$(dirname "$0")"
export PWD
exec podman-compose up -d
