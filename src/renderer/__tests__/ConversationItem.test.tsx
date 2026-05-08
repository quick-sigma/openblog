import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConversationItem from '../components/ConversationItem'
import type { Conversation } from '../../shared/storage-api'

function makeConv(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    title: 'Test Conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    ...overrides,
  }
}

describe('ConversationItem', () => {
  it('renderiza título', () => {
    const conv = makeConv()
    render(
      <ConversationItem conversation={conv} isActive={false} onClick={() => {}} />
    )
    expect(screen.getByText('Test Conversation')).toBeInTheDocument()
  })

  it('renderiza preview del último mensaje', () => {
    const conv = makeConv({
      messages: [
        { role: 'user', content: 'hello', timestamp: Date.now() },
        { role: 'assistant', content: 'hi there', timestamp: Date.now() },
      ],
    })
    render(
      <ConversationItem conversation={conv} isActive={false} onClick={() => {}} />
    )
    expect(screen.getByText('hi there')).toBeInTheDocument()
  })

  it('aplica clase active cuando isActive=true', () => {
    const conv = makeConv()
    const { container } = render(
      <ConversationItem conversation={conv} isActive={true} onClick={() => {}} />
    )
    const item = container.querySelector('.conversation-item')
    expect(item).toHaveClass('active')
  })

  it('llama onClick al hacer click', () => {
    const onClick = vi.fn()
    const conv = makeConv()
    render(
      <ConversationItem conversation={conv} isActive={false} onClick={onClick} />
    )
    fireEvent.click(screen.getByText('Test Conversation'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('tiene role="listitem" y aria-selected', () => {
    const conv = makeConv()
    const { container } = render(
      <ConversationItem conversation={conv} isActive={true} onClick={() => {}} />
    )
    const item = container.querySelector('.conversation-item')
    expect(item).toHaveAttribute('role', 'listitem')
    expect(item).toHaveAttribute('aria-selected', 'true')
  })
})
