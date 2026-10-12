import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CardInventory } from '@/components/game/CardInventory'
import { CARD_DATA } from '@/constants/cardCatalog'

afterEach(cleanup)
describe('card selection confirmation (unchanged catalog/art)', () => {
  it.each([true, false])('keeps the preview pending and closes only for positive ACK: %s', async success => {
    let complete!: (success: boolean) => void
    const select = vi.fn(() => new Promise<boolean>(resolve => { complete = resolve }))
    const close = vi.fn()
    render(<CardInventory allowedCategory="emotion" showConfirmButton onSelectCard={select} onClose={close} />)
    const card = CARD_DATA.emotionsByType.basic[0]
    const image = screen.getByAltText(card.id)
    expect(image).toHaveAttribute('src', card.frontImage)
    fireEvent.click(image.closest('button')!)
    const confirm = screen.getByTestId('btn-confirm-preview-card')
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(select).toHaveBeenCalledOnce()
    expect(select).toHaveBeenCalledWith(card)
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveAttribute('aria-busy', 'true')
    expect(close).not.toHaveBeenCalled()
    await act(async () => { complete(success) })
    expect(close).toHaveBeenCalledTimes(success ? 1 : 0)
    expect(confirm).not.toBeDisabled()
  })
  it('does not treat a legacy void callback as confirmed success', async () => {
    const close = vi.fn()
    render(<CardInventory allowedCategory="emotion" showConfirmButton onSelectCard={() => undefined} onClose={close} />)
    fireEvent.click(screen.getByAltText(CARD_DATA.emotionsByType.basic[0].id).closest('button')!)
    await act(async () => { fireEvent.click(screen.getByTestId('btn-confirm-preview-card')) })
    expect(close).not.toHaveBeenCalled()
  })
  it('retains pending preview on Escape, then dismisses only the preview after rejection', async () => {
    let ack!: (ok: boolean) => void
    const close = vi.fn()
    render(<CardInventory allowedCategory="emotion" showConfirmButton onSelectCard={() => new Promise<boolean>(resolve => { ack = resolve })} onClose={close} />)
    fireEvent.click(screen.getByAltText(CARD_DATA.emotionsByType.basic[0].id).closest('button')!)
    fireEvent.click(screen.getByTestId('btn-confirm-preview-card'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'Xem thẻ' })).toBeInTheDocument()
    expect(close).not.toHaveBeenCalled()
    await act(async () => { ack(false) })
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Xem thẻ' })).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'Bộ thẻ' })).toBeInTheDocument()
    expect(close).not.toHaveBeenCalled()
  })
})
