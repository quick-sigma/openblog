import { useState, useRef, useEffect } from 'react'

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
    }
  }, [value])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = value.trim().length === 0

  return (
    <div className="message-input">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje..."
        rows={1}
        disabled={disabled}
        aria-label="Mensaje"
      />
      <button
        className="send-btn"
        onClick={handleSend}
        disabled={isEmpty || disabled}
        aria-label="Enviar"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 8l12-6-4 6 4 6-12-6z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  )
}

export default MessageInput
