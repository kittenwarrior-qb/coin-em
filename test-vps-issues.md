# Testing VPS Issues

## Issue 1: Cannot rejoin after leaving

### Expected Behavior
- User in playing game clicks "Thoát game"
- User is marked as disconnected (not removed)
- Room is kept alive (not deleted)
- User can rejoin by going back to the URL

### Current Behavior
- User leaves → room is deleted
- User tries to rejoin → "room_not_found"

### Debug Steps

1. **Check if code is deployed:**
```bash
# On VPS
cd /app/emcoin/coin-em
git log -1 --oneline
docker logs emcoin-backend-prod 2>&1 | grep "leave_room.*status:"
```

2. **Test scenario:**
```bash
# Start monitoring logs
docker logs -f emcoin-backend-prod

# In browser:
# 1. Create room
# 2. Add bots
# 3. Start game
# 4. Click menu → Thoát game
# 5. Check logs for:
#    - [leave_room] Socket ... leaving room ... (status: playing, players: ...)
#    - Should see "marked disconnected" NOT "deleted"
```

3. **Check room persistence:**
```bash
# After user leaves, check if room still exists
docker exec emcoin-redis redis-cli KEYS 'room:*'
docker exec emcoin-redis redis-cli GET room:ROOMID

# Check backend memory
curl http://localhost:3001/metrics | grep rooms
```

### Possible Causes

1. **Code not deployed** - VPS still running old code
   - Fix: `make prod-rebuild`

2. **Room status not 'playing'** - Maybe it's something else
   - Check logs for actual status value

3. **removePlayer still being called** - Logic bug
   - Check if there's another path that calls removePlayer

4. **Cleanup job deleting room** - Runs every hour
   - Check if room is considered "inactive"

### Fix Checklist

- [ ] Deploy latest code: `git pull && make prod-rebuild`
- [ ] Verify `leave_room` handler has status check
- [ ] Verify `removePlayer` doesn't delete playing rooms
- [ ] Check logs show "marked disconnected" not "deleted"
- [ ] Test: leave game → room still in Redis
- [ ] Test: rejoin → should work

---

## Issue 2: Cannot go back to previous phase

### Expected Behavior
- Narrator clicks "←" button
- Confirms "Quay lại phase trước?"
- Game goes back to previous phase
- All players see the change

### Current Behavior
- Button click → nothing happens
- Or error in console

### Debug Steps

1. **Check if code is deployed:**
```bash
# On VPS
docker exec emcoin-backend-prod grep -c "await roomRepository.saveAndWait" /app/dist/socket/handlers/gameHandlers.js

# Should return > 0 (at least 4)
```

2. **Check for errors:**
```bash
# Monitor logs
docker logs -f emcoin-backend-prod

# In browser:
# 1. Start game
# 2. Advance to next phase
# 3. Click "←" button
# 4. Click "Quay lại"
# 5. Check logs for:
#    - [prev_turn] Room ... -> Turn ..., Phase ...
#    - "Saved room ... to Redis"
```

3. **Check browser console:**
```javascript
// Open browser DevTools → Console
// Look for errors when clicking back button
```

### Possible Causes

1. **Code not compiled** - TypeScript not built
   - Fix: `make prod-rebuild`

2. **Missing await** - saveAndWait not awaited
   - Check: `grep "await.*saveAndWait" be/src/socket/handlers/gameHandlers.ts`

3. **Redis save failing** - Connection issue
   - Check: `docker logs emcoin-backend-prod | grep "Redis save error"`

4. **Frontend not sending event** - Client-side issue
   - Check: Browser console for socket events

### Fix Checklist

- [ ] Deploy latest code: `git pull && make prod-rebuild`
- [ ] Verify `prev_turn` handler has `await saveAndWait`
- [ ] Check Redis connection is stable
- [ ] Test: click back button → logs show prev_turn
- [ ] Test: phase actually changes
- [ ] Test: all players see the change

---

## Deployment Verification Script

