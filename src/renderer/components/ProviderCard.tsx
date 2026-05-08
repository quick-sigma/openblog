import { useState, useCallback, useMemo } from 'react'
import type { ProviderDescriptor } from '../../types/provider'

interface ProviderCardProps {
  descriptor: ProviderDescriptor
  onSelect: (descriptor: ProviderDescriptor) => void
  isConfigured: boolean
}

function getMonogram(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}

function ProviderCard({ descriptor, onSelect, isConfigured }: ProviderCardProps) {
  const [imgError, setImgError] = useState(false)

  const handleClick = useCallback(() => {
    if (!isConfigured) {
      onSelect(descriptor)
    }
  }, [isConfigured, onSelect, descriptor])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isConfigured && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onSelect(descriptor)
      }
    },
    [isConfigured, onSelect, descriptor]
  )

  const handleImgError = useCallback(() => {
    setImgError(true)
  }, [])

  const showLogo = descriptor.logo_url && !imgError
  const monogram = useMemo(() => getMonogram(descriptor.name), [descriptor.name])

  return (
    <div
      className={`provider-card${isConfigured ? ' configured' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isConfigured ? -1 : 0}
      aria-label={`Configurar ${descriptor.name}`}
      data-testid={`provider-card-${descriptor.id}`}
    >
      <div className="provider-card-logo">
        {showLogo ? (
          <img
            src={descriptor.logo_url}
            alt={`${descriptor.name} logo`}
            onError={handleImgError}
          />
        ) : (
          <div className="provider-card-monogram" aria-hidden="true">
            {monogram}
          </div>
        )}
      </div>
      <div className="provider-card-info">
        <div className="provider-card-name">
          {descriptor.name}
          {isConfigured ? <span className="provider-card-check" aria-label="Configurado"> ✓</span> : null}
        </div>
        <div className="provider-card-desc">{descriptor.description ?? ''}</div>
      </div>
    </div>
  )
}

export default ProviderCard
