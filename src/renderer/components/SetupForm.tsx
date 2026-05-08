import { useState, useCallback, useRef, useEffect } from 'react'
import type { ProviderDescriptor } from '../lib/provider-list'

type FormStatus = 'idle' | 'typing' | 'saving' | 'error'

interface SetupFormProps {
  descriptor: ProviderDescriptor
  onSave: (apiKey: string) => Promise<void>
  onCancel: () => void
}

function SetupForm({ descriptor, onSave, onCancel }: SetupFormProps) {
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setApiKey(val)
    setStatus(val.trim().length > 0 ? 'typing' : 'idle')
    setErrorMessage('')
  }, [])

  const handleSave = useCallback(async () => {
    const key = apiKey.trim()
    if (!key) return

    setStatus('saving')
    setErrorMessage('')

    try {
      await onSave(key)
      // Success — parent handles closing
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al validar la API Key'
      setErrorMessage(msg)
      setStatus('error')
    }
  }, [apiKey, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && status === 'typing') {
        e.preventDefault()
        handleSave()
      }
    },
    [status, handleSave]
  )

  const isDisabled = status === 'saving'
  const errorId = 'setup-form-error'

  return (
    <div className="setup-form" data-testid="setup-form">
      <label htmlFor="setup-form-api-key">
        API Key de {descriptor.name}
      </label>
      <input
        ref={inputRef}
        id="setup-form-api-key"
        type="password"
        value={apiKey}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        aria-label={`API Key de ${descriptor.name}`}
        aria-describedby={errorMessage ? errorId : undefined}
        data-testid="setup-form-input"
      />

      <div className="setup-form-actions">
        <button
          className="setup-form-save-btn"
          onClick={handleSave}
          disabled={isDisabled || apiKey.trim().length === 0}
          aria-label="Guardar configuración"
          data-testid="setup-form-save-btn"
        >
          {status === 'saving' ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          className="setup-form-cancel-btn"
          onClick={onCancel}
          disabled={isDisabled}
          data-testid="setup-form-cancel-btn"
        >
          Cancelar
        </button>
      </div>

      {errorMessage ? (
        <div className="setup-form-error" id={errorId} role="alert" data-testid="setup-form-error">
          ⚠ {errorMessage}
        </div>
      ) : null}
    </div>
  )
}

export default SetupForm
