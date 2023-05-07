FROM postgres:13-bullseye

EXPOSE 5432

RUN apt-get update && apt-get install -y build-essential postgresql-server-dev-13

WORKDIR /usr/src/pg_fzy
COPY ./pg_fzy .

RUN make && make install
