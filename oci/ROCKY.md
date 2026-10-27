# Rocky Linux 9.6 host: requirements for FreezeMan containers

FreezeMan does not run on this host until each item below is in place.
The FreezeMan team runs FreezeMan as user `django` with rootless podman and podman-compose.
This file lists only the steps that need root. IT installs `podman` and `podman-compose` and prepares the host.
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
| 1 | [Packages](#1-packages): `podman` 5.4+ and `podman-compose` 1.5 | The container engine and the tool that starts the compose file |
| 2 | [subuid and subgid](#2-subuid-and-subgid) ranges for `django` | Rootless containers need a range of user ids |
| 3 | [Linger](#3-linger) for `django` | systemd-logind deletes `/run/user/<uid>` at the last logout of `django`, and podman keeps the state of the running containers there |
| 4 | [Cron daemon](#4-cron-daemon) (`cronie`) | The `@reboot` line in the crontab of `django` starts the stack at boot |
| 5 | [Host nginx](#5-host-nginx): HTTP location and upload limits | The host nginx passes HTTP to the `web` container on `127.0.0.1:8080` |

## Required setup

Run the commands as a user with `sudo`. Each item has a command, a check and the expected output.

### 1. Packages

Required: the container engine (`podman`, from AppStream) and `podman-compose` (from EPEL 9, which needs the CRB repository).

```bash
rpm -q podman podman-compose epel-release          # record the output, for Undo
sudo dnf install -y epel-release
sudo crb enable
sudo dnf install -y podman podman-compose

# Check
podman --version                                   # podman version 5.4 or later
podman-compose --version                           # podman-compose version 1.5 or later
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

Required: `/run/user/<uid>` of `django` must exist from boot to shutdown. Rootless podman keeps the state of the running containers in this directory. systemd-logind creates it at the first login of `django` and deletes it when the last login session closes. Without linger, a logout of `django` (for example the end of an `ssh` session) deletes the state under the running containers, and podman can then not manage them. Linger tells logind to keep the directory without a login. It also creates the directory at boot, so the `@reboot` job of `django` finds it. This is a rule of logind on this host. Podman itself needs no systemd.

```bash
sudo loginctl enable-linger django                 # no other change in /etc/systemd is necessary

# Check
loginctl show-user django -p Linger                # Linger=yes
```

### 4. Cron daemon

Required: a cron daemon, so `django` can run a `@reboot` line from its crontab. It needs no root for `django`. The default Rocky installation has `cronie`.

```bash
sudo dnf install -y cronie                         # only if the check below fails
sudo systemctl enable --now crond

# Check
rpm -q cronie                                      # cronie-<version>
systemctl is-active crond                          # active
```

The team runs `podman system migrate` after this, and sets up the boot start (see [README.md](README.md)).

### 5. Host nginx

Required: the HTTP server block passes requests to the `web` container, which listens on `127.0.0.1:8080`. HTTPS stays on the classic FreezeMan.

The `location /` block is done (IT added it):

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
```

In the same HTTP server block, set the limits that the HTTPS block has. Without them, an upload over 1 MB fails with 413:

```nginx
client_max_body_size 50M;
client_body_timeout 300s;
```

```bash
# Check
sudo nginx -T | grep -A3 'proxy_pass http://127.0.0.1:8080'
sudo nginx -T | grep client_max_body_size
```

## SELinux

SELinux is disabled on this host. No SELinux change is necessary now. If IT enables SELinux later, run
`sudo setsebool -P httpd_can_network_connect 1`: the host nginx connects to port 8080. The `:z` bind mounts of the stack then relabel the container directories.

## Acceptance checks

Run `sudo su - django`, then run this block.

```bash
podman --version                                   # podman version 5.4 or later
podman-compose --version                           # podman-compose version 1.5 or later
grep '^django:' /etc/subuid /etc/subgid            # one line in each file
loginctl show-user django -p Linger                # Linger=yes
rpm -q cronie                                      # cronie-<version>
systemctl is-active crond                          # active
podman info --format '{{.Host.NetworkBackend}}'    # netavark
getenforce                                         # Disabled
sudo nginx -T | grep -A3 'proxy_pass http://127.0.0.1:8080'
sudo nginx -T | grep client_max_body_size          # 50M
```

After the team starts the stack, run:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/     # 200
```

## Undo

| Item | Undo command |
|---|---|
| 1. Packages | `sudo dnf remove podman-compose`, and `sudo dnf remove podman` only if `podman` was not present before step 1. Run `sudo dnf remove epel-release` and `sudo crb disable` only if step 1 added them and no other package needs them |
| 2. subuid and subgid | `sudo usermod --del-subuids <START>-<END> --del-subgids <START>-<END> django`, with the range added in step 2 |
| 3. Linger | `sudo loginctl disable-linger django` |
| 4. Cron daemon | `sudo systemctl disable --now crond` and `sudo dnf remove cronie`, only if step 4 installed `cronie` and no other job needs it |
| 5. Host nginx | Remove the `location /` block (and the limits that step 5 added) from the HTTP server block, then `sudo nginx -t && sudo systemctl reload nginx` |
