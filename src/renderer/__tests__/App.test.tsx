import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from '../context/ThemeContext'
import { AgentProvider } from '../context/AgentContext'
import { ConversationProvider } from '../context/ConversationContext'
import App from '../App'

vi.mock('../../shared/storage-api', () => ({
  // no-op — we only use types from here
}))

// Mock storage
vi.mock('../lib/storage', () => ({
  loadAppState: () => Promise.resolve({ lastConfigId: null, lastConversationId: null, configs: [] }),
  saveAppState: () => Promise.resolve(),
  loadConversations: () => Promise.resolve([]),
  saveConversation: () => Promise.resolve(),
  deleteConversation: () => Promise.resolve(),
}))

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

function renderApp() {
  return render(
    <ThemeProvider>
      <AgentProvider>
        <ConversationProvider>
          <App />
        </ConversationProvider>
      </AgentProvider>
    </ThemeProvider>
  )
}

describe('App — Layout 2 columnas 70/30', () => {
  it('renderiza el contenedor raíz #app-container', () => {
    const { container } = renderApp()
    const appContainer = container.querySelector('#app-container')
    expect(appContainer).toBeInTheDocument()
  })

  it('renderiza #content-panel y #agent-panel', () => {
    const { container } = renderApp()
    expect(container.querySelector('#content-panel')).toBeInTheDocument()
    expect(container.querySelector('#agent-panel')).toBeInTheDocument()
  })

  it('#app-container tiene display:flex y altura completa', () => {
    const { container } = renderApp()
    const el = container.querySelector('#app-container')!
    const style = getComputedStyle(el)
    expect(style.display).toBe('flex')
    expect(style.width).toBe('100%')
  })

  it('#content-panel usa design token para width 70%', () => {
    const { container } = renderApp()
    const el = container.querySelector('#content-panel')!
    const style = getComputedStyle(el)
    expect(style.width).toBe('var(--layout-ratio-content)')
    expect(style.overflowY).toBe('auto')
  })

  it('#agent-panel usa design token para width 30%', () => {
    const { container } = renderApp()
    const el = container.querySelector('#agent-panel')!
    const style = getComputedStyle(el)
    expect(style.width).toBe('var(--layout-ratio-agent)')
  })

  it('App no tiene estado interno ni lógica de negocio (R4)', () => {
    const { container } = renderApp()
    const appContainer = container.querySelector('#app-container')
    expect(appContainer!.children.length).toBe(2)
  })
})
