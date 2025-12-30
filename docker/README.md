# Usage

```sh
podman create network freezeman-network
podman run --name freezeman-db --network freezeman-network freezeman-db:latest
podman run --name 'freezeman-backend' -v $(pwd):/app --env 'FMS_HOST=0.0.0.0' --network freezeman-network --env 'PG_HOST=freezeman-db' localhost/freezeman-backend
podman run --name freezeman-nginx --rm -v $(pwd)/docker/docker.nginx.conf:/etc/nginx/nginx.conf:ro -p 8000:80 --network freezeman-network docker.io/library/nginx:1.29.4-alpine
```