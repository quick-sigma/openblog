import type { Message } from '../../shared/storage-api'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const roleClass = message.role === 'user'
    ? 'user'
    : message.role === 'system'
      ? 'system'
      : `assistant${isStreaming ? ' streaming' : ''}`

  return (
    <div
      className={`message-bubble ${roleClass}`}
      role="listitem"
      aria-label={`Mensaje de ${message.role}`}
    >
      <div className="bubble-content">
        <p>{message.content}</p>
        <span className="bubble-timestamp">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  )
}

export default MessageBubble
