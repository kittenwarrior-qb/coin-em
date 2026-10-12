import type { ImgHTMLAttributes } from 'react'
import { useControlTheme } from './controlThemeContext'
import { themeArtUrl } from './controlThemes'

/** New-art theme switch only; protected card/photo URLs pass through verbatim. */
export function EmcoinImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const theme = useControlTheme()
  const src = themeArtUrl(theme, props.src)
  return <img {...props} src={src} />
}
