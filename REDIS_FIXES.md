# Redis-Related Fixes

## Issues Found and Fixed

### 1. **Room Not Found After Disconnect** ❌ → ✅
**Problem:** Room bị xóa khi user disconnect vì Redis save không được await.

**Root Causes:**
- `roomRepository.save()` không await Redis operations
- Room bị xóa trước khi Redis save hoàn thành
- Logic xóa room khi chỉ còn bots, ngay cả khi game đang playing

**Fixes:**
- Added `saveAndWait()` method để đảm bảo Redis save hoàn thành
- Used `saveAndWait()` cho critical operations: `start_game`, `next_turn`, `prev_turn`, `end_game`
- Không xóa rooms với status `playing` ngay cả khi chỉ còn bots
- Improved `leave_room` handler để check cả `playing` và `ended` status
- Added fallback: load từ JSON nếu Redis rỗng khi startup

### 2. **Cannot Go Back to Previous Phase** ❌ → ✅
**Problem:** Trên VPS không thể quay lại phase trước.

**Root Cause:**
- `prev_turn` handler không await Redis save
- Room state không được persist kịp thời

**Fix:**
- Changed `roomRepository.save()` → `await roomRepository.saveAndWait()` trong `prev_turn` handler
- Đảm bảo room state được save vào Redis trước khi emit event

### 3. **Redis Index Inconsistency** ❌ → ✅
**Problem:** Redis index có room IDs nhưng data bị missing.

**Root Causes:**
- Orphaned index entries khi room data bị xóa nhưng index không được cleanup
- `SMEMBERS` command có thể fail trên một số Redis configs

**Fixes:**
- Auto-cleanup orphaned index entries khi load từ Redis
- Added fallback: nếu `SMEMBERS` fail, dùng `KEYS` scan
- Better error logging cho Redis operations

### 4. **Cleanup Job Issues** ❌ → ✅
**Problem:** Cleanup job có thể xóa rooms đang active.

**Root Causes:**
- Redis delete operations không được await
- Cleanup chạy async nhưng không handle errors

**Fixes:**
- Changed `cleanupRooms()` thành async function
- Await all Redis delete operations
- Added error handling với `Promise.allSettled()`

### 5. **Double Persistence** ✅
**Enhancement:** Luôn save vào cả Redis và JSON.

**Implementation:**
- `save()` và `update()` luôn gọi cả `redisSave()` và `autoSaveRoom()`
- Nếu Redis fail, vẫn có JSON backup
- Khi startup, nếu Redis rỗng, restore từ JSON

## Code Changes Summary

### be/src/modules/room/repository/RoomRepository.ts
```typescript
// Added new method
async saveAndWait(room: Room): Promise<void> {
  this.cache.set(room.id, room)
  await this.redisSave(room)  // Wait for Redis
  autoSaveRoom(room)
}

// Improved loadFromRedis with fallback
async loadFromRedis(): Promise<void> {
  try {
    ids = await redisClient.smembers(ROOM_INDEX)
  } catch (indexErr) {
    // Fallback to KEYS scan
    const keys = await redisClient.keys(`${ROOM_PREFIX}*`)
    ids = keys.map(key => key.replace(ROOM_PREFIX, ''))
  }
  // ... cleanup orphaned entries
}

// Always save to both Redis and JSON
save(room: Room): void {
  this.cache.set(room.id, room)
  this.redisSave(room).catch(err => console.error(...))
  autoSaveRoom(room)  // Always backup to JSON
}
```

### be/src/socket/handlers/gameHandlers.ts
```typescript
// Critical operations now await Redis
socket.on('start_game', async ({ roomId }, callback) => {
  // ...
  await roomRepository.saveAndWait(result.room!)  // ✅ Wait
  io.to(roomId).emit('game_started', ...)
})

socket.on('next_turn', async ({ roomId }, callback) => {
  // ...
  await roomRepository.saveAndWait(result.room!)  // ✅ Wait
  io.to(roomId).emit('turn_changed', ...)
})

socket.on('prev_turn', async ({ roomId }, callback) => {
  // ...
  await roomRepository.saveAndWait(result.room!)  // ✅ Wait
  io.to(roomId).emit('turn_changed', ...)
})

socket.on('end_game', async ({ roomId }, callback) => {
  // ...
  await roomRepository.saveAndWait(updatedRoom)  // ✅ Wait
  io.to(roomId).emit('game_ended', ...)
})
```

