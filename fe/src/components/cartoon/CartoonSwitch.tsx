/**
 * CartoonSwitch — replicates Unity Switch prefab (Slider min:0 max:1 wholeNumbers:true)
 *
 * Layer structure (bottom to top):
 *   Shadow      — pill shape, y offset, rgba(0,0,0,0.102)
 *   Border      — ColorSwapper: enabled=dark color / disabled=gray
 *   Background  — gray pill track
 *   Fill        — colored fill (left side when ON)
 *   Inner Glow  — subtle inner shadow
 *   Handle      — circle button PNG slides left/right + icon inside
 *
 * OnValueChanged: SpriteSwapper (handle icon) + ColorSwapper (border)
 */
import { useId } from 'react'
import { cn } from '@/lib/utils'

type SwitchColor = 'green' | 'blue' | 'pink' | 'purple' | 'yellow'
type SwitchIcon = 'music' | 'sound' | 'bell' | 'chat' | 'clock' | 'none'

const ICON_MAP: Record<SwitchIcon, string> = {
  music:  '/cartoon/icons/Music.svg',
  sound:  '/cartoon/icons/Sound-On.svg',
  bell:   '/cartoon/icons/Alert-Bell.svg',
  chat:   '/cartoon/icons/Chat.svg',
  clock:  '/cartoon/icons/Clock-Yellow.svg',
  none:   '',
}

const COLOR_FILL: Record<SwitchColor, string> = {
  green:  'linear-gradient(90deg, #53B025, #94DD26)',
  blue:   'linear-gradient(90deg, #0E94C5, #22B8CF)',
  pink:   'linear-gradient(90deg, #BF2250, #FF6993)',
  purple: 'linear-gradient(90deg, #5A2DB0, #7B4FD4)',
  yellow: 'linear-gradient(90deg, #B57523, #FFD93D)',
}

interface CartoonSwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  color?: SwitchColor
  icon?: SwitchIcon
  label?: string
  disabled?: boolean
  className?: string
}

export function CartoonSwitch({
  checked,
  defaultChecked,
  onChange,
  color = 'green',
  icon = 'none',
  label,
  disabled,
  className,
}: CartoonSwitchProps) {
  const id = useId()
  const isControlled = checked !== undefined

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) onChange?.(e.target.checked)
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex items-center gap-3 select-none',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <span className="relative inline-flex items-center" style={{ width: '5rem', height: '2.75rem' }}>
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={isControlled ? checked : undefined}
          defaultChecked={!isControlled ? defaultChecked : undefined}
          onChange={handleChange}
          disabled={disabled}
        />

        {/* Shadow */}
        <span
          className="absolute inset-0 rounded-full translate-y-1"
          style={{ background: 'rgba(0,0,0,0.18)', filter: 'blur(2px)' }}
        />

        {/* Track background (gray) */}
        <span className="absolute inset-0 rounded-full bg-[#CDD3D8]" />

        {/* Colored fill — slides in from left when checked */}
        <span
          className="absolute inset-0 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
          style={{ background: COLOR_FILL[color] }}
        />

        {/* Inner glow */}
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.10)' }}
        />

        {/* Handle — circle button, slides right when checked */}
        <span
          className={cn(
            'absolute top-1 left-1 w-9 h-9 rounded-full transition-transform duration-200',
            'peer-checked:translate-x-[calc(5rem-2.75rem)]',
          )}
          style={{
            backgroundImage: `url(/cartoon/buttons/${capitalize(color)}.png)`,
            backgroundSize: '100% 100%',
          }}
        >
          {/* Handle shadow */}
          <span
            className="absolute inset-0 rounded-full -z-10 translate-y-1"
            style={{
              backgroundImage: `url(/cartoon/buttons/${capitalize(color)}.png)`,
              backgroundSize: '100% 100%',
              filter: 'brightness(0) opacity(0.22)',
            }}
          />
          {/* Icon inside handle */}
          {icon !== 'none' && (
            <span className="absolute inset-0 flex items-center justify-center">
              <img src={ICON_MAP[icon]} alt={icon} className="w-5 h-5 brightness-0 invert" />
            </span>
          )}
        </span>
      </span>

      {label && (
        <span className="font-display text-sm text-[var(--c-black)]">{label}</span>
      )}
    </label>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
