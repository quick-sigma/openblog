import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App — Layout 2 columnas 70/30', () => {
  it('renderiza el contenedor raíz #app-container', () => {
    const { container } = render(<App />)
    const appContainer = container.querySelector('#app-container')
    expect(appContainer).toBeInTheDocument()
  })

  it('renderiza #content-panel y #agent-panel', () => {
    const { container } = render(<App />)
    expect(container.querySelector('#content-panel')).toBeInTheDocument()
    expect(container.querySelector('#agent-panel')).toBeInTheDocument()
  })

  it('#app-container tiene display:flex y altura completa', () => {
    const { container } = render(<App />)
    const el = container.querySelector('#app-container')!
    const style = getComputedStyle(el)
    expect(style.display).toBe('flex')
    expect(style.width).toBe('100%')
  })

  it('#content-panel usa design token para width 70%', () => {
    const { container } = render(<App />)
    const el = container.querySelector('#content-panel')!
    const style = getComputedStyle(el)
    // jsdom no resuelve var(), verifica que el token esté referenciado
    expect(style.width).toBe('var(--layout-ratio-content)')
    expect(style.overflowY).toBe('auto')
  })

  it('#agent-panel usa design token para width 30% con borde', () => {
    const { container } = render(<App />)
    const el = container.querySelector('#agent-panel')!
    const style = getComputedStyle(el)
    expect(style.width).toBe('var(--layout-ratio-agent)')
    expect(style.overflowY).toBe('auto')
    // Verifica border-left via stylesheet (jsdom no resuelve var() en shorthand)
    const sheets = document.styleSheets
    let hasBorderRule = false
    for (let i = 0; i < sheets.length; i++) {
      const rules = sheets[i].cssRules
      for (let j = 0; j < rules.length; j++) {
        if (rules[j].cssText?.includes('#agent-panel') && rules[j].cssText?.includes('border-left')) {
          hasBorderRule = true
        }
      }
    }
    expect(hasBorderRule).toBe(true)
  })

  it('los paneles están vacíos (sin contenido visible)', () => {
    const { container } = render(<App />)
    const content = container.querySelector('#content-panel')!
    const agent = container.querySelector('#agent-panel')!
    expect(content.textContent).toBe('')
    expect(agent.textContent).toBe('')
  })

  it('App no tiene estado interno ni lógica de negocio (R4)', () => {
    // App es una función pura que renderiza solo layout
    const { container } = render(<App />)
    const appContainer = container.querySelector('#app-container')
    expect(appContainer!.children.length).toBe(2)
  })
})
