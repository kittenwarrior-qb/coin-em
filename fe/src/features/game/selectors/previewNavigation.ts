import type { CardData, GamePhase, SelectedCards } from '@/stores/types'

export interface CardPreviewEntry { card: CardData; revealed: boolean }

/** Only navigates the already-authorized selection; no catalog or room access. */
export function previewNavigation(preview: CardPreviewEntry, selected: SelectedCards, phase: GamePhase) {
  let entries: CardPreviewEntry[] = []
  let index = -1
  if (preview.card.category === 'reflection' && selected.reflections.length > 1) {
    entries = selected.reflections.map(card => ({ card, revealed: true }))
    index = selected.reflections.findIndex(card => card.id === preview.card.id)
  } else if ((preview.card.category === 'situation' || preview.card.category === 'emotion') &&
    selected.situation && selected.emotion) {
    entries = [
      { card: selected.situation, revealed: phase !== 'situation-card' },
      { card: selected.emotion, revealed: true },
    ]
    index = entries.findIndex(entry => entry.card.id === preview.card.id)
  }
  const canNavigate = entries.length > 1 && index >= 0
  return { entries, index, canNavigate,
    previous: canNavigate && index > 0 ? entries[index - 1] : null,
    next: canNavigate && index < entries.length - 1 ? entries[index + 1] : null }
}
