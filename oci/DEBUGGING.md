# Debugging

This guide tells you how to find the cause of a fault in the FreezeMan container stack.
Read [README.md](README.md) first. It describes the services and the layout.

Run all commands in `<install-dir>/oci` as `<user>`. The placeholders are the same as in
[DEPLOYMENT.md](DEPLOYMENT.md): `<user>`, `<install-dir>`, `<HOST_LOG_DIR>`, `<HOST_HTTP_PORT>`, `<domain>`.
On a development machine, add `-f compose.yaml -f compose.dev.yaml` to each `podman-compose` command.

The guide has three layers. Each layer has two parts:

- Debug with the tool: use the tool to find the fault in the stack.
- Debug the tool itself: the tool is the fault.

Start at layer 1. Go down one layer only when the current layer shows that the fault is below it.

| Layer | Tool | Go to the next layer when |
|---|---|---|
| 1 | podman-compose | podman-compose fails before it starts a container, or its output does not explain the fault |
| 2 | podman | podman fails, or a container fails for a reason outside the container |
| 3 | The host system, then IT | The fault is in a part of the host that `<user>` cannot change |

The target host is Rocky Linux 9.6 with podman 5.4 and podman-compose 1.5. `<user>` has no `sudo` and no
user systemd (`systemctl --user` and `journalctl --user` do not work). Podman uses the `cgroupfs` cgroup
manager and the `file` event logger ([Set up the account of the user](DEPLOYMENT.md#set-up-the-account-of-the-user)).

Contents:

- [First checks](#first-checks)
- [Layer 1: podman-compose](#layer-1-podman-compose)
  - [Debug with podman-compose](#debug-with-podman-compose)
  - [Debug podman-compose itself](#debug-podman-compose-itself)
- [Layer 2: podman](#layer-2-podman)
  - [Debug with podman](#debug-with-podman)
  - [Debug podman itself](#debug-podman-itself)
- [Layer 3: system](#layer-3-system)
  - [What you can do without root](#what-you-can-do-without-root)
  - [Debug with the system](#debug-with-the-system)
  - [Debug the system itself with IT](#debug-the-system-itself-with-it)

## First checks

Do these three checks first. They often show the layer of the fault.

```bash
podman-compose ps                                                         # each service must be "Up"
curl -sfo /dev/null -w '%{http_code}\n' http://127.0.0.1:<HOST_HTTP_PORT>/  # 200: web and backend answer
grep -h -A3 "FAILED:" <HOST_LOG_DIR>/*.log                                # failures of the host scripts and jobs
```

The logs:

| File | Written by | Contents |
|---|---|---|
| `<HOST_LOG_DIR>/db.log`, `backend.log`, `web.log` | podman (`k8s-file` driver) | The output of each service. The files stay after `down` |
| `<HOST_LOG_DIR>/boot.log` | `start.py` (cron `@reboot`) | The start at boot |
| `<HOST_LOG_DIR>/jobs.log` | `jobs.py` (cron) | The daily jobs |
| `<HOST_LOG_DIR>/report_preparation.log` | The `report` job | The details of the report |
| `<HOST_LOG_DIR>/autoupdate.log` | `autoupdate.py` (cron, test hosts) | The automatic updates |
| `fms.log` in the `backend` container | Django, only if `FMS_ENV` is not `PROD` | The Django `DEBUG` log. It is lost when the container is recreated |

## Layer 1: podman-compose

### Debug with podman-compose

State and logs:

```bash
podman-compose ps                        # the state of each service
podman-compose logs -f backend           # follow the log of one service
podman-compose logs -f -n                # follow all services, each line with its container name
podman-compose logs --tail 100 db        # the last 100 lines of one service
```

A shell in a service:

```bash
podman-compose exec backend sh           # a shell in the running container
podman-compose exec -T backend <command> # no pseudo-TTY: use it when you redirect the output to a file
```

If a service stops at start, `exec` cannot enter it. Start a one-off container of the service with a shell:

```bash
# --no-deps: start only this service. --rm: remove the container after the shell.
podman-compose run --rm --no-deps backend sh
# If the entrypoint itself fails (backend/entrypoint.py), skip it:
podman-compose run --rm --no-deps --entrypoint sh backend
```

The one-off container has the same image, environment and mounts as the service. Run the command of the
service by hand in it and read the error.

The resolved configuration:

```bash
podman-compose config                    # compose.yaml with the values of .env filled in
```

Use it to check:

- The values that `.env` gives to each service. An error such as `set FMS_ENV in .env` comes from a `${VAR:?...}` check: set the variable in `.env`.
- The host paths of the bind mounts (`HOST_*`) and the log paths. They must be absolute.
- The proxy variables. See [Proxy](DEPLOYMENT.md#proxy).

Checks for each service:

```bash
# db
podman-compose exec db pg_isready -h 127.0.0.1 -U admin -d fms     # "accepting connections"
podman-compose exec db psql -U admin -d fms -c 'SELECT 1'          # a query works

# backend
podman-compose exec backend python manage.py check --deploy        # Django settings
podman-compose exec backend python manage.py showmigrations | grep '\[ \]'   # migrations not applied (no output: all applied)

# web
podman-compose exec web nginx -t                                   # the nginx configuration is valid
podman-compose exec web nginx -T                                   # the full nginx configuration
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:<HOST_HTTP_PORT>/api/   # not 502 or 504: uwsgi answers

# jobs
podman-compose --profile jobs run --rm jobs fms-report             # run the report job now, in the foreground
```

- `backend` listens on port 8000 with the uwsgi protocol, not HTTP. `curl` to `backend:8000` does not work. Test `/api/` through `web`.
- If `backend` stops with `Database db:5432 is not reachable: <cause>`, read the cause. A wrong password or a missing database also gives this message, not only a network fault.

Restart or recreate:

- `podman-compose restart <service>` keeps the container. A change of `.env` or of an image does not apply.
- `podman-compose up -d` recreates a container only if the resolved configuration changed.
- After a build or a change of `.env`, use `podman-compose up -d --force-recreate`.
  See [Start, stop and restart](DEPLOYMENT.md#start-stop-and-restart).

| Symptom | Command |
|---|---|
| A service is not `Up` | `podman-compose logs --tail 100 <service>`, then `run --rm --no-deps <service> sh` |
| A change of `.env` has no effect | `podman-compose config`, then `up -d --force-recreate` |
| 502 on `/api/` | `podman-compose logs backend` |
| Error about missing tables or columns | `showmigrations`, then the migration command of [Update to a new release](DEPLOYMENT.md#update-to-a-new-release) |
| The report did not run | `tail <HOST_LOG_DIR>/jobs.log`, then run the job in the foreground (above) |

More symptoms are in [Troubleshooting](DEPLOYMENT.md#troubleshooting) of DEPLOYMENT.md.

### Debug podman-compose itself

Do this when podman-compose fails before a container starts, or when it does something that you did not expect.

```bash
podman-compose version                                  # podman-compose 1.5 and the podman version it uses
podman-compose --dry-run up -d                          # print the podman commands, run nothing
podman-compose --verbose up -d                          # print the podman commands and run them
podman-compose --podman-args '--log-level=debug' ps     # give a debug flag to each podman command
```

To find out if the fault is in podman-compose or in podman, copy one `podman run` line from `--dry-run` and run it by hand.
If the line fails, go to [Layer 2](#layer-2-podman). If it works, the fault is in podman-compose.

Known behaviour of podman-compose 1.5:

- It reads `.env` and the relative paths of `compose.yaml` from the current directory. Run it in `oci/`. The host scripts change to `oci/` themselves (`hostenv.py`).
- It stops at the first `}` of a nested default such as `${A:-${B}}`. Do not use nested defaults.
- It interpolates the `environment` of a service two times. See the `NO_PROXY` quirk in [Proxy](DEPLOYMENT.md#proxy).
- It ignores `create_host_path` and always creates a missing bind-mount folder. A wrong `HOST_*` path gives an empty folder, not an error.
- It puts two project labels on each container: `io.podman.compose.project=freezeman` and `com.docker.compose.project=freezeman`. Use them to filter `podman ps`.

## Layer 2: podman

### Debug with podman

The container names are `freezeman_<service>_1`, for example `freezeman_backend_1`.

State:

```bash
podman ps -a --filter label=io.podman.compose.project=freezeman   # all containers of the stack, also stopped ones
podman inspect --format '{{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} restarts={{.RestartCount}}' freezeman_backend_1
podman inspect --format '{{.State.Error}}' freezeman_backend_1    # the error of the last start, if podman had one
podman inspect --format '{{json .Mounts}}' freezeman_backend_1    # the bind mounts and the volume
podman inspect --format '{{json .Config.Env}}' freezeman_backend_1  # the environment
```

- `restarts` higher than 0: the container stops and `restart: always` starts it again. Read its log.
- `oom=true`: the kernel stopped the process for lack of memory. See [Layer 3](#debug-with-the-system).

Logs and events:

```bash
# All services, each container in its own color.
podman logs -f --names --color $(podman ps -q --filter label=io.podman.compose.project=freezeman)
podman events --since 1h --filter container=freezeman_backend_1    # start, died, restart and other events
```

With the `file` event logger, the events are in `$XDG_RUNTIME_DIR`. A reboot deletes them.

Processes and files:

```bash
podman top freezeman_backend_1                                     # the processes in the container
podman cp freezeman_backend_1:<path> .                             # copy a file out of the container
```

Network:

```bash
podman network inspect freezeman_default                           # the network of the stack and its containers
podman port freezeman_web_1                                        # the published port: 127.0.0.1:<HOST_HTTP_PORT>
podman-compose exec backend getent hosts db web                    # the service names resolve in a container
```

Storage:

```bash
podman volume inspect freezeman_pgdata                             # the database volume and its path on the host
podman system df                                                   # the disk use of images, containers and volumes
podman images                                                      # the images and their tags (FMS_IMAGE_TAG)
```

File owners:

`backend` and `jobs` use `userns_mode: keep-id:uid=1000,gid=1000`. The image user `fms` (uid 1000) is `<user>` on the host.
If a container cannot write into a bind mount, compare the owners as the container sees them:

```bash
ls -ln <host-folder>                       # the owner on the host
podman unshare ls -ln <host-folder>        # the owner in the user namespace of podman
podman unshare cat /proc/self/uid_map      # the ID map of the user namespace
```

A container with debug tools next to a broken container:

```bash
# Share the network of web. The backend image has Python and the usual tools. It needs no image pull.
podman run --rm -it --network container:freezeman_web_1 --entrypoint sh localhost/freezeman-backend:<FMS_IMAGE_TAG>
```

### Debug podman itself

Do this when a podman command fails, or when podman shows containers that you do not expect.

```bash
podman version
podman info                                              # all settings of podman
podman info --format '{{.Host.CgroupManager}}'           # cgroupfs
podman info --format '{{.Host.EventLogger}}'             # file
podman info --format '{{.Host.NetworkBackend}}'          # netavark
podman info --format '{{.Store.RunRoot}}'                # /run/user/<uid>/containers
podman info --format '{{.Store.GraphRoot}}'              # the images, containers and volumes, in ~/.local/share/containers
podman --log-level=debug ps                              # debug output of any podman command
```

The configuration files of `<user>`:

- `~/.config/containers/containers.conf`: the engine settings (`cgroup_manager`, `events_logger`).
- `~/.config/containers/storage.conf`, `~/.config/containers/registries.conf`: only if they exist.
- The files in `/etc/containers` apply too. You can read them, but only IT can change them.

Common errors:

| Error or symptom | Cause | Fix |
|---|---|---|
| `podman ps` shows no containers, but the site works | This shell uses another runtime directory than cron. `RunRoot` is `/tmp/storage-run-<uid>`, not `/run/user/<uid>/containers` | Use a login shell (`bash -l`), so `~/.bash_profile` sets `XDG_RUNTIME_DIR`. See [Set up the account of the user](DEPLOYMENT.md#set-up-the-account-of-the-user) |
| `current system boot ID differs from cached boot ID` | The runtime directory survived a reboot | See [Known issues](README.md#known-issues) |
| `cannot find newuidmap` | The `shadow-utils` package is missing | Ask IT ([Layer 3](#debug-the-system-itself-with-it)) |
| `there might not be enough IDs available in the namespace` | `<user>` has no subuid or subgid range, or it is too small | Check `grep "^$USER:" /etc/subuid /etc/subgid`. Ask IT for a range of 65536 IDs. Then run `podman system migrate` |
| Errors after a podman upgrade or a subuid change | Old state of podman | `podman system migrate` |
| `short-name resolution enforced` | An image name without a registry | Use the full name (`docker.io/library/...`) |
| An image pull fails or stops | No access to the registry, or no proxy in the shell | See [Network access](DEPLOYMENT.md#network-access) and [Proxy](DEPLOYMENT.md#proxy) |
| An error of `crun` or `conmon` | The OCI runtime or the container monitor | Run the command again with `--log-level=debug`. Send the output to IT with `rpm -q crun conmon` |
| `podman stats` fails or shows no data | Rootless podman with `cgroupfs` and no systemd has no cgroup controllers | Normal on this host. Use `podman top` and `ps` |

Last step, only if all else fails: `podman system reset` deletes all images, containers and volumes of `<user>`,
also the database volume `freezeman_pgdata`. Make a backup first ([Database backups](DEPLOYMENT.md#database-backups)).
Do not use it to repair one container.

## Layer 3: system

### What you can do without root

| You can | You cannot |
|---|---|
| Read `/proc`, `/etc/os-release`, `/etc/subuid`, `/etc/subgid`, `/etc/containers` | Change any file in `/etc` |
| See and stop your own processes | See the details of the processes of other users |
| `crontab -l`, `crontab -e` | Read `/var/log/cron` |
| `systemctl status <unit>`, `systemctl is-active <unit>` of system units | Start, stop or change a system unit |
| `loginctl show-user $USER` | Use `systemctl --user` or `journalctl --user`: there is no user systemd |
| `rpm -q`, `rpm -qi` | Install or remove packages |
| `journalctl` for your own messages only | Read the system journal, `/var/log/messages`, `/var/log/audit`, the logs of the host reverse proxy |
| `dmesg`, only if `kernel.dmesg_restrict` is 0 | Change kernel settings |

### Debug with the system

User and session:

```bash
id                                         # the user and its groups
echo "$XDG_RUNTIME_DIR"                    # /run/user/<uid>
ls -ld /run/user/$(id -u)                  # exists, owned by <user>, mode 0700
loginctl show-user $USER -p Linger         # Linger=yes: /run/user/<uid> stays from boot to shutdown
ls /var/lib/systemd/linger/                # the users with linger
```

Without linger, `/run/user/<uid>` disappears at the last logout, and podman loses the state of the running containers.

Operating system and packages:

```bash
cat /etc/os-release                        # Rocky Linux 9.6
rpm -q podman podman-compose crun conmon netavark aardvark-dns shadow-utils cronie
```

Resources:

```bash
df -h ~/.local/share/containers <HOST_LOG_DIR>     # free disk space for images, volumes and logs
df -i ~/.local/share/containers                    # free inodes
du -sh ~/.local/share/containers                   # the disk use of podman
free -h                                            # memory and swap
cat /proc/pressure/memory /proc/pressure/io        # memory and disk pressure
ulimit -a                                          # the limits of your shell (open files, processes)
cat /proc/sys/user/max_user_namespaces             # must be more than 0 for rootless podman
quota -s 2>/dev/null                               # your disk quota, if the host has quotas
```

Also check the host folders of the bind mounts (`HOST_MEDIA_DIR` and the others of `.env`).

Processes:

```bash
ps -fu $USER                               # your processes: conmon, the container processes, rootlessport
pstree -p $USER                            # the same as a tree
```

Each running container has one `conmon` process. `rootlessport` forwards the port of `web`.

Network from the host:

```bash
ss -ltnp | grep <HOST_HTTP_PORT>                                  # rootlessport listens on 127.0.0.1:<HOST_HTTP_PORT>
curl -v http://127.0.0.1:<HOST_HTTP_PORT>/                        # web answers on the host
curl -sv -o /dev/null https://<domain>/                           # the host reverse proxy answers
getent hosts <domain>                                             # the name resolves
curl -sI https://registry-1.docker.io/v2/                         # outbound access for pulls (401 is normal)
curl -sI -x http://<proxy-host>:<port> https://registry-1.docker.io/v2/   # the same through the proxy
timeout 5 bash -c '</dev/tcp/<FMS_EMAIL_HOST>/<FMS_EMAIL_PORT>' && echo open   # the SMTP server is reachable
```

If `web` answers on `127.0.0.1` but `https://<domain>/` does not, the fault is in the host reverse proxy. Ask IT.

Cron:

```bash
crontab -l                                 # the @reboot line of start.py and the lines of the jobs
systemctl is-active crond                  # active
tail -n 50 <HOST_LOG_DIR>/boot.log         # the last start at boot
```

Cron starts the scripts with a short `PATH` and no `XDG_RUNTIME_DIR`. `hostenv.py` sets both. To run a crontab
line by hand in an environment like the one of cron:

```bash
env -i HOME=$HOME LOGNAME=$USER SHELL=/bin/sh PATH=/usr/bin:/bin /bin/sh -c '<the command of the crontab line>'
```

If the line works by hand but not from cron, ask IT to read the cron log ([next section](#debug-the-system-itself-with-it)).

Boot:

```bash
uptime -s                                  # the time of the last boot
last reboot 2>/dev/null | head             # the boots, if you can read /var/log/wtmp
grep -n "FAILED:" <HOST_LOG_DIR>/boot.log  # a failed start at boot
```

Compare the time of the boot with the time of the last run in `boot.log`. No run after the boot: cron did not start `start.py`.

SELinux:

```bash
getenforce                                 # Enforcing, Permissive or Disabled
```

### Debug the system itself with IT

`<user>` can only read and record on this layer. Do not try root changes. Do not work around a host fault with another
runtime directory, another storage path or another boot method. IT (the host administrator) does all root steps.

Ask IT when:

- The fault is in a part that root owns: packages, subuid and subgid, linger, `crond`, the host reverse proxy, the firewall or the allow list, the proxy, the disk or the quota, kernel limits, SELinux.
- The evidence is in a log that only root can read.

Write each request so that IT can act with no questions. Use this template:

```text
Host:            <domain>
User:            <user>
Time of fault:   <date and time, time zone>
Symptom:         <what fails, the exact error message>
What we checked: <the commands of layers 1 to 3 and their output>
Request:         <the command for IT>
Check:           <the command that shows the result>
Expected output: <the output of the check after the change>
Undo:            <the command that removes the change>
```

Logs that IT can read for you:

| Question | What IT reads |
|---|---|
| Did cron start `start.py` or a job? | `journalctl -u crond --since <time>` or `/var/log/cron` |
| Did `/run/user/<uid>` exist at boot? Is linger on? | `journalctl -u systemd-logind --since <time>`, `loginctl show-user <user>` |
| Did the kernel stop a process for lack of memory? | `journalctl -k --since <time> \| grep -i oom` or `dmesg -T \| grep -i oom` |
| Did the kernel refuse a user namespace or a mount? | `journalctl -k --since <time>` or `/var/log/messages` |
| Why does the host reverse proxy give 502, 504 or 413? | The error log of the reverse proxy, and its configuration (for nginx: `nginx -T`) |
| Did SELinux block a container? (only if SELinux is on) | `ausearch -m avc -ts <time>` or `/var/log/audit/audit.log` |
| Did the firewall or the proxy block a domain? | The firewall and proxy logs, for the domains of [Network access](DEPLOYMENT.md#network-access) |

Symptoms that need IT:

| Symptom | What IT checks | Command for IT |
|---|---|---|
| `podman` or `podman-compose` is missing or too old | The packages | `rpm -q podman podman-compose`, then `dnf install` or `dnf upgrade` |
| `not enough IDs available in the namespace` | The subuid and subgid ranges of `<user>` | `grep '^<user>:' /etc/subuid /etc/subgid`, then `usermod --add-subuids <START>-<END> --add-subgids <START>-<END> <user>` |
| The stack does not start after a reboot, and `boot.log` has no new run | Linger and `crond` | `loginctl show-user <user> -p Linger`, `systemctl is-active crond` |
| 502 or 413 at `https://<domain>/`, but `web` answers on `127.0.0.1` | The host reverse proxy | Its error log and configuration. See [Reverse proxy](DEPLOYMENT.md#reverse-proxy) |
| A pull or a build cannot reach a domain | The allow list or the proxy | The domains of [Network access](DEPLOYMENT.md#network-access) |
| The disk is full, or `quota` shows the limit | The disk or the quota | `df -h`, the quota of `<user>` |
| A container has `oom=true` | The memory of the host | The kernel log, `free -h` |

Do not ask IT for a root shell or a `sudo` rule for `<user>`. The stack stays rootless.
