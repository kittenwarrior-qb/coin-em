import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GamePlayer, ChatMessage, Card } from '@/types/game'
import { allCards } from '@/data/cards'
import { CoinDisplay } from '@/components/game/CoinDisplay'
import { CardDeck } from '@/components/game/CardDeck'
import { PlayerGrid } from '@/components/game/PlayerGrid'

interface GamePlayProps {
  roomId: string
  currentUserId: string
  currentUserName: string
  players: GamePlayer[]
  onLeaveGame: () => void
}

export default function GamePlay({
  roomId,
  currentUserId,
  currentUserName,
  players,
  onLeaveGame,
}: GamePlayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<GamePlayer | null>(null)
  const [chatInput, setChatInput] = useState('')

  const currentPlayer = players.find(p => p.socketId === currentUserId)

  const handleCardSelect = (card: Card) => {
    console.log('Selected card:', card)
    // TODO: Emit to socket
  }

  const handlePlayerClick = (player: GamePlayer) => {
    // Không cho click vào chính mình
    if (player.socketId === currentUserId) return
    setSelectedPlayer(player)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !selectedPlayer) return

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: currentUserId,
      senderName: currentUserName,
      message: chatInput.trim(),
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, newMessage])
    setChatInput('')
    // TODO: Emit to socket
  }

  const handleGiveCoin = (coinType: 'red' | 'yellow' | 'green') => {
    if (!selectedPlayer) return
    console.log(`Give ${coinType} coin to ${selectedPlayer.name}`)
    // TODO: Emit to socket
    setSelectedPlayer(null)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm mx-auto rounded-3xl border-4 border-black bg-white flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 2rem)' }}>
        {/* Top Bar - Coins */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border-b-3 border-black p-3 flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-2">
            <button
              onClick={onLeaveGame}
              className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center
                       hover:bg-gray-100 active:scale-95 transition-all text-sm"
            >
              ←
            </button>
            <span className="text-xs text-gray-600">Phòng: {roomId}</span>
          </div>

          {currentPlayer && (
            <CoinDisplay coins={currentPlayer.coins} size="md" />
          )}
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Player Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto"
          >
            <PlayerGrid
              players={players}
              currentUserId={currentUserId}
              onPlayerClick={handlePlayerClick}
            />
          </motion.div>

          {/* Card Decks at Bottom */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex gap-2 justify-center pb-2 overflow-x-auto shrink-0"
          >
            <CardDeck
              cards={allCards.role}
              type="role"
              onCardSelect={handleCardSelect}
            />
            <CardDeck
              cards={allCards.situation}
              type="situation"
              onCardSelect={handleCardSelect}
            />
            <CardDeck
              cards={allCards.emotion}
              type="emotion"
              onCardSelect={handleCardSelect}
            />
            <CardDeck
              cards={allCards.reflection}
              type="reflection"
              onCardSelect={handleCardSelect}
            />
            <CardDeck
              cards={allCards.selfcare}
              type="selfcare"
              onCardSelect={handleCardSelect}
            />
          </motion.div>
        </div>
      </div>

      {/* Player Action Modal (Chat & Coin) */}
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setSelectedPlayer(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl border-t-4 border-x-4 border-black w-full max-w-sm mx-auto p-6 max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400
                                border-3 border-black flex items-center justify-center text-xl">
                    {selectedPlayer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-black text-lg">{selectedPlayer.name}</div>
                    <div className="flex gap-1">
                      <CoinDisplay coins={selectedPlayer.coins} size="sm" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center
                           hover:bg-gray-100 active:scale-95 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Action Tabs */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-blue-100 rounded-xl border-2 border-black p-3 text-center">
                  <div className="text-2xl mb-1">💬</div>
                  <div className="text-xs font-bold">Chat</div>
                </div>
                <div className="flex-1 bg-yellow-100 rounded-xl border-2 border-black p-3 text-center">
                  <div className="text-2xl mb-1">🪙</div>
                  <div className="text-xs font-bold">Tặng Coin</div>
                </div>
              </div>

              {/* Give Coins Section */}
              <div className="mb-4">
                <div className="text-sm font-bold mb-2">Tặng coin cho {selectedPlayer.name}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGiveCoin('red')}
                    className="flex-1 p-3 rounded-xl border-2 border-black bg-red-200
                             hover:bg-red-300 active:scale-95 transition-all"
                  >
                    <div className="w-8 h-8 mx-auto rounded-full bg-red-500 border-2 border-black
                                  flex items-center justify-center font-bold text-white text-sm">
                      +1
                    </div>
                    <div className="text-xs mt-1 font-bold">Đỏ</div>
                  </button>
                  <button
                    onClick={() => handleGiveCoin('yellow')}
                    className="flex-1 p-3 rounded-xl border-2 border-black bg-yellow-200
                             hover:bg-yellow-300 active:scale-95 transition-all"
                  >
                    <div className="w-8 h-8 mx-auto rounded-full bg-yellow-400 border-2 border-black
                                  flex items-center justify-center font-bold text-gray-800 text-sm">
                      +1
                    </div>
                    <div className="text-xs mt-1 font-bold">Vàng</div>
                  </button>
                  <button
                    onClick={() => handleGiveCoin('green')}
                    className="flex-1 p-3 rounded-xl border-2 border-black bg-green-200
                             hover:bg-green-300 active:scale-95 transition-all"
                  >
                    <div className="w-8 h-8 mx-auto rounded-full bg-green-500 border-2 border-black
                                  flex items-center justify-center font-bold text-white text-sm">
                      +1
                    </div>
                    <div className="text-xs mt-1 font-bold">Xanh</div>
                  </button>
                </div>
              </div>

              {/* Chat Section */}
              <div>
                <div className="text-sm font-bold mb-2">Chat với {selectedPlayer.name}</div>
                
                {/* Messages */}
                <div className="bg-gray-50 rounded-xl border-2 border-black p-3 mb-3 h-48 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-16">
                      Chưa có tin nhắn
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => {
                        const isOwn = msg.senderName === currentUserName
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                              {!isOwn && (
                                <span className="text-xs font-bold text-gray-600 mb-1 px-2">
                                  {msg.senderName}
                                </span>
                              )}
                              <div
                                className={`px-3 py-2 rounded-xl border-2 border-black text-sm
                                           ${isOwn ? 'bg-blue-200' : 'bg-white'}`}
                              >
                                {msg.message}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-black
                             focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-4 py-2 rounded-lg border-2 border-black bg-blue-400
                             hover:bg-blue-500 active:scale-95 transition-all
                             disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm"
                  >
                    Gửi
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
