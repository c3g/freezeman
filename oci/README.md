# FreezeMan containers

Contents:

- [Container organization and roles](#container-organization-and-roles)
  - [Production](#production)
  - [Development](#development)
- [Prerequisites](#prerequisites)
  - [Production](#production-1)
  - [Development](#development-1)
  - [Proxy](#proxy)
- [Usage](#usage)
  - [Production](#production-2)
    - [One-time setup as django](#one-time-setup-as-django)
    - [Transition from the classic setup](#transition-from-the-classic-setup)
    - [Start, stop and restart](#start-stop-and-restart)
    - [Update to a new release](#update-to-a-new-release)
    - [Automatic update (QC)](#automatic-update-qc)
    - [Database backups](#database-backups)
    - [Daily report data](#daily-report-data)
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

Container images and podman-compose configuration for FreezeMan. The stack runs the same software as
`DEPLOYMENT.md` (same major versions): Python 3.14, Node 24, uwsgi 2.0 behind nginx, PostgreSQL 15.
The PostgreSQL version is the `POSTGRES_IMAGE` build argument in `db/Containerfile`. The uwsgi version
is `UWSGI_VERSION` in `Containerfile`. uwsgi settings are in `backend/uwsgi.ini`.

### Production

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL 15 with the `fzy` extension (`backend/dependencies/pg_fzy`) |
| `migrate`  | `localhost/freezeman-backend` | One-shot: `migrate` + `createinitialrevisions`, then exits      |
| `backend`  | `localhost/freezeman-backend` | Django on uwsgi: port 8000 uwsgi protocol (internal)                 |
| `report`   | `localhost/freezeman-backend` | Daily `prepare_report_data` at `FMS_REPORT_TIME`                |
| `backup`   | `localhost/freezeman-backup`  | Daily `pg_dumpall` to `FMS_BACKUP_DIR` as `<YYYY-MM-DD>.pgsql.gz`    |
| `assets`   | `localhost/freezeman-assets`  | One-shot: copies the built frontend and the Django static files into host directories for the host nginx, then exits |
| `web`      | `localhost/freezeman-web`     | Profile `web`. nginx in a container: built frontend, Django static files, `/media/`, passes `/api/` to uwsgi (`uwsgi_pass`). For tests without a host nginx |

The host nginx keeps the config of `DEPLOYMENT.md` (TLS, certificate and locations). The containers supply what
this config expects, so the host nginx needs no change. The host server block also sets `client_max_body_size 50M` and `client_body_timeout 300s`, and the container nginx uses the same values. With the repository at `/data/freezeman`:

| Host nginx location | Host path | Supplied by |
|---|---|---|
| `/` (`root`) | `/data/freezeman/frontend/dist/` | `assets` (copy from the `assets` image) |
| `/static/` (`alias`) | `/data/freezeman/backend/staticfiles/` | `assets` |
| `/media/` (`alias`) | `/data/freezeman/backend/media/` | `backend` (bind mount) |
| `/api/` (`uwsgi_pass unix:`) | `/data/freezeman/backend/fms.sock` | `backend` (uwsgi unix socket in a bind mount) |

The paths in `compose.yaml` are relative to `oci/`, so they match this table when the repository is at `/data/freezeman`.
To use other paths, set `FMS_FRONTEND_DIST_DIR`, `FMS_STATIC_DIR`, `FMS_MEDIA_DIR`, `FMS_SOCKET_DIR` and `FMS_TRIGGERS_DIR` in `.env`.

The container nginx (`--profile web`) is for tests. It does not replace the host nginx.

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
- The production services `migrate`, `backend`, `assets` and `web` have the profile `prod` in development,
  so `up -d` does not start them. `report` and `backup` do not start either.

## Prerequisites

Do these steps for both environments:

- Check out the pg_fzy submodules: `git submodule update --init --recursive`
- Use a checkout with a real `.git` directory (not a `git worktree`, whose `.git` is a file pointing elsewhere).
  The frontend build and `build_info.json` read commit information from it.
- Run `cd oci && cp .env.example .env`, then set at least `POSTGRES_PASSWORD`, `FMS_SECRET_KEY` and `FMS_HOST`.

### Production

IT completes [ROCKY.md](ROCKY.md) and sends the output of the [acceptance checks](ROCKY.md#acceptance-checks) to the FreezeMan team.
Then do the steps in [One-time setup as django](#one-time-setup-as-django).

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
- The proxy values are build arguments of podman and stay out of the images. They can still reach the environment
  of running containers:
  - `dev` always gets them from `compose.dev.yaml`.
  - Values in `.env` also reach `migrate`, `backend` and `report`, through `env_file: .env`.
  - Values in the environment of the command also reach every container. Podman copies the proxy variables of its own
    environment into each container (`http_proxy = true`, the default of `containers.conf`).

  Only in `dev` does `NO_PROXY` get the service names. The other services do not need them, because they reach `db`
  over the PostgreSQL protocol and not over HTTP.
- Known quirk: podman-compose interpolates the `environment` of a service twice. If the shell has a proxy but no `NO_PROXY`,
  `podman-compose config` shows `db,backend,web` twice in the `NO_PROXY` and `no_proxy` of `dev`. The duplicates have no effect.
- Email ignores the proxy. Django opens a direct connection to `FMS_EMAIL_HOST:587`, and the proxy does not carry SMTP.
  If the host has no direct route to the SMTP server, leave `FMS_EMAIL_HOST` unset. Emails then go to the console.

## Usage

Run all `podman-compose` commands from `oci/`.

### Production

Do these steps after IT completes [ROCKY.md](ROCKY.md) and the [acceptance checks](ROCKY.md#acceptance-checks) pass.

Choose the path for your host:

| Host | Do these sections, in this order |
|---|---|
| New host, no data to keep | [One-time setup as django](#one-time-setup-as-django) (all steps), then [Start, stop and restart](#start-stop-and-restart) |
| Host that runs the classic setup (uwsgi, host PostgreSQL) | [One-time setup as django](#one-time-setup-as-django) (steps 1 to 3), then [Transition from the classic setup](#transition-from-the-classic-setup) (it covers steps 4 to 7 of the setup), then [One-time setup as django](#one-time-setup-as-django) (step 8) |

"One-time setup" prepares the host: podman, the release, the directories and the start at boot. It does not move data.
"Transition" moves the database, the media files and the triggers from the classic setup to the containers, and switches the site over.

#### One-time setup as django

Run these steps as `django` (`sudo su - django`).

1. Set up podman without systemd. The compose stack needs no systemd user manager and no D-Bus, so it also runs
   on a host that is a container. Make two changes.

   a. Tell podman to use the `cgroupfs` cgroup manager and the `file` event logger. Podman then creates the cgroups
      (resource limits) of the containers itself and writes its events to a file. The stack sets no resource limits,
      so `cgroupfs` loses nothing. If `~/.config/containers/containers.conf` exists, copy it to `containers.conf.bak`
      and merge the two keys into its `[engine]` section.

      ```bash
      mkdir -p ~/.config/containers
      cat >> ~/.config/containers/containers.conf <<'EOF'
      [engine]
      cgroup_manager = "cgroupfs"
      events_logger = "file"
      EOF
      ```

   b. Podman stores the state of the running
      containers in `XDG_RUNTIME_DIR`. Two shells with different values do not see the same containers.
      A shell opened with `sudo su - django` does not set the variable. The lines below set it only when it is
      empty and `/run/user/<uid>` exists. Cron jobs that use
      `bash --login -c` read this file too. `start.py` (step 8) applies the same rule.

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

4. Get the release. The compose files and scripts (`compose.yaml`, `start.py`) must be in `/data/freezeman/oci`. The checkout needs a real `.git`
   directory and the submodules. See [Prerequisites](#prerequisites).

   If `/data/freezeman` exists (the classic setup), use it:

   ```bash
   cd /data/freezeman
   git fetch
   git checkout <tag>
   git submodule update --init --recursive
   ```

   On a new host, clone it:

   ```bash
   cd /data
   git clone --recurse-submodules https://github.com/c3g/freezeman.git /data/freezeman
   ```

5. Create the log directory. Each service writes its log to its own file in this directory (see [Logs](#logs)).
   `compose.yaml` sets the log driver and the file name of each service, so `containers.conf` needs no log
   setting. The files are on the host, outside the containers, so they stay after `podman-compose down` and
   `podman-compose up -d --force-recreate`. `podman-compose logs` still reads them. Podman does not create a
   missing log directory, and the container fails to start without it.

   ```bash
   mkdir -p /data/freezeman/oci/logs
   ```

   The default is `logs/` in `oci/`. To use another directory, set `FMS_LOG_DIR` in `.env`. The path must be absolute.

6. Create the backup directory and set `FMS_BACKUP_DIR` in `.env`. See [Database backups](#database-backups).

   ```bash
   mkdir -p /data/freezeman/backups
   ```

7. Create the host nginx directories. Podman does not create a missing bind-mount source.

   ```bash
   mkdir -p /data/freezeman/frontend/dist /data/freezeman/backend/staticfiles /data/freezeman/backend/media
   ```

8. Start the stack at boot. Containers do not start at boot by themselves. Add a `@reboot` line to the crontab
   of `django` (`crontab -e`):

   ```cron
   @reboot /data/freezeman/oci/start.py >> /data/freezeman/oci/logs/boot.log 2>&1
   ```

   `start.py` sets `XDG_RUNTIME_DIR` as in step 1, then runs `podman-compose up -d` in `oci/`. At boot it waits up
   to 60 seconds for `/run/user/<uid>` if the user has linger (see [ROCKY.md](ROCKY.md)). This step needs a cron
   daemon (`cronie` on Rocky) and no root. If the host is a container, it has no cron. Start `start.py`, as
   `django`, from the init of the outer container instead.

Then start the stack: see [Start, stop and restart](#start-stop-and-restart).

#### Transition from the classic setup

Do these steps once, as `django`, on the host that runs the classic setup (uwsgi, host PostgreSQL).
The container runs the same PostgreSQL major version (15), so a plain dump and restore is enough.

1. Back up the database and the media files: `pg_dumpall > backup_before_containers.pgsql` and
   `cp -a /data/freezeman/backend/media /data/freezeman/backend/media.bak`.
2. Stop the old uwsgi. Find the master with `ps -u django -o pid,args | grep uwsgi`, then `kill <master PID>`.
   The old socket file `fms.sock` goes away with it (`vacuum`). If it stays, delete it.
3. Remove the `prepare_report_data` line from the `django` crontab (`crontab -e`). The `report` service replaces it.
4. Get the release and prepare `.env` and the directories (see [One-time setup as django](#one-time-setup-as-django), steps 4 to 7).
   The old media files stay in `/data/freezeman/backend/media`, where the new `backend` service uses them.
5. Dump the data on the old server:

   ```bash
   pg_dump -U postgres -Fc fms > fms_before_containers.dump
   ```

6. Build the images and restore the data. Start only the database: `migrate` runs as soon as `db` starts.

   ```bash
   podman-compose build
   podman-compose up -d db
   # -h 127.0.0.1: the first-start init server listens on the socket only,
   # so a TCP check passes only when the real server is up.
   until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
   podman-compose exec -T db pg_restore -U admin -d fms --no-owner --no-acl < fms_before_containers.dump
   podman-compose up -d
   podman-compose logs migrate          # migrations applied?
   ```

   `-T` keeps the binary dump intact. Without it, the pseudo-TTY changes the stream.
   The database is created on first start with `fzy` already enabled, so expect a
   harmless "extension fzy already exists" message during the restore. `--no-owner`
   assigns everything to `POSTGRES_USER`. `--no-acl` skips the `GRANT` and `REVOKE` commands of the dump.
   These commands name roles of the old server, which do not exist in the container database.
   `POSTGRES_USER` owns all objects, so it needs no grants.

7. Copy the trigger folders into the host directory `FMS_TRIGGERS_DIR` (default `../backend/triggers`).
   The media files need no copy: the `backend` service uses the host directory `FMS_MEDIA_DIR`
   (default `../backend/media`) itself. On another host, copy the old uploaded files into that directory.
8. Check the socket and the site. The `backend` service creates the socket, and the host nginx connects to it:

   ```bash
   ls -l /data/freezeman/backend/fms.sock          # srw-rw-rw- ... django django
   curl -sfo /dev/null -w '%{http_code}\n' https://<host>/   # 200
   ```

   The host firewall needs no change. No container publishes a port.

To go back:

1. Stop the stack (`podman-compose down`). `down` removes the containers. It deletes their podman state, but not the log files in `FMS_LOG_DIR` (see [Logs](#logs)).
2. Revert the crontab
3. Delete `backend/fms.sock`
4. Start the old uwsgi again.

#### Start, stop and restart

`restart: always` restarts a container that exits while podman runs. It does not start containers at boot.
The `@reboot` line of [One-time setup as django](#one-time-setup-as-django), step 8, does that.

Run these commands in `oci/`. The last two are alternatives, not a sequence. Use one of them, not both.

| Command | When to use it |
|---|---|
| `podman-compose up -d` | Start the stack. |
| `podman-compose down` | Stop the stack and remove the containers. The volumes and the log files stay. |
| `podman-compose restart backend` | Restart the process of one service in the same container. The image and the `.env` do not change. Use it for a hung service. |
| `podman-compose up -d --force-recreate` | Replace the containers with new ones from the current images and `.env`. Use it after a build or an `.env` change. |

`--force-recreate` matters: `podman-compose up -d` only recreates containers
when the resolved compose configuration changed. A rebuilt image under the same
tag, or an edit to a variable that reaches the containers only through
`env_file: .env` (e.g. `FMS_EMAIL_HOST`), is otherwise silently not applied.
Removing a container deletes its podman state, but not the log files in `FMS_LOG_DIR` (see [Logs](#logs)).
`migrate` runs again whenever its container is recreated. `assets` also runs again and replaces the
files in `../frontend/dist` and `../backend/staticfiles`. `/static/` and `/` are briefly empty during the copy.

#### Update to a new release

```bash
podman-compose exec backup fms-backup now
git fetch && git checkout vX.Y.Z && git submodule update --init --recursive
# set FMS_IMAGE_TAG=vX.Y.Z in .env
podman-compose build
podman-compose up -d --force-recreate
podman-compose logs migrate
```

`build` makes the `db`, `backend`, `backup` and `assets` images. It does not make `web`: see
[Test the production stack locally](#test-the-production-stack-locally).

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
  as in [Transition from the classic setup](#transition-from-the-classic-setup). Other extensions stop the script.

Add a line to the crontab of `django` (`crontab -e`). The example checks every 10 minutes:

```cron
*/10 * * * * /data/freezeman/oci/autoupdate.py --branch qc --dump /data/dumps/prod.pgsql.gz >> /data/freezeman/oci/logs/autoupdate.log 2>&1
```

- Add `--profile web` to build and start the container nginx too. The option can be repeated.
- If the host uses an HTTP proxy, cron does not have it. Set the proxy variables before the command in the
  crontab line, as in [Proxy](#proxy): `HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=... /data/freezeman/oci/autoupdate.py ...`
- If the host has no cron (the host is a container), add `--interval 600` and start the command, as `django`,
  from the init of the outer container, like `start.py`. The script then checks every 600 seconds and never exits.
  Redirect its output to `logs/autoupdate.log`.
- The log `logs/autoupdate.log` ends in `.log`, so the `logrotate` configuration of [Logs](#logs) rotates it.

What one run does:

1. Take the lock `logs/autoupdate.lock`. If another run holds it, exit.
2. Stop if `FMS_ENV` is `PROD`, if the checkout is not on `--branch` or if it has local changes.
3. Run `git fetch` and read `origin/<branch>`. If this commit is the last one in `logs/autoupdate.state`, stop.
4. Fast-forward the checkout (`git merge --ff-only`) and update the submodules.
5. Run `podman-compose build`. If it fails, the old containers keep running.
6. Run `podman-compose down`, delete the volume `freezeman_pgdata` and start `db`. Wait for it, then restore the dump.
7. Run `podman-compose up -d --force-recreate`. `migrate` applies the migrations that the dump does not have.
   `assets` copies the new frontend.

- The site is down from `down` until the end of `up -d --force-recreate`. This time includes the restore.
- A commit that fails is not tried again. The script waits for a new commit. To try the same commit again, or to
  deploy the commit that is already deployed, run the script with `--force`.
- `logs/autoupdate.state` holds the last commit, `ok` and the time (JSON). Delete it to deploy at the next run.
- The restore does not stop on errors, because the dump gives harmless "already exists" messages. The log shows the
  exit code of the restore. Read the output of `psql` or `pg_restore` above it.

#### Database backups

The `backup` service runs `pg_dumpall` every day at `FMS_BACKUP_TIME` (default `01:00`, in `TZ`)
and writes `<YYYY-MM-DD>.pgsql.gz` into `FMS_BACKUP_DIR` on the host. It deletes files older than
`FMS_BACKUP_KEEP_DAYS` (default 14, `0` keeps all). It does not start in development (profile `backup`).

```bash
# oci/.env
FMS_BACKUP_DIR=/data/freezeman/backups

mkdir -p /data/freezeman/backups      # podman does not create a missing bind-mount source
podman-compose up -d backup
podman-compose exec backup fms-backup now      # run one backup now
```

To restore into an empty database cluster, start only `db`, restore, then start the rest:

```bash
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
gunzip -c /data/freezeman/backups/2026-10-21.pgsql.gz | podman-compose exec -T db psql -U admin -d postgres
podman-compose up -d                 # migrate applies the migrations that the backup does not have
podman-compose logs migrate
```

- `-d postgres`: the `pg_dumpall` script creates the roles and the database, then runs `\connect fms`.
  psql must start in another database, so it starts in `postgres`. The messages "role admin already
  exists", "database fms already exists" and "extension fzy already exists" are harmless.
- The container runs as root, which rootless podman maps to the deployment user, so that user owns the
  files. The bind mount uses `:z` for SELinux. The `backup` image has the same PostgreSQL base image as the
  `db` image (`POSTGRES_IMAGE`), so `pg_dumpall` always matches the server version.
- Copy the directory off the host as well: a backup on the same disk does not protect against disk loss.

#### Daily report data

The `report` service replaces the cron entry. It runs `python manage.py prepare_report_data` every day.
Set the time in `.env`: `FMS_REPORT_TIME` (`HH:MM`, default `02:00`) in the time
zone `TZ` (`America/Montreal`). The run log `report_preparation.log` goes to `FMS_LOG_DIR`, next to the service logs
(`~/reports/log/` in the container is a bind mount of that directory). A failed run is printed to the service log, and the next run
still happens. It does not start in development (profile `report`).

```bash
podman-compose logs report                                                    # next run time and output
podman-compose exec -T backend python manage.py prepare_report_data              # run it now
```

#### Logs

Each service writes its output to one file on the host: `<FMS_LOG_DIR>/<service>.log`, for example
`/data/freezeman/oci/logs/backend.log`. `compose.yaml` sets the `k8s-file` log driver and the file of each
service. The files stay after `podman-compose down` and `podman-compose up -d --force-recreate`. A new container
of the same service appends to the file of the old one. `podman-compose logs` reads the active file.

```bash
podman-compose logs -f backend
tail -f /data/freezeman/oci/logs/backend.log        # each line has a time stamp, the stream and the text
```

The files grow without limit. Rotate them with `logrotate` (Rocky has the package: `rpm -q logrotate`) and the crontab of `django`, with no systemd:

1. Create the configuration `~/.config/logrotate/freezeman.conf`. If you set `FMS_LOG_DIR`, change the path.

   ```bash
   mkdir -p ~/.config/logrotate ~/.local/state
   cat > ~/.config/logrotate/freezeman.conf <<'EOF'
   /data/freezeman/oci/logs/*.log {
       weekly
       rotate 8
       compress
       delaycompress
       missingok
       notifempty
       copytruncate
   }
   EOF
   ```

2. Add a line to the crontab (`crontab -e`). The line uses its own state file, so it does not touch the
   system `logrotate`.

   ```cron
   0 3 * * 0 /usr/sbin/logrotate -s ~/.local/state/logrotate-freezeman.state ~/.config/logrotate/freezeman.conf
   ```

`copytruncate` is necessary: the container runtime (conmon) keeps each file open, so `logrotate` must copy the
file and then empty it. A line that a container writes between the copy and the truncation can be lost.
Do not set `log_size_max` or `max_size`. Podman then truncates the file itself, and old lines are lost with no copy.

With `FMS_ENV=PROD` Django logs to the console. Any other value also writes
`/src/backend/fms.log` inside the container.

#### Troubleshooting

| Symptom | Likely cause |
|---|---|
| 502 on `/api/` | No socket (`backend` is not running or `FMS_SOCKET_DIR` is wrong) or an SELinux (AVC) denial |
| 403 or 404 on `/` or `/static/` | `assets` did not run (check `podman-compose logs assets`) or the files have a wrong label |

Check the socket as `django`: `ls -l /data/freezeman/backend/fms.sock`. To look for an AVC denial, IT runs
`sudo ausearch -m avc -c nginx -ts recent`.

Not tested: on Rocky 9 it is not known whether `httpd_t` can connect to a socket that a `label=disable` container creates.
The classic setup works with an uwsgi that SELinux does not confine. Test this on a Rocky 9 host or VM before the
transition. If AVC denials occur, the fix needs a SELinux change by IT.

### Development

Start the stack and enter the `dev` container:

```bash
mkdir -p logs                          # the container logs go to oci/logs/<service>.log
podman-compose -f compose.yaml -f compose.dev.yaml up -d
podman-compose -f compose.yaml -f compose.dev.yaml exec dev bash
```

The `dev` shell starts in `/src`. In the `dev` shell:

```bash
# First start and after each new migration:
cd /src/backend && python manage.py migrate && python manage.py createinitialrevisions

# Backend: http://localhost:8000, reloads on code changes
cd /src/backend && python manage.py runserver 0.0.0.0:8000

# Frontend with live reload: http://localhost:9000 (proxies /api to port 8000)
cd /src/frontend && npm ci && npm start -- --host 0.0.0.0
```

- Use `0.0.0.0`: the published port connects to the container IP, not to the container loopback.
  The webpack proxy still reaches `localhost:8000`, because both servers run in the same container.
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
   The editor starts compose from another directory, so the default log path does not apply. Create `oci/logs`
   and set `FMS_LOG_DIR` in `.env` to its absolute path, for example `FMS_LOG_DIR=/home/me/freezeman/oci/logs`.
2. For podman, set these VS Code user settings: `"dev.containers.dockerPath": "podman"` and
   `"dev.containers.dockerComposePath": "podman-compose"`.
3. Open the repository in VS Code and run "Dev Containers: Reopen in Container".

The Dev Containers extension with `podman-compose` has known quirks. If "Reopen in Container" fails,
work without the editor inside `dev`. Open a terminal on the host, in `oci/`, and run the two commands
from the start of [Development](#development-2) (`up -d`, then `exec dev bash`). Edit the files on the host.
The servers, `psql` and the tests run in that `dev` shell as before.

#### Test the production stack locally

Podman does not create a missing bind-mount source or log directory. Create the host directories first (once).
Then start the stack and the container nginx, which replaces the host nginx:

```bash
mkdir -p ../frontend/dist ../backend/staticfiles ../backend/media logs
podman-compose build
podman-compose --profile web build     # podman-compose does not build the services of an inactive profile
podman-compose up -d
podman-compose --profile web up -d
```

Open `http://localhost:8080` (`FMS_HTTP_PORT`). The database is empty. To get data, restore a backup as in
[Database backups](#database-backups).

### Useful podman and podman-compose commands

```bash
podman-compose ps
podman-compose logs -f backend
podman-compose exec backend python manage.py shell
podman-compose exec -T backend python manage.py prepare_report_data
podman-compose exec db psql -U admin -d fms
# -T: no pseudo-TTY, which would turn the dump's line endings into CRLF
podman-compose exec -T db pg_dumpall -U admin > backup_$(date +%F).pgsql

podman ps -a                                       # all containers, also stopped ones
podman images                                      # built images
podman volume ls                                   # named volumes
podman inspect --format '{{.HostConfig.LogConfig}}' freezeman_backend_1   # log driver and log file
podman info --format '{{.Host.CgroupManager}}'     # cgroupfs on the deployment host
```

## Additional notes

Host nginx design choices:

- `security_opt: label=disable` on `backend` and `assets`. The host nginx runs in the SELinux domain `httpd_t`. The
  `:z` option relabels a path to `container_file_t`, and `httpd_t` can then not read it. With `label=disable` the files
  keep the label of their parent directory, as in the classic setup. Do not add `:z` to a path that the host nginx reads.
- `userns_mode: keep-id:uid=1000,gid=1000` on `backend`. The image user `fms` (uid 1000) writes the media files and the
  socket, and `django` owns them on the host.
- `assets` runs as root in the container. Rootless podman maps it to `django`, so `django` owns the copied files.
- `chmod-socket = 666` in `backend/uwsgi.ini` (active only when `FMS_UWSGI_SOCKET` is set). The nginx user is not the owner
  of the socket and needs write access. Each local user can then reach uwsgi directly.
- uwsgi still listens on port 8000 (uwsgi protocol) in the container network, for the
  `web` service and Kubernetes.

Portability:

- `:z` on bind mounts: required on any SELinux host (Fedora, RHEL, CentOS Stream), harmless elsewhere.
  Exception: paths that the host nginx reads (`frontend/dist`, `backend/staticfiles`, `backend/media`, the socket directory).
  They use `security_opt: label=disable` instead, because `:z` makes them unreadable for the host nginx.
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
| `web` port mapping | Ingress (TLS)                                                     |

Notes:
- The unix socket and the `assets` service exist only for the host nginx. Kubernetes uses `web` and the TCP port 8000.
- The `report` CronJob replaces the sleep loop in `fms-report`, so run `python manage.py prepare_report_data`
  directly, not `fms-report`. Set `concurrencyPolicy: Forbid`. A failed run then shows as a failed Job.
- Set `securityContext.fsGroup: 1000` so the `fms` user can write to PVCs.
- Make sure the Ingress sets `X-Forwarded-Proto`. The `web` nginx turns it into `HTTPS=on` for uwsgi.
  Expose only the `web` Service.
- `podman kube generate <container...>` produces a first draft of the YAML. `podman kube play`
  runs Kubernetes YAML directly on Rocky 9, which can be used to test the manifests before a cluster exists.
