<h1 align="center">
  Server Deployment checklist
</h1>

<p>
On this page we list the various steps needed for deployments. The first section contains the information pertaining to the initial deployment of the production server. The second section contains steps that need to be executed for each release. The last section contains additional steps to be performed for specific releases.
</p>


### Initial deployment



### Routine deployments
  * backup the database (pg_dumpall > backup_release_vX_X_X.pgsql)
  * Move to the repository base directory (cd ./freezeman) and checkout the release tag from the repository (git checkout vX.X.X)
  * Update the submodule pg_fzy (git submodule update --init --recursive) (if changed)
  * Move to the frontend (cd frontend) and install any new dependency (npm install) and fix security issues (npm audit fix)
  * Compile the frontend (npm build)
  * Move to the backend directory (cd ../backend) and activate the the virtual environment (. env/bin/activate)
  * Install any new dependency (pip3.8 install -r requirements.txt) (version of pip may change)
  * Install pg_fzy (cd backend/dependencies/pg_fzy && make && sudo make install) (make restore_precompiled_binary to get precompiled binaries) (if needed)
  * Move back to the backend root (cd ../..) and migrate the database (python3.8 manage.py migrate)
  * Create the first revisions for newly created models (python3.8 manage.py createinitialrevisions)
  * Serve new and modified templates (python3.8 manage.py collectstatic)
  * Activate the pg_fzy module (psql -u postgres -d fms -c "create extension fzy;")


### Specific deployments

* Version 3.1 : 
  * Upgrade python version to 3.8
  * Clone the new repository
  * Modify the nginx and uwsgi for the new locations.