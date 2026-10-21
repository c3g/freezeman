# FreezeMan containers

Container images and podman-compose configuration for FreezeMan:

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL 15 with the `fzy` extension (`backend/dependencies/pg_fzy`) |
| `migrate`  | `localhost/freezeman-backend` | One-shot: `migrate` + `createinitialrevisions`, then exits      |
| `backend`  | `localhost/freezeman-backend` | Django on uwsgi: port 8000 uwsgi protocol, 8001 plain HTTP for probes (internal) |
| `scheduler`| `localhost/freezeman-backend` | Daily `prepare_report_data` at `FMS_REPORT_TIME`                |
| `backup`   | `localhost/freezeman-db`      | Daily `pg_dumpall` to `FMS_BACKUP_DIR` as `<YYYY-MM-DD>.pgsql.gz`    |
| `web`      | `localhost/freezeman-web`     | nginx: built frontend, Django static files, `/media/`, passes `/api/` to uwsgi (`uwsgi_pass`) |
| `frontend` | dev only                      | webpack-dev-server, port 9000                                   |

The stack runs the same software as `DEPLOYMENT.md` (same major versions):
Python 3.14, Node 24, uwsgi 2.0 behind nginx, PostgreSQL 15. The PostgreSQL version is the
`POSTGRES_IMAGE` build argument in `db/Containerfile`, the uwsgi version is `UWSGI_VERSION`
in `Containerfile`. uwsgi settings are in `backend/uwsgi.ini`.

Files:

```
oci/
├── Containerfile              # backend-dev, backend-prod, frontend-dev, web targets (context: repo root)
├── db/Containerfile           # postgres + fzy (context: repo root)
├── db/initdb/10-fzy.sh        # CREATE EXTENSION fzy in template1 and $POSTGRES_DB on first start
├── db/backup.sh              # daily pg_dumpall loop of the backup service
├── backend/entrypoint.sh      # creates writable dirs, waits for the database
├── backend/uwsgi.ini          # uwsgi settings, based on backend/example.uwsgi.ini
├── nginx/default.conf.template
├── compose.yaml               # production-like stack
├── compose.dev.yaml           # development override
└── .env.example               # copy to .env
```

Related files outside `oci/`:

- `.containerignore`: build context exclusions. The build context is the repository root, so the file must be there.
- `backend/fms/info.py`: reads `fms/build_info.json`, which the image build writes.
  Images contain no `.git`. Without this change `git show` returns an empty string on master,
  the tuple unpacking raises `ValueError` at import, and Django does not start.
  Without the file, info.py runs git as before, so behavior outside containers is the same.
- `backend/fms/health.py`, `backend/fms/tests.py` and one line in `backend/fms/settings.py`
  (`HealthCheckMiddleware`, first in `MIDDLEWARE`): the compose healthchecks and Kubernetes probes
  need an endpoint that answers without login and without a valid `Host`. Probes use the container
  IP as `Host`, which is not in `ALLOWED_HOSTS`, so the middleware must be first.
  `/api/health/live/` = the process answers. `/api/health/ready/` = the database also answers.
  The tests cover both and check that other paths still validate the host.

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

```bash
podman-compose build

# 1. Start only the database. Do not start the full stack yet: migrate runs as soon as db is healthy.
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

Open `http://<host>:8080` (`FMS_HTTP_PORT`).

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
`migrate` runs again whenever its container is recreated.

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

```bash
podman-compose -f compose.yaml -f compose.dev.yaml up
```

- Frontend with live reload: `http://localhost:9000` (proxies `/api` to the backend; the
  frontend container shares the backend network namespace, so port 9000 is published by `backend`)
- Django runserver: `http://localhost:8000`, auto-reloads on code changes
- PostgreSQL: `localhost:5432`
- The repository is bind-mounted at `/src`; files the containers write (`fms.log`,
  migrations, uploads) are owned by your host user (`userns_mode: keep-id`).
- Container `node_modules` live in a named volume, separate from the host's.

Tests (the test database is created from `template1`, which already has `fzy`):

```bash
podman-compose -f compose.yaml -f compose.dev.yaml exec backend pytest
```

## Deploying on Rocky Linux 9

### Install

```bash
sudo dnf install -y podman git
# podman-compose is not in the base repositories. EPEL has it
# (EPEL packages may depend on CRB, which Rocky ships disabled):
sudo dnf install -y epel-release
sudo dnf config-manager --set-enabled crb
sudo dnf install -y podman-compose
podman --version
podman-compose --version
podman info --format '{{.Host.NetworkBackend}}'   # should print netavark
```

