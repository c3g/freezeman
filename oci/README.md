# FreezeMan containers

Container images and podman-compose configuration for FreezeMan.

Contents:

- [Overview](#overview)
  - [Production services](#production-services)
  - [Development services](#development-services)
- [Documents](#documents)
- [Layout](#layout)
- [Shared setup](#shared-setup)
  - [Prerequisites](#prerequisites)
  - [Proxy](#proxy)
- [Useful podman and podman-compose commands](#useful-podman-and-podman-compose-commands)
- [Additional notes](#additional-notes)
- [Path to Kubernetes](#path-to-kubernetes)

## Overview

- The stack runs the same software as the classic deployment guide ([../DEPLOYMENT.md](../DEPLOYMENT.md)) (same major versions): Python 3.14, Node 24, uwsgi 2.0 behind nginx, PostgreSQL 15.
- The PostgreSQL version is the `POSTGRES_IMAGE` build argument in `db/Containerfile`.
- The uwsgi version is `UWSGI_VERSION` in `Containerfile`.
- uwsgi settings are in `backend/uwsgi.ini`.
- Run all `podman-compose` commands from `oci/`.

### Production services

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL 15 with the `fzy` extension (`backend/dependencies/pg_fzy`) |
| `migrate`  | `localhost/freezeman-backend` | One-shot: `migrate` + `createinitialrevisions`, then exits      |
| `backend`  | `localhost/freezeman-backend` | Django on uwsgi: port 8000 uwsgi protocol (internal)                 |
| `report`   | `localhost/freezeman-backend` | Daily `prepare_report_data` at `FMS_REPORT_TIME`                |
| `backup`   | `localhost/freezeman-backup`  | Daily `pg_dumpall` to `FMS_BACKUP_DIR` as `<YYYY-MM-DD>.pgsql.gz`    |
| `logrotate`| `localhost/freezeman-logrotate` | Daily `logrotate` of `FMS_LOG_DIR/*.log` at `FMS_LOGROTATE_TIME`. Each file rotates every `FMS_LOGROTATE_FREQUENCY` (default weekly) |
| `web`      | `localhost/freezeman-web`     | nginx in a container: the built frontend, Django static files, `/media/`. Passes `/api/` to uwsgi. The host nginx passes HTTP to it |

IT sets up the host nginx (see [Host nginx](ROCKY.md#5-host-nginx) in ROCKY.md). The FreezeMan team has no `sudo` and cannot change it.

### Development services

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL 15 with the `fzy` extension. Port 5432 is published  |
| `dev`      | `localhost/freezeman-dev`     | Idle container with the venv (`/opt/venv`), Python 3.14 and Node 24. It also has the language servers (`basedpyright`, `typescript-language-server`, `docker-language-server`) and the Python type stubs. You start the Django server (`runserver`) and the frontend dev server (webpack) by hand inside it. It takes the place of the production `backend` service |

For the bind mount, the `node_modules` volume and the `prod` profiles, see [Development notes](DEVELOPMENT.md#development-notes) in DEVELOPMENT.md.

## Documents

| Reader | Read |
|---|---|
| Agents | This file first. Then the guide that fits the task. |
| IT (host setup) | [ROCKY.md](ROCKY.md): the root steps and the acceptance checks for the Rocky Linux 9.6 host |
| Deployment team | [DEPLOYMENT.md](DEPLOYMENT.md): production deployment and daily use |
| Developers | [DEVELOPMENT.md](DEVELOPMENT.md): the development stack, the servers, the tests and the Dev Container |

Both guides use the [Shared setup](#shared-setup) below. Read it once.

## Layout

| Item | What it is |
|---|---|
| `Containerfile` | Images of the backend (`dev`, `backend-prod`) and `web`. The build context is the repository root |
| `compose.yaml` | The production-like stack (all services) |
| `compose.dev.yaml` | Development override: adds the `dev` container, publishes the `db` port, puts the production services in the profile `prod` |
| `compose.restore.yaml` | Override of the `db` command for a restore on a slow disk |
| `db/` | `Containerfile` of the `db` and `backup` images, `backup.py` (the `backup` service), `initdb/10-fzy.sql` (enables `fzy` at the first start) |
| `nginx/` | `default.conf.template`: the configuration of the `web` nginx |
| `logrotate/` | `Containerfile`, `logrotate.py` and `logrotate.conf.template` of the `logrotate` service |
| `backend/` | `entrypoint.py` (container entrypoint), `report.py` (the `report` service) and `uwsgi.ini` |
| `start.py` | Starts the stack at boot (cron `@reboot`) and checks the containers |
| `autoupdate.py` | Updates a QC or dev stack from a GitHub branch |
| `notify.py` | Sends the failure emails of the jobs |
| `hostenv.py` | Sets `XDG_RUNTIME_DIR` for the host scripts (`start.py`, `autoupdate.py`) |
| `.env.example` | Template of `.env`. Copy it to `.env`. Commit only the template |
| `logs/` | Usual `FMS_LOG_DIR` (a git-ignored directory). Create it before the first start |
| `backups/` | Git-ignored directory for database backups (`FMS_BACKUP_DIR` points to a directory like it) |
| `ROCKY.md` | Requirements for the Rocky Linux 9.6 host (IT) |
| `DEPLOYMENT.md` | Production deployment guide |
| `DEVELOPMENT.md` | Development setup guide |

## Shared setup

Do this setup once for each checkout. It applies to production and to development.

### Prerequisites

Do these steps for both environments:

- Check out the pg_fzy submodules: `git submodule update --init --recursive`
- Use a checkout with a real `.git` directory (not a `git worktree`, whose `.git` is a file pointing elsewhere).
  The frontend build and `build_info.json` read commit information from it.
- Run `cd oci && cp .env.example .env`, then set at least `POSTGRES_PASSWORD`, `FMS_SECRET_KEY`, `FMS_HOST` and `FMS_LOG_DIR`.
  - `FMS_LOG_DIR`: the absolute path of the log directory. It has no default: compose stops if it is not set.

Then continue with the environment steps:

- Production: [Prerequisites](DEPLOYMENT.md#prerequisites) in DEPLOYMENT.md.
- Development: [Prerequisites](DEVELOPMENT.md#prerequisites) in DEVELOPMENT.md.

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
  - The other services (`db`, `migrate`, `backend`, `report`, `backup`, `logrotate`, `web`) get empty proxy variables from `compose.yaml`.
  - The empty values override the proxy that podman copies from its own environment (`http_proxy = true`, the default of
    `containers.conf`) and the proxy values of `.env` (`env_file`).
  - These services make no outbound HTTP calls, so they do not need a proxy.
  - Only in `dev` does `NO_PROXY` get the service names.
- Known quirk: podman-compose interpolates the `environment` of a service twice. If the shell has a proxy but no `NO_PROXY`,
  `podman-compose config` shows `db,backend,web` twice in the `NO_PROXY` and `no_proxy` of `dev`. The duplicates have no effect.
- Email ignores the proxy. Django opens a direct connection to `FMS_EMAIL_HOST:587`, and the proxy does not carry SMTP.
  If the host has no direct route to the SMTP server, leave `FMS_EMAIL_HOST` unset. Emails then go to the console.

## Useful podman and podman-compose commands

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

For the restore, see [Database backups](DEPLOYMENT.md#database-backups) in DEPLOYMENT.md.

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
| `logrotate`        | Not necessary: the cluster rotates the container logs. Do not deploy it |
| `web` port mapping and the host nginx | Ingress (TLS)                                                |

Notes:
- The `report` CronJob replaces the sleep loop in `fms-report`, so run `python manage.py prepare_report_data`
  directly, not `fms-report`. Set `concurrencyPolicy: Forbid`. A failed run then shows as a failed Job.
- Set `securityContext.fsGroup: 1000` so the `fms` user can write to PVCs.
- Make sure the Ingress sets `X-Forwarded-Proto`. The `web` nginx turns it into `HTTPS=on` for uwsgi.
  Expose only the `web` Service.
- `podman kube generate <container...>` produces a first draft of the YAML. `podman kube play`
  runs Kubernetes YAML directly on Rocky 9, which can be used to test the manifests before a cluster exists.
