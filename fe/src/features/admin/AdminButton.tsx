import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; color?: string; size?: string }
/** Compact CRM control. Shares theme colors, not oversized gameplay sprites. */
export function AdminButton({ pending = false, color = 'blue', size = 'md', className = '', disabled, children, type = 'button', ...props }: Props) {
  const tone = color === 'pink' || color === 'orange' ? 'danger' : color === 'white' || color === 'cream' ? 'quiet' : 'primary'
  return <button {...props} type={type} disabled={disabled || pending} aria-busy={pending || undefined}
    className={`admin-button admin-button--${tone} ${className}`} data-admin-tone={tone} data-admin-size={size}>
    {pending ? <span className="admin-button-spinner" aria-hidden="true" /> : null}{children}
  </button>
}
