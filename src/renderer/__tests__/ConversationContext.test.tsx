import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ConversationProvider, useConversations } from '../context/ConversationContext'
import { AgentContext } from '../context/AgentContext'
import { DummyModelProvider } from '../lib/model-contract'
import type { AppState, AgentConfig } from '../../shared/storage-api'
import type { AgentContextValue } from '../context/AgentContext'

// Mock storage
const mockLoadAppState = vi.fn()
const mockSaveAppState = vi.fn()
const mockLoadConversations = vi.fn()
const mockSaveConversation = vi.fn()
const mockDeleteConversation = vi.fn()

vi.mock('../lib/storage', () => ({
  loadAppState: (...args: unknown[]) => mockLoadAppState(...args),
  saveAppState: (...args: unknown[]) => mockSaveAppState(...args),
  loadConversations: (...args: unknown[]) => mockLoadConversations(...args),
  saveConversation: (...args: unknown[]) => mockSaveConversation(...args),
  deleteConversation: (...args: unknown[]) => mockDeleteConversation(...args),
}))

function makeDefaultState(): AppState {
  return { lastConfigId: null, lastConversationId: null, configs: [] }
}

const dummyConfig: AgentConfig = {
  id: 'cfg-test',
  label: 'Test',
  provider: 'dummy',
  model: 'dummy-v1',
}

const dummyProvider = new DummyModelProvider()

function createMockAgentContext(overrides: Partial<AgentContextValue> = {}): AgentContextValue {
  return {
    configs: [dummyConfig],
    activeConfig: dummyConfig,
    isConfigured: true,
    initialized: true,
    provider: dummyProvider,
    setActiveConfig: vi.fn(),
    saveConfig: vi.fn(),
    deleteConfig: vi.fn(),
    setProvider: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadAppState.mockResolvedValue(makeDefaultState())
  mockLoadConversations.mockResolvedValue([])
  mockSaveAppState.mockResolvedValue(undefined)
  mockSaveConversation.mockResolvedValue(undefined)
  mockDeleteConversation.mockResolvedValue(undefined)
})

describe('ConversationProvider', () => {
  it('provee valores iniciales vacíos', async () => {
    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AgentContext.Provider value={createMockAgentContext()}>
          <ConversationProvider>{children}</ConversationProvider>
        </AgentContext.Provider>
      ),
    })

    await vi.waitFor(() => {
      expect(result.current.conversations).toEqual([])
    })
    expect(result.current.activeConversation).toBeNull()
  })

  it('createConversation crea nueva conversación', async () => {
    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AgentContext.Provider value={createMockAgentContext()}>
          <ConversationProvider>{children}</ConversationProvider>
        </AgentContext.Provider>
      ),
    })

    await vi.waitFor(() => {
      expect(result.current.conversations).toEqual([])
    })

    let convId = ''
    await act(async () => {
      convId = result.current.createConversation()
      // Flush microtasks from async persistence
      await new Promise((r) => setTimeout(r, 5))
    })

    expect(convId).toBeTruthy()
    expect(result.current.conversations).toHaveLength(1)
    expect(result.current.activeConversation?.id).toBe(convId)
  })

  it('addMessage añade mensaje a conversación', async () => {
    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AgentContext.Provider value={createMockAgentContext()}>
          <ConversationProvider>{children}</ConversationProvider>
        </AgentContext.Provider>
      ),
    })

    await vi.waitFor(() => {
      expect(result.current.conversations).toEqual([])
    })

    let convId = ''
    await act(async () => {
      convId = result.current.createConversation()
      await new Promise((r) => setTimeout(r, 5))
    })

    await act(async () => {
      result.current.addMessage(convId, {
        role: 'user',
        content: 'hola',
        timestamp: Date.now(),
      })
    })

    const conv = result.current.conversations.find((c) => c.id === convId)
    expect(conv?.messages).toHaveLength(1)
    expect(conv?.messages[0].content).toBe('hola')
    expect(mockSaveConversation).toHaveBeenCalled()
  })

  it('deleteConversation elimina conversación', async () => {
    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AgentContext.Provider value={createMockAgentContext()}>
          <ConversationProvider>{children}</ConversationProvider>
        </AgentContext.Provider>
      ),
    })

    await vi.waitFor(() => {
      expect(result.current.conversations).toEqual([])
    })

    let convId = ''
    await act(async () => {
      convId = result.current.createConversation()
      await new Promise((r) => setTimeout(r, 5))
    })

    expect(result.current.conversations).toHaveLength(1)

    await act(async () => {
      result.current.deleteConversation(convId)
    })

    expect(result.current.conversations).toHaveLength(0)
    expect(mockDeleteConversation).toHaveBeenCalled()
  })

  it('setActiveConversation cambia conversación activa', async () => {
    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AgentContext.Provider value={createMockAgentContext()}>
          <ConversationProvider>{children}</ConversationProvider>
        </AgentContext.Provider>
      ),
    })

    await vi.waitFor(() => {
      expect(result.current.conversations).toEqual([])
    })

    let convId = ''
    await act(async () => {
      convId = result.current.createConversation()
      await new Promise((r) => setTimeout(r, 5))
    })

    // Set to null
    await act(async () => {
      result.current.setActiveConversation(null)
      await new Promise((r) => setTimeout(r, 5))
    })
    expect(result.current.activeConversation).toBeNull()

    // Set back
    const conv = result.current.conversations[0]
    await act(async () => {
      result.current.setActiveConversation(conv)
      await new Promise((r) => setTimeout(r, 5))
    })
    expect(result.current.activeConversation?.id).toBe(convId)
  })

  it('useConversations lanza error fuera de ConversationProvider', () => {
    expect(() => {
      renderHook(() => useConversations())
    }).toThrow('useConversations must be used within a ConversationProvider')
  })
})
