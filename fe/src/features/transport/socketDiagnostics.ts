const events = ['connect', 'disconnect', 'room_state', 'player_joined', 'player_reconnected',
  'players_disconnected', 'player_left', 'game_started', 'night_action_completed', 'phase_changed',
  'turn_changed', 'coin_given', 'card_selected', 'response_received', 'ntg_vote_cast',
  'role_rewards_confirmed', 'reflection_shared', 'vote_submitted', 'voting_complete', 'vote_updated',
  'rooms_list', 'room_closed', 'error', 'join_room'] as const
type DiagnosticEvent = typeof events[number]
type Severity = 'info' | 'warn' | 'error'

/** Deliberately accepts no payload/error/identifier. No external collector or storage. */
export function socketDiagnostic(event: DiagnosticEvent, severity: Severity = 'info'): boolean {
  if (!(events as readonly unknown[]).includes(event) || !['info', 'warn', 'error'].includes(severity)) return false
  if (severity === 'info' && !import.meta.env.DEV) return true
  const record = JSON.stringify({ version: 'socket-diagnostic/v1', event, severity })
  if (severity === 'info') console.debug(record)
  else console[severity](record)
  return true
}
