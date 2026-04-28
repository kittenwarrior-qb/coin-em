import { BrowserRouter, HashRouter } from 'react-router'
import Router from './Router'

const AppRouter = import.meta.env.VITE_USE_HASH_ROUTE === 'true' ? HashRouter : BrowserRouter

export default function App() {
    return (
        <AppRouter>
            <Router />
        </AppRouter>
    )
}
