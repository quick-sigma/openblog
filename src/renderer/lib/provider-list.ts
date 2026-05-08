/** Provider descriptor definitions — loaded from public/providers/descriptions/*.json */

export interface ProviderDescriptor {
  id: string
  name: string
  description: string
  base_url: string
  logo_url?: string
  logo_fallback_url?: string
}

/**
 * Load all provider descriptors from the public assets directory.
 * Fetches every JSON file in /providers/descriptions/ and returns
 * the parsed descriptors. If the directory is empty or unreachable,
 * returns an empty array.
 */
export async function loadProviderDescriptors(): Promise<ProviderDescriptor[]> {
  // Electron loads from file system; we use fetch (Vite dev) or a hard-coded
  // bundle of known providers. For simplicity we maintain a static list
  // keyed by the JSON files we ship.
  //
  // In electron-vite the `public/` folder is served as the app root.
  // We use the known filenames so no directory listing is required.
  const knownFiles = ['opencode.json']

  const results = await Promise.allSettled(
    knownFiles.map(async (filename) => {
      const resp = await fetch(`/providers/descriptions/${filename}`)
      if (!resp.ok) return null
      const raw = await resp.json()
      const id = filename.replace(/\.json$/, '')
      return {
        id,
        name: raw.name ?? id,
        description: raw.description ?? '',
        base_url: raw.base_url ?? '',
        logo_url: `/providers/logo/${id}.svg`,
        logo_fallback_url: `/providers/logo/${id}.png`,
      } satisfies ProviderDescriptor
    })
  )

  return results
    .filter(
      (r): r is PromiseFulfilledResult<ProviderDescriptor> =>
        r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value)
}
