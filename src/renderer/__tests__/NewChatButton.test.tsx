import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NewChatButton from '../components/NewChatButton'

describe('NewChatButton', () => {
  it('renderiza variante compact', () => {
    const onClick = vi.fn()
    render(<NewChatButton onClick={onClick} variant="compact" />)
    const btn = screen.getByLabelText('Nueva conversación')
    expect(btn).toBeInTheDocument()
    expect(btn.className).toContain('compact')
  })

  it('renderiza variante full con texto', () => {
    const onClick = vi.fn()
    render(<NewChatButton onClick={onClick} variant="full" />)
    const btn = screen.getByLabelText('Nueva conversación')
    expect(btn).toBeInTheDocument()
    expect(btn.className).toContain('full')
    expect(btn.textContent).toContain('Nueva conversación')
  })

  it('llama onClick al hacer click', () => {
    const onClick = vi.fn()
    render(<NewChatButton onClick={onClick} variant="compact" />)
    fireEvent.click(screen.getByLabelText('Nueva conversación'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