The production server runs Rocky Linux 9.6, which ships podman 5.4.0 and
buildah 1.39 (AppStream). EPEL 9 has podman-compose 1.5.0 (1.5.0-2 or later:
1.5.0-1 lacked the `python3-dotenv` dependency). These support everything the
compose files and Containerfiles use: `depends_on` conditions (they need
podman >= 4.6), `profiles`, `x-podman`, `RUN --mount=type=cache|bind` and
`COPY --chmod`. Rocky 9.7 and 9.8 ship podman 5.6 and 5.8, which work as well.

Rocky only maintains the latest 9.x minor release: 9.6 no longer receives
updates once 9.7 is out, and `sudo dnf update` moves the host to the current
9.x release. Nothing here requires that, but plan the upgrade for security fixes.

If the EPEL podman-compose is too old or broken, install the current release
for the deployment user instead (pure Python, needs Python >= 3.9; Rocky 9 has 3.9):

```bash
sudo dnf remove -y podman-compose
sudo dnf install -y python3-pip
pip3 install --user podman-compose
```

### Run rootless as a dedicated user

Run the stack as an unprivileged user (e.g. `django`), not as root.

- Users created with `useradd` get `/etc/subuid` and `/etc/subgid` ranges
  automatically. Check with `grep django /etc/subuid`. Older accounts may need
  `sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 django`.
- Log in as that user directly (`ssh` or `sudo machinectl shell django@`), not with
  `sudo su - django`. `su` starts no systemd user session and sets no `XDG_RUNTIME_DIR`.
  Without them, healthchecks do not run, so `db`, `backend` and `web` never become
  healthy and `podman-compose up` waits on `service_healthy`. Podman also falls back
  to cgroupfs and puts its runtime files outside `/run/user/<uid>`.
  `machinectl` is in the `systemd-container` package, which a minimal Rocky 9 install
  does not include.
- Rootless containers are stopped when the user's last session ends, unless lingering is enabled:

  ```bash
  sudo loginctl enable-linger django
  ```

  This is the only systemd setting the stack needs. Rootless podman needs the
  user manager for its runtime directory and for healthchecks, which podman runs
  as systemd timers that it creates itself.

### Start on boot

podman-compose itself does not start anything at boot, and `restart: always`
does not apply after a reboot. Add a user crontab line (`crontab -e`, as the
deployment user, with linger enabled). `cronie` is installed by default on Rocky 9:

```cron
@reboot XDG_RUNTIME_DIR=/run/user/$(id -u) PATH=$HOME/.local/bin:/usr/bin:/bin cd ~/freezeman/oci && podman-compose up -d
```

Cron has no `XDG_RUNTIME_DIR` and a short `PATH`, so the line sets both.
`$HOME/.local/bin` covers a pip-installed `podman-compose`.

Alternative: Quadlet (systemd units in `~/.config/containers/systemd/`), which
Podman on Rocky 9 supports. It is the method Red Hat recommends for long-running
services. See "Path to Kubernetes" below.

### Ports, TLS and firewall

Rootless containers cannot bind ports below 1024, so nginx listens on 8080.
Recommended: keep the host nginx (from `DEPLOYMENT.md`) for TLS and the
certificate. Point it at the container, and publish the container port on
loopback only. The host nginx must send `X-Forwarded-Proto`: the container
nginx turns `X-Forwarded-Proto: https` into the uwsgi parameter `HTTPS=on`, and
Django then builds `https://` links (e.g. the template download URLs from
`request.build_absolute_uri`).

```bash
# oci/.env
FMS_HTTP_PORT=127.0.0.1:8080
```

```nginx
# host nginx, replaces the old root/alias/uwsgi locations
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    client_max_body_size 100m;
}
```

SELinux: the host nginx needs `sudo setsebool -P httpd_can_network_connect 1` to proxy to a port.

Without a host proxy, open the port instead:
`sudo firewall-cmd --permanent --add-port=8080/tcp && sudo firewall-cmd --reload`.

### SELinux

Rocky 9 runs SELinux in enforcing mode. Named volumes, which the production stack uses,
need nothing. Bind mounts need a relabel option: `compose.dev.yaml` uses `:z`
(shared label). Use `:z` on any bind mount you add, e.g. if trigger folders
must live on a host path that other tools read:

