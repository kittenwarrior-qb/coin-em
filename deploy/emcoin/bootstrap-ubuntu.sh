#!/usr/bin/env bash
# Fresh-host preparation only. Does not erase projects or provision app secrets.
set -euo pipefail
test "$(id -u)" = 0
. /etc/os-release
test "$ID" = ubuntu && test "$VERSION_ID" = 24.04
if command -v docker >/dev/null && test -n "$(docker ps -aq)"; then
  echo 'Existing containers found; fresh-host bootstrap refused'
  exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y --with-new-pkgs upgrade
apt-get install -y --no-install-recommends ca-certificates curl ufw
install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
arch=$(dpkg --print-architecture)
printf 'Types: deb\nURIs: https://download.docker.com/linux/ubuntu\nSuites: noble\nComponents: stable\nArchitectures: %s\nSigned-By: /etc/apt/keyrings/docker.asc\n' "$arch" > /etc/apt/sources.list.d/docker.sources
apt-get update
apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw default deny incoming
ufw default allow outgoing
ufw --force enable
install -d -m 700 /opt/emcoin /opt/emcoin/shared /opt/emcoin/incoming /opt/emcoin/releases
docker pull redis:7-alpine
docker version --format '{{.Server.Version}}'
docker compose version
test ! -f /var/run/reboot-required || echo 'REBOOT_REQUIRED_BEFORE_RELEASE'
echo 'Host prepared; app secrets/operator readiness are not provisioned by this script'
