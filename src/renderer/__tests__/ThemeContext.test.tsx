import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../context/ThemeContext'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('ThemeProvider', () => {
  it('provee valores por defecto (light si no hay preferencia del sistema)', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    expect(result.current.theme).toBe('light')
    expect(result.current.isDark).toBe(false)
  })

  it('lee tema oscuro de localStorage', () => {
    localStorage.setItem('theme', 'dark')
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    expect(result.current.theme).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })

  it('toggleTheme cambia entre light y dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    expect(result.current.theme).toBe('light')

    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('dark')
    expect(result.current.isDark).toBe(true)

    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('light')
    expect(result.current.isDark).toBe(false)
  })

  it('toggleTheme persiste en localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    act(() => result.current.toggleTheme())
    expect(localStorage.getItem('theme')).toBe('dark')

    act(() => result.current.toggleTheme())
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('sincroniza html.classList al cambiar tema', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    act(() => result.current.toggleTheme())
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => result.current.toggleTheme())
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('useTheme lanza error fuera de ThemeProvider', () => {
    expect(() => {
      renderHook(() => useTheme())
    }).toThrow('useTheme must be used within a ThemeProvider')
  })
})
