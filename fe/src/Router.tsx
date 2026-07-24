import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

// All route pages are code-split so a visitor only downloads the chunk for the
// page they land on — e.g. someone opening /about or /report no longer pulls in
// the whole game engine + socket.io that GameContainer needs.
const GameContainer = lazy(() => import('./pages/GameContainer'))
const About = lazy(() => import('./pages/About'))
const AboutCards2D = lazy(() => import('./pages/AboutCards2D'))
const AboutStory = lazy(() => import('./pages/AboutStory'))
const ImpactReport = lazy(() => import('./pages/ImpactReport'))
const CardShowcase = lazy(() => import('./pages/CardShowcase'))

function RouteFallback() {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-[var(--c-sky-mist)] p-6 font-display text-2xl text-[var(--c-blue)]" role="status" aria-live="polite">
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
        <Route path="about" element={<About />} />
        <Route path="about/cards" element={<AboutCards2D />} />
        <Route path="about/story" element={<AboutStory />} />
        <Route path="cards" element={<CardShowcase />} />
        <Route path="report" element={<ImpactReport />} />
      </Routes>
    </Suspense>
  )
}
