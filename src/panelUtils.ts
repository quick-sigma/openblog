const MIN_PANEL_WIDTH = 250

export function clampWidth(value: number, viewportWidth: number): number {
  const maxWidth = viewportWidth * 0.5
  return Math.round(Math.max(MIN_PANEL_WIDTH, Math.min(value, maxWidth)))
}

export function getInitialWidth(
  viewportWidth: number,
  storedValue: string | null,
): number {
  const fallback = Math.round(viewportWidth * 0.3)
  if (storedValue === null) {
    return Math.max(fallback, MIN_PANEL_WIDTH)
  }
  return clampWidth(Number(storedValue), viewportWidth)
}
