import preloadAssets from '@/assets/preloadAssets.json'
import { isBrandTheme, DEFAULT_CONTROL_THEME, type ControlThemeId } from '@/components/cartoon/controlThemes'

/** Warm only the selected theme's four startup images, never both avatar/icon families. */
export function startupAssets(theme: ControlThemeId) {
  theme=isBrandTheme(theme)?theme:DEFAULT_CONTROL_THEME
  if(theme==='candy-clouds')return ['coin-mark.webp','backdrop.webp','button-teal.png','button-pink.png'].map(file=>({url:`/cartoon/ui/themes/candy-clouds/${file}`,tag:'brand'}))
  return preloadAssets.critical.map(item => ({ ...item,
    url: item.url.replace('/emotion-orbit/', `/${theme}/`),
  }))
}
