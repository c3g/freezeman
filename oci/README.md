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
- [Shared setup](#shared-setup)
  - [Prerequisites](#prerequisites)
  - [The .env file](#the-env-file)
- [Useful podman and podman-compose commands](#useful-podman-and-podman-compose-commands)
- [Identify the format of a database backup](#identify-the-format-of-a-database-backup)
- [Additional notes](#additional-notes)
- [Docker compatibility](#docker-compatibility)

## Overview

- The stack runs Python 3.14, Node 24, uwsgi 2.0 behind nginx, and PostgreSQL 15.
- The PostgreSQL version is the `POSTGRES_IMAGE` build argument in `db/Containerfile`.
- The uwsgi version is `UWSGI_VERSION` in `Containerfile`.
- uwsgi settings are in `backend/uwsgi.ini`.
- The services are in [Production services](../DEPLOYMENT.md#production-services) (deployment) and in [Development services](DEVELOPMENT.md#development-services) (development).

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
| `Containerfile` | Images of the backend (`dev`, `backend-prod`), `jobs` and `web`. The build context is the repository root |
| `compose.yaml` | The production-like stack (all services) |
| `compose.dev.yaml` | Development override: adds the `dev` container, publishes the `db` port, puts the production services in the profile `prod` |
| `db/` | `Containerfile` of the `db` image, `initdb/10-fzy.sql` (enables `fzy` at the first start) |
| `nginx/` | `default.conf.template`: the configuration of the `web` nginx |
| `jobs.py` | Runs one daily job (`report`) in a `jobs` container. Host cron calls it |
| `backend/` | `entrypoint.py` (container entrypoint), `report.py` (the `fms-report` job) and `uwsgi.ini` |
| `freezeman.py` | Starts the stack at boot (cron `@reboot`) and checks the containers |
| `update-production-deployment.sh` | Updates a production stack to the checked-out release. Run it manually |
| `autoupdate.py` | Updates a test stack (QC, dev) from a GitHub branch |
| `hostenv.py` | Environment of the host scripts (`freezeman.py`, `jobs.py`, `autoupdate.py`): checks `XDG_RUNTIME_DIR`, sets `PATH` |
| `.env.prod.example`, `.env.dev.example` | Templates of `.env` for a server and for development. Copy one to `.env`. Commit only the templates |
| `backups/` | Usual directory of the manual database dumps. Its contents are git-ignored |
| `DEVELOPMENT.md` | Development setup guide |
| `DEBUGGING.md` | Debugging guide |

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
| `userns_mode: keep-id` | `dev` (`compose.dev.yaml`), `backend` and `jobs` (`compose.yaml`) | Files that the container writes belong to the host user. Docker accepts only `userns_mode: host` |
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
