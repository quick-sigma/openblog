import { useState, useCallback } from 'react'
import { useAgent } from '../context/AgentContext'
import { useConversations } from '../context/ConversationContext'
import ChatView from './ChatView'
import ConversationList from './ConversationList'
import ModelDropdown from './ModelDropdown'
import DropdownMenu from './DropdownMenu'
import NewChatButton from './NewChatButton'
import AgentSetupWizard from './AgentSetupWizard'

function AgentPanel() {
  const { isConfigured } = useAgent()
  const { activeConversation, createConversation } = useConversations()
  const [showSetupWizard, setShowSetupWizard] = useState(false)

  const handleOpenWizard = useCallback(() => {
    setShowSetupWizard(true)
  }, [])

  const handleCloseWizard = useCallback(() => {
    setShowSetupWizard(false)
  }, [])

  // Unconfigured state: show rainbow CTA button
  if (!isConfigured) {
    return (
      <div id="agent-panel" data-testid="agent-panel">
        <div className="agent-panel-unconfigured">
          <button
            className="agent-setup-btn"
            onClick={handleOpenWizard}
            data-testid="agent-setup-btn"
          >
            Configurar agente
          </button>
        </div>
        {showSetupWizard ? <AgentSetupWizard onClose={handleCloseWizard} /> : null}
      </div>
    )
  }

  const hasConversation = activeConversation !== null

  return (
    <div id="agent-panel" data-testid="agent-panel">
      {/* Header bar (N10): fixed, 75px */}
      <div className="agent-panel-header">
        <NewChatButton onClick={createConversation} variant="compact" />
        <span className="agent-panel-header__title">
          {hasConversation ? activeConversation.title : 'Sin conversación'}
        </span>
        <ModelDropdown />
        <DropdownMenu
          items={[
            { label: 'Settings', onClick: () => {} },
          ]}
        />
      </div>

      {/* Content area: ConversationList overlay or ChatView */}
      <div className="agent-panel-content">
        {hasConversation ? <ChatView /> : <ConversationList />}
      </div>
    </div>
  )
}

export default AgentPanel
