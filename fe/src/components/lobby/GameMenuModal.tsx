import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CartoonModal, CartoonButton } from '@/components/cartoon'
import { CardInventory } from '@/components/game/CardInventory'

interface GameMenuModalProps {
  open: boolean
  onClose: () => void
  onGuide: () => void
  onSettings?: () => void
  onQuit?: () => void
}

export function GameMenuModal({ open, onClose, onGuide, onQuit }: GameMenuModalProps) {
  const [showCardDeck, setShowCardDeck] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)

  return (
    <>
      <CartoonModal open={open} onClose={onClose} title="Menu">
        <div className="flex flex-col gap-4 py-2">
          <CartoonButton color="green" size="lg" className="w-full" onClick={() => setShowCardDeck(true)}>
            Bộ thẻ
          </CartoonButton>

          <CartoonButton color="purple" size="lg" className="w-full" onClick={onGuide}>
            Hướng dẫn
          </CartoonButton>

          {onQuit && (
            <CartoonButton color="orange" size="lg" className="w-full" onClick={() => setShowQuitConfirm(true)}>
              Thoát game
            </CartoonButton>
          )}
        </div>
      </CartoonModal>

      <AnimatePresence>
        {showCardDeck && (
          <CardInventory onClose={() => setShowCardDeck(false)} />
        )}
      </AnimatePresence>

      <CartoonModal 
        open={showQuitConfirm} 
        onClose={() => setShowQuitConfirm(false)} 
        title="Xác nhận thoát"
      >
        <div className="py-2">
          <p className="font-body text-sm text-center mb-4">
            Bạn có chắc muốn thoát game không?
          </p>
          <div className="flex gap-3">
            <CartoonButton 
              color="blue" 
              size="md" 
              className="flex-1"
              onClick={() => setShowQuitConfirm(false)}
            >
              Ở lại
            </CartoonButton>
            <CartoonButton 
              color="orange" 
              size="md" 
              className="flex-1"
              onClick={() => {
                setShowQuitConfirm(false)
                onClose()
                onQuit?.()
              }}
            >
              Thoát
            </CartoonButton>
          </div>
        </div>
      </CartoonModal>
    </>
  )
}
