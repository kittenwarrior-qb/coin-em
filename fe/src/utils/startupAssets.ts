import preloadAssets from '@/assets/preloadAssets.json'
import { isBrandTheme, DEFAULT_CONTROL_THEME, type ControlThemeId } from '@/components/cartoon/controlThemes'

/** Warm only the selected theme's four startup images, never both avatar/icon families. */
export function startupAssets(theme: ControlThemeId) {
  const selected = isBrandTheme(theme) ? theme : DEFAULT_CONTROL_THEME
  return preloadAssets.critical.map(item => ({ ...item,
    url: item.url.replace('/emotion-orbit/', `/${selected}/`),
  }))
}
