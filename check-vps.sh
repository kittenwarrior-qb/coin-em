#!/bin/bash

echo "=== Checking VPS Redis & Backend ==="

echo -e "\n1. Redis Keys:"
docker exec emcoin-redis redis-cli KEYS 'room:*'

echo -e "\n2. Check room R2ARAI:"
docker exec emcoin-redis redis-cli GET room:R2ARAI | head -5

echo -e "\n3. Backend startup logs:"
docker logs emcoin-backend-prod 2>&1 | grep -A 5 "RoomRepository"

echo -e "\n4. Backend recent logs:"
docker logs emcoin-backend-prod --tail 20

echo -e "\n5. Reconnect attempt logs:"
docker logs emcoin-backend-prod 2>&1 | grep -i "reconnect_room" | tail -10

echo -e "\n6. Backend metrics:"
curl -s http://localhost:3001/metrics 2>/dev/null | python3 -m json.tool || echo "Metrics endpoint not accessible"
