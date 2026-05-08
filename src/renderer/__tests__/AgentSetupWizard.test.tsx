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
    logo_url: '/providers/logo/test-provider.svg',
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
})

describe('AgentSetupWizard', () => {
  it('muestra loading state al montar', () => {
    mockLoadProviderDescriptors.mockReturnValue(new Promise(() => {})) // never resolves
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

  it('muestra mensaje si no hay providers', async () => {
    mockLoadProviderDescriptors.mockResolvedValue([])
    renderWizard()
    await waitFor(() => {
      expect(screen.getByTestId('wizard-empty')).toBeInTheDocument()
    })
    expect(screen.getByText('No hay providers disponibles.')).toBeInTheDocument()
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
})