```bash
#!/bin/bash

echo "=== VPS Deployment Verification ==="

echo -e "\n1. Git status:"
cd /app/emcoin/coin-em
git log -1 --pretty=format:"%h - %s (%cr)" --abbrev-commit

echo -e "\n\n2. Backend build date:"
docker inspect emcoin-backend-prod --format='Built: {{.Created}}'

echo -e "\n3. Check leave_room handler:"
docker exec emcoin-backend-prod grep -A 5 "leave_room.*status:" /app/dist/socket/handlers/playerHandlers.js | head -10

echo -e "\n4. Check saveAndWait usage:"
docker exec emcoin-backend-prod grep -c "saveAndWait" /app/dist/socket/handlers/gameHandlers.js

echo -e "\n5. Recent errors:"
docker logs emcoin-backend-prod 2>&1 | grep -i error | tail -5

echo -e "\n6. Redis connection:"
docker logs emcoin-backend-prod 2>&1 | grep "Redis.*Connected" | tail -1

echo -e "\n7. Current rooms:"
docker exec emcoin-redis redis-cli KEYS 'room:*'

echo -e "\n=== Recommendations ==="
if docker exec emcoin-backend-prod test -f /app/dist/socket/handlers/gameHandlers.js; then
    count=$(docker exec emcoin-backend-prod grep -c "saveAndWait" /app/dist/socket/handlers/gameHandlers.js 2>/dev/null || echo "0")
    if [ "$count" -ge "4" ]; then
        echo "✅ Code appears to be deployed correctly"
    else
        echo "❌ Code may not be deployed - run: make prod-rebuild"
    fi
else
    echo "❌ Backend not compiled - run: make prod-rebuild"
fi
```

---

## Quick Fix Commands

```bash
# Full redeploy
cd /app/emcoin/coin-em
git pull
make prod-rebuild

# Check if it worked
docker logs emcoin-backend-prod --tail 50

# Test Redis
docker exec emcoin-redis redis-cli PING

# Check metrics
curl http://localhost:3001/metrics | python3 -m json.tool
```

---

## Testing Checklist

After deployment, test these scenarios:

### Test 1: Leave and Rejoin Playing Game
1. [ ] Create room
2. [ ] Add 4 bots
3. [ ] Start game
4. [ ] Note the room URL
5. [ ] Click menu → Thoát game → Confirm
6. [ ] Should go to lobby
7. [ ] Paste room URL in browser
8. [ ] Should rejoin the game
9. [ ] Check logs: should see "marked disconnected" then "reconnect"

### Test 2: Previous Phase Navigation
1. [ ] Create room with bots
2. [ ] Start game
3. [ ] Wait for role reveal to finish
4. [ ] Click "→" to advance to next phase
5. [ ] Click "←" to go back
6. [ ] Confirm "Quay lại"
7. [ ] Should return to previous phase
8. [ ] Check logs: should see "[prev_turn]" and "Saved room"

### Test 3: Quit Confirmation
1. [ ] In any game
2. [ ] Click menu (☰)
3. [ ] Click "Thoát game"
4. [ ] Should see popup "Xác nhận thoát"
5. [ ] Click "Ở lại" → popup closes, stay in game
6. [ ] Click menu → Thoát game again
7. [ ] Click "Thoát" → go to lobby

### Test 4: Room Persistence
1. [ ] Create room with bots
2. [ ] Start game
3. [ ] Leave game (Thoát)
4. [ ] Check Redis: `docker exec emcoin-redis redis-cli KEYS 'room:*'`
5. [ ] Room should still exist
6. [ ] Check room data: `docker exec emcoin-redis redis-cli GET room:ROOMID`
7. [ ] Should show status: "playing"

---

## Common Issues and Solutions

### Issue: "Code deployed but still not working"

**Possible cause:** Browser cache

**Solution:**
```bash
# Clear browser cache
# Or open in incognito mode
# Or hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

### Issue: "Redis connection lost"

**Solution:**
```bash
docker restart emcoin-redis
docker restart emcoin-backend-prod
```

### Issue: "Room exists in Redis but backend can't find it"

**Solution:**
```bash
# Restart backend to reload from Redis
docker restart emcoin-backend-prod

# Check logs
docker logs emcoin-backend-prod | grep "Loaded.*room"
```

### Issue: "TypeScript compilation errors"

**Solution:**
```bash
cd /app/emcoin/coin-em/be
npm run build

# Check for errors
# Fix any TypeScript errors
# Then rebuild
cd ..
make prod-rebuild
```
