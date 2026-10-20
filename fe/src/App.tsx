import { BrowserRouter, HashRouter } from 'react-router'
import Router from './Router'
import { PwaStatus } from './features/pwa/PwaStatus'
import { NativePlatform } from './features/platform/NativePlatform'

const AppRouter = import.meta.env.VITE_USE_HASH_ROUTE === 'true' ? HashRouter : BrowserRouter

export default function App() {
    return (
        <AppRouter>
            <Router />
            <NativePlatform />
            <PwaStatus />
        </AppRouter>
    )
}
