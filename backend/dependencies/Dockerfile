FROM postgres:12-bullseye

EXPOSE 5432

WORKDIR /usr/src/pg_fzy
COPY ./pg_fzy .

RUN apt-get update && apt-get install -y build-essential postgresql-server-dev-12

RUN make && make install
