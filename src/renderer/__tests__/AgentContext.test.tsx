import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AgentProvider, useAgent } from '../context/AgentContext'
import type { AppState, AgentConfig } from '../../shared/storage-api'

// Mock storage
const mockLoadAppState = vi.fn()
const mockSaveAppState = vi.fn()

vi.mock('../lib/storage', () => ({
  loadAppState: (...args: unknown[]) => mockLoadAppState(...args),
  saveAppState: (...args: unknown[]) => mockSaveAppState(...args),
}))

function makeDefaultState(): AppState {
  return { lastConfigId: null, lastConversationId: null, configs: [] }
}

const dummyConfig: AgentConfig = {
  id: 'cfg-1',
  label: 'Test',
  provider: 'dummy',
  model: 'dummy-v1',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadAppState.mockResolvedValue(makeDefaultState())
  mockSaveAppState.mockResolvedValue(undefined)
})

describe('AgentProvider', () => {
  it('provee valores por defecto', async () => {
    const { result } = renderHook(() => useAgent(), { wrapper: AgentProvider })

    await vi.waitFor(() => {
      expect(result.current.isConfigured).toBe(false)
    })
    expect(result.current.configs).toEqual([])
    expect(result.current.activeConfig).toBeNull()
  })

  it('restaura lastConfigId del estado guardado', async () => {
    mockLoadAppState.mockResolvedValue({
      lastConfigId: 'cfg-1',
      lastConversationId: null,
      configs: [dummyConfig],
    })

    const { result } = renderHook(() => useAgent(), { wrapper: AgentProvider })

    await vi.waitFor(() => {
      expect(result.current.activeConfig?.id).toBe('cfg-1')
    })
    expect(result.current.configs).toHaveLength(1)
    expect(result.current.isConfigured).toBe(true)
  })

  it('setActiveConfig cambia config activa y persiste', async () => {
    mockLoadAppState
      .mockResolvedValueOnce({
        lastConfigId: null,
        lastConversationId: null,
        configs: [dummyConfig],
      })
      .mockResolvedValueOnce(makeDefaultState())

    const { result } = renderHook(() => useAgent(), { wrapper: AgentProvider })

    await vi.waitFor(() => {
      expect(result.current.configs).toHaveLength(1)
    })

    await act(async () => {
      result.current.setActiveConfig(dummyConfig)
    })

    expect(result.current.activeConfig?.id).toBe('cfg-1')
    expect(mockSaveAppState).toHaveBeenCalled()
  })

  it('saveConfig añade y actualiza configs', async () => {
    const { result } = renderHook(() => useAgent(), { wrapper: AgentProvider })

    await vi.waitFor(() => {
      expect(result.current.configs).toEqual([])
    })

    const config = { id: 'cfg-2', label: 'New', provider: 'dummy' as const, model: 'dummy-v2' }

    await act(async () => {
      result.current.saveConfig(config)
    })

    expect(result.current.configs).toHaveLength(1)
    expect(result.current.configs[0].id).toBe('cfg-2')
  })

  it('deleteConfig elimina config', async () => {
    const config = { id: 'cfg-1', label: 'Test', provider: 'dummy' as const, model: 'dummy-v1' }
    mockLoadAppState.mockResolvedValue({
      lastConfigId: null,
      lastConversationId: null,
      configs: [config],
    })

    const { result } = renderHook(() => useAgent(), { wrapper: AgentProvider })

    await vi.waitFor(() => {
      expect(result.current.configs).toHaveLength(1)
    })

    await act(async () => {
      result.current.deleteConfig('cfg-1')
    })

    expect(result.current.configs).toHaveLength(0)
    expect(result.current.activeConfig).toBeNull()
  })

  it('useAgent lanza error fuera de AgentProvider', () => {
    expect(() => {
      renderHook(() => useAgent())
    }).toThrow('useAgent must be used within an AgentProvider')
  })
})
