# FreezeMan host prerequisites

Placeholders used in this guide:

- `<user>`: the non-root account that runs the stack with rootless podman.
- `<uid>`: the numeric ID of `<user>` (`id -u`).
- `<runtime-dir>`: the value of `XDG_RUNTIME_DIR` for `<user>`.
  Rootless podman keeps the state of the running containers there.
  The usual value is `/run/user/<uid>`.
- `<domain>`: the public host name of FreezeMan.
  It is the value of `FMS_HOST` in `.env`.
- `<HOST_HTTP_PORT>`: the value of `HOST_HTTP_PORT` in `.env`.
  It is the host port where the `web` container listens, and where the reverse proxy sends the requests.

## Host requirements

These steps need root.

- A Linux host with podman 5.4 or later.
- podman-compose 1.5 or later (the package of the OS, or `pip install podman-compose`).
- A non-root `<user>` with subuid and subgid ranges, for rootless containers.
- A `<runtime-dir>` of `<user>` that stays from boot to shutdown.
- A cron daemon, to start the stack at boot and to run the daily report.
- A reverse proxy with TLS in front of the stack (see [Reverse proxy](#reverse-proxy)).
- Outbound access, as in [Network access](#network-access).

## Set up podman without systemd

Run this section as `<user>`, after [Host requirements](#host-requirements).

1. Use the `cgroupfs` cgroup manager and the `file` event logger.
   If `~/.config/containers/containers.conf` exists, copy it to `containers.conf.bak` and merge the two keys into its `[engine]` section.

   ```bash
   mkdir -p ~/.config/containers
   cat >> ~/.config/containers/containers.conf <<'EOF'
   [engine]
   # Podman creates the cgroups (resource limits) of the containers itself.
   cgroup_manager = "cgroupfs"
   # Podman writes its events to a file.
   events_logger = "file"
   EOF
   ```

2. Set `XDG_RUNTIME_DIR` in every login shell.
   Replace the placeholder with its value.

   ```bash
   cp ~/.bash_profile ~/.bash_profile.bak
   cat >> ~/.bash_profile <<'EOF'

   # Rootless podman: a login through su or sudo does not set XDG_RUNTIME_DIR. Podman keeps the state of
   # the running containers there, so every shell of this user must use the same directory.
   # The usual value is /run/user/<uid>.
   export XDG_RUNTIME_DIR=<runtime-dir>
   EOF
   ```

   Start a new login shell and run the check:

   ```bash
   podman info --format '{{.Host.CgroupManager}}'      # cgroupfs
   ```

3. Run `podman system migrate` once:

   ```bash
   podman system migrate
   ```

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

## Reverse proxy

The `web` container listens on `127.0.0.1:<HOST_HTTP_PORT>` and speaks plain HTTP.
A reverse proxy on the host terminates TLS for `<domain>` and passes all paths to it.
The reverse proxy must:

- Pass `Host`, `X-Real-IP`, `X-Forwarded-For` and `X-Forwarded-Proto`.
  Django checks `Host` against `FMS_HOST`.
- Allow uploads of at least 50 MB and timeouts of at least 300 s.
  Larger values are safe.

nginx example, in the HTTPS server block of `<domain>`:

```nginx
client_max_body_size 50M;
client_body_timeout 300s;

location / {
    proxy_pass http://127.0.0.1:<HOST_HTTP_PORT>;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
```
