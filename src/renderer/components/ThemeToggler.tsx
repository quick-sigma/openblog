import { useTheme } from '../context/ThemeContext'

function SunIcon() {
  return <span className="theme-toggler__icon" aria-hidden="true">☀</span>
}

function MoonIcon() {
  return <span className="theme-toggler__icon" aria-hidden="true">☾</span>
}

function ThemeToggler() {
  const { theme, isDark, toggleTheme } = useTheme()
  const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <button
      className="theme-toggler"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      role="button"
      tabIndex={0}
      title={label}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

export default ThemeToggler
