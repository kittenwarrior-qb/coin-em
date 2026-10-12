import { useState } from 'react'
import { CartoonModal, CartoonInput, CartoonButton, CartoonCard } from '@/components/cartoon'
import { RoomCard, RoomListItem } from './RoomCard'
import { useConfirmedAction } from '@/features/game/controllers/useConfirmedAction'

interface JoinRoomModalProps {
  open: boolean
  onClose: () => void
  availableRooms: RoomListItem[]
  onJoin: (roomId: string, userName: string) => Promise<boolean> | void
  onRefresh: () => void
}

export function JoinRoomModal({ open, onClose, availableRooms, onJoin }: Omit<JoinRoomModalProps, 'onRefresh'> & { onRefresh?: () => void }) {
  const [userName, setUserName] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<RoomListItem | null>(null)
  const [manualRoomId, setManualRoomId] = useState('')
  const { pending, run, error } = useConfirmedAction('join', open)
  const [confirmationError, setConfirmationError] = useState<string | null>(null)

  const effectiveRoomId = selectedRoom?.id || manualRoomId.trim().toUpperCase()
  const canJoin = !!userName.trim() && !!effectiveRoomId

  const handleJoin = async () => {
    if (!canJoin) return
    if (await run(async isCurrent => {
      setConfirmationError(null)
      const result = onJoin(effectiveRoomId, userName.trim())
      const confirmed = result === undefined ? true : await result
      if (!confirmed && isCurrent()) setConfirmationError('Chưa xác nhận vào phòng. Tên và mã phòng của bạn vẫn được giữ.')
      return confirmed
    })) onClose()
  }

  return (
    <CartoonModal open={open} onClose={pending ? undefined : onClose} persistent={pending} hideClose={pending} title="Tìm phòng" data-testid="modal-join">
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3 border-0 p-0">
        {availableRooms.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm">Phòng đang chờ</span>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto scroll-cartoon" style={{ maxHeight: 184 }}>
              {availableRooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  selected={selectedRoom?.id === room.id}
                  onSelect={() => { setSelectedRoom(room); setManualRoomId('') }}
                />
              ))}
            </div>
          </div>
        ) : (
          <CartoonCard pastel="yellow" variant="sm" className="p-3 text-center">
            <p className="font-body text-sm">Chưa có phòng nào đang chờ</p>
          </CartoonCard>
        )}

        <CartoonInput
          label="Mã phòng"
          data-testid="input-room-id"
          value={selectedRoom ? selectedRoom.id : manualRoomId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setManualRoomId(e.target.value.toUpperCase())
            setSelectedRoom(null)
          }}
          placeholder="Nhập mã phòng"
        />

        <CartoonInput
          label="Tên của bạn"
          data-testid="input-username-join"
          value={userName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserName(e.target.value)}
          placeholder="Nhập tên"
        />

        <CartoonButton
          color="green"
          size="lg"
          disabled={!canJoin}
          pending={pending}
          onClick={handleJoin}
          data-testid="btn-confirm-join"
        >
          Vào phòng 🎮
        </CartoonButton>
      </fieldset>
      {(error || confirmationError) && <p role="alert" className="font-body text-sm">{error || confirmationError}</p>}
    </CartoonModal>
  )
}
