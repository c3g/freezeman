# FreezeMan containers on Rocky Linux 9

This file covers the Rocky Linux 9 host setup. The stack itself is in [README.md](README.md).

## Install

```bash
sudo dnf install -y podman git
# podman-compose is not in the base repositories. EPEL has it
# (EPEL packages may depend on CRB, which Rocky ships disabled):
sudo dnf install -y epel-release
sudo dnf config-manager --set-enabled crb
sudo dnf install -y podman-compose
podman --version
podman-compose --version
podman info --format '{{.Host.NetworkBackend}}'   # should print netavark
```

The production server runs Rocky Linux 9.6, which ships podman 5.4.0 and
buildah 1.39 (AppStream). EPEL 9 has podman-compose 1.5.0 (1.5.0-2 or later:
1.5.0-1 lacked the `python3-dotenv` dependency). These support everything the
compose files and Containerfiles use: `depends_on` conditions (they need
podman >= 4.6), `profiles`, `x-podman`, `RUN --mount=type=cache|bind` and
`COPY --chmod`. Rocky 9.7 and 9.8 ship podman 5.6 and 5.8, which work as well.

Rocky only maintains the latest 9.x minor release: 9.6 no longer receives
updates once 9.7 is out, and `sudo dnf update` moves the host to the current
9.x release. Nothing here requires that, but plan the upgrade for security fixes.

If the EPEL podman-compose is too old or broken, install the current release
for the deployment user instead (pure Python, needs Python >= 3.9; Rocky 9 has 3.9):

```bash
sudo dnf remove -y podman-compose
sudo dnf install -y python3-pip
pip3 install --user podman-compose
```

## Run rootless as a dedicated user

Run the stack as an unprivileged user (e.g. `django`), not as root.

- Users created with `useradd` get `/etc/subuid` and `/etc/subgid` ranges
  automatically. Check with `grep django /etc/subuid`. Older accounts may need
  `sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 django`.
- Log in as that user directly (`ssh` or `sudo machinectl shell django@`), not with
  `sudo su - django`. `su` starts no systemd user session and sets no `XDG_RUNTIME_DIR`.
  Without them, healthchecks do not run, so `db`, `backend` and `web` never become
  healthy and `podman-compose up` waits on `service_healthy`. Podman also falls back
  to cgroupfs and puts its runtime files outside `/run/user/<uid>`.
  `machinectl` is in the `systemd-container` package, which a minimal Rocky 9 install
  does not include.
- Rootless containers are stopped when the user's last session ends, unless lingering is enabled:

  ```bash
  sudo loginctl enable-linger django
  ```

  This is the only systemd setting the stack needs. Rootless podman needs the
  user manager for its runtime directory and for healthchecks, which podman runs
  as systemd timers that it creates itself.

## Start on boot

podman-compose itself does not start anything at boot, and `restart: always`
does not apply after a reboot. Add a user crontab line (`crontab -e`, as the
deployment user, with linger enabled). `cronie` is installed by default on Rocky 9:

```cron
@reboot XDG_RUNTIME_DIR=/run/user/$(id -u) PATH=$HOME/.local/bin:/usr/bin:/bin cd ~/freezeman/oci && podman-compose up -d
```

Cron has no `XDG_RUNTIME_DIR` and a short `PATH`, so the line sets both.
`$HOME/.local/bin` covers a pip-installed `podman-compose`.

Alternative: Quadlet (systemd units in `~/.config/containers/systemd/`), which
Podman on Rocky 9 supports. It is the method Red Hat recommends for long-running
services. See [Path to Kubernetes](README.md#path-to-kubernetes).

## Ports, SELinux and firewall

For the host nginx and the `FMS_HTTP_PORT` setting, see [Reverse proxy and TLS](README.md#reverse-proxy-and-tls).

SELinux: the host nginx needs `sudo setsebool -P httpd_can_network_connect 1` to proxy to a port.

Without a host proxy, open the port instead:
`sudo firewall-cmd --permanent --add-port=8080/tcp && sudo firewall-cmd --reload`.

## SELinux

Rocky 9 runs SELinux in enforcing mode. Named volumes, which the production stack uses,
need nothing. Bind mounts need a relabel option: `compose.dev.yaml` uses `:z`
(shared label). Use `:z` on any bind mount you add, e.g. if trigger folders
must live on a host path that other tools read:

```yaml
# compose.yaml, backend service
volumes:
  - /data/freezeman/triggers:/src/backend/triggers:z
```

The container user is `fms` (uid 1000 inside the container), which rootless
podman maps to a subordinate uid on the host. To make a host directory writable
for it: `podman unshare chown -R 1000:1000 /data/freezeman/triggers`.

## Logs

Podman's log driver is journald by default on Rocky 9: `journalctl --user CONTAINER_NAME=freezeman_backend_1`.

## Rocky 9 notes

| Topic | Where | Notes |
|---|---|---|
| `restart: always` + crontab `@reboot` | `compose.yaml` | podman-compose has no boot integration of its own, so a user crontab line starts the stack (see "Start on boot"). Prefer Quadlet units (or `podman kube play` via a `.kube` Quadlet) in the long term. |
| `migrate` failure does not block `backend` | `compose.yaml` | podman-compose treats `service_completed_successfully` as "stopped" and ignores the exit code (still true in 1.5 and 1.6). Check `podman-compose logs migrate` after each deploy. Kubernetes Jobs and Helm hooks do report failure. |
| Healthchecks | `compose.yaml` | Rootless podman runs them through systemd user timers. They need a real user session (see "Run rootless as a dedicated user"). Without one the containers never become healthy, and `up` can hang waiting on `service_healthy`. |
