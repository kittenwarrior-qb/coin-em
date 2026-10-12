import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CartoonModal, CartoonButton } from '@/components/cartoon'
import { CardInventory } from '@/components/game/CardInventory'
import { GuideBook } from '@/components/game/GuideBook'
import { APPROVED_GAME_INFO } from '@/content/approvedGameInfo'
import { useConfirmedAction } from '@/features/game/controllers/useConfirmedAction'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { LogOut, Layers, Box, BookOpen, Headphones } from 'lucide-react'
import { isBrandTheme } from '@/components/cartoon/controlThemes'
import { BrandIcon } from '@/components/cartoon/BrandIcon'
import { OrbitMenuIcon } from '@/components/cartoon/OrbitMenuIcon'
import { PublicCatalogBoundary } from '@/features/game/catalog/PublicCatalog'

interface GameMenuModalProps {
  catalogScope?: 'public' | 'room'
  open: boolean
  onClose: () => void
  onGuide?: () => void
  onSettings?: () => void
  onQuit?: () => Promise<boolean> | void
  /** Preview-only direction until the owner approves a wider rollout. */
  visualStyle?: 'current' | 'sky-pink-study'
}

export function GameMenuModal({ open, onClose, onQuit, visualStyle = 'current', catalogScope = 'public' }: GameMenuModalProps) {
  const theme = useControlTheme()
  const themed = theme !== 'legacy'
  const branded = isBrandTheme(theme)
  const orbit = theme === 'emotion-orbit'
  const iconName = (Icon: typeof Layers) => Icon === Layers ? 'cards' : Icon === Box ? 'box' : Icon === BookOpen ? 'book' : 'headset'
  const menuLabel = (label: string, Icon: typeof Layers) => branded
    ? <span className="brand-menu-label"><span className="brand-menu-icon">{orbit ? <OrbitMenuIcon name={iconName(Icon)} /> : <BrandIcon name={iconName(Icon)} />}</span><span className="brand-menu-text">{label}{orbit && Icon === Box && <span className="orbit-menu-new" aria-hidden="true">MỚI</span>}</span>{orbit ? <OrbitMenuIcon name="arrow" /> : <BrandIcon name="chevron" />}</span>
    : label
  const harmonized = themed && visualStyle === 'sky-pink-study'
  const [showCardDeck, setShowCardDeck] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const { pending: quitPending, run: confirmQuit, error: quitError } = useConfirmedAction('menu-quit', open && showQuitConfirm)

  return (
    <>
      <CartoonModal open={open} onClose={onClose} title="Menu" appearance="menu" initialFocus={harmonized ? 'panel' : undefined} className={harmonized ? 'theme-a-menu--harmonized' : undefined}>
        <div className={themed ? 'theme-a-menu-actions' : 'flex flex-col gap-4 py-2'}>
          <CartoonButton color="green" size="lg" className="w-full" onClick={() => setShowCardDeck(true)}>
            {menuLabel('Bộ thẻ', Layers)}
          </CartoonButton>

          <CartoonButton
            color="pink"
            size="lg"
            className="w-full"
            onClick={() => window.open('/cards', '_blank', 'noopener,noreferrer')}
            aria-label="Mở Bộ thẻ 3d trong tab mới"
            badge={orbit ? undefined : 'MỚI'}
          >
            {menuLabel('Bộ thẻ 3d', Box)}
          </CartoonButton>

          <CartoonButton color={harmonized ? 'green' : themed ? 'cream' : 'purple'} size="lg" className="w-full" onClick={() => setShowGuide(true)}>
            {menuLabel('Hướng dẫn', BookOpen)}
          </CartoonButton>

          {!onQuit && (
            <CartoonButton color={harmonized ? 'green' : 'orange'} size="lg" className="w-full" onClick={() => setShowSupport(true)}>
              {menuLabel('Hỗ trợ', Headphones)}
            </CartoonButton>
          )}

          {onQuit && themed && (
            <div className="theme-a-menu-exit">
              <CartoonButton color={harmonized ? 'green' : 'blush-soft'} className="theme-a-menu-quit" onClick={() => setShowQuitConfirm(true)}>
                <span className="theme-a-menu-quit-label"><LogOut size={18} aria-hidden="true" /><span>Thoát game</span></span>
              </CartoonButton>
            </div>
          )}
          {onQuit && !themed && (
            <CartoonButton color="orange" size="lg" className="w-full" onClick={() => setShowQuitConfirm(true)}>
              Thoát game
            </CartoonButton>
          )}
        </div>
      </CartoonModal>

      <AnimatePresence>
        {showCardDeck && (
          catalogScope === 'room' ? <CardInventory onClose={() => setShowCardDeck(false)} /> :
            <PublicCatalogBoundary presentation="overlay" onClose={() => setShowCardDeck(false)} closeLabel="Đóng">
              <CardInventory onClose={() => setShowCardDeck(false)} />
            </PublicCatalogBoundary>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGuide && (
          <GuideBook onClose={() => setShowGuide(false)} />
        )}
      </AnimatePresence>

      <CartoonModal 
        open={showQuitConfirm} 
        onClose={quitPending ? undefined : () => setShowQuitConfirm(false)}
        persistent={quitPending}
        hideClose={quitPending}
        title="Xác nhận thoát"
      >
        <div className="py-2">
          <p className="font-body text-sm text-center mb-4">
            Bạn có chắc muốn thoát game không?
          </p>
          <div className="flex gap-3">
            <CartoonButton 
              color="blue" 
              disabled={quitPending}
              size="md" 
              className="flex-1"
              onClick={() => setShowQuitConfirm(false)}
            >
              Ở lại
            </CartoonButton>
            <CartoonButton 
              color="orange" 
              pending={quitPending}
              size="md" 
              className="flex-1"
              onClick={async () => {
                if (!await confirmQuit(async () => { const result = onQuit?.(); return result === undefined ? true : await result })) return
                setShowQuitConfirm(false)
                onClose()
              }}
            >
              Thoát
            </CartoonButton>
          </div>
          {quitError && <p role="alert" className="font-body text-sm">{quitError}</p>}
        </div>
      </CartoonModal>

      <CartoonModal
        open={showSupport}
        onClose={() => setShowSupport(false)}
        title="Hỗ trợ"
      >
        <div className="flex justify-center py-3">
          <div className="flex w-full max-w-[260px] flex-col items-center justify-center gap-4">
            <p className="font-display text-xl">Hỗ trợ EmCoin</p>
            <p className="font-body text-sm text-center">Gửi câu hỏi hoặc mô tả lỗi đến:</p>
            <a className="font-body break-all text-center text-sm text-[var(--c-blue-dark)] underline" href={`mailto:${APPROVED_GAME_INFO.supportEmail}`}>{APPROVED_GAME_INFO.supportEmail}</a>
            <details className="w-full border-t pt-4 text-center font-body text-xs">
              <summary className="cursor-pointer py-2">Ghi nhận tài nguyên giao diện</summary>
              <p className="my-2">Avatar và icon giao diện dùng bộ EmCoin Friends mới.</p>
            </details>
          </div>
        </div>
      </CartoonModal>
    </>
  )
}
