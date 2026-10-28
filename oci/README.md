# FreezeMan containers

Contents:

- [Container organization and roles](#container-organization-and-roles)
  - [Production](#production)
    - [Host nginx](#host-nginx)
  - [Development](#development)
- [Prerequisites](#prerequisites)
  - [Production](#production-1)
  - [Development](#development-1)
  - [Proxy](#proxy)
- [Usage](#usage)
  - [Production](#production-2)
    - [Set up the home of django](#set-up-the-home-of-django)
    - [Get the release and create the directories](#get-the-release-and-create-the-directories)
    - [First start](#first-start)
    - [Start at boot](#start-at-boot)
    - [To go back](#to-go-back)
    - [Switch to HTTPS (later)](#switch-to-https-later)
    - [Start, stop and restart](#start-stop-and-restart)
    - [Update to a new release](#update-to-a-new-release)
    - [Automatic update (QC)](#automatic-update-qc)
    - [Database backups](#database-backups)
    - [Daily report data](#daily-report-data)
    - [Failure emails](#failure-emails)
    - [Logs](#logs)
    - [Troubleshooting](#troubleshooting)
  - [Development](#development-2)
    - [Database access](#database-access)
    - [Dev Container](#dev-container)
    - [Test the production stack locally](#test-the-production-stack-locally)
  - [Useful podman and podman-compose commands](#useful-podman-and-podman-compose-commands)
- [Additional notes](#additional-notes)
- [Path to Kubernetes](#path-to-kubernetes)

## Container organization and roles

Container images and podman-compose configuration for FreezeMan.

- The stack runs the same software as `DEPLOYMENT.md` (same major versions): Python 3.14, Node 24, uwsgi 2.0 behind nginx, PostgreSQL 15.
- The PostgreSQL version is the `POSTGRES_IMAGE` build argument in `db/Containerfile`.
- The uwsgi version is `UWSGI_VERSION` in `Containerfile`.
- uwsgi settings are in `backend/uwsgi.ini`.

### Production

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL 15 with the `fzy` extension (`backend/dependencies/pg_fzy`) |
| `migrate`  | `localhost/freezeman-backend` | One-shot: `migrate` + `createinitialrevisions`, then exits      |
| `backend`  | `localhost/freezeman-backend` | Django on uwsgi: port 8000 uwsgi protocol (internal)                 |
| `report`   | `localhost/freezeman-backend` | Daily `prepare_report_data` at `FMS_REPORT_TIME`                |
| `backup`   | `localhost/freezeman-backup`  | Daily `pg_dumpall` to `FMS_BACKUP_DIR` as `<YYYY-MM-DD>.pgsql.gz`    |
| `web`      | `localhost/freezeman-web`     | nginx in a container: the built frontend, Django static files, `/media/`. Passes `/api/` to uwsgi. The host nginx passes HTTP to it |

#### Host nginx

The host nginx passes HTTP to the `web` service. IT added this location to the HTTP server block:

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

- HTTPS stays on the classic setup (`DEPLOYMENT.md`). The two setups use separate directories, databases and media.
  See [First start](#first-start).
- `compose.yaml` binds the port to `127.0.0.1` only. Only the host nginx can reach it. The firewall needs no change.
  - `FMS_HTTP_ADDR`: the address of the bind (`127.0.0.1`).
  - `FMS_HTTP_PORT`: must match the `proxy_pass` port.
- The `web` nginx turns `X-Forwarded-Proto: https` into `HTTPS=on` for uwsgi. On HTTP, Django builds `http` URLs.
- Limits: the host HTTP server block needs `client_max_body_size 50M` and `client_body_timeout 300s`, as the HTTPS block.
  The `web` nginx uses the same values. Without them, an upload over 1 MB fails with 413 at the host nginx.

### Development

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL 15 with the `fzy` extension. Port 5432 is published  |
| `dev`      | `localhost/freezeman-dev`     | Idle container with the venv (`/opt/venv`), Python 3.14 and Node 24. You start the Django server (`runserver`) and the frontend dev server (webpack) by hand inside it. It takes the place of the production `backend` service |

- The repository is bind-mounted at `/src`. Files that the container writes (`fms.log`, migrations, uploads)
  belong to your host user (`userns_mode: keep-id`).
- Container `node_modules` live in a named volume, separate from the host's. This gives you:
  - No clash between the host and the container. `npm ci` installs binaries for one OS and architecture
    (for example webpack and esbuild). The Linux container and a macOS or Windows host need different binaries.
  - Faster installs and builds on macOS and Windows. `node_modules` has many small files, and a bind mount
    is slow through the Podman VM.
  - Correct file owners (`:U` gives the volume to the container user), and no container files in your checkout.

  The host editor does not see this `node_modules`. Use the [Dev Container](#dev-container) if the editor needs it.
- The production services `migrate`, `backend` and `web` have the profile `prod` in development,
  so `up -d` does not start them. `report` and `backup` do not start either.

## Prerequisites

Do these steps for both environments:

- Check out the pg_fzy submodules: `git submodule update --init --recursive`
- Use a checkout with a real `.git` directory (not a `git worktree`, whose `.git` is a file pointing elsewhere).
  The frontend build and `build_info.json` read commit information from it.
- Run `cd oci && cp .env.example .env`, then set at least `POSTGRES_PASSWORD`, `FMS_SECRET_KEY`, `FMS_HOST` and `FMS_LOG_DIR`.
  - `FMS_LOG_DIR`: the absolute path of the log directory. It has no default: compose stops if it is not set.

### Production

IT completes [ROCKY.md](ROCKY.md) and sends the output of the [acceptance checks](ROCKY.md#acceptance-checks) to the FreezeMan team.
Then do the steps in [Usage > Production](#production-2).

### Development

Development works on any OS with podman and podman-compose. The `:z` SELinux labels are ignored where SELinux is absent.

- Windows: [install Podman](https://podman.io/docs/installation#windows) and use `podman machine`.
- macOS: [install Podman](https://podman.io/docs/installation#macos) and use `podman machine`.
- Ubuntu 26.04 Desktop: [install Podman](https://podman.io/docs/installation#ubuntu).
- All systems: [install podman-compose](https://github.com/containers/podman-compose#installation).
- Optional: VS Code with the [Dev Containers extension](https://code.visualstudio.com/docs/devcontainers/containers).
  The editor runs in the `dev` container, so the language servers see the venv and `node_modules`.
  See [Dev Container](#dev-container).

### Proxy

Do this section only if your host reaches the internet through an HTTP proxy (for example the lab dev server).
Without a proxy, skip it. The stack then works as before. Production has no proxy: leave the variables unset there.

- Give the proxy to the `podman-compose` command. Use the uppercase names. Set them before the command, so
  they apply only to this command and not to other commands of the shell:

  ```bash
  HTTP_PROXY=http://<proxy-host>:<port> \
  HTTPS_PROXY=http://<proxy-host>:<port> \
  NO_PROXY=localhost,127.0.0.1 \
  podman-compose build
  ```

  Do the same for `podman pull` and `podman-compose up`.

- Image pulls (`docker.io/...`) need the proxy in the shell. The podman process does the pull, and it does not read `.env`.
- The builds (`apt-get`, `pip`, `npm ci`) and the `dev` container get the proxy from compose. Compose reads the shell
  first, then `oci/.env`. Use the proxy block of `.env` when compose starts without the shell proxy (VS Code Dev Containers).
  Then run `podman pull` for the base images (the `FROM` lines of the Containerfiles) once, from a shell that has the proxy.
- `NO_PROXY` always gets the service names `db`, `backend` and `web`, so traffic between the containers never uses the proxy.
  You do not add them.
- Runtime proxy:
  - The proxy values are build arguments of podman and stay out of the images.
  - At runtime, only `dev` gets the proxy (from `compose.dev.yaml`).
  - The other services (`db`, `migrate`, `backend`, `report`, `backup`, `web`) get empty proxy variables from `compose.yaml`.
  - The empty values override the proxy that podman copies from its own environment (`http_proxy = true`, the default of
    `containers.conf`) and the proxy values of `.env` (`env_file`).
  - These services make no outbound HTTP calls, so they do not need a proxy.
  - Only in `dev` does `NO_PROXY` get the service names.
- Known quirk: podman-compose interpolates the `environment` of a service twice. If the shell has a proxy but no `NO_PROXY`,
  `podman-compose config` shows `db,backend,web` twice in the `NO_PROXY` and `no_proxy` of `dev`. The duplicates have no effect.
- Email ignores the proxy. Django opens a direct connection to `FMS_EMAIL_HOST:587`, and the proxy does not carry SMTP.
  If the host has no direct route to the SMTP server, leave `FMS_EMAIL_HOST` unset. Emails then go to the console.

## Usage

Run all `podman-compose` commands from `oci/`.

### Production

Do these steps after IT completes [ROCKY.md](ROCKY.md) and the [acceptance checks](ROCKY.md#acceptance-checks) pass.

Do these sections in this order. On a new host with no data to keep, skip the steps marked **classic host**.

1. [Set up the home of django](#set-up-the-home-of-django): podman configuration and podman-compose.
2. [Get the release and create the directories](#get-the-release-and-create-the-directories): the checkout `/data/freezeman-oci`, `.env`, the host directories and log rotation.
3. [First start](#first-start): build, restore the data of the classic setup (**classic host** only), start, check.
4. [Start at boot](#start-at-boot): the `@reboot` line.
5. [Switch to HTTPS (later)](#switch-to-https-later): only when the team decides that the stack replaces the classic setup.

The sections after these (start and stop, update, backups, logs, troubleshooting) are for daily use.

#### Set up the home of django

Run these steps as `django` (`sudo su - django`). They change only the home directory of `django`
and the shell. They need no checkout and no data.

1. Set up podman without systemd. The compose stack needs no systemd user manager and no D-Bus, so it also runs
   on a host that is a container. Make two changes.

   a. Tell podman to use the `cgroupfs` cgroup manager and the `file` event logger. The stack sets no resource limits,
      so `cgroupfs` loses nothing. If `~/.config/containers/containers.conf` exists, copy it to `containers.conf.bak`
      and merge the two keys into its `[engine]` section.

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

   b. Podman stores the state of the running
      containers in `XDG_RUNTIME_DIR`. Two shells with different values do not see the same containers.
      A shell opened with `sudo su - django` does not set the variable. The lines below set it only when it is
      empty and `/run/user/<uid>` exists. Cron jobs that use
      `bash --login -c` read this file too. `start.py` ([Start at boot](#start-at-boot)) applies the same rule.

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

   Start a new login shell, then run the check below. The output `cgroupfs` shows that podman uses the new setting.

   ```bash
   podman info --format '{{.Host.CgroupManager}}'      # cgroupfs
   ```

2. Run `podman system migrate` once, so podman reads the subuid range from IT. It prints nothing.

   ```bash
   podman system migrate
   ```

3. Check podman-compose. If `podman-compose --version` works (IT installed it), skip this step.
   Otherwise install it in a virtual environment of `django`. This changes no system Python package and needs no root.

   ```bash
   python3 -m venv ~/.local/share/podman-compose
   ~/.local/share/podman-compose/bin/pip install 'podman-compose==1.5.0'
   mkdir -p ~/.local/bin
   ln -sf ~/.local/share/podman-compose/bin/podman-compose ~/.local/bin/podman-compose
   podman-compose --version            # podman-compose version 1.5.0
   ```

   `~/.local/bin` must be in `PATH`. The Rocky default `~/.bashrc` adds it.

#### Get the release and create the directories

Run these steps as `django`.

1. Get the release. The compose files and scripts (`compose.yaml`, `start.py`) must be in `/data/freezeman-oci/oci`. The checkout needs a real `.git`
   directory and the submodules. See [Prerequisites](#prerequisites). Use a new directory. Do not use `/data/freezeman`: the classic setup uses it.

   ```bash
   cd /data
   git clone --recurse-submodules https://github.com/c3g/freezeman.git /data/freezeman-oci
   ```

2. Create `.env` and set at least `POSTGRES_PASSWORD`, `FMS_SECRET_KEY`, `FMS_HOST`, `FMS_ENV` and `FMS_LOG_DIR`
   (`FMS_LOG_DIR=/data/freezeman-oci/oci/logs`). Add the other values that the next steps name.

   ```bash
   cd /data/freezeman-oci/oci
   cp .env.example .env
   ```

3. Create the log directory.
   - Each service writes its log to its own file in this directory (see [Logs](#logs)).
   - `compose.yaml` sets the log driver and the file name of each service, so `containers.conf` needs no log setting.
   - The files are on the host, outside the containers, so they stay after `podman-compose down` and
     `podman-compose up -d --force-recreate`.
   - `podman-compose logs` still reads them.
   - Podman does not create a missing log directory, and the container fails to start without it.

   ```bash
   mkdir -p /data/freezeman-oci/oci/logs
   ```

   `FMS_LOG_DIR` in `.env` must be this directory. The path must be absolute. To use another directory, change both.

4. Set up log rotation. The files grow without limit. Rotate them with `logrotate` (Rocky has the package: `rpm -q logrotate`) and the crontab of `django`, with no systemd:

   1. Create the configuration `~/.config/logrotate/freezeman.conf`. If you set `FMS_LOG_DIR`, change the path.

      ```bash
      mkdir -p ~/.config/logrotate ~/.local/state
      cat > ~/.config/logrotate/freezeman.conf <<'EOF'
      /data/freezeman-oci/oci/logs/*.log {
          # Rotate each log at most once a week.
          weekly
          # Keep 8 rotated files (about 8 weeks). Delete older ones.
          rotate 8
          # Gzip the rotated files.
          compress
          # Keep the newest rotated file (.log.1) uncompressed until the next rotation.
          delaycompress
          # Do not fail if a log file is missing.
          missingok
          # Do not rotate an empty file.
          notifempty
          # Copy the file, then empty it in place. The writer keeps its open file.
          copytruncate
      }
      EOF
      ```

   2. Add a line to the crontab (`crontab -e`).

      ```cron
      # 0 3 * * 0: every Sunday at 03:00.
      # -s: own state file, so it does not touch the system logrotate.
      0 3 * * 0 /usr/sbin/logrotate -s ~/.local/state/logrotate-freezeman.state ~/.config/logrotate/freezeman.conf
      ```

   - `copytruncate` is necessary: the container runtime (conmon) keeps each file open, so `logrotate` must copy the
     file and then empty it. A line that a container writes between the copy and the truncation can be lost.
   - Do not set `log_size_max` or `max_size`. Podman then truncates the file itself, and old lines are lost with no copy.

5. Create the backup directory and set `FMS_BACKUP_DIR` in `.env`. See [Database backups](#database-backups).

   ```bash
   mkdir -p /data/freezeman-oci/backups
   ```

6. Create the media and trigger directories. Podman does not create a missing bind-mount source.

   ```bash
   mkdir -p /data/freezeman-oci/backend/media /data/freezeman-oci/backend/triggers
   ```

#### First start

Run these steps as `django`, in `oci/`. Steps marked **classic host** copy the data of the classic setup (uwsgi, host PostgreSQL).
On a new host with no data to keep, skip them. The classic setup keeps running and keeps HTTPS: do not stop the classic uwsgi
and do not change the classic crontab. The stack has its own copy of the data.

1. **Classic host:** dump the classic database. The container runs the same PostgreSQL major version (15), so a plain dump and restore is enough.
   Before the dump, check the default time zone of the classic server:

   - `TZ` is the variable in `.env` that sets the time zone of the stack (default `America/Montreal`).
   - The new `db` container uses `TZ` as its default, so people and tools that query it outside Django get different
     dates and times from the classic server if the two values differ.
   - If the result is not the `TZ` value and you want the old behavior, read [Time zone (TZ)](#time-zone-tz) and add
     the flag `-c timezone=UTC` to `compose.yaml` before step 3. Step 3 starts `db`, and the flag must be in
     `compose.yaml` at that time.

   Use `pg_dump -Fc`. Do not use `pg_dumpall`:

   - `pg_dumpall` also copies the roles of the classic server. On the classic host, `admin` is a normal role and
     `postgres` is the superuser. In the container, `POSTGRES_USER` is the superuser.
   - The script of `pg_dumpall` runs `ALTER ROLE admin ... NOSUPERUSER PASSWORD ...`. This removes the superuser right
     of `POSTGRES_USER` during the restore and sets the classic password, so `backend` cannot log in with
     `POSTGRES_PASSWORD`.
   - The release backups of `DEPLOYMENT.md` (`backup_release_*.pgsql`) are `pg_dumpall` files and have the same
     problem. Do not restore them into the container.

   ```bash
   psql -U postgres -d fms -c 'SHOW timezone'    # compare the result with TZ in .env
   # -Fc: custom format, restore with pg_restore.
   pg_dump -U postgres -Fc fms > fms_classic.dump
   ```

2. Build the images:

   ```bash
   # Proxy host: set the variables as in Proxy. Other hosts: remove them.
   HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=... podman-compose build
   ```

3. Start only the database. `migrate` runs as soon as `db` starts, so do not start the other services yet. Wait until it is ready.
   **Classic host:** restore the dump.

   ```bash
   podman-compose up -d db
   # -h 127.0.0.1: the first-start init server listens on the socket only,
   # so a TCP check passes only when the real server is up.
   until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
   # -T: no pseudo-TTY, keeps the binary dump intact.
   # PGOPTIONS: log each statement of this session.
   # --no-owner: give all objects to POSTGRES_USER.
   # --no-acl: skip GRANT and REVOKE of old roles, which do not exist here.
   # --verbose: print each restored object.
   podman-compose exec -T db env PGOPTIONS='-c log_statement=all' \
     pg_restore -U admin -d fms --no-owner --no-acl --verbose < fms_classic.dump    # classic host only
   ```

   - To follow the restore, run `podman logs -f freezeman_db_1` (or `podman-compose logs -f db`) in another terminal.
   - `COPY` lines show the table name, not the rows.
   - Only the restore session logs its statements. The server setting does not change. `log_statement` is a superuser
     setting, and `POSTGRES_USER` is the superuser in the container.
   - The database is created on first start with `fzy` already enabled, so expect a harmless
     "extension fzy already exists" message during the restore.
   - `pg_dump` copies only the `fms` database. It does not copy roles, passwords, or `ALTER DATABASE ... SET` and
     `ALTER ROLE ... SET` settings. The container keeps the roles that `initdb` made from `.env`.

4. **Classic host:** copy the media files and the trigger folders:

   ```bash
   cp -a /data/freezeman/backend/media/. /data/freezeman-oci/backend/media/
   cp -a /data/freezeman/backend/triggers/. /data/freezeman-oci/backend/triggers/
   ```

5. Start all services and check the migrations:

   ```bash
   podman-compose up -d
   podman-compose logs migrate          # migrations applied?
   ```

6. Check the stack and the sites:

   ```bash
   curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/    # 200
   curl -sfo /dev/null -w '%{http_code}\n' http://<host>/            # 200, through the host nginx
   curl -sfo /dev/null -w '%{http_code}\n' https://<host>/           # 200, still the classic site (classic host)
   ```

A write over HTTP stays in the container database. It does not reach the HTTPS site.

#### Start at boot

Containers do not start at boot by themselves. Run this step as `django`, after the first start works. Add a `@reboot` line to the crontab
of `django` (`crontab -e`):

```cron
@reboot /data/freezeman-oci/oci/start.py >> /data/freezeman-oci/oci/logs/boot.log 2>&1
```

`start.py` does this:

- It sets `XDG_RUNTIME_DIR` as in step 1 of [Set up the home of django](#set-up-the-home-of-django), then runs `podman-compose up -d` in `oci/`.
- At boot it waits up to 60 seconds for `/run/user/<uid>` if the user has linger (see [ROCKY.md](ROCKY.md)).
- This step needs a cron daemon (`cronie` on Rocky) and no root.
- If `podman-compose up -d` fails, or a container is in a wrong state after 60 seconds, `start.py` sends an email
  (see [Failure emails](#failure-emails)).
- If the host is a container, it has no cron. Start `start.py`, as `django`, from the init of the outer container instead.

#### To go back

1. Stop the stack (`podman-compose down`). `down` removes the containers. It deletes their podman state, but not the log files in `FMS_LOG_DIR` (see [Logs](#logs)).
2. Remove the `@reboot` line from the crontab.
3. IT removes the `location /` block from the HTTP server block.

The classic setup is not affected.

#### Switch to HTTPS (later)

Do this when the team decides that the stack replaces the classic setup. The stack needs no change: TLS ends at the host nginx,
`FMS_HOST` stays the same, and Django sets no secure-cookie or `SECURE_PROXY_SSL_HEADER` setting today.

1. Stop the writes to the classic site. Dump the classic database again with the same `pg_dump -Fc` command as in
   step 1 of [First start](#first-start). Delete the volume `freezeman_pgdata`
   (`podman-compose down`, then `podman volume rm freezeman_pgdata`) and restore the new dump as in step 3 of
   [First start](#first-start). Copy the media files and the triggers
   again with `cp -a`. This replaces the data of the HTTP trial.
2. Stop the classic uwsgi. Remove the `prepare_report_data` line from the classic crontab. The `report` service replaces it.
3. IT, in the HTTPS server block: replace the classic locations (`root`, `/static/`, `/media/`, `uwsgi_pass`) with the same
   `location /` block as in [Host nginx](#host-nginx). Keep `client_max_body_size 50M` and `client_body_timeout 300s`.
   In the HTTP server block: replace `location /` with a redirect to HTTPS.
4. Check: `https://<host>/` gives `200`. Django builds `https` URLs: the host nginx sends `X-Forwarded-Proto: https`,
   and the `web` nginx turns it into `HTTPS=on`.

#### Start, stop and restart

`restart: always` restarts a container that exits while podman runs. It does not start containers at boot.
The `@reboot` line of [Start at boot](#start-at-boot) does that.

Run these commands in `oci/`. The last two are alternatives, not a sequence. Use one of them, not both.

| Command | When to use it |
|---|---|
| `podman-compose up -d` | Start the stack. |
| `podman-compose down` | Stop the stack and remove the containers. The volumes and the log files stay. |
| `podman-compose restart backend` | Restart the process of one service in the same container. The image and the `.env` do not change. Use it for a hung service. |
| `podman-compose up -d --force-recreate` | Replace the containers with new ones from the current images and `.env`. Use it after a build or an `.env` change. |

`--force-recreate` matters:

- `podman-compose up -d` only recreates containers when the resolved compose configuration changed.
- A rebuilt image under the same tag is otherwise silently not applied.
- An edit to a variable that reaches the containers only through `env_file: .env` (e.g. `FMS_EMAIL_HOST`) is
  otherwise silently not applied.
- Removing a container deletes its podman state, but not the log files in `FMS_LOG_DIR` (see [Logs](#logs)).
- `migrate` runs again whenever its container is recreated.

#### Update to a new release

```bash
podman-compose exec backup fms-backup now
git fetch && git checkout vX.Y.Z && git submodule update --init --recursive
# set FMS_IMAGE_TAG=vX.Y.Z in .env
# proxy host: set the variables before each podman-compose command, as in Proxy
HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=... podman-compose build
podman-compose up -d --force-recreate
podman-compose logs migrate
```

`build` makes the `db`, `backend`, `backup` and `web` images.

#### Automatic update (QC)

Use this only on a QC or dev host. `autoupdate.py` checks a branch of GitHub. If the branch has a new commit, it
pulls the commit, rebuilds the images, **deletes the database**, restores a dump and recreates the stack.
The QC host then always starts from the same data. Production keeps the manual steps of
[Update to a new release](#update-to-a-new-release). The script stops if `FMS_ENV` is `PROD`.

Before the first run:

- Put the checkout on the followed branch, with no local changes. The script stops if it is on another branch
  or if a tracked file has changes. It never overwrites local work.
- Get a production dump. `.pgsql.gz` and `.pgsql` (`pg_dumpall`, the files of the `backup` service) restore with
  `psql`, as in [Database backups](#database-backups). `.dump` (`pg_dump -Fc`) restores with `pg_restore`,
  as in [First start](#first-start). Other extensions stop the script.
- A `.pgsql` or `.pgsql.gz` file must come from the `backup` service of a container stack. For a classic
  production source, give `--dump` a `.dump` file (`pg_dump -Fc`). A classic `pg_dumpall` file changes the roles,
  as [First start](#first-start) describes.

Add a line to the crontab of `django` (`crontab -e`). The example checks every 10 minutes:

```cron
# */10 * * * *: check every 10 minutes.
# --branch: branch of origin to follow.
# --dump: dump to restore (.pgsql.gz, .pgsql or .dump).
# >> logs/autoupdate.log 2>&1: append the output and the errors to the log.
# Optional --interval N: check every N seconds and never exit (default: check once).
# Optional --force: deploy even if the commit is the last deployed one.
*/10 * * * * /data/freezeman-oci/oci/autoupdate.py --branch qc --dump /data/dumps/prod.pgsql.gz >> /data/freezeman-oci/oci/logs/autoupdate.log 2>&1
```

- If the host uses an HTTP proxy, cron does not have it. Set the proxy variables before the command in the
  crontab line, as in [Proxy](#proxy): `HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=... /data/freezeman-oci/oci/autoupdate.py ...`
- If the host has no cron (the host is a container), add `--interval 600` and start the command, as `django`,
  from the init of the outer container, like `start.py`. Redirect its output to `logs/autoupdate.log`.
- The log `logs/autoupdate.log` ends in `.log`, so the `logrotate` configuration of [step 4 of Get the release and create the directories](#get-the-release-and-create-the-directories) rotates it.
- A failed run sends an email, one per distinct error: see [Failure emails](#failure-emails).

What one run does:

1. Take the lock `logs/autoupdate.lock`. If another run holds it, exit.
2. Stop if `FMS_ENV` is `PROD`, if the checkout is not on `--branch` or if it has local changes.
3. Run `git fetch` and read `origin/<branch>`. If this commit is the last one in `logs/autoupdate.state`, stop.
4. Fast-forward the checkout (`git merge --ff-only`) and update the submodules.
5. Run `podman-compose build`. If it fails, the old containers keep running. On a proxy host, the build needs the proxy variables from the crontab line (see [Proxy](#proxy)).
6. Run `podman-compose down`, delete the volume `freezeman_pgdata` and start `db`. Wait for it, then restore the dump.
7. Run `podman-compose up -d --force-recreate`. `migrate` applies the migrations that the dump does not have.

- Each run deletes `freezeman_pgdata`, so `initdb` runs each time and the default `timezone` is `TZ`. To get UTC,
  see [Time zone (TZ)](#time-zone-tz).
- The site is down from `down` until the end of `up -d --force-recreate`. This time includes the restore.
- A commit that fails is not tried again. The script waits for a new commit. To try the same commit again,
  run the script with `--force`.
- `logs/autoupdate.state` holds the last commit, `ok` and the time (JSON). Delete it to deploy at the next run.
- The restore does not stop on errors, because the dump gives harmless "already exists" messages. The log shows the
  exit code of the restore. Read the output of `psql` or `pg_restore` above it.

#### Database backups

The `backup` service runs `pg_dumpall` every day and writes `<YYYY-MM-DD>.pgsql.gz` into a host directory.
It does not start in development (profile `backup`).

```bash
# oci/.env
# Host directory for the daily dumps. It must exist.
FMS_BACKUP_DIR=/data/freezeman-oci/backups
# Time of day (HH:MM, in TZ) of the backup.
FMS_BACKUP_TIME=01:00
# Delete backups older than this many days (0 keeps all).
FMS_BACKUP_KEEP_DAYS=14

mkdir -p /data/freezeman-oci/backups      # podman does not create a missing bind-mount source
podman-compose up -d backup
podman-compose exec backup fms-backup now      # run one backup now
```

To restore into an empty database cluster, start only `db`, restore, then start the rest:

```bash
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
# -d postgres: psql must start in another database than fms, because the script runs \connect fms.
gunzip -c /data/freezeman-oci/backups/2026-10-21.pgsql.gz | podman-compose exec -T db psql -U admin -d postgres
podman-compose up -d                 # migrate applies the migrations that the backup does not have
podman-compose logs migrate
```

- The messages "role admin already exists", "database fms already exists" and
  "extension fzy already exists" are harmless.
- The container runs as root, which rootless podman maps to the deployment user, so that user owns the
  files. The bind mount uses `:z` for SELinux. The `backup` image has the same PostgreSQL base image as the
  `db` image (`POSTGRES_IMAGE`), so `pg_dumpall` always matches the server version.
- `pg_dumpall` copies the whole cluster: the roles with their password hashes, the role and database settings,
  and all databases. During the restore, `CREATE ROLE admin` fails ("already exists"), but the next
  `ALTER ROLE admin ... PASSWORD ...` runs. It sets the password that `POSTGRES_USER` had at backup time.
  If `POSTGRES_PASSWORD` in `.env` changed after the backup, set `.env` back to the old value. Or run
  `ALTER ROLE <POSTGRES_USER> PASSWORD '<new>'` after the restore.
- Restore only into an empty cluster (a new `freezeman_pgdata` volume). The script has no `DROP` commands, so a
  restore over existing data gives duplicate-key errors or mixed data.
- Use these files only between container stacks, because the roles match. For a classic-host source, use
  `pg_dump -Fc`. See [First start](#first-start).
- Copy the directory off the host as well: a backup on the same disk does not protect against disk loss.
- A failed backup sends an email: see [Failure emails](#failure-emails).

#### Daily report data

The `report` service replaces the cron entry. It runs `python manage.py prepare_report_data` every day.

- The run log `report_preparation.log` goes to `FMS_LOG_DIR`, next to the service logs
  (`~/reports/log/` in the container is a bind mount of that directory).
- A failed run is printed to the service log, and the next run still happens, and an email is sent:
  see [Failure emails](#failure-emails).
- It does not start in development (profile `report`).

```bash
# oci/.env
# Time of day (HH:MM, in TZ) for prepare_report_data.
FMS_REPORT_TIME=02:00

podman-compose logs report                                                    # next run time and output
podman-compose exec -T backend python manage.py prepare_report_data              # run it now
```

#### Failure emails

Four jobs run without a person. Each one sends an email when it fails. Before this, a failure wrote only a line to a log.

| Job | Email is sent when |
|---|---|
| `backup` service (`db/backup.py`) | The database is not reachable after 60 s, `pg_dumpall` exits with an error, or the script raises an exception |
| `report` service (`backend/report.py`) | `prepare_report_data` exits with a non-zero code |
| `autoupdate.py` | An update fails (it aborts, a command fails, or another error occurs) |
| `start.py` (cron `@reboot`) | `podman-compose up -d` exits with a non-zero code, or 60 s later (`CHECK_DELAY`) a container is in a wrong state: `migrate` with a non-zero exit code, or any other service not `running` |

Set the SMTP server and the recipients in `.env`. The jobs use the SMTP settings of Django:

```bash
# oci/.env
# SMTP server.
FMS_EMAIL_HOST=smtp.office365.com
# SMTP port.
FMS_EMAIL_PORT=587
# Sender address.
FMS_EMAIL_FROM=noreply@example.com
# SMTP user name.
FMS_EMAIL_USER=noreply@example.com
# SMTP password.
FMS_EMAIL_PASSWORD=secret
# Any non-empty value turns TLS on, even False (see the TLS rule below).
FMS_EMAIL_TLS=True
# Recipients of the failure emails (comma list).
FMS_ALERT_EMAILS=dev1@example.com,dev2@example.com
```

- If `FMS_EMAIL_HOST` or `FMS_ALERT_EMAILS` is empty, no email is sent. The job writes the alert subject to its log.
- TLS follows the rule of Django (`EMAIL_USE_TLS` in `backend/fms/settings.py`): `starttls()` runs if `FMS_EMAIL_TLS` has any
  non-empty value, even `False`, and `FMS_DEBUG` is not `true`.
  - `FMS_EMAIL_TLS`: to turn TLS off, leave it empty or unset.
  - `FMS_DEBUG`: a missing value counts as `true`. An empty one counts as `false`.
- If the email cannot be sent, the job prints the error to its log and continues.
- The subject is `[FreezeMan <FMS_ENV> <FMS_HOST>] <job> failed`. The body has the error, the last 50 lines of output
  where the job has them, the host name and the time.
- `backup` and `report` send one email for each failed run (once a day at most). `backup` gets the SMTP settings from
  `compose.yaml`. After a change of `.env`, run `podman-compose up -d --force-recreate`.
- `autoupdate.py` sends one email for each distinct error. It keeps the error in `logs/autoupdate.alert`. The same error
  at the next check sends nothing. A successful run, or a check with no new commit, deletes the file. A run that finds
  the lock held by another run sends nothing.
- `start.py` reads `.env` itself, because it runs on the host.
- SMTP does not go through the proxy (see [Proxy](#proxy)).

#### Time zone (TZ)

`TZ` in `.env` (default `America/Montreal`) sets the time zone of all services (`db`, `migrate`, `backend`,
`report`, `backup`, `web`). It changes these items:

| Item | Effect of `TZ` |
|---|---|
| `backup` service | `FMS_BACKUP_TIME` is in `TZ` |
| `report` service | `FMS_REPORT_TIME` is in `TZ` |
| Logs in `FMS_LOG_DIR` | The time stamps are in `TZ` (see [Logs](#logs)) |
| PostgreSQL in a new data directory | The default `timezone` of each session is `TZ` (see below) |

`TZ` does not change the data of the app:

- Django uses `TIME_ZONE = 'UTC'` (`backend/fms/settings.py`). When Django loads its settings, it sets the process
  time zone to UTC. Django stores and returns the datetimes in UTC, and each Django database connection uses UTC.
- The time stamps in the names of saved template files use `LOCAL_TZ` in `backend/fms/settings.py`, not `TZ`.

**PostgreSQL default time zone.**

- When `initdb` first runs (empty `freezeman_pgdata` volume), PostgreSQL writes `TZ` into `postgresql.conf` as
  `log_timezone` and as `timezone`. `timezone` is the default time zone of each session.
- Django sets its sessions to UTC, so the app is not affected.
- Other clients (`psql`, `pg_dumpall`, external tools) use the default. For example, `SELECT now()::date` gives the date in `TZ`.
- A data directory that `initdb` created before `db` got `TZ` keeps UTC.

To see the value:

```bash
podman-compose exec db psql -U admin -d fms -c 'SHOW timezone'
```

To keep UTC as the default for all clients, add `-c timezone=UTC` to the `db` command in `compose.yaml`.
The flag also overrides the value in `postgresql.conf` of an existing data directory:

```yaml
    command: ["postgres", "-c", "log_timezone=${TZ:-America/Montreal}", "-c", "timezone=UTC"]
```

Use the flag in these cases:

- You create a new data directory (new deployment, or a restore into a new volume), and people or tools query the
  database outside Django. The flag gives them UTC. Compare with the old server: a classic host server gets its
  `timezone` from its own `initdb`, so it is not always UTC.
- You want the same query results on all hosts, independent of the `TZ` value when `initdb` ran.

Two more points:

- `ALTER DATABASE ... SET timezone` and `ALTER ROLE ... SET timezone` override the flag for each session.
  `pg_dumpall` copies these settings. To see them, run `\drds` in `psql`.
- To get UTC in one client only, set `PGTZ=UTC` for that client. The server flag is then not necessary.

The flag is not necessary when only Django uses the database. Dumps and restores do not need it: `pg_dump` and
`pg_dumpall` write each `timestamptz` value with its UTC offset, so a restore gives the same values. This is true
for [First start](#first-start), [Database backups](#database-backups) and `autoupdate.py`.

#### Logs

Each service writes its output to one file on the host: `<FMS_LOG_DIR>/<service>.log`, for example
`/data/freezeman-oci/oci/logs/backend.log`.

- `compose.yaml` sets the `k8s-file` log driver and the file of each service.
- The files stay after `podman-compose down` and `podman-compose up -d --force-recreate`.
- A new container of the same service appends to the file of the old one.
- `podman-compose logs` reads the active file.

```bash
podman-compose logs -f backend
tail -f /data/freezeman-oci/oci/logs/backend.log        # each line has a time stamp, the stream and the text
```

Time stamps (see [Time zone (TZ)](#time-zone-tz)):

- Each service writes its time stamps in `TZ` (default `America/Montreal`).
- The `db` service sets the PostgreSQL `log_timezone` to `TZ` at each start.
- Django lines (`migrate`, `backend`) show the offset, for example `-0400`.
- The prefix that podman adds to each line uses the time zone of the host.

Request log:

- The request log is `web.log` (nginx).
- uwsgi does not log requests (`disable-logging` in `backend/uwsgi.ini`), because it can write its times only in UTC.
- Each `web.log` line ends with `rt=` (total time) and `urt=` (time that uwsgi took), in seconds.
- `urt=` is `-` for files that nginx serves itself.

Rotate the files as in step 4 of [Get the release and create the directories](#get-the-release-and-create-the-directories).

With `FMS_ENV=PROD` Django logs to the console. Any other value also writes
`/src/backend/fms.log` inside the container.

#### Troubleshooting

| Symptom | Likely cause |
|---|---|
| 502 at the host nginx | `web` is not running, or `FMS_HTTP_PORT` does not match the `proxy_pass` port. Check `podman-compose ps` and `curl http://127.0.0.1:8080/` |
| 502 on `/api/` from `web` | `backend` is not running. Check `podman-compose logs backend` |
| 400 Bad Request | `FMS_HOST` is not the host name of the request |
| 413 on upload | `client_max_body_size` is missing in the host HTTP server block |

### Development

Set `FMS_LOG_DIR` in `.env` to the absolute path of `oci/logs` in your checkout, for example
`FMS_LOG_DIR=/home/me/freezeman/oci/logs`. Compose stops without it. Start the stack and enter the `dev` container:

```bash
mkdir -p logs                          # the container logs go to FMS_LOG_DIR/<service>.log
podman-compose -f compose.yaml -f compose.dev.yaml up -d
podman-compose -f compose.yaml -f compose.dev.yaml exec dev bash
```

The `dev` shell starts in `/src`. In the `dev` shell:

```bash
# First start and after each new migration:
cd /src/backend && python manage.py migrate && python manage.py createinitialrevisions

# Backend: http://localhost:8000, reloads on code changes
# 0.0.0.0: listen on all addresses, because the published port connects to the container IP.
cd /src/backend && python manage.py runserver 0.0.0.0:8000

# Frontend with live reload: http://localhost:9000 (proxies /api to port 8000)
# --host 0.0.0.0: listen on all addresses, because the published port connects to the container IP.
cd /src/frontend && npm ci && npm start -- --host 0.0.0.0
```

- The webpack proxy still reaches `localhost:8000`, because both servers run in the same container.
- Run the servers in two shells (or in the background).
- PostgreSQL: see [Database access](#database-access).

Tests (the test database is created from `template1`, which already has `fzy`):

```bash
podman-compose -f compose.yaml -f compose.dev.yaml exec dev sh -c 'cd backend && pytest'
```

#### Database access

Use `psql` to look at the development database. There are three ways:

- In the `dev` shell, or in a VS Code terminal of the [Dev Container](#dev-container): run `psql`.
  `compose.dev.yaml` sets `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and `PGPASSWORD` in `dev` (from `.env`),
  so `psql` needs no arguments. The `dev` image has the PostgreSQL client. The Dev Container terminal is inside
  `dev` and has no `podman-compose`, so use this way there.

  ```bash
  psql
  psql -c 'SELECT count(*) FROM django_migrations'
  ```

- From the host, through the `db` container (the user and database are `POSTGRES_USER` and `POSTGRES_DB` of `.env`):

  ```bash
  podman-compose -f compose.yaml -f compose.dev.yaml exec db psql -U admin -d fms
  ```

- From the host with a host `psql` or a GUI client: connect to `localhost:5432` (`compose.dev.yaml` publishes
  the port). Use the user, the database and the password of `.env`.

#### Dev Container

`.devcontainer/devcontainer.json` runs the editor inside `dev`, so the language servers see
the venv (`/opt/venv/bin/python`) and `node_modules`. It uses the same compose files and
starts `db` and `dev`. It starts no server: start the servers by hand in a terminal of the editor,
as in [Development](#development-2).

1. Do the [Prerequisites](#prerequisites), including `cp .env.example .env` in `oci/`.
   Create `oci/logs` and set `FMS_LOG_DIR` in `.env` to its absolute path, for example
   `FMS_LOG_DIR=/home/me/freezeman/oci/logs`. The editor starts compose from another directory, so the path must be absolute.
2. For podman, set these VS Code user settings:

   ```jsonc
   {
     // Use podman instead of docker.
     "dev.containers.dockerPath": "podman",
     // Use podman-compose instead of docker compose.
     "dev.containers.dockerComposePath": "podman-compose"
   }
   ```
3. Open the repository in VS Code and run "Dev Containers: Reopen in Container".

The Dev Containers extension with `podman-compose` has known quirks. If "Reopen in Container" fails,
work without the editor inside `dev`. Open a terminal on the host, in `oci/`, and run the two commands
from the start of [Development](#development-2) (`up -d`, then `exec dev bash`). Edit the files on the host.
The servers, `psql` and the tests run in that `dev` shell as before.

#### Test the production stack locally

Podman does not create a missing bind-mount source or log directory. Create the host directories first (once).
Set `FMS_LOG_DIR` in `.env` to the absolute path of `oci/logs`. Then build and start the stack. `web` is a default service:

```bash
mkdir -p ../backend/media ../backend/triggers logs
# proxy host: set the variables before each podman-compose command, as in Proxy
HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=... podman-compose build
podman-compose up -d
```

- Open `http://localhost:8080` (`FMS_HTTP_PORT`).
- In a VM or container, set `FMS_HTTP_ADDR=0.0.0.0` in `.env` first: the default binds the port to `127.0.0.1` of the host.
- The database is empty. To get data, restore a backup as in [Database backups](#database-backups).

### Useful podman and podman-compose commands

```bash
podman-compose ps
podman-compose logs -f backend
podman-compose exec backend python manage.py shell
podman-compose exec -T backend python manage.py prepare_report_data
podman-compose exec db psql -U admin -d fms
# -T: no pseudo-TTY, which would turn the dump's line endings into CRLF
podman-compose exec -T db pg_dumpall -U admin > backup_$(date +%F).pgsql
# pg_dumpall copies the roles too. Restore it as in "Database backups"

podman ps -a                                       # all containers, also stopped ones
podman images                                      # built images
podman volume ls                                   # named volumes
podman inspect --format '{{.HostConfig.LogConfig}}' freezeman_backend_1   # log driver and log file
podman info --format '{{.Host.CgroupManager}}'     # cgroupfs on the deployment host
```

## Additional notes

Host nginx design choices:

- `userns_mode: keep-id:uid=1000,gid=1000` on `backend`. The image user `fms` (uid 1000) writes the media files, and
  `django` owns them on the host.
- uwsgi listens on port 8000 (uwsgi protocol) in the container network, for the `web` service and Kubernetes.
- Client address: the host nginx sends `X-Real-IP` and `X-Forwarded-For`, but the `web` nginx does not use them.
  uwsgi gets the address of the podman port forwarder as `REMOTE_ADDR`, and the `web` access log shows that address.
  Nothing in FreezeMan uses the client address today. If it becomes necessary, add `set_real_ip_from` and
  `real_ip_header X-Real-IP` to `nginx/default.conf.template`.

Portability:

- `:z` on all bind mounts, with no exception: required on any SELinux host (Fedora, RHEL, CentOS Stream), harmless elsewhere.
- Fully qualified image names (`docker.io/library/...`): RHEL-family systems enforce
  short-name resolution, and fully qualified names avoid prompts on any registry setup.
- `x-podman: in_pod: false`: `userns_mode: keep-id` (development) cannot be used for containers inside a pod.

Files outside `oci/`:

- `.containerignore`: build context exclusions. The build context is the repository root, so the file must be there.
- `backend/fms/info.py`: reads `fms/build_info.json`, which the image build writes.
  Images contain no `.git`. Without this change `git show` returns an empty string on master,
  the tuple unpacking raises `ValueError` at import, and Django does not start.
  Without the file, info.py runs git as before, so behavior outside containers is the same.

## Path to Kubernetes

The layout already maps onto Kubernetes objects:

| Compose            | Kubernetes                                                        |
|--------------------|-------------------------------------------------------------------|
| `db`               | StatefulSet + PVC (or a managed PostgreSQL with the fzy extension) |
| `migrate`          | Job (or Helm `pre-install`/`pre-upgrade` hook)                    |
| `backend`, `web`   | Deployments + Services (`BACKEND_UPSTREAM` = backend Service name) |
| `media`, `triggers`, `automations_work` | PVCs (`media` must be ReadWriteMany if `web` and `backend` run on different nodes). On the host, `media`, `triggers` and `automations_work` are bind-mounted directories |
| `.env`             | ConfigMap (settings) + Secret (`POSTGRES_PASSWORD`, `FMS_SECRET_KEY`, email password) |
| `backup`           | CronJob + PVC                                                     |
| `report`           | CronJob that runs `python manage.py prepare_report_data` (`schedule` from `FMS_REPORT_TIME`, `timeZone` from `TZ`) + a log PVC at `/home/fms/reports/log` (on the host, a bind mount of `FMS_LOG_DIR`) |
| `web` port mapping and the host nginx | Ingress (TLS)                                                |

Notes:
- The `report` CronJob replaces the sleep loop in `fms-report`, so run `python manage.py prepare_report_data`
  directly, not `fms-report`. Set `concurrencyPolicy: Forbid`. A failed run then shows as a failed Job.
- Set `securityContext.fsGroup: 1000` so the `fms` user can write to PVCs.
- Make sure the Ingress sets `X-Forwarded-Proto`. The `web` nginx turns it into `HTTPS=on` for uwsgi.
  Expose only the `web` Service.
- `podman kube generate <container...>` produces a first draft of the YAML. `podman kube play`
  runs Kubernetes YAML directly on Rocky 9, which can be used to test the manifests before a cluster exists.
