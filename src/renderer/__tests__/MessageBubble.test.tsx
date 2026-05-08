import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import MessageBubble from '../components/MessageBubble'
import type { Message } from '../../shared/storage-api'

function makeMsg(overrides: Partial<Message> = {}): Message {
  return {
    role: 'user',
    content: 'test message',
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('MessageBubble', () => {
  it('renderiza mensaje de usuario', () => {
    const msg = makeMsg({ role: 'user' })
    const { container } = render(<MessageBubble message={msg} />)
    const bubble = container.querySelector('.message-bubble')
    expect(bubble).toHaveClass('user')
    expect(bubble?.textContent).toContain('test message')
  })

  it('renderiza mensaje de assistant', () => {
    const msg = makeMsg({ role: 'assistant' })
    const { container } = render(<MessageBubble message={msg} />)
    const bubble = container.querySelector('.message-bubble')
    expect(bubble).toHaveClass('assistant')
  })

  it('renderiza mensaje de sistema', () => {
    const msg = makeMsg({ role: 'system' })
    const { container } = render(<MessageBubble message={msg} />)
    const bubble = container.querySelector('.message-bubble')
    expect(bubble).toHaveClass('system')
  })

  it('aplica clase streaming cuando isStreaming=true', () => {
    const msg = makeMsg({ role: 'assistant' })
    const { container } = render(<MessageBubble message={msg} isStreaming />)
    const bubble = container.querySelector('.message-bubble')
    expect(bubble).toHaveClass('streaming')
  })

  it('tiene role="listitem" y aria-label', () => {
    const msg = makeMsg({ role: 'user' })
    const { container } = render(<MessageBubble message={msg} />)
    const bubble = container.querySelector('.message-bubble')
    expect(bubble).toHaveAttribute('role', 'listitem')
    expect(bubble).toHaveAttribute('aria-label', 'Mensaje de user')
  })
})
