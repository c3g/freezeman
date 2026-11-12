# Production deployment

Read [README.md](README.md) first. It describes the services, the layout and the shared setup.

Run all `podman-compose` commands in `<install-dir>/oci` as `<user>`.

Conventions:

- `<user>`: the non-root account that runs the stack with rootless podman.
- `<install-dir>`: the absolute path of the FreezeMan checkout for the stack.
- `<domain>`: the public host name of FreezeMan (`FMS_HOST`).
- `<classic-dir>`: the checkout of a classic FreezeMan install (Path A only).
- `<branch>`: the branch that `autoupdate.py` follows (Automatic update only).
- The local checks use `http://127.0.0.1:8080/`. If you change `HOST_HTTP_PORT`, use your port.

Contents:

- [Prerequisites](#prerequisites): shared setup, the host requirements, the proxy.
- [Network access](#network-access): the outbound domains of the build.
- [Reverse proxy](#reverse-proxy): TLS and the forward to the `web` container.
- [Set up the account of the user](#set-up-the-account-of-the-user): podman without systemd, `podman system migrate`, podman-compose.
- [Get the release and configure](#get-the-release-and-configure): clone, directories, `.env`, image build.
- Do one of these two paths:
  - [Path A: migrate from the classic host](#path-a-migrate-from-the-classic-host): dump, copy the files, restore, cutover of the reverse proxy.
  - [Path B: new host](#path-b-new-host): first start with an empty database.
- [Start at boot](#start-at-boot): the `@reboot` crontab line.
- [Daily jobs](#daily-jobs): the crontab line of the report.
- [Daily use](#daily-use)
  - [Start, stop and restart](#start-stop-and-restart): the `podman-compose` commands and when to use each.
  - [Update to a new release](#update-to-a-new-release): back up, check out the tag, build, recreate.
  - [Database backups](#database-backups): a dump now, a restore.
  - [Report and logs](#report-and-logs): follow the logs, run the report now.
  - [Automatic update (test hosts)](#automatic-update-test-hosts): `autoupdate.py` on test hosts.
- [To go back](#to-go-back): return to the classic setup.
- [Troubleshooting](#troubleshooting): symptoms and likely causes.

## Prerequisites

1. Do the steps of [Prerequisites](README.md#prerequisites) in README.md. They apply to both environments.
2. Prepare the host. These steps need root.
   - A Linux host with podman 5.4 or later and podman-compose 1.5 or later.
   - A non-root `<user>` with subuid and subgid ranges, for rootless containers.
   - A directory `/run/user/<uid>` of `<user>` that stays from boot to shutdown (for example systemd linger). Rootless podman keeps the state of the running containers there.
   - A cron daemon, or another way to start `start.py` as `<user>` at boot.
   - A reverse proxy with TLS in front of the stack (see [Reverse proxy](#reverse-proxy)).
   - Outbound access for the build. The domains are in [Network access](#network-access). The running stack needs only the SMTP server.
3. If the host reaches the internet through an HTTP proxy, see [Proxy](README.md#proxy). Without a proxy, leave the proxy variables unset.

## Network access

If the host uses a proxy or a firewall with an allow list, allow these domains for outbound traffic. If the host has open outbound access, no change is necessary.

| Domain | Port | Used by |
|---|---|---|
| The package repositories of the host OS | 443 or 80 | Installation of `podman`, `podman-compose` and a cron daemon |
| `pypi.org`, `files.pythonhosted.org` | 443 | `pip install podman-compose==1.5.0`, only if the OS gives no `podman-compose` |
| `github.com` | 443 | `git clone --recurse-submodules` of the source and its submodules. `autoupdate.py` (test hosts only) also uses it |
| `registry-1.docker.io`, `auth.docker.io`, `production.cloudfront.docker.com` | 443 | Image pulls (`docker.io/library/python`, `docker.io/library/node`, `docker.io/library/postgres`, `docker.io/nginxinc/nginx-unprivileged`) |
| `production.cloudflare.docker.com`, `*.r2.cloudflarestorage.com` | 443 | Docker Hub can serve image layers from this CDN instead of `production.cloudfront.docker.com` |
| `deb.debian.org` | 80 | Image builds: `apt-get` in the Debian trixie stages (also `debian-security`) |
| `apt.postgresql.org` | 80 | Image build of `db`: `postgresql-server-dev` from the PostgreSQL repository of the `postgres` image. |
| `pypi.org`, `files.pythonhosted.org` | 443 | Image builds: Python packages of `backend/requirements.txt` and `uwsgi` |
| `registry.npmjs.org` | 443 | Image build of `web`: `npm ci` for the frontend |
| The value of `FMS_EMAIL_HOST` (for example `smtp.office365.com`) | The value of `FMS_EMAIL_PORT` (for example 587) | Django email, only if `FMS_EMAIL_HOST` is set |

- A full build and start of the stack used the rows for `github.com`, the image pulls, `deb.debian.org`, `apt.postgresql.org`, `pypi.org` and `registry.npmjs.org`.
- Docker Hub serves the image layers from a CDN. Allow the CDN domains, or the pull fails after the login.
- The build needs the domains. The running stack needs only `FMS_EMAIL_HOST` and no other outbound connection.
- All traffic is outbound. The stack opens no inbound port (the `web` port binds to `127.0.0.1`).

## Reverse proxy

The `web` container listens on `127.0.0.1:HOST_HTTP_PORT` (default 8080) and speaks plain HTTP. A reverse proxy on the host terminates TLS for `<domain>` and passes all paths to it. The reverse proxy must:

- Pass `Host`, `X-Real-IP`, `X-Forwarded-For` and `X-Forwarded-Proto`. Django checks `Host` against `FMS_HOST`.
- Allow uploads up to 50 MB, and requests up to 300 s.

nginx example, in the HTTPS server block of `<domain>`:

```nginx
client_max_body_size 50M;
client_body_timeout 300s;

location / {
    proxy_pass http://127.0.0.1:8080;      # HOST_HTTP_PORT
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

Migration on the same domain ([Path A](#path-a-migrate-from-the-classic-host)): keep a copy of the classic configuration before the change. [To go back](#to-go-back) restores it. At the cutover, the new `location /` replaces the classic `location /`. Also remove the classic `/static/`, `/media/` and `/api/` locations. The `web` container serves these paths.

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

   b. Set `XDG_RUNTIME_DIR` in every login shell.

      ```bash
      cp ~/.bash_profile ~/.bash_profile.bak
      cat >> ~/.bash_profile <<'EOF'

      # Rootless podman: a login through su or sudo does not set XDG_RUNTIME_DIR. Podman keeps the state of
      # the running containers there, so every shell of this user must use the same directory.
      if [ -z "${XDG_RUNTIME_DIR:-}" ] && [ -d "/run/user/$(id -u)" ]; then
          export XDG_RUNTIME_DIR="/run/user/$(id -u)"
      fi
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

3. If `podman-compose --version` fails, install podman-compose:

   ```bash
   python3 -m venv ~/.local/share/podman-compose
   ~/.local/share/podman-compose/bin/pip install 'podman-compose==1.5.0'
   mkdir -p ~/.local/bin
   ln -sf ~/.local/share/podman-compose/bin/podman-compose ~/.local/bin/podman-compose
   podman-compose --version            # podman-compose version 1.5.0
   ```

## Get the release and configure

Run these steps as `<user>`.

1. Get the release. If a classic FreezeMan runs on the host, use a directory other than its checkout.

   ```bash
   git clone --recurse-submodules https://github.com/c3g/freezeman.git <install-dir>
   ```

2. No directory to create: the checkout holds the directory of the logs (`oci/logs`) and the backend files, and podman-compose creates any missing bind-mount folder. [Path A](#path-a-migrate-from-the-classic-host) can use the folders of the classic install for the backend files.

3. Create `.env` and set these values. The other values in `.env.example` have working defaults.

   ```bash
   cd <install-dir>/oci
   cp .env.example .env
   ```

   | Variable | Value |
   |---|---|
   | `POSTGRES_PASSWORD` | A new password |
   | `FMS_SECRET_KEY` | A new secret key (`python3 -c "import secrets; print(secrets.token_urlsafe(50))"`) |
   | `FMS_HOST` | `<domain>` |
   | `FMS_ENV` | Required: compose stops if it is not set. `PROD` on the production host. `QC` or `DEV` on a test host. See [FMS_ENV values](#fms_env-values) |
   | `HOST_LOG_DIR` | `<install-dir>/oci/logs` (absolute path) |
   | `CONTAINER_FMS_ROOT` | Keep `/workspace/freezeman`. The path of the project in the containers. Required |
   | `HOST_MEDIA_DIR`, `HOST_RUN_INFO_DIR`, `HOST_VALIDATED_FILES_DIR`, `HOST_RELEASED_FILES_DIR`, `HOST_AUTOMATIONS_WORK_DIR` | Optional. The host folders of the media files, the three trigger folders and the automations work directory. Compose binds each one at a fixed path in the backend container, so the files stay where they are. Default: the folder in the checkout. podman-compose creates a missing folder |
   | `HOST_HTTP_PORT` | The port that the reverse proxy passes to. Default: 8080 |
   | `FMS_EMAIL_HOST`, `FMS_EMAIL_PORT`, `FMS_EMAIL_FROM`, `FMS_EMAIL_USER`, `FMS_EMAIL_PASSWORD`, `FMS_EMAIL_TLS` | The SMTP server. To turn TLS off, leave `FMS_EMAIL_TLS` empty |
   | `TZ` | The time zone of the services. Default: `UTC`. Example: `America/Montreal` |

   <a id="fms_env-values"></a>**FMS_ENV values:** only `PROD` is special. Every other value has the same behaviour, and the web page shows the value.

   | Area | `PROD` | Other value (`QC`, `DEV`) |
   |---|---|---|
   | Django log | `WARNING` and higher goes to the console, so to `HOST_LOG_DIR/backend.log` | `DEBUG` and higher goes to `$CONTAINER_FMS_ROOT/backend/fms.log` in the `backend` container. These messages do not go to `backend.log`. The file is not a bind mount, so it is lost when the container is recreated. Django rotates it at 2 GB and keeps 1 old file |
   | Allowed hosts (`FMS_DEBUG=False`) | `FMS_HOST` only | `FMS_HOST` and `localhost` |
   | Web page | Normal header | Header with a different background and the value in red. The About page also shows the value |
   | `autoupdate.py` | Stops with an error. It does not touch the database | Runs. It deletes the database at each new commit |
   | Daily jobs | Same for every value: each crontab line runs its job | Same. On a host with `autoupdate.py`, the next new commit replaces the database |

   The `web` image gets `FMS_ENV` when it is built. `backend` and `jobs` read it when they start. After a change of `FMS_ENV` in `.env`, run `podman-compose build web`, then `podman-compose up -d --force-recreate`. `LOCAL` is the value of the development stack (`compose.dev.yaml`). Do not use it on a server.

   **Daily jobs:** host cron runs the report. See [Daily jobs](#daily-jobs).

4. Build the images. If the host uses a proxy, set the variables before the command, as in [Proxy](README.md#proxy).

   ```bash
   podman-compose build
   ```

## Path A: migrate from the classic host

Use this path to keep the data of a classic FreezeMan install ([../DEPLOYMENT.md](../DEPLOYMENT.md)). Run the steps as `<user>`, in `oci/`.

1. Announce the downtime. Stop the classic uwsgi, so no write happens after the dump.
2. Optional. Tools that query the database outside Django (`psql`, reports) use the default time zone of the database. Django is not affected. To keep the classic dates in these tools, set `TZ` in `.env` to the result of this command, before step 5:

   ```bash
   psql -U postgres -d fms -c 'SHOW timezone'
   ```

   Cron runs the daily jobs in the time zone of the host, not `TZ`.

3. Dump the classic database. Do not use `pg_dumpall` or the `backup_release_*.pgsql` files of the classic host.

   ```bash
   # -Fc: custom format, restore with pg_restore.
   pg_dump -U postgres -Fc fms > fms_classic.dump
   ```

4. Choose where the backend files are. Compose binds the folders that `.env` names, so the stack can use the folders of the classic install directly, with no copy. To use them, set these variables:

   | Variable | Value |
   |---|---|
   | `HOST_MEDIA_DIR` | The media folder of the classic install (`MEDIA_ROOT`) |
   | `HOST_RUN_INFO_DIR`, `HOST_VALIDATED_FILES_DIR`, `HOST_RELEASED_FILES_DIR` | The values of `FMS_RUN_INFO_PATH`, `FMS_VALIDATED_FILES_PATH` and `FMS_RELEASED_FILES_PATH` in the classic `uwsgi.ini`, as absolute paths. If `uwsgi.ini` does not set one, the folder in `backend/triggers` of the classic checkout |
   | `HOST_AUTOMATIONS_WORK_DIR` | The value of `FMS_AUTOMATIONS_WORK_PATH` in the classic `uwsgi.ini`, as an absolute path. If `uwsgi.ini` does not set it, `backend/automations_work` of the classic checkout |

   The folders must be on this host. The backend writes as `<user>`, the host user that runs podman (`userns_mode: keep-id`), so `<user>` must be able to write into them.

   You can also copy the files into the folders of the checkout instead (for example to keep the classic files unchanged for [To go back](#to-go-back)). Then leave these variables unset.

5. Start only the database, wait until it is ready, and restore the dump. The message "extension fzy already exists" is harmless.

   ```bash
   podman-compose up -d db
   until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
   # -T: no pseudo-TTY, keeps the binary dump intact.
   # PGOPTIONS: log each statement of this session.
   # --no-owner: give all objects to POSTGRES_USER.
   # --no-acl: skip GRANT and REVOKE of old roles, which do not exist here.
   # --verbose: print each restored object.
   podman-compose exec -T db env PGOPTIONS='-c log_statement=all' \
     pg_restore -U admin -d fms --no-owner --no-acl --verbose < fms_classic.dump
   ```

6. Apply the migrations while only `db` runs, then start all services and check them. The migration command prints the applied migrations and ends with exit code 0:

   ```bash
   podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
   podman-compose up -d
   curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/    # 200
   ```

7. Switch the reverse proxy to the containers, as in [Reverse proxy](#reverse-proxy) (migration on the same domain). Then check the site:

   ```bash
   curl -sfo /dev/null -w '%{http_code}\n' https://<domain>/         # 200, through the reverse proxy
   ```

8. Disable the `@reboot` and cron entries of the classic setup (report, backup) in the crontab of its user, so they do not run against the old database.
9. Continue with [Start at boot](#start-at-boot).

## Path B: new host

Use this path when there is no data to keep. Run the steps as `<user>`, in `oci/`.

Start only `db`, apply the migrations in a one-off `backend` container, then start the stack. Nothing applies migrations automatically.

```bash
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
podman-compose up -d
curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/    # 200
curl -sfo /dev/null -w '%{http_code}\n' https://<domain>/         # 200, through the reverse proxy
```

Then continue with [Start at boot](#start-at-boot).

## Start at boot

Run this step as `<user>`, after the first start works. Add this line to the crontab (`crontab -e`):

```cron
@reboot <install-dir>/oci/start.py >> <install-dir>/oci/logs/boot.log 2>&1
```

`start.py` needs the directory `/run/user/<uid>` at boot (see [Prerequisites](#prerequisites)).

If the host has no cron (the host is a container), start `start.py` as `<user>` from the init of the outer container.

## Daily jobs

Run this step as `<user>`, after the first start works. Host cron runs each daily job with `jobs.py`. Each call starts a new `jobs` container (`podman-compose --profile jobs run --rm jobs <command>`) and removes it after the job. Add this line to the crontab (`crontab -e`):

```cron
0 1 * * *  <install-dir>/oci/jobs.py report >> <install-dir>/oci/logs/jobs.log 2>&1
```

- Cron uses the time zone of the host.
- To turn a job off, remove its line.
- If `HOST_LOG_DIR` is not `<install-dir>/oci/logs`, use that directory in the redirection.
- Each job reads `.env` when it starts, so a change of `.env` needs no restart. A change of the job scripts needs `podman-compose build jobs`.
- A host without cron (the host is a container) is not supported yet.

## Daily use

### Start, stop and restart

Run these commands in `oci/`. Use `--force-recreate` after a build or an `.env` change.

| Command | When to use it |
|---|---|
| `podman-compose up -d` | Start the stack. |
| `podman-compose down` | Stop the stack and remove the containers. The volumes and the log files stay. |
| `podman-compose restart backend` | Restart the process of one service in the same container. The image and the `.env` do not change. Use it for a hung service. |
| `podman-compose up -d --force-recreate` | Replace the containers with new ones from the current images and `.env`. Use it after a build or an `.env` change. |

### Update to a new release

```bash
mkdir -p backups && podman-compose exec -T db pg_dumpall -U admin | gzip > backups/$(date +%F).pgsql.gz
git fetch && git checkout vX.Y.Z && git submodule update --init --recursive
# set FMS_IMAGE_TAG=vX.Y.Z in .env
# proxy host: set the variables before each podman-compose command, as in Proxy
podman-compose build
# Stop the services that use the database, so no request meets a schema that does not match the code.
podman-compose stop web backend
podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
podman-compose up -d --force-recreate
```

The migration command runs in a one-off container. It needs the new image (the `build` above) and a running `db`. If it fails, the stack stays down: fix the error, then run it again.

### Database backups

The stack has no automatic backup yet. To dump all databases now, run this command in `oci/` while `db` runs. `pg_dumpall` copies the roles too:

```bash
mkdir -p backups && podman-compose exec -T db pg_dumpall -U admin | gzip > backups/$(date +%F).pgsql.gz
```

To restore, stop the stack, so the site is offline and no service writes to the database. Delete the old data volume, start only `db`, restore, then start the rest.

```bash
podman-compose down
podman volume rm freezeman_pgdata     # deletes the current database
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
# -d postgres: psql must start in another database than fms, because the script runs \connect fms.
gunzip -c <install-dir>/oci/backups/2026-10-21.pgsql.gz | podman-compose exec -T db psql -U admin -d postgres
# Apply the migrations that the backup does not have, while only db runs.
podman-compose run --rm --no-deps backend sh -c 'python manage.py migrate --noinput && python manage.py createinitialrevisions'
podman-compose up -d
```

- The messages "role admin already exists", "database fms already exists" and "extension fzy already exists" are harmless.
- Restore only into an empty `freezeman_pgdata` volume. If the volume is new (first start), skip the first two commands.
- If `POSTGRES_PASSWORD` changed after the backup, set it back to the value at backup time.
- Copy the backups off the host.

### Report and logs

The crontab lines are in [Daily jobs](#daily-jobs). The log settings are in [Get the release and configure](#get-the-release-and-configure), step 3.

Failures: when a job fails, it writes a line that starts with `FAILED:` to its log, followed by the details. The jobs are the report, `jobs.py`, `start.py` and `autoupdate.py`.

```bash
podman-compose logs -f backend                                       # follow the backend log through podman
tail -f <install-dir>/oci/logs/backend.log                           # the same log, read from HOST_LOG_DIR (works after `down`)
podman-compose exec backend tail -f fms.log                          # the Django log if FMS_ENV is not PROD
tail -f <install-dir>/oci/logs/jobs.log                              # the report job
podman-compose exec -T backend python manage.py prepare_report_data  # run the report now (-T: no terminal)
grep -h -A3 "FAILED:" <install-dir>/oci/logs/*.log                  # the job failures
```

### Automatic update (test hosts)

Test hosts only. It deletes the database at each new commit. `FMS_ENV` in `.env` must be set and must not be `PROD` (see [FMS_ENV values](#fms_env-values)). Otherwise `autoupdate.py` stops.

1. Put the checkout on the followed branch, with no local changes:

   ```bash
   cd <install-dir>
   git status --short          # no output for tracked files: no local changes
   git switch <branch>         # the branch that --branch names
   git pull --ff-only
   ```

2. Add a line to the crontab of `<user>` (`crontab -e`). Give the absolute path of a dump (`.pgsql.gz`, `.pgsql` or `.dump`) to `--db-backup-filename`:

   ```cron
   # */10 * * * *: check every 10 minutes.
   # --branch: branch of origin to follow.
   # --db-backup-filename: absolute path of the dump to restore (.pgsql.gz, .pgsql or .dump).
   # >> logs/autoupdate.log 2>&1: append the output and the errors to the log.
   # Optional --interval N: check every N seconds and never exit (default: check once).
   # Optional --force: deploy even if the commit is the last deployed one.
   */10 * * * * <install-dir>/oci/autoupdate.py --branch <branch> --db-backup-filename <install-dir>/oci/backups/2026-10-21.pgsql.gz >> <install-dir>/oci/logs/autoupdate.log 2>&1
   ```

- `autoupdate.py` applies the migrations after the restore, while only `db` runs, and before it starts the stack. If a migration fails, the stack stays down (only `db` runs) and the script logs the failure.
- Proxy host: set `HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=...` before the command in the crontab line.
- No cron (the host is a container): add `--interval 600` and start the command as `<user>` from the init of the outer container. Redirect its output to `logs/autoupdate.log`.
- To deploy the same commit again: add `--force`.

## To go back

Use these steps to return to the classic setup.

1. Stop the stack:

   ```bash
   podman-compose down
   ```

2. Remove the `@reboot` line from the crontab of `<user>`.
3. Restore the copy of the classic reverse proxy configuration (`/`, `/static/`, `/media/` and `/api/`) that you kept in [Reverse proxy](#reverse-proxy).

4. Start the classic uwsgi and its cron entries.

The stack writes after the cutover are not in the classic database. If step 4 of Path A uses the classic folders, the files that the stack wrote are in them.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 502 at the reverse proxy | `web` is not running, or `HOST_HTTP_PORT` does not match the port of the reverse proxy. Check `podman-compose ps` and `curl http://127.0.0.1:<HOST_HTTP_PORT>/`. If `web` answers, check the port in the [Reverse proxy](#reverse-proxy) configuration |
| 502 on `/api/` from `web` | `backend` is not running. Check `podman-compose logs backend` |
| 400 Bad Request | `FMS_HOST` is not the host name of the request |
| 413 on upload | The upload limit is missing in the reverse proxy. Add `client_max_body_size` as in [Reverse proxy](#reverse-proxy) |
| `backend` exits at start with an error about missing tables or columns | The migrations did not run. Run the migration command of [Update to a new release](#update-to-a-new-release) |
