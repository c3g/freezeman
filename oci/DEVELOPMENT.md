# Development setup

This guide tells you how to run the FreezeMan container stack for development.
For the overview, the layout and the shared setup, read [README.md](README.md).

> [!IMPORTANT]
> Run all `podman-compose` commands from `oci/`.

Contents:

- [Prerequisites](#prerequisites)
- [Development notes](#development-notes)
- [Start the development stack](#start-the-development-stack)
  - [Restore a production database](#restore-a-production-database)
  - [Run the servers and the tests](#run-the-servers-and-the-tests)
- [Database access](#database-access)
- [Test the production stack locally](#test-the-production-stack-locally)

## Prerequisites

1. Do the steps of [Prerequisites](README.md#prerequisites) in README.md. They apply to both environments.
2. If your host reaches the internet through an HTTP proxy, do the steps of [Proxy](DEPLOYMENT.md#proxy) in DEPLOYMENT.md.
3. Install the tools. Development works on any OS with podman and podman-compose. The `selinux: z` labels of the bind mounts are ignored where SELinux is absent.

   - Windows: [install Podman](https://podman.io/docs/installation#windows) and use `podman machine`.
   - macOS: [install Podman](https://podman.io/docs/installation#macos) and use `podman machine`.
   - Ubuntu 26.04 Desktop: [install Podman](https://podman.io/docs/installation#ubuntu).
   - All systems: [install podman-compose](https://github.com/containers/podman-compose#installation).

## Development notes

For the services of the development stack, see [Development services](README.md#development-services) in README.md.

- The repository is bind-mounted at `$CONTAINER_FMS_ROOT` (`CONTAINER_FMS_ROOT` of `.env`, also an environment variable in `dev`).

## Start the development stack

If you do not have `.env` yet, run `cp .env.dev.example .env`. Set `HOST_LOG_DIR` in `.env` to the
absolute path of `oci/logs` in your checkout, for example `HOST_LOG_DIR=/home/me/freezeman/oci/logs`.
Compose stops without it. If the path is relative or the directory does not exist, the containers
fail with `[conmon:e]: Failed to open log file No such file or directory`. Start the stack and enter the `dev` container:

```bash
podman-compose -f compose.yaml -f compose.dev.yaml up -d
podman-compose -f compose.yaml -f compose.dev.yaml exec dev bash
```

In development, `postgres` is the superuser of the database. It works only through the Unix socket in the
`db` container (`podman-compose -f compose.yaml -f compose.dev.yaml exec db ...`). Django and `dev` connect
as the app role `admin` (`POSTGRES_USER` of `.env`). On the first start of a new database volume, create
`admin`. Replace `<POSTGRES_PASSWORD>` with the value of `.env`:

```bash
podman-compose -f compose.yaml -f compose.dev.yaml exec db psql -U postgres -d postgres \
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
`backend/requirements.txt`, then build the image again and recreate `dev` (on the host, in `oci/`):

```bash
podman-compose -f compose.yaml -f compose.dev.yaml build dev
podman-compose -f compose.yaml -f compose.dev.yaml up -d dev
```

### Restore a production database

Optional. Do this before `migrate` and `runserver` to get production data into the development database.
The steps run the migrations themselves.

- The files have production data. Keep them on your machine, in `oci/backups/` (git-ignored).
  Do not commit or share them. Delete them when you are done.
- The restore deletes the current development database. The production-like local stack
  ([Test the production stack locally](#test-the-production-stack-locally)) uses the same volume `freezeman_pgdata`.

Get one of these files from the production host and copy it to `oci/backups/`:

- A dump of all databases: `oci/backups/<YYYY-MM-DD>.pgsql.gz` (`pg_dumpall`, see [Database backups](DEPLOYMENT.md#database-backups)).
- A custom dump of the `fms` database only. Make it on the production host, in `oci/`. The site stays online:

  ```bash
  # -T: no pseudo-TTY, keeps the binary dump intact.
  podman-compose exec -T db pg_dump -U admin -Fc fms > fms.dump
  ```

Restore the file (in `oci/`). Use the restore command that matches the format of the file. To find the format, see
[Identify the format of a database backup](README.md#identify-the-format-of-a-database-backup).

```bash
podman-compose -f compose.yaml -f compose.dev.yaml down
podman volume rm freezeman_pgdata     # deletes the development database
podman-compose -f compose.yaml -f compose.dev.yaml up -d db
until podman-compose -f compose.yaml -f compose.dev.yaml exec db pg_isready -h 127.0.0.1 -U postgres -d fms; do sleep 2; done

# Dump of all databases (pg_dumpall). -d postgres: psql must start in another database than fms, because the script runs \connect fms.
gunzip -c backups/<YYYY-MM-DD>.pgsql.gz | podman-compose -f compose.yaml -f compose.dev.yaml exec -T db psql -U postgres -d postgres
# Or the custom dump (pg_dump -Fc). First create admin as in "Start the development stack".
# --no-owner: give all objects to admin, the role that connects. --no-acl: skip GRANT and REVOKE of roles that do not exist here.
podman-compose -f compose.yaml -f compose.dev.yaml exec -T db pg_restore -U admin -d fms --no-owner --no-acl < backups/fms.dump

# Start dev, then apply the migrations of your branch that the dump does not have.
podman-compose -f compose.yaml -f compose.dev.yaml up -d
podman-compose -f compose.yaml -f compose.dev.yaml exec dev sh -c 'cd backend && python manage.py migrate && python manage.py createinitialrevisions'
```

- The messages "role postgres already exists", "database fms already exists" and "extension fzy already exists" are harmless.
- A dump of all databases also restores the roles. `admin` gets the production password and the production
  privileges (no `CREATEDB`). Then `dev` reports "password authentication failed", and `pytest` cannot create
  its test database. After the restore, set them back. Replace `<POSTGRES_PASSWORD>` with the value of `.env`:

  ```bash
  podman-compose -f compose.yaml -f compose.dev.yaml exec db psql -U postgres -d postgres \
    -c "ALTER ROLE admin LOGIN CREATEDB PASSWORD '<POSTGRES_PASSWORD>'" \
    -c "ALTER DATABASE fms OWNER TO admin"
  ```

- If you need the uploaded files, copy `backend/media` of the production host
  into `backend/media` of your checkout.

### Run the servers and the tests

In the `dev` shell (`podman-compose -f compose.yaml -f compose.dev.yaml exec dev bash`), the commands start in `$CONTAINER_FMS_ROOT`, where the shell starts:

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

Or run them from the host, in `oci/`, without a `dev` shell:

```bash
podman-compose -f compose.yaml -f compose.dev.yaml exec dev sh -c 'cd backend && pytest'
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
  podman-compose -f compose.yaml -f compose.dev.yaml exec db psql -U admin -d fms
  ```

- From the host with a host `psql` or a GUI client: connect to `localhost:5432` (`compose.dev.yaml` publishes
  the port). Use the user, the database and the password of `.env`.

## Test the production stack locally

Use the `.env` of [Start the development stack](#start-the-development-stack) (from `.env.dev.example`, with `FMS_HOST=localhost` and `HOST_LOG_DIR` set). Then build and start the stack. `web` is a default service:

```bash
podman-compose build  # Proxy host: see DEPLOYMENT.md#proxy
podman-compose up -d
```

- Open `http://localhost:8080` (`HOST_HTTP_PORT`).
- When running podman-compose inside a VM or container (i.e. nested container), set `HOST_HTTP_ADDR=0.0.0.0` in `.env` first: the default binds the port to `127.0.0.1` of the host.
- Restore a backup as in [Restore a production database](#restore-a-production-database).
