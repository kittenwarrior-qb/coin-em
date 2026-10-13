#!/usr/bin/env bash
set -euo pipefail
sha=${1:?Verified release SHA required}
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || exit 1
root=/opt/emcoin
incoming="$root/incoming/$sha"
next="$root/releases/$sha"
test -f "$root/shared/.deploy-ready"
test -f "$root/shared/.env" && test ! -L "$root/shared/.env"
test "$(stat -c '%a' "$root/shared/.env")" = 600
. /etc/os-release
test "$ID" = ubuntu && test "$VERSION_ID" = 24.04
exec 9>"$root/deploy.lock"
flock -n 9
test -L "$root/current"
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
[[ "$backend" =~ ^emcoin/backend:[a-f0-9]{40}$ ]] && [[ "$web" =~ ^emcoin/web:[a-f0-9]{40}$ ]]
docker load -i "$incoming/release-images.tar.gz"
for image in "emcoin/backend:$sha" "emcoin/web:$sha"; do
  test "$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$sha"
done
# Only web code may change. Compare filesystem AND execution config without
# reading container environment (which contains the admin password hash).
fingerprint='{{json .RootFS.Layers}} {{json .Config.Env}} {{json .Config.Cmd}} {{json .Config.Entrypoint}} {{json .Config.WorkingDir}} {{json .Config.User}} {{json .Config.Healthcheck}} {{json .Config.ExposedPorts}} {{json .Config.Volumes}} {{json .Config.StopSignal}} {{json .Config.Shell}} {{.Architecture}} {{.Os}}'
test "$(docker image inspect "$backend" --format "$fingerprint")" = "$(docker image inspect "emcoin/backend:$sha" --format "$fingerprint")" || { echo 'Backend changed: web-only update refused'; exit 1; }
empty_backend() {
  docker exec emcoin-backend-1 node -e 'Promise.all([fetch("http://127.0.0.1:3001/health"),fetch("http://127.0.0.1:3001/metrics")]).then(async([h,r])=>{const m=await r.json();if(!h.ok||!r.ok||m.redis!==true||m.rooms!==0||m.players!==0)throw Error("Rooms present or storage not ready");console.log("Empty healthy backend verified")}).catch(()=>{console.error("Admission/room gate refused update");process.exitCode=1})' < /dev/null
}
empty_backend
install -d -m 700 "$next"
tar -xzf release-config.tar.gz -C "$next"
old_compose=(env "EMCOIN_BACKEND_IMAGE=$backend" "EMCOIN_WEB_IMAGE=$web" docker compose --env-file "$root/shared/.env" -p emcoin -f "$old/deploy/emcoin/runtime.yml")
new_compose=(env "EMCOIN_BACKEND_IMAGE=$backend" "EMCOIN_WEB_IMAGE=emcoin/web:$sha" docker compose --env-file "$root/shared/.env" -p emcoin -f "$next/deploy/emcoin/runtime.yml")
"${new_compose[@]}" config --quiet
frozen=false
complete=false
restore_web() {
  status=$?
  if test "$frozen" = true && test "$complete" = false; then
    echo 'Restoring previous web image; backend/Redis/data untouched'
    "${old_compose[@]}" up -d --no-deps --no-build --pull never web || echo 'Web restore failed: operator attention required'
  fi
  exit "$status"
}
trap restore_web EXIT
frozen=true
"${old_compose[@]}" stop -t 15 web
# Existing backend remains alive. Closing the only public ingress prevents new
# admissions; a racing room aborts and restores ingress rather than deleting it.
sleep 2
empty_backend
"${new_compose[@]}" up -d --no-deps --no-build --pull never web
for attempt in $(seq 1 20); do
  if curl --fail --silent --show-error --max-time 5 https://app.emcoin.cloud/health >/dev/null && curl --fail --silent --show-error --max-time 5 https://app.emcoin.cloud/api/catalog/active >/dev/null; then
    printf 'EMCOIN_BACKEND_IMAGE=%s\nEMCOIN_WEB_IMAGE=%s\n' "$backend" "emcoin/web:$sha" > "$next/images.env"
    chmod 600 "$next/images.env"
    ln -s "$next" "$root/current-next"
    mv -Tf "$root/current-next" "$root/current"
    complete=true
    echo "Web-only release $sha serving HTTPS; browser smoke required"
    exit 0
  fi
  sleep 3
done
echo 'HTTPS failed: retain all data and restore previous web'
exit 1
