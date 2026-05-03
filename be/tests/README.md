# Test Suite Documentation

## 📁 Structure

```
tests/
├── unit/              # Unit tests for core game logic
├── integration/       # Socket.IO integration tests
├── advanced/          # Load, stress, persistence tests
├── bot/              # Bot simulation for E2E testing
├── builders/         # Test data builders (NEW)
├── assertions/       # Custom assertions (NEW)
├── helpers/          # Mock data helpers
└── utils/            # Test utilities (Scenarios, Logger, Reporter)
```

## 🏗️ Test Builders (NEW)

Builders provide a fluent API for creating test data with flexible configuration.

### RoomBuilder

Create test rooms with custom configuration:

```typescript
import { RoomBuilder } from '../builders/RoomBuilder'
// or
import { aRoom } from '../builders'

// Simple room
const room = new RoomBuilder()
  .withPlayers(7)
  .build()

// Playing room in specific phase
const room = new RoomBuilder()
  .withPlayers(7)
  .asPlaying()
  .inPhase('silencer-turn')
  .withNightActions({ healed: true })
  .build()

// Room with custom players
const silencer = new PlayerBuilder().asSilencer().build()
const healer = new PlayerBuilder().asHealer().build()

const room = new RoomBuilder()
  .withCustomPlayers([silencer, healer])
  .asPlaying()
  .inPhase('healer-turn')
  .build()

// Room with votes
const room = new RoomBuilder()
  .withPlayers(7)
  .asPlaying()
  .inPhase('guess-silencer')
  .withVotes({ 'user-1': 'user-2', 'user-3': 'user-4' })
  .build()
```

### PlayerBuilder

Create test players with specific roles and coins:

```typescript
import { PlayerBuilder } from '../builders/PlayerBuilder'
// or
import { aPlayer } from '../builders'

// Simple player
const player = new PlayerBuilder()
  .withUserId('player-1')
  .withName('Alice')
  .build()

// Player with specific role
const silencer = new PlayerBuilder()
  .withUserId('silencer-1')
  .asSilencer()
  .build()

const healer = new PlayerBuilder()
  .asHealer()
  .withYellowCoins(10)
  .build()

// Narrator
const narrator = new PlayerBuilder()
  .asNarrator()
  .build()

// Sender (NTG)
const sender = new PlayerBuilder()
  .asSender()
  .withGreenCoins(5)
  .build()

// Player with custom coins
const richPlayer = new PlayerBuilder()
  .withCoins({ red: 5, yellow: 20, green: 10 })
  .build()
```

## ✅ Custom Assertions (NEW)

Fluent assertions for readable test expectations.

### GameResultAssertion

Assert on game engine results:

```typescript
import { assertThat } from '../assertions'

const result = engine.startGame(room)

// Chain assertions
assertThat(result)
  .isSuccessful()
  .hasStatus('playing')
  .hasPhase('role-reveal')
  .allPlayersHaveRoles()
  .hasPlayerCount(7)

// Check errors
assertThat(result)
  .hasFailed()
  .hasError('NOT_ENOUGH_PLAYERS')

// Check game state
assertThat(result)
  .hasNarrator('user-1')
  .hasSender('user-2')
  .hasMutedPlayer('user-3')
  .hasHealedPlayer('user-4')

// Check night actions
assertThat(result)
  .hasNightAction('silenced', true)
  .hasNightAction('healed', false)

// Check votes
assertThat(result)
  .hasVoteCount(7)
  .playerVotedFor('voter-1', 'suspect-1')
  .shouldAutoAdvance()

// Check coins
assertThat(result)
  .playerHasCoins('user-1', { red: 3, yellow: 7, green: 0 })
  .playerHasRole('user-1', Role.NARRATOR)

// Check coin tracking
assertThat(result)
  .redCoinGiven('giver-1', 'receiver-1', 1)
  .yellowCoinGiven('giver-1', 'receiver-1', 2)
```

### CoinAssertion

Assert on coin amounts:

```typescript
import { assertCoins } from '../assertions'

const coins = player.coins

assertCoins(coins)
  .hasRed(3)
  .hasYellow(7)
  .hasGreen(0)
  .hasTotal(10)
```

## 📝 Parameterized Tests

Use `it.each` for testing multiple scenarios:

