/**
 * CartoonSpinner — replicates Unity Loading Spinner prefab
 * Single image with Rotate 360 animation controller (continuous rotation).
 * Size: 50×50 in Unity → configurable via `size` prop.
 */
import { cn } from '@/lib/utils'

interface CartoonSpinnerProps {
  size?: number | string
  className?: string
}

export function CartoonSpinner({ size = 48, className }: CartoonSpinnerProps) {
  return (
    <img
      src="/cartoon/icons/Loading-Spinner.svg"
      alt="Loading..."
      className={cn('spin-cartoon', className)}
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  )
}
