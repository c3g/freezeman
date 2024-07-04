FROM docker.io/library/node:12.18.3-buster-slim as frontend-build

COPY frontend/package.json /data/freezeman/frontend/
COPY frontend/package-lock.json /data/freezeman/frontend/
WORKDIR /data/freezeman/frontend/
RUN npm ci

COPY frontend/ /data/freezeman/frontend/
RUN npm run build

FROM docker.io/library/debian:bookworm-20240612-slim

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential git python3.11-dev python3.11-venv postgresql-server-dev-15 uwsgi uwsgi-plugin-python3
 
RUN adduser django --disabled-password --no-create-home
USER django

COPY --chown=django backend/requirements.txt /data/freezeman/backend/
WORKDIR /data/freezeman/backend/

RUN python3.11 -m venv env && \
. env/bin/activate && \
pip install --no-cache-dir -r requirements.txt

COPY --chown=django . /data/freezeman

# For uwsgi.log
RUN mkdir /data/freezeman/instance

COPY nginx.conf /etc/nginx/nginx.conf
