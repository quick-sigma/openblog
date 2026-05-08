import '@testing-library/jest-dom'

// Inyecta design tokens en :root para que var() resuelva en jsdom
const style = document.createElement('style')
style.textContent = `
  :root {
    --color-panel-bg: #f9fafb;
    --color-border-divider: #e5e7eb;
    --spacing-panel: 16px;
    --layout-min-height: 100vh;
    --layout-ratio-content: 70%;
    --layout-ratio-agent: 30%;
    --layout-gap: 0;
  }
`
document.head.appendChild(style)
