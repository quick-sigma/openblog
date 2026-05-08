import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProviderCard from '../components/ProviderCard'
import type { ProviderDescriptor } from '../../types/provider'

const descriptor: ProviderDescriptor = {
  id: 'test-provider',
  name: 'Test Provider',
  description: 'A test provider description',
  base_url: 'https://test.example.com',
  logo_url: 'providers/test-provider/logo.svg',
}

describe('ProviderCard', () => {
  it('renderiza nombre y descripción', () => {
    render(
      <ProviderCard descriptor={descriptor} onSelect={vi.fn()} isConfigured={false} />
    )
    expect(screen.getByText('Test Provider')).toBeInTheDocument()
    expect(screen.getByText('A test provider description')).toBeInTheDocument()
  })

  it('renderiza imagen del logo cuando logo_url existe', () => {
    render(
      <ProviderCard descriptor={descriptor} onSelect={vi.fn()} isConfigured={false} />
    )
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'providers/test-provider/logo.svg')
  })

  it('muestra monograma cuando logo_url es undefined', () => {
    const noLogo = { ...descriptor, logo_url: undefined }
    render(
      <ProviderCard descriptor={noLogo} onSelect={vi.fn()} isConfigured={false} />
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('TP')).toBeInTheDocument()
  })

  it('muestra monograma cuando la imagen falla al cargar', () => {
    render(
      <ProviderCard descriptor={descriptor} onSelect={vi.fn()} isConfigured={false} />
    )
    const img = screen.getByRole('img') as HTMLImageElement
    fireEvent.error(img)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('TP')).toBeInTheDocument()
  })

  it('monograma usa dos iniciales del nombre', () => {
    const single: ProviderDescriptor = { ...descriptor, name: 'OpenAI', logo_url: undefined }
    render(
      <ProviderCard descriptor={single} onSelect={vi.fn()} isConfigured={false} />
    )
    expect(screen.getByText('O')).toBeInTheDocument()

    const multi: ProviderDescriptor = { ...descriptor, name: 'Anthropic Claude', logo_url: undefined }
    render(
      <ProviderCard descriptor={multi} onSelect={vi.fn()} isConfigured={false} />
    )
    expect(screen.getByText('AC')).toBeInTheDocument()
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

  it('no muestra logo si ambos están ausentes', () => {
    const noLogos: ProviderDescriptor = {
      ...descriptor,
      logo_url: undefined,
    }
    render(
      <ProviderCard descriptor={noLogos} onSelect={vi.fn()} isConfigured={false} />
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
