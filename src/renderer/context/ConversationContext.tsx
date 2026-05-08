import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { Conversation, Message } from '../../shared/storage-api'
import { useAgent } from './AgentContext'
import * as storage from '../lib/storage'

export interface ConversationContextValue {
  conversations: Conversation[]
  activeConversation: Conversation | null
  setActiveConversation: (conv: Conversation | null) => void
  createConversation: () => string
  addMessage: (convId: string, msg: Message) => void
  deleteConversation: (convId: string) => void
}

const ConversationContext = createContext<ConversationContextValue | null>(null)

function generateId(): string {
  return crypto.randomUUID()
}

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { activeConfig } = useAgent()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversationState] = useState<Conversation | null>(null)
  const prevConfigIdRef = useRef<string | null | undefined>(undefined)

  // Load conversations when activeConfig changes (including to null).
  useEffect(() => {
    const prevId = prevConfigIdRef.current
    const newId = activeConfig?.id ?? null
    prevConfigIdRef.current = newId

    if (prevId === newId) return

    // Reset state when config becomes null
    if (!activeConfig) {
      setConversations([])
      setActiveConversationState(null)
      return
    }

    const configId = activeConfig.id
    let cancelled = false
    storage.loadConversations(configId).then((convs) => {
      if (cancelled) return
      setConversations(convs)

      storage.loadAppState().then((appState) => {
        if (cancelled) return
        if (appState.lastConversationId) {
          const found = convs.find((c) => c.id === appState.lastConversationId)
          if (found) {
            setActiveConversationState(found)
          }
        }
      })
    })

    return () => { cancelled = true }
  }, [activeConfig])

  const setActiveConversation = useCallback((conv: Conversation | null) => {
    setActiveConversationState(conv)
    storage.loadAppState().then((appState) => {
      appState.lastConversationId = conv?.id ?? null
      return storage.saveAppState(appState)
    })
  }, [])

  const createConversation = useCallback((): string => {
    if (!activeConfig) return ''
    const id = generateId()
    const now = Date.now()
    const conv: Conversation = {
      id,
      title: 'Nueva conversación',
      createdAt: now,
      updatedAt: now,
      messages: [],
    }

    setConversations((prev) => {
      const next = [...prev, conv]
      storage.saveConversation(activeConfig.id, conv)
      return next
    })

    setActiveConversationState(conv)

    storage.loadAppState().then((appState) => {
      appState.lastConversationId = id
      return storage.saveAppState(appState)
    })

    return id
  }, [activeConfig])

  const addMessage = useCallback(
    (convId: string, msg: Message) => {
      if (!activeConfig) return
      setConversations((prev) => {
        const conv = prev.find((c) => c.id === convId)
        if (!conv) return prev
        const updated: Conversation = {
          ...conv,
          messages: [...conv.messages, msg],
          updatedAt: Date.now(),
        }
        const next = prev.map((c) => (c.id === convId ? updated : c))
        storage.saveConversation(activeConfig.id, updated)
        return next
      })
    },
    [activeConfig]
  )

  const deleteConversation = useCallback(
    (convId: string) => {
      if (!activeConfig) return
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== convId)
        storage.deleteConversation(activeConfig.id, convId)
        return next
      })
      if (activeConversation?.id === convId) {
        setActiveConversationState(null)
      }
    },
    [activeConfig, activeConversation]
  )

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        activeConversation,
        setActiveConversation,
        createConversation,
        addMessage,
        deleteConversation,
      }}
    >
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversations(): ConversationContextValue {
  const ctx = useContext(ConversationContext)
  if (!ctx) {
    throw new Error('useConversations must be used within a ConversationProvider')
  }
  return ctx
}

export { ConversationContext }
