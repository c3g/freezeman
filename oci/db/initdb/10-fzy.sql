-- Runs once, when the data directory is first initialized.
CREATE EXTENSION IF NOT EXISTS fzy;
-- template1: every database created later (e.g. pytest's test database) gets fzy too.
\connect template1
CREATE EXTENSION IF NOT EXISTS fzy;
