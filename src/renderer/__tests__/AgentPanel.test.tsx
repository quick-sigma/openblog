import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AgentPanel from '../components/AgentPanel'
import { AgentProvider } from '../context/AgentContext'
import { ConversationProvider } from '../context/ConversationContext'

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

function makeDefaultState() {
  return { lastConfigId: null, lastConversationId: null, configs: [] }
}

function renderPanel() {
  return render(
    <AgentProvider>
      <ConversationProvider>
        <AgentPanel />
      </ConversationProvider>
    </AgentProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadAppState.mockResolvedValue(makeDefaultState())
  mockSaveAppState.mockResolvedValue(undefined)
  mockLoadConversations.mockResolvedValue([])
  mockSaveConversation.mockResolvedValue(undefined)
  mockDeleteConversation.mockResolvedValue(undefined)
})

describe('AgentPanel - unconfigured', () => {
  it('muestra botón de configuración cuando no hay configuración', async () => {
    renderPanel()
    const btn = await screen.findByTestId('agent-setup-btn')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveTextContent('Configurar agente')
  })

  it('abre wizard al hacer click en botón configurar', async () => {
    renderPanel()
    const btn = await screen.findByTestId('agent-setup-btn')
    fireEvent.click(btn)
    expect(screen.getByTestId('agent-setup-overlay')).toBeInTheDocument()
  })

  it('cierra wizard al hacer click en X', async () => {
    renderPanel()
    const btn = await screen.findByTestId('agent-setup-btn')
    fireEvent.click(btn)
    expect(screen.getByTestId('agent-setup-overlay')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('wizard-close-btn'))
    expect(screen.queryByTestId('agent-setup-overlay')).not.toBeInTheDocument()
  })
})

describe('AgentPanel - configured', () => {
  beforeEach(() => {
    mockLoadAppState.mockResolvedValue({
      lastConfigId: 'cfg-1',
      lastConversationId: null,
      configs: [
        {
          id: 'cfg-1',
          label: 'Test',
          provider: 'dummy' as const,
          model: 'dummy-v1',
        },
      ],
    })
  })

  it('muestra header con elementos cuando configurado', async () => {
    renderPanel()
    await screen.findByTestId('agent-panel')

    // Header should be visible
    expect(screen.getByText('Sin conversación')).toBeInTheDocument()
  })
})
