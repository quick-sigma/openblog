import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProviderCard from '../components/ProviderCard'
import type { ProviderDescriptor } from '../lib/provider-list'

const descriptor: ProviderDescriptor = {
  id: 'test-provider',
  name: 'Test Provider',
  description: 'A test provider description',
  base_url: 'https://test.example.com',
  logo_url: '/providers/logo/test-provider.svg',
  logo_fallback_url: '/providers/logo/test-provider.png',
}

describe('ProviderCard', () => {
  it('renderiza nombre y descripción', () => {
    render(
      <ProviderCard descriptor={descriptor} onSelect={vi.fn()} isConfigured={false} />
    )
    expect(screen.getByText('Test Provider')).toBeInTheDocument()
    expect(screen.getByText('A test provider description')).toBeInTheDocument()
  })

  it('renderiza imagen del logo', () => {
    render(
      <ProviderCard descriptor={descriptor} onSelect={vi.fn()} isConfigured={false} />
    )
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/providers/logo/test-provider.svg')
  })

  it('llama onSelect al hacer click si no está configurado', () => {
    const onSelect = vi.fn()
    render(
      <ProviderCard descriptor={descriptor} onSelect={onSelect} isConfigured={false} />
    )
    fireEvent.click(screen.getByTestId('provider-card-test-provider'))
    expect(onSelect).toHaveBeenCalledWith(descriptor)
  })

  it('no llama onSelect al hacer click si está configurado', () => {
    const onSelect = vi.fn()
    render(
      <ProviderCard descriptor={descriptor} onSelect={onSelect} isConfigured={true} />
    )
    fireEvent.click(screen.getByTestId('provider-card-test-provider'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('muestra check si está configurado', () => {
    render(
      <ProviderCard descriptor={descriptor} onSelect={vi.fn()} isConfigured={true} />
    )
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('fallback a PNG si SVG falla', () => {
    render(
      <ProviderCard descriptor={descriptor} onSelect={vi.fn()} isConfigured={false} />
    )
    const img = screen.getByRole('img') as HTMLImageElement
    fireEvent.error(img)
    // After error, should try fallback PNG
    expect(img).toHaveAttribute('src', '/providers/logo/test-provider.png')
  })

  it('no muestra logo si ambos fallbacks fallan', () => {
    const noLogos: ProviderDescriptor = {
      ...descriptor,
      logo_url: undefined,
      logo_fallback_url: undefined,
    }
    render(
      <ProviderCard descriptor={noLogos} onSelect={vi.fn()} isConfigured={false} />
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
