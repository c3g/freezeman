#!/bin/sh

set -e

# install deb packages
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y gnupg curl ca-certificates

# include deadsnakes to repo list
echo -e 'deb https://ppa.launchpadcontent.net/deadsnakes/ppa/ubuntu focal main\ndeb-src https://ppa.launchpadcontent.net/deadsnakes/ppa/ubuntu focal main' >> /etc/apt/sources.list
apt-key adv --keyserver keyserver.ubuntu.com --recv-keys F23C5A6CF475977595C89F51BA6932366A755776

# inlude node to repo list
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -

# install deb packages
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y vim build-essential git bash-completion \
	postgresql-client-12 postgresql-server-dev-12 \
	python3.11 python3.11-venv python3.11-dev \
	nodejs \
#	openssh-client openssh-server \

# setup ssh server with username and password 'root'
# mkdir /var/run/sshd
# echo 'root:root' | chpasswd
# useradd -m test
# passwd -d test
# sed -i'' -e's/^#PermitRootLogin prohibit-password$/PermitRootLogin yes/' /etc/ssh/sshd_config \
#     && sed -i'' -e's/^#PasswordAuthentication yes$/PasswordAuthentication yes/' /etc/ssh/sshd_config \
#     && sed -i'' -e's/^#PermitEmptyPasswords no$/PermitEmptyPasswords yes/' /etc/ssh/sshd_config \
#     && sed -i'' -e's/^UsePAM yes/UsePAM no/' /etc/ssh/sshd_config
# cat >> /etc/ssh/sshd_config <<EOF
# PermitRootLogin yes
# PasswordAuthentication yes
# PermitEmptyPasswords yes
# UsePAM no
# EOF
# /usr/sbin/sshd -D
