import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

beforeEach(() => {
  localStorage.clear()
})

describe('Panel split 70/30', () => {
  beforeEach(() => {
    render(<App />)
  })

  it('renders both panels with correct semantic roles', () => {
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('renders main content and AI agent headings', () => {
    expect(screen.getByText('Blog Comp')).toBeInTheDocument()
    expect(screen.getByText('AI Agent')).toBeInTheDocument()
  })

  it('panel-main has the correct CSS class', () => {
    const main = screen.getByRole('main')
    expect(main.classList.contains('panel-main')).toBe(true)
  })

  it('panel-agent has the correct CSS class', () => {
    const aside = screen.getByRole('complementary')
    expect(aside.classList.contains('panel-agent')).toBe(true)
  })

  it('layout container uses flexbox', () => {
    const layout = screen.getByRole('main').parentElement!
    expect(layout.classList.contains('layout')).toBe(true)
  })

  it('runs on mock platform from electronAPI', () => {
    expect(screen.getByText(/Running on test/)).toBeInTheDocument()
  })

  it('main panel appears before agent panel in DOM order', () => {
    const layout = screen.getByRole('main').parentElement!
    const children = Array.from(layout.children)
    const mainIndex = children.indexOf(screen.getByRole('main'))
    const asideIndex = children.indexOf(screen.getByRole('complementary'))
    expect(mainIndex).toBeLessThan(asideIndex)
  })

  it('renders divider handle between panels', () => {
    const divider = screen.getByTestId('divider-handle')
    expect(divider).toBeInTheDocument()
  })
})

describe('Panel resize interaction', () => {
  it('starts with default width of ~30% of viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1000,
      configurable: true,
      writable: true,
    })
    render(<App />)
    const agent = screen.getByRole('complementary')
    expect(agent.style.width).toBe('300px')
  })

  it('updates panel-agent width while dragging', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1000,
      configurable: true,
      writable: true,
    })
    render(<App />)

    const divider = screen.getByTestId('divider-handle')
    const agent = screen.getByRole('complementary')

    fireEvent.mouseDown(divider, { clientX: 700 })
    fireEvent.mouseMove(document, { clientX: 600 })

    expect(agent.style.width).toBe('400px')
  })

  it('applies dragging class to layout on mousedown', () => {
    render(<App />)
    const layout = screen.getByRole('main').parentElement!
    const divider = screen.getByTestId('divider-handle')

    expect(layout.classList.contains('layout--dragging')).toBe(false)
    fireEvent.mouseDown(divider, { clientX: 500 })
    expect(layout.classList.contains('layout--dragging')).toBe(true)
  })

  it('removes dragging class on mouseup', () => {
    render(<App />)
    const layout = screen.getByRole('main').parentElement!
    const divider = screen.getByTestId('divider-handle')

    fireEvent.mouseDown(divider, { clientX: 500 })
    fireEvent.mouseUp(document)
    expect(layout.classList.contains('layout--dragging')).toBe(false)
  })

  it('clamps panel width to min 250px', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1000,
      configurable: true,
      writable: true,
    })
    render(<App />)
    const divider = screen.getByTestId('divider-handle')
    const agent = screen.getByRole('complementary')

    fireEvent.mouseDown(divider, { clientX: 700 })
    fireEvent.mouseMove(document, { clientX: 950 })
    expect(agent.style.width).toBe('250px')
  })

  it('clamps panel width to max 50% of viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1000,
      configurable: true,
      writable: true,
    })
    render(<App />)
    const divider = screen.getByTestId('divider-handle')
    const agent = screen.getByRole('complementary')

    fireEvent.mouseDown(divider, { clientX: 700 })
    fireEvent.mouseMove(document, { clientX: 200 })
    expect(agent.style.width).toBe('500px')
  })
})

describe('Panel resize persistence', () => {
  it('persists width to localStorage on mouseup', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1000,
      configurable: true,
      writable: true,
    })
    render(<App />)
    const divider = screen.getByTestId('divider-handle')

    fireEvent.mouseDown(divider, { clientX: 700 })
    fireEvent.mouseMove(document, { clientX: 600 })
    fireEvent.mouseUp(document)

    expect(localStorage.getItem('riat:agent-panel-width')).toBe('400')
  })

  it('restores persisted width on mount', () => {
    localStorage.setItem('riat:agent-panel-width', '450')
    Object.defineProperty(window, 'innerWidth', {
      value: 1000,
      configurable: true,
      writable: true,
    })
    render(<App />)
    const agent = screen.getByRole('complementary')
    expect(agent.style.width).toBe('450px')
  })

  it('clamps persisted width on mount if it exceeds 50%', () => {
    localStorage.setItem('riat:agent-panel-width', '800')
    Object.defineProperty(window, 'innerWidth', {
      value: 1000,
      configurable: true,
      writable: true,
    })
    render(<App />)
    const agent = screen.getByRole('complementary')
    expect(agent.style.width).toBe('500px')
  })

  it('clamps persisted width to min 250px', () => {
    localStorage.setItem('riat:agent-panel-width', '50')
    Object.defineProperty(window, 'innerWidth', {
      value: 1000,
      configurable: true,
      writable: true,
    })
    render(<App />)
    const agent = screen.getByRole('complementary')
    expect(agent.style.width).toBe('250px')
  })

  it('falls back to 30% when localStorage is empty', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1000,
      configurable: true,
      writable: true,
    })
    render(<App />)
    const agent = screen.getByRole('complementary')
    expect(agent.style.width).toBe('300px')
  })
})
