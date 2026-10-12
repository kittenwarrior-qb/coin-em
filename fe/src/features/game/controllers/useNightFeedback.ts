import { useEffect, useRef, useState } from 'react'
import type { GameLogEntry, RoomState } from '@/components/game/types'

type Flight = { fromId: string; toId: string; iconSrc: string; nonce: number }
type Notice = { name: string; isMe: boolean; avatarIndex?: number; bgIndex?: number; nonce: number }
const fingerprint = (entry: GameLogEntry) => JSON.stringify([entry.type, entry.actorId, entry.targetId, entry.timestamp])
const isNight = (entry: GameLogEntry) => entry.type === 'HEAL' || entry.type === 'SILENCE'

/** Feedback consumes visible committed logs, never a click or a reconstructed role. */
export function useNightFeedback(room: RoomState, myUserId: string, isNarrator: boolean) {
  const [flyingActionEffect, setFlyingActionEffect] = useState<Flight | null>(null)
  const [mutedNotice, setMutedNotice] = useState<Notice | null>(null)
  const observed = useRef<{ scope: string; seen: Set<string> } | null>(null)
  const sequence = useRef(0)

  useEffect(() => {
    const logs = (room.gameLog ?? []).filter(isNight)
    const scope = JSON.stringify([room.id, room.currentRound, myUserId, isNarrator])
    if (!observed.current || observed.current.scope !== scope) {
      observed.current = { scope, seen: new Set(logs.map(fingerprint)) }
      setFlyingActionEffect(null)
      setMutedNotice(null)
      return // First accepted projection is hydration, not a realtime event.
    }
    const fresh = logs.filter(entry => !observed.current!.seen.has(fingerprint(entry)))
    for (const entry of fresh) observed.current.seen.add(fingerprint(entry))
    if (room.status !== 'playing') { setFlyingActionEffect(null); setMutedNotice(null); return }
    for (const entry of fresh) {
      const actor = room.players.find(player => player.userId === entry.actorId)
      const targetIndex = room.players.findIndex(player => player.userId === entry.targetId)
      const target = room.players[targetIndex]
      if (!actor || !target) continue
      const nonce = ++sequence.current
      if (isNarrator || entry.actorId === myUserId) {
        setFlyingActionEffect({
          fromId: actor.socketId, toId: target.socketId,
          iconSrc: entry.type === 'HEAL' ? '/emcoin/icons/orbit/heal.svg' : '/emcoin/icons/orbit/lock.svg',
          nonce,
        })
      }
      if (entry.type === 'SILENCE' && room.mutedPlayer === entry.targetId) {
        setMutedNotice({ name: target.name, isMe: target.userId === myUserId,
          avatarIndex: target.avatarIndex ?? targetIndex, bgIndex: target.bgIndex ?? targetIndex, nonce })
      }
    }
  }, [room, myUserId, isNarrator])

  return { flyingActionEffect, setFlyingActionEffect, mutedNotice, setMutedNotice }
}
