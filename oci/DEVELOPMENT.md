# Development setup

This guide tells you how to run the FreezeMan container stack for development.
For the overview, the layout and the shared setup, read [README.md](README.md).

Contents:

- [Prerequisites](#prerequisites)
- [Development notes](#development-notes)
- [Start the development stack](#start-the-development-stack)
  - [Restore a production database](#restore-a-production-database)
  - [Run the servers and the tests](#run-the-servers-and-the-tests)
- [Database access](#database-access)
- [Test the production stack locally](#test-the-production-stack-locally)

## Run all `podman-compose` commands from `oci/`.

## Prerequisites

1. Do the steps of [Prerequisites](README.md#prerequisites) in README.md. They apply to both environments.
2. If your host reaches the internet through an HTTP proxy, do the steps of [Proxy](README.md#proxy) in README.md.
3. Install the tools. Development works on any OS with podman and podman-compose. The `:z` SELinux labels are ignored where SELinux is absent.

   - Windows: [install Podman](https://podman.io/docs/installation#windows) and use `podman machine`.
   - macOS: [install Podman](https://podman.io/docs/installation#macos) and use `podman machine`.
   - Ubuntu 26.04 Desktop: [install Podman](https://podman.io/docs/installation#ubuntu).
   - All systems: [install podman-compose](https://github.com/containers/podman-compose#installation).

## Development notes

For the services of the development stack, see [Development services](README.md#development-services) in README.md.

- The repository is bind-mounted at `/src`. Files that the container writes (`fms.log`, migrations, uploads)
  belong to your host user (`userns_mode: keep-id`).
- Container `node_modules` live in a named volume, separate from the host's. This gives you:
  - No clash between the host and the container. `npm ci` installs binaries for one OS and architecture
    (for example webpack and esbuild). The Linux container and a macOS or Windows host need different binaries.
  - Faster installs and builds on macOS and Windows. `node_modules` has many small files, and a bind mount
    is slow through the Podman VM.
  - Correct file owners (`:U` gives the volume to the container user), and no container files in your checkout.

  The host editor does not see this `node_modules`.
- Bash in `dev` has tab completion (for example `git` and `psql`).
- The production services `backend` and `web` have the profile `prod` in development,
  so `up -d` does not start them. `scheduler` does not start either.

## Start the development stack

Set `FMS_LOG_DIR` in `.env` to the absolute path of `oci/logs` in your checkout, for example
`FMS_LOG_DIR=/home/me/freezeman/oci/logs`. Compose stops without it. Start the stack and enter the `dev` container:

```bash
mkdir -p logs                          # the container logs go to FMS_LOG_DIR/<service>.log
podman-compose -f compose.yaml -f compose.dev.yaml up -d
podman-compose -f compose.yaml -f compose.dev.yaml exec dev bash
```

The `dev` shell starts in `/src`. The venv is ready: the `dev` image has the packages of
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

- A daily backup: `<FMS_BACKUP_DIR>/<YYYY-MM-DD>.pgsql.gz` (`pg_dumpall`, see [Database backups](DEPLOYMENT.md#database-backups)).
- A custom dump of the `fms` database only. Make it on the production host, in `oci/`. The site stays online:

  ```bash
  # -T: no pseudo-TTY, keeps the binary dump intact.
  podman-compose exec -T db pg_dump -U admin -Fc fms > fms.dump
  ```

Restore the file (in `oci/`):

```bash
podman-compose -f compose.yaml -f compose.dev.yaml down
podman volume rm freezeman_pgdata     # deletes the development database
podman-compose -f compose.yaml -f compose.dev.yaml up -d db
until podman-compose -f compose.yaml -f compose.dev.yaml exec db pg_isready -h 127.0.0.1 -U admin -d fms; do sleep 2; done

# Daily backup (pg_dumpall). -d postgres: psql must start in another database than fms, because the script runs \connect fms.
gunzip -c backups/<YYYY-MM-DD>.pgsql.gz | podman-compose -f compose.yaml -f compose.dev.yaml exec -T db psql -U admin -d postgres
# Or the custom dump (pg_dump -Fc).
# --no-owner: give all objects to POSTGRES_USER. --no-acl: skip GRANT and REVOKE of roles that do not exist here.
podman-compose -f compose.yaml -f compose.dev.yaml exec -T db pg_restore -U admin -d fms --no-owner --no-acl < backups/fms.dump

# Start dev, then apply the migrations of your branch that the dump does not have.
podman-compose -f compose.yaml -f compose.dev.yaml up -d
podman-compose -f compose.yaml -f compose.dev.yaml exec dev sh -c 'cd backend && python manage.py migrate && python manage.py createinitialrevisions'
```

- The messages "role admin already exists", "database fms already exists" and "extension fzy already exists" are harmless.
- A daily backup also restores the roles, so `admin` gets the production password. If `dev` reports
  "password authentication failed", set it back to `POSTGRES_PASSWORD` of your `.env`. The socket connection in `db` needs no password:

  ```bash
  podman-compose -f compose.yaml -f compose.dev.yaml exec db psql -U admin -d postgres -c "ALTER ROLE admin PASSWORD '<POSTGRES_PASSWORD>'"
  ```

  If `pytest` cannot create its test database, also run `ALTER ROLE admin CREATEDB` the same way.
- The database has no media files. If you need the uploaded files, copy `backend/media` of the production host
  into `backend/media` of your checkout.
- On a slow disk, start `db` with `-f compose.restore.yaml` added, as in [Restore on a slow disk](DEPLOYMENT.md#restore-on-a-slow-disk).

### Run the servers and the tests

In the `dev` shell:

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

Run the backend tests in the `dev` shell:

```bash
cd /src/backend && pytest
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

Podman does not create a missing bind-mount source or log directory. Create the host directories first (once).
Set `FMS_LOG_DIR` in `.env` to the absolute path of `oci/logs`, and `FMS_HOST` to `localhost`. Then build and start the stack. `web` is a default service:

```bash
mkdir -p ../backend/media ../backend/triggers logs
# proxy host: set the variables before each podman-compose command, as in Proxy
HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=... podman-compose build
podman-compose up -d
```

- Open `http://localhost:8080` (`FMS_HTTP_PORT`).
- In a VM or container, set `FMS_HTTP_ADDR=0.0.0.0` in `.env` first: the default binds the port to `127.0.0.1` of the host.
- The database is empty. To get data, restore a backup as in [Restore a production database](#restore-a-production-database).
