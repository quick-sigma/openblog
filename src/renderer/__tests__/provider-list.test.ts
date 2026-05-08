import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadProviderDescriptors } from '../lib/provider-list'

describe('loadProviderDescriptors', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna array vacío si electronAPI no está disponible', async () => {
    const original = (window as any).electronAPI
    delete (window as any).electronAPI
    const result = await loadProviderDescriptors()
    expect(result).toEqual([])
    ;(window as any).electronAPI = original
  })

  it('retorna array vacío si listProviders no es función', async () => {
    ;(window as any).electronAPI = { listProviders: undefined }
    const result = await loadProviderDescriptors()
    expect(result).toEqual([])
  })

  it('llama a listProviders y retorna descriptores ordenados', async () => {
    const descriptors = [
      { id: 'beta', name: 'Beta Provider', base_url: 'https://beta.com' },
      { id: 'alpha', name: 'Alpha Provider', base_url: 'https://alpha.com' },
    ]
    ;(window as any).electronAPI = {
      listProviders: vi.fn().mockResolvedValue(descriptors),
    }

    const result = await loadProviderDescriptors()
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Alpha Provider')
    expect(result[1].name).toBe('Beta Provider')
  })
})
