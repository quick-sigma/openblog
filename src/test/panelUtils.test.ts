import { clampWidth, getInitialWidth } from '../panelUtils'

describe('clampWidth', () => {
  it('returns value within [250, viewportWidth * 0.5]', () => {
    expect(clampWidth(400, 1000)).toBe(400)
  })

  it('clamps to min 250px', () => {
    expect(clampWidth(100, 1000)).toBe(250)
  })

  it('clamps to max 50% of viewport', () => {
    expect(clampWidth(600, 1000)).toBe(500)
  })

  it('handles edge case where value equals boundary', () => {
    expect(clampWidth(250, 1000)).toBe(250)
    expect(clampWidth(500, 1000)).toBe(500)
  })

  it('rounds the result', () => {
    expect(clampWidth(249.6, 1000)).toBe(250)
  })
})

describe('getInitialWidth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses stored value when valid', () => {
    expect(getInitialWidth(1000, '400')).toBe(400)
  })

  it('clamps stored value to min 250', () => {
    expect(getInitialWidth(1000, '100')).toBe(250)
  })

  it('clamps stored value to max 50% of viewport', () => {
    expect(getInitialWidth(1000, '600')).toBe(500)
  })

  it('falls back to 30% of viewport when no stored value', () => {
    expect(getInitialWidth(1000, null)).toBe(300)
  })

  it('fallback respects min clamp when viewport is small', () => {
    expect(getInitialWidth(400, null)).toBe(250)
  })
})
