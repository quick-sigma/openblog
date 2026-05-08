/** Provider descriptor emitted from main process via IPC */
export interface ProviderDescriptor {
  id: string
  name: string
  description?: string
  base_url: string
  logo_url?: string
}

/** Schema of description.json on disk */
export interface ProviderDescriptionFile {
  name: string
  description?: string
  base_url: string
  models?: string[]
}

/** Error event emitted via providers:error IPC channel */
export interface ProviderError {
  providerId: string
  error: string
}

/** Payload for provider:request IPC */
export interface ProviderRequestPayload {
  endpoint: string
  body?: unknown
  base_url: string
  apiKey: string
  method?: 'GET' | 'POST'
  stream?: boolean
}

/** Response from provider:request IPC (non-streaming) */
export interface ProviderResponse {
  status: number
  data?: unknown
  error?: string
}

/** Chunk event emitted during streaming */
export interface ProviderChunkEvent {
  chunk: Uint8Array
  done: boolean
}
