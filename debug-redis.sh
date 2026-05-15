#!/bin/bash

echo "=== Redis Version ==="
docker exec emcoin-redis redis-cli INFO server | grep redis_version

echo -e "\n=== All Keys ==="
docker exec emcoin-redis redis-cli KEYS '*'

echo -e "\n=== Rooms Index ==="
docker exec emcoin-redis redis-cli SMEMBERS rooms:index

echo -e "\n=== Room Details ==="
for room in $(docker exec emcoin-redis redis-cli KEYS 'room:*' | grep -v 'rooms:index'); do
    echo "--- $room ---"
    docker exec emcoin-redis redis-cli GET "$room" | head -20
done

echo -e "\n=== Backend Logs (last 30 lines) ==="
docker logs emcoin-backend-prod --tail 30

echo -e "\n=== Backend Metrics ==="
curl -s http://localhost/metrics | python3 -m json.tool 2>/dev/null || curl -s http://localhost/metrics
