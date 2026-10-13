#!/usr/bin/env bash
set -euo pipefail
release_sha=${1:?Exact tested GitHub commit required}
[[ "$release_sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid release SHA'; exit 1; }
app_root=/opt/emcoin
incoming="$app_root/incoming/$release_sha"
release_dir="$app_root/releases/$release_sha"
test -f "$app_root/shared/.deploy-ready" || { echo 'Operator prerequisites not approved'; exit 1; }
test -f "$app_root/shared/.env"
test ! -L "$app_root/shared/.env"
test "$(stat -c '%a' "$app_root/shared/.env")" = 600
. /etc/os-release
test "$ID" = ubuntu && test "$VERSION_ID" = 24.04 || { echo 'Ubuntu 24.04 required'; exit 1; }
exec 9>"$app_root/deploy.lock"
flock -n 9 || { echo 'Another release is running'; exit 1; }
cd "$incoming"
sha256sum -c SHA256SUMS
test ! -e "$release_dir" || { echo 'Release path already exists; inspect previous attempt'; exit 1; }
install -d -m 700 "$release_dir"
tar -xzf release-config.tar.gz -C "$release_dir"
cd "$release_dir/deploy/emcoin"
export EMCOIN_BACKEND_IMAGE="emcoin/backend:$release_sha"
export EMCOIN_WEB_IMAGE="emcoin/web:$release_sha"
compose=(docker compose --env-file "$app_root/shared/.env" -p emcoin -f runtime.yml)
"${compose[@]}" config --quiet
backend_id=$(docker ps -aq --filter label=com.docker.compose.project=emcoin --filter label=com.docker.compose.service=backend)
if test -n "$backend_id"; then
  echo 'Existing deployment requires a tested admission-freeze/drain procedure; automatic update refused'
  exit 1
fi
docker load -i "$incoming/release-images.tar.gz"
for release_image in "$EMCOIN_BACKEND_IMAGE" "$EMCOIN_WEB_IMAGE"; do
  test "$(docker image inspect "$release_image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$release_sha"
done
docker image inspect redis:7-alpine >/dev/null
"${compose[@]}" run --rm --no-deps backend node -e 'const {CatalogStore}=require("./dist/catalog/CatalogStore"); const {initializeFreshCatalog}=require("./dist/catalog/initializeFreshCatalog"); const store=new CatalogStore(process.env.EMCOIN_CATALOG_DB); try{console.log(JSON.stringify(initializeFreshCatalog(store)))}finally{store.close()}' < /dev/null
"${compose[@]}" up -d --no-build --pull never
healthy=false
for attempt in $(seq 1 30); do
  if "${compose[@]}" exec -T backend wget -q --spider http://127.0.0.1:3001/health; then healthy=true; break; fi
  sleep 2
done
test "$healthy" = true || { echo 'Backend health failed; preserve data and inspect'; exit 1; }
"${compose[@]}" exec -T web test -s /srv/index.html
curl --fail --silent --show-error --max-time 30 https://app.emcoin.cloud/health >/dev/null
curl --fail --silent --show-error --max-time 30 https://app.emcoin.cloud/api/catalog/active >/dev/null
ln -s "$release_dir" "$app_root/current-next"
mv -Tf "$app_root/current-next" "$app_root/current"
echo "Release $release_sha passed process/HTTPS checks; gameplay smoke still required"
