import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageInput from '../components/MessageInput'

describe('MessageInput', () => {
  const onSend = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza textarea y botón', () => {
    render(<MessageInput onSend={onSend} />)
    expect(screen.getByLabelText('Mensaje')).toBeInTheDocument()
    expect(screen.getByLabelText('Enviar')).toBeInTheDocument()
  })

  it('botón deshabilitado cuando está vacío', () => {
    render(<MessageInput onSend={onSend} />)
    const btn = screen.getByLabelText('Enviar')
    expect(btn).toBeDisabled()
  })

  it('botón habilitado cuando hay texto', async () => {
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} />)
    const textarea = screen.getByLabelText('Mensaje')
    const btn = screen.getByLabelText('Enviar')

    await user.type(textarea, 'hello')
    expect(btn).not.toBeDisabled()
  })

  it('envía mensaje con Enter y limpia input', async () => {
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} />)
    const textarea = screen.getByLabelText('Mensaje')

    await user.type(textarea, 'hello{Enter}')

    expect(onSend).toHaveBeenCalledWith('hello')
    expect(textarea).toHaveValue('')
  })

  it('no envía con Shift+Enter', async () => {
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} />)
    const textarea = screen.getByLabelText('Mensaje')

    await user.type(textarea, 'hello{Shift>}{Enter}{/Shift}')

    expect(onSend).not.toHaveBeenCalled()
  })

  it('botón deshabilitado cuando disabled=true', () => {
    render(<MessageInput onSend={onSend} disabled />)
    const textarea = screen.getByLabelText('Mensaje')
    const btn = screen.getByLabelText('Enviar')

    expect(btn).toBeDisabled()
    expect(textarea).toBeDisabled()
  })

  it('envía al hacer click en botón', async () => {
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} />)
    const textarea = screen.getByLabelText('Mensaje')

    await user.type(textarea, 'click send')
    fireEvent.click(screen.getByLabelText('Enviar'))

    expect(onSend).toHaveBeenCalledWith('click send')
  })
})
