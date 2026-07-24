/**
 * CartoonDropdown — replicates Unity Dropdown prefab
 *
 * Structure:
 *   Root: white rounded-rect + subtle shadow
 *   Header: selected label + Arrow-Down icon (right)
 *   Options list: white panel, each row = optional icon + label + checkmark on selected
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface DropdownOption {
  value: string
  label: string
  iconSrc?: string
}

interface CartoonDropdownProps {
  options: DropdownOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CartoonDropdown({
  options, value, onChange, placeholder = 'Select...', className, disabled,
}: CartoonDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-3',
          'bg-white rounded-2xl',
          'font-display text-sm text-[var(--c-blue-dark)]',
          'transition-all duration-100',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          // shadow layer via box-shadow (no ::before on button easily)
          'shadow-[0_4px_0_rgba(0,0,0,0.12)]',
          open && 'shadow-none translate-y-1',
        )}
        style={{ border: 'none', outline: 'none' }}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.iconSrc && (
            <img src={selected.iconSrc} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
          )}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <img
          src="/cartoon/icons/Arrow---Down.svg"
          alt=""
          className={cn('w-4 h-4 flex-shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {/* Options panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{ transformOrigin: 'top' }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl overflow-hidden shadow-[0_6px_0_rgba(0,0,0,0.12),0_2px_12px_rgba(0,0,0,0.08)]"
          >
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange?.(opt.value); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left',
                  'font-display text-sm transition-colors duration-100',
                  opt.value === value
                    ? 'bg-[var(--c-sky-mist)] text-[var(--c-blue-dark)]'
                    : 'text-[var(--c-gray-dark)] hover:bg-[var(--c-sky-mist)]',
                )}
              >
                {opt.iconSrc && (
                  <img src={opt.iconSrc} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.value === value && (
                  <img src="/cartoon/icons/Checkmark-Cartoon.svg" alt="selected" className="w-4 h-4 flex-shrink-0" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
