import { useState } from 'react'
import { CartoonModal, CartoonInput, CartoonButton, CartoonCard } from '@/components/cartoon'
import { RoomCard, RoomListItem } from './RoomCard'

interface JoinRoomModalProps {
  open: boolean
  onClose: () => void
  availableRooms: RoomListItem[]
  onJoin: (roomId: string, userName: string) => void
  onRefresh: () => void
}

export function JoinRoomModal({ open, onClose, availableRooms, onJoin, onRefresh: _ }: JoinRoomModalProps) {
  const [userName, setUserName] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<RoomListItem | null>(null)

  const canJoin = !!userName.trim() && !!selectedRoom

  const handleJoin = () => {
    if (!canJoin) return
    onJoin(selectedRoom!.id, userName.trim())
    onClose()
  }

  return (
    <CartoonModal open={open} onClose={onClose} title="Tìm phòng" data-testid="modal-join">
      <div className="flex flex-col gap-3">
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
                  onSelect={() => setSelectedRoom(room)}
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
          onClick={handleJoin}
          data-testid="btn-confirm-join"
        >
          Vào phòng 🎮
        </CartoonButton>
      </div>
    </CartoonModal>
  )
}
