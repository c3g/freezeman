# Usage

```sh
podman network create freezeman-network
podman container run --name freezeman-db --network freezeman-network freezeman-db:latest
podman container run --name 'freezeman-backend' -v $(pwd):/app --env 'FMS_HOST=0.0.0.0' --network freezeman-network --env 'PG_HOST=freezeman-db' localhost/freezeman-backend
podman container run --name freezeman-nginx -v $(pwd)/docker/docker.nginx.conf:/etc/nginx/nginx.conf:ro -p 8000:80 --network freezeman-network docker.io/library/nginx:1.29.4-alpine
podman container run --name freezeman-frontend freezeman-frontend:latest
podman container cp 'freezeman-frontend:/app/frontend/dist/.' 'freezeman-nginx:/var/www/'
podman container stop freezeman-nginx
podman container restart freezeman-nginx
```