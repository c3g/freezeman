# Development setup

This guide tells you how to run the FreezeMan container stack for development.
For the overview and layout of oci, read [README.md](README.md).
For the clone and the submodules, see [Installation](../README.md#installation) in the root README.md.

> [!NOTE]
> You can run `podman-compose` from any directory.
> Give it the compose files once: `export COMPOSE_FILE=<install-dir>/oci/compose.yaml:<install-dir>/oci/compose.dev.yaml`.
> The commands below do not repeat the `-f` flags.

Contents:

- [Prerequisites](#prerequisites)
- [Services](#services)
- [Start the development stack](#start-the-development-stack)
  - [Restore a production database](#restore-a-production-database)
  - [Run the servers and the tests](#run-the-servers-and-the-tests)
- [Database access](#database-access)
- [Test the production stack locally](#test-the-production-stack-locally)

## Prerequisites

Install the tools.
Development works on any OS with podman and podman-compose.

- Windows: [install Podman](https://podman.io/docs/installation#windows) and use `podman machine`.
- macOS: [install Podman](https://podman.io/docs/installation#macos) and use `podman machine`.
- Ubuntu: [install Podman](https://podman.io/docs/installation#ubuntu).
- All systems: [install podman-compose](https://github.com/containers/podman-compose#installation).

## Services

| Service    | Image                         | What it runs                                                    |
|------------|-------------------------------|-----------------------------------------------------------------|
| `db`       | `localhost/freezeman-db`      | PostgreSQL with the `fzy` extension. Port 5432 is published  |
| `dev`      | `localhost/freezeman-dev`     | Idle container with the venv (`/opt/venv`), Python and Node. You start the Django server (`runserver`) and the frontend dev server (webpack) by hand inside it. It takes the place of the production `backend` service |

The versions are in [Overview](README.md#overview).

`compose.dev.yaml` puts the production services `backend` and `web` in the profile `prod`, so `up -d` does not start them.

- The repository is bind-mounted at `$CONTAINER_FMS_ROOT` (`CONTAINER_FMS_ROOT` of `.env`, also an environment variable in `dev`).

## Start the development stack

If you do not have `.env` yet, run `cp .env.dev.example .env`.
Set `HOST_LOG_DIR` in `.env` to the absolute path of `logs` in your checkout, for example `HOST_LOG_DIR=/home/me/freezeman/logs`.
Compose stops without it.
If the path is relative or the directory does not exist, the containers fail with `[conmon:e]: Failed to open log file No such file or directory`.

Start the stack and enter the `dev` container:

```bash
podman-compose up -d
podman-compose exec dev bash
```

- After a change to `.env`, run `podman-compose up -d` again.
  It compares the configuration of the containers with the compose files and `.env`.
  If a value changed, it removes all containers of the stack and creates them again.
  The data in the volumes stays.
- `up` does not build an image again.
  `CONTAINER_FMS_ROOT` is also in the `dev` image.
  After a change to it, run `podman-compose build dev`, then `podman-compose up -d`.

The `dev` shell starts in `$CONTAINER_FMS_ROOT`.

`postgres` is the superuser of the database.
It works only through the Unix socket in the `db` container (`podman-compose exec db ...`).
Django and `dev` connect as the app role `admin` (`POSTGRES_USER` of `.env`).

- On the first start of a new database volume, `db` creates `admin` with the password of `.env` (`db/initdb/20-app-role.sh`).
- In development, `admin` also gets `CREATEDB`: pytest creates its own test database.
- If you restore a database backup file, see [Restore a production database](#restore-a-production-database).

Python virtual environment is ready:

- the `dev` image has the packages of `backend/requirements.txt` in `/opt/venv`, and `/opt/venv/bin` is first in `PATH`.
  So `python`, `pip` and `pytest` are the ones of the venv, with no activation and no first `pip install`.
- `pip install` works in the `dev` shell, for example to try a package.
  The venv is in the image, not in the bind-mounted checkout, so the package stays only until `dev` is recreated.
  To keep a package, add it to `backend/requirements.txt`, then build the image again and recreate `dev` (on the host):

  ```bash
  podman-compose build dev
  podman-compose up -d dev
  ```

## Restore a production database

Optional.
Do this before `migrate` and `runserver` to get production data into the development database.

Get a database backup file of all databases, `backups/<YYYY-MM-DD>.pgsql.gz`, from the production host (made with `pg_dumpall` as in [Database backups](../DEPLOYMENT.md#database-backups)).
Copy it to `<install-dir>/backups/`.
The restore skips the lines that change `postgres`, so `postgres` keeps the settings of the development stack.

Restore the file:

```bash
podman-compose down
podman volume rm freezeman_pgdata     # deletes the development database
podman-compose up -d db
until podman-compose exec db pg_isready -h 127.0.0.1 -U postgres -d fms; do sleep 2; done

# Skip the lines that change postgres.
# -d postgres: psql must start in another database than fms, because the script runs \connect fms.
gunzip -c <install-dir>/backups/<YYYY-MM-DD>.pgsql.gz \
  | grep -vE '^(CREATE|ALTER) ROLE postgres[ ;]' \
  | podman-compose exec -T db psql -U postgres -d postgres

# Start dev, then apply the migrations of your branch that the backup file does not have.
podman-compose up -d
podman-compose exec dev sh -c 'cd backend && python manage.py migrate && python manage.py createinitialrevisions'
```

- The messages "role "admin" already exists", "database "fms" already exists" and "extension "fzy" already exists" are harmless.
- A backup file of all databases also restores the roles.
  `admin` gets the production password and the production privileges (no `CREATEDB`).
  Then `dev` reports "password authentication failed", and `pytest` cannot create its test database.
  After the restore, set them back.
  Replace `<POSTGRES_PASSWORD>` with the value of `.env`:

  ```bash
  podman-compose exec db psql -U postgres -d postgres \
    -c "ALTER ROLE admin LOGIN CREATEDB PASSWORD '<POSTGRES_PASSWORD>'" \
    -c "ALTER DATABASE fms OWNER TO admin"
  ```

- Other formats: a custom-format backup file (`pg_dump -Fc`) of the `fms` database restores with `pg_restore`, not `psql`.
  `pg_restore` can restore in parallel (`-j`), but it cannot read from `<` or a pipe, so copy the file into the `db` container first:

  ```bash
  # On the production host. -T: no pseudo-TTY, keeps the binary file intact.
  podman-compose -f <install-dir>/oci/compose.yaml exec -T db pg_dump -U postgres -Fc fms > fms.backup
  # On your machine, after the first four commands of the restore above.
  # --no-owner: give all objects to admin, the role that connects. --no-acl: skip GRANT and REVOKE of roles that do not exist here.
  podman cp <install-dir>/backups/fms.backup freezeman_db_1:/tmp/fms.backup
  podman-compose exec db pg_restore -U admin -d fms --no-owner --no-acl -j 4 /tmp/fms.backup
  podman-compose exec db rm /tmp/fms.backup
  ```

- If you need the uploaded files, copy `backend/media` of the production host into `backend/media` of your checkout.

## Run the servers and the tests

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

The tests need no database setup.
pytest-django creates a separate test database and deletes it after the run.
PostgreSQL makes each new database as a copy of `template1`.
On the first start of `db`, `db/initdb/10-fzy.sql` installs the `fzy` extension in `template1`, so the test database gets `fzy` too.

## Database access

Use `psql` to look at the development database.
There are three ways:

- In the `dev` shell: run `psql`.
  `compose.dev.yaml` sets `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and `PGPASSWORD` in `dev` (from `.env`), so `psql` needs no arguments.
  The `dev` image has the PostgreSQL client.

  ```bash
  psql
  psql -c 'SELECT count(*) FROM django_migrations'
  ```

- From the host, through the `db` container (the user and database are `POSTGRES_USER` and `POSTGRES_DB` of `.env`):

  ```bash
  podman-compose exec db psql -U admin -d fms
  ```

- From the host with a host `psql` or a GUI client: connect to `localhost:5432` (`compose.dev.yaml` publishes the port).
  Use the user, the database and the password of `.env`.

## Test the production stack locally

Use the `.env` of [Start the development stack](#start-the-development-stack) (from `.env.dev.example`, with `FMS_HOST=localhost` and `HOST_LOG_DIR` set).
Then build and start the stack.
`web` is a default service:

```bash
podman-compose -f <install-dir>/oci/compose.yaml build  # Proxy host: set the proxy variables, see ../DEPLOYMENT.md#proxy
podman-compose -f <install-dir>/oci/compose.yaml up -d
```

- Open `http://localhost:<HOST_HTTP_PORT>` (`HOST_HTTP_PORT` of `.env`).
- Restore a backup as in [Restore a production database](#restore-a-production-database).
