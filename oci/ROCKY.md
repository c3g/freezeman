# Rocky Linux 9.6 host: requirements for FreezeMan containers

FreezeMan does not run on this host until each item below is in place.
The FreezeMan team runs FreezeMan as user `django` with rootless podman and podman-compose.
Make the changes in "Required setup", run the "Acceptance checks" and send the output to the FreezeMan team.

## Why Podman

| | Podman | Docker CE | Apptainer |
|---|---|---|---|
| Root | Rootless, no daemon | Root daemon. The `docker` group gives root access to the host | No daemon, runs as the user |
| Source on Rocky 9 | AppStream, supported by Red Hat | Third-party repository, not shipped or supported by Red Hat | EPEL |
| Compose file, healthchecks, restart policies, private networks | Yes | Yes | No built-in support. Designed for one container per job |

Podman runs the same OCI images and compose file as Docker, and can later move to systemd (Quadlet) and Kubernetes (`podman kube`).
Podman is the smallest-risk option: it uses the Rocky packages and adds no process that runs as root.

## Summary

| # | Required | Reason |
|---|---|---|
| 1 | [Packages](#1-packages): `podman` 5.4+, `git`, `podman-compose` 1.5.0-2+ | The container engine, the compose tool and the clone tool |
| 2 | [subuid and subgid](#2-subuid-and-subgid) ranges for `django` | Rootless containers need a range of user ids |
| 3 | [Linger](#3-linger) for `django` | `sudo su - django` starts no systemd user session |
| 4 | [Persistent journal](#4-persistent-journal) (requested) | Container logs survive a reboot and `django` reads its own journal |
| 5 | [SELinux boolean](#5-selinux-boolean) `httpd_can_network_connect` set to on, SELinux stays enforcing | SELinux blocks the host nginx from connecting to port 8080 without it |
| 6 | [Host nginx](#6-host-nginx): replace the locations with one `location /` block that proxies to `127.0.0.1:8080` | The host nginx keeps TLS and sends all requests to the `web` container |
| 7 | [Firewall](#7-firewall): port 8080 closed | FreezeMan listens on `127.0.0.1:8080` only |

## Required setup

Run the commands as a user with `sudo`. Each item has a command, a check and the expected output.

### 1. Packages

Required: the container engine, the compose tool and the clone tool.

```bash
rpm -q epel-release; dnf repolist --enabled | grep -i crb     # record the output, for Undo
sudo dnf install -y podman git epel-release
sudo dnf config-manager --set-enabled crb          # EPEL packages can need CRB
sudo dnf install -y podman-compose

# Check
podman --version                                   # podman version 5.4 or later
rpm -q podman-compose                              # podman-compose-1.5.0-2 or later (1.5.0-1 lacks python3-dotenv)
```

### 2. subuid and subgid

Required: rootless containers need a range of user ids for `django`.

```bash
# Check
grep '^django:' /etc/subuid /etc/subgid            # one line in each file
```

Only if a line is missing, add a range.
Pick a free range of 65536 ids that overlaps none of the ranges in use, for example the next block after the highest existing end.
`useradd` gives the first regular user `100000-165535`. `usermod` accepts an overlapping range without error.

```bash
cat /etc/subuid /etc/subgid                        # ranges already in use
sudo usermod --add-subuids <START>-<END> --add-subgids <START>-<END> django     # for example 165536-231071

# Check
grep '^django:' /etc/subuid /etc/subgid            # one line in each file
```

### 3. Linger

Required: `sudo su - django` starts no systemd user session. Without linger, healthchecks never run and FreezeMan never starts.

```bash
sudo loginctl enable-linger django                 # no other change in /etc/systemd is necessary

# Check
loginctl show-user django -p Linger                # Linger=yes
```

Only if step 2 added a line, run as `django` (`sudo su - django`) so that podman reads the new range:

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=$XDG_RUNTIME_DIR/bus
podman system migrate                              # no output
```

### 4. Persistent journal

Podman sends container logs to journald by default.
A persistent journal keeps them after a reboot and gives `django` its own journal to read them.

```bash
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo systemctl restart systemd-journald

# Check
ls -d /var/log/journal                             # /var/log/journal
```

Another option is a log file in the home directory of `django`, which the team would have to configure and rotate.

### 5. SELinux boolean

Required: the host nginx runs in the SELinux domain `httpd_t`. With the default policy, `httpd_t` cannot connect to most TCP ports, including 8080.
Without this boolean, SELinux blocks the connection from the host nginx to the `web` container on `127.0.0.1:8080`.

```bash
sudo setsebool -P httpd_can_network_connect 1      # -P keeps the setting after a reboot
# The boolean applies to all httpd_t processes on the host, not only nginx.
# SELinux stays enforcing: do not use setenforce 0 and do not add a custom policy module.
# The containers need no SELinux change from IT. The team adds :z to the bind mounts.

# Check
getsebool httpd_can_network_connect                # httpd_can_network_connect --> on
getenforce                                         # Enforcing
ps -eZ | grep nginx                                # system_u:system_r:httpd_t:s0 ... nginx

# Diagnose, only if nginx answers 502 Bad Gateway after FreezeMan is up.
# Without the boolean, the nginx error log shows:
#   connect() to 127.0.0.1:8080 failed (13: Permission denied)
sudo ausearch -m avc -c nginx -ts recent           # <no matches> after the boolean is on
```

Port 8080 has the label `http_cache_port_t` (`semanage port -l | grep -w 8080`).
The narrower boolean `httpd_can_network_relay` can be enough for a reverse proxy to it.
This is to be tested. If nginx still gets `Permission denied`, use `httpd_can_network_connect`.

### 6. Host nginx

Required: the host nginx must proxy all requests to the `web` container. Rootless containers cannot bind ports below 1024.

What stays: the host nginx keeps ports 80 and 443, `server_name` and the TLS certificate.

What changes: the `web` container (nginx on `127.0.0.1:8080`) now serves the frontend, `/static/`, `/media/` and `/api/`.
In the `server` block of `/etc/nginx/conf.d/default.conf`, remove these directives of the current setup:

- the `location /` block with `root` and `index`
- the `location /static/`, `location /media/` and `location /api/` blocks (`alias`, `uwsgi_pass`)
- `error_page 404 /index.html`
- the `location = /favicon.ico` block (the container handles it)

Then add this one block:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    # Required. Without it, Django builds http:// links on an HTTPS site (for example the template download URLs).
    proxy_set_header X-Forwarded-Proto $scheme;
    # Same limits as the old setup (uwsgi_read_timeout 300s) and the container nginx (upload size).
    proxy_read_timeout 300s;
    client_max_body_size 100m;
}
```

```bash
sudo cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.pre-containers
# Edit the file as described above, then:
sudo nginx -t                                      # syntax is ok, test is successful
sudo systemctl reload nginx
# Until the team starts FreezeMan, nginx answers 502 Bad Gateway. This is expected.

# Check
sudo nginx -T | grep -E 'proxy_pass|X-Forwarded-Proto'     # proxy_pass http://127.0.0.1:8080; and X-Forwarded-Proto $scheme;
sudo nginx -T | grep -E 'uwsgi_pass|alias'                 # no output
```

### 7. Firewall

Required: do not open port 8080. FreezeMan listens on `127.0.0.1:8080` only.
FreezeMan binds `127.0.0.1` only, so this check is a safeguard, not a requirement for FreezeMan to work.

```bash
# Check
sudo firewall-cmd --list-all-zones | grep -n 8080  # no output
```

## Acceptance checks

Run `sudo su - django`, then run this block. The first two lines make the checks independent of the team setup.
The healthcheck test pulls `docker.io/library/alpine:3`, so the host must reach `docker.io`.

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=$XDG_RUNTIME_DIR/bus

podman --version                                   # podman version 5.4 or later
podman-compose --version                           # 1.5.0 or later
rpm -q podman-compose                              # podman-compose-1.5.0-2 or later
grep '^django:' /etc/subuid /etc/subgid            # one line in each file
loginctl show-user django -p Linger                # Linger=yes
systemctl --user is-system-running                 # running or degraded (not a bus error)
podman info --format '{{.Host.CgroupManager}}'     # systemd
podman info --format '{{.Host.NetworkBackend}}'    # netavark
podman info --format '{{.Host.LogDriver}}'         # journald
ls -d /var/log/journal                             # /var/log/journal
getsebool httpd_can_network_connect                # httpd_can_network_connect --> on

# Healthchecks need the systemd user manager
podman run -d --name hc-test --health-cmd true --health-interval 5s docker.io/library/alpine:3 sleep 60
sleep 10
podman inspect --format '{{.State.Health.Status}}' hc-test      # healthy
podman rm -f hc-test
```

Also run as a user with `sudo`:

```bash
sudo nginx -t                                      # syntax is ok, test is successful
sudo firewall-cmd --list-all-zones | grep -n 8080  # no output
```

## Undo

| Item | Undo command |
|---|---|
| 1. Packages | `sudo dnf remove podman podman-compose epel-release`, `sudo dnf config-manager --set-disabled crb`. Run them only if they were not present before step 1 |
| 2. subuid and subgid | `sudo usermod --del-subuids <START>-<END> --del-subgids <START>-<END> django`, with the range added in step 2 |
| 3. Linger | `sudo loginctl disable-linger django` |
| 4. Persistent journal | `sudo rm -r /var/log/journal && sudo systemctl restart systemd-journald`. This deletes the stored journal of the host. Ask the log owners first |
| 5. SELinux boolean | `sudo setsebool -P httpd_can_network_connect 0` |
| 6. Host nginx | `sudo cp /etc/nginx/conf.d/default.conf.pre-containers /etc/nginx/conf.d/default.conf && sudo systemctl reload nginx` |
| 7. Firewall | No change to undo |