```yaml
# compose.yaml, backend service
volumes:
  - /data/freezeman/triggers:/src/backend/triggers:z
```

The container user is `fms` (uid 1000 inside the container), which rootless
podman maps to a subordinate uid on the host. To make a host directory writable
for it: `podman unshare chown -R 1000:1000 /data/freezeman/triggers`.

### Daily report data (replaces the cron entry)

The `scheduler` service runs `python manage.py prepare_report_data` every day.
Set the time in `.env`: `FMS_REPORT_TIME` (`HH:MM`, default `02:00`) in the time
zone `TZ` (`America/Montreal`). Logs go to the `reports` volume (`~/reports/log/`
in the container). A failed run is printed to the service log, and the next run
still happens. It does not start in development (profile `scheduler`).

```bash
podman-compose logs scheduler                                                    # next run time and output
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
podman cp fms_before_containers.dump freezeman_db_1:/tmp/
podman-compose exec db pg_restore -U admin -d fms --no-owner --no-acl /tmp/fms_before_containers.dump
podman-compose up -d
```

The database is created on first start with `fzy` already enabled, so expect a
harmless "extension fzy already exists" message during the restore. `--no-owner`
assigns everything to `POSTGRES_USER`.

Copy the old uploaded files (and trigger folders, unless they are bind-mounted
host paths) into the volumes:

```bash
podman cp /data/freezeman/backend/media/. freezeman_backend_1:/src/backend/media/
podman-compose exec -u root backend chown -R fms:fms /src/backend/media
```

### Logs

Container output goes to podman's log driver (journald by default on Rocky 9):
`podman-compose logs backend` or `journalctl --user CONTAINER_NAME=freezeman_backend_1`.
With `FMS_ENV=PROD` Django logs to the console. Any other value also writes
`/src/backend/fms.log` inside the container.

## Rocky 9 notes

| Topic | Where | Notes |
|---|---|---|
| `restart: always` + crontab `@reboot` | `compose.yaml` | podman-compose has no boot integration of its own, so a user crontab line starts the stack (see "Start on boot"). Prefer Quadlet units (or `podman kube play` via a `.kube` Quadlet) in the long term. |
| `migrate` failure does not block `backend` | `compose.yaml` | podman-compose treats `service_completed_successfully` as "stopped" and ignores the exit code (still true in 1.5 and 1.6). Check `podman-compose logs migrate` after each deploy. Kubernetes Jobs and Helm hooks do report failure. |
| Healthchecks | `compose.yaml` | Rootless podman runs them through systemd user timers. They need a real user session (see "Run rootless as a dedicated user"). Without one the containers never become healthy, and `up` can hang waiting on `service_healthy`. |

Not Rocky-specific (keep everywhere):

- `:z` on bind mounts: required on any SELinux host (Fedora, RHEL, CentOS Stream), harmless elsewhere.
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
| `media`, `triggers`, `automations_work` | PVCs (`media` must be ReadWriteMany if `web` and `backend` run on different nodes) |
| `.env`             | ConfigMap (settings) + Secret (`POSTGRES_PASSWORD`, `FMS_SECRET_KEY`, email password) |
| `backup`           | CronJob + PVC                                                     |
| `web` port mapping | Ingress (TLS)                                                     |

Notes:
- Probes: `/api/health/live/` (process answers) for the livenessProbe and
  `/api/health/ready/` (database reachable too) for the readinessProbe, on port 8001
  (plain HTTP socket of uwsgi; port 8000 only speaks the uwsgi protocol).
  Neither needs authentication or an `ALLOWED_HOSTS` entry for the pod IP.
  Don't use the readiness endpoint for liveness: a database outage would restart every backend pod.

  ```yaml
  livenessProbe:
    httpGet: {path: /api/health/live/, port: 8001}
    periodSeconds: 30
  readinessProbe:
    httpGet: {path: /api/health/ready/, port: 8001}
    periodSeconds: 10
  ```
- Set `securityContext.fsGroup: 1000` so the `fms` user can write to PVCs.
- Make sure the Ingress sets `X-Forwarded-Proto`. The `web` nginx turns it into `HTTPS=on` for uwsgi.
  Expose only the `web` Service. Do not publish port 8001 outside the cluster.
- `podman kube generate <container...>` produces a first draft of the YAML. `podman kube play`
  runs Kubernetes YAML directly on Rocky 9, which can be used to test the manifests before a cluster exists.