```typescript
describe('startGame', () => {
  // Test valid player counts
  it.each([
    { count: 5, description: 'minimum' },
    { count: 7, description: 'normal' },
    { count: 10, description: 'maximum' },
  ])('should start game with $count players ($description)', ({ count }) => {
    const room = new RoomBuilder()
      .withPlayers(count)
      .build()

    const result = engine.startGame(room)

    assertThat(result)
      .isSuccessful()
      .hasStatus('playing')
      .hasPlayerCount(count)
  })

  // Test invalid player counts
  it.each([
    { count: 4, error: 'NOT_ENOUGH_PLAYERS', description: 'too few' },
    { count: 11, error: 'TOO_MANY_PLAYERS', description: 'too many' },
  ])('should reject $count players ($description)', ({ count, error }) => {
    const room = new RoomBuilder()
      .withPlayers(count)
      .build()

    const result = engine.startGame(room)

    assertThat(result)
      .hasFailed()
      .hasError(error)
  })
})
```

## 🎯 Test Patterns

### AAA Pattern (Arrange-Act-Assert)

Always structure tests in three clear sections:

```typescript
it('should silence a player during silencer-turn phase', () => {
  // Arrange
  const silencer = new PlayerBuilder()
    .withUserId('silencer-1')
    .asSilencer()
    .build()

  const target = new PlayerBuilder()
    .withUserId('target-1')
    .build()

  const room = new RoomBuilder()
    .withCustomPlayers([silencer, target])
    .asPlaying()
    .inPhase('silencer-turn')
    .build()

  // Act
  const result = engine.executeAction(room, {
    type: 'SILENCE',
    actorId: silencer.userId,
    targetId: target.userId,
  })

  // Assert
  assertThat(result)
    .isSuccessful()
    .hasMutedPlayer(target.userId)
    .hasNightAction('silenced', true)
})
```

### BDD Style Naming

Use descriptive test names that explain behavior:

```typescript
describe('When starting a game', () => {
  describe('with valid player count', () => {
    it('starts successfully with 5-10 players', () => {})
  })
  
  describe('with invalid player count', () => {
    it('rejects when less than 5 players', () => {})
    it('rejects when more than 10 players', () => {})
  })
})

describe('When silencer acts', () => {
  describe('during silencer-turn phase', () => {
    it('silences target player successfully', () => {})
    it('prevents silencing self', () => {})
  })
  
  describe('during other phases', () => {
    it('rejects action with phase error', () => {})
  })
})
```

## 🚀 Running Tests

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Bot simulation
npm run test:bot

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific test file
npm run test:unit -- GameEngine.refactored

# Advanced tests
npm run test:advanced
npm run test:concurrent
npm run test:persistence
npm run test:load
npm run test:reconnect
```

## 📊 Test Coverage

Current coverage targets:
- Unit tests: 90%+
- Integration tests: 80%+
- E2E (bot): Full game flow

Run coverage report:
```bash
npm run test:coverage
```

View HTML report:
```bash
open be/coverage/index.html
```

## 🔍 Debugging Tests

### Enable debug logging
```bash
LOG_LEVEL=DEBUG npm run test:bot
```

### Run single test
```typescript
it.only('should test specific behavior', () => {
  // This test will run alone
})
```

### Skip test
```typescript
it.skip('should test something later', () => {
  // This test will be skipped
})
```

## 📚 Examples

See these files for examples:
- `tests/unit/GameEngine.refactored.test.ts` - Refactored with new patterns
- `tests/unit/CoinRewards.test.ts` - Comprehensive coin system tests
- `tests/unit/GameEngine.test.ts` - Original tests (for comparison)

## 🎓 Best Practices

1. **Use Builders** - Always use builders instead of manual object creation
2. **Use Assertions** - Use fluent assertions for readability
3. **Parameterize** - Use `it.each` for similar test cases
4. **AAA Pattern** - Structure tests clearly
5. **BDD Naming** - Use descriptive test names
6. **One Assertion** - Focus each test on one behavior
7. **No Magic Values** - Use constants or builders
8. **Clean Setup** - Use `beforeEach` for common setup

## 🐛 Common Issues

### Issue: Players don't have roles
**Solution:** Use `.asPlaying()` on RoomBuilder

```typescript
const room = new RoomBuilder()
  .withPlayers(7)
  .asPlaying() // ← This assigns roles
  .build()
```

### Issue: Room has no narrator/sender
**Solution:** Ensure room has at least 2 players when playing

```typescript
const room = new RoomBuilder()
  .withPlayers(7) // ← At least 2 players
  .asPlaying()
  .build()
```

### Issue: Test fails with "Not a silencer"
**Solution:** Ensure player has correct role

```typescript
const silencer = new PlayerBuilder()
  .asSilencer() // ← Set role explicitly
  .build()
```

## 📖 Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Test Doubles](https://martinfowler.com/bliki/TestDouble.html)
- [Builder Pattern](https://refactoring.guru/design-patterns/builder)
- [Fluent Assertions](https://fluentassertions.com/)
