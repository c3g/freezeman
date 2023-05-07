#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    alter user postgres with superuser;
    alter role postgres superuser;

    create database admin;
    create user admin with password 'admin';
    create database fms owner admin;
    grant all privileges on database fms to admin;

    alter user admin with superuser;
    alter role admin superuser;
    alter role admin createdb;
EOSQL

cat >"$PGDATA/pg_hba.conf" <<EOT
    # TYPE  DATABASE        USER            ADDRESS                 METHOD

    # "local" is for Unix domain socket connections only
    local   all             postgres                                trust
    local   all             admin                                   trust
    # IPv4 local connections:
    host    all             postgres        0.0.0.0/0               trust
    host    all             admin           0.0.0.0/0               md5
    # IPv6 local connections:
    host    all             all             0.0.0.0/0               ident
    # Allow replication connections from localhost, by a user with the
    # replication privilege.
    local   replication     all                                     peer
    host    replication     all             0.0.0.0/0               ident
    host    replication     all             0.0.0.0/0               ident
EOT
