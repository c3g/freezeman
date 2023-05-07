#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    alter user admin with encrypted password 'admin';
    alter role admin createdb;
    grant all privileges on database fms to admin;
EOSQL

cat >"$PGDATA/pg_hba.conf" <<EOT
    # TYPE  DATABASE        USER            ADDRESS                 METHOD

    # "local" is for Unix domain socket connections only
    local   all             postgres                                trust
    local   all             admin                                   trust
    # IPv4 local connections:
    host    all             all             0.0.0.0/0               md5
    # IPv6 local connections:
    host    all             all             0.0.0.0/0               ident
    # Allow replication connections from localhost, by a user with the
    # replication privilege.
    local   replication     all                                     peer
    host    replication     all             0.0.0.0/0               ident
    host    replication     all             0.0.0.0/0               ident
EOT
