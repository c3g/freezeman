#!/bin/sh

docker build -t freezeman-db . \
	&& docker run --rm -it -v $(pwd)/docker-entrypoint-initdb.d:/docker-entrypoint-initdb.d -v freezeman-data:/var/lib/postgresql/data -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=fms -p 5432:5432 freezeman-db
