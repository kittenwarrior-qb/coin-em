# 🚀 EMCOIN GAME — Quick Start Guide

## What Changed?

The game has been refactored with critical fixes for phase management, persistence, and anti-spam protection.

### Key Improvements
- ✅ **9-Phase Flow** — Server controls all phase transitions
- ✅ **Voting System** — Tracks votes, auto-detects completion
- ✅ **Coin Limits** — Max 1 of each type per person
- ✅ **Night Idempotency** — No duplicate actions
- ✅ **Persistence** — Rooms survive server restarts
- ✅ **Rate Limiting** — Prevents spam
- ✅ **Auto-Advance** — Phases timeout automatically

---

## Running the Game

### Backend
```bash
cd be
npm install
npm run dev
```
Server runs on `http://localhost:3001`

### Frontend
```bash
cd fe
npm install
npm run dev
```
Client runs on `http://localhost:5173`

---

## Game Flow (9 Phases)

1. **role-reveal** — Players see their roles
2. **night** — Night actions (silence, heal, select card)
   - Auto-advances after 60 seconds
3. **day-draw** — NTG draws situation card
4. **day-emotion** — NTG selects emotion card
5. **day-story** — NTG tells story
6. **reflection** — Players select reflection cards
7. **selfcare** — Players select selfcare cards
8. **guess-role** — Players vote on roles
   - Auto-advances after 120 seconds
9. **reward** — Players give coins
   - Auto-advances after 90 seconds
   - Returns to phase 1 for next round

---

## New Features

### Voting (Phase: guess-role)
- Each player votes once
- Cannot vote twice
- When all vote, `voting_complete` event fires
- Votes stored in `room.votes`

### Coin Limits (Phases: day-draw → selfcare)
- Max 1 red coin per person
- Max 1 yellow coin per person
- Max 1 green coin per person
- Resets each round

### Night Actions (Phase: night)
- **Silencer** — Can silence once per night
- **Healer** — Can heal once per night
- **Guide** — Can select selfcare card once per night
- Duplicate actions return `ACTION_ALREADY_DONE`

### Persistence
- Rooms auto-save to `be/data/rooms.json`
- Loaded on server startup
- Cleanup runs every hour (removes old/empty rooms)

### Rate Limiting
- `night_action` — 1 per second
- `give_coin` — 1 per second
- `submit_vote` — 1 per 2 seconds
- Returns `RATE_LIMITED` error when exceeded

### Auto-Advance
- **night** — 60 seconds
- **guess-role** — 120 seconds
- **reward** — 90 seconds
- Narrator can still manually advance

---

## API Changes

### Socket Events (No Breaking Changes)

**Existing events still work:**
- `join_room`
- `start_game`
- `next_turn`
- `night_action`
- `give_coin`
- `submit_vote`
- `end_game`

**New events emitted:**
- `voting_complete` — When all players vote
  ```typescript
  { votes: Record<string, string> }
  ```

**New error codes:**
- `RATE_LIMITED` — Too many requests
- `ACTION_ALREADY_DONE` — Night action already performed
- `COIN_LIMIT_REACHED` — Coin limit exceeded
- `NOT_VOTE_PHASE` — Not in voting phase
- `ALREADY_VOTED` — Already voted

---

## Testing

### Quick Test Scenario
1. Create room with 7 players (use "Add Fake Players" button)
2. Start game
3. Advance through phases using "Next Turn" button
4. Try to give 2 red coins to same person (should fail)
5. Try to silence twice in night (should fail)
6. Wait for auto-advance (60s in night phase)
7. Restart server, verify room still exists

### Check Persistence
```bash
cat be/data/rooms.json
```

### Check Logs
Backend logs show:
- `[Persistence] Loaded X room(s) from disk`
- `[PhaseTimer] Starting timer for room...`
- `[RateLimit] Blocked action from...`
- `[Cleanup] Completed. Active rooms: X`

---

## Configuration

### Adjust Phase Timeouts
Edit `be/src/modules/game/PhaseTimer.ts`:
```typescript
const PHASE_TIMEOUTS = {
  night: 60_000,        // Change to 30_000 for 30s
  'guess-role': 120_000,
  reward: 90_000,
}
```

### Adjust Rate Limits
Edit `be/src/socket/handlers/gameHandlers.ts`:
```typescript
rateLimitAction(socket, 'give_coin', 1000) // Change to 500 for 0.5s
```

### Adjust Cleanup Interval
Edit `be/src/index.ts`:
```typescript
setInterval(() => {
  cleanupRooms(roomRepository.getRawMap())
}, 60 * 60 * 1000) // Change to 30 * 60 * 1000 for 30 min
```

---

## Troubleshooting

### "Room not found" after server restart
- Check if `be/data/rooms.json` exists
- Verify file has valid JSON
- Check server logs for persistence errors

### Phase not advancing
- Check if phase has timeout (only night, guess-role, reward)
- Verify narrator can manually advance with "Next Turn"
- Check server logs for timer errors

### "RATE_LIMITED" error
- Wait 1-2 seconds between actions
- Check if multiple clients using same socket
- Verify rate limiter cleanup is running

### Votes not tracking
- Verify in `guess-role` phase
- Check `room.votes` in server logs
- Ensure all players have unique userId

---

## File Structure

```
be/src/
├── index.ts                          # Main server + cleanup scheduler
├── persistence.ts                    # Load/save rooms to disk
├── modules/
│   ├── game/
│   │   ├── types/index.ts           # Extended types (9 phases, votes, etc)
│   │   ├── engine/
│   │   │   ├── GameEngine.ts        # Phase logic, vote tracking
│   │   │   ├── ActionValidator.ts   # Idempotency, coin limits
│   │   │   ├── StateMachine.ts      # 9 phase transitions
│   │   │   └── TurnManager.ts       # Phase-based turn logic
│   │   └── PhaseTimer.ts            # Auto-advance timers
│   └── room/
│       └── repository/
│           └── RoomRepository.ts    # Persistence integration
└── socket/
    ├── middleware/
    │   └── rateLimiter.ts           # Rate limiting
    └── handlers/
        └── gameHandlers.ts          # Timer + rate limit integration

fe/src/
├── stores/
│   └── types.ts                     # Updated GamePhase type
└── hooks/
    ├── useSocket.ts                 # Phase sync logic
    └── useGameFlow.ts               # Removed local nextStep
```

---

## Support

### Check Server Logs
```bash
cd be
npm run dev
# Watch for [Persistence], [PhaseTimer], [RateLimit] logs
```

### Check Room State
Add to backend:
```typescript
app.get('/debug/rooms', (req, res) => {
  const rooms = roomRepository.findAll()
  res.json(rooms)
})
```
Visit: `http://localhost:3001/debug/rooms`

### Reset Everything
```bash
# Stop servers
# Delete persisted data
rm be/data/rooms.json
# Restart servers
```

---

## Next Steps

### Optional Enhancements (Phase 3)
- Player disconnect timeout (2 min grace period)
- State versioning (optimistic update guard)
- Split useSocket into smaller hooks
- Add Winston structured logging
- Redis for multi-instance scaling

### Current Status
✅ Phase 1 (Critical) — Complete  
✅ Phase 2 (High Priority) — Complete  
⏸️ Phase 3 (Medium Priority) — Optional  
⏸️ Phase 4 (Low Priority) — Future

---

## Summary

The refactor is **production-ready** for the core game loop. All critical issues have been resolved:
- No more phase mismatch
- No more lost state on reload
- No more coin spam
- No more duplicate night actions
- No more stuck games

Enjoy building with the improved EMCOIN game! 🎮
