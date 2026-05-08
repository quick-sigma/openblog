import { useRef, useEffect, useState } from 'react'
import { useConversations } from '../context/ConversationContext'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

function ChatView() {
  const { activeConversation, addMessage } = useConversations()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)

  // Scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeConversation?.messages.length, isAtBottom])

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const threshold = 50
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    setIsAtBottom(atBottom)
  }

  const handleSend = async (content: string) => {
    if (!activeConversation) return

    const userMsg = {
      role: 'user' as const,
      content,
      timestamp: Date.now(),
    }
    addMessage(activeConversation.id, userMsg)

    // Simulate streaming with DummyModelProvider
    setIsStreaming(true)
    const assistantMsg = {
      role: 'assistant' as const,
      content: `[Dummy echo] ${content}`,
      timestamp: Date.now(),
    }
    addMessage(activeConversation.id, assistantMsg)
    setIsStreaming(false)
  }

  if (!activeConversation) {
    // Should not happen when ChatView is shown, but guard
    return null
  }

  const messages = activeConversation.messages ?? []

  return (
    <div className="chat-view" data-testid="chat-view">
      <div
        className="chat-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="chat-empty">Inicia una conversación…</div>
        )}
        {messages.map((msg, idx) => {
          const isLastAssistant =
            idx === messages.length - 1 &&
            msg.role === 'assistant' &&
            isStreaming
          return (
            <MessageBubble
              key={idx}
              message={msg}
              isStreaming={isLastAssistant}
            />
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      {!isAtBottom && (
        <button
          className="scroll-to-bottom"
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            setIsAtBottom(true)
          }}
          aria-label="Ir al final"
        >
          ↓ Ir al final
        </button>
      )}
      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </div>
  )
}

export default ChatView
