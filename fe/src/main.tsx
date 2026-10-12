import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ControlThemeProvider } from './components/cartoon/ControlThemeProvider'
import { DEFAULT_CONTROL_THEME, previewControlTheme } from './components/cartoon/controlThemes'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ControlThemeProvider root theme={import.meta.env.DEV ? previewControlTheme(window.location.search) : DEFAULT_CONTROL_THEME}>
      <App />
    </ControlThemeProvider>
  </StrictMode>,
)
