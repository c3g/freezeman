# FreezeMan host prerequisites

The host administrator prepares the host before the [deployment](DEPLOYMENT.md).

Placeholders used in this guide:

- `<user>`: the non-root account that runs the stack with rootless podman.
- `<uid>`: the numeric ID of `<user>` (`id -u`).
- `<runtime-dir>`: the value of `XDG_RUNTIME_DIR` for `<user>`.
  Rootless podman keeps the state of the running containers there.
  The usual value is `/run/user/<uid>`.

## Host requirements

These steps need root.

- A Linux host with podman 5.4 or later.
- podman-compose 1.5 or later (the package of the OS, or `pip install podman-compose`).
- A non-root `<user>` with subuid and subgid ranges, for rootless containers.
- A `<runtime-dir>` of `<user>` that stays from boot to shutdown.
- A cron daemon, to start the stack at boot and to run the daily report.
- A reverse proxy with TLS in front of the stack (see ["Reverse proxy" in DEPLOYMENT.md](DEPLOYMENT.md#reverse-proxy)).
- Outbound access, as in [Network access](#network-access).

## Network access

Summary:

- Podman image pulls and builds: requires outbound ports 80 and 443 to the domains in the table below.
- Running stack: only requires outbound `FMS_EMAIL_PORT` to `FMS_EMAIL_HOST`.
  The stack opens no inbound port (the `web` port binds to `127.0.0.1`).

If the host uses a proxy or a firewall with an allow list, allow these domains for outbound traffic:

| Domain | Port | Used by |
|---|---|---|
| The package repositories of the host OS | 443 or 80 | Installation of `podman`, `podman-compose` and a cron daemon |
| `pypi.org`, `files.pythonhosted.org` | 443 | `pip install podman-compose`, only if the OS gives no `podman-compose` |
| `github.com` | 443 | `git clone --recurse-submodules` of the source and its submodules. |
| `registry-1.docker.io`, `auth.docker.io`, `production.cloudfront.docker.com` | 443 | Image pulls (`docker.io/library/python`, `docker.io/library/node`, `docker.io/library/postgres`, `docker.io/nginxinc/nginx-unprivileged`) |
| `production.cloudflare.docker.com`, `*.r2.cloudflarestorage.com` | 443 | Docker Hub can serve image layers from this CDN instead of `production.cloudfront.docker.com` |
| `deb.debian.org` | 80 | Image builds: `apt-get` in the Debian trixie stages (also `debian-security`) |
| `apt.postgresql.org` | 80 | Image build of `db`: `postgresql-server-dev` from the PostgreSQL repository of the `postgres` image |
| `pypi.org`, `files.pythonhosted.org` | 443 | Image builds: Python packages of `backend/requirements.txt` and `uwsgi` |
| `registry.npmjs.org` | 443 | Image build of `web`: `npm ci` for the frontend |
| The value of `FMS_EMAIL_HOST` | The value of `FMS_EMAIL_PORT` | Django email, only if `FMS_EMAIL_HOST` is set |
