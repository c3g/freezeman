<h1 align="center">
  Server Deployment checklist
</h1>

<p>
On this page we list the various steps needed for deployments. The first section contains the information pertaining to the initial deployment of the production server. The second section contains steps that need to be executed for each release. The last section contains additional steps to be performed for specific releases.
</p>


# Initial deployment
  * Users / group
  * Sudoers
  * Setup yum repos
    ```
    cat >/etc/yum.repos.d/nginx.repo <<EOT

      [nginx]
      name=nginx repo
      baseurl=https://nginx.org/packages/centos/\$releasever/\$basearch/
      gpgcheck=0
      enabled=1

    EOT
    ```
  * Install / setup postgress
    ```
    yum install centos-release-scl -y
    yum install https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
    yum install postgresql11-server postgresql11-devel -y
    export PATH=$PATH:/usr/pgsql-11/bin

    /usr/pgsql-11/bin/postgresql-11-setup initdb
    systemctl enable postgresql-11
    systemctl start postgresql-11
    sudo -u postgres createdb fms
    sudo -u postgres createuser admin
    echo "alter user admin with encrypted password 'XXXXXX';" | sudo -u postgres psql
    echo "grant all privileges on database fms to admin ;" | sudo -u postgres psql

    cat >/var/lib/pgsql/11/data/pg_hba.conf <<EOT

        # TYPE  DATABASE        USER            ADDRESS                 METHOD

        # "local" is for Unix domain socket connections only
        #local   all             all                                     md5
        local   all postgres peer
        # IPv4 local connections:
        host    all             all             127.0.0.1/32            md5
        # IPv6 local connections:
        host    all             all             ::1/128                 ident
        # Allow replication connections from localhost, by a user with the
        # replication privilege.
        local   replication     all                                     peer
        host    replication     all             127.0.0.1/32            ident
        host    replication     all             ::1/128                 ident

    EOT

    service postgresql-11 restart
    ```
  * Install nginx and more stuff
    ```
    yum install git -y
    yum install nginx -y
    yum install -y gcc openssl-devel bzip2-devel libffi-devel
    ```
  * Install python 3.8.7
    ```
    cd /opt
    wget https://www.python.org/ftp/python/3.8.7/Python-3.8.7.tgz
    tar xzf Python-3.8.7.tgz
    cd Python-3.8.7
    ./configure --enable-optimizations
    make altinstall #to prevent replacing the default python binary file /usr/bin/python
    /usr/local/bin/python3.8 -V
    /usr/local/bin/pip3.8 -V
    ```
  * Install uWsgi and django with pip, and llvm
    ```
    /usr/local/bin/pip3.8 install uWSGI
    /usr/local/bin/pip3.8 install djangorestframework-simplejwt
    /usr/local/bin/pip3.8 list

    yum install -y clang llvm-toolset-7

    mkdir -p /usr/lib64/llvm5.0/bin
    ln -s /opt/rh/llvm-toolset-7/root/usr/bin/llvm-lto /usr/lib64/llvm5.0/bin/
    ```
  * Configure nginx
    ```
    cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.BKP

    # Edit /etc/nginx/conf.d/default.conf add/replace the following lines:

      location / {
      root /data/freezeman/frontend/dist/;
      index index.html;
      uwsgi_read_timeout 300s;
      }

      location /static/ {
      alias /data/freezeman/backend/staticfiles/;
      }

      location /media/ {
      alias /data/freezeman/backend/media/;
      }

      location /api/ {
      include uwsgi_params;
      uwsgi_pass unix:/data/freezeman/backend/fms.sock;
      uwsgi_read_timeout 300s;
      }

      location = /favicon.ico { access_log off; log_not_found off; }

      error_page 404 /index.html;

    systemctl restart nginx
    ```
  * Install certificate

# Routine deployments
  * Backup the database (`pg_dumpall > backup_release_vX_X_X.pgsql`)
  * Kill the uwsgi processes (`ps -aux | grep uwsgi` to find, `kill -9 PROCESS_NUMBER` may need only kill the master)
  * Move to the repository base directory (`cd ./freezeman`) and checkout the release tag from the repository (`git checkout vX.X.X`)
  * Update the submodule pg_fzy (`git submodule update --init --recursive`) (if changed)
  * Move to the frontend (`cd frontend`) and install any new dependency (`npm install`) and fix security issues (`npm audit fix`)
  * Compile the frontend (`npm run build`)
  * Move to the backend directory (`cd ../backend`) and activate the the virtual environment (`. env/bin/activate`)
  * Install any new dependency (`pip3.8 install -r requirements.txt`) (version of pip may change)
  * Install pg_fzy (`cd backend/dependencies/pg_fzy && make && sudo make install`) (`make restore_precompiled_binary` to get precompiled binaries) (if needed)
  * Move back to the backend root (`cd ../..`) and migrate the database (`python3.8 manage.py migrate`)
  * Create the first revisions for newly created models (`python3.8 manage.py createinitialrevisions`)
  * Serve new and modified templates (`python3.8 manage.py collectstatic`)
  * Activate the pg_fzy module (`psql -u postgres -d fms -c "create extension fzy;"`)
  * Restart the uwsgi (`uwsgi uwsgi.ini &`)

### Notes on submodule setup
  * If the `git submodule update --init --recursive` command fails to reach the repo and set the submodule, check the inside the .git hidden directory of the repo base directory. Inside, open the config file and replace in the section [submodule "backend/dependencies/pg_fzy"], "url = git:" by "url = https:". Execute `git submodule update --init --recursive` then go into .git/modules/backend/dependencies/pg_fzy and open "config". Replace in the section [submodule "fzy_native"], "url = git:" by "url = https:". Execute `git submodule update --init --recursive` again.
  * To update submodule to latest commit, `git submodule update --remote --merge`


# Specific deployments

* Version 3.1 : 
  * Upgrade python version to 3.8
  * Clone the new repository
  * Modify the nginx and uwsgi for the new locations.
* Version 3.2 : 
  * Add FMS_SECRETKEY, FMS_ENV ("DEV", "QC", "PROD"), FMS_EMAIL_HOST, FMS_EMAIL_PORT, FMS_EMAIL_FROM, FMS_EMAIL_USER, FMS_EMAIL_USER, FMS_EMAIL_PASSWORD, FMS_EMAIL_TLS to env variables through uwsgi.ini