# Production deployment

Read [README.md](README.md) first. It describes the services, the layout and the shared setup.

Run all `podman-compose` commands in `/data/freezeman-oci/oci` as `django`.

Contents:

- [Prerequisites](#prerequisites)
- [Host nginx](#host-nginx)
- [Set up the home of django](#set-up-the-home-of-django)
- [Get the release and configure](#get-the-release-and-configure)
- [Path A: migrate from the classic host](#path-a-migrate-from-the-classic-host)
- [Path B: new host](#path-b-new-host)
- [Start at boot](#start-at-boot)
- [Daily use](#daily-use)
- [To go back](#to-go-back)
- [Troubleshooting](#troubleshooting)

## Prerequisites

1. Do the steps of [Prerequisites](README.md#prerequisites) in README.md. They apply to both environments.
2. IT completes [ROCKY.md](ROCKY.md) and sends the output of the [acceptance checks](ROCKY.md#acceptance-checks) to the FreezeMan team.
3. Production has no proxy. Leave the proxy variables unset (see [Proxy](README.md#proxy)).

## Host nginx

IT owns the host nginx. The FreezeMan team has no `sudo` and cannot read or change the nginx configuration.
IT does the setup in [Host nginx](ROCKY.md#5-host-nginx) of ROCKY.md. In Path A, IT does it at the cutover (step 7).

Give IT these values of `.env`:

- `FMS_HOST`: the FreezeMan domain (`server_name` of the HTTPS server block).
- `FMS_HTTP_PORT`: the `proxy_pass` port (default 8080).

## Set up the home of django

Run these steps as `django` (`sudo su - django`).

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

      # Rootless podman: `sudo su - django` does not set XDG_RUNTIME_DIR. Podman keeps the state of
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

Run these steps as `django`.

1. Get the release. Do not use `/data/freezeman` (for now): the classic setup uses it.

   ```bash
   cd /data
   git clone --recurse-submodules https://github.com/c3g/freezeman.git /data/freezeman-oci
   ```

2. Create the directories:

   ```bash
   mkdir -p /data/freezeman-oci/oci/logs /data/freezeman-oci/backups /data/freezeman-oci/backend/media /data/freezeman-oci/backend/triggers
   ```

3. Create `.env` and set these values. The other values in `.env.example` have working defaults.

   ```bash
   cd /data/freezeman-oci/oci
   cp .env.example .env
   ```

   | Variable | Value |
   |---|---|
   | `POSTGRES_PASSWORD` | A new password |
   | `FMS_SECRET_KEY` | A new secret key (`python3 -c "import secrets; print(secrets.token_urlsafe(50))"`) |
   | `FMS_HOST` | The FreezeMan domain |
   | `FMS_ENV` | `PROD` |
   | `FMS_LOG_DIR` | `/data/freezeman-oci/oci/logs` (absolute path) |
   | `FMS_BACKUP_DIR` | `/data/freezeman-oci/backups` |
   | `FMS_EMAIL_HOST`, `FMS_EMAIL_PORT`, `FMS_EMAIL_FROM`, `FMS_EMAIL_USER`, `FMS_EMAIL_PASSWORD`, `FMS_EMAIL_TLS` | The SMTP server. To turn TLS off, leave `FMS_EMAIL_TLS` empty |
   | `FMS_ALERT_EMAILS` | The recipients of the failure emails (comma list) |
   | `TZ` | The time zone of the services, for example `America/Montreal` |

4. Build the images:

   ```bash
   # Proxy host: set the variables as in Proxy. Other hosts: remove them.
   HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=... podman-compose build
   ```

## Path A: migrate from the classic host

Use this path to keep the data of the classic host. Run the steps as `django`, in `oci/`.

1. Announce the downtime. Stop the classic uwsgi, so no write happens after the dump.
2. Optional. Tools that query the database outside Django (`psql`, reports) use the default time zone of the database. Django is not affected. To keep the classic dates in these tools, set `TZ` in `.env` to the result of this command, before step 5:

   ```bash
   psql -U postgres -d fms -c 'SHOW timezone'
   ```

   `TZ` also sets the time zone of `FMS_BACKUP_TIME`, `FMS_REPORT_TIME`, `FMS_LOGROTATE_TIME` and `FMS_REMIND_TIME`. To use another time zone, set `TZ` to it.

3. Dump the classic database. Do not use `pg_dumpall` or the `backup_release_*.pgsql` files of the classic host.

   ```bash
   # -Fc: custom format, restore with pg_restore.
   pg_dump -U postgres -Fc fms > fms_classic.dump
   ```

4. Copy the media files and the trigger folders. If the classic host is another machine, use `rsync -a` over SSH.

   ```bash
   cp -a /data/freezeman/backend/media/. /data/freezeman-oci/backend/media/
   cp -a /data/freezeman/backend/triggers/. /data/freezeman-oci/backend/triggers/
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

6. Start all services and check them:

   ```bash
   podman-compose up -d
   podman-compose logs migrate          # migrations applied?
   curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/    # 200
   ```

7. Ask IT to switch the host nginx to the containers, as in [Host nginx](ROCKY.md#5-host-nginx) of ROCKY.md (migration on the same domain). Wait for the output of its checks. Then check the site:

   ```bash
   curl -sfo /dev/null -w '%{http_code}\n' https://<host>/           # 200, through the host nginx (<host> is the FreezeMan domain)
   ```

8. Disable the `@reboot` and cron entries of the classic setup (report, backup) in the crontab of its user, so they do not run against the old database.
9. Continue with [Start at boot](#start-at-boot).

## Path B: new host

Use this path when there is no data to keep. Run the steps as `django`, in `oci/`.

```bash
podman-compose up -d
podman-compose logs migrate          # migrations applied?
curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/    # 200
curl -sfo /dev/null -w '%{http_code}\n' https://<host>/           # 200, through the host nginx (<host> is the FreezeMan domain)
```

Then continue with [Start at boot](#start-at-boot).

## Start at boot

Run this step as `django`, after the first start works. Add this line to the crontab (`crontab -e`):

```cron
@reboot /data/freezeman-oci/oci/start.py >> /data/freezeman-oci/oci/logs/boot.log 2>&1
```

If the host has no cron (the host is a container), start `start.py` as `django` from the init of the outer container.

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
podman-compose exec backup fms-backup now
git fetch && git checkout vX.Y.Z && git submodule update --init --recursive
# set FMS_IMAGE_TAG=vX.Y.Z in .env
# proxy host: set the variables before each podman-compose command, as in Proxy
HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=... podman-compose build
podman-compose up -d --force-recreate
podman-compose logs migrate
```

### Database backups

The `backup` service starts with `podman-compose up -d` and runs every day. To change its settings, edit `.env`, then run `podman-compose up -d --force-recreate`. To run a backup now, use the last command:

```bash
# oci/.env
# Host directory for the daily dumps. It must exist.
FMS_BACKUP_DIR=/data/freezeman-oci/backups
# Time of day (HH:MM, in TZ) of the backup.
FMS_BACKUP_TIME=01:00
# Delete backups older than this many days (0 keeps all).
FMS_BACKUP_KEEP_DAYS=14

podman-compose exec backup fms-backup now      # run one backup now
```

To restore, stop the stack, so the site is offline and no service writes to the database. Delete the old data volume, start only `db`, restore, then start the rest. On a slow disk, start `db` as in [Restore on a slow disk](#restore-on-a-slow-disk).

```bash
podman-compose down
podman volume rm freezeman_pgdata     # deletes the current database
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
# -d postgres: psql must start in another database than fms, because the script runs \connect fms.
gunzip -c /data/freezeman-oci/backups/2026-10-21.pgsql.gz | podman-compose exec -T db psql -U admin -d postgres
podman-compose up -d                 # migrate applies the migrations that the backup does not have
podman-compose logs migrate
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

2. Wait for `db` (same `until` loop as in [Path A](#path-a-migrate-from-the-classic-host)), then run the restore command: `pg_restore` as in Path A, or `psql` as in [Database backups](#database-backups).
3. Start `db` again with the normal settings. The log of the new server must say "database system was shut down at":

   ```bash
   podman-compose up -d --force-recreate db
   ```

4. Write the files to the disk, check that `SHOW fsync` gives `on`, and start the other services:

   ```bash
   sync
   podman-compose exec db psql -U admin -d fms -c 'SHOW fsync'
   podman-compose up -d
   ```

### Report, emails and logs

Set the times in `.env`. After an `.env` change, run `podman-compose up -d --force-recreate`.

```bash
# oci/.env
# Time of day (HH:MM, in TZ) for prepare_report_data.
FMS_REPORT_TIME=02:00
# Time of day (HH:MM, in TZ) of the daily log rotation.
FMS_LOGROTATE_TIME=03:00
# How often each log rotates: daily, weekly, monthly or yearly.
FMS_LOGROTATE_FREQUENCY=weekly
# Rotated files to keep for each log.
FMS_LOGROTATE_KEEP=8
```

```bash
podman-compose logs -f backend
tail -f /data/freezeman-oci/oci/logs/backend.log
podman-compose exec -T backend python manage.py prepare_report_data              # run the report now
podman-compose exec logrotate fms-logrotate now                # rotate now (only a file that is due)
```

### Remind the image updates

The `remind` service emails a monthly reminder to update the base images. It uses the SMTP settings and the
`FMS_ALERT_EMAILS` recipients of `.env`, as the failure emails do. It starts with the stack. It sends only if `FMS_ENV` is `PROD`: on QC and dev it idles and sends nothing.

```bash
# oci/.env
# Day of the month (1 to 28) and time of day (HH:MM, in TZ) of the reminder.
FMS_REMIND_DAY=1
FMS_REMIND_TIME=09:00
```

After an `.env` change, run `podman-compose up -d --force-recreate remind`.

```bash
podman-compose exec remind fms-remind now    # send the reminder now (a test)
cat /data/freezeman-oci/oci/logs/remind.state # the last month sent
```

- The service keeps the last month sent in `logs/remind.state`, so a restart does not send the email twice.
  At its first start it sends nothing and waits for the next date.
- If `FMS_EMAIL_HOST` or `FMS_ALERT_EMAILS` is empty, the service sends no email and logs a message instead.
- `fms-remind now` sends the email on any host, as a test.
- The email only reminds you. Do the update with the steps of "Keep the base images up to date" in `oci/README.md`.
- A stopped stack sends no reminder.

### Automatic update (QC)

QC and dev hosts only. It deletes the database at each new commit.

1. Put the checkout on the followed branch, with no local changes:

   ```bash
   cd /data/freezeman-oci
   git status --short          # no output for tracked files: no local changes
   git switch qc               # the branch that --branch names
   git pull --ff-only
   ```

2. Add a line to the crontab of `django` (`crontab -e`). Give the absolute path of a dump (`.pgsql.gz`, `.pgsql` or `.dump`) to `--dump`:

   ```cron
   # */10 * * * *: check every 10 minutes.
   # --branch: branch of origin to follow.
   # --dump: absolute path of the dump to restore (.pgsql.gz, .pgsql or .dump).
   # >> logs/autoupdate.log 2>&1: append the output and the errors to the log.
   # Optional --interval N: check every N seconds and never exit (default: check once).
   # Optional --force: deploy even if the commit is the last deployed one.
   # Optional --fast-restore: restore with the settings of compose.restore.yaml (slow disk).
   */10 * * * * /data/freezeman-oci/oci/autoupdate.py --branch qc --dump /data/freezeman-oci/backups/2026-10-21.pgsql.gz >> /data/freezeman-oci/oci/logs/autoupdate.log 2>&1
   ```

- Proxy host: set `HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=...` before the command in the crontab line.
- No cron (the host is a container): add `--interval 600` and start the command as `django` from the init of the outer container. Redirect its output to `logs/autoupdate.log`.
- Slow disk (see [Restore on a slow disk](#restore-on-a-slow-disk)): add `--fast-restore`.
- To deploy the same commit again: add `--force`.

## To go back

Use these steps to return to the classic setup.

1. Stop the stack:

   ```bash
   podman-compose down
   ```

2. Remove the `@reboot` line from the crontab of `django`.
3. Ask IT to restore the classic server block (`/`, `/static/`, `/media/` and `/api/`) from its copy, as in [Undo](ROCKY.md#undo) of ROCKY.md.
4. Start the classic uwsgi and its cron entries.

The stack writes after the cutover are not in the classic database.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 502 at the host nginx | `web` is not running, or `FMS_HTTP_PORT` does not match the `proxy_pass` port. Check `podman-compose ps` and `curl http://127.0.0.1:8080/`. If `web` answers, ask IT to check the `proxy_pass` port |
| 502 on `/api/` from `web` | `backend` is not running. Check `podman-compose logs backend` |
| 400 Bad Request | `FMS_HOST` is not the host name of the request |
| 413 on upload | `client_max_body_size` is missing in the HTTPS server block of the FreezeMan domain. Ask IT to add it ([Host nginx](ROCKY.md#5-host-nginx)) |
| Restore takes hours | The disk is slow at flushes. See [Restore on a slow disk](#restore-on-a-slow-disk) |
