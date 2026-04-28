import { Routes, Route } from 'react-router-dom'
import GameContainer from './pages/GameContainer'

export default function Router() {
    return (
        <Routes>
            <Route path="/" element={<GameContainer />} />
            <Route path="game" element={<GameContainer />} />
        </Routes>
    )
}
