import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CreateRoomModal } from '../../components/lobby/CreateRoomModal'
import { JoinRoomModal } from '../../components/lobby/JoinRoomModal'
import Lobby from '../../pages/Lobby'

afterEach(cleanup)

describe('real admission forms retain intent until confirmation', () => {
  it.each(['create', 'join'])('%s retains draft after an unexpected transport rejection', async kind => {
    const send = vi.fn(async () => { throw new Error('fixture transport') })
    const close = vi.fn()
    if (kind === 'create') render(<CreateRoomModal open onClose={close} onCreate={send} />)
    else render(<JoinRoomModal open onClose={close} onJoin={send} availableRooms={[]} />)
    fireEvent.change(screen.getByTestId(`input-username-${kind}`), { target: { value: 'Kept guest' } })
    if (kind === 'join') fireEvent.change(screen.getByTestId('input-room-id'), { target: { value: 'ABC123' } })
    fireEvent.click(screen.getByTestId(`btn-confirm-${kind}`))
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible())
    expect(screen.getByTestId(`input-username-${kind}`)).toHaveValue('Kept guest')
    expect(send).toHaveBeenCalledOnce()
    expect(close).not.toHaveBeenCalled()
  })
  it('keeps the real resume candidate and modal until positive admission confirmation', async () => {
    let ack!: (ok: boolean) => void
    const send = vi.fn(() => new Promise<boolean>(resolve => { ack = resolve }))
    const dismiss = vi.fn()
    render(<Lobby availableRooms={[]} onJoinRoom={() => {}} onCreateRoom={() => {}} onRefreshRooms={() => {}}
      resumeCandidates={[{ roomId: 'ABC123', userName: 'Guest', userId: 'fixture', deviceId: 'device', sessionToken: 'private-fixture', updatedAt: 1 }]}
      onResumeRoom={send} onDismissResume={dismiss} />)
    const resume = screen.getByRole('button', { name: 'Tham gia lại' })
    fireEvent.click(resume)
    fireEvent.click(resume)
    expect(send).toHaveBeenCalledOnce()
    expect(resume).toBeDisabled()
    const remove = screen.getByTestId('btn-dismiss-resume-ABC123')
    expect(remove).toBeDisabled()
    fireEvent.click(remove)
    expect(dismiss).not.toHaveBeenCalled()
    await act(async () => { ack(false) })
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible())
    expect(resume).not.toBeDisabled()
    fireEvent.click(resume)
    await act(async () => { ack(true) })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Tham gia lại' })).not.toBeInTheDocument())
  })
  it.each(['create', 'join'])('%s locks inputs, duplicate, close and backdrop pending, keeps rejected draft', async kind => {
    let ack!: (ok: boolean) => void
    const send = vi.fn(() => new Promise<boolean>(resolve => { ack = resolve }))
    const close = vi.fn()
    if (kind === 'create') render(<CreateRoomModal open onClose={close} onCreate={send} />)
    else render(<JoinRoomModal open onClose={close} onJoin={send} availableRooms={[]} />)
    const name = screen.getByTestId(`input-username-${kind}`)
    fireEvent.change(name, { target: { value: 'Kept guest' } })
    if (kind === 'join') fireEvent.change(screen.getByTestId('input-room-id'), { target: { value: 'ABC123' } })
    const submit = screen.getByTestId(`btn-confirm-${kind}`)
    fireEvent.click(submit)
    fireEvent.click(submit)
    expect(send).toHaveBeenCalledOnce()
    expect(submit).toBeDisabled()
    expect(name).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Đóng' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('cartoon-modal-overlay'))
    expect(close).not.toHaveBeenCalled()
    await act(async () => { ack(false) })
    expect(name).toHaveValue('Kept guest')
    expect(submit).not.toBeDisabled()
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible())
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(submit)
    await act(async () => { ack(true) })
    expect(close).toHaveBeenCalledOnce()
  })
})
