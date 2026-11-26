# FreezeMan deployment

This guide deploys FreezeMan as containers.
Prepare the host first, as in [PREREQUISITES.md](PREREQUISITES.md).
The services of the stack are in ["Production services" in oci/README.md](oci/README.md#production-services).

Placeholders used in this guide:

- `<user>`: the non-root account that runs the stack with rootless podman.
- `<uid>`: the numeric ID of `<user>` (`id -u`).
- `<runtime-dir>`: the value of `XDG_RUNTIME_DIR` for `<user>`.
  Rootless podman keeps the state of the running containers there.
  The usual value is `/run/user/<uid>`.
- `<install-dir>`: the absolute path of the FreezeMan checkout for the stack.
- `<domain>`: the public host name of FreezeMan.
  It is the value of `FMS_HOST` in `.env`.
- `<HOST_LOG_DIR>`: the value of `HOST_LOG_DIR` in `.env`.
- `<HOST_HTTP_PORT>`: the value of `HOST_HTTP_PORT` in `.env`.
  It is the host port where the `web` container listens, and where the reverse proxy sends the requests.
- `<POSTGRES_USER>`, `<POSTGRES_DB>`, `<POSTGRES_PASSWORD>`: the values of `POSTGRES_USER`, `POSTGRES_DB` and `POSTGRES_PASSWORD` in `.env`.
  `POSTGRES_USER` (`admin`) is the app role.
  The superuser is `postgres`, and only `podman-compose exec db` reaches it.
- `<YYYY-MM-DD>`: the date in the name of a database backup file.

Run all the `podman-compose` commands in `<install-dir>/oci`, so you can copy them as they are.
There, `podman-compose` reads `compose.yaml` and `.env` with no `-f` flag.

Run all steps as `<user>`.

Contents:

- [Quick start](#quick-start)
- [Initial deployment](#initial-deployment)
  - [Checkout](#checkout)
  - [Set up podman without systemd](#set-up-podman-without-systemd)
  - [Configure .env](#configure-env)
  - [Build the images](#build-the-images)
  - [Start the database](#start-the-database)
  - [Start the stack](#start-the-stack)
  - [Reverse proxy](#reverse-proxy)
  - [Start at boot](#start-at-boot)
  - [Daily report](#daily-report)
- [Routine deployments](#routine-deployments)
  - [Update to a new release](#update-to-a-new-release)
  - [Database backups](#database-backups)
  - [Keep the base images up to date](#keep-the-base-images-up-to-date)
  - [Report and logs](#report-and-logs)
- [Specific deployments](#specific-deployments)
- [Additional information](#additional-information)
  - [Proxy](#proxy)

# Quick start

First do [PREREQUISITES.md](PREREQUISITES.md) and [Set up podman without systemd](#set-up-podman-without-systemd).
On a proxy host, see [Proxy](#proxy).

```bash
# Checkout
git clone https://github.com/c3g/freezeman <install-dir>
cd <install-dir>
git checkout vX.Y.Z
git config url."https://github.com/".insteadOf "git://github.com/"
git submodule update --init --recursive

# Configure .env: copy the template, then personalize oci/.env (see the comments in the file)
cd oci
cp .env.prod.example .env

# Build the images
podman-compose build

# Start the database
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U <POSTGRES_USER> -d <POSTGRES_DB>; do sleep 2; done

# Start the stack
podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
podman-compose up -d
```

Then:

1. Set up the [Reverse proxy](#reverse-proxy).
2. Add the crontab lines of [Start at boot](#start-at-boot) and [Daily report](#daily-report).

# Initial deployment

## Checkout

1. Clone into `<install-dir>` as in ["Installation" in README.md](README.md#installation).
2. Check out the release that you deploy (`git checkout vX.Y.Z`).

## Set up podman without systemd

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

## Configure .env

```bash
cd <install-dir>/oci
cp .env.prod.example .env
```

Personalize `.env` before the first start.

The effect of each `FMS_ENV` value is in ["FMS_ENV values" in oci/README.md](oci/README.md#fms_env-values).

## Build the images

```bash
podman-compose build
```

**Proxy host:** this command needs the proxy.
See [Proxy](#proxy).

## Start the database

```bash
# Start only db.
podman-compose up -d db
# Wait until the db is ready.
until podman-compose exec db pg_isready -h 127.0.0.1 -U <POSTGRES_USER> -d <POSTGRES_DB>; do sleep 2; done
```

## Start the stack

```bash
# Apply the migrations in a one-off `backend` container.
podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
# Start all services.
podman-compose up -d
# Check `web`.
curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:<HOST_HTTP_PORT>/  # 200
```

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

Check the site through the reverse proxy:

```bash
curl -sfo /dev/null -w '%{http_code}\n' https://<domain>/   # 200
```

## Start at boot

Run this step as `<user>`, after the first start works.
Add these lines to the crontab (`crontab -e`):

```cron
XDG_RUNTIME_DIR=<runtime-dir>
PATH=<podman-compose-dir>:/usr/bin:/bin
@reboot cd <install-dir>/oci && podman-compose up -d >> <HOST_LOG_DIR>/boot.log 2>&1
```

- Cron does not set `XDG_RUNTIME_DIR`, and its `PATH` is short.
  Put the two variable lines at the top of the crontab.
  `<podman-compose-dir>` is the directory of `command -v podman-compose` (for example `/home/<user>/.local/bin`).
- `podman-compose` reads `.env` in `oci/`.

## Daily report

FreezeMan needs a daily run of `prepare_report_data`, the command that prepares the data of the reports.
Host cron must call it in the running `backend` container.
Add this line to the crontab (`crontab -e`), below the `XDG_RUNTIME_DIR` line of [Start at boot](#start-at-boot):

```cron
0 1 * * * cd <install-dir>/oci && podman-compose exec -T backend python manage.py prepare_report_data >> <HOST_LOG_DIR>/report.log 2>&1
```

- Cron uses the time zone of the host.
- `-T`: cron has no terminal.
- `prepare_report_data` writes its own log to `<HOST_LOG_DIR>/report_preparation.log`.

# Routine deployments

## Update to a new release

Run these steps as `<user>`.
Test the release on a test host first.

1. Back up the database, as in [Database backups](#database-backups).
2. Check out the release, and set its version in `.env`.
   `FMS_IMAGE_TAG` is the value in the `VERSION` file.

   ```bash
   cd <install-dir>
   git fetch && git checkout vX.Y.Z
   git submodule update --init --recursive
   cd oci
   sed -i "s/^FMS_IMAGE_TAG=.*/FMS_IMAGE_TAG=$(cat ../VERSION)/" .env
   ```

3. Build the images.
   **Proxy host:** this command needs the proxy.
   See [Proxy](#proxy).

   ```bash
   podman-compose build
   ```

4. Stop `web` and `backend`, apply the migrations, then start the stack with the new images:

   ```bash
   podman-compose stop web backend
   podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
   podman-compose up -d --force-recreate
   ```

If the build fails, the old containers keep running.
Set `FMS_IMAGE_TAG` back to the old version.
If the migration fails, the stack stays down.

## Database backups

The stack has no automatic backup yet.
To create a database backup file of all databases now, run this command while `db` runs.
`pg_dumpall` copies the roles too, so it runs as the superuser `postgres`:

```bash
mkdir -p <install-dir>/backups
# -T: no pseudo-TTY, which would turn the line endings of the backup file into CRLF.
podman-compose exec -T db pg_dumpall -U postgres | gzip > <install-dir>/backups/$(date +%F).pgsql.gz
```

To restore, stop the stack, so the site is offline and no service writes to the database.
Delete the old data volume, start only `db`, restore, then start the rest.

```bash
podman-compose down
podman volume rm freezeman_pgdata     # deletes the current database
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U <POSTGRES_USER> -d <POSTGRES_DB>; do sleep 2; done
# -d postgres: psql must start in another database than fms, because the script runs \connect fms.
gunzip -c <install-dir>/backups/<YYYY-MM-DD>.pgsql.gz | podman-compose exec -T db psql -U postgres -d postgres
# The backup file sets the password of admin at backup time. Set the password of .env again.
podman-compose exec db psql -U postgres -d postgres -c "ALTER ROLE <POSTGRES_USER> PASSWORD '<POSTGRES_PASSWORD>'"
# Apply the migrations that the backup does not have, while only db runs.
podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
podman-compose up -d
```

- The messages "role "postgres" already exists", "role "admin" already exists", "database "fms" already exists" and "extension "fzy" already exists" are harmless.
- The `psql` command restores a `pg_dumpall` script.
  A custom-format backup file (`pg_dump -Fc`) needs `pg_restore`:
  `podman-compose exec -T db pg_restore -U <POSTGRES_USER> -d <POSTGRES_DB> --no-owner --no-acl < <file>`.
  For a parallel restore (`pg_restore -j`), see ["Restore a production database" in oci/DEVELOPMENT.md](oci/DEVELOPMENT.md#restore-a-production-database).
- Restore only into an empty `freezeman_pgdata` volume.
  If the volume is new (first start), skip the first two commands.
- `backups/` is git-ignored.
  Copy the backups off the host.

## Keep the base images up to date

The Containerfiles use floating tags (`python:3.14-slim-trixie`, `node:24-trixie-slim`, `nginx-unprivileged:stable-alpine`, `postgres:15-trixie`).
A floating tag moves to each new patch release, but a host does not fetch it by itself: podman keeps the image it pulled first.
Without the steps below, a host stays on old base images and misses security fixes, and QC and prod can run different versions for the same commit.

When to update:

- When a CVE affects Python, Node, nginx, PostgreSQL, Debian trixie or Alpine.

How to update (on each host, QC first, prod after QC works):

1. Pull the new base images and rebuild without the layer cache.
   `--pull` alone is not enough: the cached `apt-get`, `pip` and `npm` layers would keep the old packages.

   ```bash
   podman-compose build --pull --no-cache
   ```

   **Proxy host:** set the proxy variables as in [Proxy](#proxy).
2. Recreate the containers: `podman-compose up -d --force-recreate`.
3. Check the versions, and write them in the deployment notes:

   ```bash
   podman-compose exec backend python --version
   podman-compose exec web nginx -v
   podman-compose exec db postgres --version
   ```

A new patch release can break the stack.
Test on QC before prod.

Stay on the same major version (Python 3.14, Node 24, PostgreSQL 15).
A major change is in [Specific deployments](#specific-deployments).
For PostgreSQL it also needs a backup and restore of the data.

## Report and logs

The crontab lines are in [Start at boot](#start-at-boot) and [Daily report](#daily-report).
The log directory is `HOST_LOG_DIR` in `.env` (see [Configure .env](#configure-env)).

The crontab lines write to `<HOST_LOG_DIR>/boot.log` and `<HOST_LOG_DIR>/report.log`.
The containers write `<HOST_LOG_DIR>/<service>.log`.
Django also writes `<HOST_LOG_DIR>/fms.log`, and `prepare_report_data` writes `<HOST_LOG_DIR>/report_preparation.log`.

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
  * Add FMS_SECRETKEY, FMS_ENV ("DEV", "QC", "PROD"), FMS_EMAIL_HOST, FMS_EMAIL_PORT, FMS_EMAIL_FROM, FMS_EMAIL_USER, FMS_EMAIL_PASSWORD, FMS_EMAIL_TLS to env variables through uwsgi.ini.
* Version 3.3:
  * Update uwsgi.ini file with the latest options (Process tracking, process number, ...).
  * Add a .env file in the /frontend directory using the example.env as a reference.
    Set FMS_ENV ("DEV", "QC", "PROD") in the file.
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
  * FreezeMan runs as containers.
    To keep the data of an earlier version, do these steps during the initial deployment:
    1. In `.env`, set `POSTGRES_PASSWORD` to the old password of `admin` (the backup file sets it), and set the `HOST_*_DIR` folders to the folders of the old install:
       `HOST_MEDIA_DIR` to `MEDIA_ROOT`, `HOST_RUN_INFO_DIR` to `FMS_RUN_INFO_PATH`, `HOST_VALIDATED_FILES_DIR` to `FMS_VALIDATED_FILES_PATH`, `HOST_RELEASED_FILES_DIR` to `FMS_RELEASED_FILES_PATH` and `HOST_AUTOMATIONS_WORK_DIR` to `FMS_AUTOMATIONS_WORK_PATH` of the old `uwsgi.ini`.
       If the old `uwsgi.ini` does not set a path, use the matching folder of the old checkout.
    2. Stop the old uwsgi, then make a backup file on the old PostgreSQL server.
    3. After [Start the database](#start-the-database) and before [Start the stack](#start-the-stack), restore the file into the new, empty `db`.
       The messages "... already exists" for `postgres`, `admin`, `fms` and `fzy` are harmless.

       ```bash
       pg_dumpall -U postgres | gzip > fms_old.pgsql.gz   # on the old PostgreSQL server
       # -d postgres: psql must start in another database than fms, because the script runs \connect fms.
       gunzip -c fms_old.pgsql.gz | podman-compose exec -T db psql -U postgres -d postgres
       ```

    4. In the reverse proxy, replace the old `location` blocks (`/`, `/static/`, `/media/`, `/api/`) with the `location /` block of [Reverse proxy](#reverse-proxy).

# Additional information

## Proxy

Do this section only if your host reaches the internet through an HTTP proxy.

Only image pulls and builds use the proxy.
The running services do not.

Set the proxy variables, in upper case, before the command.
They then apply only to that command:

```bash
HTTP_PROXY=http://<proxy-host>:<port> \
HTTPS_PROXY=http://<proxy-host>:<port> \
NO_PROXY=localhost,127.0.0.1 \
podman-compose build
```

Do the same for `podman pull` and `podman-compose up`.
