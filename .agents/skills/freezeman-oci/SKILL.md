---
name: freezeman-oci
description: "General rules for FreezeMan containers: podman over Docker, OCI file conventions, Rocky Linux 9.6 production target, status of the oci/ work. Use only to change or research oci/, Containerfiles, compose files or .containerignore, or to plan a container deployment. To run the stack, oci/README.md is sufficient."
---

## Status

- This is the first time FreezeMan adds containers. The team has no container experience in this project yet. Explain container choices in plain terms in commits and PRs.
- The work is in development on the `docker` branch. It is not on `master`. If `oci/` does not exist in the working tree, read `git show origin/docker:oci/README.md`. Do not check out or copy the branch for research.
- The layout of `oci/` is not fixed. Do not rely on file names, services or targets from memory. Read `oci/README.md` first. It is the source of truth.
- Production today runs the classic setup in `DEPLOYMENT.md` (uwsgi, nginx, PostgreSQL on the host). Containers do not replace it yet.

## Podman over Docker

- Use `podman`, `podman-compose` and `buildah`. Do not use `docker` or `docker compose` commands in files, docs or advice.
- Write for rootless podman. Do not require root, `sudo` or a Docker daemon.
- Do not add Docker-only features (for example Docker Swarm keys or `docker buildx` options). If a feature works only in Docker, tell the user.

## OCI conventions

- File names: `Containerfile` (not `Dockerfile`), `.containerignore` (not `.dockerignore`), `compose.yaml` (not `docker-compose.yml`).
- Use fully qualified image names (`docker.io/library/postgres:15`). RHEL-family hosts enforce short-name resolution.
- Tag local images under `localhost/`.
- Pin major versions to match `DEPLOYMENT.md` (Python, Node, uwsgi, PostgreSQL). Put versions in `ARG` lines.
- Add `:z` to each bind mount for SELinux. It is harmless where SELinux is absent.
- Run the app as a non-root user in the image.
- Keep config out of images. Use environment variables and a git-ignored `.env`. Commit only `.env.example`. Never commit secrets.
- Keep the stack portable to Kubernetes: one process per container, health endpoints, no host-specific paths in images.

## Production target: Rocky Linux 9.6

- The production server runs Rocky Linux 9.6. Podman and podman-compose are not installed on it yet. Do not assume they exist.
- Target the versions that Rocky 9.6 ships: podman 5.4 and buildah 1.39 (AppStream), podman-compose 1.5. Do not use newer features.
- SELinux is enforcing. Firewalld is active.
- podman-compose has no boot integration. Ask the user before you choose a boot method.
- Assume the worst case that production target is also container (thus missing systemd).

## Local checks

- Ask before a full image build or a full stack start (AGENTS.md "Safety": large containers).
- Remove test containers, images and volumes that you create.
