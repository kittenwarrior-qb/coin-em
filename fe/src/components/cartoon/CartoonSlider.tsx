/**
 * CartoonSlider — replicates Unity Slider prefab (450×80)
 *
 * Layer structure:
 *   Shadow       — pill, y:-5, rgba(0,0,0,0.102)
 *   White Border — white pill outline
 *   Fill Area    — gray track rgba(0.914,0.925,0.937)
 *     └── Fill   — colored fill with dark border + gradient highlight
 *   Handle       — circle button PNG (same color as fill) + white center circle
 */
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type SliderColor = 'red' | 'blue' | 'green' | 'purple' | 'yellow'

const HANDLE_COLOR: Record<SliderColor, string> = {
  red:    'Red',
  blue:   'Blue',
  green:  'Green',
  purple: 'Purple',
  yellow: 'Yellow',
}

const FILL_GRADIENT: Record<SliderColor, string> = {
  red:    'linear-gradient(90deg, #A61932, #EB3C54)',
  blue:   'linear-gradient(90deg, #1A74C6, #0E94C5)',
  green:  'linear-gradient(90deg, #3C8109, #94DD26)',
  purple: 'linear-gradient(90deg, #4A2090, #7B4FD4)',
  yellow: 'linear-gradient(90deg, #B57523, #FFD93D)',
}

interface CartoonSliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  color?: SliderColor
  showValue?: boolean
}

export const CartoonSlider = forwardRef<HTMLInputElement, CartoonSliderProps>(
  ({ color = 'blue', showValue, className, value, defaultValue, min = 0, max = 100, ...props }, ref) => {
    const pct = value !== undefined
      ? ((Number(value) - Number(min)) / (Number(max) - Number(min))) * 100
      : ((Number(defaultValue ?? 50) - Number(min)) / (Number(max) - Number(min))) * 100

    return (
      <div className={cn('relative flex items-center', className)} style={{ height: '3rem' }}>
        {/* Shadow */}
        <div
          className="absolute inset-x-0 rounded-full translate-y-1.5"
          style={{ height: '1.75rem', top: '50%', transform: 'translateY(calc(-50% + 6px))', background: 'rgba(0,0,0,0.10)', filter: 'blur(2px)' }}
        />

        {/* White border */}
        <div
          className="absolute inset-x-0 rounded-full bg-white"
          style={{ height: '1.75rem', top: '50%', transform: 'translateY(-50%)' }}
        />

        {/* Gray track */}
        <div
          className="absolute inset-x-0 rounded-full overflow-hidden"
          style={{ height: '1.5rem', top: '50%', transform: 'translateY(-50%)', background: '#E9ECEF', margin: '0 0.25rem' }}
        >
          {/* Colored fill */}
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${pct}%`, background: FILL_GRADIENT[color] }}
          />
        </div>

        {/* Native range input (invisible, handles interaction) */}
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          value={value}
          defaultValue={defaultValue}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
          style={{ height: '100%' }}
          {...props}
        />

        {/* Handle — positioned at fill percentage */}
        <div
          className="absolute pointer-events-none transition-all duration-150"
          style={{
            left: `calc(${pct}% - 1.5rem + ${pct * 0.03}rem)`,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3rem',
            height: '3rem',
          }}
        >
          {/* Handle shadow */}
          <div
            className="absolute inset-0 rounded-full translate-y-1.5"
            style={{
              backgroundImage: `url(/cartoon/buttons/${HANDLE_COLOR[color]}.png)`,
              backgroundSize: '100% 100%',
              filter: 'brightness(0) opacity(0.22)',
            }}
          />
          {/* Handle body */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: `url(/cartoon/buttons/${HANDLE_COLOR[color]}.png)`,
              backgroundSize: '100% 100%',
            }}
          >
            {/* White center circle */}
            <div className="absolute inset-[30%] rounded-full bg-white/90" />
          </div>
        </div>

        {showValue && (
          <div className="absolute -top-7 font-display text-xs text-[var(--c-gray-dark)]"
            style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
            {value ?? defaultValue}
          </div>
        )}
      </div>
    )
  }
)

CartoonSlider.displayName = 'CartoonSlider'
