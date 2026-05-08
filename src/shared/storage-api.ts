export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

export interface AgentConfig {
  id: string
  label: string
  provider: 'openai' | 'anthropic' | 'dummy'
  apiKey?: string
  model: string
  base_url?: string
}

export interface AppState {
  lastConfigId: string | null
  lastConversationId: string | null
  configs: AgentConfig[]
}

export interface AgentStorageAPI {
  loadAppState(): Promise<AppState>
  saveAppState(state: AppState): Promise<void>
  loadConversations(configId: string): Promise<Conversation[]>
  saveConversation(configId: string, conv: Conversation): Promise<void>
  deleteConversation(configId: string, convId: string): Promise<void>
}
