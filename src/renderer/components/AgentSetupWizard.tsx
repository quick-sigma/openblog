import { useState, useEffect, useCallback, useRef } from 'react'
import type { ProviderDescriptor } from '../../types/provider'
import type { ProviderError } from '../../types/provider'
import { loadProviderDescriptors } from '../lib/provider-list'
import { OpenAILikeProvider } from '../lib/openai-like-provider'
import { useAgent } from '../context/AgentContext'
import ProviderCard from './ProviderCard'
import SetupForm from './SetupForm'

type WizardStatus =
  | 'loading'
  | 'loaded'
  | 'error'
  | 'selecting'
  | 'configuring'

interface AgentSetupWizardProps {
  onClose: () => void
}

function AgentSetupWizard({ onClose }: AgentSetupWizardProps) {
  const { saveConfig, setActiveConfig, setProvider } = useAgent()

  const [status, setStatus] = useState<WizardStatus>('loading')
  const [descriptors, setDescriptors] = useState<ProviderDescriptor[]>([])
  const [selectedDescriptor, setSelectedDescriptor] = useState<ProviderDescriptor | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [providerErrors, setProviderErrors] = useState<ProviderError[]>([])
  const [errorBannerExpanded, setErrorBannerExpanded] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Suscribe to provider errors from main process
  useEffect(() => {
    const cleanup = window.electronAPI?.onProvidersError?.((error: ProviderError) => {
      setProviderErrors((prev) => [...prev, error])
    })
    return () => {
      cleanup?.()
    }
  }, [])

  // Load provider descriptors on mount
  const loadDescriptors = useCallback(async () => {
    setStatus('loading')
    setProviderErrors([])
    setErrorBannerExpanded(false)
    try {
      const list = await loadProviderDescriptors()
      setDescriptors(list)
      setStatus('loaded')
    } catch {
      setErrorMessage('No se pudieron cargar los providers.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    loadDescriptors()
  }, [loadDescriptors])

  // Focus trap: keep focus inside modal
  useEffect(() => {
    closeBtnRef.current?.focus()
  }, [])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        onClose()
      }
    },
    [onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  const handleSelectProvider = useCallback((descriptor: ProviderDescriptor) => {
    setSelectedDescriptor(descriptor)
    setStatus('configuring')
  }, [])

  const handleCancelSetup = useCallback(() => {
    setSelectedDescriptor(null)
    setStatus('loaded')
  }, [])

  const handleSaveApiKey = useCallback(
    async (apiKey: string): Promise<void> => {
      if (!selectedDescriptor) return

      // Validate the API key by calling list_models
      const provider = new OpenAILikeProvider(selectedDescriptor.base_url, apiKey)
      const models = await provider.list_models()

      // If we get here, validation succeeded
      const configId = crypto.randomUUID()
      const firstModel = models.length > 0 ? models[0].id : 'gpt-4o-mini'

      const config = {
        id: configId,
        label: selectedDescriptor.name,
        provider: 'openai' as const,
        apiKey,
        model: firstModel,
        base_url: selectedDescriptor.base_url,
      }

      saveConfig(config)
      setActiveConfig(config)
      setProvider(provider)

      // Close wizard
      onClose()
    },
    [selectedDescriptor, saveConfig, setActiveConfig, setProvider, onClose]
  )

  // Render error banner (DS §2.1)
  const renderErrorBanner = () => {
    if (providerErrors.length === 0) return null
    return (
      <div className="provider-error-banner" data-testid="provider-error-banner">
        <button
          className="provider-error-banner__toggle"
          onClick={() => setErrorBannerExpanded((p) => !p)}
          aria-expanded={errorBannerExpanded}
          data-testid="provider-error-toggle"
        >
          <span>⚠ {providerErrors.length} provider(s) no se pudieron cargar</span>
          <span className={`provider-error-banner__caret${errorBannerExpanded ? ' expanded' : ''}`}>
            ▼
          </span>
        </button>
        {errorBannerExpanded && (
          <div className="provider-error-banner__detail" data-testid="provider-error-detail">
            {providerErrors.map((pe) => (
              <div key={pe.providerId} className="provider-error-banner__item">
                ❌ {pe.providerId} — {pe.error}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Determine which content to show in the content area
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="agent-setup-status" data-testid="wizard-loading">
            <div className="agent-setup-spinner" />
            <p>Cargando providers...</p>
          </div>
        )
      case 'error':
        return (
          <div className="agent-setup-status" data-testid="wizard-error">
            <p>⚠ {errorMessage}</p>
            <button
              className="agent-setup-retry-btn"
              onClick={loadDescriptors}
              data-testid="wizard-retry-btn"
            >
              Reintentar
            </button>
          </div>
        )
      case 'loaded': {
        if (descriptors.length === 0) {
          return (
            <div className="agent-setup-status" data-testid="wizard-empty">
              <div className="agent-setup-empty-icon">📁</div>
              <p>No se encontraron providers</p>
              <p className="agent-setup-empty-path">
                Ruta: <code>public/providers/</code>
              </p>
              <button
                className="agent-setup-retry-btn"
                onClick={loadDescriptors}
                data-testid="wizard-rescan-btn"
              >
                Escanear de nuevo
              </button>
            </div>
          )
        }
        return (
          <div data-testid="wizard-provider-list">
            {descriptors.map((d) => (
              <ProviderCard
                key={d.id}
                descriptor={d}
                onSelect={handleSelectProvider}
                isConfigured={false}
              />
            ))}
          </div>
        )
      }
      case 'configuring': {
        if (!selectedDescriptor) return null
        return (
          <SetupForm
            key={selectedDescriptor.id}
            descriptor={selectedDescriptor}
            onSave={handleSaveApiKey}
            onCancel={handleCancelSetup}
          />
        )
      }
    }
  }

  return (
    <div
      className="agent-setup-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Configurar provider"
      data-testid="agent-setup-overlay"
    >
      <div className="agent-setup-wizard" data-testid="agent-setup-wizard">
        {/* Header */}
        <div className="agent-setup-header">
          <span className="agent-setup-header__title">Configurar provider</span>
          <button
            ref={closeBtnRef}
            className="agent-setup-close-btn"
            onClick={onClose}
            aria-label="Cerrar"
            data-testid="wizard-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Error banner (sticky below header) */}
        {renderErrorBanner()}

        {/* Body */}
        <div className="agent-setup-body">
          {/* Sidebar */}
          <div className="agent-setup-sidebar">
            <div className="agent-setup-sidebar-item agent-setup-sidebar-item--active">
              <span className="agent-setup-sidebar-icon">
                <IoSettingsOutlineIcon />
              </span>
              Provider
            </div>
          </div>

          {/* Content */}
          <div className="agent-setup-content">{renderContent()}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * Simple inline SVG icon for settings/gear outline.
 * No external icon library dependency.
 */
function IoSettingsOutlineIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export default AgentSetupWizard
