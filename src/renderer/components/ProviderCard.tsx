import { useState, useCallback } from 'react'
import type { ProviderDescriptor } from '../lib/provider-list'

interface ProviderCardProps {
  descriptor: ProviderDescriptor
  onSelect: (descriptor: ProviderDescriptor) => void
  isConfigured: boolean
}

function ProviderCard({ descriptor, onSelect, isConfigured }: ProviderCardProps) {
  const [logoError, setLogoError] = useState(false)

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

  const handleLogoError = useCallback(() => {
    // DW6: fallback SVG→PNG
    if (!logoError) {
      setLogoError(true)
    }
  }, [logoError])

  const logoUrl = logoError
    ? descriptor.logo_fallback_url ?? ''
    : descriptor.logo_url ?? ''

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
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${descriptor.name} logo`}
            onError={handleLogoError}
          />
        ) : null}
      </div>
      <div className="provider-card-info">
        <div className="provider-card-name">
          {descriptor.name}
          {isConfigured ? <span className="provider-card-check" aria-label="Configurado"> ✓</span> : null}
        </div>
        <div className="provider-card-desc">{descriptor.description}</div>
      </div>
    </div>
  )
}

export default ProviderCard
