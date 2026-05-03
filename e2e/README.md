# E2E Tests - Multiplayer Game

Production-ready Playwright E2E tests for real-time multiplayer game.

## 📋 Test Coverage

### 1. Full Game Flow (`01-full-game-flow.spec.ts`)
- ✅ 7 players join room
- ✅ Host starts game
- ✅ All phases transition correctly
- ✅ Basic valid actions work
- ✅ UI updates for all players
- ✅ Minimum/maximum player validation

### 2. Real-time Synchronization (`02-realtime-sync.spec.ts`)
- ✅ Player join syncs across all players
- ✅ Phase changes sync immediately
- ✅ Vote actions sync in real-time
- ✅ Coin giving syncs instantly
- ✅ Rapid actions don't cause desync

### 3. Role-based Actions (`03-role-based-actions.spec.ts`)
- ✅ Only narrator can advance turn
- ✅ Only healer can heal
- ✅ Only silencer can silence
- ✅ Duplicate actions prevented
- ✅ Role-specific UI elements shown
- ✅ Other players' roles hidden

### 4. Reconnect Scenario (`04-reconnect.spec.ts`)
- ✅ Game state restored after reload
- ✅ Coins restored correctly
- ✅ Votes restored correctly
- ✅ Multiple simultaneous reconnects

### 5. Spam Prevention (`05-spam-prevention.spec.ts`)
- ✅ Rapid turn advancement prevented
- ✅ Duplicate vote submission blocked
- ✅ Duplicate coin giving blocked
- ✅ Action buttons disabled after use
- ✅ Loading state shown during processing
- ✅ Actions prevented during loading

---

## 🏗️ Architecture

### Design Patterns Used

#### 1. **Page Object Pattern** (via `PlayerContext`)
```typescript
// Encapsulates player interactions
const player = new PlayerContext('Player 1', 'user-1')
await player.joinRoom(roomId)
await player.voteForPlayer('Player 2')
```

#### 2. **Builder Pattern** (via `GameOrchestrator`)
```typescript
// Orchestrates multiple players
const orchestrator = new GameOrchestrator(browser, roomId)
const players = await orchestrator.createPlayers(7)
await orchestrator.joinRoom()
```

#### 3. **AAA Pattern** (Arrange-Act-Assert)
```typescript
// ARRANGE: Setup game state
const players = await orchestrator.createPlayers(7)

// ACT: Perform action
await narrator.advanceTurn()

// ASSERT: Verify result
expect(await orchestrator.verifyPhaseSync('night')).toBe(true)
```

#### 4. **Stub Pattern** (via `SocketWaiter`)
```typescript
// Wait for real socket events, not arbitrary timeouts
await SocketWaiter.waitForPhaseChange(page)
```

---

## 🚀 Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Run Tests
```bash
# Run all tests
npm test

# Run with UI (interactive mode)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Debug specific test
npm run test:debug -- tests/01-full-game-flow.spec.ts

# View test report
npm run test:report
```

### CI/CD Integration
```bash
# Run in CI mode (with retries)
CI=true npm test
```

---

## 📁 Project Structure

```
e2e/
├── helpers/
│   ├── GameOrchestrator.ts    # Manages multiple players
│   ├── PlayerContext.ts        # Single player interactions
│   └── SocketWaiter.ts         # Socket event helpers
│
├── tests/
│   ├── 01-full-game-flow.spec.ts
│   ├── 02-realtime-sync.spec.ts
│   ├── 03-role-based-actions.spec.ts
│   ├── 04-reconnect.spec.ts
│   └── 05-spam-prevention.spec.ts
│
├── playwright.config.ts        # Playwright configuration
├── package.json
└── README.md
```

---

## 🎯 Test Principles

### 1. **Deterministic Tests**
- ✅ Use socket event waits, not arbitrary timeouts
- ✅ Wait for specific UI elements
- ✅ Verify state before assertions

### 2. **No Backend Testing**
- ❌ Don't test business logic (covered by unit tests)
- ✅ Only test user behavior and UI correctness

### 3. **Real User Simulation**
- ✅ Each player has independent browser context
- ✅ Actions performed as real users would
- ✅ No direct API calls or shortcuts

### 4. **Maintainable Code**
- ✅ Helper functions for common operations
- ✅ Clear naming conventions
- ✅ Reusable components

---

## 🧪 Writing New Tests

### Example: Test New Feature

```typescript
import { test, expect } from '@playwright/test'
import { GameOrchestrator } from '../helpers/GameOrchestrator'

test.describe('New Feature', () => {
  let orchestrator: GameOrchestrator
  const ROOM_ID = `e2e-feature-${Date.now()}`

  test.beforeEach(async ({ browser }) => {
    orchestrator = new GameOrchestrator(browser, ROOM_ID)
  })

  test.afterEach(async () => {
    await orchestrator.cleanup()
  })

  test('should do something', async () => {
    // ARRANGE
    const players = await orchestrator.createPlayers(7)
    await orchestrator.joinRoom()
    
    // ACT
    // ... perform actions
    
    // ASSERT
    // ... verify results
  })
})
```

---

## 🐛 Debugging

### Debug Single Test
```bash
npm run test:debug -- tests/01-full-game-flow.spec.ts
```

### View Test Traces
```bash
# After test failure
npm run test:report
# Click on failed test to see trace
```

### Common Issues

#### 1. **Timeout waiting for element**
```typescript
// ❌ Bad: arbitrary timeout
await page.waitForTimeout(5000)

// ✅ Good: wait for specific element
await page.waitForSelector('[data-testid="element"]')
```

#### 2. **Flaky tests**
```typescript
// ❌ Bad: race condition
await player.advanceTurn()
const phase = await player.getCurrentPhase()

// ✅ Good: wait for phase change
await player.advanceTurn()
await player.waitForPhase('night')
const phase = await player.getCurrentPhase()
```

#### 3. **Desync between players**
```typescript
// ✅ Good: verify all players synced
await orchestrator.waitForAllPlayersPhase('night')
const synced = await orchestrator.verifyPhaseSync('night')
expect(synced).toBe(true)
```

---

## 📊 Test Reports

### HTML Report
```bash
npm run test:report
```

### JUnit Report (for CI)
```
test-results/junit.xml
```

### Screenshots & Videos
- Saved on test failure
- Located in `test-results/`

---

## 🔧 Configuration

### `playwright.config.ts`
```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,      // Sequential for game state
  workers: 1,                 // Single worker
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
})
```

---

## 🚦 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Install dependencies
        run: |
          cd e2e
          npm install
          npx playwright install
      
      - name: Start services
        run: docker compose up -d
      
      - name: Run E2E tests
        run: cd e2e && npm test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

---

## 📝 Best Practices

### DO ✅
1. Use `data-testid` attributes for selectors
2. Wait for socket events, not arbitrary timeouts
3. Clean up resources in `afterEach`
4. Test user behavior, not implementation
5. Keep tests independent and isolated

### DON'T ❌
1. Test backend logic (use unit tests)
2. Use CSS selectors that may change
3. Share state between tests
4. Make direct API calls
5. Use arbitrary `waitForTimeout`

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

**Status**: Production Ready ✅  
**Coverage**: 5 test suites, 25+ test cases  
**Maintainability**: High (using design patterns)
