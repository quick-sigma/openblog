import '@testing-library/jest-dom'

// Inyecta design tokens en :root para que var() resuelva en jsdom
const style = document.createElement('style')
style.textContent = `
  :root {
    --color-body-bg: #ffffff;
    --color-panel-bg: #f9fafb;
    --color-text: #111827;
    --color-text-muted: #6b7280;
    --color-border-divider: #e5e7eb;
    --color-border-subtle: #d1d5db;
    --spacing-panel: 16px;
    --layout-min-height: 100vh;
    --layout-ratio-content: 70%;
    --layout-ratio-agent: 30%;
    --layout-gap: 0;
    --transition-theme: background-color 300ms ease, color 300ms ease;
    --transition-icon: transform 400ms ease;
  }

  .dark {
    --color-body-bg: #0f0f1a;
    --color-panel-bg: #1a1a2e;
    --color-text: #e2e2e8;
    --color-text-muted: #9e9eb0;
    --color-border-divider: #2a2a3d;
    --color-border-subtle: #35354a;
  }
`
document.head.appendChild(style)

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
