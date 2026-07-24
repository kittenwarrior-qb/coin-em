import { useState } from 'react'
import { CartoonModal } from './CartoonModal'
import { CartoonButton, CartoonCircleButton } from './CartoonButton'
import { CartoonInput } from './CartoonInput'
import { AVATAR_ICONS, AVATAR_BG_COLORS, AVATAR_BORDER_COLORS } from './avatarConfig'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
  currentName: string
  currentAvatarIndex: number
  currentBgIndex: number
  lockName?: boolean
  currentRole?: string
  onSave: (name: string, avatarIndex: number, bgIndex: number) => void
}

export function ProfileModal({
  open, onClose, currentName, currentAvatarIndex, currentBgIndex, lockName, currentRole, onSave,
}: ProfileModalProps) {
  const [name, setName] = useState(currentName)
  const [avatarIdx, setAvatarIdx] = useState(currentAvatarIndex)
  const [bgIdx, setBgIdx] = useState(currentBgIndex)
  const [customColor, setCustomColor] = useState('#FFD6E0')

  // Resolve actual bg color: 0-11 palette, 12 = white, 13 = custom
  const bg = bgIdx === 12 ? '#ffffff' : bgIdx === 13 ? customColor : AVATAR_BG_COLORS[bgIdx % AVATAR_BG_COLORS.length]
  const border = bgIdx === 12 ? '#cccccc' : bgIdx === 13 ? customColor : AVATAR_BORDER_COLORS[bgIdx % AVATAR_BORDER_COLORS.length]

  const handleSave = () => {
    if (!name.trim()) return
    onSave(name.trim(), avatarIdx, bgIdx)
    onClose()
  }

  return (
    <CartoonModal open={open} onClose={onClose} title="Hồ sơ">
      <div className="flex flex-col gap-4">

        {/* Avatar preview + name */}
        <div className="flex items-center gap-4 rounded-2xl px-3 py-3" style={{ background: '#e6f9ff' }}>
          <div className="relative flex-shrink-0">
            {/* Background color layer masked to cartoon circle shape */}
            <div className="relative w-28 h-28 cursor-pointer transition-transform active:scale-95 flex items-center justify-center" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}>
              {/* White border layer — slightly larger */}
              <div
                className="absolute"
                style={{
                  inset: -8,
                  background: 'white',
                  maskImage: 'url(/cartoon/ui/Circle-Cartoon.png)',
                  maskSize: '100% 100%',
                  WebkitMaskImage: 'url(/cartoon/ui/Circle-Cartoon.png)',
                  WebkitMaskSize: '100% 100%',
                }}
              />
              {/* Color fill layer */}
              <div
                className="absolute inset-0"
                style={{
                  background: bg,
                  maskImage: 'url(/cartoon/ui/Circle-Cartoon.png)',
                  maskSize: '100% 100%',
                  WebkitMaskImage: 'url(/cartoon/ui/Circle-Cartoon.png)',
                  WebkitMaskSize: '100% 100%',
                }}
              />
              <img src={AVATAR_ICONS[avatarIdx % AVATAR_ICONS.length]} alt="" className="relative w-20 h-20 object-contain z-10" draggable={false} />
            </div>
            <div
              className="absolute right-[-3px]"
              style={{ bottom: -25 }}
            >
              <CartoonCircleButton
                color="purple"
                iconSrc="/cartoon/icons/white/Photo.png"
                iconSize="50%"
                style={{ height: 35, width: 35, pointerEvents: 'none' }}
              />
            </div>
          </div>
          <div className="flex-1">
            <CartoonInput label="Tên hiển thị" value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên" disabled={lockName} style={{ background: '#fff', boxShadow: 'none', opacity: lockName ? 0.6 : 1 }} />
            {lockName && currentRole && (
              <div className="mt-1 px-3 py-1 rounded-full text-center font-display text-xs" style={{ background: '#fff4e6', color: '#f59e0b' }}>
                {currentRole}
              </div>
            )}
          </div>
        </div>

        {/* Avatar picker — 4 cols, max 3 rows + scroll */}
        <div>
            <p className="font-display text-xs mb-2" style={{ color: '#2f76ac' }}>Chọn avatar</p>
            <div className="overflow-y-auto scroll-cartoon" style={{ maxHeight: 192 }}>
              <div className="grid grid-cols-4 gap-2 p-1 ">
                {AVATAR_ICONS.map((icon, i) => (
                  <button
                    key={i}
                    onClick={() => setAvatarIdx(i)}
                    className="rounded-full flex items-center justify-center transition-transform active:scale-90"
                    style={{
                      height: 56,
                      width: 56,
                      background: bg,
                      border: `2.5px solid white`,
                      outline: i === avatarIdx ? `2px solid ${border}` : 'none',
                    }}
                  >
                    <img src={icon} alt="" className="w-10 h-10 object-contain" draggable={false} />
                  </button>
                ))}
              </div>
            </div>
          </div>

        {/* Bg color picker — 7 cols, 2 rows (12 palette + white + custom) */}
        <div>
          <p className="font-display text-xs mb-2" style={{ color: '#2f76ac' }}>Màu nền</p>
          <div className="grid grid-cols-7 gap-2 p-1">
            {AVATAR_BG_COLORS.map((color, i) => (
              <button
                key={i}
                onClick={() => setBgIdx(i)}
                className="rounded-full transition-transform active:scale-90"
                style={{
                  width: 34, height: 34,
                  background: color,
                  border: `2.5px solid ${AVATAR_BORDER_COLORS[i]}`,
                  outline: bgIdx === i ? `2px solid #2f76ac` : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
            {/* White */}
            <button
              onClick={() => setBgIdx(12)}
              className="rounded-full transition-transform active:scale-90"
              style={{
                width: 34, height: 34,
                background: '#ffffff',
                border: '2.5px solid #cccccc',
                outline: bgIdx === 12 ? '2px solid #2f76ac' : 'none',
                outlineOffset: 2,
              }}
            />
            {/* Custom color picker */}
            <label
              className="rounded-full transition-transform active:scale-90 relative overflow-hidden cursor-pointer flex items-center justify-center"
              style={{
                width: 34, height: 34,
                background: customColor,
                border: '2.5px solid #aaaaaa',
                outline: bgIdx === 13 ? '2px solid #2f76ac' : 'none',
                outlineOffset: 2,
              }}
            >
              <span className="text-xs" style={{ color: '#555', fontSize: 14, lineHeight: 1 }}>+</span>
              <input
                type="color"
                value={customColor}
                onChange={e => { setCustomColor(e.target.value); setBgIdx(13) }}
                onClick={() => setBgIdx(13)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>

        <CartoonButton color="teal" size="md" className="w-full" disabled={!name.trim()} onClick={handleSave}>
          Lưu
        </CartoonButton>
      </div>
    </CartoonModal>
  )
}
