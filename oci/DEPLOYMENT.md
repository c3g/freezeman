# Production deployment

Read [README.md](README.md) first. It describes the services, the layout and the shared setup.

Run all `podman-compose` commands in `<install-dir>/oci` as `<user>`.

Conventions:

- `<user>`: the non-root account that runs the stack with rootless podman.
- `<install-dir>`: the absolute path of the FreezeMan checkout for the stack.
- `<domain>`: the public host name of FreezeMan (`FMS_HOST`).
- `<classic-dir>`: the checkout of a classic FreezeMan install (Path A only).
- `<branch>`: the branch that `autoupdate.py` follows (Automatic update only).
- The local checks use `http://127.0.0.1:8080/`. If you change `FMS_HTTP_PORT`, use your port.
- Lines that start with **C3G:** apply only to the C3G deployment. Other organizations can skip them.

> **C3G:** the values of these placeholders are in [C3G values](ROCKY.md#c3g-values) of ROCKY.md.

Contents:

- [Prerequisites](#prerequisites): shared setup, the host requirements, the proxy.
- [Reverse proxy](#reverse-proxy): TLS and the forward to the `web` container.
- [Set up the account of the user](#set-up-the-account-of-the-user): podman without systemd, `podman system migrate`, podman-compose.
- [Get the release and configure](#get-the-release-and-configure): clone, directories, `.env`, scheduled jobs, image build.
- Do one of these two paths:
  - [Path A: migrate from the classic host](#path-a-migrate-from-the-classic-host): dump, copy the files, restore, cutover of the reverse proxy.
  - [Path B: new host](#path-b-new-host): first start with an empty database.
- [Start at boot](#start-at-boot): the `@reboot` crontab line.
- [Daily use](#daily-use)
  - [Start, stop and restart](#start-stop-and-restart): the `podman-compose` commands and when to use each.
  - [Update to a new release](#update-to-a-new-release): back up, check out the tag, build, recreate.
  - [Database backups](#database-backups): settings, a backup now, a restore.
  - [Restore on a slow disk](#restore-on-a-slow-disk): measure the disk, restore with `compose.restore.yaml`.
  - [Report, emails and logs](#report-emails-and-logs): follow the logs, run the report or the log rotation now.
  - [Automatic update (test hosts)](#automatic-update-test-hosts): `autoupdate.py` on test hosts.
- [To go back](#to-go-back): return to the classic setup.
- [Troubleshooting](#troubleshooting): symptoms and likely causes.

## Prerequisites

1. Do the steps of [Prerequisites](README.md#prerequisites) in README.md. They apply to both environments.
2. Prepare the host. These steps need root. [ROCKY.md](ROCKY.md) shows them for a RHEL-family host (Rocky Linux 9).
   - A Linux host with podman 5.4 or later and podman-compose 1.5 or later.
   - A non-root `<user>` with subuid and subgid ranges, for rootless containers.
   - A directory `/run/user/<uid>` of `<user>` that stays from boot to shutdown (for example systemd linger). Rootless podman keeps the state of the running containers there.
   - A cron daemon, or another way to start `start.py` as `<user>` at boot.
   - A reverse proxy with TLS in front of the stack (see [Reverse proxy](#reverse-proxy)).
   - Outbound access for the build. The domains are in [Network access](ROCKY.md#6-network-access) of ROCKY.md. The running stack needs only the SMTP server.
3. If the host reaches the internet through an HTTP proxy, see [Proxy](README.md#proxy). Without a proxy, leave the proxy variables unset.

> **C3G:** IT completes [ROCKY.md](ROCKY.md) on the Rocky Linux 9.6 host and sends the output of the [acceptance checks](ROCKY.md#acceptance-checks) to the FreezeMan team. Production has no proxy.

## Reverse proxy

The `web` container listens on `127.0.0.1:FMS_HTTP_PORT` (default 8080) and speaks plain HTTP. A reverse proxy on the host terminates TLS for `<domain>` and passes all paths to it. The reverse proxy must:

- Pass `Host`, `X-Real-IP`, `X-Forwarded-For` and `X-Forwarded-Proto`. Django checks `Host` against `FMS_HOST`.
- Allow uploads up to 50 MB, and requests up to 300 s.

nginx example, in the HTTPS server block of `<domain>`:

```nginx
client_max_body_size 50M;
client_body_timeout 300s;

location / {
    proxy_pass http://127.0.0.1:8080;      # FMS_HTTP_PORT
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

> **C3G:** IT owns the host nginx. The FreezeMan team has no `sudo` and cannot read or change it. Give IT `FMS_HOST` and `FMS_HTTP_PORT` of `.env`. IT does [Host nginx](ROCKY.md#5-host-nginx) of ROCKY.md, in Path A at the cutover (step 7).

## Set up the account of the user

Run these steps as `<user>`.

> **C3G:** log in with `sudo su - django`.

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

   > **C3G:** `<install-dir>` is `/data/freezeman-oci`. The classic setup uses `/data/freezeman`.

2. Create the directories:

   ```bash
   mkdir -p <install-dir>/oci/logs <install-dir>/backups <install-dir>/backend/media <install-dir>/backend/triggers
   ```

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
   | `FMS_ENV` | `PROD` on the production host. `QC` or `DEV` on a test host. See [FMS_ENV values](#fms_env-values) |
   | `FMS_LOG_DIR` | `<install-dir>/oci/logs` (absolute path) |
   | `FMS_BACKUP_DIR` | `<install-dir>/backups` |
   | `FMS_HTTP_PORT` | The port that the reverse proxy passes to. Default: 8080 |
   | `FMS_EMAIL_HOST`, `FMS_EMAIL_PORT`, `FMS_EMAIL_FROM`, `FMS_EMAIL_USER`, `FMS_EMAIL_PASSWORD`, `FMS_EMAIL_TLS` | The SMTP server. To turn TLS off, leave `FMS_EMAIL_TLS` empty |
   | `FMS_ALERT_EMAILS` | The recipients of the failure emails (comma list) |
   | `TZ` | The time zone of the services. Default: `UTC`. Example: `America/Montreal` |
   | `FMS_REPORT_TIME`, `FMS_BACKUP_TIME`, `FMS_LOGROTATE_TIME` | The time of day (HH:MM, in `TZ`) of the daily report, database backup and log rotation. See "Scheduled jobs" below the table |
   | `FMS_LOGROTATE_FREQUENCY`, `FMS_LOGROTATE_KEEP` | How often each log rotates (`daily`, `weekly`, `monthly` or `yearly`) and how many rotated files to keep. Defaults: `weekly`, 8 |
   | `FMS_BACKUP_KEEP_DAYS` | Delete backups older than this many days, but always keep the newest `FMS_BACKUP_KEEP_DAYS` backups (0 keeps all). Default: 14 |

   <a id="fms_env-values"></a>**FMS_ENV values:** only `PROD` is special. Every other value has the same behaviour, and the web page shows the value.

   | Area | `PROD` | Other value (`QC`, `DEV`) |
   |---|---|---|
   | Django log | `WARNING` and higher goes to the console, so to `FMS_LOG_DIR/backend.log` | `DEBUG` and higher goes to `fms.log` in `/src/backend` of the `backend` container. These messages do not go to `backend.log`. The file is not a bind mount, so it is lost when the container is recreated. `fms-logrotate` does not rotate it. Django rotates it at 2 GB and keeps 1 old file |
   | Allowed hosts (`FMS_DEBUG=False`) | `FMS_HOST` only | `FMS_HOST` and `localhost` |
   | Web page | Normal header | Header with a different background and the value in red. The About page also shows the value |
   | Failure emails | Subject starts with `[FreezeMan PROD <host>]` | Subject starts with `[FreezeMan <value> <host>]` |
   | `autoupdate.py` | Stops with an error. It does not touch the database | Runs. It deletes the database at each new commit |
   | Scheduled jobs | Same for every value: each job with a time in `.env` runs | Same. On a host with `autoupdate.py`, the next new commit replaces the database. To stop the backup, comment out `FMS_BACKUP_TIME` |

   The `web` image gets `FMS_ENV` when it is built. `backend` and `scheduler` read it when they start. After a change of `FMS_ENV` in `.env`, run `podman-compose build web`, then `podman-compose up -d --force-recreate`. `LOCAL` is the value of the development stack (`compose.dev.yaml`). Do not use it on a server.

   > **C3G:** the production host uses `PROD`, the QC host `QC` and the dev host `DEV`.

   **Scheduled jobs:** the `scheduler` service runs the report, the backup and the log rotation. A job runs only if its time is set. Remove or comment out a time in `.env` to turn that job off. `.env.example` sets all three times. If no job has a time, the `scheduler` stops with exit code 0. If a time is not HH:MM, it stops with an error and an alert email. Podman does not restart it in either case: fix `.env`, then run `podman-compose up -d --force-recreate scheduler`.

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

   `TZ` also sets the time zone of `FMS_BACKUP_TIME`, `FMS_REPORT_TIME` and `FMS_LOGROTATE_TIME`. To use another time zone, set `TZ` to it.

3. Dump the classic database. Do not use `pg_dumpall` or the `backup_release_*.pgsql` files of the classic host.

   ```bash
   # -Fc: custom format, restore with pg_restore.
   pg_dump -U postgres -Fc fms > fms_classic.dump
   ```

4. Copy the media files and the trigger folders. If the classic host is another machine, use `rsync -a` over SSH.

   ```bash
   cp -a <classic-dir>/backend/media/. <install-dir>/backend/media/
   cp -a <classic-dir>/backend/triggers/. <install-dir>/backend/triggers/
   ```

5. Start only the database, wait until it is ready, and restore the dump. On a slow disk, follow [Restore on a slow disk](#restore-on-a-slow-disk) instead. The message "extension fzy already exists" is harmless.

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
   podman-compose run --rm --no-deps backend sh -c "python manage.py migrate --noinput && python manage.py createinitialrevisions"
   podman-compose up -d
   curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/    # 200
   ```

7. Switch the reverse proxy to the containers, as in [Reverse proxy](#reverse-proxy) (migration on the same domain). Then check the site:

   ```bash
   curl -sfo /dev/null -w '%{http_code}\n' https://<domain>/         # 200, through the reverse proxy
   ```

   > **C3G:** ask IT to do [Host nginx](ROCKY.md#5-host-nginx) of ROCKY.md. Wait for the output of its checks before the `curl`.

8. Disable the `@reboot` and cron entries of the classic setup (report, backup) in the crontab of its user, so they do not run against the old database.
9. Continue with [Start at boot](#start-at-boot).

## Path B: new host

Use this path when there is no data to keep. Run the steps as `<user>`, in `oci/`.

Start only `db`, apply the migrations in a one-off `backend` container, then start the stack. Nothing applies migrations automatically.

```bash
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
podman-compose run --rm --no-deps backend sh -c "python manage.py migrate --noinput && python manage.py createinitialrevisions"
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
podman-compose exec scheduler fms-backup now
git fetch && git checkout vX.Y.Z && git submodule update --init --recursive
# set FMS_IMAGE_TAG=vX.Y.Z in .env
# proxy host: set the variables before each podman-compose command, as in Proxy
podman-compose build
# Stop the services that use the database, so no request meets a schema that does not match the code.
podman-compose stop web backend scheduler
podman-compose run --rm --no-deps backend sh -c "python manage.py migrate --noinput && python manage.py createinitialrevisions"
podman-compose up -d --force-recreate
```

The migration command runs in a one-off container. It needs the new image (the `build` above) and a running `db`. If it fails, the stack stays down: fix the error, then run it again.

### Database backups

The `scheduler` service starts with `podman-compose up -d` and runs the backup every day. To change its settings, edit `.env`, then run `podman-compose up -d --force-recreate`. To run a backup now, use the last command:

```bash
# oci/.env
# Host directory for the daily dumps. It must exist.
FMS_BACKUP_DIR=<install-dir>/backups
# Time of day (HH:MM, in TZ) of the backup.
FMS_BACKUP_TIME=01:00
# Delete backups older than this many days, but always keep the newest
# FMS_BACKUP_KEEP_DAYS backups (0 keeps all).
FMS_BACKUP_KEEP_DAYS=14

podman-compose exec scheduler fms-backup now   # run one backup now
```

To restore, stop the stack, so the site is offline and no service writes to the database. Delete the old data volume, start only `db`, restore, then start the rest. On a slow disk, start `db` as in [Restore on a slow disk](#restore-on-a-slow-disk).

```bash
podman-compose down
podman volume rm freezeman_pgdata     # deletes the current database
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
# -d postgres: psql must start in another database than fms, because the script runs \connect fms.
gunzip -c <install-dir>/backups/2026-10-21.pgsql.gz | podman-compose exec -T db psql -U admin -d postgres
# Apply the migrations that the backup does not have, while only db runs.
podman-compose run --rm --no-deps backend sh -c "python manage.py migrate --noinput && python manage.py createinitialrevisions"
podman-compose up -d
```

- The messages "role admin already exists", "database fms already exists" and "extension fzy already exists" are harmless.
- Restore only into an empty `freezeman_pgdata` volume. If the volume is new (first start), skip the first two commands.
- If `POSTGRES_PASSWORD` changed after the backup, set it back to the value at backup time.
- Copy the backups off the host.

### Restore on a slow disk

Measure the flush rate of the disk:

```bash
podman-compose up -d db
podman-compose exec db pg_test_fsync -f /var/lib/postgresql/data/fsync.test -s 2
```

If `fdatasync` is near 250 operations per second or less, use these steps. Use them only for a restore into a new, empty `freezeman_pgdata` volume. If the host crashes during the restore, run `podman-compose down`, run `podman volume rm freezeman_pgdata` and start again.

1. Start only `db` with the override:

   ```bash
   podman-compose -f compose.yaml -f compose.restore.yaml up -d db
   ```

2. Wait for `db` (same `until` loop as in [Path A](#path-a-migrate-from-the-classic-host)), then run the restore command: `pg_restore` as in [Path A](#path-a-migrate-from-the-classic-host), or `psql` as in [Database backups](#database-backups).
3. Start `db` again with the normal settings. The log of the new server must say "database system was shut down at":

   ```bash
   podman-compose up -d --force-recreate db
   ```

4. Check that `SHOW fsync` gives `on`, write the files to the disk, and start the other services:

   ```bash
   podman-compose exec db psql -U admin -d fms -c 'SHOW fsync'
   # "For reliable recovery when changing fsync off to on, it is necessary to force all modified buffers in
   # the kernel to durable storage. This can be done while the cluster is shutdown or while fsync is on by
   # running initdb --sync-only, running sync, unmounting the file system, or rebooting the server."
   # Source: https://www.postgresql.org/docs/15/runtime-config-wal.html#GUC-FSYNC
   sync
   podman-compose run --rm --no-deps backend sh -c "python manage.py migrate --noinput && python manage.py createinitialrevisions"
   podman-compose up -d
   ```

### Report, emails and logs

The times and the log settings are in [Get the release and configure](#get-the-release-and-configure), step 3. After an `.env` change, run `podman-compose up -d --force-recreate`. `start.py` starts the `scheduler` again at boot.

Failure emails: `notify.py` sends an alert email to `FMS_ALERT_EMAILS` when a job fails. The jobs are the report, the backup, the log rotation, the `scheduler` start (a wrong time in `.env`), `start.py` and `autoupdate.py`. A successful run sends no email. The emails use the SMTP settings `FMS_EMAIL_*` (step 3). If `FMS_EMAIL_HOST` or `FMS_ALERT_EMAILS` is empty, no email goes out and the alert goes only to the log. Each alert writes one line that starts with `Alert email` to the log of its job: `sent to ...`, `failed: ...` (SMTP error) or `disabled ...`.

```bash
podman-compose logs -f backend                                       # follow the backend log through podman
tail -f <install-dir>/oci/logs/backend.log                           # the same log, read from FMS_LOG_DIR (works after `down`)
podman-compose exec backend tail -f fms.log                          # the Django log if FMS_ENV is not PROD
tail -f <install-dir>/oci/logs/scheduler.log                         # the report, backup and log rotation jobs
podman-compose exec -T backend python manage.py prepare_report_data  # run the report now (-T: no terminal)
podman-compose exec scheduler fms-logrotate now                      # rotate now (only a file that is due)
grep -h "Alert email" <install-dir>/oci/logs/*.log                   # the alerts: sent, failed or disabled
```

### Automatic update (test hosts)

Test hosts only. It deletes the database at each new commit. `FMS_ENV` must not be `PROD` (see [FMS_ENV values](#fms_env-values)). If it is, `autoupdate.py` stops.

> **C3G:** the QC host follows the `qc` branch. The dev host follows `master`.

1. Put the checkout on the followed branch, with no local changes:

   ```bash
   cd <install-dir>
   git status --short          # no output for tracked files: no local changes
   git switch <branch>         # the branch that --branch names
   git pull --ff-only
   ```

2. Add a line to the crontab of `<user>` (`crontab -e`). Give the absolute path of a dump (`.pgsql.gz`, `.pgsql` or `.dump`) to `--dump`:

   ```cron
   # */10 * * * *: check every 10 minutes.
   # --branch: branch of origin to follow.
   # --dump: absolute path of the dump to restore (.pgsql.gz, .pgsql or .dump).
   # >> logs/autoupdate.log 2>&1: append the output and the errors to the log.
   # Optional --interval N: check every N seconds and never exit (default: check once).
   # Optional --force: deploy even if the commit is the last deployed one.
   # Optional --fast-restore: restore with the settings of compose.restore.yaml (slow disk).
   */10 * * * * <install-dir>/oci/autoupdate.py --branch <branch> --dump <install-dir>/backups/2026-10-21.pgsql.gz >> <install-dir>/oci/logs/autoupdate.log 2>&1
   ```

- `autoupdate.py` applies the migrations after the restore, while only `db` runs, and before it starts the stack. If a migration fails, the stack stays down (only `db` runs) and the script sends the alert email.
- Proxy host: set `HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=...` before the command in the crontab line.
- No cron (the host is a container): add `--interval 600` and start the command as `<user>` from the init of the outer container. Redirect its output to `logs/autoupdate.log`.
- Slow disk (see [Restore on a slow disk](#restore-on-a-slow-disk)): add `--fast-restore`.
- To deploy the same commit again: add `--force`.

## To go back

Use these steps to return to the classic setup.

1. Stop the stack:

   ```bash
   podman-compose down
   ```

2. Remove the `@reboot` line from the crontab of `<user>`.
3. Restore the copy of the classic reverse proxy configuration (`/`, `/static/`, `/media/` and `/api/`) that you kept in [Reverse proxy](#reverse-proxy).

   > **C3G:** ask IT to do [Undo](ROCKY.md#undo) of ROCKY.md.

4. Start the classic uwsgi and its cron entries.

The stack writes after the cutover are not in the classic database.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 502 at the reverse proxy | `web` is not running, or `FMS_HTTP_PORT` does not match the port of the reverse proxy. Check `podman-compose ps` and `curl http://127.0.0.1:<FMS_HTTP_PORT>/`. If `web` answers, check the port in the [Reverse proxy](#reverse-proxy) configuration (C3G: ask IT) |
| 502 on `/api/` from `web` | `backend` is not running. Check `podman-compose logs backend` |
| 400 Bad Request | `FMS_HOST` is not the host name of the request |
| 413 on upload | The upload limit is missing in the reverse proxy. Add `client_max_body_size` as in [Reverse proxy](#reverse-proxy) (C3G: ask IT) |
| `backend` exits at start with an error about missing tables or columns | The migrations did not run. Run the migration command of [Update to a new release](#update-to-a-new-release) |
| Restore takes hours | The disk is slow at flushes. See [Restore on a slow disk](#restore-on-a-slow-disk) |
