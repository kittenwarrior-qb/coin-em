import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PUBLIC_SITE_PAGES } from './content/siteNavigation'

// All route pages are code-split so a visitor only downloads the chunk for the
// page they land on — e.g. someone opening /about no longer pulls in the whole
// game engine + socket.io that GameContainer needs.
const GameContainer = lazy(() => import('./pages/GameContainer'))
const About = lazy(() => import('./pages/About'))
const AboutCards2D = lazy(() => import('./pages/AboutCards2D'))
const AboutStory = lazy(() => import('./pages/AboutStory'))
const CardShowcase = lazy(() => import('./pages/CardShowcase'))
const Admin = lazy(() => import('./pages/Admin'))
const publicPageComponents = { about: About, cards: AboutCards2D, guide: AboutStory }

function RouteFallback() {
  return (
    <div data-ui-screen="route-loading" className="fixed inset-0 z-[9999] grid place-items-center bg-[var(--c-sky-mist)] p-6 font-display text-2xl text-[var(--c-blue)]" role="status" aria-live="polite">
      Đang tải...
    </div>
  )
}

export default function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<GameContainer />} />
        <Route path="game" element={<GameContainer />} />
        {PUBLIC_SITE_PAGES.map(({ id, href }) => {
          const Page = publicPageComponents[id]
          return <Route key={id} path={href} element={<Page />} />
        })}
        <Route path="cards" element={<CardShowcase />} />
        <Route path="admin" element={<Admin />} />
      </Routes>
    </Suspense>
  )
}
