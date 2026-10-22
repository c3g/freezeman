# Rocky Linux 9.6 host: requirements for FreezeMan containers

FreezeMan does not run on this host until each item below is in place.
The FreezeMan team runs FreezeMan as user `django` with rootless podman and podman-compose.
This file lists only the steps that need root. IT installs `podman` and `podman-compose` and prepares the host.
The team installs git itself, as `django`, and needs no root for it.
Make the changes in "Required setup", run the "Acceptance checks" and send the output to the FreezeMan team.

## Why Podman

| | Podman | Docker CE | Apptainer |
|---|---|---|---|
| Root | Rootless, no daemon | Root daemon. The `docker` group gives root access to the host | No daemon, runs as the user |
| Source on Rocky 9 | AppStream, supported by Red Hat | Third-party repository, not shipped or supported by Red Hat | EPEL |
| Compose file, healthchecks, restart policies, private networks | Yes | Yes | No built-in support. Designed for one container per job |

Podman runs the same OCI images and compose file as Docker, and can later move to systemd (Quadlet) and Kubernetes (`podman kube`).
Podman is the smallest-risk option: it uses the Rocky packages and adds no process that runs as root.

## Summary

| # | Required | Reason |
|---|---|---|
| 1 | [Packages](#1-packages): `podman` 5.4+ and `podman-compose` 1.5 | The container engine and the tool that starts the compose file |
| 2 | [subuid and subgid](#2-subuid-and-subgid) ranges for `django` | Rootless containers need a range of user ids |
| 3 | [Linger](#3-linger) for `django` | `sudo su - django` starts no systemd user session |

## Required setup

Run the commands as a user with `sudo`. Each item has a command, a check and the expected output.

### 1. Packages

Required: the container engine (`podman`, from AppStream) and `podman-compose` (from EPEL 9, which needs the CRB repository).

```bash
rpm -q podman podman-compose epel-release          # record the output, for Undo
sudo dnf install -y epel-release
sudo crb enable
sudo dnf install -y podman podman-compose

# Check
podman --version                                   # podman version 5.4 or later
podman-compose --version                           # podman-compose version 1.5 or later
```

### 2. subuid and subgid

Required: rootless containers need a range of user ids for `django`.

```bash
# Check
grep '^django:' /etc/subuid /etc/subgid            # one line in each file
```

Only if a line is missing, add a range.
Pick a free range of 65536 ids that overlaps none of the ranges in use, for example the next block after the highest existing end.
`useradd` gives the first regular user `100000-165535`. `usermod` accepts an overlapping range without error.

```bash
cat /etc/subuid /etc/subgid                        # ranges already in use
sudo usermod --add-subuids <START>-<END> --add-subgids <START>-<END> django     # for example 165536-231071

# Check
grep '^django:' /etc/subuid /etc/subgid            # one line in each file
```

### 3. Linger

Required: `sudo su - django` starts no systemd user session. Without linger, healthchecks never run and FreezeMan never starts.

```bash
sudo loginctl enable-linger django                 # no other change in /etc/systemd is necessary

# Check
loginctl show-user django -p Linger                # Linger=yes
```

The team runs `podman system migrate` after this.

## Acceptance checks

Run `sudo su - django`, then run this block. The first two lines make the checks independent of the team setup.
The healthcheck test pulls `docker.io/library/alpine:3`, so the host must reach `docker.io`.

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=$XDG_RUNTIME_DIR/bus

podman --version                                   # podman version 5.4 or later
podman-compose --version                           # podman-compose version 1.5 or later
grep '^django:' /etc/subuid /etc/subgid            # one line in each file
loginctl show-user django -p Linger                # Linger=yes
systemctl --user is-system-running                 # running or degraded (not a bus error)
podman info --format '{{.Host.CgroupManager}}'     # systemd
podman info --format '{{.Host.NetworkBackend}}'    # netavark

# Healthchecks need the systemd user manager
podman run -d --name hc-test --health-cmd true --health-interval 5s docker.io/library/alpine:3 sleep 60
sleep 10
podman inspect --format '{{.State.Health.Status}}' hc-test      # healthy
podman rm -f hc-test
```

## Undo

| Item | Undo command |
|---|---|
| 1. Packages | `sudo dnf remove podman-compose`, and `sudo dnf remove podman` only if `podman` was not present before step 1. Run `sudo dnf remove epel-release` and `sudo crb disable` only if step 1 added them and no other package needs them |
| 2. subuid and subgid | `sudo usermod --del-subuids <START>-<END> --del-subgids <START>-<END> django`, with the range added in step 2 |
| 3. Linger | `sudo loginctl disable-linger django` |
