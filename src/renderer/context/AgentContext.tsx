import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { AgentConfig } from '../../shared/storage-api'
import type { ModelProvider } from '../lib/model-contract'
import { DummyModelProvider } from '../lib/model-contract'
import { OpenAILikeProvider } from '../lib/openai-like-provider'
import * as storage from '../lib/storage'

export interface AgentContextValue {
  configs: AgentConfig[]
  activeConfig: AgentConfig | null
  isConfigured: boolean
  provider: ModelProvider
  initialized: boolean
  setActiveConfig: (config: AgentConfig) => void
  saveConfig: (config: AgentConfig) => void
  deleteConfig: (configId: string) => void
  setProvider: (p: ModelProvider) => void
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<AgentConfig[]>([])
  const [activeConfig, setActiveConfigState] = useState<AgentConfig | null>(null)
  const [provider, setProviderState] = useState<ModelProvider>(() => new DummyModelProvider())
  const [initialized, setInitialized] = useState(false)

  /** Build the right ModelProvider from a given AgentConfig. */
  const buildProvider = useCallback((cfg: AgentConfig): ModelProvider => {
    if (cfg.provider === 'openai' && cfg.base_url && cfg.apiKey) {
      return new OpenAILikeProvider(cfg.base_url, cfg.apiKey)
    }
    return new DummyModelProvider()
  }, [])

  // Load app state on mount
  useEffect(() => {
    let cancelled = false
    storage.loadAppState().then((appState) => {
      if (cancelled) return
      setConfigs(appState.configs)
      if (appState.lastConfigId) {
        const found = appState.configs.find((c) => c.id === appState.lastConfigId)
        if (found) {
          setActiveConfigState(found)
          setProviderState(buildProvider(found))
        }
      }
      setInitialized(true)
    })
    return () => { cancelled = true }
  }, [buildProvider])

  const setActiveConfig = useCallback((config: AgentConfig) => {
    setActiveConfigState(config)
    setProviderState(buildProvider(config))
    // Persist lastConfigId
    storage.loadAppState().then((appState) => {
      appState.lastConfigId = config.id
      return storage.saveAppState(appState)
    })
  }, [buildProvider])

  const saveConfig = useCallback((config: AgentConfig) => {
    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.id === config.id)
      let next: AgentConfig[]
      if (idx >= 0) {
        next = [...prev]
        next[idx] = config
      } else {
        next = [...prev, config]
      }
      // Persist
      storage.loadAppState().then((appState) => {
        appState.configs = next
        return storage.saveAppState(appState)
      })
      return next
    })
  }, [])

  const deleteConfig = useCallback((configId: string) => {
    setConfigs((prev) => {
      const next = prev.filter((c) => c.id !== configId)
      storage.loadAppState().then((appState) => {
        appState.configs = next
        if (appState.lastConfigId === configId) {
          appState.lastConfigId = next.length > 0 ? next[0].id : null
        }
        return storage.saveAppState(appState)
      })
      if (activeConfig?.id === configId) {
        setActiveConfigState(next.length > 0 ? next[0] : null)
        if (next.length > 0) {
          setProviderState(buildProvider(next[0]))
        }
      }
      return next
    })
  }, [activeConfig, buildProvider])

  const setProvider = useCallback((p: ModelProvider) => {
    setProviderState(p)
  }, [])

  const isConfigured = initialized && activeConfig !== null && configs.length > 0

  return (
    <AgentContext.Provider
      value={{
        configs,
        activeConfig,
        isConfigured,
        provider,
        initialized,
        setActiveConfig,
        saveConfig,
        deleteConfig,
        setProvider,
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext)
  if (!ctx) {
    throw new Error('useAgent must be used within an AgentProvider')
  }
  return ctx
}

export { AgentContext }
