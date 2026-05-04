import { useState } from 'react'
import { CartoonModal, CartoonInput, CartoonButton } from '@/components/cartoon'

interface CreateRoomModalProps {
  open: boolean
  onClose: () => void
  onCreate: (userName: string) => void
}

export function CreateRoomModal({ open, onClose, onCreate }: CreateRoomModalProps) {
  const [userName, setUserName] = useState('')

  const handleCreate = () => {
    if (!userName.trim()) return
    onCreate(userName.trim())
    onClose()
  }

  return (
    <CartoonModal open={open} onClose={onClose} title="Tạo phòng" data-testid="modal-create">
      <div className="flex flex-col gap-3">
        <CartoonInput
          label="Tên của bạn"
          data-testid="input-username-create"
          value={userName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserName(e.target.value)}
          placeholder="Nhập tên"
        />

        <CartoonButton
          color="yellow"
          size="lg"
          disabled={!userName.trim()}
          onClick={handleCreate}
          data-testid="btn-confirm-create"
        >
          Tạo phòng
        </CartoonButton>
      </div>
    </CartoonModal>
  )
}
