# FreezeMan - Server

FreezeMan is a freezer management system designed to manage the storage and 
tracking of biological samples in a laboratory environment.

## Table of contents

  * [Dependencies](#dependencies)
  * [Running locally for development](#running-locally-for-development)
  * [Running tests](#running-tests)
  * [Creating releases](#creating-releases)
  * [Deploying to production](#deploying-to-production)
  * [Database diagram](#database-diagram)

## Dependencies

  * Python `virtualenv`
  * Postgres 9.5 or later (tested on 11 and 12)
  * Postgres development headers
  * Make & C compiler
  
Python package dependencies are listed in `requirements.txt`.
  
## Running locally for development

  1. Set up a virtual environment with Python 3.11 or later, and install 
     dependencies into it:
     
     ```bash
     cd backend # move into backend repository directory
     virtualenv -p python3.11 ./env
     source env/bin/activate
     pip3.11 install -r requirements.txt
     ```
     
  2. Create a database for the application to use locally in Postgres. The
     following environment variables (listed here with defaults) can be used
     to set up the Postgres connection:
     
     ```bash
     export PG_DATABASE=fms
     export PG_USER=admin
     export PG_PASSWORD=admin
     export PG_HOST=127.0.0.1
     export PG_PORT=5432
     ```

  3. By default, experiment run info files are dropped into a folder in the
  project, `./backend/lims-run-info`. If you want to change that, you can create
  a `FMS_RUN_INFO_PATH` environment variable pointing to a different directory.
  For linux/Mac, this can be added to your shell configuration.

      ```bash
      FMS_RUN_INFO_PATH=~/my-lims-run-info
      export FMS_RUN_INFO_PATH
      ```
    
  4. Install the [pg_fzy](#pg_fzy) extension for the database:
  
     ```bash
     cd backend/dependencies/pg_fzy && make && sudo make install
     ```
    
  5. Run any outstanding migrations:
  
     ```bash
     python ./manage.py migrate
     ```
    
  6. Create an application superuser:
  
     ```bash
     python ./manage.py createsuperuser
     ```
    
  7. Run the development server:
  
     ```bash
     python ./manage.py runserver
     ```
     
## Running tests

Make sure all database configuration has been done successfully with a user
that can create new databases (in order to create the test-specific database.)
Then, run the following command:

```bash
coverage run ./manage.py test -v 2
```

## Creating releases

  1. Update the `VERSION` file in the repository to represent the current
     version number, according to semantic versioning.
     
  2. Squash any migrations between the last version and the new version and
     name it `vX_Y_Z` where the version reflects the new semantic version
     number stored in the `VERSION` file. There should be **at most one
     migration per version.** Do not use `.` to separate version components,
     it breaks Django for some reason.
     
  3. Tag a new release on GitHub, following the format `vX.Y.Z` where `X` is
     the major version, `Y` is the minor version, and `Z` is the patch version.

## Deploying to production

  * Use NGINX or Apache HTTPD as a reverse proxy
    * Remember to serve static and media files using the proxy instead of
      Django **for security and performance reasons**
    * Static files are collected to the application `staticfiles/` directory
    * Media files are kept in the `media/` directory
    * For example uWSGI and NGINX configurations, see `example.uwsgi.ini` and
      `example.nginx.conf` respectively
  
  * Use a WSGI server such as uWSGI or Gunicorn
  
  * Set a secret key in `settings.py` different from the default repository
    value **for security reasons**
  
  * Make sure to set `FMS_DEBUG=False` and `FMS_HOST=your.domain.org` in the
    production environment **for security reasons** and for the site to 
    function correctly

  * Set the `FMS_RUN_INFO_PATH` variable to point to a directory where Freezeman
    will output run info files to trigger run processing.
    
  * Configure the Postgres connection using any of the following environment
    variables, where the default value is not sufficient:
    
    * `PG_DATABASE`: Postgres database name. Default: `fms`
    * `PG_USER`: Postgres username. Default: `admin`
    * `PG_PASSWORD`: Postgres user password. Default: `admin`
    * `PG_HOST`: Postgres database host. Default: `localhost`
    * `PG_PORT`: Postgres database port. Default: `5432`
    
  * Any time a new version is deployed, remember to run the following
    management commands:
    
    * `./manage.py collectstatic` - Moves all static files into the
      `staticfiles/` directory
    * `./manage.py migrate` - Migrates the database to the latest version
    

## Database diagram

[Database Schema Diagram](https://dbdiagram.io/d/FMS-DB-v4-11-63691c3dc9abfc611170d64f)


## pg_fzy

The `pg_fzy` extension is a PostgreSQL C extension that implements the fzy
algorithm. To manage it, here are the useful commands, to be run in the
`./dependencies/pg_fzy` directory:

 - `make`: build the shared library (linux-x86_64 included by default)
 - `sudo make install`: install it in the postgres extension list
 - `sudo make uninstall`: remove it from the postgres extension list

When updating the extension, you might need to run `drop extension fzy;` before uninstalling it and
`create extension fzy;` after installing it.

## Updating Your Local Database

After each release, we update our local fms database with the latest data from prod.
To update, you need to drop your current fms database and import a new one from a .pgsql
file, which someone will generate post-release.

The following shell script shows an example of the steps required on a Linux system:

```
echo '<<< Drop DB fms >>>'
sudo -u postgres dropdb fms
echo '<<< Create DB fms >>>'
sudo -u postgres createdb fms
sudo -u postgres psql < /home/ufgauthi/Work/freezeman/instance/RollbackDB.pgsql
echo '<<< Set user permission >>>'
sudo -u postgres psql -d fms -c 'ALTER ROLE admin CREATEDB;'
```

On OS X, you can run these commands in the terminal (replacing the path to the .pgsql file with your own path):
```
dropdb fms
createdb fms
psql -d fms < /Users/ckostiw/Downloads/2022-05-04.pgsql 
psql -d fms -c 'ALTER ROLE admin CREATEDB;'
```
> Note: You may need to use `sudo -u <USER>` where `<USER>` is the user created
for postgres (usually named "postgres") by the postgres installer. The downloadable
installer from postgressql.org creates a 'postgres' user. If you install with
homebrew then no user is created and you can use your MacOS user without sudo.

After importing the new db data you will need to run migrations to bring the db
up to date:
```
cd backend
python ./manage.py migrate
```

To run a specific migration, this command can be used where, as an example, `0039` refers to
a specific migration file, `0039_v3_9_0.py`:
```
python ./manage.py migrate fms_core 0039
```