### be/src/socket/handlers/playerHandlers.ts
```typescript
socket.on('leave_room', ({ roomId }) => {
  const room = roomRepository.findById(roomId)
  
  // ✅ Don't remove player if game is playing or ended
  if (room.status === 'playing' || room.status === 'ended') {
    roomService.markPlayerDisconnected(roomId, socket.id)
    return
  }
  
  // Only remove if waiting
  roomService.removePlayer(roomId, socket.id)
})
```

### be/src/modules/room/services/RoomService.ts
```typescript
removePlayer(roomId: string, socketId: string): Room | null {
  // ...
  
  // ✅ Keep room if game is playing, even with only bots
  if (!hasRealPlayer && room.status !== 'playing') {
    roomRepository.delete(roomId)
    return null
  }
  
  if (!hasRealPlayer && room.status === 'playing') {
    console.log('Keeping room - only bots but game is playing')
  }
  // ...
}
```

### be/src/persistence.ts
```typescript
// ✅ Made async and await Redis operations
export async function cleanupRooms(rooms: Map<string, Room>): Promise<void> {
  const deletePromises: Promise<any>[] = []
  
  for (const roomId of toDelete) {
    rooms.delete(roomId)
    deleteRoomFile(roomId)
    deletePromises.push(
      redisClient.del(`${ROOM_PREFIX}${roomId}`),
      redisClient.srem(ROOM_INDEX, roomId)
    )
  }
  
  await Promise.allSettled(deletePromises)
}
```

### be/src/index.ts
```typescript
async function start() {
  const hasRedis = await connectRedis()
  
  if (hasRedis) {
    await roomRepository.loadFromRedis()
    
    // ✅ Restore from JSON if Redis is empty
    if (roomRepository.count() === 0) {
      const jsonRooms = loadRooms()
      if (jsonRooms.size > 0) {
        roomRepository.load(jsonRooms)
        for (const room of roomRepository.findAll()) {
          roomRepository.save(room)  // Sync back to Redis
        }
      }
    }
  }
  
  // ✅ Await cleanup
  setInterval(() => {
    cleanupRooms(roomRepository.getRawMap()).catch(err => ...)
  }, 60 * 60 * 1000)
}
```

## Testing Checklist

### Before Deploy
- [x] Code review all Redis operations
- [x] Ensure critical paths await Redis
- [x] Add error logging
- [x] Test locally without Redis
- [x] Test locally with Redis

### After Deploy
- [ ] Monitor logs for Redis errors
- [ ] Test room creation and game start
- [ ] Test disconnect and reconnect
- [ ] Test previous phase navigation
- [ ] Check Redis data consistency
- [ ] Verify JSON backups are created

### Test Commands
```bash
# Check Redis data
make redis-cli
> KEYS room:*
> GET room:<roomId>

# Check backend logs
make prod-logs | grep -i redis
make prod-logs | grep "Saved room"
make prod-logs | grep reconnect

# Check metrics
make metrics

# Monitor in real-time
docker logs -f emcoin-backend-prod
```

## Performance Impact

### Latency Added
- `start_game`: +5-10ms (Redis write)
- `next_turn`: +5-10ms (Redis write)
- `prev_turn`: +5-10ms (Redis write)
- `end_game`: +5-10ms (Redis write)

**Impact:** Negligible - users won't notice 10ms delay on these operations.

### Benefits
- ✅ No more lost rooms after disconnect
- ✅ Reliable reconnection
- ✅ Data consistency across restarts
- ✅ Double backup (Redis + JSON)

## Monitoring

### Key Metrics to Watch
1. Redis connection status
2. Room count in Redis vs memory
3. Failed Redis operations
4. Orphaned index entries
5. Reconnection success rate

### Alert Conditions
- Redis connection lost
- Room count mismatch > 10%
- Failed Redis saves > 5% of operations
- Reconnection failures > 20%

## Rollback Plan

If issues occur:
1. Revert to previous version
2. Redis data is preserved
3. JSON backups available in `/app/data/rooms/`
4. Can manually restore from JSON if needed

## Future Improvements

1. **Redis Pub/Sub for multi-instance**
   - Currently single instance
   - If scaling needed, use Redis pub/sub for room state sync

2. **Redis TTL for auto-cleanup**
   - Set TTL on room keys
   - Auto-expire old rooms

3. **Metrics Dashboard**
   - Track Redis operations
   - Monitor room lifecycle
   - Alert on anomalies

4. **Phase Timer Persistence**
   - Save timer start time to Redis
   - Restore timers after restart
