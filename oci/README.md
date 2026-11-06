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
- [Docker compatibility](#docker-compatibility)
- [Run the stack inside a container](#run-the-stack-inside-a-container)
  - [Known issues](#known-issues)
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
| `backend`  | `localhost/freezeman-backend` | Django on uwsgi: port 8000 uwsgi protocol (internal)                 |
| `scheduler`| `localhost/freezeman-scheduler` | a daily loop (`scheduler.py`) runs three jobs at `FMS_JOBS_TIME`, one after the other in this order: `fms-report` (`prepare_report_data`), `fms-backup` (`pg_dumpall` to `FMS_BACKUP_DIR` as `<YYYY-MM-DD>.pgsql.gz`) and `fms-logrotate` (`logrotate` of `FMS_LOG_DIR/*.log`, each file rotates every `FMS_LOGROTATE_FREQUENCY`, default weekly). A job runs only if `FMS_<JOB>_ENABLED=True` (default `False`). A failed job does not stop the next jobs. It gets only the settings that the jobs need, not the whole `.env` |
| `web`      | `localhost/freezeman-web`     | nginx in a container: the built frontend, Django static files, `/media/`. Passes `/api/` to uwsgi. The reverse proxy on the host passes HTTP to it |

A reverse proxy on the host terminates TLS and passes the requests to `web` (see [Reverse proxy](DEPLOYMENT.md#reverse-proxy) in DEPLOYMENT.md).

### Development services

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL 15 with the `fzy` extension. Port 5432 is published  |
| `dev`      | `localhost/freezeman-dev`     | Idle container with the venv (`/opt/venv`), Python 3.14 and Node 24. You start the Django server (`runserver`) and the frontend dev server (webpack) by hand inside it. It takes the place of the production `backend` service |

For the bind mount, the `node_modules` volume and the `prod` profiles, see [Development notes](DEVELOPMENT.md#development-notes) in DEVELOPMENT.md.

## Documents

| Reader | Read |
|---|---|
| Agents | This file first. Then the guide that fits the task. |
| Host administrator | The host requirements in [Prerequisites](DEPLOYMENT.md#prerequisites) and [Network access](DEPLOYMENT.md#network-access) of DEPLOYMENT.md |
| Deployment team | [DEPLOYMENT.md](DEPLOYMENT.md): production deployment and daily use |
| Developers | [DEVELOPMENT.md](DEVELOPMENT.md): the development stack, the servers, the tests and a database restore |

Both guides use the [Shared setup](#shared-setup) below. Read it once.

## Layout

| Item | What it is |
|---|---|
| `Containerfile` | Images of the backend (`dev`, `backend-prod`), `scheduler` and `web`. The build context is the repository root |
| `compose.yaml` | The production-like stack (all services) |
| `compose.dev.yaml` | Development override: adds the `dev` container, publishes the `db` port, puts the production services in the profile `prod` |
| `compose.restore.yaml` | Override of the `db` command for a restore on a slow disk |
| `db/` | `Containerfile` of the `db` image, `backup.py` (the `fms-backup` job), `initdb/10-fzy.sql` (enables `fzy` at the first start) |
| `nginx/` | `default.conf.template`: the configuration of the `web` nginx |
| `logrotate/` | `logrotate.py` (the `fms-logrotate` job) and `logrotate.conf.template` |
| `scheduler/` | `scheduler.py`: a daily loop that runs the jobs at the `FMS_*_TIME` times, in `TZ` (the `scheduler` service) |
| `backend/` | `entrypoint.py` (container entrypoint), `report.py` (the `fms-report` job) and `uwsgi.ini` |
| `start.py` | Starts the stack at boot (cron `@reboot`) and checks the containers |
| `autoupdate.py` | Updates a test stack (QC, dev) from a GitHub branch |
| `hostenv.py` | Sets `XDG_RUNTIME_DIR` for the host scripts (`start.py`, `autoupdate.py`) |
| `.env.example` | Template of `.env`. Copy it to `.env`. Commit only the template |
| `logs/` | Usual `FMS_LOG_DIR` (a git-ignored directory). Create it before the first start |
| `backups/` | Git-ignored directory for database backups (`FMS_BACKUP_DIR` points to a directory like it) |
| `DEPLOYMENT.md` | Production deployment guide |
| `DEVELOPMENT.md` | Development setup guide |

## Shared setup

Do this setup once for each checkout. It applies to production and to development.

### Prerequisites

Do these steps for both environments:

- Check out the pg_fzy submodules: `git submodule update --init --recursive`.
  If it fails on the `git://` URL, set the HTTPS rule in [Submodule URL](../README.md#submodule-url) first.
- Use a checkout with a real `.git` directory (not a `git worktree`, whose `.git` is a file pointing elsewhere).
  The frontend build and `build_info.json` read commit information from it.
- Run `cd oci && cp .env.example .env`, then set at least `POSTGRES_PASSWORD`, `FMS_SECRET_KEY`, `FMS_HOST` and `FMS_LOG_DIR`.
  - `FMS_LOG_DIR`: the absolute path of the log directory. It has no default: compose stops if it is not set.

Then continue with the environment steps:

- Production: [Prerequisites](DEPLOYMENT.md#prerequisites) in DEPLOYMENT.md.
- Development: [Prerequisites](DEVELOPMENT.md#prerequisites) in DEVELOPMENT.md.

### Proxy

Do this section only if your host reaches the internet through an HTTP proxy (for example a development server).
Without a proxy, skip it and leave the variables unset. The stack then works as before.

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
  first, then `oci/.env`. Use the proxy block of `.env` when compose starts without the shell proxy.
  Then run `podman pull` for the base images (the `FROM` lines of the Containerfiles) once, from a shell that has the proxy.
- `NO_PROXY` always gets the service names `db`, `backend` and `web`, so traffic between the containers never uses the proxy.
  You do not add them.
- Runtime proxy:
  - The proxy values are build arguments of podman and stay out of the images.
  - At runtime, only `dev` gets the proxy (from `compose.dev.yaml`).
  - The other services (`db`, `backend`, `scheduler`, `web`) get empty proxy variables from `compose.yaml`.
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
podman-compose ps                                  # containers of the stack and their state
podman-compose logs -f backend                     # follow the backend logs
podman-compose logs -f -n                          # follow the logs of all services, each line with its container name
podman-compose exec backend python manage.py shell  # Django shell in the backend
podman-compose exec -T backend python manage.py prepare_report_data  # run the fms-report job now
podman-compose exec db psql -U admin -d fms        # psql session on the fms database
# -T: no pseudo-TTY, which would turn the dump's line endings into CRLF
podman-compose exec -T db pg_dumpall -U admin > backup_$(date +%F).pgsql  # manual dump of all databases
# pg_dumpall copies the roles too. Restore it as in "Database backups"

# Follow the logs of all services, each container in its own color. podman-compose has no --color option.
# `freezeman` is the project name (`name:` in compose.yaml).
podman logs -f --names --color $(podman ps -q --filter label=io.podman.compose.project=freezeman)

podman ps -a                                       # all containers, also stopped ones
podman images                                      # built images
podman volume ls                                   # named volumes
podman inspect --format '{{.HostConfig.LogConfig}}' freezeman_backend_1   # log driver and log file
podman info --format '{{.Host.CgroupManager}}'     # cgroupfs on the deployment host
```

For the restore, see [Database backups](DEPLOYMENT.md#database-backups) in DEPLOYMENT.md.

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

   With a proxy, use the proxy variables of [Proxy](#proxy).
2. Recreate the containers: `podman-compose up -d`.
3. Check the versions, and write them in the deployment notes:

   ```bash
   podman-compose exec backend python --version
   podman-compose exec web nginx -v
   podman-compose exec db postgres --version
   ```

A new patch release can break the stack. Test on QC before prod.

Stay on the same major version (Python 3.14, Node 24, PostgreSQL 15). A major change follows `DEPLOYMENT.md`.
For PostgreSQL it also needs a dump and restore of the data.

Ideas for later (not done):

- A scheduled GitHub workflow or Renovate that opens a PR when a base image changes.
- Pinning to patch tags or digests (`tag@sha256:...`) if all hosts must run the same bytes.

## Additional notes

Reverse proxy and host design choices:

- `userns_mode: keep-id:uid=1000,gid=1000` on `backend`. The image user `fms` (uid 1000) writes the media files, and
  the host user that runs the stack owns them on the host.
- uwsgi listens on port 8000 (uwsgi protocol) in the container network, for the `web` service and Kubernetes.
- Client address: the reverse proxy sends `X-Real-IP` and `X-Forwarded-For`, but the `web` nginx does not use them.
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

## Docker compatibility

The stack targets rootless podman and podman-compose. Docker Engine with Docker Compose does not run it.
The Docker daemon rejects these podman-only settings:

| Setting | Where | Why podman needs it |
|---|---|---|
| `userns_mode: keep-id` | `dev` (`compose.dev.yaml`), `backend` and `scheduler` (`compose.yaml`) | Files that the container writes belong to the host user. Docker accepts only `userns_mode: host` |
| `:U` mount option | `frontend_node_modules` volume of `dev` | Gives the volume to the container user. Docker has no `U` option |
| `logging.driver: k8s-file` | All services | Writes each container log to `FMS_LOG_DIR/<service>.log`. Docker has no `k8s-file` driver |

`x-podman` is ignored by other tools. `:z`, `profiles` and the `${VAR:?...}` checks also work in Docker Compose.

The Docker Compose v2 program can also talk to the podman socket instead of a Docker daemon. This is not tested.

Docker support would need a separate override file and another way to set file owners. It is not planned.

## Run the stack inside a container

Do this section only if you run podman inside a container (e.g. nested rootless podman).
On a normal host, skip it.

The outer container must give the inner podman:

- `/dev/fuse` and `fuse-overlayfs` as the overlay `mount_program`. Native overlay does not work on top of the outer overlay.
- An outer range of at least 65536 IDs, inside the ID range that the outer container maps. The host range must then
  be larger than 65536. See the terms in [Known issues](#known-issues).
- `XDG_RUNTIME_DIR` on a tmpfs (for example `/run/user/1000`, owned by the outer user, mode 0700).
- `cgroups = "disabled"` in `containers.conf` if the outer container has no cgroup delegation. Then do not pass
  `--memory` or `--cpus`.

Example: run the outer container with rootless podman on the host. `localhost/<outer-image>` is your image with podman,
podman-compose, `fuse-overlayfs` and the outer range. `<user>` and `<uid>` are the outer user, the same UID as
the host user. Run it from the repository root.

```
podman run -d --name freezeman-outer --init \
    --userns=keep-id \
    --cap-add=SYS_ADMIN \
    --device /dev/fuse \
    --device /dev/net/tun \
    --security-opt label=disable \
    --security-opt 'unmask=/proc/*' \
    --tmpfs /run/user/<uid>:rw,mode=0700,U \
    -e XDG_RUNTIME_DIR=/run/user/<uid> \
    -v freezeman-outer-containers:/home/<user>/.local/share/containers \
    -v "$PWD":/workspace/freezeman:z \
    -p 127.0.0.1:5432:5432 -p 127.0.0.1:8000:8000 -p 127.0.0.1:9000:9000 -p 127.0.0.1:8080:8080 \
    localhost/<outer-image> sleep infinity
```

- `--userns=keep-id`: the outer user has the UID of the host user, so files in the bind mount keep their owner.
- `--cap-add=SYS_ADMIN`, `--device /dev/fuse`, `label=disable`, `unmask=/proc/*`: the inner podman needs them for
  user namespaces and mounts. `SYS_ADMIN` applies only in the user namespace of the outer container, not on the host.
- `--device /dev/net/tun`: inner networking (pasta or slirp4netns).
- `--tmpfs /run/user/<uid>`: the runtime directory. It is empty on each start (see the boot ID issue below).
- The `freezeman-outer-containers` volume keeps the inner images, containers and volumes when you create the
  outer container again.
- `-p`: the ports of the development stack (5432, 8000, 9000) and of `web` (8080), on loopback only.

Open a shell with `podman exec -it freezeman-outer bash -l`. Then `cd /workspace/freezeman/oci` and use `podman-compose`.

### Known issues

Terms:

- Host: the machine where you run podman directly.
- Host user: the user on the host that runs the outer container with rootless podman.
- Outer container: the container on the host that has podman inside.
- Outer user: the user in the outer container that runs the inner podman. With `--userns=keep-id` it has the UID of
  the host user.
- Inner container: a container that the inner podman runs, for example the `db` service.
- Inner user: a user in an inner container, for example `root` or `postgres` in `db`. Inner `root` is the outer user.
  The other inner users get IDs from the outer range.
- Host range: the subid range of the host user, in the host `/etc/subuid` and `/etc/subgid`
  (for example `<user>:100000:65536`). Its numbers are host IDs. The outer container gets IDs 0 to the size of the
  host range.
- Outer range: the subid range of the outer user, in `/etc/subuid` and `/etc/subgid` of the outer container
  (for example `<user>:10000:65536`). Its numbers are IDs of the outer container, not host IDs.

Issues:

- `apt-get` fails in a build with `setgroups ... Invalid argument`.
  - Cause: apt in an inner container drops to GID 65534 (`nogroup`). The outer range has fewer than 65536 IDs, so that
    GID is not mapped. Background: [Podman troubleshooting #10](https://github.com/containers/podman/blob/main/troubleshooting.md#10-rootless-setup-user-invalid-argument)
    and [How to use Podman inside of a container](https://www.redhat.com/en/blog/podman-inside-container) (Red Hat).
  - Check: in the outer container, run `podman unshare cat /proc/self/gid_map`. The sizes after the first line must add
    up to at least 65534.
  - Fix:
    1. In the outer container image, give the outer user 65536 IDs in `/etc/subuid` and `/etc/subgid`
       (for example `<user>:10000:65536`). These files only permit `newuidmap` to use the IDs. They do not add IDs:
       the IDs must also exist in the outer container, or the kernel rejects the map.
    2. The outer container has only IDs 0 to the size of the host range. If the outer range ends above that,
       give the host user a larger host range in the host `/etc/subuid` and `/etc/subgid`. Example: the default
       host range `<user>:100000:65536` gives the outer container IDs up to 65536. The outer range
       `<user>:10000:65536` also has 65536 IDs, but it starts at 10000, so it needs IDs up to 75535.
       Use `<user>:100000:262144`. Then run `podman system migrate` on the host.
    3. Remove and create the outer container again. A stop and start keeps the old ID mapping.
       Keep the inner podman storage on a volume and keep the start of the outer range, so inner images and
       volumes keep their owners.
- `newuidmap` fails with `Operation not permitted`.
  - Cause: the outer range is not inside the ID range that the outer container maps.
  - Fix: move or shrink the outer range so that it fits, or enlarge the host range (the `apt-get` fix above, steps 1 to 3).
  - Special case: the host user has two lines in the host `/etc/subuid` (for example `<user>:100000:65536` and
    `<user>:231072:196608`). The outer container then maps IDs 1-65536 and 65537 and up as two separate blocks, and one
    outer range line cannot cross from one block to the next. Split the outer range at that point, for example
    `<user>:10000:55537` and `<user>:65537:9999` (10000-75535 in total).
- `podman` fails with `current system boot ID differs from cached boot ID`.
  - Cause: the podman runtime directory survived a host reboot. Without `XDG_RUNTIME_DIR`, rootless podman keeps it in
    `/tmp/storage-run-<uid>`, and `/tmp` of the outer container survives a stop and start.
  - Quick fix: delete the two directories that the error message names, then run podman again. They hold only runtime
    state. Images, containers and volumes stay.
  - Fix: in the outer container image, set `ENV XDG_RUNTIME_DIR=/run/user/<uid>` (`<uid>` of the outer user).
    Create the outer container with a tmpfs there, owned by the outer user:
    `podman run --tmpfs /run/user/<uid>:rw,mode=0700,U ...`. The tmpfs is empty on each start.
- After the outer container starts again, the inner containers are stopped. Start the stack again
  (`podman-compose up -d`).

## Path to Kubernetes

The layout already maps onto Kubernetes objects:

| Compose            | Kubernetes                                                        |
|--------------------|-------------------------------------------------------------------|
| `db`               | StatefulSet + PVC (or a managed PostgreSQL with the fzy extension) |
| migrations (manual)| A Job that the operator starts, with the backend Deployment scaled to 0 |
| `backend`, `web`   | Deployments + Services (`BACKEND_UPSTREAM` = backend Service name) |
| `media`, `triggers`, `automations_work` | PVCs (`media` must be ReadWriteMany if `web` and `backend` run on different nodes). On the host, `media`, `triggers` and `automations_work` are bind-mounted directories |
| `.env`             | ConfigMap (settings) + Secret (`POSTGRES_PASSWORD`, `FMS_SECRET_KEY`, email password) |
| `scheduler`: `fms-report`, `fms-backup` | One CronJob (`schedule` from `FMS_JOBS_TIME`, `timeZone` from `TZ`) that runs `fms-report now`, then `fms-backup now`. Two CronJobs at the same time run in parallel, so the order is lost. Needs an image with `postgresql-client-15`, a backup PVC and a log PVC at `/home/fms/reports/log` (on the host, a bind mount of `FMS_LOG_DIR`) |
| `scheduler`: `fms-logrotate` | Not necessary: the cluster rotates the container logs. Do not deploy it |
| `web` port mapping and the reverse proxy | Ingress (TLS)                                             |

Notes:
- The `scheduler` service has one job of three because the loop of `scheduler.py` runs them inside one container. Kubernetes
  has CronJobs, so each job becomes its own CronJob. Each job is a one-shot command (`fms-report now`,
  `fms-backup now`), so a CronJob calls it directly and no loop is necessary. Set
  `concurrencyPolicy: Forbid`. A failed run then shows as a failed Job.
- Set `securityContext.fsGroup: 1000` so the `fms` user can write to PVCs.
- Make sure the Ingress sets `X-Forwarded-Proto`. The `web` nginx turns it into `HTTPS=on` for uwsgi.
  Expose only the `web` Service.
- `podman kube generate <container...>` produces a first draft of the YAML. `podman kube play`
  runs Kubernetes YAML directly on the podman host, which can be used to test the manifests before a cluster exists.
