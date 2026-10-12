import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
/**
 * CartoonSpinner — replicates Unity Loading Spinner prefab
 * Single image with Rotate 360 animation controller (continuous rotation).
 * Size: 50×50 in Unity → configurable via `size` prop.
 */
import { cn } from '@/lib/utils'
import { useControlTheme } from './controlThemeContext'
import { LoaderCircle } from 'lucide-react'

interface CartoonSpinnerProps {
  size?: number | string
  className?: string
}

export function CartoonSpinner({ size = 48, className }: CartoonSpinnerProps) {
  const theme = useControlTheme()
  if (theme !== 'legacy') return <LoaderCircle role="img" aria-label="Loading" className={cn('spin-cartoon', className)} style={{ width: size, height: size, color: 'var(--brand-focus)' }} />
  return (
    <EmcoinImage
      src="/emcoin/icons/orbit/spinner.svg"
      alt="Loading..."
      className={cn('spin-cartoon', className)}
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  )
}
