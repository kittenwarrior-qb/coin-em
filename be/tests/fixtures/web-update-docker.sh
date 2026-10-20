#!/usr/bin/env bash
set -euo pipefail
state=/opt/emcoin/test-state
old=1111111111111111111111111111111111111111
next=2222222222222222222222222222222222222222
case "$1" in
 inspect)
  if test "$2" = emcoin-backend-1; then echo "emcoin/backend:$old"; else echo "emcoin/web:$old"; fi ;;
 image)
  if [[ "$5" = *org.opencontainers.image.revision* ]]; then echo "$next"
  elif test "$TEST_CASE" = backend-change && test "$3" = "emcoin/backend:$next"; then echo different-backend
  else echo identical-filesystem-and-config; fi ;;
 load) echo load >> "$state/events" ;;
 exec)
  if test "$TEST_CASE" = occupied || test "$TEST_CASE" = storage-unavailable || { test "$TEST_CASE" = race && test -f "$state/frozen"; }; then exit 1; fi
  echo empty >> "$state/events" ;;
 compose)
  test "$EMCOIN_BACKEND_IMAGE" = "emcoin/backend:$old"
  for arg in "$@"; do
   if test "$arg" = stop; then touch "$state/frozen"; echo stop-web >> "$state/events"; exit 0; fi
   if test "$arg" = up; then test "${*: -1}" = web; echo "up-$EMCOIN_WEB_IMAGE" >> "$state/events"; exit 0; fi
  done ;;
 *) echo 'Unexpected mock command' >&2; exit 1 ;;
esac
