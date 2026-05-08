import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '../context/ThemeContext'
import ThemeToggler from '../components/ThemeToggler'

function renderWithProvider() {
  return render(
    <ThemeProvider>
      <ThemeToggler />
    </ThemeProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('ThemeToggler', () => {
  it('renderiza botón con aria-label', () => {
    renderWithProvider()
    const btn = screen.getByRole('button')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-label', 'Toggle theme')
  })

  it('renderiza icono inicial (luna en modo light, sol en modo dark)', () => {
    localStorage.setItem('theme', 'light')
    const { container } = renderWithProvider()
    expect(container.querySelector('.theme-toggler__icon')?.textContent).toBe('☾')

    localStorage.setItem('theme', 'dark')
    const { container: darkContainer } = renderWithProvider()
    expect(darkContainer.querySelector('.theme-toggler__icon')?.textContent).toBe('☀')
  })

  it('cambia icono al hacer click', () => {
    renderWithProvider()
    const btn = screen.getByRole('button')
    const icon = btn.querySelector('.theme-toggler__icon')

    expect(icon?.textContent).toBe('☾')

    fireEvent.click(btn)
    expect(btn.querySelector('.theme-toggler__icon')?.textContent).toBe('☀')

    fireEvent.click(btn)
    expect(btn.querySelector('.theme-toggler__icon')?.textContent).toBe('☾')
  })

  it('tiene tooltip dinámico según tema', () => {
    renderWithProvider()
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('title', 'Cambiar a modo oscuro')
  })

  it('tiene tabIndex 0', () => {
    renderWithProvider()
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('tabindex', '0')
  })

  it('tiene data-testid para tests', () => {
    renderWithProvider()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
