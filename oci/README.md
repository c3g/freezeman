# FreezeMan containers

Contents:

- [Prerequisites](#prerequisites)
- [Production-like stack](#production-like-stack)
  - [For reference only: first account on an empty database](#for-reference-only-first-account-on-an-empty-database)
- [Development](#development)
  - [Dev Container](#dev-container)
  - [Other editors](#other-editors)
- [Production deployment](#production-deployment)
  - [Deployment user setup](#deployment-user-setup)
  - [Host nginx](#host-nginx)
  - [Cutover from the classic setup](#cutover-from-the-classic-setup)
  - [Daily report data (replaces the cron entry)](#daily-report-data-replaces-the-cron-entry)
  - [Database backups](#database-backups)
  - [Moving data from the existing PostgreSQL 15 server](#moving-data-from-the-existing-postgresql-15-server)
  - [Logs](#logs)
- [Portability notes](#portability-notes)
- [Path to Kubernetes](#path-to-kubernetes)

Container images and podman-compose configuration for FreezeMan:

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL 15 with the `fzy` extension (`backend/dependencies/pg_fzy`) |
| `migrate`  | `localhost/freezeman-backend` | One-shot: `migrate` + `createinitialrevisions`, then exits      |
| `backend`  | `localhost/freezeman-backend` | Django on uwsgi: port 8000 uwsgi protocol (internal)                 |
| `report`   | `localhost/freezeman-backend` | Daily `prepare_report_data` at `FMS_REPORT_TIME`                |
| `backup`   | `localhost/freezeman-db`      | Daily `pg_dumpall` to `FMS_BACKUP_DIR` as `<YYYY-MM-DD>.pgsql.gz`    |
| `assets`   | `localhost/freezeman-web`     | One-shot: copies the built frontend and the Django static files into host directories for the host nginx, then exits |
| `web`      | `localhost/freezeman-web`     | Profile `web`. nginx in a container: built frontend, Django static files, `/media/`, passes `/api/` to uwsgi (`uwsgi_pass`). For tests without a host nginx |
| `dev`      | `localhost/freezeman-dev`     | Dev only. Idle container with the venv, Python 3.14 and Node 24. You start runserver and webpack by hand. Replaces `backend` and `frontend` in development |

The stack runs the same software as `DEPLOYMENT.md` (same major versions):
Python 3.14, Node 24, uwsgi 2.0 behind nginx, PostgreSQL 15. The PostgreSQL version is the
`POSTGRES_IMAGE` build argument in `db/Containerfile`, the uwsgi version is `UWSGI_VERSION`
in `Containerfile`. uwsgi settings are in `backend/uwsgi.ini`.

Files:

```
oci/
├── Containerfile              # dev, backend-prod, web targets (context: repo root)
├── db/Containerfile           # postgres + fzy (context: repo root)
├── db/initdb/10-fzy.sh        # CREATE EXTENSION fzy in template1 and $POSTGRES_DB on first start
├── db/backup.sh              # daily pg_dumpall loop of the backup service
├── backend/report.sh          # daily prepare_report_data loop of the report service
├── backend/entrypoint.sh      # creates writable dirs, waits for the database
├── backend/uwsgi.ini          # uwsgi settings, based on backend/example.uwsgi.ini
├── nginx/default.conf.template  # config of the web service
├── nginx/export-assets.sh     # copies the frontend and static files out of the web image (assets service)
├── compose.yaml               # production-like stack
├── compose.dev.yaml           # development override (service dev)
├── ROCKY.md                   # Rocky Linux 9.6 host requirements (for IT)
└── .env.example               # copy to .env
```

Related files outside `oci/`:

- `.devcontainer/devcontainer.json`: runs the editor inside the `dev` service (see [Dev Container](#dev-container)).
- `.containerignore`: build context exclusions. The build context is the repository root, so the file must be there.
- `backend/fms/info.py`: reads `fms/build_info.json`, which the image build writes.
  Images contain no `.git`. Without this change `git show` returns an empty string on master,
  the tuple unpacking raises `ValueError` at import, and Django does not start.
  Without the file, info.py runs git as before, so behavior outside containers is the same.

## Prerequisites

- The pg_fzy submodules must be checked out:
  `git submodule update --init --recursive`
- The checkout must have a real `.git` directory (not a `git worktree`, whose
  `.git` is a file pointing elsewhere): the frontend build and `build_info.json`
  read commit information from it.
- `cd oci && cp .env.example .env`, then set at least `POSTGRES_PASSWORD`,
  `FMS_SECRET_KEY` and `FMS_HOST`.

All `podman-compose` commands below are run from `oci/`.

## Production-like stack

Podman does not create a missing bind-mount source. Create the host directories first (once):

```bash
mkdir -p ../frontend/dist ../backend/staticfiles ../backend/media
```

```bash
podman-compose build

# 1. Start only the database. Do not start the full stack yet: migrate runs as soon as db starts.
podman-compose up -d db

# 2. Wait for the server. -h 127.0.0.1: the first-start init server listens on the socket only,
#    so a TCP check passes only when the real server is up.
until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done

# 3. Restore a backup that has accounts (a daily backup of this stack):
gunzip -c <YYYY-MM-DD>.pgsql.gz | podman-compose exec -T db psql -U admin -d postgres

# 4. Start the full stack. migrate applies the migrations that the backup does not have.
podman-compose up -d
podman-compose logs migrate          # migrations applied?
```

- `-d postgres`: the `pg_dumpall` script creates the roles and the database, then runs `\connect fms`.
  psql must start in another database, so it starts in `postgres`. The messages "role admin already
  exists", "database fms already exists" and "extension fzy already exists" are harmless.
- For a dump from the old PostgreSQL 15 server, replace step 3 with the `pg_restore` commands in
  [Moving data from the existing PostgreSQL 15 server](#moving-data-from-the-existing-postgresql-15-server).
- For an initial setup with no backup, skip steps 1 to 3, then follow
  [For reference only: first account on an empty database](#for-reference-only-first-account-on-an-empty-database).
- Backups are described in [Database backups](#database-backups).

The default `up -d` does not start a web server. The `assets` service writes the frontend to `../frontend/dist`
and the static files to `../backend/staticfiles`. The `backend` service writes the media files to `../backend/media`
and the uwsgi socket to `../backend/fms.sock`. A host nginx serves these (see [Host nginx](#host-nginx)).

For a local test without a host nginx, start the container nginx too, then open `http://localhost:8080`
(`FMS_HTTP_PORT`):

```bash
podman-compose --profile web up -d
```

Useful commands:

```bash
podman-compose ps
podman-compose logs -f backend
podman-compose exec backend python manage.py shell
podman-compose exec -T backend python manage.py prepare_report_data
podman-compose exec db psql -U admin -d fms
# -T: no pseudo-TTY, which would turn the dump's line endings into CRLF
podman-compose exec -T db pg_dumpall -U admin > backup_$(date +%F).pgsql
```

Releasing a new version:

```bash
podman-compose exec backup fms-backup now
git fetch && git checkout vX.Y.Z && git submodule update --init --recursive
# set FMS_IMAGE_TAG=vX.Y.Z in .env
podman-compose build
podman-compose up -d --force-recreate
podman-compose logs migrate
```

`--force-recreate` matters: `podman-compose up -d` only recreates containers
when the resolved compose configuration changed. A rebuilt image under the same
tag, or an edit to a variable that reaches the containers only through
`env_file: .env` (e.g. `FMS_EMAIL_HOST`), is otherwise silently not applied.
`migrate` runs again whenever its container is recreated. `assets` also runs again and replaces the
files in `../frontend/dist` and `../backend/staticfiles`. `/static/` and `/` are briefly empty during the copy.

### For reference only: first account on an empty database

Do not use this for a normal deployment, which restores a backup that already has accounts.
For an initial setup with an empty database, create the first account as below.
`createsuperuser` does not create the `FreezemanUser` that the app expects for each `User`,
so the second command adds it. Without it, `GET /api/users/` fails with a 500 error.

```bash
podman-compose exec backend python manage.py createsuperuser
podman-compose exec -T backend python manage.py shell -c '
from django.contrib.auth.models import User
from fms_core.models import FreezemanUser, Profile
profile = Profile.objects.get(name="Default")
for user in User.objects.filter(freezeman_user__isnull=True):
    FreezemanUser.objects.create(user=user, profile=profile)
    print(f"Created FreezemanUser for {user.username}")
'
```

## Development

Works on any OS with podman and podman-compose (macOS and Windows through
`podman machine`); the `:z` SELinux labels are ignored where SELinux is absent.

The dev stack has two containers: `db` and `dev`. `dev` has Python 3.14 (venv in `/opt/venv`)
and Node 24, and it runs nothing by itself. You start the servers by hand.

```bash
podman-compose -f compose.yaml -f compose.dev.yaml up -d
podman-compose -f compose.yaml -f compose.dev.yaml exec dev bash
```

In the `dev` shell:

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
- PostgreSQL: `localhost:5432`
- The repository is bind-mounted at `/src`; files the container writes (`fms.log`,
  migrations, uploads) are owned by your host user (`userns_mode: keep-id`).
- Container `node_modules` live in a named volume, separate from the host's.
- The production services `migrate`, `backend`, `assets` and `web` have the profile `prod`
  in development, so `up -d` does not start them.

Tests (the test database is created from `template1`, which already has `fzy`):

```bash
podman-compose -f compose.yaml -f compose.dev.yaml exec dev sh -c 'cd backend && pytest'
```

The `dev` shell starts in `/src`.

### Dev Container

`.devcontainer/devcontainer.json` runs the editor inside `dev`, so the language servers see
the venv (`/opt/venv/bin/python`) and `node_modules`. It uses the same compose files and
starts `db` and `dev`. It starts no server: use a terminal in the editor, as above.

1. Do the [Prerequisites](#prerequisites), including `cp .env.example .env` in `oci/`.
2. For podman, set these VS Code user settings: `"dev.containers.dockerPath": "podman"` and
   `"dev.containers.dockerComposePath": "podman-compose"`.
3. Open the repository in VS Code and run "Dev Containers: Reopen in Container".

The Dev Containers extension with `podman-compose` has known quirks. If "Reopen in Container" fails,
use `exec dev bash` as above.

### Other editors

The venv and `node_modules` are in the container, not on the host, so a host editor does not
resolve imports. Choose one:

- Run the editor in the container (see [Dev Container](#dev-container)).
- Create a host venv (`backend/env`) and run `npm ci` on the host, as in the classic setup.
  The host `node_modules` and the container volume are separate.

## Production deployment

IT prepares the host with [ROCKY.md](ROCKY.md). It installs `podman` and `podman-compose`, sets the subuid and subgid range
and enables linger for `django`. The host nginx keeps the config of `DEPLOYMENT.md`: the containers supply the files and
the socket that this config expects (see [Host nginx](#host-nginx)).
Then do the steps in [Deployment user setup](#deployment-user-setup).

### Deployment user setup

Run these steps as `django` (`sudo su - django`) after IT finishes [ROCKY.md](ROCKY.md) and the acceptance checks pass.

1. Point podman at the systemd user manager. `sudo su - django` and cron start no systemd user session.
   Linger keeps the manager running, and these lines set the variables only when they are empty. A real
   login (`ssh`) keeps the values from logind. Cron jobs that use `bash --login -c` read this file too.

   ```bash
   cp ~/.bash_profile ~/.bash_profile.bak
   cat >> ~/.bash_profile <<'EOF'

   # Rootless podman: `sudo su - django` and cron start no systemd user session.
   # Linger keeps the user manager running. These lines point podman at it.
   export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
   export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=${XDG_RUNTIME_DIR}/bus}"
   EOF
   ```

   Start a new login shell, then check that `podman info --format '{{.Host.CgroupManager}}'` prints `systemd`.

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

4. Only if `git --version` fails: run git without a host git. Add a shell function to `~/.bash_profile` that runs
   git from the `docker.io/alpine/git` image. Rootless podman maps the container root to `django`, so `django` owns
   the files. The function uses `--security-opt label=disable` and not `:z`. `:z` on `/data` relabels the tree
   to `container_file_t`, and the host nginx can then not read `frontend/dist`.

   ```bash
   cat >> ~/.bash_profile <<'EOF'

   # git without host git: runs the alpine/git image in the current directory.
   git() {
       podman run --rm --security-opt label=disable -v "$PWD":"$PWD" -w "$PWD" docker.io/alpine/git:2.54.0 "$@"
   }
   EOF
   ```

   Start a new login shell. The stack files must be in `/data/freezeman/oci`. The checkout needs a real `.git`
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

   Another option is to clone on another host and copy the tree with `.git`, for example
   `tar -c freezeman | ssh django@<host> tar -x -C /data`.

5. Keep container logs in files. Podman on Rocky 9 uses the `journald` driver by default. Set the
   `k8s-file` driver for `django`:

   ```bash
   mkdir -p ~/.config/containers
   cat >> ~/.config/containers/containers.conf <<'EOF'
   [containers]
   log_driver = "k8s-file"
   log_size_max = 52428800
   EOF

   podman info --format '{{.Host.LogDriver}}'      # k8s-file
   ```

   If `containers.conf` exists already, merge the two lines into its `[containers]` section.
   See [Logs](#logs).

6. Create the backup directory and set `FMS_BACKUP_DIR` in `.env`. See [Database backups](#database-backups).
   Create the host nginx directories too: `mkdir -p /data/freezeman/frontend/dist /data/freezeman/backend/staticfiles /data/freezeman/backend/media`.
7. Start the stack by hand as `django` after each reboot: `cd /data/freezeman/oci && podman-compose up -d`.
   Boot start is manual until the team decides on a boot method.
8. Check the socket and the site. The `backend` service creates the socket, and the host nginx connects to it:

   ```bash
   ls -l /data/freezeman/backend/fms.sock          # srw-rw-rw- ... django django
   curl -sfo /dev/null -w '%{http_code}\n' https://<host>/   # 200
   ```

   The host firewall needs no change. No container publishes a port.

### Host nginx

The host nginx keeps the config of `DEPLOYMENT.md` (TLS, certificate and locations). The containers supply what
this config expects, so the host nginx needs no change. With the repository at `/data/freezeman`:

| Host nginx location | Host path | Supplied by |
|---|---|---|
| `/` (`root`) | `/data/freezeman/frontend/dist/` | `assets` (copy from the `web` image) |
| `/static/` (`alias`) | `/data/freezeman/backend/staticfiles/` | `assets` |
| `/media/` (`alias`) | `/data/freezeman/backend/media/` | `backend` (bind mount) |
| `/api/` (`uwsgi_pass unix:`) | `/data/freezeman/backend/fms.sock` | `backend` (uwsgi unix socket in a bind mount) |

The paths in `compose.yaml` are relative to `oci/`, so they match this table when the repository is at `/data/freezeman`.
To use other paths, set `FMS_FRONTEND_DIST_DIR`, `FMS_STATIC_DIR`, `FMS_MEDIA_DIR` and `FMS_SOCKET_DIR` in `.env`.

Design choices:

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

Diagnostics:

| Symptom | Likely cause |
|---|---|
| 502 on `/api/` | No socket (`backend` is not running or `FMS_SOCKET_DIR` is wrong) or an SELinux (AVC) denial |
| 403 or 404 on `/` or `/static/` | `assets` did not run (check `podman-compose logs assets`) or the files have a wrong label |

Check the socket as `django`: `ls -l /data/freezeman/backend/fms.sock`. To look for an AVC denial, IT runs
`sudo ausearch -m avc -c nginx -ts recent`.

Not tested: on Rocky 9 it is not known whether `httpd_t` can connect to a socket that a `label=disable` container creates.
The classic setup works with an uwsgi that SELinux does not confine. Test this on a Rocky 9 host or VM before the
cutover. If AVC denials occur, the fix needs a SELinux change by IT.

The container nginx (`--profile web`) is for tests. It does not replace the host nginx.

### Cutover from the classic setup

Do these steps once, as `django`, on the host that runs the classic setup (uwsgi, host PostgreSQL).

1. Back up the database and the media files: `pg_dumpall > backup_before_containers.pgsql` and
   `cp -a /data/freezeman/backend/media /data/freezeman/backend/media.bak`.
2. Stop the old uwsgi. Find the master with `ps -u django -o pid,args | grep uwsgi`, then `kill <master PID>`.
   The old socket file `fms.sock` goes away with it (`vacuum`). If it stays, delete it.
3. Remove the `prepare_report_data` line from the `django` crontab (`crontab -e`). The `report` service replaces it.
4. Get the release and prepare `.env` and the directories (see [Deployment user setup](#deployment-user-setup), steps 4 and 6).
   The old media files stay in `/data/freezeman/backend/media`, where the new `backend` service uses them.
5. Restore the data: see [Moving data from the existing PostgreSQL 15 server](#moving-data-from-the-existing-postgresql-15-server).
6. Run `podman-compose build`, then `podman-compose up -d`. Check the socket and the site (step 8 of the setup).

To go back, stop the stack (`podman-compose down`), delete `backend/fms.sock` and start the old uwsgi again.

### Daily report data (replaces the cron entry)

The `report` service runs `python manage.py prepare_report_data` every day.
Set the time in `.env`: `FMS_REPORT_TIME` (`HH:MM`, default `02:00`) in the time
zone `TZ` (`America/Montreal`). Logs go to the `reports` volume (`~/reports/log/`
in the container). A failed run is printed to the service log, and the next run
still happens. It does not start in development (profile `report`).

```bash
podman-compose logs report                                                    # next run time and output
podman-compose exec -T backend python manage.py prepare_report_data              # run it now
```

### Database backups

The `backup` service runs `pg_dumpall` every day at `FMS_BACKUP_TIME` (default `01:00`, in `TZ`)
and writes `<YYYY-MM-DD>.pgsql.gz` into `FMS_BACKUP_DIR` on the host. It deletes files older than
`FMS_BACKUP_KEEP_DAYS` (default 14, `0` keeps all). It does not start in development (profile `backup`).

```bash
# oci/.env
FMS_BACKUP_DIR=/data/freezeman/backups

mkdir -p /data/freezeman/backups      # podman does not create a missing bind-mount source
podman-compose up -d backup
podman-compose exec backup fms-backup now      # run one backup now

# restore (into an empty database cluster): start only db, restore, then `up -d`.
# Order and wait loop: see "Production-like stack".
gunzip -c /data/freezeman/backups/2026-10-21.pgsql.gz | podman-compose exec -T db psql -U admin -d postgres
```

The container runs as root, which rootless podman maps to the deployment user, so that user owns the
files. The bind mount uses `:z` for SELinux. The backup image is the `db` image, so `pg_dumpall` always
matches the server version. Copy the directory off the host as well: a backup on the same disk does
not protect against disk loss.

### Moving data from the existing PostgreSQL 15 server

The container runs the same major version (15), so a plain dump and restore is enough.
If you used an earlier version of this stack with PostgreSQL 18, its `pgdata` volume does
not work with PostgreSQL 15. Dump the data first, then remove the volume
(`podman volume rm freezeman_pgdata`).

```bash
# old server
pg_dump -U postgres -Fc fms > fms_before_containers.dump

# new server, from oci/: start only the database, restore, then the rest
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done
podman-compose exec -T db pg_restore -U admin -d fms --no-owner --no-acl < fms_before_containers.dump
podman-compose up -d
```

`-T` keeps the binary dump intact. Without it, the pseudo-TTY changes the stream.
The database is created on first start with `fzy` already enabled, so expect a
harmless "extension fzy already exists" message during the restore. `--no-owner`
assigns everything to `POSTGRES_USER`.

The media files need no copy on the deployment host: the `backend` service uses the host directory
`FMS_MEDIA_DIR` (default `../backend/media`) itself. On another host, copy the old uploaded files into that directory.
Copy the trigger folders into the `triggers` volume, unless they are bind-mounted host paths.

### Logs

Container output goes to podman's log driver: `podman-compose logs backend`.

On the deployment host, `django` sets the `k8s-file` log driver in `~/.config/containers/containers.conf`
([Deployment user setup](#deployment-user-setup), step 5). `podman logs` and `podman-compose logs` read the
log file of each container. `log_size_max` limits the size of each file. The logs stay until the container
is removed. `podman-compose up -d --force-recreate` and `podman-compose down` delete them.

```bash
podman info --format '{{.Host.LogDriver}}'                 # k8s-file
```

A container keeps the log driver it had at creation. If the containers exist already, recreate them once:

```bash
cd /data/freezeman/oci && podman-compose up -d --force-recreate
```

If the logs must survive a container recreate, ask IT for a persistent journal and use the `journald` driver.

With `FMS_ENV=PROD` Django logs to the console. Any other value also writes
`/src/backend/fms.log` inside the container.

## Portability notes

- `:z` on bind mounts: required on any SELinux host (Fedora, RHEL, CentOS Stream), harmless elsewhere.
  Exception: paths that the host nginx reads (`frontend/dist`, `backend/staticfiles`, `backend/media`, the socket directory).
  They use `security_opt: label=disable` instead, because `:z` makes them unreadable for the host nginx.
- Fully qualified image names (`docker.io/library/...`): RHEL-family systems enforce
  short-name resolution, and fully qualified names avoid prompts on any registry setup.
- `x-podman: in_pod: false`: `userns_mode: keep-id` (development) cannot be used for containers inside a pod.

## Path to Kubernetes

The layout already maps onto Kubernetes objects:

| Compose            | Kubernetes                                                        |
|--------------------|-------------------------------------------------------------------|
| `db`               | StatefulSet + PVC (or a managed PostgreSQL with the fzy extension) |
| `migrate`          | Job (or Helm `pre-install`/`pre-upgrade` hook)                    |
| `backend`, `web`   | Deployments + Services (`BACKEND_UPSTREAM` = backend Service name) |
| `media`, `triggers`, `automations_work`, `reports` | PVCs (`media` must be ReadWriteMany if `web` and `backend` run on different nodes). On the host, `media` is a bind-mounted directory |
| `.env`             | ConfigMap (settings) + Secret (`POSTGRES_PASSWORD`, `FMS_SECRET_KEY`, email password) |
| `backup`           | CronJob + PVC                                                     |
| `report`           | CronJob that runs `python manage.py prepare_report_data` (`schedule` from `FMS_REPORT_TIME`, `timeZone` from `TZ`) + `reports` PVC at `/home/fms/reports` |
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
