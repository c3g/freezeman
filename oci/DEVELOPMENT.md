# Development setup

This guide tells you how to run the FreezeMan container stack for development.
For the overview, the layout and the shared setup, read [README.md](README.md).

Contents:

- [Prerequisites](#prerequisites)
- [Development notes](#development-notes)
- [Start the development stack](#start-the-development-stack)
- [Database access](#database-access)
- [Dev Container](#dev-container)
- [Test the production stack locally](#test-the-production-stack-locally)

Run all `podman-compose` commands from `oci/`.

## Prerequisites

1. Do the steps of [Prerequisites](README.md#prerequisites) in README.md. They apply to both environments.
2. If your host reaches the internet through an HTTP proxy, do the steps of [Proxy](README.md#proxy) in README.md.
3. Install the tools. Development works on any OS with podman and podman-compose. The `:z` SELinux labels are ignored where SELinux is absent.

   - Windows: [install Podman](https://podman.io/docs/installation#windows) and use `podman machine`.
   - macOS: [install Podman](https://podman.io/docs/installation#macos) and use `podman machine`.
   - Ubuntu 26.04 Desktop: [install Podman](https://podman.io/docs/installation#ubuntu).
   - All systems: [install podman-compose](https://github.com/containers/podman-compose#installation).
   - Optional: VS Code with the [Dev Containers extension](https://code.visualstudio.com/docs/devcontainers/containers).
     The editor runs in the `dev` container, so the language servers see the venv and `node_modules`.
     See [Dev Container](#dev-container).

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

  The host editor does not see this `node_modules`. If the editor needs it, use the [Dev Container](#dev-container).
- Bash in `dev` has tab completion (for example `git` and `psql`).
- The production services `migrate`, `backend` and `web` have the profile `prod` in development,
  so `up -d` does not start them. `report`, `backup`, `logrotate` and `remind` do not start either.

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

- In the `dev` shell, or in a VS Code terminal of the [Dev Container](#dev-container): run `psql`.
  `compose.dev.yaml` sets `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and `PGPASSWORD` in `dev` (from `.env`),
  so `psql` needs no arguments. The `dev` image has the PostgreSQL client. The Dev Container terminal is inside
  `dev` and has no `podman-compose`, so use this way there.

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

## Dev Container

`.devcontainer/devcontainer.json` runs the editor inside `dev`, so the language servers see
the venv (`/opt/venv/bin/python`) and `node_modules`. It uses the same compose files and
starts `db` and `dev`. It starts no server. Start the servers by hand in a terminal of the editor,
as in [Start the development stack](#start-the-development-stack).

The `dev` image has the language servers `basedpyright`, `typescript-language-server` and
`docker-language-server` on `PATH`, and the type stubs of `backend/requirements-stubs.txt` in the venv.
The Dev Container sets no editor type-checking settings. To use basedpyright in VS Code, install its extension
and configure it in your own settings.
To change a language server version, edit its `ARG` in `oci/Containerfile`. To change a stub, edit
`backend/requirements-stubs.txt`. Then rebuild `dev`.

1. Do the [Prerequisites](#prerequisites), including `cp .env.example .env` in `oci/`.
   Create `oci/logs` and set `FMS_LOG_DIR` in `.env` to its absolute path, for example
   `FMS_LOG_DIR=/home/me/freezeman/oci/logs`. The editor starts compose from another directory, so the path must be absolute.
2. For podman, set these VS Code user settings:

   ```jsonc
   {
     // Use podman instead of docker.
     "dev.containers.dockerPath": "podman",
     // Use podman-compose instead of docker compose.
     "dev.containers.dockerComposePath": "podman-compose"
   }
   ```
3. Open the repository in VS Code and run "Dev Containers: Reopen in Container".

The Dev Containers extension with `podman-compose` has known quirks. If "Reopen in Container" fails,
work without the editor inside `dev`. Open a terminal on the host, in `oci/`, and run the two commands
from the start of [Start the development stack](#start-the-development-stack) (`up -d`, then `exec dev bash`). Edit the files on the host.
The servers, `psql` and the tests run in that `dev` shell as before.

## Test the production stack locally

Podman does not create a missing bind-mount source or log directory. Create the host directories first (once).
Set `FMS_LOG_DIR` in `.env` to the absolute path of `oci/logs`. Then build and start the stack. `web` is a default service:

```bash
mkdir -p ../backend/media ../backend/triggers logs
# proxy host: set the variables before each podman-compose command, as in Proxy
HTTP_PROXY=... HTTPS_PROXY=... NO_PROXY=... podman-compose build
podman-compose up -d
```

- Open `http://localhost:8080` (`FMS_HTTP_PORT`).
- In a VM or container, set `FMS_HTTP_ADDR=0.0.0.0` in `.env` first: the default binds the port to `127.0.0.1` of the host.
- The database is empty. To get data, restore a backup as in [Database backups](DEPLOYMENT.md#database-backups).
