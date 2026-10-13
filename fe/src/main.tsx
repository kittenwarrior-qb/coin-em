import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemePreferenceProvider } from './features/theme/ThemePreference'
import './styles/themeChooser.css'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemePreferenceProvider>
      <App />
    </ThemePreferenceProvider>
  </StrictMode>,
)
