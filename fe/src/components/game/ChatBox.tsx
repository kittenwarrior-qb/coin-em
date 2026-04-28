import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage } from '@/types/game'

interface ChatBoxProps {
  messages: ChatMessage[]
  currentUserName: string
  onSendMessage: (message: string) => void
  isMinimized?: boolean
  onToggleMinimize?: () => void
}

export function ChatBox({ 
  messages, 
  currentUserName, 
  onSendMessage,
  isMinimized = false,
  onToggleMinimize
}: ChatBoxProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-white rounded-2xl border-3 border-black shadow-lg flex flex-col
                  ${isMinimized ? 'h-14' : 'h-96'} transition-all duration-300`}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b-2 border-black cursor-pointer"
        onClick={onToggleMinimize}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="font-bold text-sm">Chat</span>
        </div>
        <button className="text-sm hover:scale-110 transition-transform">
          {isMinimized ? '▲' : '▼'}
        </button>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((msg) => {
                const isOwn = msg.senderName === currentUserName
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
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
                                   ${isOwn ? 'bg-blue-200' : 'bg-gray-100'}`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t-2 border-black">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 px-3 py-2 rounded-lg border-2 border-black
                           focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="px-4 py-2 rounded-lg border-2 border-black bg-blue-400
                           hover:bg-blue-500 active:scale-95 transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm"
                >
                  Gửi
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
