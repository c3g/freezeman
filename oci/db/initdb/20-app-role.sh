# Runs once, when the data directory is first initialized, after 10-fzy.sql.
# Create the app role of .env (Django connects as this role). It owns the database, because since
# PostgreSQL 15 only the owner can create objects in schema public (`migrate`).
# FMS_DB_CREATEDB=true (compose.dev.yaml): pytest creates its own test database.
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v app_user="$FMS_DB_USER" -v app_password="$FMS_DB_PASSWORD" -v app_createdb="${FMS_DB_CREATEDB:-false}" <<'SQL'
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_password';
\if :app_createdb
ALTER ROLE :"app_user" CREATEDB;
\endif
ALTER DATABASE :"DBNAME" OWNER TO :"app_user";
SQL
