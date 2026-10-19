---
name: freezeman
description: Procedures for the FreezeMan repo: backend venv and dependencies, manage.py, Postgres setup (host or container) and fzy, backup restore, Python conventions, migrations, frontend build and verification, deployment reference. Use for any backend, database, migration, test, frontend build or release/deployment task in this repository.
---

## Backend

- Venv: `backend/env`. If it does not exist, create it from `backend/` with `python3.14 -m venv env`. Run `backend/env/bin/python manage.py ...` or activate it.
- `backend/requirements.txt` is the source of truth. Install with `env/bin/python -m pip install -r requirements.txt`. If the venv has no `pip` (a `uv`-made venv), use `uv pip install --python env/bin/python -r requirements.txt`. Do not use `uv add` or `uv sync`.
- To add a dependency, install it into the venv, then update `requirements.txt` from `env/bin/python -m pip freeze` (or `uv pip freeze --python env/bin/python`). Keep only the packages that production needs. Remove local-only packages, for example `tzdata`, debuggers, linters and type checkers.
- `manage.py test` runs pytest. It uses a `test_fms_*` database per worker and drops it at the end.
- Ask before running `migrate` or anything touching a database other than a throwaway one.
- If there is no system time zone data, install the `tzdata` package into the venv with the same install command (pip or uv) as above. Do not add it to `requirements.txt`.

### Database

- Choose the setup. If no database setup exists and the task needs one, ask the user: host PostgreSQL or Podman container. If a setup exists (`podman ps -a` shows `freezeman-pg`, or `pg_isready -h 127.0.0.1` succeeds), use it and do not ask.
- Both setups need: Postgres 15 or later, the `fzy` extension, role `admin` (`LOGIN CREATEDB`, password `admin`), port 5432 on `127.0.0.1`.
- Both setups build `fzy` from `backend/dependencies/pg_fzy`. It is a submodule with its own nested submodule, `fzy_native`. If `pg_fzy` or `pg_fzy/fzy_native` is empty, check out both from the repo root. The `.gitmodules` files use `git://` URLs, which GitHub no longer serves, so rewrite them to HTTPS for this command:
  ```
  git -c url.https://github.com/.insteadOf=git://github.com/ submodule update --init --recursive backend/dependencies/pg_fzy
  ```
  Without `fzy_native`, `make` fails because `fzy_native/src/match.c` is missing.

#### Host PostgreSQL

- The user installs and starts PostgreSQL. Do not install packages, manage services or change system files (`/etc`) without asking.
- The `sudo -u postgres` commands below need peer authentication for the `postgres` OS user (the default). If the host uses another method, adapt them (for example `psql -U postgres -h 127.0.0.1`).
- Build `fzy` from `backend/dependencies/pg_fzy`: run `make`, then `sudo make install`. The build needs `pg_config` and the server headers. Ask before `sudo`.
- Create the extension in `template1`: `sudo -u postgres psql -d template1 -c 'CREATE EXTENSION IF NOT EXISTS fzy;'`.
- If role `admin` does not exist, create it: `sudo -u postgres psql -c "CREATE ROLE admin LOGIN CREATEDB PASSWORD 'admin';"`.
- Restore a `pg_dumpall` backup: `sudo -u postgres psql -d postgres < backup.sql`.
- More detail: `backend/README.md` ("pg_fzy" and "Updating Your Local Database").

#### Container (Podman)

- Container `freezeman-pg`: image `docker.io/library/postgres:18-trixie`, volume `freezeman-pgdata`, port 5432, superuser `postgres` / `postgres`. Create it with:
  ```
  podman run -d --name freezeman-pg --shm-size=1g \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
    -p 5432:5432 -v freezeman-pgdata:/var/lib/postgresql \
    docker.io/library/postgres:18-trixie
  ```
- The image has no `fzy`. Build it inside the container. `apt-get` needs `-o APT::Sandbox::User=root` here:
  ```
  podman exec freezeman-pg sh -c 'apt-get -o APT::Sandbox::User=root update && apt-get -o APT::Sandbox::User=root install -y --no-install-recommends build-essential "postgresql-server-dev-$PG_MAJOR"'
  podman cp backend/dependencies/pg_fzy freezeman-pg:/tmp/pg_fzy
  podman exec -w /tmp/pg_fzy freezeman-pg sh -c 'make clean && make && make install'
  podman exec freezeman-pg psql -U postgres -d template1 -c 'CREATE EXTENSION IF NOT EXISTS fzy;'
  podman exec freezeman-pg rm -r /tmp/pg_fzy
  ```
  Creating `fzy` in `template1` gives every new database, such as the pytest one, the extension. If you run `podman rm freezeman-pg`, repeat these steps. The data volume stays.
- Restore a `pg_dumpall` backup: `podman exec -i freezeman-pg psql -U postgres -d postgres < backup.sql`. If role `admin` exists, the restore reports "role admin already exists".

#### Database `fms` (both setups)

- Do not create database `fms`. The user creates it or restores a backup. An existing `fms` causes errors during a backup restore.
- If the user asks how to create `fms` without a restore, give `CREATE DATABASE fms OWNER admin;` (run as `postgres`).
- Since PostgreSQL 15, only the database owner can create objects in schema `public`. If `postgres` owns `fms`, `migrate` fails with `permission denied for schema public`. Tell the user to run `ALTER DATABASE fms OWNER TO admin;`, or ask before you run it.

#### After a restore (both setups)

- The dump creates database `fms` and role `admin`. Expect harmless "already exists" errors. Do not create database `fms` before the restore.
- The dump can replace the `postgres` password. Container: run `ALTER ROLE postgres PASSWORD 'postgres'`. Host: run `ALTER ROLE postgres PASSWORD '<previous>'`.
- The dump can replace the `admin` role settings. Run `ALTER ROLE admin WITH PASSWORD 'admin'; ALTER ROLE admin CREATEDB;` (`CREATEDB` is for the pytest databases).

### Python conventions

- Always add type annotations and docstrings (pdoc3 format).
- Use `Optional[T]` only for a parameter whose default is `None`.
- Reverse relations (from `related_name`) are encouraged when they simplify code. Accept the resulting pyright errors; never add `# type: ignore`.
- Prefer QuerySet features over pure Python, unless Python is clearly faster.
- Typing tooling (e.g. `basedpyright`, stubs) may be installed locally but never added to `requirements.txt`. Code must run without it: stdlib `typing` or packages already in `requirements.txt` on `origin/master`.
- Do not leave a viewset test file in the repo: delete it after running it.

### Migrations

- At most one per release, merged by hand into the existing unreleased one (not `squashmigrations`), named `vX_Y_Z` with underscores, e.g. `0082_v5_9_0.py`.

## Frontend

- There are no frontend tests. Verify with `npx tsc --noEmit --skipLibCheck`, plus `npx eslint <files>`. Don't use `prettier`.

## Deployment (reference only)

- `DEPLOYMENT.md` targets the production server. Never run its `yum`, `systemctl`, nginx, uwsgi, `pg_hba.conf` or build-from-source steps locally.
- Use it to answer questions, and add new release steps under "Specific deployments".
