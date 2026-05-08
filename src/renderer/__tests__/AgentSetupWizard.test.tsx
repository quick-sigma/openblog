import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AgentSetupWizard from '../components/AgentSetupWizard'
import { AgentProvider } from '../context/AgentContext'

// Mock loadProviderDescriptors
const mockLoadProviderDescriptors = vi.fn()
vi.mock('../lib/provider-list', () => ({
  loadProviderDescriptors: (...args: unknown[]) =>
    mockLoadProviderDescriptors(...args),
}))

// Mock storage for AgentContext
const mockLoadAppState = vi.fn()
const mockSaveAppState = vi.fn()
vi.mock('../lib/storage', () => ({
  loadAppState: (...args: unknown[]) => mockLoadAppState(...args),
  saveAppState: (...args: unknown[]) => mockSaveAppState(...args),
}))

function makeDefaultState() {
  return { lastConfigId: null, lastConversationId: null, configs: [] }
}

const mockProviders = [
  {
    id: 'test-provider',
    name: 'Test Provider',
    description: 'A test provider',
    base_url: 'https://test.example.com',
    logo_url: 'providers/test-provider/logo.svg',
  },
]

function renderWizard() {
  return render(
    <AgentProvider>
      <AgentSetupWizard onClose={vi.fn()} />
    </AgentProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadAppState.mockResolvedValue(makeDefaultState())
  mockSaveAppState.mockResolvedValue(undefined)
  // Mock window.electronAPI.onProvidersError
  window.electronAPI = {
    ...window.electronAPI,
    onProvidersError: vi.fn(() => vi.fn()),
  } as any
})

