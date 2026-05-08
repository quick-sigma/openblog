import { useState, useRef, useEffect, useCallback } from 'react'
import { useAgent } from '../context/AgentContext'
import type { Model } from '../lib/model-contract'

function ModelDropdown() {
  const { provider, activeConfig, saveConfig } = useAgent()
  const [isOpen, setIsOpen] = useState(false)
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const fetchModels = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await provider.list_models()
      setModels(result)
    } catch {
      setError('Error al cargar modelos')
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Lazy fetch: AD-05 / N14
      fetchModels()
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, fetchModels])

  const handleSelect = (model: Model) => {
    if (activeConfig) {
      saveConfig({ ...activeConfig, model: model.id })
    }
    setIsOpen(false)
  }

  const currentModelName =
    models.find((m) => m.id === activeConfig?.model)?.name ??
    activeConfig?.model ??
    'Seleccionar modelo'

  return (
    <div className="model-dropdown" ref={ref}>
      <button
        className="trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Seleccionar modelo"
      >
        <span>{currentModelName}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div className="menu">
          {loading && (
            <div className="menu-loading">Cargando modelos…</div>
          )}
          {error && (
            <div className="menu-error">
              <span>{error}</span>
              <button onClick={fetchModels}>Reintentar</button>
            </div>
          )}
          {!loading && !error && models.length === 0 && (
            <div className="menu-empty">No hay modelos disponibles</div>
          )}
          {!loading && !error && models.map((model) => (
            <div
              key={model.id}
              className={`menu-item${activeConfig?.model === model.id ? ' active' : ''}`}
              onClick={() => handleSelect(model)}
              role="menuitem"
            >
              {model.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ModelDropdown
