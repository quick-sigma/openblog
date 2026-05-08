import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SetupForm from '../components/SetupForm'
import type { ProviderDescriptor } from '../../types/provider'

const descriptor: ProviderDescriptor = {
  id: 'test',
  name: 'Test Provider',
  description: 'desc',
  base_url: 'https://test.example.com',
}

describe('SetupForm', () => {
  const onSave = vi.fn()
  const onCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza label con nombre del provider', () => {
    render(<SetupForm descriptor={descriptor} onSave={onSave} onCancel={onCancel} />)
    expect(screen.getByLabelText('API Key de Test Provider')).toBeInTheDocument()
  })

  it('deshabilita botón Guardar cuando input está vacío', () => {
    render(<SetupForm descriptor={descriptor} onSave={onSave} onCancel={onCancel} />)
    expect(screen.getByTestId('setup-form-save-btn')).toBeDisabled()
  })

  it('habilita botón Guardar cuando hay texto', async () => {
    const user = userEvent.setup()
    render(<SetupForm descriptor={descriptor} onSave={onSave} onCancel={onCancel} />)
    const input = screen.getByTestId('setup-form-input')
    await user.type(input, 'sk-test-key')
    expect(screen.getByTestId('setup-form-save-btn')).not.toBeDisabled()
  })

  it('deshabilita input y botón durante saving', async () => {
    const user = userEvent.setup()
    const neverResolve = new Promise<void>(() => {}) // never resolves
    const saveFn = vi.fn().mockReturnValue(neverResolve)

    render(<SetupForm descriptor={descriptor} onSave={saveFn} onCancel={onCancel} />)
    const input = screen.getByTestId('setup-form-input')
    await user.type(input, 'sk-test-key')
    await user.click(screen.getByTestId('setup-form-save-btn'))

    expect(screen.getByTestId('setup-form-input')).toBeDisabled()
    expect(screen.getByTestId('setup-form-save-btn')).toBeDisabled()
  })

  it('llama a onCancel al hacer click en Cancelar', async () => {
    const user = userEvent.setup()
    render(<SetupForm descriptor={descriptor} onSave={onSave} onCancel={onCancel} />)
    await user.click(screen.getByTestId('setup-form-cancel-btn'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('llama a onSave con la apiKey', async () => {
    const user = userEvent.setup()
    const saveFn = vi.fn().mockResolvedValue(undefined)

    render(<SetupForm descriptor={descriptor} onSave={saveFn} onCancel={onCancel} />)
    const input = screen.getByTestId('setup-form-input')
    await user.type(input, 'sk-real-key')
    await user.click(screen.getByTestId('setup-form-save-btn'))

    expect(saveFn).toHaveBeenCalledWith('sk-real-key')
  })

  it('muestra mensaje de error si onSave falla', async () => {
    const user = userEvent.setup()
    const saveFn = vi.fn().mockRejectedValue(new Error('Invalid API Key'))

    render(<SetupForm descriptor={descriptor} onSave={saveFn} onCancel={onCancel} />)
    const input = screen.getByTestId('setup-form-input')
    await user.type(input, 'sk-bad-key')
    await user.click(screen.getByTestId('setup-form-save-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('setup-form-error')).toHaveTextContent('Invalid API Key')
    })
  })

  it('limpia error al escribir de nuevo', async () => {
    const user = userEvent.setup()
    const saveFn = vi.fn().mockRejectedValue(new Error('Invalid API Key'))

    render(<SetupForm descriptor={descriptor} onSave={saveFn} onCancel={onCancel} />)
    const input = screen.getByTestId('setup-form-input')
    await user.type(input, 'sk-bad-key')
    await user.click(screen.getByTestId('setup-form-save-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('setup-form-error')).toBeInTheDocument()
    })

    await user.type(input, 'x')
    expect(screen.queryByTestId('setup-form-error')).not.toBeInTheDocument()
  })
})