describe('AgentSetupWizard', () => {
  it('muestra loading state al montar', () => {
    mockLoadProviderDescriptors.mockReturnValue(new Promise(() => {}))
    renderWizard()
    expect(screen.getByTestId('wizard-loading')).toBeInTheDocument()
    expect(screen.getByText('Cargando providers...')).toBeInTheDocument()
  })

  it('muestra error state si falla carga', async () => {
    mockLoadProviderDescriptors.mockRejectedValue(new Error('network error'))
    renderWizard()
    await waitFor(() => {
      expect(screen.getByTestId('wizard-error')).toBeInTheDocument()
    })
    expect(screen.getByText(/No se pudieron cargar/)).toBeInTheDocument()
    expect(screen.getByTestId('wizard-retry-btn')).toBeInTheDocument()
  })

  it('muestra lista de providers al cargar', async () => {
    mockLoadProviderDescriptors.mockResolvedValue(mockProviders)
    renderWizard()
    await waitFor(() => {
      expect(screen.getByTestId('wizard-provider-list')).toBeInTheDocument()
    })
    expect(screen.getByText('Test Provider')).toBeInTheDocument()
  })

  it('muestra empty state si no hay providers', async () => {
    mockLoadProviderDescriptors.mockResolvedValue([])
    renderWizard()
    await waitFor(() => {
      expect(screen.getByTestId('wizard-empty')).toBeInTheDocument()
    })
    expect(screen.getByText('No se encontraron providers')).toBeInTheDocument()
    expect(screen.getByTestId('wizard-rescan-btn')).toHaveTextContent('Escanear de nuevo')
  })

  it('reintenta al hacer click en Reintentar', async () => {
    mockLoadProviderDescriptors
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(mockProviders)

    renderWizard()
    await waitFor(() => {
      expect(screen.getByTestId('wizard-retry-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('wizard-retry-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-provider-list')).toBeInTheDocument()
    })
    expect(mockLoadProviderDescriptors).toHaveBeenCalledTimes(2)
  })

  it('reintenta al hacer click en Escanear de nuevo en empty state', async () => {
    mockLoadProviderDescriptors
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockProviders)

    renderWizard()
    await waitFor(() => {
      expect(screen.getByTestId('wizard-empty')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('wizard-rescan-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-provider-list')).toBeInTheDocument()
    })
    expect(mockLoadProviderDescriptors).toHaveBeenCalledTimes(2)
  })

  it('abre SetupForm al seleccionar un provider', async () => {
    mockLoadProviderDescriptors.mockResolvedValue(mockProviders)
    renderWizard()

    await waitFor(() => {
      expect(screen.getByText('Test Provider')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('provider-card-test-provider'))

    await waitFor(() => {
      expect(screen.getByTestId('setup-form')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('API Key de Test Provider')).toBeInTheDocument()
  })

  it('vuelve a la lista al cancelar setup', async () => {
    mockLoadProviderDescriptors.mockResolvedValue(mockProviders)
    renderWizard()

    await waitFor(() => {
      expect(screen.getByText('Test Provider')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('provider-card-test-provider'))

    await waitFor(() => {
      expect(screen.getByTestId('setup-form')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('setup-form-cancel-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-provider-list')).toBeInTheDocument()
    })
  })

  it('renderiza sidebar y header', () => {
    mockLoadProviderDescriptors.mockReturnValue(new Promise(() => {}))
    renderWizard()
    expect(screen.getByText('Configurar provider')).toBeInTheDocument()
    expect(screen.getByText('Provider')).toBeInTheDocument()
    expect(screen.getByTestId('wizard-close-btn')).toBeInTheDocument()
  })

  it('cierra al hacer click en X', () => {
    const onClose = vi.fn()
    mockLoadProviderDescriptors.mockReturnValue(new Promise(() => {}))
    render(
      <AgentProvider>
        <AgentSetupWizard onClose={onClose} />
      </AgentProvider>
    )
    fireEvent.click(screen.getByTestId('wizard-close-btn'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('cierra con tecla Escape', () => {
    const onClose = vi.fn()
    mockLoadProviderDescriptors.mockReturnValue(new Promise(() => {}))
    render(
      <AgentProvider>
        <AgentSetupWizard onClose={onClose} />
      </AgentProvider>
    )
    fireEvent.keyDown(screen.getByTestId('agent-setup-overlay'), {
      key: 'Escape',
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('no muestra error banner si no hay errores', async () => {
    mockLoadProviderDescriptors.mockResolvedValue(mockProviders)
    renderWizard()
    await waitFor(() => {
      expect(screen.getByTestId('wizard-provider-list')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('provider-error-banner')).not.toBeInTheDocument()
  })

  it('muestra error banner si hay providerErrors en el estado', async () => {
    // Mock onProvidersError to accumulate error
    const errorListeners: Array<(err: any) => void> = []
    window.electronAPI = {
      ...window.electronAPI,
      onProvidersError: (cb: any) => {
        errorListeners.push(cb)
        return vi.fn()
      },
    } as any

    mockLoadProviderDescriptors.mockResolvedValue(mockProviders)
    renderWizard()

    await waitFor(() => {
      expect(screen.getByTestId('wizard-provider-list')).toBeInTheDocument()
    })

    // Simulate receiving a provider error from main
    // Trigger via the stored callback
    const error = { providerId: 'broken', error: 'JSON inválido' }
    // The effect subscribes on mount - send the error via the callback
    // We need to access the internal setProviderErrors... let's use a different approach
    // Instead, let's verify the banner renders when it receives the error

    // Since the internal state is managed via the subscription, and we can't
    // easily trigger it directly, we'll just verify the error banner can render
    // by finding it via the data-testid after we trigger from outside
    // For this test, we trigger via the mock subscription
    if (errorListeners.length > 0) {
      errorListeners[0](error)
    }

    await waitFor(() => {
      expect(screen.getByTestId('provider-error-banner')).toBeInTheDocument()
    })
    expect(screen.getByText(/1 provider\(s\) no se pudieron cargar/)).toBeInTheDocument()
  })

  it('error banner expande/colapsa al hacer click', async () => {
    const errorListeners: Array<(err: any) => void> = []
    window.electronAPI = {
      ...window.electronAPI,
      onProvidersError: (cb: any) => {
        errorListeners.push(cb)
        return vi.fn()
      },
    } as any

    mockLoadProviderDescriptors.mockResolvedValue(mockProviders)
    renderWizard()

    await waitFor(() => {
      expect(screen.getByTestId('wizard-provider-list')).toBeInTheDocument()
    })

    if (errorListeners.length > 0) {
      errorListeners[0]({ providerId: 'broken', error: 'test error' })
    }

    await waitFor(() => {
      expect(screen.getByTestId('provider-error-banner')).toBeInTheDocument()
    })

    // Initially collapsed - no detail
    expect(screen.queryByTestId('provider-error-detail')).not.toBeInTheDocument()

    // Expand
    fireEvent.click(screen.getByTestId('provider-error-toggle'))
    await waitFor(() => {
      expect(screen.getByTestId('provider-error-detail')).toBeInTheDocument()
    })
    expect(screen.getByText(/broken — test error/)).toBeInTheDocument()

    // Collapse
    fireEvent.click(screen.getByTestId('provider-error-toggle'))
    await waitFor(() => {
      expect(screen.queryByTestId('provider-error-detail')).not.toBeInTheDocument()
    })
  })
})
