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
- `<branch>`: the branch that you give to `autoupdate.py --branch`.

Before you run `podman-compose` commands, set the compose file in the current shell: `export COMPOSE_FILE=<install-dir>/oci/compose.yaml`. podman-compose then works in any directory. It reads `.env` from the directory of the compose file.

Contents:

- [Initial deployment](#initial-deployment)
  - [Production services](#production-services)
  - [Host requirements](#host-requirements)
  - [Network access](#network-access)
  - [Checkout](#checkout)
  - [Set up the account of the user](#set-up-the-account-of-the-user)
  - [Configure .env](#configure-env)
  - [Build the images](#build-the-images)
  - [Start a new database](#start-a-new-database)
  - [Reverse proxy](#reverse-proxy)
  - [Start at boot](#start-at-boot)
  - [Daily jobs](#daily-jobs)
- [Routine deployments](#routine-deployments)
  - [Start, stop and restart](#start-stop-and-restart)
  - [Update to a new release](#update-to-a-new-release)
  - [Database backups](#database-backups)
  - [Keep the base images up to date](#keep-the-base-images-up-to-date)
  - [Report and logs](#report-and-logs)
  - [Automatic update (test hosts)](#automatic-update-test-hosts)
- [Specific deployments](#specific-deployments)
  - [Migrate from a version earlier than 6.0.0](#migrate-from-a-version-earlier-than-600)
- [Additional information](#additional-information)
  - [Proxy](#proxy)
  - [Design choices](#design-choices)
  - [Troubleshooting](#troubleshooting)

# Initial deployment

## Production services

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL with the `fzy` extension (`backend/dependencies/pg_fzy`) |
| `backend`  | `localhost/freezeman-backend` | Django on uwsgi: uwsgi protocol on an internal port             |
| `jobs`     | `localhost/freezeman-jobs`    | One daily job per run: the report (`prepare_report_data`). Host cron starts it with `jobs.py`. `up -d` does not start it. See [Daily jobs](#daily-jobs) |
| `web`      | `localhost/freezeman-web`     | nginx in a container: the built frontend, Django static files, `/media/`. Passes `/api/` to uwsgi. The reverse proxy on the host passes HTTP to it |

A reverse proxy on the host terminates TLS and passes the requests to `web` (see [Reverse proxy](#reverse-proxy)). For the layout of `oci/` and the shared setup, see [oci/README.md](oci/README.md).

## Host requirements

These steps need root.

- A Linux host with podman 5.4 or later.
- podman-compose 1.5 or later (the package of the OS, or `pip install podman-compose`).
- A non-root `<user>` with subuid and subgid ranges, for rootless containers.
- A `<runtime-dir>` of `<user>` that stays from boot to shutdown. With systemd, enable linger for `<user>` (`loginctl enable-linger <user>`).
- A cron daemon, or another way to start `freezeman.py` as `<user>` at boot.
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
| `github.com` | 443 | `git clone --recurse-submodules` of the source and its submodules. `autoupdate.py` (test hosts only) also uses it |
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

`.env.prod.example` is a template with the values of the C3G production host. Personalize `.env` before the first start:

1. Open `<install-dir>/oci/.env`. The comment above each variable explains it: what it does, if it is required, and when to change it. A comment gives the default only for a variable that the file does not set.
2. Replace each `change-me` value.
3. Set the required values that are empty: `FMS_IMAGE_TAG` and `HOST_LOG_DIR`.
4. On a host other than C3G production, also change `FMS_HOST`, the `FMS_EMAIL_*` values and the host paths.

<a id="fms_env-values"></a>**FMS_ENV values:** only `PROD` is special. Every other value has the same behaviour, and the web page shows the value.

| Area | `PROD` | Other value (`QC`, `DEV`) |
|---|---|---|
| Django log (`<HOST_LOG_DIR>/fms.log`, rotated at 2 GB, 1 old file kept) | `WARNING` and higher. These lines also go to the console, so to `<HOST_LOG_DIR>/backend.log` | `DEBUG` and higher |
| Allowed hosts (`FMS_DEBUG=False`) | `FMS_HOST` only | `FMS_HOST` and `localhost` |
| Web page | Normal header | Header with a different background and the value in red. The About page also shows the value |
| `autoupdate.py` | Stops with an error. It does not touch the database | Runs. It deletes the database at each new commit |
| Daily jobs | Same for every value: each crontab line runs its job | Same. On a host with `autoupdate.py`, the next new commit replaces the database |

The `web` image gets `FMS_ENV` when it is built. `backend` and `jobs` read it when they start. After a change of `FMS_ENV` in `.env`, run `podman-compose build web`, then `podman-compose up -d --force-recreate`. `LOCAL` is the value of the development stack. Do not use it on a server.

## Build the images

Run this step as `<user>`.

```bash
podman-compose build
```

Proxy host: this command needs the proxy. See [Proxy](#proxy).

## Start a new database

Run these steps as `<user>`. Use them when there is no data to keep. To keep the data of an earlier version, use [Migrate from a version earlier than 6.0.0](#migrate-from-a-version-earlier-than-600) instead.

Start only `db`, apply the migrations in a one-off `backend` container, then start the stack. Nothing applies migrations automatically.

```bash
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U <POSTGRES_USER> -d <POSTGRES_DB>; do sleep 2; done
podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
podman-compose up -d
curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:<HOST_HTTP_PORT>/  # 200
```

Set up the [Reverse proxy](#reverse-proxy), then check the site through it:

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

## Start at boot

Run this step as `<user>`, after the first start works. Add these lines to the crontab (`crontab -e`). Cron does not set `XDG_RUNTIME_DIR`, so the variable line must be at the top of the crontab:

```cron
XDG_RUNTIME_DIR=<runtime-dir>
@reboot <install-dir>/oci/freezeman.py >> <HOST_LOG_DIR>/freezeman.log 2>&1
```

`freezeman.py` stops with an error if `XDG_RUNTIME_DIR` is not set. It waits up to 60 s for the directory, because cron can start before the system creates it at boot.

If the host has no cron (the host is a container), start `freezeman.py` as `<user>` from the init of the outer container.

## Daily jobs

Run this step as `<user>`, after the first start works. Host cron runs each daily job with `jobs.py`. Each call starts a new `jobs` container (`podman-compose --profile jobs run --rm jobs <command>`) and removes it after the job. Add this line to the crontab (`crontab -e`), below the `XDG_RUNTIME_DIR` line of [Start at boot](#start-at-boot):

```cron
0 1 * * *  <install-dir>/oci/jobs.py report >> <HOST_LOG_DIR>/jobs.log 2>&1
```

- Cron uses the time zone of the host.
- To turn a job off, remove its line.
- Each job reads `.env` when it starts, so a change of `.env` needs no restart. A change of the job scripts needs `podman-compose build jobs`.
- A host without cron (the host is a container) is not supported yet.

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

Proxy host: `update-production-deployment.sh` needs the proxy for the build. See [Proxy](#proxy).

```bash
cd <install-dir>
git fetch && git checkout vX.Y.Z
oci/update-production-deployment.sh
```

`update-production-deployment.sh` checks that the tag of the commit is `v` + the value in `VERSION`. Then it backs up the database to `oci/backups/`, builds the images with the new tag, sets `FMS_IMAGE_TAG` in `.env`, stops `web` and `backend`, applies the migrations and recreates the containers. It prints each command before it runs. It stops with an error if `XDG_RUNTIME_DIR` is not set.

If the script fails, read `update-production-deployment.sh`, fix the error, then run the remaining steps of the script manually. The last command in the output is the one that failed. If the build fails, the old containers keep running and `.env` keeps the old tag. If the migration fails, the stack stays down.

## Database backups

The stack has no automatic backup yet. To dump all databases now, run this command while `db` runs. `pg_dumpall` copies the roles too:

```bash
mkdir -p <install-dir>/oci/backups
# -T: no pseudo-TTY, which would turn the line endings of the dump into CRLF.
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

   Proxy host: set the proxy variables as in [Proxy](#proxy).
2. Recreate the containers: `podman-compose up -d`.
3. Check the versions, and write them in the deployment notes:

   ```bash
   podman-compose exec backend python --version
   podman-compose exec web nginx -v
   podman-compose exec db postgres --version
   ```

A new patch release can break the stack. Test on QC before prod.

Stay on the same major version (Python 3.14, Node 24, PostgreSQL 15). A major change is a [specific deployment](#specific-deployments).
For PostgreSQL it also needs a dump and restore of the data.

Ideas for later (not done):

- A scheduled GitHub workflow or Renovate that opens a PR when a base image changes.
- Pinning to patch tags or digests (`tag@sha256:...`) if all hosts must run the same bytes.

## Report and logs

The crontab lines are in [Start at boot](#start-at-boot) and [Daily jobs](#daily-jobs). The log directory is `HOST_LOG_DIR` in `.env` (see [Configure .env](#configure-env)).

Each host script writes to `<HOST_LOG_DIR>/<script-file-name>.log` (for example `freezeman.log`, `jobs.log`, `autoupdate.log`). The containers write `<HOST_LOG_DIR>/<service>.log`. Django also writes `<HOST_LOG_DIR>/fms.log`. When a script fails, it writes a line that starts with `FAILED:` to its log, followed by the details.

```bash
podman-compose logs -f backend                                       # follow the backend log through podman
tail -f <HOST_LOG_DIR>/backend.log                                   # the same log, read from the host file (works after `down`)
tail -f <HOST_LOG_DIR>/fms.log                                       # the Django log (WARNING+ on PROD, DEBUG+ elsewhere)
tail -f <HOST_LOG_DIR>/jobs.log                                      # the report job
podman-compose exec -T backend python manage.py prepare_report_data  # run the report now (-T: no terminal)
grep -h -A3 "FAILED:" <HOST_LOG_DIR>/*.log                           # the failures
```

## Automatic update (test hosts)

Test hosts only. It deletes the database at each new commit. `FMS_ENV` in `.env` must be set and must not be `PROD` (see [FMS_ENV values](#fms_env-values)). Otherwise `autoupdate.py` stops.

1. Put the checkout on the followed branch, with no local changes:

   ```bash
   cd <install-dir>
   git status --short          # no output for tracked files: no local changes
   git switch <branch>         # the branch that --branch names
   git pull --ff-only
   ```

2. Add a line to the crontab of `<user>` (`crontab -e`), below the `XDG_RUNTIME_DIR` line of [Start at boot](#start-at-boot). Give the absolute path of a dump (`.pgsql.gz`, `.pgsql` or `.dump`) to `--db-backup-filename`:

   ```cron
   # */10 * * * *: check every 10 minutes.
   # --branch: branch of origin to follow.
   # --db-backup-filename: absolute path of the dump to restore (.pgsql.gz, .pgsql or .dump).
   # >> <HOST_LOG_DIR>/autoupdate.log 2>&1: append the output and the errors to the log.
   # Optional --interval N: check every N seconds and never exit (default: check once).
   # Optional --force: deploy even if the commit is the last deployed one.
   # Proxy host: autoupdate.py needs the proxy (git, image pulls, builds). See Proxy.
   */10 * * * * <install-dir>/oci/autoupdate.py --branch <branch> --db-backup-filename <install-dir>/oci/backups/<YYYY-MM-DD>.pgsql.gz >> <HOST_LOG_DIR>/autoupdate.log 2>&1
   ```

- `autoupdate.py` selects the restore command from the extension: `psql` for `.pgsql.gz` and `.pgsql` (`pg_dumpall`),
  `pg_restore` for `.dump` (`pg_dump -Fc`). The extension must match the format of the file. To find the format, see
  [Identify the format of a database backup](oci/README.md#identify-the-format-of-a-database-backup).
- `autoupdate.py` applies the migrations after the restore, while only `db` runs, and before it starts the stack. If a migration fails, the stack stays down (only `db` runs) and the script logs the failure.
- No cron (the host is a container): add `--interval 600` and start the command as `<user>` from the init of the outer container. Redirect its output to `<HOST_LOG_DIR>/autoupdate.log`.
- To deploy the same commit again: add `--force`.

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
  * FreezeMan runs as containers. Migrate a host that runs an earlier version as in [Migrate from a version earlier than 6.0.0](#migrate-from-a-version-earlier-than-600).

## Migrate from a version earlier than 6.0.0

Use these steps to keep the data of an install that runs a version earlier than 6.0.0 (uwsgi and nginx on the host, PostgreSQL on the host). Run the steps as `<user>`.

Before you start, do the sections of [Initial deployment](#initial-deployment) up to [Build the images](#build-the-images). Skip [Start a new database](#start-a-new-database).

1. Announce the downtime. Stop the old uwsgi, so no write happens after the dump.
2. Optional. Tools that query the database outside Django (`psql`, reports) use the default time zone of the database. Django is not affected. To keep the old dates in these tools, set `TZ` in `.env` to the result of this command, before step 5:

   ```bash
   psql -U postgres -d fms -c 'SHOW timezone'
   ```

   Cron runs the daily jobs in the time zone of the host, not `TZ`.

3. Dump the old database. Do not use `pg_dumpall` or the `backup_release_*.pgsql` files of the old host.

   ```bash
   # -Fc: custom format, restore with pg_restore.
   pg_dump -U postgres -Fc fms > fms_old.dump
   ```

4. Choose where the backend files are. Compose binds the folders that `.env` names, so the stack can use the folders of the old install directly, with no copy. Set the values of this table in `.env`:

   | Variable | Value |
   |---|---|
   | `HOST_MEDIA_DIR` | The media folder of the old install (`MEDIA_ROOT`) |
   | `HOST_RUN_INFO_DIR`, `HOST_VALIDATED_FILES_DIR`, `HOST_RELEASED_FILES_DIR` | The values of `FMS_RUN_INFO_PATH`, `FMS_VALIDATED_FILES_PATH` and `FMS_RELEASED_FILES_PATH` in the old `uwsgi.ini`, as absolute paths. If `uwsgi.ini` does not set one, the folder in `backend/triggers` of the old checkout |
   | `HOST_AUTOMATIONS_WORK_DIR` | The value of `FMS_AUTOMATIONS_WORK_PATH` in the old `uwsgi.ini`, as an absolute path. If `uwsgi.ini` does not set it, `backend/automations_work` of the old checkout |

5. Start only the database, wait until it is ready, and restore the dump. The message "extension fzy already exists" is harmless.

   ```bash
   podman-compose up -d db
   until podman-compose exec db pg_isready -h 127.0.0.1 -U <POSTGRES_USER> -d <POSTGRES_DB>; do sleep 2; done
   # -T: no pseudo-TTY, keeps the binary dump intact.
   # PGOPTIONS: log each statement of this session.
   # --no-owner: give all objects to POSTGRES_USER.
   # --no-acl: skip GRANT and REVOKE of old roles, which do not exist here.
   # --verbose: print each restored object.
   podman-compose exec -T db env PGOPTIONS='-c log_statement=all' \
     pg_restore -U <POSTGRES_USER> -d <POSTGRES_DB> --no-owner --no-acl --verbose < fms_old.dump
   ```

6. Apply the migrations while only `db` runs, then start all services and check them. The migration command prints the applied migrations and ends with exit code 0:

   ```bash
   podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
   podman-compose up -d
   curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:<HOST_HTTP_PORT>/  # 200
   ```

7. Switch the reverse proxy to the containers, as in [Reverse proxy](#reverse-proxy). Keep a copy of the old configuration before the change: [the way back](#go-back-to-the-earlier-version) needs it. The new `location /` replaces the old `location /`. Also remove the old `/static/`, `/media/` and `/api/` locations. The `web` container serves these paths. Then check the site:

   ```bash
   curl -sfo /dev/null -w '%{http_code}\n' https://<domain>/                   # 200, through the reverse proxy
   ```

8. Disable the `@reboot` and cron entries of the old setup (report, backup) in the crontab of its user, so they do not run against the old database.
9. Continue with [Start at boot](#start-at-boot) and [Daily jobs](#daily-jobs).

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

Do the same for `podman pull`, `podman-compose up`, `update-production-deployment.sh` and `autoupdate.py`.

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
  - The other services (`db`, `backend`, `jobs`, `web`) get empty proxy variables from `compose.yaml`.
  - The empty values override the proxy that podman copies from its own environment (`http_proxy = true`, the default of
    `containers.conf`).
  - These services make no outbound HTTP calls, so they do not need a proxy.
  - Only in `dev` does `NO_PROXY` get the service names.
- Known quirk: podman-compose interpolates the `environment` of a service twice. If the shell has a proxy but no `NO_PROXY`,
  `podman-compose config` shows `db,backend,web` twice in the `NO_PROXY` and `no_proxy` of `dev`. The duplicates have no effect.

## Design choices

- `userns_mode: keep-id:uid=1000,gid=1000` on `backend`. The image user `fms` (uid 1000) writes the media files, and
  the host user that runs the stack owns them on the host.
- uwsgi listens on a port in the container network (uwsgi protocol), for the `web` service.
- Client address: the reverse proxy sends `X-Real-IP` and `X-Forwarded-For`, but the `web` nginx does not use them.
  uwsgi gets the address of the podman port forwarder as `REMOTE_ADDR`, and the `web` access log shows that address.
  Nothing in FreezeMan uses the client address today. If it becomes necessary, add `set_real_ip_from` and
  `real_ip_header X-Real-IP` to `oci/nginx/default.conf.template`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 502 at the reverse proxy | `web` is not running, or `HOST_HTTP_PORT` does not match the port of the reverse proxy. Check `podman-compose ps` and `curl http://127.0.0.1:<HOST_HTTP_PORT>/`. If `web` answers, check the port in the [Reverse proxy](#reverse-proxy) configuration |
| 502 on `/api/` from `web` | `backend` is not running. Check `podman-compose logs backend` |
| 400 Bad Request | `FMS_HOST` is not the host name of the request |
| 413 on upload | The upload limit is missing in the reverse proxy. Add `client_max_body_size` as in [Reverse proxy](#reverse-proxy) |
| `backend` exits at start with an error about missing tables or columns | The migrations did not run. Run the migration step of `update-production-deployment.sh` (see [Update to a new release](#update-to-a-new-release)) |
| `[conmon:e]: Failed to open log file No such file or directory` | `HOST_LOG_DIR` in `.env` is a relative path or the directory does not exist. Set it to an existing absolute path, then run `podman-compose up -d --force-recreate` |
| `XDG_RUNTIME_DIR is not set` from a script | The environment has no `XDG_RUNTIME_DIR`. Set it in `~/.bash_profile` and at the top of the crontab (see [Set up the account of the user](#set-up-the-account-of-the-user) and [Start at boot](#start-at-boot)) |

For other faults, see [oci/DEBUGGING.md](oci/DEBUGGING.md).
