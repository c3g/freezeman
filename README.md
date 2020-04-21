# C3G FreezeMan

![Travis Build Status](https://api.travis-ci.com/c3g/fms.svg?branch=master)

&copy; 2020 the Canadian Centre for Computational Genomics. Licensed under the
GNU Lesser General Public License version 3.

FreezeMan is a freezer management system designed to manage the storage and 
tracking of biological samples in a laboratory environment.

## Dependencies:

  * Python 3.6 or later
  * Django 3
  * Postgres 9.5 or later (tested on 11 and 12)
  
Python package dependencies are listed in `requirements.txt`.
  
## Running locally for development:

  1. Clone the repository
  
     ```bash
     git clone https://github.com/c3g/fms.git
     ```
  
  2. Set up a virtual environment with Python 3.6 or later, and install 
     dependencies into it:
     
     ```bash
     virtualenv -p python3 ./env
     source env/bin/activate
     pip install -r requirements.txt
     ```
     
  3. Create a database for the application to use locally in Postgres. The
     following environment variables (listed here with defaults) can be used
     to set up the Postgres connection:
     
     ```bash
     export PG_DATABASE=fms
     export PG_USER=admin
     export PG_PASSWORD=admin
     export PG_HOST=127.0.0.1
     export PG_PORT=5432
     ```
     
  4. Run any outstanding migrations:
  
     ```bash
     python ./manage.py migrate
     ```
    
  5. Run the development server:
  
     ```bash
     python ./manage.py runserver
     ```
     
## Running tests:

Make sure all database configuration has been done successfully with a user
that can create new databases (in order to create the test-specific database.)
Then, run the following command:

```bash
coverage run ./manage.py test
```

## Creating releases:

  1. Update the `VERSION` file in the repository to represent the current
     version number, according to semantic versioning.
     
  2. Tag a new release on GitHub, following the format `vX.Y.Z` where `X` is
     the major version, `Y` is the minor version, and `Z` is the patch version.

## Deploying to production:

TODO
