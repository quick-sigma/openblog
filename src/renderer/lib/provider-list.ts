import type { ProviderDescriptor } from '../../types/provider'

/**
 * Load all provider descriptors from the main process via IPC.
 * Returns an empty array if electronAPI is unavailable (e.g., in tests).
 */
export async function loadProviderDescriptors(): Promise<ProviderDescriptor[]> {
  const api = window.electronAPI
  if (!api || typeof api.listProviders !== 'function') {
    return []
  }

  const descriptors = await api.listProviders()

  // Sort alphabetically by name, case-insensitive
  return descriptors.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  )
}
