# Test Fix for room_not_found Issue

## Changes Made

### 1. Improved Redis Save Reliability
- Added `saveAndWait()` method to ensure Redis save completes before proceeding
- Used in `start_game` to guarantee room is saved before game starts
- Added error logging for failed Redis operations

### 2. Fixed Room Deletion Logic
- Don't delete rooms with only bots if game is `playing` status
- Keep rooms for reconnection even if all real players disconnect
- Added better logging for room deletion decisions

### 3. Improved leave_room Handler
- Check for both `playing` and `ended` status
- Mark players as disconnected instead of removing them
- Added room existence check before processing

### 4. Added Fallback for Redis Index
- If `SMEMBERS` fails, fallback to `KEYS` scan
- Handle Redis command errors gracefully

### 5. Better Logging
- Log all Redis operations (save/delete/load)
- Log room state changes
- Log reconnection attempts with room count

## Testing Steps

1. Deploy changes:
```bash
cd /app/emcoin/coin-em
git pull
make prod-rebuild
```

2. Monitor logs:
```bash
make prod-logs
```

3. Test scenario:
   - Create room
   - Add bots
   - Start game
   - Disconnect (close tab or refresh)
   - Reconnect within 2 hours
   - Should be able to rejoin

4. Check Redis:
```bash
make redis-cli
> KEYS room:*
> GET room:<roomId>
```

5. Check metrics:
```bash
make metrics
```

## Expected Behavior

- Room should be saved to Redis immediately when game starts
- Room should NOT be deleted when last real player disconnects from playing game
- Player should be able to reconnect to playing game
- Logs should show "Saved room X to Redis" after game start

## Debug Commands

```bash
# Check if room exists in Redis
docker exec emcoin-redis redis-cli KEYS 'room:*'

# Check specific room
docker exec emcoin-redis redis-cli GET room:ROOMID

# Check backend logs for Redis operations
docker logs emcoin-backend-prod 2>&1 | grep -i redis

# Check room save operations
docker logs emcoin-backend-prod 2>&1 | grep "Saved room"

# Check reconnect attempts
docker logs emcoin-backend-prod 2>&1 | grep reconnect_room
```
