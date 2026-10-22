# FreezeMan containers on Rocky Linux 9

## Contents

- [Purpose and summary](#purpose-and-summary)
- [Container tools](#container-tools)
- [Host changes and reasons](#host-changes-and-reasons)
  - [subuid and subgid](#subuid-and-subgid)
  - [Linger and the user manager](#linger-and-the-user-manager)
  - [Ports, SELinux and firewall](#ports-selinux-and-firewall)
- [The `django` user and `sudo su - django`](#the-django-user-and-sudo-su---django)
- [Install](#install)
- [Logs](#logs)
- [Ready to continue: checklist](#ready-to-continue-checklist)

## Purpose and summary

This file prepares a Rocky Linux 9 host to run FreezeMan in rootless containers. Each host change has a
reason and an undo command. When the checklist passes, continue with [README.md](README.md).

| Change | Needs root | Reason | Undo |
|---|---|---|---|
| Install `podman` and `git` (AppStream) | yes | The container engine | `sudo dnf remove podman` |
| Enable EPEL and CRB | yes | `podman-compose` is in EPEL, and EPEL packages can need CRB | `sudo dnf config-manager --set-disabled crb`, `sudo dnf remove epel-release` |
| Install `podman-compose` | yes (no with `pip`) | Starts the group of containers from one file | `sudo dnf remove podman-compose` (or `pip3 uninstall podman-compose`) |
| Check `/etc/subuid` and `/etc/subgid` for `django` | yes, only to add | Rootless containers need a range of user ids | `sudo usermod --del-subuids 100000-165535 --del-subgids 100000-165535 django` |
| `sudo loginctl enable-linger django` | yes | Keeps the systemd user manager of `django` running | `sudo loginctl disable-linger django` |
| Two lines in `~django/.bash_profile` | no (as `django`) | Point podman to the user manager under `sudo su - django` and cron | Restore the backup of the file |
| Persistent journal: `/var/log/journal` | yes | Keeps container logs (`journald` log driver) after a reboot and gives `django` its own journal | `sudo rm -r /var/log/journal && sudo systemctl restart systemd-journald` (deletes the stored journal) |
| `sudo setsebool -P httpd_can_network_connect 1` | yes | Lets the host nginx proxy to the container port | `sudo setsebool -P httpd_can_network_connect 0` |
| Host nginx: replace the `location` blocks with one `location /` | yes | Sends requests to the `web` container | Restore the old nginx configuration |
| Directory `/data/freezeman/backups` | no (as `django`), if `django` can write in `/data/freezeman` | The `backup` service writes the daily dumps here | `rmdir /data/freezeman/backups` |

## Container tools

- **Podman** has no central daemon. Each container is a process of the user who starts it.
- **Rootless**: the containers run as `django`, not as root. Root inside a container is `django` on the
  host. The other users inside a container (for example `fms`, uid 1000) map to the range in
  `/etc/subuid`.
- **podman-compose** reads `compose.yaml` and starts the stack with one command, for example
  `podman-compose up -d`.

How the classic setup of `DEPLOYMENT.md` maps to containers:

| Today | Container stack |
|---|---|
| uwsgi and Django on the host | `backend` |
| nginx for the frontend, static files and media | `web` (listens on port 8080) |
| PostgreSQL 15 on the host | `db` (data in the named volume `pgdata`) |
| crontab with `prepare_report_data` | `report` service |
| `pg_dump` by hand | `backup` service (daily `pg_dumpall`) |
| Host nginx with TLS | stays, and proxies to port 8080 |

## Host changes and reasons

### subuid and subgid

A rootless container needs a range of user ids that `django` may use. `/etc/subuid` and `/etc/subgid`
define it. Users created with `useradd` get the ranges automatically. Check:

```bash
grep django /etc/subuid /etc/subgid
```

Older accounts may have no entry. Then add it, and tell podman to read it again (as `django`):

```bash
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 django
podman system migrate
```

### Linger and the user manager

Rootless podman needs the systemd user manager of `django` (`user@<uid>.service`). Containers stop when
the last session of `django` ends, unless linger is on. See
[The `django` user and `sudo su - django`](#the-django-user-and-sudo-su---django) for the reason and the command.

### Ports, SELinux and firewall

For the host nginx and the `FMS_HTTP_PORT` setting, see [Reverse proxy and TLS](README.md#reverse-proxy-and-tls).

Rootless containers cannot bind ports below 1024. The `web` container listens on port 8080. The host
nginx keeps ports 80 and 443 and the TLS certificate.

SELinux: the host nginx needs `sudo setsebool -P httpd_can_network_connect 1` to proxy to a port.
Without it, SELinux blocks the connection from nginx to port 8080. The `-P` option keeps the setting
after a reboot.

Without a host proxy, open the port instead:
`sudo firewall-cmd --permanent --add-port=8080/tcp && sudo firewall-cmd --reload`.
With a host proxy, do not open port 8080 to the network. Set `FMS_HTTP_PORT=127.0.0.1:8080` in `.env`,
so the port listens on loopback only.

Undo: `sudo firewall-cmd --permanent --remove-port=8080/tcp && sudo firewall-cmd --reload`.

## The `django` user and `sudo su - django`

The FreezeMan team works as `django` with `sudo su - django`. Rootless podman does not work with it out of the
box. Two small settings fix this.

**The problem.** `su` changes the user, but it does not start a login session in systemd-logind. So
`django` has no user manager (`user@<uid>.service`), no `/run/user/<uid>`, no user D-Bus, and
`XDG_RUNTIME_DIR` is not set. Effects on podman-compose:

- Podman runs healthchecks as systemd user timers (`systemd-run --user`), which it creates itself.
  Without the user manager they never run. `db`, `backend` and `web` never become healthy, and
  `podman-compose up` waits forever on `service_healthy`.
- Podman falls back to the `cgroupfs` cgroup manager and writes its runtime files outside `/run/user/<uid>`.
- Rootless containers stop when the last session of `django` ends, unless linger is on.

**What must be in place:**

1. subuid and subgid ranges for `django` (see [above](#subuid-and-subgid)).
2. Linger. It starts `user@<uid>.service` at boot and keeps it running without a login. It creates
   `/run/user/<uid>` and the user D-Bus.
   ```bash
   sudo loginctl enable-linger django
   ```
3. In the shell of `django`: `XDG_RUNTIME_DIR=/run/user/<uid>` and
   `DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/<uid>/bus`.

No package install and no change in `/etc/systemd` is necessary for `systemctl --user`. Linger plus the
two variables is all.

**The fix for the variables.** Back up `~/.bash_profile`, then add these lines at the end (as `django`):

```bash
cp ~/.bash_profile ~/.bash_profile.bak
cat >> ~/.bash_profile <<'EOF'

# Rootless podman: `sudo su - django` and cron start no systemd user session.
# Linger keeps the user manager running. These lines point podman at it.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=${XDG_RUNTIME_DIR}/bus}"
EOF
```

The lines set a variable only when it is empty. A real login (`ssh`) keeps the values from logind.

This also covers cron jobs that use `bash --login -c`, which reads `~/.bash_profile`.

**Checks** (after `sudo su - django`, with a new login shell):

```bash
loginctl show-user django -p Linger                  # Linger=yes
systemctl --user is-system-running                   # running or degraded (not a bus error)
podman info --format '{{.Host.CgroupManager}}'       # systemd
podman info --format '{{.Host.NetworkBackend}}'      # netavark
```

Healthcheck test (needs the packages from [Install](#install)). The container must report `healthy`:

```bash
podman run -d --name hc-test --health-cmd true --health-interval 5s docker.io/library/alpine:3 sleep 60
sleep 10
podman inspect --format '{{.State.Health.Status}}' hc-test      # healthy
podman rm -f hc-test
```

**Alternatives without a system change:** `ssh django@host` starts a real session, so the exports are not
necessary (they do no harm). `sudo machinectl shell django@` also works, but needs the package
`systemd-container`.

## Install

Run these commands as a user with `sudo`. Each line has its reason.

```bash
# git clones the repository. podman runs the containers (minimum: podman 5.4).
sudo dnf install -y podman git
# podman-compose is not in the base repositories. EPEL has it
# (EPEL packages may depend on CRB, which Rocky ships disabled).
# Minimum: podman-compose 1.5.0-2 (1.5.0-1 lacks python3-dotenv).
sudo dnf install -y epel-release
sudo dnf config-manager --set-enabled crb
sudo dnf install -y podman-compose
podman --version                                  # 5.4 or later
podman-compose --version                          # 1.5.0 or later
podman info --format '{{.Host.NetworkBackend}}'   # should print netavark
```

If the EPEL podman-compose is too old or broken, install the current release for `django` only. This
changes no system Python package:

```bash
sudo dnf remove -y podman-compose
sudo dnf install -y python3-pip
# run as django:
pip3 install --user podman-compose
```

Then, as `django` (after `sudo su - django`, with the lines in `~/.bash_profile` and linger from the
previous section):

1. On production, FreezeMan is cloned at `/data/freezeman` (submodules included), so the stack files are in
   `/data/freezeman/oci`. A new host needs a real clone with a `.git` directory.
   See [Prerequisites](README.md#prerequisites) for the submodules, `.git` and `.env` details.
2. Create the backup directory. Podman does not create a missing bind-mount source. Then set
   `FMS_BACKUP_DIR=/data/freezeman/backups` in `.env` (see [Database backups](README.md#database-backups)):
   ```bash
   mkdir -p /data/freezeman/backups
   ```
3. Configure the logs (see [Logs](#logs)).

## Logs

Podman uses the `journald` log driver by default. `podman logs` and `podman-compose logs` read it, and
the host journal handles rotation. With persistent storage, journald keeps a journal for each user, so
`django` can read its own container logs. With a volatile journal (only `/run/log/journal`), `django`
sees no logs. Check as `django`, and create the directory as a user with `sudo` if it is missing:

```bash
ls -d /var/log/journal
sudo mkdir -p /var/log/journal && sudo systemctl restart systemd-journald
podman info --format '{{.Host.LogDriver}}'                 # journald
journalctl --user CONTAINER_NAME=freezeman_backend_1       # logs of one container
```

A container keeps the log driver it had at creation. If the containers exist already, recreate them once:

```bash
cd /data/freezeman/oci && podman-compose up -d --force-recreate
```

The journal limits (for example `SystemMaxUse`) are in `/etc/systemd/journald.conf` and apply to the
whole host.

Undo: `sudo rm -r /var/log/journal && sudo systemctl restart systemd-journald`. This deletes the stored
journal of the host. Ask the team that reads the logs first.

## Ready to continue: checklist

Run these checks as `django`. If all pass, continue with [README.md](README.md). Read it from the top, then
follow "Prerequisites" and "Production-like stack".

- `podman --version` prints 5.4 or later. `podman-compose --version` prints 1.5.0 or later.
- `grep django /etc/subuid /etc/subgid` prints one line for each file.
- `loginctl show-user django -p Linger` prints `Linger=yes`. `systemctl --user is-system-running`
  prints `running` or `degraded`.
- `podman info --format '{{.Host.CgroupManager}}'` prints `systemd`. The network backend is `netavark`.
- The healthcheck test container reaches `healthy`.
- If a host nginx proxies to the stack: `getsebool httpd_can_network_connect` prints `on`, and port
  8080 is not open to the network (`FMS_HTTP_PORT=127.0.0.1:8080`).
- `/var/log/journal` exists. `podman info --format '{{.Host.LogDriver}}'` prints `journald`.
- `/data/freezeman/backups` exists and `django` can write in it.
- You know the start method: start the stack by hand as `django` after each reboot
  (`podman-compose up -d`).
