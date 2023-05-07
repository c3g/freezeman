FROM ubuntu:20.04

EXPOSE 8000
EXPOSE 9000

RUN apt-get update \
    # base
    && DEBIAN_FRONTEND=noninteractive apt-get install -y nano vim build-essential curl git bash-completion \
    # python
    && apt-get install -y python3.8 python3.8-venv python3.8-dev \
    # nodejs
    && curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs

ENTRYPOINT [ "/bin/bash" ]
