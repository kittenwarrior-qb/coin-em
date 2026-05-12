/**
 * CartoonCheckbox — Blue-Teal.png background, White.png ở giữa khi checked
 * Dùng cho chọn bộ thẻ trong CreateRoomModal
 */

interface CartoonCheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function CartoonCheckbox({ label, checked, onChange }: CartoonCheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex flex-col items-center gap-1 flex-1 transition-transform active:scale-95 mt-2"
    >
      {/* Circle */}
      <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40 }}>
        <img
          src="/cartoon/buttons/circle/Blue-Teal.png"
          alt=""
          className="absolute w-full h-full object-contain"
          style={{ filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.18))' }}
          draggable={false}
        />
        {checked && (
          <img
            src="/cartoon/buttons/circle/White.png"
            alt=""
            className="absolute"
            style={{ width: '30%', height: '30%', objectFit: 'contain' }}
            draggable={false}
          />
        )}
      </div>

      {/* Label bên dưới */}
      <span className="font-display text-[10px] text-[var(--c-gray)] leading-tight text-center">
        {label}
      </span>
    </button>
  )
}
