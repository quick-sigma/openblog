import type { AppState, Conversation } from '../../shared/storage-api'

const STORAGE: import('../../shared/storage-api').AgentStorageAPI = window.electronAPI

export async function loadAppState(): Promise<AppState> {
  return STORAGE.loadAppState()
}

export async function saveAppState(state: AppState): Promise<void> {
  return STORAGE.saveAppState(state)
}

export async function loadConversations(configId: string): Promise<Conversation[]> {
  return STORAGE.loadConversations(configId)
}

export async function saveConversation(configId: string, conv: Conversation): Promise<void> {
  return STORAGE.saveConversation(configId, conv)
}

export async function deleteConversation(configId: string, convId: string): Promise<void> {
  return STORAGE.deleteConversation(configId, convId)
}
