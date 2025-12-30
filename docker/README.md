# Usage

```sh
podman create network freezeman-network
podman run --name freezeman-db --network freezeman-network freezeman-db:latest
podman run --name 'freezeman-backend' -p 8000:8000 -v $(FM_ROOT):/app --env 'FMS_HOST=0.0.0.0' --network freezeman-network --env 'PG_HOST=freezeman-db' localhost/freezeman-backend
```