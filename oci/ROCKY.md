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
| 5 | [Host nginx](#5-host-nginx): `location /` and upload limits in the HTTPS server block | The host nginx passes the requests to the `web` container on `127.0.0.1:8080`. The FreezeMan team cannot change nginx |
| 6 | [Network access](#6-network-access): outbound HTTPS and HTTP to the listed domains | The host installs packages, clones the source, pulls images and builds them |

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

The team runs `podman system migrate` after this, and sets up the boot start (see [DEPLOYMENT.md](DEPLOYMENT.md)).

### 5. Host nginx

Required: the HTTPS server block of the FreezeMan domain passes requests to the `web` container, which listens on `127.0.0.1:8080`.

IT owns the host nginx. The FreezeMan team has no `sudo` and cannot read or change the nginx configuration. The team gives IT the domain and the port (`FMS_HOST` and `FMS_HTTP_PORT` in `.env`), and asks IT for each change below.

Before a change, keep a copy of the server block. The undo and the return to the classic setup restore this copy.

There are two cases:

- New domain for the containers: the classic FreezeMan keeps its own domain. Do the steps now.
- Migration of the classic FreezeMan to the containers on the same domain ([Path A](DEPLOYMENT.md#path-a-migrate-from-the-classic-host)): the classic server block becomes the container server block. Do the steps at the cutover, when the FreezeMan team asks. Until then, the classic setup serves the site.

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

In the same HTTPS server block, set these limits. Without them, an upload over 1 MB fails with 413:

```nginx
client_max_body_size 50M;
client_body_timeout 300s;
```

For a migration on the same domain, the new `location /` replaces the classic `location /`. Also remove these classic locations. The `web` container serves these paths:

```nginx
location /static/ {
    alias /data/freezeman/backend/staticfiles/;
}

location /media/ {
    alias /data/freezeman/backend/media/;
}

location /api/ {
    include uwsgi_params;
    uwsgi_pass unix:/data/freezeman/backend/fms.sock;
    uwsgi_read_timeout 300s;
}
```

Apply the change:

```bash
sudo nginx -t && sudo systemctl reload nginx

# Check
sudo nginx -T | grep -A3 'proxy_pass http://127.0.0.1:8080'
sudo nginx -T | grep client_max_body_size          # 50M
sudo nginx -T | grep -c 'fms.sock'                 # 0, after a migration on the same domain
```

After a change, send the output of the checks to the FreezeMan team.

### 6. Network access

Required: if the host uses a proxy or a firewall with an allow list, allow these domains for outbound traffic. If the host has open outbound access, no change is necessary.

| Domain | Port | Used by |
|---|---|---|
| `mirrors.rockylinux.org`, `dl.rockylinux.org` (and the mirror that the mirror list returns) | 443 | Step 1 and step 4: `dnf` (Rocky BaseOS, AppStream and CRB) |
| `mirrors.fedoraproject.org`, `dl.fedoraproject.org` (and the mirror that the metalink returns) | 443 | Step 1: `dnf` (EPEL 9, for `podman-compose`) |
| `pypi.org`, `files.pythonhosted.org` | 443 | `pip install podman-compose==1.5.0`, only if `dnf` gives no `podman-compose` |
| `github.com` | 443 | `git clone --recurse-submodules` of the source and its submodules. `autoupdate.py` (QC only) also uses it |
| `registry-1.docker.io`, `auth.docker.io`, `production.cloudfront.docker.com` | 443 | Image pulls (`docker.io/library/python`, `docker.io/library/node`, `docker.io/library/postgres`, `docker.io/nginxinc/nginx-unprivileged`) |
| `production.cloudflare.docker.com`, `*.r2.cloudflarestorage.com` | 443 | Docker Hub can serve image layers from this CDN instead of `production.cloudfront.docker.com`. The test of the FreezeMan team did not use it |
| `deb.debian.org` | 80 | Image builds: `apt-get` in the Debian trixie stages (also `debian-security`) |
| `apt.postgresql.org` | 80 | Image build of `db`: `postgresql-server-dev` from the PostgreSQL repository of the `postgres` image |
| `pypi.org`, `files.pythonhosted.org` | 443 | Image builds: Python packages of `backend/requirements.txt` and `uwsgi` |
| `registry.npmjs.org` | 443 | Image build of `web`: `npm ci` for the frontend |
| The value of `FMS_EMAIL_HOST` (for example `smtp.office365.com`) | The value of `FMS_EMAIL_PORT` (for example 587) | Failure emails and Django email, only if `FMS_EMAIL_HOST` is set |

- The FreezeMan team measured the rows for `github.com`, the image pulls, `deb.debian.org`, `apt.postgresql.org`, `pypi.org` and `registry.npmjs.org` with a full build and start of the stack. The team did not measure the `dnf` rows, because the test host did not run Rocky. They come from the repository lists of Rocky and EPEL.
- The mirror lists of Rocky and EPEL send `dnf` to a third-party mirror. If the allow list cannot take it, set a fixed `baseurl` in the repository file or use a local mirror.
- Docker Hub serves the image layers from a CDN. Allow the CDN domains, or the pull fails after the login.
- The build needs the domains. The running stack needs only `FMS_EMAIL_HOST` and no other outbound connection.
- All traffic is outbound. The stack opens no inbound port (the `web` port binds to `127.0.0.1`).

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
| 5. Host nginx | Restore the copy of the server block that step 5 kept (for a migration on the same domain, this brings back the classic `/`, `/static/`, `/media/` and `/api/`), then `sudo nginx -t && sudo systemctl reload nginx` |
| 6. Network access | Remove the domains from the allow list |
