#!/usr/bin/env bash
set -euo pipefail
sha=${1:?Exact verified commit required}
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || exit 1
root=/opt/emcoin
incoming="$root/incoming/$sha"
next="$root/releases/$sha"
test -f "$root/shared/.deploy-ready"
test ! -L "$root/shared/.env"
test "$(stat -c '%a' "$root/shared/.env")" = 600
. /etc/os-release
test "$ID" = ubuntu && test "$VERSION_ID" = 24.04
exec 9>"$root/deploy.lock"
flock -n 9
old=$(readlink -f "$root/current")
[[ "$old" =~ ^/opt/emcoin/releases/[a-f0-9]{40}$ ]] || exit 1
test ! -e "$next" && test ! -e "$root/current-next"
cd "$incoming"
sha256sum -c SHA256SUMS
for file in runtime.yml Caddyfile; do
  cmp <(tar -xOzf release-config.tar.gz "deploy/emcoin/$file") "$old/deploy/emcoin/$file"
done
backend=$(docker inspect emcoin-backend-1 --format '{{.Config.Image}}')
web=$(docker inspect emcoin-web-1 --format '{{.Config.Image}}')
redis=$(docker inspect emcoin-redis-1 --format '{{.Id}}')
volume=$(docker inspect emcoin-backend-1 --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}')
[[ "$backend" =~ ^emcoin/backend:[a-f0-9]{40}$ ]] && [[ "$web" =~ ^emcoin/web:[a-f0-9]{40}$ ]]
test -n "$volume"
empty_backend() {
  docker exec emcoin-backend-1 node -e 'Promise.all([fetch("http://127.0.0.1:3001/health"),fetch("http://127.0.0.1:3001/metrics")]).then(async([h,r])=>{const m=await r.json();if(!h.ok||!r.ok||m.redis!==true||m.rooms!==0||m.players!==0)throw Error("gate");console.log("Empty healthy backend")}).catch(()=>{console.error("Room/storage gate refused");process.exitCode=1})' </dev/null
}
catalog_version() {
  docker exec emcoin-backend-1 node -e 'fetch("http://127.0.0.1:3001/api/catalog/active").then(async r=>{const v=(await r.json()).version;if(!r.ok||!/^catalog-[a-f0-9]{64}$/.test(v))throw Error("catalog");console.log(v)}).catch(()=>process.exitCode=1)' </dev/null
}
empty_backend
catalog=$(catalog_version)
docker load -i release-images.tar.gz
for image in "emcoin/backend:$sha" "emcoin/web:$sha"; do
  test "$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$sha"
done
install -d -m 700 "$next"
tar -xzf release-config.tar.gz -C "$next"
old_compose=(env "EMCOIN_BACKEND_IMAGE=$backend" "EMCOIN_WEB_IMAGE=$web" docker compose --env-file "$root/shared/.env" -p emcoin -f "$old/deploy/emcoin/runtime.yml")
new_compose=(env "EMCOIN_BACKEND_IMAGE=emcoin/backend:$sha" "EMCOIN_WEB_IMAGE=emcoin/web:$sha" docker compose --env-file "$root/shared/.env" -p emcoin -f "$next/deploy/emcoin/runtime.yml")
"${new_compose[@]}" config --quiet
frozen=false
changed=false
published=false
complete=false
restore() {
  status=$?
  if test "$frozen" = true && test "$complete" = false; then
    if test "$changed" = true; then
      if test "$published" = true; then
        "${new_compose[@]}" stop -t 15 web
        # Never roll backend across an admitted room or unknown storage state.
        if ! empty_backend; then
          echo 'Manual attention: ingress closed; new backend/data preserved; rollback refused'
          exit "$status"
        fi
      fi
      echo 'Restoring old backend image; existing volumes retained'
      "${old_compose[@]}" up -d --no-deps --no-build --pull never backend || exit "$status"
      ready=false
      for attempt in $(seq 1 30); do
        if empty_backend; then ready=true; break; fi
        sleep 2
      done
      test "$ready" = true || { echo 'Old backend not ready: ingress remains closed'; exit "$status"; }
    fi
    "${old_compose[@]}" up -d --no-deps --no-build --pull never web || echo 'Web restore needs operator attention'
  fi
  exit "$status"
}
trap restore EXIT
frozen=true
"${old_compose[@]}" stop -t 15 web
sleep 2
empty_backend
changed=true
"${new_compose[@]}" up -d --no-deps --no-build --pull never backend
ready=false
for attempt in $(seq 1 30); do
  if empty_backend; then ready=true; break; fi
  sleep 2
done
test "$ready" = true
test "$(catalog_version)" = "$catalog"
test "$(docker inspect emcoin-redis-1 --format '{{.Id}}')" = "$redis"
test "$(docker inspect emcoin-backend-1 --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}')" = "$volume"
published=true
"${new_compose[@]}" up -d --no-deps --no-build --pull never web
for attempt in $(seq 1 20); do
  if curl --fail --silent --show-error --max-time 5 https://app.emcoin.cloud/health >/dev/null && curl --fail --silent --show-error --max-time 5 https://app.emcoin.cloud/api/catalog/active >/dev/null; then
    printf 'EMCOIN_BACKEND_IMAGE=emcoin/backend:%s\nEMCOIN_WEB_IMAGE=emcoin/web:%s\n' "$sha" "$sha" > "$next/images.env"
    chmod 600 "$next/images.env"
    ln -s "$next" "$root/current-next"
    mv -Tf "$root/current-next" "$root/current"
    complete=true
    echo "Manual admin maintenance release $sha healthy; browser smoke still required"
    exit 0
  fi
  sleep 3
done
exit 1
