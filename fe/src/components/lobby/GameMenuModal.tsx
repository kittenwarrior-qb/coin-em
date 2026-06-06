import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CartoonModal, CartoonButton } from '@/components/cartoon'
import { CardInventory } from '@/components/game/CardInventory'
import { GuideBook } from '@/components/game/GuideBook'

interface GameMenuModalProps {
  open: boolean
  onClose: () => void
  onGuide?: () => void
  onSettings?: () => void
  onQuit?: () => void
}

export function GameMenuModal({ open, onClose, onQuit }: GameMenuModalProps) {
  const [showCardDeck, setShowCardDeck] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  return (
    <>
      <CartoonModal open={open} onClose={onClose} title="Menu">
        <div className="flex flex-col gap-4 py-2">
          <CartoonButton color="green" size="lg" className="w-full" onClick={() => setShowCardDeck(true)}>
            Bộ thẻ
          </CartoonButton>

          <CartoonButton color="purple" size="lg" className="w-full" onClick={() => setShowGuide(true)}>
            Hướng dẫn
          </CartoonButton>

          {!onQuit && (
            <CartoonButton color="orange" size="lg" className="w-full" onClick={() => setShowSupport(true)}>
              Support
            </CartoonButton>
          )}

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

      <AnimatePresence>
        {showGuide && (
          <GuideBook onClose={() => setShowGuide(false)} />
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

      <CartoonModal
        open={showSupport}
        onClose={() => setShowSupport(false)}
        title="Support"
      >
        <div className="flex justify-center py-3">
          <div className="flex w-full max-w-[260px] flex-col items-center justify-center gap-4">
            <img
              src="/support/ricimi logo.png"
              alt="ricimi"
              className="object-contain"
              draggable={false}
            />
          </div>
        </div>
      </CartoonModal>
    </>
  )
}
