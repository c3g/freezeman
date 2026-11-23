# FreezeMan containers

Container images and podman-compose configuration for FreezeMan.

> [!NOTE]
> You can run `podman-compose` from any directory. Give it the compose file once:
> `export COMPOSE_FILE=<install-dir>/oci/compose.yaml`. podman-compose reads `.env` from the directory of the
> compose file.

Contents:

- [Overview](#overview)
- [Documents](#documents)
- [Layout](#layout)
- [Production services](#production-services)
- [FMS_ENV values](#fms_env-values)
- [Design choices](#design-choices)
- [Useful podman and podman-compose commands](#useful-podman-and-podman-compose-commands)
- [Identify the format of a database backup](#identify-the-format-of-a-database-backup)
- [Additional notes](#additional-notes)
- [Docker compatibility](#docker-compatibility)

## Overview

- The stack runs Python 3.14, Node 24, uwsgi 2.0 behind nginx, and PostgreSQL 15.
- The PostgreSQL version is the `POSTGRES_IMAGE` build argument in `db/Containerfile`.
- The uwsgi version is `UWSGI_VERSION` in `Containerfile`.
- uwsgi settings are in `backend/uwsgi.ini`.
- The services are in [Production services](#production-services) (deployment) and in [Development services](DEVELOPMENT.md#services) (development).

## Documents

| Reader | Read |
|---|---|
| Host administrator | The host requirements in [Host requirements](../DEPLOYMENT.md#host-requirements) and [Network access](../DEPLOYMENT.md#network-access) of the deployment guide |
| Deployment team | [DEPLOYMENT.md](../DEPLOYMENT.md) in the repository root: the initial, routine and specific deployments |
| Developers | [DEVELOPMENT.md](DEVELOPMENT.md): the development stack, the servers, the tests and a database restore |
| Anyone who debugs the stack | [DEBUGGING.md](DEBUGGING.md): debugging by layer (podman-compose, podman, the host system and IT) |

## Layout

| Item | What it is |
|---|---|
| `Containerfile` | Images of the backend (`dev`, `backend-prod`) and `web`. The build context is the repository root |
| `compose.yaml` | The production-like stack (all services) |
| `compose.dev.yaml` | Development override: adds the `dev` container, publishes the `db` port, puts the production services in the profile `prod` |
| `db/` | `Containerfile` of the `db` image, `initdb/10-fzy.sql` (enables `fzy` at the first start) |
| `nginx/` | `default.conf.template`: the configuration of the `web` nginx |
| `backend/` | `entrypoint.py` (container entrypoint) and `uwsgi.ini` |
| `freezeman.py` | Starts the stack at boot (cron `@reboot`) and checks the containers |
| `update-production-deployment.sh` | Updates a production stack to the checked-out release. Run it manually |
| `autoupdate.py` | Updates a test stack (QC, dev) from a GitHub branch |
| `hostenv.py` | Environment of the host scripts (`freezeman.py`, `autoupdate.py`): checks `XDG_RUNTIME_DIR`, sets `PATH` |
| `.env.prod.example`, `.env.dev.example` | Templates of `.env` for a server and for development. Copy one to `.env`. Commit only the templates |
| `backups/` | Usual directory of the manual database dumps. Its contents are git-ignored |
| `DEVELOPMENT.md` | Development setup guide |
| `DEBUGGING.md` | Debugging guide |

## Production services

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL with the `fzy` extension (`backend/dependencies/pg_fzy`) |
| `backend`  | `localhost/freezeman-backend` | Django on uwsgi: uwsgi protocol on an internal port             |
| `web`      | `localhost/freezeman-web`     | nginx in a container: the built frontend, Django static files, `/media/`. Passes `/api/` to uwsgi. The reverse proxy on the host passes HTTP to it |

A reverse proxy on the host terminates TLS and passes the requests to `web` (see [Reverse proxy](../DEPLOYMENT.md#reverse-proxy)).

## FMS_ENV values

- Use `PROD` on the production host, and `QC` or `DEV` on a test host.
- The code does not validate the value. It only tests if the value is `PROD`.
- `PROD` gives the production behaviour (column `PROD` below).
- Any other value gives the test behaviour (right column). `QC` and `DEV` behave the same. They only label the host: the web page shows the value. A value such as `potato` also gets the test behaviour, and the web page shows `potato`.
- `LOCAL` is the value of the development stack.

| Area | `PROD` | Any other value (`QC`, `DEV`, `LOCAL`) |
|---|---|---|
| Django log (`<HOST_LOG_DIR>/fms.log`, rotated at 2 GB, 1 old file kept) | `WARNING` and higher. These lines also go to the console, so to `<HOST_LOG_DIR>/backend.log` | `DEBUG` and higher |
| Allowed hosts (`FMS_DEBUG=False`) | `FMS_HOST` only | `FMS_HOST` and `localhost` |
| Web page | Normal header | Header with a different background and the value in red. The About page also shows the value |
| `autoupdate.py` | Stops with an error. It does not touch the database | Runs. It deletes the database at each new commit |

The `web` image gets `FMS_ENV` when it is built. `backend` reads it when it starts. After a change of `FMS_ENV` in `.env`, run `podman-compose build web`, then `podman-compose up -d --force-recreate`.

## Design choices

- `userns_mode: keep-id:uid=1000,gid=1000` on `backend`. The image user `fms` (uid 1000) writes the media files, and
  the host user that runs the stack owns them on the host.
- uwsgi listens on a port in the container network (uwsgi protocol), for the `web` service.
- Client address: the reverse proxy sends `X-Real-IP` and `X-Forwarded-For`, but the `web` nginx does not use them.
  uwsgi gets the address of the podman port forwarder as `REMOTE_ADDR`, and the `web` access log shows that address.
  Nothing in FreezeMan uses the client address today. If it becomes necessary, add `set_real_ip_from` and
  `real_ip_header X-Real-IP` to `oci/nginx/default.conf.template`.

## Useful podman and podman-compose commands

```bash
podman-compose ps                                  # containers of the stack and their state
podman-compose logs -f backend                     # follow the backend logs
podman-compose logs -f -n                          # follow the logs of all services, each line with its container name
podman-compose exec backend python manage.py shell  # Django shell in the backend
podman-compose exec db psql -U admin -d fms        # psql session on the fms database

# Follow the logs of all services, each container in its own color. podman-compose has no --color option.
# `freezeman` is the project name (`name:` in compose.yaml).
podman logs -f --names --color $(podman ps -q --filter label=io.podman.compose.project=freezeman)

podman ps -a                                       # all containers, also stopped ones
podman images                                      # built images
podman volume ls                                   # named volumes
podman inspect --format '{{.HostConfig.LogConfig}}' freezeman_backend_1   # log driver and log file
podman info --format '{{.Host.CgroupManager}}'     # cgroupfs on the deployment host
```

## Identify the format of a database backup

The restore command depends on the format of the dump. Find the format before you restore:

```bash
file <backup>                     # "PostgreSQL custom database dump": a pg_dump -Fc file
gunzip -c <backup>.gz | head -5   # a .gz file: the first lines of the SQL script
head -5 <backup>                  # a plain .pgsql file
```

| What you see | Format | Restore with | Parallel restore (`pg_restore -j`) |
|---|---|---|---|
| `PostgreSQL database cluster dump` | `pg_dumpall` SQL script (the `.pgsql.gz` files of [Database backups](../DEPLOYMENT.md#database-backups)) | `psql -d postgres` | No |
| `PostgreSQL database dump` | `pg_dump` SQL script (one database) | `psql -d fms` | No |
| `PostgreSQL custom database dump` (`file`), or `PGDMP` as the first bytes | `pg_dump -Fc` | `pg_restore` ([migration](../DEPLOYMENT.md#migrate-from-a-version-earlier-than-600)) | Yes, from a file, not from stdin |
| A directory with `toc.dat` | `pg_dump -Fd` | `pg_restore` | Yes |

- `psql` runs a SQL script one statement at a time. Only `pg_restore` can restore in parallel.
- `pg_restore -j` needs the dump as a file in the container (a bind mount or `podman cp`). It cannot read from `<` or a pipe.

## Docker compatibility

The stack targets rootless podman and podman-compose. Docker Engine with Docker Compose does not run it.
The Docker daemon rejects these podman-only settings:

| Setting | Where | Why podman needs it |
|---|---|---|
| `userns_mode: keep-id` | `dev` (`compose.dev.yaml`) and `backend` (`compose.yaml`) | Files that the container writes belong to the host user. Docker accepts only `userns_mode: host` |
| `logging.driver: k8s-file` | All services | Writes each container log to `HOST_LOG_DIR/<service>.log`. Docker has no `k8s-file` driver |

`x-podman` is ignored by other tools. `bind.selinux: z`, `profiles` and the `${VAR:?...}` checks also work in Docker Compose.

The Docker Compose v2 program can also talk to the podman socket instead of a Docker daemon. This is not tested.

Docker support would need a separate override file and another way to set file owners. It is not planned.

## Additional notes

Portability:

- `bind.selinux: z` on all bind mounts, with no exception: required on any SELinux host (Fedora, RHEL, CentOS Stream), harmless elsewhere.
- Fully qualified image names (`docker.io/library/...`): RHEL-family systems enforce
  short-name resolution, and fully qualified names avoid prompts on any registry setup.
- `x-podman: in_pod: false`: `userns_mode: keep-id` (development) cannot be used for containers inside a pod.
