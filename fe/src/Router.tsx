import { Routes, Route } from 'react-router-dom'
import GameContainer from './pages/GameContainer'
import About from './pages/About'

export default function Router() {
    return (
        <Routes>
            <Route path="/" element={<GameContainer />} />
            <Route path="game" element={<GameContainer />} />
            <Route path="about" element={<About />} />
        </Routes>
    )
}
