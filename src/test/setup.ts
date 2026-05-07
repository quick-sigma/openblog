import '@testing-library/jest-dom'

// Mock electronAPI for tests
window.electronAPI = {
  platform: 'test',
}

// Mock ResizeObserver for jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
