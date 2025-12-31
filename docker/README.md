# Usage

Current working directory is assumed to be the project's root directory.

## Prepare Database Container

```sh
podman container run --rm --name freezeman-db --publish 5432:5432 --image-volume=ignore --env "POSTGRES_PASSWORD=postgres" --detach docker.io/postgres:18.1-alpine3.23
gunzip -c "$(ls ~/Downloads/*.pgsql.gz | tail -n 1)" | podman exec --interactive freezeman-db psql -U postgres
podman exec freezeman-db psql -U postgres -c "alter role admin with password 'admin'; alter role admin createdb;"
source backend/env/bin/activate && python manage.py backend/migrate # TODO: figure out how this step would make sense with k8s
podman container commit freezeman-db # Save copy of the db before work. Only useful for dev.
```

## Prepare Backend Container

```sh
podman image build --file ./docker/Dockerfile.backend-prod --tag freezeman-backend .
```

### Prepare Frontend Container

```sh
podman image build --file ./docker/Dockerfile.frontend-prod --tag freezeman-frontend .
```

### Prepare Podman Network for Freezeman

```sh
podman network create freezeman-network
```

### Integration

```sh
podman container run --name freezeman-db       --network freezeman-network localhost/freezeman-db
podman container run --name freezeman-backend  --network freezeman-network --env 'PG_HOST=freezeman-db' localhost/freezeman-backend
podman container run --name freezeman-frontend --network freezeman-network localhost/freezeman-frontend
podman container run --name freezeman-nginx    --network freezeman-network -v $(pwd)/docker/freezeman.nginx.conf:/etc/nginx/nginx.conf:ro -p 8000:80 --rm docker.io/library/nginx:1.29.4-alpine
```