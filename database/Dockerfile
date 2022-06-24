FROM postgres:13.7-bullseye

EXPOSE 5432

RUN apt-get update
RUN apt-get install -y build-essential postgresql-server-dev-13

WORKDIR /usr/src/pg_fzy
COPY ./pg_fzy .

RUN make
RUN make install