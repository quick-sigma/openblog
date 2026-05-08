import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DropdownMenu from '../components/DropdownMenu'

describe('DropdownMenu', () => {
  const items = [
    { label: 'Settings', onClick: vi.fn() },
    { label: 'Delete', onClick: vi.fn(), icon: <span>🗑</span> },
  ]

  it('renderiza trigger con "…"', () => {
    render(<DropdownMenu items={items} />)
    const trigger = screen.getByLabelText('Menú')
    expect(trigger).toBeInTheDocument()
    expect(trigger.textContent).toBe('…')
  })

  it('abre menú al hacer click', () => {
    render(<DropdownMenu items={items} />)
    const trigger = screen.getByLabelText('Menú')
    fireEvent.click(trigger)

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('cierra menú al seleccionar item', () => {
    render(<DropdownMenu items={items} />)
    const trigger = screen.getByLabelText('Menú')
    fireEvent.click(trigger)

    fireEvent.click(screen.getByText('Settings'))
    expect(items[0].onClick).toHaveBeenCalled()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('filtra items con visible=false', () => {
    const itemsWithHidden = [
      ...items,
      { label: 'Hidden', onClick: vi.fn(), visible: false },
    ]
    render(<DropdownMenu items={itemsWithHidden} />)
    fireEvent.click(screen.getByLabelText('Menú'))

    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })

  it('tiene aria-haspopup y aria-expanded', () => {
    render(<DropdownMenu items={items} />)
    const trigger = screen.getByLabelText('Menú')

    expect(trigger).toHaveAttribute('aria-haspopup', 'true')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })
})
