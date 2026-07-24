/**
 * CartoonToggle — replicates Unity Toggle prefab
 * Structure: circle button background + checkmark SVG overlay
 * SpriteSwapper logic: checked = colored circle + checkmark, unchecked = gray circle
 */
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type ToggleColor = 'teal' | 'blue' | 'green' | 'pink' | 'purple' | 'yellow'

interface CartoonToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  color?: ToggleColor
  label?: string
}

export const CartoonToggle = forwardRef<HTMLInputElement, CartoonToggleProps>(
  ({ color = 'teal', label, className, id, ...props }, ref) => {
    const inputId = id ?? `toggle-${Math.random().toString(36).slice(2)}`

    return (
      <label htmlFor={inputId} className={cn('inline-flex items-center gap-3 cursor-pointer select-none', className)}>
        <span className="relative inline-block w-12 h-12 flex-shrink-0">
          {/* Background circle — gray when unchecked, colored when checked */}
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer sr-only"
            {...props}
          />
          {/* Unchecked: gray circle */}
          <span
            className="absolute inset-0 rounded-full transition-all duration-150"
            style={{
              backgroundImage: 'url(/cartoon/buttons/Gray.png)',
              backgroundSize: '100% 100%',
            }}
          />
          {/* Checked: colored circle overlay */}
          <span
            className="absolute inset-0 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-150"
            style={{
              backgroundImage: `url(/cartoon/buttons/${capitalize(color)}.png)`,
              backgroundSize: '100% 100%',
            }}
          />
          {/* Checkmark icon */}
          <span className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity duration-150">
            <img
              src="/cartoon/icons/Checkmark-Cartoon.svg"
              alt="checked"
              className="w-6 h-6 brightness-0 invert"
            />
          </span>
          {/* Shadow layer */}
          <span
            className="absolute inset-0 rounded-full -z-10 translate-y-1.5"
            style={{
              backgroundImage: 'url(/cartoon/buttons/Gray.png)',
              backgroundSize: '100% 100%',
              filter: 'brightness(0) opacity(0.22)',
            }}
          />
        </span>
        {label && (
          <span className="font-display text-sm text-[var(--c-black)]">{label}</span>
        )}
      </label>
    )
  }
)

CartoonToggle.displayName = 'CartoonToggle'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
