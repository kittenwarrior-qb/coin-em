import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSocket } from '../../hooks/useSocket'
import { useGameStore } from '../../stores/gameStore'
import { CARD_DATA } from '@/constants/cardCatalog'

const mock = vi.hoisted(() => ({ handlers: new Map<string, (...args: unknown[]) => void>(),
  emit: vi.fn(), disconnect: vi.fn(), connected: true, id: 'current-socket' }))
vi.mock('socket.io-client', () => ({ io: () => ({ get id() { return mock.id },
  timeout: () => ({ emit: mock.emit }),
  get connected() { return mock.connected }, emit: mock.emit, disconnect: mock.disconnect,
  on: (event: string, callback: (...args: unknown[]) => void) => { mock.handlers.set(event, callback) },
}) }))

const session = { roomId: 'session-room', userName: 'Guest', userId: 'guest-1', deviceId: 'device-1',
  sessionToken: 'fixture-token', status: 'playing' }
const originalSetGameStep = useGameStore.getState().setGameStep

describe('guest session frontend transport', () => {
  it('retries an ACK-lost round-limit command with identical request ID/revision and consumes confirmed state', async () => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const hook = renderHook(() => useSocket())
    const waiting = { id: session.roomId, status: 'waiting', phase: 'role-reveal', revision: 7, currentRound: 0, players: [], roundLimit: null }
    act(() => mock.handlers.get('room_state')!(waiting))
    let first!: Promise<boolean>
    act(() => { first = hook.result.current.updateRoundLimit(session.roomId, 1) })
    const original = mock.emit.mock.calls.find(call => call[0] === 'set_round_limit')!
    await act(async () => { original[2](new Error('timeout')); expect(await first).toBe(false) })
    let second!: Promise<boolean>
    act(() => { second = hook.result.current.updateRoundLimit(session.roomId, 1) })
    const retry = mock.emit.mock.calls.filter(call => call[0] === 'set_round_limit')[1]
    expect(retry[1]).toEqual(original[1])
    await act(async () => { retry[2](null, { success: true, data: { ...waiting, revision: 8, roundLimit: 1 } }); expect(await second).toBe(true) })
    expect(hook.result.current.roomState?.roundLimit).toBe(1)
  })
  beforeEach(() => { localStorage.clear(); mock.handlers.clear(); mock.emit.mockReset(); mock.disconnect.mockReset(); mock.connected = true; mock.id = 'current-socket' })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    // Restore the real method retained in Zustand's merged snapshot, not its spy history.
    useGameStore.setState({ setGameStep: originalSetGameStep })
  })

  const phaseRoom = (phaseInstance = 'phase-1', revision = 1) => ({
    id: session.roomId, status: 'playing', phase: 'emotion-card', phaseInstance,
    currentRound: 1, revision, players: [{ userId: session.userId, socketId: 'current-socket', name: 'Guest' }],
  })
  const preparePhase = () => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const hook = renderHook(() => useSocket())
    act(() => mock.handlers.get('room_state')!(phaseRoom()))
    return hook
  }

  it('applies admitted snapshots/reflections/responses without logging private fields or raw errors', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = preparePhase()
    const privateMessage = 'synthetic-private-reflection-content'
    const privateName = 'synthetic-private-name'
    act(() => mock.handlers.get('response_received')!({ actorName: privateName, message: privateMessage,
      room: { ...phaseRoom('phase-1', 2), responses: { [session.userId]: privateMessage } } }))
    expect(result.current.roomState?.revision).toBe(2)
    act(() => mock.handlers.get('reflection_shared')!({ ntgName: privateName, message: privateMessage,
      room: { ...phaseRoom('phase-1', 3), reflection: privateMessage } }))
    expect(result.current.roomState?.revision).toBe(3)
    act(() => mock.handlers.get('error')!({ code: 'synthetic-error', message: privateMessage,
      sessionToken: 'synthetic-private-token' }))
    const encoded = JSON.stringify([...debug.mock.calls, ...error.mock.calls])
    for (const denied of [privateMessage, privateName, 'synthetic-private-token', session.roomId,
      session.userId, session.sessionToken, 'current-socket']) expect(encoded).not.toContain(denied)
    expect(debug).toHaveBeenCalledWith(JSON.stringify({ version: 'socket-diagnostic/v1', event: 'reflection_shared', severity: 'info' }))
  })

  it('ignores a closed older room without clearing the current room or saved session', () => {
    const { result } = preparePhase()
    mock.emit.mockClear()
    act(() => mock.handlers.get('room_closed')!({ roomId: 'older-room' }))
    expect(result.current.roomState?.id).toBe(session.roomId)
    expect(JSON.parse(localStorage.getItem('emcoin_session')!)).toEqual(session)
    expect(mock.emit).not.toHaveBeenCalled()
  })
  it('clears only the matching admitted room once and ignores duplicate terminal events', () => {
    const { result } = preparePhase()
    mock.emit.mockClear()
    act(() => mock.handlers.get('room_closed')!({ roomId: session.roomId }))
    expect(result.current.roomState).toBeNull()
    expect(localStorage.getItem('emcoin_session')).toBeNull()
    expect(mock.emit).toHaveBeenCalledOnce()
    expect(mock.emit).toHaveBeenCalledWith('list_rooms')
    act(() => mock.handlers.get('room_closed')!({ roomId: session.roomId }))
    expect(mock.emit).toHaveBeenCalledOnce()
  })
  it('does not erase a newer saved session while clearing an older admitted room', () => {
    const { result } = preparePhase()
    const replacement = { ...session, roomId: 'newer-room', sessionToken: 'newer-fixture-token' }
    localStorage.setItem('emcoin_session', JSON.stringify(replacement))
    act(() => mock.handlers.get('room_closed')!({ roomId: session.roomId }))
    expect(result.current.roomState).toBeNull()
    expect(JSON.parse(localStorage.getItem('emcoin_session')!)).toEqual(replacement)
  })
  it.each([null, {}, { roomId: '../outside' }, { roomId: 17 }])('ignores malformed terminal event %j', payload => {
    const { result } = preparePhase()
    mock.emit.mockClear()
    act(() => mock.handlers.get('room_closed')!(payload))
    expect(result.current.roomState?.id).toBe(session.roomId)
    expect(JSON.parse(localStorage.getItem('emcoin_session')!)).toEqual(session)
    expect(mock.emit).not.toHaveBeenCalled()
  })

  it.each(['SELECT_CARD', 'SELECT_SELFCARE_CARD'] as const)('sends only frozen card ID for %s, retaining bounded confirmation and canonical server projection', async type => {
    const { result } = preparePhase()
    const card = type === 'SELECT_CARD' ? CARD_DATA.emotion[0] : CARD_DATA.selfcare[0]
    const before = JSON.stringify(card)
    let request!: Promise<boolean>
    act(() => { request = result.current.selectCard(session.roomId, card, type) })
    expect(mock.emit.mock.calls[0][1]).toEqual({ roomId: session.roomId, card: { id: card.id }, type })
    expect(JSON.stringify(mock.emit.mock.calls[0][1])).not.toMatch(/frontImage|backImage|category|cloudinary/)
    await act(async () => {
      mock.handlers.get('room_state')!({ ...phaseRoom(), revision: 2, selectedCard: card })
      mock.emit.mock.calls[0][2](null, { success: true })
      expect(await request).toBe(true)
    })
    expect(result.current.roomState?.selectedCard).toEqual(card)
    expect(JSON.stringify(card)).toBe(before)
  })

  it('uses the same ID-only boundary for optional night cardData without altering its action/target', async () => {
    const { result } = preparePhase()
    const card = CARD_DATA.situation[0]
    let request!: Promise<boolean>
    act(() => { request = result.current.nightAction(session.roomId, 'select_card', undefined, card) })
    expect(mock.emit.mock.calls[0][1]).toEqual({ roomId: session.roomId, action: 'select_card', targetSocketId: undefined, cardData: { id: card.id } })
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: false }); expect(await request).toBe(false) })
  })

  it('relays only situation IDs, retaining null preview, omitted fan cards and original clear position', () => {
    const { result } = preparePhase()
    const cards = CARD_DATA.situation.slice(0, 2)
    act(() => {
      result.current.emitCardPreview(session.roomId, cards[0])
      result.current.emitSituationFanState(session.roomId, 1, cards)
      result.current.emitCardPreview(session.roomId, null)
      result.current.emitSituationFanState(session.roomId, -1, undefined)
    })
    expect(mock.emit.mock.calls.map(([event, payload]) => [event, payload])).toEqual([
      ['card_preview', { roomId: session.roomId, card: { id: cards[0].id } }],
      ['situation_fan_state', { roomId: session.roomId, activePosition: 1, cards: cards.map(card => ({ id: card.id })) }],
      ['card_preview', { roomId: session.roomId, card: null }],
      ['situation_fan_state', { roomId: session.roomId, activePosition: -1, cards: undefined }],
    ])
    mock.connected = false
    act(() => {
      result.current.emitCardPreview(session.roomId, cards[0])
      result.current.emitSituationFanState(session.roomId, 0, cards)
    })
    expect(mock.emit).toHaveBeenCalledTimes(4)
  })

  it.each(['room_state', 'game_started', 'phase_changed', 'turn_changed'])('mirrors an accepted %s phase only once at the admission gate', event => {
    const { result } = renderHook(() => useSocket())
    const mirror = vi.spyOn(useGameStore.getState(), 'setGameStep')
    const latest = phaseRoom('latest', 5)
    act(() => mock.handlers.get(event)!(latest))
    expect(result.current.roomState).toEqual(latest)
    expect(mirror).toHaveBeenCalledTimes(1)
    expect(mirror).toHaveBeenCalledWith('emotion-card')
    act(() => mock.handlers.get(event)!({ ...latest, revision: 4, phase: 'night' }))
    expect(result.current.roomState).toEqual(latest)
    expect(mirror).toHaveBeenCalledTimes(1)
    act(() => mock.handlers.get(event)!({ ...latest, revision: 6, status: 'ended', phase: 'ended' }))
    act(() => mock.handlers.get(event)!({ ...latest, revision: 7, phase: 'night' }))
    expect(result.current.roomState?.status).toBe('ended')
    expect(mirror).toHaveBeenCalledTimes(2)
    expect(mirror).toHaveBeenLastCalledWith('ended')
  })

  it('keeps successive legacy player deltas in the transport snapshot without losing the joined player or new host', async () => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const { result } = renderHook(() => useSocket())
    const initial = { ...phaseRoom(), revision: undefined, host: 'original-host' }
    const players = [...initial.players, { userId: 'guest-2', socketId: 'second-socket', name: 'Second guest' }]
    act(() => mock.handlers.get('room_state')!(initial))
    act(() => mock.handlers.get('player_joined')!({ players }))
    act(() => mock.handlers.get('player_left')!({ players, host: 'second-socket' }))
    expect(result.current.roomState?.host).toBe('second-socket')
    expect(result.current.roomState?.players).toEqual(players)
    // The second delta must preserve the ref updated by the first one, not
    // reconstruct from the pre-join snapshot. A later join preserves host too.
    act(() => mock.handlers.get('player_joined')!({ players: players.slice(1) }))
    expect(result.current.roomState?.host).toBe('second-socket')
    expect(result.current.roomState?.players).toEqual(players.slice(1))
    let gift!: Promise<boolean>
    act(() => { gift = result.current.giveCoin(session.roomId, 'second-socket', 'green', 1) })
    expect(mock.emit).toHaveBeenCalledTimes(1)
    expect(mock.emit.mock.calls[0][0]).toBe('give_coin')
    const journal = JSON.parse(localStorage.getItem('emcoin_session')!)
    expect(journal.pendingCoin.receiverUserId).toBe('guest-2')
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: false, error: 'fixture_rejection' })
      expect(await gift).toBe(false)
    })
  })

  it.each(['player_joined', 'player_left'])('does not accept unversioned %s deltas over a versioned snapshot', event => {
    const { result } = preparePhase()
    const latest = result.current.roomState
    act(() => mock.handlers.get(event)!({ players: [], host: 'forged-host' }))
    expect(result.current.roomState).toBe(latest)
  })

  const responseAction = (transport: ReturnType<typeof useSocket>, kind: string) => {
    if (kind === 'response') return transport.sendResponse(session.roomId, 'Fixture response')
    if (kind === 'ntg') return transport.ntgVote(session.roomId, ['target-1', 'target-2'])
    if (kind === 'reflection') return transport.shareReflection(session.roomId, 'Fixture reflection')
    return transport.confirmRoleRewards(session.roomId, ['target-1'])
  }
  const responseKinds = ['response', 'ntg', 'reflection', 'roles']

  it.each(['room', 'actor', 'token', 'generation', 'missing'])('does not save malformed admission %s proof', async mismatch => {
    const { result } = renderHook(() => useSocket())
    let pending!: Promise<boolean>
    act(() => { pending = result.current.joinRoom('admission-room', 'Guest', true) })
    const payload = mock.emit.mock.calls[0][1]
    const proof = { roomId: payload.roomId, userId: payload.userId, token: 'private-fixture', generation: 1 }
    const invalid = { ...proof, ...(mismatch === 'room' ? { roomId: 'another-room' } : {}),
      ...(mismatch === 'actor' ? { userId: 'another-actor' } : {}), ...(mismatch === 'token' ? { token: '' } : {}),
      ...(mismatch === 'generation' ? { generation: 0 } : {}) }
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, session: mismatch === 'missing' ? undefined : invalid })
      expect(await pending).toBe(false)
      expect(await result.current.joinRoom('different-room', 'Guest', true)).toBe(false)
    })
    expect(result.current.admissionAction).toBe('uncertain')
    expect(localStorage.getItem('emcoin_session')).toBeNull()
    expect(mock.emit).toHaveBeenCalledOnce()
  })
  it.each(['timeout', 'throw'])('keeps %s admission uncertain and blocks cross-command duplicates', async mode => {
    const { result } = renderHook(() => useSocket())
    if (mode === 'throw') mock.emit.mockImplementationOnce(() => { throw new Error('fixture') })
    let pending!: Promise<boolean>
    act(() => { pending = result.current.joinRoom('admission-room', 'Guest', true) })
    await act(async () => {
      if (mode === 'timeout') mock.emit.mock.calls[0][2](new Error('timeout'))
      expect(await pending).toBe(false)
      expect(await result.current.resumeRoom({ ...session, status: 'playing', updatedAt: 1 })).toBe(false)
    })
    expect(mock.emit).toHaveBeenCalledOnce()
  })
  it.each(['socket', 'credential', 'unmount'])('ignores obsolete admission completion after %s change', async change => {
    const hook = renderHook(() => useSocket())
    let pending!: Promise<boolean>
    act(() => { pending = hook.result.current.joinRoom('admission-room', 'Guest', true) })
    const payload = mock.emit.mock.calls[0][1]
    if (change === 'socket') mock.id = 'new-admission-socket'
    if (change === 'credential') localStorage.setItem('emcoin_session', JSON.stringify(session))
    if (change === 'unmount') hook.unmount()
    const before = localStorage.getItem('emcoin_session')
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, session: { roomId: payload.roomId, userId: payload.userId, token: 'obsolete-secret', generation: 1 } })
      expect(await pending).toBe(false)
    })
    expect(localStorage.getItem('emcoin_session')).toBe(before)
  })
  it('blocks same-connection concurrent admission and releases a definitive rejection', async () => {
    const { result } = renderHook(() => useSocket())
    let pending!: Promise<boolean>
    act(() => { pending = result.current.joinRoom('admission-room', 'Guest', true) })
    expect(result.current.admissionAction).toBe('pending')
    await act(async () => {
      expect(await result.current.joinRoom('different-room', 'Guest', true)).toBe(false)
      mock.emit.mock.calls[0][2](null, { success: false, error: 'room_full' })
      expect(await pending).toBe(false)
    })
    act(() => { void result.current.joinRoom('different-room', 'Guest', true) })
    expect(mock.emit).toHaveBeenCalledTimes(2)
  })
  it('does not let old resume ACK unlock recovery on a new connection', async () => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const { result } = renderHook(() => useSocket())
    act(() => mock.handlers.get('connect')!())
    mock.id = 'new-resume-socket'
    act(() => mock.handlers.get('connect')!())
    act(() => mock.emit.mock.calls[0][2](null, { success: true, session: { roomId: session.roomId, userId: session.userId, token: session.sessionToken, generation: 2 } }))
    expect(result.current.admissionAction).toBe('pending')
    await act(async () => { expect(await result.current.resumeRoom({ ...session, status: 'playing', updatedAt: 1 })).toBe(false) })
    expect(mock.emit).toHaveBeenCalledTimes(2)
    act(() => mock.emit.mock.calls[1][2](null, { success: true, session: { roomId: session.roomId, userId: session.userId, token: session.sessionToken, generation: 3 } }))
    expect(result.current.admissionAction).toBeNull()
  })

  const settings = { situationGroups: ['light', 'medium'], emotionGroups: ['basic', 'light'] }
  const prepareSettings = () => {
    const hook = preparePhase()
    act(() => mock.handlers.get('room_state')!({ ...phaseRoom(), status: 'waiting', revision: 2, settings }))
    return hook
  }
  it.each(['missing', 'stale', 'room', 'status', 'groups', 'order'])('rejects settings success without exact %s proof', async mismatch => {
    const { result } = prepareSettings()
    let pending!: Promise<boolean>
    act(() => { pending = result.current.updateRoomSettings(session.roomId, settings.situationGroups, settings.emotionGroups) })
    const snapshot = { ...phaseRoom(), status: 'waiting', revision: 3, settings }
    const data = mismatch === 'missing' ? undefined : { ...snapshot,
      ...(mismatch === 'stale' ? { revision: 2 } : {}), ...(mismatch === 'room' ? { id: 'other-room' } : {}),
      ...(mismatch === 'status' ? { status: 'playing' } : {}),
      ...(mismatch === 'groups' ? { settings: { ...settings, emotionGroups: ['strong'] } } : {}),
      ...(mismatch === 'order' ? { settings: { ...settings, situationGroups: ['medium', 'light'] } } : {}) }
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true, data }); expect(await pending).toBe(false) })
    await act(async () => { expect(await result.current.updateRoomSettings(session.roomId, settings.situationGroups, settings.emotionGroups)).toBe(false) })
    expect(mock.emit).toHaveBeenCalledOnce()
    expect(result.current.roomState?.revision).toBe(2)
  })
  it('confirms exact settings without rewinding a newer broadcast, and copies caller arrays', async () => {
    const { result } = prepareSettings()
    const groups = [...settings.situationGroups]
    let pending!: Promise<boolean>
    act(() => { pending = result.current.updateRoomSettings(session.roomId, groups, settings.emotionGroups) })
    groups.reverse()
    expect(mock.emit.mock.calls[0][1].settings.situationGroups).toEqual(settings.situationGroups)
    act(() => mock.handlers.get('room_state')!({ ...phaseRoom(), status: 'waiting', revision: 4, settings: { ...settings, situationGroups: ['sensitive'] } }))
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, data: { ...phaseRoom(), status: 'waiting', revision: 3, settings } })
      expect(await pending).toBe(true)
    })
    expect(result.current.roomState?.revision).toBe(4)
    expect(result.current.roomState?.settings?.situationGroups).toEqual(['sensitive'])
  })
  it('keeps settings timeout uncertain and ignores old socket completion', async () => {
    const { result } = prepareSettings()
    let old!: Promise<boolean>, fresh!: Promise<boolean>
    act(() => { old = result.current.updateRoomSettings(session.roomId, settings.situationGroups, settings.emotionGroups) })
    mock.id = 'new-settings-socket'
    act(() => { fresh = result.current.updateRoomSettings(session.roomId, settings.situationGroups, settings.emotionGroups) })
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, data: { ...phaseRoom(), status: 'waiting', revision: 3, settings } })
      expect(await old).toBe(false)
      mock.emit.mock.calls[1][2](new Error('timeout'))
      expect(await fresh).toBe(false)
      expect(await result.current.updateRoomSettings(session.roomId, settings.situationGroups, settings.emotionGroups)).toBe(false)
    })
    expect(mock.emit).toHaveBeenCalledTimes(2)
  })
  it('releases settings slot after definitive rejection for a deliberate attempt', async () => {
    const { result } = prepareSettings()
    let pending!: Promise<boolean>
    act(() => { pending = result.current.updateRoomSettings(session.roomId, settings.situationGroups, settings.emotionGroups) })
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: false, error: 'not_host' }); expect(await pending).toBe(false) })
    act(() => { void result.current.updateRoomSettings(session.roomId, settings.situationGroups, settings.emotionGroups) })
    expect(mock.emit).toHaveBeenCalledTimes(2)
  })
  it.each(['playing', 'ended'])('does not send settings outside waiting: %s', async status => {
    const { result } = preparePhase()
    if (status === 'ended') act(() => mock.handlers.get('room_state')!({ ...phaseRoom(), revision: 2, status }))
    await act(async () => { expect(await result.current.updateRoomSettings(session.roomId, settings.situationGroups, settings.emotionGroups)).toBe(false) })
    expect(mock.emit).not.toHaveBeenCalled()
  })

  it('confirms leave only after ACK, without clearing confirmed room or storage itself', async () => {
    const { result } = preparePhase()
    const saved = localStorage.getItem('emcoin_session')
    let pending!: Promise<boolean>
    act(() => { pending = result.current.leaveRoom(session.roomId) })
    await act(async () => { expect(await result.current.leaveRoom(session.roomId)).toBe(false) })
    expect(mock.emit).toHaveBeenCalledOnce()
    expect(result.current.roomState?.id).toBe(session.roomId)
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true }); expect(await pending).toBe(true) })
    expect(result.current.roomState?.id).toBe(session.roomId)
    expect(localStorage.getItem('emcoin_session')).toBe(saved)
  })
  it('keeps intentional exit detached on reconnect but permits explicit resume', () => {
    const { result } = preparePhase()
    const saved = localStorage.getItem('emcoin_session')
    act(() => result.current.clearSession({ keepStorage: true }))
    act(() => mock.handlers.get('connect')!())
    expect(mock.emit).not.toHaveBeenCalledWith('reconnect_room', expect.anything(), expect.anything())
    expect(result.current.roomState).toBeNull()
    expect(localStorage.getItem('emcoin_session')).toBe(saved)
    act(() => { void result.current.resumeRoom({ ...session, status: 'playing', updatedAt: 1 }) })
    expect(mock.emit).toHaveBeenCalledWith('reconnect_room', expect.objectContaining({ sessionToken: session.sessionToken }), expect.any(Function))
  })
  it.each(['timeout', 'malformed', 'throw'])('retains leave uncertainty on %s and never auto retries', async mode => {
    const { result } = preparePhase()
    if (mode === 'throw') mock.emit.mockImplementationOnce(() => { throw new Error('fixture') })
    let pending!: Promise<boolean>
    act(() => { pending = result.current.leaveRoom(session.roomId) })
    await act(async () => {
      if (mode !== 'throw') mock.emit.mock.calls[0][2](mode === 'timeout' ? new Error('timeout') : null, {})
      expect(await pending).toBe(false)
      expect(await result.current.leaveRoom(session.roomId)).toBe(false)
    })
    expect(mock.emit).toHaveBeenCalledOnce()
    expect(result.current.roomState?.id).toBe(session.roomId)
  })
  it('ignores old socket leave ACK without unlocking a new leave', async () => {
    const { result } = preparePhase()
    let old!: Promise<boolean>, fresh!: Promise<boolean>
    act(() => { old = result.current.leaveRoom(session.roomId) })
    mock.id = 'new-socket'
    act(() => { fresh = result.current.leaveRoom(session.roomId) })
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true }); expect(await old).toBe(false)
      expect(await result.current.leaveRoom(session.roomId)).toBe(false)
      mock.emit.mock.calls[1][2](null, { success: true }); expect(await fresh).toBe(true)
    })
  })

  it.each(['name', 'avatar', 'actor'])('does not confirm profile ACK with mismatched %s proof', async mismatch => {
    const { result } = preparePhase()
    let pending!: Promise<boolean>
    act(() => { pending = result.current.updateProfile(session.roomId, 'Confirmed', 1, 2) })
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, data: { ...phaseRoom(), revision: 2,
        players: [{ userId: mismatch === 'actor' ? 'other-guest' : session.userId, socketId: 'current-socket',
          name: mismatch === 'name' ? 'Old name' : 'Confirmed', avatarIndex: mismatch === 'avatar' ? 0 : 1, bgIndex: 2 }] } })
      expect(await pending).toBe(false)
      expect(await result.current.updateProfile(session.roomId, 'Confirmed', 1, 2)).toBe(false)
    })
    expect(result.current.roomState?.revision).toBe(1)
  })

  it('confirms exact older profile receipt without overwriting a newer profile broadcast', async () => {
    const { result } = preparePhase()
    let pending!: Promise<boolean>
    act(() => { pending = result.current.updateProfile(session.roomId, 'Confirmed', 1, 2) })
    act(() => mock.handlers.get('room_state')!({ ...phaseRoom(), revision: 3,
      players: [{ userId: session.userId, socketId: 'current-socket', name: 'Newer profile', avatarIndex: 3, bgIndex: 4 }] }))
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, data: { ...phaseRoom(), revision: 2,
        players: [{ userId: session.userId, socketId: 'current-socket', name: 'Confirmed', avatarIndex: 1, bgIndex: 2 }] } })
      expect(await pending).toBe(true)
    })
    expect(result.current.roomState?.players[0].name).toBe('Newer profile')
    expect(result.current.roomState?.revision).toBe(3)
  })

  it.each(['waiting', 'playing'])('confirms profile only after newer committed %s projection', async status => {
    const { result } = preparePhase()
    act(() => mock.handlers.get('room_state')!({ ...phaseRoom(), revision: 2, status }))
    let pending!: Promise<boolean>
    act(() => { pending = result.current.updateProfile(session.roomId, 'Confirmed', 1, 2) })
    await act(async () => { expect(await result.current.updateProfile(session.roomId, 'Confirmed', 1, 2)).toBe(false) })
    expect(mock.emit).toHaveBeenCalledOnce()
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true, data: { ...phaseRoom(), revision: 3, status,
      players: [{ userId: session.userId, socketId: 'current-socket', name: 'Confirmed', avatarIndex: 1, bgIndex: 2 }] } }); expect(await pending).toBe(true) })
    expect(result.current.roomState?.revision).toBe(3)
  })

  it.each(['missing', 'stale', 'wrong-room', 'timeout'])('retains profile uncertainty on %s ACK without automatic retry', async mode => {
    const { result } = preparePhase()
    let pending!: Promise<boolean>
    act(() => { pending = result.current.updateProfile(session.roomId, 'Confirmed', 1, 2) })
    await act(async () => {
      mock.emit.mock.calls[0][2](mode === 'timeout' ? new Error('timeout') : null, { success: true,
        data: mode === 'missing' ? undefined : { ...phaseRoom(), revision: mode === 'stale' ? 1 : 2, id: mode === 'wrong-room' ? 'other-room' : session.roomId } })
      expect(await pending).toBe(false)
      expect(await result.current.updateProfile(session.roomId, 'Confirmed', 1, 2)).toBe(false)
    })
    expect(mock.emit).toHaveBeenCalledOnce()
  })

  const lifecycleKinds = ['start', 'end'] as const
  const lifecycleRoom = (kind: typeof lifecycleKinds[number], revision = 1) => ({ ...phaseRoom(), status: kind === 'start' ? 'waiting' : 'playing', revision })
  const lifecycleAction = (transport: ReturnType<typeof useSocket>, kind: typeof lifecycleKinds[number]) => kind === 'start' ? transport.startGame(session.roomId) : transport.endGame(session.roomId)
  const lifecycleAck = (kind: typeof lifecycleKinds[number], revision = 2) => ({ ...phaseRoom(), status: kind === 'start' ? 'playing' : 'ended', phase: kind === 'start' ? 'role-reveal' : 'ended', revision })
  const prepareLifecycle = (kind: typeof lifecycleKinds[number]) => {
    const hook = preparePhase()
    act(() => mock.handlers.get('room_state')!(lifecycleRoom(kind, 2)))
    return hook
  }

  it.each(lifecycleKinds)('awaits %s commit and blocks same-tick duplicates', async kind => {
    const { result } = prepareLifecycle(kind)
    let pending!: Promise<boolean>
    act(() => { pending = lifecycleAction(result.current, kind) })
    await act(async () => { expect(await lifecycleAction(result.current, kind)).toBe(false) })
    expect(mock.emit).toHaveBeenCalledOnce()
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true, data: lifecycleAck(kind, 3) }); expect(await pending).toBe(true) })
    expect(result.current.roomState?.status).toBe(kind === 'start' ? 'playing' : 'ended')
  })

  it.each(lifecycleKinds.flatMap(kind => ['missing', 'wrong-room', 'stale', 'wrong-status', 'timeout', 'throw'].map(mode => [kind, mode] as const)))('retains %s uncertainty for %s without retry', async (kind, mode) => {
    const { result } = prepareLifecycle(kind)
    if (mode === 'throw') mock.emit.mockImplementationOnce(() => { throw new Error('fixture') })
    let pending!: Promise<boolean>
    act(() => { pending = lifecycleAction(result.current, kind) })
    const data = mode === 'missing' ? undefined : { ...lifecycleAck(kind, mode === 'stale' ? 2 : 3),
      ...(mode === 'wrong-room' ? { id: 'other-room' } : {}), ...(mode === 'wrong-status' ? { status: 'waiting' } : {}) }
    await act(async () => {
      if (mode !== 'throw') mock.emit.mock.calls[0][2](mode === 'timeout' ? new Error('timeout') : null, { success: true, data })
      expect(await pending).toBe(false)
      expect(await lifecycleAction(result.current, kind)).toBe(false)
    })
    expect(mock.emit).toHaveBeenCalledOnce()
    expect(result.current.roomState?.revision).toBe(2)
    expect(result.current.error).toContain('Chưa xác nhận')
  })

  it.each(lifecycleKinds)('accepts %s ACK after a newer committed broadcast without rewinding', async kind => {
    const { result } = prepareLifecycle(kind)
    let pending!: Promise<boolean>
    act(() => { pending = lifecycleAction(result.current, kind) })
    act(() => mock.handlers.get('room_state')!(lifecycleAck(kind, 4)))
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true, data: lifecycleAck(kind, 3) }); expect(await pending).toBe(true) })
    expect(result.current.roomState?.revision).toBe(4)
  })

  it.each(lifecycleKinds)('ignores old-connection %s ACK and does not unlock a newer request', async kind => {
    const { result } = prepareLifecycle(kind)
    let old!: Promise<boolean>, fresh!: Promise<boolean>
    act(() => { old = lifecycleAction(result.current, kind) })
    mock.id = 'new-socket'
    act(() => mock.handlers.get('connect')!())
    act(() => { fresh = lifecycleAction(result.current, kind) })
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, data: lifecycleAck(kind, 8) })
      expect(await old).toBe(false)
      expect(await lifecycleAction(result.current, kind)).toBe(false)
    })
    const newest = [...mock.emit.mock.calls].reverse().find(call => call[0] === `${kind}_game`)!
    await act(async () => { newest[2](null, { success: true, data: lifecycleAck(kind, 3) }); expect(await fresh).toBe(true) })
    expect(result.current.roomState?.revision).toBe(3)
  })

  it.each(lifecycleKinds)('releases definitive %s rejection for a deliberate new attempt', async kind => {
    const { result } = prepareLifecycle(kind)
    let pending!: Promise<boolean>
    act(() => { pending = lifecycleAction(result.current, kind) })
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: false, error: 'FIXTURE_REJECT' }); expect(await pending).toBe(false) })
    act(() => { pending = lifecycleAction(result.current, kind) })
    expect(mock.emit).toHaveBeenCalledTimes(2)
    await act(async () => { mock.emit.mock.calls[1][2](null, { success: true, data: lifecycleAck(kind, 3) }); expect(await pending).toBe(true) })
  })
  it('refreshes a rejected stale start but never auto-starts changed round settings', async () => {
    const { result } = prepareLifecycle('start')
    let pending!: Promise<boolean>
    act(() => { pending = result.current.startGame(session.roomId) })
    expect(mock.emit.mock.calls[0][1]).toMatchObject({ expectedRevision: 2 })
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: false, error: 'ROUND_REVISION_CONFLICT', message: 'Review rounds',
        data: { ...lifecycleRoom('start', 4), roundLimit: 3 } })
      expect(await pending).toBe(false)
    })
    expect(result.current.roomState).toMatchObject({ status: 'waiting', revision: 4, roundLimit: 3 })
    expect(mock.emit).toHaveBeenCalledTimes(1)
    act(() => { pending = result.current.startGame(session.roomId) })
    expect(mock.emit.mock.calls[1][1]).toMatchObject({ expectedRevision: 4 })
    await act(async () => { mock.emit.mock.calls[1][2](null, { success: true, data: lifecycleAck('start', 5) }); expect(await pending).toBe(true) })
  })

  it.each(responseKinds)('awaits %s confirmation and blocks duplicate pending requests', async kind => {
    const { result } = preparePhase()
    let request!: Promise<boolean>
    act(() => { request = responseAction(result.current, kind) })
    await act(async () => { expect(await responseAction(result.current, kind)).toBe(false) })
    expect(mock.emit).toHaveBeenCalledOnce()
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true, votedCount: 2 }); expect(await request).toBe(true) })
  })

  it.each(responseKinds.flatMap(kind => ['timeout', 'malformed', 'throw'].map(mode => [kind, mode])))('retains %s uncertainty after %s without auto retry', async (kind, mode) => {
    const { result } = preparePhase()
    if (mode === 'throw') mock.emit.mockImplementationOnce(() => { throw new Error('fixture') })
    let request!: Promise<boolean>
    act(() => { request = responseAction(result.current, kind) })
    await act(async () => {
      if (mode !== 'throw') mock.emit.mock.calls[0][2](mode === 'timeout' ? new Error('timeout') : null, {})
      expect(await request).toBe(false)
      expect(await responseAction(result.current, kind)).toBe(false)
    })
    expect(mock.emit).toHaveBeenCalledOnce()
    expect(result.current.error).toContain('Chưa xác nhận')
  })

  it.each(responseKinds)('does not let a late %s ACK apply or release a newer intent', async kind => {
    const { result } = preparePhase()
    let old!: Promise<boolean>, fresh!: Promise<boolean>
    act(() => { old = responseAction(result.current, kind) })
    act(() => mock.handlers.get('room_state')!(phaseRoom('phase-2', 2)))
    act(() => { fresh = responseAction(result.current, kind) })
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, votedCount: 2, data: phaseRoom('phase-1', 50) })
      expect(await old).toBe(false)
      expect(await responseAction(result.current, kind)).toBe(false)
    })
    expect(result.current.roomState?.revision).toBe(2)
    await act(async () => { mock.emit.mock.calls[1][2](null, { success: true, votedCount: 2 }); expect(await fresh).toBe(true) })
  })

  it.each([undefined, 0, 1])('does not declare a two-target NTG batch fully confirmed with votedCount %s', async votedCount => {
    const { result } = preparePhase()
    let request!: Promise<boolean>
    act(() => { request = result.current.ntgVote(session.roomId, ['target-1', 'target-2']) })
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, votedCount })
      expect(await request).toBe(false)
      expect(await result.current.ntgVote(session.roomId, ['target-1', 'target-2'])).toBe(false)
    })
    expect(result.current.error).toContain('Chưa xác nhận đủ')
    expect(mock.emit).toHaveBeenCalledOnce()
  })

  it('keeps the single-target NTG wire shape and accepts exactly one confirmed target', async () => {
    const { result } = preparePhase()
    let request!: Promise<boolean>
    act(() => { request = result.current.ntgVote(session.roomId, 'target-1') })
    expect(mock.emit.mock.calls[0][1]).toEqual({ roomId: session.roomId, targetSocketId: 'target-1' })
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true, votedCount: 1 }); expect(await request).toBe(true) })
  })

  it.each(['card', 'night', 'vote'] as const)('awaits a committed %s ACK and blocks duplicate in-flight sends', async kind => {
    const { result } = preparePhase()
    const send = () => kind === 'card' ? result.current.selectCard(session.roomId, { id: 'emotion-basic-vui' })
      : kind === 'night' ? result.current.nightAction(session.roomId, 'heal', 'target')
      : result.current.submitVote(session.roomId, 'target')
    let first!: Promise<boolean>
    act(() => { first = send() })
    expect(mock.emit).toHaveBeenCalledOnce()
    await act(async () => { expect(await send()).toBe(false) })
    expect(mock.emit).toHaveBeenCalledOnce()
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true }); expect(await first).toBe(true) })
  })

  it.each(['timeout', 'malformed', 'throw'])('keeps an uncertain %s phase action locked without automatic retry', async mode => {
    const { result } = preparePhase()
    if (mode === 'throw') mock.emit.mockImplementationOnce(() => { throw new Error('fixture transport failure') })
    let first!: Promise<boolean>
    act(() => { first = result.current.selectCard(session.roomId, { id: 'emotion-basic-vui' }) })
    await act(async () => {
      if (mode !== 'throw') mock.emit.mock.calls[0][2](mode === 'timeout' ? new Error('timeout') : null, {})
      expect(await first).toBe(false)
    })
    expect(result.current.error).toContain('Chưa xác nhận')
    await act(async () => { expect(await result.current.selectCard(session.roomId, { id: 'emotion-basic-vui' })).toBe(false) })
    expect(mock.emit).toHaveBeenCalledOnce()
  })

  it('allows correction after a definitive rejection, not after an uncertain result', async () => {
    const { result } = preparePhase()
    let first!: Promise<boolean>
    act(() => { first = result.current.submitVote(session.roomId, 'target') })
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: false, message: 'Không hợp lệ' }); expect(await first).toBe(false) })
    expect(result.current.error).toBe('Không hợp lệ')
    let second!: Promise<boolean>
    act(() => { second = result.current.submitVote(session.roomId, 'corrected-target') })
    expect(mock.emit).toHaveBeenCalledTimes(2)
    await act(async () => { mock.emit.mock.calls[1][2](null, { success: true }); expect(await second).toBe(true) })
  })

  it('keeps a successful ACK with rejected snapshot uncertain instead of authorizing a fresh mutation', async () => {
    const { result } = preparePhase()
    let request!: Promise<boolean>
    act(() => { request = result.current.selectCard(session.roomId, {}) })
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, data: { ...phaseRoom(), id: 'wrong-room' } })
      expect(await request).toBe(false)
      expect(await result.current.selectCard(session.roomId, {})).toBe(false)
    })
    expect(result.current.roomState?.id).toBe(session.roomId)
    expect(result.current.error).toContain('Chưa xác nhận')
    expect(mock.emit).toHaveBeenCalledOnce()
  })

  it('does not let an old phase ACK unlock or complete a new phase request', async () => {
    const { result } = preparePhase()
    let first!: Promise<boolean>, second!: Promise<boolean>
    act(() => { first = result.current.selectCard(session.roomId, { id: 'emotion-basic-vui' }) })
    act(() => mock.handlers.get('room_state')!(phaseRoom('phase-2', 2)))
    act(() => { second = result.current.selectCard(session.roomId, { id: 'emotion-basic-buon' }) })
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, data: phaseRoom('phase-1', 50) })
      expect(await first).toBe(false)
      expect(await result.current.selectCard(session.roomId, {})).toBe(false)
    })
    expect(result.current.roomState?.revision).toBe(2)
    expect(mock.emit).toHaveBeenCalledTimes(2)
    await act(async () => { mock.emit.mock.calls[1][2](null, { success: true }); expect(await second).toBe(true) })
  })

  it.each(['disconnect', 'credential'])('ignores a successful late ACK after %s change', async change => {
    const { result } = preparePhase()
    let request!: Promise<boolean>
    act(() => { request = result.current.nightAction(session.roomId, 'heal', 'target') })
    if (change === 'disconnect') mock.connected = false
    else localStorage.setItem('emcoin_session', JSON.stringify({ ...session, sessionToken: 'replacement-fixture-token' }))
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, data: phaseRoom('phase-1', 50) })
      expect(await request).toBe(false)
    })
    expect(result.current.roomState?.revision).toBe(1)
  })

  it('fails closed before phase mutations without an admitted playing room', async () => {
    const { result } = renderHook(() => useSocket())
    await act(async () => { expect(await result.current.selectCard(session.roomId, {})).toBe(false) })
    expect(mock.emit).not.toHaveBeenCalled()
    act(() => mock.handlers.get('room_state')!(phaseRoom()))
    await act(async () => { expect(await result.current.submitVote('different-room', 'target')).toBe(false) })
    expect(mock.emit).not.toHaveBeenCalled()
  })

  it('persists credentials only after a successful private admission ACK', () => {
    const { result } = renderHook(() => useSocket())
    act(() => { void result.current.joinRoom('new-room', 'Guest', true) })
    expect(localStorage.getItem('emcoin_session')).toBeNull()
    const payload = mock.emit.mock.calls[0][1]
    act(() => mock.emit.mock.calls[0][2](null, { success: true,
      session: { roomId: 'new-room', userId: payload.userId, token: 'private-fixture-token', generation: 1 } }))
    expect(JSON.parse(localStorage.getItem('emcoin_session')!).sessionToken).toBe('private-fixture-token')
  })

  it('sends selected groups as part of the creation admission, not a later settings mutation', () => {
    const { result } = renderHook(() => useSocket())
    const settings = { situationGroups: ['medium'], emotionGroups: ['strong'] }
    act(() => { void result.current.joinRoom('new-room', 'Guest', true, settings) })
    expect(mock.emit).toHaveBeenCalledOnce()
    expect(mock.emit.mock.calls[0][0]).toBe('join_room')
    expect(mock.emit.mock.calls[0][1]).toEqual(expect.objectContaining({ createIfMissing: true, settings }))
    expect(localStorage.getItem('emcoin_session')).toBeNull()
  })

  it.each(['playing', 'ended'])('cold-connect resumes %s using the secret, not public IDs alone', status => {
    localStorage.setItem('emcoin_session', JSON.stringify({ ...session, status }))
    renderHook(() => useSocket())
    act(() => mock.handlers.get('connect')!())
    expect(mock.emit).toHaveBeenCalledWith('reconnect_room', expect.objectContaining({
      roomId: session.roomId, sessionToken: session.sessionToken,
    }), expect.any(Function))
  })

  it('does not silently auto-resume waiting rooms or legacy ID-only sessions', () => {
    localStorage.setItem('emcoin_session', JSON.stringify({ ...session, status: 'waiting' }))
    const first = renderHook(() => useSocket())
    act(() => mock.handlers.get('connect')!())
    expect(mock.emit).not.toHaveBeenCalled()
    first.unmount()
    localStorage.setItem('emcoin_session', JSON.stringify({ ...session, sessionToken: undefined }))
    renderHook(() => useSocket())
    act(() => mock.handlers.get('connect')!())
    expect(mock.emit).not.toHaveBeenCalled()
  })

  it('keeps the new tab credential when the old tab receives replacement', () => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const { result } = renderHook(() => useSocket())
    act(() => mock.handlers.get('session_replaced')!())
    expect(mock.disconnect).toHaveBeenCalledOnce()
    expect(result.current.roomState).toBeNull()
    expect(result.current.error).toContain('tab khác')
    expect(JSON.parse(localStorage.getItem('emcoin_session')!).sessionToken).toBe(session.sessionToken)
  })

  it('does not enqueue join/resume while offline', () => {
    mock.connected = false
    const { result } = renderHook(() => useSocket())
    act(() => { void result.current.joinRoom('new-room', 'Guest', true) })
    act(() => { void result.current.resumeRoom({ ...session, status: 'playing', updatedAt: 1 }) })
    expect(mock.emit).not.toHaveBeenCalled()
    expect(localStorage.getItem('emcoin_session')).toBeNull()
    expect(result.current.error).toContain('Chưa kết nối')
  })

  it('reports rejected admission without saving a fabricated session', () => {
    const { result } = renderHook(() => useSocket())
    act(() => { void result.current.joinRoom('new-room', 'Guest') })
    act(() => mock.emit.mock.calls[0][2](null, { success: false, error: 'INVALID_SESSION' }))
    expect(localStorage.getItem('emcoin_session')).toBeNull()
    expect(result.current.error).toContain('hết hạn')
  })

  it('blocks every gameplay/profile/settings mutation and transient relay while offline', async () => {
    mock.connected = false
    const { result } = renderHook(() => useSocket())
    await act(async () => {
      result.current.startGame('room')
      result.current.nightAction('room', 'SILENCE', 'target')
      result.current.nextPhase('room')
      expect(await result.current.giveCoin('room', 'target', 'red')).toBe(false)
      result.current.submitVote('room', 'target')
      result.current.endGame('room')
      result.current.leaveRoom('room')
      result.current.addFakePlayers('room')
      result.current.nextTurn('room')
      result.current.prevTurn('room')
      result.current.selectCard('room', {})
      result.current.sendResponse('room', 'response')
      result.current.ntgVote('room', ['target'])
      result.current.emitCardPreview('room', null)
      result.current.emitSituationFanState('room', 0)
      result.current.shareReflection('room', 'reflection')
      expect(await result.current.confirmRoleRewards('room', ['target'])).toBe(false)
      result.current.updateProfile('room', 'Guest', 0, 0)
      result.current.updateRoomSettings('room', [], [])
      result.current.setDebugRolePreference('room', 'guest', 'Guide')
    })
    expect(mock.emit).not.toHaveBeenCalled()
    expect(result.current.error).toContain('Thao tác chưa được gửi')
    mock.connected = true
    act(() => mock.handlers.get('connect')!())
    expect(mock.emit).not.toHaveBeenCalled()
  })

  it('does not allocate navigation pending offline; connected next/previous share one slot', () => {
    mock.connected = false
    const { result } = renderHook(() => useSocket())
    act(() => mock.handlers.get('room_state')!(phaseRoom()))
    act(() => { result.current.nextTurn(session.roomId); result.current.prevTurn(session.roomId) })
    mock.connected = true
    act(() => { result.current.nextTurn(session.roomId); result.current.prevTurn(session.roomId) })
    expect(mock.emit.mock.calls.map(call => call[0])).toEqual(['next_turn'])
  })

  it.each(['ack-first', 'broadcast-first', 'terminal', 'newer-broadcast'])('confirms navigation without rewinding for %s ordering', async order => {
    const { result } = preparePhase()
    let request!: Promise<boolean>
    act(() => { request = result.current.nextTurn(session.roomId) })
    const snapshot = { ...phaseRoom('phase-2', 2), ...(order === 'terminal' ? { status: 'ended', phase: 'ended' } : {}) }
    if (order !== 'ack-first') act(() => mock.handlers.get('room_state')!(order === 'newer-broadcast' ? phaseRoom('phase-3', 3) : snapshot))
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true, data: snapshot }); expect(await request).toBe(true) })
    expect(result.current.roomState?.revision).toBe(order === 'newer-broadcast' ? 3 : 2)
    if (order === 'ack-first') act(() => mock.handlers.get('room_state')!(snapshot))
    expect(result.current.roomState?.phaseInstance).toBe(order === 'newer-broadcast' ? 'phase-3' : 'phase-2')
  })

  it.each(['timeout', 'missing-snapshot', 'unchanged-revision', 'wrong-room'])('locks uncertain navigation on %s without retrying', async kind => {
    const { result } = preparePhase()
    let request!: Promise<boolean>
    act(() => { request = result.current.prevTurn(session.roomId) })
    await act(async () => {
      const data = kind === 'missing-snapshot' ? undefined : kind === 'unchanged-revision' ? phaseRoom()
        : { ...phaseRoom('phase-2', 2), ...(kind === 'wrong-room' ? { id: 'other' } : {}) }
      mock.emit.mock.calls[0][2](kind === 'timeout' ? new Error('timeout') : null, { success: true, data })
      expect(await request).toBe(false)
      expect(await result.current.nextTurn(session.roomId)).toBe(false)
    })
    expect(result.current.roomState?.revision).toBe(1)
    expect(result.current.error).toContain('Chưa xác nhận')
    expect(mock.emit).toHaveBeenCalledOnce()
  })

  it('ignores late navigation ACKs after a new phase intent takes ownership', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
    const { result } = preparePhase()
    let oldRequest!: Promise<boolean>, newRequest!: Promise<boolean>
    act(() => { oldRequest = result.current.nextTurn(session.roomId) })
    act(() => mock.handlers.get('room_state')!(phaseRoom('phase-2', 2)))
    clock.mockReturnValue(2000)
    act(() => { newRequest = result.current.nextTurn(session.roomId) })
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, data: phaseRoom('phase-2', 50) })
      expect(await oldRequest).toBe(false)
      expect(await result.current.prevTurn(session.roomId)).toBe(false)
    })
    expect(result.current.roomState?.revision).toBe(2)
    await act(async () => { mock.emit.mock.calls[1][2](null, { success: true, data: phaseRoom('phase-3', 3) }); expect(await newRequest).toBe(true) })
  })

  it('ignores navigation ACK from the previous connection even when Socket.IO reuses the same object', async () => {
    const { result } = preparePhase()
    let request!: Promise<boolean>
    act(() => { request = result.current.nextTurn(session.roomId) })
    mock.id = 'reconnected-socket'
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true, data: phaseRoom('phase-2', 2) }); expect(await request).toBe(false) })
    expect(result.current.roomState?.revision).toBe(1)
  })

  it('ignores old snapshots and versionless downgrades without rewinding phase or coins', () => {
    const { result } = renderHook(() => useSocket())
    const latest = { id: 'ordered-room', players: [], status: 'playing', phase: 'give-coins', revision: 5, currentRound: 2 }
    act(() => mock.handlers.get('room_state')!(latest))
    act(() => mock.handlers.get('phase_changed')!({ ...latest, revision: 4, phase: 'night', currentRound: 1 }))
    act(() => mock.handlers.get('coin_given')!({ room: { ...latest, revision: undefined, currentRound: 0 } }))
    expect(result.current.roomState?.currentRound).toBe(2)
    expect(result.current.roomState?.revision).toBe(5)
    expect(useGameStore.getState().gameStep).toBe('give-coins')
  })

  it('retries an uncertain gift with the same ID and stable recipient after their socket changes', async () => {
    const { result } = renderHook(() => useSocket())
    const state = { id: 'coin-room', players: [{ userId: 'recipient', socketId: 'old-target', name: 'Guest' }],
      status: 'playing', phase: 'give-coins', currentRound: 1, revision: 5 }
    act(() => mock.handlers.get('room_state')!(state))
    let first!: Promise<boolean>
    act(() => { first = result.current.giveCoin('coin-room', 'old-target', 'red', 2) })
    const firstPayload = mock.emit.mock.calls[0][1]
    await act(async () => { mock.emit.mock.calls[0][2](new Error('lost ACK')); expect(await first).toBe(false) })
    act(() => mock.handlers.get('room_state')!({ ...state, revision: 6,
      players: [{ userId: 'recipient', socketId: 'new-target', name: 'Guest' }] }))
    let retry!: Promise<boolean>
    act(() => { retry = result.current.giveCoin('coin-room', 'new-target', 'red', 2) })
    expect(mock.emit.mock.calls[1][1]).toEqual({ ...firstPayload, receiverSocketId: 'new-target' })
    await act(async () => {
      mock.emit.mock.calls[1][2](null, { success: true, data: { ...state, revision: 7 } })
      expect(await retry).toBe(true)
    })
    expect(result.current.roomState?.revision).toBe(7)
  })

  it('blocks double clicks and changed intent/round while a gift remains uncertain', async () => {
    const { result } = renderHook(() => useSocket())
    const state = { id: 'coin-room', players: [], status: 'playing', phase: 'give-coins', currentRound: 1, revision: 5 }
    act(() => mock.handlers.get('room_state')!(state))
    let first!: Promise<boolean>
    act(() => { first = result.current.giveCoin('coin-room', 'target', 'red') })
    await act(async () => { expect(await result.current.giveCoin('coin-room', 'target', 'red')).toBe(false) })
    expect(mock.emit).toHaveBeenCalledOnce()
    await act(async () => { mock.emit.mock.calls[0][2](new Error('lost ACK')); await first })
    await act(async () => {
      expect(await result.current.giveCoin('coin-room', 'other', 'red')).toBe(false)
      expect(await result.current.giveCoin('coin-room', 'target', 'yellow')).toBe(false)
      expect(await result.current.giveCoin('coin-room', 'target', 'red', 2)).toBe(false)
    })
    act(() => mock.handlers.get('room_state')!({ ...state, revision: 6, currentRound: 2 }))
    await act(async () => { expect(await result.current.giveCoin('coin-room', 'target', 'red')).toBe(false) })
    expect(mock.emit).toHaveBeenCalledOnce()
  })

  it('releases a definitively rejected first gift but does not release an uncertain retry on rejection', async () => {
    const { result } = renderHook(() => useSocket())
    let first!: Promise<boolean>
    act(() => { first = result.current.giveCoin('room', 'target', 'red') })
    const originalId = mock.emit.mock.calls[0][1].requestId
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: false, error: 'RATE_LIMITED' }); await first })
    let second!: Promise<boolean>
    act(() => { second = result.current.giveCoin('room', 'target', 'red') })
    const uncertainId = mock.emit.mock.calls[1][1].requestId
    expect(uncertainId).not.toBe(originalId)
    await act(async () => { mock.emit.mock.calls[1][2](new Error('lost ACK')); await second })
    let retry!: Promise<boolean>
    act(() => { retry = result.current.giveCoin('room', 'target', 'red') })
    expect(mock.emit.mock.calls[2][1].requestId).toBe(uncertainId)
    await act(async () => { mock.emit.mock.calls[2][2](null, { success: false, error: 'STALE_ROUND' }); await retry })
    await act(async () => { expect(await result.current.giveCoin('room', 'other', 'yellow')).toBe(false) })
    expect(mock.emit).toHaveBeenCalledTimes(3)
  })

  it('does not treat a malformed ACK as an authoritative rejection and mint a new operation', async () => {
    const { result } = renderHook(() => useSocket())
    let first!: Promise<boolean>
    act(() => { first = result.current.giveCoin('room', 'target', 'red') })
    const requestId = mock.emit.mock.calls[0][1].requestId
    await act(async () => { mock.emit.mock.calls[0][2](null, {}); expect(await first).toBe(false) })
    let retry!: Promise<boolean>
    act(() => { retry = result.current.giveCoin('room', 'target', 'red') })
    expect(mock.emit.mock.calls[1][1].requestId).toBe(requestId)
    await act(async () => { mock.emit.mock.calls[1][2](null, { success: true }); expect(await retry).toBe(true) })
  })

  it('recovers an ACK-lost gift from its full server log fingerprint after round advance, not someone else’s receipt', async () => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const { result } = renderHook(() => useSocket())
    const state = { id: 'coin-room', players: [{ userId: 'recipient', socketId: 'target', name: 'Guest' }],
      status: 'playing', phase: 'give-coins', currentRound: 1, revision: 5 }
    act(() => mock.handlers.get('room_state')!(state))
    let first!: Promise<boolean>
    act(() => { first = result.current.giveCoin('coin-room', 'target', 'red') })
    const requestId = mock.emit.mock.calls[0][1].requestId
    await act(async () => { mock.emit.mock.calls[0][2](new Error('lost ACK')); await first })
    const receipt = { type: 'GIVE_COIN', actorId: 'wrong-actor', targetId: 'recipient', timestamp: 1,
      data: { requestId, round: 1, coinType: 'red', amount: 1 } }
    act(() => mock.handlers.get('room_state')!({ ...state, currentRound: 2, revision: 6, gameLog: [receipt] }))
    await act(async () => { expect(await result.current.giveCoin('coin-room', 'target', 'red')).toBe(false) })
    act(() => mock.handlers.get('room_state')!({ ...state, currentRound: 2, revision: 7,
      gameLog: [{ ...receipt, actorId: session.userId }] }))
    await act(async () => { expect(await result.current.giveCoin('coin-room', 'target', 'red')).toBe(true) })
    expect(mock.emit).toHaveBeenCalledOnce()
    let fresh!: Promise<boolean>
    act(() => { fresh = result.current.giveCoin('coin-room', 'target', 'red') })
    expect(mock.emit.mock.calls[1][1].round).toBe(2)
    expect(mock.emit.mock.calls[1][1].requestId).not.toBe(requestId)
    await act(async () => { mock.emit.mock.calls[1][2](null, { success: true }); await fresh })
  })

  const coinState = { id: session.roomId, status: 'playing', phase: 'give-coins', currentRound: 1, revision: 5,
    rulesVersion: 'web-16-coin60/v1', players: [
      { userId: session.userId, socketId: 'current-socket', name: 'Sender' },
      { userId: 'recipient', socketId: 'target', name: 'Receiver' },
    ] }

  const coinReceipt = (requestId: string) => ({ type: 'GIVE_COIN', actorId: session.userId,
    targetId: 'recipient', timestamp: 1, data: { requestId, round: 1, coinType: 'red', amount: 1 } })
  const prepareCoin = () => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const hook = renderHook(() => useSocket())
    act(() => mock.handlers.get('room_state')!(coinState))
    return hook
  }

  it.each([
    { mode: 'wire', unrelated: false }, { mode: 'hydration', unrelated: false },
    { mode: 'wire', unrelated: true }, { mode: 'hydration', unrelated: true },
  ])('clears only Coin uncertainty after exact $mode recovery (unrelated=$unrelated)', async ({ mode, unrelated }) => {
    const { result } = prepareCoin()
    let original!: Promise<boolean>
    act(() => { original = result.current.giveCoin(session.roomId, 'target', 'red') })
    const payload = mock.emit.mock.calls[0][1]
    await act(async () => { mock.emit.mock.calls[0][2](new Error('fixture ACK loss')); expect(await original).toBe(false) })
    expect(result.current.error).toContain('Chưa xác nhận được lượt trao Coin')
    const otherError = 'Một thao tác khác cần kiểm tra.'
    const snapshot = { ...coinState, revision: 6, gameLog: [coinReceipt(payload.requestId)] }
    if (mode === 'hydration') act(() => mock.handlers.get('room_state')!(snapshot))
    // room_state has its own existing error reset policy; isolate the retry's
    // cleanup from that earlier hydration event.
    if (unrelated) act(() => mock.handlers.get('error')!({ message: otherError }))
    let retry!: Promise<boolean>
    act(() => { retry = result.current.retryPendingCoin() })
    if (mode === 'wire') {
      expect(mock.emit.mock.calls[1][1]).toEqual(payload)
      await act(async () => { mock.emit.mock.calls[1][2](null, { success: true, data: snapshot }); expect(await retry).toBe(true) })
    } else await act(async () => { expect(await retry).toBe(true) })
    expect(mock.emit).toHaveBeenCalledTimes(mode === 'wire' ? 2 : 1)
    expect(result.current.coinAction?.status).toBe('confirmed')
    expect(JSON.parse(localStorage.getItem('emcoin_session')!)).not.toHaveProperty('pendingCoin')
    expect(result.current.error).toBe(unrelated ? otherError : null)
  })

  it.each(['missing', 'wrong-room', 'stale', 'bad-revision', 'no-receipt', 'actor', 'recipient', 'amount', 'color', 'round', 'operation'])('retains authenticated Coin journal on %s confirmation', async kind => {
    const { result } = prepareCoin()
    let request!: Promise<boolean>
    act(() => { request = result.current.giveCoin(session.roomId, 'target', 'red') })
    const pending = JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin
    const receipt = coinReceipt(pending.requestId)
    if (kind === 'actor') receipt.actorId = 'other'
    if (kind === 'recipient') receipt.targetId = 'other'
    if (kind === 'amount') receipt.data.amount = 2
    if (kind === 'color') receipt.data.coinType = 'yellow'
    if (kind === 'round') receipt.data.round = 2
    if (kind === 'operation') receipt.data.requestId = 'other-operation'
    const snapshot = { ...coinState, revision: kind === 'stale' ? 4 : kind === 'bad-revision' ? -1 : 6,
      id: kind === 'wrong-room' ? 'other-room' : session.roomId, gameLog: kind === 'no-receipt' ? [] : [receipt] }
    await act(async () => {
      mock.emit.mock.calls[0][2](null, { success: true, data: kind === 'missing' ? undefined : snapshot })
      expect(await request).toBe(false)
    })
    expect(result.current.roomState?.revision).toBe(5)
    expect(result.current.roomState?.id).toBe(session.roomId)
    expect(result.current.coinAction?.status).toBe('uncertain')
    expect(JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin).toEqual(pending)
    let retry!: Promise<boolean>
    act(() => { retry = result.current.retryPendingCoin() })
    expect(mock.emit.mock.calls[1][1].requestId).toBe(pending.requestId)
    await act(async () => { mock.emit.mock.calls[1][2](new Error('fixture timeout')); await retry })
  })

  it.each(['ack-first', 'broadcast-first', 'newer-broadcast', 'terminal'])('confirms exact Coin receipt without rewinding %s', async order => {
    const { result } = prepareCoin()
    let request!: Promise<boolean>
    act(() => { request = result.current.giveCoin(session.roomId, 'target', 'red') })
    const requestId = mock.emit.mock.calls[0][1].requestId
    const snapshot = { ...coinState, revision: 6, gameLog: [coinReceipt(requestId)] }
    if (order !== 'ack-first') act(() => mock.handlers.get('room_state')!({ ...snapshot,
      revision: order === 'broadcast-first' ? 6 : 7,
      ...(order === 'terminal' ? { status: 'ended', phase: 'ended' } : {}) }))
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true, data: snapshot }); expect(await request).toBe(true) })
    expect(result.current.roomState?.revision).toBe(['ack-first', 'broadcast-first'].includes(order) ? 6 : 7)
    if (order === 'terminal') expect(result.current.roomState?.status).toBe('ended')
    expect(JSON.parse(localStorage.getItem('emcoin_session')!)).not.toHaveProperty('pendingCoin')
    expect(result.current.coinAction?.status).toBe('confirmed')
  })

  it('retains Coin uncertainty after synchronous transport failure and retries only the saved ID', async () => {
    const { result } = prepareCoin()
    mock.emit.mockImplementationOnce(() => { throw new Error('fixture emit failure') })
    await act(async () => { expect(await result.current.giveCoin(session.roomId, 'target', 'red')).toBe(false) })
    const pending = JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin
    expect(result.current.coinAction?.status).toBe('uncertain')
    let retry!: Promise<boolean>
    act(() => { retry = result.current.retryPendingCoin() })
    expect(mock.emit.mock.calls[1][1].requestId).toBe(pending.requestId)
    await act(async () => { mock.emit.mock.calls[1][2](new Error('timeout')); await retry })
  })

  it('ignores a Coin ACK after disconnect without applying its snapshot or clearing the journal', async () => {
    const { result } = prepareCoin()
    let request!: Promise<boolean>
    act(() => { request = result.current.giveCoin(session.roomId, 'target', 'red') })
    const pending = JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin
    mock.connected = false
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true,
      data: { ...coinState, revision: 6, gameLog: [coinReceipt(pending.requestId)] } }); expect(await request).toBe(false) })
    expect(result.current.roomState?.revision).toBe(5)
    expect(result.current.coinAction?.status).toBe('uncertain')
    expect(JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin).toEqual(pending)
  })

  it('treats a non-array receipt log as malformed confirmation without throwing', async () => {
    const { result } = prepareCoin()
    let request!: Promise<boolean>
    act(() => { request = result.current.giveCoin(session.roomId, 'target', 'red') })
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true,
      data: { ...coinState, revision: 6, gameLog: {} } }); expect(await request).toBe(false) })
    expect(result.current.roomState?.revision).toBe(5)
    expect(result.current.coinAction?.status).toBe('uncertain')
  })

  it('ignores Coin ACK from a replaced connection on the same Socket.IO object', async () => {
    const { result } = prepareCoin()
    let request!: Promise<boolean>
    act(() => { request = result.current.giveCoin(session.roomId, 'target', 'red') })
    const pending = JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin
    mock.id = 'reconnected-socket'
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true,
      data: { ...coinState, revision: 6, gameLog: [coinReceipt(pending.requestId)] } }); expect(await request).toBe(false) })
    expect(result.current.roomState?.revision).toBe(5)
    expect(result.current.coinAction?.status).toBe('uncertain')
    expect(JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin).toEqual(pending)
  })

  it('does not report confirmed Coin when journal cleanup fails', async () => {
    const { result } = prepareCoin()
    let request!: Promise<boolean>
    act(() => { request = result.current.giveCoin(session.roomId, 'target', 'red') })
    const pending = JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin
    const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('fixture quota') })
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true,
      data: { ...coinState, revision: 6, gameLog: [coinReceipt(pending.requestId)] } }); expect(await request).toBe(false) })
    denied.mockRestore()
    expect(result.current.coinAction?.status).toBe('uncertain')
    expect(JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin.requestId).toBe(pending.requestId)
    // Existing committed-log recovery is explicit and needs no second emission.
    await act(async () => { expect(await result.current.retryPendingCoin()).toBe(true) })
    expect(mock.emit).toHaveBeenCalledOnce()
  })

  it('journals before emit and restores the same operation after remount and private admission', async () => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const first = renderHook(() => useSocket())
    act(() => mock.handlers.get('room_state')!(coinState))
    let original!: Promise<boolean>
    act(() => { original = first.result.current.giveCoin(session.roomId, 'target', 'red') })
    const saved = JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin
    const originalCallback = mock.emit.mock.calls[0][2]
    expect(saved.requestId).toBe(mock.emit.mock.calls[0][1].requestId)
    expect(saved.actorId).toBe(session.userId)
    expect(saved).not.toHaveProperty('ownerToken')
    expect(saved).not.toHaveProperty('inFlight')
    expect(first.result.current.coinAction?.status).toBe('pending')
    first.unmount()
    mock.emit.mockClear()
    const second = renderHook(() => useSocket())
    expect(second.result.current.coinAction?.status).toBe('uncertain')
    act(() => mock.handlers.get('connect')!())
    act(() => mock.emit.mock.calls[0][2](null, { success: true,
      session: { roomId: session.roomId, userId: session.userId, token: session.sessionToken, generation: 2 } }))
    expect(JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin.requestId).toBe(saved.requestId)
    act(() => mock.handlers.get('room_state')!({ ...coinState, revision: 6, players: [coinState.players[0],
      { ...coinState.players[1], socketId: 'new-target' }] }))
    let retry!: Promise<boolean>
    act(() => { retry = second.result.current.retryPendingCoin() })
    expect(mock.emit.mock.calls[1][1]).toEqual(expect.objectContaining({ requestId: saved.requestId, receiverSocketId: 'new-target' }))
    await act(async () => { mock.emit.mock.calls[1][2](null, { success: true,
      data: { ...coinState, revision: 7, gameLog: [coinReceipt(saved.requestId)] } }); expect(await retry).toBe(true) })
    expect(JSON.parse(localStorage.getItem('emcoin_session')!)).not.toHaveProperty('pendingCoin')
    expect(second.result.current.coinAction?.status).toBe('confirmed')
    // Resolve the abandoned hook promise without writing back an obsolete journal.
    await act(async () => { originalCallback(new Error('abandoned ACK')); expect(await original).toBe(false) })
    expect(JSON.parse(localStorage.getItem('emcoin_session')!)).not.toHaveProperty('pendingCoin')
  })

  it('sends nothing when durable session storage cannot be written', async () => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const { result } = renderHook(() => useSocket())
    act(() => mock.handlers.get('room_state')!(coinState))
    const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota fixture') })
    try {
      await act(async () => { expect(await result.current.giveCoin(session.roomId, 'target', 'red')).toBe(false) })
      expect(mock.emit).not.toHaveBeenCalled()
      expect(result.current.error).toContain('Không lưu được')
    } finally { denied.mockRestore() }
  })

  it('still accepts the confirmed projection and phase when resume storage fails', () => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const { result } = renderHook(() => useSocket())
    const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage fixture') })
    try {
      act(() => mock.handlers.get('room_state')!(coinState))
      expect(result.current.roomState?.revision).toBe(coinState.revision)
      expect(useGameStore.getState().gameStep).toBe('give-coins')
      expect(result.current.error).toContain('Trạng thái phòng vẫn được giữ')
    } finally { denied.mockRestore() }
  })

  it('handles private admission storage failure without fabricating credentials or emitting a gift', async () => {
    const { result } = renderHook(() => useSocket())
    act(() => { void result.current.joinRoom(session.roomId, 'Guest', true) })
    const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage fixture') })
    try {
      act(() => mock.emit.mock.calls[0][2](null, { success: true,
        session: { roomId: session.roomId, userId: mock.emit.mock.calls[0][1].userId, token: session.sessionToken, generation: 1 } }))
      expect(result.current.error).toContain('Không lưu được phiên chơi')
      act(() => mock.handlers.get('room_state')!(coinState))
      expect(result.current.roomState?.id).toBe(session.roomId)
      expect(result.current.error).toContain('Không lưu được phiên chơi')
      await act(async () => { expect(await result.current.giveCoin(session.roomId, 'target', 'red')).toBe(false) })
      expect(mock.emit).toHaveBeenCalledOnce()
      expect(localStorage.getItem('emcoin_session')).toBeNull()
    } finally { denied.mockRestore() }
  })

  it.each(['wrong-actor', 'bad-amount', 'bad-id'])('fails closed on a corrupt pending journal: %s', async corruption => {
    const pending = { version: 'coin-request/v1', roomId: session.roomId, actorId: session.userId,
      receiverUserId: 'recipient', receiverSocketId: 'target', coinType: 'red', amount: 1, round: 1, requestId: 'saved-operation' }
    if (corruption === 'wrong-actor') pending.actorId = 'another-guest'
    if (corruption === 'bad-amount') pending.amount = -1
    if (corruption === 'bad-id') pending.requestId = '../invalid'
    localStorage.setItem('emcoin_session', JSON.stringify({ ...session, pendingCoin: pending }))
    const { result } = renderHook(() => useSocket())
    act(() => mock.handlers.get('room_state')!(coinState))
    await act(async () => { expect(await result.current.giveCoin(session.roomId, 'target', 'red')).toBe(false) })
    expect(mock.emit).not.toHaveBeenCalled()
    expect(result.current.error).toContain('không hợp lệ')
    expect(JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin).toEqual(pending)
  })

  it.each([false, true])('does not let a late old ACK clear another journal operation (credential replaced: %s)', async replaced => {
    localStorage.setItem('emcoin_session', JSON.stringify(session))
    const { result } = renderHook(() => useSocket())
    act(() => mock.handlers.get('room_state')!(coinState))
    let old!: Promise<boolean>
    act(() => { old = result.current.giveCoin(session.roomId, 'target', 'red') })
    const saved = JSON.parse(localStorage.getItem('emcoin_session')!)
    const token = replaced ? 'replacement-token' : session.sessionToken
    localStorage.setItem('emcoin_session', JSON.stringify({ ...saved, sessionToken: token,
      pendingCoin: { ...saved.pendingCoin, requestId: 'other-operation' } }))
    await act(async () => { mock.emit.mock.calls[0][2](null, { success: true,
      data: { ...coinState, revision: 6, gameLog: [coinReceipt(saved.pendingCoin.requestId)] } }); expect(await old).toBe(false) })
    expect(result.current.roomState?.revision).toBe(5)
    expect(JSON.parse(localStorage.getItem('emcoin_session')!).pendingCoin.requestId).toBe('other-operation')
    expect(JSON.parse(localStorage.getItem('emcoin_session')!).sessionToken).toBe(token)
  })

  it('does not reopen a terminal snapshot or adopt another admitted room', () => {
    const { result } = renderHook(() => useSocket())
    act(() => { void result.current.joinRoom('ordered-room', 'Guest', true) })
    act(() => mock.emit.mock.calls[0][2](null, { success: true, session: { roomId: 'ordered-room', userId: mock.emit.mock.calls[0][1].userId, token: 'fixture', generation: 1 } }))
    const ended = { id: 'ordered-room', players: [], status: 'ended', phase: 'ended', revision: 8 }
    act(() => mock.handlers.get('game_ended')!(ended))
    act(() => mock.handlers.get('room_state')!({ ...ended, status: 'playing', phase: 'night', revision: 9 }))
    act(() => mock.handlers.get('room_state')!({ ...ended, id: 'wrong-room', revision: 20 }))
    expect(result.current.roomState?.id).toBe('ordered-room')
    expect(result.current.roomState?.status).toBe('ended')
  })
})
