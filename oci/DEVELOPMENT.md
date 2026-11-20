# Development setup

This guide tells you how to run the FreezeMan container stack for development.
For the overview, the layout and the shared setup, read [README.md](README.md). For the clone and the submodules, see [Installation](../README.md#installation) in the root README.md.

> [!NOTE]
> You can run `podman-compose` from any directory. Give it the compose files once:
> `export COMPOSE_FILE=<install-dir>/oci/compose.yaml:<install-dir>/oci/compose.dev.yaml`.
> The commands below do not repeat the `-f` flags.

Contents:

- [Prerequisites](#prerequisites)
- [Development notes](#development-notes)
- [Start the development stack](#start-the-development-stack)
  - [Restore a production database](#restore-a-production-database)
  - [Run the servers and the tests](#run-the-servers-and-the-tests)
- [Database access](#database-access)
- [Test the production stack locally](#test-the-production-stack-locally)
- [Run the stack inside a container](#run-the-stack-inside-a-container)
  - [Known issues](#known-issues)

## Prerequisites

1. Do the steps of [Prerequisites](README.md#prerequisites) in README.md. They apply to both environments.
2. If your host reaches the internet through an HTTP proxy, give the proxy to the commands that pull or build images. Use the uppercase names, in front of the command: `HTTP_PROXY=http://<proxy-host>:<port> HTTPS_PROXY=http://<proxy-host>:<port> podman-compose build`. Do the same for `podman pull`. The builds and the `dev` container can also read the proxy block of `.env`. The image pulls cannot, because podman does the pull.
3. Install the tools. Development works on any OS with podman and podman-compose. The `selinux: z` labels of the bind mounts are ignored where SELinux is absent.

   - Windows: [install Podman](https://podman.io/docs/installation#windows) and use `podman machine`.
   - macOS: [install Podman](https://podman.io/docs/installation#macos) and use `podman machine`.
   - Ubuntu 26.04 Desktop: [install Podman](https://podman.io/docs/installation#ubuntu).
   - All systems: [install podman-compose](https://github.com/containers/podman-compose#installation).

## Development notes

### Development services

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL 15 with the `fzy` extension. Port 5432 is published  |
| `dev`      | `localhost/freezeman-dev`     | Idle container with the venv (`/opt/venv`), Python 3.14 and Node 24. You start the Django server (`runserver`) and the frontend dev server (webpack) by hand inside it. It takes the place of the production `backend` service |

`compose.dev.yaml` puts the production services `backend` and `web` in the profile `prod`, so `up -d` does not start them.

- The repository is bind-mounted at `$CONTAINER_FMS_ROOT` (`CONTAINER_FMS_ROOT` of `.env`, also an environment variable in `dev`).

## Start the development stack

If you do not have `.env` yet, run `cp .env.dev.example .env`. Set `HOST_LOG_DIR` in `.env` to the
absolute path of `logs` in your checkout, for example `HOST_LOG_DIR=/home/me/freezeman/logs`.
Compose stops without it. If the path is relative or the directory does not exist, the containers
fail with `[conmon:e]: Failed to open log file No such file or directory`. Start the stack and enter the `dev` container:

```bash
podman-compose up -d
podman-compose exec dev bash
```

In development, `postgres` is the superuser of the database. It works only through the Unix socket in the
`db` container (`podman-compose exec db ...`). Django and `dev` connect
as the app role `admin` (`POSTGRES_USER` of `.env`). On the first start of a new database volume, create
`admin`. Replace `<POSTGRES_PASSWORD>` with the value of `.env`:

```bash
podman-compose exec db psql -U postgres -d postgres \
  -c "CREATE ROLE admin LOGIN CREATEDB PASSWORD '<POSTGRES_PASSWORD>'" \
  -c "ALTER DATABASE fms OWNER TO admin"
```

- `CREATEDB`: pytest creates its own test database.
- If you restore a dump of all databases (`pg_dumpall`), skip this step. The dump creates `admin`
  (see [Restore a production database](#restore-a-production-database)).

The `dev` shell starts in `$CONTAINER_FMS_ROOT`. The venv is ready: the `dev` image has the packages of
`backend/requirements.txt` in `/opt/venv`, and `/opt/venv/bin` is first in `PATH`. So `python`, `pip` and
`pytest` are the ones of the venv, with no activation and no first `pip install`.

`pip install` works in the `dev` shell, for example to try a package. The venv is in the image, not in
the bind-mounted checkout, so the package stays only until `dev` is recreated. To keep a package, add it to
`backend/requirements.txt`, then build the image again and recreate `dev` (on the host):

```bash
podman-compose build dev
podman-compose up -d dev
```

### Restore a production database

Optional. Do this before `migrate` and `runserver` to get production data into the development database.
The steps run the migrations themselves.

- The files have production data. Keep them on your machine, in `oci/backups/` (git-ignored).
  Do not commit or share them. Delete them when you are done.
- The restore deletes the current development database. The production-like local stack
  ([Test the production stack locally](#test-the-production-stack-locally)) uses the same volume `freezeman_pgdata`.

Get one of these files from the production host and copy it to `oci/backups/`:

- A dump of all databases: `oci/backups/<YYYY-MM-DD>.pgsql.gz` (made with `pg_dumpall` on the production host).
- A custom dump of the `fms` database only. Make it on the production host. The site stays online:

  ```bash
  # -T: no pseudo-TTY, keeps the binary dump intact.
  podman-compose -f <install-dir>/oci/compose.yaml exec -T db pg_dump -U admin -Fc fms > fms.dump
  ```

Restore the file. Use the restore command that matches the format of the file. To find the format, see
[Identify the format of a database backup](README.md#identify-the-format-of-a-database-backup).

```bash
podman-compose down
podman volume rm freezeman_pgdata     # deletes the development database
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U postgres -d fms; do sleep 2; done

# Dump of all databases (pg_dumpall). -d postgres: psql must start in another database than fms, because the script runs \connect fms.
gunzip -c backups/<YYYY-MM-DD>.pgsql.gz | podman-compose exec -T db psql -U postgres -d postgres
# Or the custom dump (pg_dump -Fc). First create admin as in "Start the development stack".
# --no-owner: give all objects to admin, the role that connects. --no-acl: skip GRANT and REVOKE of roles that do not exist here.
podman-compose exec -T db pg_restore -U admin -d fms --no-owner --no-acl < backups/fms.dump

# Start dev, then apply the migrations of your branch that the dump does not have.
podman-compose up -d
podman-compose exec dev sh -c 'cd backend && python manage.py migrate && python manage.py createinitialrevisions'
```

- The messages "role postgres already exists", "database fms already exists" and "extension fzy already exists" are harmless.
- A dump of all databases also restores the roles. `admin` gets the production password and the production
  privileges (no `CREATEDB`). Then `dev` reports "password authentication failed", and `pytest` cannot create
  its test database. After the restore, set them back. Replace `<POSTGRES_PASSWORD>` with the value of `.env`:

  ```bash
  podman-compose exec db psql -U postgres -d postgres \
    -c "ALTER ROLE admin LOGIN CREATEDB PASSWORD '<POSTGRES_PASSWORD>'" \
    -c "ALTER DATABASE fms OWNER TO admin"
  ```

- If you need the uploaded files, copy `backend/media` of the production host
  into `backend/media` of your checkout.

### Run the servers and the tests

In the `dev` shell (`podman-compose exec dev bash`), the commands start in `$CONTAINER_FMS_ROOT`, where the shell starts:

```bash
# First start and after each new migration:
(cd backend && python manage.py migrate && python manage.py createinitialrevisions)

# First start and after each change to the static files (backend/static, the templates in
# backend/fms_core/static/submission_templates):
(cd backend && python manage.py collectstatic --noinput)

# Backend: http://localhost:8000, reloads on code changes
# 0.0.0.0: listen on all addresses, because the published port connects to the container IP.
(cd backend && python manage.py runserver 0.0.0.0:8000)

# Frontend with live reload: http://localhost:9000 (proxies /api to port 8000)
# --host 0.0.0.0: listen on all addresses, because the published port connects to the container IP.
(cd frontend && npm ci && npm start -- --host 0.0.0.0)
```

When both servers run, open FreezeMan in your browser at <http://localhost:9000>.
The backend at <http://localhost:8000> serves the Django admin (`/`), the API (`/api/`) and Swagger (`/api/swagger/`).

- The webpack proxy still reaches `localhost:8000`, because both servers run in the same container.
- Run the servers in two shells (or in the background).
- PostgreSQL: see [Database access](#database-access).

Run the backend tests in the `dev` shell:

```bash
(cd backend && pytest)
```

Or run them from the host, without a `dev` shell:

```bash
podman-compose exec dev sh -c 'cd backend && pytest'
```

The tests need no database setup. pytest-django creates a separate test database and deletes it after the run.
PostgreSQL makes each new database as a copy of `template1`. On the first start of `db`,
`db/initdb/10-fzy.sql` installs the `fzy` extension in `template1`, so the test database gets `fzy` too.

## Database access

Use `psql` to look at the development database. There are three ways:

- In the `dev` shell: run `psql`.
  `compose.dev.yaml` sets `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and `PGPASSWORD` in `dev` (from `.env`),
  so `psql` needs no arguments. The `dev` image has the PostgreSQL client.

  ```bash
  psql
  psql -c 'SELECT count(*) FROM django_migrations'
  ```

- From the host, through the `db` container (the user and database are `POSTGRES_USER` and `POSTGRES_DB` of `.env`):

  ```bash
  podman-compose exec db psql -U admin -d fms
  ```

- From the host with a host `psql` or a GUI client: connect to `localhost:5432` (`compose.dev.yaml` publishes
  the port). Use the user, the database and the password of `.env`.

## Test the production stack locally

Use the `.env` of [Start the development stack](#start-the-development-stack) (from `.env.dev.example`, with `FMS_HOST=localhost` and `HOST_LOG_DIR` set). Then build and start the stack. `web` is a default service:

```bash
podman-compose -f <install-dir>/oci/compose.yaml build  # Proxy host: set the proxy variables, see Prerequisites
podman-compose -f <install-dir>/oci/compose.yaml up -d
```

- Open `http://localhost:<HOST_HTTP_PORT>` (`HOST_HTTP_PORT` of `.env`).
- Restore a backup as in [Restore a production database](#restore-a-production-database).

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

Open a shell with `podman exec -it freezeman-outer bash -l`. Then use `podman-compose` with the compose files at `/workspace/freezeman/oci` (see the note at the top).
`/workspace/freezeman` here is the path of the checkout in the outer container. It is not `CONTAINER_FMS_ROOT`,
the path of the project in the containers of the stack.

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
