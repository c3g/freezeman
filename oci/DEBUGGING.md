# Debugging

This guide is for the people who set up or run FreezeMan with containers. Use it to find a fault in the deployment.

- Run all commands as `<user>`, in a login shell.
- Set the compose file first: `export COMPOSE_FILE=<install-dir>/oci/compose.yaml`.
- The placeholders are the same as in [DEPLOYMENT.md](../DEPLOYMENT.md).

Contents:

- [Deployment checklist](#deployment-checklist)
- [Logs](#logs)
- [Known issues](#known-issues)

## Deployment checklist

Each row is an item that [DEPLOYMENT.md](../DEPLOYMENT.md) sets. Run the check. If the result is not the expected one, do the step of DEPLOYMENT.md again.

| Item | Check | Expected result |
|---|---|---|
| `XDG_RUNTIME_DIR` in the login shell | `echo $XDG_RUNTIME_DIR` | `<runtime-dir>` |
| `XDG_RUNTIME_DIR` and `PATH` in the crontab | `crontab -l` | The two variable lines at the top, then the `@reboot` line and the report line |
| The runtime directory stays after logout | `loginctl show-user <user> -p Linger` | `Linger=yes` |
| The cgroup manager of podman | `podman info --format '{{.Host.CgroupManager}}'` | `cgroupfs` |
| `.env` has all required values | `podman-compose config > /dev/null` | No error. An error such as `set FMS_ENV in .env` names the missing value |
| `HOST_LOG_DIR` is an existing absolute path | `ls -ld <HOST_LOG_DIR>` | A directory owned by `<user>` |
| The `HOST_*_DIR` folders are writable by `<user>` | `podman-compose config \| grep source:` then `ls -ld <folder>` | Each folder is on this host and owned by `<user>` |
| The images have the tag of the release | `podman images localhost/freezeman-*` | The tag is the value in `VERSION` |
| The migrations are applied | `podman-compose exec backend python manage.py showmigrations \| grep '\[ \]'` | No output |
| All services run | `podman-compose ps` | `db`, `backend` and `web` are `Up` |
| `web` answers on the host | `curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:<HOST_HTTP_PORT>/` | `200` |
| The reverse proxy answers | `curl -sfo /dev/null -w '%{http_code}\n' https://<domain>/` | `200` |
| The daily report runs | `tail <HOST_LOG_DIR>/report.log <HOST_LOG_DIR>/report_preparation.log` | A run from the last night, with no error |

## Logs

All logs are in `<HOST_LOG_DIR>`. They stay after `podman-compose down`.

| File | Contents |
|---|---|
| `db.log`, `backend.log`, `web.log` | The output of each service |
| `fms.log` | The Django log: `WARNING` and higher when `FMS_ENV` is `PROD`, `DEBUG` and higher otherwise |
| `report.log`, `report_preparation.log` | The output and the log of the daily report |
| `boot.log` | The output of the `@reboot` crontab line |

To run the report now, in the foreground: `podman-compose exec -T backend python manage.py prepare_report_data`.

## Known issues

| Symptom | Cause | Fix |
|---|---|---|
| 502 at the reverse proxy | `web` is not running, or `HOST_HTTP_PORT` does not match the port of the reverse proxy | Check `podman-compose ps` and `curl http://127.0.0.1:<HOST_HTTP_PORT>/`. If `web` answers, correct the port in the [Reverse proxy](../DEPLOYMENT.md#reverse-proxy) configuration |
| 502 on `/api/` from `web` | `backend` is not running | Read `podman-compose logs backend` |
| 400 Bad Request | `FMS_HOST` is not the host name of the request | Set `FMS_HOST` in `.env`, then `podman-compose up -d --force-recreate` |
| 413 on upload | The upload limit is missing in the reverse proxy | Add `client_max_body_size` as in [Reverse proxy](../DEPLOYMENT.md#reverse-proxy) |
| `backend` stops with an error about missing tables or columns | The migrations did not run | Run the migration step of [Update to a new release](../DEPLOYMENT.md#update-to-a-new-release) |
| `backend` stops with `Database db:5432 is not reachable: <cause>` | `db` is not ready, or the password or the database name is wrong | Read the cause. Check `POSTGRES_*` in `.env` |
| `[conmon:e]: Failed to open log file No such file or directory` | `HOST_LOG_DIR` is a relative path, or the directory does not exist | Set it to an existing absolute path, then `podman-compose up -d --force-recreate` |
| A change of `.env` has no effect | `podman-compose restart` keeps the old container | Run `podman-compose up -d --force-recreate`. After a change of `FMS_ENV`, run `podman-compose build web` first |
| `podman ps` shows no containers, but the site works | This shell has another `XDG_RUNTIME_DIR` than cron | Use a login shell, so `~/.bash_profile` sets `XDG_RUNTIME_DIR` |
| The stack does not start after a reboot | The crontab has no `XDG_RUNTIME_DIR` or `PATH` line, or linger is off | Read `<HOST_LOG_DIR>/boot.log`. Check the crontab and linger rows of the [checklist](#deployment-checklist) |
| A `HOST_*_DIR` folder is empty | The path in `.env` is wrong. podman-compose creates a missing folder and gives no error | Correct the path, then `podman-compose up -d --force-recreate` |
| `backend` cannot write into a `HOST_*_DIR` folder | `<user>` does not own the folder | Give the folder to `<user>` |
| An image pull or a build fails | No access to a domain, or no proxy in the shell | See [Network access](../DEPLOYMENT.md#network-access) and [Proxy](../DEPLOYMENT.md#proxy) |
| The daily report did not run | The report line or the variable lines are missing in the crontab, or `backend` was not running | Read `<HOST_LOG_DIR>/report.log`. Run the report in the foreground (see [Logs](#logs)) |
