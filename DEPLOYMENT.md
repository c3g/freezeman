# FreezeMan deployment

This guide tells you how to deploy FreezeMan as containers: the [initial deployment](#initial-deployment) of a host, the [routine deployments](#routine-deployments) of each release, and the steps of [specific deployments](#specific-deployments) for some releases.

Placeholders used in this guide:

- `<user>`: the non-root account that runs the stack with rootless podman.
- `<uid>`: the numeric ID of `<user>` (`id -u`).
- `<runtime-dir>`: the value of `XDG_RUNTIME_DIR` for `<user>`. Rootless podman keeps the state of the running containers there. The usual value is `/run/user/<uid>`.
- `<install-dir>`: the absolute path of the FreezeMan checkout for the stack.
- `<domain>`: the public host name of FreezeMan. It is the value of `FMS_HOST` in `.env`.
- `<HOST_LOG_DIR>`: the value of `HOST_LOG_DIR` in `.env`.
- `<HOST_HTTP_PORT>`: the value of `HOST_HTTP_PORT` in `.env`. It is the host port where the `web` container listens, and where the reverse proxy sends the requests.
- `<POSTGRES_USER>`, `<POSTGRES_DB>`: the values of `POSTGRES_USER` and `POSTGRES_DB` in `.env`.
- `<YYYY-MM-DD>`: the date in the name of a database backup file.

Before you run `podman-compose` commands, set the compose file in the current shell: `export COMPOSE_FILE=<install-dir>/oci/compose.yaml`. podman-compose then works in any directory. It reads `.env` from the directory of the compose file.

Contents:

- [Quick start](#quick-start)
- [Initial deployment](#initial-deployment)
  - [Host requirements](#host-requirements)
  - [Network access](#network-access)
  - [Checkout](#checkout)
  - [Set up the account of the user](#set-up-the-account-of-the-user)
  - [Configure .env](#configure-env)
  - [Build the images](#build-the-images)
  - [Start the database](#start-the-database)
  - [Reverse proxy](#reverse-proxy)
  - [Start at boot](#start-at-boot)
  - [Daily report](#daily-report)
- [Routine deployments](#routine-deployments)
  - [Start, stop and restart](#start-stop-and-restart)
  - [Update to a new release](#update-to-a-new-release)
  - [Database backups](#database-backups)
  - [Keep the base images up to date](#keep-the-base-images-up-to-date)
  - [Report and logs](#report-and-logs)
- [Specific deployments](#specific-deployments)
- [Additional information](#additional-information)
  - [Proxy](#proxy)
  - [Troubleshooting](#troubleshooting)

# Quick start

The short install procedure for a new host. Each step links to its detailed section below.

Before you start, the host must meet [Host requirements](#host-requirements) and [Network access](#network-access), and `<user>` must be set up ([Set up the account of the user](#set-up-the-account-of-the-user)). On a host with an HTTP proxy, see [Proxy](#proxy).

Run these commands as `<user>`:

```bash
# Checkout
git clone https://github.com/c3g/freezeman <install-dir>
cd <install-dir>
git checkout vX.Y.Z
git config url."https://github.com/".insteadOf "git://github.com/"
git submodule update --init --recursive

# Configure .env: copy the template, then personalize oci/.env (see the comments in the file)
cp oci/.env.prod.example oci/.env

# Build the images
export COMPOSE_FILE=<install-dir>/oci/compose.yaml
podman-compose build

# Start the database
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U <POSTGRES_USER> -d <POSTGRES_DB>; do sleep 2; done
podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
podman-compose up -d
```

Then:

1. Set up the [Reverse proxy](#reverse-proxy).
2. Add the crontab lines of [Start at boot](#start-at-boot) and [Daily report](#daily-report).

To keep the data of a version earlier than 6.0.0, do the optional step of [Start the database](#start-the-database).

# Initial deployment

The services of the stack are in [Production services](oci/README.md#production-services).

## Host requirements

These steps need root.

- A Linux host with podman 5.4 or later.
- podman-compose 1.5 or later (the package of the OS, or `pip install podman-compose`).
- A non-root `<user>` with subuid and subgid ranges, for rootless containers.
- A `<runtime-dir>` of `<user>` that stays from boot to shutdown. With systemd, enable linger for `<user>` (`loginctl enable-linger <user>`).
- A cron daemon, to start the stack at boot and to run the daily report.
- A reverse proxy with TLS in front of the stack (see [Reverse proxy](#reverse-proxy)).
- Outbound access, as in [Network access](#network-access).

## Network access

Summary:

- Install and update: outbound ports 80 and 443 to the domains below.
- Running stack: outbound `FMS_EMAIL_PORT` to `FMS_EMAIL_HOST` only. The stack opens no inbound port (the `web` port binds to `127.0.0.1`).
- Email: if the host cannot reach `FMS_EMAIL_HOST` on `FMS_EMAIL_PORT`, Django cannot send emails, so users get no password reset emails. To log the emails to the console instead, comment out all `FMS_EMAIL_*` variables in `.env`.

If the host uses a proxy or a firewall with an allow list, allow these domains for outbound traffic.
Only podman image pulls and builds use the proxy. The running services do not.

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

Docker Hub serves the image layers from a CDN. Allow the CDN domains, or the pull fails after the login.

## Checkout

Run these steps as `<user>`.

1. Follow [Installation](README.md#installation) in the root README.md. Clone into `<install-dir>`.
2. Check out the release that you deploy (`git checkout vX.Y.Z`).

## Set up the account of the user

Run these steps as `<user>`.

1. Set up podman without systemd.

   a. Use the `cgroupfs` cgroup manager and the `file` event logger. If `~/.config/containers/containers.conf` exists, copy it to `containers.conf.bak` and merge the two keys into its `[engine]` section.

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

   b. Set `XDG_RUNTIME_DIR` in every login shell. Replace the placeholder with its value.

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

2. Run `podman system migrate` once:

   ```bash
   podman system migrate
   ```

## Configure .env

Run these steps as `<user>`.

```bash
cp <install-dir>/oci/.env.prod.example <install-dir>/oci/.env
```

`.env.prod.example` is a template. Personalize `.env` before the first start. The comments in the file explain each value. To keep the files of a version earlier than 6.0.0, set the `HOST_*_DIR` folders to the folders of the old install.

The effect of each `FMS_ENV` value is in [FMS_ENV values](oci/README.md#fms_env-values).

## Build the images

Run this step as `<user>`.

```bash
podman-compose build
```

**Proxy host:** this command needs the proxy. See [Proxy](#proxy).

## Start the database

Run these steps as `<user>`. Nothing applies migrations automatically.

1. Start only `db`, and wait until it is ready:

   ```bash
   podman-compose up -d db
   until podman-compose exec db pg_isready -h 127.0.0.1 -U <POSTGRES_USER> -d <POSTGRES_DB>; do sleep 2; done
   ```

2. Optional. To keep the data of a version earlier than 6.0.0, stop the old uwsgi, create a database backup file of the old database, and restore it into `db`. The message "extension fzy already exists" is harmless.

   ```bash
   pg_dump -U postgres -Fc fms > fms_old.backup   # on the old PostgreSQL server
   podman-compose exec -T db pg_restore -U <POSTGRES_USER> -d <POSTGRES_DB> --no-owner --no-acl < fms_old.backup
   ```

   Then remove the daily report line of the old version from the crontab of its user.

3. Apply the migrations in a one-off `backend` container, then start the stack:

   ```bash
   podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
   podman-compose up -d
   curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:<HOST_HTTP_PORT>/  # 200
   ```

4. Set up the [Reverse proxy](#reverse-proxy), then check the site through it:

   ```bash
   curl -sfo /dev/null -w '%{http_code}\n' https://<domain>/                   # 200
   ```

## Reverse proxy

The `web` container listens on `127.0.0.1:<HOST_HTTP_PORT>` and speaks plain HTTP. A reverse proxy on the host terminates TLS for `<domain>` and passes all paths to it. The reverse proxy must:

- Pass `Host`, `X-Real-IP`, `X-Forwarded-For` and `X-Forwarded-Proto`. Django checks `Host` against `FMS_HOST`.
- Allow uploads of at least 50 MB and timeouts of at least 300 s. Larger values are safe.

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

Other reverse proxies need the same settings.

If the reverse proxy served a version earlier than 6.0.0, replace its old `location` blocks (`/`, `/static/`, `/media/`, `/api/`) with the block above. The `web` container serves all these paths.

## Start at boot

Run this step as `<user>`, after the first start works. Add these lines to the crontab (`crontab -e`):

```cron
XDG_RUNTIME_DIR=<runtime-dir>
PATH=<podman-compose-dir>:/usr/bin:/bin
@reboot cd <install-dir>/oci && podman-compose up -d >> <HOST_LOG_DIR>/boot.log 2>&1
```

- Cron does not set `XDG_RUNTIME_DIR`, and its `PATH` is short. Put the two variable lines at the top of the crontab. `<podman-compose-dir>` is the directory of `command -v podman-compose` (for example `/home/<user>/.local/bin`).
- `podman-compose` reads `.env` in `oci/`.

## Daily report

Run this step as `<user>`, after the first start works. FreezeMan needs a daily run of `prepare_report_data`, the command that prepares the data of the reports. Host cron must call it in the running `backend` container. Add this line to the crontab (`crontab -e`), below the `XDG_RUNTIME_DIR` line of [Start at boot](#start-at-boot):

```cron
0 1 * * * cd <install-dir>/oci && podman-compose exec -T backend python manage.py prepare_report_data >> <HOST_LOG_DIR>/report.log 2>&1
```

- Cron uses the time zone of the host.
- `-T`: cron has no terminal.
- `prepare_report_data` writes its own log to `<HOST_LOG_DIR>/report_preparation.log`.

# Routine deployments

## Start, stop and restart

Use `--force-recreate` after a build or an `.env` change.

| Command | When to use it |
|---|---|
| `podman-compose up -d` | Start the stack. |
| `podman-compose down` | Stop the stack and remove the containers. The volumes and the log files stay. |
| `podman-compose restart backend` | Restart the process of one service in the same container. The image and the `.env` do not change. Use it for a hung service. |
| `podman-compose up -d --force-recreate` | Replace the containers with new ones from the current images and `.env`. Use it after a build or an `.env` change. |

## Update to a new release

Run these steps as `<user>`. Test the release on a test host first.

1. Back up the database, as in [Database backups](#database-backups).
2. Check out the release, and set its version in `.env`. `FMS_IMAGE_TAG` is the value in the `VERSION` file.

   ```bash
   cd <install-dir>
   git fetch && git checkout vX.Y.Z
   git submodule update --init --recursive
   sed -i "s/^FMS_IMAGE_TAG=.*/FMS_IMAGE_TAG=$(cat VERSION)/" oci/.env
   ```

3. Build the images. **Proxy host:** this command needs the proxy. See [Proxy](#proxy).

   ```bash
   podman-compose build
   ```

4. Stop `web` and `backend`, apply the migrations, then start the stack with the new images:

   ```bash
   podman-compose stop web backend
   podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
   podman-compose up -d --force-recreate
   ```

If the build fails, the old containers keep running. Set `FMS_IMAGE_TAG` back to the old version. If the migration fails, the stack stays down.

## Database backups

The stack has no automatic backup yet. To create a database backup file of all databases now, run this command while `db` runs. `pg_dumpall` copies the roles too:

```bash
mkdir -p <install-dir>/oci/backups
# -T: no pseudo-TTY, which would turn the line endings of the backup file into CRLF.
podman-compose exec -T db pg_dumpall -U <POSTGRES_USER> | gzip > <install-dir>/oci/backups/$(date +%F).pgsql.gz
```

To restore, stop the stack, so the site is offline and no service writes to the database. Delete the old data volume, start only `db`, restore, then start the rest.

```bash
podman-compose down
podman volume rm freezeman_pgdata     # deletes the current database
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U <POSTGRES_USER> -d <POSTGRES_DB>; do sleep 2; done
# -d postgres: psql must start in another database than fms, because the script runs \connect fms.
gunzip -c <install-dir>/oci/backups/<YYYY-MM-DD>.pgsql.gz | podman-compose exec -T db psql -U <POSTGRES_USER> -d postgres
# Apply the migrations that the backup does not have, while only db runs.
podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
podman-compose up -d
```

- The messages "role already exists", "database already exists" and "extension fzy already exists" are harmless.
- The `psql` command restores a `pg_dumpall` script. For a file of another format, see
  [Identify the format of a database backup](oci/README.md#identify-the-format-of-a-database-backup).
- Restore only into an empty `freezeman_pgdata` volume. If the volume is new (first start), skip the first two commands.
- If `POSTGRES_PASSWORD` changed after the backup, set it back to the value at backup time.
- Copy the backups off the host.

## Keep the base images up to date

The Containerfiles use floating tags (`python:3.14-slim-trixie`, `node:24-trixie-slim`, `nginx-unprivileged:stable-alpine`,
`postgres:15-trixie`). A floating tag moves to each new patch release, but a host does not fetch it by itself: podman
keeps the image it pulled first. Without the steps below, a host stays on old base images and misses security fixes,
and QC and prod can run different versions for the same commit.

When to update:

- When a CVE affects Python, Node, nginx, PostgreSQL, Debian trixie or Alpine.

How to update (on each host, QC first, prod after QC works):

1. Pull the new base images and rebuild without the layer cache. `--pull` alone is not enough: the cached `apt-get`,
   `pip` and `npm` layers would keep the old packages.

   ```bash
   podman-compose build --pull --no-cache
   ```

   **Proxy host:** set the proxy variables as in [Proxy](#proxy).
2. Recreate the containers: `podman-compose up -d`.
3. Check the versions, and write them in the deployment notes:

   ```bash
   podman-compose exec backend python --version
   podman-compose exec web nginx -v
   podman-compose exec db postgres --version
   ```

A new patch release can break the stack. Test on QC before prod.

Stay on the same major version (Python 3.14, Node 24, PostgreSQL 15). A major change is a [specific deployment](#specific-deployments).
For PostgreSQL it also needs a backup and restore of the data.

## Report and logs

The crontab lines are in [Start at boot](#start-at-boot) and [Daily report](#daily-report). The log directory is `HOST_LOG_DIR` in `.env` (see [Configure .env](#configure-env)).

The crontab lines write to `<HOST_LOG_DIR>/boot.log` and `<HOST_LOG_DIR>/report.log`. The containers write `<HOST_LOG_DIR>/<service>.log`. Django also writes `<HOST_LOG_DIR>/fms.log`, and `prepare_report_data` writes `<HOST_LOG_DIR>/report_preparation.log`.

```bash
podman-compose logs -f backend                                       # follow the backend log through podman
tail -f <HOST_LOG_DIR>/backend.log                                   # the same log, read from the host file (works after `down`)
tail -f <HOST_LOG_DIR>/fms.log                                       # the Django log (WARNING+ on PROD, DEBUG+ elsewhere)
tail -f <HOST_LOG_DIR>/report_preparation.log                        # the report job
podman-compose exec -T backend python manage.py prepare_report_data  # run the report now (-T: no terminal)
```

# Specific deployments

* Version 3.1:
  * Upgrade Python version to 3.8.
  * Clone the new repository.
  * Modify the nginx and uwsgi for the new locations.
* Version 3.2:
  * Add FMS_SECRETKEY, FMS_ENV ("DEV", "QC", "PROD"), FMS_EMAIL_HOST, FMS_EMAIL_PORT, FMS_EMAIL_FROM, FMS_EMAIL_USER, FMS_EMAIL_USER, FMS_EMAIL_PASSWORD, FMS_EMAIL_TLS to env variables through uwsgi.ini.
* Version 3.3:
  * Update uwsgi.ini file with the latest options (Process tracking, process number, ...).
  * Add a .env file in the /frontend directory using the exemple.env as a reference. Set FMS_ENV ("DEV", "QC", "PROD") in the file.
* Version 3.14:
  * Add FMS_RUN_INFO_PATH to env variables through uwsgi.ini.
* Version 4.4.0:
  * Upgrade Python version to 3.11.
  * Upgrade Openssl version to 1.1.1u.
* Version 4.5.0:
  * Backend Django version upgrade to 4.2.4 (run `pip3.11 install -r requirements.txt`).
  * PostgreSQL version upgrade to 15.4 (Verify permissions for user and re-compile and install the fzy extension).
* Version 4.6.0:
  * Add FMS_AUTOMATIONS_WORK_PATH to env variables through uwsgi.ini.
* Version 4.13.0
  * Add a daily Cron call to "Python manage.py prepare_report_data" from a script on the server.
* Version 5.2.0
  * Upgrade node.js to v16.20.2.
* Version 5.4.0
  * Add FMS_VALIDATED_FILES_PATH and FMS_RELEASED_FILES_PATH to env variables through uwsgi.ini.
  * If RUN_INFO_OUTPUT_PATH not defined in environment, move triggered mechanisms from /backend/lims-run-info/ to /backend/triggers/lims-run-info/
* Version 5.5.0
  * Apply curation for initial assignment of launch and relaunch permissions.
* Version 5.7.0:
  * Upgrade Python version to 3.14.
  * Upgrade Django version to 6.0.4.
* Version 5.9.0:
  * Upgrade node.js to v24.18.0.
* Version 6.0.0:
  * FreezeMan runs as containers. To keep the data of an earlier version, restore its database as in the optional step of [Start the database](#start-the-database), and set the `HOST_*_DIR` folders of `.env`.

# Additional information

## Proxy

Do this section only if your host reaches the internet through an HTTP proxy.

Only image pulls and builds use the proxy. The running services do not. You can clear the proxy variables after the install. Set them again for each update, because each update builds the images.

Give the proxy to the command. Use the uppercase names. Set them before the command, so they apply only to this command and not to other commands of the shell:

```bash
HTTP_PROXY=http://<proxy-host>:<port> \
HTTPS_PROXY=http://<proxy-host>:<port> \
NO_PROXY=localhost,127.0.0.1 \
podman-compose build
```

Do the same for `podman pull` and `podman-compose up`.

### Internals

- Image pulls (`docker.io/...`) need the proxy in the shell. The podman process does the pull, and it does not read `.env`.
- The builds (`apt-get`, `pip`, `npm ci`) and the `dev` container get the proxy from compose. Compose reads the shell
  first, then `oci/.env`. Use the proxy block of `.env` when compose starts without the shell proxy.
  Then run `podman pull` for the base images (the `FROM` lines of the Containerfiles) once, from a shell that has the proxy.
- `NO_PROXY` always gets the service names `db`, `backend` and `web`, so traffic between the containers never uses the proxy.
  You do not add them.
- Runtime proxy:
  - The proxy values are build arguments of podman and stay out of the images.
  - At runtime, only `dev` gets the proxy (from `compose.dev.yaml`).
  - The other services (`db`, `backend`, `web`) get empty proxy variables from `compose.yaml`.
  - The empty values override the proxy that podman copies from its own environment (`http_proxy = true`, the default of
    `containers.conf`).
  - These services make no outbound HTTP calls, so they do not need a proxy.
  - Only in `dev` does `NO_PROXY` get the service names.
- Known quirk: podman-compose interpolates the `environment` of a service twice. If the shell has a proxy but no `NO_PROXY`,
  `podman-compose config` shows `db,backend,web` twice in the `NO_PROXY` and `no_proxy` of `dev`. The duplicates have no effect.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 502 at the reverse proxy | `web` is not running, or `HOST_HTTP_PORT` does not match the port of the reverse proxy. Check `podman-compose ps` and `curl http://127.0.0.1:<HOST_HTTP_PORT>/`. If `web` answers, check the port in the [Reverse proxy](#reverse-proxy) configuration |
| 502 on `/api/` from `web` | `backend` is not running. Check `podman-compose logs backend` |
| 400 Bad Request | `FMS_HOST` is not the host name of the request |
| 413 on upload | The upload limit is missing in the reverse proxy. Add `client_max_body_size` as in [Reverse proxy](#reverse-proxy) |
| `backend` exits at start with an error about missing tables or columns | The migrations did not run. Run the migration step of [Update to a new release](#update-to-a-new-release) |
| `[conmon:e]: Failed to open log file No such file or directory` | `HOST_LOG_DIR` in `.env` is a relative path or the directory does not exist. Set it to an existing absolute path, then run `podman-compose up -d --force-recreate` |
| The stack does not start at boot, or a podman error about the runtime directory | The environment has no `XDG_RUNTIME_DIR`. Set it in `~/.bash_profile` and at the top of the crontab (see [Set up the account of the user](#set-up-the-account-of-the-user) and [Start at boot](#start-at-boot)) |

For other faults, see [oci/DEBUGGING.md](oci/DEBUGGING.md).
