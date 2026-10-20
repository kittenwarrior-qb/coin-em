import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { AnimatePresence, motion, useIsPresent } from 'framer-motion'
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePopupLifecycle } from '@/features/overlays/usePopupLifecycle'
import { CartoonButton } from '@/components/cartoon'
import { AVATAR_BG_COLORS, AVATAR_ICONS } from '@/components/cartoon/avatarConfig'
import type { CoinType, Player } from './types'
import { BrandIcon } from '@/components/cartoon/BrandIcon'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { isBrandTheme } from '@/components/cartoon/controlThemes'
import { BrandCoinIcon } from './BrandCoinIcon'
import { KawaiiGift } from '@/components/kawaii/KawaiiGift'

interface GiveCoinPickerProps {
  players: Player[]
  myPlayer?: Player
  onGiveCoin: (targetId: string, coinType: CoinType, amount: number) => Promise<boolean>
  finiteCycle?: boolean
  received?: Record<CoinType, number>
  onClose: () => void
}

export function GiveCoinPicker({ players, myPlayer, onGiveCoin, onClose, finiteCycle, received }: GiveCoinPickerProps) {
  const theme = useControlTheme()
  const branded = isBrandTheme(theme)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [showRecipientList, setShowRecipientList] = useState(false)
  const [coinType, setCoinType] = useState<CoinType>(finiteCycle && myPlayer?.isSender ? 'red' : finiteCycle ? 'green' : 'yellow')
  const [amount, setAmount] = useState(1)
  const [successName, setSuccessName] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const present = useIsPresent()
  const live = useRef(true)
  const submitting = useRef(false)
  const locked = pending || !present
  useLayoutEffect(() => { live.current = present; return () => { live.current = false } }, [present])
  usePopupLifecycle(dialogRef, present, { onClose, persistent: pending })

  // Everyone except yourself can receive coins
  const giftablePlayers = useMemo(
    () => players.filter(p => p.id !== myPlayer?.id && (!finiteCycle || coinType !== 'green' || p.isSender)),
    [myPlayer?.id, players, finiteCycle, coinType],
  )

  const selectedTarget = giftablePlayers.find(p => p.id === selectedPlayer)
  const redMax = Math.max(0, (myPlayer?.coins.red ?? 0) - (received?.red ?? 0))
  const yellowMax = Math.max(0, (myPlayer?.coins.yellow ?? 0) - (received?.yellow ?? 0))
  const greenMax = Math.max(0, (myPlayer?.coins.green ?? 0) - (received?.green ?? 0))
  const currentMax = coinType === 'red' ? redMax : coinType === 'green' ? greenMax : yellowMax
  const safeAmount = currentMax <= 0 ? 0 : Math.min(Math.max(1, amount), currentMax)
  const canGive = Boolean(selectedTarget && safeAmount > 0 && !locked && !successName)

  const chooseCoinType = (next: CoinType) => {
    if (locked || successName) return
    const nextMax = next === 'red' ? redMax : next === 'green' ? greenMax : yellowMax
    setCoinType(next)
    setAmount(nextMax <= 0 ? 0 : Math.min(Math.max(1, amount), nextMax))
  }

  const handleConfirm = async () => {
    if (!canGive || !selectedTarget || submitting.current || !live.current) return
    submitting.current = true
    setPending(true)
    setError(null)
    try {
      if (await onGiveCoin(selectedTarget.id, coinType, safeAmount) === true && live.current) {
        setSuccessName(selectedTarget.name)
        setSelectedPlayer(null)
        setAmount(1)
      }
    } catch {
      if (live.current) setError('Chưa xác nhận được việc trao Coin. Giữ nguyên lựa chọn và kiểm tra trạng thái kết nối.')
    } finally {
      submitting.current = false
      if (live.current) setPending(false)
    }
  }

  const coinColor = coinType === 'yellow' ? '#F5A623' : coinType === 'green' ? '#53B025' : '#F97BB0'
  const coinSrc = coinType === 'yellow' ? '/coins/vang.png' : coinType === 'green' ? '/coins/xanh.png' : '/coins/do.png'
  const coinLabel = coinType === 'yellow' ? 'vàng' : coinType === 'green' ? 'xanh' : 'đỏ'
  const availableTypes: CoinType[] = finiteCycle ? (myPlayer?.isSender ? ['red'] : ['green', 'yellow']) : ['yellow', 'red']

  if(theme==='candy-clouds')return <KawaiiGift dialogRef={dialogRef} types={availableTypes} coin={coinType} chooseCoin={chooseCoinType} max={type=>type==='red'?redMax:type==='green'?greenMax:yellowMax}
    amount={safeAmount} setAmount={setAmount} targets={giftablePlayers} target={selectedPlayer} chooseTarget={setSelectedPlayer} locked={locked} pending={pending}
    canGive={canGive} give={()=>void handleConfirm()} close={onClose} success={successName} again={()=>setSuccessName(null)} error={error}/>

  return (
    <motion.div
      className="absolute inset-0 z-[90] flex items-end justify-center overflow-hidden bg-black/55 px-3 py-3"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={locked ? undefined : successName ? () => setSuccessName(null) : onClose}
    >
      <motion.div
        className="relative flex max-h-full w-full max-w-[390px] flex-col overflow-hidden rounded-[28px] border-[3px] border-[var(--c-black)] bg-white shadow-[0_8px_0_rgba(0,0,0,0.22)]"
        data-testid="give-coin-dialog"
        ref={dialogRef} role="dialog" data-ui-panel="a1" aria-label="Trao Coin" tabIndex={-1} aria-busy={pending || undefined}
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={{ willChange: 'transform' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div data-ui-chrome="header" aria-hidden={successName ? true : undefined} className="flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-[var(--c-black)] bg-[var(--c-pink)] px-4 py-3">
          <div className="brand-gift-title font-display text-sm text-white">{branded ? <BrandIcon name="gift" /> : '🎁'} {branded ? 'Tặng Coin' : 'Tặng coin cho bạn'}</div>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 font-display text-lg leading-none text-white"
            aria-label="Đóng trao Coin"
            onClick={locked ? undefined : onClose}
            disabled={locked || Boolean(successName)}
          >{branded ? <BrandIcon name="close" className="h-6 w-6" /> : '×'}</button>
        </div>

        <div aria-hidden={successName ? true : undefined} className="min-h-0 overflow-y-auto p-4 space-y-4" data-testid="give-coin-dialog-scroll">
          {/* Coin type selector */}
          <div className="brand-coin-types grid gap-2" style={{ gridTemplateColumns: `repeat(${availableTypes.length}, minmax(0, 1fr))` }}>
            {availableTypes.map(type => {
              const max = type === 'yellow' ? yellowMax : type === 'green' ? greenMax : redMax
              const active = coinType === type
              const src = type === 'yellow' ? '/coins/vang.png' : type === 'green' ? '/coins/xanh.png' : '/coins/do.png'
              const label = type === 'yellow' ? 'Vàng' : type === 'green' ? 'Xanh' : 'Đỏ'
              const activeColor = type === 'yellow' ? 'border-yellow-400 bg-yellow-50' : type === 'green' ? 'border-green-400 bg-green-50' : 'border-pink-400 bg-pink-50'
              return (
                <button
                  key={type}
                  data-coin-type={type}
                  aria-label={`${label} · ${max}`}
                  aria-pressed={active}
                  type="button"
                  onClick={() => chooseCoinType(type)}
                  disabled={locked || Boolean(successName) || max <= 0}
                  className={[
                    'flex items-center justify-center gap-2 rounded-2xl border-2 py-3 font-display text-sm transition-all',
                    active ? activeColor + ' shadow-[0_3px_0_rgba(0,0,0,0.12)]' : 'border-gray-100 bg-gray-50 text-gray-400',
                    max <= 0 ? 'opacity-40' : '',
                  ].join(' ')}
                >
                  {branded ? <BrandCoinIcon type={type} workshop={theme === 'kindness-workshop'} /> : <EmcoinImage src={src} alt="" className="h-7 w-7 object-contain" draggable={false} />}
                  <span style={{ color: active ? (type === 'yellow' ? '#B45309' : '#BE185D') : undefined }}>
                    {label} · {max}{branded ? ' còn lại' : ''}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Amount selector */}
          <div className="brand-coin-amount flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              {!branded && <EmcoinImage src={coinSrc} alt="" className="h-8 w-8 object-contain" draggable={false} />}
              <span className="font-display text-sm" style={{ color: coinColor }}>
                {branded ? 'Số lượng' : `Tặng ${coinLabel}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAmount(Math.max(1, safeAmount - 1))}
                disabled={locked || Boolean(successName) || safeAmount <= 1 || currentMax <= 0}
                aria-label="Giảm số Coin"
                data-ui-chrome="circle"
                className="grid h-11 w-11 place-items-center rounded-full border-2 border-gray-200 bg-white font-display text-lg text-gray-600 shadow-[0_2px_0_rgba(0,0,0,0.08)] disabled:opacity-30"
              >−</button>
              <span className="w-6 text-center font-display text-xl" style={{ color: coinColor }}>
                {safeAmount}
              </span>
              <button
                type="button"
                onClick={() => setAmount(Math.min(currentMax, safeAmount + 1))}
                disabled={locked || Boolean(successName) || safeAmount >= currentMax || currentMax <= 0}
                aria-label="Tăng số Coin"
                data-ui-chrome="circle"
                className="grid h-11 w-11 place-items-center rounded-full border-2 border-gray-200 bg-white font-display text-lg text-gray-600 shadow-[0_2px_0_rgba(0,0,0,0.08)] disabled:opacity-30"
              >+</button>
            </div>
          </div>

          {/* Player grid */}
          {branded && !selectedTarget && <p className="brand-recipient-heading font-body text-sm font-bold">Chọn người nhận</p>}
          {branded && selectedTarget && <button type="button" className="brand-coin-target" disabled={locked || Boolean(successName)} aria-expanded={showRecipientList} onClick={() => setShowRecipientList(value => !value)}>
            <span>Tặng cho</span><strong>{selectedTarget.name}</strong><BrandIcon name="chevron" />
          </button>}
          {(!branded || !selectedTarget || showRecipientList) && <div aria-label="Người nhận Coin" className="brand-coin-recipients grid max-h-[36dvh] grid-cols-2 gap-2 overflow-y-auto">
            {giftablePlayers.length === 0 && <p className="col-span-full font-body text-sm">Chưa có người nhận phù hợp cho Coin này.</p>}
            {giftablePlayers.map((player) => {
              const avatarIdx = player.avatarIndex ?? players.findIndex(p => p.id === player.id)
              const bgIdx = player.bgIndex ?? players.findIndex(p => p.id === player.id)
              const isSelected = selectedPlayer === player.id
              return (
                <button
                  key={player.id}
                  aria-pressed={isSelected}
                  type="button"
                  disabled={locked || Boolean(successName)}
                  onClick={() => { setSelectedPlayer(isSelected ? null : player.id); setShowRecipientList(false) }}
                  className={[
                    'flex min-w-0 items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-all',
                    isSelected
                      ? 'border-[var(--c-orange)] bg-orange-50 shadow-[0_3px_0_rgba(0,0,0,0.12)]'
                      : 'border-white bg-white shadow-[0_2px_0_rgba(0,0,0,0.08)]',
                  ].join(' ')}
                >
                  <div
                    className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 shadow-[0_2px_0_rgba(0,0,0,0.12)]"
                    style={{
                      background: AVATAR_BG_COLORS[Math.abs(bgIdx) % AVATAR_BG_COLORS.length],
                      borderColor: isSelected ? 'var(--c-orange)' : 'white',
                    }}
                  >
                    <EmcoinImage src={AVATAR_ICONS[Math.abs(avatarIdx) % AVATAR_ICONS.length]} alt="" className="h-8 w-8 object-contain" draggable={false} />
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[var(--c-orange)]"
                      >
                        <EmcoinImage src="/emcoin/icons/orbit/check.svg" alt="" className="h-3 w-3 object-contain brightness-0 invert" draggable={false} />
                      </motion.div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="break-words font-display text-sm text-[#2F76AC]">{player.name}</div>
                  </div>
                </button>
              )
            })}
          </div>}

          {/* Confirm */}
          {error && <p role="alert" className="font-body text-xs text-[var(--c-pink)]">{error}</p>}
          <CartoonButton
            color="green"
            size="md"
            className="brand-coin-confirm w-full"
            aria-label={canGive ? `Tặng ${safeAmount} coin ${coinLabel} cho ${selectedTarget?.name}` : undefined}
            disabled={!canGive}
            onClick={handleConfirm}
          >
            {pending ? 'Đang xác nhận…' : canGive
              ? branded ? 'Xác nhận' : `Tặng ${safeAmount} coin ${coinLabel} cho ${selectedTarget?.name}`
              : currentMax <= 0
                ? `Hết coin ${coinLabel} rồi!`
                : 'Chọn người nhận'}
          </CartoonButton>
        </div>

        {/* Success overlay */}
        <AnimatePresence>
          {successName && (
            <GiftSuccessNotice onContinue={() => setSuccessName(null)}>
            <motion.div
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 px-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full rounded-[26px] border-[3px] border-[var(--c-black)] bg-white px-5 py-5 text-center shadow-[0_7px_0_rgba(0,0,0,0.2)]"
                initial={{ scale: 0.82, y: 18 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 440, damping: 24 }}
              >
                <div className="text-4xl mb-1">{branded ? <BrandIcon name="gift" className="mx-auto h-10 w-10" /> : '🎁'}</div>
                <div className="font-display text-base leading-tight text-[var(--c-pink)]">
                  Tặng coin thành công!
                </div>
                <div className="mt-1 font-body text-xs text-black/50">cho {successName}</div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <CartoonButton color="orange" size="sm" disabled={locked} onClick={() => setSuccessName(null)}>
                    Tặng tiếp
                  </CartoonButton>
                  <CartoonButton color="purple" size="sm" disabled={locked} onClick={locked ? undefined : onClose}>
                    Đóng
                  </CartoonButton>
                </div>
              </motion.div>
            </motion.div>
            </GiftSuccessNotice>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

function GiftSuccessNotice({ children, onContinue }: { children: ReactNode; onContinue: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const present = useIsPresent()
  usePopupLifecycle(ref, present, { onClose: onContinue })
  // Exit content is inert immediately, including old success buttons.
  return <div ref={ref} role="dialog" data-ui-panel="a1" aria-label="Trao Coin thành công" tabIndex={-1}
    className="contents" onClickCapture={event => { if (!present) { event.preventDefault(); event.stopPropagation() } }}
    onKeyDownCapture={event => { if (!present) { event.preventDefault(); event.stopPropagation() } }}
    >{children}</div>
}
