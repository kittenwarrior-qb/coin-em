import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CartoonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const CartoonInput = forwardRef<HTMLInputElement, CartoonInputProps>(
  ({ label, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-display text-sm text-[var(--c-gray-dark)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn('input-cartoon', className)}
          {...props}
        />
      </div>
    )
  }
)

CartoonInput.displayName = 'CartoonInput'
