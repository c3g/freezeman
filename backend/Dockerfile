FROM python:3.8.7

EXPOSE 8000

RUN apt-get update
RUN apt-get install -y build-essential postgresql-server-dev-all python3-venv netcat

RUN useradd -rm -d /home/davidlougheed -s /bin/bash -g root -G sudo -u 1001 davidlougheed
USER davidlougheed

WORKDIR /home/davidlougheed/fms

ENV VIRTUAL_ENV /home/davidlougheed/fms/env
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir uWSGI

COPY --chown=davidlougheed:root . .

ENTRYPOINT ["./entrypoint.prod.sh"]
