import type { Conversation } from '../../shared/storage-api'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return new Date(ts).toLocaleDateString()
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const lastMessage = conversation.messages.length > 0
    ? conversation.messages[conversation.messages.length - 1].content
    : ''

  return (
    <div
      className={`conversation-item${isActive ? ' active' : ''}`}
      onClick={onClick}
      role="listitem"
      aria-selected={isActive}
    >
      <div className="conversation-item__title">{conversation.title}</div>
      {lastMessage && (
        <div className="conversation-item__preview">{lastMessage}</div>
      )}
      <div className="conversation-item__timestamp">{relativeTime(conversation.updatedAt)}</div>
    </div>
  )
}

export default ConversationItem
