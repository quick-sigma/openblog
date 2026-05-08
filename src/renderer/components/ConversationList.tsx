import { useConversations } from '../context/ConversationContext'
import ConversationItem from './ConversationItem'
import NewChatButton from './NewChatButton'

function ConversationList() {
  const { conversations, activeConversation, setActiveConversation, createConversation } =
    useConversations()

  return (
    <div className="conversation-list-overlay" data-testid="conversation-list">
      <div className="list-header">
        {conversations.length === 0 ? (
          <>
            <p className="list-header__empty-text">No hay conversaciones. Crea una nueva.</p>
            <NewChatButton onClick={createConversation} variant="full" />
          </>
        ) : (
          <>
            <NewChatButton onClick={createConversation} variant="full" />
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversation?.id === conv.id}
                onClick={() => setActiveConversation(conv)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default ConversationList
