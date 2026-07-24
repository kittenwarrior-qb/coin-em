import { useState } from 'react'
import { CartoonModal, CartoonInput, CartoonButton, CartoonCheckbox } from '@/components/cartoon'

interface CardDeckSelection {
  situation: { light: boolean; medium: boolean; sensitive: boolean }
  emotion: { basic: boolean; light: boolean; strong: boolean; advanced: boolean }
}

interface CreateRoomModalProps {
  open: boolean
  onClose: () => void
  onCreate: (userName: string, cardDecks?: CardDeckSelection) => void
}

const DEFAULT_DECKS: CardDeckSelection = {
  situation: { light: true, medium: true, sensitive: false },
  emotion:   { basic: true, light: true, strong: false, advanced: false },
}

export function CreateRoomModal({ open, onClose, onCreate }: CreateRoomModalProps) {
  const [userName, setUserName] = useState('')
  const [decks, setDecks] = useState<CardDeckSelection>(DEFAULT_DECKS)

  const toggleSituation = (key: keyof CardDeckSelection['situation']) =>
    setDecks(d => ({ ...d, situation: { ...d.situation, [key]: !d.situation[key] } }))

  const toggleEmotion = (key: keyof CardDeckSelection['emotion']) =>
    setDecks(d => ({ ...d, emotion: { ...d.emotion, [key]: !d.emotion[key] } }))

  const handleCreate = () => {
    if (!userName.trim()) return
    onCreate(userName.trim(), decks)
    onClose()
  }

  return (
    <CartoonModal open={open} onClose={onClose} title="Tạo phòng" data-testid="modal-create">
      <div className="flex flex-col gap-4">
        <CartoonInput
          label="Tên của bạn"
          data-testid="input-username-create"
          value={userName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserName(e.target.value)}
          placeholder="Nhập tên"
        />

        {/* Card deck selection */}
        <div className="flex flex-col gap-3">
          {/* Situation */}
          <div>
            <p className="font-display text-sm mb-2" style={{ color: '#2f76ac' }}>Thẻ Tình huống</p>
            <div className="flex gap-1">
              <CartoonCheckbox label="Nhẹ"       data-testid="checkbox-situation-light"     checked={decks.situation.light}     onChange={() => toggleSituation('light')} />
              <CartoonCheckbox label="Vừa"       data-testid="checkbox-situation-medium"    checked={decks.situation.medium}    onChange={() => toggleSituation('medium')} />
              <CartoonCheckbox label="Nhạy cảm"  data-testid="checkbox-situation-sensitive" checked={decks.situation.sensitive} onChange={() => toggleSituation('sensitive')} />
            </div>
          </div>

          {/* Emotion */}
          <div>
            <p className="font-display text-sm mb-2" style={{ color: '#2f76ac' }}>Thẻ Cảm xúc</p>
            <div className="flex gap-1">
              <CartoonCheckbox label="Cơ bản"   data-testid="checkbox-emotion-basic"    checked={decks.emotion.basic}    onChange={() => toggleEmotion('basic')} />
              <CartoonCheckbox label="Nhẹ"      data-testid="checkbox-emotion-light"    checked={decks.emotion.light}    onChange={() => toggleEmotion('light')} />
              <CartoonCheckbox label="Mạnh"     data-testid="checkbox-emotion-strong"   checked={decks.emotion.strong}   onChange={() => toggleEmotion('strong')} />
              <CartoonCheckbox label="Nâng cao" data-testid="checkbox-emotion-advanced" checked={decks.emotion.advanced} onChange={() => toggleEmotion('advanced')} />
            </div>
          </div>
        </div>

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
